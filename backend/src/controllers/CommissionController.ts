import { Request, Response } from 'express'
import { CommissionService, CommissionConfig } from '../services/CommissionService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('CommissionController')

export class CommissionController {
  private commissionService = new CommissionService()

  /**
   * GET /api/v1/commissions/configs
   * Obtiene todas las configuraciones de comisiones disponibles
   */
  async getCommissionConfigs(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting commission configurations')
      
      const configs = this.commissionService.getAvailableConfigurations()
      
      res.status(200).json({
        success: true,
        data: configs,
        message: 'Commission configurations retrieved successfully'
      })
    } catch (error) {
      logger.error('Error getting commission configs:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get commission configurations',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/commissions/config
   * Guarda o actualiza una configuración de comisiones personalizada
   */
  async saveCommissionConfig(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Saving commission configuration:', req.body)

      const config: CommissionConfig = req.body

      // Validación básica
      if (!config.name || !config.broker) {
        res.status(400).json({
          success: false,
          error: 'Name and broker are required'
        })
        return
      }

      // Por ahora simulamos el guardado exitoso
      // En el futuro se implementaría persistencia en base de datos
      const savedConfig = {
        ...config,
        id: Date.now(), // ID temporal
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      res.status(201).json({
        success: true,
        data: savedConfig,
        message: 'Commission configuration saved successfully'
      })
    } catch (error) {
      logger.error('Error saving commission config:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to save commission configuration',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * GET /api/v1/commissions/active
   * Obtiene la configuración de comisiones activa
   */
  async getActiveConfig(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting active commission configuration')

      const activeConfig = this.commissionService.getDefaultConfiguration()

      res.status(200).json({
        success: true,
        data: activeConfig,
        message: 'Active commission configuration retrieved successfully'
      })
    } catch (error) {
      logger.error('Error getting active config:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get active commission configuration',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/commissions/calculate
   * Calcula comisiones para una operación específica
   */
  async calculateCommission(req: Request, res: Response): Promise<void> {
    try {
      const { type, amount, portfolioValue, broker } = req.body

      logger.info('Calculating commission:', { type, amount, portfolioValue, broker })

      // Validación de entrada
      if (!type || !amount) {
        res.status(400).json({
          success: false,
          error: 'Operation type and amount are required'
        })
        return
      }

      if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: 'Operation type must be BUY or SELL'
        })
        return
      }

      if (amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be greater than 0'
        })
        return
      }

      // Obtener configuración
      let config = this.commissionService.getDefaultConfiguration()
      
      if (broker) {
        const brokerConfig = this.commissionService.getConfigurationByBroker(broker)
        if (brokerConfig) {
          config = brokerConfig
        }
      }

      // Calcular comisiones
      const operationCommission = this.commissionService.calculateOperationCommission(
        type.toUpperCase() as 'BUY' | 'SELL',
        amount,
        config
      )

      let result: any = {
        operation: operationCommission
      }

      // Si se proporciona el valor de cartera, calcular proyección completa
      if (portfolioValue !== undefined && portfolioValue >= 0) {
        const projection = this.commissionService.calculateCommissionProjection(
          type.toUpperCase() as 'BUY' | 'SELL',
          amount,
          portfolioValue,
          config
        )
        result = projection
      }

      res.status(200).json({
        success: true,
        data: result,
        message: 'Commission calculated successfully'
      })
    } catch (error) {
      logger.error('Error calculating commission:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate commission',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * GET /api/v1/commissions/analysis
   * Análisis histórico de comisiones
   */
  async analyzeCommissions(req: Request, res: Response): Promise<void> {
    try {
      const { fromDate, toDate, instrumentId } = req.query

      logger.info('Analyzing historical commissions:', { fromDate, toDate, instrumentId })

      const filters: any = {}
      
      if (fromDate) {
        filters.fromDate = fromDate as string
      }
      
      if (toDate) {
        filters.toDate = toDate as string
      }
      
      if (instrumentId) {
        filters.instrumentId = parseInt(instrumentId as string)
      }

      const analysis = await this.commissionService.analyzeHistoricalCommissions(filters)

      res.status(200).json({
        success: true,
        data: analysis,
        message: 'Commission analysis completed successfully'
      })
    } catch (error) {
      logger.error('Error analyzing commissions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to analyze commissions',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/commissions/compare
   * Compara comisiones entre brokers
   */
  async compareBrokers(req: Request, res: Response): Promise<void> {
    try {
      const { operationType, operationAmount, portfolioValue } = req.body

      logger.info('Comparing broker commissions:', { operationType, operationAmount, portfolioValue })

      // Validación
      if (!operationType || !operationAmount || portfolioValue === undefined) {
        res.status(400).json({
          success: false,
          error: 'Operation type, amount, and portfolio value are required'
        })
        return
      }

      if (!['BUY', 'SELL'].includes(operationType.toUpperCase())) {
        res.status(400).json({
          success: false,
          error: 'Operation type must be BUY or SELL'
        })
        return
      }

      const comparison = this.commissionService.compareBrokerCommissions(
        operationType.toUpperCase() as 'BUY' | 'SELL',
        operationAmount,
        portfolioValue
      )

      res.status(200).json({
        success: true,
        data: comparison,
        message: 'Broker comparison completed successfully'
      })
    } catch (error) {
      logger.error('Error comparing brokers:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to compare brokers',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * POST /api/v1/commissions/minimum-investment
   * Calcula el monto mínimo de inversión recomendado
   */
  async calculateMinimumInvestment(req: Request, res: Response): Promise<void> {
    try {
      const { commissionThreshold, broker } = req.body

      logger.info('Calculating minimum investment:', { commissionThreshold, broker })

      if (!commissionThreshold || commissionThreshold <= 0) {
        res.status(400).json({
          success: false,
          error: 'Commission threshold percentage is required and must be greater than 0'
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

      const result = this.commissionService.calculateMinimumInvestmentForCommissionThreshold(
        commissionThreshold,
        config
      )

      res.status(200).json({
        success: true,
        data: result,
        message: 'Minimum investment calculated successfully'
      })
    } catch (error) {
      logger.error('Error calculating minimum investment:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate minimum investment',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * PUT /api/v1/commissions/active/:broker
   * Establece una configuración como activa
   */
  async setActiveConfig(req: Request, res: Response): Promise<void> {
    try {
      const { broker } = req.params

      logger.info('Setting active configuration:', { broker })

      if (!broker) {
        res.status(400).json({
          success: false,
          error: 'Broker parameter is required'
        })
        return
      }

      const success = this.commissionService.setDefaultConfiguration(broker)

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Broker configuration not found or inactive'
        })
        return
      }

      const newActiveConfig = this.commissionService.getDefaultConfiguration()

      res.status(200).json({
        success: true,
        data: newActiveConfig,
        message: 'Active configuration updated successfully'
      })
    } catch (error) {
      logger.error('Error setting active config:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to set active configuration',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }
}