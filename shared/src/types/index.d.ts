export interface CEDEAR {
    id: string;
    symbol: string;
    name: string;
    underlyingSymbol: string;
    ratio: number;
    currency: 'USD' | 'ARS';
    isESG: boolean;
    isVegan: boolean;
    sector: string;
    exchange: 'BYMA' | 'NYSE' | 'NASDAQ';
    createdAt: Date;
    updatedAt: Date;
}
export interface Instrument {
    id?: number;
    symbol: string;
    company_name: string;
    sector?: string;
    industry?: string;
    market_cap?: number;
    is_esg_compliant?: boolean;
    is_vegan_friendly?: boolean;
    underlying_symbol?: string;
    underlying_currency?: string;
    ratio?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}
export interface InstrumentUI {
    id: number;
    symbol: string;
    companyName: string;
    sector?: string;
    industry?: string;
    marketCap?: number;
    isESGCompliant: boolean;
    isVeganFriendly: boolean;
    underlyingSymbol?: string;
    underlyingCurrency: string;
    ratio: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface InstrumentFilters {
    isActive?: boolean;
    isESG?: boolean;
    isVegan?: boolean;
    sector?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
export interface BulkInstrumentData {
    instruments: Omit<Instrument, 'id' | 'created_at' | 'updated_at'>[];
}
export interface Quote {
    id: string;
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap?: number;
    pe?: number;
    dividend?: number;
    timestamp: Date;
}
export interface Trade {
    id: string;
    cedearId: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    commission: number;
    total: number;
    date: Date;
    notes?: string;
}
export interface Portfolio {
    id: string;
    userId: string;
    name: string;
    trades: Trade[];
    totalValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface FinancialGoal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: Date;
    category: 'retirement' | 'education' | 'house' | 'vacation' | 'emergency' | 'other';
    priority: 'low' | 'medium' | 'high';
    isCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CommissionConfig {
    id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'tiered';
    value: number;
    minAmount?: number;
    maxAmount?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface TechnicalIndicator {
    symbol: string;
    indicator: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BB' | 'STOCH';
    value: number;
    signal: 'BUY' | 'SELL' | 'HOLD';
    strength: number;
    timestamp: Date;
}
export interface ClaudeAnalysis {
    id: string;
    symbol: string;
    prompt: string;
    response: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    keyPoints: string[];
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    timestamp: Date;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
        details?: any;
    };
    timestamp: Date;
}
export interface PaginatedResponse<T = any> extends ApiResponse<T> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface MarketData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap?: number;
    pe?: number;
    eps?: number;
    dividend?: number;
    beta?: number;
    week52High?: number;
    week52Low?: number;
    avgVolume?: number;
    timestamp: Date;
}
export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    url: string;
    source: string;
    publishedAt: Date;
    sentiment?: 'positive' | 'negative' | 'neutral';
    relevantSymbols: string[];
}
export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    language: 'es' | 'en';
    currency: 'ARS' | 'USD';
    notifications: {
        priceAlerts: boolean;
        goalProgress: boolean;
        technicalSignals: boolean;
    };
    defaultCommission: string;
    refreshInterval: number;
    autoAnalysis: boolean;
}
export interface Notification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    isRead: boolean;
    actionUrl?: string;
    createdAt: Date;
}
export interface DatabaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface AppError {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
}
export interface DashboardSummary {
    portfolioSummary: PortfolioSummary;
    recentPositions: CurrentPosition[];
    marketSummary: MarketSummary;
    performanceMetrics: PerformanceMetrics;
    notifications: Notification[];
}
export interface PortfolioSummary {
    totalValue: number;
    totalCost: number;
    unrealizedPnL: number;
    unrealizedPnLPercentage: number;
    totalPositions: number;
    dayChange: number;
    dayChangePercentage: number;
    inflationAdjustedValue?: number;
    inflationAdjustedReturn?: number;
}
export interface CurrentPosition {
    id: number;
    symbol: string;
    companyName: string;
    quantity: number;
    averageCost: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercentage: number;
    weightPercentage: number;
    isESGCompliant: boolean;
    isVeganFriendly: boolean;
    dayChange?: number;
    dayChangePercentage?: number;
}
export interface MarketSummary {
    isMarketOpen: boolean;
    lastUpdateTime: Date;
    topMovers: {
        gainers: MarketMover[];
        losers: MarketMover[];
    };
    sectorPerformance: SectorPerformance[];
    uvaValue?: number;
    uvaLastUpdate?: Date;
}
export interface MarketMover {
    symbol: string;
    companyName: string;
    price: number;
    change: number;
    changePercentage: number;
    volume?: number;
}
export interface SectorPerformance {
    sector: string;
    averageChange: number;
    averageChangePercentage: number;
    positionsCount: number;
    totalValue: number;
}
export interface PerformanceMetrics {
    totalReturn: number;
    totalReturnPercentage: number;
    annualizedReturn: number;
    bestPerformer: {
        symbol: string;
        return: number;
        returnPercentage: number;
    };
    worstPerformer: {
        symbol: string;
        return: number;
        returnPercentage: number;
    };
    diversificationScore: number;
    riskMetrics: {
        concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
        maxPositionWeight: number;
        activePositions: number;
    };
}
export interface DistributionData {
    byAsset: AssetDistribution[];
    bySector: SectorDistribution[];
    byESGStatus: ESGDistribution[];
}
export interface AssetDistribution {
    symbol: string;
    companyName: string;
    value: number;
    percentage: number;
    color?: string;
}
export interface SectorDistribution {
    sector: string;
    value: number;
    percentage: number;
    positionsCount: number;
    color?: string;
}
export interface ESGDistribution {
    category: 'ESG Compliant' | 'Non-ESG' | 'Vegan Friendly' | 'Non-Vegan';
    value: number;
    percentage: number;
    positionsCount: number;
    color?: string;
}
