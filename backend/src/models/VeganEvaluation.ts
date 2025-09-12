import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('VeganEvaluation')

export interface VeganEvaluation {
  id?: number
  instrument_id: number
  no_animal_testing: boolean
  no_animal_products: boolean
  plant_based_focus: boolean
  supply_chain_vegan: boolean
  vegan_score: number
  evaluation_date: string
  certification_status?: string
  vegan_certifications?: string
  animal_testing_policy?: string
  supply_chain_analysis?: string
  created_at?: string
  updated_at?: string
}

export interface VeganFilters {
  instrumentId?: number
  minScore?: number
  maxScore?: number
  dateFrom?: string
  dateTo?: string
  noAnimalTesting?: boolean
  noAnimalProducts?: boolean
  plantBasedFocus?: boolean
  supplyChainVegan?: boolean
  hasCertification?: boolean
}

export interface VeganCriteria {
  animalTesting: {
    compliant: boolean
    details: string
    weight: number
  }
  animalProducts: {
    compliant: boolean
    details: string
    weight: number
  }
  plantBasedFocus: {
    compliant: boolean
    details: string
    weight: number
  }
  supplyChain: {
    compliant: boolean
    details: string
    weight: number
  }
}

export interface VeganTrend {
  date: string
  vegan_score: number
  no_animal_testing: boolean
  no_animal_products: boolean
  plant_based_focus: boolean
  supply_chain_vegan: boolean
}

export class VeganEvaluationModel {
  private db = DatabaseConnection.getInstance()

  /**
   * Create a new Vegan evaluation
   */
  create(evaluation: Omit<VeganEvaluation, 'id' | 'created_at' | 'updated_at'>): VeganEvaluation {
    const stmt = this.db.prepare(`
      INSERT INTO vegan_evaluations (
        instrument_id, no_animal_testing, no_animal_products, plant_based_focus,
        supply_chain_vegan, vegan_score, evaluation_date, certification_status,
        vegan_certifications, animal_testing_policy, supply_chain_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    try {
      const result = stmt.run(
        evaluation.instrument_id,
        evaluation.no_animal_testing ? 1 : 0,
        evaluation.no_animal_products ? 1 : 0,
        evaluation.plant_based_focus ? 1 : 0,
        evaluation.supply_chain_vegan ? 1 : 0,
        evaluation.vegan_score,
        evaluation.evaluation_date,
        evaluation.certification_status || null,
        evaluation.vegan_certifications || null,
        evaluation.animal_testing_policy || null,
        evaluation.supply_chain_analysis || null
      )

      logger.info(`Created Vegan evaluation for instrument ${evaluation.instrument_id}`)
      return this.findById(result.lastInsertRowid as number)!
    } catch (error) {
      logger.error('Error creating Vegan evaluation:', error)
      throw error
    }
  }

  /**
   * Find Vegan evaluation by ID
   */
  findById(id: number): VeganEvaluation | null {
    const stmt = this.db.prepare('SELECT * FROM vegan_evaluations WHERE id = ?')
    const result = stmt.get(id) as any
    return result ? this.convertBooleans(result) : null
  }

  /**
   * Find latest Vegan evaluation for an instrument
   */
  findLatestByInstrument(instrumentId: number): VeganEvaluation | null {
    const stmt = this.db.prepare(`
      SELECT * FROM vegan_evaluations 
      WHERE instrument_id = ? 
      ORDER BY evaluation_date DESC 
      LIMIT 1
    `)
    const result = stmt.get(instrumentId) as any
    return result ? this.convertBooleans(result) : null
  }

  /**
   * Find all Vegan evaluations with filters
   */
  findAll(filters: VeganFilters = {}): VeganEvaluation[] {
    const { query, params } = this.buildFilterQuery(filters)
    const stmt = this.db.prepare(query)
    const results = stmt.all(...params) as any[]
    return results.map(result => this.convertBooleans(result))
  }

  private buildFilterQuery(filters: VeganFilters): { query: string; params: any[] } {
    const baseQuery = `
      SELECT v.*, i.symbol, i.company_name
      FROM vegan_evaluations v
      LEFT JOIN instruments i ON v.instrument_id = i.id
    `

    const conditions: string[] = []
    const params: any[] = []

    if (filters.instrumentId) {
      conditions.push('v.instrument_id = ?')
      params.push(filters.instrumentId)
    }

    this.addScoreFilter(conditions, params, filters)
    this.addDateFilter(conditions, params, filters)
    this.addBooleanFilter(conditions, params, filters, 'noAnimalTesting')
    this.addBooleanFilter(conditions, params, filters, 'noAnimalProducts')
    this.addBooleanFilter(conditions, params, filters, 'plantBasedFocus')
    this.addBooleanFilter(conditions, params, filters, 'supplyChainVegan')

    if (filters.hasCertification !== undefined) {
      conditions.push(
        filters.hasCertification
          ? 'v.certification_status IS NOT NULL AND v.certification_status != ""'
          : '(v.certification_status IS NULL OR v.certification_status = "")'
      )
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const query = `${baseQuery} ${whereClause} ORDER BY v.evaluation_date DESC`

    return { query, params }
  }

  private addScoreFilter(conditions: string[], params: any[], filters: VeganFilters): void {
    if (filters.minScore !== undefined) {
      conditions.push('v.vegan_score >= ?')
      params.push(filters.minScore)
    }

    if (filters.maxScore !== undefined) {
      conditions.push('v.vegan_score <= ?')
      params.push(filters.maxScore)
    }
  }

  private addDateFilter(conditions: string[], params: any[], filters: VeganFilters): void {
    if (filters.dateFrom) {
      conditions.push('v.evaluation_date >= ?')
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      conditions.push('v.evaluation_date <= ?')
      params.push(filters.dateTo)
    }
  }

  private addBooleanFilter(
    conditions: string[],
    params: any[],
    filters: VeganFilters,
    field: 'noAnimalTesting' | 'noAnimalProducts' | 'plantBasedFocus' | 'supplyChainVegan'
  ): void {
    const value = filters[field]
    if (value !== undefined) {
      const columnMap = {
        noAnimalTesting: 'no_animal_testing',
        noAnimalProducts: 'no_animal_products',
        plantBasedFocus: 'plant_based_focus',
        supplyChainVegan: 'supply_chain_vegan'
      } as const

      const column = columnMap[field]
      conditions.push(`v.${column} = ?`)
      params.push(value ? 1 : 0)
    }
  }

  /**
   * Update Vegan evaluation
   */
  update(id: number, updates: Partial<VeganEvaluation>): VeganEvaluation | null {
    const allowedFields = [
      'no_animal_testing', 'no_animal_products', 'plant_based_focus', 'supply_chain_vegan',
      'vegan_score', 'certification_status', 'vegan_certifications', 
      'animal_testing_policy', 'supply_chain_analysis'
    ]

    const setClause = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => `${key} = ?`)
      .join(', ')

    if (!setClause) {
      throw new Error('No valid fields to update')
    }

    const values = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .map(key => {
        const value = updates[key as keyof VeganEvaluation]
        // Convert booleans to integers for SQLite
        if (typeof value === 'boolean') {
          return value ? 1 : 0
        }
        return value
      })

    const stmt = this.db.prepare(`
      UPDATE vegan_evaluations 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)

    stmt.run(...values, id)
    return this.findById(id)
  }

