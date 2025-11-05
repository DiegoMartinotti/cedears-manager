import DatabaseConnection from '../database/connection.js'
import { MonthlyReviewModel, MonthlyReviewData, CreateMonthlyReviewData, InstrumentCandidateData, RemovalCandidateData } from '../models/MonthlyReview.js'
import { instrumentModel } from '../models/Instrument.js'
import { ESGAnalysisService } from './ESGAnalysisService.js'
import { VeganAnalysisService } from './VeganAnalysisService.js'
import { ClaudeContextualService } from './ClaudeContextualService.js'
import { NotificationService } from './NotificationService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('MonthlyReviewService')

export interface ReviewSettings {
  maxInstrumentsLimit: number
  minConfidenceAutoApprove: number
  esgMinScoreThreshold: number
  veganMinScoreThreshold: number
  marketCapMinThreshold: number
  volumeMinThreshold: number
  enableAutoApproval: boolean
  removeOnCriteriaLoss: boolean
}

export interface ScanResult {
  candidatesForAddition: InstrumentCandidateData[]
  candidatesForRemoval: RemovalCandidateData[]
  totalScanned: number
  summary: {
    strongAdd: number
    considerAdd: number
    removeImmediately: number
    monitor: number
    averageConfidence: number
  }
}

export interface CEDEARMarketData {
  symbol: string
  name: string
  sector: string
  marketCap: number
  avgVolume: number
  isESGCompliant?: boolean
  isVeganFriendly?: boolean
}

type CandidateRecommendation = 'STRONG_ADD' | 'ADD' | 'CONSIDER' | 'REJECT'
type RemovalSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type RemovalRecommendation = 'REMOVE_IMMEDIATELY' | 'REMOVE' | 'MONITOR' | 'KEEP'

export class MonthlyReviewService {
  private db = DatabaseConnection.getInstance()
  private monthlyReviewModel: MonthlyReviewModel
  private instrumentModel: typeof instrumentModel
  private esgAnalysisService: ESGAnalysisService
  private veganAnalysisService: VeganAnalysisService
  private claudeService: ClaudeContextualService
  private notificationService: NotificationService

  constructor() {
    this.monthlyReviewModel = new MonthlyReviewModel(this.db)
    this.instrumentModel = instrumentModel
    this.esgAnalysisService = new ESGAnalysisService()
    this.veganAnalysisService = new VeganAnalysisService()
    this.claudeService = new ClaudeContextualService()
    this.notificationService = new NotificationService(this.db)
  }

  /**
   * Start a new monthly review process
   */
  async startMonthlyReview(): Promise<MonthlyReviewData> {
    const reviewDate = new Date().toISOString().split('T')[0]
    logger.info(`Starting monthly review for ${reviewDate}`)

    const existingReview = this.findExistingReview(reviewDate)
    if (existingReview) return existingReview

    const review = this.createReviewSession(reviewDate)
    await this.notifyReviewStarted(reviewDate, review.id)

    return review
  }

  private findExistingReview(reviewDate: string): MonthlyReviewData | null {
    const existingReview = this.monthlyReviewModel.findByDate(reviewDate)
    if (existingReview && existingReview.status !== 'FAILED') {
      logger.info('Monthly review already exists for this date')
      return existingReview
    }
    return null
  }

  private createReviewSession(reviewDate: string): MonthlyReviewData {
    const reviewData: CreateMonthlyReviewData = {
      reviewDate,
      status: 'PENDING'
    }
    return this.monthlyReviewModel.create(reviewData)
  }

