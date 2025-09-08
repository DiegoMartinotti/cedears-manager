import SectorBalanceModel from '../models/SectorBalance.js'
import SectorClassificationModel from '../models/SectorClassification.js'
import { Instrument } from '../models/Instrument.js'
import { PortfolioPosition } from '../models/PortfolioPosition.js'
import { Quote } from '../models/Quote.js'
import GICSClassificationService from './GICSClassificationService.js'
import { createLogger } from '../utils/logger.js'
import { DEFAULT_SECTOR_BALANCE_CONFIG } from '../constants/gicsSectors.js'
import type {
  SectorBalanceOverview,
  SectorDistribution,
  InstrumentSectorSummary,
  ConcentrationAlert,
  RebalancingSuggestion,
  PortfolioBalance,
  ConcentrationRisk,
  DiversificationMetrics,
  RebalanceRecommendation,
  SuggestedAction
} from '../types/sectorBalance.types.js'

interface BaseMetrics {
  totalPortfolioValue: number
  sectorDistributions: SectorDistribution[]
  activeAlerts: ConcentrationAlert[]
  activeSuggestions: RebalancingSuggestion[]
  diversificationScore: number
}

interface OverviewData extends BaseMetrics {
  balancedSectorCount: number
}

type AlertOmitFields = 'id' | 'createdAt' | 'updatedAt'
type SuggestionOmitFields = 'id' | 'createdAt'

const logger = createLogger('SectorBalanceService')

export class SectorBalanceService {
  private sectorBalanceModel = new SectorBalanceModel()
  private sectorClassificationModel = new SectorClassificationModel()
  private instrumentModel = new Instrument()
  private portfolioPositionModel = new PortfolioPosition()
  private quoteModel = new Quote()
  private classificationService = new GICSClassificationService()

  // ============================================================================
  // Main Analysis Methods
  // ============================================================================

  /**
   * Get complete sector balance overview
   */
  async getSectorBalanceOverview(): Promise<SectorBalanceOverview> {
    try {
      logger.info('Generating sector balance overview')

      const metrics = await this.fetchBaseMetrics()
      const overviewData = this.aggregateSectorData(metrics)
      return this.formatOverview(overviewData)
    } catch (error) {
      logger.error('Error generating sector balance overview:', error)
      throw error
    }
  }

  private async fetchBaseMetrics(): Promise<BaseMetrics> {
    const [
      totalPortfolioValue,
      sectorDistributions,
      activeAlerts,
      activeSuggestions,
      diversificationScore
    ] = await Promise.all([
      this.getTotalPortfolioValue(),
      this.getSectorDistributions(),
      this.sectorBalanceModel.findActiveAlerts(),
      this.sectorBalanceModel.findActiveSuggestions(10),
      this.calculateDiversificationScore()
    ])

    return {
      totalPortfolioValue,
      sectorDistributions,
      activeAlerts,
      activeSuggestions,
      diversificationScore
    }
  }

  private aggregateSectorData(metrics: BaseMetrics): OverviewData {
    const balancedSectorCount = metrics.sectorDistributions.filter(
      s => s.status === 'BALANCED'
    ).length
    return { ...metrics, balancedSectorCount }
  }

  private formatOverview(data: OverviewData): SectorBalanceOverview {
    return {
      totalPortfolioValue: data.totalPortfolioValue,
      sectorCount: data.sectorDistributions.length,
      balancedSectorCount: data.balancedSectorCount,
      alertCount: data.activeAlerts.length,
      diversificationScore: data.diversificationScore,
      lastAnalysis: new Date().toISOString(),
      sectorDistributions: data.sectorDistributions,
      alerts: data.activeAlerts,
      suggestions: data.activeSuggestions
    }
  }

  /**
   * Analyze current portfolio balance
   */
  async analyzePortfolioBalance(): Promise<PortfolioBalance> {
    try {
      logger.info('Analyzing portfolio balance')

      const metrics = await this.fetchBalanceMetrics()
      const rebalanceNeeded = this.aggregateBalanceData(
        metrics.sectorDistributions,
        metrics.concentrationRisk
      )
      return this.formatBalanceResult(metrics, rebalanceNeeded)
    } catch (error) {
      logger.error('Error analyzing portfolio balance:', error)
      throw error
    }
  }

