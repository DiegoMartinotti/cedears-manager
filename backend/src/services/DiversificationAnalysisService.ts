import SectorBalanceService from './SectorBalanceService.js'
import { createLogger } from '../utils/logger.js'
import type {
  DiversificationMetrics,
  ConcentrationRisk,
  BalanceHealthScore,
  SectorStats,
  PortfolioEvolution,
  SectorPerformanceHistory
} from '../types/sectorBalance.types.js'

const logger = createLogger('DiversificationAnalysisService')

export class DiversificationAnalysisService {
  private sectorBalanceService = new SectorBalanceService()

  // ============================================================================
  // Advanced Diversification Analysis
  // ============================================================================

  /**
   * Generate comprehensive portfolio health score
   */
  async generateHealthScore(): Promise<BalanceHealthScore> {
    try {
      logger.info('Generating portfolio health score')

      const portfolioBalance = await this.sectorBalanceService.analyzePortfolioBalance()
      const factors = []

      // Factor 1: Sector Diversification (30% weight)
      const diversificationScore = this.assessDiversificationHealth(portfolioBalance.diversificationMetrics)
      factors.push({
        name: 'Sector Diversification',
        score: diversificationScore,
        weight: 30,
        description: `Portfolio is spread across ${portfolioBalance.diversificationMetrics.sectorCount} sectors with ${portfolioBalance.diversificationMetrics.effectiveSectors} effective sectors`
      })

      // Factor 2: Concentration Risk (25% weight)
      const concentrationScore = this.assessConcentrationHealth(portfolioBalance.concentrationRisk)
      factors.push({
        name: 'Concentration Risk',
        score: concentrationScore,
        weight: 25,
        description: `Concentration risk level: ${portfolioBalance.concentrationRisk.level}`
      })

      // Factor 3: Balance Stability (20% weight)
      const balanceScore = this.assessBalanceHealth(portfolioBalance.sectorDistributions)
      factors.push({
        name: 'Balance Stability',
        score: balanceScore,
        weight: 20,
        description: `${portfolioBalance.sectorDistributions.filter(s => s.status === 'BALANCED').length} of ${portfolioBalance.sectorDistributions.length} sectors are well-balanced`
      })

      // Factor 4: Allocation Efficiency (15% weight)
      const allocationScore = this.assessAllocationEfficiency(portfolioBalance.sectorDistributions)
      factors.push({
        name: 'Allocation Efficiency',
        score: allocationScore,
        weight: 15,
        description: 'How efficiently capital is allocated across sectors'
      })

      // Factor 5: Risk-Adjusted Performance (10% weight)
      const performanceScore = await this.assessPerformanceHealth()
      factors.push({
        name: 'Risk-Adjusted Performance',
        score: performanceScore,
        weight: 10,
        description: 'Historical risk-adjusted returns relative to benchmarks'
      })

      // Calculate weighted overall score
      const overall = Math.round(
        factors.reduce((sum, factor) => sum + (factor.score * factor.weight / 100), 0)
      )

      return {
        overall,
        diversification: diversificationScore,
        concentration: 100 - portfolioBalance.concentrationRisk.score,
        balance: balanceScore,
        stability: this.calculateStabilityScore(portfolioBalance),
        factors
      }
    } catch (error) {
      logger.error('Error generating health score:', error)
      return {
        overall: 50,
        diversification: 50,
        concentration: 50,
        balance: 50,
        stability: 50,
        factors: []
      }
    }
  }

  /**
   * Analyze sector performance trends
   */
  async analyzeSectorPerformance(months: number = 12): Promise<SectorPerformanceHistory[]> {
    try {
      logger.info(`Analyzing sector performance trends for ${months} months`)

      const distributions = await this.sectorBalanceService.getSectorDistributions()
      const performanceHistory: SectorPerformanceHistory[] = []

      for (const distribution of distributions) {
        // Generate mock historical data (in a real implementation, this would fetch actual data)
        const history = this.generateHistoricalPerformance(distribution.sector, months)
        const trends = this.analyzeTrends(history)

        performanceHistory.push({
          sector: distribution.sector,
          history,
          trends
        })
      }

      return performanceHistory
    } catch (error) {
      logger.error('Error analyzing sector performance:', error)
      return []
    }
  }

