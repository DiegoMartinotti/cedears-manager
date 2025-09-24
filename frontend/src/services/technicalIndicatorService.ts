import { apiClient } from './api'
import type { TechnicalIndicator } from '../../../shared/src/types'

export interface TechnicalIndicatorFilters {
  symbol?: string
  indicator?: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH'
  limit?: number
  offset?: number
}

export interface TechnicalIndicatorHistory extends TechnicalIndicatorFilters {
  days?: number
}

export interface ActiveSignalsFilters {
  signals?: ('BUY' | 'SELL' | 'HOLD')[]
  minStrength?: number
  limit?: number
}

export interface CalculateIndicatorsRequest {
  symbol?: string
  symbols?: string[]
  force?: boolean
}

export interface TechnicalIndicatorStats {
  totalIndicators: number
  bySymbol: Record<string, number>
  byIndicator: Record<string, number>
  bySignal: Record<string, number>
  lastUpdate: string | null
}

export interface ExtremeData {
  yearHigh: number
  yearLow: number
  current: number
  distanceFromHigh: number
  distanceFromLow: number
  range: number
  currentPositionPercent: number
  volatility: number
}

export interface JobStatus {
  isRunning: boolean
  lastRun: string | null
  successCount: number
  errorCount: number
  nextRun: string | null
  uptime: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  meta?: {
    symbol?: string
    indicator?: string
    count?: number
    timestamp?: string
    [key: string]: any
  }
  error?: string
}

class TechnicalIndicatorService {
  private baseUrl = '/technical-indicators'

  /**
   * Obtiene los últimos indicadores técnicos para un símbolo
   */
  async getLatestIndicators(symbol: string, filters?: TechnicalIndicatorFilters): Promise<TechnicalIndicator[]> {
    const params = new URLSearchParams()
    
    if (filters?.indicator) params.append('indicator', filters.indicator)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())

    const queryString = params.toString()
    const url = `${this.baseUrl}/${symbol.toUpperCase()}${queryString ? `?${queryString}` : ''}`
    
