import { Trade } from '../../models/Trade.js'
import { logger } from '../../utils/logger.js'
import type { CommissionConfig, CommissionCalculation, CustodyCalculation } from '../../types/commission.js'
import { OperationCommissionService } from './OperationCommissionService.js'
import { CustodyCommissionService } from './CustodyCommissionService.js'

/**
 * Servicio especializado en análisis histórico y comparaciones de comisiones
 */
export class CommissionAnalysisService {
  private tradeModel = new Trade()
  private operationService = new OperationCommissionService()
  private custodyService = new CustodyCommissionService()

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
    try {
      const trades = await this.tradeModel.findAll(filters)
      
      const analysis = this.processTradesForAnalysis(trades)

      logger.info('Historical commission analysis:', {
        totalTrades: trades.length,
        totalCommissions: analysis.totalCommissionsPaid,
        totalTaxes: analysis.totalTaxesPaid,
        avgCommissionPerTrade: analysis.averageCommissionPerTrade
      })

      return analysis
    } catch (error) {
      logger.error('Error analyzing historical commissions:', error)
      throw new Error(`Failed to analyze historical commissions: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Compara comisiones entre diferentes brokers
   */
  compareBrokerCommissions(
    operationType: 'BUY' | 'SELL',
    operationAmount: number,
    portfolioValueARS: number,
    configs: Record<string, CommissionConfig>
  ): Array<{
    broker: string
    name: string
    operationCommission: CommissionCalculation
    custodyFee: CustodyCalculation
    totalFirstYearCost: number
    ranking: number
  }> {
    const comparisons = Object.values(configs)
      .filter(config => config.isActive)
      .map(config => {
        const operationCommission = this.operationService
          .calculateOperationCommission(operationType, operationAmount, config)
        const custodyFee = this.custodyService
          .calculateCustodyFee(portfolioValueARS, config)
        const totalFirstYearCost = operationCommission.totalCommission + custodyFee.annualFee

        return {
          broker: config.broker,
          name: config.name,
          operationCommission,
          custodyFee,
          totalFirstYearCost,
          ranking: 0
        }
      })
      .sort((a, b) => a.totalFirstYearCost - b.totalFirstYearCost)

    // Asignar ranking
    comparisons.forEach((comparison, index) => {
      comparison.ranking = index + 1
    })

    logger.info('Broker commission comparison:', {
      operation: operationType,
      amount: operationAmount,
      cheapest: comparisons[0]?.name
    })

    return comparisons
  }

  /**
   * Analiza el impacto de comisiones en el rendimiento
   */
  analyzeCommissionImpactOnReturns(
    initialInvestment: number,
    expectedAnnualReturn: number,
    holdingPeriodYears: number,
    config: CommissionConfig
  ): {
    grossReturn: number
    buyCommission: number
    sellCommission: number
    totalCustodyFees: number
    netReturn: number
    returnImpact: number
    breakEvenReturn: number
  } {
    try {
      // Calcular retorno bruto
      const futureValue = initialInvestment * Math.pow(1 + expectedAnnualReturn / 100, holdingPeriodYears)
      const grossReturn = futureValue - initialInvestment

      // Calcular comisiones
      const buyCommission = this.operationService
        .calculateOperationCommission('BUY', initialInvestment, config).totalCommission
      const sellCommission = this.operationService
        .calculateOperationCommission('SELL', futureValue, config).totalCommission

      // Calcular custodia (promedio entre valor inicial y final)
      const avgPortfolioValue = (initialInvestment + futureValue) / 2
      const annualCustody = this.custodyService
        .calculateCustodyFee(avgPortfolioValue, config).annualFee
      const totalCustodyFees = annualCustody * holdingPeriodYears

      // Calcular retorno neto
      const totalCommissions = buyCommission + sellCommission + totalCustodyFees
      const netReturn = grossReturn - totalCommissions
      const returnImpact = (totalCommissions / grossReturn) * 100

      // Calcular retorno break-even (para cubrir comisiones)
      const breakEvenReturn = (totalCommissions / initialInvestment) * 100

      const analysis = {
        grossReturn,
        buyCommission,
        sellCommission,
        totalCustodyFees,
        netReturn,
        returnImpact,
        breakEvenReturn
      }

      logger.info('Commission impact analysis:', {
        holdingPeriod: `${holdingPeriodYears} años`,
        returnImpact: `${returnImpact.toFixed(2)}%`,
        breakEvenReturn: `${breakEvenReturn.toFixed(2)}%`
      })

      return analysis
    } catch (error) {
      logger.error('Error analyzing commission impact:', error)
      throw new Error(`Failed to analyze commission impact: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Procesa trades para generar análisis estadístico
   */
  private processTradesForAnalysis(trades: any[]): {
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
  } {
    let totalCommissions = 0
    let totalTaxes = 0
    const commissionByType = {
      buy: { count: 0, total: 0 },
      sell: { count: 0, total: 0 }
    }
    
    const monthlyData = new Map<string, { commissions: number; taxes: number; trades: number }>()

    for (const trade of trades) {
      totalCommissions += trade.commission || 0
      totalTaxes += trade.taxes || 0

      const type = trade.type.toLowerCase() as 'buy' | 'sell'
      commissionByType[type].count++
      commissionByType[type].total += trade.commission || 0

      const month = trade.trade_date.substring(0, 7) // YYYY-MM
      const monthData = monthlyData.get(month) || { commissions: 0, taxes: 0, trades: 0 }
      monthData.commissions += trade.commission || 0
      monthData.taxes += trade.taxes || 0
      monthData.trades++
      monthlyData.set(month, monthData)
    }

    const monthlyBreakdown = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        commissions: data.commissions,
        taxes: data.taxes,
        trades: data.trades
      }))
      .sort((a, b) => b.month.localeCompare(a.month))

    return {
      totalCommissionsPaid: totalCommissions,
      totalTaxesPaid: totalTaxes,
      averageCommissionPerTrade: trades.length > 0 ? totalCommissions / trades.length : 0,
      commissionByType,
      monthlyBreakdown
    }
  }
}