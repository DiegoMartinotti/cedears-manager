export interface DashboardSummary {
  portfolioSummary: PortfolioSummary
  recentPositions: CurrentPosition[]
  marketSummary: MarketSummary
  performanceMetrics: PerformanceMetrics
  notifications: NotificationItem[]
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  unrealizedPnL: number
  unrealizedPnLPercentage: number
  totalPositions: number
  dayChange: number
  dayChangePercentage: number
  inflationAdjustedValue?: number
  inflationAdjustedReturn?: number
  totalCommissions?: number
  estimatedCustodyFee?: number
  commissionImpact?: number
}

export interface CurrentPosition {
  id: number
  symbol: string
  companyName: string
  quantity: number
  averageCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercentage: number
  weightPercentage: number
  isESGCompliant: boolean
  isVeganFriendly: boolean
  dayChange?: number
  dayChangePercentage?: number
}

export interface MarketSummary {
  isMarketOpen: boolean
  lastUpdateTime: Date
  topMovers: {
    gainers: MarketMover[]
    losers: MarketMover[]
  }
  sectorPerformance: SectorPerformance[]
  uvaValue?: number
  uvaLastUpdate?: Date
}

export interface MarketMover {
  symbol: string
  companyName: string
  price: number
  change: number
  changePercentage: number
  volume?: number
}

export interface SectorPerformance {
  sector: string
  averageChange: number
  averageChangePercentage: number
  positionsCount: number
  totalValue: number
}

export interface PerformanceMetrics {
  totalReturn: number
  totalReturnPercentage: number
  annualizedReturn: number
  bestPerformer: {
    symbol: string
    return: number
    returnPercentage: number
  }
  worstPerformer: {
    symbol: string
    return: number
    returnPercentage: number
  }
  diversificationScore: number
  riskMetrics: {
    concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    maxPositionWeight: number
    activePositions: number
  }
}

export interface DistributionData {
  byAsset: AssetDistribution[]
  bySector: SectorDistribution[]
  byESGStatus: ESGDistribution[]
}

export interface AssetDistribution {
  symbol: string
  companyName: string
  value: number
  percentage: number
  color?: string
}

export interface SectorDistribution {
  sector: string
  value: number
  percentage: number
  positionsCount: number
  color?: string
}

export interface NotificationItem {
  id: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export interface ESGDistribution {
  category: 'ESG' | 'Vegano' | 'Convencional' | 'No clasificado'
  value: number
  percentage: number
  positionsCount: number
  color?: string
}
