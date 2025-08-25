import * as cron from 'node-cron'
import SectorBalanceService from '../services/SectorBalanceService.js'
import GICSClassificationService from '../services/GICSClassificationService.js'
import DiversificationAnalysisService from '../services/DiversificationAnalysisService.js'
import NotificationService from '../services/NotificationService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('SectorBalanceJob')

export class SectorBalanceJob {
  private sectorBalanceService = new SectorBalanceService()
  private classificationService = new GICSClassificationService()
  private diversificationService = new DiversificationAnalysisService()
  private notificationService = new NotificationService()
  private isRunning = false

  // ============================================================================
  // Job Scheduling
  // ============================================================================

  /**
   * Initialize all sector balance jobs
   */
  init(): void {
    logger.info('Initializing sector balance jobs')

    // Daily sector analysis at 11:00 AM ART
    cron.schedule('0 11 * * *', () => {
      this.runDailySectorAnalysis()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Weekly classification update on Sundays at 2:00 AM ART
    cron.schedule('0 2 * * 0', () => {
      this.runWeeklyClassificationUpdate()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Monthly comprehensive analysis on the 1st at 3:00 AM ART
    cron.schedule('0 3 1 * *', () => {
      this.runMonthlyComprehensiveAnalysis()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Maintenance and cleanup on Saturdays at 4:00 AM ART
    cron.schedule('0 4 * * 6', () => {
      this.runMaintenanceTasks()
    }, {
      timezone: 'America/Argentina/Buenos_Aires'
    })

    logger.info('Sector balance jobs initialized successfully')
  }

  // ============================================================================
  // Daily Analysis Job
  // ============================================================================

  /**
   * Run daily sector analysis - main job
   */
  async runDailySectorAnalysis(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Sector balance job already running, skipping')
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    
    logger.info('Starting daily sector balance analysis')

    try {
      // 1. Run sector analysis
      const analysisResult = await this.sectorBalanceService.runSectorAnalysis()
      
      // 2. Generate health score
      const healthScore = await this.diversificationService.generateHealthScore()
      
      // 3. Check for critical alerts
      const criticalAlerts = analysisResult.issues.filter(issue => 
        issue.includes('critical') || issue.includes('CRITICAL')
      )

      // 4. Send notifications for critical issues
      if (criticalAlerts.length > 0) {
        await this.notificationService.create({
          type: 'PORTFOLIO_UPDATE',
          priority: 3, // HIGH
          title: 'Critical Portfolio Balance Issues Detected',
          message: `Daily analysis found ${criticalAlerts.length} critical issues requiring immediate attention.`,
          data: {
            analysisDate: analysisResult.analysisDate,
            criticalAlerts,
            healthScore: healthScore.overall,
            sectorsAnalyzed: analysisResult.sectorsAnalyzed
          }
        })
      }

      // 5. Send daily summary notification
      await this.notificationService.create({
        type: 'PORTFOLIO_UPDATE',
        priority: 1, // LOW
        title: 'Daily Sector Analysis Complete',
        message: `Portfolio analysis completed: ${analysisResult.sectorsAnalyzed} sectors analyzed, ${analysisResult.alertsGenerated} alerts generated, Health Score: ${healthScore.overall}/100`,
        data: {
          analysisDate: analysisResult.analysisDate,
          sectorsAnalyzed: analysisResult.sectorsAnalyzed,
          alertsGenerated: analysisResult.alertsGenerated,
          suggestionsCreated: analysisResult.suggestionsCreated,
          healthScore: healthScore.overall,
          issues: analysisResult.issues
        }
      })

      const executionTime = Date.now() - startTime
      logger.info(`Daily sector analysis completed successfully in ${executionTime}ms`, {
        sectorsAnalyzed: analysisResult.sectorsAnalyzed,
        alertsGenerated: analysisResult.alertsGenerated,
        suggestionsCreated: analysisResult.suggestionsCreated,
        healthScore: healthScore.overall,
        issues: analysisResult.issues.length
      })

    } catch (error) {
      const executionTime = Date.now() - startTime
      logger.error('Daily sector analysis failed:', error)
      
      // Send error notification
      await this.notificationService.create({
        type: 'SYSTEM',
        priority: 3, // HIGH
        title: 'Sector Analysis Job Failed',
        message: `Daily sector analysis failed after ${executionTime}ms. Manual review required.`,
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          executionTime
        }
      })
    } finally {
      this.isRunning = false
    }
  }

  // ============================================================================
  // Weekly Classification Update Job
  // ============================================================================

  /**
   * Run weekly classification updates
   */
  async runWeeklyClassificationUpdate(): Promise<void> {
    logger.info('Starting weekly classification update')

    try {
      // 1. Update outdated classifications
      const updateResult = await this.classificationService.updateOutdatedClassifications(7)
      
      // 2. Get quality report
      const qualityReport = await this.classificationService.getQualityReport()
      
      // 3. Auto-classify any unclassified instruments
      const autoClassifyResult = await this.classificationService.autoClassifyAll()
      
      // 4. Send summary notification
      await this.notificationService.create({
        type: 'SYSTEM',
        priority: 2, // MEDIUM
        title: 'Weekly Classification Update Complete',
        message: `Updated ${updateResult.updated} classifications, auto-classified ${autoClassifyResult.newClassifications} instruments. Average confidence: ${qualityReport.averageConfidence}%`,
        data: {
          updated: updateResult.updated,
          failed: updateResult.failed,
          newClassifications: autoClassifyResult.newClassifications,
          averageConfidence: qualityReport.averageConfidence,
          totalClassifications: qualityReport.totalClassifications,
          needsReview: qualityReport.needsReview.length
        }
      })

      logger.info('Weekly classification update completed successfully', {
        updated: updateResult.updated,
        newClassifications: autoClassifyResult.newClassifications,
        averageConfidence: qualityReport.averageConfidence
      })

    } catch (error) {
      logger.error('Weekly classification update failed:', error)
      
      await this.notificationService.create({
        type: 'SYSTEM',
        priority: 3, // HIGH
        title: 'Weekly Classification Update Failed',
        message: 'Weekly classification update job encountered errors. Manual review required.',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  // ============================================================================
  // Monthly Comprehensive Analysis Job
  // ============================================================================

  /**
   * Run monthly comprehensive analysis
   */
  async runMonthlyComprehensiveAnalysis(): Promise<void> {
    logger.info('Starting monthly comprehensive sector analysis')

    try {
      // 1. Full sector analysis
      const analysisResult = await this.sectorBalanceService.runSectorAnalysis()
      
      // 2. Portfolio evolution analysis (last 12 months)
      const startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1)
      const endDate = new Date()
      
      const evolution = await this.diversificationService.analyzePortfolioEvolution(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )
      
      // 3. Comprehensive risk analysis
      const riskAnalysis = await this.diversificationService.performRiskAnalysis()
      
      // 4. Health score with detailed factors
      const healthScore = await this.diversificationService.generateHealthScore()
      
      // 5. Sector statistics
      const sectorStats = await this.diversificationService.calculateSectorStats()
      
      // 6. Generate comprehensive monthly report notification
      await this.notificationService.create({
        type: 'PORTFOLIO_UPDATE',
        priority: 2, // MEDIUM
        title: 'Monthly Portfolio Analysis Complete',
        message: `Comprehensive monthly analysis completed. Portfolio Health Score: ${healthScore.overall}/100. Concentration Risk: ${riskAnalysis.concentrationRisk.level}`,
        data: {
          analysisDate: analysisResult.analysisDate,
          healthScore: healthScore,
          riskAnalysis: {
            concentrationRisk: riskAnalysis.concentrationRisk.level,
            correlationRisk: riskAnalysis.correlationRisk,
            liquidityRisk: riskAnalysis.liquidityRisk,
            sectorRisks: riskAnalysis.sectorSpecificRisks.filter(r => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL').length
          },
          portfolioMetrics: {
            sectorsAnalyzed: analysisResult.sectorsAnalyzed,
            alertsGenerated: analysisResult.alertsGenerated,
            suggestionsCreated: analysisResult.suggestionsCreated,
            majorChanges: evolution.majorChanges.length
          },
          topPerformingSectors: sectorStats
            .sort((a, b) => b.performance.monthly - a.performance.monthly)
            .slice(0, 3)
            .map(s => ({ sector: s.sector, performance: s.performance.monthly }))
        }
      })

      logger.info('Monthly comprehensive analysis completed successfully', {
        healthScore: healthScore.overall,
        concentrationRisk: riskAnalysis.concentrationRisk.level,
        sectorsAnalyzed: analysisResult.sectorsAnalyzed,
        majorChanges: evolution.majorChanges.length
      })

    } catch (error) {
      logger.error('Monthly comprehensive analysis failed:', error)
      
      await this.notificationService.create({
        type: 'SYSTEM',
        priority: 3, // HIGH
        title: 'Monthly Analysis Failed',
        message: 'Monthly comprehensive portfolio analysis failed. Manual review required.',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  // ============================================================================
  // Maintenance Tasks Job
  // ============================================================================

  /**
   * Run maintenance and cleanup tasks
   */
  async runMaintenanceTasks(): Promise<void> {
    logger.info('Starting sector balance maintenance tasks')

    try {
      // 1. Cleanup old analysis data (keep last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      // 2. Cleanup low-confidence classifications
      const cleanupResult = await this.classificationService.cleanupLowConfidence(30)
      
      // 3. Deactivate old alerts (older than 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      // 4. Health checks
      const serviceHealth = {
        sectorBalance: await this.sectorBalanceService.healthCheck(),
        classification: await this.classificationService.healthCheck(),
        diversification: await this.diversificationService.healthCheck()
      }
      
      // 5. Send maintenance summary
      await this.notificationService.create({
        type: 'SYSTEM',
        priority: 1, // LOW
        title: 'Weekly Maintenance Complete',
        message: `Maintenance tasks completed. Cleaned up ${cleanupResult} low-confidence classifications. All services ${Object.values(serviceHealth).every(h => h) ? 'healthy' : 'require attention'}.`,
        data: {
          cleanupResult,
          serviceHealth,
          timestamp: new Date().toISOString()
        }
      })

      logger.info('Maintenance tasks completed successfully', {
        cleanupResult,
        serviceHealth
      })

    } catch (error) {
      logger.error('Maintenance tasks failed:', error)
      
      await this.notificationService.create({
        type: 'SYSTEM',
        priority: 2, // MEDIUM
        title: 'Maintenance Tasks Failed',
        message: 'Weekly maintenance tasks encountered errors but system continues operating.',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  // ============================================================================
  // Manual Execution Methods
  // ============================================================================

  /**
   * Manually trigger daily analysis
   */
  async triggerDailyAnalysis(): Promise<void> {
    logger.info('Manually triggering daily sector analysis')
    await this.runDailySectorAnalysis()
  }

  /**
   * Manually trigger classification update
   */
  async triggerClassificationUpdate(): Promise<void> {
    logger.info('Manually triggering classification update')
    await this.runWeeklyClassificationUpdate()
  }

  /**
   * Manually trigger comprehensive analysis
   */
  async triggerComprehensiveAnalysis(): Promise<void> {
    logger.info('Manually triggering comprehensive analysis')
    await this.runMonthlyComprehensiveAnalysis()
  }

  /**
   * Manually trigger maintenance tasks
   */
  async triggerMaintenance(): Promise<void> {
    logger.info('Manually triggering maintenance tasks')
    await this.runMaintenanceTasks()
  }

  // ============================================================================
  // Status and Monitoring
  // ============================================================================

  /**
   * Get job status
   */
  getStatus(): {
    isRunning: boolean
    lastRun: string | null
    nextScheduled: string[]
  } {
    return {
      isRunning: this.isRunning,
      lastRun: null, // Would track in real implementation
      nextScheduled: [
        'Daily Analysis: 11:00 AM ART',
        'Weekly Classification: Sundays 2:00 AM ART',
        'Monthly Comprehensive: 1st of month 3:00 AM ART',
        'Maintenance: Saturdays 4:00 AM ART'
      ]
    }
  }

  /**
   * Health check for job system
   */
  async healthCheck(): Promise<boolean> {
    try {
      const serviceHealth = await Promise.all([
        this.sectorBalanceService.healthCheck(),
        this.classificationService.healthCheck(),
        this.diversificationService.healthCheck()
      ])

      return serviceHealth.every(h => h)
    } catch (error) {
      logger.error('Job health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const sectorBalanceJob = new SectorBalanceJob()

export default sectorBalanceJob