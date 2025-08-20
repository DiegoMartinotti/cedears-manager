export interface CostDashboard {
  totalCommissions: number;
  totalCustodyFees: number;
  totalCosts: number;
  averageCommissionPerTrade: number;
  costPercentageOfPortfolio: number;
  monthlyTrend: MonthlyCostSummary[];
  topCostlyInstruments: InstrumentCostSummary[];
  brokerComparison: BrokerCostComparison[];
  costAlerts: CostAlert[];
}

export interface MonthlyCostSummary {
  month: string;
  year: number;
  commissions: number;
  custodyFees: number;
  totalCosts: number;
  numberOfTrades: number;
  averageCostPerTrade: number;
}

export interface InstrumentCostSummary {
  symbol: string;
  name: string;
  totalCommissions: number;
  numberOfTrades: number;
  averageCommissionPerTrade: number;
  costPercentageOfGains: number | null;
  isUnprofitable: boolean;
}

export interface BrokerCostComparison {
  broker: string;
  totalCosts: number;
  averageCostPerTrade: number;
  marketSharePercentage: number;
  costEfficiencyRank: number;
}

export interface CostAlert {
  type: 'HIGH_COMMISSION_PERCENTAGE' | 'UNPROFITABLE_TRADE' | 'EXCESSIVE_CUSTODY' | 'BROKER_OPTIMIZATION';
  severity: 'low' | 'medium' | 'high';
  message: string;
  instrumentSymbol?: string;
  tradeId?: number;
  recommendedAction: string;
  potentialSavings?: number;
}

