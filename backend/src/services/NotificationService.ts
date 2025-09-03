import { Database } from 'better-sqlite3'
import {
  NotificationModel,
  NotificationData,
  CreateNotificationData,
  NotificationFilters,
  NotificationStats,
  NotificationType,
  NotificationPriority
} from '../models/Notification.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('NotificationService')

export interface NotificationServiceConfig {
  maxNotificationsPerType: Record<NotificationType, number>
  autoCleanupEnabled: boolean
  batchSize: number
}

export interface CreateNotificationInput extends CreateNotificationData {
  // Additional validation or processing fields if needed
}

export interface NotificationSummary {
  stats: NotificationStats
  recent: NotificationData[]
  highPriority: NotificationData[]
  unreadCount: number
}

export class NotificationService {
  private model: NotificationModel
  private config: NotificationServiceConfig

  private readonly defaultConfig: NotificationServiceConfig = {
    maxNotificationsPerType: {
      'OPPORTUNITY': 20,
      'ALERT': 30,
      'GOAL_PROGRESS': 10,
      'ESG_CHANGE': 15,
      'PORTFOLIO_UPDATE': 25,
      'SYSTEM': 10,
      'SELL_SIGNAL': 25,
      'WATCHLIST_CHANGE': 20
    },
    autoCleanupEnabled: true,
    batchSize: 100
  }

  constructor(database: Database, config: Partial<NotificationServiceConfig> = {}) {
    this.model = new NotificationModel(database)
    this.config = { ...this.defaultConfig, ...config }
  }

  /**
   * Create a new notification with validation and cleanup
   */
  async createNotification(data: CreateNotificationInput): Promise<NotificationData> {
    // Validate input
    this.validateNotificationData(data)

    // Check if we need to cleanup old notifications of this type
    await this.enforceTypeLimits(data.type)

    // Create the notification
    const notification = this.model.create(data)

    // Trigger async cleanup if enabled
    if (this.config.autoCleanupEnabled) {
      setImmediate(() => this.performCleanup())
    }

    return notification
  }

  /**
   * Create multiple notifications in a transaction
   */
  async createBulkNotifications(notifications: CreateNotificationInput[]): Promise<number> {
    // Validate all notifications
    notifications.forEach(data => this.validateNotificationData(data))

    const count = this.model.createBulk(notifications)

    // Trigger cleanup for all types
    if (this.config.autoCleanupEnabled) {
      setImmediate(() => this.performCleanup())
    }

    return count
  }

  /**
   * Get notifications with advanced filtering and pagination
   */
  async getNotifications(
    filters: NotificationFilters = {}, 
    page = 1, 
    pageSize = 20
  ): Promise<{ notifications: NotificationData[], total: number, hasMore: boolean }> {
    const offset = (page - 1) * pageSize
    const limit = pageSize + 1 // Get one extra to check if there are more

    const notifications = this.model.findAll(filters, limit, offset)
    const hasMore = notifications.length > pageSize
    
    if (hasMore) {
      notifications.pop() // Remove the extra item
    }

    // Get total count for pagination
    const stats = this.model.getStats()
    
    return {
      notifications: notifications.slice(0, pageSize),
      total: stats.total,
      hasMore
    }
  }

