import api from '../utils/api'
import type { 
  OpportunityData, 
  OpportunityStats, 
  ScannerStatus,
  DiversificationCheck,
  CommissionImpact
} from '../hooks/useOpportunities'

export interface OpportunityListResponse {
  opportunities: OpportunityData[]
  total: number
  stats?: {
    avg_score: number
    total_active: number
    by_type: Record<string, number>
  }
}

export interface DiversificationCalculationResponse {
  diversification_check: DiversificationCheck
  commission_impact: CommissionImpact
  final_recommendation: {
    action: 'PROCEED' | 'ADJUST_AMOUNT' | 'AVOID'
    suggested_amount?: number
    reasons: string[]
    risk_factors: string[]
  }
}

export interface OpportunityFilters {
  min_score?: number
  max_score?: number
  opportunity_type?: 'BUY' | 'STRONG_BUY'
  is_esg?: boolean
  is_vegan?: boolean
  sectors?: string[]
  limit?: number
  offset?: number
}

export interface ManualScanConfig {
  min_score_threshold?: number
  max_opportunities_per_day?: number
  rsi_oversold_threshold?: number
  distance_from_low_threshold?: number
  volume_spike_threshold?: number
  require_esg_compliance?: boolean
  require_vegan_friendly?: boolean
}

export interface ManualScanResult {
  opportunities_found: number
  avg_score: number
  processing_time_ms: number
  config_used: ManualScanConfig
}

class OpportunityService {
  private baseUrl = '/api/v1/opportunities'

