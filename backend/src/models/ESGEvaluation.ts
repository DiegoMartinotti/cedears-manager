import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('ESGEvaluation')

export interface ESGEvaluation {
  id?: number
  instrument_id: number
  environmental_score: number
  social_score: number
  governance_score: number
  total_score: number
  evaluation_date: string
  data_sources?: string
  confidence_level: number
  next_review_date?: string
  analysis_summary?: string
  key_metrics?: string
  controversies?: string
  created_at?: string
  updated_at?: string
}

export interface ESGFilters {
  instrumentId?: number
  minScore?: number
  maxScore?: number
  dateFrom?: string
  dateTo?: string
  minConfidence?: number
  hasControversies?: boolean
}

export interface ESGScoreBreakdown {
  environmental: {
    score: number
    factors: string[]
    weight: number
  }
  social: {
    score: number
    factors: string[]
    weight: number
  }
  governance: {
    score: number
    factors: string[]
    weight: number
  }
}

export interface ESGTrend {
  date: string
  total_score: number
  environmental_score: number
  social_score: number
  governance_score: number
}

export class ESGEvaluationModel {
  private db = DatabaseConnection.getInstance()

  /**
   * Create a new ESG evaluation
   */
  create(evaluation: Omit<ESGEvaluation, 'id' | 'created_at' | 'updated_at'>): ESGEvaluation {
    const stmt = this.db.prepare(`
      INSERT INTO esg_evaluations (
        instrument_id, environmental_score, social_score, governance_score,
        total_score, evaluation_date, data_sources, confidence_level,
        next_review_date, analysis_summary, key_metrics, controversies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    try {
      const result = stmt.run(
        evaluation.instrument_id,
        evaluation.environmental_score,
        evaluation.social_score,
        evaluation.governance_score,
        evaluation.total_score,
        evaluation.evaluation_date,
        evaluation.data_sources || null,
        evaluation.confidence_level,
        evaluation.next_review_date || null,
        evaluation.analysis_summary || null,
        evaluation.key_metrics || null,
        evaluation.controversies || null
      )

      logger.info(`Created ESG evaluation for instrument ${evaluation.instrument_id}`)
      return this.findById(result.lastInsertRowid as number)!
    } catch (error) {
      logger.error('Error creating ESG evaluation:', error)
      throw error
    }
  }

  /**
   * Find ESG evaluation by ID
   */
  findById(id: number): ESGEvaluation | null {
    const stmt = this.db.prepare('SELECT * FROM esg_evaluations WHERE id = ?')
    return stmt.get(id) as ESGEvaluation | null
  }

  /**
   * Find latest ESG evaluation for an instrument
   */
  findLatestByInstrument(instrumentId: number): ESGEvaluation | null {
    const stmt = this.db.prepare(`
      SELECT * FROM esg_evaluations 
      WHERE instrument_id = ? 
      ORDER BY evaluation_date DESC 
      LIMIT 1
    `)
    return stmt.get(instrumentId) as ESGEvaluation | null
  }

  /**
   * Find all ESG evaluations with filters
   */
  findAll(filters: ESGFilters = {}): ESGEvaluation[] {
    let query = `
      SELECT e.*, i.symbol, i.company_name 
      FROM esg_evaluations e
      LEFT JOIN instruments i ON e.instrument_id = i.id
      WHERE 1=1
    `
    const params: any[] = []

    if (filters.instrumentId) {
      query += ' AND e.instrument_id = ?'
      params.push(filters.instrumentId)
    }

    if (filters.minScore !== undefined) {
      query += ' AND e.total_score >= ?'
      params.push(filters.minScore)
    }

    if (filters.maxScore !== undefined) {
      query += ' AND e.total_score <= ?'
      params.push(filters.maxScore)
    }

    if (filters.dateFrom) {
      query += ' AND e.evaluation_date >= ?'
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      query += ' AND e.evaluation_date <= ?'
      params.push(filters.dateTo)
    }

    if (filters.minConfidence !== undefined) {
      query += ' AND e.confidence_level >= ?'
      params.push(filters.minConfidence)
    }

    if (filters.hasControversies !== undefined) {
      if (filters.hasControversies) {
        query += ' AND e.controversies IS NOT NULL AND e.controversies != ""'
      } else {
        query += ' AND (e.controversies IS NULL OR e.controversies = "")'
      }
    }

    query += ' ORDER BY e.evaluation_date DESC'

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as ESGEvaluation[]
  }

  /**
   * Update ESG evaluation
   */
  update(id: number, updates: Partial<ESGEvaluation>): ESGEvaluation | null {
    const allowedFields = [
      'environmental_score', 'social_score', 'governance_score', 'total_score',
      'data_sources', 'confidence_level', 'next_review_date', 'analysis_summary',
      'key_metrics', 'controversies'
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
      .map(key => updates[key as keyof ESGEvaluation])

    const stmt = this.db.prepare(`
      UPDATE esg_evaluations 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)

    stmt.run(...values, id)
    return this.findById(id)
  }

