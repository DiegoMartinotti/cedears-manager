import { useState, useEffect, useCallback } from 'react'
import { 
  CEDEAR, 
  Trade, 
  FinancialGoal, 
  Quote, 
  AppSettings 
} from '@cedears-manager/shared/types'
import { apiUtils, endpoints } from '../utils/api'
import { useAppStore } from '../store'

// Generic hook for API requests with loading and error states
export function useApiRequest<T>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall()
      setData(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}

// Hook for CEDEARs operations
export function useCEDEARs() {
  const { updateWatchlist, setWatchlistLoading, setWatchlistError, addNotification } = useAppStore()
  const { data: cedears, loading, error, execute } = useApiRequest<CEDEAR[]>()

  const fetchCEDEARs = useCallback(async () => {
    setWatchlistLoading(true)
    try {
      const result = await execute(() => apiUtils.get<CEDEAR[]>(endpoints.cedears.list))
      updateWatchlist(result || [])
      setWatchlistError(null)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch CEDEARs'
      setWatchlistError(errorMessage)
      addNotification({
        type: 'error',
        title: 'Error al cargar CEDEARs',
        message: errorMessage,
        isRead: false,
      })
      throw err
    } finally {
      setWatchlistLoading(false)
    }
  }, [execute, updateWatchlist, setWatchlistLoading, setWatchlistError, addNotification])

  const createCEDEAR = useCallback(async (cedearData: Omit<CEDEAR, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await apiUtils.post<CEDEAR>(endpoints.cedears.create, cedearData)
      addNotification({
        type: 'success',
        title: 'CEDEAR Creado',
        message: `${cedearData.symbol} ha sido agregado exitosamente`,
        isRead: false,
      })
      // Refresh the list after creation
      await fetchCEDEARs()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create CEDEAR'
      addNotification({
        type: 'error',
        title: 'Error al crear CEDEAR',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [fetchCEDEARs, addNotification])

  const deleteCEDEAR = useCallback(async (id: string) => {
    try {
      await execute(() => apiUtils.delete(endpoints.cedears.delete(id)))
      addNotification({
        type: 'success',
        title: 'CEDEAR Eliminado',
        message: 'El CEDEAR ha sido eliminado exitosamente',
        isRead: false,
      })
      // Refresh the list after deletion
      await fetchCEDEARs()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete CEDEAR'
      addNotification({
        type: 'error',
        title: 'Error al eliminar CEDEAR',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [fetchCEDEARs, addNotification])

  return {
    cedears,
    loading,
    error,
    fetchCEDEARs,
    createCEDEAR,
    deleteCEDEAR,
  }
}

// Hook for quotes operations
export function useQuotes() {
  const { addNotification } = useAppStore()
  const { data: quotes, loading, error, execute } = useApiRequest<Quote[]>()

  const fetchLatestQuotes = useCallback(async () => {
    try {
      const result = await execute(() => apiUtils.get<Quote[]>(endpoints.quotes.latest))
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quotes'
      addNotification({
        type: 'error',
        title: 'Error al cargar cotizaciones',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, addNotification])

  const fetchQuoteHistory = useCallback(async (symbol: string, days: number = 30) => {
    try {
      const result = await execute(() => 
        apiUtils.get<Quote[]>(endpoints.quotes.history(symbol), { days })
      )
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quote history'
      addNotification({
        type: 'error',
        title: 'Error al cargar historial',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, addNotification])

  return {
    quotes,
    loading,
    error,
    fetchLatestQuotes,
    fetchQuoteHistory,
  }
}

// Hook for trades operations
export function useTrades() {
  const { addNotification } = useAppStore()
  const { data: trades, loading, error, execute } = useApiRequest<Trade[]>()

  const fetchTrades = useCallback(async () => {
    try {
      const result = await execute(() => apiUtils.get<Trade[]>(endpoints.trades.list))
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trades'
      addNotification({
        type: 'error',
        title: 'Error al cargar operaciones',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, addNotification])

  const createTrade = useCallback(async (tradeData: Omit<Trade, 'id'>) => {
    try {
      const result = await apiUtils.post<Trade>(endpoints.trades.create, tradeData)
      addNotification({
        type: 'success',
        title: 'Operación Registrada',
        message: `${tradeData.type} de ${tradeData.quantity} unidades registrada`,
        isRead: false,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create trade'
      addNotification({
        type: 'error',
        title: 'Error al registrar operación',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, addNotification])

  return {
    trades,
    loading,
    error,
    fetchTrades,
    createTrade,
  }
}

// Hook for goals operations
export function useGoals() {
  const { updateGoals, addNotification } = useAppStore()
  const { data: goals, loading, error, execute } = useApiRequest<FinancialGoal[]>()

  const fetchGoals = useCallback(async () => {
    try {
      const result = await execute(() => apiUtils.get<FinancialGoal[]>(endpoints.goals.list))
      updateGoals(result || [])
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch goals'
      addNotification({
        type: 'error',
        title: 'Error al cargar objetivos',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, updateGoals, addNotification])

  const createGoal = useCallback(async (goalData: Omit<FinancialGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await apiUtils.post<FinancialGoal>(endpoints.goals.create, goalData)
      addNotification({
        type: 'success',
        title: 'Objetivo Creado',
        message: `Objetivo "${goalData.name}" creado exitosamente`,
        isRead: false,
      })
      // Refresh the list after creation
      await fetchGoals()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create goal'
      addNotification({
        type: 'error',
        title: 'Error al crear objetivo',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [fetchGoals, addNotification])

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
  }
}

// Hook for settings operations
export function useSettings() {
  const { updateSettings, addNotification } = useAppStore()
  const { data: settings, loading, error, execute } = useApiRequest<AppSettings>()

  const fetchSettings = useCallback(async () => {
    try {
      const result = await execute(() => apiUtils.get<AppSettings>(endpoints.settings.get))
      updateSettings(result || {})
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch settings'
      addNotification({
        type: 'error',
        title: 'Error al cargar configuración',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, updateSettings, addNotification])

  const saveSettings = useCallback(async (settingsData: Partial<AppSettings>) => {
    try {
      const result = await execute(() => apiUtils.put<AppSettings>(endpoints.settings.update, settingsData))
      updateSettings(result || {})
      addNotification({
        type: 'success',
        title: 'Configuración Guardada',
        message: 'La configuración ha sido actualizada exitosamente',
        isRead: false,
      })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings'
      addNotification({
        type: 'error',
        title: 'Error al guardar configuración',
        message: errorMessage,
        isRead: false,
      })
      throw err
    }
  }, [execute, updateSettings, addNotification])

  return {
    settings,
    loading,
    error,
    fetchSettings,
    saveSettings,
  }
}

// Hook for connection status
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const { setOnlineStatus } = useAppStore()

  const checkConnection = useCallback(async () => {
    try {
      const isOnline = await apiUtils.testConnection()
      setIsConnected(isOnline)
      setOnlineStatus(isOnline)
      return isOnline
    } catch (error) {
      setIsConnected(false)
      setOnlineStatus(false)
      return false
    }
  }, [setOnlineStatus])

  useEffect(() => {
    // Check connection on mount
    checkConnection()

    // Set up periodic connection checks (every 30 seconds)
    const interval = setInterval(checkConnection, 30000)

    return () => clearInterval(interval)
  }, [checkConnection])

  return {
    isConnected,
    checkConnection,
  }
}