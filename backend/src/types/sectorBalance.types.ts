/**
 * TypeScript types for Sector Balance Analysis System
 * Defines all interfaces and types used in the sector balancing functionality
 */

// ============================================================================
// Core Sector Classification Types
// ============================================================================

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

export interface SectorBalanceTarget {
  id?: number
  sector: string
  targetPercentage: number
  minPercentage: number
  maxPercentage: number
  priority: number // 1 = highest priority, 5 = lowest
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// ============================================================================
// Balance Analysis Types
// ============================================================================

export interface SectorBalanceAnalysis {
  id?: number
  analysisDate: string
  sector: string
  currentPercentage: number
  targetPercentage: number
  deviation: number
  recommendation?: string
  actionRequired?: 'MAINTAIN' | 'REDUCE' | 'INCREASE' | 'REBALANCE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  totalValue: number
  instrumentCount: number
  createdAt?: string
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
  suggestedInstruments: string[] // JSON array of instrument symbols
  reasoning?: string
  priority: number
  impactScore: number
  isImplemented: boolean
  implementedAt?: string
  createdAt?: string
}

// ============================================================================
// Analysis Result Types
// ============================================================================

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
  sectorPercentage: number // percentage within the sector
  classification: SectorClassification
}

export interface SectorBalanceOverview {
  totalPortfolioValue: number
  sectorCount: number
  balancedSectorCount: number
  alertCount: number
  diversificationScore: number // 0-100 score
  lastAnalysis: string
  sectorDistributions: SectorDistribution[]
  alerts: ConcentrationAlert[]
  suggestions: RebalancingSuggestion[]
}

// ============================================================================
// Portfolio Analysis Types
// ============================================================================

export interface PortfolioBalance {
  totalValue: number
  sectorDistributions: SectorDistribution[]
  concentrationRisk: ConcentrationRisk
  diversificationMetrics: DiversificationMetrics
  rebalanceNeeded: boolean
  lastUpdated: string
}

export interface ConcentrationRisk {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  score: number // 0-100, higher is riskier
  topConcentrations: {
    sector: string
    percentage: number
    risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }[]
  riskFactors: string[]
}

export interface DiversificationMetrics {
  sectorCount: number
  effectiveSectors: number // sectors with meaningful allocation
  giniCoefficient: number // 0-1, higher is less diversified
  herfindahlIndex: number // concentration index
  diversificationRatio: number // 0-1, higher is better diversified
  score: number // 0-100 overall diversification score
}

// ============================================================================
// Rebalancing Types
// ============================================================================

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
  diversificationImprovement: number // change in diversification score
  riskReduction: number // change in concentration risk
  expectedCosts: number // transaction costs
  timeToComplete: number // estimated days
  priority: number
}

// ============================================================================
// Simulation Types
// ============================================================================

export interface RebalanceSimulation {
  currentState: PortfolioBalance
  proposedState: PortfolioBalance
  changes: RebalanceChange[]
  metrics: SimulationMetrics
  costs: TransactionCosts
}

export interface RebalanceChange {
  instrumentId: number
  symbol: string
  sector: string
  action: 'BUY' | 'SELL' | 'HOLD'
  currentValue: number
  proposedValue: number
  changeAmount: number
  changePercentage: number
}

export interface SimulationMetrics {
  diversificationImprovement: number
  riskReduction: number
  portfolioOptimization: number
  expectedReturn: number
  volatilityChange: number
}

export interface TransactionCosts {
  totalCommissions: number
  tradingFees: number
  impactCosts: number
  totalCosts: number
  costAsPercentage: number
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SectorBalanceConfig {
  maxConcentration: number // Maximum percentage in single sector
  minSectorCount: number // Minimum number of sectors
  warningThreshold: number // Warning when sector exceeds this %
  criticalThreshold: number // Critical alert threshold
  rebalanceThreshold: number // Minimum deviation to trigger rebalance
  autoRebalance: boolean // Enable automatic rebalancing
  rebalanceFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY'
  minimumTradeSize: number // Minimum trade amount for rebalancing
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface SectorBalanceRequest {
  includeHistorical?: boolean
  includeSuggestions?: boolean
  includeAlerts?: boolean
  sectorFilter?: string[]
  dateRange?: {
    from: string
    to: string
  }
}

export interface SectorAnalysisResponse {
  success: boolean
  data: SectorBalanceOverview
  message?: string
  timestamp: string
}

export interface RebalanceSimulationRequest {
  targetAllocations: Record<string, number> // sector -> percentage
  maxTransactionCost?: number
  minTradeSize?: number
  excludeInstruments?: number[]
}

export interface RebalanceSimulationResponse {
  success: boolean
  data: RebalanceSimulation
  message?: string
  timestamp: string
}

// ============================================================================
// Historical Analysis Types
// ============================================================================

export interface SectorPerformanceHistory {
  sector: string
  history: {
    date: string
    percentage: number
    value: number
    instrumentCount: number
    performance: number // sector performance vs benchmark
  }[]
  trends: {
    trend: 'INCREASING' | 'DECREASING' | 'STABLE'
    strength: number // 0-1
    duration: number // days
  }
}

export interface PortfolioEvolution {
  startDate: string
  endDate: string
  sectorHistory: SectorPerformanceHistory[]
  diversificationHistory: {
    date: string
    score: number
    sectorCount: number
    concentrationRisk: number
  }[]
  majorChanges: {
    date: string
    type: 'SECTOR_ADDED' | 'SECTOR_REMOVED' | 'MAJOR_REBALANCE'
    description: string
    impact: number
  }[]
}

// ============================================================================
// Job and Processing Types
// ============================================================================

export interface SectorAnalysisJob {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startTime: string
  endTime?: string
  processedInstruments: number
  totalInstruments: number
  alertsGenerated: number
  suggestionsCreated: number
  errors: string[]
}

export interface ClassificationUpdate {
  instrumentId: number
  oldSector?: string
  newSector: string
  confidence: number
  source: string
  reason: string
}

// ============================================================================
// Utility Types
// ============================================================================

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

export interface BalanceHealthScore {
  overall: number // 0-100
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

