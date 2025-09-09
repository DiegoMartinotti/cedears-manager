/* eslint-disable max-lines-per-function, complexity, max-depth */
import { PortfolioService } from './PortfolioService.js'
import { TradeService } from './TradeService.js'
import { QuoteService } from './QuoteService.js'
import { UVAService } from './UVAService.js'
import { InstrumentService } from './InstrumentService.js'
import { CommissionService } from './CommissionService.js'
import {
  DashboardSummary,
  PortfolioSummary,
  CurrentPosition,
  MarketSummary,
  MarketMover,
  SectorPerformance,
  PerformanceMetrics,
  DistributionData,
  AssetDistribution,
  SectorDistribution,
  ESGDistribution
} from './DashboardTypes.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('DashboardService')

export class DashboardService {
  private portfolioService = new PortfolioService()
  private tradeService = new TradeService()
  private quoteService = new QuoteService()
  private uvaService = new UVAService()
  private instrumentService = new InstrumentService()

  /**
   * Obtiene el resumen completo del dashboard
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      logger.info('Generating complete dashboard summary')

      const [
        portfolioSummary,
        currentPositions,
        marketSummary,
        performanceMetrics
      ] = await Promise.all([
        this.getPortfolioSummary(),
        this.getCurrentPositions(10), // Top 10 positions
        this.getMarketSummary(),
        this.getPerformanceMetrics()
      ])

      const dashboardSummary: DashboardSummary = {
        portfolioSummary,
        recentPositions: currentPositions,
        marketSummary,
        performanceMetrics,
        notifications: [] // TODO: Implement notifications service
      }

      logger.info('Dashboard summary generated successfully', {
        totalPositions: currentPositions.length,
        portfolioValue: portfolioSummary.totalValue,
        unrealizedPnL: portfolioSummary.unrealizedPnL
      })

      return dashboardSummary
    } catch (error) {
      logger.error('Error generating dashboard summary:', error)
      throw new Error(`Failed to generate dashboard summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene el resumen del portfolio con ajuste por inflación
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      logger.debug('Getting portfolio summary')

      const [basicSummary, positions, uvaInfo] = await Promise.all([
        this.portfolioService.getPortfolioSummary(),
        this.portfolioService.getPortfolioPositions(),
        this.getLatestUVAInfo()
      ])

      // Calcular cambio diario aproximado
      let dayChange = 0
      let dayChangePercentage = 0

      for (const position of positions) {
        if (position.quantity > 0 && position.current_price) {
          // Estimar cambio del día basado en precio actual vs precio promedio
          const positionDayChange = (position.current_price - position.average_cost) * position.quantity
          dayChange += positionDayChange
        }
      }

      if (basicSummary.total_cost > 0) {
        dayChangePercentage = (dayChange / basicSummary.total_cost) * 100
      }

      // Calcular valor ajustado por inflación si hay datos UVA
      let inflationAdjustedValue: number | undefined
      let inflationAdjustedReturn: number | undefined

      if (uvaInfo.currentValue && basicSummary.total_cost > 0) {
        try {
          // Estimación simplificada de ajuste por inflación
          const estimatedInflationRate = 0.05 // 5% estimado
          inflationAdjustedValue = basicSummary.total_cost * (1 + estimatedInflationRate)
          inflationAdjustedReturn = ((basicSummary.market_value - inflationAdjustedValue) / inflationAdjustedValue) * 100
        } catch (error) {
          logger.warn('Could not calculate inflation adjustment:', error)
        }
      }

      const portfolioSummary: PortfolioSummary = {
        totalValue: basicSummary.market_value,
        totalCost: basicSummary.total_cost,
        unrealizedPnL: basicSummary.unrealized_pnl,
        unrealizedPnLPercentage: basicSummary.unrealized_pnl_percentage,
        totalPositions: basicSummary.total_positions,
        dayChange,
        dayChangePercentage,
        inflationAdjustedValue,
        inflationAdjustedReturn
      }

      // Calculate commission metrics
      try {
        const commissionService = new CommissionService()
        const trades = await this.tradeService.findAll({})
        
        // Calculate total commissions paid
        portfolioSummary.totalCommissions = trades.reduce((sum: number, trade: any) => {
          return sum + (trade.commission || 0) + (trade.taxes || 0)
        }, 0)

        // Estimate monthly custody fee based on current portfolio value
        const custodyProjection = commissionService.calculateCustodyFee(
          portfolioSummary.totalValue
        )
        portfolioSummary.estimatedCustodyFee = custodyProjection.monthlyFee

        // Calculate commission impact on returns
        const totalCosts = (portfolioSummary.totalCommissions || 0) + (custodyProjection.monthlyFee * 12)
        portfolioSummary.commissionImpact = portfolioSummary.totalValue > 0 
          ? (totalCosts / portfolioSummary.totalValue) * 100 
          : 0
      } catch (error) {
        logger.warn('Could not calculate commission metrics:', error)
      }

      return portfolioSummary
    } catch (error) {
      logger.error('Error getting portfolio summary:', error)
      throw error
    }
  }

  /**
   * Obtiene las posiciones actuales formateadas para el dashboard
   */
  async getCurrentPositions(limit: number = 20): Promise<CurrentPosition[]> {
    try {
      logger.debug(`Getting current positions (limit: ${limit})`)

      const performance = await this.portfolioService.getPortfolioPerformance()
      
      const currentPositions: CurrentPosition[] = performance
        .slice(0, limit)
        .map((position, index) => ({
          id: index + 1, // Temporal ID basado en posición
          symbol: position.symbol,
          companyName: position.company_name,
          quantity: position.quantity,
          averageCost: position.average_cost,
          currentPrice: position.current_price,
          marketValue: position.market_value,
          unrealizedPnL: position.unrealized_pnl,
          unrealizedPnLPercentage: position.unrealized_pnl_percentage,
          weightPercentage: position.weight_percentage,
          isESGCompliant: false, // TODO: Get from instrument data
          isVeganFriendly: false, // TODO: Get from instrument data
          dayChange: 0, // TODO: Calculate from quote history
          dayChangePercentage: 0 // TODO: Calculate from quote history
        }))

      // Enriquecer con datos de instrumentos
      for (const position of currentPositions) {
        try {
          if (position.symbol) {
            const instrument = await this.instrumentService.getInstrumentBySymbol(position.symbol)
            position.isESGCompliant = instrument.is_esg_compliant || false
            position.isVeganFriendly = instrument.is_vegan_friendly || false
          }
        } catch (error) {
          logger.warn(`Could not get instrument data for ${position.symbol}:`, error)
        }
      }

      return currentPositions
    } catch (error) {
      logger.error('Error getting current positions:', error)
      throw error
    }
  }

