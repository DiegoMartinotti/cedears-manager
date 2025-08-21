import cron from 'node-cron'
import { technicalAnalysisService } from '../services/TechnicalAnalysisService'
import { logger } from '../utils/logger'

export class TechnicalAnalysisJob {
  private isRunning = false
  private lastRun: Date | null = null
  private successCount = 0
  private errorCount = 0

  constructor() {
    this.setupJobs()
  }

  private setupJobs() {
    // Job principal: cálculo diario a las 11:00 AM (horario de mercado)
    cron.schedule('0 11 * * 1-5', async () => {
      await this.runDailyAnalysis()
    }, {
      timezone: "America/Argentina/Buenos_Aires",
      name: "technical-analysis-daily"
    })

    // Job de limpieza: cada domingo a las 2:00 AM
    cron.schedule('0 2 * * 0', async () => {
      await this.runCleanup()
    }, {
      timezone: "America/Argentina/Buenos_Aires", 
      name: "technical-analysis-cleanup"
    })

    logger.info('Technical Analysis jobs scheduled:')
    logger.info('- Daily analysis: 11:00 AM weekdays')
    logger.info('- Cleanup: 2:00 AM Sundays')
  }

  /**
   * Ejecuta el análisis técnico diario
   */
  async runDailyAnalysis(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Technical analysis job already running, skipping...')
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    
    try {
      logger.info('Starting daily technical analysis...')
      
      const processedCount = await technicalAnalysisService.calculateAllActiveInstruments()
      
      const duration = Date.now() - startTime
      this.lastRun = new Date()
      this.successCount++

      logger.info(`Technical analysis completed successfully:`, {
        processedInstruments: processedCount,
        duration: `${duration}ms`,
        timestamp: this.lastRun.toISOString()
      })

      // Obtener estadísticas después del procesamiento
      const stats = await technicalAnalysisService.getServiceStats()
      logger.info('Technical indicators stats:', stats)

    } catch (error) {
      this.errorCount++
      logger.error('Technical analysis job failed:', error)
      
      // Reintentar en 30 minutos si falla
      setTimeout(async () => {
        logger.info('Retrying technical analysis after error...')
        await this.runDailyAnalysis()
      }, 30 * 60 * 1000)
      
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Ejecuta la limpieza de indicadores antiguos
   */
  async runCleanup(): Promise<void> {
    try {
      logger.info('Starting technical indicators cleanup...')
      
      const deletedCount = await technicalAnalysisService.cleanupOldIndicators(90)
      
      logger.info(`Technical indicators cleanup completed:`, {
        deletedIndicators: deletedCount,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Technical indicators cleanup failed:', error)
    }
  }

  /**
   * Ejecuta análisis manual (para testing o triggers externos)
   */
  async runManualAnalysis(symbol?: string): Promise<{ success: boolean; processedCount: number; error?: string }> {
    try {
      let processedCount = 0

      if (symbol) {
        // Análisis para un símbolo específico
        const indicators = await technicalAnalysisService.calculateIndicators(symbol)
        if (indicators) {
          await technicalAnalysisService.saveIndicators(indicators)
          processedCount = 1
        }
        logger.info(`Manual technical analysis completed for ${symbol}`)
      } else {
        // Análisis para todos los instrumentos
        processedCount = await technicalAnalysisService.calculateAllActiveInstruments()
        logger.info(`Manual technical analysis completed for ${processedCount} instruments`)
      }

      return { success: true, processedCount }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Manual technical analysis failed:', error)
      return { success: false, processedCount: 0, error: errorMessage }
    }
  }

  /**
   * Obtiene el estado del job
   */
  getJobStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      successCount: this.successCount,
      errorCount: this.errorCount,
      nextRun: this.getNextRunTime(),
      uptime: process.uptime()
    }
  }

  /**
   * Calcula el próximo tiempo de ejecución
   */
  private getNextRunTime(): Date | null {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(11, 0, 0, 0)

    // Si es fin de semana, pasar al lunes
    if (tomorrow.getDay() === 6) { // Sábado
      tomorrow.setDate(tomorrow.getDate() + 2)
    } else if (tomorrow.getDay() === 0) { // Domingo
      tomorrow.setDate(tomorrow.getDate() + 1)
    }

    return tomorrow
  }

  /**
   * Detiene todos los jobs (para shutdown graceful)
   */
  async stop(): Promise<void> {
    try {
      // Esperar a que termine el job actual si está corriendo
      while (this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Destruir todos los cron jobs
      cron.getTasks().forEach((task, name) => {
        if (name?.includes('technical-analysis')) {
          task.destroy()
        }
      })

      logger.info('Technical analysis jobs stopped')
    } catch (error) {
      logger.error('Error stopping technical analysis jobs:', error)
    }
  }

  /**
   * Fuerza la ejecución inmediata (para testing)
   */
  async forceRun(): Promise<void> {
    logger.info('Forcing technical analysis run...')
    await this.runDailyAnalysis()
  }
}

// Singleton instance
export const technicalAnalysisJob = new TechnicalAnalysisJob()

// Exportar función para inicializar en el servidor principal
export function initializeTechnicalAnalysisJob(): TechnicalAnalysisJob {
  return technicalAnalysisJob
}