    const response = await apiClient.get<ApiResponse<TechnicalIndicator[]>>(url)
    return response.data.data
  }

  /**
   * Obtiene el historial de indicadores técnicos para un símbolo
   */
  async getIndicatorHistory(symbol: string, filters?: TechnicalIndicatorHistory): Promise<TechnicalIndicator[]> {
    const params = new URLSearchParams()
    
    if (filters?.indicator) params.append('indicator', filters.indicator)
    if (filters?.days) params.append('days', filters.days.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    const url = `${this.baseUrl}/${symbol.toUpperCase()}/history${queryString ? `?${queryString}` : ''}`
    
    const response = await apiClient.get<ApiResponse<TechnicalIndicator[]>>(url)
    return response.data.data
  }

  /**
   * Obtiene señales activas de compra/venta
   */
  async getActiveSignals(filters?: ActiveSignalsFilters): Promise<TechnicalIndicator[]> {
    const params = new URLSearchParams()
    
    if (filters?.signals?.length) {
      filters.signals.forEach(signal => params.append('signals', signal))
    }
    if (filters?.minStrength !== undefined) params.append('minStrength', filters.minStrength.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const queryString = params.toString()
    const url = `${this.baseUrl}/signals${queryString ? `?${queryString}` : ''}`
    
    const response = await apiClient.get<ApiResponse<TechnicalIndicator[]>>(url)
    return response.data.data
  }

  /**
   * Calcula indicadores técnicos manualmente
   */
  async calculateIndicators(request: CalculateIndicatorsRequest): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`${this.baseUrl}/calculate`, request)
    return response.data
  }

  /**
   * Obtiene mínimos y máximos anuales para un símbolo
   */
  async getExtremes(symbol: string, days: number = 365): Promise<ExtremeData> {
    const params = new URLSearchParams()
    if (days !== 365) params.append('days', days.toString())

    const queryString = params.toString()
    const url = `${this.baseUrl}/${symbol.toUpperCase()}/extremes${queryString ? `?${queryString}` : ''}`
    
    const response = await apiClient.get<ApiResponse<ExtremeData>>(url)
    return response.data.data
  }

  /**
   * Obtiene estadísticas del sistema de indicadores técnicos
   */
  async getStats(): Promise<{ indicators: TechnicalIndicatorStats; jobStatus: JobStatus; performance: any }> {
    const response = await apiClient.get<ApiResponse<any>>(`${this.baseUrl}/stats`)
    return response.data.data
  }

  /**
   * Obtiene el estado del job de análisis técnico
   */
  async getJobStatus(): Promise<JobStatus> {
    const response = await apiClient.get<ApiResponse<JobStatus>>(`${this.baseUrl}/job/status`)
    return response.data.data
  }

  /**
   * Fuerza la ejecución del job de análisis técnico
   */
  async forceJobRun(): Promise<{ success: boolean; message: string; data: { startedAt: string } }> {
    const response = await apiClient.post<ApiResponse<{ startedAt: string }>>(`${this.baseUrl}/job/force-run`)
    return {
      success: response.data.success,
      message: 'Technical analysis job started in background',
      data: response.data.data
    }
  }

  /**
   * Limpia indicadores técnicos antiguos
   */
  async cleanupOldIndicators(days: number = 90): Promise<{ deletedIndicators: number; daysKept: number }> {
    const params = new URLSearchParams()
    if (days !== 90) params.append('days', days.toString())

    const queryString = params.toString()
    const url = `${this.baseUrl}/cleanup${queryString ? `?${queryString}` : ''}`
    
    const response = await apiClient.delete<ApiResponse<{ deletedIndicators: number; daysKept: number }>>(url)
    return response.data.data
  }

  /**
   * Busca indicadores con filtros avanzados
   */
  async searchIndicators(filters: TechnicalIndicatorFilters & {
    fromDate?: Date
    toDate?: Date
    signal?: 'BUY' | 'SELL' | 'HOLD'
  }): Promise<TechnicalIndicator[]> {
    const params = new URLSearchParams()
    
    if (filters.symbol) params.append('symbol', filters.symbol)
    if (filters.indicator) params.append('indicator', filters.indicator)
    if (filters.signal) params.append('signal', filters.signal)
    if (filters.fromDate) params.append('fromDate', filters.fromDate.toISOString())
    if (filters.toDate) params.append('toDate', filters.toDate.toISOString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.offset) params.append('offset', filters.offset.toString())

    // Usamos el endpoint de search genérico (asumiendo que existe)
    const queryString = params.toString()
    const url = `${this.baseUrl}/search${queryString ? `?${queryString}` : ''}`
    
    try {
      const response = await apiClient.get<ApiResponse<TechnicalIndicator[]>>(url)
      return response.data.data
    } catch (error) {
      // Fallback: usar getActiveSignals si el endpoint de search no existe
      if (filters.signal && ['BUY', 'SELL'].includes(filters.signal)) {
        return this.getActiveSignals({
          signals: [filters.signal],
          limit: filters.limit
        })
      }
      throw error
    }
  }

  /**
   * Obtiene indicadores agrupados por tipo para un símbolo
   */
  async getIndicatorsSummary(symbol: string): Promise<{
    rsi: TechnicalIndicator | null
    sma: TechnicalIndicator | null
    ema: TechnicalIndicator | null
    macd: TechnicalIndicator | null
    extremes: TechnicalIndicator | null
  }> {
    const indicators = await this.getLatestIndicators(symbol)
    
    return {
      rsi: indicators.find(i => i.indicator === 'RSI') || null,
      sma: indicators.find(i => i.indicator === 'SMA') || null,
      ema: indicators.find(i => i.indicator === 'EMA') || null,
      macd: indicators.find(i => i.indicator === 'MACD') || null,
      extremes: indicators.find(i => i.indicator === 'BB') || null // BB usado para extremes
    }
  }

  /**
   * Formatea un indicador técnico para mostrar
   */
  formatIndicatorValue(indicator: TechnicalIndicator): string {
    switch (indicator.indicator) {
      case 'RSI':
        return `${indicator.value.toFixed(1)}`
      case 'SMA':
      case 'EMA':
        return `$${indicator.value.toFixed(2)}`
      case 'MACD':
        return `${indicator.value.toFixed(4)}`
      default:
        return indicator.value.toFixed(2)
    }
  }

  /**
   * Obtiene el color de la señal para UI
   */
  getSignalColor(signal: string): string {
    switch (signal) {
      case 'BUY':
        return 'text-green-600 bg-green-100'
      case 'SELL':
        return 'text-red-600 bg-red-100'
      case 'HOLD':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  /**
   * Obtiene descripción del indicador
   */
  getIndicatorDescription(indicator: string): string {
    switch (indicator) {
      case 'RSI':
        return 'Relative Strength Index - Momentum oscillator (0-100)'
      case 'SMA':
        return 'Simple Moving Average - Trend following indicator'
      case 'EMA':
        return 'Exponential Moving Average - Trend following indicator'
      case 'MACD':
        return 'Moving Average Convergence Divergence - Momentum indicator'
      case 'BB':
        return 'Price Extremes - Year high/low analysis'
      case 'STOCH':
        return 'Stochastic Oscillator - Momentum indicator'
      default:
        return 'Technical indicator'
    }
  }
}

export const technicalIndicatorService = new TechnicalIndicatorService()