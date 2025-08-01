import yahooFinance from 'yahoo-finance2'
import { Quote, QuoteData, QuoteSearchFilters } from '../models/Quote.js'
import { Instrument } from '../models/Instrument.js'
import { CacheService } from './cacheService.js'
import { RateLimitService } from './rateLimitService.js'
import { createLogger } from '../utils/logger.js'
import { format, isWeekend, isAfter, isBefore, parseISO } from 'date-fns'

const logger = createLogger('QuoteService')

export interface YahooQuoteData {
  symbol: string
  regularMarketTime: Date
  regularMarketPrice: number
  regularMarketVolume?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketPreviousClose?: number
}

export interface QuoteUpdateResult {
  success: boolean
  symbol: string
  price?: number
  error?: string
  cached?: boolean
  source: string
}

export interface MarketHours {
  isOpen: boolean
  nextOpen?: Date
  nextClose?: Date
  timezone: string
}

export class QuoteService {
  private quoteModel = new Quote()
  private instrumentModel = new Instrument()
  private cache: CacheService
  private rateLimiter: RateLimitService

  // Configuración de mercado
  private readonly MARKET_TIMEZONE = 'America/New_York'
  private readonly MARKET_OPEN_HOUR = 9
  private readonly MARKET_OPEN_MINUTE = 30
  private readonly MARKET_CLOSE_HOUR = 16
  private readonly MARKET_CLOSE_MINUTE = 0

  // Configuración de cache
  private readonly CACHE_TTL_MARKET_OPEN = 2 * 60 * 1000 // 2 minutos durante mercado abierto
  private readonly CACHE_TTL_MARKET_CLOSED = 30 * 60 * 1000 // 30 minutos fuera de horario
  private readonly CACHE_TTL_WEEKEND = 60 * 60 * 1000 // 1 hora los fines de semana

  constructor() {
    this.cache = new CacheService({
      defaultTTL: this.CACHE_TTL_MARKET_CLOSED,
      maxEntries: 1000,
      cleanupIntervalMs: 60000
    })

    this.rateLimiter = new RateLimitService({
      maxRequestsPerMinute: 60, // Yahoo Finance permite hasta 2000/hora
      maxRequestsPerHour: 1800, // Conservador para evitar limits
      maxConcurrentRequests: 10
    })

    logger.info('QuoteService initialized', {
      marketTimezone: this.MARKET_TIMEZONE,
      cacheConfig: {
        marketOpen: this.CACHE_TTL_MARKET_OPEN,
        marketClosed: this.CACHE_TTL_MARKET_CLOSED,
        weekend: this.CACHE_TTL_WEEKEND
      }
    })
  }

  /**
   * Obtiene cotización de un símbolo desde Yahoo Finance con cache
   */
  async getQuote(symbol: string, forceRefresh: boolean = false): Promise<QuoteUpdateResult> {
    try {
      const cacheKey = `quote:${symbol.toUpperCase()}`
      
      // Verificar cache si no es refresh forzado
      if (!forceRefresh) {
        const cachedQuote = this.cache.get<QuoteUpdateResult>(cacheKey)
        if (cachedQuote) {
          logger.debug('Quote retrieved from cache', { symbol, cachedQuote })
          return { ...cachedQuote, cached: true }
        }
      }

      // Buscar instrumento en DB
      const instrument = await this.instrumentModel.findBySymbol(symbol)
      if (!instrument) {
        return {
          success: false,
          symbol,
          error: `Instrument ${symbol} not found`,
          source: 'database'
        }
      }

      // Obtener cotización de Yahoo Finance con rate limiting
      const result = await this.rateLimiter.executeWithLimit(async () => {
        return await this.fetchYahooQuote(symbol)
      })

      if (result.success && result.price) {
        // Guardar en base de datos
        await this.saveQuoteToDatabase(instrument.id!, {
          price: result.price,
          volume: (result as any).volume,
          high: (result as any).high,
          low: (result as any).low,
          close: (result as any).close,
          quote_date: format(new Date(), 'yyyy-MM-dd'),
          quote_time: format(new Date(), 'HH:mm:ss'),
          source: 'yahoo_finance'
        })

        // Guardar en cache con TTL adaptativo
        const ttl = this.getAdaptiveCacheTTL()
        this.cache.set(cacheKey, result, ttl)

        logger.info('Quote updated successfully', { 
          symbol, 
          price: result.price, 
          ttl 
        })
      }

      return result
    } catch (error) {
      logger.error('Error getting quote', { symbol, error })
      return {
        success: false,
        symbol,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'yahoo_finance'
      }
    }
  }

