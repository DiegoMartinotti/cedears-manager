import { Request, Response } from 'express'
import { z } from 'zod'
import { NotificationService } from '../services/NotificationService.js'
import { NotificationFilters, NotificationType, NotificationPriority } from '../models/Notification.js'

// Validation schemas
const notificationTypeSchema = z.enum([
  'OPPORTUNITY', 'ALERT', 'GOAL_PROGRESS', 'ESG_CHANGE', 
  'PORTFOLIO_UPDATE', 'SYSTEM', 'SELL_SIGNAL', 'WATCHLIST_CHANGE'
])

const notificationPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

const createNotificationSchema = z.object({
  type: notificationTypeSchema,
  priority: notificationPrioritySchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.any().optional(),
  sourceId: z.number().optional(),
  sourceType: z.string().optional(),
  actionType: z.string().optional(),
  actionUrl: z.string().optional(),
  expiresAt: z.string().datetime().optional()
})

const getNotificationsQuerySchema = z.object({
  type: notificationTypeSchema.optional(),
  priority: notificationPrioritySchema.optional(),
  isRead: z.string().transform(val => val === 'true').optional(),
  isArchived: z.string().transform(val => val === 'true').optional(),
  sourceType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.string().transform(val => parseInt(val, 10)).default('1'),
  pageSize: z.string().transform(val => parseInt(val, 10)).default('20'),
  search: z.string().optional()
})

const markAsReadSchema = z.object({
  ids: z.array(z.number()).optional(),
  filters: z.object({
    type: notificationTypeSchema.optional(),
    priority: notificationPrioritySchema.optional(),
    sourceType: z.string().optional()
  }).optional()
})

