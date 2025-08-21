import { Request, Response } from 'express'
import { opportunityService } from '../services/OpportunityService.js'
import { opportunityScannerJob } from '../jobs/opportunityScannerJob.js'
import { createLogger } from '../utils/logger.js'
import { z } from 'zod'

const logger = createLogger('OpportunityController')

// Schemas de validación
const OpportunityFiltersSchema = z.object({
  min_score: z.number().min(0).max(100).optional(),
  max_score: z.number().min(0).max(100).optional(),
  opportunity_type: z.enum(['BUY', 'STRONG_BUY']).optional(),
  is_esg: z.boolean().optional(),
  is_vegan: z.boolean().optional(),
  sectors: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
})

const DiversificationCalculationSchema = z.object({
  symbol: z.string().min(1).max(10),
  investment_amount: z.number().min(1),
  current_portfolio_value: z.number().min(0).optional()
})

const ManualScanSchema = z.object({
  min_score_threshold: z.number().min(0).max(100).optional(),
  max_opportunities_per_day: z.number().min(1).max(100).optional(),
  rsi_oversold_threshold: z.number().min(10).max(50).optional(),
  distance_from_low_threshold: z.number().min(5).max(50).optional(),
  volume_spike_threshold: z.number().min(1).max(10).optional(),
  require_esg_compliance: z.boolean().optional(),
  require_vegan_friendly: z.boolean().optional()
})

export class OpportunityController {

  /**
   * GET /api/v1/opportunities/today
   * Obtiene las oportunidades del día actual
   */
  async getTodaysOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20
      
      logger.info(`Getting today's opportunities (limit: ${limit})`)
      
      const opportunities = await opportunityService.getTodaysOpportunities(limit)
      const stats = await opportunityService.getOpportunityStats()
      
      res.json({
        success: true,
        data: {
          opportunities,
          total: opportunities.length,
          stats: {
            total_active: stats.active,
            avg_score: stats.averageScore,
            by_type: stats.byType,
            high_score_count: stats.highScore
          }
        },
        timestamp: new Date().toISOString()
      })