  private async notifyReviewStarted(reviewDate: string, reviewId: number): Promise<void> {
    await this.notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'MEDIUM',
      title: 'Revisión Mensual Iniciada',
      message: `Se ha iniciado la revisión mensual automática de la watchlist para ${reviewDate}`,
      data: { reviewId }
    })
  }

  /**
   * Execute the full review process
   */
  async executeReview(reviewId: number): Promise<ScanResult> {
    logger.info(`Executing review ${reviewId}`)
    this.markReviewInProgress(reviewId)

    try {
      const settings = await this.getReviewSettings()
      const scanResult = await this.scanMarketForOpportunities(reviewId, settings)
      const removalCandidates = await this.analyzeCurrentPortfolioForRemovals(reviewId, settings)

      const finalResult = this.combineScanResults(scanResult, removalCandidates)
      const claudeReport = await this.generateClaudeReport(finalResult)
      const autoApproved = await this.autoApproveChanges(reviewId, settings)

      await this.finalizeReview(reviewId, finalResult, autoApproved, claudeReport)

      logger.info(`Review ${reviewId} completed successfully`)
      return finalResult
    } catch (error) {
      await this.handleReviewFailure(reviewId, error)
      throw error
    }
  }

  private markReviewInProgress(reviewId: number): void {
    this.monthlyReviewModel.update(reviewId, {
      status: 'IN_PROGRESS',
      scanStartedAt: new Date().toISOString()
    })
  }

  private combineScanResults(
    scanResult: { candidatesForAddition: InstrumentCandidateData[]; totalScanned: number },
    removalCandidates: RemovalCandidateData[]
  ): ScanResult {
    return {
      candidatesForAddition: scanResult.candidatesForAddition,
      candidatesForRemoval: removalCandidates,
      totalScanned: scanResult.totalScanned,
      summary: {
        strongAdd: scanResult.candidatesForAddition.filter(c => c.recommendation === 'STRONG_ADD').length,
        considerAdd: scanResult.candidatesForAddition.filter(c => c.recommendation === 'ADD' || c.recommendation === 'CONSIDER').length,
        removeImmediately: removalCandidates.filter(c => c.recommendation === 'REMOVE_IMMEDIATELY').length,
        monitor: removalCandidates.filter(c => c.recommendation === 'MONITOR').length,
        averageConfidence:
          ([...scanResult.candidatesForAddition, ...removalCandidates].reduce((sum, c) => sum + c.confidenceScore, 0) /
            (scanResult.candidatesForAddition.length + removalCandidates.length)) || 0
      }
    }
  }

  private async autoApproveChanges(reviewId: number, settings: ReviewSettings): Promise<number> {
    if (!settings.enableAutoApproval) return 0
    return this.autoApproveHighConfidenceChanges(reviewId, settings.minConfidenceAutoApprove)
  }

  private async finalizeReview(
    reviewId: number,
    finalResult: ScanResult,
    autoApproved: number,
    claudeReport: any
  ): Promise<void> {
    this.monthlyReviewModel.update(reviewId, {
      status: 'COMPLETED',
      scanCompletedAt: new Date().toISOString(),
      totalInstrumentsScanned: finalResult.totalScanned,
      newInstrumentsFound: finalResult.candidatesForAddition.length,
      removedInstruments: finalResult.candidatesForRemoval.length,
      pendingApprovals:
        finalResult.candidatesForAddition.length + finalResult.candidatesForRemoval.length - autoApproved,
      autoApproved,
      summary: finalResult.summary,
      claudeReport
    })

    await this.notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'HIGH',
      title: 'Revisión Mensual Completada',
      message: `Se encontraron ${finalResult.candidatesForAddition.length} candidatos para agregar y ${finalResult.candidatesForRemoval.length} para remover. ${autoApproved} cambios aprobados automáticamente.`,
      data: { reviewId, scanResult: finalResult }
    })
  }

  private async handleReviewFailure(reviewId: number, error: unknown): Promise<void> {
    logger.error(`Review ${reviewId} failed:`, error)

    this.monthlyReviewModel.update(reviewId, {
      status: 'FAILED',
      errors: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }

  /**
   * Scan market for new investment opportunities
   */
  private async scanMarketForOpportunities(reviewId: number, settings: ReviewSettings): Promise<{ candidatesForAddition: InstrumentCandidateData[], totalScanned: number }> {
    logger.info('Scanning market for new opportunities')
    const currentInstruments = await this.instrumentModel.findAll({ isActive: true })
    const currentSymbols = new Set(currentInstruments.map(i => i.symbol))
    const marketData = await this.fetchCEDEARMarketData()
    const candidates: InstrumentCandidateData[] = []

    for (const data of marketData) {
      const candidate = await this.processMarketCandidate(data, currentSymbols, settings, reviewId)
      if (candidate) candidates.push(candidate)
    }

    candidates.sort((a, b) => b.confidenceScore - a.confidenceScore)
    logger.info(`Found ${candidates.length} candidates from ${marketData.length} instruments scanned`)

    return {
      candidatesForAddition: candidates,
      totalScanned: marketData.length
    }
  }

  private async processMarketCandidate(
    data: CEDEARMarketData,
    currentSymbols: Set<string>,
    settings: ReviewSettings,
    reviewId: number
  ): Promise<InstrumentCandidateData | null> {
    if (currentSymbols.has(data.symbol)) return null
    if (data.marketCap < settings.marketCapMinThreshold) return null
    if (data.avgVolume < settings.volumeMinThreshold) return null

    try {
      const esgScore = await this.calculateESGScore(data)
      const veganScore = await this.calculateVeganScore(data)
      const evaluation = await this.evaluateCandidate(data, esgScore, veganScore, settings)

      if (evaluation.recommendation === 'REJECT') return null

      return this.monthlyReviewModel.createInstrumentCandidate({
        symbol: data.symbol,
        name: data.name,
        sector: data.sector,
        marketCap: data.marketCap,
        avgVolume: data.avgVolume,
        esgScore,
        veganScore,
        recommendation: evaluation.recommendation,
        confidenceScore: evaluation.confidence,
        reasons: JSON.stringify(evaluation.reasons),
        claudeAnalysis: JSON.stringify(evaluation.claudeAnalysis),
        reviewId,
        status: 'PENDING'
      })
    } catch (error) {
      logger.warn(`Failed to analyze ${data.symbol}:`, error)
      return null
    }
  }

  /**
   * Analyze current portfolio for instruments that should be removed
   */
  private async analyzeCurrentPortfolioForRemovals(reviewId: number, settings: ReviewSettings): Promise<RemovalCandidateData[]> {
    logger.info('Analyzing current portfolio for removals')

    const currentInstruments = await this.instrumentModel.findAll({ isActive: true })
    const removalCandidates: RemovalCandidateData[] = []

    for (const instrument of currentInstruments) {
      const candidate = await this.processRemovalInstrument(instrument, settings, reviewId)
      if (candidate) removalCandidates.push(candidate)
    }

    logger.info(`Found ${removalCandidates.length} removal candidates`)
    return removalCandidates
  }

  private async processRemovalInstrument(
    instrument: any,
    settings: ReviewSettings,
    reviewId: number
  ): Promise<RemovalCandidateData | null> {
    try {
      const baseData = {
        symbol: instrument.ticker,
        name: instrument.name || '',
        sector: instrument.sector || '',
        marketCap: instrument.marketCap || 0,
        avgVolume: 0
      }

      const currentESGScore = await this.calculateESGScore(baseData)
      const currentVeganScore = await this.calculateVeganScore(baseData)

      const removal = await this.shouldRemoveInstrument(
        instrument,
        currentESGScore,
        currentVeganScore,
        settings
      )

      if (!removal.remove) return null

      return this.monthlyReviewModel.createRemovalCandidate({
        instrumentId: instrument.id!,
        reason: removal.reason,
        severity: removal.severity,
        currentEsgScore: currentESGScore,
        currentVeganScore: currentVeganScore,
        previousEsgScore: instrument.esgScore,
        previousVeganScore: instrument.veganScore,
        recommendation: removal.recommendation,
        confidenceScore: removal.confidence,
        claudeAnalysis: JSON.stringify(removal.claudeAnalysis),
        lostCriteria: JSON.stringify(removal.lostCriteria),
        reviewId,
        status: 'PENDING'
      })
    } catch (error) {
      logger.warn(`Failed to analyze ${instrument.ticker} for removal:`, error)
      return null
    }
  }

  /**
   * Generate comprehensive report using Claude
   */
  private async generateClaudeReport(scanResult: ScanResult): Promise<any> {
    const prompt = `
    Analiza los resultados de la revisión mensual de la watchlist de CEDEARs:

    CANDIDATOS PARA AGREGAR: ${scanResult.candidatesForAddition.length}
    - Strong Add: ${scanResult.summary.strongAdd}
    - Consider Add: ${scanResult.summary.considerAdd}

    CANDIDATOS PARA REMOVER: ${scanResult.candidatesForRemoval.length}
    - Remove Immediately: ${scanResult.summary.removeImmediately}
    - Monitor: ${scanResult.summary.monitor}

    TOTAL ESCANEADO: ${scanResult.totalScanned}
    CONFIANZA PROMEDIO: ${scanResult.summary.averageConfidence.toFixed(1)}%

    Proporciona:
    1. Resumen ejecutivo de los cambios recomendados
    2. Análisis de calidad de los candidatos
    3. Impacto esperado en la diversificación
    4. Recomendaciones estratégicas
    5. Alertas o consideraciones especiales

    Contexto: Cartera ESG/vegana, máximo 100 instrumentos, enfoque en rentabilidad ajustada por inflación.
    `

    try {
      // TODO: Implement generateReport method in ClaudeContextualService
      // const analysis = await this.claudeService.generateReport('watchlist_review', prompt)
      return {
        summary: 'Reporte automático pendiente de implementación',
        prompt: prompt
      }
    } catch (error) {
      logger.warn('Failed to generate Claude report:', error)
      return {
        summary: 'Reporte automático no disponible',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get review settings from database
   */
  private async getReviewSettings(): Promise<ReviewSettings> {
    const getSettingValue = (key: string, defaultValue: any) => {
      const stmt = this.db.prepare('SELECT setting_value, data_type FROM review_settings WHERE setting_key = ?')
      const result = stmt.get(key) as { setting_value: string, data_type: string } | null
      
      if (!result) return defaultValue
      
      switch (result.data_type) {
        case 'number': return Number(result.setting_value)
        case 'boolean': return result.setting_value === 'true'
        case 'json': return JSON.parse(result.setting_value)
        default: return result.setting_value
      }
    }

    return {
      maxInstrumentsLimit: getSettingValue('max_instruments_limit', 100),
      minConfidenceAutoApprove: getSettingValue('min_confidence_auto_approve', 90.0),
      esgMinScoreThreshold: getSettingValue('esg_min_score_threshold', 70.0),
      veganMinScoreThreshold: getSettingValue('vegan_min_score_threshold', 80.0),
      marketCapMinThreshold: getSettingValue('market_cap_min_threshold', 1000000000),
      volumeMinThreshold: getSettingValue('volume_min_threshold', 100000),
      enableAutoApproval: getSettingValue('enable_auto_approval', true),
      removeOnCriteriaLoss: getSettingValue('remove_on_criteria_loss', true)
    }
  }

  /**
   * Calculate ESG score for an instrument
   */
  private async calculateESGScore(data: CEDEARMarketData): Promise<number> {
    // ESGAnalysisService.analyzeInstrument requires instrumentId (number), but we only have symbol (string).
    // For new candidates, no ID exists yet. For existing instruments, we'd need to look up the ID.
    // Returning 0 causes all candidates to be rejected and all holdings to be flagged for removal.
    // Fail fast instead of producing incorrect review results.
    throw new Error(
      `calculateESGScore not implemented: Cannot analyze ${data.symbol} without instrumentId. ` +
      `ESGAnalysisService.analyzeInstrument(instrumentId) requires numeric ID, but CEDEARMarketData only provides symbol. ` +
      `Monthly review cannot proceed until this integration is completed.`
    )
  }

  /**
   * Calculate Vegan score for an instrument
   */
  private async calculateVeganScore(data: CEDEARMarketData): Promise<number> {
    // VeganAnalysisService.analyzeInstrument requires instrumentId (number), but we only have symbol (string).
    // For new candidates, no ID exists yet. For existing instruments, we'd need to look up the ID.
    // Returning 0 causes all candidates to be rejected and all holdings to be flagged for removal.
    // Fail fast instead of producing incorrect review results.
    throw new Error(
      `calculateVeganScore not implemented: Cannot analyze ${data.symbol} without instrumentId. ` +
      `VeganAnalysisService.analyzeInstrument(instrumentId) requires numeric ID, but CEDEARMarketData only provides symbol. ` +
      `Monthly review cannot proceed until this integration is completed.`
    )
  }

  /**
   * Evaluate a candidate for inclusion
   */
  private async evaluateCandidate(
    data: CEDEARMarketData,
    esgScore: number,
    veganScore: number,
    settings: ReviewSettings
  ): Promise<{
    recommendation: CandidateRecommendation
    confidence: number
    reasons: string[]
    claudeAnalysis: any
  }> {
    const { baseScore, reasons } = this.calculateCandidateBaseScore(data, esgScore, veganScore, settings)
    const recommendation = this.determineRecommendation(baseScore)
    const claudeAnalysis = await this.getCandidateAnalysis(data, recommendation)

    return {
      recommendation,
      confidence: Math.min(baseScore, 95),
      reasons,
      claudeAnalysis
    }
  }

  private calculateCandidateBaseScore(
    data: CEDEARMarketData,
    esgScore: number,
    veganScore: number,
    settings: ReviewSettings
  ): { baseScore: number; reasons: string[] } {
    const reasons: string[] = []
    let baseScore = 50

    if (esgScore >= settings.esgMinScoreThreshold) {
      baseScore += 20
      reasons.push(`ESG score ${esgScore} meets threshold`)
    } else {
      baseScore -= 15
      reasons.push(`ESG score ${esgScore} below threshold ${settings.esgMinScoreThreshold}`)
    }

    if (veganScore >= settings.veganMinScoreThreshold) {
      baseScore += 20
      reasons.push(`Vegan score ${veganScore} meets threshold`)
    } else {
      baseScore -= 10
      reasons.push(`Vegan score ${veganScore} below threshold ${settings.veganMinScoreThreshold}`)
    }

    if (data.marketCap >= settings.marketCapMinThreshold * 2) {
      baseScore += 10
      reasons.push('Large market cap provides stability')
    }

    if (data.avgVolume >= settings.volumeMinThreshold * 5) {
      baseScore += 10
      reasons.push('High liquidity')
    }

    return { baseScore, reasons }
  }

  private determineRecommendation(baseScore: number): CandidateRecommendation {
    if (baseScore >= 85) return 'STRONG_ADD'
    if (baseScore >= 70) return 'ADD'
    if (baseScore >= 55) return 'CONSIDER'
    return 'REJECT'
  }

  private async getCandidateAnalysis(
    data: CEDEARMarketData,
    recommendation: CandidateRecommendation
  ): Promise<any> {
    if (recommendation === 'REJECT') return null
    try {
      // TODO: analyzeInstrument method does not exist in ClaudeContextualService
      // return await this.claudeService.analyzeInstrument(data.symbol, 'investment_thesis')
      return null // Temporary: return null until method is implemented
    } catch (error) {
      logger.warn(`Failed to get Claude analysis for ${data.symbol}:`, error)
      return null
    }
  }

  private async getRemovalAnalysis(
    instrument: any,
    recommendation: RemovalRecommendation
  ): Promise<any> {
    if (recommendation === 'KEEP') return null
    try {
      // TODO: analyzeInstrument method does not exist in ClaudeContextualService
      // return await this.claudeService.analyzeInstrument(instrument.ticker, 'divestment_thesis')
      return null // Temporary: return null until method is implemented
    } catch (error) {
      logger.warn(`Failed to get Claude removal analysis for ${instrument.symbol}:`, error)
      return null
    }
  }

  /**
   * Check if an instrument should be removed
   */
  private async shouldRemoveInstrument(
    instrument: any,
    currentESGScore: number,
    currentVeganScore: number,
    settings: ReviewSettings
  ): Promise<{
    remove: boolean
    reason: string
    severity: RemovalSeverity
    recommendation: RemovalRecommendation
    confidence: number
    lostCriteria: string[]
    claudeAnalysis: any
  }> {
    const { lostCriteria, severity, confidence } = this.evaluateRemovalCriteria(
      instrument,
      currentESGScore,
      currentVeganScore,
      settings
    )

    const shouldRemove = lostCriteria.length > 0 && settings.removeOnCriteriaLoss
    const recommendation = this.determineRemovalRecommendation(severity)
    const claudeAnalysis = await this.getRemovalAnalysis(instrument, recommendation)

    return {
      remove: shouldRemove,
      reason: lostCriteria.join('; ') || 'Criteria evaluation',
      severity,
      recommendation,
      confidence: Math.min(confidence, 95),
      lostCriteria,
      claudeAnalysis
    }
  }

  private evaluateRemovalCriteria(
    instrument: any,
    currentESGScore: number,
    currentVeganScore: number,
    settings: ReviewSettings
  ): { lostCriteria: string[]; severity: RemovalSeverity; confidence: number } {
    const lostCriteria: string[] = []
    let severity: RemovalSeverity = 'LOW'
    let confidence = 70

    const esgLoss = (instrument.esgScore || 0) - currentESGScore
    if (esgLoss > 20) {
      lostCriteria.push('Significant ESG score decline')
      severity = 'HIGH'
      confidence += 15
    } else if (currentESGScore < settings.esgMinScoreThreshold) {
      lostCriteria.push('ESG score below threshold')
      severity = severity === 'LOW' ? 'MEDIUM' : severity
      confidence += 10
    }

    const veganLoss = (instrument.veganScore || 0) - currentVeganScore
    if (veganLoss > 20) {
      lostCriteria.push('Significant Vegan score decline')
      severity = severity === 'LOW' ? 'HIGH' : 'CRITICAL'
      confidence += 15
    } else if (currentVeganScore < settings.veganMinScoreThreshold) {
      lostCriteria.push('Vegan score below threshold')
      severity = severity === 'LOW' ? 'MEDIUM' : severity
      confidence += 10
    }

    return { lostCriteria, severity, confidence }
  }

  private determineRemovalRecommendation(
    severity: RemovalSeverity
  ): RemovalRecommendation {
    if (severity === 'CRITICAL') return 'REMOVE_IMMEDIATELY'
    if (severity === 'HIGH') return 'REMOVE'
    if (severity === 'MEDIUM') return 'MONITOR'
    return 'KEEP'
  }

  /**
   * Auto-approve high confidence changes
   */
  private async autoApproveHighConfidenceChanges(reviewId: number, minConfidence: number): Promise<number> {
    let approved = 0

    // Auto-approve addition candidates
    const additionCandidates = this.monthlyReviewModel.getInstrumentCandidates(reviewId)
    for (const candidate of additionCandidates) {
      if (candidate.confidenceScore >= minConfidence && candidate.recommendation === 'STRONG_ADD') {
        // Update candidate status
        const stmt = this.db.prepare('UPDATE instrument_candidates SET status = ?, user_decision_date = CURRENT_TIMESTAMP WHERE id = ?')
        stmt.run('APPROVED', candidate.id)
        approved++
      }
    }

    // Auto-approve critical removal candidates
    const removalCandidates = this.monthlyReviewModel.getRemovalCandidates(reviewId)
    for (const candidate of removalCandidates) {
      if (candidate.confidenceScore >= minConfidence && candidate.recommendation === 'REMOVE_IMMEDIATELY') {
        // Update candidate status
        const stmt = this.db.prepare('UPDATE removal_candidates SET status = ?, user_decision_date = CURRENT_TIMESTAMP WHERE id = ?')
        stmt.run('APPROVED', candidate.id)
        approved++
      }
    }

    return approved
  }

  /**
   * Fetch CEDEAR market data (mock implementation)
   */
  private async fetchCEDEARMarketData(): Promise<CEDEARMarketData[]> {
    // In a real implementation, this would fetch from Yahoo Finance or similar
    // For now, return mock data
    return [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        marketCap: 3000000000000,
        avgVolume: 50000000
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        sector: 'Technology',
        marketCap: 1800000000000,
        avgVolume: 25000000
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        marketCap: 2800000000000,
        avgVolume: 30000000
      }
    ]
  }

  /**
   * Get current review status
   */
  getCurrentReview(): MonthlyReviewData | null {
    return this.monthlyReviewModel.getCurrentReview()
  }

  /**
   * Get review by ID
   */
  getReview(id: number): MonthlyReviewData | null {
    return this.monthlyReviewModel.findById(id)
  }

  /**
   * Get all reviews
   */
  getAllReviews(limit = 50, offset = 0): MonthlyReviewData[] {
    return this.monthlyReviewModel.findAll(limit, offset)
  }

  /**
   * Get review statistics
   */
  getReviewStats() {
    return this.monthlyReviewModel.getStats()
  }

  /**
   * Get candidates for a review
   */
  getReviewCandidates(reviewId: number) {
    return {
      additions: this.monthlyReviewModel.getInstrumentCandidates(reviewId),
      removals: this.monthlyReviewModel.getRemovalCandidates(reviewId)
    }
  }
}

export default MonthlyReviewService