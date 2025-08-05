import { Request, Response } from 'express'
import { TradeService, CommissionConfig } from '../services/TradeService.js'
import { CommissionService } from '../services/CommissionService.js'
import {
  TradeCreateSchema,
  TradeUpdateSchema,
  TradeQuerySchema,
  TradeParamsSchema,
  TradeSummaryQuerySchema
} from '../schemas/trade.schema.js'
import { createLogger } from '../utils/logger.js'
import { ZodError } from 'zod'

const logger = createLogger('TradeController')

export class TradeController {
  private tradeService = new TradeService()
  private commissionService = new CommissionService()

  /**
   * GET /trades
   * Obtiene todas las operaciones con filtros opcionales
   */
  async getTrades(req: Request, res: Response): Promise<void> {
    try {
      const query = TradeQuerySchema.parse(req.query)
      
      const trades = await this.tradeService.findAllWithInstruments({
        instrumentId: query.instrumentId,
        type: query.type,
        fromDate: query.fromDate,
        toDate: query.toDate,
        limit: query.limit,
        offset: query.offset
      })

      logger.info(`Retrieved ${trades.length} trades`, {
        instrumentId: query.instrumentId,
        type: query.type,
        dateRange: query.fromDate ? `${query.fromDate} to ${query.toDate}` : 'all',
        pagination: `${query.offset}-${query.offset + query.limit}`
      })

      res.json({
        success: true,
        data: trades,
        meta: {
          count: trades.length,
          limit: query.limit,
          offset: query.offset,
          hasMore: trades.length === query.limit
        }
      })
    } catch (error) {
      this.handleError(error, res, 'Error retrieving trades')
    }
  }

  /**
   * GET /trades/:id
   * Obtiene una operación específica por ID
   */
  async getTradeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = TradeParamsSchema.parse(req.params)
      
      const trade = await this.tradeService.findById(id)
      