  /**
   * Get notification summary for dashboard
   */
  async getSummary(): Promise<NotificationSummary> {
    const stats = this.model.getStats()
    
    // Get recent notifications (last 24 hours)
    const recent = this.model.findAll({
      dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }, 10)

    // Get high priority unread notifications
    const highPriority = this.model.findAll({
      priority: 'HIGH',
      isRead: false
    }, 10)

    // Add critical priority notifications
    const critical = this.model.findAll({
      priority: 'CRITICAL',
      isRead: false
    }, 5)

    return {
      stats,
      recent,
      highPriority: [...critical, ...highPriority].slice(0, 10),
      unreadCount: this.model.getUnreadCount()
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: number): Promise<boolean> {
    return this.model.markAsRead(id)
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(ids: number[]): Promise<number> {
    return this.model.markMultipleAsRead(ids)
  }

  /**
   * Mark all notifications as read (with optional filters)
   */
  async markAllAsRead(filters: NotificationFilters = {}): Promise<number> {
    return this.model.markAllAsRead(filters)
  }

  /**
   * Archive notification
   */
  async archiveNotification(id: number): Promise<boolean> {
    return this.model.archive(id)
  }

  /**
   * Delete notification permanently
   */
  async deleteNotification(id: number): Promise<boolean> {
    return this.model.delete(id)
  }

  /**
   * Search notifications
   */
  async searchNotifications(query: string, limit = 50): Promise<NotificationData[]> {
    return this.model.search(query, limit)
  }

  /**
   * Get unread count for badge
   */
  async getUnreadCount(): Promise<number> {
    return this.model.getUnreadCount()
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: number): Promise<NotificationData | null> {
    return this.model.findById(id)
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<NotificationStats> {
    return this.model.getStats()
  }

  /**
   * Create opportunity notification
   */
  async createOpportunityNotification(
    instrumentSymbol: string, 
    score: number,
    reasons: string[]
  ): Promise<NotificationData> {
    return this.createNotification({
      type: 'OPPORTUNITY',
      priority: score >= 80 ? 'HIGH' : 'MEDIUM',
      title: `Oportunidad de Compra: ${instrumentSymbol}`,
      message: `Detectada oportunidad con score ${score}/100. Razones: ${reasons.slice(0, 2).join(', ')}`,
      data: {
        symbol: instrumentSymbol,
        score,
        reasons,
        analysisDate: new Date().toISOString()
      },
      sourceType: 'instrument',
      actionType: 'VIEW_OPPORTUNITY',
      actionUrl: `/opportunities?symbol=${instrumentSymbol}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    })
  }

  /**
   * Create sell alert notification
   */
  async createSellAlertNotification(
    instrumentSymbol: string,
    currentPrice: number,
    targetPrice: number,
    gainPercentage: number
  ): Promise<NotificationData> {
    return this.createNotification({
      type: 'SELL_SIGNAL',
      priority: gainPercentage >= 20 ? 'HIGH' : 'MEDIUM',
      title: `Alerta de Venta: ${instrumentSymbol}`,
      message: `${instrumentSymbol} alcanzó $${currentPrice} (objetivo: $${targetPrice}). Ganancia: ${gainPercentage.toFixed(1)}%`,
      data: {
        symbol: instrumentSymbol,
        currentPrice,
        targetPrice,
        gainPercentage,
        alertDate: new Date().toISOString()
      },
      sourceType: 'position',
      actionType: 'VIEW_SELL_ANALYSIS',
      actionUrl: `/sell-analysis?symbol=${instrumentSymbol}`
    })
  }

  /**
   * Create ESG/Vegan change notification
   */
  async createESGChangeNotification(
    instrumentSymbol: string,
    changeType: 'UPGRADE' | 'DOWNGRADE' | 'LOSS_CRITERIA',
    oldScore: number,
    newScore: number
  ): Promise<NotificationData> {
    const isDowngrade = changeType === 'DOWNGRADE' || changeType === 'LOSS_CRITERIA'
    
    return this.createNotification({
      type: 'ESG_CHANGE',
      priority: isDowngrade ? 'HIGH' : 'MEDIUM',
      title: `Cambio ESG/Vegan: ${instrumentSymbol}`,
      message: `${instrumentSymbol} ${changeType === 'UPGRADE' ? 'mejoró' : 'empeoró'} su score ESG/Vegan de ${oldScore} a ${newScore}`,
      data: {
        symbol: instrumentSymbol,
        changeType,
        oldScore,
        newScore,
        changeDate: new Date().toISOString()
      },
      sourceType: 'instrument',
      actionType: 'VIEW_ESG_DETAILS',
      actionUrl: `/watchlist?symbol=${instrumentSymbol}#esg`
    })
  }

  /**
   * Create goal progress notification
   */
  async createGoalProgressNotification(
    goalName: string,
    progressPercentage: number,
    milestone?: string
  ): Promise<NotificationData> {
    return this.createNotification({
      type: 'GOAL_PROGRESS',
      priority: progressPercentage >= 90 ? 'HIGH' : 'LOW',
      title: milestone ? `¡Hito Alcanzado!` : 'Progreso de Objetivo',
      message: milestone ? 
        `¡Felicitaciones! Alcanzaste el hito: ${milestone}` :
        `Tu objetivo "${goalName}" tiene ${progressPercentage.toFixed(1)}% de progreso`,
      data: {
        goalName,
        progressPercentage,
        milestone,
        updateDate: new Date().toISOString()
      },
      sourceType: 'goal',
      actionType: 'VIEW_GOAL_DETAILS',
      actionUrl: '/goals'
    })
  }

  /**
   * Validate notification data
   */
  private validateNotificationData(data: CreateNotificationInput): void {
    if (!data.title?.trim()) {
      throw new Error('Title is required')
    }
    if (!data.message?.trim()) {
      throw new Error('Message is required')
    }
    if (data.title.length > 200) {
      throw new Error('Title must be 200 characters or less')
    }
    if (data.message.length > 1000) {
      throw new Error('Message must be 1000 characters or less')
    }
  }

  /**
   * Enforce limits per notification type
   */
  private async enforceTypeLimits(type: NotificationType): Promise<void> {
    const limit = this.config.maxNotificationsPerType[type]
    if (!limit) return

    // Count current notifications of this type
    const current = this.model.findAll({ type, isArchived: false }, 1000)
    
    if (current.length >= limit) {
      // Archive oldest notifications to make room
      const toArchive = current
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, current.length - limit + 1)
      
      toArchive.forEach(notification => {
        this.model.archive(notification.id!)
      })
    }
  }

  /**
   * Perform cleanup of expired and old notifications
   */
  private async performCleanup(): Promise<void> {
    try {
      // Clean expired notifications
      const expiredCount = this.model.cleanupExpired()
      
      // Clean old archived notifications
      const archivedCount = this.model.cleanupOldArchived()

      if (expiredCount > 0 || archivedCount > 0) {
        logger.info(`Notification cleanup: ${expiredCount} expired, ${archivedCount} old archived`)
      }
    } catch (error) {
      logger.error('Notification cleanup failed:', error)
    }
  }

  /**
   * Create system notification (for internal use)
   */
  async createSystemNotification(
    title: string,
    message: string,
    priority: NotificationPriority = 'MEDIUM',
    data?: any
  ): Promise<NotificationData> {
    return this.createNotification({
      type: 'SYSTEM',
      priority,
      title,
      message,
      data,
      sourceType: 'system'
    })
  }

  /**
   * Batch operations for performance
   */
  async batchMarkAsRead(filters: NotificationFilters): Promise<number> {
    return this.model.markAllAsRead(filters)
  }

  /**
   * Health check for notification system
   */
  async healthCheck(): Promise<{ status: string, stats: NotificationStats, issues?: string[] }> {
    try {
      const stats = await this.getStats()
      const issues: string[] = []

      // Check for too many unread notifications
      if (stats.unread > 100) {
        issues.push(`High unread count: ${stats.unread}`)
      }

      // Check for recent system issues
      if (stats.byType.SYSTEM > 10) {
        issues.push(`Many system notifications: ${stats.byType.SYSTEM}`)
      }

      return {
        status: issues.length === 0 ? 'healthy' : 'warning',
        stats,
        issues: issues.length > 0 ? issues : undefined
      }
    } catch (error) {
      logger.error('Notification health check failed:', error)
      return {
        status: 'error',
        stats: {} as NotificationStats,
        issues: [`Service error: ${error.message}`]
      }
    }
  }
}

export default NotificationService
