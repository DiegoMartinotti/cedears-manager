import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'
import type { SectorClassification } from '../types/sectorBalance.types.js'

const logger = createLogger('SectorClassification')

export class SectorClassificationModel {
  private db = DatabaseConnection.getInstance()

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
      let query = `
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
        WHERE 1=1
      `
      const params: any[] = []

      if (options?.sector) {
        query += ' AND gics_sector = ?'
        params.push(options.sector)
      }

      if (options?.source) {
        query += ' AND source = ?'
        params.push(options.source)
      }

      if (options?.minConfidence !== undefined) {
        query += ' AND confidence_score >= ?'
        params.push(options.minConfidence)
      }

      query += ' ORDER BY created_at DESC'

      if (options?.limit) {
        query += ' LIMIT ?'
        params.push(options.limit)
      }

      if (options?.offset) {
        query += ' OFFSET ?'
        params.push(options.offset)
      }

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
      const updates: string[] = []
      const params: any[] = []

      if (data.gicsSector !== undefined) {
        updates.push('gics_sector = ?')
        params.push(data.gicsSector)
      }

      if (data.gicsIndustryGroup !== undefined) {
        updates.push('gics_industry_group = ?')
        params.push(data.gicsIndustryGroup)
      }

      if (data.gicsIndustry !== undefined) {
        updates.push('gics_industry = ?')
        params.push(data.gicsIndustry)
      }

      if (data.gicsSubIndustry !== undefined) {
        updates.push('gics_sub_industry = ?')
        params.push(data.gicsSubIndustry)
      }

      if (data.source !== undefined) {
        updates.push('source = ?')
        params.push(data.source)
      }

      if (data.confidenceScore !== undefined) {
        updates.push('confidence_score = ?')
        params.push(data.confidenceScore)
      }

      if (updates.length === 0) {
        return this.findById(id)
      }

      updates.push('last_updated = ?', 'updated_at = CURRENT_TIMESTAMP')
      params.push(new Date().toISOString())
      params.push(id)

      const stmt = this.db.prepare(`
        UPDATE sector_classifications 
        SET ${updates.join(', ')}
        WHERE id = ?
      `)

      stmt.run(...params)
      
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
      // Total classifications
      const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM sector_classifications')
      const totalResult = totalStmt.get() as { total: number }

      // By sector
      const sectorStmt = this.db.prepare(`
        SELECT gics_sector as sector, COUNT(*) as count
        FROM sector_classifications
        GROUP BY gics_sector
      `)
      const sectorResults = sectorStmt.all() as Array<{sector: string, count: number}>
      const bySector = sectorResults.reduce((acc, row) => {
        acc[row.sector] = row.count
        return acc
      }, {} as Record<string, number>)

      // By source
      const sourceStmt = this.db.prepare(`
        SELECT source, COUNT(*) as count
        FROM sector_classifications
        GROUP BY source
      `)
      const sourceResults = sourceStmt.all() as Array<{source: string, count: number}>
      const bySource = sourceResults.reduce((acc, row) => {
        acc[row.source] = row.count
        return acc
      }, {} as Record<string, number>)

      // Average confidence
      const avgStmt = this.db.prepare('SELECT AVG(confidence_score) as avg FROM sector_classifications')
      const avgResult = avgStmt.get() as { avg: number }

      // Last updated
      const lastStmt = this.db.prepare('SELECT MAX(last_updated) as lastUpdated FROM sector_classifications')
      const lastResult = lastStmt.get() as { lastUpdated: string }

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