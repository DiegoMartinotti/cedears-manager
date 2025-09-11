/* eslint-disable max-lines, max-lines-per-function, complexity */
import axios from 'axios'
import yahooFinance from 'yahoo-finance2'
import { claudeAnalysisService } from './claudeAnalysisService.js'
import { cacheService } from './cacheService.js'
import { rateLimitService } from './rateLimitService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('earnings-analysis-service')

export interface EarningsData {
  symbol: string
  fiscalDateEnding: string
  reportedDate: string
  reportedEPS: number
  estimatedEPS: number
  surprise: number
  surprisePercentage: number
  revenue: number
  estimatedRevenue?: number
  revenueSurprise?: number
  revenueSurprisePercentage?: number
}

export interface EarningsAnalysisResult {
  earningsData: EarningsData
  analysis: {
    epsAnalysis: {
      beat: boolean
      miss: boolean
      inline: boolean
      magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
      description: string
    }
    revenueAnalysis?: {
      beat: boolean
      miss: boolean
      inline: boolean
      magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
      description: string
    }
    overallAssessment: 'STRONG_BEAT' | 'BEAT' | 'MIXED' | 'MISS' | 'STRONG_MISS'
    keyMetrics: {
      metric: string
      value: string
      assessment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    }[]
    priceImpact: {
      expectedDirection: 'UP' | 'DOWN' | 'NEUTRAL'
      magnitude: number // porcentaje esperado
      confidence: number // 0-100
      timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM'
    }
    claudeAnalysis?: {
      analysis: string
      keyPoints: string[]
      risks: string[]
      opportunities: string[]
      outlook: string
      confidence: number
    }
  }
  historicalContext: {
    consecutiveBeats: number
    consecutiveMisses: number
    avgSurpriseLastQuarters: number
    volatilityAfterEarnings: number
  }
  competitorComparison?: {
    symbol: string
    epsGrowth: number
    revenueGrowth: number
    relative: 'OUTPERFORM' | 'INLINE' | 'UNDERPERFORM'
  }[]
}

export interface EarningsCalendarEntry {
  symbol: string
  companyName: string
  reportDate: string
  fiscalQuarter: string
  estimatedEPS?: number
  estimatedRevenue?: number
  marketCap?: number
  sector?: string
  importance: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface EarningsAnalysisOptions {
  useCache?: boolean
  cacheTTLMinutes?: number
  includeHistorical?: boolean
  includeCompetitors?: boolean
  analyzeWithClaude?: boolean
  includeGuidance?: boolean
}

export class EarningsAnalysisService {
  private readonly CACHE_PREFIX = 'earnings_analysis'
  private readonly DEFAULT_CACHE_TTL = 60 // minutos
  private alphaVantageApiKey: string | undefined
  private alphaVantageUrl = 'https://www.alphavantage.co/query'

  constructor() {
    this.alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY
    if (!this.alphaVantageApiKey) {
      logger.warn('ALPHA_VANTAGE_API_KEY not configured, earnings analysis will be limited')
    }
  }