  /**
   * Obtiene resumen del mercado
   */
  async getMarketSummary(): Promise<MarketSummary> {
    try {
      logger.debug('Getting market summary')

      const [marketHours, watchlistQuotes, uvaInfo] = await Promise.all([
        this.quoteService.getMarketHours(),
        this.quoteService.getWatchlistQuotes(),
        this.getLatestUVAInfo()
      ])

      // Calcular top movers - usando datos básicos disponibles
      const quotesWithChange = watchlistQuotes
        .filter(quote => quote.price && quote.price > 0)
        .map(quote => {
          const change = (quote.price || 0) - (quote.close || quote.price || 0)
          const changePercentage = quote.close ? ((quote.price || 0) - quote.close) / quote.close * 100 : 0
          return {
            ...quote,
            change,
            changePercentage
          }
        })
        .sort((a, b) => b.changePercentage - a.changePercentage)

      const gainers: MarketMover[] = quotesWithChange
        .slice(0, 5)
        .map(quote => ({
          symbol: 'UNKNOWN', // TODO: agregar symbol a QuoteData
          companyName: '', // TODO: Get from instrument
          price: quote.price || 0,
          change: quote.change,
          changePercentage: quote.changePercentage,
          volume: quote.volume
        }))

      const losers: MarketMover[] = quotesWithChange
        .slice(-5)
        .reverse()
        .map(quote => ({
          symbol: 'UNKNOWN', // TODO: agregar symbol a QuoteData
          companyName: '', // TODO: Get from instrument
          price: quote.price || 0,
          change: quote.change,
          changePercentage: quote.changePercentage,
          volume: quote.volume
        }))

      // Calcular performance por sector (simplificado)
      const sectorPerformance: SectorPerformance[] = await this.calculateSectorPerformance()

      const marketSummary: MarketSummary = {
        isMarketOpen: marketHours.isOpen,
        lastUpdateTime: new Date(),
        topMovers: {
          gainers,
          losers
        },
        sectorPerformance,
        uvaValue: uvaInfo.currentValue,
        uvaLastUpdate: uvaInfo.lastUpdate
      }

      return marketSummary
    } catch (error) {
      logger.error('Error getting market summary:', error)
      throw error
    }
  }

