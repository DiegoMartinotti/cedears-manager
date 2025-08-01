import { api } from '@/utils/api'

export interface QuoteData {
  id?: number
  instrument_id: number
  price: number
  volume?: number
  high?: number
  low?: number
  close?: number
  quote_date: string
  quote_time?: string
  source?: string
  created_at?: string
}

export interface QuoteWithInstrument extends QuoteData {
  instrument?: {
    id: number
    symbol: string
    company_name: string
    sector?: string
    underlying_symbol?: string
  }
}

export interface QuoteUpdateResult {
  success: boolean
  symbol: string
  price?: number
  error?: string
  cached?: boolean
  source: string
}

export interface QuoteHistoryFilters {
  fromDate?: string
  toDate?: string
  limit?: number
  orderBy?: 'date' | 'price'
  orderDirection?: 'ASC' | 'DESC'
}

export interface MarketHours {
  isOpen: boolean
  nextOpen?: string
  nextClose?: string
  timezone: string
}

export interface QuoteServiceStats {
  quotes: {
    total: number
    dateRange: {
      earliest: string | null
      latest: string | null
    }
  }
  cache: {
    hits: number
    misses: number
    entries: number
    memoryUsage: number
  }
  rateLimit: {
    totalRequests: number
    rejectedRequests: number
    currentMinuteRequests: number
    currentHourRequests: number
    currentConcurrentRequests: number
  }
  market: MarketHours
}

export interface JobStats {
  lastRun: string | null
  lastSuccess: string | null
  lastError: string | null
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  quotesUpdated: number
  averageExecutionTime: number
  isRunning: boolean
}

export interface JobConfig {
  enabled: boolean
  schedule: string
  marketHoursOnly: boolean
  batchSize: number
  retryAttempts: number
  retryDelayMs: number
}

export class QuoteService {
  private readonly baseURL = '/api/v1/quotes'

  /**
   * Obtiene cotización de un símbolo específico
   */
  async getQuote(symbol: string, forceRefresh: boolean = false): Promise<QuoteUpdateResult> {
    try {
      const params = forceRefresh ? { forceRefresh: 'true' } : {}
      const response = await api.get(`${this.baseURL}/${symbol}`, { params })
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener cotización')
      }

      return response.data.data
    } catch (error) {
      console.error(`Error getting quote for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Obtiene cotizaciones de múltiples símbolos en lote
   */
  async getBatchQuotes(symbols: string[], forceRefresh: boolean = false): Promise<{
    results: QuoteUpdateResult[]
    summary: {
      total: number
      successful: number
      failed: number
    }
  }> {
    try {
      const response = await api.post(`${this.baseURL}/batch`, {
        symbols,
        forceRefresh
      })

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener cotizaciones')
      }

      return {
        results: response.data.data,
        summary: response.data.summary
      }
    } catch (error) {
      console.error('Error getting batch quotes:', error)
      throw error
    }
  }

  /**
   * Obtiene historial de cotizaciones
   */
  async getQuoteHistory(
    symbol: string, 
    filters?: QuoteHistoryFilters
  ): Promise<{
    quotes: QuoteWithInstrument[]
    count: number
    filters: QuoteHistoryFilters & { symbol: string }
  }> {
    try {
      const params: Record<string, string> = {}
      
      if (filters?.fromDate) params.fromDate = filters.fromDate
      if (filters?.toDate) params.toDate = filters.toDate
      if (filters?.limit) params.limit = filters.limit.toString()
      if (filters?.orderBy) params.orderBy = filters.orderBy
      if (filters?.orderDirection) params.orderDirection = filters.orderDirection

      const response = await api.get(`${this.baseURL}/history/${symbol}`, { params })
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener historial')
      }

      return {
        quotes: response.data.data,
        count: response.data.count,
        filters: response.data.filters
      }
    } catch (error) {
      console.error(`Error getting quote history for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Obtiene última cotización desde la base de datos
   */
  async getLatestQuote(symbol: string): Promise<QuoteWithInstrument | null> {
    try {
      const response = await api.get(`${this.baseURL}/latest/${symbol}`)
      
      if (!response.data.success) {
        if (response.status === 404) {
          return null
        }
        throw new Error(response.data.error || 'Error al obtener última cotización')
      }

      return response.data.data
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null
      }
      console.error(`Error getting latest quote for ${symbol}:`, error)
      throw error
    }
  }

  /**
   * Obtiene cotizaciones de todos los instrumentos en watchlist
   */
  async getWatchlistQuotes(): Promise<QuoteWithInstrument[]> {
    try {
      const response = await api.get(`${this.baseURL}/watchlist`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener cotizaciones del watchlist')
      }

      return response.data.data
    } catch (error) {
      console.error('Error getting watchlist quotes:', error)
      throw error
    }
  }

  /**
   * Ejecuta actualización manual de todas las cotizaciones
   */
  async updateAllQuotes(): Promise<{
    success: boolean
    message: string
    stats?: {
      successful: number
      failed: number
      executionTime: number
      results: QuoteUpdateResult[]
    }
  }> {
    try {
      const response = await api.post(`${this.baseURL}/update`)
      return response.data
    } catch (error) {
      console.error('Error updating quotes:', error)
      throw error
    }
  }

  /**
   * Obtiene información de horario de mercado
   */
  async getMarketHours(): Promise<MarketHours> {
    try {
      const response = await api.get(`${this.baseURL}/market/hours`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener horario de mercado')
      }

      return response.data.data
    } catch (error) {
      console.error('Error getting market hours:', error)
      throw error
    }
  }

  /**
   * Obtiene estadísticas del servicio de cotizaciones
   */
  async getServiceStats(): Promise<{
    service: QuoteServiceStats
    job: {
      stats: JobStats
      config: JobConfig
    }
  }> {
    try {
      const response = await api.get(`${this.baseURL}/stats`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al obtener estadísticas')
      }

      return response.data.data
    } catch (error) {
      console.error('Error getting service stats:', error)
      throw error
    }
  }

  /**
   * Actualiza configuración del job de actualización
   */
  async updateJobConfig(config: Partial<JobConfig>): Promise<JobConfig> {
    try {
      const response = await api.post(`${this.baseURL}/job/config`, config)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al actualizar configuración')
      }

      return response.data.config
    } catch (error) {
      console.error('Error updating job config:', error)
      throw error
    }
  }

