import api from '../utils/api'
import type { 
  DashboardSummary,
  PortfolioSummary,
  CurrentPosition,
  MarketSummary,
  PerformanceMetrics,
  DistributionData
} from '../../../shared/src/types'

const BASE_URL = '/api/v1/dashboard'

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    message: string
    details?: string
  }
  meta?: any
  timestamp: string
}

export class DashboardService {
  /**
   * Obtiene el resumen completo del dashboard
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const response = await api.get<ApiResponse<DashboardSummary>>(`${BASE_URL}/summary`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get dashboard summary')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting dashboard summary:', error)
      throw new Error(`Failed to get dashboard summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene solo el resumen del portfolio
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      const response = await api.get<ApiResponse<PortfolioSummary>>(`${BASE_URL}/portfolio-summary`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get portfolio summary')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting portfolio summary:', error)
      throw new Error(`Failed to get portfolio summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene las posiciones actuales
   */
  async getCurrentPositions(limit: number = 20): Promise<CurrentPosition[]> {
    try {
      const response = await api.get<ApiResponse<CurrentPosition[]>>(`${BASE_URL}/positions`, {
        params: { limit }
      })
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get current positions')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting current positions:', error)
      throw new Error(`Failed to get current positions: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene el resumen del mercado
   */
  async getMarketSummary(): Promise<MarketSummary> {
    try {
      const response = await api.get<ApiResponse<MarketSummary>>(`${BASE_URL}/market-summary`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get market summary')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting market summary:', error)
      throw new Error(`Failed to get market summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene las métricas de performance
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const response = await api.get<ApiResponse<PerformanceMetrics>>(`${BASE_URL}/performance`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get performance metrics')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      throw new Error(`Failed to get performance metrics: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene los datos de distribución para gráficos
   */
  async getDistributionData(): Promise<DistributionData> {
    try {
      const response = await api.get<ApiResponse<DistributionData>>(`${BASE_URL}/distribution`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get distribution data')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting distribution data:', error)
      throw new Error(`Failed to get distribution data: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Verifica el estado de salud del dashboard
   */
  async getHealthCheck(): Promise<{ status: string; services: Record<string, string> }> {
    try {
      const response = await api.get<ApiResponse<{ status: string; services: Record<string, string> }>>(`${BASE_URL}/health`)
      
      return response.data.data
    } catch (error) {
      console.error('Error getting dashboard health:', error)
      throw new Error(`Failed to get dashboard health: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Fuerza la actualización de datos del dashboard
   */
  async refreshDashboard(): Promise<DashboardSummary> {
    try {
      const response = await api.post<ApiResponse<DashboardSummary>>(`${BASE_URL}/refresh`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to refresh dashboard')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      throw new Error(`Failed to refresh dashboard: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService()