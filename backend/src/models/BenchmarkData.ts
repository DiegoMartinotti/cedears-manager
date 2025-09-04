import DatabaseConnection from '../database/connection.js'
import { logger } from '../utils/logger.js'

export interface BenchmarkDataRecord {
  id?: number
  benchmark_id: number
  date: Date
  open_price?: number
  high_price?: number
  low_price?: number
  close_price: number
  volume?: number
  adjusted_close?: number
  dividend_amount?: number
  split_coefficient?: number
  created_at?: Date
}

export interface BenchmarkDataWithIndex extends BenchmarkDataRecord {
  benchmark_symbol?: string
  benchmark_name?: string
}

export interface BenchmarkPriceRange {
  start_date: Date
  end_date: Date
  start_price: number
  end_price: number
  min_price: number
  max_price: number
  total_return: number
  data_points: number
}

export class BenchmarkDataModel {
  private db = DatabaseConnection.getInstance()

  async create(benchmarkData: Omit<BenchmarkDataRecord, 'id' | 'created_at'>): Promise<BenchmarkDataRecord> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO benchmark_data (
          benchmark_id, date, open_price, high_price, low_price, close_price,
          volume, adjusted_close, dividend_amount, split_coefficient
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      const result = stmt.run(
        benchmarkData.benchmark_id,
        benchmarkData.date.toISOString().split('T')[0],
        benchmarkData.open_price || null,
        benchmarkData.high_price || null,
        benchmarkData.low_price || null,
        benchmarkData.close_price,
        benchmarkData.volume || null,
        benchmarkData.adjusted_close || null,
        benchmarkData.dividend_amount || 0.00,
        benchmarkData.split_coefficient || 1.0000
      )

      return await this.findById(result.lastInsertRowid as number)
    } catch (error) {
      logger.error('Error creating benchmark data:', error)
      throw new Error('Failed to create benchmark data')
    }
  }

  async createBatch(benchmarkDataList: Omit<BenchmarkDataRecord, 'id' | 'created_at'>[]): Promise<number> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO benchmark_data (
          benchmark_id, date, open_price, high_price, low_price, close_price,
          volume, adjusted_close, dividend_amount, split_coefficient
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      const transaction = this.db.transaction((dataList: any[]) => {
        let inserted = 0
        for (const data of dataList) {
          const result = stmt.run(
            data.benchmark_id,
            data.date.toISOString().split('T')[0],
            data.open_price || null,
            data.high_price || null,
            data.low_price || null,
            data.close_price,
            data.volume || null,
            data.adjusted_close || null,
            data.dividend_amount || 0.00,
            data.split_coefficient || 1.0000
          )
          if (result.changes > 0) inserted++
        }
        return inserted
      })

      return transaction(benchmarkDataList)
    } catch (error) {
      logger.error('Error creating benchmark data batch:', error)
      throw new Error('Failed to create benchmark data batch')
    }
  }

  async findById(id: number): Promise<BenchmarkDataRecord | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM benchmark_data WHERE id = ?')
      const result = stmt.get(id) as any
      
      if (!result) return null
      
      return {
        ...result,
        date: new Date(result.date),
        created_at: result.created_at ? new Date(result.created_at) : undefined
      }
    } catch (error) {
      logger.error('Error finding benchmark data by id:', error)
      throw new Error('Failed to find benchmark data')
    }
  }

  async findByBenchmarkAndDate(benchmarkId: number, date: Date): Promise<BenchmarkDataRecord | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM benchmark_data WHERE benchmark_id = ? AND date = ?')
      const result = stmt.get(benchmarkId, date.toISOString().split('T')[0]) as any
      
      if (!result) return null
      
      return {
        ...result,
        date: new Date(result.date),
        created_at: result.created_at ? new Date(result.created_at) : undefined
      }
    } catch (error) {
      logger.error('Error finding benchmark data by benchmark and date:', error)
      throw new Error('Failed to find benchmark data')
    }
  }

  async findByBenchmarkIdRange(
    benchmarkId: number, 
    startDate: Date, 
    endDate: Date,
    limit?: number
  ): Promise<BenchmarkDataRecord[]> {
    try {
      const limitClause = limit ? `LIMIT ${limit}` : ''
      const stmt = this.db.prepare(`
        SELECT * FROM benchmark_data 
        WHERE benchmark_id = ? AND date BETWEEN ? AND ? 
        ORDER BY date ASC ${limitClause}
      `)
      
      const results = stmt.all(
        benchmarkId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ) as any[]
      
      return results.map(result => ({
        ...result,
        date: new Date(result.date),
        created_at: result.created_at ? new Date(result.created_at) : undefined
      }))
    } catch (error) {
      logger.error('Error finding benchmark data by range:', error)
      throw new Error('Failed to find benchmark data by range')
    }
  }

  async findLatestByBenchmarkId(benchmarkId: number, limit: number = 1): Promise<BenchmarkDataRecord[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM benchmark_data 
        WHERE benchmark_id = ? 
        ORDER BY date DESC 
        LIMIT ?
      `)
      
      const results = stmt.all(benchmarkId, limit) as any[]
      
      return results.map(result => ({
        ...result,
        date: new Date(result.date),
        created_at: result.created_at ? new Date(result.created_at) : undefined
      }))
    } catch (error) {
      logger.error('Error finding latest benchmark data:', error)
      throw new Error('Failed to find latest benchmark data')
    }
  }

  async getDataWithIndexInfo(benchmarkId: number, startDate: Date, endDate: Date): Promise<BenchmarkDataWithIndex[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          bd.*,
          bi.symbol as benchmark_symbol,
          bi.name as benchmark_name
        FROM benchmark_data bd
        JOIN benchmark_indices bi ON bd.benchmark_id = bi.id
        WHERE bd.benchmark_id = ? AND bd.date BETWEEN ? AND ?
        ORDER BY bd.date ASC
      `)
      
      const results = stmt.all(
        benchmarkId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ) as any[]
      
      return results.map(result => ({
        ...result,
        date: new Date(result.date),
        created_at: result.created_at ? new Date(result.created_at) : undefined
      }))
    } catch (error) {
      logger.error('Error getting data with index info:', error)
      throw new Error('Failed to get data with index info')
    }
  }

  async getPriceRange(benchmarkId: number, startDate: Date, endDate: Date): Promise<BenchmarkPriceRange | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          MIN(date) as start_date,
          MAX(date) as end_date,
          COUNT(*) as data_points,
          MIN(close_price) as min_price,
          MAX(close_price) as max_price,
          (SELECT close_price FROM benchmark_data WHERE benchmark_id = ? AND date >= ? ORDER BY date ASC LIMIT 1) as start_price,
          (SELECT close_price FROM benchmark_data WHERE benchmark_id = ? AND date <= ? ORDER BY date DESC LIMIT 1) as end_price
        FROM benchmark_data 
        WHERE benchmark_id = ? AND date BETWEEN ? AND ?
      `)
      
      const result = stmt.get(benchmarkId, startDate.toISOString().split('T')[0], benchmarkId, endDate.toISOString().split('T')[0], benchmarkId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]) as any
      
      if (!result || !result.start_price) return null
      
      const totalReturn = ((result.end_price - result.start_price) / result.start_price) * 100
      
      return {
        start_date: new Date(result.start_date),
        end_date: new Date(result.end_date),
        start_price: result.start_price,
        end_price: result.end_price,
        min_price: result.min_price,
        max_price: result.max_price,
        total_return: totalReturn,
        data_points: result.data_points
      }
    } catch (error) {
      logger.error('Error getting price range:', error)
      throw new Error('Failed to get price range')
    }
  }

  async getLastUpdateDate(benchmarkId: number): Promise<Date | null> {
    try {
      const stmt = this.db.prepare('SELECT MAX(date) as last_date FROM benchmark_data WHERE benchmark_id = ?')
      const result = stmt.get(benchmarkId) as any
      
      return result?.last_date ? new Date(result.last_date) : null
    } catch (error) {
      logger.error('Error getting last update date:', error)
      throw new Error('Failed to get last update date')
    }
  }

  async deleteByBenchmarkId(benchmarkId: number): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM benchmark_data WHERE benchmark_id = ?')
      const result = stmt.run(benchmarkId)
      return result.changes
    } catch (error) {
      logger.error('Error deleting benchmark data:', error)
      throw new Error('Failed to delete benchmark data')
    }
  }

  async deleteOldData(benchmarkId: number, beforeDate: Date): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM benchmark_data WHERE benchmark_id = ? AND date < ?')
      const result = stmt.run(benchmarkId, beforeDate.toISOString().split('T')[0])
      return result.changes
    } catch (error) {
      logger.error('Error deleting old benchmark data:', error)
      throw new Error('Failed to delete old benchmark data')
    }
  }

  // Calculate returns for a benchmark over a period
  async calculateReturns(benchmarkId: number, startDate: Date, endDate: Date): Promise<{
    daily_returns: Array<{ date: Date; return: number }>
    total_return: number
    annualized_return: number
    volatility: number
  } | null> {
    try {
      const data = await this.findByBenchmarkIdRange(benchmarkId, startDate, endDate)
      
      if (data.length < 2) return null
      
      const dailyReturns: Array<{ date: Date; return: number }> = []
      
      for (let i = 1; i < data.length; i++) {
        const prevPrice = data[i - 1].close_price
        const currentPrice = data[i].close_price
        const dailyReturn = ((currentPrice - prevPrice) / prevPrice) * 100
        
        dailyReturns.push({
          date: data[i].date,
          return: dailyReturn
        })
      }
      
      const totalReturn = ((data[data.length - 1].close_price - data[0].close_price) / data[0].close_price) * 100
      
      // Calculate annualized return
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const annualizedReturn = (Math.pow(1 + (totalReturn / 100), 365 / days) - 1) * 100
      
      // Calculate volatility (standard deviation of daily returns)
      const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret.return, 0) / dailyReturns.length
      const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret.return - avgDailyReturn, 2), 0) / dailyReturns.length
      const volatility = Math.sqrt(variance * 252) // Annualized volatility
      
      return {
        daily_returns: dailyReturns,
        total_return: totalReturn,
        annualized_return: annualizedReturn,
        volatility
      }
    } catch (error) {
      logger.error('Error calculating returns:', error)
      throw new Error('Failed to calculate returns')
    }
  }

  async getStatistics(): Promise<{
    total_records: number
    benchmarks_with_data: number
    date_range: { oldest: Date | null; newest: Date | null }
    records_by_benchmark: Record<string, number>
  }> {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM benchmark_data')
      const benchmarksStmt = this.db.prepare('SELECT COUNT(DISTINCT benchmark_id) as count FROM benchmark_data')
      const dateRangeStmt = this.db.prepare('SELECT MIN(date) as oldest, MAX(date) as newest FROM benchmark_data')
      const recordsByBenchmarkStmt = this.db.prepare(`
        SELECT bi.symbol, COUNT(*) as count 
        FROM benchmark_data bd
        JOIN benchmark_indices bi ON bd.benchmark_id = bi.id
        GROUP BY bi.symbol
        ORDER BY count DESC
      `)
      
      const total = (totalStmt.get() as any).total
      const benchmarksCount = (benchmarksStmt.get() as any).count
      const dateRange = dateRangeStmt.get() as any
      const recordsByBenchmark = recordsByBenchmarkStmt.all() as any[]
      
      const recordsMap: Record<string, number> = {}
      recordsByBenchmark.forEach(record => recordsMap[record.symbol] = record.count)

      return {
        total_records: total,
        benchmarks_with_data: benchmarksCount,
        date_range: {
          oldest: dateRange?.oldest ? new Date(dateRange.oldest) : null,
          newest: dateRange?.newest ? new Date(dateRange.newest) : null
        },
        records_by_benchmark: recordsMap
      }
    } catch (error) {
      logger.error('Error getting benchmark data statistics:', error)
      throw new Error('Failed to get benchmark data statistics')
    }
  }
}

export const benchmarkDataModel = new BenchmarkDataModel()