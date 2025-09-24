import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('BreakEvenModel')

// Interfaces para los tipos de datos
export interface BreakEvenAnalysis {
  id?: number
  trade_id: number
  instrument_id: number
  calculation_date: string
  break_even_price: number
  current_price?: number
  distance_to_break_even?: number
  distance_percentage?: number
  days_to_break_even?: number
  total_costs: number
  purchase_price: number
  commission_impact: number
  custody_impact: number
  inflation_impact: number
  tax_impact?: number
  confidence_level?: number
  scenario_type?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface BreakEvenProjection {
  id?: number
  analysis_id: number
  trade_id: number
  projection_date: string
  months_ahead: number
  inflation_rate: number
  projected_break_even: number
  scenario_type: string
  scenario_name?: string
  probability?: number
  created_at?: string
}

export interface BreakEvenOptimization {
  id?: number
  analysis_id: number
  trade_id: number
  suggestion_type: string
  suggestion_title: string
  suggestion_description: string
  potential_savings?: number
  potential_time_reduction?: number
  implementation_difficulty: 'LOW' | 'MEDIUM' | 'HIGH'
  priority: number
  is_automated?: boolean
  is_applicable?: boolean
  created_at?: string
}

export interface BreakEvenSensitivity {
  id?: number
  analysis_id: number
  trade_id: number
  variable_name: string
  variable_value: number
  resulting_break_even: number
  impact_percentage: number
  scenario_label?: string
  created_at?: string
}

export interface BreakEvenSettings {
  id?: number
  setting_name: string
  setting_value: string
  setting_type: 'NUMBER' | 'BOOLEAN' | 'STRING' | 'JSON'
  description?: string
  is_user_configurable?: boolean
  created_at?: string
  updated_at?: string
}

export interface BreakEvenSummary {
  total_analyses: number
  avg_days_to_break_even: number
  positions_above_break_even: number
  positions_below_break_even: number
  total_potential_savings: number
  most_critical_positions: Array<{
    trade_id: number
    symbol: string
    distance_percentage: number
    days_to_break_even: number
  }>
}

export class BreakEvenModel {
  private db = DatabaseConnection.getInstance()

