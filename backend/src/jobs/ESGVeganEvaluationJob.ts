import * as cron from 'node-cron'
import ESGAnalysisService from '../services/ESGAnalysisService.js'
import VeganAnalysisService from '../services/VeganAnalysisService.js'
import { Instrument as InstrumentModel, type InstrumentData } from '../models/Instrument.js'
import ESGEvaluationModel from '../models/ESGEvaluation.js'
import VeganEvaluationModel from '../models/VeganEvaluation.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('ESGVeganEvaluationJob')

export class ESGVeganEvaluationJob {
  private esgService = new ESGAnalysisService()
  private veganService = new VeganAnalysisService()
  private instrumentModel = new InstrumentModel()
  private esgModel = new ESGEvaluationModel()
  private veganModel = new VeganEvaluationModel()

  private weeklyJobTask: cron.ScheduledTask | null = null
  private dailyJobTask: cron.ScheduledTask | null = null
  private monthlyJobTask: cron.ScheduledTask | null = null
  private weeklyJobScheduled = false
  private dailyJobScheduled = false
  private monthlyJobScheduled = false

  /**
   * Start all ESG/Vegan evaluation jobs
   */
  start(): void {
    logger.info('Starting ESG/Vegan evaluation jobs...')

    // Weekly comprehensive evaluation (Sundays at 2:00 AM)
    this.weeklyJobTask = cron.schedule('0 2 * * 0', async () => {
      await this.runWeeklyEvaluation()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })
    this.weeklyJobScheduled = true

    // Daily monitoring (every day at 10:00 AM)
    this.dailyJobTask = cron.schedule('0 10 * * *', async () => {
      await this.runDailyMonitoring()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })
    this.dailyJobScheduled = true

    // Monthly deep analysis (1st of each month at 3:00 AM)
    this.monthlyJobTask = cron.schedule('0 3 1 * *', async () => {
      await this.runMonthlyDeepAnalysis()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })
    this.monthlyJobScheduled = true

    logger.info('ESG/Vegan evaluation jobs started successfully')
  }

  /**
   * Stop all jobs
   */
  stop(): void {
    logger.info('Stopping ESG/Vegan evaluation jobs...')

    if (this.weeklyJobTask) {
      this.weeklyJobTask.stop()
      this.weeklyJobTask = null
    }
    this.weeklyJobScheduled = false

    if (this.dailyJobTask) {
      this.dailyJobTask.stop()
      this.dailyJobTask = null
    }
    this.dailyJobScheduled = false

    if (this.monthlyJobTask) {
      this.monthlyJobTask.stop()
      this.monthlyJobTask = null
    }
    this.monthlyJobScheduled = false

    logger.info('ESG/Vegan evaluation jobs stopped')
  }

  /**
   * Manual trigger for immediate evaluation
   */
  async runManualEvaluation(instrumentId?: number): Promise<void> {
    logger.info(`Starting manual ESG/Vegan evaluation${instrumentId ? ` for instrument ${instrumentId}` : ' for all instruments'}`)

    try {
      if (instrumentId) {
        await this.evaluateInstrument(instrumentId)
      } else {
        await this.runFullEvaluation()
      }
      
      logger.info('Manual evaluation completed successfully')
    } catch (error) {
      logger.error('Manual evaluation failed:', error)
      throw error
    }
  }

