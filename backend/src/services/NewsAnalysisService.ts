import axios from 'axios'
import { claudeAnalysisService } from './claudeAnalysisService.js'
import { cacheService } from './cacheService.js'
import { rateLimitService } from './rateLimitService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('news-analysis-service')

export interface NewsArticle {
  title: string
  description: string
  url: string
  urlToImage?: string
  publishedAt: string
  source: {
    id?: string
    name: string
  }
  content?: string
}

export interface NewsAnalysisResult {
  article: NewsArticle
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  impactScore: number // -100 to 100
  confidence: number // 0 to 100
  relevance: number // 0 to 100
  analysis: string
  keyPoints: string[]
  priceTargetImpact?: {
    shortTerm: number // días
    direction: 'UP' | 'DOWN' | 'NEUTRAL'
    magnitude: number // porcentaje esperado
  }
}

export interface NewsSearchFilters {
  symbol?: string
  company?: string
  from?: Date
  to?: Date
  language?: string
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt'
  pageSize?: number
}

export interface NewsAnalysisOptions {
  useCache?: boolean
  cacheTTLMinutes?: number
  analyzeWithClaude?: boolean
  includeContent?: boolean
  minRelevanceScore?: number
}

export class NewsAnalysisService {
  private newsApiKey: string | undefined
  private newsApiUrl = 'https://newsapi.org/v2'
  private readonly CACHE_PREFIX = 'news'
  private readonly DEFAULT_CACHE_TTL = 30 // minutos

  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY
    if (!this.newsApiKey) {
      logger.warn('NEWS_API_KEY not configured, news analysis will be limited')
    }
  }

  /**
   * Busca noticias relevantes para un símbolo específico
   */
  async searchNews(
    symbol: string,
    filters: NewsSearchFilters = {},
    options: NewsAnalysisOptions = {}
  ): Promise<NewsAnalysisResult[]> {
    const startTime = Date.now()
    
    try {
      const {
        useCache = true,
        cacheTTLMinutes = this.DEFAULT_CACHE_TTL,
        analyzeWithClaude = true,
        minRelevanceScore = 30
      } = options

      const cacheKey = `${this.CACHE_PREFIX}:search:${symbol}:${JSON.stringify(filters)}`

      // Verificar cache
      if (useCache) {
        const cached = cacheService.get<NewsAnalysisResult[]>(cacheKey)
        if (cached) {
          logger.info('News analysis served from cache', { 
            symbol, 
            articles: cached.length,
            cacheKey 
          })
          return cached
        }
      }

      // Buscar noticias en NewsAPI
      const articles = await this.fetchNewsArticles(symbol, filters)
      
      if (articles.length === 0) {
        logger.info('No news articles found', { symbol, filters })
        return []
      }

      logger.info('Found news articles', { 
        symbol, 
        articles: articles.length,
        timeRange: `${filters.from || 'unlimited'} to ${filters.to || 'now'}`
      })

      // Analizar cada artículo con Claude si está habilitado
      const analysisResults: NewsAnalysisResult[] = []
      
      for (const article of articles) {
        try {
          const analysis = analyzeWithClaude 
            ? await this.analyzeArticleWithClaude(article, symbol)
            : this.basicArticleAnalysis(article, symbol)

          // Filtrar por relevancia mínima
          if (analysis.relevance >= minRelevanceScore) {
            analysisResults.push(analysis)
          }
        } catch (error) {
          logger.warn('Failed to analyze article', { 
            error: (error as Error).message,
            articleTitle: article.title 
          })
          
          // Fallback a análisis básico
          const basicAnalysis = this.basicArticleAnalysis(article, symbol)
          if (basicAnalysis.relevance >= minRelevanceScore) {
            analysisResults.push(basicAnalysis)
          }
        }
      }

      // Ordenar por relevancia y impacto
      analysisResults.sort((a, b) => {
        return (b.relevance * b.confidence) - (a.relevance * a.confidence)
      })

      // Guardar en cache
      if (useCache) {
        cacheService.set(cacheKey, analysisResults, cacheTTLMinutes * 60 * 1000)
      }

      const executionTime = Date.now() - startTime
      logger.info('News analysis completed', {
        symbol,
        totalArticles: articles.length,
        relevantArticles: analysisResults.length,
        executionTime,
        avgRelevance: analysisResults.reduce((sum, r) => sum + r.relevance, 0) / analysisResults.length
      })

      return analysisResults

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('News analysis failed', { 
        symbol, 
        error: (error as Error).message,
        executionTime
      })
      throw error
    }
  }

  /**
   * Obtiene resumen de sentiment de noticias para un símbolo
   */
  async getNewsSentiment(symbol: string): Promise<{
    overallSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    sentimentScore: number // -100 to 100
    articleCount: number
    timeframe: string
    topKeywords: string[]
    lastUpdated: Date
  }> {
    try {
      const filters: NewsSearchFilters = {
        symbol,
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // últimos 7 días
        sortBy: 'publishedAt',
        pageSize: 50
      }

      const analysis = await this.searchNews(symbol, filters, {
        useCache: true,
        cacheTTLMinutes: 15,
        analyzeWithClaude: true,
        minRelevanceScore: 20
      })

      if (analysis.length === 0) {
        return {
          overallSentiment: 'NEUTRAL',
          sentimentScore: 0,
          articleCount: 0,
          timeframe: '7 days',
          topKeywords: [],
          lastUpdated: new Date()
        }
      }

      // Calcular sentiment promedio ponderado por relevancia y confianza
      const weightedScores = analysis.map(a => ({
        score: a.impactScore,
        weight: (a.relevance * a.confidence) / 10000
      }))

      const totalWeight = weightedScores.reduce((sum, ws) => sum + ws.weight, 0)
      const weightedAverage = weightedScores.reduce((sum, ws) => 
        sum + (ws.score * ws.weight), 0
      ) / totalWeight

      // Extraer keywords principales
      const allKeywords = analysis.flatMap(a => a.keyPoints)
      const keywordFreq = allKeywords.reduce((freq, keyword) => {
        freq[keyword] = (freq[keyword] || 0) + 1
        return freq
      }, {} as Record<string, number>)

      const topKeywords = Object.entries(keywordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword)

      return {
        overallSentiment: weightedAverage > 10 ? 'POSITIVE' : 
                         weightedAverage < -10 ? 'NEGATIVE' : 'NEUTRAL',
        sentimentScore: Math.round(weightedAverage),
        articleCount: analysis.length,
        timeframe: '7 days',
        topKeywords,
        lastUpdated: new Date()
      }

    } catch (error) {
      logger.error('Failed to get news sentiment', { symbol, error })
      throw error
    }
  }

  /**
   * Obtiene noticias de múltiples símbolos
   */
  async getPortfolioNews(symbols: string[]): Promise<{
    [symbol: string]: NewsAnalysisResult[]
  }> {
    const results: { [symbol: string]: NewsAnalysisResult[] } = {}
    
    // Procesar en paralelo con límite de concurrencia
    const batchSize = 3
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async symbol => {
        try {
          const news = await this.searchNews(symbol, {
            from: new Date(Date.now() - 24 * 60 * 60 * 1000), // últimas 24 horas
            pageSize: 10
          }, {
            useCache: true,
            cacheTTLMinutes: 20,
            minRelevanceScore: 40
          })
          
          return { symbol, news }
        } catch (error) {
          logger.warn('Failed to get news for symbol', { symbol, error })
          return { symbol, news: [] }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      batchResults.forEach(({ symbol, news }) => {
        results[symbol] = news
      })
    }

    return results
  }

  /**
   * Obtiene noticias desde NewsAPI
   */
  private async fetchNewsArticles(
    symbol: string, 
    filters: NewsSearchFilters
  ): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      throw new Error('NewsAPI key not configured')
    }

    try {
      // Construir query de búsqueda
      const queries = [
        symbol,
        `"${symbol}"`,
        filters.company && `"${filters.company}"`
      ].filter(Boolean)

      const searchQuery = queries.join(' OR ')
      
      const params = {
        q: searchQuery,
        language: filters.language || 'en',
        sortBy: filters.sortBy || 'publishedAt',
        pageSize: Math.min(filters.pageSize || 20, 100),
        ...(filters.from && { from: filters.from.toISOString() }),
        ...(filters.to && { to: filters.to.toISOString() })
      }

      // Rate limiting para NewsAPI
      await rateLimitService.executeWithLimit(async () => {
        return Promise.resolve()
      })

      const response = await axios.get(`${this.newsApiUrl}/everything`, {
        params,
        headers: {
          'X-API-Key': this.newsApiKey!
        },
        timeout: 10000
      })

      if (response.data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${response.data.message}`)
      }

      return response.data.articles || []

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('NewsAPI rate limit exceeded')
        }
        if (error.response?.status === 401) {
          throw new Error('NewsAPI unauthorized - check API key')
        }
      }
      
      logger.error('Failed to fetch news articles', { error, symbol })
      throw error
    }
  }

  /**
   * Analiza un artículo usando Claude
   */
  private async analyzeArticleWithClaude(
    article: NewsArticle,
    symbol: string
  ): Promise<NewsAnalysisResult> {
    const prompt = `
Analiza el siguiente artículo de noticias en relación al instrumento financiero ${symbol}:

TÍTULO: ${article.title}
DESCRIPCIÓN: ${article.description}
FUENTE: ${article.source.name}
FECHA: ${article.publishedAt}
${article.content ? `CONTENIDO: ${article.content.substring(0, 1000)}...` : ''}

Por favor evalúa:
1. RELEVANCIA: ¿Qué tan relevante es este artículo para ${symbol}? (0-100)
2. IMPACTO: ¿Es positivo, negativo o neutral para el precio? 
3. IMPACTO_SCORE: Califica el impacto esperado (-100 a +100)
4. CONFIANZA: ¿Qué tan confiable es tu análisis? (0-100)
5. PUNTOS_CLAVE: Lista 3-5 puntos clave del artículo
6. ANÁLISIS: Resumen del análisis en 2-3 oraciones
7. PRECIO_IMPACTO: ¿Afectará el precio a corto plazo? (días, dirección, magnitud %)

Responde en formato JSON:
{
  "relevance": 85,
  "impact": "POSITIVE|NEGATIVE|NEUTRAL",
  "impactScore": 25,
  "confidence": 80,
  "keyPoints": ["punto1", "punto2", "punto3"],
  "analysis": "Análisis detallado...",
  "priceTargetImpact": {
    "shortTerm": 3,
    "direction": "UP",
    "magnitude": 2.5
  }
}
`

    try {
      const response = await claudeAnalysisService.analyze({
        prompt,
        instrumentCode: symbol,
        context: `Análisis de noticias para ${symbol}`
      }, {
        useCache: true,
        cacheTTLMinutes: 60,
        retryAttempts: 2
      })

      if (!response.success || !response.analysis) {
        throw new Error('Claude analysis failed')
      }

      // Parsear respuesta JSON de Claude
      const claudeResult = JSON.parse(response.analysis)

      return {
        article,
        impact: claudeResult.impact || 'NEUTRAL',
        impactScore: claudeResult.impactScore || 0,
        confidence: claudeResult.confidence || 50,
        relevance: claudeResult.relevance || 50,
        analysis: claudeResult.analysis || 'Análisis no disponible',
        keyPoints: claudeResult.keyPoints || [],
        priceTargetImpact: claudeResult.priceTargetImpact
      }

    } catch (error) {
      logger.warn('Claude analysis failed, using fallback', { 
        error: (error as Error).message,
        symbol 
      })
      
      // Fallback a análisis básico
      return this.basicArticleAnalysis(article, symbol)
    }
  }

  /**
   * Análisis básico sin Claude (fallback)
   */
  private basicArticleAnalysis(
    article: NewsArticle,
    symbol: string
  ): NewsAnalysisResult {
    const text = `${article.title} ${article.description || ''}`.toLowerCase()
    
    // Keywords de análisis básico
    const positiveKeywords = [
      'earnings beat', 'revenue growth', 'profit', 'strong', 'growth',
      'expansion', 'upgrade', 'bullish', 'positive', 'gain', 'up',
      'increase', 'raised', 'guidance', 'outperform', 'buy'
    ]
    
    const negativeKeywords = [
      'loss', 'decline', 'drop', 'fall', 'weak', 'downgrade',
      'bearish', 'negative', 'cut', 'reduce', 'miss', 'below',
      'concern', 'risk', 'sell', 'underperform'
    ]

    // Verificar relevancia básica
    const symbolMentioned = text.includes(symbol.toLowerCase())
    const relevance = symbolMentioned ? 70 : 30

    // Calcular sentiment básico
    const positiveCount = positiveKeywords.filter(kw => text.includes(kw)).length
    const negativeCount = negativeKeywords.filter(kw => text.includes(kw)).length
    
    const impactScore = (positiveCount - negativeCount) * 10
    const impact = impactScore > 5 ? 'POSITIVE' : 
                  impactScore < -5 ? 'NEGATIVE' : 'NEUTRAL'

    return {
      article,
      impact,
      impactScore: Math.max(-100, Math.min(100, impactScore)),
      confidence: 60, // Baja confianza para análisis básico
      relevance,
      analysis: `Análisis básico: ${positiveCount} indicadores positivos, ${negativeCount} negativos`,
      keyPoints: [
        ...positiveKeywords.filter(kw => text.includes(kw)).slice(0, 3),
        ...negativeKeywords.filter(kw => text.includes(kw)).slice(0, 2)
      ]
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
      configured: !!this.newsApiKey,
      cacheStats: cacheService.getStats(),
      rateLimitStats: rateLimitService.getStats()
    }
  }

  /**
   * Limpia cache de noticias
   */
  clearCache(): void {
    cacheService.clearByPrefix(this.CACHE_PREFIX)
    logger.info('News analysis cache cleared')
  }
}

// Singleton instance
export const newsAnalysisService = new NewsAnalysisService()