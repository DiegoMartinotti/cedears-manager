import { Instrument, InstrumentData } from '../models/Instrument.js'
import { createLogger } from '../utils/logger.js'
import type { InstrumentCreateInput, InstrumentUpdateInput, InstrumentQueryInput } from '../schemas/instrument.schema.js'

const logger = createLogger('InstrumentService')

export class InstrumentService {
  private instrumentModel = new Instrument()

  async createInstrument(data: InstrumentCreateInput): Promise<InstrumentData> {
    logger.info(`Creating instrument: ${data.symbol}`)
    
    // Check if instrument already exists
    const existing = await this.instrumentModel.findBySymbol(data.symbol)
    if (existing) {
      throw new Error(`Instrument with symbol ${data.symbol} already exists`)
    }

    const instrument = await this.instrumentModel.create(data)
    logger.info(`Instrument created successfully: ${instrument.symbol} (ID: ${instrument.id})`)
    
    return instrument
  }

  async getInstrumentById(id: number): Promise<InstrumentData> {
    logger.info(`Getting instrument by ID: ${id}`)
    
    const instrument = await this.instrumentModel.findById(id)
    if (!instrument) {
      throw new Error(`Instrument with ID ${id} not found`)
    }

    return instrument
  }

  async getInstrumentBySymbol(symbol: string): Promise<InstrumentData> {
    logger.info(`Getting instrument by symbol: ${symbol}`)
    
    const instrument = await this.instrumentModel.findBySymbol(symbol)
    if (!instrument) {
      throw new Error(`Instrument with symbol ${symbol} not found`)
    }

    return instrument
  }

  async getAllInstruments(filters: InstrumentQueryInput = {}): Promise<InstrumentData[]> {
    logger.info('Getting all instruments with filters:', filters)
    
    if (filters.search) {
      return await this.instrumentModel.searchByName(filters.search)
    }

    return await this.instrumentModel.findAll({
      isActive: filters.isActive,
      isESG: filters.isESG,
      isVegan: filters.isVegan,
      sector: filters.sector
    })
  }

  async updateInstrument(id: number, data: InstrumentUpdateInput): Promise<InstrumentData> {
    logger.info(`Updating instrument: ${id}`)
    
    // Check if instrument exists
    const existing = await this.instrumentModel.findById(id)
    if (!existing) {
      throw new Error(`Instrument with ID ${id} not found`)
    }

    // If updating symbol, check for conflicts
    if (data.symbol && data.symbol !== existing.symbol) {
      const symbolExists = await this.instrumentModel.findBySymbol(data.symbol)
      if (symbolExists) {
        throw new Error(`Instrument with symbol ${data.symbol} already exists`)
      }
    }

    const updatedInstrument = await this.instrumentModel.update(id, data)
    if (!updatedInstrument) {
      throw new Error(`Failed to update instrument with ID ${id}`)
    }

    logger.info(`Instrument updated successfully: ${updatedInstrument.symbol} (ID: ${id})`)
    return updatedInstrument
  }

  async deleteInstrument(id: number): Promise<void> {
    logger.info(`Deleting instrument: ${id}`)
    
    // Check if instrument exists
    const existing = await this.instrumentModel.findById(id)
    if (!existing) {
      throw new Error(`Instrument with ID ${id} not found`)
    }

    const success = await this.instrumentModel.delete(id)
    if (!success) {
      throw new Error(`Failed to delete instrument with ID ${id}`)
    }

    logger.info(`Instrument deleted successfully: ${existing.symbol} (ID: ${id})`)
  }

  async getESGInstruments(): Promise<InstrumentData[]> {
    logger.info('Getting ESG compliant instruments')
    return await this.instrumentModel.getESGInstruments()
  }

  async getVeganInstruments(): Promise<InstrumentData[]> {
    logger.info('Getting vegan-friendly instruments')
    return await this.instrumentModel.getVeganInstruments()
  }

  async searchInstruments(searchTerm: string): Promise<InstrumentData[]> {
    logger.info(`Searching instruments: ${searchTerm}`)
    
    if (!searchTerm.trim()) {
      return []
    }

    return await this.instrumentModel.searchByName(searchTerm.trim())
  }

  async bulkCreateInstruments(instruments: InstrumentCreateInput[]): Promise<InstrumentData[]> {
    logger.info(`Bulk creating ${instruments.length} instruments`)
    
    const results: InstrumentData[] = []
    const errors: string[] = []

    for (const instrumentData of instruments) {
      try {
        const instrument = await this.createInstrument(instrumentData)
        results.push(instrument)
      } catch (error) {
        const errorMessage = `Failed to create ${instrumentData.symbol}: ${error instanceof Error ? error.message : String(error)}`
        logger.error(errorMessage)
        errors.push(errorMessage)
      }
    }

    logger.info(`Bulk create completed: ${results.length} created, ${errors.length} errors`)
    
    if (errors.length > 0) {
      logger.warn('Bulk create errors:', errors)
    }

    return results
  }

  async toggleESGCompliance(id: number): Promise<InstrumentData> {
    logger.info(`Toggling ESG compliance for instrument: ${id}`)
    
    const instrument = await this.getInstrumentById(id)
    return await this.updateInstrument(id, {
      is_esg_compliant: !instrument.is_esg_compliant
    })
  }

  async toggleVeganFriendly(id: number): Promise<InstrumentData> {
    logger.info(`Toggling vegan-friendly status for instrument: ${id}`)
    
    const instrument = await this.getInstrumentById(id)
    return await this.updateInstrument(id, {
      is_vegan_friendly: !instrument.is_vegan_friendly
    })
  }

  async deactivateInstrument(id: number): Promise<InstrumentData> {
    logger.info(`Deactivating instrument: ${id}`)
    
    return await this.updateInstrument(id, { is_active: false })
  }

  async activateInstrument(id: number): Promise<InstrumentData> {
    logger.info(`Activating instrument: ${id}`)
    
    return await this.updateInstrument(id, { is_active: true })
  }
}