  /**
   * Weekly comprehensive evaluation
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async runWeeklyEvaluation(): Promise<void> {
    logger.info('Starting weekly ESG/Vegan evaluation...')

    try {
      const startTime = Date.now()
      
      // Get instruments that need review
      const esgInstruments = this.esgModel.getInstrumentsNeedingReview()
      const veganInstruments = this.veganModel.getInstrumentsNeedingReview()
      
      // Combine and deduplicate
      const allInstrumentIds = new Set([
        ...esgInstruments.map(i => i.instrument_id),
        ...veganInstruments.map(i => i.instrument_id)
      ])

      logger.info(`Found ${allInstrumentIds.size} instruments needing evaluation`)

      let processed = 0
      let errors = 0

      // Process in batches to avoid overwhelming external APIs
      const batchSize = 5
      const instrumentArray = Array.from(allInstrumentIds)
      
      for (let i = 0; i < instrumentArray.length; i += batchSize) {
        const batch = instrumentArray.slice(i, i + batchSize)
        
        await Promise.allSettled(
          batch.map(async (instrumentId) => {
            try {
              await this.evaluateInstrument(instrumentId)
              processed++
              logger.info(`Processed instrument ${instrumentId} (${processed}/${allInstrumentIds.size})`)
            } catch (error) {
              logger.error(`Failed to evaluate instrument ${instrumentId}:`, error)
              errors++
            }
          })
        )

        // Wait between batches to respect rate limits
        if (i + batchSize < instrumentArray.length) {
          await this.sleep(5000) // 5 second delay between batches
        }
      }

      const duration = (Date.now() - startTime) / 1000
      logger.info(`Weekly evaluation completed: ${processed} processed, ${errors} errors, ${duration}s duration`)

      // Update statistics and cleanup
      await this.performMaintenanceTasks()

    } catch (error) {
      logger.error('Weekly evaluation failed:', error)
    }
  }

  /**
   * Daily monitoring for news and controversy detection
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async runDailyMonitoring(): Promise<void> {
    logger.info('Starting daily ESG/Vegan monitoring...')

    try {
      const startTime = Date.now()

      // Get recently evaluated instruments for monitoring
      const recentESG = this.esgModel.findAll({
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })

      const recentVegan = this.veganModel.findAll({
        dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })

      const instrumentIds = new Set([
        ...recentESG.map(e => e.instrument_id),
        ...recentVegan.map(v => v.instrument_id)
      ])

      logger.info(`Monitoring ${instrumentIds.size} recently evaluated instruments`)

      let monitored = 0
      let alerts = 0

      // Monitor in smaller batches for daily updates
      const batchSize = 10
      const instrumentArray = Array.from(instrumentIds)

      for (let i = 0; i < instrumentArray.length; i += batchSize) {
        const batch = instrumentArray.slice(i, i + batchSize)
        
        await Promise.allSettled(
          batch.map(async (instrumentId) => {
            try {
              const alertsGenerated = await this.monitorInstrument(instrumentId)
              monitored++
              alerts += alertsGenerated
            } catch (error) {
              logger.warn(`Failed to monitor instrument ${instrumentId}:`, error)
            }
          })
        )

        // Wait between batches
        if (i + batchSize < instrumentArray.length) {
          await this.sleep(2000) // 2 second delay
        }
      }

      const duration = (Date.now() - startTime) / 1000
      logger.info(`Daily monitoring completed: ${monitored} monitored, ${alerts} alerts generated, ${duration}s duration`)

    } catch (error) {
      logger.error('Daily monitoring failed:', error)
    }
  }

  /**
   * Monthly deep analysis with reports and trending
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async runMonthlyDeepAnalysis(): Promise<void> {
    logger.info('Starting monthly ESG/Vegan deep analysis...')

    try {
      const startTime = Date.now()

      // Analyze all active instruments comprehensively
      const activeInstruments = await this.instrumentModel.findAll({ isActive: true })

      logger.info(`Running deep analysis on ${activeInstruments.length} active instruments`)

      // Update all ESG and Vegan evaluations
      let analyzed = 0
      let errors = 0

      // Process in smaller batches for thorough analysis
      const batchSize = 3

      for (let i = 0; i < activeInstruments.length; i += batchSize) {
        const batch = activeInstruments.slice(i, i + batchSize)

        await Promise.allSettled(
          batch.map(async (instrument: InstrumentData) => {
            try {
              await this.evaluateInstrument(instrument.id!)
              analyzed++
              logger.info(`Deep analysis completed for ${instrument.symbol} (${analyzed}/${activeInstruments.length})`)
            } catch (error) {
              logger.error(`Deep analysis failed for ${instrument.symbol}:`, error)
              errors++
            }
          })
        )

        // Longer wait for deep analysis
        if (i + batchSize < activeInstruments.length) {
          await this.sleep(10000) // 10 second delay
        }
      }

      // Generate monthly insights and reports
      await this.generateMonthlyInsights()
      
      // Perform comprehensive maintenance
      await this.performMaintenanceTasks()

      const duration = (Date.now() - startTime) / 1000
      logger.info(`Monthly deep analysis completed: ${analyzed} analyzed, ${errors} errors, ${duration}s duration`)

    } catch (error) {
      logger.error('Monthly deep analysis failed:', error)
    }
  }

  /**
   * Evaluate a single instrument for both ESG and Vegan criteria
   */
  private async evaluateInstrument(instrumentId: number): Promise<void> {
    try {
      const instrument = await this.instrumentModel.findById(instrumentId)
      if (!instrument || !instrument.is_active) {
        return
      }

      logger.info(`Evaluating ESG/Vegan criteria for ${instrument.symbol}`)

      // Run ESG and Vegan analysis in parallel
      const [esgResult, veganResult] = await Promise.allSettled([
        this.esgService.analyzeInstrument(instrumentId),
        this.veganService.analyzeInstrument(instrumentId)
      ])

      if (esgResult.status === 'fulfilled') {
        logger.info(`ESG analysis completed for ${instrument.symbol}: score ${esgResult.value.totalScore}`)
      } else {
        logger.error(`ESG analysis failed for ${instrument.symbol}:`, esgResult.reason)
      }

      if (veganResult.status === 'fulfilled') {
        logger.info(`Vegan analysis completed for ${instrument.symbol}: score ${veganResult.value.veganScore}`)
      } else {
        logger.error(`Vegan analysis failed for ${instrument.symbol}:`, veganResult.reason)
      }

      // Wait to respect rate limits
      await this.sleep(1000)

    } catch (error) {
      logger.error(`Error evaluating instrument ${instrumentId}:`, error)
      throw error
    }
  }

