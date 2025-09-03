import DatabaseConnection from '../database/connection.js'
import { WatchlistChangeModel, WatchlistChangeData, CreateWatchlistChangeData } from '../models/WatchlistChange.js'
import { MonthlyReviewModel, RemovalCandidateData } from '../models/MonthlyReview.js'
import { instrumentModel } from '../models/Instrument.js'
import { NotificationService } from './NotificationService.js'
import { NotificationPriority } from '../models/Notification.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('WatchlistManagementService')

export interface ApplyChangesResult {
  applied: number
  failed: number
  errors: Array<{ candidateId: number, error: string }>
  summary: {
    added: string[]
    removed: string[]
    updated: string[]
  }
}

export interface WatchlistStats {
  totalInstruments: number
  esgCompliant: number
  veganFriendly: number
  bySection: Record<string, number>
  utilizationPercentage: number
  availableSlots: number
}

export class WatchlistManagementService {
  private db = DatabaseConnection.getInstance()
  private watchlistChangeModel: WatchlistChangeModel
  private monthlyReviewModel: MonthlyReviewModel
  private readonly instrumentModel = instrumentModel
  private notificationService: NotificationService
  private readonly MAX_INSTRUMENTS = 100

  constructor() {
    this.watchlistChangeModel = new WatchlistChangeModel(this.db)
    this.monthlyReviewModel = new MonthlyReviewModel(this.db)
    this.notificationService = new NotificationService(this.db)
  }