  /**
   * Delete Vegan evaluation
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM vegan_evaluations WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get Vegan trends for an instrument
   */
  getTrends(instrumentId: number, months: number = 12): VeganTrend[] {
    const stmt = this.db.prepare(`
      SELECT 
        DATE(evaluation_date) as date,
        vegan_score,
        no_animal_testing,
        no_animal_products,
        plant_based_focus,
        supply_chain_vegan
      FROM vegan_evaluations 
      WHERE instrument_id = ? 
        AND evaluation_date >= DATE('now', '-' || ? || ' months')
      ORDER BY evaluation_date ASC
    `)

    const results = stmt.all(instrumentId, months) as any[]
    return results.map(result => ({
      ...result,
      no_animal_testing: Boolean(result.no_animal_testing),
      no_animal_products: Boolean(result.no_animal_products),
      plant_based_focus: Boolean(result.plant_based_focus),
      supply_chain_vegan: Boolean(result.supply_chain_vegan)
    }))
  }

  /**
   * Get Vegan statistics
   */
  // eslint-disable-next-line max-lines-per-function
  getStatistics(): {
    totalEvaluations: number
    averageScore: number
    criteriaCompliance: {
      noAnimalTesting: number
      noAnimalProducts: number
      plantBasedFocus: number
      supplyChainVegan: number
    }
    certificationDistribution: { status: string; count: number }[]
    recentEvaluations: number
    instrumentsCovered: number
  } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM vegan_evaluations')
    const totalResult = totalStmt.get() as { count: number }

