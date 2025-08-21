import SimpleDatabaseConnection from '../database/simple-connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('Opportunity')

export interface OpportunityData {
  id?: number
  symbol: string
  instrument_id: number
  company_name: string
  opportunity_type: 'BUY' | 'STRONG_BUY'
  composite_score: number
  technical_signals: {
    rsi: {
      value: number
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
    }
    sma: {
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      crossover?: boolean
    }
    distance_from_low: {
      percentage: number
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
    }
    volume_relative: {
      ratio: number
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
    }
    macd: {
      signal: 'BUY' | 'SELL' | 'HOLD'
      strength: number
      weight: number
      histogram: number
    }
  }
  ranking: number
  market_data: {
    current_price: number
    year_high: number
    year_low: number
    volume_avg: number
    volume_current: number
    market_cap?: number
  }
  esg_criteria: {
    is_esg_compliant: boolean
    is_vegan_friendly: boolean
    esg_score?: number
  }
  risk_assessment: {
    volatility: number
    sector_concentration: number
    diversification_impact: number
  }
  expected_return: {
    target_price: number
    upside_percentage: number
    time_horizon_days: number
    confidence_level: number
  }
  detected_at: string
  expires_at: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface OpportunityCreateInput extends Omit<OpportunityData, 'id' | 'ranking' | 'created_at' | 'updated_at'> {}

export interface OpportunityFilters {
  minScore?: number
  maxScore?: number
  opportunityType?: 'BUY' | 'STRONG_BUY'
  isESG?: boolean
  isVegan?: boolean
  sectors?: string[]
  isActive?: boolean
  detectedAfter?: Date
  detectedBefore?: Date
}

export class Opportunity {
  
