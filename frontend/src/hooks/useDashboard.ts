import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardService } from '../services/dashboardService'
// Types are imported where needed to avoid unused imports

// Query keys
export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'] as const,
  summary: () => [...DASHBOARD_QUERY_KEYS.all, 'summary'] as const,
  portfolioSummary: () => [...DASHBOARD_QUERY_KEYS.all, 'portfolio-summary'] as const,
  positions: (limit?: number) => [...DASHBOARD_QUERY_KEYS.all, 'positions', limit] as const,
  marketSummary: () => [...DASHBOARD_QUERY_KEYS.all, 'market-summary'] as const,
  performance: () => [...DASHBOARD_QUERY_KEYS.all, 'performance'] as const,
  distribution: () => [...DASHBOARD_QUERY_KEYS.all, 'distribution'] as const,
  health: () => [...DASHBOARD_QUERY_KEYS.all, 'health'] as const,
}

// Configuration
const DEFAULT_STALE_TIME = 2 * 60 * 1000 // 2 minutes
const DEFAULT_CACHE_TIME = 5 * 60 * 1000 // 5 minutes
const FAST_REFRESH_INTERVAL = 30 * 1000 // 30 seconds for market data
const SLOW_REFRESH_INTERVAL = 2 * 60 * 1000 // 2 minutes for portfolio data

/**
 * Hook para obtener el resumen completo del dashboard
 */
export function useDashboardSummary(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.summary(),
    queryFn: () => dashboardService.getDashboardSummary(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener el resumen del portfolio
 */
export function usePortfolioSummary(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.portfolioSummary(),
    queryFn: () => dashboardService.getPortfolioSummary(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener las posiciones actuales
 */
export function useCurrentPositions(
  limit: number = 20,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.positions(limit),
    queryFn: () => dashboardService.getCurrentPositions(limit),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener el resumen del mercado
 */
export function useMarketSummary(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.marketSummary(),
    queryFn: () => dashboardService.getMarketSummary(),
    staleTime: 30 * 1000, // 30 seconds for market data
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || FAST_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener las métricas de performance
 */
export function usePerformanceMetrics(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.performance(),
    queryFn: () => dashboardService.getPerformanceMetrics(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener los datos de distribución
 */
export function useDistributionData(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.distribution(),
    queryFn: () => dashboardService.getDistributionData(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para verificar el estado de salud del dashboard
 */
export function useDashboardHealth(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.health(),
    queryFn: () => dashboardService.getHealthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: options?.refetchInterval || 60 * 1000, // 1 minute
    enabled: options?.enabled ?? true,
    retry: 1,
    retryDelay: 1000
  })
}

/**
 * Hook para refrescar los datos del dashboard
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => dashboardService.refreshDashboard(),
    onSuccess: (data) => {
      // Actualizar el cache con los nuevos datos
      queryClient.setQueryData(DASHBOARD_QUERY_KEYS.summary(), data)
      
      // Invalidar todas las queries relacionadas para forzar refetch
      queryClient.invalidateQueries({ 
        queryKey: DASHBOARD_QUERY_KEYS.all 
      })
    },
    onError: (error) => {
      console.error('Error refreshing dashboard:', error)
    }
  })
}

/**
 * Hook compuesto que combina los datos principales del dashboard
 */
export function useDashboardData(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  const summary = useDashboardSummary(options)
  const portfolioSummary = usePortfolioSummary(options)
  const positions = useCurrentPositions(10, options)
  const marketSummary = useMarketSummary(options)
  const performance = usePerformanceMetrics(options)
  const distribution = useDistributionData(options)

  return {
    summary,
    portfolioSummary,
    positions,
    marketSummary,
    performance,
    distribution,
    isLoading: summary.isLoading || portfolioSummary.isLoading || positions.isLoading,
    isError: summary.isError || portfolioSummary.isError || positions.isError,
    error: summary.error || portfolioSummary.error || positions.error
  }
}

/**
 * Hook para invalidar todas las queries del dashboard
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ 
      queryKey: DASHBOARD_QUERY_KEYS.all 
    })
  }
}