import cron from 'node-cron'
import { claudeContextualService } from '../services/ClaudeContextualService.js'
import { newsAnalysisService } from '../services/NewsAnalysisService.js'
import { marketSentimentService } from '../services/MarketSentimentService.js'
import { earningsAnalysisService } from '../services/EarningsAnalysisService.js'
import { Instrument } from '../models/Instrument.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('contextual-analysis-job')

export class ContextualAnalysisJob {
  private isRunning = false
  private lastRun: Date | null = null
  
  constructor() {
    logger.info('ContextualAnalysisJob initialized')
  }

  /**
   * Inicia todos los jobs de análisis contextual
   */
  start(): void {
    logger.info('Starting contextual analysis jobs...')

    // Job diario para análisis de noticias (8:00 AM)
    cron.schedule('0 8 * * *', () => {
      this.runDailyNewsAnalysis()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Job cada 2 horas para actualización de sentiment (horario de mercado)
    cron.schedule('0 */2 * * *', () => {
      this.runSentimentUpdate()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Job semanal para análisis completo del portafolio (Lunes 7:00 AM)
    cron.schedule('0 7 * * 1', () => {
      this.runWeeklyPortfolioAnalysis()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Job mensual para limpieza de datos y optimización (primer día del mes, 6:00 AM)
    cron.schedule('0 6 1 * *', () => {
      this.runMonthlyMaintenance()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Job para análisis de earnings cuando hay reportes próximos (todos los días 18:00)
    cron.schedule('0 18 * * *', () => {
      this.runEarningsMonitoring()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    logger.info('All contextual analysis jobs scheduled successfully')
  }

  /**
   * Job diario de análisis de noticias
   */
  // eslint-disable-next-line max-lines-per-function
  private async runDailyNewsAnalysis(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Daily news analysis job already running, skipping')
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      logger.info('Starting daily news analysis job')

      // Obtener lista de instrumentos activos
      const instrumentModel = new Instrument()
      const instruments = await instrumentModel.getActive()
      
      if (instruments.length === 0) {
        logger.warn('No active instruments found for news analysis')
        return
      }

      // Limitar a primeros 20 instrumentos para evitar rate limits
      const topInstruments = instruments.slice(0, 20)
      logger.info('Analyzing news for top instruments', { count: topInstruments.length })

      let analysisCount = 0
      let errorCount = 0

      // Procesar en lotes para evitar sobrecarga
      const batchSize = 5
      for (let i = 0; i < topInstruments.length; i += batchSize) {
        const batch = topInstruments.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (instrument) => {
          try {
            await newsAnalysisService.searchNews(instrument.ticker, {
              from: new Date(Date.now() - 24 * 60 * 60 * 1000), // últimas 24 horas
              pageSize: 10,
              sortBy: 'publishedAt'
            }, {
              useCache: false, // Forzar refresh en job automatizado
              analyzeWithClaude: true,
              minRelevanceScore: 40
            })
            
            analysisCount++
            logger.debug('News analysis completed', { symbol: instrument.ticker })
          } catch (error) {
            errorCount++
            logger.warn('News analysis failed for symbol', { 
              symbol: instrument.ticker,
              error: (error as Error).message 
            })
          }
        })

        await Promise.allSettled(batchPromises)
        
        // Pausa entre lotes para rate limiting
        if (i + batchSize < topInstruments.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      const executionTime = Date.now() - startTime
      this.lastRun = new Date()

      logger.info('Daily news analysis job completed', {
        totalSymbols: topInstruments.length,
        successfulAnalyses: analysisCount,
        errors: errorCount,
        executionTime
      })

    } catch (error) {
      logger.error('Daily news analysis job failed', { error })
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Job de actualización de sentiment del mercado
   */
  private async runSentimentUpdate(): Promise<void> {
    try {
      logger.info('Starting market sentiment update')

      // Actualizar sentiment general del mercado
      await marketSentimentService.getMarketSentiment({
        useCache: false, // Forzar refresh
        includeNews: true,
        includeSocial: false,
        analyzeWithClaude: true
      })

      // Actualizar sentiment por sectores
      await marketSentimentService.getSectorSentiment()

      logger.info('Market sentiment update completed')

    } catch (error) {
      logger.error('Market sentiment update failed', { error })
    }
  }

  /**
   * Job semanal de análisis completo del portafolio
   */
  private async runWeeklyPortfolioAnalysis(): Promise<void> {
    try {
      logger.info('Starting weekly portfolio analysis')

      // Obtener instrumentos activos
      const instrumentModel = new Instrument()
      const instruments = await instrumentModel.getActive()
      
      if (instruments.length === 0) {
        logger.warn('No active instruments found for portfolio analysis')
        return
      }

      const symbols = instruments.map(i => i.ticker).slice(0, 15) // Limitar a 15 símbolos

      // Ejecutar análisis completo del portafolio
      const portfolioAnalysis = await claudeContextualService.analyzePortfolio(symbols, {
        useCache: false,
        analysisDepth: 'DETAILED'
      })

      logger.info('Weekly portfolio analysis completed', {
        symbolsAnalyzed: symbols.length,
        overallHealth: portfolioAnalysis.portfolioSummary.overallHealth,
        bullishCount: portfolioAnalysis.bullishSymbols.length,
        bearishCount: portfolioAnalysis.bearishSymbols.length
      })

      // TODO: Enviar resumen por email o notificación
      // await this.sendWeeklyReport(portfolioAnalysis)

    } catch (error) {
      logger.error('Weekly portfolio analysis failed', { error })
    }
  }

  /**
   * Job mensual de mantenimiento
   */
  private async runMonthlyMaintenance(): Promise<void> {
    try {
      logger.info('Starting monthly maintenance tasks')

      // Limpiar cache de todos los servicios
      claudeContextualService.clearCache()
      newsAnalysisService.clearCache()
      marketSentimentService.clearCache()
      earningsAnalysisService.clearCache()

      logger.info('Cache cleared for all contextual services')

      // TODO: Limpiar datos antiguos de base de datos
      // TODO: Generar reporte mensual de performance
      // TODO: Optimizar índices de base de datos

      logger.info('Monthly maintenance completed')

    } catch (error) {
      logger.error('Monthly maintenance failed', { error })
    }
  }

  /**
   * Job de monitoreo de earnings
   */
  private async runEarningsMonitoring(): Promise<void> {
    try {
      logger.info('Starting earnings monitoring')

      // Obtener calendario de earnings próximos
      const calendar = await earningsAnalysisService.getEarningsCalendar(7)
      
      if (calendar.length === 0) {
        logger.info('No earnings reports in the next 7 days')
        return
      }

      logger.info('Found upcoming earnings reports', { count: calendar.length })

      // Analizar earnings para cada empresa con reporte próximo
      let analysisCount = 0
      for (const earningsEvent of calendar) {
        try {
          await earningsAnalysisService.analyzeEarnings(earningsEvent.symbol, {
            useCache: false,
            includeHistorical: true,
            analyzeWithClaude: true
          })
          
          analysisCount++
          logger.debug('Earnings analysis completed', { symbol: earningsEvent.symbol })
          
          // Pausa entre análisis
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          logger.warn('Earnings analysis failed', { 
            symbol: earningsEvent.symbol,
            error: (error as Error).message 
          })
        }
      }

      logger.info('Earnings monitoring completed', { 
        totalReports: calendar.length,
        successfulAnalyses: analysisCount 
      })

    } catch (error) {
      logger.error('Earnings monitoring failed', { error })
    }
  }

  /**
   * Análisis de emergencia para eventos específicos
   */
  async runEmergencyAnalysis(symbols: string[], reason: string): Promise<void> {
    if (this.isRunning) {
      logger.warn('Emergency analysis requested but job already running', { reason })
      return
    }

    this.isRunning = true

    try {
      logger.info('Starting emergency analysis', { symbols, reason })

      const analyses = await Promise.allSettled(
        symbols.map(symbol => 
          claudeContextualService.analyzeSymbol({
            symbol,
            analysisType: 'COMPREHENSIVE',
            options: {
              useCache: false,
              analyzeWithClaude: true,
              includeNews: true,
              includeSentiment: true,
              includeEarnings: true,
              includeTrends: true
            }
          })
        )
      )

      const successful = analyses.filter(result => result.status === 'fulfilled').length
      
      logger.info('Emergency analysis completed', { 
        symbols,
        reason,
        successful,
        total: symbols.length 
      })

    } catch (error) {
      logger.error('Emergency analysis failed', { symbols, reason, error })
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Obtiene estadísticas del job
   */
  getStats(): {
    isRunning: boolean
    lastRun: Date | null
    uptime: number
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      uptime: this.lastRun ? Date.now() - this.lastRun.getTime() : 0
    }
  }

  /**
   * Verifica si el mercado está abierto (horario argentino)
   */
  private isMarketOpen(): boolean {
    const now = new Date()
    const argTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"}))
    
    const hour = argTime.getHours()
    const day = argTime.getDay()
    
    // Lunes a Viernes, 11:00 AM a 18:00 PM (horario argentino = NYSE horario)
    return day >= 1 && day <= 5 && hour >= 11 && hour <= 18
  }

  /**
   * Para todos los jobs (para testing o shutdown)
   */
  stop(): void {
    logger.info('Stopping contextual analysis jobs...')
    // Los jobs de cron se detienen automáticamente cuando el proceso termina
  }
}

// Singleton instance
export const contextualAnalysisJob = new ContextualAnalysisJob()