import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contextualAnalysisService } from '../services/contextualAnalysisService'

export interface ContextualAnalysisRequest {
  symbol: string
  analysisType: 'COMPREHENSIVE' | 'NEWS' | 'SENTIMENT' | 'EARNINGS' | 'TRENDS' | 'CUSTOM'
  timeframe?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'
  options?: {
    includeNews?: boolean
    includeSentiment?: boolean
    includeEarnings?: boolean
    includeTrends?: boolean
    includeRecommendations?: boolean
    customPrompt?: string
    useCache?: boolean
    cacheTTLMinutes?: number
  }
}

export interface PortfolioAnalysisRequest {
  symbols: string[]
  options?: {
    useCache?: boolean
    analysisDepth?: 'BASIC' | 'DETAILED'
  }
}

export function useContextualAnalysis() {
  const queryClient = useQueryClient()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mutation para análisis de símbolo individual
  const symbolAnalysisMutation = useMutation({
    mutationFn: (request: ContextualAnalysisRequest) => 
      contextualAnalysisService.analyzeSymbol(request),
    onMutate: () => {
      setIsLoading(true)
      setError(null)
    },
    onSuccess: (result) => {
      setData(result)
      setError(null)
      setIsLoading(false)
    },
    onError: (err: any) => {
      setError(err.message || 'Error en el análisis')
      setData(null)
      setIsLoading(false)
    }
  })

  // Mutation para análisis de portafolio
  const portfolioAnalysisMutation = useMutation({
    mutationFn: (request: PortfolioAnalysisRequest) => 
      contextualAnalysisService.analyzePortfolio(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contextual-analysis'] })
    }
  })

  // Mutation para generar reporte personalizado
  const reportMutation = useMutation({
    mutationFn: ({ symbol, reportType, options }: {
      symbol: string
      reportType: 'INVESTMENT_THESIS' | 'RISK_ASSESSMENT' | 'OPPORTUNITY_ANALYSIS' | 'MARKET_OUTLOOK'
      options?: any
    }) => contextualAnalysisService.generateCustomReport(symbol, reportType, options)
  })

  // Query para análisis de noticias
  const useNewsAnalysis = (symbol: string, options?: {
    days?: number
    pageSize?: number
    minRelevance?: number
    useCache?: boolean
  }) => {
    return useQuery({
      queryKey: ['news-analysis', symbol, options],
      queryFn: () => contextualAnalysisService.getNewsAnalysis(symbol, options),
      enabled: !!symbol,
      staleTime: 5 * 60 * 1000, // 5 minutos
    })
  }

  // Query para sentiment del mercado
  const useMarketSentiment = (options?: {
    includeNews?: boolean
    includeSocial?: boolean
    useCache?: boolean
  }) => {
    return useQuery({
      queryKey: ['market-sentiment', options],
      queryFn: () => contextualAnalysisService.getMarketSentiment(options),
      staleTime: 10 * 60 * 1000, // 10 minutos
      refetchInterval: 15 * 60 * 1000 // Refetch cada 15 minutos
    })
  }

  // Query para análisis de earnings
  const useEarningsAnalysis = (symbol: string, options?: {
    includeHistorical?: boolean
    includeCompetitors?: boolean
    analyzeWithClaude?: boolean
    useCache?: boolean
  }) => {
    return useQuery({
      queryKey: ['earnings-analysis', symbol, options],
      queryFn: () => contextualAnalysisService.getEarningsAnalysis(symbol, options),
      enabled: !!symbol,
      staleTime: 30 * 60 * 1000, // 30 minutos
    })
  }

  // Query para predicción de tendencias
  const useTrendPrediction = (symbol: string, options?: {
    timeframe?: '1W' | '1M' | '3M' | '6M' | '1Y'
    includeScenarios?: boolean
    analyzeWithClaude?: boolean
    useCache?: boolean
  }) => {
    return useQuery({
      queryKey: ['trend-prediction', symbol, options],
      queryFn: () => contextualAnalysisService.getTrendPrediction(symbol, options),
      enabled: !!symbol,
      staleTime: 20 * 60 * 1000, // 20 minutos
    })
  }

  // Query para calendario de earnings
  const useEarningsCalendar = (daysAhead: number = 7) => {
    return useQuery({
      queryKey: ['earnings-calendar', daysAhead],
      queryFn: () => contextualAnalysisService.getEarningsCalendar(daysAhead),
      staleTime: 60 * 60 * 1000, // 1 hora
      refetchInterval: 4 * 60 * 60 * 1000 // Refetch cada 4 horas
    })
  }

  // Query para tendencias del portafolio
  const usePortfolioTrends = (symbols: string[], timeframe: string = '1M') => {
    return useQuery({
      queryKey: ['portfolio-trends', symbols, timeframe],
      queryFn: () => contextualAnalysisService.analyzePortfolioTrends(symbols, timeframe),
      enabled: symbols.length > 0,
      staleTime: 15 * 60 * 1000, // 15 minutos
    })
  }

  // Query para estado de servicios
  const useServicesStatus = () => {
    return useQuery({
      queryKey: ['contextual-services-status'],
      queryFn: () => contextualAnalysisService.getServicesStatus(),
      staleTime: 2 * 60 * 1000, // 2 minutos
      refetchInterval: 5 * 60 * 1000 // Refetch cada 5 minutos
    })
  }

  // Función para limpiar cache
  const clearCache = useMutation({
    mutationFn: (service?: string) => contextualAnalysisService.clearCache(service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contextual-analysis'] })
      queryClient.invalidateQueries({ queryKey: ['news-analysis'] })
      queryClient.invalidateQueries({ queryKey: ['market-sentiment'] })
      queryClient.invalidateQueries({ queryKey: ['earnings-analysis'] })
      queryClient.invalidateQueries({ queryKey: ['trend-prediction'] })
    }
  })

  return {
    // Main analysis functions
    analyzeSymbol: symbolAnalysisMutation.mutate,
    analyzePortfolio: portfolioAnalysisMutation.mutate,
    generateReport: reportMutation.mutate,
    
    // Query hooks
    useNewsAnalysis,
    useMarketSentiment,
    useEarningsAnalysis,
    useTrendPrediction,
    useEarningsCalendar,
    usePortfolioTrends,
    useServicesStatus,
    
    // Utility functions
    clearCache: clearCache.mutate,
    
    // State
    data,
    error,
    isLoading,
    
    // Mutation states
    isAnalyzing: symbolAnalysisMutation.isPending,
    isAnalyzingPortfolio: portfolioAnalysisMutation.isPending,
    isGeneratingReport: reportMutation.isPending,
    isClearingCache: clearCache.isPending,
    
    // Additional data
    analysisResult: symbolAnalysisMutation.data,
    portfolioResult: portfolioAnalysisMutation.data,
    reportResult: reportMutation.data,
    
    // Error states
    analysisError: symbolAnalysisMutation.error,
    portfolioError: portfolioAnalysisMutation.error,
    reportError: reportMutation.error,
    clearCacheError: clearCache.error
  }
}

export function useContextualAnalysisData() {
  const queryClient = useQueryClient()
  
  // Función para obtener datos cacheados
  const getCachedData = (queryKey: string[]) => {
    return queryClient.getQueryData(queryKey)
  }
  
  // Función para invalidar queries específicas
  const invalidateQueries = (pattern: string) => {
    queryClient.invalidateQueries({ 
      queryKey: [pattern],
      exact: false 
    })
  }
  
  // Función para prefetch de datos
  const prefetchAnalysis = async (symbol: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['news-analysis', symbol],
      queryFn: () => contextualAnalysisService.getNewsAnalysis(symbol),
      staleTime: 5 * 60 * 1000
    })
    
    await queryClient.prefetchQuery({
      queryKey: ['trend-prediction', symbol],
      queryFn: () => contextualAnalysisService.getTrendPrediction(symbol),
      staleTime: 20 * 60 * 1000
    })
  }
  
  return {
    getCachedData,
    invalidateQueries,
    prefetchAnalysis
  }
}