  private async fetchBalanceMetrics(): Promise<{
    totalValue: number
    sectorDistributions: SectorDistribution[]
    concentrationRisk: ConcentrationRisk
    diversificationMetrics: DiversificationMetrics
  }> {
    const [
      totalValue,
      sectorDistributions,
      concentrationRisk,
      diversificationMetrics
    ] = await Promise.all([
      this.getTotalPortfolioValue(),
      this.getSectorDistributions(),
      this.assessConcentrationRisk(),
      this.calculateDiversificationMetrics()
    ])

    return {
      totalValue,
      sectorDistributions,
      concentrationRisk,
      diversificationMetrics
    }
  }

  private aggregateBalanceData(
    sectorDistributions: SectorDistribution[],
    concentrationRisk: ConcentrationRisk
  ): boolean {
    return this.isRebalanceNeeded(sectorDistributions, concentrationRisk)
  }

  private formatBalanceResult(
    metrics: {
      totalValue: number
      sectorDistributions: SectorDistribution[]
      concentrationRisk: ConcentrationRisk
      diversificationMetrics: DiversificationMetrics
    },
    rebalanceNeeded: boolean
  ): PortfolioBalance {
    return {
      totalValue: metrics.totalValue,
      sectorDistributions: metrics.sectorDistributions,
      concentrationRisk: metrics.concentrationRisk,
      diversificationMetrics: metrics.diversificationMetrics,
      rebalanceNeeded,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Generate rebalancing recommendations
   */
  async generateRebalanceRecommendations(): Promise<RebalanceRecommendation[]> {
    try {
      logger.info('Generating rebalance recommendations')

      const { sectorDistributions, targets } = await this.fetchRecommendationData()
      const recommendations = await this.buildRecommendations(
        sectorDistributions,
        targets
      )
      return this.sortAndLimitRecommendations(recommendations)
    } catch (error) {
      logger.error('Error generating rebalance recommendations:', error)
      throw error
    }
  }

  private async fetchRecommendationData(): Promise<{
    sectorDistributions: SectorDistribution[]
    targets: any[]
  }> {
    const [sectorDistributions, targets] = await Promise.all([
      this.getSectorDistributions(),
      this.sectorBalanceModel.findAllTargets()
    ])
    return { sectorDistributions, targets }
  }

  private async buildRecommendations(
    sectorDistributions: SectorDistribution[],
    targets: any[]
  ): Promise<RebalanceRecommendation[]> {
    const recommendations: RebalanceRecommendation[] = []
    for (const distribution of sectorDistributions) {
      const target = targets.find((t: any) => t.sector === distribution.sector)
      if (!target) continue

      const recommendation = await this.createRebalanceRecommendation(
        distribution,
        target.targetPercentage
      )

      if (recommendation) {
        recommendations.push(recommendation)
      }
    }
    return recommendations
  }

  private sortAndLimitRecommendations(
    recommendations: RebalanceRecommendation[]
  ): RebalanceRecommendation[] {
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return Math.abs(b.percentageChange) - Math.abs(a.percentageChange)
    })
    return recommendations.slice(0, 10)
  }

  /**
   * Run complete sector analysis
   */
  async runSectorAnalysis(): Promise<{
    analysisDate: string
    alertsGenerated: number
    suggestionsCreated: number
    sectorsAnalyzed: number
    issues: string[]
  }> {
    try {
      const analysisDate = new Date().toISOString().split('T')[0]
      logger.info(`Running sector analysis for ${analysisDate}`)

      const distributions = await this.getSectorDistributions()
      await this.createAnalysisRecords(analysisDate, distributions)

      const alerts = await this.saveGeneratedAlerts(distributions)
      const suggestions = await this.saveGeneratedSuggestions(distributions)

      const issues = this.identifyAnalysisIssues(distributions.length, alerts)
      return this.formatAnalysisSummary(
        analysisDate,
        {
          alertsGenerated: alerts.length,
          suggestionsCreated: suggestions.length,
          sectorsAnalyzed: distributions.length
        },
        issues
      )
    } catch (error) {
      logger.error('Error running sector analysis:', error)
      throw error
    }
  }

