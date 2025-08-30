import { Request, Response } from 'express'
import { z } from 'zod'
import { BreakEvenService } from '../services/BreakEvenService.js'
import { calculateCommissions, calculateBreakEvenMetrics } from '../utils/calculationHelpers.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('BreakEvenController')

// Esquemas de validación Zod
const CalculateBreakEvenSchema = z.object({
  tradeId: z.number().positive(),
  currentPrice: z.number().positive().optional(),
  projectionMonths: z.number().min(1).max(60).optional(),
  inflationRate: z.number().min(0).max(1).optional(),
  includeProjectedCustody: z.boolean().optional(),
  scenarioType: z.string().optional()
})

const MatrixParamsSchema = z.object({
  instrumentId: z.number().positive(),
  purchasePrice: z.number().positive(),
  quantity: z.number().positive(),
  inflationRates: z.array(z.number().min(0).max(1)),
  timeHorizons: z.array(z.number().min(1).max(120))
})

const CompareStrategiesSchema = z.object({
  tradeId: z.number().positive(),
  strategies: z.array(z.object({
    name: z.string(),
    sellPrice: z.number().positive(),
    sellDate: z.string().optional(),
    additionalCosts: z.number().optional()
  }))
})


export class BreakEvenController {
  private breakEvenService: BreakEvenService

  constructor() {
    this.breakEvenService = new BreakEvenService()
  }

  /**
   * POST /break-even/calculate/:tradeId
   * Calcula el break-even completo para una operación específica
   */
  async calculateBreakEven(req: Request, res: Response) {
    try {
      const tradeId = parseInt(req.params.tradeId)
      if (isNaN(tradeId)) {
        return res.status(400).json({
          error: 'Invalid trade ID',
          message: 'Trade ID must be a valid number'
        })
      }

      const validatedBody = CalculateBreakEvenSchema.parse({
        tradeId,
        ...req.body
      })

      const result = await this.breakEvenService.calculateBreakEven(validatedBody)

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error calculating break-even:', error)
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid request parameters',
          details: error.errors
        })
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * POST /break-even/projection
   * Genera proyecciones de break-even con inflación esperada
   */
  async generateProjection(req: Request, res: Response) {
    try {
      const { tradeId, inflationRate, months } = req.body

      if (!tradeId || typeof tradeId !== 'number') {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'tradeId is required and must be a number'
        })
      }

      const result = await this.breakEvenService.calculateBreakEven({
        tradeId,
        projectionMonths: months || 12,
        inflationRate: inflationRate || undefined,
        scenarioType: 'PROJECTION'
      })