  /**
   * Crea una nueva oportunidad
   */
  async create(data: OpportunityCreateInput): Promise<OpportunityData> {
    try {
      const opportunityData = {
        ...data,
        symbol: data.symbol.toUpperCase(),
        is_active: data.is_active !== undefined ? data.is_active : true,
        detected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      }

      const result = SimpleDatabaseConnection.insert('opportunities', opportunityData)
      logger.info(`Opportunity created: ${result.symbol} with score ${result.composite_score}`)
      return result
    } catch (error) {
      logger.error('Error creating opportunity:', error)
      throw new Error(`Failed to create opportunity: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Encuentra una oportunidad por ID
   */
  async findById(id: number): Promise<OpportunityData | null> {
    try {
      return SimpleDatabaseConnection.findById('opportunities', id)
    } catch (error) {
      logger.error('Error finding opportunity by id:', error)
      throw new Error(`Failed to find opportunity: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Encuentra una oportunidad por símbolo (la más reciente)
   */
  async findBySymbol(symbol: string): Promise<OpportunityData | null> {
    try {
      const opportunities = SimpleDatabaseConnection.findAll('opportunities', { 
        symbol: symbol.toUpperCase(),
        is_active: true 
      })
      
      if (opportunities.length === 0) return null
      
      // Retornar la más reciente
      return opportunities.sort((a, b) => 
        new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      )[0]
    } catch (error) {
      logger.error('Error finding opportunity by symbol:', error)
      throw new Error(`Failed to find opportunity: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Encuentra todas las oportunidades con filtros
   */
  async findAll(filters?: OpportunityFilters): Promise<OpportunityData[]> {
    try {
      const criteria: any = {}
      
      if (filters?.opportunityType) {
        criteria.opportunity_type = filters.opportunityType
      }
      if (filters?.isActive !== undefined) {
        criteria.is_active = filters.isActive
      }

      let opportunities = SimpleDatabaseConnection.findAll('opportunities', criteria)

      // Aplicar filtros adicionales
      if (filters?.minScore !== undefined) {
        opportunities = opportunities.filter(opp => opp.composite_score >= filters.minScore!)
      }
      if (filters?.maxScore !== undefined) {
        opportunities = opportunities.filter(opp => opp.composite_score <= filters.maxScore!)
      }
      if (filters?.isESG !== undefined) {
        opportunities = opportunities.filter(opp => opp.esg_criteria.is_esg_compliant === filters.isESG!)
      }
      if (filters?.isVegan !== undefined) {
        opportunities = opportunities.filter(opp => opp.esg_criteria.is_vegan_friendly === filters.isVegan!)
      }
      if (filters?.detectedAfter) {
        opportunities = opportunities.filter(opp => 
          new Date(opp.detected_at) >= filters.detectedAfter!
        )
      }
      if (filters?.detectedBefore) {
        opportunities = opportunities.filter(opp => 
          new Date(opp.detected_at) <= filters.detectedBefore!
        )
      }

      // Ordenar por score descendente y luego por fecha de detección
      return opportunities.sort((a, b) => {
        if (b.composite_score !== a.composite_score) {
          return b.composite_score - a.composite_score
        }
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
      })
    } catch (error) {
      logger.error('Error finding opportunities:', error)
      throw new Error(`Failed to find opportunities: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene las oportunidades del día (top 20)
   */
  async getTodaysOpportunities(limit: number = 20): Promise<OpportunityData[]> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const opportunities = await this.findAll({
        isActive: true,
        detectedAfter: today
      })

      return opportunities.slice(0, limit)
    } catch (error) {
      logger.error('Error getting today\'s opportunities:', error)
      throw new Error(`Failed to get today's opportunities: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene las mejores oportunidades por score
   */
  async getTopOpportunities(limit: number = 10, minScore: number = 60): Promise<OpportunityData[]> {
    try {
      const opportunities = await this.findAll({
        isActive: true,
        minScore
      })

      return opportunities.slice(0, limit)
    } catch (error) {
      logger.error('Error getting top opportunities:', error)
      throw new Error(`Failed to get top opportunities: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Actualiza una oportunidad
   */
  async update(id: number, data: Partial<OpportunityData>): Promise<OpportunityData | null> {
    try {
      const updateData = { ...data }
      if (updateData.symbol) {
        updateData.symbol = updateData.symbol.toUpperCase()
      }

      const result = SimpleDatabaseConnection.update('opportunities', id, updateData)
      if (result) {
        logger.info(`Opportunity updated: ${result.symbol}`)
      }
      return result
    } catch (error) {
      logger.error('Error updating opportunity:', error)
      throw new Error(`Failed to update opportunity: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Actualiza el ranking de las oportunidades
   */
  async updateRankings(): Promise<number> {
    try {
      const opportunities = await this.findAll({ isActive: true })
      let updatedCount = 0

      opportunities.forEach((opportunity, index) => {
        const newRanking = index + 1
        if (opportunity.ranking !== newRanking) {
          this.update(opportunity.id!, { ranking: newRanking })
          updatedCount++
        }
      })

      logger.info(`Updated rankings for ${updatedCount} opportunities`)
      return updatedCount
    } catch (error) {
      logger.error('Error updating rankings:', error)
      throw new Error(`Failed to update rankings: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Marca oportunidades como inactivas
   */
  async deactivateExpired(): Promise<number> {
    try {
      const now = new Date().toISOString()
      const expiredOpportunities = SimpleDatabaseConnection.findAll('opportunities', { is_active: true })
        .filter(opp => opp.expires_at < now)

      let deactivatedCount = 0
      expiredOpportunities.forEach(opportunity => {
        SimpleDatabaseConnection.update('opportunities', opportunity.id!, { is_active: false })
        deactivatedCount++
      })

      if (deactivatedCount > 0) {
        logger.info(`Deactivated ${deactivatedCount} expired opportunities`)
      }
      return deactivatedCount
    } catch (error) {
      logger.error('Error deactivating expired opportunities:', error)
      throw new Error(`Failed to deactivate expired opportunities: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Elimina oportunidades antiguas
   */
  async deleteOld(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      const cutoffString = cutoffDate.toISOString()

      const oldOpportunities = SimpleDatabaseConnection.findAll('opportunities', {})
        .filter(opp => opp.detected_at < cutoffString)

      let deletedCount = 0
      oldOpportunities.forEach(opportunity => {
        if (SimpleDatabaseConnection.delete('opportunities', opportunity.id!)) {
          deletedCount++
        }
      })

      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} old opportunities (older than ${daysToKeep} days)`)
      }
      return deletedCount
    } catch (error) {
      logger.error('Error deleting old opportunities:', error)
      throw new Error(`Failed to delete old opportunities: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene estadísticas de oportunidades
   */
  async getStats() {
    try {
      const allOpportunities = SimpleDatabaseConnection.findAll('opportunities', {})
      const activeOpportunities = allOpportunities.filter(opp => opp.is_active)
      const todayOpportunities = activeOpportunities.filter(opp => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return new Date(opp.detected_at) >= today
      })

      const avgScore = activeOpportunities.length > 0 
        ? activeOpportunities.reduce((sum, opp) => sum + opp.composite_score, 0) / activeOpportunities.length
        : 0

      const byType = activeOpportunities.reduce((acc, opp) => {
        acc[opp.opportunity_type] = (acc[opp.opportunity_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const esgCount = activeOpportunities.filter(opp => opp.esg_criteria.is_esg_compliant).length
      const veganCount = activeOpportunities.filter(opp => opp.esg_criteria.is_vegan_friendly).length

      return {
        total: allOpportunities.length,
        active: activeOpportunities.length,
        today: todayOpportunities.length,
        averageScore: Math.round(avgScore * 100) / 100,
        byType,
        esgCompliant: esgCount,
        veganFriendly: veganCount,
        highScore: activeOpportunities.filter(opp => opp.composite_score >= 80).length,
        mediumScore: activeOpportunities.filter(opp => opp.composite_score >= 60 && opp.composite_score < 80).length,
        lowScore: activeOpportunities.filter(opp => opp.composite_score < 60).length
      }
    } catch (error) {
      logger.error('Error getting opportunity stats:', error)
      throw new Error(`Failed to get opportunity stats: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Elimina una oportunidad
   */
  async delete(id: number): Promise<boolean> {
    try {
      const success = SimpleDatabaseConnection.delete('opportunities', id)
      if (success) {
        logger.info(`Opportunity deleted: ${id}`)
      }
      return success
    } catch (error) {
      logger.error('Error deleting opportunity:', error)
      throw new Error(`Failed to delete opportunity: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Export singleton instance
export const opportunityModel = new Opportunity()