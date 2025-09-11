export interface TrendPrediction {
  symbol: string
  timeframe: '1W' | '1M' | '3M' | '6M' | '1Y'
  prediction: {
    direction: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
    confidence: number
    strength: 'WEAK' | 'MODERATE' | 'STRONG'
    priceTarget?: {
      low: number
      high: number
      target: number
    }
    probability: {
      bullish: number
      bearish: number
      sideways: number
    }
  }
  analysis: {
    technicalScore: number
    fundamentalScore: number
    sentimentScore: number
    newsScore: number
    overallScore: number
    keyFactors: {
      factor: string
      impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
      weight: number
      description: string
    }[]
    risks: string[]
    catalysts: string[]
  }
  scenarios: {
    name: string
    probability: number
    description: string
    priceImpact: number
    timeToImpact: string
  }[]
  lastUpdated: Date
  claudeAnalysis?: {
    reasoning: string
    keyInsights: string[]
    monitoringPoints: string[]
    confidence: number
  }
}

export interface TrendPredictionOptions {
  useCache?: boolean
  cacheTTLMinutes?: number
  includeScenarios?: boolean
  analyzeWithClaude?: boolean
  includeNews?: boolean
  includeSentiment?: boolean
  includeEarnings?: boolean
}

export interface MultiSymbolTrendAnalysis {
  [symbol: string]: TrendPrediction
}

export interface PortfolioTrendAnalysis {
  overallTrend: 'BULLISH' | 'BEARISH' | 'MIXED'
  confidence: number
  bullishSymbols: string[]
  bearishSymbols: string[]
  neutralSymbols: string[]
  keyThemes: string[]
  risks: string[]
  opportunities: string[]
  recommendedActions: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' | 'ADD'
    symbol: string
    reason: string
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  }[]
}