    const avgStmt = this.db.prepare('SELECT AVG(vegan_score) as avg FROM vegan_evaluations')
    const avgResult = avgStmt.get() as { avg: number }

    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM vegan_evaluations 
      WHERE evaluation_date >= DATE('now', '-30 days')
    `)
    const recentResult = recentStmt.get() as { count: number }

    const instrumentsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT instrument_id) as count 
      FROM vegan_evaluations
    `)
    const instrumentsResult = instrumentsStmt.get() as { count: number }

    // Criteria compliance
    const complianceStmt = this.db.prepare(`
      SELECT 
        AVG(no_animal_testing) * 100 as no_animal_testing,
        AVG(no_animal_products) * 100 as no_animal_products,
        AVG(plant_based_focus) * 100 as plant_based_focus,
        AVG(supply_chain_vegan) * 100 as supply_chain_vegan
      FROM vegan_evaluations
    `)
    const complianceResult = complianceStmt.get() as any

    // Certification distribution
    const certificationStmt = this.db.prepare(`
      SELECT 
        COALESCE(certification_status, 'None') as status,
        COUNT(*) as count
      FROM vegan_evaluations
      GROUP BY certification_status
      ORDER BY count DESC
    `)
    const certification = certificationStmt.all() as { status: string; count: number }[]

    return {
      totalEvaluations: totalResult.count,
      averageScore: Math.round((avgResult.avg || 0) * 100) / 100,
      criteriaCompliance: {
        noAnimalTesting: Math.round((complianceResult.no_animal_testing || 0) * 100) / 100,
        noAnimalProducts: Math.round((complianceResult.no_animal_products || 0) * 100) / 100,
        plantBasedFocus: Math.round((complianceResult.plant_based_focus || 0) * 100) / 100,
        supplyChainVegan: Math.round((complianceResult.supply_chain_vegan || 0) * 100) / 100
      },
      certificationDistribution: certification,
      recentEvaluations: recentResult.count,
      instrumentsCovered: instrumentsResult.count
    }
  }

  /**
   * Calculate Vegan score based on criteria
   */
  calculateVeganScore(criteria: {
    noAnimalTesting: boolean
    noAnimalProducts: boolean
    plantBasedFocus: boolean
    supplyChainVegan: boolean
  }): number {
    const weights = {
      noAnimalTesting: 40,    // 40%
      noAnimalProducts: 30,   // 30%
      plantBasedFocus: 20,    // 20%
      supplyChainVegan: 10    // 10%
    }

    let score = 0
    if (criteria.noAnimalTesting) score += weights.noAnimalTesting
    if (criteria.noAnimalProducts) score += weights.noAnimalProducts
    if (criteria.plantBasedFocus) score += weights.plantBasedFocus
    if (criteria.supplyChainVegan) score += weights.supplyChainVegan

    return score
  }

  /**
   * Get detailed vegan criteria breakdown
   */
  getVeganCriteriaBreakdown(evaluation: VeganEvaluation): VeganCriteria {
    return {
      animalTesting: {
        compliant: evaluation.no_animal_testing,
        details: evaluation.animal_testing_policy || 'Policy analysis pending',
        weight: 0.4
      },
      animalProducts: {
        compliant: evaluation.no_animal_products,
        details: 'Product ingredient analysis',
        weight: 0.3
      },
      plantBasedFocus: {
        compliant: evaluation.plant_based_focus,
        details: 'Company focus on plant-based alternatives',
        weight: 0.2
      },
      supplyChain: {
        compliant: evaluation.supply_chain_vegan,
        details: evaluation.supply_chain_analysis || 'Supply chain analysis pending',
        weight: 0.1
      }
    }
  }

  /**
   * Bulk update instrument vegan flags based on scores
   */
  updateInstrumentVeganFlags(): void {
    // Update is_vegan_friendly flag based on latest scores and criteria
    const stmt = this.db.prepare(`
      UPDATE instruments 
      SET is_vegan_friendly = (
        SELECT CASE 
          WHEN v.vegan_score >= 70 AND v.no_animal_testing = 1 AND v.no_animal_products = 1
          THEN TRUE 
          ELSE FALSE 
        END
        FROM vegan_evaluations v
        WHERE v.instrument_id = instruments.id
          AND v.evaluation_date = (
            SELECT MAX(evaluation_date) 
            FROM vegan_evaluations v2 
            WHERE v2.instrument_id = instruments.id
          )
      )
      WHERE id IN (
        SELECT DISTINCT instrument_id 
        FROM vegan_evaluations
      )
    `)

    const result = stmt.run()
    logger.info(`Updated Vegan flags for ${result.changes} instruments`)
  }

  /**
   * Get instruments needing Vegan review
   */
  getInstrumentsNeedingReview(): Array<{
    instrument_id: number
    symbol: string
    company_name: string
    last_evaluation: string | null
    days_since_review: number | null
  }> {
    const stmt = this.db.prepare(`
      SELECT 
        i.id as instrument_id,
        i.symbol,
        i.company_name,
        v.evaluation_date as last_evaluation,
        CASE 
          WHEN v.evaluation_date IS NOT NULL 
          THEN CAST(julianday('now') - julianday(v.evaluation_date) AS INTEGER)
          ELSE NULL 
        END as days_since_review
      FROM instruments i
      LEFT JOIN (
        SELECT instrument_id, MAX(evaluation_date) as evaluation_date
        FROM vegan_evaluations
        GROUP BY instrument_id
      ) v ON i.id = v.instrument_id
      WHERE i.is_active = TRUE
        AND (
          v.evaluation_date IS NULL 
          OR v.evaluation_date < DATE('now', '-120 days')
        )
      ORDER BY days_since_review DESC NULLS FIRST
    `)

    return stmt.all() as Array<{
      instrument_id: number
      symbol: string
      company_name: string
      last_evaluation: string | null
      days_since_review: number | null
    }>
  }

  /**
   * Convert SQLite integer booleans to JavaScript booleans
   */
  private convertBooleans(result: any): VeganEvaluation {
    return {
      ...result,
      no_animal_testing: Boolean(result.no_animal_testing),
      no_animal_products: Boolean(result.no_animal_products),
      plant_based_focus: Boolean(result.plant_based_focus),
      supply_chain_vegan: Boolean(result.supply_chain_vegan)
    }
  }
}

export default VeganEvaluationModel
