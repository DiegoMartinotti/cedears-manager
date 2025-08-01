import { apiUtils, endpoints } from '../utils/api'
import { Instrument, InstrumentUI, InstrumentFilters, BulkInstrumentData } from '@cedears-manager/shared/types'

/**
 * Transform backend instrument data to UI-friendly format
 */
export const transformInstrumentToUI = (instrument: Instrument): InstrumentUI => {
  return {
    id: instrument.id!,
    symbol: instrument.symbol,
    companyName: instrument.company_name,
    sector: instrument.sector,
    industry: instrument.industry,
    marketCap: instrument.market_cap,
    isESGCompliant: instrument.is_esg_compliant || false,
    isVeganFriendly: instrument.is_vegan_friendly || false,
    underlyingSymbol: instrument.underlying_symbol,
    underlyingCurrency: instrument.underlying_currency || 'USD',
    ratio: instrument.ratio || 1.0,
    isActive: instrument.is_active !== false,
    createdAt: new Date(instrument.created_at!),
    updatedAt: new Date(instrument.updated_at!),
  }
}

/**
 * Transform UI instrument data to backend format
 */
export const transformUIToInstrument = (instrumentUI: Partial<InstrumentUI>): Partial<Instrument> => {
  return {
    id: instrumentUI.id,
    symbol: instrumentUI.symbol,
    company_name: instrumentUI.companyName,
    sector: instrumentUI.sector,
    industry: instrumentUI.industry,
    market_cap: instrumentUI.marketCap,
    is_esg_compliant: instrumentUI.isESGCompliant,
    is_vegan_friendly: instrumentUI.isVeganFriendly,
    underlying_symbol: instrumentUI.underlyingSymbol,
    underlying_currency: instrumentUI.underlyingCurrency,
    ratio: instrumentUI.ratio,
    is_active: instrumentUI.isActive,
  }
}

/**
 * Instrument Service - Handles all CRUD operations for instruments
 */
export class InstrumentService {
  /**
   * Get all instruments with optional filters
   */
  static async getAllInstruments(filters?: InstrumentFilters): Promise<InstrumentUI[]> {
    const params = new URLSearchParams()
    
    if (filters?.isActive !== undefined) {
      params.append('isActive', filters.isActive.toString())
    }
    if (filters?.isESG !== undefined) {
      params.append('isESG', filters.isESG.toString())
    }
    if (filters?.isVegan !== undefined) {
      params.append('isVegan', filters.isVegan.toString())
    }
    if (filters?.sector) {
      params.append('sector', filters.sector)
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString())
    }
    if (filters?.offset) {
      params.append('offset', filters.offset.toString())
    }

    const url = `${endpoints.instruments.list}${params.toString() ? `?${params.toString()}` : ''}`
    const instruments = await apiUtils.get<Instrument[]>(url)
    