  /**
   * Calculate sector-specific statistics
   */
  async calculateSectorStats(): Promise<SectorStats[]> {
    try {
      const distributions = await this.sectorBalanceService.getSectorDistributions()
      const stats: SectorStats[] = []

      for (const distribution of distributions) {
        const sectorStat: SectorStats = {
          sector: distribution.sector,
          instrumentCount: distribution.instrumentCount,
          totalValue: distribution.totalValue,
          percentage: distribution.percentage,
          avgInstrumentValue: distribution.totalValue / distribution.instrumentCount,
          largestPosition: Math.max(...distribution.instruments.map(i => i.currentValue)),
          smallestPosition: Math.min(...distribution.instruments.map(i => i.currentValue)),
          volatility: this.calculateSectorVolatility(distribution),
          performance: {
            daily: Math.random() * 4 - 2, // Mock data
            weekly: Math.random() * 8 - 4,
            monthly: Math.random() * 15 - 7.5,
            quarterly: Math.random() * 25 - 12.5,
            yearly: Math.random() * 40 - 20
          }
        }

        stats.push(sectorStat)
      }

      return stats.sort((a, b) => b.percentage - a.percentage)
    } catch (error) {
      logger.error('Error calculating sector stats:', error)
      return []
    }
  }

  /**
   * Analyze portfolio evolution over time
   */
  async analyzePortfolioEvolution(startDate: string, endDate: string): Promise<PortfolioEvolution> {
    try {
      logger.info(`Analyzing portfolio evolution from ${startDate} to ${endDate}`)

      // This would fetch historical data in a real implementation
      const sectorHistory = await this.analyzeSectorPerformance(12)
      
      const diversificationHistory = this.generateDiversificationHistory(startDate, endDate)
      const majorChanges = this.identifyMajorChanges(startDate, endDate)

      return {
        startDate,
        endDate,
        sectorHistory,
        diversificationHistory,
        majorChanges
      }
    } catch (error) {
      logger.error('Error analyzing portfolio evolution:', error)
      return {
        startDate,
        endDate,
        sectorHistory: [],
        diversificationHistory: [],
        majorChanges: []
      }
    }
  }

  // ============================================================================
  // Risk Analysis Methods
  // ============================================================================

  /**
   * Perform comprehensive risk analysis
   */
  async performRiskAnalysis(): Promise<{
    concentrationRisk: ConcentrationRisk
    correlationRisk: number
    liquidityRisk: number
    sectorSpecificRisks: Array<{
      sector: string
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      factors: string[]
    }>
  }> {
    try {
      const portfolioBalance = await this.sectorBalanceService.analyzePortfolioBalance()
      
      // Correlation risk (simplified calculation)
      const correlationRisk = this.calculateCorrelationRisk(portfolioBalance.sectorDistributions)
      
      // Liquidity risk
      const liquidityRisk = this.calculateLiquidityRisk(portfolioBalance.sectorDistributions)
      
      // Sector-specific risks
      const sectorSpecificRisks = this.assessSectorSpecificRisks(portfolioBalance.sectorDistributions)

      return {
        concentrationRisk: portfolioBalance.concentrationRisk,
        correlationRisk,
        liquidityRisk,
        sectorSpecificRisks
      }
    } catch (error) {
      logger.error('Error performing risk analysis:', error)
      throw error
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private assessDiversificationHealth(metrics: DiversificationMetrics): number {
    let score = 100

    // Penalize low sector count
    if (metrics.sectorCount < 5) {
      score -= (5 - metrics.sectorCount) * 15
    }

    // Reward high diversification ratio
    score = Math.min(score, score * metrics.diversificationRatio * 1.2)

    // Penalize high Herfindahl index (concentration)
    score -= metrics.herfindahlIndex * 50

    return Math.max(0, Math.round(score))
  }

  private assessConcentrationHealth(risk: ConcentrationRisk): number {
    const riskScores = {
      'LOW': 90,
      'MEDIUM': 70,
      'HIGH': 40,
      'CRITICAL': 10
    }

    return riskScores[risk.level]
  }

  private assessBalanceHealth(distributions: any[]): number {
    const balanced = distributions.filter(d => d.status === 'BALANCED').length
    const total = distributions.length

    if (total === 0) return 0

    const balanceRatio = balanced / total
    return Math.round(balanceRatio * 100)
  }

  private assessAllocationEfficiency(distributions: any[]): number {
    // Calculate efficiency based on how close allocations are to targets
    let totalDeviation = 0
    let count = 0

    for (const dist of distributions) {
      totalDeviation += Math.abs(dist.deviation)
      count++
    }

    if (count === 0) return 100

    const avgDeviation = totalDeviation / count
    return Math.max(0, Math.round(100 - avgDeviation * 2))
  }

  private async assessPerformanceHealth(): Promise<number> {
    // Mock performance assessment
    // In a real implementation, this would calculate actual risk-adjusted returns
    return Math.round(Math.random() * 30 + 60) // 60-90 range
  }

  private calculateStabilityScore(portfolioBalance: any): number {
    // Calculate stability based on volatility and consistency
    const criticalSectors = portfolioBalance.sectorDistributions.filter((d: any) => d.status === 'CRITICAL').length
    const overAllocated = portfolioBalance.sectorDistributions.filter((d: any) => d.status === 'OVER_ALLOCATED').length
    
    let stability = 100
    stability -= criticalSectors * 25
    stability -= overAllocated * 10

    return Math.max(0, stability)
  }

  private generateHistoricalPerformance(sector: string, months: number) {
    const history = []
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + i)

      history.push({
        date: date.toISOString().split('T')[0],
        percentage: Math.random() * 20 + 5, // 5-25% range
        value: Math.random() * 100000 + 50000, // $50k-150k range
        instrumentCount: Math.floor(Math.random() * 5) + 1,
        performance: (Math.random() - 0.5) * 20 // -10% to +10%
      })
    }

    return history
  }

