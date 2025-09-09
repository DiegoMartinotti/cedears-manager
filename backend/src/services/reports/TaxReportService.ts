/* eslint-disable max-lines-per-function */
import { TradeService } from '../TradeService.js';
import { CommissionService } from '../CommissionService.js';
import { UVAService } from '../UVAService.js';
import { logger } from '../../utils/logger.js';
import type { CustodyFeeRecord } from '../commission/CustodyCommissionService.js';
import { 
  AnnualCostReport,
  AnnualExecutiveSummary,
  AnnualMonthlyBreakdown,
  AnnualQuarterlyAnalysis,
  AnnualCostCategories,
  AnnualTaxInformation,
  YearOverYearComparison,
  AnnualProjections,
  AnnualRecommendation
} from '../../types/reports';

export class TaxReportService {
  private tradeService: TradeService;
  private commissionService: CommissionService;
  private uvaService: UVAService;

  constructor() {
    this.tradeService = new TradeService();
    this.commissionService = new CommissionService();
    this.uvaService = new UVAService();
  }

  async generateAnnualReport(year: number): Promise<AnnualCostReport> {
    try {
      logger.info('Generating annual tax report', { year });

      const [
        executiveSummary,
        monthlyBreakdown,
        quarterlyAnalysis,
        costCategories,
        taxInformation,
        yearOverYearComparison,
        projections,
        recommendations
      ] = await Promise.all([
        this.generateExecutiveSummary(year),
        this.generateMonthlyBreakdown(year),
        this.generateQuarterlyAnalysis(year),
        this.generateCostCategories(year),
        this.generateTaxInformation(year),
        this.generateYearOverYearComparison(year),
        this.generateProjections(year),
        this.generateRecommendations(year)
      ]);

      return {
        year,
        executiveSummary,
        monthlyBreakdown,
        quarterlyAnalysis,
        costCategories,
        taxInformation,
        yearOverYearComparison,
        projections,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating annual tax report', { error, year });
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to generate annual tax report: ${message}`);
    }
  }

  private async generateExecutiveSummary(year: number): Promise<AnnualExecutiveSummary> {
    const dateRange = {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };

    const trades = await this.tradeService.findAll();
    const tradesInYear = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    const totalInvestmentVolume = tradesInYear.reduce((sum, trade) =>
      sum + Math.abs(trade.net_amount), 0
    );

    const totalCommissions = tradesInYear.reduce((sum, trade) =>
      sum + (trade.commission || 0), 0
    );

    const custodyService = this.commissionService.getCustodyService();
    const custodyFees = await custodyService.getHistoricalFees({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    const totalCustodyFees = custodyFees.reduce((sum, fee) => sum + fee.totalCharged, 0);
    const totalCosts = totalCommissions + totalCustodyFees;

    const costAsPercentageOfVolume = totalInvestmentVolume > 0 
      ? (totalCosts / totalInvestmentVolume) * 100 
      : 0;

    const averageCostPerTrade = tradesInYear.length > 0
      ? totalCosts / tradesInYear.length
      : 0;

    // Calculate net portfolio return (simplified)
    const netPortfolioReturn = 0;
    const costImpactOnReturns = 0;

    let overallPerformanceRating: 'excellent' | 'good' | 'average' | 'poor';
    if (costAsPercentageOfVolume < 1) overallPerformanceRating = 'excellent';
    else if (costAsPercentageOfVolume < 2) overallPerformanceRating = 'good';
    else if (costAsPercentageOfVolume < 3) overallPerformanceRating = 'average';
    else overallPerformanceRating = 'poor';

    return {
      totalInvestmentVolume,
      totalCommissions,
      totalCustodyFees,
      totalCosts,
      costAsPercentageOfVolume,
      numberOfTrades: tradesInYear.length,
      averageCostPerTrade,
      netPortfolioReturn,
      costImpactOnReturns,
      overallPerformanceRating
    };
  }

  private async generateMonthlyBreakdown(year: number): Promise<AnnualMonthlyBreakdown[]> {
    const months: AnnualMonthlyBreakdown[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = new Date(new Date(nextMonth).getTime() - 1).toISOString().split('T')[0]!;

      const trades = await this.tradeService.findAll();
      const monthTrades = trades.filter(trade =>
        trade.trade_date >= monthStart && trade.trade_date <= monthEnd
      );

      const tradingVolume = monthTrades.reduce((sum, trade) =>
        sum + Math.abs(trade.net_amount), 0
      );

      const commissions = monthTrades.reduce((sum, trade) =>
        sum + (trade.commission || 0), 0
      );

      // Get custody fees for this month
      const custodyService = this.commissionService.getCustodyService();
      const custodyFees = await custodyService.getHistoricalFees({
        startDate: monthStart,
        endDate: monthEnd
      });

      const monthlyCustodyFees = custodyFees.reduce((sum, fee) => sum + fee.totalCharged, 0);
      const totalCosts = commissions + monthlyCustodyFees;

      const averageCostPerTrade = monthTrades.length > 0 
        ? totalCosts / monthTrades.length 
        : 0;

      const costEfficiencyScore = tradingVolume > 0 
        ? Math.max(0, 100 - ((totalCosts / tradingVolume) * 100 * 50)) // Scale 0-100
        : 100;

      months.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' }),
        tradingVolume,
        commissions,
        custodyFees: monthlyCustodyFees,
        totalCosts,
        numberOfTrades: monthTrades.length,
        averageCostPerTrade,
        costEfficiencyScore
      });
    }

    return months;
  }

  private async generateQuarterlyAnalysis(year: number): Promise<AnnualQuarterlyAnalysis[]> {
    const quarters: AnnualQuarterlyAnalysis[] = [];

    for (let quarter = 1; quarter <= 4; quarter++) {
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;
      
      const quarterStart = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const quarterEnd = quarter === 4 
        ? `${year}-12-31` 
        : `${year}-${String(endMonth + 1).padStart(2, '0')}-01`;

      const trades = await this.tradeService.findAll();
      const quarterTrades = trades.filter(trade =>
        trade.trade_date >= quarterStart && trade.trade_date < quarterEnd
      );

      const tradingVolume = quarterTrades.reduce((sum, trade) =>
        sum + Math.abs(trade.net_amount), 0
      );

      const commissions = quarterTrades.reduce((sum, trade) =>
        sum + (trade.commission || 0), 0
      );

      const custodyService = this.commissionService.getCustodyService();
      const custodyFees = await custodyService.getHistoricalFees({
        startDate: quarterStart,
        endDate: quarterEnd
      });

      const quarterlyCustodyFees = custodyFees.reduce((sum, fee) => sum + fee.totalCharged, 0);
      const totalCosts = commissions + quarterlyCustodyFees;

      // Compare with previous quarter for trend
      let costTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      let performanceVsPreviousQuarter = 0;

      if (quarter > 1) {
        const prevQuarterStart = `${year}-${String((quarter - 2) * 3 + 1).padStart(2, '0')}-01`;
        const prevQuarterEnd = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`;
        
        const prevQuarterTrades = trades.filter(trade =>
          trade.trade_date >= prevQuarterStart && trade.trade_date < prevQuarterEnd
        );

        const prevTotalCosts = prevQuarterTrades.reduce((sum, trade) =>
          sum + (trade.commission || 0), 0
        );

        performanceVsPreviousQuarter = prevTotalCosts > 0 
          ? ((totalCosts - prevTotalCosts) / prevTotalCosts) * 100 
          : 0;

        if (performanceVsPreviousQuarter > 5) costTrend = 'increasing';
        else if (performanceVsPreviousQuarter < -5) costTrend = 'decreasing';
      }

      const seasonalityImpact = this.getSeasonalityComment(quarter);

      quarters.push({
        quarter,
        tradingVolume,
        totalCosts,
        numberOfTrades: quarterTrades.length,
        costTrend,
        performanceVsPreviousQuarter,
        seasonalityImpact
      });
    }

    return quarters;
  }

