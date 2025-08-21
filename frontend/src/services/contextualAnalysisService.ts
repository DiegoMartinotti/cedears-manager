import { api } from './api'

export interface ContextualAnalysisRequest {
  symbol: string
  analysisType: 'COMPREHENSIVE' | 'NEWS' | 'SENTIMENT' | 'EARNINGS' | 'TRENDS' | 'CUSTOM'
  timeframe?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'
  options?: {
    includeNews?: boolean
    includeSentiment?: boolean
    includeEarnings?: boolean
    includeTrends?: boolean
    includeRecommendations?: boolean
    customPrompt?: string
    useCache?: boolean
    cacheTTLMinutes?: number
  }
}

export interface PortfolioAnalysisRequest {
  symbols: string[]
  options?: {
    useCache?: boolean
    analysisDepth?: 'BASIC' | 'DETAILED'
  }
}

export interface CustomReportRequest {
  symbol: string
  reportType: 'INVESTMENT_THESIS' | 'RISK_ASSESSMENT' | 'OPPORTUNITY_ANALYSIS' | 'MARKET_OUTLOOK'
  options?: {
    format?: 'SUMMARY' | 'DETAILED' | 'EXECUTIVE'
    includeCharts?: boolean
    includeTechnicals?: boolean
    customSections?: string[]
  }
}

export interface NewsAnalysisOptions {
  days?: number
  pageSize?: number
  minRelevance?: number
  useCache?: boolean
}

export interface MarketSentimentOptions {
  includeNews?: boolean
  includeSocial?: boolean
  useCache?: boolean
}

export interface EarningsAnalysisOptions {
  includeHistorical?: boolean
  includeCompetitors?: boolean
  analyzeWithClaude?: boolean
  useCache?: boolean
}

export interface TrendPredictionOptions {
  timeframe?: '1W' | '1M' | '3M' | '6M' | '1Y'
  includeScenarios?: boolean
  analyzeWithClaude?: boolean
  useCache?: boolean
}

class ContextualAnalysisService {
  private baseUrl = '/api/v1/contextual'

  // === ANÁLISIS PRINCIPAL ===

  /**
   * Realiza análisis contextual completo de un símbolo
   */
  async analyzeSymbol(request: ContextualAnalysisRequest) {
    const response = await api.post(`${this.baseUrl}/analyze`, request)
    return response.data.data
  }

  /**
   * Analiza múltiples símbolos de un portafolio
   */
  async analyzePortfolio(request: PortfolioAnalysisRequest) {
    const response = await api.post(`${this.baseUrl}/portfolio`, request)
    return response.data.data
  }

  /**
   * Genera reporte personalizado
   */
  async generateCustomReport(
    symbol: string,
    reportType: CustomReportRequest['reportType'],
    options?: CustomReportRequest['options']
  ) {
    const response = await api.post(`${this.baseUrl}/report`, {
      symbol,
      reportType,
      options
    })
    return response.data.data
  }

  // === COMPONENTES ESPECÍFICOS ===

  /**
   * Obtiene análisis de noticias para un símbolo
   */
  async getNewsAnalysis(symbol: string, options?: NewsAnalysisOptions) {
    const params = new URLSearchParams()
    
    if (options?.days) params.append('days', options.days.toString())
    if (options?.pageSize) params.append('pageSize', options.pageSize.toString())
    if (options?.minRelevance) params.append('minRelevance', options.minRelevance.toString())
    if (options?.useCache !== undefined) params.append('useCache', options.useCache.toString())

    const response = await api.get(`${this.baseUrl}/news/${symbol}?${params.toString()}`)
    return response.data.data
  }

  /**
   * Obtiene sentiment general del mercado
   */
  async getMarketSentiment(options?: MarketSentimentOptions) {
    const params = new URLSearchParams()
    
    if (options?.includeNews !== undefined) params.append('includeNews', options.includeNews.toString())
    if (options?.includeSocial !== undefined) params.append('includeSocial', options.includeSocial.toString())
    if (options?.useCache !== undefined) params.append('useCache', options.useCache.toString())

    const response = await api.get(`${this.baseUrl}/sentiment?${params.toString()}`)
    return response.data.data
  }

  /**
   * Obtiene análisis de earnings para un símbolo
   */
  async getEarningsAnalysis(symbol: string, options?: EarningsAnalysisOptions) {
    const params = new URLSearchParams()
    
    if (options?.includeHistorical !== undefined) params.append('includeHistorical', options.includeHistorical.toString())
    if (options?.includeCompetitors !== undefined) params.append('includeCompetitors', options.includeCompetitors.toString())
    if (options?.analyzeWithClaude !== undefined) params.append('analyzeWithClaude', options.analyzeWithClaude.toString())
    if (options?.useCache !== undefined) params.append('useCache', options.useCache.toString())

    const response = await api.get(`${this.baseUrl}/earnings/${symbol}?${params.toString()}`)
    return response.data.data
  }

  /**
   * Obtiene predicción de tendencias para un símbolo
   */
  async getTrendPrediction(symbol: string, options?: TrendPredictionOptions) {
    const params = new URLSearchParams()
    
    if (options?.timeframe) params.append('timeframe', options.timeframe)
    if (options?.includeScenarios !== undefined) params.append('includeScenarios', options.includeScenarios.toString())
    if (options?.analyzeWithClaude !== undefined) params.append('analyzeWithClaude', options.analyzeWithClaude.toString())
    if (options?.useCache !== undefined) params.append('useCache', options.useCache.toString())

    const response = await api.get(`${this.baseUrl}/trends/${symbol}?${params.toString()}`)
    return response.data.data
  }

