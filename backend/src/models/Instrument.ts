import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('Instrument')

export interface InstrumentData {
  id?: number
  symbol: string
  company_name: string
  sector?: string
  industry?: string
  market_cap?: number
  is_esg_compliant?: boolean
  is_vegan_friendly?: boolean
  underlying_symbol?: string
  underlying_currency?: string
  ratio?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export class Instrument {
  private db = DatabaseConnection.getInstance()

  async create(data: Omit<InstrumentData, 'id' | 'created_at' | 'updated_at'>): Promise<InstrumentData> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO instruments (
          symbol, company_name, sector, industry, market_cap,
          is_esg_compliant, is_vegan_friendly, underlying_symbol,
          underlying_currency, ratio, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.symbol,
        data.company_name,
        data.sector || null,
        data.industry || null,
        data.market_cap || null,
        data.is_esg_compliant || false,
        data.is_vegan_friendly || false,
        data.underlying_symbol || null,
        data.underlying_currency || 'USD',
        data.ratio || 1.0,
        data.is_active !== undefined ? data.is_active : true
      )

      const created = await this.findById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created instrument')
      }
      return created
    } catch (error) {
      logger.error('Error creating instrument:', error)
      throw new Error(`Failed to create instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: number): Promise<InstrumentData | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM instruments WHERE id = ?')
      const result = stmt.get(id) as InstrumentData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding instrument by id:', error)
      throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findBySymbol(symbol: string): Promise<InstrumentData | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM instruments WHERE symbol = ? AND is_active = 1')
      const result = stmt.get(symbol.toUpperCase()) as InstrumentData | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding instrument by symbol:', error)
      throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findAll(filters?: {
    isActive?: boolean
    isESG?: boolean
    isVegan?: boolean
    sector?: string
  }): Promise<InstrumentData[]> {
    try {
      let query = 'SELECT * FROM instruments WHERE 1=1'
      const params: any[] = []

      if (filters?.isActive !== undefined) {
        query += ' AND is_active = ?'
        params.push(filters.isActive ? 1 : 0)
      }

      if (filters?.isESG !== undefined) {
        query += ' AND is_esg_compliant = ?'
        params.push(filters.isESG ? 1 : 0)
      }

      if (filters?.isVegan !== undefined) {
        query += ' AND is_vegan_friendly = ?'
        params.push(filters.isVegan ? 1 : 0)
      }

      if (filters?.sector) {
        query += ' AND sector = ?'
        params.push(filters.sector)
      }

      query += ' ORDER BY symbol ASC'

      const stmt = this.db.prepare(query)
      return stmt.all(...params) as InstrumentData[]
    } catch (error) {
      logger.error('Error finding instruments:', error)
      throw new Error(`Failed to find instruments: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async update(id: number, data: Partial<Omit<InstrumentData, 'id' | 'created_at'>>): Promise<InstrumentData | null> {
    try {
      const updateFields = []
      const params = []

      for (const [key, value] of Object.entries(data)) {
        if (key !== 'id' && key !== 'created_at') {
          updateFields.push(`${key} = ?`)
          params.push(value)
        }
      }

      if (updateFields.length === 0) {
        return this.findById(id)
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP')
      params.push(id)

      const stmt = this.db.prepare(`
        UPDATE instruments 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `)

      const result = stmt.run(...params)
      
      if (result.changes === 0) {
        return null
      }

      return this.findById(id)
    } catch (error) {
      logger.error('Error updating instrument:', error)
      throw new Error(`Failed to update instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM instruments WHERE id = ?')
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      logger.error('Error deleting instrument:', error)
      throw new Error(`Failed to delete instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getESGInstruments(): Promise<InstrumentData[]> {
    return this.findAll({ isActive: true, isESG: true })
  }

  async getVeganInstruments(): Promise<InstrumentData[]> {
    return this.findAll({ isActive: true, isVegan: true })
  }

  async searchByName(searchTerm: string): Promise<InstrumentData[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM instruments 
        WHERE (company_name LIKE ? OR symbol LIKE ?) 
        AND is_active = 1
        ORDER BY symbol ASC
        LIMIT 50
      `)
      
      const term = `%${searchTerm}%`
      return stmt.all(term, term) as InstrumentData[]
    } catch (error) {
      logger.error('Error searching instruments:', error)
      throw new Error(`Failed to search instruments: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}