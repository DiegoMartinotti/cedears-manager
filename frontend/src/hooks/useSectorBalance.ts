import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import sectorBalanceService from '../services/sectorBalanceService'
// Types are used by the service and returned by hooks - avoiding unnecessary imports

// ============================================================================
// Query Keys
// ============================================================================

export const sectorBalanceKeys = {
  all: ['sectorBalance'] as const,
  overview: () => [...sectorBalanceKeys.all, 'overview'] as const,
  distribution: () => [...sectorBalanceKeys.all, 'distribution'] as const,
  recommendations: () => [...sectorBalanceKeys.all, 'recommendations'] as const,
  alerts: (severity?: string) => [...sectorBalanceKeys.all, 'alerts', severity] as const,
  healthScore: () => [...sectorBalanceKeys.all, 'healthScore'] as const,
  sectorStats: () => [...sectorBalanceKeys.all, 'sectorStats'] as const,
  riskAnalysis: () => [...sectorBalanceKeys.all, 'riskAnalysis'] as const,
  performance: (months: number) => [...sectorBalanceKeys.all, 'performance', months] as const,
  classifications: (params?: any) => [...sectorBalanceKeys.all, 'classifications', params] as const,
  targets: (activeOnly: boolean) => [...sectorBalanceKeys.all, 'targets', activeOnly] as const
}

// ============================================================================
// Main Overview Hook
// ============================================================================

/**
 * Get complete sector balance overview
 */