  // === ANÁLISIS ESPECIALIZADOS ===

  /**
   * Obtiene calendario de próximos earnings
   */
  async getEarningsCalendar(daysAhead: number = 7) {
    const response = await api.get(`${this.baseUrl}/earnings/calendar?daysAhead=${daysAhead}`)
    return response.data.data
  }

  /**
   * Analiza tendencias para múltiples símbolos
   */
  async analyzePortfolioTrends(symbols: string[], timeframe: string = '1M') {
    const response = await api.post(`${this.baseUrl}/portfolio/trends`, {
      symbols,
      timeframe
    })
    return response.data.data
  }

  // === ADMINISTRACIÓN ===

  /**
   * Obtiene estado de todos los servicios
   */
  async getServicesStatus() {
    const response = await api.get(`${this.baseUrl}/status`)
    return response.data.data
  }

  /**
   * Limpia cache de servicios
   */
  async clearCache(service?: string) {
    const response = await api.post(`${this.baseUrl}/cache/clear`, { service })
    return response.data
  }

  // === UTILIDADES ===

  /**
   * Transforma datos de análisis para visualización
   */
  transformAnalysisData(analysisData: any) {
    if (!analysisData) return null

    return {
      symbol: analysisData.symbol,
      timestamp: new Date(analysisData.timestamp),
      recommendation: {
        action: analysisData.overallAssessment.recommendation,
        confidence: analysisData.overallAssessment.confidence,
        score: analysisData.overallAssessment.score,
        reasoning: analysisData.overallAssessment.reasoning,
        keyFactors: analysisData.overallAssessment.keyFactors
      },
      components: {
        news: analysisData.components.news,
        sentiment: analysisData.components.marketSentiment,
        earnings: analysisData.components.earnings,
        trends: analysisData.components.trends
      },
      risks: analysisData.risks || [],
      opportunities: analysisData.opportunities || [],
      actionItems: analysisData.actionItems || [],
      claudeInsights: analysisData.claudeInsights
    }
  }

  /**
   * Formatea datos de noticias para visualización
   */
  formatNewsData(newsData: any) {
    if (!newsData) return null

    return {
      articles: newsData.newsAnalysis || [],
      sentiment: {
        score: newsData.sentiment?.sentimentScore || 0,
        direction: newsData.sentiment?.overallSentiment || 'NEUTRAL',
        articleCount: newsData.sentiment?.articleCount || 0,
        topKeywords: newsData.sentiment?.topKeywords || []
      },
      summary: newsData.summary || {}
    }
  }

  /**
   * Formatea datos de sentiment para visualización
   */
  formatSentimentData(sentimentData: any) {
    if (!sentimentData) return null

    return {
      current: {
        sentiment: sentimentData.current?.overallSentiment || 'NEUTRAL',
        score: sentimentData.current?.sentimentScore || 0,
        confidence: sentimentData.current?.confidence || 0,
        marketCondition: sentimentData.current?.marketCondition || 'SIDEWAYS',
        keyFactors: sentimentData.current?.keyFactors || []
      },
      trend: sentimentData.trend || null,
      sectors: sentimentData.sectors || [],
      summary: sentimentData.summary || {}
    }
  }

  /**
   * Formatea datos de earnings para visualización
   */
  formatEarningsData(earningsData: any) {
    if (!earningsData) return null

    return {
      current: earningsData.current || null,
      historical: earningsData.historical || [],
      summary: {
        assessment: earningsData.summary?.assessment || 'UNKNOWN',
        surprise: earningsData.summary?.surprise || 0,
        priceImpact: earningsData.summary?.priceImpact || 'NEUTRAL'
      }
    }
  }

  /**
   * Formatea datos de tendencias para visualización
   */
  formatTrendData(trendData: any) {
    if (!trendData) return null

    return {
      prediction: {
        direction: trendData.prediction?.prediction?.direction || 'SIDEWAYS',
        confidence: trendData.prediction?.prediction?.confidence || 0,
        strength: trendData.prediction?.prediction?.strength || 'WEAK',
        probability: trendData.prediction?.prediction?.probability || { bullish: 33, bearish: 33, sideways: 34 }
      },
      analysis: trendData.prediction?.analysis || {},
      scenarios: trendData.prediction?.scenarios || [],
      claudeInsights: trendData.prediction?.claudeAnalysis || null,
      summary: trendData.summary || {}
    }
  }

  /**
   * Calcula métricas resumidas de un análisis completo
   */
  calculateSummaryMetrics(analysisData: any) {
    if (!analysisData) return null

    const score = analysisData.overallAssessment?.score || 0
    const confidence = analysisData.overallAssessment?.confidence || 0
    
    return {
      overallHealth: score > 40 ? 'EXCELLENT' : score > 20 ? 'GOOD' : score > -20 ? 'FAIR' : 'POOR',
      riskLevel: analysisData.risks?.some((r: any) => r.severity === 'HIGH') ? 'HIGH' : 
                 analysisData.risks?.some((r: any) => r.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW',
      opportunityCount: analysisData.opportunities?.length || 0,
      actionItemsCount: analysisData.actionItems?.length || 0,
      componentsAvailable: Object.keys(analysisData.components || {}).length,
      lastUpdated: new Date(analysisData.timestamp),
      confidence
    }
  }
}

export const contextualAnalysisService = new ContextualAnalysisService()