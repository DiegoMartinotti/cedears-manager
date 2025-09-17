import Database from 'better-sqlite3';
import { CompoundInterestEngine, ProjectionParameters, ProjectionResult } from './CompoundInterestEngine';
import { GoalTrackerService } from './GoalTrackerService';
import { FinancialGoal } from '../models/FinancialGoal';
import { UVAService } from './UVAService';
import { PortfolioService } from './PortfolioService';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GoalProjectionService');

/**
 * Servicio de proyecciones financieras avanzadas para objetivos
 * Step 27.2: Ajuste dinámico según rendimiento real
 */

export interface GoalProjection {
  id?: number;
  goal_id: number;
  projection_date: string;
  scenario_name: string;
  projection_type: 'OPTIMISTIC' | 'REALISTIC' | 'PESSIMISTIC' | 'MONTE_CARLO';
  parameters: ProjectionParameters;
  result: ProjectionResult;
  confidence_level: number; // 0-100
  last_updated: string;
  is_active: boolean;
}

export interface DynamicAdjustment {
  original_return_rate: number;
  adjusted_return_rate: number;
  adjustment_reason: string;
  historical_performance: number;
  volatility_factor: number;
  market_conditions: string;
  confidence_score: number;
}

export interface GoalProjectionSummary {
  goal: FinancialGoal;
  current_projection: GoalProjection;
  scenarios: GoalProjection[];
  dynamic_adjustments: DynamicAdjustment;
  performance_metrics: {
    actual_vs_projected: number;
    trend_direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
    last_6_months_performance: number;
    volatility_index: number;
  };
}

export class GoalProjectionService {
  private db: Database.Database;
  private compoundEngine: CompoundInterestEngine;
  private goalTrackerService: GoalTrackerService;
  private uvaService: UVAService;
  private portfolioService: PortfolioService;
  constructor(db: Database.Database) {
    this.db = db;
    this.compoundEngine = new CompoundInterestEngine(db);
    this.goalTrackerService = new GoalTrackerService(db);
    this.uvaService = new UVAService();
    this.portfolioService = new PortfolioService();
  }

  /**
   * Genera proyecciones completas para un objetivo
   */
  async generateGoalProjections(goalId: number): Promise<GoalProjectionSummary> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    // Obtener performance actual del portafolio
    const currentCapital = await this.getCurrentCapital();
    const historicalPerformance = await this.calculateHistoricalPerformance();
    
    // Realizar ajuste dinámico
    const dynamicAdjustment = await this.performDynamicAdjustment(goal, historicalPerformance);
    
    // Generar proyecciones con diferentes escenarios
    const baseParams = this.buildProjectionParameters(goal, currentCapital, dynamicAdjustment.adjusted_return_rate);
    const scenarios = await this.generateProjectionScenarios(goal.id, baseParams);
    
    // Calcular métricas de performance
    const performanceMetrics = await this.calculatePerformanceMetrics();
    
    const currentProjection = scenarios.find(s => s.projection_type === 'REALISTIC') ?? scenarios[0];
    if (!currentProjection) {
      throw new Error('No se pudieron generar proyecciones para el objetivo solicitado');
    }

