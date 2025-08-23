import { Database } from 'better-sqlite3'

export type NotificationType = 
  | 'OPPORTUNITY' 
  | 'ALERT' 
  | 'GOAL_PROGRESS' 
  | 'ESG_CHANGE' 
  | 'PORTFOLIO_UPDATE' 
  | 'SYSTEM' 
  | 'SELL_SIGNAL' 
  | 'WATCHLIST_CHANGE'

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface NotificationData {
  id?: number
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: string // JSON string
  isRead: boolean
  isArchived: boolean
  sourceId?: number
  sourceType?: string
  actionType?: string
  actionUrl?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateNotificationData {
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: any // Will be JSON stringified
  sourceId?: number
  sourceType?: string
  actionType?: string
  actionUrl?: string
  expiresAt?: string
}

export interface NotificationFilters {
  type?: NotificationType
  priority?: NotificationPriority
  isRead?: boolean
  isArchived?: boolean
  sourceType?: string
  dateFrom?: string
  dateTo?: string
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
  recentCount: number // Last 24 hours
}

export class NotificationModel {
  private db: Database

  constructor(database: Database) {
    this.db = database
  }

  /**
   * Create a new notification
   */
  create(data: CreateNotificationData): NotificationData {
    const stmt = this.db.prepare(`
      INSERT INTO notifications (
        type, priority, title, message, data, source_id, source_type, 
        action_type, action_url, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const jsonData = data.data ? JSON.stringify(data.data) : null
    const result = stmt.run(
      data.type,
      data.priority,
      data.title,
      data.message,
      jsonData,
      data.sourceId || null,
      data.sourceType || null,
      data.actionType || null,
      data.actionUrl || null,
      data.expiresAt || null
    )

    return this.findById(result.lastInsertRowid as number)!
  }

  /**
   * Find notification by ID
   */
  findById(id: number): NotificationData | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, type, priority, title, message, data,
        is_read as isRead, is_archived as isArchived,
        source_id as sourceId, source_type as sourceType,
        action_type as actionType, action_url as actionUrl,
        expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt
      FROM notifications 
      WHERE id = ?
    `)
    return stmt.get(id) as NotificationData | null
  }

  /**
   * Get all notifications with optional filters
   */
  findAll(filters: NotificationFilters = {}, limit = 100, offset = 0): NotificationData[] {
    let query = `
      SELECT 
        id, type, priority, title, message, data,
        is_read as isRead, is_archived as isArchived,
        source_id as sourceId, source_type as sourceType,
        action_type as actionType, action_url as actionUrl,
        expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt
      FROM notifications 
      WHERE (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `

    const params: any[] = []

    if (filters.type) {
      query += ` AND type = ?`
      params.push(filters.type)
    }

    if (filters.priority) {
      query += ` AND priority = ?`
      params.push(filters.priority)
    }

    if (filters.isRead !== undefined) {
      query += ` AND is_read = ?`
      params.push(filters.isRead ? 1 : 0)
    }

    if (filters.isArchived !== undefined) {
      query += ` AND is_archived = ?`
      params.push(filters.isArchived ? 1 : 0)
    }

    if (filters.sourceType) {
      query += ` AND source_type = ?`
      params.push(filters.sourceType)
    }

    if (filters.dateFrom) {
      query += ` AND created_at >= ?`
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      query += ` AND created_at <= ?`
      params.push(filters.dateTo)
    }

    query += ` ORDER BY 
      CASE priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
      END ASC,
      created_at DESC
      LIMIT ? OFFSET ?
    `

    params.push(limit, offset)

    const stmt = this.db.prepare(query)
    return stmt.all(...params) as NotificationData[]
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead(ids: number[]): number {
    if (ids.length === 0) return 0

    const placeholders = ids.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id IN (${placeholders})
    `)
    const result = stmt.run(...ids)
    return result.changes
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(filters: NotificationFilters = {}): number {
    let query = `UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE is_read = 0`
    const params: any[] = []

    if (filters.type) {
      query += ` AND type = ?`
      params.push(filters.type)
    }

    if (filters.priority) {
      query += ` AND priority = ?`
      params.push(filters.priority)
    }

    const stmt = this.db.prepare(query)
    const result = stmt.run(...params)
    return result.changes
  }

  /**
   * Archive notification
   */
  archive(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_archived = 1, is_read = 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `)
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Delete notification permanently
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Clean up expired notifications
   */
  cleanupExpired(): number {
    const stmt = this.db.prepare(`
      DELETE FROM notifications 
      WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
    `)
    const result = stmt.run()
    return result.changes
  }

  /**
   * Clean up old archived notifications (older than 30 days)
   */
  cleanupOldArchived(): number {
    const stmt = this.db.prepare(`
      DELETE FROM notifications 
      WHERE is_archived = 1 
      AND created_at < datetime('now', '-30 days')
    `)
    const result = stmt.run()
    return result.changes
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    // Total and unread count
    const countStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
      FROM notifications 
      WHERE is_archived = 0 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `)
    const counts = countStmt.get() as { total: number, unread: number }

    // By type
    const typeStmt = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM notifications 
      WHERE is_archived = 0 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      GROUP BY type
    `)
    const typeResults = typeStmt.all() as Array<{ type: NotificationType, count: number }>
    const byType = {} as Record<NotificationType, number>
    typeResults.forEach(item => {
      byType[item.type] = item.count
    })

    // By priority
    const priorityStmt = this.db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM notifications 
      WHERE is_archived = 0 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      GROUP BY priority
    `)
    const priorityResults = priorityStmt.all() as Array<{ priority: NotificationPriority, count: number }>
    const byPriority = {} as Record<NotificationPriority, number>
    priorityResults.forEach(item => {
      byPriority[item.priority] = item.count
    })

    // Recent count (last 24 hours)
    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE is_archived = 0 
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      AND created_at >= datetime('now', '-24 hours')
    `)
    const recent = recentStmt.get() as { count: number }

    return {
      total: counts.total,
      unread: counts.unread,
      byType,
      byPriority,
      recentCount: recent.count
    }
  }

  /**
   * Search notifications by title or message
   */
  search(query: string, limit = 50): NotificationData[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, type, priority, title, message, data,
        is_read as isRead, is_archived as isArchived,
        source_id as sourceId, source_type as sourceType,
        action_type as actionType, action_url as actionUrl,
        expires_at as expiresAt, created_at as createdAt, updated_at as updatedAt
      FROM notifications 
      WHERE (title LIKE ? OR message LIKE ?)
      AND is_archived = 0
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      ORDER BY created_at DESC
      LIMIT ?
    `)
    
    const searchPattern = `%${query}%`
    return stmt.all(searchPattern, searchPattern, limit) as NotificationData[]
  }

  /**
   * Get unread count for badge
   */
  getUnreadCount(): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE is_read = 0 
      AND is_archived = 0
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `)
    const result = stmt.get() as { count: number }
    return result.count
  }

  /**
   * Create bulk notifications (for batch operations)
   */
  createBulk(notifications: CreateNotificationData[]): number {
    if (notifications.length === 0) return 0

    const stmt = this.db.prepare(`
      INSERT INTO notifications (
        type, priority, title, message, data, source_id, source_type, 
        action_type, action_url, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const transaction = this.db.transaction(() => {
      let count = 0
      for (const data of notifications) {
        const jsonData = data.data ? JSON.stringify(data.data) : null
        stmt.run(
          data.type,
          data.priority,
          data.title,
          data.message,
          jsonData,
          data.sourceId || null,
          data.sourceType || null,
          data.actionType || null,
          data.actionUrl || null,
          data.expiresAt || null
        )
        count++
      }
      return count
    })

    return transaction()
  }
}

export default NotificationModel