  /**
   * Obtiene cotizaciones de múltiples símbolos en lote
   */
  async getBatchQuotes(symbols: string[], forceRefresh: boolean = false): Promise<QuoteUpdateResult[]> {
    logger.info('Getting batch quotes', { symbols: symbols.length, forceRefresh })

    const results: QuoteUpdateResult[] = []
    const symbolsToFetch: string[] = []

    // Verificar cache para cada símbolo
    if (!forceRefresh) {
      for (const symbol of symbols) {
        const cacheKey = `quote:${symbol.toUpperCase()}`
        const cachedQuote = this.cache.get<QuoteUpdateResult>(cacheKey)
        
        if (cachedQuote) {
          results.push({ ...cachedQuote, cached: true })
        } else {
          symbolsToFetch.push(symbol)
        }
      }
    } else {
      symbolsToFetch.push(...symbols)
    }

    // Obtener cotizaciones faltantes con rate limiting
    if (symbolsToFetch.length > 0) {
      logger.debug('Fetching quotes from Yahoo Finance', { symbols: symbolsToFetch })

      // Procesar en chunks para evitar sobrecarga
      const chunkSize = 10
      for (let i = 0; i < symbolsToFetch.length; i += chunkSize) {
        const chunk = symbolsToFetch.slice(i, i + chunkSize)
        
        const chunkPromises = chunk.map(symbol => 
          this.getQuote(symbol, true).catch(error => ({
            success: false,
            symbol,
            error: error.message,
            source: 'yahoo_finance'
          } as QuoteUpdateResult))
        )

        const chunkResults = await Promise.all(chunkPromises)
        results.push(...chunkResults)

        // Pequeña pausa entre chunks para evitar rate limits
        if (i + chunkSize < symbolsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    const successCount = results.filter(r => r.success).length
    logger.info('Batch quotes completed', { 
      total: symbols.length, 
      success: successCount, 
      failed: symbols.length - successCount 
    })

    return results
  }

  /**
   * Obtiene cotizaciones de todos los instrumentos activos
   */
  async updateAllWatchlistQuotes(): Promise<QuoteUpdateResult[]> {
    try {
      const activeInstruments = await this.instrumentModel.findAll({ isActive: true })
      const symbols = activeInstruments.map(i => i.symbol)
      
      logger.info('Updating all watchlist quotes', { count: symbols.length })
      
      return await this.getBatchQuotes(symbols, false)
    } catch (error) {
      logger.error('Error updating watchlist quotes', { error })
      throw error
    }
  }

  /**
   * Obtiene historial de cotizaciones desde la base de datos
   */
  async getQuoteHistory(
    symbol: string, 
    filters: Partial<QuoteSearchFilters> = {}
  ): Promise<QuoteData[]> {
    try {
      const searchFilters: QuoteSearchFilters = {
        symbol: symbol.toUpperCase(),
        limit: filters.limit || 100,
        orderBy: filters.orderBy || 'date',
        orderDirection: filters.orderDirection || 'DESC',
        ...filters
      }

      return await this.quoteModel.search(searchFilters)
    } catch (error) {
      logger.error('Error getting quote history', { symbol, error })
      throw error
    }
  }

  /**
   * Obtiene la última cotización de un símbolo desde la base de datos
   */
  async getLatestQuote(symbol: string): Promise<QuoteData | null> {
    try {
      const result = await this.quoteModel.getLatestQuoteBySymbol(symbol)
      return result || null
    } catch (error) {
      logger.error('Error getting latest quote', { symbol, error })
      throw error
    }
  }

  /**
   * Obtiene últimas cotizaciones de todos los instrumentos en watchlist
   */
  async getWatchlistQuotes(): Promise<QuoteData[]> {
    try {
      return await this.quoteModel.getWatchlistQuotes()
    } catch (error) {
      logger.error('Error getting watchlist quotes', { error })
      throw error
    }
  }

  /**
   * Verifica si el mercado está abierto
   */
  getMarketHours(): MarketHours {
    const now = new Date()
    const isWeekendDay = isWeekend(now)
    
    if (isWeekendDay) {
      return {
        isOpen: false,
        timezone: this.MARKET_TIMEZONE
      }
    }

    const marketOpen = new Date()
    marketOpen.setHours(this.MARKET_OPEN_HOUR, this.MARKET_OPEN_MINUTE, 0, 0)
    
    const marketClose = new Date()
    marketClose.setHours(this.MARKET_CLOSE_HOUR, this.MARKET_CLOSE_MINUTE, 0, 0)

    const isOpen = isAfter(now, marketOpen) && isBefore(now, marketClose)

    return {
      isOpen,
      nextOpen: isOpen ? undefined : marketOpen,
      nextClose: isOpen ? marketClose : undefined,
      timezone: this.MARKET_TIMEZONE
    }
  }

  /**
   * Limpia cotizaciones antiguas (más de 30 días)
   */
  async cleanupOldQuotes(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      
      const deletedCount = await this.quoteModel.deleteOldQuotes(
        format(cutoffDate, 'yyyy-MM-dd')
      )
      
      logger.info('Old quotes cleaned up', { deletedCount, cutoffDate })
      return deletedCount
    } catch (error) {
      logger.error('Error cleaning up old quotes', { error })
      throw error
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  async getServiceStats() {
    try {
      const quoteCount = await this.quoteModel.getQuoteCount()
      const dateRange = await this.quoteModel.getDateRange()
      const cacheStats = this.cache.getStats()
      const rateLimitStats = this.rateLimiter.getStats()
      const marketHours = this.getMarketHours()

      return {
        quotes: {
          total: quoteCount,
          dateRange
        },
        cache: cacheStats,
        rateLimit: rateLimitStats,
        market: marketHours
      }
    } catch (error) {
      logger.error('Error getting service stats', { error })
      throw error
    }
  }

  /**
   * Obtiene cotización desde Yahoo Finance (método privado)
   */
  private async fetchYahooQuote(symbol: string): Promise<QuoteUpdateResult> {
    try {
      const quote = await yahooFinance.quoteSummary(symbol, { 
        modules: ['price', 'summaryDetail'] 
      })

      if (!quote?.price) {
        return {
          success: false,
          symbol,
          error: 'No price data available',
          source: 'yahoo_finance'
        }
      }

      const price = quote.price.regularMarketPrice
      if (!price || price <= 0) {
        return {
          success: false,
          symbol,
          error: 'Invalid price data',
          source: 'yahoo_finance'
        }
      }

      return {
        success: true,
        symbol,
        price,
        source: 'yahoo_finance'
      }
    } catch (error) {
      logger.error('Yahoo Finance API error', { symbol, error })
      return {
        success: false,
        symbol,
        error: error instanceof Error ? error.message : 'Yahoo Finance API error',
        source: 'yahoo_finance'
      }
    }
  }

  /**
   * Guarda cotización en la base de datos
   */
  private async saveQuoteToDatabase(
    instrumentId: number, 
    quoteData: Omit<QuoteData, 'id' | 'instrument_id' | 'created_at'>
  ): Promise<void> {
    try {
      await this.quoteModel.upsertQuote({
        instrument_id: instrumentId,
        ...quoteData
      })
    } catch (error) {
      logger.error('Error saving quote to database', { instrumentId, error })
      throw error
    }
  }

  /**
   * Calcula TTL adaptativo basado en horario de mercado
   */
  private getAdaptiveCacheTTL(): number {
    const marketHours = this.getMarketHours()
    const now = new Date()
    
    if (isWeekend(now)) {
      return this.CACHE_TTL_WEEKEND
    }
    
    if (marketHours.isOpen) {
      return this.CACHE_TTL_MARKET_OPEN
    }
    
    return this.CACHE_TTL_MARKET_CLOSED
  }

  /**
   * Cierra el servicio y libera recursos
   */
  shutdown(): void {
    this.cache.shutdown()
    this.rateLimiter.shutdown()
    logger.info('QuoteService shut down')
  }
}

// Singleton instance
export const quoteService = new QuoteService()