  /**
   * Apply approved changes from a monthly review
   */
    // eslint-disable-next-line max-lines-per-function, complexity
    async applyApprovedChanges(reviewId: number, dryRun = false): Promise<ApplyChangesResult> {
    logger.info(`${dryRun ? 'Simulating' : 'Applying'} approved changes for review ${reviewId}`)

    const result: ApplyChangesResult = {
      applied: 0,
      failed: 0,
      errors: [],
      summary: {
        added: [],
        removed: [],
        updated: []
      }
    }

    // Get approved addition candidates
    const additionCandidates = this.monthlyReviewModel.getInstrumentCandidates(reviewId)
      .filter(c => c.status === 'APPROVED')

    // Get approved removal candidates (including instrument ticker when available)
    const removalCandidates = this.monthlyReviewModel
      .getRemovalCandidates(reviewId)
      .filter(c => c.status === 'APPROVED') as Array<RemovalCandidateData & { ticker?: string }>

    // Check if we have enough space for additions
    const currentCount = this.getCurrentInstrumentCount()
    const slotsNeeded = additionCandidates.length - removalCandidates.length
    const availableSlots = this.MAX_INSTRUMENTS - currentCount

    if (slotsNeeded > availableSlots) {
      throw new Error(`Not enough slots: need ${slotsNeeded}, available ${availableSlots}`)
    }

    // Apply removals first
    for (const candidate of removalCandidates) {
      try {
        if (!dryRun) {
          await this.removeInstrument(candidate.instrumentId, candidate.reason, reviewId)
        }
        result.applied++
        result.summary.removed.push(candidate.ticker || `ID:${candidate.instrumentId}`)
      } catch (error) {
        result.failed++
        result.errors.push({
          candidateId: candidate.id!,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Apply additions
    for (const candidate of additionCandidates) {
      try {
        if (!dryRun) {
          await this.addInstrument(candidate, reviewId)
        }
        result.applied++
        result.summary.added.push(candidate.symbol)
      } catch (error) {
        result.failed++
        result.errors.push({
          candidateId: candidate.id!,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Update candidate statuses
    if (!dryRun) {
      for (const candidate of [...additionCandidates, ...removalCandidates]) {
        const table = additionCandidates.includes(candidate as any) ? 'instrument_candidates' : 'removal_candidates'
        const newStatus = result.errors.some(e => e.candidateId === candidate.id) ? 'REJECTED' : 'ADDED'

        const stmt = this.db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`)
        stmt.run(newStatus, candidate.id)
      }
    }

    const finalResult = result

    if (!dryRun && finalResult.applied > 0) {
      // Send notification about applied changes
      await this.notificationService.createNotification({
        type: 'PORTFOLIO_UPDATE',
        priority: 'HIGH',
        title: 'Cambios Aplicados a la Watchlist',
        message: `Se aplicaron ${finalResult.applied} cambios: ${finalResult.summary.added.length} agregados, ${finalResult.summary.removed.length} removidos`,
        data: { reviewId, result: finalResult }
      })

      // Update review completion
      this.monthlyReviewModel.update(reviewId, {
        userReviewCompletedAt: new Date().toISOString()
      })
    }

    return finalResult
  }

  /**
   * Add a new instrument to the watchlist
   */
  private async addInstrument(candidate: any, reviewId: number): Promise<void> {
    // Create instrument record
    const instrumentData = {
      ticker: candidate.symbol,
      name: candidate.name || '',
      sector: candidate.sector || '',
      industry: candidate.sector || '',
      marketCap: candidate.marketCap || 0,
      isESGCompliant: (candidate.esgScore || 0) >= 70,
      isVeganFriendly: (candidate.veganScore || 0) >= 80,
      underlyingSymbol: candidate.symbol,
      underlyingCurrency: 'USD',
      ratio: 1.0,
      isActive: true
    }

    const instrument = this.instrumentModel.create(instrumentData)

    // Create watchlist change record
    const changeData: CreateWatchlistChangeData = {
      instrumentId: instrument.id!,
      action: 'ADD',
      reason: `Monthly review addition: ${candidate.recommendation}`,
      claudeConfidence: candidate.confidenceScore,
      reviewId,
      newData: instrumentData
    }

    this.watchlistChangeModel.create(changeData)

    logger.info(`Added instrument ${candidate.symbol} to watchlist`)
  }

  /**
   * Remove an instrument from the watchlist
   */
  private async removeInstrument(instrumentId: number, reason: string, reviewId: number): Promise<void> {
    // Get instrument data before removal
    const instrument = this.instrumentModel.findById(instrumentId)
    if (!instrument) {
      throw new Error(`Instrument with ID ${instrumentId} not found`)
    }

    // Mark as inactive instead of hard delete to preserve history
    this.instrumentModel.update(instrumentId, { isActive: false })

    // Create watchlist change record
    const changeData: CreateWatchlistChangeData = {
      instrumentId,
      action: 'REMOVE',
      reason,
      claudeConfidence: 95, // High confidence for removals based on criteria loss
      reviewId,
      oldData: instrument
    }

    this.watchlistChangeModel.create(changeData)

    logger.info(`Removed instrument ${instrument.ticker} from watchlist`)
  }

  /**
   * Approve a specific candidate change
   */
  async approveCandidate(candidateId: number, candidateType: 'addition' | 'removal', userNotes?: string): Promise<void> {
    logger.info(`Approving ${candidateType} candidate ${candidateId}`)

    const table = candidateType === 'addition' ? 'instrument_candidates' : 'removal_candidates'
    
    const stmt = this.db.prepare(`
      UPDATE ${table} 
      SET status = 'APPROVED', user_decision_date = CURRENT_TIMESTAMP, user_notes = ?
      WHERE id = ?
    `)
    
    stmt.run(userNotes || null, candidateId)

    // Send notification
    await this.notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'MEDIUM',
      title: 'Candidato Aprobado',
      message: `Se aprobó un candidato ${candidateType === 'addition' ? 'para agregar' : 'para remover'}`,
      data: { candidateId, candidateType }
    })
  }

  /**
   * Reject a specific candidate change
   */
  async rejectCandidate(candidateId: number, candidateType: 'addition' | 'removal', userNotes?: string): Promise<void> {
    logger.info(`Rejecting ${candidateType} candidate ${candidateId}`)

    const table = candidateType === 'addition' ? 'instrument_candidates' : 'removal_candidates'
    
    const stmt = this.db.prepare(`
      UPDATE ${table} 
      SET status = 'REJECTED', user_decision_date = CURRENT_TIMESTAMP, user_notes = ?
      WHERE id = ?
    `)
    
    stmt.run(userNotes || null, candidateId)
  }

  /**
   * Bulk approve/reject candidates
   */
  async bulkUpdateCandidates(
    candidateIds: number[], 
    candidateType: 'addition' | 'removal',
    action: 'approve' | 'reject',
    userNotes?: string
  ): Promise<number> {
    if (candidateIds.length === 0) return 0

    logger.info(`Bulk ${action}ing ${candidateIds.length} ${candidateType} candidates`)

    const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const table = candidateType === 'addition' ? 'instrument_candidates' : 'removal_candidates'
    
    const placeholders = candidateIds.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      UPDATE ${table} 
      SET status = ?, user_decision_date = CURRENT_TIMESTAMP, user_notes = ?
      WHERE id IN (${placeholders})
    `)
    
    const result = stmt.run(status, userNotes || null, ...candidateIds)
    return result.changes
  }

  /**
   * Get current watchlist statistics
   */
  getWatchlistStats(): WatchlistStats {
    // Get active instruments count
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as total 
      FROM instruments 
      WHERE is_active = 1
    `)
    const total = (totalStmt.get() as { total: number }).total

    // Get ESG and Vegan counts
    const criteriaStmt = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN is_esg_compliant = 1 THEN 1 ELSE 0 END) as esg,
        SUM(CASE WHEN is_vegan_friendly = 1 THEN 1 ELSE 0 END) as vegan
      FROM instruments 
      WHERE is_active = 1
    `)
    const criteria = criteriaStmt.get() as { esg: number, vegan: number }

    // Get by sector
    const sectorStmt = this.db.prepare(`
      SELECT sector, COUNT(*) as count
      FROM instruments 
      WHERE is_active = 1 AND sector IS NOT NULL
      GROUP BY sector
    `)
    const sectorResults = sectorStmt.all() as Array<{ sector: string, count: number }>
    
    const bySection: Record<string, number> = {}
    sectorResults.forEach(row => {
      bySection[row.sector] = row.count
    })

    return {
      totalInstruments: total,
      esgCompliant: criteria.esg,
      veganFriendly: criteria.vegan,
      bySection,
      utilizationPercentage: (total / this.MAX_INSTRUMENTS) * 100,
      availableSlots: this.MAX_INSTRUMENTS - total
    }
  }

  /**
   * Get current instrument count
   */
  private getCurrentInstrumentCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM instruments WHERE is_active = 1')
    return (stmt.get() as { count: number }).count
  }

  /**
   * Get pending changes for user review
   */
  getPendingChanges(reviewId?: number) {
    if (reviewId) {
      return {
        additions: this.monthlyReviewModel.getInstrumentCandidates(reviewId).filter(c => c.status === 'PENDING'),
        removals: this.monthlyReviewModel.getRemovalCandidates(reviewId).filter(c => c.status === 'PENDING')
      }
    }

    // Get all pending changes across all reviews
    const additionsStmt = this.db.prepare(`
      SELECT ic.*, mr.review_date
      FROM instrument_candidates ic
      JOIN monthly_reviews mr ON ic.review_id = mr.id
      WHERE ic.status = 'PENDING'
      ORDER BY ic.confidence_score DESC, ic.discovered_date DESC
    `)

    const removalsStmt = this.db.prepare(`
      SELECT rc.*, i.ticker, i.name, mr.review_date
      FROM removal_candidates rc
      JOIN instruments i ON rc.instrument_id = i.id
      JOIN monthly_reviews mr ON rc.review_id = mr.id
      WHERE rc.status = 'PENDING'
      ORDER BY rc.severity ASC, rc.confidence_score DESC, rc.discovered_date DESC
    `)

    return {
      additions: additionsStmt.all(),
      removals: removalsStmt.all()
    }
  }

  /**
   * Get watchlist change history
   */
  getChangeHistory(limit = 100, instrumentId?: number) {
    const filters: any = {}
    if (instrumentId) filters.instrumentId = instrumentId

    return this.watchlistChangeModel.getChangesWithInstruments(filters, limit)
  }

  /**
   * Preview impact of potential changes
   */
  previewChanges(reviewId: number) {
    const candidates = {
      additions: this.monthlyReviewModel.getInstrumentCandidates(reviewId).filter(c => c.status === 'PENDING'),
      removals: this.monthlyReviewModel.getRemovalCandidates(reviewId).filter(c => c.status === 'PENDING')
    }

    const currentStats = this.getWatchlistStats()
    
    // Calculate projected stats
    const additionCount = candidates.additions.length
    const removalCount = candidates.removals.length
    const netChange = additionCount - removalCount

    const projectedTotal = currentStats.totalInstruments + netChange
    const projectedESG = currentStats.esgCompliant + 
      candidates.additions.filter(c => (c.esgScore || 0) >= 70).length -
      candidates.removals.filter(c => (c.currentEsgScore || 0) >= 70).length

    const projectedVegan = currentStats.veganFriendly + 
      candidates.additions.filter(c => (c.veganScore || 0) >= 80).length -
      candidates.removals.filter(c => (c.currentVeganScore || 0) >= 80).length

    return {
      current: currentStats,
      candidates,
      projected: {
        totalInstruments: projectedTotal,
        esgCompliant: Math.max(0, projectedESG),
        veganFriendly: Math.max(0, projectedVegan),
        utilizationPercentage: (projectedTotal / this.MAX_INSTRUMENTS) * 100,
        availableSlots: this.MAX_INSTRUMENTS - projectedTotal
      },
      impact: {
        instrumentChange: netChange,
        esgChange: projectedESG - currentStats.esgCompliant,
        veganChange: projectedVegan - currentStats.veganFriendly,
        willExceedLimit: projectedTotal > this.MAX_INSTRUMENTS
      }
    }
  }

  /**
   * Create manual watchlist change (outside of monthly review)
   */
  async createManualChange(instrumentId: number, action: 'ADD' | 'REMOVE' | 'UPDATE', reason: string): Promise<WatchlistChangeData> {
    const changeData: CreateWatchlistChangeData = {
      instrumentId,
      action,
      reason: `Manual change: ${reason}`,
      claudeConfidence: 100, // Manual changes have full confidence
      reviewId: undefined // Not part of a monthly review
    }

    const change = this.watchlistChangeModel.create(changeData)

    // Auto-apply manual changes (they bypass the approval process)
    if (action === 'REMOVE') {
      await this.removeInstrument(instrumentId, reason, 0) // No review ID for manual changes
    }

    await this.notificationService.createNotification({
      type: 'WATCHLIST_CHANGE',
      priority: 'MEDIUM',
      title: 'Cambio Manual en Watchlist',
      message: `Se realizó un cambio manual: ${action} - ${reason}`,
      data: { changeId: change.id, action, instrumentId }
    })

    return change
  }

  /**
   * Get watchlist management statistics
   */
  getManagementStats() {
    return this.watchlistChangeModel.getStats()
  }

  /**
   * Validate if a new instrument can be added
   */
  canAddInstrument(): { canAdd: boolean, reason?: string } {
    const currentCount = this.getCurrentInstrumentCount()
    
    if (currentCount >= this.MAX_INSTRUMENTS) {
      return {
        canAdd: false,
        reason: `Watchlist is at maximum capacity (${this.MAX_INSTRUMENTS} instruments)`
      }
    }

    return { canAdd: true }
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions() {
    const stats = this.getWatchlistStats()
    const suggestions: Array<{ type: string, message: string, priority: NotificationPriority }> = []

    // Utilization suggestions
    if (stats.utilizationPercentage < 80) {
      suggestions.push({
        type: 'underutilized',
        message: `La watchlist está al ${stats.utilizationPercentage.toFixed(1)}% de capacidad. Considera agregar más instrumentos.`,
        priority: 'MEDIUM'
      })
    }

    // Diversification suggestions
    const sectorCount = Object.keys(stats.bySection).length
    if (sectorCount < 5) {
      suggestions.push({
        type: 'diversification',
        message: `Solo hay ${sectorCount} sectores representados. Considera diversificar más.`,
        priority: 'HIGH'
      })
    }

    // ESG/Vegan compliance
    const esgPercentage = (stats.esgCompliant / stats.totalInstruments) * 100
    const veganPercentage = (stats.veganFriendly / stats.totalInstruments) * 100

    if (esgPercentage < 80) {
      suggestions.push({
        type: 'esg_compliance',
        message: `Solo el ${esgPercentage.toFixed(1)}% de los instrumentos cumplen criterios ESG.`,
        priority: 'MEDIUM'
      })
    }

    if (veganPercentage < 70) {
      suggestions.push({
        type: 'vegan_compliance',
        message: `Solo el ${veganPercentage.toFixed(1)}% de los instrumentos son vegan-friendly.`,
        priority: 'MEDIUM'
      })
    }

    return suggestions
  }
}

export default WatchlistManagementService