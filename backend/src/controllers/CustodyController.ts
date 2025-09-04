import { Request, Response } from 'express'
import { z } from 'zod'
import { CustodyFee, type CustodyFeeFilters } from '../models/CustodyFee.js'
import { CustodyFeeJob } from '../jobs/custodyFeeJob.js'
import { CommissionService } from '../services/CommissionService.js'
import { DashboardService } from '../services/DashboardService.js'
import { createLogger } from '../utils/logger.js'
import {
  validateNumericId,
  validateDateString,
  buildUpdateResponse,
  buildProjectionResponse,
  buildOptimizationResponse,
  buildImpactAnalysisResponse,
  handleControllerError,
  sendSuccessResponse,
  sendValidationError,
  sendNotFoundError,
  logOperation,
  getCustodyServicesAndConfig,
  calculateOptimizationWithServices
} from '../utils/custodyHelpers.js'

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
        return sendValidationError(res, 'Invalid query parameters', validationResult.error.issues)
      }

      const { portfolioValue, months, monthlyGrowthRate, broker } = validationResult.data
      logOperation('Calculating custody projections', { portfolioValue, months, monthlyGrowthRate, broker })

      // Obtener servicios y configuración
      const { config, custodyService } = getCustodyServicesAndConfig(this.commissionService, broker)
      
      // Calcular proyecciones
      const projections = custodyService.projectFutureCustody(
        portfolioValue,
        months,
        monthlyGrowthRate,
        config
      )

      // Construir respuesta
      const responseData = buildProjectionResponse({
        projections,
        months,
        portfolioValue,
        monthlyGrowthRate,
        broker
      })

      sendSuccessResponse(res, responseData)

    } catch (error) {
      handleControllerError(res, error, 'calculate custody projections')
    }
  }

  /**
   * POST /api/v1/custody/calculate
   * Calculadora manual de custodia
   */
  // eslint-disable-next-line max-lines-per-function
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
      if (!config) {
        res.status(404).json({
          success: false,
          error: 'Broker configuration not found'
        })
        return
      }

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
        return sendValidationError(res, 'Invalid query parameters', validationResult.error.issues)
      }

      const { portfolioValue, targetAnnualReturn, broker } = validationResult.data
      logOperation('Calculating custody optimization', { portfolioValue, targetAnnualReturn, broker })

      // Obtener servicios y configuración
      const { config, custodyService } = getCustodyServicesAndConfig(this.commissionService, broker)

      // Calcular optimización e impacto
      const { optimization, impactAnalysis } = await calculateOptimizationWithServices(
        custodyService,
        portfolioValue,
        targetAnnualReturn,
        config
      )

      // Construir respuesta
      const responseData = buildOptimizationResponse({
        optimization,
        impactAnalysis,
        portfolioValue,
        targetAnnualReturn,
        broker
      })

      sendSuccessResponse(res, responseData)

    } catch (error) {
      handleControllerError(res, error, 'calculate custody optimization')
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
        return sendValidationError(res, 'Invalid request body', validationResult.error.issues)
      }

      const { portfolioValue, expectedAnnualReturn, broker } = validationResult.data
      logOperation('Analyzing custody impact on returns', { portfolioValue, expectedAnnualReturn, broker })

      // Obtener servicios y configuración
      const { config, custodyService } = getCustodyServicesAndConfig(this.commissionService, broker)

      // Realizar análisis de impacto
      const analysis = custodyService.analyzeImpactOnReturns(portfolioValue, expectedAnnualReturn, config)

      // Comparar con otros brokers
      const brokerComparisons = await this.compareBrokerCustodyImpact(portfolioValue, expectedAnnualReturn)

      // Construir respuesta
      const responseData = buildImpactAnalysisResponse({
        analysis,
        brokerComparisons,
        portfolioValue,
        expectedAnnualReturn,
        broker
      })

      sendSuccessResponse(res, responseData)

    } catch (error) {
      handleControllerError(res, error, 'analyze custody impact')
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
      const { paymentDate } = req.body

      // Validar ID
      const idParam = req.params.id
      if (typeof idParam !== 'string') {
        return sendValidationError(res, 'Invalid custody fee ID')
      }
      const idValidation = validateNumericId(idParam)
      if (!idValidation.isValid) {
        return sendValidationError(res, idValidation.error)
      }

      // Validar fecha
      const dateValidation = validateDateString(paymentDate)
      if (!dateValidation.isValid) {
        return sendValidationError(res, dateValidation.error)
      }

      const custodyFeeId = idValidation.numericId
      logOperation('Updating custody fee payment date', { custodyFeeId, paymentDate })

      // Actualizar fecha de pago
      const updated = await this.custodyFeeModel.updatePaymentDate(custodyFeeId, paymentDate)
      if (!updated) {
        return sendNotFoundError(res, 'Custody fee record not found')
      }

      // Obtener registro actualizado y enviar respuesta
      const updatedRecord = await this.custodyFeeModel.findById(custodyFeeId)
      const responseData = buildUpdateResponse(updatedRecord, 'Payment date updated successfully')
      sendSuccessResponse(res, responseData)

    } catch (error) {
      handleControllerError(res, error, 'update payment date')
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

}