import Database from 'better-sqlite3'
import SimpleDatabaseConnection from '../database/simple-connection'

export interface TechnicalIndicatorData {
  id?: number
  symbol: string
  indicator: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH'
  period?: number
  value: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  strength: number
  metadata?: {
    sma20?: number
    sma50?: number
    sma200?: number
    ema12?: number
    ema26?: number
    macdLine?: number
    macdSignal?: number
    macdHistogram?: number
    rsiValue?: number
    yearHigh?: number
    yearLow?: number
    distanceFromHigh?: number
    distanceFromLow?: number
  }
  timestamp: Date
  created_at?: Date
  updated_at?: Date
}

export interface TechnicalIndicatorFilters {
  symbol?: string
  indicator?: string
  signal?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}

export interface TechnicalIndicatorStats {
  totalIndicators: number
  bySymbol: Record<string, number>
  byIndicator: Record<string, number>
  bySignal: Record<string, number>
  lastUpdate: Date | null
}

export class TechnicalIndicator {
  private db: Database.Database

  constructor() {
    this.db = SimpleDatabaseConnection.getInstance()
  }

  async create(data: Omit<TechnicalIndicatorData, 'id' | 'created_at' | 'updated_at'>): Promise<TechnicalIndicatorData> {
    const stmt = this.db.prepare(`
      INSERT INTO technical_indicators (
        symbol, indicator, period, value, signal, strength, metadata, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)

    const result = stmt.run(
      data.symbol,
      data.indicator,
      data.period || null,
      data.value,
      data.signal,
      data.strength,
      JSON.stringify(data.metadata || {}),
      data.timestamp.toISOString()
    )

    return this.findById(result.lastInsertRowid as number)!
  }

  findById(id: number): TechnicalIndicatorData | null {
    const stmt = this.db.prepare(`
      SELECT * FROM technical_indicators WHERE id = ?
    `)
    
    const row = stmt.get(id) as any
    if (!row) return null

    return this.transformRow(row)
  }

  findBySymbol(symbol: string, filters: Partial<TechnicalIndicatorFilters> = {}): TechnicalIndicatorData[] {
    let query = `
      SELECT * FROM technical_indicators 
      WHERE symbol = ?
    `
    const params: any[] = [symbol]

    if (filters.indicator) {
      query += ` AND indicator = ?`
      params.push(filters.indicator)
    }

    if (filters.signal) {
      query += ` AND signal = ?`
      params.push(filters.signal)
    }

    if (filters.fromDate) {
      query += ` AND timestamp >= ?`
      params.push(filters.fromDate.toISOString())
    }

    if (filters.toDate) {
      query += ` AND timestamp <= ?`
      params.push(filters.toDate.toISOString())
    }

    query += ` ORDER BY timestamp DESC`

    if (filters.limit) {
      query += ` LIMIT ?`
      params.push(filters.limit)
    }

    if (filters.offset) {
      query += ` OFFSET ?`
      params.push(filters.offset)
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => this.transformRow(row))
  }

  getLatestIndicators(symbol: string): TechnicalIndicatorData[] {
    const stmt = this.db.prepare(`
      SELECT ti1.* FROM technical_indicators ti1
      INNER JOIN (
        SELECT symbol, indicator, MAX(timestamp) as max_timestamp
        FROM technical_indicators
        WHERE symbol = ?
        GROUP BY symbol, indicator
      ) ti2 ON ti1.symbol = ti2.symbol 
        AND ti1.indicator = ti2.indicator 
        AND ti1.timestamp = ti2.max_timestamp
      ORDER BY ti1.timestamp DESC
    `)

    const rows = stmt.all(symbol) as any[]
    return rows.map(row => this.transformRow(row))
  }

  getActiveSignals(signals: string[] = ['BUY', 'SELL']): TechnicalIndicatorData[] {
    const placeholders = signals.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT ti1.* FROM technical_indicators ti1
      INNER JOIN (
        SELECT symbol, indicator, MAX(timestamp) as max_timestamp
        FROM technical_indicators
        WHERE signal IN (${placeholders})
        GROUP BY symbol, indicator
      ) ti2 ON ti1.symbol = ti2.symbol 
        AND ti1.indicator = ti2.indicator 
        AND ti1.timestamp = ti2.max_timestamp
      WHERE ti1.signal IN (${placeholders})
      ORDER BY ti1.strength DESC, ti1.timestamp DESC
    `)

    const rows = stmt.all(...signals, ...signals) as any[]
    return rows.map(row => this.transformRow(row))
  }

