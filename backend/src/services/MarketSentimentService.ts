import axios from 'axios'
import { claudeAnalysisService } from './claudeAnalysisService.js'
import { newsAnalysisService } from './NewsAnalysisService.js'
import { cacheService } from './cacheService.js'
import { rateLimitService } from './rateLimitService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('market-sentiment-service')

export interface MarketSentimentData {
  date: Date
  fearGreedIndex?: number // 0-100, 0 = extreme fear, 100 = extreme greed
  volatilityIndex?: number // VIX-like indicator
  newssentiment: number // -100 to 100
  socialSentiment?: number // -100 to 100 if available
  overallSentiment: 'FEAR' | 'GREED' | 'NEUTRAL'
  sentimentScore: number // -100 to 100
  confidence: number // 0-100
  marketCondition: 'BULL' | 'BEAR' | 'SIDEWAYS'
  keyFactors: string[]
  analysis: string
}

export interface SentimentTrend {
  period: '1D' | '1W' | '1M' | '3M'
  sentimentHistory: {
    date: Date
    sentiment: number
    volume?: number
  }[]
  trendDirection: 'UP' | 'DOWN' | 'FLAT'
  volatility: number
  keyEvents: {
    date: Date
    event: string
    impact: number
  }[]
}

export interface SectorSentiment {
  sector: string
  sentiment: number // -100 to 100
  confidence: number
  topStocks: {
    symbol: string
    sentiment: number
    volume: number
  }[]
  keyDrivers: string[]
}

export interface MarketSentimentOptions {
  useCache?: boolean
  cacheTTLMinutes?: number
  includeNews?: boolean
  includeSocial?: boolean
  analyzeWithClaude?: boolean
}

export class MarketSentimentService {
  private readonly CACHE_PREFIX = 'market_sentiment'
  private readonly DEFAULT_CACHE_TTL = 15 // minutos
  private fearGreedApiUrl = 'https://api.alternative.me/fng/'
  private vixApiUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX'

  constructor() {
    logger.info('MarketSentimentService initialized')
  }

