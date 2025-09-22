/* eslint-disable max-lines-per-function, complexity */
import {
  SellAnalysis,
  SellAlert,
  SellAnalysisData,
  SellAlertData,
  SellThresholds,
  SellScoreComponents,
  PositionSellAnalysis
} from '../models/SellAnalysis.js';
import { PortfolioService } from './PortfolioService.js';
import { QuoteService } from './QuoteService.js';
import { UVAService } from './UVAService.js';
import { CommissionService } from './CommissionService.js';
import { TechnicalAnalysisService } from './TechnicalAnalysisService.js';
import { InstrumentService } from './InstrumentService.js';
import { UVA } from '../models/UVA.js';
import type { PortfolioPositionData } from '../models/PortfolioPosition.js';
import type { QuoteData } from '../models/Quote.js';
import type { CommissionCalculation } from '../types/commission.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SellAnalysisService');

export class SellAnalysisService {
  private sellAnalysisModel: SellAnalysis;
  private sellAlertModel: SellAlert;
  private portfolioService: PortfolioService;
  private quoteService: QuoteService;
  private uvaService: UVAService;
  private commissionService: CommissionService;
  private technicalAnalysisService: TechnicalAnalysisService;
  private instrumentService: InstrumentService;
  private readonly uvaModel: UVA;

  private defaultThresholds: SellThresholds = {
    take_profit_1: 15,
    take_profit_2: 20,
    stop_loss: -8,
    trailing_stop_trigger: 10,
    trailing_stop_distance: 5,
    time_based_days: 90
  };

  constructor() {
    this.sellAnalysisModel = new SellAnalysis();
    this.sellAlertModel = new SellAlert();
    this.portfolioService = new PortfolioService();
    this.quoteService = new QuoteService();
    this.uvaService = new UVAService();
    this.commissionService = new CommissionService();
    this.technicalAnalysisService = new TechnicalAnalysisService();
    this.instrumentService = new InstrumentService();
    this.uvaModel = new UVA();
  }

  /**
   * Analyzes all open positions for sell opportunities
   */
  async analyzeAllPositions(thresholds?: Partial<SellThresholds>): Promise<PositionSellAnalysis[]> {
    try {
      logger.info('Starting analysis of all positions for sell opportunities');
      
      const activeThresholds = { ...this.defaultThresholds, ...thresholds };
      const positions = await this.portfolioService.getPortfolioPositions();
      const results: PositionSellAnalysis[] = [];

      for (const position of positions) {
        try {
          const positionId = position.id;
          if (!positionId) {
            logger.warn('Skipping position without identifier', { instrument: position.instrument_id });
            continue;
          }

          const analysis = await this.analyzePosition(positionId, activeThresholds);
          if (analysis) {
            results.push(analysis);
          }
        } catch (error) {
          logger.error(`Error analyzing position ${position.id}:`, error);
        }
      }

      logger.info(`Completed analysis of ${results.length} positions`);
      return results;
    } catch (error) {
      logger.error('Error in analyzeAllPositions:', error);
      throw error;
    }
  }

