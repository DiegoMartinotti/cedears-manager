import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'
import { InstrumentData } from './Instrument.js'

const logger = createLogger('Quote')

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
  instrument?: InstrumentData
}

export interface QuoteSearchFilters {
  instrumentId?: number
  symbol?: string
  fromDate?: string
  toDate?: string
  source?: string
  limit?: number
  orderBy?: 'date' | 'price'
  orderDirection?: 'ASC' | 'DESC'
}

export class Quote {
  private db = DatabaseConnection.getInstance()

  async create(data: Omit<QuoteData, 'id' | 'created_at'>): Promise<QuoteData> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO quotes (
          instrument_id, price, volume, high, low, close,
          quote_date, quote_time, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.instrument_id,
        data.price,
        data.volume || null,
        data.high || null,
        data.low || null,
        data.close || data.price, // Default close to price if not provided
        data.quote_date,
        data.quote_time || null,
        data.source || 'yahoo_finance'
      )

      return this.findById(result.lastInsertRowid as number)!
    } catch (error) {
      logger.error('Error creating quote:', error)
      throw new Error(`Failed to create quote: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: number): Promise<QuoteData | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM quotes WHERE id = ?')
      const result = stmt.get(id) as QuoteData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding quote by id:', error)
      throw new Error(`Failed to find quote: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findByInstrumentId(instrumentId: number, limit: number = 100): Promise<QuoteData[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM quotes 
        WHERE instrument_id = ? 
        ORDER BY quote_date DESC, quote_time DESC 
        LIMIT ?
      `)
      return stmt.all(instrumentId, limit) as QuoteData[]
    } catch (error) {
      logger.error('Error finding quotes by instrument id:', error)
      throw new Error(`Failed to find quotes: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findBySymbol(symbol: string, limit: number = 100): Promise<QuoteWithInstrument[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          q.*,
          i.symbol,
          i.company_name,
          i.sector,
          i.underlying_symbol
        FROM quotes q
        INNER JOIN instruments i ON q.instrument_id = i.id
        WHERE i.symbol = ? AND i.is_active = 1
        ORDER BY q.quote_date DESC, q.quote_time DESC
        LIMIT ?
      `)
      
      const results = stmt.all(symbol.toUpperCase(), limit) as any[]
      
      return results.map(row => ({
        id: row.id,
        instrument_id: row.instrument_id,
        price: row.price,
        volume: row.volume,
        high: row.high,
        low: row.low,
        close: row.close,
        quote_date: row.quote_date,
        quote_time: row.quote_time,
        source: row.source,
        created_at: row.created_at,
        instrument: {
          id: row.instrument_id,
          symbol: row.symbol,
          company_name: row.company_name,
          sector: row.sector,
          underlying_symbol: row.underlying_symbol
        }
      }))
    } catch (error) {
      logger.error('Error finding quotes by symbol:', error)
      throw new Error(`Failed to find quotes: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async search(filters: QuoteSearchFilters): Promise<QuoteWithInstrument[]> {
    try {
      let query = `
        SELECT 
          q.*,
          i.symbol,
          i.company_name,
          i.sector,
          i.underlying_symbol
        FROM quotes q
        INNER JOIN instruments i ON q.instrument_id = i.id
        WHERE i.is_active = 1
      `
      const params: any[] = []

      if (filters.instrumentId) {
        query += ' AND q.instrument_id = ?'
        params.push(filters.instrumentId)
      }

      if (filters.symbol) {
        query += ' AND i.symbol = ?'
        params.push(filters.symbol.toUpperCase())
      }

      if (filters.fromDate) {
        query += ' AND q.quote_date >= ?'
        params.push(filters.fromDate)
      }

      if (filters.toDate) {
        query += ' AND q.quote_date <= ?'
        params.push(filters.toDate)
      }

      if (filters.source) {
        query += ' AND q.source = ?'
        params.push(filters.source)
      }

      // Order by
      const orderBy = filters.orderBy === 'price' ? 'q.price' : 'q.quote_date'
      const direction = filters.orderDirection || 'DESC'
      query += ` ORDER BY ${orderBy} ${direction}, q.quote_time ${direction}`

      // Limit
      const limit = filters.limit || 100
      query += ' LIMIT ?'
      params.push(limit)

      const stmt = this.db.prepare(query)
      const results = stmt.all(...params) as any[]

      return results.map(row => ({
        id: row.id,
        instrument_id: row.instrument_id,
        price: row.price,
        volume: row.volume,
        high: row.high,
        low: row.low,
        close: row.close,
        quote_date: row.quote_date,
        quote_time: row.quote_time,
        source: row.source,
        created_at: row.created_at,
        instrument: {
          id: row.instrument_id,
          symbol: row.symbol,
          company_name: row.company_name,
          sector: row.sector,
          underlying_symbol: row.underlying_symbol
        }
      }))
    } catch (error) {
      logger.error('Error searching quotes:', error)
      throw new Error(`Failed to search quotes: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getLatestQuote(instrumentId: number): Promise<QuoteData | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM quotes 
        WHERE instrument_id = ? 
        ORDER BY quote_date DESC, quote_time DESC 
        LIMIT 1
      `)
      const result = stmt.get(instrumentId) as QuoteData | undefined
      return result || null
    } catch (error) {
      logger.error('Error getting latest quote:', error)
      throw new Error(`Failed to get latest quote: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getLatestQuoteBySymbol(symbol: string): Promise<QuoteWithInstrument | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          q.*,
          i.symbol,
          i.company_name,
          i.sector,
          i.underlying_symbol
        FROM quotes q
        INNER JOIN instruments i ON q.instrument_id = i.id
        WHERE i.symbol = ? AND i.is_active = 1
        ORDER BY q.quote_date DESC, q.quote_time DESC
        LIMIT 1
      `)
      
      const row = stmt.get(symbol.toUpperCase()) as any
      
      if (!row) return null
      
      return {
        id: row.id,
        instrument_id: row.instrument_id,
        price: row.price,
        volume: row.volume,
        high: row.high,
        low: row.low,
        close: row.close,
        quote_date: row.quote_date,
        quote_time: row.quote_time,
        source: row.source,
        created_at: row.created_at,
        instrument: {
          id: row.instrument_id,
          symbol: row.symbol,
          company_name: row.company_name,
          sector: row.sector,
          underlying_symbol: row.underlying_symbol
        }
      }
    } catch (error) {
      logger.error('Error getting latest quote by symbol:', error)
      throw new Error(`Failed to get latest quote: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async upsertQuote(data: Omit<QuoteData, 'id' | 'created_at'>): Promise<QuoteData> {
    try {
      // Try to find existing quote for the same instrument and date
      const existingStmt = this.db.prepare(`
        SELECT id FROM quotes 
        WHERE instrument_id = ? AND quote_date = ?
      `)
      const existing = existingStmt.get(data.instrument_id, data.quote_date) as { id: number } | undefined

      if (existing) {
        // Update existing quote
        const updateStmt = this.db.prepare(`
          UPDATE quotes 
          SET price = ?, volume = ?, high = ?, low = ?, close = ?, 
              quote_time = ?, source = ?
          WHERE id = ?
        `)
        
        updateStmt.run(
          data.price,
          data.volume || null,
          data.high || null,
          data.low || null,
          data.close || data.price,
          data.quote_time || null,
          data.source || 'yahoo_finance',
          existing.id
        )
        
        return this.findById(existing.id)!
      } else {
        // Create new quote
        return this.create(data)
      }
    } catch (error) {
      logger.error('Error upserting quote:', error)
      throw new Error(`Failed to upsert quote: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async batchUpsert(quotes: Omit<QuoteData, 'id' | 'created_at'>[]): Promise<number> {
    if (quotes.length === 0) return 0

    try {
      const transaction = this.db.transaction((quotesToInsert: typeof quotes) => {
        let processedCount = 0
        
        for (const quote of quotesToInsert) {
          this.upsertQuote(quote)
          processedCount++
        }
        
        return processedCount
      })

      return transaction(quotes)
    } catch (error) {
      logger.error('Error batch upserting quotes:', error)
      throw new Error(`Failed to batch upsert quotes: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async deleteOldQuotes(beforeDate: string): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM quotes WHERE quote_date < ?')
      const result = stmt.run(beforeDate)
      return result.changes
    } catch (error) {
      logger.error('Error deleting old quotes:', error)
      throw new Error(`Failed to delete old quotes: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getQuoteCount(): Promise<number> {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM quotes')
      const result = stmt.get() as { count: number }
      return result.count
    } catch (error) {
      logger.error('Error getting quote count:', error)
      throw new Error(`Failed to get quote count: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getDateRange(): Promise<{ earliest: string | null, latest: string | null }> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          MIN(quote_date) as earliest,
          MAX(quote_date) as latest
        FROM quotes
      `)
      const result = stmt.get() as { earliest: string | null, latest: string | null }
      return result
    } catch (error) {
      logger.error('Error getting date range:', error)
      throw new Error(`Failed to get date range: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getWatchlistQuotes(limit: number = 50): Promise<QuoteWithInstrument[]> {
    try {
      // Get latest quote for each active instrument
      const stmt = this.db.prepare(`
        SELECT 
          q.*,
          i.symbol,
          i.company_name,
          i.sector,
          i.underlying_symbol
        FROM quotes q
        INNER JOIN instruments i ON q.instrument_id = i.id
        INNER JOIN (
          SELECT instrument_id, MAX(quote_date) as max_date
          FROM quotes
          GROUP BY instrument_id
        ) latest ON q.instrument_id = latest.instrument_id 
                AND q.quote_date = latest.max_date
        WHERE i.is_active = 1
        ORDER BY i.symbol ASC
        LIMIT ?
      `)
      
      const results = stmt.all(limit) as any[]
      
      return results.map(row => ({
        id: row.id,
        instrument_id: row.instrument_id,
        price: row.price,
        volume: row.volume,
        high: row.high,
        low: row.low,
        close: row.close,
        quote_date: row.quote_date,
        quote_time: row.quote_time,
        source: row.source,
        created_at: row.created_at,
        instrument: {
          id: row.instrument_id,
          symbol: row.symbol,
          company_name: row.company_name,
          sector: row.sector,
          underlying_symbol: row.underlying_symbol
        }
      }))
    } catch (error) {
      logger.error('Error getting watchlist quotes:', error)
      throw new Error(`Failed to get watchlist quotes: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}