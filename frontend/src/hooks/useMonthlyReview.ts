import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { monthlyReviewService } from '../services/monthlyReviewService'

// Query keys
export const monthlyReviewKeys = {
  all: ['monthlyReview'] as const,
  current: () => [...monthlyReviewKeys.all, 'current'] as const,
  review: (id: number) => [...monthlyReviewKeys.all, 'review', id] as const,
  history: (offset: number, limit: number) => [...monthlyReviewKeys.all, 'history', offset, limit] as const,
  candidates: (reviewId: number) => [...monthlyReviewKeys.all, 'candidates', reviewId] as const,
  pending: () => [...monthlyReviewKeys.all, 'pending'] as const,
  jobStatus: () => [...monthlyReviewKeys.all, 'jobStatus'] as const,
  watchlistStats: () => [...monthlyReviewKeys.all, 'watchlistStats'] as const,
  preview: (reviewId: number) => [...monthlyReviewKeys.all, 'preview', reviewId] as const,
  changeHistory: (limit: number, instrumentId?: number) => [...monthlyReviewKeys.all, 'changeHistory', limit, instrumentId] as const,
  stats: () => [...monthlyReviewKeys.all, 'stats'] as const,
}

export function useMonthlyReview(offset = 0, limit = 50) {
  const queryClient = useQueryClient()

  // Queries
  const currentReview = useQuery({
    queryKey: monthlyReviewKeys.current(),
    queryFn: monthlyReviewService.getCurrentReview,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes for active reviews
    refetchIntervalInBackground: false,
  })

  const reviewHistory = useQuery({
    queryKey: monthlyReviewKeys.history(offset, limit),
    queryFn: () => monthlyReviewService.getReviewHistory(offset, limit),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })

  const pendingChanges = useQuery({
    queryKey: monthlyReviewKeys.pending(),
    queryFn: monthlyReviewService.getPendingChanges,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const jobStatus = useQuery({
    queryKey: monthlyReviewKeys.jobStatus(),
    queryFn: monthlyReviewService.getJobStatus,
    staleTime: 1000 * 60 * 15, // 15 minutes
  })

  const watchlistStats = useQuery({
    queryKey: monthlyReviewKeys.watchlistStats(),
    queryFn: monthlyReviewService.getWatchlistStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const comprehensiveStats = useQuery({
    queryKey: monthlyReviewKeys.stats(),
    queryFn: monthlyReviewService.getStats,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })

  // Conditional queries for preview changes
  const previewChanges = useQuery({
    queryKey: monthlyReviewKeys.preview(currentReview.data?.review?.id || 0),
    queryFn: () => monthlyReviewService.previewChanges(currentReview.data!.review.id!),
    enabled: !!currentReview.data?.review?.id && currentReview.data.needsUserAction,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Mutations
  const getReviewDetails = useMutation({
    mutationFn: (reviewId: number) => monthlyReviewService.getReview(reviewId),
    onSuccess: (data, reviewId) => {
      queryClient.setQueryData(monthlyReviewKeys.review(reviewId), data)
    },
  })

  const approveCandidate = useMutation({
    mutationFn: ({ 
      reviewId, 
      candidateId, 
      candidateType, 
      notes 
    }: { 
      reviewId: number
      candidateId: number
      candidateType: 'addition' | 'removal'
      notes?: string 
    }) => monthlyReviewService.approveCandidate(reviewId, candidateId, candidateType, notes),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.current() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.pending() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.watchlistStats() })
      if (currentReview.data?.review?.id) {
        queryClient.invalidateQueries({ 
          queryKey: monthlyReviewKeys.preview(currentReview.data.review.id) 
        })
      }
    },
  })

  const rejectCandidate = useMutation({
    mutationFn: ({ 
      reviewId, 
      candidateId, 
      candidateType, 
      notes 
    }: { 
      reviewId: number
      candidateId: number
      candidateType: 'addition' | 'removal'
      notes?: string 
    }) => monthlyReviewService.rejectCandidate(reviewId, candidateId, candidateType, notes),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.current() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.pending() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.watchlistStats() })
      if (currentReview.data?.review?.id) {
        queryClient.invalidateQueries({ 
          queryKey: monthlyReviewKeys.preview(currentReview.data.review.id) 
        })
      }
    },
  })

  const bulkUpdateCandidates = useMutation({
    mutationFn: (data: { 
      reviewId: number
      candidateIds: number[]
      candidateType: 'addition' | 'removal'
      action: 'approve' | 'reject'
      notes?: string 
    }) => monthlyReviewService.bulkUpdateCandidates(data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.current() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.pending() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.watchlistStats() })
      if (currentReview.data?.review?.id) {
        queryClient.invalidateQueries({ 
          queryKey: monthlyReviewKeys.preview(currentReview.data.review.id) 
        })
      }
    },
  })

  const applyChanges = useMutation({
    mutationFn: ({ reviewId, dryRun = false }: { reviewId: number, dryRun?: boolean }) => 
      monthlyReviewService.applyChanges(reviewId, dryRun),
    onSuccess: (_data, variables) => {
      // If not a dry run, invalidate all relevant data
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.all })
        // Also invalidate related data like instruments and portfolio
        queryClient.invalidateQueries({ queryKey: ['instruments'] })
        queryClient.invalidateQueries({ queryKey: ['portfolio'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      }
    },
  })

  const triggerManualReview = useMutation({
    mutationFn: monthlyReviewService.triggerManualReview,
    onSuccess: () => {
      // Wait a bit then refetch current review
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.current() })
        queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.jobStatus() })
      }, 2000)
    },
  })

  const createManualChange = useMutation({
    mutationFn: ({ 
      instrumentId, 
      action, 
      reason 
    }: { 
      instrumentId: number
      action: 'ADD' | 'REMOVE' | 'UPDATE'
      reason: string 
    }) => monthlyReviewService.createManualChange(instrumentId, action, reason),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.watchlistStats() })
      queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.changeHistory(100) })
      queryClient.invalidateQueries({ queryKey: ['instruments'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  // Helper functions for refetching
  const refetchCurrent = () => {
    return queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.current() })
  }

  const refetchHistory = () => {
    return queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.history(offset, limit) })
  }

  const refetchStats = () => {
    return queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.watchlistStats() })
  }

  return {
    // Queries
    currentReview,
    reviewHistory,
    pendingChanges,
    jobStatus,
    watchlistStats,
    previewChanges,
    comprehensiveStats,
    
    // Mutations
    getReviewDetails,
    approveCandidate,
    rejectCandidate,
    bulkUpdateCandidates,
    applyChanges,
    triggerManualReview,
    createManualChange,
    
    // Helper functions
    refetchCurrent,
    refetchHistory,
    refetchStats,
    
    // Loading states
    isLoadingCurrent: currentReview.isLoading,
    isLoadingHistory: reviewHistory.isLoading,
    isLoadingPending: pendingChanges.isLoading,
    isLoadingJobStatus: jobStatus.isLoading,
    isLoadingWatchlistStats: watchlistStats.isLoading,
    isLoadingPreview: previewChanges.isLoading,
    isLoadingStats: comprehensiveStats.isLoading,
    
    // Individual data access (for convenience)
    reviewDetails: getReviewDetails.data,
  }
}