  /**
   * Obtiene sentiment general del mercado
   */
  async getMarketSentiment(
    options: MarketSentimentOptions = {}
  ): Promise<MarketSentimentData> {
    const startTime = Date.now()
    
    try {
      const {
        useCache = true,
        cacheTTLMinutes = this.DEFAULT_CACHE_TTL,
        includeNews = true,
        includeSocial = false,
        analyzeWithClaude = true
      } = options

      const cacheKey = `${this.CACHE_PREFIX}:overall:${JSON.stringify(options)}`

      // Verificar cache
      if (useCache) {
        const cached = cacheService.get<MarketSentimentData>(cacheKey)
        if (cached) {
          logger.info('Market sentiment served from cache', { cacheKey })
          return cached
        }
      }

      // Obtener datos de múltiples fuentes
      const [
        fearGreedData,
        vixData,
        newsData,
        socialData
      ] = await Promise.allSettled([
        this.getFearGreedIndex(),
        this.getVIXData(),
        includeNews ? this.getNewsSentiment() : Promise.resolve(null),
        includeSocial ? this.getSocialSentiment() : Promise.resolve(null)
      ])

      // Procesar resultados
      const fearGreed = fearGreedData.status === 'fulfilled' ? fearGreedData.value : null
      const vix = vixData.status === 'fulfilled' ? vixData.value : null
      const news = newsData.status === 'fulfilled' ? newsData.value : null
      const social = socialData.status === 'fulfilled' ? socialData.value : null

      // Calcular sentiment combinado
      const sentimentComponents = []
      const keyFactors: string[] = []

      if (fearGreed !== null) {
        sentimentComponents.push({
          value: (fearGreed - 50) * 2, // Convertir 0-100 a -100 a 100
          weight: 0.3,
          factor: `Fear & Greed Index: ${fearGreed}`
        })
        keyFactors.push(`Fear & Greed: ${fearGreed}/100`)
      }

      if (vix !== null) {
        // VIX alto = miedo (negativo), VIX bajo = complacencia (positivo)
        const vixSentiment = Math.max(-100, Math.min(100, (30 - vix) * 3))
        sentimentComponents.push({
          value: vixSentiment,
          weight: 0.25,
          factor: `VIX Volatility: ${vix.toFixed(2)}`
        })
        keyFactors.push(`VIX: ${vix.toFixed(2)}`)
      }

      if (news !== null) {
        sentimentComponents.push({
          value: news,
          weight: 0.3,
          factor: `News Sentiment: ${news}`
        })
        keyFactors.push(`News: ${news > 0 ? '+' : ''}${news}`)
      }

      if (social !== null) {
        sentimentComponents.push({
          value: social,
          weight: 0.15,
          factor: `Social Sentiment: ${social}`
        })
        keyFactors.push(`Social: ${social > 0 ? '+' : ''}${social}`)
      }

      // Calcular sentiment ponderado
      const totalWeight = sentimentComponents.reduce((sum, comp) => sum + comp.weight, 0)
      const weightedSentiment = sentimentComponents.reduce((sum, comp) => 
        sum + (comp.value * comp.weight), 0
      ) / (totalWeight || 1)

      // Determinar condición del mercado
      const marketCondition = this.determineMarketCondition(weightedSentiment, vix)
      const overallSentiment = this.categorizeSentiment(weightedSentiment)
      
      // Análisis con Claude si está habilitado
      let analysis = `Sentiment del mercado basado en ${sentimentComponents.length} indicadores`
      let confidence = Math.min(95, 60 + (sentimentComponents.length * 10))

      if (analyzeWithClaude && sentimentComponents.length > 0) {
        try {
          const claudeAnalysis = await this.analyzeWithClaude({
            sentiment: weightedSentiment,
            fearGreed,
            vix,
            news,
            social,
            keyFactors
          })
          
          analysis = claudeAnalysis.analysis
          confidence = claudeAnalysis.confidence
        } catch (error) {
          logger.warn('Claude analysis failed for market sentiment', { error })
        }
      }

      const result: MarketSentimentData = {
        date: new Date(),
        fearGreedIndex: fearGreed || undefined,
        volatilityIndex: vix || undefined,
        newssentiment: news || 0,
        socialSentiment: social || undefined,
        overallSentiment,
        sentimentScore: Math.round(weightedSentiment),
        confidence,
        marketCondition,
        keyFactors,
        analysis
      }

      // Guardar en cache
      if (useCache) {
        cacheService.set(cacheKey, result, cacheTTLMinutes * 60 * 1000)
      }

      const executionTime = Date.now() - startTime
      logger.info('Market sentiment analysis completed', {
        sentiment: weightedSentiment,
        components: sentimentComponents.length,
        executionTime
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Market sentiment analysis failed', { error, executionTime })
      throw error
    }
  }

  /**
   * Obtiene trend de sentiment para un período específico
   */
  async getSentimentTrend(period: '1D' | '1W' | '1M' | '3M'): Promise<SentimentTrend> {
    const cacheKey = `${this.CACHE_PREFIX}:trend:${period}`
    
    // Verificar cache
    const cached = cacheService.get<SentimentTrend>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Simular datos históricos - en implementación real vendría de BD
      const now = new Date()
      const periodDays = period === '1D' ? 1 : period === '1W' ? 7 : 
                        period === '1M' ? 30 : 90
      
      const sentimentHistory = []
      for (let i = periodDays; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        
        // Simular sentiment histórico
        const baseSentiment = Math.sin(i * 0.1) * 30
        const noise = (Math.random() - 0.5) * 20
        const sentiment = Math.max(-100, Math.min(100, baseSentiment + noise))
        
        sentimentHistory.push({
          date,
          sentiment,
          volume: Math.floor(Math.random() * 1000000) + 500000
        })
      }

      // Calcular tendencia
      const recentSentiment = sentimentHistory.slice(-3).map(h => h.sentiment)
      const olderSentiment = sentimentHistory.slice(0, 3).map(h => h.sentiment)
      
      const recentAvg = recentSentiment.reduce((sum, s) => sum + s, 0) / recentSentiment.length
      const olderAvg = olderSentiment.reduce((sum, s) => sum + s, 0) / olderSentiment.length
      
      const trendDirection = recentAvg > olderAvg + 5 ? 'UP' : 
                           recentAvg < olderAvg - 5 ? 'DOWN' : 'FLAT'

      // Calcular volatilidad
      const sentiments = sentimentHistory.map(h => h.sentiment)
      const avgSentiment = sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length
      const variance = sentiments.reduce((sum, s) => sum + Math.pow(s - avgSentiment, 2), 0) / sentiments.length
      const volatility = Math.sqrt(variance)

      const result: SentimentTrend = {
        period,
        sentimentHistory,
        trendDirection,
        volatility,
        keyEvents: [
          {
            date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            event: 'Fed Rate Decision',
            impact: 15
          },
          {
            date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            event: 'Earnings Season Start',
            impact: -8
          }
        ]
      }

      // Cache por más tiempo para datos históricos
      cacheService.set(cacheKey, result, 60 * 60 * 1000) // 1 hora

      return result

    } catch (error) {
      logger.error('Failed to get sentiment trend', { period, error })
      throw error
    }
  }

  /**
   * Obtiene sentiment por sectores
   */
  async getSectorSentiment(): Promise<SectorSentiment[]> {
    const cacheKey = `${this.CACHE_PREFIX}:sectors`
    
    // Verificar cache
    const cached = cacheService.get<SectorSentiment[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Principales sectores
      const sectors = [
        'Technology', 'Healthcare', 'Financial', 'Consumer Discretionary',
        'Communication Services', 'Industrial', 'Consumer Staples',
        'Energy', 'Utilities', 'Real Estate', 'Materials'
      ]

      const sectorSentiments: SectorSentiment[] = []

      for (const sector of sectors) {
        // Simular análisis de sentiment por sector
        const baseSentiment = Math.random() * 200 - 100 // -100 a 100
        const confidence = 60 + Math.random() * 30 // 60-90
        
        const topStocks = [
          { symbol: 'AAPL', sentiment: baseSentiment + (Math.random() * 20 - 10), volume: 50000000 },
          { symbol: 'MSFT', sentiment: baseSentiment + (Math.random() * 20 - 10), volume: 30000000 },
          { symbol: 'GOOGL', sentiment: baseSentiment + (Math.random() * 20 - 10), volume: 25000000 }
        ]

        const keyDrivers = this.generateSectorDrivers(sector, baseSentiment)

        sectorSentiments.push({
          sector,
          sentiment: Math.round(baseSentiment),
          confidence: Math.round(confidence),
          topStocks,
          keyDrivers
        })
      }

      // Ordenar por sentiment
      sectorSentiments.sort((a, b) => b.sentiment - a.sentiment)

      // Cache por 30 minutos
      cacheService.set(cacheKey, sectorSentiments, 30 * 60 * 1000)

      return sectorSentiments

    } catch (error) {
      logger.error('Failed to get sector sentiment', { error })
      throw error
    }
  }

  /**
   * Obtiene Fear & Greed Index de API externa
   */
  private async getFearGreedIndex(): Promise<number | null> {
    try {
      await rateLimitService.executeWithLimit(async () => Promise.resolve())
      
      const response = await axios.get(this.fearGreedApiUrl, {
        params: { limit: 1 },
        timeout: 5000
      })

      if (response.data && response.data.data && response.data.data[0]) {
        const value = parseInt(response.data.data[0].value)
        logger.debug('Fear & Greed Index fetched', { value })
        return value
      }

      return null
    } catch (error) {
      logger.warn('Failed to fetch Fear & Greed Index', { error })
      return null
    }
  }

  /**
   * Obtiene datos del VIX desde Yahoo Finance
   */
  private async getVIXData(): Promise<number | null> {
    try {
      await rateLimitService.executeWithLimit(async () => Promise.resolve())
      
      const response = await axios.get(this.vixApiUrl, {
        params: {
          interval: '1d',
          range: '1d'
        },
        timeout: 5000
      })

      const chart = response.data?.chart?.result?.[0]
      if (chart && chart.meta && chart.meta.regularMarketPrice) {
        const vix = chart.meta.regularMarketPrice
        logger.debug('VIX data fetched', { vix })
        return vix
      }

      return null
    } catch (error) {
      logger.warn('Failed to fetch VIX data', { error })
      return null
    }
  }

  /**
   * Obtiene sentiment de noticias generales del mercado
   */
  private async getNewsSentiment(): Promise<number | null> {
    try {
      // Buscar noticias generales del mercado
      const marketNews = await newsAnalysisService.searchNews('market', {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000), // últimas 24 horas
        pageSize: 20,
        sortBy: 'publishedAt'
      }, {
        useCache: true,
        cacheTTLMinutes: 30,
        analyzeWithClaude: false, // Usar análisis básico para mayor velocidad
        minRelevanceScore: 20
      })

      if (marketNews.length === 0) {
        return null
      }

      // Calcular sentiment promedio ponderado
      const totalWeight = marketNews.reduce((sum, news) => sum + news.relevance, 0)
      const weightedSentiment = marketNews.reduce((sum, news) => 
        sum + (news.impactScore * news.relevance), 0
      ) / totalWeight

      logger.debug('News sentiment calculated', { 
        articles: marketNews.length,
        sentiment: weightedSentiment 
      })

      return Math.round(weightedSentiment)
    } catch (error) {
      logger.warn('Failed to get news sentiment', { error })
      return null
    }
  }

