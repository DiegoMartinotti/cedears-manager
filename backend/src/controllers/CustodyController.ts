import { Request, Response } from 'express'
import { z } from 'zod'
import { CustodyFee, type CustodyFeeFilters } from '../models/CustodyFee.js'
import { CustodyFeeJob } from '../jobs/custodyFeeJob.js'
import { CommissionService } from '../services/CommissionService.js'
import { DashboardService } from '../services/DashboardService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('CustodyController')

// Schemas de validación
const calculateCustodySchema = z.object({
  portfolioValue: z.number().min(0, 'Portfolio value must be non-negative'),
  broker: z.string().optional().default('Galicia')
})

const projectionSchema = z.object({
  portfolioValue: z.number().min(0),
  months: z.number().min(1).max(60).optional().default(12),
  monthlyGrowthRate: z.number().min(-0.1).max(0.5).optional().default(0.015),
  broker: z.string().optional().default('Galicia')
})

const optimizationSchema = z.object({
  portfolioValue: z.number().min(0),
  targetAnnualReturn: z.number().min(0).max(100).optional().default(15),
  broker: z.string().optional().default('Galicia')
})

const impactAnalysisSchema = z.object({
  portfolioValue: z.number().min(0),
  expectedAnnualReturn: z.number().min(0).max(100),
  broker: z.string().optional().default('Galicia')
})

const custodyFiltersSchema = z.object({
  startMonth: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
  endMonth: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
  broker: z.string().optional(),
  isExempt: z.boolean().optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional()
})

export class CustodyController {
  private custodyFeeModel: CustodyFee
  private custodyFeeJob: CustodyFeeJob
  private commissionService: CommissionService
  private dashboardService: DashboardService

  constructor() {
    this.custodyFeeModel = new CustodyFee()
    this.custodyFeeJob = new CustodyFeeJob()
    this.commissionService = new CommissionService()
    this.dashboardService = new DashboardService()
  }

  /**
   * GET /api/v1/custody/current
   * Obtener estado actual de custodia
   */
  getCurrentCustodyStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Getting current custody status')

      // Obtener valor actual de cartera
      const portfolioSummary = await this.dashboardService.getPortfolioSummary()
      const currentValue = portfolioSummary.totalValue || 0

      // Calcular custodia actual
      const custodyCalculation = this.commissionService.calculateCustodyFee(currentValue)

      // Obtener estadísticas del job
      const jobStats = this.custodyFeeJob.getStats()

      // Obtener último registro de custodia
      const recentRecords = await this.custodyFeeModel.findAll({})
      const lastRecord = recentRecords[0] || null

      // Calcular próxima fecha de custodia
      const nextCustodyDate = this.getNextCustodyDate()

      const response = {
        currentPortfolioValue: currentValue,
        custodyCalculation,
        isExempt: custodyCalculation.isExempt,
        nextCustodyDate,
        lastCalculatedCustody: lastRecord,
        jobStatus: {
          isRunning: jobStats.isRunning,
          lastExecution: jobStats.lastExecution,
          nextExecution: jobStats.nextExecution,
          successfulExecutions: jobStats.successfulExecutions,
          failedExecutions: jobStats.failedExecutions
        }
      }

