export interface EarningsData {
  symbol: string
  fiscalDateEnding: string
  reportedDate: string
  reportedEPS: number
  estimatedEPS: number
  surprise: number
  surprisePercentage: number
  revenue: number
  estimatedRevenue?: number
  revenueSurprise?: number
  revenueSurprisePercentage?: number
}

export interface EarningsAnalysisResult {
  earningsData: EarningsData
  analysis: {
    epsAnalysis: {
      beat: boolean
      miss: boolean
      inline: boolean
      magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
      description: string
    }
    revenueAnalysis?: {
      beat: boolean
      miss: boolean
      inline: boolean
      magnitude: 'SMALL' | 'MODERATE' | 'LARGE'
      description: string
    }
    overallAssessment: 'STRONG_BEAT' | 'BEAT' | 'MIXED' | 'MISS' | 'STRONG_MISS'
    keyMetrics: {
      metric: string
      value: string
      assessment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    }[]
    priceImpact: {
      expectedDirection: 'UP' | 'DOWN' | 'NEUTRAL'
      magnitude: number // porcentaje esperado
      confidence: number // 0-100
      timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM'
    }
    claudeAnalysis?: {
      analysis: string
      keyPoints: string[]
      risks: string[]
      opportunities: string[]
      outlook: string
      confidence: number
    }
  }
  historicalContext: {
    consecutiveBeats: number
    consecutiveMisses: number
    avgSurpriseLastQuarters: number
    volatilityAfterEarnings: number
  }
  competitorComparison?: {
    symbol: string
    epsGrowth: number
    revenueGrowth: number
    relative: 'OUTPERFORM' | 'INLINE' | 'UNDERPERFORM'
  }[]
}

export interface EarningsCalendarEntry {
  symbol: string
  companyName: string
  reportDate: string
  fiscalQuarter: string
  estimatedEPS?: number
  estimatedRevenue?: number
  marketCap?: number
  sector?: string
  importance: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface EarningsAnalysisOptions {
  useCache?: boolean
  cacheTTLMinutes?: number
  includeHistorical?: boolean
  includeCompetitors?: boolean
  analyzeWithClaude?: boolean
  includeGuidance?: boolean
}