  /**
   * Monitor an instrument for new developments
   */
  private async monitorInstrument(instrumentId: number): Promise<number> {
    try {
      const instrument = await this.instrumentModel.findById(instrumentId)
      if (!instrument) {
        return 0
      }

      // This would check for news updates, controversy alerts, etc.
      // For now, just log monitoring
      logger.debug(`Monitoring ${instrument.symbol} for ESG/Vegan updates`)
      
      // In a full implementation, this would:
      // 1. Check for new news articles
      // 2. Monitor for certification changes
      // 3. Detect new controversies
      // 4. Generate alerts if needed
      
      return 0 // Number of alerts generated

    } catch (error) {
      logger.warn(`Error monitoring instrument ${instrumentId}:`, error)
      return 0
    }
  }

  /**
   * Generate monthly insights and trending data
   */
  private async generateMonthlyInsights(): Promise<void> {
    try {
      logger.info('Generating monthly ESG/Vegan insights...')

      // Generate statistics
      const esgStats = this.esgService.getStatistics()
      const veganStats = this.veganService.getStatistics()

      logger.info('Monthly ESG Statistics:', {
        totalEvaluations: esgStats.totalEvaluations,
        averageScore: esgStats.averageScore,
        recentEvaluations: esgStats.recentEvaluations
      })

      logger.info('Monthly Vegan Statistics:', {
        totalEvaluations: veganStats.totalEvaluations,
        averageScore: veganStats.averageScore,
        recentEvaluations: veganStats.recentEvaluations
      })

      // Here you could generate more detailed reports, trends, etc.

    } catch (error) {
      logger.error('Error generating monthly insights:', error)
    }
  }

  /**
   * Perform maintenance tasks
   */
  private async performMaintenanceTasks(): Promise<void> {
    try {
      logger.info('Performing ESG/Vegan maintenance tasks...')

      // Update instrument flags based on latest evaluations
      this.esgModel.updateInstrumentESGFlags()
      this.veganModel.updateInstrumentVeganFlags()

      // Clean up old data if needed
      // (This could include removing evaluations older than X years)

      logger.info('Maintenance tasks completed')

    } catch (error) {
      logger.error('Error performing maintenance tasks:', error)
    }
  }

  /**
   * Run full evaluation for all active instruments
   */
  private async runFullEvaluation(): Promise<void> {
    const activeInstruments = await this.instrumentModel.findAll({ isActive: true })

    logger.info(`Running full evaluation for ${activeInstruments.length} instruments`)

    for (const instrument of activeInstruments) {
      try {
        await this.evaluateInstrument(instrument.id!)
        await this.sleep(2000) // 2 second delay between instruments
      } catch (error) {
        logger.error(`Failed to evaluate ${instrument.symbol}:`, error)
      }
    }
  }

  /**
   * Get job status
   */
  getStatus(): {
    weeklyJob: boolean
    dailyJob: boolean
    monthlyJob: boolean
    nextRuns: {
      weekly: string | null
      daily: string | null
      monthly: string | null
    }
  } {
    return {
      weeklyJob: this.weeklyJobScheduled,
      dailyJob: this.dailyJobScheduled,
      monthlyJob: this.monthlyJobScheduled,
      nextRuns: {
        weekly: this.weeklyJobTask ? 'Sundays at 2:00 AM ART' : null,
        daily: this.dailyJobTask ? 'Daily at 10:00 AM ART' : null,
        monthly: this.monthlyJobTask ? '1st of each month at 3:00 AM ART' : null
      }
    }
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
let esgVeganJobInstance: ESGVeganEvaluationJob | null = null

export function getESGVeganEvaluationJob(): ESGVeganEvaluationJob {
  if (!esgVeganJobInstance) {
    esgVeganJobInstance = new ESGVeganEvaluationJob()
  }
  return esgVeganJobInstance
}

export default ESGVeganEvaluationJob