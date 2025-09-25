/* eslint-disable max-lines-per-function */
import { newsAnalysisService } from './NewsAnalysisService.js'
import { marketSentimentService } from './MarketSentimentService.js'
import { earningsAnalysisService } from './EarningsAnalysisService.js'
import { Quote } from '../models/Quote.js'
import { TechnicalIndicator } from '../models/TechnicalIndicator.js'
import { cacheService } from './cacheService.js'
import { createLogger } from '../utils/logger.js'
import {
  generateScenarios,
  analyzeWithClaude as analyzeTrendWithClaude,
  extractKeyThemes,
  generatePortfolioRecommendations
} from './trendPredictionHelpers.js'
import {
  TrendPrediction,
  TrendPredictionOptions,
  MultiSymbolTrendAnalysis,
  PortfolioTrendAnalysis
} from './trendPredictionTypes.js'
const logger = createLogger('trend-prediction-service')

export class TrendPredictionService {
  private readonly CACHE_PREFIX = 'trend_prediction'
  private readonly DEFAULT_CACHE_TTL = 30 // minutos
  private quoteModel = new Quote()
  private technicalModel = new TechnicalIndicator()

  private mapQuoteHistory(
    symbol: string,
    days: number
  ): Promise<{
    date: Date
    close: number
    high: number
    low: number
    volume: number
  }[]> {
    return this.quoteModel.findBySymbol(symbol, days).then(quotes =>
      quotes
        .map(quote => ({
          date: new Date(quote.quote_date),
          close: quote.close ?? quote.price,
          high: quote.high ?? quote.price,
          low: quote.low ?? quote.price,
          volume: quote.volume ?? 0
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
    )
  }

  constructor() {
    logger.info('TrendPredictionService initialized')
  }

  /**
   * Predice tendencia para un símbolo específico
   */
  async predictTrend(
    symbol: string,
    timeframe: '1W' | '1M' | '3M' | '6M' | '1Y',
    options: TrendPredictionOptions = {}
  ): Promise<TrendPrediction> {
    const startTime = Date.now()
    
    try {
      const {
        useCache = true,
        cacheTTLMinutes = this.DEFAULT_CACHE_TTL,
        includeScenarios = true,
        analyzeWithClaude = true,
        includeNews = true,
        includeSentiment = true,
        includeEarnings = true
      } = options

      const cacheKey = `${this.CACHE_PREFIX}:${symbol}:${timeframe}:${JSON.stringify(options)}`

      // Verificar cache
      const cached = this.getCachedPrediction(cacheKey, useCache)
      if (cached) {
        logger.info('Trend prediction served from cache', { symbol, timeframe, cacheKey })
        return cached
      }

      // Recopilar datos de múltiples fuentes
      const { technical, news, sentiment, earnings, prices } = await this.collectPredictionData(
        symbol,
        timeframe,
        { includeNews, includeSentiment, includeEarnings }
      )

      // Calcular scores individuales
      const technicalScore = this.calculateTechnicalScore(technical)
      const fundamentalScore = this.calculateFundamentalScore(earnings, prices)
      const sentimentScore = sentiment?.sentimentScore || 0
      const newsScore = this.calculateNewsScore(news)

      // Calcular score general ponderado
      const weights = {
        technical: 0.3,
        fundamental: 0.25,
        sentiment: 0.25,
        news: 0.2
      }

      const overallScore = (
        technicalScore * weights.technical +
        fundamentalScore * weights.fundamental +
        sentimentScore * weights.sentiment +
        newsScore * weights.news
      )

      // Determinar dirección y confianza
      const prediction = this.calculatePrediction(overallScore, timeframe, {
        technical: technicalScore,
        fundamental: fundamentalScore,
        sentiment: sentimentScore,
        news: newsScore
      })

      // Identificar factores clave
      const keyFactors = this.identifyKeyFactors({
        technical,
        news,
        sentiment,
        earnings,
        scores: { technicalScore, fundamentalScore, sentimentScore, newsScore }
      })

      // Generar escenarios
      const scenarios = this.maybeGenerateScenarios(symbol, prediction, includeScenarios)

      // Análisis con Claude
      const claudeAnalysis = await this.maybeRunClaudeAnalysis(
        analyzeWithClaude,
        symbol,
        timeframe,
        {
          prediction,
          scores: { technicalScore, fundamentalScore, sentimentScore, newsScore, overallScore },
          keyFactors,
          scenarios,
          rawData: { technical, news, sentiment, earnings }
        }
      )

      const result: TrendPrediction = {
        symbol,
        timeframe,
        prediction,
        analysis: {
          technicalScore,
          fundamentalScore,
          sentimentScore,
          newsScore,
          overallScore,
          keyFactors,
          risks: this.identifyRisks(keyFactors, scenarios),
          catalysts: this.identifyCatalysts(keyFactors, scenarios)
        },
        scenarios,
        lastUpdated: new Date(),
        claudeAnalysis
      }

      // Guardar en cache
      this.setCachedPrediction(cacheKey, result, cacheTTLMinutes, useCache)

      const executionTime = Date.now() - startTime
      logger.info('Trend prediction completed', {
        symbol,
        timeframe,
        direction: prediction.direction,
        confidence: prediction.confidence,
        overallScore,
        executionTime
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Trend prediction failed', { symbol, timeframe, error, executionTime })
      throw error
    }
  }

  private getCachedPrediction(cacheKey: string, useCache: boolean) {
    if (!useCache) {
      return undefined
    }

    return cacheService.get<TrendPrediction>(cacheKey)
  }

  private setCachedPrediction(
    cacheKey: string,
    value: TrendPrediction,
    cacheTTLMinutes: number,
    useCache: boolean
  ) {
    if (!useCache) {
      return
    }

    cacheService.set(cacheKey, value, cacheTTLMinutes * 60 * 1000)
  }

  private maybeGenerateScenarios(symbol: string, prediction: TrendPrediction['prediction'], include: boolean) {
    if (!include) {
      return []
    }

    return generateScenarios(symbol, prediction)
  }

  private async maybeRunClaudeAnalysis(
    shouldRun: boolean,
    symbol: string,
    timeframe: string,
    data: {
      prediction: any
      scores: Record<string, number>
      keyFactors: any
      scenarios: any
      rawData: Record<string, unknown>
    }
  ) {
    if (!shouldRun) {
      return undefined
    }

    return this.runClaudeAnalysis(symbol, timeframe, data)
  }

  private async runClaudeAnalysis(
    symbol: string,
    timeframe: string,
    data: {
      prediction: any
      scores: Record<string, number>
      keyFactors: any
      scenarios: any
      rawData: Record<string, unknown>
    }
  ) {
    try {
      return await analyzeTrendWithClaude(symbol, timeframe, data)
    } catch (error) {
      logger.warn('Claude trend analysis failed', { symbol, error })
      return undefined
    }
  }

  private async collectPredictionData(
    symbol: string,
    timeframe: string,
    opts: { includeNews: boolean; includeSentiment: boolean; includeEarnings: boolean }
  ) {
    const [technicalData, newsData, sentimentData, earningsData, priceData] =
      await Promise.allSettled([
        this.getTechnicalAnalysis(symbol),
        opts.includeNews ? this.getNewsAnalysis(symbol) : Promise.resolve(null),
        opts.includeSentiment ? this.getSentimentAnalysis(symbol) : Promise.resolve(null),
        opts.includeEarnings ? this.getEarningsAnalysis(symbol) : Promise.resolve(null),
        this.getPriceData(symbol, timeframe)
      ])

    return {
      technical: technicalData.status === 'fulfilled' ? technicalData.value : null,
      news: newsData.status === 'fulfilled' ? newsData.value : null,
      sentiment: sentimentData.status === 'fulfilled' ? sentimentData.value : null,
      earnings: earningsData.status === 'fulfilled' ? earningsData.value : null,
      prices: priceData.status === 'fulfilled' ? priceData.value : null
    }
  }

  /**
   * Analiza tendencias para múltiples símbolos
   */
  async analyzeMultipleSymbols(
    symbols: string[],
    timeframe: '1W' | '1M' | '3M' | '6M' | '1Y' = '1M',
    options: TrendPredictionOptions = {}
  ): Promise<MultiSymbolTrendAnalysis> {
    try {
      const results: MultiSymbolTrendAnalysis = {}
      
      // Procesar en lotes para evitar sobrecarga
      const batchSize = 3
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async symbol => {
          try {
            const prediction = await this.predictTrend(symbol, timeframe, {
              ...options,
              analyzeWithClaude: false // Desabilitar Claude para análisis masivo
            })
            return { symbol, prediction }
          } catch (error) {
            logger.warn('Failed to predict trend for symbol', { symbol, error })
            return { symbol, prediction: null }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach(({ symbol, prediction }) => {
          if (prediction) {
            results[symbol] = prediction
          }
        })

        // Pausa entre lotes para rate limiting
        if (i + batchSize < symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      return results

    } catch (error) {
      logger.error('Multiple symbols trend analysis failed', { symbols, error })
      throw error
    }
  }

  /**
   * Analiza tendencias para todo el portafolio
   */
  async analyzePortfolioTrends(
    symbols: string[],
    options: TrendPredictionOptions = {}
  ): Promise<PortfolioTrendAnalysis> {
    try {
      const multiAnalysis = await this.analyzeMultipleSymbols(symbols, '3M', options)
      
      const predictions = Object.values(multiAnalysis)
      const totalSymbols = predictions.length
      
      if (totalSymbols === 0) {
        throw new Error('No valid predictions available for portfolio analysis')
      }

      // Clasificar símbolos por tendencia
      const bullishSymbols: string[] = []
      const bearishSymbols: string[] = []
      const neutralSymbols: string[] = []

      predictions.forEach(prediction => {
        if (prediction.prediction.direction === 'BULLISH') {
          bullishSymbols.push(prediction.symbol)
        } else if (prediction.prediction.direction === 'BEARISH') {
          bearishSymbols.push(prediction.symbol)
        } else {
          neutralSymbols.push(prediction.symbol)
        }
      })

      // Determinar tendencia general
      const bullishRatio = bullishSymbols.length / totalSymbols
      const bearishRatio = bearishSymbols.length / totalSymbols
      
      let overallTrend: 'BULLISH' | 'BEARISH' | 'MIXED'
      if (bullishRatio > 0.6) {
        overallTrend = 'BULLISH'
      } else if (bearishRatio > 0.6) {
        overallTrend = 'BEARISH'
      } else {
        overallTrend = 'MIXED'
      }

      // Calcular confianza promedio ponderada
      const totalConfidence = predictions.reduce((sum, p) => sum + p.prediction.confidence, 0)
      const confidence = Math.round(totalConfidence / totalSymbols)

      // Extraer temas clave
      const allFactors = predictions.flatMap(p => p.analysis.keyFactors)
      const keyThemes = extractKeyThemes(allFactors)

      // Identificar riesgos y oportunidades del portafolio
      const allRisks = predictions.flatMap(p => p.analysis.risks)
      const allCatalysts = predictions.flatMap(p => p.analysis.catalysts)
      
      const risks = [...new Set(allRisks)].slice(0, 5)
      const opportunities = [...new Set(allCatalysts)].slice(0, 5)

      // Generar recomendaciones
      const recommendedActions = generatePortfolioRecommendations(predictions)

      return {
        overallTrend,
        confidence,
        bullishSymbols,
        bearishSymbols,
        neutralSymbols,
        keyThemes,
        risks,
        opportunities,
        recommendedActions
      }

    } catch (error) {
      logger.error('Portfolio trend analysis failed', { symbols, error })
      throw error
    }
  }

  /**
   * Obtiene análisis técnico del símbolo
   */
  private async getTechnicalAnalysis(symbol: string): Promise<any> {
    try {
      const indicators = this.technicalModel.getLatestIndicators(symbol)
      return indicators
    } catch (error) {
      logger.warn('Failed to get technical analysis', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene análisis de noticias
   */
  private async getNewsAnalysis(symbol: string): Promise<any> {
    try {
      const sentiment = await newsAnalysisService.getNewsSentiment(symbol)
      return sentiment
    } catch (error) {
      logger.warn('Failed to get news analysis', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene análisis de sentiment
   */
  private async getSentimentAnalysis(symbol: string): Promise<any> {
    try {
      const sentiment = await marketSentimentService.getMarketSentiment({
        useCache: true,
        includeNews: true
      })
      return sentiment
    } catch (error) {
      logger.warn('Failed to get sentiment analysis', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene análisis de earnings
   */
  private async getEarningsAnalysis(symbol: string): Promise<any> {
    try {
      const earnings = await earningsAnalysisService.analyzeEarnings(symbol, {
        useCache: true,
        analyzeWithClaude: false
      })
      return earnings
    } catch (error) {
      logger.warn('Failed to get earnings analysis', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene datos históricos de precio
   */
  private async getPriceData(symbol: string, timeframe: string): Promise<{
    date: Date
    close: number
    high: number
    low: number
    volume: number
  }[] | null> {
    try {
      const daysLookup: Record<string, number> = {
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365
      }
      const days = daysLookup[timeframe] ?? 365

      const quotes = await this.mapQuoteHistory(symbol, days)
      return quotes
    } catch (error) {
      logger.warn('Failed to get price data', { symbol, error })
      return null
    }
  }

  /**
   * Calcula score técnico
   */
  private calculateTechnicalScore(technical: any): number {
    if (!technical) return 0

    let score = 0
    let factors = 0

    // RSI
    if (technical.rsi !== undefined) {
      if (technical.rsi < 30) score += 40 // Oversold = bullish
      else if (technical.rsi > 70) score -= 40 // Overbought = bearish
      else score += (50 - technical.rsi) * 0.8 // Neutral tendency
      factors++
    }

    // MACD
    if (technical.macd !== undefined && technical.macd_signal !== undefined) {
      const macdDiff = technical.macd - technical.macd_signal
      score += Math.max(-30, Math.min(30, macdDiff * 100))
      factors++
    }

    // Moving Averages
    if (technical.sma_20 !== undefined && technical.sma_50 !== undefined) {
      const maDiff = (technical.sma_20 - technical.sma_50) / technical.sma_50 * 100
      score += Math.max(-25, Math.min(25, maDiff * 10))
      factors++
    }

    return factors > 0 ? Math.max(-100, Math.min(100, score / factors)) : 0
  }

  /**
   * Calcula score fundamental
   */
  private calculateFundamentalScore(earnings: any, prices: any): number {
    let score = 0
    let factors = 0

    // Earnings analysis
    if (earnings) {
      if (earnings.analysis.overallAssessment === 'STRONG_BEAT') score += 50
      else if (earnings.analysis.overallAssessment === 'BEAT') score += 30
      else if (earnings.analysis.overallAssessment === 'MIXED') score += 0
      else if (earnings.analysis.overallAssessment === 'MISS') score -= 30
      else if (earnings.analysis.overallAssessment === 'STRONG_MISS') score -= 50
      factors++

      // Historical context
      if (earnings.historicalContext.consecutiveBeats > 2) score += 20
      else if (earnings.historicalContext.consecutiveMisses > 2) score -= 20
      factors++
    }

    // Price momentum
    if (prices && prices.length > 0) {
      const firstPrice = prices[0].close
      const lastPrice = prices[prices.length - 1].close
      const momentum = (lastPrice - firstPrice) / firstPrice * 100
      
      score += Math.max(-30, Math.min(30, momentum * 2))
      factors++
    }

    return factors > 0 ? Math.max(-100, Math.min(100, score / factors)) : 0
  }

  /**
   * Calcula score de noticias
   */
  private calculateNewsScore(news: any): number {
    if (!news) return 0
    
    // Usar sentiment score directamente pero ajustado
    return Math.max(-100, Math.min(100, news.sentimentScore * 0.8))
  }

  /**
   * Calcula predicción final
   */
  private calculatePrediction(
    overallScore: number,
    timeframe: string,
    scores: any
  ): {
    direction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
    confidence: number
    strength: 'WEAK' | 'MODERATE' | 'STRONG'
    priceTarget?: { low: number; high: number; target: number }
    probability: { bullish: number; bearish: number; sideways: number }
  } {
    // Determinar dirección
    let direction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
    if (overallScore > 15) direction = 'BULLISH'
    else if (overallScore < -15) direction = 'BEARISH'
    else direction = 'SIDEWAYS'

    // Calcular confianza basada en consenso entre scores
    const scoreValues = Object.values(scores) as number[]
    const avgScore = scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length
    const variance = scoreValues.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scoreValues.length
    const consensus = Math.max(0, 100 - variance)
    
    const confidence = Math.round(Math.min(95, 50 + (Math.abs(overallScore) * 0.5) + (consensus * 0.3)))

    // Determinar fuerza
    let strength: 'WEAK' | 'MODERATE' | 'STRONG'
    if (Math.abs(overallScore) < 25) strength = 'WEAK'
    else if (Math.abs(overallScore) < 50) strength = 'MODERATE'
    else strength = 'STRONG'

    // Calcular probabilidades
    const bullishProb = Math.max(0, Math.min(100, 50 + overallScore * 0.8))
    const bearishProb = Math.max(0, Math.min(100, 50 - overallScore * 0.8))
    const sidewaysProb = Math.max(0, 100 - bullishProb - bearishProb)

    return {
      direction,
      confidence,
      strength,
      probability: {
        bullish: Math.round(bullishProb),
        bearish: Math.round(bearishProb),
        sideways: Math.round(sidewaysProb)
      }
    }
  }

  /**
   * Identifica factores clave
   */
  private identifyKeyFactors(data: any): {
    factor: string
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    weight: number
    description: string
  }[] {
    const factors = []

    // Factores técnicos
    if (data.technical) {
      if (data.scores.technicalScore > 20) {
        factors.push({
          factor: 'Technical Analysis',
          impact: 'POSITIVE' as const,
          weight: 0.3,
          description: 'Indicadores técnicos muestran momentum positivo'
        })
      } else if (data.scores.technicalScore < -20) {
        factors.push({
          factor: 'Technical Analysis',
          impact: 'NEGATIVE' as const,
          weight: 0.3,
          description: 'Indicadores técnicos muestran presión bajista'
        })
      }
    }

    // Factores fundamentales
    if (data.earnings) {
      const assessment = data.earnings.analysis.overallAssessment
      if (['STRONG_BEAT', 'BEAT'].includes(assessment)) {
        factors.push({
          factor: 'Earnings Performance',
          impact: 'POSITIVE' as const,
          weight: 0.25,
          description: 'Resultados de earnings superaron expectativas'
        })
      } else if (['MISS', 'STRONG_MISS'].includes(assessment)) {
        factors.push({
          factor: 'Earnings Performance',
          impact: 'NEGATIVE' as const,
          weight: 0.25,
          description: 'Resultados de earnings decepcionaron'
        })
      }
    }

    // Factores de sentiment
    if (data.sentiment) {
      if (data.sentiment.sentimentScore > 25) {
        factors.push({
          factor: 'Market Sentiment',
          impact: 'POSITIVE' as const,
          weight: 0.2,
          description: 'Sentiment del mercado es optimista'
        })
      } else if (data.sentiment.sentimentScore < -25) {
        factors.push({
          factor: 'Market Sentiment',
          impact: 'NEGATIVE' as const,
          weight: 0.2,
          description: 'Sentiment del mercado es pesimista'
        })
      }
    }

    // Factores de noticias
    if (data.news) {
      if (data.scores.newsScore > 25) {
        factors.push({
          factor: 'News Coverage',
          impact: 'POSITIVE' as const,
          weight: 0.15,
          description: 'Noticias recientes son favorables'
        })
      } else if (data.scores.newsScore < -25) {
        factors.push({
          factor: 'News Coverage',
          impact: 'NEGATIVE' as const,
          weight: 0.15,
          description: 'Noticias recientes son desfavorables'
        })
      }
    }

    return factors.slice(0, 5) // Máximo 5 factores
  }

  /**
   * Identifica riesgos principales
   */
  private identifyRisks(keyFactors: any[], scenarios: any[]): string[] {
    const risks = [
      'Volatilidad del mercado general',
      'Cambios en política monetaria',
      'Incertidumbre geopolítica'
    ]

    // Agregar riesgos específicos basados en factores
    keyFactors.forEach(factor => {
      if (factor.impact === 'NEGATIVE') {
        risks.push(`Riesgo en: ${factor.factor}`)
      }
    })

    // Agregar riesgos de escenarios
    scenarios.forEach(scenario => {
      if (scenario.priceImpact < 0) {
        risks.push(`Escenario de riesgo: ${scenario.name}`)
      }
    })

    return [...new Set(risks)].slice(0, 5)
  }

  /**
   * Identifica catalizadores
   */
  private identifyCatalysts(keyFactors: any[], scenarios: any[]): string[] {
    const catalysts = [
      'Mejora en indicadores económicos',
      'Resultados positivos del sector',
      'Innovaciones tecnológicas'
    ]

    // Agregar catalizadores específicos
    keyFactors.forEach(factor => {
      if (factor.impact === 'POSITIVE') {
        catalysts.push(`Catalizador: ${factor.factor}`)
      }
    })

    // Agregar catalizadores de escenarios
    scenarios.forEach(scenario => {
      if (scenario.priceImpact > 0) {
        catalysts.push(`Oportunidad: ${scenario.name}`)
      }
    })

    return [...new Set(catalysts)].slice(0, 5)
  }



  /**

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    cacheStats: any
    predictionsToday: number
    avgConfidence: number
  } {
    return {
      cacheStats: cacheService.getStats(),
      predictionsToday: 0, // En implementación real vendría de BD
      avgConfidence: 0 // En implementación real vendría de BD
    }
  }

  /**
   * Limpia cache de predicciones
   */
  clearCache(): void {
    const removed = cacheService.clearByPrefix(this.CACHE_PREFIX)
    logger.info('Trend prediction cache cleared', { prefix: this.CACHE_PREFIX, removed })
  }
}
// Singleton instance
export const trendPredictionService = new TrendPredictionService()