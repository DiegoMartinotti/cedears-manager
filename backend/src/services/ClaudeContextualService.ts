import { newsAnalysisService } from './NewsAnalysisService.js'
import { marketSentimentService } from './MarketSentimentService.js'
import { earningsAnalysisService } from './EarningsAnalysisService.js'
import { trendPredictionService } from './TrendPredictionService.js'
import { claudeAnalysisService } from './claudeAnalysisService.js'
import { cacheService } from './cacheService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('claude-contextual-service')

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

export interface ComprehensiveAnalysisResult {
  symbol: string
  timestamp: Date
  overallAssessment: {
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
    confidence: number // 0-100
    score: number // -100 to 100
    reasoning: string
    keyFactors: string[]
  }
  components: {
    news?: {
      summary: string
      sentiment: number
      articleCount: number
      keyHeadlines: string[]
      impactScore: number
    }
    marketSentiment?: {
      overallSentiment: string
      sentimentScore: number
      marketCondition: string
      keyFactors: string[]
    }
    earnings?: {
      lastReport: {
        assessment: string
        surprise: number
        analysis: string
      }
      nextReport?: {
        date: string
        expectations: string
      }
    }
    trends?: {
      shortTerm: { direction: string; confidence: number }
      mediumTerm: { direction: string; confidence: number }
      longTerm?: { direction: string; confidence: number }
      keyDrivers: string[]
    }
  }
  risks: {
    risk: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframe: string
    mitigation?: string
  }[]
  opportunities: {
    opportunity: string
    potential: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframe: string
    requirements?: string
  }[]
  actionItems: {
    action: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframe: string
    description: string
  }[]
  claudeInsights: {
    summary: string
    keyPoints: string[]
    marketContext: string
    strategicRecommendations: string[]
    watchlist: string[]
    confidence: number
  }
}

export interface ContextualReportOptions {
  format: 'SUMMARY' | 'DETAILED' | 'EXECUTIVE'
  includeCharts?: boolean
  includeTechnicals?: boolean
  customSections?: string[]
}

export interface PortfolioContextualAnalysis {
  portfolioSummary: {
    overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    totalScore: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    diversificationScore: number
  }
  topPerformers: {
    symbol: string
    score: number
    reason: string
  }[]
  underperformers: {
    symbol: string
    score: number
    concerns: string[]
  }[]
  marketThemes: {
    theme: string
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    affectedSymbols: string[]
  }[]
  recommendations: {
    type: 'BUY' | 'SELL' | 'HOLD' | 'ROTATE' | 'HEDGE'
    symbols: string[]
    reasoning: string
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  }[]
}

export class ClaudeContextualService {
  private readonly CACHE_PREFIX = 'contextual_analysis'
  private readonly DEFAULT_CACHE_TTL = 20 // minutos

  constructor() {
    logger.info('ClaudeContextualService initialized')
  }

  private prepareOptions(request: ContextualAnalysisRequest) {
    const { symbol, analysisType, timeframe = '1M', options = {} } = request
    const {
      includeNews = true,
      includeSentiment = true,
      includeEarnings = true,
      includeTrends = true,
      useCache = true,
      cacheTTLMinutes = this.DEFAULT_CACHE_TTL
    } = options
    const cacheKey = `${this.CACHE_PREFIX}:${symbol}:${analysisType}:${timeframe}:${JSON.stringify(options)}`
    return {
      symbol,
      analysisType,
      timeframe,
      includeNews,
      includeSentiment,
      includeEarnings,
      includeTrends,
      useCache,
      cacheTTLMinutes,
      cacheKey
    }
  }

  private checkCache(options: {
    cacheKey: string
    useCache: boolean
    symbol: string
    analysisType: ContextualAnalysisRequest['analysisType']
  }) {
    if (!options.useCache) {
      return null
    }
    const cached = cacheService.get<ComprehensiveAnalysisResult>(options.cacheKey)
    if (cached) {
      logger.info('Contextual analysis served from cache', {
        symbol: options.symbol,
        analysisType: options.analysisType,
        cacheKey: options.cacheKey
      })
      return cached
    }
    return null
  }