      res.json({
        success: true,
        data: response
      })

    } catch (error) {
      logger.error('Error getting current custody status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get custody status',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * GET /api/v1/custody/history
   * Obtener histórico de fees de custodia
   */
  getCustodyHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const filtersResult = custodyFiltersSchema.safeParse(req.query)
      
      if (!filtersResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: filtersResult.error.issues
        })
        return
      }

      const filters: CustodyFeeFilters = filtersResult.data

      logger.info('Getting custody history with filters:', filters)

      const records = await this.custodyFeeModel.findAll(filters)
      const statistics = await this.custodyFeeModel.getStatistics(filters)

      res.json({
        success: true,
        data: {
          records,
          statistics,
          totalRecords: records.length
        }
      })

    } catch (error) {
      logger.error('Error getting custody history:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get custody history',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * GET /api/v1/custody/projection
   * Obtener proyección de custodia futura
   */
  getCustodyProjection = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationResult = projectionSchema.safeParse(req.query)
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues
        })
        return
      }

      const { portfolioValue, months, monthlyGrowthRate, broker } = validationResult.data

      logger.info('Calculating custody projections:', {
        portfolioValue,
        months,
        monthlyGrowthRate,
        broker
      })

      // Obtener configuración del broker
      const config = this.commissionService.getConfigurationByBroker(broker)
      
      // Calcular proyecciones usando el servicio extendido
      const custodyService = this.commissionService.getCustodyService()
      const projections = custodyService.projectFutureCustody(
        portfolioValue,
        months,
        monthlyGrowthRate,
        config
      )

      // Calcular resumen de proyección
      const totalProjectedCustody = projections.reduce((sum, p) => sum + p.custodyCalculation.totalMonthlyCost, 0)
      const thresholdCrossings = projections.filter(p => p.isThresholdCrossed)

      const response = {
        projections,
        summary: {
          totalMonths: months,
          totalProjectedCustody,
          averageMonthly: totalProjectedCustody / months,
          thresholdCrossings: thresholdCrossings.length,
          finalPortfolioValue: projections[projections.length - 1]?.portfolioValue || portfolioValue
        },
        parameters: {
          portfolioValue,
          months,
          monthlyGrowthRate,
          broker
        }
      }

      res.json({
        success: true,
        data: response
      })

    } catch (error) {
      logger.error('Error calculating custody projections:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate projections',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/custody/calculate
   * Calculadora manual de custodia
   */
  calculateCustody = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationResult = calculateCustodySchema.safeParse(req.body)
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.issues
        })
        return
      }

      const { portfolioValue, broker } = validationResult.data

      logger.info('Manual custody calculation:', { portfolioValue, broker })

      // Obtener configuración del broker
      const config = this.commissionService.getConfigurationByBroker(broker)
      
      // Calcular custodia
      const custodyCalculation = this.commissionService.calculateCustodyFee(portfolioValue, config)

      // Calcular información adicional
      const thresholdInfo = this.commissionService.getCustodyService()
        .calculateCustodyThreshold(config)

      res.json({
        success: true,
        data: {
          portfolioValue,
          broker,
          custodyCalculation,
          thresholdInfo,
          recommendations: this.generateBasicRecommendations(custodyCalculation, portfolioValue, config.custody.exemptAmount)
        }
      })

    } catch (error) {
      logger.error('Error calculating custody:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate custody',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * GET /api/v1/custody/optimization
   * Obtener recomendaciones de optimización
   */
  getCustodyOptimization = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationResult = optimizationSchema.safeParse(req.query)
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues
        })
        return
      }

      const { portfolioValue, targetAnnualReturn, broker } = validationResult.data

      logger.info('Calculating custody optimization:', {
        portfolioValue,
        targetAnnualReturn,
        broker
      })

      // Obtener configuración del broker
      const config = this.commissionService.getConfigurationByBroker(broker)
      const custodyService = this.commissionService.getCustodyService()

      // Calcular optimización
      const optimization = custodyService.optimizePortfolioSize(
        portfolioValue,
        targetAnnualReturn,
        config
      )

      // Análisis de impacto en rentabilidad
      const impactAnalysis = custodyService.analyzeImpactOnReturns(
        portfolioValue,
        targetAnnualReturn,
        config
      )

      res.json({
        success: true,
        data: {
          optimization,
          impactAnalysis,
          parameters: {
            portfolioValue,
            targetAnnualReturn,
            broker
          }
        }
      })

    } catch (error) {
      logger.error('Error calculating custody optimization:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate optimization',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/custody/impact-analysis
   * Análisis de impacto en rentabilidad
   */
  analyzeCustodyImpact = async (req: Request, res: Response): Promise<void> => {
    try {
      const validationResult = impactAnalysisSchema.safeParse(req.body)
      
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: validationResult.error.issues
        })
        return
      }

      const { portfolioValue, expectedAnnualReturn, broker } = validationResult.data

      logger.info('Analyzing custody impact on returns:', {
        portfolioValue,
        expectedAnnualReturn,
        broker
      })

      // Obtener configuración del broker
      const config = this.commissionService.getConfigurationByBroker(broker)
      const custodyService = this.commissionService.getCustodyService()

      // Realizar análisis de impacto
      const analysis = custodyService.analyzeImpactOnReturns(
        portfolioValue,
        expectedAnnualReturn,
        config
      )

      // Comparar con otros brokers
      const brokerComparisons = await this.compareBrokerCustodyImpact(
        portfolioValue,
        expectedAnnualReturn
      )

      res.json({
        success: true,
        data: {
          analysis,
          brokerComparisons,
          parameters: {
            portfolioValue,
            expectedAnnualReturn,
            broker
          }
        }
      })

    } catch (error) {
      logger.error('Error analyzing custody impact:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to analyze impact',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/custody/run-monthly-job
   * Ejecutar job mensual manualmente
   */
  runMonthlyJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const { targetMonth, dryRun = false } = req.body

      logger.info('Manual execution of monthly custody job:', { targetMonth, dryRun })

      // Configurar job para ejecución manual
      this.custodyFeeJob.reconfigure({ dryRun })

      const result = await this.custodyFeeJob.executeMonthlyCalculation(targetMonth)

      res.json({
        success: true,
        data: {
          jobResult: result,
          targetMonth: targetMonth || 'previous month',
          dryRun
        }
      })

    } catch (error) {
      logger.error('Error running monthly custody job:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to run monthly job',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * GET /api/v1/custody/job/status
   * Obtener estado del job de custodia
   */
  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.custodyFeeJob.getStats()

      res.json({
        success: true,
        data: {
          jobStats: stats,
          configuration: {
            enabled: true, // Podría venir de configuración
            schedule: '0 9 1 * *', // Día 1 de cada mes a las 9:00 AM
            timezone: 'America/Argentina/Buenos_Aires'
          }
        }
      })

    } catch (error) {
      logger.error('Error getting job status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/custody/update-payment-date/:id
   * Actualizar fecha de pago de un fee de custodia
   */
  updatePaymentDate = async (req: Request, res: Response): Promise<void> => {
    try {
      const custodyFeeId = parseInt(req.params.id)
      const { paymentDate } = req.body

      if (isNaN(custodyFeeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid custody fee ID'
        })
        return
      }

      if (!paymentDate || !this.isValidDateString(paymentDate)) {
        res.status(400).json({
          success: false,
          error: 'Invalid payment date format. Expected YYYY-MM-DD'
        })
        return
      }

      logger.info('Updating custody fee payment date:', { custodyFeeId, paymentDate })

      const updated = await this.custodyFeeModel.updatePaymentDate(custodyFeeId, paymentDate)

      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Custody fee record not found'
        })
        return
      }

      const updatedRecord = await this.custodyFeeModel.findById(custodyFeeId)

      res.json({
        success: true,
        data: {
          custodyFee: updatedRecord,
          message: 'Payment date updated successfully'
        }
      })

    } catch (error) {
      logger.error('Error updating payment date:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update payment date',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // Métodos auxiliares privados

  private getNextCustodyDate(): string {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    nextMonth.setHours(9, 0, 0, 0)
    return nextMonth.toISOString().split('T')[0]
  }

  private generateBasicRecommendations(
    custodyCalculation: any,
    portfolioValue: number,
    exemptAmount: number
  ): string[] {
    const recommendations = []

    if (custodyCalculation.isExempt) {
      recommendations.push('✅ Tu cartera actual está exenta de custodia')
      if (portfolioValue > exemptAmount * 0.9) {
        recommendations.push('⚠️ Te acercas al límite de exención')
      }
    } else {
      recommendations.push(`💰 Custodia mensual: $${custodyCalculation.totalMonthlyCost.toFixed(2)}`)
      if (portfolioValue < exemptAmount * 1.2) {
        recommendations.push('💡 Considera mantener cartera por debajo del límite')
      }
    }

    return recommendations
  }

  private async compareBrokerCustodyImpact(
    portfolioValue: number,
    expectedReturn: number
  ): Promise<Array<{
    broker: string
    custodyFee: number
    impactPercentage: number
    netReturn: number
  }>> {
    try {
      const brokers = this.commissionService.getAllConfigurations()
      
      return brokers.map(config => {
        const custodyCalculation = this.commissionService.calculateCustodyFee(portfolioValue, config)
        const grossReturn = portfolioValue * (expectedReturn / 100)
        const netReturn = grossReturn - custodyCalculation.annualFee
        const impactPercentage = (custodyCalculation.annualFee / grossReturn) * 100

        return {
          broker: config.broker,
          custodyFee: custodyCalculation.annualFee,
          impactPercentage,
          netReturn
        }
      }).sort((a, b) => a.custodyFee - b.custodyFee)
    } catch (error) {
      logger.error('Error comparing broker custody impact:', error)
      return []
    }
  }

  private isValidDateString(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) return false
    
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }
}