  /**
   * Reinicia el job de actualización
   */
  async restartJob(): Promise<{
    config: JobConfig
    stats: JobStats
  }> {
    try {
      const response = await api.post(`${this.baseURL}/job/restart`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al reiniciar job')
      }

      return {
        config: response.data.config,
        stats: response.data.stats
      }
    } catch (error) {
      console.error('Error restarting job:', error)
      throw error
    }
  }

  /**
   * Resetea estadísticas del job
   */
  async resetJobStats(): Promise<JobStats> {
    try {
      const response = await api.delete(`${this.baseURL}/job/stats`)
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al resetear estadísticas')
      }

      return response.data.stats
    } catch (error) {
      console.error('Error resetting job stats:', error)
      throw error
    }
  }

  /**
   * Ejecuta limpieza de cotizaciones antiguas
   */
  async cleanupOldQuotes(daysToKeep: number = 30): Promise<{
    success: boolean
    message: string
    deletedCount?: number
  }> {
    try {
      const response = await api.post(`${this.baseURL}/cleanup`, { daysToKeep })
      return response.data
    } catch (error) {
      console.error('Error cleaning up old quotes:', error)
      throw error
    }
  }

  /**
   * Obtiene cotizaciones con filtros de fecha para gráficos
   */
  async getQuotesForChart(
    symbol: string,
    timeRange: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL' = '1M'
  ): Promise<QuoteWithInstrument[]> {
    const now = new Date()
    let fromDate: string | undefined

    switch (timeRange) {
      case '1D':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '1W':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '1M':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '3M':
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '6M':
        fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case '1Y':
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'ALL':
        fromDate = undefined
        break
    }

    const filters: QuoteHistoryFilters = {
      fromDate,
      limit: timeRange === '1D' ? 100 : timeRange === '1W' ? 200 : 500,
      orderBy: 'date',
      orderDirection: 'ASC'
    }

    const result = await this.getQuoteHistory(symbol, filters)
    return result.quotes
  }

  /**
   * Verifica si una cotización está actualizada (menos de X minutos)
   */
  isQuoteRecent(quote: QuoteData, maxAgeMinutes: number = 5): boolean {
    if (!quote.quote_date || !quote.quote_time) return false

    const quoteDateTime = new Date(`${quote.quote_date}T${quote.quote_time}`)
    const now = new Date()
    const ageMinutes = (now.getTime() - quoteDateTime.getTime()) / (1000 * 60)

    return ageMinutes <= maxAgeMinutes
  }

  /**
   * Calcula el cambio porcentual entre dos precios
   */
  calculatePercentageChange(currentPrice: number, previousPrice: number): number {
    if (previousPrice === 0) return 0
    return ((currentPrice - previousPrice) / previousPrice) * 100
  }

  /**
   * Formatea un precio para mostrar
   */
  formatPrice(price: number, decimals: number = 2): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(price)
  }

  /**
   * Formatea volumen para mostrar
   */
  formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toLocaleString('es-AR')
  }
}

// Singleton instance
export const quoteService = new QuoteService()