  /**
   * Obtiene las oportunidades del día actual
   */
  async getTodaysOpportunities(limit: number = 20): Promise<OpportunityData[]> {
    try {
      const response = await api.get<{
        success: boolean
        data: OpportunityListResponse
      }>(`${this.baseUrl}/today?limit=${limit}`)
      
      if (!response.data.success) {
        throw new Error('Failed to fetch today\'s opportunities')
      }
      
      return response.data.data.opportunities
    } catch (error) {
      console.error('Error fetching today\'s opportunities:', error)
      throw new Error(`Failed to fetch today's opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene las mejores oportunidades por score
   */
  async getTopOpportunities(limit: number = 10, minScore: number = 60): Promise<OpportunityData[]> {
    try {
      const response = await api.get<{
        success: boolean
        data: OpportunityListResponse
      }>(`${this.baseUrl}/top?limit=${limit}&min_score=${minScore}`)
      
      if (!response.data.success) {
        throw new Error('Failed to fetch top opportunities')
      }
      
      return response.data.data.opportunities
    } catch (error) {
      console.error('Error fetching top opportunities:', error)
      throw new Error(`Failed to fetch top opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Busca oportunidades con filtros avanzados
   */
  async searchOpportunities(filters: OpportunityFilters): Promise<{
    opportunities: OpportunityData[]
    total: number
    page: number
    limit: number
    has_more: boolean
  }> {
    try {
      const params = new URLSearchParams()
      
      if (filters.min_score !== undefined) params.append('min_score', String(filters.min_score))
      if (filters.max_score !== undefined) params.append('max_score', String(filters.max_score))
      if (filters.opportunity_type) params.append('opportunity_type', filters.opportunity_type)
      if (filters.is_esg !== undefined) params.append('is_esg', String(filters.is_esg))
      if (filters.is_vegan !== undefined) params.append('is_vegan', String(filters.is_vegan))
      if (filters.limit !== undefined) params.append('limit', String(filters.limit))
      if (filters.offset !== undefined) params.append('offset', String(filters.offset))
      
      if (filters.sectors && filters.sectors.length > 0) {
        filters.sectors.forEach(sector => params.append('sectors', sector))
      }

      const response = await api.get<{
        success: boolean
        data: {
          opportunities: OpportunityData[]
          total: number
          page: number
          limit: number
          has_more: boolean
        }
      }>(`${this.baseUrl}/search?${params.toString()}`)
      
      if (!response.data.success) {
        throw new Error('Failed to search opportunities')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error searching opportunities:', error)
      throw new Error(`Failed to search opportunities: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene una oportunidad específica por ID
   */
  async getOpportunityById(id: number): Promise<OpportunityData> {
    try {
      const response = await api.get<{
        success: boolean
        data: OpportunityData
      }>(`${this.baseUrl}/${id}`)
      
      if (!response.data.success) {
        throw new Error('Failed to fetch opportunity')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error fetching opportunity by ID:', error)
      throw new Error(`Failed to fetch opportunity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calcula el impacto en diversificación de una nueva inversión
   */
  async calculateDiversification(
    symbol: string, 
    investmentAmount: number
  ): Promise<DiversificationCalculationResponse> {
    try {
      const response = await api.post<{
        success: boolean
        data: DiversificationCalculationResponse
      }>(`${this.baseUrl}/calculate-diversification`, {
        symbol,
        investment_amount: investmentAmount
      })
      
      if (!response.data.success) {
        throw new Error('Failed to calculate diversification')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error calculating diversification:', error)
      throw new Error(`Failed to calculate diversification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Ejecuta un scan manual de oportunidades
   */
  async runManualScan(config?: ManualScanConfig): Promise<ManualScanResult> {
    try {
      const response = await api.post<{
        success: boolean
        data: ManualScanResult
        message: string
      }>(`${this.baseUrl}/scan/manual`, config || {})
      
      if (!response.data.success) {
        throw new Error('Failed to run manual scan')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error running manual scan:', error)
      throw new Error(`Failed to run manual scan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene el estado del scanner de oportunidades
   */
  async getScannerStatus(): Promise<ScannerStatus> {
    try {
      const response = await api.get<{
        success: boolean
        data: {
          job_status: ScannerStatus
          performance_metrics: any
          opportunity_stats: OpportunityStats
        }
      }>(`${this.baseUrl}/scanner/status`)
      
      if (!response.data.success) {
        throw new Error('Failed to fetch scanner status')
      }
      
      return response.data.data.job_status
    } catch (error) {
      console.error('Error fetching scanner status:', error)
      throw new Error(`Failed to fetch scanner status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Obtiene estadísticas de oportunidades
   */
  async getOpportunityStats(): Promise<OpportunityStats> {
    try {
      const response = await api.get<{
        success: boolean
        data: {
          opportunity_stats: OpportunityStats
          scanner_performance: any
        }
      }>(`${this.baseUrl}/stats`)
      
      if (!response.data.success) {
        throw new Error('Failed to fetch opportunity stats')
      }
      
      return response.data.data.opportunity_stats
    } catch (error) {
      console.error('Error fetching opportunity stats:', error)
      throw new Error(`Failed to fetch opportunity stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Fuerza la ejecución inmediata del scanner
   */
  async forceScannerRun(): Promise<{ message: string }> {
    try {
      const response = await api.post<{
        success: boolean
        message: string
      }>(`${this.baseUrl}/scanner/force-run`, {})
      
      if (!response.data.success) {
        throw new Error('Failed to force scanner run')
      }
      
      return { message: response.data.message }
    } catch (error) {
      console.error('Error forcing scanner run:', error)
      throw new Error(`Failed to force scanner run: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Health check del sistema de oportunidades
   */
  async healthCheck(): Promise<{
    healthy: boolean
    message: string
    details?: any
  }> {
    try {
      const response = await api.get<{
        success: boolean
        healthy: boolean
        message: string
        details?: any
      }>(`${this.baseUrl}/health`)
      
      return {
        healthy: response.data.healthy,
        message: response.data.message,
        details: response.data.details
      }
    } catch (error) {
      console.error('Error in health check:', error)
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Transforma datos de oportunidad para mostrar en UI
   */
  transformOpportunityForUI(opportunity: OpportunityData) {
    return {
      ...opportunity,
      scoreColor: this.getScoreColor(opportunity.composite_score),
      typeColor: this.getTypeColor(opportunity.opportunity_type),
      riskLevel: this.getRiskLevel(opportunity.risk_assessment.volatility),
      timeHorizonText: this.getTimeHorizonText(opportunity.expected_return.time_horizon_days),
      formattedPrice: this.formatCurrency(opportunity.market_data.current_price),
      formattedTargetPrice: this.formatCurrency(opportunity.expected_return.target_price),
      formattedMarketCap: this.formatMarketCap(opportunity.market_data.market_cap),
      detectedTimeAgo: this.getTimeAgo(opportunity.detected_at),
      expiresTimeLeft: this.getTimeLeft(opportunity.expires_at)
    }
  }

  private getScoreColor(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 70) return 'text-blue-600 bg-blue-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-gray-600 bg-gray-50'
  }

  private getTypeColor(type: 'BUY' | 'STRONG_BUY'): string {
    return type === 'STRONG_BUY' ? 'text-green-700 bg-green-100' : 'text-blue-700 bg-blue-100'
  }

  private getRiskLevel(volatility: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (volatility < 20) return 'LOW'
    if (volatility < 40) return 'MEDIUM'
    return 'HIGH'
  }

  private getTimeHorizonText(days: number): string {
    if (days <= 30) return `${days} días`
    if (days <= 90) return `${Math.round(days / 30)} meses`
    return `${Math.round(days / 365 * 10) / 10} años`
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  private formatMarketCap(marketCap?: number): string {
    if (!marketCap) return 'N/A'
    
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`
    return `$${marketCap.toLocaleString()}`
  }

  private getTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffHours < 1) {
      return `hace ${diffMinutes} min`
    } else if (diffHours < 24) {
      return `hace ${diffHours}h`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `hace ${diffDays}d`
    }
  }

  private getTimeLeft(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    
    if (diffMs <= 0) return 'Expirada'
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays}d restantes`
    } else if (diffHours > 0) {
      return `${diffHours}h restantes`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes}m restantes`
    }
  }
}

// Export singleton instance
export const opportunityService = new OpportunityService()