  private async createAnalysisRecords(
    analysisDate: string,
    distributions: SectorDistribution[]
  ): Promise<void> {
    for (const distribution of distributions) {
      await this.sectorBalanceModel.createAnalysis({
        analysisDate,
        sector: distribution.sector,
        currentPercentage: distribution.percentage,
        targetPercentage: distribution.targetPercentage,
        deviation: distribution.deviation,
        recommendation: this.generateSectorRecommendation(distribution),
        actionRequired: this.determineActionRequired(distribution),
        priority: this.determinePriority(distribution),
        totalValue: distribution.totalValue,
        instrumentCount: distribution.instrumentCount
      })
    }
  }

  private async saveGeneratedAlerts(
    distributions: SectorDistribution[]
  ): Promise<Omit<ConcentrationAlert, AlertOmitFields>[]> {
    const alerts = await this.generateConcentrationAlerts(distributions)
    for (const alert of alerts) {
      await this.sectorBalanceModel.createAlert(alert)
    }
    return alerts
  }

  private async saveGeneratedSuggestions(
    distributions: SectorDistribution[]
  ): Promise<Omit<RebalancingSuggestion, SuggestionOmitFields>[]> {
    const suggestions = await this.generateRebalancingSuggestions(distributions)
    for (const suggestion of suggestions) {
      await this.sectorBalanceModel.createSuggestion(suggestion)
    }
    return suggestions
  }

  private identifyAnalysisIssues(
    sectorsAnalyzed: number,
    alerts: Omit<ConcentrationAlert, AlertOmitFields>[]
  ): string[] {
    const issues: string[] = []
    if (sectorsAnalyzed < 3) {
      issues.push('Portfolio has fewer than 3 sectors - insufficient diversification')
    }
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length
    if (criticalAlerts > 0) {
      issues.push(`${criticalAlerts} critical concentration alerts generated`)
    }
    return issues
  }

  private formatAnalysisSummary(
    analysisDate: string,
    counts: { alertsGenerated: number; suggestionsCreated: number; sectorsAnalyzed: number },
    issues: string[]
  ) {
    return { analysisDate, ...counts, issues }
  }

  // ============================================================================
  // Distribution Calculation Methods
  // ============================================================================

  /**
   * Get sector distributions with complete analysis
   */
  async getSectorDistributions(): Promise<SectorDistribution[]> {
    try {
      const positions = await this.portfolioPositionModel.findAll()
      const totalValue = await this.getTotalPortfolioValue()
      if (totalValue === 0) {
        logger.warn('Portfolio has zero value')
        return []
      }
      const sectorMap = await this.groupPositionsBySector(positions, totalValue)
      return this.buildDistributions(sectorMap, totalValue)
    } catch (error) {
      logger.error('Error getting sector distributions:', error)
      return []
    }
  }

