export interface OpportunitySignal {
  signal: 'BUY' | 'SELL' | 'HOLD'
  strength: number // 0-100
  weight: number // Factor de peso en el score compuesto
  confidence?: number // 0-100
}

export interface TechnicalSignals {
  rsi: OpportunitySignal & {
    value: number
    oversoldThreshold: number
  }
  sma: OpportunitySignal & {
    crossover?: boolean
    sma20: number
    sma50: number
    sma200: number
  }
  distance_from_low: OpportunitySignal & {
    percentage: number
    yearLow: number
    currentPrice: number
  }
  volume_relative: OpportunitySignal & {
    ratio: number // Volumen actual / Volumen promedio
    avgVolume: number
    currentVolume: number
  }
  macd: OpportunitySignal & {
    histogram: number
    line: number
    signalLine: number
  }
}

export interface MarketData {
  current_price: number
  year_high: number
  year_low: number
  volume_avg: number
  volume_current: number
  market_cap?: number
  price_change_24h?: number
  price_change_percentage_24h?: number
}

export interface ESGCriteria {
  is_esg_compliant: boolean
  is_vegan_friendly: boolean
  esg_score?: number
  sustainability_rating?: string
}

export interface RiskAssessment {
  volatility: number // Volatilidad histórica 30 días
  sector_concentration: number // % que representa en el sector
  diversification_impact: number // Impacto en diversificación de cartera
  beta?: number // Beta vs mercado
  sharpe_ratio?: number
}

export interface ExpectedReturn {
  target_price: number
  upside_percentage: number
  time_horizon_days: number
  confidence_level: number // 0-100
  risk_adjusted_return?: number
}

export interface OpportunityScoring {
  composite_score: number // 0-100 score final
  components: {
    technical: number // Score técnico (0-100)
    fundamental: number // Score fundamental (0-100)
    sentiment: number // Score de sentimiento (0-100)
    risk: number // Score de riesgo (0-100)
  }
  weights: {
    technical: number
    fundamental: number
    sentiment: number
    risk: number
  }
}

export interface DiversificationCheck {
  current_portfolio_value: number
  proposed_investment: number
  concentration_percentage: number
  sector_concentration: number
  max_allowed_concentration: number
  is_within_limits: boolean
  recommendation: {
    suggested_amount?: number
    reason: string
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  }
}

export interface CommissionImpact {
  operation_commission: number
  custody_monthly: number
  total_first_year: number
  break_even_percentage: number
  net_upside_after_costs: number
  is_profitable: boolean
}

export interface OpportunityDetectionConfig {
  min_score_threshold: number
  max_opportunities_per_day: number
  rsi_oversold_threshold: number
  distance_from_low_threshold: number
  volume_spike_threshold: number
  exclude_penny_stocks: boolean
  min_market_cap?: number
  max_volatility?: number
  require_esg_compliance?: boolean
  require_vegan_friendly?: boolean
  excluded_sectors?: string[]
}

export interface OpportunityBacktest {
  opportunity_id: number
  detection_date: string
  follow_up_dates: string[]
  performance: {
    [days: string]: {
      price: number
      return_percentage: number
      was_profitable: boolean
    }
  }
  accuracy_score: number
}

// Enums para mejor type safety
export enum OpportunityType {
  BUY = 'BUY',
  STRONG_BUY = 'STRONG_BUY'
}

export enum OpportunitySource {
  TECHNICAL_ANALYSIS = 'TECHNICAL_ANALYSIS',
  FUNDAMENTAL_ANALYSIS = 'FUNDAMENTAL_ANALYSIS',
  NEWS_SENTIMENT = 'NEWS_SENTIMENT',
  INSIDER_TRADING = 'INSIDER_TRADING',
  EARNINGS_SURPRISE = 'EARNINGS_SURPRISE'
}

export enum SignalStrength {
  WEAK = 'WEAK',
  MODERATE = 'MODERATE',
  STRONG = 'STRONG',
  VERY_STRONG = 'VERY_STRONG'
}

// Interfaces para requests/responses de API
export interface CreateOpportunityRequest {
  symbol: string
  instrument_id: number
  opportunity_type: OpportunityType
  technical_signals: TechnicalSignals
  market_data: MarketData
  esg_criteria: ESGCriteria
  risk_assessment: RiskAssessment
  expected_return: ExpectedReturn
}

export interface OpportunityListResponse {
  opportunities: OpportunityData[]
  total: number
  page: number
  limit: number
  has_more: boolean
  stats: {
    avg_score: number
    total_active: number
    by_type: Record<string, number>
  }
}

export interface DiversificationCalculationRequest {
  symbol: string
  investment_amount: number
  current_portfolio_value: number
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

export interface OpportunityFilterRequest {
  min_score?: number
  max_score?: number
  opportunity_type?: OpportunityType[]
  is_esg?: boolean
  is_vegan?: boolean
  sectors?: string[]
  max_risk_level?: number
  min_upside?: number
  limit?: number
  offset?: number
}

// Re-export del modelo principal
export type { OpportunityData, OpportunityCreateInput, OpportunityFilters } from '../models/Opportunity.js'