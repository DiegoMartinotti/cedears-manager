import { Router, Request, Response } from 'express'
import { NotificationController } from '../controllers/NotificationController.js'
import { NotificationService } from '../services/NotificationService.js'
import DatabaseConnection from '../database/connection.js'

// Create router
const router = Router()

// Initialize service and controller
const database = DatabaseConnection.getInstance()
const notificationService = new NotificationService(database)
const notificationController = new NotificationController(notificationService)

// Main notification routes
router.get('/', (req: Request, res: Response) => notificationController.getNotifications(req, res))
router.get('/summary', (req: Request, res: Response) => notificationController.getSummary(req, res))
router.get('/stats', (req: Request, res: Response) => notificationController.getStats(req, res))
router.get('/unread-count', (req: Request, res: Response) => notificationController.getUnreadCount(req, res))
router.get('/search', (req: Request, res: Response) => notificationController.searchNotifications(req, res))
router.get('/health', (req: Request, res: Response) => notificationController.healthCheck(req, res))

// Individual notification operations
router.get('/:id', (req: Request, res: Response) => notificationController.getNotificationById(req, res))
router.put('/:id/read', (req: Request, res: Response) => notificationController.markAsRead(req, res))
router.put('/:id/archive', (req: Request, res: Response) => notificationController.archiveNotification(req, res))
router.delete('/:id', (req: Request, res: Response) => notificationController.deleteNotification(req, res))

// Notification creation
router.post('/', (req: Request, res: Response) => notificationController.createNotification(req, res))
router.post('/bulk', (req: Request, res: Response) => notificationController.createBulkNotifications(req, res))

// Bulk operations
router.put('/mark-read', (req: Request, res: Response) => notificationController.markMultipleAsRead(req, res))

// Convenience endpoints for specific notification types
router.post('/opportunity', (req: Request, res: Response) => notificationController.createOpportunityNotification(req, res))
router.post('/sell-alert', (req: Request, res: Response) => notificationController.createSellAlertNotification(req, res))

export default router

// Export service for use in other modules
export { notificationService }

