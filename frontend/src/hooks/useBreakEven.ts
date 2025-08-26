import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import breakEvenService from '../services/breakEvenService'

// Query keys
export const BREAK_EVEN_QUERY_KEYS = {
  all: ['breakEven'] as const,
  calculation: (tradeId: number) => [...BREAK_EVEN_QUERY_KEYS.all, 'calculation', tradeId] as const,
  projection: (tradeId: number, params?: any) => [...BREAK_EVEN_QUERY_KEYS.all, 'projection', tradeId, params] as const,
  optimization: (tradeId: number) => [...BREAK_EVEN_QUERY_KEYS.all, 'optimization', tradeId] as const,
  portfolioSummary: () => [...BREAK_EVEN_QUERY_KEYS.all, 'portfolio-summary'] as const,
  summary: () => [...BREAK_EVEN_QUERY_KEYS.all, 'summary'] as const,
  matrix: (params: any) => [...BREAK_EVEN_QUERY_KEYS.all, 'matrix', params] as const,
  trade: (tradeId: number) => [...BREAK_EVEN_QUERY_KEYS.all, 'trade', tradeId] as const,
  health: () => [...BREAK_EVEN_QUERY_KEYS.all, 'health'] as const,
}

// Configuration
const DEFAULT_STALE_TIME = 5 * 60 * 1000 // 5 minutes
const DEFAULT_CACHE_TIME = 10 * 60 * 1000 // 10 minutes
const SLOW_REFRESH_INTERVAL = 5 * 60 * 1000 // 5 minutes for break-even data

/**
 * Hook para calcular break-even de una operación
 */
export function useBreakEvenCalculation(
  tradeId: number,
  params?: {
    currentPrice?: number
    projectionMonths?: number
    inflationRate?: number
    includeProjectedCustody?: boolean
    scenarioType?: string
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.calculation(tradeId),
    queryFn: () => breakEvenService.calculateBreakEven({ tradeId, ...params }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    enabled: options?.enabled ?? !!tradeId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para generar proyecciones de break-even
 */
export function useBreakEvenProjection(
  tradeId: number,
  params?: {
    inflationRate?: number
    months?: number
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.projection(tradeId, params),
    queryFn: () => breakEvenService.generateProjection({ tradeId, ...params }),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    enabled: options?.enabled ?? !!tradeId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener optimizaciones de break-even
 */
export function useBreakEvenOptimization(
  tradeId: number,
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.optimization(tradeId),
    queryFn: () => breakEvenService.getOptimizations(tradeId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    enabled: options?.enabled ?? !!tradeId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener resumen de break-even del portafolio
 */
export function usePortfolioBreakEvenSummary(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.portfolioSummary(),
    queryFn: () => breakEvenService.getPortfolioSummary(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener resumen estadístico
 */
export function useBreakEvenSummary(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.summary(),
    queryFn: () => breakEvenService.getSummary(),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    refetchInterval: options?.refetchInterval || SLOW_REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para generar matriz de sensibilidad
 */
export function useBreakEvenMatrix(
  params: {
    instrumentId: number
    purchasePrice: number
    quantity: number
    inflationRates: number[]
    timeHorizons: number[]
  },
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.matrix(params),
    queryFn: () => breakEvenService.generateMatrix(params),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    enabled: options?.enabled ?? !!(params.instrumentId && params.purchasePrice && params.quantity),
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para obtener análisis por trade ID
 */
export function useBreakEvenByTradeId(
  tradeId: number,
  options?: {
    enabled?: boolean
  }
) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.trade(tradeId),
    queryFn: () => breakEvenService.getByTradeId(tradeId),
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_CACHE_TIME,
    enabled: options?.enabled ?? !!tradeId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para health check del servicio
 */
export function useBreakEvenHealth(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: BREAK_EVEN_QUERY_KEYS.health(),
    queryFn: () => breakEvenService.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds for health checks
    gcTime: 60 * 1000, // 1 minute
    refetchInterval: options?.refetchInterval || 60 * 1000, // 1 minute
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

// Mutations

/**
 * Mutation para calcular break-even
 */
export function useCalculateBreakEvenMutation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: {
      tradeId: number
      currentPrice?: number
      projectionMonths?: number
      inflationRate?: number
      includeProjectedCustody?: boolean
      scenarioType?: string
    }) => breakEvenService.calculateBreakEven(params),
    onSuccess: (data, variables) => {
      // Actualizar cache del cálculo específico
      queryClient.setQueryData(
        BREAK_EVEN_QUERY_KEYS.calculation(variables.tradeId),
        data
      )
      
      // Invalidar resúmenes para actualizar estadísticas
      queryClient.invalidateQueries({
        queryKey: BREAK_EVEN_QUERY_KEYS.summary()
      })
      queryClient.invalidateQueries({
        queryKey: BREAK_EVEN_QUERY_KEYS.portfolioSummary()
      })
    }
  })
}

/**
 * Mutation para comparar estrategias
 */
export function useCompareStrategiesMutation() {
  return useMutation({
    mutationFn: (params: {
      tradeId: number
      strategies: Array<{
        name: string
        sellPrice: number
        sellDate?: string
        additionalCosts?: number
      }>
    }) => breakEvenService.compareStrategies(params)
  })
}

/**
 * Mutation para simulación interactiva
 */
export function useBreakEvenSimulationMutation() {
  return useMutation({
    mutationFn: (inputs: {
      purchasePrice: number
      quantity: number
      currentPrice: number
      commissionRate?: number
      inflationRate?: number
      custodyMonths?: number
    }) => breakEvenService.simulate(inputs)
  })
}

// Utility hooks

/**
 * Hook para invalidar todas las queries de break-even
 */
export function useInvalidateBreakEvenQueries() {
  const queryClient = useQueryClient()
  
  return () => {
    queryClient.invalidateQueries({
      queryKey: BREAK_EVEN_QUERY_KEYS.all
    })
  }
}

/**
 * Hook para prefetch de datos relacionados
 */
export function usePrefetchBreakEvenData() {
  const queryClient = useQueryClient()
  
  return {
    prefetchSummary: () => {
      queryClient.prefetchQuery({
        queryKey: BREAK_EVEN_QUERY_KEYS.summary(),
        queryFn: () => breakEvenService.getSummary(),
        staleTime: DEFAULT_STALE_TIME
      })
    },
    prefetchPortfolioSummary: () => {
      queryClient.prefetchQuery({
        queryKey: BREAK_EVEN_QUERY_KEYS.portfolioSummary(),
        queryFn: () => breakEvenService.getPortfolioSummary(),
        staleTime: DEFAULT_STALE_TIME
      })
    },
    prefetchCalculation: (tradeId: number) => {
      queryClient.prefetchQuery({
        queryKey: BREAK_EVEN_QUERY_KEYS.calculation(tradeId),
        queryFn: () => breakEvenService.calculateBreakEven({ tradeId }),
        staleTime: DEFAULT_STALE_TIME
      })
    }
  }
}