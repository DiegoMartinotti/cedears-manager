import { DatabaseConnection } from '../database/connection.js'
import logger from '../utils/logger.js'

export interface BenchmarkIndex {
  id?: number
  symbol: string
  name: string
  description?: string
  country: string
  currency: string
  category: 'EQUITY' | 'BOND' | 'COMMODITY' | 'CURRENCY'
  subcategory?: string
  data_source: string
  is_active: boolean
  update_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  last_update?: Date
  created_at?: Date
  updated_at?: Date
}

export interface BenchmarkData {
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

export interface PortfolioBenchmarkComparison {
  id?: number
  comparison_date: Date
  benchmark_id: number
  portfolio_return: number
  benchmark_return: number
  outperformance: number
  portfolio_value: number
  benchmark_normalized_value: number
  period_type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  volatility_portfolio?: number
  volatility_benchmark?: number
  correlation?: number
  beta?: number
  created_at?: Date
}

export interface PerformanceMetrics {
  id?: number
  calculation_date: Date
  benchmark_id?: number
  period_days: number
  portfolio_return: number
  benchmark_return?: number
  excess_return?: number
  portfolio_volatility: number
  benchmark_volatility?: number
  sharpe_ratio?: number
  information_ratio?: number
  tracking_error?: number
  max_drawdown?: number
  calmar_ratio?: number
  sortino_ratio?: number
  alpha?: number
  beta?: number
  r_squared?: number
  var_95?: number
  var_99?: number
  created_at?: Date
}

export interface RiskFreeRate {
  id?: number
  date: Date
  country: string
  rate_type: string
  annual_rate: number
  daily_rate: number
  source: string
  created_at?: Date
}

export interface BenchmarkPerformanceSummary {
  id?: number
  benchmark_id: number
  summary_date: Date
  period: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL'
  start_date: Date
  end_date: Date
  start_value: number
  end_value: number
  total_return: number
  annualized_return?: number
  volatility?: number
  max_drawdown?: number
  best_day?: number
  worst_day?: number
  positive_days?: number
  negative_days?: number
  created_at?: Date
  updated_at?: Date
}

export class BenchmarkIndicesModel {
  private db = DatabaseConnection.getInstance()

  async create(benchmarkIndex: Omit<BenchmarkIndex, 'id' | 'created_at' | 'updated_at'>): Promise<BenchmarkIndex> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO benchmark_indices (
          symbol, name, description, country, currency, category, subcategory, 
          data_source, is_active, update_frequency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      const result = stmt.run(
        benchmarkIndex.symbol,
        benchmarkIndex.name,
        benchmarkIndex.description || null,
        benchmarkIndex.country,
        benchmarkIndex.currency,
        benchmarkIndex.category,
        benchmarkIndex.subcategory || null,
        benchmarkIndex.data_source,
        benchmarkIndex.is_active ? 1 : 0,
        benchmarkIndex.update_frequency
      )

      return await this.findById(result.lastInsertRowid as number)
    } catch (error) {
      logger.error('Error creating benchmark index:', error)
      throw new Error('Failed to create benchmark index')
    }
  }

  async findById(id: number): Promise<BenchmarkIndex | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM benchmark_indices WHERE id = ?')
      const result = stmt.get(id) as any
      
      if (!result) return null
      
