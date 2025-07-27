import SimpleDatabaseConnection from '../database/simple-connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('SimpleInstrument')

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

export class SimpleInstrument {
  async create(data: Omit<InstrumentData, 'id' | 'created_at' | 'updated_at'>): Promise<InstrumentData> {
    try {
      const instrumentData = {
        ...data,
        symbol: data.symbol.toUpperCase(),
        is_esg_compliant: data.is_esg_compliant || false,
        is_vegan_friendly: data.is_vegan_friendly || false,
        underlying_currency: data.underlying_currency || 'USD',
        ratio: data.ratio || 1.0,
        is_active: data.is_active !== undefined ? data.is_active : true
      }

      const result = SimpleDatabaseConnection.insert('instruments', instrumentData)
      logger.info(`Instrument created: ${result.symbol} (ID: ${result.id})`)
      return result
    } catch (error) {
      logger.error('Error creating instrument:', error)
      throw new Error(`Failed to create instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: number): Promise<InstrumentData | null> {
    try {
      return SimpleDatabaseConnection.findById('instruments', id)
    } catch (error) {
      logger.error('Error finding instrument by id:', error)
      throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findBySymbol(symbol: string): Promise<InstrumentData | null> {
    try {
      return SimpleDatabaseConnection.findBy('instruments', { 
        symbol: symbol.toUpperCase(),
        is_active: true 
      })
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
      const criteria: any = {}
      
      if (filters?.isActive !== undefined) {
        criteria.is_active = filters.isActive
      }
      if (filters?.isESG !== undefined) {
        criteria.is_esg_compliant = filters.isESG
      }
      if (filters?.isVegan !== undefined) {
        criteria.is_vegan_friendly = filters.isVegan
      }
      if (filters?.sector) {
        criteria.sector = filters.sector
      }

      const results = SimpleDatabaseConnection.findAll('instruments', criteria)
      return results.sort((a, b) => a.symbol.localeCompare(b.symbol))
    } catch (error) {
      logger.error('Error finding instruments:', error)
      throw new Error(`Failed to find instruments: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async update(id: number, data: Partial<Omit<InstrumentData, 'id' | 'created_at'>>): Promise<InstrumentData | null> {
    try {
      if (data.symbol) {
        data.symbol = data.symbol.toUpperCase()
      }

      const result = SimpleDatabaseConnection.update('instruments', id, data)
      
      if (result) {
        logger.info(`Instrument updated: ${result.symbol} (ID: ${id})`)
      }
      
      return result
    } catch (error) {
      logger.error('Error updating instrument:', error)
      throw new Error(`Failed to update instrument: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const success = SimpleDatabaseConnection.delete('instruments', id)
      if (success) {
        logger.info(`Instrument deleted: ID ${id}`)
      }
      return success
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
      const results = SimpleDatabaseConnection.search('instruments', searchTerm, ['company_name', 'symbol'])
      return results
        .filter((item: any) => item.is_active)
        .sort((a, b) => a.symbol.localeCompare(b.symbol))
        .slice(0, 50)
    } catch (error) {
      logger.error('Error searching instruments:', error)
      throw new Error(`Failed to search instruments: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}