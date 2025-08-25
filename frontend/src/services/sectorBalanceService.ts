import apiClient from './api'
import type {
  SectorBalanceOverview,
  SectorDistribution,
  RebalanceRecommendation,
  ConcentrationAlert,
  BalanceHealthScore,
  SectorStats,
  RiskAnalysis,
  SectorClassification,
  SectorBalanceResponse
} from '../types/sectorBalance.types'

class SectorBalanceService {
  private baseUrl = '/sector-balance'

  // ============================================================================
  // Overview and Analysis
  // ============================================================================

  /**
   * Get complete sector balance overview
   */
  async getOverview(): Promise<SectorBalanceOverview> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<SectorBalanceOverview>>(`${this.baseUrl}/overview`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching sector balance overview:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get current sector distribution
   */
  async getDistribution(): Promise<SectorDistribution[]> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<SectorDistribution[]>>(`${this.baseUrl}/distribution`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching sector distribution:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Run sector analysis
   */
  async runAnalysis(): Promise<{
    analysisDate: string
    alertsGenerated: number
    suggestionsCreated: number
    sectorsAnalyzed: number
    issues: string[]
  }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/analyze`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error running sector analysis:', error)
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  /**
   * Get rebalancing recommendations
   */
  async getRecommendations(): Promise<RebalanceRecommendation[]> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<RebalanceRecommendation[]>>(`${this.baseUrl}/recommendations`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching recommendations:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Simulate rebalancing scenario
   */
  async simulateRebalance(params: {
    targetAllocations: Record<string, number>
    maxTransactionCost?: number
    minTradeSize?: number
    excludeInstruments?: number[]
  }): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/simulate`, params)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating rebalance:', error)
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // Alerts Management
  // ============================================================================

  /**
   * Get concentration alerts
   */
  async getAlerts(severity?: string): Promise<ConcentrationAlert[]> {
    try {
      const params = severity ? { severity } : {}
      const response = await apiClient.get<SectorBalanceResponse<ConcentrationAlert[]>>(`${this.baseUrl}/alerts`, { params })
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching alerts:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: number): Promise<ConcentrationAlert> {
    try {
      const response = await apiClient.put<SectorBalanceResponse<ConcentrationAlert>>(`${this.baseUrl}/alerts/${alertId}/acknowledge`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error acknowledging alert:', error)
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // Advanced Analysis
  // ============================================================================

  /**
   * Get portfolio health score
   */
  async getHealthScore(): Promise<BalanceHealthScore> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<BalanceHealthScore>>(`${this.baseUrl}/health-score`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching health score:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get sector statistics
   */
  async getSectorStats(): Promise<SectorStats[]> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<SectorStats[]>>(`${this.baseUrl}/sector-stats`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching sector stats:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get risk analysis
   */
  async getRiskAnalysis(): Promise<RiskAnalysis> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<RiskAnalysis>>(`${this.baseUrl}/risk-analysis`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching risk analysis:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get sector performance analysis
   */
  async getPerformanceAnalysis(months: number = 12): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/performance/${months}`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching performance analysis:', error)
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // Classification Management
  // ============================================================================

  /**
   * Get sector classifications
   */
  async getClassifications(params?: {
    sector?: string
    source?: string
    minConfidence?: number
    limit?: number
    offset?: number
  }): Promise<SectorClassification[]> {
    try {
      const response = await apiClient.get<SectorBalanceResponse<SectorClassification[]>>(`${this.baseUrl}/classifications`, { params })
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching classifications:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Classify instruments
   */
  async classifyInstruments(params?: {
    instrumentIds?: number[]
    force?: boolean
  }): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/classify`, params)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error classifying instruments:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get classification quality report
   */
  async getClassificationQuality(): Promise<any> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/classification-quality`)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching classification quality:', error)
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get sector balance targets
   */
  async getTargets(activeOnly: boolean = true): Promise<any[]> {
    try {
      const params = { activeOnly }
      const response = await apiClient.get(`${this.baseUrl}/targets`, { params })
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching targets:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Update sector balance target
   */
  async updateTarget(targetId: number, data: any): Promise<any> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/targets/${targetId}`, data)
      return response.data.data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error updating target:', error)
      throw this.handleError(error)
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/health`)
      return response.data.success
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Health check failed:', error)
      return false
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error)
    }
    if (error.message) {
      return new Error(error.message)
    }
    return new Error('An unexpected error occurred')
  }

  // ============================================================================
  // Data Transformation Helpers
  // ============================================================================

  /**
   * Transform sector distribution for charts
   */
  transformForPieChart(distributions: SectorDistribution[]) {
    return distributions.map(dist => ({
      name: dist.sector,
      value: dist.percentage,
      totalValue: dist.totalValue,
      instrumentCount: dist.instrumentCount,
      status: dist.status,
      color: this.getSectorColor(dist.sector)
    }))
  }

  /**
   * Transform for bar chart comparison
   */
  transformForBarChart(distributions: SectorDistribution[]) {
    return distributions.map(dist => ({
      sector: dist.sector.replace(/\s+/g, '\n'), // Line breaks for long names
      current: dist.percentage,
      target: dist.targetPercentage,
      deviation: dist.deviation,
      status: dist.status
    }))
  }

  /**
   * Get color for sector
   */
  private getSectorColor(sector: string): string {
    const colors: Record<string, string> = {
      'Energy': '#FF6B35',
      'Materials': '#8B4513',
      'Industrials': '#4682B4',
      'Consumer Discretionary': '#32CD32',
      'Consumer Staples': '#9ACD32',
      'Health Care': '#FF69B4',
      'Financials': '#1E90FF',
      'Information Technology': '#9370DB',
      'Communication Services': '#FF4500',
      'Utilities': '#228B22',
      'Real Estate': '#DAA520'
    }
    
    return colors[sector] || '#6B7280'
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
  }

  /**
   * Format currency value
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'BALANCED': '#22c55e',
      'OVER_ALLOCATED': '#f59e0b',
      'UNDER_ALLOCATED': '#3b82f6',
      'CRITICAL': '#ef4444'
    }
    
    return colors[status] || '#6b7280'
  }

  /**
   * Get alert severity color
   */
  getAlertSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      'LOW': '#22c55e',
      'MEDIUM': '#f59e0b',
      'HIGH': '#f97316',
      'CRITICAL': '#ef4444'
    }
    
    return colors[severity] || '#6b7280'
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(current: number, previous: number): 'UP' | 'DOWN' | 'STABLE' {
    const threshold = 0.1 // 0.1% threshold for stability
    const diff = current - previous
    
    if (Math.abs(diff) < threshold) return 'STABLE'
    return diff > 0 ? 'UP' : 'DOWN'
  }

  /**
   * Get recommendation priority icon
   */
  getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'LOW': '🔵',
      'MEDIUM': '🟡',
      'HIGH': '🟠',
      'CRITICAL': '🔴'
    }
    
    return icons[priority] || '⚪'
  }
}

export default new SectorBalanceService()