      return {
        ...result,
        is_active: !!result.is_active,
        created_at: result.created_at ? new Date(result.created_at) : undefined,
        updated_at: result.updated_at ? new Date(result.updated_at) : undefined,
        last_update: result.last_update ? new Date(result.last_update) : undefined
      }
    } catch (error) {
      logger.error('Error finding benchmark index by id:', error)
      throw new Error('Failed to find benchmark index')
    }
  }

  async findBySymbol(symbol: string): Promise<BenchmarkIndex | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM benchmark_indices WHERE symbol = ?')
      const result = stmt.get(symbol) as any
      
      if (!result) return null
      
      return {
        ...result,
        is_active: !!result.is_active,
        created_at: result.created_at ? new Date(result.created_at) : undefined,
        updated_at: result.updated_at ? new Date(result.updated_at) : undefined,
        last_update: result.last_update ? new Date(result.last_update) : undefined
      }
    } catch (error) {
      logger.error('Error finding benchmark index by symbol:', error)
      throw new Error('Failed to find benchmark index')
    }
  }

  async findAll(activeOnly: boolean = true): Promise<BenchmarkIndex[]> {
    try {
      const whereClause = activeOnly ? 'WHERE is_active = 1' : ''
      const stmt = this.db.prepare(`SELECT * FROM benchmark_indices ${whereClause} ORDER BY country, category, name`)
      const results = stmt.all() as any[]
      
      return results.map(result => ({
        ...result,
        is_active: !!result.is_active,
        created_at: result.created_at ? new Date(result.created_at) : undefined,
        updated_at: result.updated_at ? new Date(result.updated_at) : undefined,
        last_update: result.last_update ? new Date(result.last_update) : undefined
      }))
    } catch (error) {
      logger.error('Error finding all benchmark indices:', error)
      throw new Error('Failed to find benchmark indices')
    }
  }

  async findByCategory(category: string): Promise<BenchmarkIndex[]> {
    try {
      const stmt = this.db.prepare('SELECT * FROM benchmark_indices WHERE category = ? AND is_active = 1 ORDER BY name')
      const results = stmt.all(category) as any[]
      
      return results.map(result => ({
        ...result,
        is_active: !!result.is_active,
        created_at: result.created_at ? new Date(result.created_at) : undefined,
        updated_at: result.updated_at ? new Date(result.updated_at) : undefined,
        last_update: result.last_update ? new Date(result.last_update) : undefined
      }))
    } catch (error) {
      logger.error('Error finding benchmark indices by category:', error)
      throw new Error('Failed to find benchmark indices')
    }
  }

  async update(id: number, updates: Partial<BenchmarkIndex>): Promise<BenchmarkIndex> {
    try {
      const fields = []
      const values = []
      
      if (updates.name !== undefined) {
        fields.push('name = ?')
        values.push(updates.name)
      }
      if (updates.description !== undefined) {
        fields.push('description = ?')
        values.push(updates.description)
      }
      if (updates.is_active !== undefined) {
        fields.push('is_active = ?')
        values.push(updates.is_active ? 1 : 0)
      }
      if (updates.update_frequency !== undefined) {
        fields.push('update_frequency = ?')
        values.push(updates.update_frequency)
      }
      if (updates.last_update !== undefined) {
        fields.push('last_update = ?')
        values.push(updates.last_update.toISOString())
      }

      fields.push('updated_at = CURRENT_TIMESTAMP')
      values.push(id)

      const stmt = this.db.prepare(`UPDATE benchmark_indices SET ${fields.join(', ')} WHERE id = ?`)
      stmt.run(...values)

      return await this.findById(id)
    } catch (error) {
      logger.error('Error updating benchmark index:', error)
      throw new Error('Failed to update benchmark index')
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM benchmark_indices WHERE id = ?')
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      logger.error('Error deleting benchmark index:', error)
      throw new Error('Failed to delete benchmark index')
    }
  }

  // Helper method to get statistics
  async getStatistics(): Promise<{
    total_indices: number
    active_indices: number
    by_category: Record<string, number>
    by_country: Record<string, number>
  }> {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM benchmark_indices')
      const activeStmt = this.db.prepare('SELECT COUNT(*) as active FROM benchmark_indices WHERE is_active = 1')
      const categoryStmt = this.db.prepare('SELECT category, COUNT(*) as count FROM benchmark_indices WHERE is_active = 1 GROUP BY category')
      const countryStmt = this.db.prepare('SELECT country, COUNT(*) as count FROM benchmark_indices WHERE is_active = 1 GROUP BY country')
      
      const total = (totalStmt.get() as any).total
      const active = (activeStmt.get() as any).active
      const categories = categoryStmt.all() as any[]
      const countries = countryStmt.all() as any[]
      
      const by_category: Record<string, number> = {}
      categories.forEach(cat => by_category[cat.category] = cat.count)
      
      const by_country: Record<string, number> = {}
      countries.forEach(country => by_country[country.country] = country.count)

      return {
        total_indices: total,
        active_indices: active,
        by_category,
        by_country
      }
    } catch (error) {
      logger.error('Error getting benchmark statistics:', error)
      throw new Error('Failed to get benchmark statistics')
    }
  }
}

export const benchmarkIndicesModel = new BenchmarkIndicesModel()