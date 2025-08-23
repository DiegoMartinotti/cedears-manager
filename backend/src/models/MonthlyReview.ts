import { Database } from 'better-sqlite3'

export type MonthlyReviewStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface MonthlyReviewData {
  id?: number
  reviewDate: string
  status: MonthlyReviewStatus
  totalInstrumentsScanned: number
  newInstrumentsFound: number
  removedInstruments: number
  updatedInstruments: number
  pendingApprovals: number
  autoApproved: number
  userRejected: number
  scanStartedAt?: string
  scanCompletedAt?: string
  userReviewStartedAt?: string
  userReviewCompletedAt?: string
  summary?: string // JSON string
  errors?: string // JSON string
  claudeReport?: string // JSON string
  createdAt: string
  updatedAt: string
}

export interface CreateMonthlyReviewData {
  reviewDate: string
  status?: MonthlyReviewStatus
}

export interface UpdateMonthlyReviewData {
  status?: MonthlyReviewStatus
  totalInstrumentsScanned?: number
  newInstrumentsFound?: number
  removedInstruments?: number
  updatedInstruments?: number
  pendingApprovals?: number
  autoApproved?: number
  userRejected?: number
  scanStartedAt?: string
  scanCompletedAt?: string
  userReviewStartedAt?: string
  userReviewCompletedAt?: string
  summary?: any // Will be JSON stringified
  errors?: any // Will be JSON stringified
  claudeReport?: any // Will be JSON stringified
}

export interface MonthlyReviewStats {
  totalReviews: number
  completedReviews: number
  pendingReviews: number
  failedReviews: number
  avgInstrumentsScanned: number
  avgNewInstruments: number
  avgProcessingTime: number // in minutes
  lastReviewDate?: string
}

export interface InstrumentCandidateData {
  id?: number
  symbol: string
  name?: string
  market?: string
  sector?: string
  marketCap?: number
  avgVolume?: number
  esgScore?: number
  veganScore?: number
  claudeAnalysis?: string // JSON string
  recommendation: 'STRONG_ADD' | 'ADD' | 'CONSIDER' | 'REJECT'
  confidenceScore: number
  reasons?: string // JSON string
  discoveredDate: string
  reviewId?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ADDED'
  userDecisionDate?: string
  userNotes?: string
}

export interface RemovalCandidateData {
  id?: number
  instrumentId: number
  reason: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  lostCriteria?: string // JSON string
  currentEsgScore?: number
  currentVeganScore?: number
  previousEsgScore?: number
  previousVeganScore?: number
  claudeAnalysis?: string // JSON string
  recommendation: 'REMOVE_IMMEDIATELY' | 'REMOVE' | 'MONITOR' | 'KEEP'
  confidenceScore: number
  discoveredDate: string
  reviewId?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED'
  userDecisionDate?: string
  userNotes?: string
}

export class MonthlyReviewModel {
  private db: Database

  constructor(database: Database) {
    this.db = database
  }

  /**
   * Create a new monthly review
   */
  create(data: CreateMonthlyReviewData): MonthlyReviewData {
    const stmt = this.db.prepare(`
      INSERT INTO monthly_reviews (
        review_date, status, created_at, updated_at
      ) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)

    const result = stmt.run(
      data.reviewDate,
      data.status || 'PENDING'
    )

    return this.findById(result.lastInsertRowid as number)!
  }

  /**
   * Find monthly review by ID
   */
  findById(id: number): MonthlyReviewData | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, review_date as reviewDate, status,
        total_instruments_scanned as totalInstrumentsScanned,
        new_instruments_found as newInstrumentsFound,
        removed_instruments as removedInstruments,
        updated_instruments as updatedInstruments,
        pending_approvals as pendingApprovals,
        auto_approved as autoApproved,
        user_rejected as userRejected,
        scan_started_at as scanStartedAt,
        scan_completed_at as scanCompletedAt,
        user_review_started_at as userReviewStartedAt,
        user_review_completed_at as userReviewCompletedAt,
        summary, errors, claude_report as claudeReport,
        created_at as createdAt, updated_at as updatedAt
      FROM monthly_reviews 
      WHERE id = ?
    `)
    return stmt.get(id) as MonthlyReviewData | null
  }