  /**
   * Obtiene métricas de performance
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      logger.debug('Getting performance metrics')

      const [advancedSummary, positions] = await Promise.all([
        this.tradeService.getAdvancedSummary(),
        this.portfolioService.getPortfolioPerformance()
      ])

      // Encontrar mejor y peor performer
      const sortedPositions = positions.sort((a, b) => b.unrealized_pnl_percentage - a.unrealized_pnl_percentage)
      
      const bestPerformer = sortedPositions[0]
      const worstPerformer = sortedPositions[sortedPositions.length - 1]

      // Calcular score de diversificación (0-100)
      const diversificationScore = this.calculateDiversificationScore(
        positions.map(p => ({
          id: 0,
          symbol: p.symbol,
          companyName: p.company_name,
          quantity: p.quantity,
          averageCost: p.average_cost,
          currentPrice: p.current_price,
          marketValue: p.market_value,
          unrealizedPnL: p.unrealized_pnl,
          unrealizedPnLPercentage: p.unrealized_pnl_percentage,
          weightPercentage: p.weight_percentage,
          isESGCompliant: false,
          isVeganFriendly: false
        }))
      )

      const performanceMetrics: PerformanceMetrics = {
        totalReturn: advancedSummary.performance.totalRealizedGains,
        totalReturnPercentage: advancedSummary.performance.winRate,
        annualizedReturn: 0, // TODO: Calculate properly
        bestPerformer: {
          symbol: bestPerformer?.symbol || '',
          return: bestPerformer?.unrealized_pnl || 0,
          returnPercentage: bestPerformer?.unrealized_pnl_percentage || 0
        },
        worstPerformer: {
          symbol: worstPerformer?.symbol || '',
          return: worstPerformer?.unrealized_pnl || 0,
          returnPercentage: worstPerformer?.unrealized_pnl_percentage || 0
        },
        diversificationScore,
        riskMetrics: {
          concentrationRisk: advancedSummary.diversification.concentrationRisk,
          maxPositionWeight: advancedSummary.diversification.topPosition.allocation,
          activePositions: advancedSummary.diversification.activePositions
        }
      }

      return performanceMetrics
    } catch (error) {
      logger.error('Error getting performance metrics:', error)
      throw error
    }
  }

  /**
   * Obtiene datos de distribución para gráficos
   */
  async getDistributionData(): Promise<DistributionData> {
    try {
      logger.debug('Getting distribution data')

      const positions = await this.portfolioService.getPortfolioPerformance()
      const totalValue = positions.reduce((sum, p) => sum + p.market_value, 0)

      // Distribución por activo
      const byAsset: AssetDistribution[] = positions.map((position, index) => ({
        symbol: position.symbol,
        companyName: position.company_name,
        value: position.market_value,
        percentage: position.weight_percentage,
        color: this.generateColor(index)
      }))

      // Distribución por sector
      const sectorMap = new Map<string, { value: number; count: number }>()
      
      for (const position of positions) {
        try {
          if (position.symbol) {
            const instrument = await this.instrumentService.getInstrumentBySymbol(position.symbol)
            const sector = instrument.sector || 'Unknown'
            
            const existing = sectorMap.get(sector) || { value: 0, count: 0 }
            existing.value += position.market_value
            existing.count += 1
            sectorMap.set(sector, existing)
          }
        } catch (error) {
          logger.warn(`Could not get sector for ${position.symbol}:`, error)
        }
      }

      const bySector: SectorDistribution[] = Array.from(sectorMap.entries()).map(([sector, data], index) => ({
        sector,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        positionsCount: data.count,
        color: this.generateColor(index + 10)
      }))

      // Distribución ESG
      const esgMap = new Map<string, { value: number; count: number }>()
      
      for (const position of positions) {
        try {
          if (position.symbol) {
            const instrument = await this.instrumentService.getInstrumentBySymbol(position.symbol)
            
            if (instrument.is_esg_compliant) {
              const existing = esgMap.get('ESG Compliant') || { value: 0, count: 0 }
              existing.value += position.market_value
              existing.count += 1
              esgMap.set('ESG Compliant', existing)
            } else {
              const existing = esgMap.get('Non-ESG') || { value: 0, count: 0 }
              existing.value += position.market_value
              existing.count += 1
              esgMap.set('Non-ESG', existing)
            }

            if (instrument.is_vegan_friendly) {
              const existing = esgMap.get('Vegan Friendly') || { value: 0, count: 0 }
              existing.value += position.market_value
              existing.count += 1
              esgMap.set('Vegan Friendly', existing)
            } else {
              const existing = esgMap.get('Non-Vegan') || { value: 0, count: 0 }
              existing.value += position.market_value
              existing.count += 1
              esgMap.set('Non-Vegan', existing)
            }
          }
        } catch (error) {
          logger.warn(`Could not get ESG data for ${position.symbol}:`, error)
        }
      }

      const byESGStatus: ESGDistribution[] = Array.from(esgMap.entries()).map(([category, data], index) => ({
        category: category as 'ESG' | 'Vegano' | 'Convencional' | 'No clasificado',
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        positionsCount: data.count,
        color: this.generateColor(index + 20)
      }))

      return {
        byAsset,
        bySector,
        byESGStatus
      }
    } catch (error) {
      logger.error('Error getting distribution data:', error)
      throw error
    }
  }

