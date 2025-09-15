import { TradeService } from '../TradeService';
import { CommissionService } from '../CommissionService';
import { UVAService } from '../UVAService';
import { PortfolioService } from '../PortfolioService';
import type { TradeWithInstrument } from '../../models/Trade.js';
import { logger } from '../../utils/logger';
import { 
  CostDashboard, 
  ImpactAnalysis, 
  CommissionVsGainComparison,
  MonthlyCostSummary,
  InstrumentCostSummary,
  BrokerCostComparison,
  CostAlert,
  OverallImpactMetrics,
  TradeImpactAnalysis,
  TemporalImpactAnalysis,
  BenchmarkComparison,
  OptimizationSuggestion,
  ComparisonSummary,
  TradeComparison,
  PeriodicComparisonSummary,
  ProfitabilityMetrics,
  ComparisonAlert
} from '../../types/reports';

interface CompletedTradeSummary {
  symbol: string;
  tradeDate: string;
  buyAmount: number;
  sellAmount: number;
  holdingDays: number;
  realizedGainLoss: number;
  totalCommissions: number;
}

export class CostReportService {
  private tradeService: TradeService;
  private commissionService: CommissionService;
  private uvaService: UVAService;
  private portfolioService: PortfolioService;

  constructor() {
    this.tradeService = new TradeService();
    this.commissionService = new CommissionService();
    this.uvaService = new UVAService();
    this.portfolioService = new PortfolioService();
  }

