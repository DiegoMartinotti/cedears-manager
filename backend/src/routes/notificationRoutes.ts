import { Router } from 'express'
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
router.get('/', (req, res) => notificationController.getNotifications(req, res))
router.get('/summary', (req, res) => notificationController.getSummary(req, res))
router.get('/stats', (req, res) => notificationController.getStats(req, res))
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res))
router.get('/search', (req, res) => notificationController.searchNotifications(req, res))
router.get('/health', (req, res) => notificationController.healthCheck(req, res))

// Individual notification operations
router.get('/:id', (req, res) => notificationController.getNotificationById(req, res))
router.put('/:id/read', (req, res) => notificationController.markAsRead(req, res))
router.put('/:id/archive', (req, res) => notificationController.archiveNotification(req, res))
router.delete('/:id', (req, res) => notificationController.deleteNotification(req, res))

// Notification creation
router.post('/', (req, res) => notificationController.createNotification(req, res))
router.post('/bulk', (req, res) => notificationController.createBulkNotifications(req, res))

// Bulk operations
router.put('/mark-read', (req, res) => notificationController.markMultipleAsRead(req, res))

// Convenience endpoints for specific notification types
router.post('/opportunity', (req, res) => notificationController.createOpportunityNotification(req, res))
router.post('/sell-alert', (req, res) => notificationController.createSellAlertNotification(req, res))

export default router

// Export service for use in other modules
export { notificationService }

