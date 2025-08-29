/**
 * Servicio de Estrategias de Aceleración para Objetivos
 * Paso 28.4: Estrategias para acelerar metas
 */

import Database from 'better-sqlite3';
import {
  GoalAccelerationStrategy,
  CreateAccelerationStrategyDto,
  MonitoringRequirement,
  ExitCondition,
  SuccessMetric,
  HistoricalPerformanceData,
  PortfolioImpactAnalysis,
  AccelerationPerformanceTracking
} from '../models/GoalOptimizer';
import { GoalTrackerService } from './GoalTrackerService';
import { PortfolioService } from './PortfolioService';
import { OpportunityService } from './OpportunityService';
import { TechnicalAnalysisService } from './TechnicalAnalysisService';
import { FinancialGoal } from '../models/FinancialGoal';

export class GoalAccelerationService {
  private db: Database.Database;
  private goalTrackerService: GoalTrackerService;
  private portfolioService: PortfolioService;
  private opportunityService: OpportunityService;
  private technicalAnalysisService: TechnicalAnalysisService;

  constructor(db: Database.Database) {
    this.db = db;
    this.goalTrackerService = new GoalTrackerService(db);
    this.portfolioService = new PortfolioService(db);
    this.opportunityService = new OpportunityService();
    this.technicalAnalysisService = new TechnicalAnalysisService();
  }

  // 28.4: Generar estrategias de aceleración para un objetivo
  async generateAccelerationStrategies(goalId: number): Promise<GoalAccelerationStrategy[]> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    const currentCapital = await this.getCurrentCapital();
    const portfolioData = await this.getPortfolioAnalysis();
    
    const strategies: CreateAccelerationStrategyDto[] = [];

    // Estrategia 1: Market Timing - Aprovechar volatilidad del mercado
    strategies.push(await this.createMarketTimingStrategy(goal, currentCapital, portfolioData));

    // Estrategia 2: Dividend Capture - Capturar dividendos sistemáticamente
    strategies.push(await this.createDividendCaptureStrategy(goal, currentCapital, portfolioData));

    // Estrategia 3: Volatility Harvest - Rebalanceo sistemático
    strategies.push(await this.createVolatilityHarvestStrategy(goal, currentCapital, portfolioData));

    // Estrategia 4: Cost Reduction - Optimización de costos
    strategies.push(await this.createCostReductionStrategy(goal, currentCapital, portfolioData));

    // Estrategia 5: Tax Optimization - Optimización fiscal
    strategies.push(await this.createTaxOptimizationStrategy(goal, currentCapital, portfolioData));

    // Estrategia 6: Sector Rotation - Rotación sectorial
    if (portfolioData.diversificationScore < 70) {
      strategies.push(await this.createSectorRotationStrategy(goal, currentCapital, portfolioData));
    }

    // Guardar estrategias en base de datos
    const savedStrategies: GoalAccelerationStrategy[] = [];
    for (const strategy of strategies) {
      const saved = await this.saveAccelerationStrategy(strategy);
      savedStrategies.push(saved);
    }

