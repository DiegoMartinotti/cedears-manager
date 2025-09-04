import { Request, Response } from 'express'
import { z } from 'zod'
import SectorBalanceService from '../services/SectorBalanceService.js'
import GICSClassificationService from '../services/GICSClassificationService.js'
import DiversificationAnalysisService from '../services/DiversificationAnalysisService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('sectorBalanceController')

// Validation schemas
const sectorBalanceRequestSchema = z.object({
  includeHistorical: z.boolean().optional(),
  includeSuggestions: z.boolean().optional(),
  includeAlerts: z.boolean().optional(),
  sectorFilter: z.array(z.string()).optional(),
  dateRange: z.object({
    from: z.string(),
    to: z.string()
  }).optional()
})

const rebalanceSimulationRequestSchema = z.object({
  targetAllocations: z.record(z.number()),
  maxTransactionCost: z.number().optional(),
  minTradeSize: z.number().optional(),
  excludeInstruments: z.array(z.number()).optional()
})

const classificationRequestSchema = z.object({
  instrumentIds: z.array(z.number()).optional(),
  force: z.boolean().optional()
})

export class SectorBalanceController {
  private sectorBalanceService = new SectorBalanceService()
  private classificationService = new GICSClassificationService()
  private diversificationService = new DiversificationAnalysisService()

  // ============================================================================
  // Overview and Analysis Endpoints
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/overview
   * Get complete sector balance overview
   */
  overview = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting sector balance overview')
      
      const overview = await this.sectorBalanceService.getSectorBalanceOverview()
      
      res.json({
        success: true,
        data: overview,
        message: 'Sector balance overview retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting sector balance overview:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get sector balance overview',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * GET /api/v1/sector-balance/distribution
   * Get current sector distribution
   */
  distribution = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting sector distribution')
      
      const distributions = await this.sectorBalanceService.getSectorDistributions()
      
      res.json({
        success: true,
        data: distributions,
        message: 'Sector distribution retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting sector distribution:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get sector distribution',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * GET /api/v1/sector-balance/portfolio-analysis
   * Get complete portfolio balance analysis
   */
  portfolioAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting portfolio balance analysis')
      
      const analysis = await this.sectorBalanceService.analyzePortfolioBalance()
      
      res.json({
        success: true,
        data: analysis,
        message: 'Portfolio balance analysis completed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error analyzing portfolio balance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to analyze portfolio balance',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * POST /api/v1/sector-balance/analyze
   * Run sector analysis and generate alerts/suggestions
   */
  analyze = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Running sector balance analysis')
      
      const result = await this.sectorBalanceService.runSectorAnalysis()
      
      res.json({
        success: true,
        data: result,
        message: 'Sector analysis completed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error running sector analysis:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to run sector analysis',
        timestamp: new Date().toISOString()
      })
    }
  }

  // ============================================================================
  // Recommendations and Suggestions
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/recommendations
   * Get rebalancing recommendations
   */
  recommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting rebalancing recommendations')
      
      const recommendations = await this.sectorBalanceService.generateRebalanceRecommendations()
      
      res.json({
        success: true,
        data: recommendations,
        message: 'Rebalancing recommendations generated successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error generating recommendations:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * POST /api/v1/sector-balance/simulate
   * Simulate rebalancing scenario
   */
  simulate = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = rebalanceSimulationRequestSchema.parse(req.body)
      
      logger.info('Simulating rebalancing scenario')
      
      // For now, return a mock simulation result
      // In a real implementation, this would calculate the actual simulation
      const mockSimulation = {
        currentState: await this.sectorBalanceService.analyzePortfolioBalance(),
        proposedState: await this.sectorBalanceService.analyzePortfolioBalance(), // Would be modified based on simulation
        changes: [],
        metrics: {
          diversificationImprovement: 5.2,
          riskReduction: 8.1,
          portfolioOptimization: 12.3,
          expectedReturn: 1.8,
          volatilityChange: -2.4
        },
        costs: {
          totalCommissions: validatedData.maxTransactionCost || 500,
          tradingFees: 150,
          impactCosts: 75,
          totalCosts: 725,
          costAsPercentage: 0.12
        }
      }
      
      res.json({
        success: true,
        data: mockSimulation,
        message: 'Rebalancing simulation completed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString()
        })
        return
      }
      
      logger.error('Error simulating rebalancing:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to simulate rebalancing',
        timestamp: new Date().toISOString()
      })
    }
  }

  // ============================================================================
  // Alerts Management
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/alerts
   * Get active concentration alerts
   */
  alerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { severity } = req.query
      
      logger.info(`Getting concentration alerts${severity ? ` with severity ${severity}` : ''}`)
      
      const sectorBalanceModel = (this.sectorBalanceService as any).sectorBalanceModel
      const alerts = await sectorBalanceModel.findActiveAlerts(severity as string)
      
      res.json({
        success: true,
        data: alerts,
        message: 'Concentration alerts retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting alerts:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get concentration alerts',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * PUT /api/v1/sector-balance/alerts/:id/acknowledge
   * Acknowledge a concentration alert
   */
  acknowledgeAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const alertId = parseInt(req.params.id ?? '', 10)
      
      if (isNaN(alertId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alert ID',
          timestamp: new Date().toISOString()
        })
        return
      }
      
      logger.info(`Acknowledging alert ${alertId}`)
      
      const sectorBalanceModel = (this.sectorBalanceService as any).sectorBalanceModel
      const updated = await sectorBalanceModel.acknowledgeAlert(alertId)
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Alert not found',
          timestamp: new Date().toISOString()
        })
        return
      }
      
