import { Router } from 'express'
import MonthlyReviewController from '../controllers/MonthlyReviewController.js'

const router = Router()
const monthlyReviewController = new MonthlyReviewController()

// Main review routes
router.get('/current', monthlyReviewController.getCurrentReview)
router.get('/history', monthlyReviewController.getReviewHistory)
router.get('/pending', monthlyReviewController.getPendingChanges)
router.get('/stats', monthlyReviewController.getStats)

// Specific review routes
router.get('/:id', monthlyReviewController.getReview)
router.get('/:id/candidates', monthlyReviewController.getReviewCandidates)
router.get('/:id/preview', monthlyReviewController.previewChanges)

// Candidate management
router.post('/:id/candidates/:candidateId/approve', monthlyReviewController.approveCandidate)
router.post('/:id/candidates/:candidateId/reject', monthlyReviewController.rejectCandidate)
router.post('/:id/candidates/bulk-update', monthlyReviewController.bulkUpdateCandidates)

// Apply changes
router.post('/:id/apply-changes', monthlyReviewController.applyChanges)

// Job management
router.post('/trigger-manual', monthlyReviewController.triggerManualReview)
router.get('/job-status', monthlyReviewController.getJobStatus)

// Watchlist management
router.get('/watchlist-stats', monthlyReviewController.getWatchlistStats)
router.get('/change-history', monthlyReviewController.getChangeHistory)
router.post('/manual-change', monthlyReviewController.createManualChange)

export default router