    return savedStrategies;
  }

  private async createMarketTimingStrategy(
    goal: FinancialGoal, 
    currentCapital: number, 
    portfolioData: any
  ): Promise<CreateAccelerationStrategyDto> {
    const potentialAcceleration = this.calculateTimingAcceleration(goal, portfolioData.marketVolatility);
    
    return {
      goal_id: goal.id,
      strategy_name: 'Timing de Mercado Táctico',
      acceleration_type: 'MARKET_TIMING',
      potential_acceleration_months: potentialAcceleration,
      risk_increase_factor: 1.3, // 30% más riesgo
      complexity_score: 7, // Alta complejidad
      capital_requirements: currentCapital * 0.1, // 10% capital adicional para oportunidades
      expected_return_boost: 3.5, // 3.5% adicional anual
      implementation_timeline_days: 30
    };
  }

  private async createDividendCaptureStrategy(
    goal: FinancialGoal, 
    currentCapital: number, 
    portfolioData: any
  ): Promise<CreateAccelerationStrategyDto> {
    const potentialAcceleration = this.calculateDividendAcceleration(goal, portfolioData.dividendYield);
    
    return {
      goal_id: goal.id,
      strategy_name: 'Captura Sistemática de Dividendos',
      acceleration_type: 'DIVIDEND_CAPTURE',
      potential_acceleration_months: potentialAcceleration,
      risk_increase_factor: 1.1, // 10% más riesgo
      complexity_score: 5, // Complejidad moderada
      capital_requirements: currentCapital * 0.05, // 5% capital adicional
      expected_return_boost: 2.8, // 2.8% adicional anual
      implementation_timeline_days: 14
    };
  }

  private async createVolatilityHarvestStrategy(
    goal: FinancialGoal, 
    currentCapital: number, 
    portfolioData: any
  ): Promise<CreateAccelerationStrategyDto> {
    const potentialAcceleration = this.calculateVolatilityAcceleration(goal, portfolioData.portfolioVolatility);
    
    return {
      goal_id: goal.id,
      strategy_name: 'Cosecha de Volatilidad (Rebalanceo)',
      acceleration_type: 'VOLATILITY_HARVEST',
      potential_acceleration_months: potentialAcceleration,
      risk_increase_factor: 1.05, // 5% más riesgo
      complexity_score: 4, // Complejidad moderada-baja
      capital_requirements: 0, // No requiere capital adicional
      expected_return_boost: 1.5, // 1.5% adicional anual
      implementation_timeline_days: 7
    };
  }

  private async createCostReductionStrategy(
    goal: FinancialGoal, 
    currentCapital: number, 
    portfolioData: any
  ): Promise<CreateAccelerationStrategyDto> {
    const potentialAcceleration = this.calculateCostReductionAcceleration(goal, portfolioData.totalCosts);
    
    return {
      goal_id: goal.id,
      strategy_name: 'Optimización Integral de Costos',
      acceleration_type: 'COST_REDUCTION',
      potential_acceleration_months: potentialAcceleration,
      risk_increase_factor: 1.0, // Sin aumento de riesgo
      complexity_score: 3, // Baja complejidad
      capital_requirements: 0,
      expected_return_boost: null, // No aumenta retorno, reduce costos
      implementation_timeline_days: 14
    };
  }

  private async createTaxOptimizationStrategy(
    goal: FinancialGoal, 
    currentCapital: number, 
    portfolioData: any
  ): Promise<CreateAccelerationStrategyDto> {
    const potentialAcceleration = this.calculateTaxOptimizationAcceleration(goal, portfolioData.taxEfficiency);
    
    return {
      goal_id: goal.id,
      strategy_name: 'Optimización Fiscal Avanzada',
      acceleration_type: 'TAX_OPTIMIZATION',
      potential_acceleration_months: potentialAcceleration,
      risk_increase_factor: 1.0, // Sin aumento de riesgo
      complexity_score: 6, // Complejidad moderada-alta
      capital_requirements: 0,
      expected_return_boost: 2.2, // 2.2% adicional por eficiencia fiscal
      implementation_timeline_days: 21
    };
  }

  private async createSectorRotationStrategy(
    goal: FinancialGoal, 
    currentCapital: number, 
    portfolioData: any
  ): Promise<CreateAccelerationStrategyDto> {
    const potentialAcceleration = this.calculateSectorRotationAcceleration(goal, portfolioData.sectorConcentration);
    
    return {
      goal_id: goal.id,
      strategy_name: 'Rotación Sectorial Táctica',
      acceleration_type: 'SECTOR_ROTATION',
      potential_acceleration_months: potentialAcceleration,
      risk_increase_factor: 1.2, // 20% más riesgo
      complexity_score: 8, // Alta complejidad
      capital_requirements: currentCapital * 0.15, // 15% capital adicional
      expected_return_boost: 4.2, // 4.2% adicional anual
      implementation_timeline_days: 45
    };
  }

  // Métodos de cálculo de aceleración potencial
  private calculateTimingAcceleration(goal: FinancialGoal, marketVolatility: number): number {
    // Más volatilidad = más oportunidades de timing, pero también más riesgo
    const baseAcceleration = 6; // 6 meses base
    const volatilityMultiplier = Math.min(2.0, marketVolatility / 0.15); // Cap en 2x
    return Math.round(baseAcceleration * volatilityMultiplier);
  }

  private calculateDividendAcceleration(goal: FinancialGoal, dividendYield: number): number {
    // Mayor yield = mayor aceleración potencial
    const baseAcceleration = 3; // 3 meses base
    const yieldMultiplier = Math.min(2.5, dividendYield / 0.04); // Cap en 2.5x
    return Math.round(baseAcceleration * yieldMultiplier);
  }

  private calculateVolatilityAcceleration(goal: FinancialGoal, portfolioVolatility: number): number {
    // Volatilidad moderada es óptima para rebalanceo
    const optimalVolatility = 0.18; // 18% anual
    const distance = Math.abs(portfolioVolatility - optimalVolatility);
    const baseAcceleration = 4; // 4 meses base
    const efficiency = Math.max(0.3, 1 - (distance / optimalVolatility));
    return Math.round(baseAcceleration * efficiency);
  }

  private calculateCostReductionAcceleration(goal: FinancialGoal, totalCosts: number): number {
    // Más costos = más potencial de ahorro
    const baseAcceleration = 2; // 2 meses base
    const costMultiplier = Math.min(3.0, totalCosts / 0.015); // Cap en 3x (1.5% costos)
    return Math.round(baseAcceleration * costMultiplier);
  }

  private calculateTaxOptimizationAcceleration(goal: FinancialGoal, taxEfficiency: number): number {
    // Menor eficiencia fiscal = mayor potencial de mejora
    const baseAcceleration = 3; // 3 meses base
    const inefficiencyMultiplier = Math.max(0.5, (1 - taxEfficiency) * 2);
    return Math.round(baseAcceleration * inefficiencyMultiplier);
  }

  private calculateSectorRotationAcceleration(goal: FinancialGoal, sectorConcentration: number): number {
    // Mayor concentración = mayor potencial de diversificación
    const baseAcceleration = 8; // 8 meses base
    const concentrationMultiplier = Math.min(1.8, sectorConcentration / 0.5); // Cap en 1.8x
    return Math.round(baseAcceleration * concentrationMultiplier);
  }

  // Activar estrategia de aceleración
  async activateAccelerationStrategy(strategyId: number): Promise<GoalAccelerationStrategy> {
    const strategy = await this.getAccelerationStrategy(strategyId);
    if (!strategy) {
      throw new Error('Estrategia de aceleración no encontrada');
    }

    if (strategy.is_active) {
      throw new Error('La estrategia ya está activa');
    }

    // Validar condiciones de mercado si es necesario
    await this.validateMarketConditions(strategy);

    // Crear requerimientos de monitoreo
    const monitoringRequirements = this.createMonitoringRequirements(strategy);
    
    // Crear condiciones de salida
    const exitConditions = this.createExitConditions(strategy);
    
    // Crear métricas de éxito
    const successMetrics = this.createSuccessMetrics(strategy);

    // Activar la estrategia
    const updateQuery = `
      UPDATE goal_acceleration_strategies 
      SET is_active = 1, activated_date = ?, 
          monitoring_requirements = ?, exit_conditions = ?, success_metrics = ?
      WHERE id = ?
      RETURNING *
    `;

    const stmt = this.db.prepare(updateQuery);
    const updatedStrategy = stmt.get(
      new Date().toISOString(),
      JSON.stringify(monitoringRequirements),
      JSON.stringify(exitConditions),
      JSON.stringify(successMetrics),
      strategyId
    ) as GoalAccelerationStrategy;

    return updatedStrategy;
  }

  private createMonitoringRequirements(strategy: GoalAccelerationStrategy): MonitoringRequirement[] {
    const requirements: MonitoringRequirement[] = [];

    switch (strategy.acceleration_type) {
      case 'MARKET_TIMING':
        requirements.push({
          metric_name: 'VIX Index',
          check_frequency_days: 1,
          threshold_values: { warning: 25, critical: 35 },
          action_required: 'Revisar exposición al riesgo'
        });
        requirements.push({
          metric_name: 'Portfolio Beta',
          check_frequency_days: 7,
          threshold_values: { warning: 1.2, critical: 1.5 },
          action_required: 'Reducir beta del portafolio'
        });
        break;

      case 'DIVIDEND_CAPTURE':
        requirements.push({
          metric_name: 'Dividend Yield Portfolio',
          check_frequency_days: 30,
          threshold_values: { warning: 0.02, critical: 0.015 },
          action_required: 'Revisar selección de instrumentos dividenderos'
        });
        break;

      case 'VOLATILITY_HARVEST':
        requirements.push({
          metric_name: 'Portfolio Rebalancing Frequency',
          check_frequency_days: 14,
          threshold_values: { warning: 30, critical: 45 },
          action_required: 'Ajustar frecuencia de rebalanceo'
        });
        break;

      case 'COST_REDUCTION':
        requirements.push({
          metric_name: 'Total Expense Ratio',
          check_frequency_days: 90,
          threshold_values: { warning: 0.02, critical: 0.025 },
          action_required: 'Revisar costos de instrumentos'
        });
        break;

      default:
        requirements.push({
          metric_name: 'Strategy Performance',
          check_frequency_days: 30,
          threshold_values: { warning: -0.05, critical: -0.1 },
          action_required: 'Evaluar continuidad de la estrategia'
        });
    }

    return requirements;
  }

  private createExitConditions(strategy: GoalAccelerationStrategy): ExitCondition[] {
    const conditions: ExitCondition[] = [];

    // Condición de salida por tiempo
    conditions.push({
      condition_type: 'TIME_BASED',
      description: 'Duración máxima de la estrategia',
      trigger_value: 365, // 1 año máximo
      action_to_take: 'Revisar y decidir continuidad',
      priority: 'MEDIUM'
    });

    // Condición de salida por performance
    conditions.push({
      condition_type: 'PERFORMANCE_BASED',
      description: 'Performance negativa sostenida',
      trigger_value: -10, // -10% retorno
      action_to_take: 'Desactivar estrategia inmediatamente',
      priority: 'HIGH'
    });

    // Condición de salida por riesgo
    if (strategy.risk_increase_factor > 1.2) {
      conditions.push({
        condition_type: 'RISK_BASED',
        description: 'Aumento excesivo de riesgo',
        trigger_value: strategy.risk_increase_factor * 1.5,
        action_to_take: 'Reducir exposición gradualmente',
        priority: 'HIGH'
      });
    }

    // Condición de salida por mercado
    conditions.push({
      condition_type: 'MARKET_BASED',
      description: 'Condiciones de mercado adversas',
      trigger_value: 30, // VIX > 30
      action_to_take: 'Evaluar suspensión temporal',
      priority: 'MEDIUM'
    });

    return conditions;
  }

  private createSuccessMetrics(strategy: GoalAccelerationStrategy): SuccessMetric[] {
    const metrics: SuccessMetric[] = [];

    // Métrica principal: aceleración del objetivo
    metrics.push({
      metric_name: 'Months Accelerated',
      target_value: strategy.potential_acceleration_months,
      measurement_frequency: 'MONTHLY',
      current_value: null,
      trend_direction: null
    });

    // Métrica de rentabilidad adicional
    if (strategy.expected_return_boost) {
      metrics.push({
        metric_name: 'Additional Annual Return',
        target_value: strategy.expected_return_boost,
        measurement_frequency: 'QUARTERLY',
        current_value: null,
        trend_direction: null
      });
    }

    // Métrica de eficiencia de costos
    if (strategy.acceleration_type === 'COST_REDUCTION') {
      metrics.push({
        metric_name: 'Cost Savings Percentage',
        target_value: 0.5, // 0.5% reducción de costos
        measurement_frequency: 'QUARTERLY',
        current_value: null,
        trend_direction: null
      });
    }

    // Métrica de riesgo ajustado
    metrics.push({
      metric_name: 'Sharpe Ratio Improvement',
      target_value: 0.2, // Mejora de 0.2 en Sharpe Ratio
      measurement_frequency: 'QUARTERLY',
      current_value: null,
      trend_direction: null
    });

    return metrics;
  }

  private async validateMarketConditions(strategy: GoalAccelerationStrategy): Promise<void> {
    // Validaciones específicas según el tipo de estrategia
    switch (strategy.acceleration_type) {
      case 'MARKET_TIMING':
        const vix = await this.getCurrentVIX(); // Simular obtención de VIX
        if (vix > 40) {
          throw new Error('Condiciones de mercado demasiado volátiles para timing táctico');
        }
        break;

      case 'DIVIDEND_CAPTURE':
        const dividendSeason = this.isDividendSeason();
        if (!dividendSeason) {
          console.warn('Fuera de temporada de dividendos principal, considerar esperar');
        }
        break;

      case 'SECTOR_ROTATION':
        const sectorTrends = await this.getSectorTrends(); // Simular análisis sectorial
        if (sectorTrends.uncertainty > 0.7) {
          throw new Error('Incertidumbre sectorial demasiado alta para rotación');
        }
        break;
    }
  }

  // Desactivar estrategia de aceleración
  async deactivateAccelerationStrategy(strategyId: number, reason: string): Promise<GoalAccelerationStrategy> {
    const updateQuery = `
      UPDATE goal_acceleration_strategies 
      SET is_active = 0, deactivated_date = ?
      WHERE id = ?
      RETURNING *
    `;

    const stmt = this.db.prepare(updateQuery);
    const updatedStrategy = stmt.get(new Date().toISOString(), strategyId) as GoalAccelerationStrategy;

    // Registrar razón de desactivación en performance tracking
    if (updatedStrategy) {
      await this.updatePerformanceTracking(strategyId, {
        deactivation_reason: reason,
        deactivation_date: new Date().toISOString()
      });
    }

    return updatedStrategy;
  }

  // Actualizar seguimiento de performance
  private async updatePerformanceTracking(strategyId: number, trackingData: any): Promise<void> {
    const existingStrategy = await this.getAccelerationStrategy(strategyId);
    if (!existingStrategy) return;

    const currentTracking = existingStrategy.performance_tracking || {
      start_date: existingStrategy.activated_date || new Date().toISOString(),
      target_acceleration_months: existingStrategy.potential_acceleration_months,
      actual_acceleration_months: null,
      incremental_returns: [],
      risk_metrics: {
        volatility_increase: 0,
        max_drawdown: 0,
        risk_adjusted_return: 0
      },
      adjustments_made: [],
      lessons_learned: []
    };

    const updatedTracking = { ...currentTracking, ...trackingData };

    const updateQuery = `
      UPDATE goal_acceleration_strategies 
      SET performance_tracking = ?
      WHERE id = ?
    `;

    const stmt = this.db.prepare(updateQuery);
    stmt.run(JSON.stringify(updatedTracking), strategyId);
  }

  // Métodos auxiliares
  private async getCurrentCapital(): Promise<number> {
    try {
      const summary = await this.portfolioService.getPortfolioSummary();
      return summary.totalValue || 25000;
    } catch {
      return 25000;
    }
  }

  private async getPortfolioAnalysis(): Promise<any> {
    // Análisis simulado del portafolio
    return {
      marketVolatility: 0.16, // 16% anualizado
      dividendYield: 0.035, // 3.5% yield promedio
      portfolioVolatility: 0.14, // 14% anualizado
      totalCosts: 0.018, // 1.8% costos totales
      taxEfficiency: 0.85, // 85% eficiencia fiscal
      diversificationScore: 65, // Score de diversificación
      sectorConcentration: 0.4 // 40% concentración sectorial
    };
  }

  private async getCurrentVIX(): Promise<number> {
    // Simular obtención del VIX
    return 18.5; // Valor simulado
  }

  private isDividendSeason(): boolean {
    const currentMonth = new Date().getMonth() + 1;
    // Temporada de dividendos típica en Argentina: Abril-Mayo y Noviembre-Diciembre
    return [4, 5, 11, 12].includes(currentMonth);
  }

  private async getSectorTrends(): Promise<any> {
    // Análisis simulado de tendencias sectoriales
    return {
      uncertainty: 0.3, // 30% incertidumbre
      trends: {
        technology: 'BULLISH',
        finance: 'NEUTRAL',
        commodities: 'BEARISH'
      }
    };
  }

  // Métodos de persistencia y consulta
  private async saveAccelerationStrategy(data: CreateAccelerationStrategyDto): Promise<GoalAccelerationStrategy> {
    const query = `
      INSERT INTO goal_acceleration_strategies (
        goal_id, strategy_name, acceleration_type, potential_acceleration_months,
        risk_increase_factor, complexity_score, capital_requirements,
        expected_return_boost, implementation_timeline_days, recommendation_confidence, is_recommended
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(
      data.goal_id, data.strategy_name, data.acceleration_type,
      data.potential_acceleration_months, data.risk_increase_factor,
      data.complexity_score, data.capital_requirements,
      data.expected_return_boost, data.implementation_timeline_days,
      85, // Confidence score simulado
      1 // Recomendado por defecto
    ) as GoalAccelerationStrategy;

    return result;
  }

  private async getAccelerationStrategy(strategyId: number): Promise<GoalAccelerationStrategy | null> {
    const query = 'SELECT * FROM goal_acceleration_strategies WHERE id = ?';
    const stmt = this.db.prepare(query);
    return stmt.get(strategyId) as GoalAccelerationStrategy || null;
  }

  // Obtener estrategias de aceleración por objetivo
  async getAccelerationStrategiesByGoal(goalId: number): Promise<GoalAccelerationStrategy[]> {
    const query = `
      SELECT * FROM goal_acceleration_strategies 
      WHERE goal_id = ? 
      ORDER BY is_active DESC, recommendation_confidence DESC, potential_acceleration_months DESC
    `;
    const stmt = this.db.prepare(query);
    return stmt.all(goalId) as GoalAccelerationStrategy[];
  }

  // Obtener estrategias activas
  async getActiveAccelerationStrategies(): Promise<GoalAccelerationStrategy[]> {
    const query = 'SELECT * FROM goal_acceleration_strategies WHERE is_active = 1';
    const stmt = this.db.prepare(query);
    return stmt.all() as GoalAccelerationStrategy[];
  }
}