  private async performAnalyses(options: {
    symbol: string
    analysisType: ContextualAnalysisRequest['analysisType']
    timeframe: NonNullable<ContextualAnalysisRequest['timeframe']>
    includeNews: boolean
    includeSentiment: boolean
    includeEarnings: boolean
    includeTrends: boolean
  }) {
    const dataPromises = []

    if (options.includeNews || options.analysisType === 'COMPREHENSIVE') {
      dataPromises.push(this.getNewsData(options.symbol))
    }

    if (options.includeSentiment || options.analysisType === 'COMPREHENSIVE') {
      dataPromises.push(this.getSentimentData())
    }

    if (options.includeEarnings || options.analysisType === 'COMPREHENSIVE') {
      dataPromises.push(this.getEarningsData(options.symbol))
    }

    if (options.includeTrends || options.analysisType === 'COMPREHENSIVE') {
      dataPromises.push(this.getTrendsData(options.symbol, options.timeframe))
    }

    const results = await Promise.allSettled(dataPromises)

    return {
      newsData: results[0]?.status === 'fulfilled' ? results[0].value : null,
      sentimentData: results[1]?.status === 'fulfilled' ? results[1].value : null,
      earningsData: results[2]?.status === 'fulfilled' ? results[2].value : null,
      trendsData: results[3]?.status === 'fulfilled' ? results[3].value : null
    }
  }

  private async aggregateResults(
    symbol: string,
    data: {
      newsData: any
      sentimentData: any
      earningsData: any
      trendsData: any
    }
  ) {
    const overallAssessment = await this.calculateOverallAssessment(symbol, data)

    const components = this.buildAnalysisComponents(data)

    const risks = this.identifyRisks(data)
    const opportunities = this.identifyOpportunities(data)

    const actionItems = this.generateActionItems(overallAssessment, risks, opportunities)

    const claudeInsights = await this.generateClaudeInsights(symbol, {
      overallAssessment,
      components,
      risks,
      opportunities,
      rawData: data
    })

    return { overallAssessment, components, risks, opportunities, actionItems, claudeInsights }
  }


