import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'
import type { SectorClassification } from '../types/sectorBalance.types.js'

const logger = createLogger('SectorClassification')

export class SectorClassificationModel {
  private db = DatabaseConnection.getInstance()

  private buildFilterClauses(options: {
    sector?: string
    source?: string
    minConfidence?: number
  } = {}): { where: string; params: unknown[] } {
    const filters: string[] = ['1=1']
    const params: unknown[] = []

    if (options.sector) {
      filters.push('gics_sector = ?')
      params.push(options.sector)
    }

    if (options.source) {
      filters.push('source = ?')
      params.push(options.source)
    }

    if (options.minConfidence !== undefined) {
      filters.push('confidence_score >= ?')
      params.push(options.minConfidence)
    }

    return { where: filters.join(' AND '), params }
  }

  private buildPaginationClauses(options?: { limit?: number; offset?: number }): {
    clause: string
    params: unknown[]
  } {
    const parts: string[] = []
    const params: unknown[] = []

    if (options?.limit !== undefined) {
      parts.push('LIMIT ?')
      params.push(options.limit)
    }

    if (options?.offset !== undefined) {
      parts.push('OFFSET ?')
      params.push(options.offset)
    }

    const clause = parts.length > 0 ? ` ${parts.join(' ')}` : ''
    return { clause, params }
  }

  private buildFindAllQuery(options?: {
    sector?: string
    source?: string
    minConfidence?: number
    limit?: number
    offset?: number
  }): { query: string; params: unknown[] } {
    const filters = this.buildFilterClauses(options)
    const pagination = this.buildPaginationClauses(options)

    const query = `
      SELECT
        id,
        instrument_id as instrumentId,
        gics_sector as gicsSector,
        gics_industry_group as gicsIndustryGroup,
        gics_industry as gicsIndustry,
        gics_sub_industry as gicsSubIndustry,
        last_updated as lastUpdated,
        source,
        confidence_score as confidenceScore,
        created_at as createdAt,
        updated_at as updatedAt
      FROM sector_classifications
      WHERE ${filters.where}
      ORDER BY created_at DESC${pagination.clause}
    `

    return {
      query,
      params: [...filters.params, ...pagination.params]
    }
  }

  private buildUpdateStatement(data: Partial<SectorClassification>): {
    clause: string
    params: unknown[]
  } {
    const mappings: Array<{ field: keyof SectorClassification; column: string }> = [
      { field: 'gicsSector', column: 'gics_sector' },
      { field: 'gicsIndustryGroup', column: 'gics_industry_group' },
      { field: 'gicsIndustry', column: 'gics_industry' },
      { field: 'gicsSubIndustry', column: 'gics_sub_industry' },
      { field: 'source', column: 'source' },
      { field: 'confidenceScore', column: 'confidence_score' }
    ]

    const updates: string[] = []
    const params: unknown[] = []

    for (const { field, column } of mappings) {
      const value = data[field]
      if (value !== undefined) {
        updates.push(`${column} = ?`)
        params.push(value)
      }
    }

    return {
      clause: updates.join(', '),
      params
    }
  }

  private getSingleValue<T extends Record<string, number | string | null>>(
    query: string
  ): T {
    const stmt = this.db.prepare(query)
    return stmt.get() as T
  }

