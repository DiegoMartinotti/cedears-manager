import { useState, useEffect, useCallback } from 'react'
import {
  CommissionConfig,
  CommissionCalculation,
  CommissionProjection,
  BrokerComparison,
  CommissionAnalysis,
  MinimumInvestmentCalculation,
  CalculateCommissionRequest,
  CompareBrokersRequest,
  CalculateMinimumInvestmentRequest,
  CommissionAnalysisFilters,
  CommissionConfigsResponse,
  CommissionCalculationResponse,
  BrokerComparisonResponse,
  CommissionAnalysisResponse,
  MinimumInvestmentResponse,
  ActiveConfigResponse,
  ApiResponse
} from '../types/commissions'

const API_BASE_URL = 'http://localhost:3001/api/v1'

export interface UseCommissionsReturn {
  // State
  configs: CommissionConfig[]
  activeConfig: CommissionConfig | null
  loading: boolean
  error: string | null

  // Actions
  loadConfigs: () => Promise<void>
  loadActiveConfig: () => Promise<void>
  saveConfig: (config: CommissionConfig) => Promise<boolean>
  setActiveConfig: (broker: string) => Promise<boolean>
  calculateCommission: (request: CalculateCommissionRequest) => Promise<CommissionCalculation | CommissionProjection | null>
  compareBrokers: (request: CompareBrokersRequest) => Promise<BrokerComparison[] | null>
  analyzeCommissions: (filters?: CommissionAnalysisFilters) => Promise<CommissionAnalysis | null>
  calculateMinimumInvestment: (request: CalculateMinimumInvestmentRequest) => Promise<MinimumInvestmentCalculation | null>
  clearError: () => void
}

export const useCommissions = (): UseCommissionsReturn => {
  const [configs, setConfigs] = useState<CommissionConfig[]>([])
  const [activeConfig, setActiveConfigState] = useState<CommissionConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    console.error('Commission API Error:', error)
    
    if (error.response?.data?.error) {
      setError(error.response.data.error)
    } else if (error.message) {
      setError(error.message)
    } else {
      setError(defaultMessage)
    }
  }, [])

  const apiCall = useCallback(async <T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<T | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'API call failed')
      }

      return data.data
    } catch (error) {
      handleApiError(error, 'Error en la comunicación con el servidor')
      return null
    }
  }, [handleApiError])

  // Cargar configuraciones disponibles
  const loadConfigs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<CommissionConfig[]>('/commissions/configs')
      if (data) {
        setConfigs(data)
      }
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Cargar configuración activa
  const loadActiveConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<CommissionConfig>('/commissions/active')
      if (data) {
        setActiveConfigState(data)
      }
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Guardar configuración personalizada
  const saveConfig = useCallback(async (config: CommissionConfig): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<CommissionConfig>('/commissions/config', {
        method: 'POST',
        body: JSON.stringify(config),
      })
      
      if (data) {
        // Recargar configuraciones para incluir la nueva
        await loadConfigs()
        return true
      }
      return false
    } finally {
      setLoading(false)
    }
  }, [apiCall, loadConfigs])

  // Establecer configuración activa
  const setActiveConfig = useCallback(async (broker: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<CommissionConfig>(`/commissions/active/${broker}`, {
        method: 'PUT',
      })
      
      if (data) {
        setActiveConfigState(data)
        return true
      }
      return false
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Calcular comisiones para una operación
  const calculateCommission = useCallback(async (
    request: CalculateCommissionRequest
  ): Promise<CommissionCalculation | CommissionProjection | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<CommissionCalculation | CommissionProjection>('/commissions/calculate', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      
      return data
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Comparar comisiones entre brokers
  const compareBrokers = useCallback(async (
    request: CompareBrokersRequest
  ): Promise<BrokerComparison[] | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<BrokerComparison[]>('/commissions/compare', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      
      return data
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Análisis histórico de comisiones
  const analyzeCommissions = useCallback(async (
    filters?: CommissionAnalysisFilters
  ): Promise<CommissionAnalysis | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      
      if (filters?.fromDate) {
        queryParams.append('fromDate', filters.fromDate)
      }
      if (filters?.toDate) {
        queryParams.append('toDate', filters.toDate)
      }
      if (filters?.instrumentId) {
        queryParams.append('instrumentId', filters.instrumentId.toString())
      }

      const url = queryParams.toString() 
        ? `/commissions/analysis?${queryParams.toString()}`
        : '/commissions/analysis'

      const data = await apiCall<CommissionAnalysis>(url)
      return data
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Calcular monto mínimo de inversión recomendado
  const calculateMinimumInvestment = useCallback(async (
    request: CalculateMinimumInvestmentRequest
  ): Promise<MinimumInvestmentCalculation | null> => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall<MinimumInvestmentCalculation>('/commissions/minimum-investment', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      
      return data
    } finally {
      setLoading(false)
    }
  }, [apiCall])

  // Cargar datos iniciales al montar el hook
  useEffect(() => {
    loadConfigs()
    loadActiveConfig()
  }, [loadConfigs, loadActiveConfig])

  return {
    // State
    configs,
    activeConfig,
    loading,
    error,

    // Actions
    loadConfigs,
    loadActiveConfig,
    saveConfig,
    setActiveConfig,
    calculateCommission,
    compareBrokers,
    analyzeCommissions,
    calculateMinimumInvestment,
    clearError,
  }
}