  /**
   * Métodos auxiliares privados
   */

  private async getLatestUVAInfo(): Promise<{ currentValue?: number; lastUpdate?: Date }> {
    try {
      const uvaResult = await this.uvaService.getLatestUVAValue()
      if (uvaResult.success && uvaResult.value) {
        return {
          currentValue: uvaResult.value,
          lastUpdate: new Date()
        }
      }
    } catch (error) {
      logger.warn('Could not get UVA information:', error)
    }
    return {}
  }

  private async calculateSectorPerformance(): Promise<SectorPerformance[]> {
    try {
      const positions = await this.portfolioService.getPortfolioPerformance()
      const sectorMap = new Map<string, { 
        totalValue: number
        totalChange: number
        count: number 
      }>()

      for (const position of positions) {
        try {
          if (position.symbol) {
            const instrument = await this.instrumentService.getInstrumentBySymbol(position.symbol)
            const sector = instrument.sector || 'Unknown'
            
            const existing = sectorMap.get(sector) || { totalValue: 0, totalChange: 0, count: 0 }
            existing.totalValue += position.market_value
            existing.totalChange += position.unrealized_pnl
            existing.count += 1
            sectorMap.set(sector, existing)
          }
        } catch (error) {
          logger.warn(`Could not get sector for ${position.symbol}:`, error)
        }
      }

      return Array.from(sectorMap.entries()).map(([sector, data]) => ({
        sector,
        averageChange: data.totalChange / data.count,
        averageChangePercentage: data.totalValue > 0 ? (data.totalChange / data.totalValue) * 100 : 0,
        positionsCount: data.count,
        totalValue: data.totalValue
      }))
    } catch (error) {
      logger.error('Error calculating sector performance:', error)
      return []
    }
  }

  private calculateDiversificationScore(positions: CurrentPosition[]): number {
    if (positions.length === 0) return 0

    // Score basado en número de posiciones y distribución de pesos
    const positionCount = positions.length
    const maxWeight = Math.max(...positions.map(p => p.weightPercentage))
    
    // Score base por número de posiciones (0-50 puntos)
    const positionScore = Math.min((positionCount / 20) * 50, 50)
    
    // Score por distribución (0-50 puntos)
    const distributionScore = maxWeight < 10 ? 50 : maxWeight < 20 ? 30 : 10
    
    return Math.round(positionScore + distributionScore)
  }

  private generateColor(index: number): string {
    const colors: string[] = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
      '#14B8A6', '#F472B6', '#A78BFA', '#34D399', '#FBBF24'
    ]
    return colors[index % colors.length] || '#3B82F6'
  }
}