    return instruments.map(transformInstrumentToUI)
  }

  /**
   * Get instrument by ID
   */
  static async getInstrumentById(id: number): Promise<InstrumentUI> {
    const instrument = await apiUtils.get<Instrument>(endpoints.instruments.getById(id.toString()))
    return transformInstrumentToUI(instrument)
  }

  /**
   * Search instruments by name or symbol
   */
  static async searchInstruments(searchTerm: string, limit: number = 50): Promise<InstrumentUI[]> {
    if (!searchTerm.trim()) {
      return []
    }

    const params = new URLSearchParams({
      q: searchTerm.trim(),
      limit: limit.toString(),
    })

    const url = `${endpoints.instruments.search}?${params.toString()}`
    const instruments = await apiUtils.get<Instrument[]>(url)
    
    return instruments.map(transformInstrumentToUI)
  }

  /**
   * Get ESG compliant instruments
   */
  static async getESGInstruments(): Promise<InstrumentUI[]> {
    const instruments = await apiUtils.get<Instrument[]>(endpoints.instruments.esg)
    return instruments.map(transformInstrumentToUI)
  }

  /**
   * Get vegan-friendly instruments
   */
  static async getVeganInstruments(): Promise<InstrumentUI[]> {
    const instruments = await apiUtils.get<Instrument[]>(endpoints.instruments.vegan)
    return instruments.map(transformInstrumentToUI)
  }

  /**
   * Create new instrument
   */
  static async createInstrument(instrumentData: Omit<InstrumentUI, 'id' | 'createdAt' | 'updatedAt'>): Promise<InstrumentUI> {
    const backendData = transformUIToInstrument(instrumentData)
    const instrument = await apiUtils.post<Instrument>(endpoints.instruments.create, backendData)
    return transformInstrumentToUI(instrument)
  }

  /**
   * Update existing instrument
   */
  static async updateInstrument(id: number, instrumentData: Partial<InstrumentUI>): Promise<InstrumentUI> {
    const backendData = transformUIToInstrument(instrumentData)
    const instrument = await apiUtils.put<Instrument>(endpoints.instruments.update(id.toString()), backendData)
    return transformInstrumentToUI(instrument)
  }

  /**
   * Delete instrument
   */
  static async deleteInstrument(id: number): Promise<boolean> {
    await apiUtils.delete<void>(endpoints.instruments.delete(id.toString()))
    return true
  }

  /**
   * Toggle ESG compliance
   */
  static async toggleESGCompliance(id: number): Promise<InstrumentUI> {
    const instrument = await apiUtils.post<Instrument>(endpoints.instruments.toggleESG(id.toString()))
    return transformInstrumentToUI(instrument)
  }

  /**
   * Toggle vegan-friendly status
   */
  static async toggleVeganFriendly(id: number): Promise<InstrumentUI> {
    const instrument = await apiUtils.post<Instrument>(endpoints.instruments.toggleVegan(id.toString()))
    return transformInstrumentToUI(instrument)
  }

  /**
   * Bulk create instruments
   */
  static async bulkCreateInstruments(instrumentsData: Omit<InstrumentUI, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<InstrumentUI[]> {
    const backendData: BulkInstrumentData = {
      instruments: instrumentsData.map(data => transformUIToInstrument(data) as Omit<Instrument, 'id' | 'created_at' | 'updated_at'>)
    }
    
    const instruments = await apiUtils.post<Instrument[]>(endpoints.instruments.bulk, backendData)
    return instruments.map(transformInstrumentToUI)
  }

  /**
   * Get instruments count
   */
  static async getInstrumentsCount(filters?: InstrumentFilters): Promise<number> {
    const instruments = await this.getAllInstruments(filters)
    return instruments.length
  }

  /**
   * Check if symbol exists
   */
  static async symbolExists(symbol: string): Promise<boolean> {
    try {
      const results = await this.searchInstruments(symbol, 1)
      return results.some(instrument => instrument.symbol === symbol.toUpperCase())
    } catch (error) {
      return false
    }
  }

  /**
   * Get available sectors
   */
  static async getAvailableSectors(): Promise<string[]> {
    const instruments = await this.getAllInstruments({ isActive: true })
    const sectors = new Set<string>()
    
    instruments.forEach(instrument => {
      if (instrument.sector) {
        sectors.add(instrument.sector)
      }
    })
    
    return Array.from(sectors).sort()
  }

  /**
   * Get instruments grouped by sector
   */
  static async getInstrumentsBySector(): Promise<Record<string, InstrumentUI[]>> {
    const instruments = await this.getAllInstruments({ isActive: true })
    const grouped: Record<string, InstrumentUI[]> = {}
    
    instruments.forEach(instrument => {
      const sector = instrument.sector || 'Other'
      if (!grouped[sector]) {
        grouped[sector] = []
      }
      grouped[sector].push(instrument)
    })
    
    return grouped
  }
}

// Export query keys for React Query
export const instrumentQueryKeys = {
  all: ['instruments'] as const,
  lists: () => [...instrumentQueryKeys.all, 'list'] as const,
  list: (filters?: InstrumentFilters) => [...instrumentQueryKeys.lists(), filters] as const,
  details: () => [...instrumentQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...instrumentQueryKeys.details(), id] as const,
  search: (term: string) => [...instrumentQueryKeys.all, 'search', term] as const,
  esg: () => [...instrumentQueryKeys.all, 'esg'] as const,
  vegan: () => [...instrumentQueryKeys.all, 'vegan'] as const,
  sectors: () => [...instrumentQueryKeys.all, 'sectors'] as const,
  count: (filters?: InstrumentFilters) => [...instrumentQueryKeys.all, 'count', filters] as const,
}