      logger.info(`Returned ${opportunities.length} today's opportunities`)

    } catch (error) {
      logger.error('Error getting today\'s opportunities:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get today\'s opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/opportunities/top
   * Obtiene las mejores oportunidades por score
   */
  async getTopOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 10
      const minScore = Number(req.query.min_score) || 60
      
      logger.info(`Getting top opportunities (limit: ${limit}, minScore: ${minScore})`)
      
      const opportunities = await opportunityService.getTopOpportunities(limit, minScore)
      
      res.json({
        success: true,
        data: {
          opportunities,
          total: opportunities.length,
          filters: { limit, minScore }
        },
        timestamp: new Date().toISOString()
      })

      logger.info(`Returned ${opportunities.length} top opportunities`)

    } catch (error) {
      logger.error('Error getting top opportunities:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get top opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/opportunities/search
   * Busca oportunidades con filtros avanzados
   */
  async searchOpportunities(req: Request, res: Response): Promise<void> {
    try {
      const validation = OpportunityFiltersSchema.safeParse(req.query)
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid filters',
          details: validation.error.errors
        })
        return
      }

      const filters = validation.data
      
      logger.info('Searching opportunities with filters:', filters)
      
      const opportunities = await opportunityService.getOpportunities({
        minScore: filters.min_score,
        maxScore: filters.max_score,
        opportunityType: filters.opportunity_type,
        isESG: filters.is_esg,
        isVegan: filters.is_vegan,
        isActive: true
      })

      // Aplicar paginación
      const total = opportunities.length
      const paginatedOpportunities = opportunities
        .slice(filters.offset, filters.offset + filters.limit)

      res.json({
        success: true,
        data: {
          opportunities: paginatedOpportunities,
          total,
          page: Math.floor(filters.offset / filters.limit) + 1,
          limit: filters.limit,
          has_more: filters.offset + filters.limit < total
        },
        filters,
        timestamp: new Date().toISOString()
      })

      logger.info(`Returned ${paginatedOpportunities.length} of ${total} opportunities`)

    } catch (error) {
      logger.error('Error searching opportunities:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to search opportunities',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/opportunities/:id
   * Obtiene una oportunidad específica por ID
   */
  async getOpportunityById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id)
      
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid opportunity ID'
        })
        return
      }

      logger.info(`Getting opportunity by ID: ${id}`)
      
      const opportunity = await opportunityService.getOpportunityById(id)
      
      if (!opportunity) {
        res.status(404).json({
          success: false,
          error: 'Opportunity not found'
        })
        return
      }

      res.json({
        success: true,
        data: opportunity,
        timestamp: new Date().toISOString()
      })

      logger.info(`Returned opportunity: ${opportunity.symbol}`)

    } catch (error) {
      logger.error('Error getting opportunity by ID:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get opportunity',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * POST /api/v1/opportunities/calculate-diversification
   * Calcula el impacto en diversificación de una nueva inversión
   */
  async calculateDiversification(req: Request, res: Response): Promise<void> {
    try {
      const validation = DiversificationCalculationSchema.safeParse(req.body)
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        })
        return
      }

      const { symbol, investment_amount } = validation.data
      
      logger.info(`Calculating diversification for ${symbol}, amount: ${investment_amount}`)
      
      // Calcular impacto en diversificación
      const diversificationCheck = await opportunityService.calculateDiversificationImpact(
        symbol, 
        investment_amount
      )

      // Calcular impacto de comisiones
      const commissionImpact = await opportunityService.calculateCommissionImpact(
        symbol,
        investment_amount,
        diversificationCheck.current_portfolio_value
      )

      // Generar recomendación final
      let finalAction: 'PROCEED' | 'ADJUST_AMOUNT' | 'AVOID' = 'PROCEED'
      const reasons: string[] = []
      const riskFactors: string[] = []

      if (!diversificationCheck.is_within_limits) {
        if (diversificationCheck.recommendation.risk_level === 'HIGH') {
          finalAction = 'ADJUST_AMOUNT'
          reasons.push(diversificationCheck.recommendation.reason)
          riskFactors.push('Alta concentración en una sola posición')
        } else {
          finalAction = 'ADJUST_AMOUNT'
          reasons.push(diversificationCheck.recommendation.reason)
          riskFactors.push('Concentración sectorial elevada')
        }
      }

      if (!commissionImpact.is_profitable) {
        if (finalAction !== 'AVOID') {
          finalAction = 'AVOID'
        }
        reasons.push(`Las comisiones (${commissionImpact.break_even_percentage}%) superan el retorno esperado`)
        riskFactors.push('Rentabilidad negativa después de comisiones')
      }

      if (finalAction === 'PROCEED') {
        reasons.push('Inversión dentro de parámetros recomendados')
        reasons.push(`Rentabilidad neta estimada: ${commissionImpact.net_upside_after_costs}%`)
      }

      res.json({
        success: true,
        data: {
          diversification_check: diversificationCheck,
          commission_impact: commissionImpact,
          final_recommendation: {
            action: finalAction,
            suggested_amount: diversificationCheck.recommendation.suggested_amount,
            reasons,
            risk_factors: riskFactors
          }
        },
        timestamp: new Date().toISOString()
      })

      logger.info(`Diversification calculated for ${symbol}: ${finalAction}`)

    } catch (error) {
      logger.error('Error calculating diversification:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate diversification',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * POST /api/v1/opportunities/scan/manual
   * Ejecuta un scan manual de oportunidades
   */
  async runManualScan(req: Request, res: Response): Promise<void> {
    try {
      const validation = ManualScanSchema.safeParse(req.body)
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid scan configuration',
          details: validation.error.errors
        })
        return
      }

      const config = validation.data
      
      logger.info('Starting manual opportunity scan with config:', config)
      
      const result = await opportunityScannerJob.runManualScan(config)
      
      if (result.success) {
        res.json({
          success: true,
          data: {
            opportunities_found: result.opportunitiesFound,
            avg_score: result.avgScore,
            processing_time_ms: result.processingTime,
            config_used: config
          },
          message: 'Manual scan completed successfully',
          timestamp: new Date().toISOString()
        })

        logger.info(`Manual scan completed: ${result.opportunitiesFound} opportunities found`)
      } else {
        res.status(500).json({
          success: false,
          error: 'Manual scan failed',
          message: result.error,
          timestamp: new Date().toISOString()
        })
      }

    } catch (error) {
      logger.error('Error running manual scan:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to run manual scan',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/opportunities/scanner/status
   * Obtiene el estado del scanner de oportunidades
   */
  async getScannerStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting scanner status')
      
      const jobStatus = opportunityScannerJob.getJobStatus()
      const performanceMetrics = opportunityScannerJob.getPerformanceMetrics()
      const opportunityStats = await opportunityService.getOpportunityStats()
      
      res.json({
        success: true,
        data: {
          job_status: jobStatus,
          performance_metrics: performanceMetrics,
          opportunity_stats: opportunityStats
        },
        timestamp: new Date().toISOString()
      })

      logger.info('Scanner status retrieved successfully')

    } catch (error) {
      logger.error('Error getting scanner status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get scanner status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/opportunities/stats
   * Obtiene estadísticas de oportunidades
   */
  async getOpportunityStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting opportunity statistics')
      
      const stats = await opportunityService.getOpportunityStats()
      const performanceMetrics = opportunityScannerJob.getPerformanceMetrics()
      
      res.json({
        success: true,
        data: {
          opportunity_stats: stats,
          scanner_performance: {
            total_scans: performanceMetrics.totalScans,
            success_rate: performanceMetrics.successRate,
            last_scan: performanceMetrics.lastScanResults
          }
        },
        timestamp: new Date().toISOString()
      })

      logger.info('Opportunity statistics retrieved successfully')

    } catch (error) {
      logger.error('Error getting opportunity stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get opportunity stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * POST /api/v1/opportunities/scanner/force-run
   * Fuerza la ejecución inmediata del scanner
   */
  async forceScannerRun(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Forcing scanner run')
      
      // Ejecutar de forma asíncrona para no bloquear la respuesta
      opportunityScannerJob.forceRun().catch(error => {
        logger.error('Error in forced scanner run:', error)
      })
      
      res.json({
        success: true,
        message: 'Scanner run initiated',
        timestamp: new Date().toISOString()
      })

      logger.info('Forced scanner run initiated')

    } catch (error) {
      logger.error('Error forcing scanner run:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to force scanner run',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/opportunities/health
   * Health check del sistema de oportunidades
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Running opportunity system health check')
      
      const healthResult = await opportunityScannerJob.healthCheck()
      
      if (healthResult.healthy) {
        res.json({
          success: true,
          healthy: true,
          message: healthResult.message,
          details: healthResult.details,
          timestamp: new Date().toISOString()
        })
      } else {
        res.status(503).json({
          success: false,
          healthy: false,
          message: healthResult.message,
          timestamp: new Date().toISOString()
        })
      }

      logger.info(`Health check completed: ${healthResult.healthy}`)

    } catch (error) {
      logger.error('Error in health check:', error)
      res.status(503).json({
        success: false,
        healthy: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Export singleton
export const opportunityController = new OpportunityController()