  private analyzeTrends(history: any[]) {
    if (history.length < 3) {
      return {
        trend: 'STABLE' as const,
        strength: 0,
        duration: 0
      }
    }

    // Simple trend analysis
    const recent = history.slice(-3)
    const isIncreasing = recent[2].percentage > recent[1].percentage && recent[1].percentage > recent[0].percentage
    const isDecreasing = recent[2].percentage < recent[1].percentage && recent[1].percentage < recent[0].percentage

    return {
      trend: isIncreasing ? 'INCREASING' as const : isDecreasing ? 'DECREASING' as const : 'STABLE' as const,
      strength: Math.random(),
      duration: Math.floor(Math.random() * 90) + 10
    }
  }

  private calculateSectorVolatility(distribution: any): number {
    // Mock volatility calculation
    // In reality, this would be based on historical price movements
    return Math.round((Math.random() * 25 + 5) * 100) / 100
  }

  private generateDiversificationHistory(startDate: string, endDate: string) {
    const history = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    for (let i = 0; i <= days; i += 30) { // Monthly snapshots
      const date = new Date(start)
      date.setDate(date.getDate() + i)

      history.push({
        date: date.toISOString().split('T')[0],
        score: Math.round(Math.random() * 30 + 60), // 60-90 range
        sectorCount: Math.floor(Math.random() * 5) + 4, // 4-8 sectors
        concentrationRisk: Math.round(Math.random() * 60 + 20) // 20-80 range
      })
    }

    return history
  }

  private identifyMajorChanges(startDate: string, endDate: string) {
    // Mock major changes identification
    return [
      {
        date: '2024-08-01',
        type: 'MAJOR_REBALANCE' as const,
        description: 'Reduced Technology allocation from 35% to 28%',
        impact: 15
      },
      {
        date: '2024-07-15',
        type: 'SECTOR_ADDED' as const,
        description: 'Added Real Estate sector to portfolio',
        impact: 8
      }
    ]
  }

  private calculateCorrelationRisk(distributions: any[]): number {
    // Simplified correlation risk calculation
    // Higher concentration in correlated sectors = higher risk
    const techAndComm = distributions.filter(d => 
      d.sector === 'Information Technology' || d.sector === 'Communication Services'
    )
    const totalTechComm = techAndComm.reduce((sum, d) => sum + d.percentage, 0)

    if (totalTechComm > 40) return 80
    if (totalTechComm > 30) return 60
    if (totalTechComm > 20) return 40
    return 20
  }

  private calculateLiquidityRisk(distributions: any[]): number {
    // Mock liquidity risk calculation
    // Based on sector liquidity characteristics
    const liquiditySectors = {
      'Information Technology': 10,
      'Health Care': 15,
      'Financials': 12,
      'Consumer Discretionary': 18,
      'Consumer Staples': 20,
      'Industrials': 25,
      'Energy': 30,
      'Materials': 35,
      'Utilities': 40,
      'Communication Services': 15,
      'Real Estate': 45
    }

    let weightedRisk = 0
    for (const dist of distributions) {
      const sectorRisk = liquiditySectors[dist.sector as keyof typeof liquiditySectors] || 25
      weightedRisk += (dist.percentage / 100) * sectorRisk
    }

    return Math.round(weightedRisk)
  }

  private assessSectorSpecificRisks(distributions: any[]) {
    return distributions.map(dist => {
      const factors = []
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'

      // Assess based on sector characteristics
      if (dist.sector === 'Energy') {
        factors.push('Commodity price volatility')
        factors.push('Regulatory changes in renewable energy')
        riskLevel = 'MEDIUM'
      }

      if (dist.sector === 'Information Technology') {
        factors.push('Rapid technological change')
        factors.push('Interest rate sensitivity')
        riskLevel = 'MEDIUM'
      }

      if (dist.percentage > 30) {
        factors.push('Over-concentration risk')
        riskLevel = 'HIGH'
      }

      if (dist.percentage > 40) {
        riskLevel = 'CRITICAL'
      }

      return {
        sector: dist.sector,
        riskLevel,
        factors
      }
    })
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    try {
      return await this.sectorBalanceService.healthCheck()
    } catch (error) {
      logger.error('Diversification analysis service health check failed:', error)
      return false
    }
  }
}

export default DiversificationAnalysisService