  /**
   * Obtiene sentiment de redes sociales (placeholder)
   */
  private async getSocialSentiment(): Promise<number | null> {
    // En una implementación real, esto se conectaría a APIs como Twitter, Reddit, etc.
    // Por ahora retornamos null
    logger.debug('Social sentiment not implemented')
    return null
  }

  /**
   * Analiza sentiment con Claude
   */
  private async analyzeWithClaude(data: {
    sentiment: number
    fearGreed: number | null
    vix: number | null
    news: number | null
    social: number | null
    keyFactors: string[]
  }): Promise<{ analysis: string; confidence: number }> {
    const prompt = `
Analiza el sentiment del mercado basado en los siguientes indicadores:

DATOS ACTUALES:
- Sentiment Combinado: ${data.sentiment.toFixed(1)} (-100 a +100)
- Fear & Greed Index: ${data.fearGreed || 'No disponible'}
- VIX (Volatilidad): ${data.vix?.toFixed(2) || 'No disponible'}
- Sentiment de Noticias: ${data.news || 'No disponible'}
- Sentiment Social: ${data.social || 'No disponible'}

FACTORES CLAVE:
${data.keyFactors.map(factor => `- ${factor}`).join('\n')}

Por favor proporciona:
1. ANÁLISIS: Una evaluación de 2-3 oraciones del estado actual del mercado
2. CONFIANZA: Tu nivel de confianza en este análisis (0-100)
3. CONTEXTO: Qué factores son más importantes ahora
4. OUTLOOK: Perspectiva a corto plazo (próximos días)

Considera el contexto macro actual y las tendencias recientes.

Responde en formato JSON:
{
  "analysis": "Análisis detallado del sentiment...",
  "confidence": 85,
  "keyContext": "Factores más relevantes...",
  "shortTermOutlook": "Perspectiva próximos días..."
}
`

    try {
      const response = await claudeAnalysisService.analyze({
        prompt,
        context: 'Análisis de sentiment del mercado'
      }, {
        useCache: true,
        cacheTTLMinutes: 20,
        retryAttempts: 1
      })

      if (response.success && response.analysis) {
        const result = JSON.parse(response.analysis)
        return {
          analysis: result.analysis || 'Análisis no disponible',
          confidence: result.confidence || 70
        }
      }

      return {
        analysis: 'Análisis con Claude no disponible',
        confidence: 60
      }
    } catch (error) {
      logger.warn('Claude sentiment analysis failed', { error })
      return {
        analysis: 'Análisis automático del sentiment del mercado',
        confidence: 50
      }
    }
  }

