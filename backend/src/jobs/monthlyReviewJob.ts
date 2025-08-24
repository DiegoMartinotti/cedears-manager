import * as cron from 'node-cron'
import MonthlyReviewService from '../services/MonthlyReviewService.js'
import WatchlistManagementService from '../services/WatchlistManagementService.js'
import { NotificationService } from '../services/NotificationService.js'
import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('MonthlyReviewJob')

export class MonthlyReviewJob {
  private monthlyReviewService: MonthlyReviewService
  private watchlistManagementService: WatchlistManagementService
  private notificationService: NotificationService
  private isRunning = false

  constructor() {
    this.monthlyReviewService = new MonthlyReviewService()
    this.watchlistManagementService = new WatchlistManagementService()
    this.notificationService = new NotificationService(DatabaseConnection.getInstance())
  }

  /**
   * Start all monthly review related jobs
   */
  start(): void {
    logger.info('Starting Monthly Review jobs...')

    // Main monthly review job - runs on the 1st of each month at 6:00 AM ART
    cron.schedule('0 6 1 * *', async () => {
      await this.executeMonthlyReview()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Reminder job - runs 3 days before month end to prepare for review
    cron.schedule('0 9 28 * *', async () => {
      await this.sendPreReviewReminder()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Status check job - runs weekly to check for stuck reviews
    cron.schedule('0 8 * * 1', async () => {
      await this.checkReviewStatus()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Cleanup job - runs on 15th of each month to clean old data
    cron.schedule('0 2 15 * *', async () => {
      await this.cleanupOldData()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    logger.info('✅ Monthly Review jobs started successfully')
    logger.info('📅 Next review scheduled for: 1st of next month at 6:00 AM ART')
  }

  /**
   * Execute the monthly review process
   */
  async executeMonthlyReview(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Monthly review already running, skipping...')
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      logger.info('🚀 Starting monthly review process...')

      // Step 1: Start new review session
      const review = await this.monthlyReviewService.startMonthlyReview()
      logger.info(`Created review session: ${review.id}`)

      // Step 2: Execute the review
      const scanResult = await this.monthlyReviewService.executeReview(review.id!)
      
      // Step 3: Send summary notification
      await this.notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'high',
        title: '📋 Revisión Mensual Completada',
        message: `La revisión mensual ha finalizado. Se encontraron ${scanResult.candidatesForAddition.length} candidatos para agregar y ${scanResult.candidatesForRemoval.length} para remover. Revisa los cambios propuestos.`,
        data: {
          reviewId: review.id,
          summary: scanResult.summary,
          needsUserAction: true
        }
      })

      const duration = (Date.now() - startTime) / 1000
      logger.info(`✅ Monthly review completed in ${duration}s`)

      // Step 4: If all changes are auto-approved, apply them immediately
      const pendingChanges = this.watchlistManagementService.getPendingChanges(review.id!)
      const totalPending = pendingChanges.additions.length + pendingChanges.removals.length

      if (totalPending === 0) {
        logger.info('All changes were auto-approved, applying immediately...')
        const applyResult = await this.watchlistManagementService.applyApprovedChanges(review.id!)
        
        await this.notificationService.createNotification({
          type: 'PORTFOLIO_UPDATE',
          priority: 'high',
          title: '✅ Cambios Aplicados Automáticamente',
          message: `Se aplicaron ${applyResult.applied} cambios automáticamente basados en alta confianza.`,
          data: { reviewId: review.id, result: applyResult }
        })
      } else {
        await this.notificationService.createNotification({
          type: 'WATCHLIST_CHANGE',
          priority: 'critical',
          title: '👁️ Aprobación Requerida',
          message: `Hay ${totalPending} cambios pendientes que requieren tu aprobación. Revisa la sección de Revisión Mensual.`,
          data: { reviewId: review.id, pendingCount: totalPending }
        })
      }

    } catch (error) {
      logger.error('❌ Monthly review failed:', error)

      // Send failure notification
      await this.notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'critical',
        title: '⚠️ Error en Revisión Mensual',
        message: `La revisión mensual falló: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      })

    } finally {
      this.isRunning = false
    }
  }

  /**
   * Send reminder before month end
   */
  private async sendPreReviewReminder(): Promise<void> {
    try {
      logger.info('Sending pre-review reminder')

      const stats = this.watchlistManagementService.getWatchlistStats()
      const suggestions = this.watchlistManagementService.getOptimizationSuggestions()

      await this.notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'medium',
        title: '📅 Revisión Mensual Próxima',
        message: `La revisión mensual automática se ejecutará en 3 días. Watchlist actual: ${stats.totalInstruments}/100 instrumentos (${stats.utilizationPercentage.toFixed(1)}% utilización).`,
        data: { 
          currentStats: stats,
          suggestions: suggestions.slice(0, 3), // Top 3 suggestions
          daysUntilReview: 3
        }
      })

      // If there are high-priority suggestions, create separate notifications
      const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high')
      if (highPrioritySuggestions.length > 0) {
        await this.notificationService.createNotification({
          type: 'ALERT',
          priority: 'high',
          title: '⚠️ Optimización Recomendada',
          message: `Se identificaron ${highPrioritySuggestions.length} oportunidades de optimización de alta prioridad para tu watchlist.`,
          data: { suggestions: highPrioritySuggestions }
        })
      }

    } catch (error) {
      logger.error('Failed to send pre-review reminder:', error)
    }
  }

  /**
   * Check for stuck or failed reviews
   */
  private async checkReviewStatus(): Promise<void> {
    try {
      logger.info('Checking review status...')

      const currentReview = this.monthlyReviewService.getCurrentReview()
      
      if (!currentReview) {
        logger.info('No active review found')
        return
      }

      const reviewDate = new Date(currentReview.reviewDate)
      const daysSinceReview = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24))

      // Check for stuck reviews
      if (currentReview.status === 'IN_PROGRESS' && daysSinceReview > 1) {
        logger.warn(`Review ${currentReview.id} has been in progress for ${daysSinceReview} days`)
        
        await this.notificationService.createNotification({
          type: 'ALERT',
          priority: 'high',
          title: '⚠️ Revisión Pendiente',
          message: `La revisión mensual #${currentReview.id} lleva ${daysSinceReview} días en progreso. Puede requerir atención.`,
          data: { reviewId: currentReview.id, daysPending: daysSinceReview }
        })
      }

      // Check for reviews needing user action
      if (currentReview.status === 'COMPLETED' && daysSinceReview > 7) {
        const pendingChanges = this.watchlistManagementService.getPendingChanges(currentReview.id!)
        const totalPending = pendingChanges.additions.length + pendingChanges.removals.length

        if (totalPending > 0) {
          await this.notificationService.createNotification({
            type: 'ALERT',
            priority: 'medium',
            title: '📋 Acción Requerida',
            message: `Hay ${totalPending} cambios esperando aprobación desde hace ${daysSinceReview} días.`,
            data: { reviewId: currentReview.id, pendingCount: totalPending, daysPending: daysSinceReview }
          })
        }
      }

    } catch (error) {
      logger.error('Failed to check review status:', error)
    }
  }

  /**
   * Cleanup old review data
   */
  private async cleanupOldData(): Promise<void> {
    try {
      logger.info('Starting cleanup of old review data...')
      
      const db = DatabaseConnection.getInstance()
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const cutoffDate = sixMonthsAgo.toISOString().split('T')[0]

      // Count records to be deleted
      const countStmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM monthly_reviews 
        WHERE review_date < ? AND status IN ('COMPLETED', 'FAILED')
      `)
      const recordCount = (countStmt.get(cutoffDate) as { count: number }).count

      if (recordCount === 0) {
        logger.info('No old reviews to cleanup')
        return
      }

      // Delete old reviews and their associated data (CASCADE will handle related tables)
      const deleteStmt = db.prepare(`
        DELETE FROM monthly_reviews 
        WHERE review_date < ? AND status IN ('COMPLETED', 'FAILED')
      `)
      
      const result = deleteStmt.run(cutoffDate)
      
      logger.info(`Cleaned up ${result.changes} old review records`)

      // Cleanup old notifications related to reviews (keep only last 3 months)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      const notificationCleanupStmt = db.prepare(`
        DELETE FROM notifications 
        WHERE type = 'SYSTEM' 
        AND created_at < ?
        AND JSON_EXTRACT(data, '$.reviewId') IS NOT NULL
      `)
      
      const notifResult = notificationCleanupStmt.run(threeMonthsAgo.toISOString())
      
      if (notifResult.changes > 0) {
        logger.info(`Cleaned up ${notifResult.changes} old review notifications`)
      }

      // Send cleanup summary
      await this.notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'low',
        title: '🧹 Limpieza de Datos',
        message: `Se limpiaron ${result.changes} revisiones antiguas y ${notifResult.changes} notificaciones del sistema.`,
        data: { 
          reviewsDeleted: result.changes,
          notificationsDeleted: notifResult.changes,
          cutoffDate
        }
      })

    } catch (error) {
      logger.error('Failed to cleanup old data:', error)
    }
  }

  /**
   * Manually trigger review (for testing or emergency)
   */
  async triggerManualReview(): Promise<void> {
    logger.info('Triggering manual monthly review...')
    
    await this.notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'medium',
      title: '🔧 Revisión Manual Iniciada',
      message: 'Se ha iniciado una revisión mensual manual.',
      data: { manual: true, timestamp: new Date().toISOString() }
    })

    await this.executeMonthlyReview()
  }

  /**
   * Get job status and next execution times
   */
  getJobStatus() {
    return {
      isRunning: this.isRunning,
      nextReviewDate: this.getNextExecutionDate('0 6 1 * *'),
      nextReminderDate: this.getNextExecutionDate('0 9 28 * *'),
      nextStatusCheck: this.getNextExecutionDate('0 8 * * 1'),
      nextCleanup: this.getNextExecutionDate('0 2 15 * *'),
      timezone: 'America/Argentina/Buenos_Aires'
    }
  }

  /**
   * Helper to calculate next execution date for a cron expression
   */
  private getNextExecutionDate(cronExpression: string): string {
    // This is a simplified implementation
    // In production, you might want to use a proper cron parser library
    const now = new Date()
    
    if (cronExpression === '0 6 1 * *') {
      // Next 1st of month at 6 AM
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 6, 0, 0)
      return next.toISOString()
    } else if (cronExpression === '0 9 28 * *') {
      // Next 28th at 9 AM
      const next = new Date(now.getFullYear(), now.getMonth(), 28, 9, 0, 0)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }
      return next.toISOString()
    } else if (cronExpression === '0 8 * * 1') {
      // Next Monday at 8 AM
      const next = new Date(now)
      const daysUntilMonday = (7 + 1 - now.getDay()) % 7
      next.setDate(now.getDate() + (daysUntilMonday || 7))
      next.setHours(8, 0, 0, 0)
      return next.toISOString()
    } else if (cronExpression === '0 2 15 * *') {
      // Next 15th at 2 AM
      const next = new Date(now.getFullYear(), now.getMonth(), 15, 2, 0, 0)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }
      return next.toISOString()
    }

    return 'Unknown'
  }

  /**
   * Stop all jobs (for graceful shutdown)
   */
  stop(): void {
    logger.info('Stopping Monthly Review jobs...')
    cron.getTasks().forEach((task) => {
      task.stop()
    })
    logger.info('✅ Monthly Review jobs stopped')
  }
}

// Export singleton instance
export const monthlyReviewJob = new MonthlyReviewJob()

export default monthlyReviewJob