export function useSectorBalanceOverview() {
  return useQuery({
    queryKey: sectorBalanceKeys.overview(),
    queryFn: () => sectorBalanceService.getOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

// ============================================================================
// Distribution and Analysis Hooks
// ============================================================================

/**
 * Get sector distribution
 */
export function useSectorDistribution() {
  return useQuery({
    queryKey: sectorBalanceKeys.distribution(),
    queryFn: () => sectorBalanceService.getDistribution(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Run sector analysis
 */
export function useRunSectorAnalysis() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => sectorBalanceService.runAnalysis(),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.all })
    },
    onError: (error) => {
      console.error('Error running sector analysis:', error)
    }
  })
}

// ============================================================================
// Recommendations Hooks
// ============================================================================

/**
 * Get rebalancing recommendations
 */
export function useRebalanceRecommendations() {
  return useQuery({
    queryKey: sectorBalanceKeys.recommendations(),
    queryFn: () => sectorBalanceService.getRecommendations(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Simulate rebalancing scenario
 */
export function useSimulateRebalance() {
  return useMutation({
    mutationFn: (params: {
      targetAllocations: Record<string, number>
      maxTransactionCost?: number
      minTradeSize?: number
      excludeInstruments?: number[]
    }) => sectorBalanceService.simulateRebalance(params),
    onError: (error) => {
      console.error('Error simulating rebalance:', error)
    }
  })
}

// ============================================================================
// Alerts Hooks
// ============================================================================

/**
 * Get concentration alerts
 */
export function useConcentrationAlerts(severity?: string) {
  return useQuery({
    queryKey: sectorBalanceKeys.alerts(severity),
    queryFn: () => sectorBalanceService.getAlerts(severity),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2
  })
}

/**
 * Acknowledge alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (alertId: number) => sectorBalanceService.acknowledgeAlert(alertId),
    onSuccess: () => {
      // Invalidate alerts queries
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.alerts() })
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.overview() })
    },
    onError: (error) => {
      console.error('Error acknowledging alert:', error)
    }
  })
}

// ============================================================================
// Advanced Analysis Hooks
// ============================================================================

/**
 * Get portfolio health score
 */
export function useHealthScore() {
  return useQuery({
    queryKey: sectorBalanceKeys.healthScore(),
    queryFn: () => sectorBalanceService.getHealthScore(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Get sector statistics
 */
export function useSectorStats() {
  return useQuery({
    queryKey: sectorBalanceKeys.sectorStats(),
    queryFn: () => sectorBalanceService.getSectorStats(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Get risk analysis
 */
export function useRiskAnalysis() {
  return useQuery({
    queryKey: sectorBalanceKeys.riskAnalysis(),
    queryFn: () => sectorBalanceService.getRiskAnalysis(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Get sector performance analysis
 */
export function useSectorPerformance(months: number = 12) {
  return useQuery({
    queryKey: sectorBalanceKeys.performance(months),
    queryFn: () => sectorBalanceService.getPerformanceAnalysis(months),
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    enabled: months >= 1 && months <= 60
  })
}

// ============================================================================
// Classification Hooks
// ============================================================================

/**
 * Get sector classifications
 */
export function useSectorClassifications(params?: {
  sector?: string
  source?: string
  minConfidence?: number
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: sectorBalanceKeys.classifications(params),
    queryFn: () => sectorBalanceService.getClassifications(params),
    staleTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Classify instruments
 */
export function useClassifyInstruments() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params?: {
      instrumentIds?: number[]
      force?: boolean
    }) => sectorBalanceService.classifyInstruments(params),
    onSuccess: () => {
      // Invalidate classification queries
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.classifications() })
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.distribution() })
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.overview() })
    },
    onError: (error) => {
      console.error('Error classifying instruments:', error)
    }
  })
}

/**
 * Get classification quality report
 */
export function useClassificationQuality() {
  return useQuery({
    queryKey: [...sectorBalanceKeys.all, 'classificationQuality'],
    queryFn: () => sectorBalanceService.getClassificationQuality(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2
  })
}

// ============================================================================
// Configuration Hooks
// ============================================================================

/**
 * Get sector balance targets
 */
export function useSectorTargets(activeOnly: boolean = true) {
  return useQuery({
    queryKey: sectorBalanceKeys.targets(activeOnly),
    queryFn: () => sectorBalanceService.getTargets(activeOnly),
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * Update sector target
 */
export function useUpdateSectorTarget() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ targetId, data }: { targetId: number; data: any }) => 
      sectorBalanceService.updateTarget(targetId, data),
    onSuccess: () => {
      // Invalidate targets and related queries
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.targets(true) })
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.targets(false) })
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.recommendations() })
    },
    onError: (error) => {
      console.error('Error updating sector target:', error)
    }
  })
}

// ============================================================================
// Composite Hooks for Dashboard
// ============================================================================

/**
 * Get all data needed for the main dashboard
 */
export function useSectorBalanceDashboard() {
  const overview = useSectorBalanceOverview()
  const healthScore = useHealthScore()
  const alerts = useConcentrationAlerts()
  const recommendations = useRebalanceRecommendations()
  
  return {
    overview,
    healthScore,
    alerts,
    recommendations,
    isLoading: overview.isLoading || healthScore.isLoading || alerts.isLoading || recommendations.isLoading,
    error: overview.error || healthScore.error || alerts.error || recommendations.error,
    refetchAll: () => {
      overview.refetch()
      healthScore.refetch()
      alerts.refetch()
      recommendations.refetch()
    }
  }
}

/**
 * Get data for analytics dashboard
 */
export function useSectorBalanceAnalytics(months: number = 12) {
  const sectorStats = useSectorStats()
  const riskAnalysis = useRiskAnalysis()
  const performance = useSectorPerformance(months)
  const classificationQuality = useClassificationQuality()
  
  return {
    sectorStats,
    riskAnalysis,
    performance,
    classificationQuality,
    isLoading: sectorStats.isLoading || riskAnalysis.isLoading || performance.isLoading || classificationQuality.isLoading,
    error: sectorStats.error || riskAnalysis.error || performance.error || classificationQuality.error,
    refetchAll: () => {
      sectorStats.refetch()
      riskAnalysis.refetch()
      performance.refetch()
      classificationQuality.refetch()
    }
  }
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Health check hook
 */
export function useSectorBalanceHealth() {
  return useQuery({
    queryKey: [...sectorBalanceKeys.all, 'health'],
    queryFn: () => sectorBalanceService.healthCheck(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    retry: 1
  })
}

/**
 * Prefetch data for better UX
 */
export function usePrefetchSectorBalance() {
  const queryClient = useQueryClient()
  
  const prefetchOverview = () => {
    queryClient.prefetchQuery({
      queryKey: sectorBalanceKeys.overview(),
      queryFn: () => sectorBalanceService.getOverview(),
      staleTime: 5 * 60 * 1000
    })
  }
  
  const prefetchDistribution = () => {
    queryClient.prefetchQuery({
      queryKey: sectorBalanceKeys.distribution(),
      queryFn: () => sectorBalanceService.getDistribution(),
      staleTime: 3 * 60 * 1000
    })
  }
  
  const prefetchHealthScore = () => {
    queryClient.prefetchQuery({
      queryKey: sectorBalanceKeys.healthScore(),
      queryFn: () => sectorBalanceService.getHealthScore(),
      staleTime: 15 * 60 * 1000
    })
  }
  
  return {
    prefetchOverview,
    prefetchDistribution,
    prefetchHealthScore,
    prefetchAll: () => {
      prefetchOverview()
      prefetchDistribution()
      prefetchHealthScore()
    }
  }
}

/**
 * Auto-refresh hook for real-time updates
 */
export function useAutoRefreshSectorBalance(intervalMs: number = 5 * 60 * 1000) {
  const queryClient = useQueryClient()

  const refreshTrigger = useQuery({
    queryKey: [...sectorBalanceKeys.all, 'autoRefresh'],
    queryFn: () => Promise.resolve(Date.now()),
    refetchInterval: intervalMs,
    refetchIntervalInBackground: false
  })

  useEffect(() => {
    if (refreshTrigger.isSuccess) {
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.overview() })
      queryClient.invalidateQueries({ queryKey: sectorBalanceKeys.alerts() })
    }
  }, [queryClient, refreshTrigger.data, refreshTrigger.isSuccess])

  return refreshTrigger
}

