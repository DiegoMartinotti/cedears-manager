import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('UVA')

export interface UVAData {
  id?: number
  date: string
  value: number
  source?: string
  created_at?: string
  updated_at?: string
}

export interface UVASearchFilters {
  fromDate?: string
  toDate?: string
  source?: string
  limit?: number
  orderBy?: 'date' | 'value'
  orderDirection?: 'ASC' | 'DESC'
}

export interface UVAInflationAdjustment {
  originalAmount: number
  adjustedAmount: number
  inflationRate: number
  fromDate: string
  toDate: string
  fromUVA?: number
  toUVA?: number
}

export class UVA {
  private db = DatabaseConnection.getInstance()

  async create(data: Omit<UVAData, 'id' | 'created_at' | 'updated_at'>): Promise<UVAData> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO uva_values (date, value, source) 
        VALUES (?, ?, ?)
      `)

      const result = stmt.run(
        data.date,
        data.value,
        data.source || 'bcra'
      )

      const created = await this.findById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created UVA value')
      }
      return created
    } catch (error) {
      logger.error('Error creating UVA value:', error)
      throw new Error(`Failed to create UVA value: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: number): Promise<UVAData | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM uva_values WHERE id = ?')
      const result = stmt.get(id) as UVAData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding UVA value by id:', error)
      throw new Error(`Failed to find UVA value: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findByDate(date: string): Promise<UVAData | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM uva_values WHERE date = ?')
      const result = stmt.get(date) as UVAData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding UVA value by date:', error)
      throw new Error(`Failed to find UVA value: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findLatest(): Promise<UVAData | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM uva_values 
        ORDER BY date DESC 
        LIMIT 1
      `)
      const result = stmt.get() as UVAData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding latest UVA value:', error)
      throw new Error(`Failed to find latest UVA value: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findLatestBefore(date: string): Promise<UVAData | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM uva_values 
        WHERE date <= ? 
        ORDER BY date DESC 
        LIMIT 1
      `)
      const result = stmt.get(date) as UVAData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding latest UVA value before date:', error)
      throw new Error(`Failed to find latest UVA value: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async search(filters: UVASearchFilters): Promise<UVAData[]> {
    try {
      let query = 'SELECT * FROM uva_values WHERE 1=1'
      const params: any[] = []

      if (filters.fromDate) {
        query += ' AND date >= ?'
        params.push(filters.fromDate)
      }

      if (filters.toDate) {
        query += ' AND date <= ?'
        params.push(filters.toDate)
      }

      if (filters.source) {
        query += ' AND source = ?'
        params.push(filters.source)
      }

      // Order by
      const orderBy = filters.orderBy === 'value' ? 'value' : 'date'
      const direction = filters.orderDirection || 'DESC'
      query += ` ORDER BY ${orderBy} ${direction}`

      // Limit
      const limit = filters.limit || 100
      query += ' LIMIT ?'
      params.push(limit)

      const stmt = this.db.prepare(query)
      return stmt.all(...params) as UVAData[]
    } catch (error) {
      logger.error('Error searching UVA values:', error)
      throw new Error(`Failed to search UVA values: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async upsertUVA(data: Omit<UVAData, 'id' | 'created_at' | 'updated_at'>): Promise<UVAData> {
    try {
      // Try to find existing UVA value for the same date
      const existing = await this.findByDate(data.date)

      if (existing) {
        // Update existing UVA value
        const updateStmt = this.db.prepare(`
          UPDATE uva_values 
          SET value = ?, source = ?, updated_at = CURRENT_TIMESTAMP
          WHERE date = ?
        `)
        
        updateStmt.run(data.value, data.source || 'bcra', data.date)
        const updated = await this.findByDate(data.date)
        if (!updated) {
          throw new Error('Failed to retrieve updated UVA value')
        }
        return updated
      } else {
        // Create new UVA value
        return this.create(data)
      }
    } catch (error) {
      logger.error('Error upserting UVA value:', error)
      throw new Error(`Failed to upsert UVA value: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async batchUpsert(uvaValues: Omit<UVAData, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    if (uvaValues.length === 0) return 0

    try {
      const transaction = this.db.transaction((valuesToInsert: typeof uvaValues) => {
        let processedCount = 0
        
        for (const uvaValue of valuesToInsert) {
          this.upsertUVA(uvaValue)
          processedCount++
        }
        
        return processedCount
      })

      return transaction(uvaValues)
    } catch (error) {
      logger.error('Error batch upserting UVA values:', error)
      throw new Error(`Failed to batch upsert UVA values: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getDateRange(): Promise<{ earliest: string | null, latest: string | null }> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          MIN(date) as earliest,
          MAX(date) as latest
        FROM uva_values
      `)
      const result = stmt.get() as { earliest: string | null, latest: string | null }
      return result
    } catch (error) {
      logger.error('Error getting UVA date range:', error)
      throw new Error(`Failed to get UVA date range: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getUVACount(): Promise<number> {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM uva_values')
      const result = stmt.get() as { count: number }
      return result.count
    } catch (error) {
      logger.error('Error getting UVA count:', error)
      throw new Error(`Failed to get UVA count: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async deleteOldUVAValues(beforeDate: string): Promise<number> {
    try {
      const stmt = this.db.prepare('DELETE FROM uva_values WHERE date < ?')
      const result = stmt.run(beforeDate)
      return result.changes
    } catch (error) {
      logger.error('Error deleting old UVA values:', error)
      throw new Error(`Failed to delete old UVA values: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Calculate inflation adjustment between two dates using UVA values
   */
  async calculateInflationAdjustment(
    amount: number,
    fromDate: string,
    toDate: string
  ): Promise<UVAInflationAdjustment> {
    try {
      const fromUVA = await this.findLatestBefore(fromDate)
      const toUVA = await this.findLatestBefore(toDate)

      if (!fromUVA || !toUVA) {
        throw new Error(`UVA values not found for date range ${fromDate} to ${toDate}`)
      }

      const inflationRate = (toUVA.value - fromUVA.value) / fromUVA.value
      const adjustedAmount = amount * (toUVA.value / fromUVA.value)

      return {
        originalAmount: amount,
        adjustedAmount,
        inflationRate,
        fromDate,
        toDate,
        fromUVA: fromUVA.value,
        toUVA: toUVA.value
      }
    } catch (error) {
      logger.error('Error calculating inflation adjustment:', error)
      throw new Error(`Failed to calculate inflation adjustment: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get historical inflation rates for a specific period
   */
  async getInflationRates(
    fromDate: string,
    toDate: string
  ): Promise<{ date: string; rate: number; uvaValue: number }[]> {
    try {
      const baseQuery = `
        SELECT date, value 
        FROM uva_values 
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC
      `
      
      const stmt = this.db.prepare(baseQuery)
      const uvaValues = stmt.all(fromDate, toDate) as UVAData[]

      if (uvaValues.length < 2) {
        return []
      }

      const rates: { date: string; rate: number; uvaValue: number }[] = []
      
      for (let i = 1; i < uvaValues.length; i++) {
        const prevValue = uvaValues[i - 1]
        const currentValue = uvaValues[i]
        
        if (prevValue && currentValue) {
          const rate = (currentValue.value - prevValue.value) / prevValue.value
          
          rates.push({
            date: currentValue.date,
            rate,
            uvaValue: currentValue.value
          })
        }
      }

      return rates
    } catch (error) {
      logger.error('Error getting inflation rates:', error)
      throw new Error(`Failed to get inflation rates: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}