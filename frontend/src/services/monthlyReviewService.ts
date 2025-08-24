import api from './api'

export interface MonthlyReviewData {
  id?: number
  reviewDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  totalInstrumentsScanned: number
  newInstrumentsFound: number
  removedInstruments: number
  updatedInstruments: number
  pendingApprovals: number
  autoApproved: number
  userRejected: number
  scanStartedAt?: string
  scanCompletedAt?: string
  userReviewStartedAt?: string
  userReviewCompletedAt?: string
  summary?: any
  errors?: any
  claudeReport?: any
  createdAt: string
  updatedAt: string
}

export interface InstrumentCandidate {
  id?: number
  symbol: string
  name?: string
  market?: string
  sector?: string
  marketCap?: number
  avgVolume?: number
  esgScore?: number
  veganScore?: number
  claudeAnalysis?: string
  recommendation: 'STRONG_ADD' | 'ADD' | 'CONSIDER' | 'REJECT'
  confidenceScore: number
  reasons?: string
  discoveredDate: string
  reviewId?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADDED'
  userDecisionDate?: string
  userNotes?: string
}

export interface RemovalCandidate {
  id?: number
  instrumentId: number
  ticker?: string
  name?: string
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  lostCriteria?: string
  currentEsgScore?: number
  currentVeganScore?: number
  previousEsgScore?: number
  previousVeganScore?: number
  claudeAnalysis?: string
  recommendation: 'REMOVE_IMMEDIATELY' | 'REMOVE' | 'MONITOR' | 'KEEP'
  confidenceScore: number
  discoveredDate: string
  reviewId?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED'
  userDecisionDate?: string
  userNotes?: string
}

export interface ReviewCandidates {
  additions: InstrumentCandidate[]
  removals: RemovalCandidate[]
}

export interface WatchlistStats {
  totalInstruments: number
  esgCompliant: number
  veganFriendly: number
  bySection: Record<string, number>
  utilizationPercentage: number
  availableSlots: number
}

export interface OptimizationSuggestion {
  type: string
  message: string
  priority: 'low' | 'medium' | 'high'
}

export interface CurrentReviewResponse {
  review: MonthlyReviewData
  candidates: ReviewCandidates
  pendingChanges: {
    additions: InstrumentCandidate[]
    removals: RemovalCandidate[]
  }
  stats: WatchlistStats
  needsUserAction: boolean
}

export interface ReviewHistoryResponse {
  reviews: MonthlyReviewData[]
  stats: {
    totalReviews: number
    completedReviews: number
    pendingReviews: number
    failedReviews: number
    avgInstrumentsScanned: number
    avgNewInstruments: number
    avgProcessingTime: number
    lastReviewDate?: string
  }
  pagination: {
    limit: number
    offset: number
    total: number
  }
}

export interface JobStatus {
  isRunning: boolean
  nextReviewDate: string
  nextReminderDate: string
  nextStatusCheck: string
  nextCleanup: string
  timezone: string
}

export interface ApplyChangesResult {
  applied: number
  failed: number
  errors: Array<{ candidateId: number, error: string }>
  summary: {
    added: string[]
    removed: string[]
    updated: string[]
  }
}

export interface PreviewChanges {
  current: WatchlistStats
  candidates: ReviewCandidates
  projected: WatchlistStats
  impact: {
    instrumentChange: number
    esgChange: number
    veganChange: number
    willExceedLimit: boolean
  }
}

export interface WatchlistStatsResponse {
  stats: WatchlistStats
  suggestions: OptimizationSuggestion[]
  managementStats: {
    total: number
    pending: number
    approved: number
    rejected: number
    avgConfidence: number
  }
}

class MonthlyReviewService {
  /**
   * Get current or latest review
   */
  async getCurrentReview(): Promise<CurrentReviewResponse | null> {
    const response = await api.get('/monthly-review/current')
    return response.data?.data || null
  }

  /**
   * Get specific review by ID
   */
  async getReview(id: number): Promise<{ review: MonthlyReviewData, candidates: ReviewCandidates }> {
    const response = await api.get(`/monthly-review/${id}`)
    return response.data.data
  }