  /**
   * Realiza análisis contextual completo de un símbolo
   */
  async analyzeSymbol(request: ContextualAnalysisRequest): Promise<ComprehensiveAnalysisResult> {
    const startTime = Date.now()

    try {
      const options = this.prepareOptions(request)
      const cached = this.checkCache(options)
      if (cached) {
        return cached
      }

      const data = await this.performAnalyses(options)
      const aggregated = await this.aggregateResults(options.symbol, data)

      const result: ComprehensiveAnalysisResult = {
        symbol: options.symbol,
        timestamp: new Date(),
        ...aggregated
      }

      if (options.useCache) {
        cacheService.set(options.cacheKey, result, options.cacheTTLMinutes * 60 * 1000)
      }

      const executionTime = Date.now() - startTime
      logger.info('Contextual analysis completed', {
        symbol: options.symbol,
        analysisType: options.analysisType,
        recommendation: aggregated.overallAssessment.recommendation,
        confidence: aggregated.overallAssessment.confidence,
        componentsCount: Object.keys(aggregated.components).length,
        executionTime
      })

      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Contextual analysis failed', {
        symbol: request.symbol,
        analysisType: request.analysisType,
        error,
        executionTime
      })
      throw error
    }
  }

  /**
   * Analiza múltiples símbolos de un portafolio
   */
  /* eslint-disable-next-line max-lines-per-function */
  async analyzePortfolio(
    symbols: string[],
    options: { useCache?: boolean; analysisDepth?: 'BASIC' | 'DETAILED' } = {}
  ): Promise<PortfolioContextualAnalysis> {
    const startTime = Date.now()
    
    try {
      const { useCache = true, analysisDepth = 'BASIC' } = options

      logger.info('Starting portfolio contextual analysis', { 
        symbols: symbols.length,
        analysisDepth 
      })

      // Analizar cada símbolo
      const symbolAnalyses = await Promise.allSettled(
        symbols.map(symbol => 
          this.analyzeSymbol({
            symbol,
            analysisType: 'COMPREHENSIVE',
            options: {
              useCache,
              cacheTTLMinutes: 30
            }
          })
        )
      )

      // Filtrar análisis exitosos
      const successfulAnalyses = symbolAnalyses
        .filter((result): result is PromiseFulfilledResult<ComprehensiveAnalysisResult> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)

      if (successfulAnalyses.length === 0) {
        throw new Error('No se pudieron analizar los símbolos del portafolio')
      }

      // Calcular métricas del portafolio
      const portfolioSummary = this.calculatePortfolioSummary(successfulAnalyses)

      // Identificar top performers y underperformers
      const rankedSymbols = successfulAnalyses
        .sort((a, b) => b.overallAssessment.score - a.overallAssessment.score)

      const topPerformers = rankedSymbols.slice(0, 3).map(analysis => ({
        symbol: analysis.symbol,
        score: analysis.overallAssessment.score,
        reason: analysis.overallAssessment.keyFactors[0] || 'Strong fundamentals'
      }))

      const underperformers = rankedSymbols.slice(-3).map(analysis => ({
        symbol: analysis.symbol,
        score: analysis.overallAssessment.score,
        concerns: analysis.risks.slice(0, 2).map(risk => risk.risk)
      }))

      // Identificar temas del mercado
      const marketThemes = this.identifyMarketThemes(successfulAnalyses)

      // Generar recomendaciones del portafolio
      const recommendations = this.generatePortfolioRecommendations(successfulAnalyses)

      const result: PortfolioContextualAnalysis = {
        portfolioSummary,
        topPerformers,
        underperformers,
        marketThemes,
        recommendations
      }

      const executionTime = Date.now() - startTime
      logger.info('Portfolio contextual analysis completed', {
        symbolsAnalyzed: successfulAnalyses.length,
        overallHealth: portfolioSummary.overallHealth,
        executionTime
      })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Portfolio contextual analysis failed', { symbols, error, executionTime })
      throw error
    }
  }

  /**
   * Genera reporte personalizado
   */
  /* eslint-disable-next-line max-lines-per-function */
  async generateCustomReport(
    symbol: string,
    reportType: 'INVESTMENT_THESIS' | 'RISK_ASSESSMENT' | 'OPPORTUNITY_ANALYSIS' | 'MARKET_OUTLOOK',
    options: ContextualReportOptions = { format: 'DETAILED' }
  ): Promise<{
    title: string
    summary: string
    sections: {
      title: string
      content: string
      data?: any
    }[]
    conclusion: string
    disclaimer: string
  }> {
    try {
      // Obtener análisis completo
      const analysis = await this.analyzeSymbol({
        symbol,
        analysisType: 'COMPREHENSIVE'
      })

      // Generar reporte específico con Claude
      const prompt = this.buildReportPrompt(symbol, reportType, analysis, options)
      
      const claudeResponse = await claudeAnalysisService.analyze({
        prompt,
        instrumentCode: symbol,
        context: `Generación de reporte ${reportType} para ${symbol}`
      }, {
        useCache: true,
        cacheTTLMinutes: 60
      })

      if (!claudeResponse.success || !claudeResponse.analysis) {
        throw new Error('Failed to generate custom report with Claude')
      }

      const reportData = JSON.parse(claudeResponse.analysis)

      return {
        title: reportData.title || `${reportType} Report for ${symbol}`,
        summary: reportData.summary || 'Report summary not available',
        sections: reportData.sections || [],
        conclusion: reportData.conclusion || 'Conclusion not available',
        disclaimer: 'Este reporte es generado automáticamente con IA y no constituye asesoramiento financiero.'
      }

    } catch (error) {
      logger.error('Custom report generation failed', { symbol, reportType, error })
      throw error
    }
  }

  /**
   * Obtiene datos de noticias
   */
  private async getNewsData(symbol: string): Promise<any> {
    try {
      const [newsAnalysis, sentiment] = await Promise.all([
        newsAnalysisService.searchNews(symbol, {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // últimos 7 días
          pageSize: 10
        }, {
          useCache: true,
          minRelevanceScore: 30
        }),
        newsAnalysisService.getNewsSentiment(symbol)
      ])

      return { newsAnalysis, sentiment }
    } catch (error) {
      logger.warn('Failed to get news data', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene datos de sentiment del mercado
   */
  private async getSentimentData(): Promise<any> {
    try {
      const sentiment = await marketSentimentService.getMarketSentiment({
        useCache: true,
        includeNews: true
      })
      return sentiment
    } catch (error) {
      logger.warn('Failed to get sentiment data', { error })
      return null
    }
  }

  /**
   * Obtiene datos de earnings
   */
  private async getEarningsData(symbol: string): Promise<any> {
    try {
      const earnings = await earningsAnalysisService.analyzeEarnings(symbol, {
        useCache: true,
        analyzeWithClaude: false
      })
      return earnings
    } catch (error) {
      logger.warn('Failed to get earnings data', { symbol, error })
      return null
    }
  }

  /**
   * Obtiene datos de tendencias
   */
  private async getTrendsData(symbol: string, timeframe: string): Promise<any> {
    try {
      const trends = await trendPredictionService.predictTrend(
        symbol,
        timeframe as any,
        {
          useCache: true,
          analyzeWithClaude: false
        }
      )
      return trends
    } catch (error) {
      logger.warn('Failed to get trends data', { symbol, error })
      return null
    }
  }

  /**
   * Calcula assessment general
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async calculateOverallAssessment(
    symbol: string,
    data: any
  ): Promise<{
    recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
    confidence: number
    score: number
    reasoning: string
    keyFactors: string[]
  }> {
    let totalScore = 0
    let weightSum = 0
    const keyFactors: string[] = []

    // Score de noticias
    if (data.newsData) {
      const newsScore = data.newsData.sentiment.sentimentScore
      totalScore += newsScore * 0.25
      weightSum += 0.25
      keyFactors.push(`Sentiment de noticias: ${newsScore > 0 ? 'Positivo' : 'Negativo'}`)
    }

    // Score de sentiment general
    if (data.sentimentData) {
      const sentimentScore = data.sentimentData.sentimentScore
      totalScore += sentimentScore * 0.2
      weightSum += 0.2
      keyFactors.push(`Sentiment del mercado: ${data.sentimentData.overallSentiment}`)
    }

    // Score de earnings
    if (data.earningsData) {
      const earningsScore = this.getEarningsScore(data.earningsData.analysis.overallAssessment)
      totalScore += earningsScore * 0.3
      weightSum += 0.3
      keyFactors.push(`Performance earnings: ${data.earningsData.analysis.overallAssessment}`)
    }

    // Score de tendencias
    if (data.trendsData) {
      const trendsScore = this.getTrendsScore(data.trendsData.prediction)
      totalScore += trendsScore * 0.25
      weightSum += 0.25
      keyFactors.push(`Tendencia ${data.trendsData.timeframe}: ${data.trendsData.prediction.direction}`)
    }

    const finalScore = weightSum > 0 ? totalScore / weightSum : 0
    const recommendation = this.scoreToRecommendation(finalScore)
    const confidence = Math.min(95, 60 + Math.abs(finalScore) * 0.4)

    return {
      recommendation,
      confidence: Math.round(confidence),
      score: Math.round(finalScore),
      reasoning: `Análisis basado en ${Math.round(weightSum * 4)} componentes con score ponderado de ${finalScore.toFixed(1)}`,
      keyFactors: keyFactors.slice(0, 4)
    }
  }

  /**
   * Construye componentes del análisis
   */
  /* eslint-disable-next-line max-lines-per-function */
  private buildAnalysisComponents(data: any): any {
    const components: any = {}

    if (data.newsData) {
      components.news = {
        summary: `${data.newsData.newsAnalysis.length} artículos analizados`,
        sentiment: data.newsData.sentiment.sentimentScore,
        articleCount: data.newsData.sentiment.articleCount,
        keyHeadlines: data.newsData.newsAnalysis
          .slice(0, 3)
          .map((article: any) => article.article.title),
        impactScore: data.newsData.sentiment.sentimentScore
      }
    }

    if (data.sentimentData) {
      components.marketSentiment = {
        overallSentiment: data.sentimentData.overallSentiment,
        sentimentScore: data.sentimentData.sentimentScore,
        marketCondition: data.sentimentData.marketCondition,
        keyFactors: data.sentimentData.keyFactors.slice(0, 3)
      }
    }

    if (data.earningsData) {
      components.earnings = {
        lastReport: {
          assessment: data.earningsData.analysis.overallAssessment,
          surprise: data.earningsData.earningsData.surprisePercentage,
          analysis: data.earningsData.analysis.epsAnalysis.description
        }
      }
    }

    if (data.trendsData) {
      components.trends = {
        shortTerm: {
          direction: data.trendsData.prediction.direction,
          confidence: data.trendsData.prediction.confidence
        },
        mediumTerm: {
          direction: data.trendsData.prediction.direction,
          confidence: data.trendsData.prediction.confidence
        },
        keyDrivers: data.trendsData.analysis.keyFactors
          .slice(0, 3)
          .map((factor: any) => factor.factor)
      }
    }

    return components
  }

  /**
   * Identifica riesgos principales
   */
  private identifyRisks(data: any): {
    risk: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframe: string
    mitigation?: string
  }[] {
    const risks = []

    // Riesgos de noticias negativas
    if (data.newsData && data.newsData.sentiment.sentimentScore < -20) {
      risks.push({
        risk: 'Cobertura mediática negativa',
        severity: 'MEDIUM' as const,
        timeframe: 'Corto plazo',
        mitigation: 'Monitorear noticias y comunicaciones corporativas'
      })
    }

    // Riesgos de sentiment del mercado
    if (data.sentimentData && data.sentimentData.sentimentScore < -30) {
      risks.push({
        risk: 'Sentiment del mercado pesimista',
        severity: 'HIGH' as const,
        timeframe: 'Mediano plazo',
        mitigation: 'Considerar hedge o reducir exposición'
      })
    }

    // Riesgos de earnings
    if (data.earningsData && data.earningsData.analysis.overallAssessment.includes('MISS')) {
      risks.push({
        risk: 'Deterioro en fundamentales',
        severity: 'HIGH' as const,
        timeframe: 'Mediano plazo',
        mitigation: 'Revisar tesis de inversión'
      })
    }

    // Riesgos técnicos
    if (data.trendsData && data.trendsData.prediction.direction === 'BEARISH') {
      risks.push({
        risk: 'Tendencia técnica bajista',
        severity: 'MEDIUM' as const,
        timeframe: 'Corto plazo',
        mitigation: 'Esperar confirmación de reversión'
      })
    }

    return risks.slice(0, 5)
  }

  /**
   * Identifica oportunidades
   */
  private identifyOpportunities(data: any): {
    opportunity: string
    potential: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframe: string
    requirements?: string
  }[] {
    const opportunities = []

    // Oportunidades de noticias positivas
    if (data.newsData && data.newsData.sentiment.sentimentScore > 20) {
      opportunities.push({
        opportunity: 'Momentum positivo en noticias',
        potential: 'MEDIUM' as const,
        timeframe: 'Corto plazo',
        requirements: 'Confirmación con volumen'
      })
    }

    // Oportunidades de sentiment
    if (data.sentimentData && data.sentimentData.sentimentScore > 30) {
      opportunities.push({
        opportunity: 'Sentiment del mercado optimista',
        potential: 'HIGH' as const,
        timeframe: 'Mediano plazo',
        requirements: 'Mantenimiento de condiciones macro'
      })
    }

    // Oportunidades de earnings
    if (data.earningsData && data.earningsData.analysis.overallAssessment.includes('BEAT')) {
      opportunities.push({
        opportunity: 'Fortaleza en fundamentales',
        potential: 'HIGH' as const,
        timeframe: 'Largo plazo',
        requirements: 'Sostenibilidad de resultados'
      })
    }

    // Oportunidades técnicas
    if (data.trendsData && data.trendsData.prediction.direction === 'BULLISH') {
      opportunities.push({
        opportunity: 'Tendencia técnica alcista',
        potential: 'MEDIUM' as const,
        timeframe: 'Corto plazo',
        requirements: 'Confirmación de breakout'
      })
    }

    return opportunities.slice(0, 5)
  }

  /**
   * Genera action items
   */
  /* eslint-disable-next-line max-lines-per-function */
  private generateActionItems(
    assessment: any,
    risks: any[],
    opportunities: any[]
  ): {
    action: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
    timeframe: string
    description: string
  }[] {
    const actions = []

    // Acciones basadas en recomendación
    if (['STRONG_BUY', 'BUY'].includes(assessment.recommendation)) {
      actions.push({
        action: 'Considerar incrementar posición',
        priority: 'HIGH' as const,
        timeframe: 'Inmediato',
        description: `Recomendación ${assessment.recommendation} con ${assessment.confidence}% confianza`
      })
    } else if (['STRONG_SELL', 'SELL'].includes(assessment.recommendation)) {
      actions.push({
        action: 'Evaluar reducción de posición',
        priority: 'HIGH' as const,
        timeframe: 'Inmediato',
        description: `Recomendación ${assessment.recommendation} con ${assessment.confidence}% confianza`
      })
    }

    // Acciones para riesgos altos
    risks.filter(risk => risk.severity === 'HIGH').forEach(risk => {
      actions.push({
        action: `Mitigar: ${risk.risk}`,
        priority: 'HIGH' as const,
        timeframe: risk.timeframe,
        description: risk.mitigation || 'Implementar estrategias de mitigación'
      })
    })

    // Acciones para oportunidades altas
    opportunities.filter(opp => opp.potential === 'HIGH').forEach(opp => {
      actions.push({
        action: `Aprovechar: ${opp.opportunity}`,
        priority: 'MEDIUM' as const,
        timeframe: opp.timeframe,
        description: opp.requirements || 'Evaluar condiciones para aprovechar'
      })
    })

    return actions.slice(0, 6)
  }

  /**
   * Genera insights adicionales con Claude
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async generateClaudeInsights(symbol: string, analysisData: any): Promise<{
    summary: string
    keyPoints: string[]
    marketContext: string
    strategicRecommendations: string[]
    watchlist: string[]
    confidence: number
  }> {
    const prompt = `
Analiza el siguiente análisis contextual completo para ${symbol}:

ASSESSMENT GENERAL:
- Recomendación: ${analysisData.overallAssessment.recommendation}
- Score: ${analysisData.overallAssessment.score}
- Confianza: ${analysisData.overallAssessment.confidence}%

COMPONENTES:
${JSON.stringify(analysisData.components, null, 2)}

RIESGOS IDENTIFICADOS:
${analysisData.risks.map((r: any) => `- ${r.risk} (${r.severity})`).join('\n')}

OPORTUNIDADES:
${analysisData.opportunities.map((o: any) => `- ${o.opportunity} (${o.potential})`).join('\n')}

Por favor proporciona insights adicionales:
1. RESUMEN: Síntesis ejecutiva en 2-3 oraciones
2. PUNTOS_CLAVE: 4-5 insights más importantes
3. CONTEXTO_MERCADO: Cómo se sitúa en el contexto actual
4. RECOMENDACIONES_ESTRATÉGICAS: 3-4 recomendaciones específicas
5. WATCHLIST: Qué métricas/eventos monitorear
6. CONFIANZA: Tu nivel de confianza en este análisis (0-100)

Considera tendencias macro, estacionalidad y eventos próximos.

Responde en formato JSON:
{
  "summary": "Síntesis ejecutiva...",
  "keyPoints": ["punto1", "punto2", "punto3", "punto4"],
  "marketContext": "Contexto del mercado...",
  "strategicRecommendations": ["rec1", "rec2", "rec3"],
  "watchlist": ["métrica1", "evento2", "indicador3"],
  "confidence": 85
}
`

    try {
      const response = await claudeAnalysisService.analyze({
        prompt,
        instrumentCode: symbol,
        context: `Insights contextuales para ${symbol}`
      }, {
        useCache: true,
        cacheTTLMinutes: 40,
        retryAttempts: 2
      })

      if (response.success && response.analysis) {
        const result = JSON.parse(response.analysis)
        return {
          summary: result.summary || 'Resumen no disponible',
          keyPoints: result.keyPoints || [],
          marketContext: result.marketContext || 'Contexto no disponible',
          strategicRecommendations: result.strategicRecommendations || [],
          watchlist: result.watchlist || [],
          confidence: result.confidence || 70
        }
      }

      return this.getDefaultClaudeInsights()
    } catch (error) {
      logger.warn('Claude insights generation failed', { symbol, error })
      return this.getDefaultClaudeInsights()
    }
  }

  /**
   * Insights por defecto cuando Claude falla
   */
  private getDefaultClaudeInsights(): any {
    return {
      summary: 'Análisis contextual completado con datos disponibles',
      keyPoints: [
        'Múltiples fuentes de datos analizadas',
        'Recomendación basada en factores cuantitativos',
        'Seguimiento continuo recomendado'
      ],
      marketContext: 'Análisis en contexto de condiciones actuales del mercado',
      strategicRecommendations: [
        'Revisar posición periódicamente',
        'Monitorear factores de riesgo',
        'Mantenerse informado de desarrollos'
      ],
      watchlist: [
        'Resultados de earnings',
        'Cambios en sentiment',
        'Noticias corporativas'
      ],
      confidence: 60
    }
  }

  /**
   * Calcula resumen del portafolio
   */
  private calculatePortfolioSummary(analyses: ComprehensiveAnalysisResult[]): {
    overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    totalScore: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    diversificationScore: number
  } {
    const avgScore = analyses.reduce((sum, a) => sum + a.overallAssessment.score, 0) / analyses.length
    const avgConfidence = analyses.reduce((sum, a) => sum + a.overallAssessment.confidence, 0) / analyses.length

    // Calcular salud general
    let overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    if (avgScore > 40 && avgConfidence > 80) overallHealth = 'EXCELLENT'
    else if (avgScore > 20 && avgConfidence > 70) overallHealth = 'GOOD'
    else if (avgScore > -20 && avgConfidence > 60) overallHealth = 'FAIR'
    else overallHealth = 'POOR'

    // Calcular nivel de riesgo
    const highRiskCount = analyses.filter(a => 
      a.risks.some(r => r.severity === 'HIGH')
    ).length
    const riskRatio = highRiskCount / analyses.length

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    if (riskRatio < 0.2) riskLevel = 'LOW'
    else if (riskRatio < 0.5) riskLevel = 'MEDIUM'
    else riskLevel = 'HIGH'

    // Simular score de diversificación
    const diversificationScore = Math.min(100, 60 + (analyses.length * 5))

    return {
      overallHealth,
      totalScore: Math.round(avgScore),
      riskLevel,
      diversificationScore
    }
  }

  /**
   * Identifica temas del mercado
   */
  private identifyMarketThemes(analyses: ComprehensiveAnalysisResult[]): {
    theme: string
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    affectedSymbols: string[]
  }[] {
    // Extraer factores comunes
    const factorCounts = new Map<string, { positive: string[], negative: string[], neutral: string[] }>()

    analyses.forEach(analysis => {
      analysis.overallAssessment.keyFactors.forEach(factor => {
        if (!factorCounts.has(factor)) {
          factorCounts.set(factor, { positive: [], negative: [], neutral: [] })
        }
        
        const impact = analysis.overallAssessment.score > 20 ? 'positive' : 
                      analysis.overallAssessment.score < -20 ? 'negative' : 'neutral'
        factorCounts.get(factor)![impact].push(analysis.symbol)
      })
    })

    return Array.from(factorCounts.entries())
      .filter(([, counts]) => {
        const total = counts.positive.length + counts.negative.length + counts.neutral.length
        return total >= 2 // Al menos 2 símbolos afectados
      })
      .slice(0, 5)
      .map(([theme, counts]) => {
        const maxCount = Math.max(counts.positive.length, counts.negative.length, counts.neutral.length)
        let impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
        let affectedSymbols: string[]

        if (maxCount === counts.positive.length) {
          impact = 'POSITIVE'
          affectedSymbols = counts.positive
        } else if (maxCount === counts.negative.length) {
          impact = 'NEGATIVE'
          affectedSymbols = counts.negative
        } else {
          impact = 'NEUTRAL'
          affectedSymbols = counts.neutral
        }

        return { theme, impact, affectedSymbols }
      })
  }

  /**
   * Genera recomendaciones del portafolio
   */
  private generatePortfolioRecommendations(analyses: ComprehensiveAnalysisResult[]): {
    type: 'BUY' | 'SELL' | 'HOLD' | 'ROTATE' | 'HEDGE'
    symbols: string[]
    reasoning: string
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  }[] {
    const recommendations = []

    // Agrupar por recomendación
    const grouped = analyses.reduce((acc, analysis) => {
      const rec = analysis.overallAssessment.recommendation
      if (!acc[rec]) acc[rec] = []
      acc[rec].push(analysis.symbol)
      return acc
    }, {} as Record<string, string[]>)

    // Generar recomendaciones
    if (grouped.STRONG_BUY?.length > 0) {
      recommendations.push({
        type: 'BUY' as const,
        symbols: grouped.STRONG_BUY,
        reasoning: 'Oportunidades de alta convicción identificadas',
        urgency: 'HIGH' as const
      })
    }

    if (grouped.STRONG_SELL?.length > 0) {
      recommendations.push({
        type: 'SELL' as const,
        symbols: grouped.STRONG_SELL,
        reasoning: 'Riesgos significativos identificados',
        urgency: 'HIGH' as const
      })
    }

    if (grouped.HOLD?.length > 3) {
      recommendations.push({
        type: 'ROTATE' as const,
        symbols: grouped.HOLD.slice(0, 2),
        reasoning: 'Considerar rotación hacia mejores oportunidades',
        urgency: 'MEDIUM' as const
      })
    }

    return recommendations.slice(0, 4)
  }

  /**
   * Convierte score a recomendación
   */
  private scoreToRecommendation(score: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
    if (score > 60) return 'STRONG_BUY'
    if (score > 25) return 'BUY'
    if (score > -25) return 'HOLD'
    if (score > -60) return 'SELL'
    return 'STRONG_SELL'
  }

  /**
   * Obtiene score de earnings
   */
  private getEarningsScore(assessment: string): number {
    const scores: Record<string, number> = {
      'STRONG_BEAT': 80,
      'BEAT': 50,
      'MIXED': 0,
      'MISS': -50,
      'STRONG_MISS': -80
    }
    return scores[assessment] || 0
  }

  /**
   * Obtiene score de tendencias
   */
  private getTrendsScore(prediction: any): number {
    let score = 0
    
    if (prediction.direction === 'BULLISH') {
      score = prediction.confidence * 0.8
    } else if (prediction.direction === 'BEARISH') {
      score = -prediction.confidence * 0.8
    }
    
    return Math.max(-100, Math.min(100, score))
  }

  /**
   * Construye prompt para reporte personalizado
   */
  private buildReportPrompt(
    symbol: string,
    reportType: string,
    analysis: ComprehensiveAnalysisResult,
    options: ContextualReportOptions
  ): string {
    return `
Genera un reporte ${reportType} para ${symbol} en formato ${options.format}:

DATOS DEL ANÁLISIS:
${JSON.stringify(analysis, null, 2)}

El reporte debe incluir:
1. TÍTULO apropiado
2. RESUMEN EJECUTIVO
3. SECCIONES específicas para ${reportType}
4. CONCLUSIÓN
5. DISCLAIMER

Responde en formato JSON:
{
  "title": "Título del reporte",
  "summary": "Resumen ejecutivo...",
  "sections": [
    {
      "title": "Sección 1",
      "content": "Contenido..."
    }
  ],
  "conclusion": "Conclusión...",
  "disclaimer": "Disclaimer..."
}
`
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats(): {
    cacheStats: any
    analysesToday: number
    avgExecutionTime: number
  } {
    return {
      cacheStats: cacheService.getStats(),
      analysesToday: 0, // En implementación real vendría de BD
      avgExecutionTime: 0 // En implementación real vendría de BD
    }
  }

  /**
   * Limpia cache del servicio
   */
  clearCache(): void {
    cacheService.clearByPrefix(this.CACHE_PREFIX)
    logger.info('Contextual analysis cache cleared')
  }
}

// Singleton instance
export const claudeContextualService = new ClaudeContextualService()