  private getSeasonalityComment(quarter: number): string {
    const comments = {
      1: 'Primer trimestre: Período típico de planificación y nuevas inversiones',
      2: 'Segundo trimestre: Actividad moderada, balances de empresas Q1',
      3: 'Tercer trimestre: Temporada de earnings, mayor volatilidad',
      4: 'Cuarto trimestre: Cierre fiscal, rebalanceo de carteras'
    };
    
    return comments[quarter as keyof typeof comments] || '';
  }

  private async generateCostCategories(year: number): Promise<AnnualCostCategories> {
    const dateRange = {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };

    const trades = await this.tradeService.findAll();
    const tradesInYear = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    const transactionCommissions = tradesInYear.reduce((sum, trade) =>
      sum + (trade.commission || 0), 0
    );

    const custodyService = this.commissionService.getCustodyService();
    const custodyFees = await custodyService.getHistoricalFees({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    const totalCustodyFees = custodyFees.reduce((sum, fee) => sum + fee.feeAmount, 0);

    // Calculate IVA (21% in Argentina)
    const ivaOnCommissions = tradesInYear.reduce((sum, trade) =>
      sum + (trade.taxes || 0), 0
    );

    const ivaOnCustody = custodyFees.reduce((sum, fee) => sum + fee.ivaAmount, 0);

    const otherFees = 0; // Would include any other fees like market data, etc.

    const totalDeductibleExpenses = transactionCommissions + totalCustodyFees + ivaOnCommissions + ivaOnCustody + otherFees;

    return {
      transactionCommissions,
      custodyFees: totalCustodyFees,
      ivaOnCommissions,
      ivaOnCustody,
      otherFees,
      totalDeductibleExpenses
    };
  }

  private async generateTaxInformation(year: number): Promise<AnnualTaxInformation> {
    const costCategories = await this.generateCostCategories(year);

    const deductibleCommissions = costCategories.transactionCommissions;
    const deductibleCustodyFees = costCategories.custodyFees;
    const deductibleIVA = costCategories.ivaOnCommissions + costCategories.ivaOnCustody;
    const totalDeductibleAmount = costCategories.totalDeductibleExpenses;

    const suggestedTaxStrategy = this.generateTaxStrategy(totalDeductibleAmount);

    const requiredDocumentation = [
      'Resúmenes de cuenta bancaria del año completo',
      'Comprobantes de todas las operaciones bursátiles',
      'Detalle de comisiones cobradas por el banco',
      'Comprobantes de pago de custodia mensual',
      'Certificado de tenencias al 31 de diciembre',
      'Detalle de ganancias y pérdidas realizadas'
    ];

    const afipComplianceStatus = totalDeductibleAmount > 50000 ? 'requires_attention' : 'compliant';

    return {
      deductibleCommissions,
      deductibleCustodyFees,
      deductibleIVA,
      totalDeductibleAmount,
      suggestedTaxStrategy,
      requiredDocumentation,
      afipComplianceStatus
    };
  }

  private generateTaxStrategy(totalDeductible: number): string {
    if (totalDeductible > 100000) {
      return 'Dado el alto monto de gastos deducibles, considere consultar con un contador especializado en inversiones para maximizar las deducciones fiscales.';
    } else if (totalDeductible > 50000) {
      return 'Los gastos son significativos. Mantenga toda la documentación ordenada y considere las deducciones en su declaración anual.';
    } else {
      return 'Los gastos son moderados. Mantenga los comprobantes para futuras consultas.';
    }
  }

  private async generateYearOverYearComparison(year: number): Promise<YearOverYearComparison | null> {
    if (year <= 2024) return null; // No previous year data

    const currentYear = await this.generateExecutiveSummary(year);
    const previousYear = await this.generateExecutiveSummary(year - 1);

    const volumeChange = currentYear.totalInvestmentVolume - previousYear.totalInvestmentVolume;
    const volumeChangePercentage = previousYear.totalInvestmentVolume > 0 
      ? (volumeChange / previousYear.totalInvestmentVolume) * 100 
      : 0;

    const costChange = currentYear.totalCosts - previousYear.totalCosts;
    const costChangePercentage = previousYear.totalCosts > 0 
      ? (costChange / previousYear.totalCosts) * 100 
      : 0;

    const efficiencyChange = currentYear.costAsPercentageOfVolume - previousYear.costAsPercentageOfVolume;
    const numberOfTradesChange = currentYear.numberOfTrades - previousYear.numberOfTrades;

    let trend: 'improving' | 'declining' | 'stable';
    if (efficiencyChange < -0.2) trend = 'improving';
    else if (efficiencyChange > 0.2) trend = 'declining';
    else trend = 'stable';

    return {
      previousYear: year - 1,
      volumeChange,
      volumeChangePercentage,
      costChange,
      costChangePercentage,
      efficiencyChange,
      numberOfTradesChange,
      trend
    };
  }

  private async generateProjections(year: number): Promise<AnnualProjections> {
    const currentYear = await this.generateExecutiveSummary(year);
    
    // Simple projection based on current year data
    const growthRate = 1.1; // Assume 10% growth
    const nextYearProjectedVolume = currentYear.totalInvestmentVolume * growthRate;
    
    // Assume costs grow slower than volume (economies of scale)
    const costGrowthRate = 1.05; // 5% cost growth
    const nextYearProjectedCosts = currentYear.totalCosts * costGrowthRate;

    const recommendedBudget = nextYearProjectedCosts * 1.1; // 10% buffer
    
    const costOptimizationOpportunities = currentYear.totalCosts * 0.15; // Assume 15% optimization potential

    const projectionConfidence: 'high' | 'medium' | 'low' = 
      currentYear.numberOfTrades > 50 ? 'high' : 
      currentYear.numberOfTrades > 20 ? 'medium' : 'low';

    const assumptionsUsed = [
      '10% de crecimiento en volumen de inversión',
      '5% de crecimiento en costos operativos',
      'Mantenimiento de la estrategia actual de inversión',
      'Estabilidad en las comisiones bancarias',
      'Inflación moderada del 40-50% anual'
    ];

    return {
      nextYearProjectedVolume,
      nextYearProjectedCosts,
      recommendedBudget,
      costOptimizationOpportunities,
      projectionConfidence,
      assumptionsUsed
    };
  }

  private async generateRecommendations(year: number): Promise<AnnualRecommendation[]> {
    const summary = await this.generateExecutiveSummary(year);
    const recommendations: AnnualRecommendation[] = [];

    // Cost reduction recommendations
    if (summary.costAsPercentageOfVolume > 2) {
      recommendations.push({
        category: 'cost_reduction',
        priority: 'high',
        title: 'Optimizar tamaño de operaciones',
        description: 'Los costos representan más del 2% del volumen. Considere operaciones de mayor tamaño para reducir el impacto relativo de las comisiones.',
        estimatedBenefit: summary.totalCosts * 0.3,
        implementationEffort: 'low',
        timeline: '1-2 meses'
      });
    }

    // Efficiency recommendations
    if (summary.numberOfTrades > 100) {
      recommendations.push({
        category: 'efficiency',
        priority: 'medium',
        title: 'Revisar frecuencia de trading',
        description: 'Alto número de operaciones puede estar impactando los costos. Evalúe una estrategia más consolidada.',
        estimatedBenefit: summary.totalCommissions * 0.2,
        implementationEffort: 'medium',
        timeline: '3-6 meses'
      });
    }

    // Strategy recommendations
    if (summary.averageCostPerTrade > 500) {
      recommendations.push({
        category: 'strategy',
        priority: 'medium',
        title: 'Optimizar estrategia de broker',
        description: 'El costo promedio por operación es elevado. Compare con otros brokers o negocie mejores condiciones.',
        estimatedBenefit: summary.totalCosts * 0.25,
        implementationEffort: 'medium',
        timeline: '2-4 meses'
      });
    }

    // Compliance recommendations
    if (summary.totalCosts > 50000) {
      recommendations.push({
        category: 'compliance',
        priority: 'high',
        title: 'Consulta fiscal especializada',
        description: 'Los gastos deducibles son significativos. Una consulta fiscal puede optimizar su situación tributaria.',
        estimatedBenefit: summary.totalCosts * 0.1, // Potential tax savings
        implementationEffort: 'low',
        timeline: '1 mes'
      });
    }

    return recommendations;
  }

  async generateTaxExportData(year: number): Promise<{
    transactions: any[];
    commissions: any[];
    custodyFees: any[];
    summary: any;
  }> {
    const dateRange = {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`
    };

    const trades = await this.tradeService.findAllWithInstruments();
    const tradesInYear = trades.filter(trade =>
      trade.trade_date >= dateRange.startDate && trade.trade_date <= dateRange.endDate
    );

    const custodyService = this.commissionService.getCustodyService();
    const custodyFees = await custodyService.getHistoricalFees({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });

    const transactions = tradesInYear.map(trade => ({
      fecha: trade.trade_date,
      tipo: trade.type,
      simbolo: trade.symbol,
      cantidad: trade.quantity,
      precio: trade.price,
      monto_bruto: trade.net_amount + (trade.commission || 0),
      comision: trade.commission || 0,
      iva_comision: trade.taxes || 0,
      monto_neto: trade.net_amount,
      ganancia_perdida_realizada: null
    }));

    const commissions = tradesInYear.map(trade => ({
      fecha: trade.trade_date,
      simbolo: trade.symbol,
      tipo_operacion: trade.type,
      monto_operacion: trade.net_amount,
      comision_base: trade.commission || 0,
      iva_21: trade.taxes || 0,
      total_comision: (trade.commission || 0) + (trade.taxes || 0)
    }));

    const custodyFeesFormatted = custodyFees.map((fee: CustodyFeeRecord) => ({
      mes: fee.month,
      valor_cartera: fee.portfolioValue,
      porcentaje_custodia: fee.feePercentage,
      comision_custodia: fee.feeAmount,
      iva_custodia: fee.ivaAmount,
      total_custodia: fee.totalCharged
    }));

    const summary = await this.generateExecutiveSummary(year);

    return {
      transactions,
      commissions,
      custodyFees: custodyFeesFormatted,
      summary: {
        año: year,
        volumen_total_inversiones: summary.totalInvestmentVolume,
        total_comisiones: summary.totalCommissions,
        total_custodia: summary.totalCustodyFees,
        total_costos: summary.totalCosts,
        numero_operaciones: summary.numberOfTrades,
        costo_promedio_operacion: summary.averageCostPerTrade,
        porcentaje_costos_sobre_volumen: summary.costAsPercentageOfVolume
      }
    };
  }
}