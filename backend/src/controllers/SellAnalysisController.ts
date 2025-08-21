import { Request, Response } from 'express';
import { sellAnalysisService } from '../services/SellAnalysisService.js';
import { winston } from '../utils/logger.js';
import { z } from 'zod';

const logger = winston.child({ module: 'SellAnalysisController' });

// Validation schemas
const PositionIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
    message: 'Position ID must be a positive number'
  })
});

const AlertIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
    message: 'Alert ID must be a positive number'
  })
});

const SimulateSellSchema = z.object({
  position_id: z.number().positive(),
  sell_price: z.number().positive().optional()
});

const ThresholdsSchema = z.object({
  take_profit_1: z.number().min(0).max(100).optional(),
  take_profit_2: z.number().min(0).max(100).optional(),
  stop_loss: z.number().min(-50).max(0).optional(),
  trailing_stop_trigger: z.number().min(0).max(100).optional(),
  trailing_stop_distance: z.number().min(0).max(50).optional(),
  time_based_days: z.number().min(1).max(1000).optional()
});

const AnalyzePositionSchema = z.object({
  thresholds: ThresholdsSchema.optional()
});

export class SellAnalysisController {
  /**
   * GET /api/v1/sell-analysis/alerts
   * Get all active sell alerts
   */
  async getActiveAlerts(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting active sell alerts');
      
      const alerts = await sellAnalysisService.getActiveAlerts();
      
      res.json({
        success: true,
        data: alerts,
        meta: {
          count: alerts.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/sell-analysis/positions/:id
   * Get detailed sell analysis for a specific position
   */
  async getPositionAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { id } = PositionIdSchema.parse(req.params);
      const body = AnalyzePositionSchema.parse(req.body);
      
      logger.info(`Getting sell analysis for position ${id}`);
      
      const analysis = await sellAnalysisService.analyzePosition(id, body.thresholds);
      
      if (!analysis) {
        res.status(404).json({
          success: false,
          error: 'Position not found or cannot be analyzed'
        });
        return;
      }
      
      res.json({
        success: true,
        data: analysis,
        meta: {
          position_id: id,
          analysis_timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting position analysis:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to analyze position',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/v1/sell-analysis/calculate
   * Manual trigger for sell analysis of all positions
   */
  async calculateAllPositions(req: Request, res: Response): Promise<void> {
    try {
      const body = AnalyzePositionSchema.parse(req.body);
      
      logger.info('Starting manual sell analysis of all positions');
      
      const startTime = Date.now();
      const analyses = await sellAnalysisService.analyzeAllPositions(body.thresholds);
      const duration = Date.now() - startTime;
      
      // Count recommendations
      const recommendations = analyses.reduce((acc, analysis) => {
        const rec = analysis.analysis.recommendation;
        acc[rec] = (acc[rec] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Count alerts generated
      const totalAlerts = analyses.reduce((sum, analysis) => sum + analysis.alerts.length, 0);
      
      res.json({
        success: true,
        data: {
          analyses,
          summary: {
            positions_analyzed: analyses.length,
            recommendations_breakdown: recommendations,
            total_alerts_generated: totalAlerts,
            analysis_duration_ms: duration
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          manual_trigger: true
        }
      });
    } catch (error) {
      logger.error('Error calculating all positions:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to calculate sell analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/sell-analysis/history/:positionId
   * Get analysis history for a specific position
   */
  async getPositionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = PositionIdSchema.parse(req.params);
      
      logger.info(`Getting analysis history for position ${id}`);
      
      const [history, alerts] = await Promise.all([
        sellAnalysisService.getPositionAnalysisHistory(id),
        sellAnalysisService.getPositionAlerts(id)
      ]);
      
      res.json({
        success: true,
        data: {
          position_id: id,
          analysis_history: history,
          alerts_history: alerts,
          summary: {
            total_analyses: history.length,
            total_alerts: alerts.length,
            active_alerts: alerts.filter(alert => alert.is_active).length,
            date_range: {
              first_analysis: history.length > 0 ? history[0]?.analysis_date : null,
              last_analysis: history.length > 0 ? history[history.length - 1]?.analysis_date : null
            }
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting position history:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid position ID',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve position history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/v1/sell-analysis/simulate
   * Simulate sell scenario for a position
   */
  async simulateSell(req: Request, res: Response): Promise<void> {
    try {
      const body = SimulateSellSchema.parse(req.body);
      
      logger.info(`Simulating sell for position ${body.position_id}${body.sell_price ? ` at price ${body.sell_price}` : ''}`);
      
      const simulation = await sellAnalysisService.simulateSell(body.position_id, body.sell_price);
      
      res.json({
        success: true,
        data: {
          position_id: body.position_id,
          simulation_price: body.sell_price || 'current_market',
          results: simulation,
          recommendations: {
            profitable: simulation.net_profit > 0,
            profit_margin: simulation.net_profit_pct,
            decision_suggestion: simulation.net_profit_pct > 15 ? 'STRONG_SELL' : 
                               simulation.net_profit_pct > 5 ? 'CONSIDER_SELL' :
                               simulation.net_profit_pct > 0 ? 'WEAK_SELL' : 'HOLD'
          }
        },
        meta: {
          simulation_timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error simulating sell:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid simulation parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to simulate sell',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * PUT /api/v1/sell-analysis/alerts/:id/acknowledge
   * Acknowledge a specific alert
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = AlertIdSchema.parse(req.params);
      
      logger.info(`Acknowledging alert ${id}`);
      
      const alert = await sellAnalysisService.acknowledgeAlert(id);
      
      if (!alert) {
        res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: alert,
        meta: {
          action: 'acknowledged',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid alert ID',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/sell-analysis/stats
   * Get service statistics
   */
  async getServiceStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting sell analysis service statistics');
      
      const stats = await sellAnalysisService.getServiceStats();
      
      res.json({
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
          service: 'sell-analysis'
        }
      });
    } catch (error) {
      logger.error('Error getting service stats:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve service statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * POST /api/v1/sell-analysis/cleanup
   * Trigger cleanup of old data
   */
  async triggerCleanup(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Triggering sell analysis data cleanup');
      
      const result = await sellAnalysisService.cleanup();
      
      res.json({
        success: true,
        data: result,
        meta: {
          action: 'cleanup',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error during cleanup:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/sell-analysis/alerts/position/:id
   * Get all alerts for a specific position
   */
  async getPositionAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = PositionIdSchema.parse(req.params);
      
      logger.info(`Getting alerts for position ${id}`);
      
      const alerts = await sellAnalysisService.getPositionAlerts(id);
      
      res.json({
        success: true,
        data: {
          position_id: id,
          alerts,
          summary: {
            total_alerts: alerts.length,
            active_alerts: alerts.filter(alert => alert.is_active).length,
            by_type: alerts.reduce((acc, alert) => {
              acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            by_priority: alerts.reduce((acc, alert) => {
              acc[alert.priority] = (acc[alert.priority] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting position alerts:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid position ID',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve position alerts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /api/v1/sell-analysis/overview
   * Get overview of all positions with sell recommendations
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting sell analysis overview');
      
      const [analyses, activeAlerts, stats] = await Promise.all([
        sellAnalysisService.analyzeAllPositions(),
        sellAnalysisService.getActiveAlerts(),
        sellAnalysisService.getServiceStats()
      ]);

      // Group by recommendations
      const byRecommendation = analyses.reduce((acc, analysis) => {
        const rec = analysis.analysis.recommendation;
        if (!acc[rec]) acc[rec] = [];
        acc[rec].push(analysis);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate totals
      const totalValue = analyses.reduce((sum, analysis) => sum + analysis.current.total_value, 0);
      const totalProfit = analyses.reduce((sum, analysis) => sum + analysis.adjusted.net_profit, 0);
      const avgScore = analyses.length > 0 
        ? analyses.reduce((sum, analysis) => sum + analysis.analysis.sell_score, 0) / analyses.length 
        : 0;

      res.json({
        success: true,
        data: {
          overview: {
            total_positions: analyses.length,
            total_portfolio_value: totalValue,
            total_net_profit: totalProfit,
            avg_sell_score: Math.round(avgScore * 100) / 100,
            active_alerts: activeAlerts.length
          },
          recommendations: byRecommendation,
          critical_alerts: activeAlerts.filter(alert => alert.priority === 'CRITICAL'),
          top_opportunities: analyses
            .filter(a => a.analysis.recommendation !== 'HOLD')
            .sort((a, b) => b.analysis.sell_score - a.analysis.sell_score)
            .slice(0, 5),
          statistics: stats
        },
        meta: {
          timestamp: new Date().toISOString(),
          refresh_interval: '5_minutes'
        }
      });
    } catch (error) {
      logger.error('Error getting overview:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve overview',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const sellAnalysisController = new SellAnalysisController();