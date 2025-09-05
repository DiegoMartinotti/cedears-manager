/* eslint-disable max-lines-per-function */
import DatabaseConnection from '../database/connection.js'
import { MonthlyReviewModel, MonthlyReviewData, CreateMonthlyReviewData, InstrumentCandidateData, RemovalCandidateData } from '../models/MonthlyReview.js'
import { InstrumentModel } from '../models/Instrument.js'
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

export class MonthlyReviewService {
  private db = DatabaseConnection.getInstance()
  private monthlyReviewModel: MonthlyReviewModel
  private instrumentModel: InstrumentModel
  private esgAnalysisService: ESGAnalysisService
  private veganAnalysisService: VeganAnalysisService
  private claudeService: ClaudeContextualService
  private notificationService: NotificationService

  constructor() {
    this.monthlyReviewModel = new MonthlyReviewModel(this.db)
    this.instrumentModel = new InstrumentModel(this.db)
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

    // Check if review for this month already exists
    const existingReview = this.monthlyReviewModel.findByDate(reviewDate)
    if (existingReview && existingReview.status !== 'FAILED') {
      logger.info('Monthly review already exists for this date')
      return existingReview
    }

    // Create new review session
    const reviewData: CreateMonthlyReviewData = {
      reviewDate,
      status: 'PENDING'
    }

    const review = this.monthlyReviewModel.create(reviewData)

    // Send notification
    await this.notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'medium',
      title: 'Revisión Mensual Iniciada',
      message: `Se ha iniciado la revisión mensual automática de la watchlist para ${reviewDate}`,
      data: { reviewId: review.id }
    })

    return review
  }

  /**
   * Execute the full review process
   */
  async executeReview(reviewId: number): Promise<ScanResult> {
    logger.info(`Executing review ${reviewId}`)

    // Update review status
    this.monthlyReviewModel.update(reviewId, {
      status: 'IN_PROGRESS',
      scanStartedAt: new Date().toISOString()
    })

    try {
      // Get settings
      const settings = await this.getReviewSettings()
      
      // Scan market for new opportunities
      const scanResult = await this.scanMarketForOpportunities(reviewId, settings)
      
      // Analyze current portfolio for removals
      const removalCandidates = await this.analyzeCurrentPortfolioForRemovals(reviewId, settings)
      
      // Combine results
      const finalResult: ScanResult = {
        candidatesForAddition: scanResult.candidatesForAddition,
        candidatesForRemoval: removalCandidates,
        totalScanned: scanResult.totalScanned,
        summary: {
          strongAdd: scanResult.candidatesForAddition.filter(c => c.recommendation === 'STRONG_ADD').length,
          considerAdd: scanResult.candidatesForAddition.filter(c => c.recommendation === 'ADD' || c.recommendation === 'CONSIDER').length,
          removeImmediately: removalCandidates.filter(c => c.recommendation === 'REMOVE_IMMEDIATELY').length,
          monitor: removalCandidates.filter(c => c.recommendation === 'MONITOR').length,
          averageConfidence: (
            [...scanResult.candidatesForAddition, ...removalCandidates]
              .reduce((sum, c) => sum + c.confidenceScore, 0) / 
            (scanResult.candidatesForAddition.length + removalCandidates.length)
          ) || 0
        }
      }

      // Generate Claude report
      const claudeReport = await this.generateClaudeReport(finalResult)

      // Auto-approve high confidence changes if enabled
      let autoApproved = 0
      if (settings.enableAutoApproval) {
        autoApproved = await this.autoApproveHighConfidenceChanges(reviewId, settings.minConfidenceAutoApprove)
      }

      // Update review with results
      this.monthlyReviewModel.update(reviewId, {
        status: 'COMPLETED',
        scanCompletedAt: new Date().toISOString(),
        totalInstrumentsScanned: finalResult.totalScanned,
        newInstrumentsFound: finalResult.candidatesForAddition.length,
        removedInstruments: finalResult.candidatesForRemoval.length,
        pendingApprovals: finalResult.candidatesForAddition.length + finalResult.candidatesForRemoval.length - autoApproved,
        autoApproved,
        summary: finalResult.summary,
        claudeReport
      })

      // Send completion notification
      await this.notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'high',
        title: 'Revisión Mensual Completada',
        message: `Se encontraron ${finalResult.candidatesForAddition.length} candidatos para agregar y ${finalResult.candidatesForRemoval.length} para remover. ${autoApproved} cambios aprobados automáticamente.`,
        data: { reviewId, scanResult: finalResult }
      })

      logger.info(`Review ${reviewId} completed successfully`)
      return finalResult

    } catch (error) {
      logger.error(`Review ${reviewId} failed:`, error)
      
      this.monthlyReviewModel.update(reviewId, {
        status: 'FAILED',
        errors: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      throw error
    }
  }

  /**
   * Scan market for new investment opportunities
   */
  private async scanMarketForOpportunities(reviewId: number, settings: ReviewSettings): Promise<{ candidatesForAddition: InstrumentCandidateData[], totalScanned: number }> {
    logger.info('Scanning market for new opportunities')

    // Get current watchlist
    const currentInstruments = this.instrumentModel.findAll({ isActive: true })
    const currentSymbols = new Set(currentInstruments.map(i => i.ticker))

    // Simulate market data fetch (in real implementation, this would fetch from Yahoo Finance or similar)
    const marketData = await this.fetchCEDEARMarketData()
    
    const candidates: InstrumentCandidateData[] = []
    
    for (const data of marketData) {
      // Skip if already in watchlist
      if (currentSymbols.has(data.symbol)) continue

      // Basic filtering
      if (data.marketCap < settings.marketCapMinThreshold) continue
      if (data.avgVolume < settings.volumeMinThreshold) continue

      try {
        // Analyze ESG and Vegan criteria
        const esgScore = await this.calculateESGScore(data)
        const veganScore = await this.calculateVeganScore(data)

        // Score the candidate
        const evaluation = await this.evaluateCandidate(data, esgScore, veganScore, settings)
        
        if (evaluation.recommendation !== 'REJECT') {
          const candidate = this.monthlyReviewModel.createInstrumentCandidate({
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

          candidates.push(candidate)
        }
      } catch (error) {
        logger.warn(`Failed to analyze ${data.symbol}:`, error)
      }
    }

    // Sort by confidence score
    candidates.sort((a, b) => b.confidenceScore - a.confidenceScore)

    logger.info(`Found ${candidates.length} candidates from ${marketData.length} instruments scanned`)
    
    return {
      candidatesForAddition: candidates,
      totalScanned: marketData.length
    }
  }

  /**
   * Analyze current portfolio for instruments that should be removed
   */
  private async analyzeCurrentPortfolioForRemovals(reviewId: number, settings: ReviewSettings): Promise<RemovalCandidateData[]> {
    logger.info('Analyzing current portfolio for removals')

    const currentInstruments = this.instrumentModel.findAll({ isActive: true })
    const removalCandidates: RemovalCandidateData[] = []

    for (const instrument of currentInstruments) {
      try {
        // Re-evaluate ESG and Vegan scores
        const currentESGScore = await this.calculateESGScore({
          symbol: instrument.ticker,
          name: instrument.name || '',
          sector: instrument.sector || '',
          marketCap: instrument.marketCap || 0,
          avgVolume: 0
        })

        const currentVeganScore = await this.calculateVeganScore({
          symbol: instrument.ticker,
          name: instrument.name || '',
          sector: instrument.sector || '',
          marketCap: instrument.marketCap || 0,
          avgVolume: 0
        })

        // Check if criteria are still met
        const shouldRemove = this.shouldRemoveInstrument(
          instrument,
          currentESGScore,
          currentVeganScore,
          settings
        )

        if (shouldRemove.remove) {
          const candidate = this.monthlyReviewModel.createRemovalCandidate({
            instrumentId: instrument.id!,
            reason: shouldRemove.reason,
            severity: shouldRemove.severity,
            currentEsgScore: currentESGScore,
            currentVeganScore: currentVeganScore,
            previousEsgScore: instrument.esgScore,
            previousVeganScore: instrument.veganScore,
            recommendation: shouldRemove.recommendation,
            confidenceScore: shouldRemove.confidence,
            claudeAnalysis: JSON.stringify(shouldRemove.claudeAnalysis),
            lostCriteria: JSON.stringify(shouldRemove.lostCriteria),
            reviewId,
            status: 'PENDING'
          })

          removalCandidates.push(candidate)
        }
      } catch (error) {
        logger.warn(`Failed to analyze ${instrument.ticker} for removal:`, error)
      }
    }

    logger.info(`Found ${removalCandidates.length} removal candidates`)
    return removalCandidates
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
      const analysis = await this.claudeService.generateReport('watchlist_review', prompt)
      return analysis
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
    try {
      const analysis = await this.esgAnalysisService.analyzeInstrument(data.symbol)
      return analysis?.totalScore || 0
    } catch (error) {
      logger.warn(`Failed to get ESG score for ${data.symbol}:`, error)
      return 0
    }
  }

  /**
   * Calculate Vegan score for an instrument
   */
  private async calculateVeganScore(data: CEDEARMarketData): Promise<number> {
    try {
      const analysis = await this.veganAnalysisService.analyzeInstrument(data.symbol)
      return analysis?.veganScore || 0
    } catch (error) {
      logger.warn(`Failed to get Vegan score for ${data.symbol}:`, error)
      return 0
    }
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
    recommendation: 'STRONG_ADD' | 'ADD' | 'CONSIDER' | 'REJECT'
    confidence: number
    reasons: string[]
    claudeAnalysis: any
  }> {
    const reasons: string[] = []
    let baseScore = 50

    // ESG evaluation
    if (esgScore >= settings.esgMinScoreThreshold) {
      baseScore += 20
      reasons.push(`ESG score ${esgScore} meets threshold`)
    } else {
      baseScore -= 15
      reasons.push(`ESG score ${esgScore} below threshold ${settings.esgMinScoreThreshold}`)
    }

    // Vegan evaluation
    if (veganScore >= settings.veganMinScoreThreshold) {
      baseScore += 20
      reasons.push(`Vegan score ${veganScore} meets threshold`)
    } else {
      baseScore -= 10
      reasons.push(`Vegan score ${veganScore} below threshold ${settings.veganMinScoreThreshold}`)
    }

    // Market cap evaluation
    if (data.marketCap >= settings.marketCapMinThreshold * 2) {
      baseScore += 10
      reasons.push('Large market cap provides stability')
    }

    // Volume evaluation
    if (data.avgVolume >= settings.volumeMinThreshold * 5) {
      baseScore += 10
      reasons.push('High liquidity')
    }

    // Determine recommendation
    let recommendation: 'STRONG_ADD' | 'ADD' | 'CONSIDER' | 'REJECT'
    if (baseScore >= 85) {
      recommendation = 'STRONG_ADD'
    } else if (baseScore >= 70) {
      recommendation = 'ADD'
    } else if (baseScore >= 55) {
      recommendation = 'CONSIDER'
    } else {
      recommendation = 'REJECT'
    }

    // Get Claude analysis for high-potential candidates
    let claudeAnalysis = null
    if (recommendation !== 'REJECT') {
      try {
        claudeAnalysis = await this.claudeService.analyzeInstrument(data.symbol, 'investment_thesis')
      } catch (error) {
        logger.warn(`Failed to get Claude analysis for ${data.symbol}:`, error)
      }
    }

    return {
      recommendation,
      confidence: Math.min(baseScore, 95),
      reasons,
      claudeAnalysis
    }
  }

  /**
   * Check if an instrument should be removed
   */
  private shouldRemoveInstrument(
    instrument: any,
    currentESGScore: number,
    currentVeganScore: number,
    settings: ReviewSettings
  ): {
    remove: boolean
    reason: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    recommendation: 'REMOVE_IMMEDIATELY' | 'REMOVE' | 'MONITOR' | 'KEEP'
    confidence: number
    lostCriteria: string[]
    claudeAnalysis: any
  } {
    const lostCriteria: string[] = []
    let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
    let confidence = 70

    // Check ESG criteria
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

    // Check Vegan criteria
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

    const shouldRemove = lostCriteria.length > 0 && settings.removeOnCriteriaLoss
    
    let recommendation: 'REMOVE_IMMEDIATELY' | 'REMOVE' | 'MONITOR' | 'KEEP'
    if (severity === 'CRITICAL') {
      recommendation = 'REMOVE_IMMEDIATELY'
    } else if (severity === 'HIGH') {
      recommendation = 'REMOVE'
    } else if (severity === 'MEDIUM') {
      recommendation = 'MONITOR'
    } else {
      recommendation = 'KEEP'
    }

    return {
      remove: shouldRemove,
      reason: lostCriteria.join('; ') || 'Criteria evaluation',
      severity,
      recommendation,
      confidence: Math.min(confidence, 95),
      lostCriteria,
      claudeAnalysis: null // TODO: Add Claude analysis for removal candidates
    }
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