  private async groupPositionsBySector(
    positions: any[],
    totalValue: number
  ): Promise<Map<string, { totalValue: number; instruments: InstrumentSectorSummary[] }>> {
    const sectorMap = new Map<string, { totalValue: number; instruments: InstrumentSectorSummary[] }>()
    for (const position of positions) {
      const classification = await this.sectorClassificationModel.findByInstrumentId(position.instrumentId)
      const instrument = await this.instrumentModel.findById(position.instrumentId)
      const quote = await this.quoteModel.getLatestQuote(instrument?.symbol || '')
      if (!classification || !instrument || !quote) {
        logger.warn(`Missing data for position ${position.instrumentId}`)
        continue
      }
      const currentValue = position.quantity * quote.close
      const sector = classification.gicsSector
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, { totalValue: 0, instruments: [] })
      }
      const sectorData = sectorMap.get(sector)!
      sectorData.totalValue += currentValue
      sectorData.instruments.push({
        id: instrument.id!,
        symbol: instrument.symbol,
        companyName: instrument.company_name,
        currentValue,
        percentage: (currentValue / totalValue) * 100,
        sectorPercentage: 0,
        classification
      })
    }
    return sectorMap
  }

  private async buildDistributions(
    sectorMap: Map<string, { totalValue: number; instruments: InstrumentSectorSummary[] }>,
    totalValue: number
  ): Promise<SectorDistribution[]> {
    const distributions: SectorDistribution[] = []
    const targets = await this.sectorBalanceModel.findAllTargets()
    for (const [sector, data] of sectorMap.entries()) {
      const percentage = (data.totalValue / totalValue) * 100
      const target = targets.find(t => t.sector === sector)
      const targetPercentage = target?.targetPercentage || 10.0
      const deviation = percentage - targetPercentage

      for (const instrument of data.instruments) {
        instrument.sectorPercentage = (instrument.currentValue / data.totalValue) * 100
      }

      distributions.push({
        sector,
        percentage,
        totalValue: data.totalValue,
        instrumentCount: data.instruments.length,
        instruments: data.instruments.sort((a, b) => b.currentValue - a.currentValue),
        targetPercentage,
        deviation,
        status: this.getSectorStatus(percentage, targetPercentage, target)
      })
    }
    return distributions.sort((a, b) => b.percentage - a.percentage)
  }

  /**
   * Get total portfolio value
   */
  private async getTotalPortfolioValue(): Promise<number> {
    try {
      const positions = await this.portfolioPositionModel.findAll()
      let total = 0

      for (const position of positions) {
        const instrument = await this.instrumentModel.findById(position.instrumentId)
        if (!instrument) continue

        const quote = await this.quoteModel.getLatestQuote(instrument.symbol)
        if (!quote) continue

        total += position.quantity * quote.close
      }

      return total
    } catch (error) {
      logger.error('Error calculating total portfolio value:', error)
      return 0
    }
  }

  // ============================================================================
  // Risk Assessment Methods
  // ============================================================================

  /**
   * Assess concentration risk
   */
  async assessConcentrationRisk(): Promise<ConcentrationRisk> {
    try {
      const distributions = await this.getSectorDistributions()
      const config = DEFAULT_SECTOR_BALANCE_CONFIG
      const topConcentrations = this.buildTopConcentrations(distributions, config)
      const { maxConcentration, overAllocated, riskFactors } =
        this.evaluateRiskFactors(distributions, config)
      const { score, level } = this.calculateRiskScore(
        maxConcentration,
        distributions.length,
        overAllocated.length,
        config
      )
      return { level, score, topConcentrations, riskFactors }
    } catch (error) {
      logger.error('Error assessing concentration risk:', error)
      return {
        level: 'HIGH',
        score: 100,
        topConcentrations: [],
        riskFactors: ['Error calculating risk']
      }
    }
  }

  private buildTopConcentrations(
    distributions: SectorDistribution[],
    config: typeof DEFAULT_SECTOR_BALANCE_CONFIG
  ) {
    return distributions.slice(0, 5).map(dist => ({
      sector: dist.sector,
      percentage: dist.percentage,
      risk: this.getRiskLevel(dist.percentage, config.maxConcentration)
    }))
  }

  private evaluateRiskFactors(
    distributions: SectorDistribution[],
    config: typeof DEFAULT_SECTOR_BALANCE_CONFIG
  ) {
    const maxConcentration = Math.max(...distributions.map(d => d.percentage))
    const riskFactors: string[] = []
    if (maxConcentration > config.criticalThreshold) {
      riskFactors.push(
        `Critical concentration in ${distributions[0].sector} (${maxConcentration.toFixed(1)}%)`
      )
    }
    if (distributions.length < config.minSectorCount) {
      riskFactors.push(
        `Insufficient diversification (${distributions.length} sectors, minimum ${config.minSectorCount})`
      )
    }
    const overAllocated = distributions.filter(d => d.percentage > config.maxConcentration)
    if (overAllocated.length > 0) {
      riskFactors.push(`${overAllocated.length} sectors over-allocated`)
    }
    return { maxConcentration, riskFactors, overAllocated }
  }

  private calculateRiskScore(
    maxConcentration: number,
    sectorCount: number,
    overAllocatedCount: number,
    config: typeof DEFAULT_SECTOR_BALANCE_CONFIG
  ) {
    let score = 0
    if (maxConcentration > config.criticalThreshold) score += 40
    else if (maxConcentration > config.warningThreshold) score += 25
    if (sectorCount < config.minSectorCount) score += 30
    score += Math.min(20, overAllocatedCount * 5)
    let level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    if (score > 70) {
      level = 'CRITICAL'
    } else if (score > 50) {
      level = 'HIGH'
    } else if (score > 25) {
      level = 'MEDIUM'
    } else {
      level = 'LOW'
    }
    return { score, level }
  }

  /**
   * Calculate diversification metrics
   */
  async calculateDiversificationMetrics(): Promise<DiversificationMetrics> {
    try {
      const distributions = await this.getSectorDistributions()
      if (distributions.length === 0) {
        return this.defaultDiversificationMetrics()
      }

      const weights = distributions.map(d => d.percentage / 100)
      const {
        herfindahlIndex,
        effectiveSectors,
        giniCoefficient,
        diversificationRatio
      } = this.computeDiversificationIndices(weights, distributions.length)
      const score = this.computeDiversificationScore(
        herfindahlIndex,
        distributions.length,
        diversificationRatio
      )

      return {
        sectorCount: distributions.length,
        effectiveSectors: Math.round(effectiveSectors * 10) / 10,
        giniCoefficient: Math.round(giniCoefficient * 1000) / 1000,
        herfindahlIndex: Math.round(herfindahlIndex * 1000) / 1000,
        diversificationRatio: Math.round(diversificationRatio * 1000) / 1000,
        score: Math.round(score)
      }
    } catch (error) {
      logger.error('Error calculating diversification metrics:', error)
      return this.defaultDiversificationMetrics()
    }
  }

  private computeDiversificationIndices(weights: number[], count: number) {
    const herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0)
    const effectiveSectors = 1 / herfindahlIndex
    const giniCoefficient = this.calculateGiniCoefficient(weights)
    const diversificationRatio = effectiveSectors / count
    return { herfindahlIndex, effectiveSectors, giniCoefficient, diversificationRatio }
  }

  private computeDiversificationScore(
    herfindahlIndex: number,
    sectorCount: number,
    diversificationRatio: number
  ) {
    let score = 100
    score *= 1 - herfindahlIndex
    score *= Math.min(1, sectorCount / DEFAULT_SECTOR_BALANCE_CONFIG.minSectorCount)
    score *= diversificationRatio
    return score
  }

  private defaultDiversificationMetrics(): DiversificationMetrics {
    return {
      sectorCount: 0,
      effectiveSectors: 0,
      giniCoefficient: 1,
      herfindahlIndex: 1,
      diversificationRatio: 0,
      score: 0
    }
  }

  /**
   * Calculate diversification score (0-100)
   */
  private async calculateDiversificationScore(): Promise<number> {
    const metrics = await this.calculateDiversificationMetrics()
    return metrics.score
  }

  // ============================================================================
  // Alert and Suggestion Generation
  // ============================================================================

  /**
   * Generate concentration alerts
   */
  private async generateConcentrationAlerts(
    distributions: SectorDistribution[]
  ): Promise<Omit<ConcentrationAlert, AlertOmitFields>[]> {
    const config = DEFAULT_SECTOR_BALANCE_CONFIG
    const alerts = distributions.flatMap(dist =>
      this.evaluateDistributionAlerts(dist, config)
    )
    this.addPortfolioAlertIfNeeded(alerts, distributions, config)
    return alerts
  }

  private evaluateDistributionAlerts(
    dist: SectorDistribution,
    config: typeof DEFAULT_SECTOR_BALANCE_CONFIG
  ): Omit<ConcentrationAlert, AlertOmitFields>[] {
    const alerts: Omit<ConcentrationAlert, AlertOmitFields>[] = []
    if (dist.percentage > config.criticalThreshold) {
      alerts.push({
        sector: dist.sector,
        alertType: 'OVER_CONCENTRATION',
        severity: 'CRITICAL',
        currentPercentage: dist.percentage,
        thresholdPercentage: config.criticalThreshold,
        message: `Critical over-concentration in ${dist.sector} sector (${dist.percentage.toFixed(1)}% vs ${config.criticalThreshold}% threshold)`,
        actionRequired: `Reduce ${dist.sector} allocation by ${(dist.percentage - dist.targetPercentage).toFixed(1)}%`,
        isActive: true,
        isAcknowledged: false
      })
    } else if (dist.percentage > config.warningThreshold) {
      alerts.push({
        sector: dist.sector,
        alertType: 'OVER_CONCENTRATION',
        severity: 'MEDIUM',
        currentPercentage: dist.percentage,
        thresholdPercentage: config.warningThreshold,
        message: `High concentration in ${dist.sector} sector (${dist.percentage.toFixed(1)}%)`,
        actionRequired: `Monitor ${dist.sector} allocation and consider rebalancing`,
        isActive: true,
        isAcknowledged: false
      })
    }

    if (Math.abs(dist.deviation) > config.rebalanceThreshold) {
      const severity = Math.abs(dist.deviation) > 15 ? 'HIGH' : 'MEDIUM'
      alerts.push({
        sector: dist.sector,
        alertType: 'SECTOR_DEVIATION',
        severity,
        currentPercentage: dist.percentage,
        thresholdPercentage: dist.targetPercentage,
        message: `${dist.sector} sector deviates ${dist.deviation > 0 ? 'above' : 'below'} target by ${Math.abs(dist.deviation).toFixed(1)}%`,
        actionRequired: `Rebalance ${dist.sector} toward ${dist.targetPercentage}% target`,
        isActive: true,
        isAcknowledged: false
      })
    }
    return alerts
  }

  private addPortfolioAlertIfNeeded(
    alerts: Omit<ConcentrationAlert, AlertOmitFields>[],
    distributions: SectorDistribution[],
    config: typeof DEFAULT_SECTOR_BALANCE_CONFIG
  ) {
    if (distributions.length < config.minSectorCount) {
      alerts.push({
        sector: 'Portfolio',
        alertType: 'UNDER_DIVERSIFIED',
        severity: 'HIGH',
        currentPercentage: distributions.length,
        thresholdPercentage: config.minSectorCount,
        message: `Portfolio insufficiently diversified (${distributions.length} sectors vs ${config.minSectorCount} minimum)`,
        actionRequired: `Add positions in ${config.minSectorCount - distributions.length} additional sectors`,
        isActive: true,
        isAcknowledged: false
      })
    }
  }

  /**
   * Generate rebalancing suggestions
   */
  private async generateRebalancingSuggestions(distributions: SectorDistribution[]): Promise<Omit<RebalancingSuggestion, SuggestionOmitFields>[]> {
    const context = await this.prepareSuggestionContext()
    const evaluations = await Promise.all(
      distributions.map(dist => this.evaluateDistributionForSuggestions(dist, context))
    )
    const suggestions = evaluations.filter(
      (s): s is Omit<RebalancingSuggestion, SuggestionOmitFields> => s !== null
    )
    return this.sortSuggestions(suggestions)
  }

  private async prepareSuggestionContext(): Promise<{ analysisDate: string; totalValue: number }> {
    return {
      analysisDate: new Date().toISOString().split('T')[0],
      totalValue: await this.getTotalPortfolioValue()
    }
  }

  private async evaluateDistributionForSuggestions(
    dist: SectorDistribution,
    ctx: { analysisDate: string; totalValue: number }
  ): Promise<Omit<RebalancingSuggestion, SuggestionOmitFields> | null> {
    if (Math.abs(dist.deviation) <= DEFAULT_SECTOR_BALANCE_CONFIG.rebalanceThreshold) {
      return null
    }
    const action = dist.deviation > 0 ? 'REDUCE' : 'INCREASE'
    const amountToAdjust = (Math.abs(dist.deviation) / 100) * ctx.totalValue
    const suggestedInstruments =
      action === 'REDUCE'
        ? dist.instruments.slice(0, 3).map(i => i.symbol)
        : await this.getSuggestedInstrumentsForSector(dist.sector)

    return {
      analysisDate: ctx.analysisDate,
      sector: dist.sector,
      action,
      currentAllocation: dist.percentage,
      suggestedAllocation: dist.targetPercentage,
      amountToAdjust,
      suggestedInstruments,
      reasoning: this.generateRebalancingReasoning(dist, action),
      priority: this.getRebalancePriority(Math.abs(dist.deviation)),
      impactScore: this.calculateImpactScore(dist),
      isImplemented: false
    }
  }

  private sortSuggestions(
    suggestions: Omit<RebalancingSuggestion, SuggestionOmitFields>[]
  ): Omit<RebalancingSuggestion, SuggestionOmitFields>[] {
    return suggestions.sort((a, b) => a.priority - b.priority)
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getSectorStatus(
    current: number, 
    target: number, 
    targetConfig?: any
  ): 'BALANCED' | 'OVER_ALLOCATED' | 'UNDER_ALLOCATED' | 'CRITICAL' {
    const deviation = current - target
    const maxDeviation = targetConfig?.maxPercentage || DEFAULT_SECTOR_BALANCE_CONFIG.maxConcentration

    if (current > maxDeviation) return 'CRITICAL'
    if (Math.abs(deviation) <= DEFAULT_SECTOR_BALANCE_CONFIG.rebalanceThreshold) return 'BALANCED'
    return deviation > 0 ? 'OVER_ALLOCATED' : 'UNDER_ALLOCATED'
  }

  private getRiskLevel(percentage: number, maxAllowed: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (percentage > maxAllowed * 1.5) return 'CRITICAL'
    if (percentage > maxAllowed) return 'HIGH'
    if (percentage > maxAllowed * 0.8) return 'MEDIUM'
    return 'LOW'
  }

  private calculateGiniCoefficient(weights: number[]): number {
    if (weights.length <= 1) return 0

    const sorted = [...weights].sort((a, b) => a - b)
    const n = sorted.length
    const mean = sorted.reduce((sum, w) => sum + w, 0) / n

    let numerator = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        numerator += Math.abs(sorted[i] - sorted[j])
      }
    }

    return numerator / (2 * n * n * mean)
  }

  private isRebalanceNeeded(distributions: SectorDistribution[], risk: ConcentrationRisk): boolean {
    const criticalSectors = distributions.filter(d => d.status === 'CRITICAL').length
    const overAllocated = distributions.filter(d => d.status === 'OVER_ALLOCATED').length
    
    return criticalSectors > 0 || overAllocated > 2 || risk.level === 'CRITICAL' || risk.level === 'HIGH'
  }

  private generateSectorRecommendation(distribution: SectorDistribution): string {
    const deviation = Math.abs(distribution.deviation)
    
    if (distribution.status === 'CRITICAL') {
      return `Urgent: Reduce ${distribution.sector} allocation immediately. Current exposure (${distribution.percentage.toFixed(1)}%) exceeds safe limits.`
    }
    
    if (distribution.status === 'OVER_ALLOCATED') {
      return `Consider reducing ${distribution.sector} position by approximately ${deviation.toFixed(1)}% to reach target allocation.`
    }
    
    if (distribution.status === 'UNDER_ALLOCATED') {
      return `Opportunity to increase ${distribution.sector} exposure by ${deviation.toFixed(1)}% to optimize diversification.`
    }
    
    return `${distribution.sector} allocation is well-balanced at ${distribution.percentage.toFixed(1)}%.`
  }

  private determineActionRequired(distribution: SectorDistribution): 'MAINTAIN' | 'REDUCE' | 'INCREASE' | 'REBALANCE' {
    if (distribution.status === 'CRITICAL' || distribution.status === 'OVER_ALLOCATED') {
      return 'REDUCE'
    }
    
    if (distribution.status === 'UNDER_ALLOCATED') {
      return 'INCREASE'
    }
    
    if (Math.abs(distribution.deviation) > DEFAULT_SECTOR_BALANCE_CONFIG.rebalanceThreshold) {
      return 'REBALANCE'
    }
    
    return 'MAINTAIN'
  }

  private determinePriority(distribution: SectorDistribution): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (distribution.status === 'CRITICAL') return 'CRITICAL'
    if (Math.abs(distribution.deviation) > 15) return 'HIGH'
    if (Math.abs(distribution.deviation) > 10) return 'MEDIUM'
    return 'LOW'
  }

  private async createRebalanceRecommendation(
    distribution: SectorDistribution,
    targetPercentage: number
  ): Promise<RebalanceRecommendation | null> {
    const deviation = distribution.percentage - targetPercentage
    
    if (Math.abs(deviation) <= DEFAULT_SECTOR_BALANCE_CONFIG.rebalanceThreshold) {
      return null // No rebalancing needed
    }

    const totalValue = await this.getTotalPortfolioValue()
    const action = deviation > 0 ? 'REDUCE' : 'INCREASE'
    const amountToAdjust = Math.abs(deviation / 100) * totalValue

    return {
      sector: distribution.sector,
      currentAllocation: distribution.percentage,
      targetAllocation: targetPercentage,
      action,
      priority: this.determinePriority(distribution),
      amountToAdjust,
      percentageChange: Math.abs(deviation),
      suggestedActions: await this.generateSuggestedActions(distribution, action, amountToAdjust),
      reasoning: this.generateRebalancingReasoning(distribution, action),
      impact: {
        diversificationImprovement: Math.min(20, Math.abs(deviation)),
        riskReduction: Math.min(15, Math.abs(deviation) * 0.8),
        expectedCosts: amountToAdjust * 0.005, // Assume 0.5% transaction costs
        timeToComplete: Math.ceil(Math.abs(deviation) / 5), // Days based on deviation
        priority: this.getRebalancePriority(Math.abs(deviation))
      }
    }
  }

  private async generateSuggestedActions(
    distribution: SectorDistribution,
    action: 'REDUCE' | 'INCREASE',
    amount: number
  ): Promise<SuggestedAction[]> {
    const actions: SuggestedAction[] = []

    if (action === 'REDUCE') {
      // Suggest selling largest positions first
      const largestPositions = distribution.instruments
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 3)

      for (const instrument of largestPositions) {
        const suggestedAmount = Math.min(instrument.currentValue * 0.3, amount / largestPositions.length)
        actions.push({
          type: 'SELL',
          instrumentId: instrument.id,
          symbol: instrument.symbol,
          companyName: instrument.companyName,
          currentValue: instrument.currentValue,
          suggestedAmount,
          expectedImpact: (suggestedAmount / distribution.totalValue) * 100,
          reasoning: `Reduce over-allocation by selling portion of largest ${distribution.sector} position`
        })
      }
    } else {
      // Suggest buying new or existing positions
      const suggestedSymbols = await this.getSuggestedInstrumentsForSector(distribution.sector)
      
      for (const symbol of suggestedSymbols.slice(0, 3)) {
        actions.push({
          type: 'BUY',
          instrumentId: 0, // Placeholder for new instruments
          symbol,
          companyName: symbol, // Would need to be resolved
          currentValue: 0,
          suggestedAmount: amount / suggestedSymbols.length,
          expectedImpact: (amount / suggestedSymbols.length / distribution.totalValue) * 100,
          reasoning: `Increase under-allocation by adding ${distribution.sector} exposure`
        })
      }
    }

    return actions
  }

  private generateRebalancingReasoning(distribution: SectorDistribution, action: 'REDUCE' | 'INCREASE'): string {
    const deviation = Math.abs(distribution.deviation)
    
    if (action === 'REDUCE') {
      return `${distribution.sector} is over-allocated at ${distribution.percentage.toFixed(1)}% (target: ${distribution.targetPercentage.toFixed(1)}%). Reducing exposure by ${deviation.toFixed(1)}% would improve portfolio diversification and reduce concentration risk.`
    } else {
      return `${distribution.sector} is under-allocated at ${distribution.percentage.toFixed(1)}% (target: ${distribution.targetPercentage.toFixed(1)}%). Increasing exposure by ${deviation.toFixed(1)}% would optimize sector balance and potentially improve risk-adjusted returns.`
    }
  }

  private getRebalancePriority(deviation: number): number {
    if (deviation > 20) return 1 // Highest priority
    if (deviation > 15) return 2
    if (deviation > 10) return 3
    if (deviation > 5) return 4
    return 5 // Lowest priority
  }

  private calculateImpactScore(distribution: SectorDistribution): number {
    const deviation = Math.abs(distribution.deviation)
    const sizeWeight = Math.min(distribution.percentage / 50, 1) // Larger sectors have higher impact
    return Math.round(deviation * sizeWeight * 100) / 100
  }

  private async getSuggestedInstrumentsForSector(sector: string): Promise<string[]> {
    // This would ideally integrate with a broader instrument database
    // For now, return some common instruments by sector
    const sectorInstruments: Record<string, string[]> = {
      'Information Technology': ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'],
      'Health Care': ['JNJ', 'PFE', 'UNH', 'MRK', 'ABT'],
      'Financials': ['JPM', 'BAC', 'WFC', 'GS', 'MS'],
      'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],
      'Consumer Staples': ['KO', 'PEP', 'WMT', 'PG', 'COST'],
      'Industrials': ['BA', 'CAT', 'GE', 'MMM', 'HON'],
      'Energy': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],
      'Materials': ['LIN', 'APD', 'SHW', 'ECL', 'DD'],
      'Utilities': ['NEE', 'DUK', 'SO', 'D', 'EXC'],
      'Communication Services': ['GOOGL', 'META', 'NFLX', 'DIS', 'VZ'],
      'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'SPG']
    }

    return sectorInstruments[sector] || []
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      return await this.sectorBalanceModel.healthCheck()
    } catch (error) {
      logger.error('Sector balance service health check failed:', error)
      return false
    }
  }
}

export default SectorBalanceService