export interface ImpactAnalysis {
  overallMetrics: OverallImpactMetrics;
  tradeAnalysis: TradeImpactAnalysis[];
  temporalAnalysis: TemporalImpactAnalysis[];
  benchmarkComparison: BenchmarkComparison;
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface OverallImpactMetrics {
  totalPortfolioValue: number;
  totalReturns: number;
  totalCosts: number;
  netReturns: number;
  costAsPercentageOfReturns: number;
  returnImpactPercentage: number;
  adjustedROI: number;
  unadjustedROI: number;
}

export interface TradeImpactAnalysis {
  tradeId: number;
  symbol: string;
  tradeType: 'BUY' | 'SELL';
  tradeDate: string;
  grossReturn: number;
  totalCosts: number;
  netReturn: number;
  costPercentageOfReturn: number;
  isUnprofitable: boolean;
  breakEvenPrice: number;
  currentPrice: number;
  realizedGainLoss: number | null;
}

export interface TemporalImpactAnalysis {
  period: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  grossReturns: number;
  totalCosts: number;
  netReturns: number;
  costImpactPercentage: number;
  numberOfTrades: number;
  averageCostPerTrade: number;
}

export interface BenchmarkComparison {
  benchmarkName: string;
  ourCostPercentage: number;
  industryAverageCostPercentage: number;
  costEfficiencyScore: number;
  relativePerformance: 'better' | 'average' | 'worse';
  potentialSavings: number;
}

export interface OptimizationSuggestion {
  type: 'BROKER_SWITCH' | 'TRADE_SIZE_OPTIMIZATION' | 'FREQUENCY_ADJUSTMENT' | 'PORTFOLIO_RESTRUCTURE';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  estimatedSavings: number;
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  timeToImplement: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CommissionVsGainComparison {
  summary: ComparisonSummary;
  tradeComparisons: TradeComparison[];
  periodicSummary: PeriodicComparisonSummary[];
  profitabilityMetrics: ProfitabilityMetrics;
  alerts: ComparisonAlert[];
}

export interface ComparisonSummary {
  totalTrades: number;
  profitableTrades: number;
  unprofitableTrades: number;
  breakEvenTrades: number;
  totalGrossGains: number;
  totalGrossLosses: number;
  totalCommissions: number;
  netResult: number;
  profitabilityPercentage: number;
}

export interface TradeComparison {
  tradeId: number;
  symbol: string;
  tradeType: 'BUY' | 'SELL';
  executionDate: string;
  quantity: number;
  price: number;
  grossAmount: number;
  commissionAmount: number;
  commissionPercentage: number;
  netAmount: number;
  realizedGainLoss: number | null;
  commissionVsGainRatio: number | null;
  status: 'profitable' | 'unprofitable' | 'break_even' | 'open';
  warningLevel: 'none' | 'medium' | 'high';
}

export interface PeriodicComparisonSummary {
  period: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  grossGains: number;
  grossLosses: number;
  totalCommissions: number;
  netResult: number;
  commissionPercentageOfGains: number;
  numberOfTrades: number;
  averageCommissionPerTrade: number;
  profitabilityRatio: number;
}

export interface ProfitabilityMetrics {
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  returnOnInvestment: number;
  costAdjustedROI: number;
}

export interface ComparisonAlert {
  type: 'HIGH_COMMISSION_RATIO' | 'FREQUENT_SMALL_TRADES' | 'LOW_PROFITABILITY' | 'COST_OPTIMIZATION';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedTrades: number;
  estimatedImpact: number;
  recommendation: string;
}

export interface AnnualCostReport {
  year: number;
  executiveSummary: AnnualExecutiveSummary;
  monthlyBreakdown: AnnualMonthlyBreakdown[];
  quarterlyAnalysis: AnnualQuarterlyAnalysis[];
  costCategories: AnnualCostCategories;
  taxInformation: AnnualTaxInformation;
  yearOverYearComparison: YearOverYearComparison | null;
  projections: AnnualProjections;
  recommendations: AnnualRecommendation[];
}

export interface AnnualExecutiveSummary {
  totalInvestmentVolume: number;
  totalCommissions: number;
  totalCustodyFees: number;
  totalCosts: number;
  costAsPercentageOfVolume: number;
  numberOfTrades: number;
  averageCostPerTrade: number;
  netPortfolioReturn: number;
  costImpactOnReturns: number;
  overallPerformanceRating: 'excellent' | 'good' | 'average' | 'poor';
}

export interface AnnualMonthlyBreakdown {
  month: number;
  monthName: string;
  tradingVolume: number;
  commissions: number;
  custodyFees: number;
  totalCosts: number;
  numberOfTrades: number;
  averageCostPerTrade: number;
  costEfficiencyScore: number;
}

export interface AnnualQuarterlyAnalysis {
  quarter: number;
  tradingVolume: number;
  totalCosts: number;
  numberOfTrades: number;
  costTrend: 'increasing' | 'decreasing' | 'stable';
  performanceVsPreviousQuarter: number;
  seasonalityImpact: string;
}

export interface AnnualCostCategories {
  transactionCommissions: number;
  custodyFees: number;
  ivaOnCommissions: number;
  ivaOnCustody: number;
  otherFees: number;
  totalDeductibleExpenses: number;
}

export interface AnnualTaxInformation {
  deductibleCommissions: number;
  deductibleCustodyFees: number;
  deductibleIVA: number;
  totalDeductibleAmount: number;
  suggestedTaxStrategy: string;
  requiredDocumentation: string[];
  afipComplianceStatus: 'compliant' | 'requires_attention';
}

export interface YearOverYearComparison {
  previousYear: number;
  volumeChange: number;
  volumeChangePercentage: number;
  costChange: number;
  costChangePercentage: number;
  efficiencyChange: number;
  numberOfTradesChange: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AnnualProjections {
  nextYearProjectedVolume: number;
  nextYearProjectedCosts: number;
  recommendedBudget: number;
  costOptimizationOpportunities: number;
  projectionConfidence: 'high' | 'medium' | 'low';
  assumptionsUsed: string[];
}

export interface AnnualRecommendation {
  category: 'cost_reduction' | 'efficiency' | 'strategy' | 'compliance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedBenefit: number;
  implementationEffort: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'json' | 'xlsx';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  includeFields: {
    commissions: boolean;
    custodyFees: boolean;
    tradeDetails: boolean;
    taxInformation: boolean;
    charts: boolean;
    summaries: boolean;
  };
  filters: {
    symbols?: string[];
    brokers?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  groupBy: 'month' | 'quarter' | 'year' | 'instrument' | 'none';
  sortBy: 'date' | 'amount' | 'symbol' | 'commission';
  sortOrder: 'asc' | 'desc';
}

export interface ExportResult {
  exportId: string;
  format: string;
  filename: string;
  fileSize: number;
  recordCount: number;
  generatedAt: string;
  expiresAt: string;
  downloadUrl: string;
  status: 'generating' | 'ready' | 'expired' | 'error';
  error?: string;
}

export interface ExportHistory {
  exports: ExportResult[];
  totalExports: number;
  lastExportDate: string;
  storageUsed: number;
  maxStorageAllowed: number;
}

export type ReportType = 'dashboard' | 'impact_analysis' | 'commission_comparison' | 'annual_report';

export interface ReportRequest {
  type: ReportType;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: {
    symbols?: string[];
    brokers?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  options?: {
    includeProjections?: boolean;
    includeBenchmarks?: boolean;
    groupBy?: string;
    aggregationLevel?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  };
}