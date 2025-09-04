import { opportunityModel, OpportunityData, OpportunityCreateInput } from '../models/Opportunity.js'
import { technicalAnalysisService, CalculatedIndicators } from './TechnicalAnalysisService.js'
import { SimpleInstrument, InstrumentData } from '../models/SimpleInstrument.js'
import { quoteModel } from '../models/Quote.js'
import { PortfolioService } from './PortfolioService.js'
import { CommissionService } from './CommissionService.js'
import { createLogger } from '../utils/logger.js'
import type {
  TechnicalSignals,
  MarketData,
  ESGCriteria,
  RiskAssessment,
  ExpectedReturn,
  DiversificationCheck,
  CommissionImpact,
  OpportunityDetectionConfig,
  OpportunityType
} from '../types/opportunity.js'

/* eslint-disable max-lines-per-function, max-depth, no-unused-vars */
const logger = createLogger('OpportunityService')

export class OpportunityService {
  private instrumentModel = new SimpleInstrument()
  private portfolioService = new PortfolioService()
  private commissionService = new CommissionService()

  // Configuración por defecto para detección
  private defaultConfig: OpportunityDetectionConfig = {
    min_score_threshold: 60,
    max_opportunities_per_day: 20,
    rsi_oversold_threshold: 35,
    distance_from_low_threshold: 20, // % del mínimo anual
    volume_spike_threshold: 1.5, // 150% del volumen promedio
    exclude_penny_stocks: true,
    min_market_cap: 100000000, // $100M USD
    max_volatility: 0.8, // 80% volatilidad anual
    require_esg_compliance: false,
    require_vegan_friendly: false,
    excluded_sectors: ['Utilities'] // Sectores tradicionalmente aburridos
  }

