import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quoteService, QuoteWithInstrument, QuoteHistoryFilters, QuoteUpdateResult } from '@/services/quoteService'

// Hook para obtener cotización individual
export const useQuote = (symbol: string, forceRefresh: boolean = false) => {
  return useQuery({
    queryKey: ['quote', symbol, forceRefresh],
    queryFn: () => quoteService.getQuote(symbol, forceRefresh),
    enabled: !!symbol,
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

// Hook para obtener cotizaciones del watchlist
export const useWatchlistQuotes = (autoRefresh: boolean = true, refreshInterval: number = 30000) => {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  const query = useQuery({
    queryKey: ['watchlist-quotes'],
    queryFn: async () => {
      const quotes = await quoteService.getWatchlistQuotes()
      setLastUpdate(new Date())
      return quotes
    },
    staleTime: refreshInterval,
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: false,
    retry: 2
  })

  return {
    ...query,
    lastUpdate
  }
}

// Hook para obtener historial de cotizaciones
export const useQuoteHistory = (
  symbol: string, 
  filters?: QuoteHistoryFilters,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['quote-history', symbol, filters],
    queryFn: () => quoteService.getQuoteHistory(symbol, filters),
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2
  })
}

// Hook para obtener cotizaciones para gráficos
export const useQuoteChart = (
  symbol: string,
  timeRange: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' = '1M',
  enabled: boolean = true
) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)

  const query = useQuery({
    queryKey: ['quote-chart', symbol, selectedTimeRange],
    queryFn: () => quoteService.getQuotesForChart(symbol, selectedTimeRange),
    enabled: enabled && !!symbol,
    staleTime: selectedTimeRange === '1D' ? 60 * 1000 : 5 * 60 * 1000, // 1 min para 1D, 5 min para otros
    retry: 2
  })

  const changeTimeRange = useCallback((newRange: typeof timeRange) => {
    setSelectedTimeRange(newRange)
  }, [])

  return {
    ...query,
    timeRange: selectedTimeRange,
    changeTimeRange
  }
}

// Hook para obtener información de mercado
export const useMarketHours = () => {
  return useQuery({
    queryKey: ['market-hours'],
    queryFn: () => quoteService.getMarketHours(),
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 1
  })
}

// Hook para actualización manual de cotizaciones
export const useUpdateQuotes = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => quoteService.updateAllQuotes(),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['watchlist-quotes'] })
      queryClient.invalidateQueries({ queryKey: ['quote'] })
      queryClient.invalidateQueries({ queryKey: ['quote-history'] })
      queryClient.invalidateQueries({ queryKey: ['quote-chart'] })
    }
  })
}

// Hook para obtener cotizaciones en lote
export const useBatchQuotes = () => {
  return useMutation({
    mutationFn: ({ symbols, forceRefresh }: { symbols: string[], forceRefresh?: boolean }) =>
      quoteService.getBatchQuotes(symbols, forceRefresh)
  })
}

// Hook para gestión avanzada de cotizaciones con auto-refresh inteligente
export const useQuotesManager = (
  symbols: string[] = [],
  options: {
    autoRefresh?: boolean
    refreshInterval?: number
    maxRetries?: number
    onError?: (error: Error) => void
    onSuccess?: (data: QuoteWithInstrument[]) => void
  } = {}
) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    maxRetries = 3,
    onError,
    onSuccess
  } = options

  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(autoRefresh)
  const [refreshCount, setRefreshCount] = useState(0)
  const [lastError, setLastError] = useState<Error | null>(null)
  const retryCount = useRef(0)

  // Query para watchlist completo
  const watchlistQuery = useWatchlistQuotes(isAutoRefreshEnabled, refreshInterval)

  // Query para símbolos específicos si se proporcionan
  const specificQuotesQuery = useQuery({
    queryKey: ['specific-quotes', symbols],
    queryFn: async () => {
      if (symbols.length === 0) return []
      
      const results = await quoteService.getBatchQuotes(symbols)
      return results.results.filter(r => r.success)
    },
    enabled: symbols.length > 0,
    staleTime: refreshInterval,
    refetchInterval: isAutoRefreshEnabled ? refreshInterval : false,
    retry: (failureCount, error) => {
      if (failureCount < maxRetries) {
        retryCount.current = failureCount + 1
        return true
      }
      setLastError(error as Error)
      onError?.(error as Error)
      return false
    }
  })

  // Efecto para manejar éxito/error
  useEffect(() => {
    if (watchlistQuery.data && !watchlistQuery.error) {
      setLastError(null)
      retryCount.current = 0
      setRefreshCount(prev => prev + 1)
      onSuccess?.(watchlistQuery.data)
    }
  }, [watchlistQuery.data, watchlistQuery.error, onSuccess])

  // Funciones de control
  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(prev => !prev)
  }, [])

  const forceRefresh = useCallback(async () => {
    setLastError(null)
    retryCount.current = 0
    
    try {
      await Promise.all([
        watchlistQuery.refetch(),
        symbols.length > 0 ? specificQuotesQuery.refetch() : Promise.resolve()
      ])
    } catch (error) {
      setLastError(error as Error)
      onError?.(error as Error)
    }
  }, [watchlistQuery, specificQuotesQuery, symbols.length, onError])

  // Datos combinados
  const data = symbols.length > 0 
    ? (specificQuotesQuery.data || []) 
    : (watchlistQuery.data || [])

  const isLoading = symbols.length > 0 
    ? specificQuotesQuery.isLoading 
    : watchlistQuery.isLoading

  const error = symbols.length > 0 
    ? specificQuotesQuery.error 
    : watchlistQuery.error

  return {
    // Datos
    quotes: data,
    isLoading,
    error: error || lastError,
    
    // Estado
    isAutoRefreshEnabled,
    refreshCount,
    retryCount: retryCount.current,
    lastUpdate: watchlistQuery.lastUpdate,
    
    // Controles
    toggleAutoRefresh,
    forceRefresh,
    
    // Queries individuales para acceso avanzado
    watchlistQuery,
    specificQuotesQuery
  }
}

// Hook para estadísticas del servicio
export const useQuoteStats = () => {
  return useQuery({
    queryKey: ['quote-stats'],
    queryFn: () => quoteService.getServiceStats(),
    staleTime: 60 * 1000, // 1 minuto
    retry: 1
  })
}

// Hook para gestión del job de actualización
export const useQuoteJob = () => {
  const queryClient = useQueryClient()

  const updateConfig = useMutation({
    mutationFn: (config: Parameters<typeof quoteService.updateJobConfig>[0]) =>
      quoteService.updateJobConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] })
    }
  })

  const restart = useMutation({
    mutationFn: () => quoteService.restartJob(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] })
    }
  })

  const resetStats = useMutation({
    mutationFn: () => quoteService.resetJobStats(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-stats'] })
    }
  })

  const cleanup = useMutation({
    mutationFn: (daysToKeep: number = 30) => quoteService.cleanupOldQuotes(daysToKeep)
  })

  return {
    updateConfig,
    restart,
    resetStats,
    cleanup
  }
}