  /**
   * Analiza los earnings más recientes de una empresa
   */
  async analyzeEarnings(
    symbol: string,
    options: EarningsAnalysisOptions = {}
  ): Promise<EarningsAnalysisResult> {
    const startTime = Date.now()
    
    try {
      const {
        useCache = true,
        cacheTTLMinutes = this.DEFAULT_CACHE_TTL,
        includeHistorical = true,
        includeCompetitors = false,
        analyzeWithClaude = true,
        includeGuidance = true
      } = options

      const cacheKey = `${this.CACHE_PREFIX}:analysis:${symbol}:${JSON.stringify(options)}`

      // Verificar cache
      if (useCache) {
        const cached = cacheService.get<EarningsAnalysisResult>(cacheKey)
        if (cached) {
          logger.info('Earnings analysis served from cache', { symbol, cacheKey })
          return cached
        }
      }

      // Obtener datos de earnings
      const earningsData = await this.fetchEarningsData(symbol)
      if (!earningsData) {
        throw new Error(`No earnings data found for ${symbol}`)
      }

      // Análisis básico de EPS
      const epsAnalysis = this.analyzeEPS(earningsData)
      
      // Análisis de revenue si disponible
      const revenueAnalysis = earningsData.estimatedRevenue 
        ? this.analyzeRevenue(earningsData)
        : undefined

      // Assessment general
      const overallAssessment = this.calculateOverallAssessment(epsAnalysis, revenueAnalysis)

      // Métricas clave
      const keyMetrics = this.extractKeyMetrics(earningsData, epsAnalysis, revenueAnalysis)

      // Impacto esperado en precio
      const priceImpact = this.calculatePriceImpact(earningsData, epsAnalysis, revenueAnalysis)

      // Contexto histórico
      const historicalContext = includeHistorical 
        ? await this.getHistoricalContext(symbol)
        : {
            consecutiveBeats: 0,
            consecutiveMisses: 0,
            avgSurpriseLastQuarters: 0,
            volatilityAfterEarnings: 0
          }

      // Comparación con competidores
      const competitorComparison = includeCompetitors
        ? await this.getCompetitorComparison()
        : undefined

      // Análisis con Claude
      let claudeAnalysis = undefined
      if (analyzeWithClaude) {
        try {
          claudeAnalysis = await this.analyzeWithClaude(symbol, earningsData, {
            epsAnalysis,
            revenueAnalysis,
            overallAssessment,
            historicalContext,
            includeGuidance
          })
        } catch (error) {
          logger.warn('Claude earnings analysis failed', { symbol, error })
        }
      }

      const result: EarningsAnalysisResult = {
        earningsData,
        analysis: {
          epsAnalysis,
          revenueAnalysis,
          overallAssessment,
          keyMetrics,
          priceImpact,
          claudeAnalysis
        },
        historicalContext,
        competitorComparison
      }

      // Guardar en cache
      if (useCache) {
        cacheService.set(cacheKey, result, cacheTTLMinutes * 60 * 1000)
      }

      const executionTime = Date.now() - startTime
      logger.info('Earnings analysis completed', {
        symbol,
        assessment: overallAssessment,
        surprise: earningsData.surprisePercentage,
        executionTime
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Earnings analysis failed', { symbol, error, executionTime })
      throw error
    }
  }

  /**
   * Obtiene calendario de earnings próximos
   */
  async getEarningsCalendar(
    daysAhead: number = 7
  ): Promise<EarningsCalendarEntry[]> {
    const cacheKey = `${this.CACHE_PREFIX}:calendar:${daysAhead}`
    
    // Verificar cache
    const cached = cacheService.get<EarningsCalendarEntry[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // En implementación real, esto vendría de una API de calendario de earnings
      // Por ahora simulamos algunos datos
      const calendar: EarningsCalendarEntry[] = [
        {
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          reportDate: '2024-01-25',
          fiscalQuarter: 'Q1 2024',
          estimatedEPS: 2.10,
          estimatedRevenue: 117500000000,
          marketCap: 3000000000000,
          sector: 'Technology',
          importance: 'HIGH'
        },
        {
          symbol: 'MSFT',
          companyName: 'Microsoft Corporation',
          reportDate: '2024-01-26',
          fiscalQuarter: 'Q2 2024',
          estimatedEPS: 2.78,
          estimatedRevenue: 60200000000,
          marketCap: 2800000000000,
          sector: 'Technology',
          importance: 'HIGH'
        },
        {
          symbol: 'GOOGL',
          companyName: 'Alphabet Inc.',
          reportDate: '2024-01-30',
          fiscalQuarter: 'Q4 2023',
          estimatedEPS: 1.33,
          estimatedRevenue: 76050000000,
          marketCap: 1700000000000,
          sector: 'Technology',
          importance: 'HIGH'
        }
      ]

      // Cache por 4 horas
      cacheService.set(cacheKey, calendar, 4 * 60 * 60 * 1000)

      return calendar

    } catch (error) {
      logger.error('Failed to get earnings calendar', { error })
      throw error
    }
  }

  /**
   * Obtiene earnings históricos de un símbolo
   */
  async getHistoricalEarnings(
    symbol: string,
    quarters: number = 8
  ): Promise<EarningsData[]> {
    const cacheKey = `${this.CACHE_PREFIX}:historical:${symbol}:${quarters}`
    
    // Verificar cache
    const cached = cacheService.get<EarningsData[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Simular datos históricos
      const historical: EarningsData[] = []
      const baseDate = new Date()
      
      for (let i = 0; i < quarters; i++) {
        const quarterDate = new Date(baseDate)
        quarterDate.setMonth(quarterDate.getMonth() - (i * 3))
        
        const estimatedEPS = 1.5 + Math.random() * 0.5
        const actualEPS = estimatedEPS + (Math.random() - 0.5) * 0.3
        const surprise = actualEPS - estimatedEPS
        
        historical.push({
          symbol,
          fiscalDateEnding: quarterDate.toISOString().split('T')[0],
          reportedDate: quarterDate.toISOString().split('T')[0],
          reportedEPS: parseFloat(actualEPS.toFixed(2)),
          estimatedEPS: parseFloat(estimatedEPS.toFixed(2)),
          surprise: parseFloat(surprise.toFixed(2)),
          surprisePercentage: parseFloat(((surprise / estimatedEPS) * 100).toFixed(2)),
          revenue: Math.floor((20000 + Math.random() * 10000) * 1000000),
          estimatedRevenue: Math.floor((19500 + Math.random() * 10000) * 1000000)
        })
      }

      // Cache por 2 horas
      cacheService.set(cacheKey, historical, 2 * 60 * 60 * 1000)

      return historical

    } catch (error) {
      logger.error('Failed to get historical earnings', { symbol, error })
      throw error
    }
  }

  /**
   * Obtiene datos de earnings desde APIs externas
   */
  private async fetchEarningsData(symbol: string): Promise<EarningsData | null> {
    try {
      if (this.alphaVantageApiKey) {
        return await this.fetchFromAlphaVantage(symbol)
      } else {
        return await this.fetchFromYahooFinance(symbol)
      }
    } catch (error) {
      logger.warn('Failed to fetch earnings data, using fallback', { symbol, error })
      return this.generateFallbackData(symbol)
    }
  }

  /**
   * Obtiene earnings desde Alpha Vantage
   */
  private async fetchFromAlphaVantage(symbol: string): Promise<EarningsData | null> {
    try {
      await rateLimitService.executeWithLimit(async () => Promise.resolve())
      
      const response = await axios.get(this.alphaVantageUrl, {
        params: {
          function: 'EARNINGS',
          symbol,
          apikey: this.alphaVantageApiKey
        },
        timeout: 10000
      })

      const earnings = response.data?.quarterlyEarnings?.[0]
      if (!earnings) {
        return null
      }

      return {
        symbol,
        fiscalDateEnding: earnings.fiscalDateEnding,
        reportedDate: earnings.reportedDate || earnings.fiscalDateEnding,
        reportedEPS: parseFloat(earnings.reportedEPS),
        estimatedEPS: parseFloat(earnings.estimatedEPS),
        surprise: parseFloat(earnings.surprise),
        surprisePercentage: parseFloat(earnings.surprisePercentage),
        revenue: 0 // Alpha Vantage no incluye revenue en earnings básico
      }

    } catch (error) {
      logger.warn('Alpha Vantage earnings fetch failed', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene earnings desde Yahoo Finance
   */
  private async fetchFromYahooFinance(symbol: string): Promise<EarningsData | null> {
    try {
      await rateLimitService.executeWithLimit(async () => Promise.resolve())
      
      const quote = await yahooFinance.quoteSummary(symbol, {
        modules: ['earnings', 'earningsHistory', 'earningsTrend']
      })

      const earnings = quote?.earningsHistory?.history?.[0]
      if (!earnings) {
        return null
      }

      return {
        symbol,
        fiscalDateEnding: earnings.quarter || '',
        reportedDate: new Date().toISOString().split('T')[0],
        reportedEPS: earnings.epsActual || 0,
        estimatedEPS: earnings.epsEstimate || 0,
        surprise: (earnings.epsActual || 0) - (earnings.epsEstimate || 0),
        surprisePercentage: ((earnings.epsActual || 0) - (earnings.epsEstimate || 0)) / (earnings.epsEstimate || 1) * 100,
        revenue: 0 // Yahoo Finance módulo earnings no incluye revenue
      }

    } catch (error) {
      logger.warn('Yahoo Finance earnings fetch failed', { symbol, error })
      return null
    }
  }

  /**
   * Genera datos de fallback para testing
   */
  private generateFallbackData(symbol: string): EarningsData {
    const estimatedEPS = 1.5 + Math.random() * 0.5
    const actualEPS = estimatedEPS + (Math.random() - 0.5) * 0.3
    const surprise = actualEPS - estimatedEPS
    
    const estimatedRevenue = (20000 + Math.random() * 10000) * 1000000
    const actualRevenue = estimatedRevenue * (1 + (Math.random() - 0.5) * 0.1)
    
    return {
      symbol,
      fiscalDateEnding: new Date().toISOString().split('T')[0],
      reportedDate: new Date().toISOString().split('T')[0],
      reportedEPS: parseFloat(actualEPS.toFixed(2)),
      estimatedEPS: parseFloat(estimatedEPS.toFixed(2)),
      surprise: parseFloat(surprise.toFixed(2)),
      surprisePercentage: parseFloat(((surprise / estimatedEPS) * 100).toFixed(2)),
      revenue: Math.floor(actualRevenue),
      estimatedRevenue: Math.floor(estimatedRevenue),
      revenueSurprise: Math.floor(actualRevenue - estimatedRevenue),
      revenueSurprisePercentage: parseFloat((((actualRevenue - estimatedRevenue) / estimatedRevenue) * 100).toFixed(2))
    }
  }

  /**
   * Analiza EPS vs estimaciones
   */
  private analyzeEPS(earnings: EarningsData): {
    beat: boolean
    miss: boolean
    inline: boolean
    magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
    description: string
  } {
    const surprise = earnings.surprise
    const surprisePercentage = Math.abs(earnings.surprisePercentage)
    
    const beat = surprise > 0
    const miss = surprise < 0
    const inline = Math.abs(surprise) < 0.01
    
    let magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
    if (surprisePercentage < 5) magnitude = 'SMALL'
    else if (surprisePercentage < 15) magnitude = 'MODERATE'
    else magnitude = 'LARGE'
    
    const description = inline 
      ? 'EPS en línea con estimaciones'
      : beat 
        ? `EPS superó estimaciones por ${surprisePercentage.toFixed(1)}%`
        : `EPS no alcanzó estimaciones por ${surprisePercentage.toFixed(1)}%`
    
    return { beat, miss, inline, magnitude, description }
  }

  /**
   * Analiza Revenue vs estimaciones
   */
  private analyzeRevenue(earnings: EarningsData): {
    beat: boolean
    miss: boolean
    inline: boolean
    magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
    description: string
  } | undefined {
    if (!earnings.estimatedRevenue || !earnings.revenueSurprisePercentage) {
      return undefined
    }
    
    const surprisePercentage = Math.abs(earnings.revenueSurprisePercentage)
    const surprise = earnings.revenueSurprise || 0
    
    const beat = surprise > 0
    const miss = surprise < 0
    const inline = Math.abs(surprise) < (earnings.estimatedRevenue * 0.01)
    
    let magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
    if (surprisePercentage < 3) magnitude = 'SMALL'
    else if (surprisePercentage < 8) magnitude = 'MODERATE'
    else magnitude = 'LARGE'
    
    const description = inline 
      ? 'Revenue en línea con estimaciones'
      : beat 
        ? `Revenue superó estimaciones por ${surprisePercentage.toFixed(1)}%`
        : `Revenue no alcanzó estimaciones por ${surprisePercentage.toFixed(1)}%`
    
    return { beat, miss, inline, magnitude, description }
  }

  /**
   * Calcula assessment general
   */
  private calculateOverallAssessment(
    epsAnalysis: any,
    revenueAnalysis: any
  ): 'STRONG_BEAT' | 'BEAT' | 'MIXED' | 'MISS' | 'STRONG_MISS' {
    const epsBeat = epsAnalysis.beat
    const epsLarge = epsAnalysis.magnitude === 'LARGE'
    const revenueBeat = revenueAnalysis?.beat
    const revenueLarge = revenueAnalysis?.magnitude === 'LARGE'
    
    if (epsBeat && revenueBeat && (epsLarge || revenueLarge)) {
      return 'STRONG_BEAT'
    } else if (epsBeat && (revenueBeat || !revenueAnalysis)) {
      return 'BEAT'
    } else if (!epsBeat && !epsAnalysis.miss && (!revenueAnalysis || revenueAnalysis.inline)) {
      return 'MIXED'
    } else if (epsAnalysis.miss && (!revenueAnalysis || !revenueAnalysis.beat)) {
      return epsLarge ? 'STRONG_MISS' : 'MISS'
    } else {
      return 'MIXED'
    }
  }

  /**
   * Extrae métricas clave
   */
  private extractKeyMetrics(
    earnings: EarningsData,
    epsAnalysis: any,
    revenueAnalysis: any
  ): { metric: string; value: string; assessment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }[] {
    const metrics = [
      {
        metric: 'EPS Actual',
        value: `$${earnings.reportedEPS.toFixed(2)}`,
        assessment: epsAnalysis.beat ? 'POSITIVE' : epsAnalysis.miss ? 'NEGATIVE' : 'NEUTRAL'
      },
      {
        metric: 'EPS Surprise',
        value: `${earnings.surprisePercentage > 0 ? '+' : ''}${earnings.surprisePercentage.toFixed(1)}%`,
        assessment: earnings.surprisePercentage > 0 ? 'POSITIVE' : 
                   earnings.surprisePercentage < 0 ? 'NEGATIVE' : 'NEUTRAL'
      }
    ]
    
    if (revenueAnalysis && earnings.revenue) {
      metrics.push({
        metric: 'Revenue',
        value: `$${(earnings.revenue / 1000000).toFixed(0)}M`,
        assessment: revenueAnalysis.beat ? 'POSITIVE' : 
                   revenueAnalysis.miss ? 'NEGATIVE' : 'NEUTRAL'
      })
    }
    
    if (earnings.revenueSurprisePercentage) {
      metrics.push({
        metric: 'Revenue Surprise',
        value: `${earnings.revenueSurprisePercentage > 0 ? '+' : ''}${earnings.revenueSurprisePercentage.toFixed(1)}%`,
        assessment: earnings.revenueSurprisePercentage > 0 ? 'POSITIVE' : 
                   earnings.revenueSurprisePercentage < 0 ? 'NEGATIVE' : 'NEUTRAL'
      })
    }
    
    return metrics
  }

  /**
   * Calcula impacto esperado en precio
   */
  private calculatePriceImpact(
    earnings: EarningsData,
    epsAnalysis: any,
    revenueAnalysis: any
  ): {
    expectedDirection: 'UP' | 'DOWN' | 'NEUTRAL'
    magnitude: number
    confidence: number
    timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM'
  } {
    // Lógica simplificada de impacto en precio
    let magnitude = 0
    let confidence = 50
    
    // Impacto por EPS
    if (epsAnalysis.beat) {
      magnitude += epsAnalysis.magnitude === 'LARGE' ? 5 : 
                  epsAnalysis.magnitude === 'MODERATE' ? 3 : 1
      confidence += 20
    } else if (epsAnalysis.miss) {
      magnitude -= epsAnalysis.magnitude === 'LARGE' ? 5 : 
                  epsAnalysis.magnitude === 'MODERATE' ? 3 : 1
      confidence += 20
    }
    
    // Impacto por Revenue
    if (revenueAnalysis) {
      if (revenueAnalysis.beat) {
        magnitude += revenueAnalysis.magnitude === 'LARGE' ? 3 : 
                    revenueAnalysis.magnitude === 'MODERATE' ? 2 : 1
        confidence += 15
      } else if (revenueAnalysis.miss) {
        magnitude -= revenueAnalysis.magnitude === 'LARGE' ? 3 : 
                    revenueAnalysis.magnitude === 'MODERATE' ? 2 : 1
        confidence += 15
      }
    }
    
    const expectedDirection = magnitude > 0.5 ? 'UP' : 
                             magnitude < -0.5 ? 'DOWN' : 'NEUTRAL'
    
    return {
      expectedDirection,
      magnitude: Math.abs(magnitude),
      confidence: Math.min(90, confidence),
      timeframe: 'IMMEDIATE'
    }
  }

  /**
   * Obtiene contexto histórico
   */
  private async getHistoricalContext(symbol: string): Promise<{
    consecutiveBeats: number
    consecutiveMisses: number
    avgSurpriseLastQuarters: number
    volatilityAfterEarnings: number
  }> {
    try {
      const historical = await this.getHistoricalEarnings(symbol, 8)
      
      let consecutiveBeats = 0
      let consecutiveMisses = 0
      
      for (const earnings of historical) {
        if (earnings.surprise > 0) {
          consecutiveBeats++
          consecutiveMisses = 0
        } else if (earnings.surprise < 0) {
          consecutiveMisses++
          consecutiveBeats = 0
        } else {
          break
        }
      }
      
      const avgSurpriseLastQuarters = historical.slice(0, 4)
        .reduce((sum, e) => sum + e.surprisePercentage, 0) / 4
      
      // Simular volatilidad post-earnings
      const volatilityAfterEarnings = 5 + Math.random() * 10
      
      return {
        consecutiveBeats,
        consecutiveMisses,
        avgSurpriseLastQuarters: parseFloat(avgSurpriseLastQuarters.toFixed(2)),
        volatilityAfterEarnings: parseFloat(volatilityAfterEarnings.toFixed(2))
      }
      
    } catch (error) {
      logger.warn('Failed to get historical context', { symbol, error })
      return {
        consecutiveBeats: 0,
        consecutiveMisses: 0,
        avgSurpriseLastQuarters: 0,
        volatilityAfterEarnings: 0
      }
    }
  }

  /**
   * Obtiene comparación con competidores
   */
  private async getCompetitorComparison(): Promise<{
    symbol: string
    epsGrowth: number
    revenueGrowth: number
    relative: 'OUTPERFORM' | 'INLINE' | 'UNDERPERFORM'
  }[] | undefined> {
    // En implementación real, esto buscaría competidores del mismo sector
    // Por ahora retornamos undefined
    return undefined
  }

  /**
   * Analiza earnings con Claude
   */
  private async analyzeWithClaude(
    symbol: string,
    earnings: EarningsData,
    context: any
  ): Promise<{
    analysis: string
    keyPoints: string[]
    risks: string[]
    opportunities: string[]
    outlook: string
    confidence: number
  }> {
    const prompt = `
Analiza los resultados de earnings de ${symbol}:

DATOS DE EARNINGS:
- EPS Reportado: $${earnings.reportedEPS}
- EPS Estimado: $${earnings.estimatedEPS}
- Sorpresa EPS: ${earnings.surprisePercentage}%
- Revenue: $${earnings.revenue ? (earnings.revenue / 1000000).toFixed(0) + 'M' : 'N/A'}
- Fecha: ${earnings.reportedDate}

ANÁLISIS AUTOMÁTICO:
- Assessment General: ${context.overallAssessment}
- Análisis EPS: ${context.epsAnalysis.description}
- Análisis Revenue: ${context.revenueAnalysis?.description || 'No disponible'}

CONTEXTO HISTÓRICO:
- Beats consecutivos: ${context.historicalContext.consecutiveBeats}
- Misses consecutivos: ${context.historicalContext.consecutiveMisses}
- Promedio sorpresas últimos trimestres: ${context.historicalContext.avgSurpriseLastQuarters}%

Por favor proporciona:
1. ANÁLISIS: Evaluación detallada de los resultados (2-3 oraciones)
2. PUNTOS_CLAVE: 3-5 puntos más importantes de estos earnings
3. RIESGOS: Principales riesgos identificados
4. OPORTUNIDADES: Oportunidades que surgen de estos resultados
5. OUTLOOK: Perspectiva para próximos trimestres
6. CONFIANZA: Tu nivel de confianza en este análisis (0-100)

Considera el contexto del sector y las condiciones macroeconómicas actuales.

Responde en formato JSON:
{
  "analysis": "Análisis detallado...",
  "keyPoints": ["punto1", "punto2", "punto3"],
  "risks": ["riesgo1", "riesgo2"],
  "opportunities": ["oportunidad1", "oportunidad2"],
  "outlook": "Perspectiva próximos trimestres...",
  "confidence": 85
}
`

    try {
      const response = await claudeAnalysisService.analyze({
        prompt,
        instrumentCode: symbol,
        context: `Análisis de earnings para ${symbol}`
      }, {
        useCache: true,
        cacheTTLMinutes: 120, // Cache por 2 horas
        retryAttempts: 2
      })

      if (response.success && response.analysis) {
        const result = JSON.parse(response.analysis)
        return {
          analysis: result.analysis || 'Análisis no disponible',
          keyPoints: result.keyPoints || [],
          risks: result.risks || [],
          opportunities: result.opportunities || [],
          outlook: result.outlook || 'Outlook no disponible',
          confidence: result.confidence || 70
        }
      }

      return {
        analysis: 'Análisis con Claude no disponible',
        keyPoints: [],
        risks: [],
        opportunities: [],
        outlook: 'Outlook no disponible',
        confidence: 50
      }
    } catch (error) {
      logger.warn('Claude earnings analysis failed', { symbol, error })
      return {
        analysis: 'Error en análisis con Claude',
        keyPoints: [],
        risks: [],
        opportunities: [],
        outlook: 'Outlook no disponible',
        confidence: 30
      }
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    configured: boolean
    cacheStats: any
    rateLimitStats: any
  } {
    return {
      configured: !!this.alphaVantageApiKey,
      cacheStats: cacheService.getStats(),
      rateLimitStats: rateLimitService.getStats()
    }
  }

  /**
   * Limpia cache de earnings
   */
  clearCache(): void {
    cacheService.clearByPrefix(this.CACHE_PREFIX)
    logger.info('Earnings analysis cache cleared')
  }
}

// Singleton instance
export const earningsAnalysisService = new EarningsAnalysisService()