      if (!trade) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
          message: `Trade with ID ${id} does not exist`
        })
        return
      }

      logger.info(`Retrieved trade ${id}`)

      res.json({
        success: true,
        data: trade
      })
    } catch (error) {
      this.handleError(error, res, 'Error retrieving trade')
    }
  }

  /**
   * POST /trades
   * Crea una nueva operación con cálculo automático de comisiones
   */
  async createTrade(req: Request, res: Response): Promise<void> {
    try {
      const tradeData = TradeCreateSchema.parse(req.body)
      
      // Extraer configuración de comisiones si se proporciona
      const { commission_config, ...tradeFields } = req.body
      let commissionConfig: Partial<CommissionConfig> | undefined

      if (commission_config) {
        commissionConfig = {
          buy: commission_config.buy,
          sell: commission_config.sell,
          custody: commission_config.custody
        }
      }

      const newTrade = await this.tradeService.createTrade({
        ...tradeFields,
        commissionConfig
      })

      logger.info(`Created new ${tradeData.type} trade:`, {
        id: newTrade.id,
        instrumentId: tradeData.instrument_id,
        quantity: tradeData.quantity,
        price: tradeData.price,
        totalAmount: tradeData.total_amount
      })

      res.status(201).json({
        success: true,
        data: newTrade,
        message: 'Trade created successfully'
      })
    } catch (error) {
      this.handleError(error, res, 'Error creating trade')
    }
  }

  /**
   * PUT /trades/:id
   * Actualiza una operación existente
   */
  async updateTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = TradeParamsSchema.parse(req.params)
      const updateData = TradeUpdateSchema.parse(req.body)

      const updatedTrade = await this.tradeService.update(id, updateData)

      if (!updatedTrade) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
          message: `Trade with ID ${id} does not exist`
        })
        return
      }

      logger.info(`Updated trade ${id}`)

      res.json({
        success: true,
        data: updatedTrade,
        message: 'Trade updated successfully'
      })
    } catch (error) {
      this.handleError(error, res, 'Error updating trade')
    }
  }

  /**
   * DELETE /trades/:id
   * Elimina una operación
   */
  async deleteTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = TradeParamsSchema.parse(req.params)

      const deleted = await this.tradeService.delete(id)

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Trade not found',
          message: `Trade with ID ${id} does not exist`
        })
        return
      }

      logger.info(`Deleted trade ${id}`)

      res.json({
        success: true,
        message: 'Trade deleted successfully'
      })
    } catch (error) {
      this.handleError(error, res, 'Error deleting trade')
    }
  }

  /**
   * POST /trades/calculate-commission
   * Calcula comisiones para una operación sin crearla
   */
  async calculateCommission(req: Request, res: Response): Promise<void> {
    try {
      const { type, total_amount, broker } = req.body

      if (!type || !total_amount) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'type and total_amount are required'
        })
        return
      }

      if (!['BUY', 'SELL'].includes(type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid type',
          message: 'type must be BUY or SELL'
        })
        return
      }

      let config = this.commissionService.getDefaultConfiguration()
      if (broker) {
        const brokerConfig = this.commissionService.getConfigurationByBroker(broker)
        if (brokerConfig) {
          config = brokerConfig
        }
      }

      const calculation = this.commissionService.calculateOperationCommission(
        type as 'BUY' | 'SELL',
        total_amount,
        config
      )

      logger.info(`Calculated commission for ${type} operation:`, {
        totalAmount: total_amount,
        commission: calculation.totalCommission,
        broker: config.broker
      })

      res.json({
        success: true,
        data: {
          calculation,
          config: {
            broker: config.broker,
            name: config.name
          }
        }
      })
    } catch (error) {
      this.handleError(error, res, 'Error calculating commission')
    }
  }

  /**
   * POST /trades/project-commission
   * Proyecta el impacto total de comisiones (operación + custodia)
   */
  async projectCommission(req: Request, res: Response): Promise<void> {
    try {
      const { type, operation_amount, portfolio_value_ars, broker } = req.body

      if (!type || !operation_amount || portfolio_value_ars === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'type, operation_amount, and portfolio_value_ars are required'
        })
        return
      }

      let config = this.commissionService.getDefaultConfiguration()
      if (broker) {
        const brokerConfig = this.commissionService.getConfigurationByBroker(broker)
        if (brokerConfig) {
          config = brokerConfig
        }
      }

      const projection = this.commissionService.calculateCommissionProjection(
        type as 'BUY' | 'SELL',
        operation_amount,
        portfolio_value_ars,
        config
      )

      logger.info(`Projected commission impact:`, {
        type,
        operationAmount: operation_amount,
        portfolioValue: portfolio_value_ars,
        totalFirstYearCost: projection.totalFirstYearCost,
        breakEvenImpact: `${projection.breakEvenImpact.toFixed(2)}%`
      })

      res.json({
        success: true,
        data: {
          projection,
          config: {
            broker: config.broker,
            name: config.name
          }
        }
      })
    } catch (error) {
      this.handleError(error, res, 'Error projecting commission')
    }
  }

  /**
   * GET /trades/:id/analyze
   * Analiza una operación considerando inflación y comisiones
   */
  async analyzeTrade(req: Request, res: Response): Promise<void> {
    try {
      const { id } = TradeParamsSchema.parse(req.params)
      const { current_price } = req.query

      const currentPriceNum = current_price ? parseFloat(current_price as string) : undefined

      const analysis = await this.tradeService.analyzeTrade(id, currentPriceNum)

      logger.info(`Analyzed trade ${id}:`, {
        breakEvenPrice: analysis.breakEvenPrice,
        realGainPercentage: `${analysis.realGainPercentage.toFixed(2)}%`,
        annualizedReturn: analysis.annualizedReturn ? `${analysis.annualizedReturn.toFixed(2)}%` : 'N/A'
      })

      res.json({
        success: true,
        data: analysis
      })
    } catch (error) {
      this.handleError(error, res, 'Error analyzing trade')
    }
  }

  /**
   * POST /trades/validate-diversification
   * Valida diversificación antes de una compra
   */
  async validateDiversification(req: Request, res: Response): Promise<void> {
    try {
      const { instrument_id, purchase_amount } = req.body

      if (!instrument_id || !purchase_amount) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'instrument_id and purchase_amount are required'
        })
        return
      }

      const validation = await this.tradeService.validateDiversification(
        instrument_id,
        purchase_amount
      )

      logger.info(`Diversification validation:`, {
        instrumentId: instrument_id,
        purchaseAmount: purchase_amount,
        isValid: validation.isValid,
        violations: validation.violations.length,
        warnings: validation.warnings.length
      })

      res.json({
        success: true,
        data: validation
      })
    } catch (error) {
      this.handleError(error, res, 'Error validating diversification')
    }
  }

  /**
   * GET /trades/summary
   * Obtiene resumen de operaciones con métricas avanzadas
   */
  async getTradesSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = TradeSummaryQuerySchema.parse(req.query)

      const summary = await this.tradeService.getAdvancedSummary(query.instrumentId)

      logger.info('Retrieved trades summary:', {
        instrumentId: query.instrumentId,
        totalTrades: summary.basic.total_trades,
        totalCommissions: summary.basic.total_commission
      })

      res.json({
        success: true,
        data: summary
      })
    } catch (error) {
      this.handleError(error, res, 'Error retrieving trades summary')
    }
  }

  /**
   * GET /trades/monthly-summary
   * Obtiene resumen mensual de operaciones
   */
  async getMonthlyTradesSummary(req: Request, res: Response): Promise<void> {
    try {
      const query = TradeSummaryQuerySchema.parse(req.query)

      const monthlySummary = await this.tradeService.getMonthlyTradesSummary(query.year)

      logger.info('Retrieved monthly trades summary:', {
        year: query.year,
        months: monthlySummary.length
      })

      res.json({
        success: true,
        data: monthlySummary
      })
    } catch (error) {
      this.handleError(error, res, 'Error retrieving monthly trades summary')
    }
  }

  /**
   * GET /commissions/brokers
   * Obtiene configuraciones de comisiones disponibles
   */
  async getBrokerConfigurations(req: Request, res: Response): Promise<void> {
    try {
      const configurations = this.commissionService.getAvailableConfigurations()

      res.json({
        success: true,
        data: configurations
      })
    } catch (error) {
      this.handleError(error, res, 'Error retrieving broker configurations')
    }
  }

  /**
   * POST /commissions/compare
   * Compara comisiones entre brokers
   */
  async compareBrokerCommissions(req: Request, res: Response): Promise<void> {
    try {
      const { operation_type, operation_amount, portfolio_value_ars } = req.body

      if (!operation_type || !operation_amount || portfolio_value_ars === undefined) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'operation_type, operation_amount, and portfolio_value_ars are required'
        })
        return
      }

      const comparison = this.commissionService.compareBrokerCommissions(
        operation_type as 'BUY' | 'SELL',
        operation_amount,
        portfolio_value_ars
      )

      logger.info('Compared broker commissions:', {
        operationType: operation_type,
        operationAmount: operation_amount,
        cheapest: comparison[0]?.name
      })

      res.json({
        success: true,
        data: comparison
      })
    } catch (error) {
      this.handleError(error, res, 'Error comparing broker commissions')
    }
  }

  /**
   * GET /commissions/history
   * Analiza comisiones históricas
   */
  async getCommissionHistory(req: Request, res: Response): Promise<void> {
    try {
      const query = TradeQuerySchema.parse(req.query)

      const history = await this.commissionService.analyzeHistoricalCommissions({
        fromDate: query.fromDate,
        toDate: query.toDate,
        instrumentId: query.instrumentId
      })

      logger.info('Retrieved commission history:', {
        totalCommissions: history.totalCommissionsPaid,
        totalTrades: history.commissionByType.buy.count + history.commissionByType.sell.count,
        avgCommissionPerTrade: history.averageCommissionPerTrade
      })

      res.json({
        success: true,
        data: history
      })
    } catch (error) {
      this.handleError(error, res, 'Error retrieving commission history')
    }
  }

  /**
   * POST /commissions/minimum-investment
   * Calcula inversión mínima recomendada para threshold de comisiones
   */
  async getMinimumInvestmentRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { commission_threshold_percentage, broker } = req.body

      if (!commission_threshold_percentage) {
        res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'commission_threshold_percentage is required'
        })
        return
      }

      let config = this.commissionService.getDefaultConfiguration()
      if (broker) {
        const brokerConfig = this.commissionService.getConfigurationByBroker(broker)
        if (brokerConfig) {
          config = brokerConfig
        }
      }

      const recommendation = this.commissionService.calculateMinimumInvestmentForCommissionThreshold(
        commission_threshold_percentage,
        config
      )

      logger.info('Calculated minimum investment recommendation:', {
        threshold: `${commission_threshold_percentage}%`,
        minimumAmount: recommendation.minimumAmount,
        broker: config.broker
      })

      res.json({
        success: true,
        data: {
          recommendation,
          config: {
            broker: config.broker,
            name: config.name
          }
        }
      })
    } catch (error) {
      this.handleError(error, res, 'Error calculating minimum investment recommendation')
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private handleError(error: unknown, res: Response, context: string): void {
    logger.error(context, error)

    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
        message: 'Invalid request data'
      })
      return
    }

    if (error instanceof Error) {
      // Errores de negocio conocidos
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
          message: error.message
        })
        return
      }

      if (error.message.includes('diversification') || error.message.includes('violation')) {
        res.status(422).json({
          success: false,
          error: 'Business rule violation',
          message: error.message
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
      return
    }

    res.status(500).json({
      success: false,
      error: 'Unknown error',
      message: 'An unexpected error occurred'
    })
  }
}