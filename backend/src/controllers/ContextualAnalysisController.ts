import { Request, Response } from 'express'
import { claudeContextualService } from '../services/ClaudeContextualService.js'
import { newsAnalysisService } from '../services/NewsAnalysisService.js'
import { marketSentimentService } from '../services/MarketSentimentService.js'
import { earningsAnalysisService } from '../services/EarningsAnalysisService.js'
import { trendPredictionService } from '../services/TrendPredictionService.js'
import { validateSymbolParam } from '../utils/validationHelpers.js'
import { buildEarningsSummary, calculateNewsStats } from '../utils/responseBuilders.js'
import { createLogger } from '../utils/logger.js'
import { z } from 'zod'

const logger = createLogger('contextual-analysis-controller')

// Esquemas de validación
const SymbolAnalysisSchema = z.object({
  symbol: z.string().min(1).max(10),
  analysisType: z.enum(['COMPREHENSIVE', 'NEWS', 'SENTIMENT', 'EARNINGS', 'TRENDS', 'CUSTOM']),
  timeframe: z.enum(['1D', '1W', '1M', '3M', '6M', '1Y']).optional(),
  options: z.object({
    includeNews: z.boolean().optional(),
    includeSentiment: z.boolean().optional(),
    includeEarnings: z.boolean().optional(),
    includeTrends: z.boolean().optional(),
    includeRecommendations: z.boolean().optional(),
    customPrompt: z.string().optional(),
    useCache: z.boolean().optional(),
    cacheTTLMinutes: z.number().min(1).max(1440).optional()
  }).optional()
})

const PortfolioAnalysisSchema = z.object({
  symbols: z.array(z.string()).min(1).max(50),
  options: z.object({
    useCache: z.boolean().optional(),
    analysisDepth: z.enum(['BASIC', 'DETAILED']).optional()
  }).optional()
})

const CustomReportSchema = z.object({
  symbol: z.string().min(1).max(10),
  reportType: z.enum(['INVESTMENT_THESIS', 'RISK_ASSESSMENT', 'OPPORTUNITY_ANALYSIS', 'MARKET_OUTLOOK']),
  options: z.object({
    format: z.enum(['SUMMARY', 'DETAILED', 'EXECUTIVE']),
    includeCharts: z.boolean().optional(),
    includeTechnicals: z.boolean().optional(),
    customSections: z.array(z.string()).optional()
  }).optional()
})

export class ContextualAnalysisController {
  /**
   * POST /api/contextual/analyze
   * Realiza análisis contextual completo de un símbolo
   */
  static async analyzeSymbol(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, analysisType, timeframe, options } = SymbolAnalysisSchema.parse(req.body)

      logger.info('Symbol contextual analysis request', {
        symbol, analysisType, timeframe, includeOptions: Object.keys(options || {})
      })

      const result = await claudeContextualService.analyzeSymbol({
        symbol, analysisType, timeframe, options
      })

      logger.info('Symbol contextual analysis completed', {
        symbol,
        recommendation: result.overallAssessment.recommendation,
        confidence: result.overallAssessment.confidence
      })