// Specialized hooks for specific use cases
export function useReviewDetails(reviewId: number) {
  return useQuery({
    queryKey: monthlyReviewKeys.review(reviewId),
    queryFn: () => monthlyReviewService.getReview(reviewId),
    enabled: !!reviewId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useReviewCandidates(reviewId: number) {
  return useQuery({
    queryKey: monthlyReviewKeys.candidates(reviewId),
    queryFn: () => monthlyReviewService.getReviewCandidates(reviewId),
    enabled: !!reviewId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useChangeHistory(limit = 100, instrumentId?: number) {
  return useQuery({
    queryKey: monthlyReviewKeys.changeHistory(limit, instrumentId),
    queryFn: () => monthlyReviewService.getChangeHistory(limit, instrumentId),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// Hook for real-time updates during active reviews
export function useActiveReviewUpdates() {
  const queryClient = useQueryClient()
  
  const currentReview = useQuery({
    queryKey: monthlyReviewKeys.current(),
    queryFn: monthlyReviewService.getCurrentReview,
    refetchInterval: (data) => {
      // More frequent updates if review is in progress
      if (data && typeof data === 'object' && 'review' in data && 
          data.review && typeof data.review === 'object' && 'status' in data.review &&
          data.review.status === 'IN_PROGRESS') {
        return 1000 * 30 // 30 seconds
      }
      return 1000 * 60 * 5 // 5 minutes for completed/pending reviews
    },
    refetchIntervalInBackground: false,
  })

  return {
    currentReview,
    isActiveReview: currentReview.data?.review?.status === 'IN_PROGRESS',
    needsUserAction: currentReview.data?.needsUserAction || false,
    refreshReview: () => queryClient.invalidateQueries({ queryKey: monthlyReviewKeys.current() }),
  }
}

export default useMonthlyReview