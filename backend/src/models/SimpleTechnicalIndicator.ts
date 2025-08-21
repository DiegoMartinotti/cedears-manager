import SimpleDatabaseConnection from '../database/simple-connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('SimpleTechnicalIndicator')

export interface TechnicalIndicatorData {
  id?: number
  symbol: string
  indicator: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH'
  period?: number
  value: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  strength: number
  metadata?: Record<string, any>
  timestamp: string
  created_at?: string
  updated_at?: string
}

export class SimpleTechnicalIndicator {
  
  async create(data: Omit<TechnicalIndicatorData, 'id' | 'created_at' | 'updated_at'>): Promise<TechnicalIndicatorData> {
    try {
      const indicatorData = {
        ...data,
        symbol: data.symbol.toUpperCase(),
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: JSON.stringify(data.metadata || {})
      }

      const result = SimpleDatabaseConnection.insert('technical_indicators', indicatorData)
      logger.info(`Technical indicator created: ${result.symbol} ${result.indicator}`)
      return result
    } catch (error) {
      logger.error('Error creating technical indicator:', error)
      throw new Error(`Failed to create technical indicator: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findById(id: number): Promise<TechnicalIndicatorData | null> {
    try {
      const result = SimpleDatabaseConnection.findById('technical_indicators', id)
      if (result && result.metadata) {
        result.metadata = JSON.parse(result.metadata)
      }
      return result
    } catch (error) {
      logger.error('Error finding technical indicator by id:', error)
      return null
    }
  }

  async findBySymbol(symbol: string): Promise<TechnicalIndicatorData[]> {
    try {
      const results = SimpleDatabaseConnection.findAll('technical_indicators', { 
        symbol: symbol.toUpperCase()
      })
      
      return results.map(result => {
        if (result.metadata) {
          result.metadata = JSON.parse(result.metadata)
        }
        return result
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      logger.error('Error finding technical indicators by symbol:', error)
      return []
    }
  }

  async findAll(): Promise<TechnicalIndicatorData[]> {
    try {
      const results = SimpleDatabaseConnection.findAll('technical_indicators', {})
      
      return results.map(result => {
        if (result.metadata) {
          result.metadata = JSON.parse(result.metadata)
        }
        return result
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      logger.error('Error finding all technical indicators:', error)
      return []
    }
  }

  async getLatestIndicators(symbol: string): Promise<TechnicalIndicatorData[]> {
    try {
      const allIndicators = await this.findBySymbol(symbol)
      
      // Agrupar por indicador y obtener el más reciente de cada uno
      const latestByIndicator = new Map<string, TechnicalIndicatorData>()
      
      allIndicators.forEach(indicator => {
        const key = indicator.indicator
        if (!latestByIndicator.has(key) || 
            new Date(indicator.timestamp) > new Date(latestByIndicator.get(key)!.timestamp)) {
          latestByIndicator.set(key, indicator)
        }
      })
      
      return Array.from(latestByIndicator.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      logger.error('Error getting latest indicators:', error)
      return []
    }
  }

  async getActiveSignals(signals: string[] = ['BUY', 'SELL']): Promise<TechnicalIndicatorData[]> {
    try {
      const allIndicators = await this.findAll()
      
      // Agrupar por símbolo e indicador y obtener el más reciente de cada combinación
      const latestBySymbolIndicator = new Map<string, TechnicalIndicatorData>()
      
      allIndicators.forEach(indicator => {
        const key = `${indicator.symbol}-${indicator.indicator}`
        if (!latestBySymbolIndicator.has(key) || 
            new Date(indicator.timestamp) > new Date(latestBySymbolIndicator.get(key)!.timestamp)) {
          latestBySymbolIndicator.set(key, indicator)
        }
      })
      
      // Filtrar por señales activas y ordenar por fuerza
      return Array.from(latestBySymbolIndicator.values())
        .filter(indicator => signals.includes(indicator.signal))
        .sort((a, b) => b.strength - a.strength || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      logger.error('Error getting active signals:', error)
      return []
    }
  }

  async getStats(): Promise<{
    totalIndicators: number
    bySymbol: Record<string, number>
    byIndicator: Record<string, number>
    bySignal: Record<string, number>
    lastUpdate: Date | null
  }> {
    try {
      const allIndicators = await this.findAll()
      
      const stats = {
        totalIndicators: allIndicators.length,
        bySymbol: {} as Record<string, number>,
        byIndicator: {} as Record<string, number>,
        bySignal: {} as Record<string, number>,
        lastUpdate: null as Date | null
      }
      
      let latestTimestamp: string | null = null
      
      allIndicators.forEach(indicator => {
        // Por símbolo
        stats.bySymbol[indicator.symbol] = (stats.bySymbol[indicator.symbol] || 0) + 1
        
        // Por indicador
        stats.byIndicator[indicator.indicator] = (stats.byIndicator[indicator.indicator] || 0) + 1
        
        // Por señal
        stats.bySignal[indicator.signal] = (stats.bySignal[indicator.signal] || 0) + 1
        
        // Última actualización
        if (!latestTimestamp || indicator.timestamp > latestTimestamp) {
          latestTimestamp = indicator.timestamp
        }
      })
      
      if (latestTimestamp) {
        stats.lastUpdate = new Date(latestTimestamp)
      }
      
      return stats
    } catch (error) {
      logger.error('Error getting technical indicator stats:', error)
      return {
        totalIndicators: 0,
        bySymbol: {},
        byIndicator: {},
        bySignal: {},
        lastUpdate: null
      }
    }
  }

  async update(id: number, data: Partial<Omit<TechnicalIndicatorData, 'id' | 'created_at'>>): Promise<TechnicalIndicatorData | null> {
    try {
      if (data.symbol) {
        data.symbol = data.symbol.toUpperCase()
      }
      
      if (data.metadata) {
        data.metadata = JSON.stringify(data.metadata)
      }

      const result = SimpleDatabaseConnection.update('technical_indicators', id, data)
      
      if (result) {
        logger.info(`Technical indicator updated: ${result.symbol} ${result.indicator}`)
        if (result.metadata) {
          result.metadata = JSON.parse(result.metadata)
        }
      }
      
      return result
    } catch (error) {
      logger.error('Error updating technical indicator:', error)
      return null
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const success = SimpleDatabaseConnection.delete('technical_indicators', id)
      if (success) {
        logger.info(`Technical indicator deleted: ID ${id}`)
      }
      return success
    } catch (error) {
      logger.error('Error deleting technical indicator:', error)
      return false
    }
  }

  async batchUpsert(indicators: Omit<TechnicalIndicatorData, 'id' | 'created_at' | 'updated_at'>[]): Promise<number> {
    let count = 0
    
    for (const indicator of indicators) {
      try {
        await this.create(indicator)
        count++
      } catch (error) {
        logger.error(`Error upserting indicator ${indicator.symbol} ${indicator.indicator}:`, error)
      }
    }
    
    return count
  }

  async deleteOldIndicators(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const cutoffTimestamp = cutoffDate.toISOString()
      
      const allIndicators = await this.findAll()
      const toDelete = allIndicators.filter(indicator => indicator.timestamp < cutoffTimestamp)
      
      let deletedCount = 0
      for (const indicator of toDelete) {
        if (indicator.id && await this.delete(indicator.id)) {
          deletedCount++
        }
      }
      
      return deletedCount
    } catch (error) {
      logger.error('Error deleting old indicators:', error)
      return 0
    }
  }
}

// Singleton instance
export const simpleTechnicalIndicatorModel = new SimpleTechnicalIndicator()