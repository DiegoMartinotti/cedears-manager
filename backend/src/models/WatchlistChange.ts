import { Database } from 'better-sqlite3'

export type WatchlistChangeAction = 'ADD' | 'REMOVE' | 'UPDATE'
export type WatchlistChangeStatus = null | 0 | 1 // null = pending, 1 = approved, 0 = rejected

export interface WatchlistChangeData {
  id?: number
  instrumentId: number
  action: WatchlistChangeAction
  reason: string
  claudeConfidence: number
  userApproved?: WatchlistChangeStatus
  changeDate: string
  reviewId?: number
  oldData?: string // JSON string
  newData?: string // JSON string
  metadata?: string // JSON string
}

export interface CreateWatchlistChangeData {
  instrumentId: number
  action: WatchlistChangeAction
  reason: string
  claudeConfidence: number
  reviewId?: number
  oldData?: any // Will be JSON stringified
  newData?: any // Will be JSON stringified
  metadata?: any // Will be JSON stringified
}

export interface WatchlistChangeFilters {
  action?: WatchlistChangeAction
  userApproved?: WatchlistChangeStatus
  reviewId?: number
  instrumentId?: number
  dateFrom?: string
  dateTo?: string
}

export interface WatchlistChangeStats {
  total: number
  pending: number
  approved: number
  rejected: number
  byAction: Record<WatchlistChangeAction, number>
  avgConfidence: number
}

export class WatchlistChangeModel {
  private db: Database

  constructor(database: Database) {
    this.db = database
  }

  private buildFilterClause(filters: WatchlistChangeFilters = {}): { where: string; params: unknown[] } {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (filters.action) {
      conditions.push('action = ?')
      params.push(filters.action)
    }

    if (filters.userApproved !== undefined) {
      if (filters.userApproved === null) {
        conditions.push('user_approved IS NULL')
      } else {
        conditions.push('user_approved = ?')
        params.push(filters.userApproved)
      }
    }

    if (filters.reviewId) {
      conditions.push('review_id = ?')
      params.push(filters.reviewId)
    }

    if (filters.instrumentId) {
      conditions.push('instrument_id = ?')
      params.push(filters.instrumentId)
    }

    if (filters.dateFrom) {
      conditions.push('change_date >= ?')
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      conditions.push('change_date <= ?')
      params.push(filters.dateTo)
    }

    return {
      where: conditions.join(' AND '),
      params
    }
  }

  private mergeUserNotes(metadata: string | null, userNotes?: string): string | null {
    if (!userNotes) {
      return metadata
    }

    let parsed: Record<string, unknown> = {}
    if (metadata) {
      try {
        parsed = JSON.parse(metadata) as Record<string, unknown>
      } catch {
        parsed = {}
      }
    }

    parsed.userNotes = userNotes
    parsed.lastReviewedAt = new Date().toISOString()

    return JSON.stringify(parsed)
  }

  /**
   * Create a new watchlist change
   */
  create(data: CreateWatchlistChangeData): WatchlistChangeData {
    const stmt = this.db.prepare(`
      INSERT INTO watchlist_changes (
        instrument_id, action, reason, claude_confidence, review_id,
        old_data, new_data, metadata, change_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    const oldDataJson = data.oldData ? JSON.stringify(data.oldData) : null
    const newDataJson = data.newData ? JSON.stringify(data.newData) : null
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null

    const result = stmt.run(
      data.instrumentId,
      data.action,
      data.reason,
      data.claudeConfidence,
      data.reviewId || null,
      oldDataJson,
      newDataJson,
      metadataJson
    )

    return this.findById(result.lastInsertRowid as number)!
  }

  /**
   * Find watchlist change by ID
   */
  findById(id: number): WatchlistChangeData | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, instrument_id as instrumentId, action, reason, 
        claude_confidence as claudeConfidence, user_approved as userApproved,
        change_date as changeDate, review_id as reviewId,
        old_data as oldData, new_data as newData, metadata
      FROM watchlist_changes 
      WHERE id = ?
    `)
    return stmt.get(id) as WatchlistChangeData | null
  }

  /**
   * Get all watchlist changes with optional filters
   */
  findAll(filters: WatchlistChangeFilters = {}, limit = 100, offset = 0): WatchlistChangeData[] {
    const { where, params } = this.buildFilterClause(filters)
    const query = `
      SELECT
        id, instrument_id as instrumentId, action, reason,
        claude_confidence as claudeConfidence, user_approved as userApproved,
        change_date as changeDate, review_id as reviewId,
        old_data as oldData, new_data as newData, metadata
      FROM watchlist_changes
      WHERE ${where}
      ORDER BY change_date DESC
      LIMIT ? OFFSET ?
    `

    const stmt = this.db.prepare(query)
    return stmt.all(...params, limit, offset) as WatchlistChangeData[]
  }

  /**
   * Update user approval status
   */
  updateApprovalStatus(id: number, approved: boolean, userNotes?: string): boolean {
    const metadataRow = this.db
      .prepare('SELECT metadata FROM watchlist_changes WHERE id = ?')
      .get(id) as { metadata: string | null } | undefined
    const metadataJson = this.mergeUserNotes(metadataRow?.metadata ?? null, userNotes)

    const stmt = this.db.prepare(`
      UPDATE watchlist_changes
      SET user_approved = ?, metadata = ?
      WHERE id = ?
    `)
    const result = stmt.run(approved ? 1 : 0, metadataJson, id)
    return result.changes > 0
  }