export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  /**
   * GET /api/v1/notifications
   * Get notifications with filtering and pagination
   */
  async getNotifications(req: Request, res: Response) {
    try {
      const query = getNotificationsQuerySchema.parse(req.query)
      
      // Handle search separately if provided
      if (query.search) {
        const results = await this.notificationService.searchNotifications(
          query.search, 
          query.pageSize
        )
        return res.json({
          success: true,
          data: {
            notifications: results,
            total: results.length,
            hasMore: false,
            page: 1,
            pageSize: query.pageSize
          }
        })
      }

      const filters: NotificationFilters = {
        type: query.type,
        priority: query.priority,
        isRead: query.isRead,
        isArchived: query.isArchived,
        sourceType: query.sourceType,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo
      }

      const result = await this.notificationService.getNotifications(
        filters, 
        query.page, 
        query.pageSize
      )

      res.json({
        success: true,
        data: {
          ...result,
          page: query.page,
          pageSize: query.pageSize
        }
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_NOTIFICATIONS_ERROR'
      })
    }
  }

  /**
   * GET /api/v1/notifications/summary
   * Get notification summary for dashboard
   */
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await this.notificationService.getSummary()
      res.json({
        success: true,
        data: summary
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUMMARY_ERROR'
      })
    }
  }

  /**
   * GET /api/v1/notifications/stats
   * Get notification statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await this.notificationService.getStats()
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'STATS_ERROR'
      })
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count for badge
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const count = await this.notificationService.getUnreadCount()
      res.json({
        success: true,
        data: { count }
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UNREAD_COUNT_ERROR'
      })
    }
  }

  /**
   * GET /api/v1/notifications/:id
   * Get notification by ID
   */
  async getNotificationById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          code: 'INVALID_ID'
        })
      }

      const notification = await this.notificationService.getNotificationById(id)
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        })
      }

      res.json({
        success: true,
        data: notification
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FETCH_NOTIFICATION_ERROR'
      })
    }
  }

  /**
   * POST /api/v1/notifications
   * Create a new notification
   */
  async createNotification(req: Request, res: Response) {
    try {
      const data = createNotificationSchema.parse(req.body)
      const notification = await this.notificationService.createNotification(data)
      
      res.status(201).json({
        success: true,
        data: notification
      })
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        })
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATE_NOTIFICATION_ERROR'
      })
    }
  }

  /**
   * POST /api/v1/notifications/bulk
   * Create multiple notifications
   */
  async createBulkNotifications(req: Request, res: Response) {
    try {
      const schema = z.object({
        notifications: z.array(createNotificationSchema)
      })
      
      const { notifications } = schema.parse(req.body)
      const count = await this.notificationService.createBulkNotifications(notifications)
      
      res.status(201).json({
        success: true,
        data: { created: count }
      })
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        })
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BULK_CREATE_ERROR'
      })
    }
  }

  /**
   * PUT /api/v1/notifications/:id/read
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          code: 'INVALID_ID'
        })
      }

      const success = await this.notificationService.markAsRead(id)
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        })
      }

      res.json({
        success: true,
        data: { updated: success }
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'MARK_READ_ERROR'
      })
    }
  }

  /**
   * PUT /api/v1/notifications/mark-read
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(req: Request, res: Response) {
    try {
      const { ids, filters } = markAsReadSchema.parse(req.body)
      let updated = 0

      if (ids && ids.length > 0) {
        updated = await this.notificationService.markMultipleAsRead(ids)
      } else if (filters) {
        updated = await this.notificationService.markAllAsRead(filters)
      } else {
        // Mark all as read
        updated = await this.notificationService.markAllAsRead()
      }

      res.json({
        success: true,
        data: { updated }
      })
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        })
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'MARK_READ_ERROR'
      })
    }
  }

  /**
   * PUT /api/v1/notifications/:id/archive
   * Archive notification
   */
  async archiveNotification(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          code: 'INVALID_ID'
        })
      }

      const success = await this.notificationService.archiveNotification(id)
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        })
      }

      res.json({
        success: true,
        data: { archived: success }
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ARCHIVE_ERROR'
      })
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Delete notification permanently
   */
  async deleteNotification(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id, 10)
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid notification ID',
          code: 'INVALID_ID'
        })
      }

      const success = await this.notificationService.deleteNotification(id)
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
          code: 'NOT_FOUND'
        })
      }

      res.json({
        success: true,
        data: { deleted: success }
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DELETE_ERROR'
      })
    }
  }

  /**
   * GET /api/v1/notifications/search
   * Search notifications (alternative endpoint to query param)
   */
  async searchNotifications(req: Request, res: Response) {
    try {
      const schema = z.object({
        q: z.string().min(1),
        limit: z.string().transform(val => parseInt(val, 10)).default('50')
      })
      
      const { q, limit } = schema.parse(req.query)
      const results = await this.notificationService.searchNotifications(q, limit)
      
      res.json({
        success: true,
        data: {
          notifications: results,
          query: q,
          total: results.length
        }
      })
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        })
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SEARCH_ERROR'
      })
    }
  }

  /**
   * POST /api/v1/notifications/opportunity
   * Create opportunity notification (convenience endpoint)
   */
  async createOpportunityNotification(req: Request, res: Response) {
    try {
      const schema = z.object({
        instrumentSymbol: z.string(),
        score: z.number().min(0).max(100),
        reasons: z.array(z.string())
      })
      
      const { instrumentSymbol, score, reasons } = schema.parse(req.body)
      
      const notification = await this.notificationService.createOpportunityNotification(
        instrumentSymbol, score, reasons
      )
      
      res.status(201).json({
        success: true,
        data: notification
      })
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        })
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATE_OPPORTUNITY_ERROR'
      })
    }
  }

  /**
   * POST /api/v1/notifications/sell-alert
   * Create sell alert notification (convenience endpoint)
   */
  async createSellAlertNotification(req: Request, res: Response) {
    try {
      const schema = z.object({
        instrumentSymbol: z.string(),
        currentPrice: z.number(),
        targetPrice: z.number(),
        gainPercentage: z.number()
      })
      
      const { instrumentSymbol, currentPrice, targetPrice, gainPercentage } = schema.parse(req.body)
      
      const notification = await this.notificationService.createSellAlertNotification(
        instrumentSymbol, currentPrice, targetPrice, gainPercentage
      )
      
      res.status(201).json({
        success: true,
        data: notification
      })
    } catch (error) {
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        })
      }
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CREATE_SELL_ALERT_ERROR'
      })
    }
  }

  /**
   * GET /api/v1/notifications/health
   * Health check for notification system
   */
  async healthCheck(req: Request, res: Response) {
    try {
      const health = await this.notificationService.healthCheck()
      res.json({
        success: true,
        data: health
      })
    } catch (error) {
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'HEALTH_CHECK_ERROR'
      })
    }
  }
}

export default NotificationController