  // CRUD operaciones para BreakEvenAnalysis
  async createAnalysis(data: Omit<BreakEvenAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<BreakEvenAnalysis> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO break_even_analysis (
          trade_id, instrument_id, calculation_date, break_even_price,
          current_price, distance_to_break_even, distance_percentage,
          days_to_break_even, total_costs, purchase_price,
          commission_impact, custody_impact, inflation_impact,
          tax_impact, confidence_level, scenario_type, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.trade_id,
        data.instrument_id,
        data.calculation_date,
        data.break_even_price,
        data.current_price || null,
        data.distance_to_break_even || null,
        data.distance_percentage || null,
        data.days_to_break_even || null,
        data.total_costs,
        data.purchase_price,
        data.commission_impact,
        data.custody_impact,
        data.inflation_impact,
        data.tax_impact || 0,
        data.confidence_level || 0.8,
        data.scenario_type || 'BASE',
        data.notes || null
      )

      const newAnalysis = await this.findAnalysisById(result.lastInsertRowid as number)
      if (!newAnalysis) {
        throw new Error('Failed to retrieve created break-even analysis')
      }
      return newAnalysis
    } catch (error) {
      logger.error('Error creating break-even analysis:', error)
      throw new Error(`Failed to create break-even analysis: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findAnalysisById(id: number): Promise<BreakEvenAnalysis | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM break_even_analysis WHERE id = ?')
      const result = stmt.get(id) as BreakEvenAnalysis | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding break-even analysis by id:', error)
      throw new Error(`Failed to find break-even analysis: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findAnalysesByTradeId(tradeId: number): Promise<BreakEvenAnalysis[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM break_even_analysis 
        WHERE trade_id = ? 
        ORDER BY calculation_date DESC
      `)
      return stmt.all(tradeId) as BreakEvenAnalysis[]
    } catch (error) {
      logger.error('Error finding break-even analyses by trade id:', error)
      throw new Error(`Failed to find break-even analyses: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findRecentAnalyses(limit: number = 10): Promise<BreakEvenAnalysis[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM break_even_analysis 
        ORDER BY calculation_date DESC, created_at DESC
        LIMIT ?
      `)
      return stmt.all(limit) as BreakEvenAnalysis[]
    } catch (error) {
      logger.error('Error finding recent break-even analyses:', error)
      throw new Error(`Failed to find recent analyses: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async updateAnalysis(id: number, data: Partial<BreakEvenAnalysis>): Promise<BreakEvenAnalysis | null> {
    try {
      const updateFields = []
      const params = []

      for (const [key, value] of Object.entries(data)) {
        if (key !== 'id' && key !== 'created_at') {
          if (key === 'updated_at') {
            updateFields.push(`${key} = CURRENT_TIMESTAMP`)
          } else {
            updateFields.push(`${key} = ?`)
            params.push(value)
          }
        }
      }

      if (updateFields.length === 0) {
        return this.findAnalysisById(id)
      }

      // Add updated_at if not explicitly provided
      if (!data.updated_at) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP')
      }

      params.push(id)

      const stmt = this.db.prepare(`
        UPDATE break_even_analysis 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `)

      const result = stmt.run(...params)
      
      if (result.changes === 0) {
        return null
      }

      return this.findAnalysisById(id)
    } catch (error) {
      logger.error('Error updating break-even analysis:', error)
      throw new Error(`Failed to update break-even analysis: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // CRUD operaciones para BreakEvenProjections
  async createProjection(data: Omit<BreakEvenProjection, 'id' | 'created_at'>): Promise<BreakEvenProjection> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO break_even_projections (
          analysis_id, trade_id, projection_date, months_ahead,
          inflation_rate, projected_break_even, scenario_type,
          scenario_name, probability
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.analysis_id,
        data.trade_id,
        data.projection_date,
        data.months_ahead,
        data.inflation_rate,
        data.projected_break_even,
        data.scenario_type,
        data.scenario_name || null,
        data.probability || 0.33
      )

      const newProjection = await this.findProjectionById(result.lastInsertRowid as number)
      if (!newProjection) {
        throw new Error('Failed to retrieve created projection')
      }
      return newProjection
    } catch (error) {
      logger.error('Error creating break-even projection:', error)
      throw new Error(`Failed to create projection: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findProjectionById(id: number): Promise<BreakEvenProjection | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM break_even_projections WHERE id = ?')
      const result = stmt.get(id) as BreakEvenProjection | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding projection by id:', error)
      throw new Error(`Failed to find projection: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findProjectionsByAnalysisId(analysisId: number): Promise<BreakEvenProjection[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM break_even_projections 
        WHERE analysis_id = ? 
        ORDER BY months_ahead ASC
      `)
      return stmt.all(analysisId) as BreakEvenProjection[]
    } catch (error) {
      logger.error('Error finding projections by analysis id:', error)
      throw new Error(`Failed to find projections: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // CRUD operaciones para BreakEvenOptimizations
  async createOptimization(data: Omit<BreakEvenOptimization, 'id' | 'created_at'>): Promise<BreakEvenOptimization> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO break_even_optimizations (
          analysis_id, trade_id, suggestion_type, suggestion_title,
          suggestion_description, potential_savings, potential_time_reduction,
          implementation_difficulty, priority, is_automated, is_applicable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.analysis_id,
        data.trade_id,
        data.suggestion_type,
        data.suggestion_title,
        data.suggestion_description,
        data.potential_savings || null,
        data.potential_time_reduction || null,
        data.implementation_difficulty,
        data.priority,
        data.is_automated || false,
        data.is_applicable || true
      )

      const newOptimization = await this.findOptimizationById(result.lastInsertRowid as number)
      if (!newOptimization) {
        throw new Error('Failed to retrieve created optimization')
      }
      return newOptimization
    } catch (error) {
      logger.error('Error creating break-even optimization:', error)
      throw new Error(`Failed to create optimization: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findOptimizationById(id: number): Promise<BreakEvenOptimization | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM break_even_optimizations WHERE id = ?')
      const result = stmt.get(id) as BreakEvenOptimization | undefined
      return result || null
    } catch (error) {
      logger.error('Error finding optimization by id:', error)
      throw new Error(`Failed to find optimization: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async findOptimizationsByAnalysisId(analysisId: number): Promise<BreakEvenOptimization[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM break_even_optimizations 
        WHERE analysis_id = ? AND is_applicable = 1
        ORDER BY priority ASC, potential_savings DESC
      `)
      return stmt.all(analysisId) as BreakEvenOptimization[]
    } catch (error) {
      logger.error('Error finding optimizations by analysis id:', error)
      throw new Error(`Failed to find optimizations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Settings management
  async getSetting(name: string): Promise<BreakEvenSettings | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM break_even_settings WHERE setting_name = ?')
      const result = stmt.get(name) as BreakEvenSettings | undefined
      return result || null
    } catch (error) {
      logger.error('Error getting break-even setting:', error)
      throw new Error(`Failed to get setting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async updateSetting(name: string, value: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        UPDATE break_even_settings 
        SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE setting_name = ?
      `)
      const result = stmt.run(value, name)
      return result.changes > 0
    } catch (error) {
      logger.error('Error updating break-even setting:', error)
      throw new Error(`Failed to update setting: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Summary and statistics
  async getBreakEvenSummary(): Promise<BreakEvenSummary> {
    try {
      const summaryStmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total_analyses,
          AVG(days_to_break_even) as avg_days_to_break_even,
          SUM(CASE WHEN distance_percentage > 0 THEN 1 ELSE 0 END) as positions_above_break_even,
          SUM(CASE WHEN distance_percentage <= 0 THEN 1 ELSE 0 END) as positions_below_break_even
        FROM break_even_analysis
        WHERE scenario_type = 'BASE'
      `)
      
      const savingsStmt = this.db.prepare(`
        SELECT COALESCE(SUM(potential_savings), 0) as total_potential_savings
        FROM break_even_optimizations
        WHERE is_applicable = 1
      `)

      const criticalStmt = this.db.prepare(`
        SELECT 
          bea.trade_id,
          i.symbol,
          bea.distance_percentage,
          bea.days_to_break_even
        FROM break_even_analysis bea
        INNER JOIN trades t ON bea.trade_id = t.id
        INNER JOIN instruments i ON t.instrument_id = i.id
        WHERE bea.scenario_type = 'BASE' 
          AND bea.distance_percentage < -10
        ORDER BY bea.distance_percentage ASC
        LIMIT 5
      `)

      const summaryResult = summaryStmt.get() as any
      const savingsResult = savingsStmt.get() as any
      const criticalResults = criticalStmt.all() as any[]

      return {
        total_analyses: summaryResult.total_analyses || 0,
        avg_days_to_break_even: Math.round(summaryResult.avg_days_to_break_even || 0),
        positions_above_break_even: summaryResult.positions_above_break_even || 0,
        positions_below_break_even: summaryResult.positions_below_break_even || 0,
        total_potential_savings: savingsResult.total_potential_savings || 0,
        most_critical_positions: criticalResults
      }
    } catch (error) {
      logger.error('Error getting break-even summary:', error)
      throw new Error(`Failed to get summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async deleteAnalysis(id: number): Promise<boolean> {
    try {
      // Las foreign keys CASCADE se encargan de eliminar records relacionados
      const stmt = this.db.prepare('DELETE FROM break_even_analysis WHERE id = ?')
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      logger.error('Error deleting break-even analysis:', error)
      throw new Error(`Failed to delete analysis: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}