  /**
   * Get review history with pagination
   */
  async getReviewHistory(offset = 0, limit = 50): Promise<ReviewHistoryResponse> {
    const response = await api.get(`/monthly-review/history?offset=${offset}&limit=${limit}`)
    return response.data.data
  }

  /**
   * Get candidates for a specific review
   */
  async getReviewCandidates(reviewId: number): Promise<{ candidates: ReviewCandidates, preview: PreviewChanges }> {
    const response = await api.get(`/monthly-review/${reviewId}/candidates`)
    return response.data.data
  }

  /**
   * Approve a specific candidate
   */
  async approveCandidate(
    reviewId: number,
    candidateId: number, 
    candidateType: 'addition' | 'removal',
    notes?: string
  ): Promise<void> {
    await api.post(`/monthly-review/${reviewId}/candidates/${candidateId}/approve?type=${candidateType}`, {
      notes
    })
  }

  /**
   * Reject a specific candidate
   */
  async rejectCandidate(
    reviewId: number,
    candidateId: number, 
    candidateType: 'addition' | 'removal',
    notes?: string
  ): Promise<void> {
    await api.post(`/monthly-review/${reviewId}/candidates/${candidateId}/reject?type=${candidateType}`, {
      notes
    })
  }

  /**
   * Bulk approve or reject candidates
   */
  async bulkUpdateCandidates(data: {
    reviewId: number
    candidateIds: number[]
    candidateType: 'addition' | 'removal'
    action: 'approve' | 'reject'
    notes?: string
  }): Promise<{ updatedCount: number }> {
    const { reviewId, candidateIds, candidateType, action, notes } = data
    const response = await api.post(`/monthly-review/${reviewId}/candidates/bulk-update`, {
      candidateIds,
      candidateType,
      action,
      notes
    })
    return response.data.data
  }

  /**
   * Apply approved changes to watchlist
   */
  async applyChanges(reviewId: number, dryRun = false): Promise<ApplyChangesResult> {
    const response = await api.post(`/monthly-review/${reviewId}/apply-changes`, {
      dryRun
    })
    return response.data.data
  }

  /**
   * Get all pending changes across reviews
   */
  async getPendingChanges(): Promise<{
    pendingChanges: { additions: InstrumentCandidate[], removals: RemovalCandidate[] }
    stats: WatchlistStats
    totalPending: number
  }> {
    const response = await api.get('/monthly-review/pending')
    return response.data.data
  }

  /**
   * Manually trigger a review
   */
  async triggerManualReview(): Promise<void> {
    await api.post('/monthly-review/trigger-manual')
  }

  /**
   * Get job status and scheduling information
   */
  async getJobStatus(): Promise<JobStatus> {
    const response = await api.get('/monthly-review/job-status')
    return response.data.data
  }

  /**
   * Get current watchlist statistics and optimization suggestions
   */
  async getWatchlistStats(): Promise<WatchlistStatsResponse> {
    const response = await api.get('/monthly-review/watchlist-stats')
    return response.data.data
  }

  /**
   * Preview impact of potential changes
   */
  async previewChanges(reviewId: number): Promise<PreviewChanges> {
    const response = await api.get(`/monthly-review/${reviewId}/preview`)
    return response.data.data
  }

  /**
   * Get watchlist change history
   */
  async getChangeHistory(limit = 100, instrumentId?: number): Promise<{
    history: any[]
    pagination: { limit: number, count: number }
  }> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (instrumentId) {
      params.append('instrumentId', instrumentId.toString())
    }
    
    const response = await api.get(`/monthly-review/change-history?${params}`)
    return response.data.data
  }

  /**
   * Create manual watchlist change
   */
  async createManualChange(
    instrumentId: number,
    action: 'ADD' | 'REMOVE' | 'UPDATE',
    reason: string
  ): Promise<any> {
    const response = await api.post('/monthly-review/manual-change', {
      instrumentId,
      action,
      reason
    })
    return response.data.data
  }

  /**
   * Get comprehensive statistics
   */
  async getStats(): Promise<{
    reviews: any
    watchlist: WatchlistStats
    management: any
    suggestions: OptimizationSuggestion[]
  }> {
    const response = await api.get('/monthly-review/stats')
    return response.data.data
  }
}

export const monthlyReviewService = new MonthlyReviewService()
export default monthlyReviewService