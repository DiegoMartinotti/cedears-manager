import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opportunityService } from '../services/opportunityService'
import { useApi } from './useApi'

export interface OpportunityData {
  id: number
  symbol: string
  instrument_id: number
  company_name: string
  opportunity_type: 'BUY' | 'STRONG_BUY'
  composite_score: number
  technical_signals: {
    rsi: {
      value: number
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      oversoldThreshold: number
    }
    sma: {
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      crossover?: boolean
      sma20: number
      sma50: number
      sma200: number
    }
    distance_from_low: {
      percentage: number
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      yearLow: number
      currentPrice: number
    }
    volume_relative: {
      ratio: number
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      avgVolume: number
      currentVolume: number
    }
    macd: {
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      histogram: number
      line: number
      signalLine: number
    }
  }
  ranking: number
  market_data: {
    current_price: number
    year_high: number
    year_low: number
    volume_avg: number
    volume_current: number
    market_cap?: number
    price_change_24h?: number
    price_change_percentage_24h?: number
  }
  esg_criteria: {
    is_esg_compliant: boolean
    is_vegan_friendly: boolean
    esg_score?: number
  }
  risk_assessment: {
    volatility: number
    sector_concentration: number
    diversification_impact: number
    beta?: number
    sharpe_ratio?: number
  }
  expected_return: {
    target_price: number
    upside_percentage: number
    time_horizon_days: number
    confidence_level: number
  }
  detected_at: string
  expires_at: string
  is_active: boolean
}

export interface OpportunityStats {
  total: number
  active: number
  today: number
  averageScore: number
  byType: Record<string, number>
  esgCompliant: number
  veganFriendly: number
  highScore: number
  mediumScore: number
  lowScore: number
}

export interface ScannerStatus {
  isRunning: boolean
  lastRun: string | null
  successCount: number
  errorCount: number
  lastScanResults: {
    opportunitiesFound: number
    avgScore: number
    topScore: number
    processingTime: number
  } | null
  nextRun: string | null
}