  // eslint-disable-next-line max-lines-per-function
  async generateCostDashboard(dateRange: { startDate: string; endDate: string }): Promise<CostDashboard> {
    try {
      logger.info('Generating cost dashboard', { dateRange });

      const [
        totalCommissions,
        totalCustodyFees,
        monthlyTrend,
        topCostlyInstruments,
        brokerComparison,
        costAlerts
      ] = await Promise.all([
        this.calculateTotalCommissions(dateRange),
        this.calculateTotalCustodyFees(dateRange),
        this.generateMonthlyTrend(dateRange),
        this.getTopCostlyInstruments(dateRange),
        this.generateBrokerComparison(dateRange),
        this.generateCostAlerts(dateRange)
      ]);

      const totalCosts = totalCommissions + totalCustodyFees;
      const trades = await this.tradeService.findAll();
      const tradesInRange = trades.filter(trade =>
        trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
      );

      const averageCommissionPerTrade = tradesInRange.length > 0 
        ? totalCommissions / tradesInRange.length 
        : 0;

      const portfolioSummary = await this.portfolioService.getPortfolioSummary();
      const portfolioValue = portfolioSummary.market_value;
      const costPercentageOfPortfolio = portfolioValue > 0
        ? (totalCosts / portfolioValue) * 100
        : 0;

      return {
        totalCommissions,
        totalCustodyFees,
        totalCosts,
        averageCommissionPerTrade,
        costPercentageOfPortfolio,
        monthlyTrend,
        topCostlyInstruments,
        brokerComparison,
        costAlerts
      };
    } catch (error: unknown) {
      logger.error('Error generating cost dashboard', { error, dateRange });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate cost dashboard: ${message}`);
    }
  }

  async generateImpactAnalysis(dateRange: { startDate: string; endDate: string }): Promise<ImpactAnalysis> {
    try {
      logger.info('Generating impact analysis', { dateRange });

      const [
        overallMetrics,
        tradeAnalysis,
        temporalAnalysis,
        benchmarkComparison,
        optimizationSuggestions
      ] = await Promise.all([
        this.calculateOverallImpactMetrics(dateRange),
        this.analyzeTradeImpacts(dateRange),
        this.generateTemporalAnalysis(dateRange),
        this.generateBenchmarkComparison(dateRange),
        this.generateOptimizationSuggestions(dateRange)
      ]);

      return {
        overallMetrics,
        tradeAnalysis,
        temporalAnalysis,
        benchmarkComparison,
        optimizationSuggestions
      };
    } catch (error: unknown) {
      logger.error('Error generating impact analysis', { error, dateRange });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate impact analysis: ${message}`);
    }
  }

  async generateCommissionVsGainComparison(
    dateRange: { startDate: string; endDate: string }
  ): Promise<CommissionVsGainComparison> {
    try {
      logger.info('Generating commission vs gain comparison', { dateRange });

      const [
        summary,
        tradeComparisons,
        periodicSummary,
        profitabilityMetrics,
        alerts
      ] = await Promise.all([
        this.generateComparisonSummary(dateRange),
        this.generateTradeComparisons(dateRange),
        this.generatePeriodicComparisonSummary(dateRange),
        this.calculateProfitabilityMetrics(dateRange),
        this.generateComparisonAlerts(dateRange)
      ]);

      return {
        summary,
        tradeComparisons,
        periodicSummary,
        profitabilityMetrics,
        alerts
      };
    } catch (error: unknown) {
      logger.error('Error generating commission vs gain comparison', { error, dateRange });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate commission vs gain comparison: ${message}`);
    }
  }

  private async calculateTotalCommissions(dateRange: { startDate: string; endDate: string }): Promise<number> {
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    return tradesInRange.reduce((total, trade) => total + (trade.commission || 0), 0);
  }

  private async calculateTotalCustodyFees(dateRange: { startDate: string; endDate: string }): Promise<number> {
    const custodyService = this.commissionService.getCustodyService();
    const custodyFees = await custodyService.getHistoricalFees({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    return custodyFees.reduce((total, fee) => total + fee.totalCharged, 0);
  }

  // eslint-disable-next-line max-lines-per-function
  private async generateMonthlyTrend(dateRange: { startDate: string; endDate: string }): Promise<MonthlyCostSummary[]> {
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    const monthlyData: { [key: string]: MonthlyCostSummary } = {};

    // Initialize months in range
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = {
        month: String(d.getMonth() + 1).padStart(2, '0'),
        year: d.getFullYear(),
        commissions: 0,
        custodyFees: 0,
        totalCosts: 0,
        numberOfTrades: 0,
        averageCostPerTrade: 0
      };
    }

    // Add trade data
    tradesInRange.forEach(trade => {
      const tradeDate = new Date(trade.trade_date);
      const monthKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].commissions += trade.commission || 0;
        monthlyData[monthKey].numberOfTrades += 1;
      }
    });

    // Add custody fees (monthly)
    const custodyService = this.commissionService.getCustodyService();
    const custodyFees = await custodyService.getHistoricalFees({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    custodyFees.forEach(fee => {
      const feeDate = new Date(fee.month);
      const monthKey = `${feeDate.getFullYear()}-${String(feeDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].custodyFees += fee.totalCharged;
      }
    });

    // Calculate totals and averages
    Object.values(monthlyData).forEach(month => {
      month.totalCosts = month.commissions + month.custodyFees;
      month.averageCostPerTrade = month.numberOfTrades > 0 
        ? month.totalCosts / month.numberOfTrades 
        : 0;
    });

    return Object.values(monthlyData).sort((a, b) => 
      a.year - b.year || parseInt(a.month) - parseInt(b.month)
    );
  }

  private async getTopCostlyInstruments(
    dateRange: { startDate: string; endDate: string },
    limit: number = 10
  ): Promise<InstrumentCostSummary[]> {
    const trades = await this.tradeService.findAllWithInstruments();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    const instrumentData: Record<string, InstrumentCostSummary> = {};

    tradesInRange.forEach(trade => {
      const symbol = trade.symbol ?? `INSTR-${trade.instrument_id}`;

      if (!instrumentData[symbol]) {
        instrumentData[symbol] = {
          symbol,
          name: trade.company_name ?? symbol,
          totalCommissions: 0,
          numberOfTrades: 0,
          averageCommissionPerTrade: 0,
          costPercentageOfGains: null,
          isUnprofitable: false
        };
      }

      instrumentData[symbol].totalCommissions += trade.commission ?? 0;
      instrumentData[symbol].numberOfTrades += 1;
    });

    // Calculate averages and profitability
    const results = Object.values(instrumentData).map(instrument => {
      instrument.averageCommissionPerTrade = instrument.numberOfTrades > 0 
        ? instrument.totalCommissions / instrument.numberOfTrades 
        : 0;

      // TODO: Calculate gains and cost percentage
      // This would require completed trade pairs (buy/sell)
      
      return instrument;
    });

    return results
      .sort((a, b) => b.totalCommissions - a.totalCommissions)
      .slice(0, limit);
  }

  private async generateBrokerComparison(dateRange: { startDate: string; endDate: string }): Promise<BrokerCostComparison[]> {
    // For now, we'll just return Galicia data since that's what we're using
    // In the future, this could compare actual usage across different brokers
    const totalCommissions = await this.calculateTotalCommissions(dateRange);
    const totalCustodyFees = await this.calculateTotalCustodyFees(dateRange);
      const trades = await this.tradeService.findAll();
      const tradesInRange = trades.filter(trade =>
        trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
      );

    return [
      {
        broker: 'Banco Galicia',
        totalCosts: totalCommissions + totalCustodyFees,
        averageCostPerTrade: tradesInRange.length > 0 
          ? (totalCommissions + totalCustodyFees) / tradesInRange.length 
          : 0,
        marketSharePercentage: 100,
        costEfficiencyRank: 1
      }
    ];
  }

  private async generateCostAlerts(dateRange: { startDate: string; endDate: string }): Promise<CostAlert[]> {
    const alerts = await this.createHighCommissionAlerts(dateRange);
    const custodyAlert = await this.createCustodyOptimizationAlert();

    if (custodyAlert) {
      alerts.push(custodyAlert);
    }

    return alerts;
  }

  private async createHighCommissionAlerts(dateRange: { startDate: string; endDate: string }): Promise<CostAlert[]> {
    const trades = await this.tradeService.findAllWithInstruments();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    return tradesInRange.reduce<CostAlert[]>((acc, trade) => {
      const netAmount = trade.net_amount;
      const commissionAmount = (trade.commission ?? 0) + (trade.taxes ?? 0);
      const commissionPercentage = netAmount > 0
        ? (commissionAmount / netAmount) * 100
        : 0;

      if (commissionPercentage > 2) {
        acc.push({
          type: 'HIGH_COMMISSION_PERCENTAGE',
          severity: commissionPercentage > 5 ? 'high' : 'medium',
          message: `Operación ${trade.symbol ?? trade.instrument_id} tiene comisión de ${commissionPercentage.toFixed(2)}%`,
          instrumentSymbol: trade.symbol ?? undefined,
          tradeId: trade.id,
          recommendedAction: 'Considerar operaciones de mayor volumen para reducir impacto de comisiones',
          potentialSavings: commissionAmount * 0.3
        });
      }

      return acc;
    }, []);
  }

  private async createCustodyOptimizationAlert(): Promise<CostAlert | null> {
    const { market_value: portfolioValue } = await this.portfolioService.getPortfolioSummary();
    if (portfolioValue <= 0) {
      return null;
    }

    const custodyService = this.commissionService.getCustodyService();
    const defaultConfig = this.commissionService.getDefaultConfiguration();
    const custodyOptimization = custodyService.optimizePortfolioSize(portfolioValue, 12, defaultConfig);

    if (custodyOptimization.savingsAnnual <= 0) {
      return null;
    }

    return {
      type: 'EXCESSIVE_CUSTODY',
      severity: 'medium',
      message: 'Cartera puede optimizarse para reducir custodia mensual',
      recommendedAction: custodyOptimization.recommendation,
      potentialSavings: custodyOptimization.savingsAnnual
    };
  }

    private async calculateOverallImpactMetrics(dateRange: { startDate: string; endDate: string }): Promise<OverallImpactMetrics> {
      const portfolioSummary = await this.portfolioService.getPortfolioSummary();
      const portfolioValue = portfolioSummary.market_value;
      const totalCommissions = await this.calculateTotalCommissions(dateRange);
      const totalCustodyFees = await this.calculateTotalCustodyFees(dateRange);
      const totalCosts = totalCommissions + totalCustodyFees;

      // Calculate returns (simplified - in real implementation would need more complex calculation)
    const completedTrades = await this.getCompletedTradesSummary();

    const totalReturns = completedTrades.reduce((sum, trade) => sum + trade.realizedGainLoss, 0);
    const netReturns = totalReturns - totalCosts;

    const costAsPercentageOfReturns = totalReturns > 0 ? (totalCosts / Math.abs(totalReturns)) * 100 : 0;
    const returnImpactPercentage = totalReturns > 0 ? ((totalReturns - netReturns) / totalReturns) * 100 : 0;
    
    const adjustedROI = portfolioValue > 0 ? (netReturns / portfolioValue) * 100 : 0;
    const unadjustedROI = portfolioValue > 0 ? (totalReturns / portfolioValue) * 100 : 0;

    return {
      totalPortfolioValue: portfolioValue,
      totalReturns,
      totalCosts,
      netReturns,
      costAsPercentageOfReturns,
      returnImpactPercentage,
      adjustedROI,
      unadjustedROI
    };
  }

  private async analyzeTradeImpacts(dateRange: { startDate: string; endDate: string }): Promise<TradeImpactAnalysis[]> {
    const trades = await this.tradeService.findAllWithInstruments();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    return tradesInRange.map(trade => {
      const commission = trade.commission ?? 0;
      const taxes = trade.taxes ?? 0;
      const totalCosts = commission + taxes;
      const grossAmount = trade.total_amount;
      const costPercentageOfReturn = grossAmount > 0
        ? (totalCosts / grossAmount) * 100
        : 0;
      const breakEvenPrice = trade.quantity > 0
        ? (trade.net_amount + totalCosts) / trade.quantity
        : 0;

      return {
        tradeId: trade.id!,
        symbol: trade.symbol ?? '',
        tradeType: trade.type,
        tradeDate: trade.trade_date,
        grossReturn: grossAmount,
        totalCosts,
        netReturn: trade.net_amount,
        costPercentageOfReturn,
        isUnprofitable: trade.type === 'SELL' && trade.net_amount <= totalCosts,
        breakEvenPrice,
        currentPrice: trade.price,
        realizedGainLoss: null
      } satisfies TradeImpactAnalysis;
    });
  }

  private async generateTemporalAnalysis(dateRange: { startDate: string; endDate: string }): Promise<TemporalImpactAnalysis[]> {
    const monthlyTrend = await this.generateMonthlyTrend(dateRange);
    
    return monthlyTrend.map(month => ({
      period: `${month.year}-${month.month}`,
      periodType: 'monthly' as const,
      grossReturns: 0, // Would need to calculate from completed trades
      totalCosts: month.totalCosts,
      netReturns: 0, // grossReturns - totalCosts
      costImpactPercentage: 0, // Would calculate based on returns
      numberOfTrades: month.numberOfTrades,
      averageCostPerTrade: month.averageCostPerTrade
    }));
  }

  private async generateBenchmarkComparison(dateRange: { startDate: string; endDate: string }): Promise<BenchmarkComparison> {
    const totalCommissions = await this.calculateTotalCommissions(dateRange);
    const { market_value: portfolioValue } = await this.portfolioService.getPortfolioSummary();
    const ourCostPercentage = portfolioValue > 0 ? (totalCommissions / portfolioValue) * 100 : 0;

    // Industry benchmark data (would be fetched from external source in real implementation)
    const industryAverageCostPercentage = 1.5; // 1.5% average

    let relativePerformance: 'better' | 'average' | 'worse';
    if (ourCostPercentage < industryAverageCostPercentage) {
      relativePerformance = 'better';
    } else if (ourCostPercentage > industryAverageCostPercentage * 1.2) {
      relativePerformance = 'worse';
    } else {
      relativePerformance = 'average';
    }

    return {
      benchmarkName: 'Industry Average (Argentina)',
      ourCostPercentage,
      industryAverageCostPercentage,
      costEfficiencyScore: industryAverageCostPercentage > 0
        ? (industryAverageCostPercentage / Math.max(ourCostPercentage, 0.01)) * 100
        : 100,
      relativePerformance,
      potentialSavings: Math.max(0, (ourCostPercentage - industryAverageCostPercentage) * portfolioValue / 100)
    };
  }

  private async generateOptimizationSuggestions(dateRange: { startDate: string; endDate: string }): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    // Check for small frequent trades
      const smallTrades = tradesInRange.filter(trade => trade.net_amount < 50000); // Less than $50k ARS
    if (smallTrades.length > tradesInRange.length * 0.3) { // More than 30% are small trades
      suggestions.push({
        type: 'TRADE_SIZE_OPTIMIZATION',
        priority: 'high',
        title: 'Optimizar tamaño de operaciones',
        description: 'Muchas operaciones pequeñas están impactando negativamente los costos relativos',
        estimatedSavings: smallTrades.length * 100, // Estimated savings
        implementationDifficulty: 'easy',
        timeToImplement: '1 semana',
        riskLevel: 'low'
      });
    }

    // Portfolio optimization for custody
    const { market_value } = await this.portfolioService.getPortfolioSummary();
    const portfolioValue = market_value;
    if (portfolioValue > 1000000) { // Over $1M ARS
      suggestions.push({
        type: 'PORTFOLIO_RESTRUCTURE',
        priority: 'medium',
        title: 'Optimizar estructura de cartera',
        description: 'La cartera puede restructurarse para minimizar comisiones de custodia',
        estimatedSavings: portfolioValue * 0.0025, // 0.25% potential savings
        implementationDifficulty: 'medium',
        timeToImplement: '2-4 semanas',
        riskLevel: 'medium'
      });
    }

    return suggestions;
  }

  private async generateComparisonSummary(dateRange: { startDate: string; endDate: string }): Promise<ComparisonSummary> {
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    const totalCommissions = tradesInRange.reduce((sum, trade) => sum + (trade.commission ?? 0), 0);

    return {
      totalTrades: tradesInRange.length,
      profitableTrades: 0,
      unprofitableTrades: 0,
      breakEvenTrades: 0,
      totalGrossGains: 0,
      totalGrossLosses: 0,
      totalCommissions,
      netResult: -totalCommissions,
      profitabilityPercentage: 0
    };
  }

  private async generateTradeComparisons(dateRange: { startDate: string; endDate: string }): Promise<TradeComparison[]> {
    const trades = await this.tradeService.findAllWithInstruments();
    const tradesInRange = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    return tradesInRange.map(trade => {
      const commission = trade.commission ?? 0;
      const grossAmount = trade.total_amount;
      const commissionPercentage = grossAmount > 0 ? (commission / grossAmount) * 100 : 0;

      let warningLevel: 'high' | 'medium' | 'none';
      if (commissionPercentage > 3) {
        warningLevel = 'high';
      } else if (commissionPercentage > 1.5) {
        warningLevel = 'medium';
      } else {
        warningLevel = 'none';
      }

      return {
        tradeId: trade.id!,
        symbol: trade.symbol ?? '',
        tradeType: trade.type,
        executionDate: trade.trade_date,
        quantity: trade.quantity,
        price: trade.price,
        grossAmount,
        commissionAmount: commission,
        commissionPercentage,
        netAmount: trade.net_amount,
        realizedGainLoss: null,
        commissionVsGainRatio: null,
        status: 'open',
        warningLevel
      };
    });
  }

  private async generatePeriodicComparisonSummary(dateRange: { startDate: string; endDate: string }): Promise<PeriodicComparisonSummary[]> {
    const monthlyTrend = await this.generateMonthlyTrend(dateRange);
    
    return monthlyTrend.map(month => ({
      period: `${month.year}-${month.month}`,
      periodType: 'monthly' as const,
      grossGains: 0, // Would calculate from completed profitable trades
      grossLosses: 0, // Would calculate from completed unprofitable trades
      totalCommissions: month.commissions,
      netResult: 0, // grossGains - grossLosses - totalCommissions
      commissionPercentageOfGains: 0, // Would calculate based on gains
      numberOfTrades: month.numberOfTrades,
      averageCommissionPerTrade: month.averageCostPerTrade,
      profitabilityRatio: 0 // Would calculate based on profitable vs unprofitable trades
    }));
  }

  private async calculateProfitabilityMetrics(dateRange: { startDate: string; endDate: string }): Promise<ProfitabilityMetrics> {
    const completedTrades = await this.getCompletedTradesSummary();
    const tradesInRange = completedTrades.filter(trade =>
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    const profitableTrades = tradesInRange.filter(trade => (trade.realizedGainLoss || 0) > 0);
    const unprofitableTrades = tradesInRange.filter(trade => (trade.realizedGainLoss || 0) < 0);

    const winRate = tradesInRange.length > 0 ? (profitableTrades.length / tradesInRange.length) * 100 : 0;
    
    const averageWin = profitableTrades.length > 0 
      ? profitableTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0) / profitableTrades.length 
      : 0;
      
    const averageLoss = unprofitableTrades.length > 0 
      ? Math.abs(unprofitableTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0)) / unprofitableTrades.length 
      : 0;

    const totalGains = profitableTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0);
    const totalLosses = Math.abs(unprofitableTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0));
    
    let profitFactor: number;
    if (totalLosses > 0) {
      profitFactor = totalGains / totalLosses;
    } else if (totalGains > 0) {
      profitFactor = Number.POSITIVE_INFINITY;
    } else {
      profitFactor = 0;
    }

    const { market_value: portfolioValue } = await this.portfolioService.getPortfolioSummary();
    const returnOnInvestment = portfolioValue > 0 ? ((totalGains - totalLosses) / portfolioValue) * 100 : 0;

    const totalCommissions = tradesInRange.reduce((sum, trade) => sum + trade.totalCommissions, 0);
    const costAdjustedROI = portfolioValue > 0
      ? ((totalGains - totalLosses - totalCommissions) / portfolioValue) * 100
      : 0;

    return {
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      sharpeRatio: 0, // Would need more complex calculation with volatility
      maxDrawdown: 0, // Would need sequential analysis
      returnOnInvestment,
      costAdjustedROI
    };
  }

  private async getCompletedTradesSummary(): Promise<CompletedTradeSummary[]> {
    const trades = await this.tradeService.findAllWithInstruments();
    const tradesByInstrument = new Map<number, TradeWithInstrument[]>();

    for (const trade of trades) {
      const grouped = tradesByInstrument.get(trade.instrument_id) ?? [];
      grouped.push(trade);
      tradesByInstrument.set(trade.instrument_id, grouped);
    }

    const completed: CompletedTradeSummary[] = [];
    for (const instrumentTrades of tradesByInstrument.values()) {
      completed.push(...this.buildCompletedTradesForInstrument(instrumentTrades));
    }

    return completed;
  }

  private buildCompletedTradesForInstrument(trades: TradeWithInstrument[]): CompletedTradeSummary[] {
    const buys = trades
      .filter(t => t.type === 'BUY')
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    const sells = trades
      .filter(t => t.type === 'SELL')
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

    const results: CompletedTradeSummary[] = [];
    let buyIndex = 0;
    let sellIndex = 0;

    while (buyIndex < buys.length && sellIndex < sells.length) {
      const buy = buys[buyIndex]!;
      const sell = sells[sellIndex]!;
      const holdingDays = this.calculateHoldingDays(buy.trade_date, sell.trade_date);

      results.push({
        symbol: buy.symbol ?? sell.symbol ?? '',
        tradeDate: sell.trade_date,
        buyAmount: buy.net_amount,
        sellAmount: sell.net_amount,
        holdingDays,
        realizedGainLoss: sell.net_amount - buy.net_amount,
        totalCommissions:
          (buy.commission ?? 0) +
          (buy.taxes ?? 0) +
          (sell.commission ?? 0) +
          (sell.taxes ?? 0)
      });

      buyIndex++;
      sellIndex++;
    }

    return results;
  }

  private calculateHoldingDays(buyDate: string, sellDate: string): number {
    const buyTime = new Date(buyDate).getTime();
    const sellTime = new Date(sellDate).getTime();
    return Math.max(0, Math.floor((sellTime - buyTime) / (1000 * 60 * 60 * 24)));
  }

  private async generateComparisonAlerts(dateRange: { startDate: string; endDate: string }): Promise<ComparisonAlert[]> {
    const alerts: ComparisonAlert[] = [];

    const tradeComparisons = await this.generateTradeComparisons(dateRange);
    const highCommissionTrades = tradeComparisons.filter(trade => trade.commissionPercentage > 2);
    
    if (highCommissionTrades.length > 0) {
      alerts.push({
        type: 'HIGH_COMMISSION_RATIO',
        severity: highCommissionTrades.length > 5 ? 'high' : 'medium',
        message: `${highCommissionTrades.length} operaciones con comisiones >2%`,
        affectedTrades: highCommissionTrades.length,
        estimatedImpact: highCommissionTrades.reduce((sum, trade) => sum + trade.commissionAmount, 0),
        recommendation: 'Considerar operaciones de mayor volumen para reducir impacto porcentual'
      });
    }

    const smallTrades = tradeComparisons.filter(trade => trade.grossAmount < 50000);
    if (smallTrades.length > tradeComparisons.length * 0.3) {
      alerts.push({
        type: 'FREQUENT_SMALL_TRADES',
        severity: 'medium',
        message: 'Muchas operaciones pequeñas incrementan costos relativos',
        affectedTrades: smallTrades.length,
        estimatedImpact: smallTrades.reduce((sum, trade) => sum + trade.commissionAmount, 0),
        recommendation: 'Agrupar operaciones para optimizar costos'
      });
    }

    return alerts;
  }
}