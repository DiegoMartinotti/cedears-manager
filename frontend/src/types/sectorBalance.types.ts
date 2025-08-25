/**
 * TypeScript types for Sector Balance Analysis System (Frontend)
 * Shared interfaces between frontend and backend
 */

// Re-export backend types that are needed in frontend
export interface SectorDistribution {
  sector: string
  percentage: number
  totalValue: number
  instrumentCount: number
  instruments: InstrumentSectorSummary[]
  targetPercentage: number
  deviation: number
  status: 'BALANCED' | 'OVER_ALLOCATED' | 'UNDER_ALLOCATED' | 'CRITICAL'
}

export interface InstrumentSectorSummary {
  id: number
  symbol: string
  companyName: string
  currentValue: number
  percentage: number
  sectorPercentage: number
  classification: SectorClassification
}

export interface SectorClassification {
  id?: number
  instrumentId: number
  gicsSector: string
  gicsIndustryGroup?: string
  gicsIndustry?: string
  gicsSubIndustry?: string
  lastUpdated: string
  source: 'AUTO' | 'MANUAL' | 'YAHOO' | 'EXTERNAL'
  confidenceScore: number
  createdAt?: string
  updatedAt?: string
}

export interface SectorBalanceOverview {
  totalPortfolioValue: number
  sectorCount: number
  balancedSectorCount: number
  alertCount: number
  diversificationScore: number
  lastAnalysis: string
  sectorDistributions: SectorDistribution[]
  alerts: ConcentrationAlert[]
  suggestions: RebalancingSuggestion[]
}

export interface ConcentrationAlert {
  id?: number
  sector: string
  alertType: 'OVER_CONCENTRATION' | 'UNDER_DIVERSIFIED' | 'SECTOR_DEVIATION' | 'REBALANCE_NEEDED'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  currentPercentage: number
  thresholdPercentage: number
  message: string
  actionRequired?: string
  isActive: boolean
  isAcknowledged: boolean
  acknowledgedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface RebalancingSuggestion {
  id?: number
  analysisDate: string
  sector: string
  action: 'REDUCE' | 'INCREASE' | 'MAINTAIN'
  currentAllocation: number
  suggestedAllocation: number
  amountToAdjust: number
  suggestedInstruments: string[]
  reasoning?: string
  priority: number
  impactScore: number
  isImplemented: boolean
  implementedAt?: string
  createdAt?: string
}

export interface RebalanceRecommendation {
  sector: string
  currentAllocation: number
  targetAllocation: number
  action: 'REDUCE' | 'INCREASE' | 'MAINTAIN'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  amountToAdjust: number
  percentageChange: number
  suggestedActions: SuggestedAction[]
  reasoning: string
  impact: RebalanceImpact
}

export interface SuggestedAction {
  type: 'BUY' | 'SELL' | 'HOLD'
  instrumentId: number
  symbol: string
  companyName: string
  currentValue: number
  suggestedAmount: number
  expectedImpact: number
  reasoning: string
}

export interface RebalanceImpact {
  diversificationImprovement: number
  riskReduction: number
  expectedCosts: number
  timeToComplete: number
  priority: number
}

export interface BalanceHealthScore {
  overall: number
  diversification: number
  concentration: number
  balance: number
  stability: number
  factors: {
    name: string
    score: number
    weight: number
    description: string
  }[]
}

export interface SectorStats {
  sector: string
  instrumentCount: number
  totalValue: number
  percentage: number
  avgInstrumentValue: number
  largestPosition: number
  smallestPosition: number
  volatility: number
  performance: {
    daily: number
    weekly: number
    monthly: number
    quarterly: number
    yearly: number
  }
}

export interface ConcentrationRisk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number
  topConcentrations: {
    sector: string
    percentage: number
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }[]
  riskFactors: string[]
}

export interface DiversificationMetrics {
  sectorCount: number
  effectiveSectors: number
  giniCoefficient: number
  herfindahlIndex: number
  diversificationRatio: number
  score: number
}

export interface RiskAnalysis {
  concentrationRisk: ConcentrationRisk
  correlationRisk: number
  liquidityRisk: number
  sectorSpecificRisks: Array<{
    sector: string
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    factors: string[]
  }>
}

// API Response types
export interface SectorBalanceResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface ApiError {
  success: false
  error: string
  details?: any
  timestamp: string
}

// UI-specific types
export interface SectorCardData {
  sector: string
  percentage: number
  targetPercentage: number
  status: 'BALANCED' | 'OVER_ALLOCATED' | 'UNDER_ALLOCATED' | 'CRITICAL'
  deviation: number
  instrumentCount: number
  totalValue: number
  trend: 'UP' | 'DOWN' | 'STABLE'
  color: string
}

export interface AlertCardData {
  id: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  sector: string
  actionRequired?: string
  timestamp: string
  isAcknowledged: boolean
}

export interface RecommendationCardData {
  id: string
  sector: string
  action: 'REDUCE' | 'INCREASE' | 'MAINTAIN'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  currentAllocation: number
  targetAllocation: number
  reasoning: string
  expectedImpact: number
  estimatedCost: number
}

// Chart data types
export interface PieChartData {
  name: string
  value: number
  percentage: number
  color: string
  status: 'BALANCED' | 'OVER_ALLOCATED' | 'UNDER_ALLOCATED' | 'CRITICAL'
}

export interface BarChartData {
  sector: string
  current: number
  target: number
  deviation: number
  status: string
}

export interface TrendChartData {
  date: string
  diversificationScore: number
  concentrationRisk: number
  sectorCount: number
}

// Filter and search types
export interface SectorFilters {
  sectors?: string[]
  status?: ('BALANCED' | 'OVER_ALLOCATED' | 'UNDER_ALLOCATED' | 'CRITICAL')[]
  minPercentage?: number
  maxPercentage?: number
  sortBy?: 'percentage' | 'deviation' | 'instrumentCount' | 'totalValue'
  sortOrder?: 'asc' | 'desc'
}

export interface AlertFilters {
  severity?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[]
  sectors?: string[]
  acknowledged?: boolean
  dateRange?: {
    from: string
    to: string
  }
}

// Component props types
export interface SectorDistributionChartProps {
  data: SectorDistribution[]
  width?: number
  height?: number
  showLabels?: boolean
  interactive?: boolean
}

export interface ConcentrationAlertsProps {
  alerts: ConcentrationAlert[]
  onAcknowledge?: (alertId: number) => void
  onFilter?: (filters: AlertFilters) => void
  maxItems?: number
}

export interface RebalancingSuggestionsProps {
  suggestions: RebalancingSuggestion[]
  onImplement?: (suggestionId: number) => void
  onSimulate?: (suggestion: RebalancingSuggestion) => void
  maxItems?: number
}

export interface HealthScoreProps {
  healthScore: BalanceHealthScore
  showDetails?: boolean
  compact?: boolean
}

// Constants
export const SECTOR_COLORS = {
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
} as const

export const ALERT_SEVERITY_COLORS = {
  'LOW': '#22c55e',
  'MEDIUM': '#f59e0b',
  'HIGH': '#f97316',
  'CRITICAL': '#ef4444'
} as const

export const STATUS_COLORS = {
  'BALANCED': '#22c55e',
  'OVER_ALLOCATED': '#f59e0b',
  'UNDER_ALLOCATED': '#3b82f6',
  'CRITICAL': '#ef4444'
} as const