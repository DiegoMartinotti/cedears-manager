import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { custodyService } from '../services/custodyService'
import type { 
  CustodyStatus, 
  CustodyHistoryFilters, 
  CustodyProjectionParams,
  CustodyOptimizationParams,
  CustodyCalculationParams,
  CustodyImpactAnalysisParams
} from '../types/custody'

// Claves de query para cache
export const CUSTODY_QUERY_KEYS = {
  status: ['custody', 'status'] as const,
  history: (filters?: CustodyHistoryFilters) => ['custody', 'history', filters] as const,
  projection: (params: CustodyProjectionParams) => ['custody', 'projection', params] as const,
  optimization: (params: CustodyOptimizationParams) => ['custody', 'optimization', params] as const,
  jobStatus: ['custody', 'job', 'status'] as const,
}

/**
 * Hook para obtener el estado actual de custodia
 */
export const useCustodyStatus = () => {
  return useQuery({
    queryKey: CUSTODY_QUERY_KEYS.status,
    queryFn: custodyService.getCurrentStatus,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch cada 10 minutos
  })
}

/**
 * Hook para obtener el histórico de custodia
 */
export const useCustodyHistory = (filters?: CustodyHistoryFilters) => {
  return useQuery({
    queryKey: CUSTODY_QUERY_KEYS.history(filters),
    queryFn: () => custodyService.getHistory(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

/**
 * Hook para obtener proyecciones de custodia
 */
export const useCustodyProjections = (params: CustodyProjectionParams) => {
  return useQuery({
    queryKey: CUSTODY_QUERY_KEYS.projection(params),
    queryFn: () => custodyService.getProjections(params),
    enabled: params.portfolioValue > 0,
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para obtener optimización de custodia
 */
export const useCustodyOptimization = (params: CustodyOptimizationParams) => {
  return useQuery({
    queryKey: CUSTODY_QUERY_KEYS.optimization(params),
    queryFn: () => custodyService.getOptimization(params),
    enabled: params.portfolioValue > 0,
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

/**
 * Hook para obtener estado del job de custodia
 */
export const useCustodyJobStatus = () => {
  return useQuery({
    queryKey: CUSTODY_QUERY_KEYS.jobStatus,
    queryFn: custodyService.getJobStatus,
    refetchInterval: 30 * 1000, // Refetch cada 30 segundos
  })
}

/**
 * Hook para calcular custodia manualmente
 */
export const useCustodyCalculation = () => {
  return useMutation({
    mutationFn: (params: CustodyCalculationParams) => 
      custodyService.calculateCustody(params),
  })
}

/**
 * Hook para análisis de impacto
 */
export const useCustodyImpactAnalysis = () => {
  return useMutation({
    mutationFn: (params: CustodyImpactAnalysisParams) => 
      custodyService.analyzeImpact(params),
  })
}

/**
 * Hook para ejecutar job mensual manualmente
 */
export const useRunMonthlyJob = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (params: { targetMonth?: string; dryRun?: boolean }) => 
      custodyService.runMonthlyJob(params),
    onSuccess: () => {
      // Invalidar queries relacionadas después de ejecutar el job
      queryClient.invalidateQueries({ queryKey: CUSTODY_QUERY_KEYS.status })
      queryClient.invalidateQueries({ queryKey: ['custody', 'history'] })
      queryClient.invalidateQueries({ queryKey: CUSTODY_QUERY_KEYS.jobStatus })
    },
  })
}

/**
 * Hook para actualizar fecha de pago
 */
export const useUpdatePaymentDate = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, paymentDate }: { id: number; paymentDate: string }) => 
      custodyService.updatePaymentDate(id, paymentDate),
    onSuccess: () => {
      // Invalidar queries del histórico
      queryClient.invalidateQueries({ queryKey: ['custody', 'history'] })
    },
  })
}

/**
 * Hook combinado para datos del dashboard de custodia
 */
export const useCustodyDashboard = () => {
  const statusQuery = useCustodyStatus()
  const jobStatusQuery = useCustodyJobStatus()
  
  const isLoading = statusQuery.isLoading || jobStatusQuery.isLoading
  const error = statusQuery.error || jobStatusQuery.error
  
  return {
    status: statusQuery.data,
    jobStatus: jobStatusQuery.data,
    isLoading,
    error,
    refetch: () => {
      statusQuery.refetch()
      jobStatusQuery.refetch()
    }
  }
}

/**
 * Hook para gestión completa de custodia con todas las funcionalidades
 */
export const useCustodyManager = () => {
  const queryClient = useQueryClient()
  
  // Queries
  const statusQuery = useCustodyStatus()
  const jobStatusQuery = useCustodyJobStatus()
  
  // Mutations
  const calculateMutation = useCustodyCalculation()
  const impactAnalysisMutation = useCustodyImpactAnalysis()
  const runJobMutation = useRunMonthlyJob()
  const updatePaymentMutation = useUpdatePaymentDate()
  
  // Funciones de utilidad
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['custody'] })
  }
  
  const calculateCustody = async (params: CustodyCalculationParams) => {
    try {
      const result = await calculateMutation.mutateAsync(params)
      return result
    } catch (error) {
      console.error('Error calculating custody:', error)
      throw error
    }
  }
  
  const analyzeImpact = async (params: CustodyImpactAnalysisParams) => {
    try {
      const result = await impactAnalysisMutation.mutateAsync(params)
      return result
    } catch (error) {
      console.error('Error analyzing custody impact:', error)
      throw error
    }
  }
  
  const runMonthlyJob = async (params?: { targetMonth?: string; dryRun?: boolean }) => {
    try {
      const result = await runJobMutation.mutateAsync(params || {})
      return result
    } catch (error) {
      console.error('Error running monthly job:', error)
      throw error
    }
  }
  
  const updatePaymentDate = async (id: number, paymentDate: string) => {
    try {
      const result = await updatePaymentMutation.mutateAsync({ id, paymentDate })
      return result
    } catch (error) {
      console.error('Error updating payment date:', error)
      throw error
    }
  }
  
  return {
    // Estado
    status: statusQuery.data,
    jobStatus: jobStatusQuery.data,
    isLoading: statusQuery.isLoading || jobStatusQuery.isLoading,
    error: statusQuery.error || jobStatusQuery.error,
    
    // Mutations loading states
    isCalculating: calculateMutation.isPending,
    isAnalyzing: impactAnalysisMutation.isPending,
    isRunningJob: runJobMutation.isPending,
    isUpdatingPayment: updatePaymentMutation.isPending,
    
    // Funciones
    refreshAll,
    calculateCustody,
    analyzeImpact,
    runMonthlyJob,
    updatePaymentDate,
    
    // Refetch individual
    refetchStatus: statusQuery.refetch,
    refetchJobStatus: jobStatusQuery.refetch,
  }
}