      res.json({ success: true, data: result })

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.issues
        })
        return
      }

      logger.error('Symbol contextual analysis failed', {
        error: (error as Error).message,
        symbol: req.body?.symbol
      })
      res.status(500).json({
        success: false,
        error: 'Contextual analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/contextual/portfolio
   * Analiza múltiples símbolos de un portafolio
   */
  static async analyzePortfolio(req: Request, res: Response): Promise<void> {
    try {
      const validation = PortfolioAnalysisSchema.safeParse(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        })
        return
      }

      const { symbols, options } = validation.data

      logger.info('Portfolio contextual analysis request', {
        symbolsCount: symbols.length,
        symbols: symbols.slice(0, 5), // Log solo primeros 5 símbolos
        analysisDepth: options?.analysisDepth
      })

      const result = await claudeContextualService.analyzePortfolio(symbols, options)

      logger.info('Portfolio contextual analysis completed', {
        symbolsCount: symbols.length,
        overallHealth: result.portfolioSummary.overallHealth,
        topPerformersCount: result.topPerformers.length,
        underperformersCount: result.underperformers.length
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('Portfolio contextual analysis failed', { 
        error: (error as Error).message,
        symbolsCount: req.body?.symbols?.length 
      })
      res.status(500).json({
        success: false,
        error: 'Portfolio analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/contextual/report
   * Genera reporte personalizado
   */
  static async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = CustomReportSchema.safeParse(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues
        })
        return
      }

      const { symbol, reportType, options } = validation.data

      logger.info('Custom report generation request', {
        symbol,
        reportType,
        format: options?.format
      })

      const result = await claudeContextualService.generateCustomReport(
        symbol,
        reportType,
        options || { format: 'DETAILED' }
      )

      logger.info('Custom report generated', {
        symbol,
        reportType,
        sectionsCount: result.sections.length
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('Custom report generation failed', { 
        error: (error as Error).message,
        symbol: req.body?.symbol,
        reportType: req.body?.reportType
      })
      res.status(500).json({
        success: false,
        error: 'Report generation failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/contextual/news/:symbol
   * Obtiene análisis de noticias para un símbolo
   */
  static async getNewsAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params as { symbol: string }
      const { 
        days = 7, 
        pageSize = 20, 
        minRelevance = 30,
        useCache = true 
      } = req.query

      if (!validateSymbolParam(symbol, res)) return

      logger.info('News analysis request', { symbol, days, pageSize })

      const newsAnalysis = await newsAnalysisService.searchNews(symbol, {
        from: new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000),
        pageSize: Math.min(Number(pageSize), 50),
        sortBy: 'publishedAt'
      }, {
        useCache: Boolean(useCache),
        minRelevanceScore: Number(minRelevance)
      })

      const newsSentiment = await newsAnalysisService.getNewsSentiment(symbol)

      res.json({
        success: true,
        data: calculateNewsStats(newsAnalysis, newsSentiment)
      })

    } catch (error) {
      logger.error('News analysis failed', { 
        error: (error as Error).message,
        symbol: req.params.symbol 
      })
      res.status(500).json({
        success: false,
        error: 'News analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/contextual/sentiment
   * Obtiene sentiment general del mercado
   */
  static async getMarketSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { 
        includeNews = true, 
        includeSocial = false,
        useCache = true 
      } = req.query

      logger.info('Market sentiment request', { includeNews, includeSocial })

      const sentiment = await marketSentimentService.getMarketSentiment({
        useCache: Boolean(useCache),
        includeNews: Boolean(includeNews),
        includeSocial: Boolean(includeSocial),
        analyzeWithClaude: true
      })

      const sentimentTrend = await marketSentimentService.getSentimentTrend('1W')
      const sectorSentiment = await marketSentimentService.getSectorSentiment()

      res.json({
        success: true,
        data: {
          current: sentiment,
          trend: sentimentTrend,
          sectors: sectorSentiment.slice(0, 10), // Top 10 sectores
          summary: {
            direction: sentiment.overallSentiment,
            strength: Math.abs(sentiment.sentimentScore),
            confidence: sentiment.confidence
          }
        }
      })

    } catch (error) {
      logger.error('Market sentiment analysis failed', { error: (error as Error).message })
      res.status(500).json({
        success: false,
        error: 'Market sentiment analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/contextual/earnings/:symbol
   * Obtiene análisis de earnings para un símbolo
   */
  static async getEarningsAnalysis(req: Request, res: Response): Promise<void> {
    try {
        const { symbol } = req.params as { symbol: string }
      const { 
        includeHistorical = true,
        includeCompetitors = false,
        analyzeWithClaude = true,
        useCache = true 
      } = req.query

      if (!validateSymbolParam(symbol, res)) return

      logger.info('Earnings analysis request', { symbol, includeHistorical, analyzeWithClaude })

      const earningsAnalysis = await earningsAnalysisService.analyzeEarnings(symbol, {
        useCache: Boolean(useCache),
        includeHistorical: Boolean(includeHistorical),
        includeCompetitors: Boolean(includeCompetitors),
        analyzeWithClaude: Boolean(analyzeWithClaude)
      })

      const historicalEarnings = includeHistorical 
        ? await earningsAnalysisService.getHistoricalEarnings(symbol, 8)
        : []

      res.json({
        success: true,
        data: buildEarningsSummary(earningsAnalysis, historicalEarnings)
      })

    } catch (error) {
      logger.error('Earnings analysis failed', { 
        error: (error as Error).message,
        symbol: req.params.symbol 
      })
      res.status(500).json({
        success: false,
        error: 'Earnings analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/contextual/trends/:symbol
   * Obtiene predicción de tendencias para un símbolo
   */
    /* eslint-disable-next-line max-lines-per-function */
    static async getTrendPrediction(req: Request, res: Response): Promise<void> {
    try {
        const { symbol } = req.params as { symbol: string }
      const { 
        timeframe = '1M',
        includeScenarios = true,
        analyzeWithClaude = true,
        useCache = true 
      } = req.query

      if (!symbol || symbol.length > 10) {
        res.status(400).json({
          success: false,
          error: 'Invalid symbol parameter'
        })
        return
      }

      if (!['1W', '1M', '3M', '6M', '1Y'].includes(timeframe as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid timeframe. Must be one of: 1W, 1M, 3M, 6M, 1Y'
        })
        return
      }

      logger.info('Trend prediction request', { symbol, timeframe, analyzeWithClaude })

      const trendPrediction = await trendPredictionService.predictTrend(
        symbol,
        timeframe as any,
        {
          useCache: Boolean(useCache),
          includeScenarios: Boolean(includeScenarios),
          analyzeWithClaude: Boolean(analyzeWithClaude),
          includeNews: true,
          includeSentiment: true,
          includeEarnings: true
        }
      )

      res.json({
        success: true,
        data: {
          prediction: trendPrediction,
          summary: {
            direction: trendPrediction.prediction.direction,
            confidence: trendPrediction.prediction.confidence,
            strength: trendPrediction.prediction.strength,
            timeframe: trendPrediction.timeframe
          }
        }
      })

    } catch (error) {
      logger.error('Trend prediction failed', { 
        error: (error as Error).message,
        symbol: req.params.symbol,
        timeframe: req.query.timeframe 
      })
      res.status(500).json({
        success: false,
        error: 'Trend prediction failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/contextual/earnings/calendar
   * Obtiene calendario de próximos earnings
   */
  static async getEarningsCalendar(req: Request, res: Response): Promise<void> {
    try {
      const { daysAhead = 7 } = req.query

      if (Number(daysAhead) < 1 || Number(daysAhead) > 30) {
        res.status(400).json({
          success: false,
          error: 'daysAhead must be between 1 and 30'
        })
        return
      }

      logger.info('Earnings calendar request', { daysAhead })

      const calendar = await earningsAnalysisService.getEarningsCalendar(Number(daysAhead))

      res.json({
        success: true,
        data: {
          calendar,
          summary: {
            totalCompanies: calendar.length,
            highImportance: calendar.filter(e => e.importance === 'HIGH').length,
            dateRange: `Next ${daysAhead} days`
          }
        }
      })

    } catch (error) {
      logger.error('Earnings calendar request failed', { error: (error as Error).message })
      res.status(500).json({
        success: false,
        error: 'Earnings calendar request failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/contextual/portfolio/trends
   * Analiza tendencias para múltiples símbolos
   */
    /* eslint-disable-next-line max-lines-per-function */
    static async analyzePortfolioTrends(req: Request, res: Response): Promise<void> {
    try {
      const { symbols, timeframe = '1M' } = req.body

      if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > 20) {
        res.status(400).json({
          success: false,
          error: 'symbols must be an array with 1-20 elements'
        })
        return
      }

      if (!['1W', '1M', '3M', '6M', '1Y'].includes(timeframe)) {
        res.status(400).json({
          success: false,
          error: 'Invalid timeframe. Must be one of: 1W, 1M, 3M, 6M, 1Y'
        })
        return
      }

      logger.info('Portfolio trends analysis request', { 
        symbolsCount: symbols.length,
        timeframe 
      })

      const portfolioTrends = await trendPredictionService.analyzePortfolioTrends(symbols, {
        useCache: true,
        analyzeWithClaude: false // Desabilitar para análisis masivo
      })

      res.json({
        success: true,
        data: {
          analysis: portfolioTrends,
          summary: {
            overallTrend: portfolioTrends.overallTrend,
            confidence: portfolioTrends.confidence,
            bullishCount: portfolioTrends.bullishSymbols.length,
            bearishCount: portfolioTrends.bearishSymbols.length,
            neutralCount: portfolioTrends.neutralSymbols.length
          }
        }
      })

    } catch (error) {
      logger.error('Portfolio trends analysis failed', { 
        error: (error as Error).message,
        symbolsCount: req.body?.symbols?.length 
      })
      res.status(500).json({
        success: false,
        error: 'Portfolio trends analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/contextual/status
   * Obtiene estado de todos los servicios contextuales
   */
  static async getServicesStatus(req: Request, res: Response): Promise<void> {
    try {
      const [
        contextualStats,
        newsStats,
        sentimentStats,
        earningsStats,
        trendsStats
      ] = await Promise.allSettled([
        Promise.resolve(claudeContextualService.getStats()),
        Promise.resolve(newsAnalysisService.getStats()),
        Promise.resolve(marketSentimentService.getStats()),
        Promise.resolve(earningsAnalysisService.getStats()),
        Promise.resolve(trendPredictionService.getStats())
      ])

      const extractValue = (result: PromiseSettledResult<any>) => 
        result.status === 'fulfilled' ? result.value : { error: 'Service unavailable' }

      res.json({
        success: true,
        data: {
          contextual: extractValue(contextualStats),
          news: extractValue(newsStats),
          sentiment: extractValue(sentimentStats),
          earnings: extractValue(earningsStats),
          trends: extractValue(trendsStats),
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Services status request failed', { error: (error as Error).message })
      res.status(500).json({
        success: false,
        error: 'Services status request failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/contextual/cache/clear
   * Limpia cache de todos los servicios contextuales
   */
    /* eslint-disable-next-line max-lines-per-function */
    static async clearCache(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.body

      logger.info('Cache clear request', { service })

      if (service) {
        // Limpiar cache de servicio específico
        switch (service) {
          case 'contextual':
            claudeContextualService.clearCache()
            break
          case 'news':
            newsAnalysisService.clearCache()
            break
          case 'sentiment':
            marketSentimentService.clearCache()
            break
          case 'earnings':
            earningsAnalysisService.clearCache()
            break
          case 'trends':
            trendPredictionService.clearCache()
            break
          default:
            res.status(400).json({
              success: false,
              error: 'Invalid service name'
            })
            return
        }
      } else {
        // Limpiar cache de todos los servicios
        claudeContextualService.clearCache()
        newsAnalysisService.clearCache()
        marketSentimentService.clearCache()
        earningsAnalysisService.clearCache()
        trendPredictionService.clearCache()
      }

      res.json({
        success: true,
        message: `Cache cleared for ${service || 'all services'}`,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Cache clear failed', { error: (error as Error).message })
      res.status(500).json({
        success: false,
        error: 'Cache clear failed',
        message: (error as Error).message
      })
    }
  }
}