  /**
   * Delete ESG evaluation
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM esg_evaluations WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get ESG trends for an instrument
   */
  getTrends(instrumentId: number, months: number = 12): ESGTrend[] {
    const stmt = this.db.prepare(`
      SELECT 
        DATE(evaluation_date) as date,
        total_score,
        environmental_score,
        social_score,
        governance_score
      FROM esg_evaluations 
      WHERE instrument_id = ? 
        AND evaluation_date >= DATE('now', '-' || ? || ' months')
      ORDER BY evaluation_date ASC
    `)

    return stmt.all(instrumentId, months) as ESGTrend[]
  }

  /**
   * Get ESG statistics
   */
  getStatistics(): {
    totalEvaluations: number
    averageScore: number
    distributionByScore: { range: string; count: number }[]
    recentEvaluations: number
    instrumentsCovered: number
  } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM esg_evaluations')
    const totalResult = totalStmt.get() as { count: number }

    const avgStmt = this.db.prepare('SELECT AVG(total_score) as avg FROM esg_evaluations')
    const avgResult = avgStmt.get() as { avg: number }

    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM esg_evaluations 
      WHERE evaluation_date >= DATE('now', '-30 days')
    `)
    const recentResult = recentStmt.get() as { count: number }

    const instrumentsStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT instrument_id) as count 
      FROM esg_evaluations
    `)
    const instrumentsResult = instrumentsStmt.get() as { count: number }

    // Score distribution
    const distributionStmt = this.db.prepare(`
      SELECT 
        CASE 
          WHEN total_score >= 80 THEN 'Excellent (80-100)'
          WHEN total_score >= 60 THEN 'Good (60-79)'
          WHEN total_score >= 40 THEN 'Fair (40-59)'
          WHEN total_score >= 20 THEN 'Poor (20-39)'
          ELSE 'Very Poor (0-19)'
        END as range,
        COUNT(*) as count
      FROM esg_evaluations
      GROUP BY range
      ORDER BY MIN(total_score) DESC
    `)
    const distribution = distributionStmt.all() as { range: string; count: number }[]

    return {
      totalEvaluations: totalResult.count,
      averageScore: Math.round((avgResult.avg || 0) * 100) / 100,
      distributionByScore: distribution,
      recentEvaluations: recentResult.count,
      instrumentsCovered: instrumentsResult.count
    }
  }

  /**
   * Get instruments needing ESG review
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
        e.evaluation_date as last_evaluation,
        CASE 
          WHEN e.evaluation_date IS NOT NULL 
          THEN CAST(julianday('now') - julianday(e.evaluation_date) AS INTEGER)
          ELSE NULL 
        END as days_since_review
      FROM instruments i
      LEFT JOIN (
        SELECT instrument_id, MAX(evaluation_date) as evaluation_date
        FROM esg_evaluations
        GROUP BY instrument_id
      ) e ON i.id = e.instrument_id
      WHERE i.is_active = TRUE
        AND (
          e.evaluation_date IS NULL 
          OR e.evaluation_date < DATE('now', '-90 days')
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
   * Calculate ESG score breakdown
   */
  calculateScoreBreakdown(
    environmentalScore: number,
    socialScore: number,
    governanceScore: number
  ): ESGScoreBreakdown {
    const weights = {
      environmental: 0.4, // 40%
      social: 0.3,        // 30%
      governance: 0.3     // 30%
    }

    return {
      environmental: {
        score: environmentalScore,
        factors: [
          'Carbon emissions',
          'Renewable energy usage',
          'Waste management',
          'Environmental policies'
        ],
        weight: weights.environmental
      },
      social: {
        score: socialScore,
        factors: [
          'Employee diversity',
          'Labor practices',
          'Community impact',
          'Product responsibility'
        ],
        weight: weights.social
      },
      governance: {
        score: governanceScore,
        factors: [
          'Board independence',
          'Executive compensation',
          'Transparency',
          'Business ethics'
        ],
        weight: weights.governance
      }
    }
  }

  /**
   * Bulk update instrument ESG flags based on scores
   */
  updateInstrumentESGFlags(): void {
    // Update is_esg_compliant flag based on latest total scores
    const stmt = this.db.prepare(`
      UPDATE instruments 
      SET is_esg_compliant = (
        SELECT CASE 
          WHEN e.total_score >= 60 THEN TRUE 
          ELSE FALSE 
        END
        FROM esg_evaluations e
        WHERE e.instrument_id = instruments.id
          AND e.evaluation_date = (
            SELECT MAX(evaluation_date) 
            FROM esg_evaluations e2 
            WHERE e2.instrument_id = instruments.id
          )
      )
      WHERE id IN (
        SELECT DISTINCT instrument_id 
        FROM esg_evaluations
      )
    `)

    const result = stmt.run()
    logger.info(`Updated ESG flags for ${result.changes} instruments`)
  }
}

export default ESGEvaluationModel