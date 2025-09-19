import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { technicalIndicatorService, type TechnicalIndicatorFilters, type ActiveSignalsFilters, type CalculateIndicatorsRequest, type TechnicalIndicatorHistory } from '../services/technicalIndicatorService'

export const TECHNICAL_INDICATORS_KEYS = {
  all: ['technical-indicators'] as const,
  lists: () => [...TECHNICAL_INDICATORS_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any> = {}) => [...TECHNICAL_INDICATORS_KEYS.lists(), filters] as const,
  details: () => [...TECHNICAL_INDICATORS_KEYS.all, 'detail'] as const,
  detail: (symbol: string) => [...TECHNICAL_INDICATORS_KEYS.details(), symbol] as const,
  history: (symbol: string, filters: Record<string, any> = {}) => [...TECHNICAL_INDICATORS_KEYS.detail(symbol), 'history', filters] as const,
  signals: (filters: Record<string, any> = {}) => [...TECHNICAL_INDICATORS_KEYS.all, 'signals', filters] as const,
  stats: () => [...TECHNICAL_INDICATORS_KEYS.all, 'stats'] as const,
  extremes: (symbol: string, days?: number) => [...TECHNICAL_INDICATORS_KEYS.detail(symbol), 'extremes', days] as const,
  summary: (symbol: string) => [...TECHNICAL_INDICATORS_KEYS.detail(symbol), 'summary'] as const,
  jobStatus: () => [...TECHNICAL_INDICATORS_KEYS.all, 'job-status'] as const,
}

/**
 * Hook para obtener los últimos indicadores técnicos de un símbolo
 */
export function useLatestIndicators(symbol: string, filters?: TechnicalIndicatorFilters) {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.detail(symbol),
    queryFn: () => technicalIndicatorService.getLatestIndicators(symbol, filters),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  })
}

/**
 * Hook para obtener el historial de indicadores técnicos
 */
export function useIndicatorHistory(symbol: string, filters?: TechnicalIndicatorHistory) {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.history(symbol, filters || {}),
    queryFn: () => technicalIndicatorService.getIndicatorHistory(symbol, filters),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook para obtener señales activas de trading
 */
export function useActiveSignals(filters?: ActiveSignalsFilters) {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.signals(filters || {}),
    queryFn: () => technicalIndicatorService.getActiveSignals(filters),
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 2 * 60 * 1000, // Actualizar cada 2 minutos
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Hook para obtener extremos de precio (mínimos/máximos anuales)
 */
export function useExtremes(symbol: string, days: number = 365) {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.extremes(symbol, days),
    queryFn: () => technicalIndicatorService.getExtremes(symbol, days),
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  })
}

/**
 * Hook para obtener estadísticas del sistema
 */
export function useTechnicalIndicatorStats() {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.stats(),
    queryFn: () => technicalIndicatorService.getStats(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Actualizar cada 10 minutos
  })
}

/**
 * Hook para obtener el estado del job
 */
export function useJobStatus() {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.jobStatus(),
    queryFn: () => technicalIndicatorService.getJobStatus(),
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Actualizar cada minuto
  })
}

/**
 * Hook para obtener resumen de indicadores por símbolo
 */
export function useIndicatorsSummary(symbol: string) {
  return useQuery({
    queryKey: TECHNICAL_INDICATORS_KEYS.summary(symbol),
    queryFn: () => technicalIndicatorService.getIndicatorsSummary(symbol),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Hook para calcular indicadores manualmente
 */
export function useCalculateIndicators() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: CalculateIndicatorsRequest) => 
      technicalIndicatorService.calculateIndicators(request),
    onSuccess: (_result, variables) => {
      // Invalidar caché relacionado
      if (variables.symbol) {
        queryClient.invalidateQueries({ 
          queryKey: TECHNICAL_INDICATORS_KEYS.detail(variables.symbol) 
        })
      } else if (variables.symbols) {
        variables.symbols.forEach(symbol => {
          queryClient.invalidateQueries({ 
            queryKey: TECHNICAL_INDICATORS_KEYS.detail(symbol) 
          })
        })
      } else {
        // Invalidar todo si fue cálculo masivo
        queryClient.invalidateQueries({ 
          queryKey: TECHNICAL_INDICATORS_KEYS.all 
        })
      }
      
      // Invalidar estadísticas
      queryClient.invalidateQueries({ 
        queryKey: TECHNICAL_INDICATORS_KEYS.stats() 
      })
    },
  })
}