    return {
      goal,
      current_projection: currentProjection,
      scenarios,
      dynamic_adjustments: dynamicAdjustment,
      performance_metrics: performanceMetrics
    };
  }

  /**
   * Ajuste dinámico según rendimiento real (27.2)
   */
  // eslint-disable-next-line max-lines-per-function
  private async performDynamicAdjustment(
    goal: FinancialGoal,
    historicalPerformance: number
  ): Promise<DynamicAdjustment> {
    const originalRate = goal.expected_return_rate;
    let adjustedRate = originalRate;
    let adjustmentReason = 'Sin ajustes necesarios';
    let confidenceScore = 85;

    // Factor 1: Performance histórica vs expectativa
    const performanceDiff = historicalPerformance - originalRate;
    if (Math.abs(performanceDiff) > 2) { // Diferencia mayor a 2%
      const adjustment = performanceDiff * 0.6; // Ajustar 60% de la diferencia
      adjustedRate += adjustment;
      adjustmentReason = `Ajuste basado en performance real: ${performanceDiff.toFixed(1)}%`;
      confidenceScore = Math.max(60, 85 - Math.abs(performanceDiff) * 3);
    }

    // Factor 2: Volatilidad del mercado
    const volatilityFactor = await this.calculateVolatilityFactor();
    if (volatilityFactor > 25) { // Alta volatilidad
      adjustedRate *= 0.9; // Reducir expectativa 10%
      adjustmentReason += ' | Ajuste por alta volatilidad de mercado';
      confidenceScore *= 0.85;
    }

    // Factor 3: Condiciones macroeconómicas
    const marketConditions = await this.assessMarketConditions();
    if (marketConditions === 'BEARISH') {
      adjustedRate *= 0.85; // Reducir expectativa 15%
      adjustmentReason += ' | Ajuste por condiciones bajistas';
      confidenceScore *= 0.8;
    } else if (marketConditions === 'BULLISH') {
      adjustedRate *= 1.1; // Aumentar expectativa 10%
      adjustmentReason += ' | Ajuste por condiciones alcistas';
      confidenceScore = Math.min(95, confidenceScore * 1.1);
    }

    // Límites de seguridad
    adjustedRate = Math.max(-50, Math.min(50, adjustedRate)); // Entre -50% y 50%

    return {
      original_return_rate: originalRate,
      adjusted_return_rate: adjustedRate,
      adjustment_reason: adjustmentReason,
      historical_performance: historicalPerformance,
      volatility_factor: volatilityFactor,
      market_conditions: marketConditions,
      confidence_score: Math.round(confidenceScore)
    };
  }

  /**
   * Genera múltiples escenarios de proyección
   */
  // eslint-disable-next-line max-lines-per-function
  private async generateProjectionScenarios(
    goalId: number,
    baseParams: ProjectionParameters
  ): Promise<GoalProjection[]> {
    const projections: GoalProjection[] = [];
    const currentDate = new Date().toISOString().substring(0, 10);

    // Escenario Optimista (+3%)
    const optimisticParams = {
      ...baseParams,
      annualReturnRate: baseParams.annualReturnRate + 3,
      contributionGrowthRate: (baseParams.contributionGrowthRate || 0) + 2
    };
    const optimisticResult = await this.compoundEngine.calculateFutureValue(optimisticParams);
    
    projections.push({
      goal_id: goalId,
      projection_date: currentDate,
      scenario_name: 'Escenario Optimista',
      projection_type: 'OPTIMISTIC',
      parameters: optimisticParams,
      result: optimisticResult,
      confidence_level: 25,
      last_updated: new Date().toISOString(),
      is_active: true
    });

    // Escenario Realista (base)
    const realisticResult = await this.compoundEngine.calculateFutureValue(baseParams);
    
    projections.push({
      goal_id: goalId,
      projection_date: currentDate,
      scenario_name: 'Escenario Realista',
      projection_type: 'REALISTIC',
      parameters: baseParams,
      result: realisticResult,
      confidence_level: 70,
      last_updated: new Date().toISOString(),
      is_active: true
    });

    // Escenario Pesimista (-4%)
    const pessimisticParams = {
      ...baseParams,
      annualReturnRate: baseParams.annualReturnRate - 4,
      inflationRate: (baseParams.inflationRate || 0) + 20 // Mayor inflación
    };
    const pessimisticResult = await this.compoundEngine.calculateFutureValue(pessimisticParams);
    
    projections.push({
      goal_id: goalId,
      projection_date: currentDate,
      scenario_name: 'Escenario Pesimista',
      projection_type: 'PESSIMISTIC',
      parameters: pessimisticParams,
      result: pessimisticResult,
      confidence_level: 90,
      last_updated: new Date().toISOString(),
      is_active: true
    });

    // Escenario Monte Carlo (promedio de múltiples simulaciones)
    const monteCarloResult = await this.performMonteCarloProjection(baseParams);
    
    projections.push({
      goal_id: goalId,
      projection_date: currentDate,
      scenario_name: 'Simulación Monte Carlo',
      projection_type: 'MONTE_CARLO',
      parameters: baseParams,
      result: monteCarloResult,
      confidence_level: 80,
      last_updated: new Date().toISOString(),
      is_active: true
    });

    return projections;
  }

  /**
   * Simulación Monte Carlo para proyecciones
   */
  private async performMonteCarloProjection(
    baseParams: ProjectionParameters,
    simulations: number = 1000
  ): Promise<ProjectionResult> {
    const results: ProjectionResult[] = [];
    
    for (let i = 0; i < simulations; i++) {
      // Generar parámetros aleatorios basados en distribución normal
      const randomParams = {
        ...baseParams,
        annualReturnRate: this.generateNormalRandom(baseParams.annualReturnRate, 8), // Desv. est. 8%
        inflationRate: this.generateNormalRandom(baseParams.inflationRate || 120, 30), // Desv. est. 30%
        contributionGrowthRate: this.generateNormalRandom(baseParams.contributionGrowthRate || 0, 5)
      };
      
      const result = await this.compoundEngine.calculateFutureValue(randomParams);
      results.push(result);
    }
    
    // Calcular estadísticas agregadas
    const futureValues = results.map(r => r.futureValue);
    const realFutureValues = results.map(r => r.realFutureValue);
    
    const sampleProjection = results[0];

    return {
      futureValue: this.calculatePercentile(futureValues, 50), // Mediana
      realFutureValue: this.calculatePercentile(realFutureValues, 50),
      totalContributions: baseParams.monthlyContribution * baseParams.periods,
      totalGrowth: this.calculateAverage(results.map(r => r.totalGrowth)),
      totalDividends: this.calculateAverage(results.map(r => r.totalDividends)),
      effectiveAnnualReturn: this.calculateAverage(results.map(r => r.effectiveAnnualReturn)),
      realAnnualReturn: this.calculateAverage(results.map(r => r.realAnnualReturn)),
      monthlyProjections: sampleProjection ? sampleProjection.monthlyProjections : []
    };
  }

  /**
   * Guarda proyecciones en base de datos
   */
  async saveGoalProjections(projections: GoalProjection[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO goal_projections (
        goal_id, projection_date, scenario_name, projection_type, 
        parameters, result, confidence_level, last_updated, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const projection of projections) {
        stmt.run([
          projection.goal_id,
          projection.projection_date,
          projection.scenario_name,
          projection.projection_type,
          JSON.stringify(projection.parameters),
          JSON.stringify(projection.result),
          projection.confidence_level,
          projection.last_updated,
          projection.is_active ? 1 : 0
        ]);
      }
    });

    transaction();
  }

  /**
   * Obtiene proyecciones guardadas
   */
  async getGoalProjections(goalId: number): Promise<GoalProjection[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM goal_projections 
      WHERE goal_id = ? AND is_active = 1 
      ORDER BY projection_date DESC
    `);
    
    const rows = stmt.all(goalId) as Array<Omit<GoalProjection, 'parameters' | 'result' | 'is_active'> & {
      parameters: string;
      result: string;
      is_active: number;
    }>;

    return rows.map(row => {
      const { parameters, result, is_active, ...rest } = row;
      return {
        ...rest,
        parameters: JSON.parse(parameters) as ProjectionParameters,
        result: JSON.parse(result) as ProjectionResult,
        is_active: is_active === 1
      };
    });
  }

  /**
   * Recalcula todas las proyecciones activas
   */
  async recalculateAllProjections(): Promise<void> {
    const activeGoals = await this.goalTrackerService.getAllGoals();
    
    for (const goal of activeGoals) {
      if (goal.status === 'ACTIVE') {
        try {
          const summary = await this.generateGoalProjections(goal.id);
          await this.saveGoalProjections(summary.scenarios);
          logger.info(`Proyecciones actualizadas para objetivo: ${goal.name}`);
        } catch (error) {
          logger.error(`Error actualizando proyecciones para objetivo ${goal.id}:`, error);
        }
      }
    }
  }

  /**
   * Métodos auxiliares privados
   */
  private buildProjectionParameters(
    goal: FinancialGoal, 
    currentCapital: number, 
    adjustedReturnRate: number
  ): ProjectionParameters {
    const targetDate = new Date(goal.target_date || Date.now() + 365 * 24 * 60 * 60 * 1000);
    const monthsToTarget = Math.max(1, Math.floor((targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)));

    return {
      presentValue: currentCapital,
      monthlyContribution: goal.monthly_contribution,
      annualReturnRate: adjustedReturnRate,
      inflationRate: 120, // Estimación para Argentina
      periods: monthsToTarget,
      contributionGrowthRate: 25, // 25% anual (inflación estimada)
      dividendYield: 3, // 3% anual estimado
      reinvestDividends: true
    };
  }

  private async getCurrentCapital(): Promise<number> {
    try {
      const summary = await this.portfolioService.getPortfolioSummary();
      const marketValue = summary.market_value ?? 0;
      return marketValue > 0 ? marketValue : 25000; // Valor simulado como fallback
    } catch {
      return 25000; // Valor simulado fallback
    }
  }

  private async calculateHistoricalPerformance(): Promise<number> {
    try {
      const summary = await this.portfolioService.getPortfolioSummary();
      return summary.unrealized_pnl_percentage ?? 8.5; // Performance simulada del 8.5% anual
    } catch {
      return 8.5; // Fallback
    }
  }

  private async calculateVolatilityFactor(): Promise<number> {
    // Simulado: calcular volatilidad basada en datos históricos
    return 18.5; // 18.5% de volatilidad anual
  }

  private async assessMarketConditions(): Promise<'BULLISH' | 'NEUTRAL' | 'BEARISH'> {
    // Simulado: evaluar condiciones macro
    const randomFactor = Math.random();
    if (randomFactor > 0.6) return 'BULLISH';
    if (randomFactor < 0.3) return 'BEARISH';
    return 'NEUTRAL';
  }

  private async calculatePerformanceMetrics(): Promise<GoalProjectionSummary['performance_metrics']> {
    return {
      actual_vs_projected: 2.3, // +2.3% vs proyección
      trend_direction: 'IMPROVING',
      last_6_months_performance: 12.8, // 12.8% últimos 6 meses
      volatility_index: 22.1 // Índice de volatilidad
    };
  }

  private generateNormalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    if (sorted.length === 0) {
      return 0;
    }

    const rawIndex = Math.ceil((percentile / 100) * sorted.length) - 1;
    const safeIndex = Math.max(0, Math.min(sorted.length - 1, rawIndex));
    return sorted[safeIndex] ?? 0;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}