  /**
   * Get pending changes for review
   */
  getPendingChanges(reviewId?: number, limit = 50): WatchlistChangeData[] {
    let query = `
      SELECT 
        wc.*, i.ticker, i.name,
        wc.id, wc.instrument_id as instrumentId, wc.action, wc.reason, 
        wc.claude_confidence as claudeConfidence, wc.user_approved as userApproved,
        wc.change_date as changeDate, wc.review_id as reviewId,
        wc.old_data as oldData, wc.new_data as newData, wc.metadata
      FROM watchlist_changes wc
      LEFT JOIN instruments i ON wc.instrument_id = i.id
      WHERE wc.user_approved IS NULL
    `

    const params: any[] = []

    if (reviewId) {
      query += ` AND wc.review_id = ?`
      params.push(reviewId)
    }

    query += ` ORDER BY wc.claude_confidence DESC, wc.change_date DESC LIMIT ?`
    params.push(limit)

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as (WatchlistChangeData & { ticker?: string, name?: string })[]
  }

  /**
   * Get changes by review ID
   */
  findByReviewId(reviewId: number): WatchlistChangeData[] {
    return this.findAll({ reviewId })
  }

  /**
   * Get changes by instrument ID
   */
  findByInstrumentId(instrumentId: number): WatchlistChangeData[] {
    return this.findAll({ instrumentId })
  }

  /**
   * Get statistics
   */
  getStats(reviewId?: number): WatchlistChangeStats {
    let baseQuery = `FROM watchlist_changes WHERE 1=1`
    const params: any[] = []

    if (reviewId) {
      baseQuery += ` AND review_id = ?`
      params.push(reviewId)
    }

    // Total counts
    const countStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN user_approved IS NULL THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN user_approved = 1 THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN user_approved = 0 THEN 1 ELSE 0 END) as rejected
      ${baseQuery}
    `)
    const counts = countStmt.get(...params) as { total: number, pending: number, approved: number, rejected: number }

    // By action
    const actionStmt = this.db.prepare(`
      SELECT action, COUNT(*) as count
      ${baseQuery}
      GROUP BY action
    `)
    const actionResults = actionStmt.all(...params) as Array<{ action: WatchlistChangeAction, count: number }>
    const byAction = {} as Record<WatchlistChangeAction, number>
    actionResults.forEach(item => {
      byAction[item.action] = item.count
    })

    // Average confidence
    const avgStmt = this.db.prepare(`
      SELECT AVG(claude_confidence) as avg
      ${baseQuery}
    `)
    const avgResult = avgStmt.get(...params) as { avg: number }

    return {
      total: counts.total,
      pending: counts.pending,
      approved: counts.approved,
      rejected: counts.rejected,
      byAction,
      avgConfidence: avgResult.avg || 0
    }
  }

  /**
   * Bulk approve/reject changes
   */
  bulkUpdateApproval(ids: number[], approved: boolean): number {
    if (ids.length === 0) return 0

    const placeholders = ids.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      UPDATE watchlist_changes 
      SET user_approved = ?
      WHERE id IN (${placeholders})
    `)
    const result = stmt.run(approved ? 1 : 0, ...ids)
    return result.changes
  }

  /**
   * Delete watchlist change
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM watchlist_changes WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Get changes with instrument details
   */
  getChangesWithInstruments(filters: WatchlistChangeFilters = {}, limit = 100): any[] {
    let query = `
      SELECT 
        wc.id, wc.action, wc.reason, wc.claude_confidence as claudeConfidence,
        wc.user_approved as userApproved, wc.change_date as changeDate,
        wc.review_id as reviewId, wc.old_data as oldData, wc.new_data as newData,
        wc.metadata,
        i.ticker, i.name, i.sector, i.is_esg as isESG, i.is_vegan as isVegan
      FROM watchlist_changes wc
      LEFT JOIN instruments i ON wc.instrument_id = i.id
      WHERE 1=1
    `

    const params: any[] = []

    if (filters.action) {
      query += ` AND wc.action = ?`
      params.push(filters.action)
    }

    if (filters.userApproved !== undefined) {
      if (filters.userApproved === null) {
        query += ` AND wc.user_approved IS NULL`
      } else {
        query += ` AND wc.user_approved = ?`
        params.push(filters.userApproved)
      }
    }

    if (filters.reviewId) {
      query += ` AND wc.review_id = ?`
      params.push(filters.reviewId)
    }

    query += ` ORDER BY wc.change_date DESC LIMIT ?`
    params.push(limit)

    const stmt = this.db.prepare(query)
    return stmt.all(...params)
  }

  /**
   * Create bulk changes (for batch operations)
   */
  createBulk(changes: CreateWatchlistChangeData[]): number {
    if (changes.length === 0) return 0

    const stmt = this.db.prepare(`
      INSERT INTO watchlist_changes (
        instrument_id, action, reason, claude_confidence, review_id,
        old_data, new_data, metadata, change_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    const transaction = this.db.transaction(() => {
      let count = 0
      for (const data of changes) {
        const oldDataJson = data.oldData ? JSON.stringify(data.oldData) : null
        const newDataJson = data.newData ? JSON.stringify(data.newData) : null
        const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null

        stmt.run(
          data.instrumentId,
          data.action,
          data.reason,
          data.claudeConfidence,
          data.reviewId || null,
          oldDataJson,
          newDataJson,
          metadataJson
        )
        count++
      }
      return count
    })

    return transaction()
  }
}

export default WatchlistChangeModel