  search(filters: TechnicalIndicatorFilters): TechnicalIndicatorData[] {
    let query = `SELECT * FROM technical_indicators WHERE 1=1`
    const params: any[] = []

    if (filters.symbol) {
      query += ` AND symbol LIKE ?`
      params.push(`%${filters.symbol}%`)
    }

    if (filters.indicator) {
      query += ` AND indicator = ?`
      params.push(filters.indicator)
    }

    if (filters.signal) {
      query += ` AND signal = ?`
      params.push(filters.signal)
    }

    if (filters.fromDate) {
      query += ` AND timestamp >= ?`
      params.push(filters.fromDate.toISOString())
    }

    if (filters.toDate) {
      query += ` AND timestamp <= ?`
      params.push(filters.toDate.toISOString())
    }

    query += ` ORDER BY timestamp DESC`

    if (filters.limit) {
      query += ` LIMIT ?`
      params.push(filters.limit)
    }

    if (filters.offset) {
      query += ` OFFSET ?`
      params.push(filters.offset)
    }

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => this.transformRow(row))
  }

  batchUpsert(indicators: Omit<TechnicalIndicatorData, 'id' | 'created_at' | 'updated_at'>[]): number {
    const upsertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO technical_indicators (
        symbol, indicator, period, value, signal, strength, metadata, timestamp, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 
        COALESCE((SELECT created_at FROM technical_indicators WHERE symbol = ? AND indicator = ? AND timestamp = ?), datetime('now')),
        datetime('now')
      )
    `)

    const transaction = this.db.transaction((indicators) => {
      let count = 0
      for (const indicator of indicators) {
        upsertStmt.run(
          indicator.symbol,
          indicator.indicator,
          indicator.period || null,
          indicator.value,
          indicator.signal,
          indicator.strength,
          JSON.stringify(indicator.metadata || {}),
          indicator.timestamp.toISOString(),
          indicator.symbol,
          indicator.indicator,
          indicator.timestamp.toISOString()
        )
        count++
      }
      return count
    })

    return transaction(indicators)
  }

  deleteOldIndicators(daysToKeep: number = 90): number {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const stmt = this.db.prepare(`
      DELETE FROM technical_indicators 
      WHERE timestamp < ?
    `)

    const result = stmt.run(cutoffDate.toISOString())
    return result.changes
  }

  getStats(): TechnicalIndicatorStats {
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM technical_indicators
    `)
    const totalResult = totalStmt.get() as { total: number }

    const bySymbolStmt = this.db.prepare(`
      SELECT symbol, COUNT(*) as count 
      FROM technical_indicators 
      GROUP BY symbol
    `)
    const bySymbolResults = bySymbolStmt.all() as { symbol: string; count: number }[]

    const byIndicatorStmt = this.db.prepare(`
      SELECT indicator, COUNT(*) as count 
      FROM technical_indicators 
      GROUP BY indicator
    `)
    const byIndicatorResults = byIndicatorStmt.all() as { indicator: string; count: number }[]

    const bySignalStmt = this.db.prepare(`
      SELECT signal, COUNT(*) as count 
      FROM technical_indicators 
      GROUP BY signal
    `)
    const bySignalResults = bySignalStmt.all() as { signal: string; count: number }[]

    const lastUpdateStmt = this.db.prepare(`
      SELECT MAX(timestamp) as last_update FROM technical_indicators
    `)
    const lastUpdateResult = lastUpdateStmt.get() as { last_update: string | null }

    return {
      totalIndicators: totalResult.total,
      bySymbol: Object.fromEntries(bySymbolResults.map(r => [r.symbol, r.count])),
      byIndicator: Object.fromEntries(byIndicatorResults.map(r => [r.indicator, r.count])),
      bySignal: Object.fromEntries(bySignalResults.map(r => [r.signal, r.count])),
      lastUpdate: lastUpdateResult.last_update ? new Date(lastUpdateResult.last_update) : null
    }
  }

  getExtremes(symbol: string, days: number = 365): { yearHigh: number; yearLow: number; current: number } | null {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const stmt = this.db.prepare(`
      SELECT 
        MAX(q.high) as year_high,
        MIN(q.low) as year_low,
        q.close as current_price
      FROM quotes q
      INNER JOIN instruments i ON q.instrument_id = i.id
      WHERE i.ticker = ? AND q.date >= ?
      ORDER BY q.date DESC
      LIMIT 1
    `)

    const result = stmt.get(symbol, cutoffDate.toISOString()) as any
    if (!result) return null

    return {
      yearHigh: result.year_high,
      yearLow: result.year_low,
      current: result.current_price
    }
  }

  private transformRow(row: any): TechnicalIndicatorData {
    return {
      id: row.id,
      symbol: row.symbol,
      indicator: row.indicator,
      period: row.period,
      value: row.value,
      signal: row.signal,
      strength: row.strength,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      timestamp: new Date(row.timestamp),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }
  }
}

// Singleton instance
export const technicalIndicatorModel = new TechnicalIndicator()