  /**
   * Analyzes a specific position for sell opportunity
   */
  async analyzePosition(positionId: number, thresholds?: Partial<SellThresholds>): Promise<PositionSellAnalysis | null> {
    try {
      const activeThresholds = { ...this.defaultThresholds, ...thresholds };
      
      // Get position data
      const position = await this.portfolioService.getPortfolioPosition(positionId);
      if (!position) {
        logger.warn(`Position ${positionId} not found`);
        return null;
      }

      // Get instrument and current quote
      const instrument = await this.instrumentService.getInstrumentById(position.instrument_id);
      if (!instrument) {
        logger.warn(`Instrument ${position.instrument_id} not found`);
        return null;
      }

      const quote = await this.quoteService.getLatestQuote(instrument.symbol);
      if (!quote) {
        logger.warn(`No quote found for ${instrument.symbol}`);
        return null;
      }

      // Calculate basic position metrics
      const averageCost = this.resolveAverageCost(position);
      const currentPrice = this.resolveQuotePrice(quote, averageCost);
      const totalValue = position.quantity * currentPrice;
      const grossProfit = totalValue - position.total_cost;
      const grossProfitPct = position.total_cost > 0
        ? (grossProfit / position.total_cost) * 100
        : 0;

      // Calculate inflation adjustment
      const inflationData = await this.calculateInflationAdjustment(position);

      // Calculate sell commission
      const sellCommission = this.commissionService.calculateOperationCommission(
        'SELL',
        totalValue
      );

      // Calculate net amounts
      const netProceedsAfterSale = sellCommission.netAmount;
      const netProfit = netProceedsAfterSale - inflationData.adjusted_cost;
      const netProfitPct = inflationData.adjusted_cost > 0
        ? (netProfit / inflationData.adjusted_cost) * 100
        : 0;

      // Get technical indicators
      const technicalIndicators = await this.getTechnicalIndicators(instrument.symbol);

      // Calculate sell score components
      const scoreComponents = await this.calculateSellScore(
        position,
        {
          currentPrice,
          grossProfitPct,
          netProfitPct,
          daysHeld: this.calculateDaysHeld(position.created_at || new Date().toISOString())
        },
        technicalIndicators
      );

      // Determine recommendation and risk level
      const { recommendation, riskLevel, reason } = this.determineRecommendation(
        netProfitPct,
        scoreComponents,
        activeThresholds
      );

      // Save analysis to database
      const analysisData: Omit<SellAnalysisData, 'id' | 'created_at' | 'updated_at'> = {
        position_id: positionId,
        instrument_id: position.instrument_id,
        ticker: instrument.symbol,
        current_price: currentPrice,
        avg_buy_price: averageCost,
        quantity: position.quantity,
        gross_profit_pct: grossProfitPct,
        net_profit_pct: netProfitPct,
        gross_profit_ars: grossProfit,
        net_profit_ars: netProfit,
        commission_impact: sellCommission.totalCommission,
        inflation_adjustment: inflationData.inflation_factor,
        sell_score: scoreComponents.technicalScore,
        technical_score: scoreComponents.technicalScore,
        fundamental_score: scoreComponents.fundamentalScore,
        profit_score: scoreComponents.profitScore,
        time_score: scoreComponents.timeScore,
        market_score: scoreComponents.marketScore,
        recommendation,
        recommendation_reason: reason,
        risk_level: riskLevel,
        days_held: this.calculateDaysHeld(position.created_at || new Date().toISOString()),
        analysis_date: new Date().toISOString()
      };

      await this.sellAnalysisModel.create(analysisData);

      // Generate alerts if needed
      const alerts = await this.generateAlerts(position, analysisData, activeThresholds);

      // Build response
      const result: PositionSellAnalysis = {
        position: {
          id: positionId,
          instrument_id: position.instrument_id,
          ticker: instrument.symbol,
          quantity: position.quantity,
          avg_price: averageCost,
          total_invested: position.total_cost,
          days_held: analysisData.days_held
        },
        current: {
          price: currentPrice,
          total_value: totalValue,
          gross_profit: grossProfit,
          gross_profit_pct: grossProfitPct
        },
        adjusted: {
          inflation_factor: inflationData.inflation_factor,
          adjusted_cost: inflationData.adjusted_cost,
          net_profit: netProfit,
          net_profit_pct: netProfitPct,
          commission_to_sell: sellCommission.totalCommission,
          final_net_amount: netProceedsAfterSale
        },
        analysis: {
          sell_score: scoreComponents.technicalScore,
          score_components: scoreComponents,
          recommendation,
          risk_level: riskLevel,
          reason
        },
        alerts,
        technical_indicators: technicalIndicators
      };

      logger.info(`Analysis completed for position ${positionId}: ${recommendation} (Score: ${scoreComponents.technicalScore})`);
      return result;

    } catch (error) {
      logger.error(`Error analyzing position ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate inflation adjustment using UVA
   */
  private async calculateInflationAdjustment(
    position: PortfolioPositionData & { last_trade_date?: string }
  ): Promise<{
    inflation_factor: number;
    adjusted_cost: number;
  }> {
    try {
      const buyDateRaw = position.created_at || position.last_trade_date;
      const defaultResult = {
        inflation_factor: 1,
        adjusted_cost: position.total_cost
      };

      if (!buyDateRaw) {
        return defaultResult;
      }

      const normalizedBuyDate = this.normalizeDate(buyDateRaw);
      if (!normalizedBuyDate) {
        return defaultResult;
      }

      let buyUVA = await this.uvaModel.findLatestBefore(normalizedBuyDate);
      if (!buyUVA) {
        await this.uvaService.updateHistoricalUVAValues(normalizedBuyDate, normalizedBuyDate).catch(() => undefined);
        buyUVA = await this.uvaModel.findLatestBefore(normalizedBuyDate);
      }

      const currentUVA = await this.uvaService.getLatestUVAValue();
      const currentValue = currentUVA?.value;
      const buyValue = buyUVA?.value;

      if (!currentValue || !buyValue) {
        return defaultResult;
      }

      const inflationFactor = currentValue / buyValue;
      const adjustedCost = position.total_cost * inflationFactor;

      return {
        inflation_factor: inflationFactor,
        adjusted_cost: adjustedCost
      };
    } catch (error) {
      logger.error('Error calculating inflation adjustment:', error);
      return {
        inflation_factor: 1,
        adjusted_cost: position.total_cost
      };
    }
  }

  /**
   * Get technical indicators for analysis
   */
  private async getTechnicalIndicators(ticker: string): Promise<{
    rsi: number;
    macd_signal: 'BUY' | 'SELL' | 'NEUTRAL';
    sma_trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    volume_trend: 'HIGH' | 'NORMAL' | 'LOW';
  }> {
    try {
      const calculated = await this.technicalAnalysisService.calculateIndicators(ticker);

      if (!calculated) {
        return {
          rsi: 50,
          macd_signal: 'NEUTRAL',
          sma_trend: 'SIDEWAYS',
          volume_trend: 'NORMAL'
        };
      }

      let macdSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      if (calculated.macd?.signalType === 'SELL') {
        macdSignal = 'SELL';
      } else if (calculated.macd?.signalType === 'BUY') {
        macdSignal = 'BUY';
      }

      let smaTrend: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';
      if (calculated.sma?.signal === 'BUY') {
        smaTrend = 'UP';
      } else if (calculated.sma?.signal === 'SELL') {
        smaTrend = 'DOWN';
      }

      return {
        rsi: calculated.rsi?.value ?? 50,
        macd_signal: macdSignal,
        sma_trend: smaTrend,
        volume_trend: 'NORMAL'
      };
    } catch (error) {
      logger.error('Error getting technical indicators:', error);
      return {
        rsi: 50,
        macd_signal: 'NEUTRAL',
        sma_trend: 'SIDEWAYS',
        volume_trend: 'NORMAL'
      };
    }
  }

  private resolveAverageCost(position: PortfolioPositionData): number {
    if (position.average_cost !== undefined && position.average_cost !== null) {
      return position.average_cost;
    }

    if (position.quantity > 0) {
      return position.total_cost / position.quantity;
    }

    return 0;
  }

  private resolveQuotePrice(quote: QuoteData | null, fallback: number): number {
    if (quote) {
      if (quote.close !== undefined && quote.close !== null) {
        return quote.close;
      }

      if (quote.price !== undefined && quote.price !== null) {
        return quote.price;
      }
    }

    return fallback;
  }

  private normalizeDate(dateInput: string): string | null {
    if (!dateInput) {
      return null;
    }

    const [datePart] = dateInput.split('T');
    if (datePart && datePart.length > 0) {
      return datePart;
    }

    const parsedDate = new Date(dateInput);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const [isoDate] = parsedDate.toISOString().split('T');
    return isoDate ?? null;
  }

  /**
   * Calculate sell score components
   */
  private async calculateSellScore(
    position: any,
    metrics: {
      currentPrice: number;
      grossProfitPct: number;
      netProfitPct: number;
      daysHeld: number;
    },
    technicalIndicators: any
  ): Promise<SellScoreComponents> {
    // Technical Score (0-100)
    let technicalScore = 50; // Neutral base
    
    // RSI component (30% weight)
    if (technicalIndicators.rsi > 70) {
      technicalScore += 15; // Overbought, good time to sell
    } else if (technicalIndicators.rsi < 30) {
      technicalScore -= 15; // Oversold, maybe hold
    }

    // MACD component (20% weight)
    if (technicalIndicators.macd_signal === 'SELL') {
      technicalScore += 10;
    } else if (technicalIndicators.macd_signal === 'BUY') {
      technicalScore -= 5;
    }

    // SMA trend component (20% weight)
    if (technicalIndicators.sma_trend === 'DOWN') {
      technicalScore += 10;
    } else if (technicalIndicators.sma_trend === 'UP') {
      technicalScore -= 5;
    }

    // Volume component (10% weight)
    if (technicalIndicators.volume_trend === 'HIGH') {
      technicalScore += 5;
    }

    technicalScore = Math.max(0, Math.min(100, technicalScore));

    // Fundamental Score (simplified, would need news analysis)
    const fundamentalScore = 50; // Neutral for now

    // Profit Score (0-100)
    let profitScore = 0;
    if (metrics.netProfitPct > 20) {
      profitScore = 90; // Excellent profit
    } else if (metrics.netProfitPct > 15) {
      profitScore = 80; // Very good profit
    } else if (metrics.netProfitPct > 10) {
      profitScore = 60; // Good profit
    } else if (metrics.netProfitPct > 5) {
      profitScore = 40; // Modest profit
    } else if (metrics.netProfitPct > 0) {
      profitScore = 20; // Small profit
    } else if (metrics.netProfitPct > -5) {
      profitScore = 10; // Small loss
    } else {
      profitScore = 0; // Significant loss
    }

    // Time Score (0-100)
    let timeScore = 50; // Neutral base
    if (metrics.daysHeld > 365) {
      timeScore += 20; // Long-term holding
    } else if (metrics.daysHeld > 180) {
      timeScore += 10; // Medium-term
    } else if (metrics.daysHeld < 30) {
      timeScore -= 10; // Very short-term
    }
    timeScore = Math.max(0, Math.min(100, timeScore));

    // Market Score (simplified)
    const marketScore = 50; // Neutral for now

    return {
      technicalScore,
      fundamentalScore,
      profitScore,
      timeScore,
      marketScore
    };
  }

  /**
   * Determine recommendation based on analysis
   */
  private determineRecommendation(
    netProfitPct: number,
    scoreComponents: SellScoreComponents,
    thresholds: SellThresholds
  ): {
    recommendation: SellAnalysisData['recommendation'];
    riskLevel: SellAnalysisData['risk_level'];
    reason: string;
  } {
    // Calculate overall score
    const overallScore = (
      scoreComponents.technicalScore * 0.3 +
      scoreComponents.fundamentalScore * 0.2 +
      scoreComponents.profitScore * 0.3 +
      scoreComponents.timeScore * 0.1 +
      scoreComponents.marketScore * 0.1
    );

    // Stop loss check (highest priority)
    if (netProfitPct <= thresholds.stop_loss) {
      return {
        recommendation: 'STOP_LOSS',
        riskLevel: 'CRITICAL',
        reason: `Pérdida alcanzó ${netProfitPct.toFixed(1)}%, activando stop loss (${thresholds.stop_loss}%)`
      };
    }

    // Take profit levels
    if (netProfitPct >= thresholds.take_profit_2) {
      if (overallScore >= 70) {
        return {
          recommendation: 'TAKE_PROFIT_2',
          riskLevel: 'HIGH',
          reason: `Ganancia excelente ${netProfitPct.toFixed(1)}% con señales técnicas de venta (Score: ${overallScore.toFixed(0)})`
        };
      } else {
        return {
          recommendation: 'HOLD',
          riskLevel: 'MEDIUM',
          reason: `Ganancia excelente ${netProfitPct.toFixed(1)}% pero señales técnicas mixtas (Score: ${overallScore.toFixed(0)})`
        };
      }
    }

    if (netProfitPct >= thresholds.take_profit_1) {
      if (overallScore >= 75) {
        return {
          recommendation: 'TAKE_PROFIT_1',
          riskLevel: 'MEDIUM',
          reason: `Ganancia sólida ${netProfitPct.toFixed(1)}% con señales técnicas fuertes de venta (Score: ${overallScore.toFixed(0)})`
        };
      } else {
        return {
          recommendation: 'HOLD',
          riskLevel: 'LOW',
          reason: `Ganancia sólida ${netProfitPct.toFixed(1)}% pero señales técnicas no conclusivas (Score: ${overallScore.toFixed(0)})`
        };
      }
    }

    // Trailing stop logic
    if (netProfitPct >= thresholds.trailing_stop_trigger && overallScore >= 70) {
      return {
        recommendation: 'TRAILING_STOP',
        riskLevel: 'MEDIUM',
        reason: `Activar trailing stop desde ${netProfitPct.toFixed(1)}% con señales de debilidad técnica`
      };
    }

    // Default hold
    let riskLevel: SellAnalysisData['risk_level'] = 'LOW';
    if (netProfitPct < -3) riskLevel = 'HIGH';
    else if (netProfitPct < 0) riskLevel = 'MEDIUM';

    return {
      recommendation: 'HOLD',
      riskLevel,
      reason: `Mantener posición. Ganancia actual: ${netProfitPct.toFixed(1)}%, Score técnico: ${overallScore.toFixed(0)}`
    };
  }

  /**
   * Generate alerts based on analysis
   */
  private async generateAlerts(
    position: any,
    analysis: Omit<SellAnalysisData, 'id' | 'created_at' | 'updated_at'>,
    thresholds: SellThresholds
  ): Promise<SellAlertData[]> {
    const alerts: SellAlertData[] = [];

    try {
      // Deactivate existing alerts for this position
      const existingAlerts = await this.sellAlertModel.findActiveByPositionId(position.id);
      for (const alert of existingAlerts) {
        if (alert.id) {
          await this.sellAlertModel.deactivateAlert(alert.id);
        }
      }

      // Generate new alerts based on current analysis
      if (analysis.recommendation === 'STOP_LOSS') {
        const alert = await this.sellAlertModel.create({
          position_id: position.id,
          instrument_id: position.instrument_id,
          ticker: analysis.ticker,
          alert_type: 'STOP_LOSS',
          threshold_value: thresholds.stop_loss,
          current_value: analysis.net_profit_pct,
          priority: 'CRITICAL',
          message: `🚨 STOP LOSS: ${analysis.ticker} ha perdido ${Math.abs(analysis.net_profit_pct).toFixed(1)}%`,
          is_active: true
        });
        alerts.push(alert);
      }

      if (analysis.recommendation === 'TAKE_PROFIT_1') {
        const alert = await this.sellAlertModel.create({
          position_id: position.id,
          instrument_id: position.instrument_id,
          ticker: analysis.ticker,
          alert_type: 'TAKE_PROFIT_1',
          threshold_value: thresholds.take_profit_1,
          current_value: analysis.net_profit_pct,
          priority: 'MEDIUM',
          message: `💰 TAKE PROFIT 1: ${analysis.ticker} ganó ${analysis.net_profit_pct.toFixed(1)}%`,
          is_active: true
        });
        alerts.push(alert);
      }

      if (analysis.recommendation === 'TAKE_PROFIT_2') {
        const alert = await this.sellAlertModel.create({
          position_id: position.id,
          instrument_id: position.instrument_id,
          ticker: analysis.ticker,
          alert_type: 'TAKE_PROFIT_2',
          threshold_value: thresholds.take_profit_2,
          current_value: analysis.net_profit_pct,
          priority: 'HIGH',
          message: `🎯 TAKE PROFIT 2: ${analysis.ticker} ganó ${analysis.net_profit_pct.toFixed(1)}%`,
          is_active: true
        });
        alerts.push(alert);
      }

      if (analysis.recommendation === 'TRAILING_STOP') {
        const alert = await this.sellAlertModel.create({
          position_id: position.id,
          instrument_id: position.instrument_id,
          ticker: analysis.ticker,
          alert_type: 'TRAILING_STOP',
          threshold_value: thresholds.trailing_stop_trigger,
          current_value: analysis.net_profit_pct,
          priority: 'MEDIUM',
          message: `📈 TRAILING STOP: Activar para ${analysis.ticker} desde ${analysis.net_profit_pct.toFixed(1)}%`,
          is_active: true
        });
        alerts.push(alert);
      }

      // Time-based alert
      if (analysis.days_held >= thresholds.time_based_days && analysis.net_profit_pct > 5) {
        const alert = await this.sellAlertModel.create({
          position_id: position.id,
          instrument_id: position.instrument_id,
          ticker: analysis.ticker,
          alert_type: 'TIME_BASED',
          threshold_value: thresholds.time_based_days,
          current_value: analysis.days_held,
          priority: 'LOW',
          message: `⏰ REVISIÓN: ${analysis.ticker} en cartera ${analysis.days_held} días con ${analysis.net_profit_pct.toFixed(1)}% ganancia`,
          is_active: true
        });
        alerts.push(alert);
      }

      // Technical alert for strong sell signals
      if (analysis.technical_score >= 80) {
        const alert = await this.sellAlertModel.create({
          position_id: position.id,
          instrument_id: position.instrument_id,
          ticker: analysis.ticker,
          alert_type: 'TECHNICAL',
          threshold_value: 80,
          current_value: analysis.technical_score,
          priority: 'MEDIUM',
          message: `📊 TÉCNICO: Señales fuertes de venta para ${analysis.ticker} (Score: ${analysis.technical_score})`,
          is_active: true
        });
        alerts.push(alert);
      }

    } catch (error) {
      logger.error('Error generating alerts:', error);
    }

    return alerts;
  }

  /**
   * Calculate days held
   */
  private calculateDaysHeld(dateString: string): number {
    const buyDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - buyDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<SellAlertData[]> {
    return await this.sellAlertModel.findActiveAlerts();
  }

  /**
   * Get alerts for a specific position
   */
  async getPositionAlerts(positionId: number): Promise<SellAlertData[]> {
    return await this.sellAlertModel.findByPositionId(positionId);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: number): Promise<SellAlertData | null> {
    return await this.sellAlertModel.acknowledgeAlert(alertId);
  }

  /**
   * Get analysis history for a position
   */
  async getPositionAnalysisHistory(positionId: number): Promise<SellAnalysisData[]> {
    return await this.sellAnalysisModel.findByPositionId(positionId);
  }

  /**
   * Simulate sell scenario
   */
  async simulateSell(positionId: number, sellPrice?: number): Promise<{
    gross_proceeds: number;
    commission_cost: number;
    net_proceeds: number;
    total_invested: number;
    inflation_adjusted_cost: number;
    gross_profit: number;
    net_profit: number;
    gross_profit_pct: number;
    net_profit_pct: number;
    break_even_price: number;
  }> {
    const position = await this.portfolioService.getPortfolioPosition(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const instrument = await this.instrumentService.getInstrumentById(position.instrument_id);
    if (!instrument) {
      throw new Error(`Instrument not found`);
    }

    // Use provided price or current market price
    let currentPrice = sellPrice;
    if (!currentPrice) {
      const quote = await this.quoteService.getLatestQuote(instrument.symbol);
      currentPrice = this.resolveQuotePrice(quote, this.resolveAverageCost(position));
    }

    const grossProceeds = position.quantity * currentPrice;

    // Calculate commission
    const commission: CommissionCalculation = this.commissionService.calculateOperationCommission(
      'SELL',
      grossProceeds
    );

    const netProceeds = commission.netAmount;

    // Calculate inflation adjustment
    const inflationData = await this.calculateInflationAdjustment(position);

    const grossProfit = grossProceeds - position.total_cost;
    const netProfit = netProceeds - inflationData.adjusted_cost;

    const grossProfitPct = position.total_cost > 0
      ? (grossProfit / position.total_cost) * 100
      : 0;
    const netProfitPct = inflationData.adjusted_cost > 0
      ? (netProfit / inflationData.adjusted_cost) * 100
      : 0;

    // Calculate break-even price (including commissions and inflation)
    const breakEvenPrice = position.quantity > 0
      ? (inflationData.adjusted_cost + commission.totalCommission) / position.quantity
      : 0;

    return {
      gross_proceeds: grossProceeds,
      commission_cost: commission.totalCommission,
      net_proceeds: netProceeds,
      total_invested: position.total_cost,
      inflation_adjusted_cost: inflationData.adjusted_cost,
      gross_profit: grossProfit,
      net_profit: netProfit,
      gross_profit_pct: grossProfitPct,
      net_profit_pct: netProfitPct,
      break_even_price: breakEvenPrice
    };
  }

  /**
   * Get service statistics
   */
  async getServiceStats(): Promise<{
    analysis: any;
    alerts: any;
    recent_activity: {
      last_24h_analysis: number;
      active_alerts: number;
      positions_analyzed: number;
    };
  }> {
    const [analysisStats, alertStats] = await Promise.all([
      this.sellAnalysisModel.getStatistics(),
      this.sellAlertModel.getStatistics()
    ]);

    const recent = await this.sellAnalysisModel.findRecentAnalysis(24);
    const activeAlerts = await this.sellAlertModel.findActiveAlerts();

    return {
      analysis: analysisStats,
      alerts: alertStats,
      recent_activity: {
        last_24h_analysis: recent.length,
        active_alerts: activeAlerts.length,
        positions_analyzed: new Set(recent.map(a => a.position_id)).size
      }
    };
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<{ analysis_deleted: number; alerts_deleted: number }> {
    const [analysisDeleted, alertsDeleted] = await Promise.all([
      this.sellAnalysisModel.cleanup(90), // Keep 90 days of analysis
      this.sellAlertModel.cleanup(30)     // Keep 30 days of old alerts
    ]);

    logger.info(`Cleanup completed: ${analysisDeleted} analysis, ${alertsDeleted} alerts deleted`);

    return {
      analysis_deleted: analysisDeleted,
      alerts_deleted: alertsDeleted
    };
  }
}

export const sellAnalysisService = new SellAnalysisService();
