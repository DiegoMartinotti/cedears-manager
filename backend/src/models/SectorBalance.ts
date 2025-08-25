import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'
import type { 
  SectorBalanceTarget, 
  SectorBalanceAnalysis, 
  ConcentrationAlert, 
  RebalancingSuggestion 
} from '../types/sectorBalance.types.js'

const logger = createLogger('SectorBalance')

export class SectorBalanceModel {
  private db = DatabaseConnection.getInstance()

  // ============================================================================
  // Sector Balance Targets CRUD
  // ============================================================================

  async createTarget(data: Omit<SectorBalanceTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<SectorBalanceTarget> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sector_balance_targets (
          sector, target_percentage, min_percentage, max_percentage,
          priority, is_active
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.sector,
        data.targetPercentage,
        data.minPercentage,
        data.maxPercentage,
        data.priority,
        data.isActive
      )

      const created = await this.findTargetById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created sector target')
      }

      logger.info(`Created sector balance target for ${data.sector}`)
      return created
    } catch (error) {
      logger.error('Error creating sector balance target:', error)
      throw error
    }
  }

  async findTargetById(id: number): Promise<SectorBalanceTarget | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          sector,
          target_percentage as targetPercentage,
          min_percentage as minPercentage,
          max_percentage as maxPercentage,
          priority,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_balance_targets 
        WHERE id = ?
      `)

      const result = stmt.get(id) as SectorBalanceTarget | undefined
      return result || null
    } catch (error) {
      logger.error(`Error finding sector target by id ${id}:`, error)
      return null
    }
  }

  async findTargetBySector(sector: string): Promise<SectorBalanceTarget | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          sector,
          target_percentage as targetPercentage,
          min_percentage as minPercentage,
          max_percentage as maxPercentage,
          priority,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_balance_targets 
        WHERE sector = ? AND is_active = 1
      `)

      const result = stmt.get(sector) as SectorBalanceTarget | undefined
      return result || null
    } catch (error) {
      logger.error(`Error finding sector target for ${sector}:`, error)
      return null
    }
  }

  async findAllTargets(activeOnly: boolean = true): Promise<SectorBalanceTarget[]> {
    try {
      let query = `
        SELECT 
          id,
          sector,
          target_percentage as targetPercentage,
          min_percentage as minPercentage,
          max_percentage as maxPercentage,
          priority,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_balance_targets
      `

      if (activeOnly) {
        query += ' WHERE is_active = 1'
      }

      query += ' ORDER BY priority ASC, target_percentage DESC'

      const stmt = this.db.prepare(query)
      const results = stmt.all() as SectorBalanceTarget[]
      
      return results
    } catch (error) {
      logger.error('Error finding sector targets:', error)
      return []
    }
  }

  async updateTarget(id: number, data: Partial<SectorBalanceTarget>): Promise<SectorBalanceTarget | null> {
    try {
      const updates: string[] = []
      const params: any[] = []

      if (data.targetPercentage !== undefined) {
        updates.push('target_percentage = ?')
        params.push(data.targetPercentage)
      }

      if (data.minPercentage !== undefined) {
        updates.push('min_percentage = ?')
        params.push(data.minPercentage)
      }

      if (data.maxPercentage !== undefined) {
        updates.push('max_percentage = ?')
        params.push(data.maxPercentage)
      }

      if (data.priority !== undefined) {
        updates.push('priority = ?')
        params.push(data.priority)
      }

      if (data.isActive !== undefined) {
        updates.push('is_active = ?')
        params.push(data.isActive)
      }

      if (updates.length === 0) {
        return this.findTargetById(id)
      }

      updates.push('updated_at = CURRENT_TIMESTAMP')
      params.push(id)

      const stmt = this.db.prepare(`
        UPDATE sector_balance_targets 
        SET ${updates.join(', ')}
        WHERE id = ?
      `)

      stmt.run(...params)
      
      const updated = await this.findTargetById(id)
      if (updated) {
        logger.info(`Updated sector balance target ${id}`)
      }
      
      return updated
    } catch (error) {
      logger.error(`Error updating sector target ${id}:`, error)
      return null
    }
  }

  // ============================================================================
  // Sector Balance Analysis CRUD
  // ============================================================================

  async createAnalysis(data: Omit<SectorBalanceAnalysis, 'id' | 'createdAt'>): Promise<SectorBalanceAnalysis> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sector_balance_history (
          analysis_date, sector, current_percentage, target_percentage,
          deviation, recommendation, action_required, priority,
          total_value, instrument_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.analysisDate,
        data.sector,
        data.currentPercentage,
        data.targetPercentage,
        data.deviation,
        data.recommendation || null,
        data.actionRequired || null,
        data.priority,
        data.totalValue,
        data.instrumentCount
      )

      const created = await this.findAnalysisById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created analysis')
      }

      logger.info(`Created sector balance analysis for ${data.sector}`)
      return created
    } catch (error) {
      logger.error('Error creating sector balance analysis:', error)
      throw error
    }
  }

  async findAnalysisById(id: number): Promise<SectorBalanceAnalysis | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          analysis_date as analysisDate,
          sector,
          current_percentage as currentPercentage,
          target_percentage as targetPercentage,
          deviation,
          recommendation,
          action_required as actionRequired,
          priority,
          total_value as totalValue,
          instrument_count as instrumentCount,
          created_at as createdAt
        FROM sector_balance_history 
        WHERE id = ?
      `)

      const result = stmt.get(id) as SectorBalanceAnalysis | undefined
      return result || null
    } catch (error) {
      logger.error(`Error finding analysis by id ${id}:`, error)
      return null
    }
  }

  async findAnalysisByDate(date: string, sector?: string): Promise<SectorBalanceAnalysis[]> {
    try {
      let query = `
        SELECT 
          id,
          analysis_date as analysisDate,
          sector,
          current_percentage as currentPercentage,
          target_percentage as targetPercentage,
          deviation,
          recommendation,
          action_required as actionRequired,
          priority,
          total_value as totalValue,
          instrument_count as instrumentCount,
          created_at as createdAt
        FROM sector_balance_history 
        WHERE analysis_date = ?
      `
      const params: any[] = [date]

      if (sector) {
        query += ' AND sector = ?'
        params.push(sector)
      }

      query += ' ORDER BY priority DESC, deviation DESC'

      const stmt = this.db.prepare(query)
      const results = stmt.all(...params) as SectorBalanceAnalysis[]
      
      return results
    } catch (error) {
      logger.error('Error finding analysis by date:', error)
      return []
    }
  }

  async getLatestAnalysis(sector?: string): Promise<SectorBalanceAnalysis[]> {
    try {
      let query = `
        SELECT 
          id,
          analysis_date as analysisDate,
          sector,
          current_percentage as currentPercentage,
          target_percentage as targetPercentage,
          deviation,
          recommendation,
          action_required as actionRequired,
          priority,
          total_value as totalValue,
          instrument_count as instrumentCount,
          created_at as createdAt
        FROM sector_balance_history 
        WHERE analysis_date = (SELECT MAX(analysis_date) FROM sector_balance_history)
      `
      const params: any[] = []

      if (sector) {
        query += ' AND sector = ?'
        params.push(sector)
      }

      query += ' ORDER BY priority DESC, deviation DESC'

      const stmt = this.db.prepare(query)
      const results = stmt.all(...params) as SectorBalanceAnalysis[]
      
      return results
    } catch (error) {
      logger.error('Error getting latest analysis:', error)
      return []
    }
  }

  // ============================================================================
  // Concentration Alerts CRUD
  // ============================================================================

  async createAlert(data: Omit<ConcentrationAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConcentrationAlert> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO concentration_alerts (
          sector, alert_type, severity, current_percentage,
          threshold_percentage, message, action_required,
          is_active, is_acknowledged
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.sector,
        data.alertType,
        data.severity,
        data.currentPercentage,
        data.thresholdPercentage,
        data.message,
        data.actionRequired || null,
        data.isActive,
        data.isAcknowledged
      )

      const created = await this.findAlertById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created alert')
      }

      logger.info(`Created concentration alert for ${data.sector}: ${data.severity}`)
      return created
    } catch (error) {
      logger.error('Error creating concentration alert:', error)
      throw error
    }
  }

  async findAlertById(id: number): Promise<ConcentrationAlert | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          sector,
          alert_type as alertType,
          severity,
          current_percentage as currentPercentage,
          threshold_percentage as thresholdPercentage,
          message,
          action_required as actionRequired,
          is_active as isActive,
          is_acknowledged as isAcknowledged,
          acknowledged_at as acknowledgedAt,
          created_at as createdAt,
          updated_at as updatedAt
        FROM concentration_alerts 
        WHERE id = ?
      `)

      const result = stmt.get(id) as ConcentrationAlert | undefined
      return result || null
    } catch (error) {
      logger.error(`Error finding alert by id ${id}:`, error)
      return null
    }
  }

  async findActiveAlerts(severity?: string): Promise<ConcentrationAlert[]> {
    try {
      let query = `
        SELECT 
          id,
          sector,
          alert_type as alertType,
          severity,
          current_percentage as currentPercentage,
          threshold_percentage as thresholdPercentage,
          message,
          action_required as actionRequired,
          is_active as isActive,
          is_acknowledged as isAcknowledged,
          acknowledged_at as acknowledgedAt,
          created_at as createdAt,
          updated_at as updatedAt
        FROM concentration_alerts 
        WHERE is_active = 1
      `
      const params: any[] = []

      if (severity) {
        query += ' AND severity = ?'
        params.push(severity)
      }

      query += ' ORDER BY severity DESC, created_at DESC'

      const stmt = this.db.prepare(query)
      const results = stmt.all(...params) as ConcentrationAlert[]
      
      return results
    } catch (error) {
      logger.error('Error finding active alerts:', error)
      return []
    }
  }

  async acknowledgeAlert(id: number): Promise<ConcentrationAlert | null> {
    try {
      const stmt = this.db.prepare(`
        UPDATE concentration_alerts 
        SET is_acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)

      stmt.run(id)
      
      const updated = await this.findAlertById(id)
      if (updated) {
        logger.info(`Acknowledged alert ${id}`)
      }
      
      return updated
    } catch (error) {
      logger.error(`Error acknowledging alert ${id}:`, error)
      return null
    }
  }

  async deactivateAlert(id: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        UPDATE concentration_alerts 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)

      const result = stmt.run(id)
      
      const updated = result.changes > 0
      if (updated) {
        logger.info(`Deactivated alert ${id}`)
      }
      
      return updated
    } catch (error) {
      logger.error(`Error deactivating alert ${id}:`, error)
      return false
    }
  }

  // ============================================================================
  // Rebalancing Suggestions CRUD
  // ============================================================================

  async createSuggestion(data: Omit<RebalancingSuggestion, 'id' | 'createdAt'>): Promise<RebalancingSuggestion> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO rebalancing_suggestions (
          analysis_date, sector, action, current_allocation,
          suggested_allocation, amount_to_adjust, suggested_instruments,
          reasoning, priority, impact_score, is_implemented
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.analysisDate,
        data.sector,
        data.action,
        data.currentAllocation,
        data.suggestedAllocation,
        data.amountToAdjust,
        JSON.stringify(data.suggestedInstruments),
        data.reasoning || null,
        data.priority,
        data.impactScore,
        data.isImplemented
      )

      const created = await this.findSuggestionById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created suggestion')
      }

      logger.info(`Created rebalancing suggestion for ${data.sector}: ${data.action}`)
      return created
    } catch (error) {
      logger.error('Error creating rebalancing suggestion:', error)
      throw error
    }
  }

  async findSuggestionById(id: number): Promise<RebalancingSuggestion | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          analysis_date as analysisDate,
          sector,
          action,
          current_allocation as currentAllocation,
          suggested_allocation as suggestedAllocation,
          amount_to_adjust as amountToAdjust,
          suggested_instruments as suggestedInstrumentsJson,
          reasoning,
          priority,
          impact_score as impactScore,
          is_implemented as isImplemented,
          implemented_at as implementedAt,
          created_at as createdAt
        FROM rebalancing_suggestions 
        WHERE id = ?
      `)

      const result = stmt.get(id) as any
      if (!result) return null

      // Parse JSON array
      const suggestion: RebalancingSuggestion = {
        ...result,
        suggestedInstruments: JSON.parse(result.suggestedInstrumentsJson || '[]')
      }
      delete (suggestion as any).suggestedInstrumentsJson

      return suggestion
    } catch (error) {
      logger.error(`Error finding suggestion by id ${id}:`, error)
      return null
    }
  }

  async findActiveSuggestions(limit?: number): Promise<RebalancingSuggestion[]> {
    try {
      let query = `
        SELECT 
          id,
          analysis_date as analysisDate,
          sector,
          action,
          current_allocation as currentAllocation,
          suggested_allocation as suggestedAllocation,
          amount_to_adjust as amountToAdjust,
          suggested_instruments as suggestedInstrumentsJson,
          reasoning,
          priority,
          impact_score as impactScore,
          is_implemented as isImplemented,
          implemented_at as implementedAt,
          created_at as createdAt
        FROM rebalancing_suggestions 
        WHERE is_implemented = 0
        ORDER BY priority ASC, impact_score DESC
      `

      if (limit) {
        query += ` LIMIT ${limit}`
      }

      const stmt = this.db.prepare(query)
      const results = stmt.all() as any[]
      
      // Parse JSON arrays
      return results.map(result => ({
        ...result,
        suggestedInstruments: JSON.parse(result.suggestedInstrumentsJson || '[]')
      })).map(({ suggestedInstrumentsJson, ...rest }) => rest)
    } catch (error) {
      logger.error('Error finding active suggestions:', error)
      return []
    }
  }

  async markSuggestionImplemented(id: number): Promise<RebalancingSuggestion | null> {
    try {
      const stmt = this.db.prepare(`
        UPDATE rebalancing_suggestions 
        SET is_implemented = 1, implemented_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)

      stmt.run(id)
      
      const updated = await this.findSuggestionById(id)
      if (updated) {
        logger.info(`Marked suggestion ${id} as implemented`)
      }
      
      return updated
    } catch (error) {
      logger.error(`Error marking suggestion ${id} as implemented:`, error)
      return null
    }
  }

  // ============================================================================
  // Statistics and Analytics
  // ============================================================================

  async getBalanceStats(): Promise<{
    totalAnalyses: number
    activeAlerts: number
    activeSuggestions: number
    lastAnalysisDate: string | null
    sectorsAnalyzed: number
  }> {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM sector_balance_history')
      const totalResult = totalStmt.get() as { count: number }

      const alertsStmt = this.db.prepare('SELECT COUNT(*) as count FROM concentration_alerts WHERE is_active = 1')
      const alertsResult = alertsStmt.get() as { count: number }

      const suggestionsStmt = this.db.prepare('SELECT COUNT(*) as count FROM rebalancing_suggestions WHERE is_implemented = 0')
      const suggestionsResult = suggestionsStmt.get() as { count: number }

      const lastAnalysisStmt = this.db.prepare('SELECT MAX(analysis_date) as date FROM sector_balance_history')
      const lastAnalysisResult = lastAnalysisStmt.get() as { date: string }

      const sectorsStmt = this.db.prepare('SELECT COUNT(DISTINCT sector) as count FROM sector_balance_history')
      const sectorsResult = sectorsStmt.get() as { count: number }

      return {
        totalAnalyses: totalResult.count,
        activeAlerts: alertsResult.count,
        activeSuggestions: suggestionsResult.count,
        lastAnalysisDate: lastAnalysisResult.date,
        sectorsAnalyzed: sectorsResult.count
      }
    } catch (error) {
      logger.error('Error getting balance stats:', error)
      return {
        totalAnalyses: 0,
        activeAlerts: 0,
        activeSuggestions: 0,
        lastAnalysisDate: null,
        sectorsAnalyzed: 0
      }
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sector_balance_targets LIMIT 1')
      stmt.get()
      return true
    } catch (error) {
      logger.error('Sector balance health check failed:', error)
      return false
    }
  }
}

export default SectorBalanceModel