  /**
   * Determina la condición general del mercado
   */
  private determineMarketCondition(
    sentiment: number, 
    vix: number | null
  ): 'BULL' | 'BEAR' | 'SIDEWAYS' {
    if (sentiment > 20 && (vix === null || vix < 20)) {
      return 'BULL'
    } else if (sentiment < -20 && (vix === null || vix > 30)) {
      return 'BEAR'
    } else {
      return 'SIDEWAYS'
    }
  }

  /**
   * Categoriza el sentiment general
   */
  private categorizeSentiment(sentiment: number): 'FEAR' | 'GREED' | 'NEUTRAL' {
    if (sentiment > 25) return 'GREED'
    if (sentiment < -25) return 'FEAR'
    return 'NEUTRAL'
  }

  /**
   * Genera drivers clave para un sector
   */
  private generateSectorDrivers(sector: string, sentiment: number): string[] {
    const commonDrivers = {
      'Technology': ['AI adoption', 'Interest rates', 'Cloud growth', 'Regulation'],
      'Healthcare': ['Drug approvals', 'Healthcare policy', 'Aging demographics', 'Innovation'],
      'Financial': ['Interest rates', 'Credit quality', 'Economic growth', 'Regulation'],
      'Energy': ['Oil prices', 'Green transition', 'Geopolitics', 'Demand outlook'],
      'Consumer Discretionary': ['Consumer spending', 'Employment', 'Inflation', 'Confidence']
    }

    const drivers = commonDrivers[sector as keyof typeof commonDrivers] || 
      ['Market conditions', 'Economic outlook', 'Sector rotation', 'Earnings']

    // Agregar contexto basado en sentiment
    if (sentiment > 20) {
      drivers.unshift('Positive momentum')
    } else if (sentiment < -20) {
      drivers.unshift('Headwinds')
    }

    return drivers.slice(0, 4)
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    cacheStats: any
    rateLimitStats: any
    lastUpdate: Date | null
  } {
    return {
      cacheStats: cacheService.getStats(),
      rateLimitStats: rateLimitService.getStats(),
      lastUpdate: new Date() // En implementación real vendría de BD
    }
  }

  /**
   * Limpia cache de sentiment
   */
  clearCache(): void {
    cacheService.clearByPrefix(this.CACHE_PREFIX)
    logger.info('Market sentiment cache cleared')
  }
}

// Singleton instance
export const marketSentimentService = new MarketSentimentService()