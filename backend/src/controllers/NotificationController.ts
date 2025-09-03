import { Request, Response } from 'express'
import { z } from 'zod'
import { NotificationService } from '../services/NotificationService.js'
import { NotificationFilters } from '../models/Notification.js'

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
  private readonly notificationService: NotificationService

  constructor(notificationService: NotificationService) {
    this.notificationService = notificationService
  }

  private handleError(res: Response, error: unknown, code: string, status = 500) {
    let message: string
    if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    } else {
      message = 'Unknown error'
    }
    return res.status(status).json({ success: false, error: message, code })
  }

  private handleValidationError(res: Response, error: z.ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors,
      code: 'VALIDATION_ERROR'
    })
  }

  private parseId(req: Request, res: Response): number | null {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) {
      this.handleError(res, 'Invalid notification ID', 'INVALID_ID', 400)
      return null
    }
    return id
  }

  /**
   * GET /api/v1/notifications
   * Get notifications with filtering and pagination
   */
  // eslint-disable-next-line max-lines-per-function
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

        return res.json({
          success: true,
          data: {
            ...result,
            page: query.page,
            pageSize: query.pageSize
          }
        })
    } catch (error) {
      return this.handleError(res, error, 'FETCH_NOTIFICATIONS_ERROR')
    }
  }

  /**
   * GET /api/v1/notifications/summary
   * Get notification summary for dashboard
   */
  async getSummary(req: Request, res: Response) {
    try {
        const summary = await this.notificationService.getSummary()
        return res.json({
          success: true,
          data: summary
        })
    } catch (error) {
      return this.handleError(res, error, 'SUMMARY_ERROR')
    }
  }

  /**
   * GET /api/v1/notifications/stats
   * Get notification statistics
   */
  async getStats(req: Request, res: Response) {
    try {
        const stats = await this.notificationService.getStats()
        return res.json({
          success: true,
          data: stats
        })
    } catch (error) {
      return this.handleError(res, error, 'STATS_ERROR')
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count for badge
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
        const count = await this.notificationService.getUnreadCount()
        return res.json({
          success: true,
          data: { count }
        })
    } catch (error) {
      return this.handleError(res, error, 'UNREAD_COUNT_ERROR')
    }
  }

  /**
   * GET /api/v1/notifications/:id
   * Get notification by ID
   */
  async getNotificationById(req: Request, res: Response) {
    try {
      const id = this.parseId(req, res)
      if (id === null) return

      const notification = await this.notificationService.getNotificationById(id)
      if (!notification) {
        return this.handleError(res, 'Notification not found', 'NOT_FOUND', 404)
      }

      return res.json({
        success: true,
        data: notification
      })
    } catch (error) {
      return this.handleError(res, error, 'FETCH_NOTIFICATION_ERROR')
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

        return res.status(201).json({
          success: true,
          data: notification
        })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleValidationError(res, error)
      }
      return this.handleError(res, error, 'CREATE_NOTIFICATION_ERROR')
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

        return res.status(201).json({
          success: true,
          data: { created: count }
        })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleValidationError(res, error)
      }
      return this.handleError(res, error, 'BULK_CREATE_ERROR')
    }
  }

  /**
   * PUT /api/v1/notifications/:id/read
   * Mark notification as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const id = this.parseId(req, res)
      if (id === null) return

      const success = await this.notificationService.markAsRead(id)
      if (!success) {
        return this.handleError(res, 'Notification not found', 'NOT_FOUND', 404)
      }

      return res.json({
        success: true,
        data: { updated: success }
      })
    } catch (error) {
      return this.handleError(res, error, 'MARK_READ_ERROR')
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

        return res.json({
          success: true,
          data: { updated }
        })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleValidationError(res, error)
      }
      return this.handleError(res, error, 'MARK_READ_ERROR')
    }
  }

  /**
   * PUT /api/v1/notifications/:id/archive
   * Archive notification
   */
  async archiveNotification(req: Request, res: Response) {
    try {
      const id = this.parseId(req, res)
      if (id === null) return

      const success = await this.notificationService.archiveNotification(id)
      if (!success) {
        return this.handleError(res, 'Notification not found', 'NOT_FOUND', 404)
      }

      return res.json({
        success: true,
        data: { archived: success }
      })
    } catch (error) {
      return this.handleError(res, error, 'ARCHIVE_ERROR')
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Delete notification permanently
   */
  async deleteNotification(req: Request, res: Response) {
    try {
      const id = this.parseId(req, res)
      if (id === null) return

      const success = await this.notificationService.deleteNotification(id)
      if (!success) {
        return this.handleError(res, 'Notification not found', 'NOT_FOUND', 404)
      }

      return res.json({
        success: true,
        data: { deleted: success }
      })
    } catch (error) {
      return this.handleError(res, error, 'DELETE_ERROR')
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

      return res.json({
        success: true,
        data: {
          notifications: results,
          query: q,
          total: results.length
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleValidationError(res, error)
      }
      return this.handleError(res, error, 'SEARCH_ERROR')
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

      return res.status(201).json({
        success: true,
        data: notification
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleValidationError(res, error)
      }
      return this.handleError(res, error, 'CREATE_OPPORTUNITY_ERROR')
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

      return res.status(201).json({
        success: true,
        data: notification
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.handleValidationError(res, error)
      }
      return this.handleError(res, error, 'CREATE_SELL_ALERT_ERROR')
    }
  }

  /**
   * GET /api/v1/notifications/health
   * Health check for notification system
   */
  async healthCheck(req: Request, res: Response) {
    try {
        const health = await this.notificationService.healthCheck()
        return res.json({
          success: true,
          data: health
        })
    } catch (error) {
      return this.handleError(res, error, 'HEALTH_CHECK_ERROR')
    }
  }
}

export default NotificationController
