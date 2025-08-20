import { TradeService } from '../TradeService';
import { CommissionService } from '../CommissionService';
import { UVAService } from '../UVAService';
import { PortfolioService } from '../PortfolioService';
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
        trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
      );

      const averageCommissionPerTrade = tradesInRange.length > 0 
        ? totalCommissions / tradesInRange.length 
        : 0;

      const portfolioValue = await this.portfolioService.getTotalValue();
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
    } catch (error) {
      logger.error('Error generating cost dashboard', { error, dateRange });
      throw new Error(`Failed to generate cost dashboard: ${error.message}`);
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
    } catch (error) {
      logger.error('Error generating impact analysis', { error, dateRange });
      throw new Error(`Failed to generate impact analysis: ${error.message}`);
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
    } catch (error) {
      logger.error('Error generating commission vs gain comparison', { error, dateRange });
      throw new Error(`Failed to generate commission vs gain comparison: ${error.message}`);
    }
  }

  private async calculateTotalCommissions(dateRange: { startDate: string; endDate: string }): Promise<number> {
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    return tradesInRange.reduce((total, trade) => total + (trade.commissionAmount || 0), 0);
  }

  private async calculateTotalCustodyFees(dateRange: { startDate: string; endDate: string }): Promise<number> {
    const custodyService = this.commissionService.getCustodyService();
    const custodyFees = await custodyService.getHistoricalFees({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    return custodyFees.reduce((total, fee) => total + fee.totalCharged, 0);
  }

  private async generateMonthlyTrend(dateRange: { startDate: string; endDate: string }): Promise<MonthlyCostSummary[]> {
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
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
      const tradeDate = new Date(trade.tradeDate);
      const monthKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].commissions += trade.commissionAmount || 0;
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
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    const instrumentData: { [symbol: string]: InstrumentCostSummary } = {};

    tradesInRange.forEach(trade => {
      if (!instrumentData[trade.symbol]) {
        instrumentData[trade.symbol] = {
          symbol: trade.symbol,
          name: trade.instrumentName || trade.symbol,
          totalCommissions: 0,
          numberOfTrades: 0,
          averageCommissionPerTrade: 0,
          costPercentageOfGains: null,
          isUnprofitable: false
        };
      }

      instrumentData[trade.symbol].totalCommissions += trade.commissionAmount || 0;
      instrumentData[trade.symbol].numberOfTrades += 1;
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
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
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
    const alerts: CostAlert[] = [];
    
    // Check for high commission percentage trades
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    tradesInRange.forEach(trade => {
      const commissionPercentage = trade.netAmount > 0 
        ? ((trade.commissionAmount || 0) / trade.netAmount) * 100 
        : 0;

      if (commissionPercentage > 2) { // More than 2% commission
        alerts.push({
          type: 'HIGH_COMMISSION_PERCENTAGE',
          severity: commissionPercentage > 5 ? 'high' : 'medium',
          message: `Operación ${trade.symbol} tiene comisión de ${commissionPercentage.toFixed(2)}%`,
          instrumentSymbol: trade.symbol,
          tradeId: trade.id,
          recommendedAction: 'Considerar operaciones de mayor volumen para reducir impacto de comisiones',
          potentialSavings: (trade.commissionAmount || 0) * 0.3 // Estimated 30% savings potential
        });
      }
    });

    // Check custody fee optimization
    const portfolioValue = await this.portfolioService.getTotalValue();
    const custodyService = this.commissionService.getCustodyService();
    const custodyAnalysis = await custodyService.analyzePortfolioOptimization(portfolioValue);

    if (custodyAnalysis.recommendations.length > 0) {
      alerts.push({
        type: 'EXCESSIVE_CUSTODY',
        severity: 'medium',
        message: `Cartera puede optimizarse para reducir custodia mensual`,
        recommendedAction: custodyAnalysis.recommendations[0] || 'Revisar tamaño de cartera',
        potentialSavings: custodyAnalysis.potentialMonthlySavings * 12
      });
    }

    return alerts;
  }

  private async calculateOverallImpactMetrics(dateRange: { startDate: string; endDate: string }): Promise<OverallImpactMetrics> {
    const portfolioValue = await this.portfolioService.getTotalValue();
    const totalCommissions = await this.calculateTotalCommissions(dateRange);
    const totalCustodyFees = await this.calculateTotalCustodyFees(dateRange);
    const totalCosts = totalCommissions + totalCustodyFees;

    // Calculate returns (simplified - in real implementation would need more complex calculation)
    const trades = await this.tradeService.findAll();
    const completedTrades = await this.tradeService.getCompletedTrades();
    
    const totalReturns = completedTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0);
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
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    const analyses: TradeImpactAnalysis[] = [];

    for (const trade of tradesInRange) {
      const analysis = await this.tradeService.analyzeTrade(trade.id!);
      const totalCosts = (trade.commissionAmount || 0) + (trade.commissionIva || 0);
      
      analyses.push({
        tradeId: trade.id!,
        symbol: trade.symbol,
        tradeType: trade.type,
        tradeDate: trade.tradeDate,
        grossReturn: analysis.projectedGainLoss,
        totalCosts,
        netReturn: analysis.projectedGainLoss - totalCosts,
        costPercentageOfReturn: analysis.projectedGainLoss > 0 
          ? (totalCosts / Math.abs(analysis.projectedGainLoss)) * 100 
          : 0,
        isUnprofitable: analysis.projectedGainLoss < totalCosts,
        breakEvenPrice: analysis.breakEvenPrice,
        currentPrice: analysis.currentPrice,
        realizedGainLoss: trade.realizedGainLoss || null
      });
    }

    return analyses;
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
    const portfolioValue = await this.portfolioService.getTotalValue();
    const ourCostPercentage = portfolioValue > 0 ? (totalCommissions / portfolioValue) * 100 : 0;

    // Industry benchmark data (would be fetched from external source in real implementation)
    const industryAverageCostPercentage = 1.5; // 1.5% average

    return {
      benchmarkName: 'Industry Average (Argentina)',
      ourCostPercentage,
      industryAverageCostPercentage,
      costEfficiencyScore: industryAverageCostPercentage > 0 
        ? (industryAverageCostPercentage / Math.max(ourCostPercentage, 0.01)) * 100 
        : 100,
      relativePerformance: ourCostPercentage < industryAverageCostPercentage ? 'better' : 
                          ourCostPercentage > industryAverageCostPercentage * 1.2 ? 'worse' : 'average',
      potentialSavings: Math.max(0, (ourCostPercentage - industryAverageCostPercentage) * portfolioValue / 100)
    };
  }

  private async generateOptimizationSuggestions(dateRange: { startDate: string; endDate: string }): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    // Check for small frequent trades
    const smallTrades = tradesInRange.filter(trade => trade.netAmount < 50000); // Less than $50k ARS
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
    const portfolioValue = await this.portfolioService.getTotalValue();
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
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    const completedTrades = await this.tradeService.getCompletedTrades();
    const completedInRange = completedTrades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    const profitableTrades = completedInRange.filter(trade => (trade.realizedGainLoss || 0) > 0);
    const unprofitableTrades = completedInRange.filter(trade => (trade.realizedGainLoss || 0) < 0);
    const breakEvenTrades = completedInRange.filter(trade => (trade.realizedGainLoss || 0) === 0);

    const totalGrossGains = profitableTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0);
    const totalGrossLosses = Math.abs(unprofitableTrades.reduce((sum, trade) => sum + (trade.realizedGainLoss || 0), 0));
    const totalCommissions = tradesInRange.reduce((sum, trade) => sum + (trade.commissionAmount || 0), 0);

    return {
      totalTrades: tradesInRange.length,
      profitableTrades: profitableTrades.length,
      unprofitableTrades: unprofitableTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      totalGrossGains,
      totalGrossLosses,
      totalCommissions,
      netResult: totalGrossGains - totalGrossLosses - totalCommissions,
      profitabilityPercentage: tradesInRange.length > 0 
        ? (profitableTrades.length / tradesInRange.length) * 100 
        : 0
    };
  }

  private async generateTradeComparisons(dateRange: { startDate: string; endDate: string }): Promise<TradeComparison[]> {
    const trades = await this.tradeService.findAll();
    const tradesInRange = trades.filter(trade => 
      trade.tradeDate >= dateRange.startDate && trade.tradeDate <= dateRange.endDate
    );

    return tradesInRange.map(trade => {
      const grossAmount = trade.netAmount + (trade.commissionAmount || 0);
      const commissionPercentage = grossAmount > 0 ? ((trade.commissionAmount || 0) / grossAmount) * 100 : 0;
      const realizedGainLoss = trade.realizedGainLoss || null;
      
      let status: 'profitable' | 'unprofitable' | 'break_even' | 'open' = 'open';
      let commissionVsGainRatio: number | null = null;
      
      if (realizedGainLoss !== null) {
        if (realizedGainLoss > 0) status = 'profitable';
        else if (realizedGainLoss < 0) status = 'unprofitable';
        else status = 'break_even';
        
        commissionVsGainRatio = realizedGainLoss !== 0 
          ? ((trade.commissionAmount || 0) / Math.abs(realizedGainLoss)) * 100 
          : 0;
      }

      const warningLevel = commissionPercentage > 3 ? 'high' : 
                          commissionPercentage > 1.5 ? 'medium' : 'none';

      return {
        tradeId: trade.id!,
        symbol: trade.symbol,
        tradeType: trade.type,
        executionDate: trade.tradeDate,
        quantity: trade.quantity,
        price: trade.priceArs,
        grossAmount,
        commissionAmount: trade.commissionAmount || 0,
        commissionPercentage,
        netAmount: trade.netAmount,
        realizedGainLoss,
        commissionVsGainRatio,
        status,
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
    const completedTrades = await this.tradeService.getCompletedTrades();
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
    
    const profitFactor = totalLosses > 0 ? totalGains / totalLosses : totalGains > 0 ? Number.POSITIVE_INFINITY : 0;

    const portfolioValue = await this.portfolioService.getTotalValue();
    const returnOnInvestment = portfolioValue > 0 ? ((totalGains - totalLosses) / portfolioValue) * 100 : 0;

    const totalCommissions = tradesInRange.reduce((sum, trade) => sum + (trade.commissionAmount || 0), 0);
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