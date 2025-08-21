import cron from 'node-cron'
import { opportunityService } from '../services/OpportunityService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('OpportunityScannerJob')

export class OpportunityScannerJob {
  private isRunning = false
  private lastRun: Date | null = null
  private successCount = 0
  private errorCount = 0
  private lastScanResults: {
    opportunitiesFound: number
    avgScore: number
    topScore: number
    processingTime: number
  } | null = null

  constructor() {
    this.setupJobs()
  }

  private setupJobs() {
    // Job principal: scanner diario a las 10:30 AM (horario de mercado)
    cron.schedule('30 10 * * 1-5', async () => {
      await this.runDailyOpportunityScan()
    }, {
      timezone: "America/Argentina/Buenos_Aires",
      name: "opportunity-scanner-daily"
    })

    // Job de limpieza: cada día a las 6:00 AM (antes del mercado)
    cron.schedule('0 6 * * 1-5', async () => {
      await this.runCleanup()
    }, {
      timezone: "America/Argentina/Buenos_Aires", 
      name: "opportunity-scanner-cleanup"
    })

    // Job de fin de semana: domingo a las 9:00 AM para preparar la semana
    cron.schedule('0 9 * * 0', async () => {
      await this.runWeekendPreparation()
    }, {
      timezone: "America/Argentina/Buenos_Aires",
      name: "opportunity-scanner-weekend"
    })

    logger.info('Opportunity Scanner jobs scheduled:')
    logger.info('- Daily scan: 10:30 AM weekdays')
    logger.info('- Daily cleanup: 6:00 AM weekdays') 
    logger.info('- Weekend preparation: 9:00 AM Sundays')
  }

