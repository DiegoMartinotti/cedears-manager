import { createLogger } from '../utils/logger.js'
import { Trade, TradeData } from '../models/Trade.js'
import { OperationCommissionService } from './commission/OperationCommissionService.js'
import { CustodyCommissionService } from './commission/CustodyCommissionService.js'
import { CommissionAnalysisService } from './commission/CommissionAnalysisService.js'
import { CommissionConfigService } from './commission/CommissionConfigService.js'
import type { 
  CommissionConfig, 
  CommissionCalculation, 
  CustodyCalculation, 
  CommissionProjection 
} from '../types/commission.js'

// Re-export types for other modules
export type { 
  CommissionConfig, 
  CommissionCalculation, 
  CustodyCalculation, 
  CommissionProjection 
} from '../types/commission.js'

const logger = createLogger('CommissionService')





export class CommissionService {
  private operationService = new OperationCommissionService()
  private custodyService = new CustodyCommissionService()
  private analysisService = new CommissionAnalysisService()
  private configService = new CommissionConfigService()

  /**
   * Calcula comisiones para una operación específica
   */
  calculateOperationCommission(
    type: 'BUY' | 'SELL',
    totalAmount: number,
    config?: CommissionConfig
  ): CommissionCalculation {
    const commissionConfig = config || this.configService.getDefaultConfiguration()
    return this.operationService.calculateOperationCommission(type, totalAmount, commissionConfig)
  }

  /**
   * Calcula el costo de custodia mensual
   */
  calculateCustodyFee(
    portfolioValueARS: number,
    config?: CommissionConfig
  ): CustodyCalculation {
    const commissionConfig = config || this.configService.getDefaultConfiguration()
    return this.custodyService.calculateCustodyFee(portfolioValueARS, commissionConfig)
  }

  /**
   * Proyecta el impacto total de comisiones para una operación
   */
  calculateCommissionProjection(
    type: 'BUY' | 'SELL',
    operationAmount: number,
    currentPortfolioValueARS: number,
    config?: CommissionConfig
  ): CommissionProjection {
    try {
      const commissionConfig = config || this.configService.getDefaultConfiguration()
      
      const operationCommission = this.operationService
        .calculateOperationCommission(type, operationAmount, commissionConfig)
      
      // Para proyección de custodia, usar el valor de cartera después de la operación
      const projectedPortfolioValue = type === 'BUY' 
        ? currentPortfolioValueARS + operationAmount
        : currentPortfolioValueARS

      const custody = this.custodyService.calculateCustodyFee(projectedPortfolioValue, commissionConfig)

      const totalFirstYearCost = operationCommission.totalCommission + custody.annualFee
      const breakEvenImpact = (totalFirstYearCost / operationAmount) * 100

      const projection: CommissionProjection = {
        operation: operationCommission,
        custody,
        totalFirstYearCost,
        breakEvenImpact
      }

      logger.info('Commission projection calculated:', {
        type,
        operationAmount,
        totalFirstYearCost,
        breakEvenImpact: `${breakEvenImpact.toFixed(2)}%`
      })

      return projection
    } catch (error) {
      logger.error('Error calculating commission projection:', error)
      throw new Error(`Failed to calculate commission projection: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene las configuraciones de comisiones disponibles
   */
  getAvailableConfigurations(): CommissionConfig[] {
    return this.configService.getAvailableConfigurations()
  }

  /**
   * Obtiene configuración por broker
   */
  getConfigurationByBroker(broker: string): CommissionConfig | null {
    return this.configService.getConfigurationByBroker(broker)
  }

  /**
   * Análisis de comisiones históricas para un período
   */
  async analyzeHistoricalCommissions(filters?: {
    fromDate?: string
    toDate?: string
    instrumentId?: number
  }): Promise<{
    totalCommissionsPaid: number
    totalTaxesPaid: number
    averageCommissionPerTrade: number
    commissionByType: {
      buy: { count: number; total: number }
      sell: { count: number; total: number }
    }
    monthlyBreakdown: Array<{
      month: string
      commissions: number
      taxes: number
      trades: number
    }>
  }> {
    return this.analysisService.analyzeHistoricalCommissions(filters)
  }

  /**
   * Compara comisiones entre diferentes brokers
   */
  compareBrokerCommissions(
    operationType: 'BUY' | 'SELL',
    operationAmount: number,
    portfolioValueARS: number
  ): Array<{
    broker: string
    name: string
    operationCommission: CommissionCalculation
    custodyFee: CustodyCalculation
    totalFirstYearCost: number
    ranking: number
  }> {
    const configs = this.configService.getAvailableConfigurations()
    const configsRecord = configs.reduce((acc, config) => {
      acc[config.broker] = config
      return acc
    }, {} as Record<string, CommissionConfig>)

    return this.analysisService.compareBrokerCommissions(
      operationType,
      operationAmount,
      portfolioValueARS,
      configsRecord
    )
  }

  /**
   * Calcula el monto mínimo de inversión recomendado
   */
  calculateMinimumInvestmentForCommissionThreshold(
    commissionThresholdPercentage: number,
    config?: CommissionConfig
  ): {
    minimumAmount: number
    commissionPercentage: number
    recommendation: string
  } {
    const commissionConfig = config || this.configService.getDefaultConfiguration()
    return this.operationService.calculateMinimumInvestmentForCommissionThreshold(
      commissionThresholdPercentage,
      commissionConfig
    )
  }

  /**
   * Obtiene la configuración por defecto
   */
  getDefaultConfiguration(): CommissionConfig {
    return this.configService.getDefaultConfiguration()
  }

  /**
   * Establece una nueva configuración por defecto
   */
  setDefaultConfiguration(broker: string): boolean {
    return this.configService.setDefaultConfiguration(broker)
  }

  /**
   * Obtiene el servicio de custodia para acceso directo
   */
  getCustodyService(): CustodyCommissionService {
    return this.custodyService
  }

  /**
   * Obtiene todas las configuraciones disponibles
   */
  getAllConfigurations(): CommissionConfig[] {
    return this.configService.getAvailableConfigurations()
  }
}