  private aggregateBy(column: 'gics_sector' | 'source'): Record<string, number> {
    const stmt = this.db.prepare(`
      SELECT ${column} as key, COUNT(*) as count
      FROM sector_classifications
      GROUP BY ${column}
    `)
    const results = stmt.all() as Array<{ key: string | null; count: number }>

    return results.reduce((acc, row) => {
      const key = row.key ?? 'Unknown'
      acc[key] = row.count
      return acc
    }, {} as Record<string, number>)
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async create(data: Omit<SectorClassification, 'id' | 'createdAt' | 'updatedAt'>): Promise<SectorClassification> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO sector_classifications (
          instrument_id, gics_sector, gics_industry_group,
          gics_industry, gics_sub_industry, last_updated,
          source, confidence_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.instrumentId,
        data.gicsSector,
        data.gicsIndustryGroup || null,
        data.gicsIndustry || null,
        data.gicsSubIndustry || null,
        data.lastUpdated,
        data.source,
        data.confidenceScore
      )

      const created = await this.findById(result.lastInsertRowid as number)
      if (!created) {
        throw new Error('Failed to retrieve created sector classification')
      }

      logger.info(`Created sector classification for instrument ${data.instrumentId}: ${data.gicsSector}`)
      return created
    } catch (error) {
      logger.error('Error creating sector classification:', error)
      throw error
    }
  }

  async findById(id: number): Promise<SectorClassification | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          instrument_id as instrumentId,
          gics_sector as gicsSector,
          gics_industry_group as gicsIndustryGroup,
          gics_industry as gicsIndustry,
          gics_sub_industry as gicsSubIndustry,
          last_updated as lastUpdated,
          source,
          confidence_score as confidenceScore,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_classifications 
        WHERE id = ?
      `)

      const result = stmt.get(id) as SectorClassification | undefined
      return result || null
    } catch (error) {
      logger.error(`Error finding sector classification by id ${id}:`, error)
      return null
    }
  }

  async findByInstrumentId(instrumentId: number): Promise<SectorClassification | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          instrument_id as instrumentId,
          gics_sector as gicsSector,
          gics_industry_group as gicsIndustryGroup,
          gics_industry as gicsIndustry,
          gics_sub_industry as gicsSubIndustry,
          last_updated as lastUpdated,
          source,
          confidence_score as confidenceScore,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_classifications 
        WHERE instrument_id = ?
      `)

      const result = stmt.get(instrumentId) as SectorClassification | undefined
      return result || null
    } catch (error) {
      logger.error(`Error finding sector classification by instrument ${instrumentId}:`, error)
      return null
    }
  }

  async findAll(options?: {
    sector?: string
    source?: string
    minConfidence?: number
    limit?: number
    offset?: number
  }): Promise<SectorClassification[]> {
    try {
      const { query, params } = this.buildFindAllQuery(options)
      const stmt = this.db.prepare(query)
      const results = stmt.all(...params) as SectorClassification[]

      return results
    } catch (error) {
      logger.error('Error finding sector classifications:', error)
      return []
    }
  }

  async update(id: number, data: Partial<SectorClassification>): Promise<SectorClassification | null> {
    try {
      const { clause, params } = this.buildUpdateStatement(data)

      if (!clause) {
        return this.findById(id)
      }

      const expressions = [clause, 'last_updated = ?', 'updated_at = CURRENT_TIMESTAMP']
      const stmt = this.db.prepare(`
        UPDATE sector_classifications
        SET ${expressions.join(', ')}
        WHERE id = ?
      `)

      stmt.run(...params, new Date().toISOString(), id)

      const updated = await this.findById(id)
      if (updated) {
        logger.info(`Updated sector classification ${id}`)
      }

      return updated
    } catch (error) {
      logger.error(`Error updating sector classification ${id}:`, error)
      return null
    }
  }

  async upsertByInstrumentId(
    instrumentId: number, 
    data: Omit<SectorClassification, 'id' | 'instrumentId' | 'createdAt' | 'updatedAt'>
  ): Promise<SectorClassification> {
    try {
      const existing = await this.findByInstrumentId(instrumentId)
      
      if (existing) {
        const updated = await this.update(existing.id!, data)
        if (!updated) {
          throw new Error(`Failed to update sector classification for instrument ${instrumentId}`)
        }
        return updated
      } else {
        return await this.create({ ...data, instrumentId })
      }
    } catch (error) {
      logger.error(`Error upserting sector classification for instrument ${instrumentId}:`, error)
      throw error
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM sector_classifications WHERE id = ?')
      const result = stmt.run(id)
      
      const deleted = result.changes > 0
      if (deleted) {
        logger.info(`Deleted sector classification ${id}`)
      }
      
      return deleted
    } catch (error) {
      logger.error(`Error deleting sector classification ${id}:`, error)
      return false
    }
  }

  async deleteByInstrumentId(instrumentId: number): Promise<boolean> {
    try {
      const stmt = this.db.prepare('DELETE FROM sector_classifications WHERE instrument_id = ?')
      const result = stmt.run(instrumentId)
      
      const deleted = result.changes > 0
      if (deleted) {
        logger.info(`Deleted sector classification for instrument ${instrumentId}`)
      }
      
      return deleted
    } catch (error) {
      logger.error(`Error deleting sector classification for instrument ${instrumentId}:`, error)
      return false
    }
  }

  // ============================================================================
  // Analysis and Statistics Methods
  // ============================================================================

  async getSectorDistribution(): Promise<Array<{sector: string, count: number, avgConfidence: number}>> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          gics_sector as sector,
          COUNT(*) as count,
          AVG(confidence_score) as avgConfidence
        FROM sector_classifications
        GROUP BY gics_sector
        ORDER BY count DESC
      `)

      const results = stmt.all() as Array<{sector: string, count: number, avgConfidence: number}>
      return results
    } catch (error) {
      logger.error('Error getting sector distribution:', error)
      return []
    }
  }

  async getClassificationsByConfidence(minConfidence: number = 80): Promise<{
    highConfidence: SectorClassification[]
    lowConfidence: SectorClassification[]
  }> {
    try {
      const highConfidenceStmt = this.db.prepare(`
        SELECT 
          id,
          instrument_id as instrumentId,
          gics_sector as gicsSector,
          gics_industry_group as gicsIndustryGroup,
          gics_industry as gicsIndustry,
          gics_sub_industry as gicsSubIndustry,
          last_updated as lastUpdated,
          source,
          confidence_score as confidenceScore,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_classifications 
        WHERE confidence_score >= ?
        ORDER BY confidence_score DESC
      `)

      const lowConfidenceStmt = this.db.prepare(`
        SELECT 
          id,
          instrument_id as instrumentId,
          gics_sector as gicsSector,
          gics_industry_group as gicsIndustryGroup,
          gics_industry as gicsIndustry,
          gics_sub_industry as gicsSubIndustry,
          last_updated as lastUpdated,
          source,
          confidence_score as confidenceScore,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_classifications 
        WHERE confidence_score < ?
        ORDER BY confidence_score ASC
      `)

      const highConfidence = highConfidenceStmt.all(minConfidence) as SectorClassification[]
      const lowConfidence = lowConfidenceStmt.all(minConfidence) as SectorClassification[]

      return { highConfidence, lowConfidence }
    } catch (error) {
      logger.error('Error getting classifications by confidence:', error)
      return { highConfidence: [], lowConfidence: [] }
    }
  }

  async getOutdatedClassifications(daysOld: number = 30): Promise<SectorClassification[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const stmt = this.db.prepare(`
        SELECT 
          id,
          instrument_id as instrumentId,
          gics_sector as gicsSector,
          gics_industry_group as gicsIndustryGroup,
          gics_industry as gicsIndustry,
          gics_sub_industry as gicsSubIndustry,
          last_updated as lastUpdated,
          source,
          confidence_score as confidenceScore,
          created_at as createdAt,
          updated_at as updatedAt
        FROM sector_classifications 
        WHERE last_updated < ?
        ORDER BY last_updated ASC
      `)

      const results = stmt.all(cutoffDate.toISOString()) as SectorClassification[]
      return results
    } catch (error) {
      logger.error('Error getting outdated classifications:', error)
      return []
    }
  }

  async getClassificationStats(): Promise<{
    totalClassifications: number
    bySector: Record<string, number>
    bySource: Record<string, number>
    averageConfidence: number
    lastUpdated: string | null
  }> {
    try {
      const totalResult = this.getSingleValue<{ total: number }>('SELECT COUNT(*) as total FROM sector_classifications')
      const bySector = this.aggregateBy('gics_sector')
      const bySource = this.aggregateBy('source')
      const avgResult = this.getSingleValue<{ avg: number }>('SELECT AVG(confidence_score) as avg FROM sector_classifications')
      const lastResult = this.getSingleValue<{ lastUpdated: string | null }>('SELECT MAX(last_updated) as lastUpdated FROM sector_classifications')

      return {
        totalClassifications: totalResult.total,
        bySector,
        bySource,
        averageConfidence: Math.round(avgResult.avg || 0),
        lastUpdated: lastResult.lastUpdated
      }
    } catch (error) {
      logger.error('Error getting classification stats:', error)
      return {
        totalClassifications: 0,
        bySector: {},
        bySource: {},
        averageConfidence: 0,
        lastUpdated: null
      }
    }
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  async bulkUpdate(updates: Array<{instrumentId: number, data: Partial<SectorClassification>}>): Promise<number> {
    try {
      let updatedCount = 0

      // Use transaction for better performance
      const transaction = this.db.transaction(() => {
        for (const update of updates) {
          const result = this.update(update.instrumentId, update.data)
          if (result) updatedCount++
        }
      })

      transaction()
      
      logger.info(`Bulk updated ${updatedCount} sector classifications`)
      return updatedCount
    } catch (error) {
      logger.error('Error in bulk update:', error)
      return 0
    }
  }

  async cleanupOutdated(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const stmt = this.db.prepare(`
        DELETE FROM sector_classifications 
        WHERE last_updated < ? AND source = 'AUTO' AND confidence_score < 50
      `)

      const result = stmt.run(cutoffDate.toISOString())
      const deletedCount = result.changes

      logger.info(`Cleaned up ${deletedCount} outdated sector classifications`)
      return deletedCount
    } catch (error) {
      logger.error('Error cleaning up outdated classifications:', error)
      return 0
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM sector_classifications LIMIT 1')
      stmt.get()
      return true
    } catch (error) {
      logger.error('Sector classification health check failed:', error)
      return false
    }
  }
}

export default SectorClassificationModel