      res.json({
        success: true,
        data: {
          analysis: result.analysis,
          projections: result.projections
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error generating projection:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * POST /break-even/portfolio
   * Análisis de break-even de toda la cartera
   */
  async analyzePortfolio(req: Request, res: Response) {
    try {
      const summary = await this.breakEvenService.getPortfolioBreakEvenSummary()

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error analyzing portfolio:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * POST /break-even/matrix
   * Genera matriz de sensibilidad (escenarios what-if)
   */
  async generateMatrix(req: Request, res: Response) {
    try {
      const validatedBody = MatrixParamsSchema.parse(req.body)
      const matrix = await this.breakEvenService.generateBreakEvenMatrix(validatedBody)

      res.json({
        success: true,
        data: {
          matrix,
          parameters: validatedBody
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error generating matrix:', error)
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid matrix parameters',
          details: error.errors
        })
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * GET /break-even/optimization/:tradeId
   * Obtiene sugerencias de optimización para una operación
   */
  async getOptimizations(req: Request, res: Response) {
    try {
      const tradeId = parseInt(req.params.tradeId)
      if (isNaN(tradeId)) {
        return res.status(400).json({
          error: 'Invalid trade ID',
          message: 'Trade ID must be a valid number'
        })
      }

      // Primero calculamos el break-even para obtener las optimizaciones
      const result = await this.breakEvenService.calculateBreakEven({
        tradeId,
        scenarioType: 'OPTIMIZATION'
      })

      res.json({
        success: true,
        data: {
          optimizations: result.optimizations,
          analysis: result.analysis
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting optimizations:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * POST /break-even/compare
   * Compara diferentes estrategias de venta
   */
  async compareStrategies(req: Request, res: Response) {
    try {
      const validatedBody = CompareStrategiesSchema.parse(req.body)
      
      // Para cada estrategia, calculamos el resultado
      const comparisons = []
      
      for (const strategy of validatedBody.strategies) {
        const result = await this.breakEvenService.calculateBreakEven({
          tradeId: validatedBody.tradeId,
          currentPrice: strategy.sellPrice,
          scenarioType: `STRATEGY_${strategy.name.toUpperCase()}`
        })
        
        comparisons.push({
          strategy: strategy.name,
          sellPrice: strategy.sellPrice,
          breakEvenPrice: result.analysis.break_even_price,
          profit: strategy.sellPrice - result.analysis.break_even_price,
          profitPercentage: ((strategy.sellPrice - result.analysis.break_even_price) / result.analysis.break_even_price) * 100,
          totalCosts: result.analysis.total_costs,
          daysToBreakEven: result.analysis.days_to_break_even
        })
      }

      res.json({
        success: true,
        data: {
          tradeId: validatedBody.tradeId,
          comparisons
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error comparing strategies:', error)
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Invalid comparison parameters',
          details: error.errors
        })
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * GET /break-even/trade/:tradeId
   * Obtiene el análisis de break-even más reciente para un trade
   */
  async getByTradeId(req: Request, res: Response) {
    try {
      const tradeId = parseInt(req.params.tradeId)
      if (isNaN(tradeId)) {
        return res.status(400).json({
          error: 'Invalid trade ID',
          message: 'Trade ID must be a valid number'
        })
      }

      const analysis = await this.breakEvenService.getBreakEvenByTradeId(tradeId)
      
      if (!analysis) {
        return res.status(404).json({
          error: 'Analysis not found',
          message: `No break-even analysis found for trade ${tradeId}`
        })
      }

      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting break-even by trade ID:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * GET /break-even/summary
   * Obtiene resumen estadístico de break-even
   */
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await this.breakEvenService.getPortfolioBreakEvenSummary()

      res.json({
        success: true,
        data: summary,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error getting break-even summary:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * POST /break-even/simulate
   * Simulador interactivo de break-even
   */
  async simulate(req: Request, res: Response) {
    try {
      const {
        purchasePrice,
        quantity,
        currentPrice,
        commissionRate = 0.005,
        inflationRate = 0.12,
        custodyMonths = 0
      } = req.body

      if (!purchasePrice || !quantity || !currentPrice) {
        return res.status(400).json({
          error: 'Invalid parameters',
          message: 'purchasePrice, quantity, and currentPrice are required'
        })
      }

      const { buyCommission, sellCommission, totalInvestment } = calculateCommissions(
        purchasePrice, quantity, currentPrice, commissionRate
      )
      
      const custodyFee = custodyMonths * 500 * 1.21
      const inflationImpact = totalInvestment * (inflationRate * custodyMonths / 12)
      const totalCosts = buyCommission + sellCommission + custodyFee + inflationImpact
      
      const metrics = calculateBreakEvenMetrics(
        totalInvestment, quantity, currentPrice, totalCosts
      )

      res.json({
        success: true,
        data: {
          simulation: {
            inputs: {
              purchasePrice, quantity, currentPrice,
              commissionRate, inflationRate, custodyMonths
            },
            results: {
              totalInvestment,
              ...metrics,
              costsBreakdown: {
                buyCommission, sellCommission, custodyFee, inflationImpact, totalCosts
              }
            }
          }
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Error simulating break-even:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * GET /break-even/health
   * Health check del sistema de break-even
   */
  async healthCheck(req: Request, res: Response) {
    try {
      const summary = await this.breakEvenService.getPortfolioBreakEvenSummary()
      
      res.json({
        success: true,
        data: {
          status: 'healthy',
          statistics: {
            totalAnalyses: summary.totalPositions,
            avgDaysToBreakEven: summary.averageDaysToBreakEven,
            healthyPositions: summary.positionsAboveBreakEven,
            concerningPositions: summary.positionsBelowBreakEven
          },
          services: {
            breakEvenService: 'operational',
            database: 'connected'
          }
        },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Break-even health check failed:', error)
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      })
    }
  }
}