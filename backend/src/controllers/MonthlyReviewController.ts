import { Request, Response } from 'express'
import MonthlyReviewService from '../services/MonthlyReviewService.js'
import WatchlistManagementService from '../services/WatchlistManagementService.js'
import { monthlyReviewJob } from '../jobs/monthlyReviewJob.js'
import { createLogger } from '../utils/logger.js'
import { z } from 'zod'

const logger = createLogger('MonthlyReviewController')

// Validation schemas
const ApprovalSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional()
})

const BulkApprovalSchema = z.object({
  candidateIds: z.array(z.number().positive()),
  candidateType: z.enum(['addition', 'removal']),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional()
})

const ApplyChangesSchema = z.object({
  dryRun: z.boolean().default(false)
})

export class MonthlyReviewController {
  private monthlyReviewService: MonthlyReviewService
  private watchlistManagementService: WatchlistManagementService

  constructor() {
    this.monthlyReviewService = new MonthlyReviewService()
    this.watchlistManagementService = new WatchlistManagementService()
  }

  /**
   * GET /monthly-review/current
   * Get current or latest review
   */
  getCurrentReview = async (req: Request, res: Response) => {
    try {
      const review = await this.monthlyReviewService.getCurrentReview()
      
      if (!review) {
        return res.json({
          success: true,
          data: null,
          message: 'No active review found'
        })
      }

      // Get additional data for current review
      const candidates = await this.monthlyReviewService.getReviewCandidates(review.id!)
      const pendingChanges = await this.watchlistManagementService.getPendingChanges(review.id)
      const stats = await this.watchlistManagementService.getWatchlistStats()

      return res.json({
        success: true,
        data: {
          review,
          candidates,
          pendingChanges,
          stats,
          needsUserAction: pendingChanges.additions.length + pendingChanges.removals.length > 0
        }
      })
    } catch (error) {
      logger.error('Failed to get current review:', error)
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/:id
   * Get specific review by ID
   */
  getReview = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      if (isNaN(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        })
      }

      const review = this.monthlyReviewService.getReview(reviewId)
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        })
      }

      const candidates = this.monthlyReviewService.getReviewCandidates(reviewId)

      res.json({
        success: true,
        data: {
          review,
          candidates
        }
      })
    } catch (error) {
      logger.error('Failed to get review:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/history
   * Get review history with pagination
   */
  getReviewHistory = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
      const offset = parseInt(req.query.offset as string) || 0

      const reviews = this.monthlyReviewService.getAllReviews(limit, offset)
      const stats = this.monthlyReviewService.getReviewStats()

      res.json({
        success: true,
        data: {
          reviews,
          stats,
          pagination: {
            limit,
            offset,
            total: stats.totalReviews
          }
        }
      })
    } catch (error) {
      logger.error('Failed to get review history:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/:id/candidates
   * Get candidates for a specific review
   */
  getReviewCandidates = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      if (isNaN(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        })
      }

      const candidates = this.monthlyReviewService.getReviewCandidates(reviewId)
      const previewChanges = this.watchlistManagementService.previewChanges(reviewId)

      res.json({
        success: true,
        data: {
          candidates,
          preview: previewChanges
        }
      })
    } catch (error) {
      logger.error('Failed to get review candidates:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * POST /monthly-review/:id/candidates/:candidateId/approve
   * Approve a specific candidate
   */
  approveCandidate = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      const candidateId = parseInt(req.params.candidateId)
      
      if (isNaN(reviewId) || isNaN(candidateId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review or candidate ID'
        })
      }

      const candidateType = req.query.type as 'addition' | 'removal'
      if (!candidateType || !['addition', 'removal'].includes(candidateType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing candidate type. Must be "addition" or "removal"'
        })
      }

      const validation = ApprovalSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          errors: validation.error.issues
        })
      }

      const { notes } = validation.data

      await this.watchlistManagementService.approveCandidate(candidateId, candidateType, notes)

      res.json({
        success: true,
        message: `${candidateType === 'addition' ? 'Addition' : 'Removal'} candidate approved successfully`
      })
    } catch (error) {
      logger.error('Failed to approve candidate:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * POST /monthly-review/:id/candidates/:candidateId/reject
   * Reject a specific candidate
   */
  rejectCandidate = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      const candidateId = parseInt(req.params.candidateId)
      
      if (isNaN(reviewId) || isNaN(candidateId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review or candidate ID'
        })
      }

      const candidateType = req.query.type as 'addition' | 'removal'
      if (!candidateType || !['addition', 'removal'].includes(candidateType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing candidate type. Must be "addition" or "removal"'
        })
      }

      const validation = ApprovalSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          errors: validation.error.issues
        })
      }

      const { notes } = validation.data

      await this.watchlistManagementService.rejectCandidate(candidateId, candidateType, notes)

      res.json({
        success: true,
        message: `${candidateType === 'addition' ? 'Addition' : 'Removal'} candidate rejected successfully`
      })
    } catch (error) {
      logger.error('Failed to reject candidate:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * POST /monthly-review/:id/candidates/bulk-update
   * Bulk approve or reject candidates
   */
  bulkUpdateCandidates = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      if (isNaN(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        })
      }

      const validation = BulkApprovalSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          errors: validation.error.issues
        })
      }

      const { candidateIds, candidateType, action, notes } = validation.data

      const updatedCount = await this.watchlistManagementService.bulkUpdateCandidates(
        candidateIds,
        candidateType,
        action,
        notes
      )

      res.json({
        success: true,
        data: { updatedCount },
        message: `${action === 'approve' ? 'Approved' : 'Rejected'} ${updatedCount} ${candidateType} candidates`
      })
    } catch (error) {
      logger.error('Failed to bulk update candidates:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * POST /monthly-review/:id/apply-changes
   * Apply approved changes to watchlist
   */
  applyChanges = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      if (isNaN(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        })
      }

      const validation = ApplyChangesSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request body',
          errors: validation.error.issues
        })
      }

      const { dryRun } = validation.data

      const result = await this.watchlistManagementService.applyApprovedChanges(reviewId, dryRun)

      res.json({
        success: true,
        data: result,
        message: dryRun 
          ? `Simulation complete: ${result.applied} changes would be applied`
          : `Applied ${result.applied} changes successfully`
      })
    } catch (error) {
      logger.error('Failed to apply changes:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/pending
   * Get all pending changes across reviews
   */
  getPendingChanges = async (req: Request, res: Response) => {
    try {
      const pendingChanges = this.watchlistManagementService.getPendingChanges()
      const stats = this.watchlistManagementService.getWatchlistStats()

      res.json({
        success: true,
        data: {
          pendingChanges,
          stats,
          totalPending: pendingChanges.additions.length + pendingChanges.removals.length
        }
      })
    } catch (error) {
      logger.error('Failed to get pending changes:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * POST /monthly-review/trigger-manual
   * Manually trigger a review (for testing or emergency)
   */
  triggerManualReview = async (req: Request, res: Response) => {
    try {
      // Check if there's already a review in progress
      const currentReview = this.monthlyReviewService.getCurrentReview()
      if (currentReview && currentReview.status === 'IN_PROGRESS') {
        return res.status(409).json({
          success: false,
          message: 'A review is already in progress',
          data: { currentReview }
        })
      }

      // Trigger manual review asynchronously
      monthlyReviewJob.triggerManualReview().catch(error => {
        logger.error('Manual review failed:', error)
      })

      res.json({
        success: true,
        message: 'Manual review triggered successfully. Check notifications for progress updates.'
      })
    } catch (error) {
      logger.error('Failed to trigger manual review:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/job-status
   * Get job status and scheduling information
   */
  getJobStatus = async (req: Request, res: Response) => {
    try {
      const jobStatus = monthlyReviewJob.getJobStatus()

      res.json({
        success: true,
        data: jobStatus
      })
    } catch (error) {
      logger.error('Failed to get job status:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/watchlist-stats
   * Get current watchlist statistics and optimization suggestions
   */
  getWatchlistStats = async (req: Request, res: Response) => {
    try {
      const stats = this.watchlistManagementService.getWatchlistStats()
      const suggestions = this.watchlistManagementService.getOptimizationSuggestions()
      const managementStats = this.watchlistManagementService.getManagementStats()

      res.json({
        success: true,
        data: {
          stats,
          suggestions,
          managementStats
        }
      })
    } catch (error) {
      logger.error('Failed to get watchlist stats:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/:id/preview
   * Preview impact of potential changes
   */
  previewChanges = async (req: Request, res: Response) => {
    try {
      const reviewId = parseInt(req.params.id)
      if (isNaN(reviewId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid review ID'
        })
      }

      const preview = this.watchlistManagementService.previewChanges(reviewId)

      res.json({
        success: true,
        data: preview
      })
    } catch (error) {
      logger.error('Failed to preview changes:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/change-history
   * Get watchlist change history
   */
  getChangeHistory = async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 200)
      const instrumentId = req.query.instrumentId ? parseInt(req.query.instrumentId as string) : undefined

      const history = this.watchlistManagementService.getChangeHistory(limit, instrumentId)

      res.json({
        success: true,
        data: {
          history,
          pagination: {
            limit,
            count: history.length
          }
        }
      })
    } catch (error) {
      logger.error('Failed to get change history:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * POST /monthly-review/manual-change
   * Create manual watchlist change (outside of monthly review)
   */
  createManualChange = async (req: Request, res: Response) => {
    try {
      const { instrumentId, action, reason } = req.body

      if (!instrumentId || !action || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: instrumentId, action, reason'
        })
      }

      if (!['ADD', 'REMOVE', 'UPDATE'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Must be ADD, REMOVE, or UPDATE'
        })
      }

      const change = await this.watchlistManagementService.createManualChange(
        parseInt(instrumentId),
        action,
        reason
      )

      res.json({
        success: true,
        data: change,
        message: 'Manual change created successfully'
      })
    } catch (error) {
      logger.error('Failed to create manual change:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }

  /**
   * GET /monthly-review/stats
   * Get comprehensive review statistics
   */
  getStats = async (req: Request, res: Response) => {
    try {
      const reviewStats = this.monthlyReviewService.getReviewStats()
      const watchlistStats = this.watchlistManagementService.getWatchlistStats()
      const managementStats = this.watchlistManagementService.getManagementStats()
      const suggestions = this.watchlistManagementService.getOptimizationSuggestions()

      res.json({
        success: true,
        data: {
          reviews: reviewStats,
          watchlist: watchlistStats,
          management: managementStats,
          suggestions
        }
      })
    } catch (error) {
      logger.error('Failed to get stats:', error)
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }
}

export default MonthlyReviewController