  /**
   * Escanea todos los instrumentos activos en busca de oportunidades
   */
  async scanForOpportunities(config?: Partial<OpportunityDetectionConfig>): Promise<OpportunityData[]> {
    const scanConfig = { ...this.defaultConfig, ...config }
    logger.info('Starting opportunity scan', { config: scanConfig })

    try {
      // Obtener todos los instrumentos activos
      const instruments = await this.instrumentModel.findAll({ 
        isActive: true,
        isESG: scanConfig.require_esg_compliance,
        isVegan: scanConfig.require_vegan_friendly
      })

      logger.info(`Scanning ${instruments.length} instruments for opportunities`)

      const opportunities: OpportunityData[] = []
      let processedCount = 0
      let opportunitiesFound = 0

      for (const instrument of instruments) {
        try {
          // Aplicar filtros pre-análisis
          if (scanConfig.excluded_sectors?.includes(instrument.sector || '')) {
            continue
          }

          const opportunity = await this.analyzeInstrumentForOpportunity(instrument, scanConfig)
          
          if (opportunity && opportunity.composite_score >= scanConfig.min_score_threshold) {
            opportunities.push(opportunity)
            opportunitiesFound++
            
            // Limitar número de oportunidades por día
            if (opportunitiesFound >= scanConfig.max_opportunities_per_day) {
              break
            }
          }

          processedCount++
          
          // Pausa para evitar sobrecarga
          if (processedCount % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

        } catch (error) {
          logger.warn(`Error analyzing instrument ${instrument.symbol}:`, error)
          continue
        }
      }

      // Ordenar por score y actualizar rankings
      opportunities.sort((a, b) => b.composite_score - a.composite_score)
      opportunities.forEach((opp, index) => {
        opp.ranking = index + 1
      })

      // Guardar en base de datos
      const savedOpportunities = []
      for (const opp of opportunities) {
        const saved = await opportunityModel.create(opp)
        savedOpportunities.push(saved)
      }

      logger.info(`Opportunity scan completed`, {
        instrumentsScanned: processedCount,
        opportunitiesFound: savedOpportunities.length,
        avgScore: savedOpportunities.length > 0 
          ? savedOpportunities.reduce((sum, opp) => sum + opp.composite_score, 0) / savedOpportunities.length 
          : 0
      })

      return savedOpportunities

    } catch (error) {
      logger.error('Error in opportunity scan:', error)
      throw new Error(`Opportunity scan failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Analiza un instrumento específico para detectar oportunidades
   */
  private async analyzeInstrumentForOpportunity(
    instrument: InstrumentData, 
    config: OpportunityDetectionConfig
  ): Promise<OpportunityCreateInput | null> {
    try {
      // Obtener indicadores técnicos
      const indicators = await technicalAnalysisService.calculateIndicators(instrument.symbol)
      if (!indicators) {
        return null
      }

      // Obtener datos de mercado
      const marketData = await this.getMarketData(instrument.symbol)
      if (!marketData) {
        return null
      }

      // Aplicar filtros de mercado
      if (config.exclude_penny_stocks && marketData.current_price < 5) {
        return null
      }
      if (config.min_market_cap && marketData.market_cap && marketData.market_cap < config.min_market_cap) {
        return null
      }

      // Analizar señales técnicas
      const technicalSignals = this.analyzeTechnicalSignals(indicators, config)
      
      // Calcular score compuesto
      const compositeScore = this.calculateCompositeScore(technicalSignals, marketData)
      
      // Si el score no supera el umbral, no es una oportunidad
      if (compositeScore < config.min_score_threshold) {
        return null
      }

      // Determinar tipo de oportunidad
      const opportunityType = compositeScore >= 80 ? OpportunityType.STRONG_BUY : OpportunityType.BUY

      // Crear criterios ESG
      const esgCriteria: ESGCriteria = {
        is_esg_compliant: instrument.is_esg_compliant || false,
        is_vegan_friendly: instrument.is_vegan_friendly || false,
        esg_score: this.calculateESGScore(instrument)
      }

      // Calcular evaluación de riesgo
      const riskAssessment = await this.calculateRiskAssessment(instrument.symbol, marketData)

      // Calcular retorno esperado
      const expectedReturn = this.calculateExpectedReturn(
        marketData, 
        technicalSignals, 
        compositeScore
      )

      const opportunity: OpportunityCreateInput = {
        symbol: instrument.symbol,
        instrument_id: instrument.id!,
        company_name: instrument.company_name,
        opportunity_type: opportunityType,
        composite_score: compositeScore,
        technical_signals: technicalSignals,
        ranking: 0, // Se actualizará después
        market_data: marketData,
        esg_criteria: esgCriteria,
        risk_assessment: riskAssessment,
        expected_return: expectedReturn,
        detected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      }

      return opportunity

    } catch (error) {
      logger.error(`Error analyzing instrument ${instrument.symbol}:`, error)
      return null
    }
  }

  /**
   * Analiza las señales técnicas y calcula su fuerza
   */
  private analyzeTechnicalSignals(indicators: CalculatedIndicators, config: OpportunityDetectionConfig): TechnicalSignals {
    return {
      rsi: {
        value: indicators.rsi.value,
        signal: indicators.rsi.signal,
        strength: indicators.rsi.strength,
        weight: 0.30, // 30% del score
        oversoldThreshold: config.rsi_oversold_threshold
      },
      sma: {
        signal: indicators.sma.signal,
        strength: indicators.sma.strength,
        weight: 0.20, // 20% del score
        crossover: this.detectSMACrossover(indicators.sma),
        sma20: indicators.sma.sma20,
        sma50: indicators.sma.sma50,
        sma200: indicators.sma.sma200
      },
      distance_from_low: {
        percentage: indicators.extremes.distanceFromLow,
        signal: indicators.extremes.signal,
        strength: indicators.extremes.strength,
        weight: 0.25, // 25% del score
        yearLow: indicators.extremes.yearLow,
        currentPrice: indicators.extremes.current
      },
      volume_relative: {
        ratio: 1.2, // Simplificado - en implementación real sería calculado
        signal: 'HOLD',
        strength: 50,
        weight: 0.15, // 15% del score
        avgVolume: 1000000,
        currentVolume: 1200000
      },
      macd: {
        signal: indicators.macd.signalType,
        strength: indicators.macd.strength,
        weight: 0.10, // 10% del score
        histogram: indicators.macd.histogram,
        line: indicators.macd.line,
        signalLine: indicators.macd.signal
      }
    }
  }

  /**
   * Detecta cruce dorado en las medias móviles
   */
  private detectSMACrossover(sma: any): boolean {
    // Simplificado - en implementación real compararía con datos históricos
    return sma.sma20 > sma.sma50 && sma.sma50 > sma.sma200
  }

  /**
   * Calcula el score compuesto basado en todas las señales
   */
  private calculateCompositeScore(signals: TechnicalSignals, marketData: MarketData): number {
    let totalScore = 0
    let totalWeight = 0

    // RSI - Sobreventa es buena oportunidad
    if (signals.rsi.signal === 'BUY') {
      totalScore += signals.rsi.strength * signals.rsi.weight
    }
    totalWeight += signals.rsi.weight

    // SMA - Cruce dorado es muy positivo
    if (signals.sma.signal === 'BUY') {
      let smaScore = signals.sma.strength
      if (signals.sma.crossover) {
        smaScore = Math.min(100, smaScore * 1.2) // Bonus por cruce dorado
      }
      totalScore += smaScore * signals.sma.weight
    }
    totalWeight += signals.sma.weight

    // Distancia del mínimo - Cerca del mínimo es oportunidad
    if (signals.distance_from_low.signal === 'BUY') {
      totalScore += signals.distance_from_low.strength * signals.distance_from_low.weight
    }
    totalWeight += signals.distance_from_low.weight

    // Volumen - Alto volumen confirma la señal
    if (signals.volume_relative.ratio > 1.3) {
      totalScore += signals.volume_relative.strength * signals.volume_relative.weight
    }
    totalWeight += signals.volume_relative.weight

    // MACD - Histograma positivo es bueno
    if (signals.macd.signal === 'BUY') {
      totalScore += signals.macd.strength * signals.macd.weight
    }
    totalWeight += signals.macd.weight

    // Normalizar score
    const finalScore = totalWeight > 0 ? (totalScore / totalWeight) : 0

    return Math.round(Math.min(100, Math.max(0, finalScore)))
  }

  /**
   * Obtiene datos de mercado para un símbolo
   */
  private async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      const quotes = await quoteModel.findBySymbol(symbol, { limit: 365 })
      if (quotes.length === 0) return null

      const currentQuote = quotes[0]
      const yearQuotes = quotes.slice(0, 252) // ~1 año de trading
      
      const yearHigh = Math.max(...yearQuotes.map(q => q.high))
      const yearLow = Math.min(...yearQuotes.map(q => q.low))
      const avgVolume = yearQuotes.reduce((sum, q) => sum + (q.volume || 0), 0) / yearQuotes.length

      return {
        current_price: currentQuote.close,
        year_high: yearHigh,
        year_low: yearLow,
        volume_avg: avgVolume,
        volume_current: currentQuote.volume || 0,
        market_cap: this.calculateMarketCap(symbol, currentQuote.close),
        price_change_24h: quotes.length > 1 ? currentQuote.close - quotes[1].close : 0,
        price_change_percentage_24h: quotes.length > 1 
          ? ((currentQuote.close - quotes[1].close) / quotes[1].close) * 100 
          : 0
      }
    } catch (error) {
      logger.error(`Error getting market data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Calcula market cap simplificado
   */
  private calculateMarketCap(symbol: string, price: number): number {
    // En implementación real, esto vendría de datos fundamentales
    // Por ahora, estimación basada en precio
    return price * 50000000 // Estimación de 50M acciones
  }

  /**
   * Calcula score ESG simplificado
   */
  private calculateESGScore(instrument: InstrumentData): number {
    let score = 50 // Base neutral
    
    if (instrument.is_esg_compliant) score += 25
    if (instrument.is_vegan_friendly) score += 15
    
    // Sectores con mejor ESG
    const goodESGSectors = ['Technology', 'Healthcare', 'Consumer Discretionary']
    if (goodESGSectors.includes(instrument.sector || '')) {
      score += 10
    }

    return Math.min(100, score)
  }

  /**
   * Calcula evaluación de riesgo
   */
  private async calculateRiskAssessment(symbol: string, marketData: MarketData): Promise<RiskAssessment> {
    try {
      // Calcular volatilidad histórica
      const quotes = await quoteModel.findBySymbol(symbol, { limit: 30 })
      const returns = []
      
      for (let i = 1; i < quotes.length; i++) {
        const dailyReturn = (quotes[i-1].close - quotes[i].close) / quotes[i].close
        returns.push(dailyReturn)
      }

      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
      const volatility = Math.sqrt(variance) * Math.sqrt(252) // Anualizada

      return {
        volatility: Math.round(volatility * 10000) / 100, // En porcentaje
        sector_concentration: 5, // Simplificado - % del sector
        diversification_impact: 2, // Simplificado - impacto en diversificación
        beta: 1.1, // Simplificado
        sharpe_ratio: 0.8 // Simplificado
      }
    } catch (error) {
      logger.error(`Error calculating risk assessment for ${symbol}:`, error)
      return {
        volatility: 25,
        sector_concentration: 5,
        diversification_impact: 2
      }
    }
  }

  /**
   * Calcula retorno esperado
   */
  private calculateExpectedReturn(
    marketData: MarketData, 
    signals: TechnicalSignals, 
    compositeScore: number
  ): ExpectedReturn {
    // Calcular precio objetivo basado en señales técnicas
    const currentPrice = marketData.current_price
    const yearHigh = marketData.year_high
    const yearLow = marketData.year_low
    
    // Precio objetivo conservador: punto medio entre precio actual y máximo anual
    const conservativeTarget = currentPrice + ((yearHigh - currentPrice) * 0.6)
    
    // Ajustar por score compuesto
    const scoreMultiplier = compositeScore / 100
    const targetPrice = currentPrice + ((conservativeTarget - currentPrice) * scoreMultiplier)
    
    const upsidePercentage = ((targetPrice - currentPrice) / currentPrice) * 100
    
    // Tiempo horizonte basado en señales (más señales fuertes = más rápido)
    const timeHorizon = signals.rsi.signal === 'BUY' && signals.sma.signal === 'BUY' ? 30 : 90
    
    return {
      target_price: Math.round(targetPrice * 100) / 100,
      upside_percentage: Math.round(upsidePercentage * 100) / 100,
      time_horizon_days: timeHorizon,
      confidence_level: Math.min(90, compositeScore)
    }
  }

  /**
   * Calcula el impacto en diversificación de una nueva inversión
   */
  async calculateDiversificationImpact(
    symbol: string, 
    investmentAmount: number
  ): Promise<DiversificationCheck> {
    try {
      // Obtener valor actual de cartera
      const positions = await this.portfolioService.getPortfolioPositions()
      const currentPortfolioValue = positions.reduce((sum, pos) => sum + (pos.quantity * pos.current_price), 0)
      
      // Calcular concentración propuesta
      const totalValueAfter = currentPortfolioValue + investmentAmount
      const concentrationPercentage = (investmentAmount / totalValueAfter) * 100
      
      // Límite máximo recomendado por posición
      const maxAllowedConcentration = 15
      
      // Encontrar concentración por sector
      const instrument = await this.instrumentModel.findBySymbol(symbol)
      const sameSecectorValue = positions
        .filter(pos => pos.sector === instrument?.sector)
        .reduce((sum, pos) => sum + (pos.quantity * pos.current_price), 0)
      
      const sectorConcentration = ((sameSecectorValue + investmentAmount) / totalValueAfter) * 100
      
      const isWithinLimits = concentrationPercentage <= maxAllowedConcentration && sectorConcentration <= 25
      
      // Sugerir monto ajustado si excede límites
      let suggestedAmount: number | undefined
      let reason = ''
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
      
      if (!isWithinLimits) {
        if (concentrationPercentage > maxAllowedConcentration) {
          suggestedAmount = (totalValueAfter * maxAllowedConcentration) / 100 - currentPortfolioValue
          reason = `Concentración de ${concentrationPercentage.toFixed(1)}% excede el límite recomendado de ${maxAllowedConcentration}%`
          riskLevel = 'HIGH'
        } else if (sectorConcentration > 25) {
          const maxSectorAmount = (totalValueAfter * 25) / 100 - sameSecectorValue
          suggestedAmount = Math.min(suggestedAmount || investmentAmount, maxSectorAmount)
          reason = `Concentración sectorial de ${sectorConcentration.toFixed(1)}% excede el límite recomendado de 25%`
          riskLevel = 'MEDIUM'
        }
      }

      return {
        current_portfolio_value: currentPortfolioValue,
        proposed_investment: investmentAmount,
        concentration_percentage: Math.round(concentrationPercentage * 100) / 100,
        sector_concentration: Math.round(sectorConcentration * 100) / 100,
        max_allowed_concentration: maxAllowedConcentration,
        is_within_limits: isWithinLimits,
        recommendation: {
          suggested_amount: suggestedAmount,
          reason: reason || 'Inversión dentro de límites recomendados',
          risk_level: riskLevel
        }
      }

    } catch (error) {
      logger.error(`Error calculating diversification impact for ${symbol}:`, error)
      throw new Error(`Failed to calculate diversification impact: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Calcula el impacto de comisiones en una oportunidad
   */
  async calculateCommissionImpact(
    symbol: string, 
    investmentAmount: number,
    currentPortfolioValue: number
  ): Promise<CommissionImpact> {
    try {
      // Calcular comisión de operación
      const operationCommission = this.commissionService.calculateOperationCommission('BUY', investmentAmount)
      
      // Calcular custodia mensual proyectada
      const projectedPortfolioValue = currentPortfolioValue + investmentAmount
      const custodyCalculation = this.commissionService.calculateCustodyFee(projectedPortfolioValue)
      
      const totalFirstYearCost = operationCommission.totalCommission + custodyCalculation.annualFee
      const breakEvenPercentage = (totalFirstYearCost / investmentAmount) * 100
      
      // Obtener retorno esperado de la oportunidad
      const opportunity = await opportunityModel.findBySymbol(symbol)
      const expectedUpside = opportunity?.expected_return.upside_percentage || 0
      
      const netUpsideAfterCosts = expectedUpside - breakEvenPercentage
      const isProfitable = netUpsideAfterCosts > 0

      return {
        operation_commission: operationCommission.totalCommission,
        custody_monthly: custodyCalculation.monthlyFee,
        total_first_year: totalFirstYearCost,
        break_even_percentage: Math.round(breakEvenPercentage * 100) / 100,
        net_upside_after_costs: Math.round(netUpsideAfterCosts * 100) / 100,
        is_profitable: isProfitable
      }

    } catch (error) {
      logger.error(`Error calculating commission impact for ${symbol}:`, error)
      throw new Error(`Failed to calculate commission impact: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene las oportunidades del día
   */
  async getTodaysOpportunities(limit: number = 20): Promise<OpportunityData[]> {
    return await opportunityModel.getTodaysOpportunities(limit)
  }

  /**
   * Obtiene las mejores oportunidades por score
   */
  async getTopOpportunities(limit: number = 10, minScore: number = 60): Promise<OpportunityData[]> {
    return await opportunityModel.getTopOpportunities(limit, minScore)
  }

  /**
   * Obtiene oportunidades con filtros
   */
  async getOpportunities(filters?: any): Promise<OpportunityData[]> {
    return await opportunityModel.findAll(filters)
  }

  /**
   * Obtiene una oportunidad por ID
   */
  async getOpportunityById(id: number): Promise<OpportunityData | null> {
    return await opportunityModel.findById(id)
  }

  /**
   * Obtiene estadísticas de oportunidades
   */
  async getOpportunityStats() {
    return await opportunityModel.getStats()
  }

  /**
   * Limpia oportunidades expiradas
   */
  async cleanupExpiredOpportunities(): Promise<number> {
    const deactivatedCount = await opportunityModel.deactivateExpired()
    const deletedCount = await opportunityModel.deleteOld(7) // Eliminar después de 7 días
    
    logger.info(`Opportunity cleanup completed: ${deactivatedCount} deactivated, ${deletedCount} deleted`)
    return deactivatedCount + deletedCount
  }

  /**
   * Fuerza un scan manual de oportunidades
   */
  async forceScan(): Promise<OpportunityData[]> {
    logger.info('Forcing manual opportunity scan')
    return await this.scanForOpportunities()
  }
}

// Export singleton
export const opportunityService = new OpportunityService()