/**
 * Hook para forzar ejecución del job
 */
export function useForceJobRun() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => technicalIndicatorService.forceJobRun(),
    onSuccess: () => {
      // Invalidar estado del job
      queryClient.invalidateQueries({ 
        queryKey: TECHNICAL_INDICATORS_KEYS.jobStatus() 
      })
      
      // Invalidar todos los indicadores después de un delay
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: TECHNICAL_INDICATORS_KEYS.all 
        })
      }, 10000) // 10 segundos para que el job procese
    },
  })
}

/**
 * Hook para limpiar indicadores antiguos
 */
export function useCleanupIndicators() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (days: number = 90) => technicalIndicatorService.cleanupOldIndicators(days),
    onSuccess: () => {
      // Invalidar estadísticas
      queryClient.invalidateQueries({ 
        queryKey: TECHNICAL_INDICATORS_KEYS.stats() 
      })
    },
  })
}

/**
 * Hook compuesto para obtener todas las señales activas con categorización
 */
export function useSignalsOverview() {
  const { data: buySignals, isLoading: loadingBuy } = useActiveSignals({ 
    signals: ['BUY'], 
    minStrength: 50, 
    limit: 10 
  })
  
  const { data: sellSignals, isLoading: loadingSell } = useActiveSignals({ 
    signals: ['SELL'], 
    minStrength: 50, 
    limit: 10 
  })

  return {
    buySignals: buySignals || [],
    sellSignals: sellSignals || [],
    isLoading: loadingBuy || loadingSell,
    totalSignals: (buySignals?.length || 0) + (sellSignals?.length || 0)
  }
}

/**
 * Hook para obtener indicadores de múltiples símbolos
 */
export function useMultipleIndicators(symbols: string[]) {
  symbols.map(symbol => ({
    queryKey: TECHNICAL_INDICATORS_KEYS.detail(symbol),
    queryFn: () => technicalIndicatorService.getLatestIndicators(symbol),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000,
  }))

  const results = useQuery({
    queryKey: ['multiple-indicators', symbols.sort().join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(
        symbols.map(symbol => technicalIndicatorService.getLatestIndicators(symbol))
      )
      
      return symbols.map((symbol, index) => ({
        symbol,
        indicators: results[index].status === 'fulfilled' ? results[index].value : [],
        error: results[index].status === 'rejected' ? results[index].reason : null
      }))
    },
    enabled: symbols.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  return {
    data: results.data || [],
    isLoading: results.isLoading,
    error: results.error,
    refetch: results.refetch
  }
}

/**
 * Hook para obtener análisis técnico completo de un símbolo
 */
export function useTechnicalAnalysis(symbol: string) {
  const { data: indicators, isLoading: loadingIndicators } = useLatestIndicators(symbol)
  const { data: extremes, isLoading: loadingExtremes } = useExtremes(symbol)
  const { data: summary, isLoading: loadingSummary } = useIndicatorsSummary(symbol)

  const isLoading = loadingIndicators || loadingExtremes || loadingSummary

  // Analizar las señales para generar recomendación general
  const getOverallSignal = () => {
    if (!indicators || indicators.length === 0) return 'HOLD'
    
    const signals = indicators.map(i => i.signal)
    const buyCount = signals.filter(s => s === 'BUY').length
    const sellCount = signals.filter(s => s === 'SELL').length
    
    if (buyCount > sellCount) return 'BUY'
    if (sellCount > buyCount) return 'SELL'
    return 'HOLD'
  }

  // Calcular fuerza promedio de las señales
  const getAverageStrength = () => {
    if (!indicators || indicators.length === 0) return 0
    
    const totalStrength = indicators.reduce((sum, i) => sum + i.strength, 0)
    return Math.round(totalStrength / indicators.length)
  }

  return {
    indicators: indicators || [],
    extremes,
    summary,
    isLoading,
    analysis: {
      overallSignal: getOverallSignal(),
      averageStrength: getAverageStrength(),
      indicatorCount: indicators?.length || 0,
      lastUpdate: indicators?.[0]?.timestamp || null
    }
  }
}