  /**
   * Ejecuta el scan diario de oportunidades
   */
  async runDailyOpportunityScan(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Opportunity scanner job already running, skipping...')
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    
    try {
      logger.info('Starting daily opportunity scan...')
      
      // Limpiar oportunidades expiradas antes del scan
      await opportunityService.cleanupExpiredOpportunities()
      
      // Configuración para el scan diario
      const scanConfig = {
        min_score_threshold: 60,
        max_opportunities_per_day: 20,
        rsi_oversold_threshold: 35,
        distance_from_low_threshold: 20,
        volume_spike_threshold: 1.5,
        exclude_penny_stocks: true,
        min_market_cap: 100000000,
        require_esg_compliance: false, // Permitir tanto ESG como no-ESG
        require_vegan_friendly: false
      }

      // Ejecutar scan
      const opportunities = await opportunityService.scanForOpportunities(scanConfig)
      
      const duration = Date.now() - startTime
      this.lastRun = new Date()
      this.successCount++

      // Calcular estadísticas
      const avgScore = opportunities.length > 0 
        ? opportunities.reduce((sum, opp) => sum + opp.composite_score, 0) / opportunities.length
        : 0
      
      const topScore = opportunities.length > 0 
        ? Math.max(...opportunities.map(opp => opp.composite_score))
        : 0

      this.lastScanResults = {
        opportunitiesFound: opportunities.length,
        avgScore: Math.round(avgScore * 100) / 100,
        topScore,
        processingTime: duration
      }

      logger.info(`Daily opportunity scan completed successfully:`, {
        opportunitiesFound: opportunities.length,
        avgScore: this.lastScanResults.avgScore,
        topScore: this.lastScanResults.topScore,
        processingTime: `${duration}ms`,
        timestamp: this.lastRun.toISOString()
      })

      // Log de las mejores oportunidades
      if (opportunities.length > 0) {
        const topOpportunities = opportunities.slice(0, 5)
        logger.info('Top 5 opportunities detected:', 
          topOpportunities.map(opp => ({
            symbol: opp.symbol,
            score: opp.composite_score,
            type: opp.opportunity_type,
            upside: `${opp.expected_return.upside_percentage}%`
          }))
        )
      }

      // Obtener estadísticas generales después del scan
      const stats = await opportunityService.getOpportunityStats()
      logger.info('Opportunity stats after scan:', stats)

    } catch (error) {
      this.errorCount++
      logger.error('Daily opportunity scan failed:', error)
      
      // Reintentar en 30 minutos si falla durante horario de mercado
      const now = new Date()
      const hour = now.getHours()
      
      if (hour >= 10 && hour <= 16) { // Horario de mercado
        setTimeout(async () => {
          logger.info('Retrying opportunity scan after error...')
          await this.runDailyOpportunityScan()
        }, 30 * 60 * 1000) // 30 minutos
      }
      
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Ejecuta la limpieza de oportunidades expiradas
   */
  async runCleanup(): Promise<void> {
    try {
      logger.info('Starting opportunity cleanup...')
      
      const cleanedCount = await opportunityService.cleanupExpiredOpportunities()
      
      logger.info(`Opportunity cleanup completed:`, {
        cleanedOpportunities: cleanedCount,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      logger.error('Opportunity cleanup failed:', error)
    }
  }

  /**
   * Preparación de fin de semana (análisis profundo)
   */
  async runWeekendPreparation(): Promise<void> {
    try {
      logger.info('Starting weekend opportunity preparation...')
      
      // Configuración más exhaustiva para fin de semana
      const weekendConfig = {
        min_score_threshold: 55, // Umbral más bajo para detectar más oportunidades
        max_opportunities_per_day: 50, // Más oportunidades
        rsi_oversold_threshold: 40, // Más permisivo
        distance_from_low_threshold: 25,
        volume_spike_threshold: 1.3,
        exclude_penny_stocks: true,
        min_market_cap: 50000000, // Menor market cap
        require_esg_compliance: false,
        require_vegan_friendly: false
      }

      // Ejecutar scan completo
      const opportunities = await opportunityService.scanForOpportunities(weekendConfig)
      
      logger.info(`Weekend preparation completed:`, {
        opportunitiesFound: opportunities.length,
        avgScore: opportunities.length > 0 
          ? opportunities.reduce((sum, opp) => sum + opp.composite_score, 0) / opportunities.length 
          : 0,
        timestamp: new Date().toISOString()
      })

      // Limpiar datos antiguos
      await opportunityService.cleanupExpiredOpportunities()

    } catch (error) {
      logger.error('Weekend preparation failed:', error)
    }
  }

  /**
   * Ejecuta scan manual (para testing o triggers externos)
   */
  async runManualScan(config?: any): Promise<{ 
    success: boolean
    opportunitiesFound: number
    avgScore: number
    processingTime: number
    error?: string 
  }> {
    try {
      const startTime = Date.now()
      
      logger.info('Starting manual opportunity scan...', { config })
      
      const opportunities = await opportunityService.scanForOpportunities(config)
      const processingTime = Date.now() - startTime
      
      const avgScore = opportunities.length > 0 
        ? opportunities.reduce((sum, opp) => sum + opp.composite_score, 0) / opportunities.length
        : 0

      logger.info(`Manual opportunity scan completed:`, {
        opportunitiesFound: opportunities.length,
        avgScore: Math.round(avgScore * 100) / 100,
        processingTime: `${processingTime}ms`
      })

      return { 
        success: true, 
        opportunitiesFound: opportunities.length,
        avgScore: Math.round(avgScore * 100) / 100,
        processingTime
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Manual opportunity scan failed:', error)
      return { 
        success: false, 
        opportunitiesFound: 0,
        avgScore: 0,
        processingTime: 0,
        error: errorMessage 
      }
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
      lastScanResults: this.lastScanResults,
      nextRun: this.getNextRunTime(),
      uptime: process.uptime(),
      schedules: {
        dailyScan: '10:30 AM weekdays',
        cleanup: '6:00 AM weekdays',
        weekendPrep: '9:00 AM Sundays'
      }
    }
  }

  /**
   * Calcula el próximo tiempo de ejecución
   */
  private getNextRunTime(): Date | null {
    const now = new Date()
    const today = new Date(now)
    
    // Próximo scan a las 10:30 AM
    today.setHours(10, 30, 0, 0)
    
    // Si ya pasó la hora de hoy, programar para mañana
    if (now >= today) {
      today.setDate(today.getDate() + 1)
    }
    
    // Si cae en fin de semana, mover al lunes
    if (today.getDay() === 6) { // Sábado
      today.setDate(today.getDate() + 2)
    } else if (today.getDay() === 0) { // Domingo
      today.setDate(today.getDate() + 1)
    }

    return today
  }

  /**
   * Obtiene métricas de performance del scanner
   */
  getPerformanceMetrics() {
    return {
      totalScans: this.successCount,
      totalErrors: this.errorCount,
      successRate: this.successCount + this.errorCount > 0 
        ? (this.successCount / (this.successCount + this.errorCount)) * 100 
        : 0,
      lastScanResults: this.lastScanResults,
      averageProcessingTime: this.lastScanResults?.processingTime || 0,
      uptime: process.uptime()
    }
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

      // Destruir todos los cron jobs relacionados
      cron.getTasks().forEach((task, name) => {
        if (name?.includes('opportunity-scanner')) {
          task.destroy()
        }
      })

      logger.info('Opportunity scanner jobs stopped')
    } catch (error) {
      logger.error('Error stopping opportunity scanner jobs:', error)
    }
  }

  /**
   * Fuerza la ejecución inmediata (para testing)
   */
  async forceRun(): Promise<void> {
    logger.info('Forcing opportunity scanner run...')
    await this.runDailyOpportunityScan()
  }

  /**
   * Ejecuta un scan rápido para verificar configuración
   */
  async healthCheck(): Promise<{ healthy: boolean; message: string; details?: any }> {
    try {
      logger.info('Running opportunity scanner health check...')
      
      // Verificar que los servicios estén disponibles
      const stats = await opportunityService.getOpportunityStats()
      
      return {
        healthy: true,
        message: 'Opportunity scanner is healthy',
        details: {
          jobStatus: this.getJobStatus(),
          opportunityStats: stats,
          lastScan: this.lastScanResults
        }
      }
    } catch (error) {
      logger.error('Opportunity scanner health check failed:', error)
      return {
        healthy: false,
        message: `Opportunity scanner health check failed: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}

// Singleton instance
export const opportunityScannerJob = new OpportunityScannerJob()

// Exportar función para inicializar en el servidor principal
export function initializeOpportunityScannerJob(): OpportunityScannerJob {
  return opportunityScannerJob
}