      res.json({
        success: true,
        data: updated,
        message: 'Alert acknowledged successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error acknowledging alert:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert',
        timestamp: new Date().toISOString()
      })
    }
  }

  // ============================================================================
  // Classification Management
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/classifications
   * Get sector classifications
   */
  classifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sector, source, minConfidence, limit, offset } = req.query
      
      logger.info('Getting sector classifications')
      
      const classifications = await (this.classificationService as any).sectorClassificationModel.findAll({
        sector: sector as string,
        source: source as string,
        minConfidence: minConfidence ? parseFloat(minConfidence as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      })
      
      res.json({
        success: true,
        data: classifications,
        message: 'Sector classifications retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting classifications:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get sector classifications',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * POST /api/v1/sector-balance/classify
   * Classify instruments
   */
  classify = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = classificationRequestSchema.parse(req.body)
      
      logger.info('Starting instrument classification')
      
      let result
      if (validatedData.instrumentIds && validatedData.instrumentIds.length > 0) {
        // Classify specific instruments
        result = await this.classificationService.batchClassifyInstruments(validatedData.instrumentIds)
      } else {
        // Auto-classify all
        result = await this.classificationService.autoClassifyAll()
      }
      
      res.json({
        success: true,
        data: result,
        message: 'Instrument classification completed',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
          timestamp: new Date().toISOString()
        })
        return
      }
      
      logger.error('Error classifying instruments:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to classify instruments',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * GET /api/v1/sector-balance/classification-quality
   * Get classification quality report
   */
  classificationQuality = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting classification quality report')
      
      const report = await this.classificationService.getQualityReport()
      
      res.json({
        success: true,
        data: report,
        message: 'Classification quality report retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting classification quality report:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get classification quality report',
        timestamp: new Date().toISOString()
      })
    }
  }

  // ============================================================================
  // Advanced Analysis
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/health-score
   * Get portfolio health score
   */
  healthScore = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Calculating portfolio health score')
      
      const healthScore = await this.diversificationService.generateHealthScore()
      
      res.json({
        success: true,
        data: healthScore,
        message: 'Portfolio health score calculated successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error calculating health score:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate portfolio health score',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * GET /api/v1/sector-balance/sector-stats
   * Get detailed sector statistics
   */
  sectorStats = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting sector statistics')
      
      const stats = await this.diversificationService.calculateSectorStats()
      
      res.json({
        success: true,
        data: stats,
        message: 'Sector statistics retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting sector stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get sector statistics',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * GET /api/v1/sector-balance/risk-analysis
   * Get comprehensive risk analysis
   */
  riskAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Performing risk analysis')
      
      const analysis = await this.diversificationService.performRiskAnalysis()
      
      res.json({
        success: true,
        data: analysis,
        message: 'Risk analysis completed successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error performing risk analysis:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to perform risk analysis',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * GET /api/v1/sector-balance/performance/:months
   * Get sector performance analysis
   */
  performance = async (req: Request, res: Response): Promise<void> => {
    try {
      const months = parseInt(req.params.months ?? '', 10) || 12
      
      if (months < 1 || months > 60) {
        res.status(400).json({
          success: false,
          error: 'Months parameter must be between 1 and 60',
          timestamp: new Date().toISOString()
        })
        return
      }
      
      logger.info(`Getting sector performance for ${months} months`)
      
      const performance = await this.diversificationService.analyzeSectorPerformance(months)
      
      res.json({
        success: true,
        data: performance,
        message: 'Sector performance analysis retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting sector performance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get sector performance analysis',
        timestamp: new Date().toISOString()
      })
    }
  }

  // ============================================================================
  // Configuration and Settings
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/targets
   * Get sector balance targets
   */
  targets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { activeOnly } = req.query
      
      logger.info('Getting sector balance targets')
      
      const sectorBalanceModel = (this.sectorBalanceService as any).sectorBalanceModel
      const targets = await sectorBalanceModel.findAllTargets(activeOnly !== 'false')
      
      res.json({
        success: true,
        data: targets,
        message: 'Sector balance targets retrieved successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting sector targets:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get sector balance targets',
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * PUT /api/v1/sector-balance/targets/:id
   * Update sector balance target
   */
  updateTarget = async (req: Request, res: Response): Promise<void> => {
    try {
      const targetId = parseInt(req.params.id ?? '', 10)
      
      if (isNaN(targetId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid target ID',
          timestamp: new Date().toISOString()
        })
        return
      }
      
      logger.info(`Updating sector balance target ${targetId}`)
      
      const sectorBalanceModel = (this.sectorBalanceService as any).sectorBalanceModel
      const updated = await sectorBalanceModel.updateTarget(targetId, req.body)
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Target not found',
          timestamp: new Date().toISOString()
        })
        return
      }
      
      res.json({
        success: true,
        data: updated,
        message: 'Sector balance target updated successfully',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error updating sector target:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update sector balance target',
        timestamp: new Date().toISOString()
      })
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * GET /api/v1/sector-balance/health
   * Health check endpoint
   */
  health = async (req: Request, res: Response): Promise<void> => {
    try {
      const isHealthy = await this.sectorBalanceService.healthCheck()
      
      if (isHealthy) {
        res.json({
          success: true,
          data: { status: 'healthy' },
          message: 'Sector balance service is healthy',
          timestamp: new Date().toISOString()
        })
      } else {
        res.status(503).json({
          success: false,
          error: 'Sector balance service is unhealthy',
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      logger.error('Health check failed:', error)
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      })
    }
  }
}

export default SectorBalanceController