export interface DiversificationCheck {
  current_portfolio_value: number
  proposed_investment: number
  concentration_percentage: number
  sector_concentration: number
  max_allowed_concentration: number
  is_within_limits: boolean
  recommendation: {
    suggested_amount?: number
    reason: string
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

export interface CommissionImpact {
  operation_commission: number
  custody_monthly: number
  total_first_year: number
  break_even_percentage: number
  net_upside_after_costs: number
  is_profitable: boolean
}

export function useOpportunities() {
  const queryClient = useQueryClient()
  const { isOnline } = useApi()

  // Query para oportunidades del día
  const {
    data: todaysOpportunities,
    isLoading: loadingToday,
    error: todayError,
    refetch: refetchToday
  } = useQuery({
    queryKey: ['opportunities', 'today'],
    queryFn: () => opportunityService.getTodaysOpportunities(),
    enabled: isOnline,
    refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos durante horario de mercado
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 3
  })

  // Query para mejores oportunidades
  const {
    data: topOpportunities,
    isLoading: loadingTop,
    error: topError,
    refetch: refetchTop
  } = useQuery({
    queryKey: ['opportunities', 'top'],
    queryFn: () => opportunityService.getTopOpportunities(),
    enabled: isOnline,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
    retry: 3
  })

  // Query para estadísticas
  const {
    data: opportunityStats,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['opportunities', 'stats'],
    queryFn: () => opportunityService.getOpportunityStats(),
    enabled: isOnline,
    refetchInterval: 10 * 60 * 1000, // 10 minutos
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 3
  })

  // Query para estado del scanner
  const {
    data: scannerStatus,
    isLoading: loadingScanner,
    error: scannerError,
    refetch: refetchScanner
  } = useQuery({
    queryKey: ['opportunities', 'scanner', 'status'],
    queryFn: () => opportunityService.getScannerStatus(),
    enabled: isOnline,
    refetchInterval: 30 * 1000, // 30 segundos
    staleTime: 15 * 1000, // 15 segundos
    retry: 2
  })

  // Mutation para scan manual
  const manualScanMutation = useMutation({
    mutationFn: (config?: any) => opportunityService.runManualScan(config),
    onSuccess: () => {
      // Invalidar todas las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    },
    onError: (error) => {
      console.error('Error in manual scan:', error)
    }
  })

  // Mutation para forzar scan
  const forceScanMutation = useMutation({
    mutationFn: () => opportunityService.forceScannerRun(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
    }
  })

  // Función para buscar oportunidades con filtros
  const searchOpportunities = useQuery({
    queryKey: ['opportunities', 'search'],
    queryFn: () => opportunityService.searchOpportunities({}),
    enabled: false // Solo ejecutar manualmente
  })

  // Función para calcular diversificación
  const calculateDiversificationMutation = useMutation({
    mutationFn: ({ symbol, investmentAmount }: { symbol: string; investmentAmount: number }) =>
      opportunityService.calculateDiversification(symbol, investmentAmount),
    onError: (error) => {
      console.error('Error calculating diversification:', error)
    }
  })

  // Función para obtener una oportunidad específica
  const useOpportunityById = (id: number) => {
    return useQuery({
      queryKey: ['opportunities', 'detail', id],
      queryFn: () => opportunityService.getOpportunityById(id),
      enabled: isOnline && !!id,
      staleTime: 5 * 60 * 1000,
      retry: 2
    })
  }

  // Función para refrescar todos los datos
  const refetchAll = async () => {
    await Promise.all([
      refetchToday(),
      refetchTop(),
      refetchStats(),
      refetchScanner()
    ])
  }

  // Estados combinados
  const isLoading = loadingToday || loadingTop || loadingStats || loadingScanner
  const error = todayError || topError || statsError || scannerError

  return {
    // Datos
    todaysOpportunities,
    topOpportunities,
    opportunityStats,
    scannerStatus,
    
    // Estados
    isLoading,
    error: error?.message || null,
    isOnline,
    
    // Funciones de actualización
    refetch: refetchAll,
    refetchToday,
    refetchTop,
    refetchStats,
    refetchScanner,
    
    // Mutations
    runManualScan: manualScanMutation.mutateAsync,
    isRunningManualScan: manualScanMutation.isPending,
    manualScanError: manualScanMutation.error?.message || null,
    
    forceScannerRun: forceScanMutation.mutateAsync,
    isForcingScanner: forceScanMutation.isPending,
    
    calculateDiversification: calculateDiversificationMutation.mutateAsync,
    isCalculatingDiversification: calculateDiversificationMutation.isPending,
    diversificationError: calculateDiversificationMutation.error?.message || null,
    diversificationResult: calculateDiversificationMutation.data,
    
    // Search
    searchOpportunities: searchOpportunities.refetch,
    searchResults: searchOpportunities.data,
    isSearching: searchOpportunities.isFetching,
    
    // Utility hook
    useOpportunityById
  }
}

// Hook específico para una oportunidad individual
export function useOpportunityDetail(id: number) {
  const { isOnline } = useApi()
  
  return useQuery({
    queryKey: ['opportunities', 'detail', id],
    queryFn: () => opportunityService.getOpportunityById(id),
    enabled: isOnline && !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2
  })
}

// Hook para búsqueda con filtros
export function useOpportunitySearch() {
  const searchMutation = useMutation({
    mutationFn: (filters: any) => opportunityService.searchOpportunities(filters),
    onError: (error) => {
      console.error('Error searching opportunities:', error)
    }
  })
  
  return {
    search: searchMutation.mutateAsync,
    results: searchMutation.data,
    isSearching: searchMutation.isPending,
    error: searchMutation.error?.message || null,
    reset: searchMutation.reset
  }
}

// Hook para diversificación en tiempo real
export function useDiversificationCalculator() {
  const calculateMutation = useMutation({
    mutationFn: ({ symbol, investmentAmount }: { symbol: string; investmentAmount: number }) =>
      opportunityService.calculateDiversification(symbol, investmentAmount),
    onError: (error) => {
      console.error('Error calculating diversification:', error)
    }
  })
  
  return {
    calculate: calculateMutation.mutateAsync,
    result: calculateMutation.data,
    isCalculating: calculateMutation.isPending,
    error: calculateMutation.error?.message || null,
    reset: calculateMutation.reset
  }
}

// Hook para estadísticas en tiempo real
export function useOpportunityStatsRealtime() {
  const { isOnline } = useApi()
  
  return useQuery({
    queryKey: ['opportunities', 'stats', 'realtime'],
    queryFn: () => opportunityService.getOpportunityStats(),
    enabled: isOnline,
    refetchInterval: 60 * 1000, // 1 minuto
    staleTime: 30 * 1000, // 30 segundos
    retry: 2
  })
}