  /**
   * Get all monthly reviews
   */
  findAll(limit = 50, offset = 0): MonthlyReviewData[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, review_date as reviewDate, status,
        total_instruments_scanned as totalInstrumentsScanned,
        new_instruments_found as newInstrumentsFound,
        removed_instruments as removedInstruments,
        updated_instruments as updatedInstruments,
        pending_approvals as pendingApprovals,
        auto_approved as autoApproved,
        user_rejected as userRejected,
        scan_started_at as scanStartedAt,
        scan_completed_at as scanCompletedAt,
        user_review_started_at as userReviewStartedAt,
        user_review_completed_at as userReviewCompletedAt,
        summary, errors, claude_report as claudeReport,
        created_at as createdAt, updated_at as updatedAt
      FROM monthly_reviews 
      ORDER BY review_date DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as MonthlyReviewData[]
  }

  /**
   * Update monthly review
   */
  update(id: number, data: UpdateMonthlyReviewData): boolean {
    const fields: string[] = []
    const params: any[] = []

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        // Convert camelCase to snake_case for database columns
        const dbColumn = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        
        // Handle JSON fields
        if (['summary', 'errors', 'claudeReport'].includes(key) && typeof value === 'object') {
          fields.push(`${dbColumn} = ?`)
          params.push(JSON.stringify(value))
        } else {
          fields.push(`${dbColumn} = ?`)
          params.push(value)
        }
      }
    })

    if (fields.length === 0) return false

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    const stmt = this.db.prepare(`
      UPDATE monthly_reviews 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `)
    const result = stmt.run(...params)
    return result.changes > 0
  }

  /**
   * Get current or latest review
   */
  getCurrentReview(): MonthlyReviewData | null {
    // First try to get any in-progress review
    let stmt = this.db.prepare(`
      SELECT 
        id, review_date as reviewDate, status,
        total_instruments_scanned as totalInstrumentsScanned,
        new_instruments_found as newInstrumentsFound,
        removed_instruments as removedInstruments,
        updated_instruments as updatedInstruments,
        pending_approvals as pendingApprovals,
        auto_approved as autoApproved,
        user_rejected as userRejected,
        scan_started_at as scanStartedAt,
        scan_completed_at as scanCompletedAt,
        user_review_started_at as userReviewStartedAt,
        user_review_completed_at as userReviewCompletedAt,
        summary, errors, claude_report as claudeReport,
        created_at as createdAt, updated_at as updatedAt
      FROM monthly_reviews 
      WHERE status IN ('PENDING', 'IN_PROGRESS')
      ORDER BY created_at DESC
      LIMIT 1
    `)
    
    let review = stmt.get() as MonthlyReviewData | null
    
    // If no in-progress review, get the latest completed one
    if (!review) {
      stmt = this.db.prepare(`
        SELECT 
          id, review_date as reviewDate, status,
          total_instruments_scanned as totalInstrumentsScanned,
          new_instruments_found as newInstrumentsFound,
          removed_instruments as removedInstruments,
          updated_instruments as updatedInstruments,
          pending_approvals as pendingApprovals,
          auto_approved as autoApproved,
          user_rejected as userRejected,
          scan_started_at as scanStartedAt,
          scan_completed_at as scanCompletedAt,
          user_review_started_at as userReviewStartedAt,
          user_review_completed_at as userReviewCompletedAt,
          summary, errors, claude_report as claudeReport,
          created_at as createdAt, updated_at as updatedAt
        FROM monthly_reviews 
        ORDER BY review_date DESC
        LIMIT 1
      `)
      review = stmt.get() as MonthlyReviewData | null
    }
    
    return review
  }

  /**
   * Get review by date
   */
  findByDate(date: string): MonthlyReviewData | null {
    const stmt = this.db.prepare(`
      SELECT 
        id, review_date as reviewDate, status,
        total_instruments_scanned as totalInstrumentsScanned,
        new_instruments_found as newInstrumentsFound,
        removed_instruments as removedInstruments,
        updated_instruments as updatedInstruments,
        pending_approvals as pendingApprovals,
        auto_approved as autoApproved,
        user_rejected as userRejected,
        scan_started_at as scanStartedAt,
        scan_completed_at as scanCompletedAt,
        user_review_started_at as userReviewStartedAt,
        user_review_completed_at as userReviewCompletedAt,
        summary, errors, claude_report as claudeReport,
        created_at as createdAt, updated_at as updatedAt
      FROM monthly_reviews 
      WHERE DATE(review_date) = DATE(?)
    `)
    return stmt.get(date) as MonthlyReviewData | null
  }

  /**
   * Get statistics
   */
  getStats(): MonthlyReviewStats {
    // Basic counts
    const countStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('PENDING', 'IN_PROGRESS') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM monthly_reviews
    `)
    const counts = countStmt.get() as { total: number, completed: number, pending: number, failed: number }

    // Averages
    const avgStmt = this.db.prepare(`
      SELECT 
        AVG(total_instruments_scanned) as avgScanned,
        AVG(new_instruments_found) as avgNew
      FROM monthly_reviews 
      WHERE status = 'COMPLETED'
    `)
    const averages = avgStmt.get() as { avgScanned: number, avgNew: number }

    // Processing time average (in minutes)
    const timeStmt = this.db.prepare(`
      SELECT 
        AVG(JULIANDAY(scan_completed_at) - JULIANDAY(scan_started_at)) * 24 * 60 as avgProcessingTime
      FROM monthly_reviews 
      WHERE scan_started_at IS NOT NULL AND scan_completed_at IS NOT NULL
    `)
    const timeResult = timeStmt.get() as { avgProcessingTime: number }

    // Last review date
    const lastStmt = this.db.prepare(`
      SELECT review_date
      FROM monthly_reviews 
      ORDER BY review_date DESC 
      LIMIT 1
    `)
    const lastResult = lastStmt.get() as { review_date: string } | null

    return {
      totalReviews: counts.total,
      completedReviews: counts.completed,
      pendingReviews: counts.pending,
      failedReviews: counts.failed,
      avgInstrumentsScanned: averages.avgScanned || 0,
      avgNewInstruments: averages.avgNew || 0,
      avgProcessingTime: timeResult.avgProcessingTime || 0,
      lastReviewDate: lastResult?.review_date
    }
  }

  /**
   * Delete monthly review and associated data
   */
  delete(id: number): boolean {
    const transaction = this.db.transaction(() => {
      // Delete associated records first
      this.db.prepare('DELETE FROM watchlist_changes WHERE review_id = ?').run(id)
      this.db.prepare('DELETE FROM instrument_candidates WHERE review_id = ?').run(id)
      this.db.prepare('DELETE FROM removal_candidates WHERE review_id = ?').run(id)
      
      // Delete the review
      const result = this.db.prepare('DELETE FROM monthly_reviews WHERE id = ?').run(id)
      return result.changes > 0
    })

    return transaction()
  }

  // Methods for related tables

  /**
   * Create instrument candidate
   */
  createInstrumentCandidate(data: Omit<InstrumentCandidateData, 'id' | 'discoveredDate'>): InstrumentCandidateData {
    const stmt = this.db.prepare(`
      INSERT INTO instrument_candidates (
        symbol, name, market, sector, market_cap, avg_volume,
        esg_score, vegan_score, claude_analysis, recommendation,
        confidence_score, reasons, review_id, status, user_notes,
        discovered_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    const claudeAnalysisJson = data.claudeAnalysis ? data.claudeAnalysis : null
    const reasonsJson = data.reasons ? data.reasons : null

    const result = stmt.run(
      data.symbol,
      data.name || null,
      data.market || null,
      data.sector || null,
      data.marketCap || null,
      data.avgVolume || null,
      data.esgScore || null,
      data.veganScore || null,
      claudeAnalysisJson,
      data.recommendation,
      data.confidenceScore,
      reasonsJson,
      data.reviewId || null,
      data.status,
      data.userNotes || null
    )

    const candidate = this.db.prepare(`
      SELECT 
        id, symbol, name, market, sector, 
        market_cap as marketCap, avg_volume as avgVolume,
        esg_score as esgScore, vegan_score as veganScore,
        claude_analysis as claudeAnalysis, recommendation,
        confidence_score as confidenceScore, reasons,
        discovered_date as discoveredDate, review_id as reviewId,
        status, user_decision_date as userDecisionDate, user_notes as userNotes
      FROM instrument_candidates WHERE id = ?
    `).get(result.lastInsertRowid) as InstrumentCandidateData

    return candidate
  }

  /**
   * Get instrument candidates for review
   */
  getInstrumentCandidates(reviewId: number): InstrumentCandidateData[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, symbol, name, market, sector, 
        market_cap as marketCap, avg_volume as avgVolume,
        esg_score as esgScore, vegan_score as veganScore,
        claude_analysis as claudeAnalysis, recommendation,
        confidence_score as confidenceScore, reasons,
        discovered_date as discoveredDate, review_id as reviewId,
        status, user_decision_date as userDecisionDate, user_notes as userNotes
      FROM instrument_candidates 
      WHERE review_id = ?
      ORDER BY confidence_score DESC, recommendation ASC
    `)
    return stmt.all(reviewId) as InstrumentCandidateData[]
  }

  /**
   * Create removal candidate
   */
  createRemovalCandidate(data: Omit<RemovalCandidateData, 'id' | 'discoveredDate'>): RemovalCandidateData {
    const stmt = this.db.prepare(`
      INSERT INTO removal_candidates (
        instrument_id, reason, severity, lost_criteria,
        current_esg_score, current_vegan_score,
        previous_esg_score, previous_vegan_score,
        claude_analysis, recommendation, confidence_score,
        review_id, status, user_notes, discovered_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    const lostCriteriaJson = data.lostCriteria ? data.lostCriteria : null
    const claudeAnalysisJson = data.claudeAnalysis ? data.claudeAnalysis : null

    const result = stmt.run(
      data.instrumentId,
      data.reason,
      data.severity,
      lostCriteriaJson,
      data.currentEsgScore || null,
      data.currentVeganScore || null,
      data.previousEsgScore || null,
      data.previousVeganScore || null,
      claudeAnalysisJson,
      data.recommendation,
      data.confidenceScore,
      data.reviewId || null,
      data.status,
      data.userNotes || null
    )

    const candidate = this.db.prepare(`
      SELECT 
        id, instrument_id as instrumentId, reason, severity, lost_criteria as lostCriteria,
        current_esg_score as currentEsgScore, current_vegan_score as currentVeganScore,
        previous_esg_score as previousEsgScore, previous_vegan_score as previousVeganScore,
        claude_analysis as claudeAnalysis, recommendation, confidence_score as confidenceScore,
        discovered_date as discoveredDate, review_id as reviewId,
        status, user_decision_date as userDecisionDate, user_notes as userNotes
      FROM removal_candidates WHERE id = ?
    `).get(result.lastInsertRowid) as RemovalCandidateData

    return candidate
  }

  /**
   * Get removal candidates for review
   */
  getRemovalCandidates(reviewId: number): RemovalCandidateData[] {
    const stmt = this.db.prepare(`
      SELECT 
        rc.id, rc.instrument_id as instrumentId, rc.reason, rc.severity, rc.lost_criteria as lostCriteria,
        rc.current_esg_score as currentEsgScore, rc.current_vegan_score as currentVeganScore,
        rc.previous_esg_score as previousEsgScore, rc.previous_vegan_score as previousVeganScore,
        rc.claude_analysis as claudeAnalysis, rc.recommendation, rc.confidence_score as confidenceScore,
        rc.discovered_date as discoveredDate, rc.review_id as reviewId,
        rc.status, rc.user_decision_date as userDecisionDate, rc.user_notes as userNotes,
        i.ticker, i.name
      FROM removal_candidates rc
      LEFT JOIN instruments i ON rc.instrument_id = i.id
      WHERE rc.review_id = ?
      ORDER BY 
        CASE rc.severity 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
        END,
        rc.confidence_score DESC
    `)
    return stmt.all(reviewId) as (RemovalCandidateData & { ticker?: string, name?: string })[]
  }
}

export default MonthlyReviewModel