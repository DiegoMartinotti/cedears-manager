/**
 * Servicio principal del Optimizador de Estrategia de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import Database from 'better-sqlite3';
import {
  GoalGapAnalysis,
  GoalOptimizationStrategy,
  GoalContributionPlan,
  GoalIntermediateMilestone,
  GoalOptimizerSummary,
  CreateOptimizationStrategyDto,
  CreateContributionPlanDto,
  CreateMilestoneDto,
  GapAnalysisDetails
} from '../models/GoalOptimizer';
import { GoalTrackerService } from './GoalTrackerService';
import { PortfolioService } from './PortfolioService';
import { UVAService } from './UVAService';
import { FinancialGoal } from '../models/FinancialGoal';

export class GoalOptimizerService {
  private db: Database.Database;
  private goalTrackerService: GoalTrackerService;
  private portfolioService: PortfolioService;
  private uvaService: UVAService;

  constructor(db: Database.Database) {
    this.db = db;
    this.goalTrackerService = new GoalTrackerService(db);
    this.portfolioService = new PortfolioService();
    this.uvaService = new UVAService();
  }

  // 28.1: Análisis de gap entre actual y objetivo
  async performGapAnalysis(goalId: number): Promise<GoalGapAnalysis> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    // Obtener capital actual del portafolio
    const currentCapital = await this.getCurrentCapital();
    
    // Calcular métricas de gap
    const gapMetrics = await this.calculateGapMetrics(goal, currentCapital);
    
    // Análisis detallado
    const analysisDetails = await this.generateGapAnalysisDetails(goal, currentCapital, gapMetrics);

    const analysisDate = new Date().toISOString().substring(0, 10);

    const gapAnalysisData = {
      goal_id: goalId,
      analysis_date: analysisDate,
      current_capital: currentCapital,
      target_capital: goal.target_amount || 0,
      gap_amount: gapMetrics.gap_amount,
      gap_percentage: gapMetrics.gap_percentage,
      current_monthly_contribution: goal.monthly_contribution,
      required_monthly_contribution: gapMetrics.required_monthly_contribution,
      contribution_gap: gapMetrics.contribution_gap,
      months_remaining: gapMetrics.months_remaining,
      projected_completion_date: gapMetrics.projected_completion_date,
      deviation_from_plan: gapMetrics.deviation_from_plan,
      risk_level: this.assessRiskLevel(gapMetrics.gap_percentage, gapMetrics.months_remaining),
      analysis_details: analysisDetails
    };

    return this.saveGapAnalysis(gapAnalysisData);
  }

  private async calculateGapMetrics(goal: FinancialGoal, currentCapital: number) {
    const targetCapital = goal.target_amount || 0;
    const gapAmount = targetCapital - currentCapital;
    const gapPercentage = targetCapital > 0 ? (gapAmount / targetCapital) * 100 : 0;

    // Calcular contribución mensual requerida
    const monthlyReturn = goal.expected_return_rate / 100 / 12;
    let monthsRemaining = null;
    let requiredMonthlyContribution = goal.monthly_contribution;
    let projectedCompletionDate = null;

    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const currentDate = new Date();
      monthsRemaining = Math.max(0, Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      if (monthsRemaining > 0) {
        // Calcular contribución mensual necesaria para llegar a la meta en tiempo
        requiredMonthlyContribution = this.calculateRequiredMonthlyContribution(
          currentCapital, 
          targetCapital, 
          monthlyReturn, 
          monthsRemaining
        );
      }
      
      // Calcular fecha proyectada con contribución actual
      projectedCompletionDate = this.calculateProjectedCompletionDate(
        currentCapital, 
        targetCapital, 
        goal.monthly_contribution, 
        monthlyReturn
      );
    }

    const contributionGap = requiredMonthlyContribution - goal.monthly_contribution;
    
    // Calcular desviación del plan original (simplificada)
    const deviationFromPlan = this.calculatePlanDeviation(goal, currentCapital);

    return {
      gap_amount: gapAmount,
      gap_percentage: gapPercentage,
      required_monthly_contribution: requiredMonthlyContribution,
      contribution_gap: contributionGap,
      months_remaining: monthsRemaining,
      projected_completion_date: projectedCompletionDate,
      deviation_from_plan: deviationFromPlan
    };
  }

  private calculateRequiredMonthlyContribution(
    currentCapital: number,
    targetCapital: number,
    monthlyReturn: number,
    monthsRemaining: number
  ): number {
    if (monthsRemaining <= 0) return 0;
    
    const remainingAmount = targetCapital - currentCapital;
    
    if (monthlyReturn > 0) {
      // Fórmula de anualidad para valor futuro
      const futureValueOfCurrent = currentCapital * Math.pow(1 + monthlyReturn, monthsRemaining);
      const stillNeeded = targetCapital - futureValueOfCurrent;
      
      if (stillNeeded <= 0) return 0;
      
      // PMT = PV * r / (1 - (1 + r)^(-n))
      const denominator = (Math.pow(1 + monthlyReturn, monthsRemaining) - 1) / monthlyReturn;
      return stillNeeded / denominator;
    } else {
      // Sin crecimiento, división simple
      return remainingAmount / monthsRemaining;
    }
  }

  private calculateProjectedCompletionDate(
    currentCapital: number,
    targetCapital: number,
    monthlyContribution: number,
    monthlyReturn: number
  ): string | null {
    if (monthlyContribution <= 0) return null;
    
    let capital = currentCapital;
    let months = 0;
    const maxMonths = 600; // Máximo 50 años
    
    while (capital < targetCapital && months < maxMonths) {
      capital = capital * (1 + monthlyReturn) + monthlyContribution;
      months++;
    }
    
    if (months >= maxMonths) return null;
    
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + months);
    return completionDate.toISOString().substring(0, 10);
  }

  private calculatePlanDeviation(goal: FinancialGoal, currentCapital: number): number {
    // Simplificado: comparar capital actual vs esperado según tiempo transcurrido
    const createdDate = new Date(goal.created_date || goal.created_at);
    const currentDate = new Date();
    const monthsElapsed = Math.round((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsElapsed <= 0) return 0;
    
    const monthlyReturn = goal.expected_return_rate / 100 / 12;
    const expectedCapitalByNow = this.calculateExpectedCapital(0, goal.monthly_contribution, monthlyReturn, monthsElapsed);
    
    const deviation = expectedCapitalByNow > 0 ? ((currentCapital - expectedCapitalByNow) / expectedCapitalByNow) * 100 : 0;
    return deviation;
  }

  private calculateExpectedCapital(initialCapital: number, monthlyContribution: number, monthlyReturn: number, months: number): number {
    let capital = initialCapital;
    for (let i = 0; i < months; i++) {
      capital = capital * (1 + monthlyReturn) + monthlyContribution;
    }
    return capital;
  }

  private assessRiskLevel(gapPercentage: number, monthsRemaining: number | null): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!monthsRemaining || monthsRemaining > 120) { // Más de 10 años
      if (gapPercentage < 20) return 'LOW';
      if (gapPercentage < 50) return 'MEDIUM';
      return 'HIGH';
    } else if (monthsRemaining > 60) { // 5-10 años
      if (gapPercentage < 15) return 'LOW';
      if (gapPercentage < 40) return 'MEDIUM';
      return 'HIGH';
    } else { // Menos de 5 años
      if (gapPercentage < 10) return 'LOW';
      if (gapPercentage < 30) return 'MEDIUM';
      return 'HIGH';
    }
  }

  private async generateGapAnalysisDetails(
    goal: FinancialGoal,
    currentCapital: number,
    gapMetrics: any
  ): Promise<GapAnalysisDetails> {
    const monthlyReturn = goal.expected_return_rate / 100 / 12;
    const historicalVolatility = 0.15; // 15% anualizado (simulado)
    const safeCapital = currentCapital > 0 ? currentCapital : 1;

    return {
      current_monthly_performance: monthlyReturn * 100,
      required_monthly_performance: (gapMetrics.required_monthly_contribution / safeCapital) * 100,
      performance_gap: monthlyReturn * 100 - (gapMetrics.required_monthly_contribution / safeCapital) * 100,
      historical_volatility: historicalVolatility,
      success_probability: this.calculateSuccessProbability(gapMetrics),
      confidence_intervals: {
        low_estimate: gapMetrics.months_remaining ? gapMetrics.months_remaining * 1.2 : 0,
        high_estimate: gapMetrics.months_remaining ? gapMetrics.months_remaining * 0.8 : 0,
        confidence_level: 80
      },
      contributing_factors: {
        market_performance: gapMetrics.deviation_from_plan * 0.4,
        contribution_consistency: Math.random() * 20 - 10, // Simulado
        expense_ratio_impact: -2.5, // Simulado
        timing_effects: Math.random() * 10 - 5 // Simulado
      },
      recommendations: this.generateGapRecommendations(gapMetrics)
    };
  }

  private calculateSuccessProbability(gapMetrics: any): number {
    let baseProbability = 70;
    
    // Ajustar basado en gap
    if (gapMetrics.gap_percentage < 20) baseProbability += 15;
    else if (gapMetrics.gap_percentage > 60) baseProbability -= 25;
    
    // Ajustar basado en tiempo restante
    if (gapMetrics.months_remaining && gapMetrics.months_remaining > 120) baseProbability += 10;
    else if (gapMetrics.months_remaining && gapMetrics.months_remaining < 36) baseProbability -= 15;
    
    return Math.max(10, Math.min(95, baseProbability));
  }

  private generateGapRecommendations(gapMetrics: any): string[] {
    const recommendations: string[] = [];
    
    if (gapMetrics.contribution_gap > 0) {
      recommendations.push(`Aumentar aporte mensual en $${gapMetrics.contribution_gap.toLocaleString()}`);
    }
    
    if (gapMetrics.gap_percentage > 40) {
      recommendations.push('Considerar revisar la fecha objetivo o monto del objetivo');
    }
    
    if (gapMetrics.months_remaining && gapMetrics.months_remaining < 60) {
      recommendations.push('Evaluar estrategias de aceleración más agresivas');
    }
    
    if (gapMetrics.deviation_from_plan < -10) {
      recommendations.push('Revisar estrategia de inversión actual');
    }
    
    recommendations.push('Considerar aportes extraordinarios en bonificaciones');
    recommendations.push('Evaluar reducción de gastos para aumentar capacidad de ahorro');
    
    return recommendations;
  }

  // 28.2: Generar estrategias de optimización
  // eslint-disable-next-line max-lines-per-function
  async generateOptimizationStrategies(goalId: number): Promise<GoalOptimizationStrategy[]> {
    const gapAnalysis = await this.getLatestGapAnalysis(goalId);
    if (!gapAnalysis) {
      throw new Error('Debe realizar un análisis de gap primero');
    }

    const strategies: CreateOptimizationStrategyDto[] = [];

    // Estrategia de aumento de contribución
    if (gapAnalysis.contribution_gap > 0) {
      strategies.push({
        goal_id: goalId,
        strategy_name: 'Aumentar Aportes Mensuales',
        strategy_type: 'INCREASE_CONTRIBUTION',
        priority: 'HIGH',
        description: `Aumentar aporte mensual en $${gapAnalysis.contribution_gap.toLocaleString()} para cumplir objetivo en tiempo`,
        implementation_steps: [
          {
            step_number: 1,
            description: 'Revisar presupuesto mensual para identificar áreas de ahorro',
            estimated_hours: 2,
            dependencies: [],
            resources_needed: ['Planilla de gastos'],
            success_criteria: 'Identificar al menos $200 en gastos reducibles'
          },
          {
            step_number: 2,
            description: 'Configurar transferencia automática del monto adicional',
            estimated_hours: 1,
            dependencies: ['Revisar presupuesto'],
            resources_needed: ['Acceso a banca online'],
            success_criteria: 'Transferencia automática configurada y funcionando'
          }
        ],
        requirements: [
          {
            requirement_type: 'FINANCIAL',
            description: `Capacidad de ahorro adicional de $${gapAnalysis.contribution_gap.toLocaleString()}/mes`,
            is_met: false,
            how_to_fulfill: 'Revisar gastos y optimizar presupuesto'
          }
        ],
        risks: [
          {
            risk_type: 'FINANCIAL',
            description: 'Sobreesfuerzo financiero que afecte gastos esenciales',
            probability: 'MEDIUM',
            impact: 'HIGH',
            mitigation_strategy: 'Implementar aumento gradual en 3 meses'
          }
        ]
      });
    }

    // Estrategia de optimización de costos
    strategies.push({
      goal_id: goalId,
      strategy_name: 'Reducir Costos de Inversión',
      strategy_type: 'REDUCE_COSTS',
      priority: 'MEDIUM',
      description: 'Optimizar comisiones y costos de operación para maximizar capital invertido',
      implementation_steps: [
        {
          step_number: 1,
          description: 'Auditar comisiones actuales de todas las posiciones',
          estimated_hours: 3,
          dependencies: [],
          resources_needed: ['Reporte de comisiones'],
          success_criteria: 'Identificar oportunidades de ahorro > $50/mes'
        }
      ]
    });

    // Estrategia de diversificación si el gap es grande
    if (gapAnalysis.gap_percentage > 30) {
      strategies.push({
        goal_id: goalId,
        strategy_name: 'Diversificación Optimizada',
        strategy_type: 'DIVERSIFICATION',
        priority: 'MEDIUM',
        description: 'Rebalancear portafolio para optimizar relación riesgo-retorno',
        implementation_steps: [
          {
            step_number: 1,
            description: 'Analizar correlaciones actuales del portafolio',
            estimated_hours: 2,
            dependencies: [],
            resources_needed: ['Datos históricos de posiciones'],
            success_criteria: 'Identificar oportunidades de diversificación'
          }
        ]
      });
    }

    // Guardar estrategias en base de datos
    const savedStrategies: GoalOptimizationStrategy[] = [];
    for (const strategy of strategies) {
      const saved = await this.saveOptimizationStrategy(strategy);
      savedStrategies.push(saved);
    }

    return savedStrategies;
  }

  // 28.2: Generar planes de contribución optimizados
  // eslint-disable-next-line max-lines-per-function
  async generateContributionPlans(goalId: number): Promise<GoalContributionPlan[]> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    const gapAnalysis = await this.getLatestGapAnalysis(goalId);
    
    if (!goal || !gapAnalysis) {
      throw new Error('Objetivo o análisis de gap no encontrado');
    }

    const plans: CreateContributionPlanDto[] = [];
    const baseContribution = goal.monthly_contribution;
    const requiredContribution = gapAnalysis.required_monthly_contribution;

    // Plan conservador
    plans.push({
      goal_id: goalId,
      plan_name: 'Plan Conservador',
      plan_type: 'CONSERVATIVE',
      optimized_monthly_contribution: Math.max(baseContribution, baseContribution * 1.1),
      bonus_contributions: [
        {
          month: 12, // Diciembre
          amount: baseContribution * 0.5,
          source: 'aguinaldo',
          frequency: 'YEARLY',
          probability: 85
        }
      ],
      seasonal_adjustments: [
        {
          months: [1, 2], // Enero-Febrero (gastos altos)
          adjustment_factor: 0.9,
          reason: 'Gastos escolares y vacaciones'
        }
      ]
    });

    // Plan moderado
    plans.push({
      goal_id: goalId,
      plan_name: 'Plan Moderado',
      plan_type: 'MODERATE',
      optimized_monthly_contribution: Math.max(baseContribution * 1.25, (baseContribution + requiredContribution) / 2),
      bonus_contributions: [
        {
          month: 6, // Junio
          amount: baseContribution * 0.5,
          source: 'aguinaldo',
          frequency: 'YEARLY',
          probability: 85
        },
        {
          month: 12, // Diciembre
          amount: baseContribution,
          source: 'aguinaldo',
          frequency: 'YEARLY',
          probability: 85
        }
      ]
    });

    // Plan agresivo
    if (requiredContribution > baseContribution) {
      plans.push({
        goal_id: goalId,
        plan_name: 'Plan Agresivo',
        plan_type: 'AGGRESSIVE',
        optimized_monthly_contribution: requiredContribution,
        bonus_contributions: [
          {
            month: 3, // Marzo
            amount: baseContribution * 0.3,
            source: 'extra_income',
            frequency: 'YEARLY',
            probability: 60
          },
          {
            month: 6, // Junio
            amount: baseContribution * 0.5,
            source: 'aguinaldo',
            frequency: 'YEARLY',
            probability: 85
          },
          {
            month: 9, // Septiembre
            amount: baseContribution * 0.3,
            source: 'extra_income',
            frequency: 'YEARLY',
            probability: 60
          },
          {
            month: 12, // Diciembre
            amount: baseContribution,
            source: 'aguinaldo',
            frequency: 'YEARLY',
            probability: 85
          }
        ]
      });
    }

    // Guardar planes
    const savedPlans: GoalContributionPlan[] = [];
    for (const plan of plans) {
      const saved = await this.saveContributionPlan(plan);
      savedPlans.push(saved);
    }

    return savedPlans;
  }

  // 28.3: Generar hitos intermedios
  // eslint-disable-next-line max-lines-per-function
  async generateIntermediateMilestones(goalId: number): Promise<GoalIntermediateMilestone[]> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    if (!goal || !goal.target_amount) {
      throw new Error('Objetivo no encontrado o sin monto objetivo');
    }

    const milestones: CreateMilestoneDto[] = [];
    const targetAmount = goal.target_amount;
    const percentages = [10, 25, 50, 75, 90];

    for (const percentage of percentages) {
      const milestoneAmount = (targetAmount * percentage) / 100;

      milestones.push({
        goal_id: goalId,
        milestone_name: `${percentage}% del Objetivo`,
        milestone_type: 'PERCENTAGE',
        target_amount: milestoneAmount,
        target_percentage: percentage,
        difficulty_level: this.getMilestoneDifficulty(percentage),
        motivation_message: this.getMotivationMessage(percentage)
      });
    }

    // Hitos basados en tiempo si hay fecha objetivo
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const currentDate = new Date();
      const monthsToGoal = Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      if (monthsToGoal > 12) {
        const intervals = Math.min(4, Math.floor(monthsToGoal / 12));
        for (let i = 1; i <= intervals; i++) {
          const monthsToMilestone = Math.round((monthsToGoal * i) / intervals);
          const milestoneDate = new Date();
          milestoneDate.setMonth(milestoneDate.getMonth() + monthsToMilestone);

          milestones.push({
            goal_id: goalId,
            milestone_name: `Año ${i}`,
            milestone_type: 'TIME_BASED',
            target_date: milestoneDate.toISOString().substring(0, 10),
            difficulty_level: 'MODERATE',
            motivation_message: '¡Mantén el rumbo hacia tu objetivo!'
          });
        }
      }
    }

    // Guardar hitos
    const savedMilestones: GoalIntermediateMilestone[] = [];
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i];
      if (!milestone) {
        continue;
      }
      const saved = await this.saveMilestone({
        ...milestone,
        milestone_order: i + 1
      });
      savedMilestones.push(saved);
    }

    return savedMilestones;
  }

  private getMilestoneDifficulty(percentage: number): 'EASY' | 'MODERATE' | 'CHALLENGING' | 'AMBITIOUS' {
    if (percentage <= 25) return 'EASY';
    if (percentage <= 50) return 'MODERATE';
    if (percentage <= 75) return 'CHALLENGING';
    return 'AMBITIOUS';
  }

  private getMotivationMessage(percentage: number): string {
    const messages = {
      10: '¡Excelente inicio! Ya tienes el 10% de tu objetivo',
      25: '¡Un cuarto del camino recorrido! Sigues por buen camino',
      50: '¡A mitad del camino! La meta está cada vez más cerca',
      75: '¡Tres cuartas partes completadas! Ya puedes ver la línea de llegada',
      90: '¡Casi llegando! Solo falta un último empujón'
    };
    return messages[percentage as keyof typeof messages] || '¡Sigue adelante!';
  }

  // Obtener resumen completo del optimizador
  async getOptimizerSummary(goalId: number): Promise<GoalOptimizerSummary> {
    const [gapAnalysis, strategies, plans, milestones] = await Promise.all([
      this.getLatestGapAnalysis(goalId),
      this.getOptimizationStrategies(goalId),
      this.getContributionPlans(goalId),
      this.getIntermediateMilestones(goalId)
    ]);

    const overallScore = this.calculateOverallOptimizationScore(gapAnalysis, strategies, plans, milestones);
    const recommendations = this.generateNextRecommendedActions(gapAnalysis, strategies);

    return {
      goal_id: goalId,
      gap_analysis: gapAnalysis,
      optimization_strategies: strategies,
      contribution_plans: plans,
      milestones: milestones,
      acceleration_strategies: [], // Se implementará en GoalAccelerationService
      opportunity_matches: [], // Se implementará en GoalOpportunityIntegrationService
      overall_score: overallScore,
      next_recommended_actions: recommendations
    };
  }

  private calculateOverallOptimizationScore(
    gapAnalysis: GoalGapAnalysis | null,
    strategies: GoalOptimizationStrategy[],
    plans: GoalContributionPlan[],
    milestones: GoalIntermediateMilestone[]
  ): number {
    let score = 50; // Base score

    if (gapAnalysis) {
      // Penalizar gaps grandes
      if (gapAnalysis.gap_percentage < 20) score += 15;
      else if (gapAnalysis.gap_percentage > 60) score -= 15;
      
      // Premiar bajo riesgo
      if (gapAnalysis.risk_level === 'LOW') score += 10;
      else if (gapAnalysis.risk_level === 'HIGH') score -= 10;
    }

    // Premiar tener estrategias
    score += Math.min(20, strategies.length * 5);
    
    // Premiar tener planes activos
    const activePlans = plans.filter(p => p.is_active).length;
    score += Math.min(10, activePlans * 5);
    
    // Premiar progreso en hitos
    const achievedMilestones = milestones.filter(m => m.is_achieved).length;
    if (milestones.length > 0) {
      score += (achievedMilestones / milestones.length) * 20;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateNextRecommendedActions(
    gapAnalysis: GoalGapAnalysis | null,
    strategies: GoalOptimizationStrategy[]
  ): string[] {
    const actions: string[] = [];

    if (gapAnalysis) {
      if (gapAnalysis.contribution_gap > 0) {
        actions.push(`Aumentar aporte mensual en $${gapAnalysis.contribution_gap.toLocaleString()}`);
      }
      
      if (gapAnalysis.risk_level === 'HIGH') {
        actions.push('Revisar fecha objetivo o monto del objetivo');
      }
    }

    const unimplementedStrategies = strategies.filter(s => !s.is_applied && s.priority === 'HIGH');
    const firstPendingStrategy = unimplementedStrategies[0];
    if (firstPendingStrategy) {
      actions.push(`Implementar estrategia: ${firstPendingStrategy.strategy_name}`);
    }

    if (actions.length === 0) {
      actions.push('Continuar con el plan actual y monitorear progreso');
    }

    return actions.slice(0, 5); // Máximo 5 acciones
  }

  // Métodos auxiliares privados
  private async getCurrentCapital(): Promise<number> {
    // Usar el servicio de portafolio para obtener capital actual
    try {
      const summary = await this.portfolioService.getPortfolioSummary();
      const totalValue = summary.market_value ?? 0;
      return totalValue > 0 ? totalValue : 25000; // Valor simulado como fallback
    } catch {
      return 25000; // Valor simulado
    }
  }

  // Métodos de persistencia
  private async saveGapAnalysis(data: Omit<GoalGapAnalysis, 'id' | 'created_at' | 'updated_at'>): Promise<GoalGapAnalysis> {
    const query = `
      INSERT INTO goal_gap_analysis (
        goal_id, analysis_date, current_capital, target_capital, gap_amount, gap_percentage,
        current_monthly_contribution, required_monthly_contribution, contribution_gap,
        months_remaining, projected_completion_date, deviation_from_plan, risk_level, analysis_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(
      data.goal_id, data.analysis_date, data.current_capital, data.target_capital,
      data.gap_amount, data.gap_percentage, data.current_monthly_contribution,
      data.required_monthly_contribution, data.contribution_gap, data.months_remaining,
      data.projected_completion_date, data.deviation_from_plan, data.risk_level,
      JSON.stringify(data.analysis_details)
    ) as GoalGapAnalysis;

    return result;
  }

  private async saveOptimizationStrategy(data: CreateOptimizationStrategyDto & Partial<GoalOptimizationStrategy>): Promise<GoalOptimizationStrategy> {
    const query = `
      INSERT INTO goal_optimization_strategies (
        goal_id, strategy_name, strategy_type, priority, impact_score, effort_level,
        time_to_implement_days, estimated_time_savings_months, estimated_cost_savings,
        description, implementation_steps, requirements, risks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(
      data.goal_id, data.strategy_name, data.strategy_type, data.priority || 'MEDIUM',
      75, 'MEDIUM', 7, 3, 0, data.description,
      JSON.stringify(data.implementation_steps), JSON.stringify(data.requirements), JSON.stringify(data.risks)
    ) as GoalOptimizationStrategy;

    return result;
  }

  private async saveContributionPlan(data: CreateContributionPlanDto & Partial<GoalContributionPlan>): Promise<GoalContributionPlan> {
    const goal = await this.goalTrackerService.getGoalById(data.goal_id);
    const baseContribution = goal?.monthly_contribution || 0;

    const query = `
      INSERT INTO goal_contribution_plans (
        goal_id, plan_name, plan_type, base_monthly_contribution, optimized_monthly_contribution,
        contribution_increase, extra_annual_contributions, bonus_contributions, seasonal_adjustments,
        affordability_score, success_probability
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const contributionIncrease = data.optimized_monthly_contribution - baseContribution;
    const stmt = this.db.prepare(query);
    const result = stmt.get(
      data.goal_id, data.plan_name, data.plan_type || 'MODERATE',
      baseContribution, data.optimized_monthly_contribution, contributionIncrease,
      0, JSON.stringify(data.bonus_contributions), JSON.stringify(data.seasonal_adjustments),
      80, 85
    ) as GoalContributionPlan;

    return result;
  }

  private async saveMilestone(data: CreateMilestoneDto & { milestone_order: number }): Promise<GoalIntermediateMilestone> {
    const query = `
      INSERT INTO goal_intermediate_milestones (
        goal_id, milestone_name, milestone_type, milestone_order, target_amount,
        target_percentage, target_date, difficulty_level, motivation_message, auto_calculated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(
      data.goal_id, data.milestone_name, data.milestone_type, data.milestone_order,
      data.target_amount, data.target_percentage, data.target_date,
      data.difficulty_level || 'MODERATE', data.motivation_message, 1
    ) as GoalIntermediateMilestone;

    return result;
  }

  // Métodos de consulta
  private async getLatestGapAnalysis(goalId: number): Promise<GoalGapAnalysis | null> {
    const query = 'SELECT * FROM goal_gap_analysis WHERE goal_id = ? ORDER BY analysis_date DESC LIMIT 1';
    const stmt = this.db.prepare(query);
    return stmt.get(goalId) as GoalGapAnalysis || null;
  }

  private async getOptimizationStrategies(goalId: number): Promise<GoalOptimizationStrategy[]> {
    const query = 'SELECT * FROM goal_optimization_strategies WHERE goal_id = ? ORDER BY priority DESC, impact_score DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(goalId) as GoalOptimizationStrategy[];
  }

  private async getContributionPlans(goalId: number): Promise<GoalContributionPlan[]> {
    const query = 'SELECT * FROM goal_contribution_plans WHERE goal_id = ? ORDER BY is_active DESC, success_probability DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(goalId) as GoalContributionPlan[];
  }

  private async getIntermediateMilestones(goalId: number): Promise<GoalIntermediateMilestone[]> {
    const query = 'SELECT * FROM goal_intermediate_milestones WHERE goal_id = ? ORDER BY milestone_order ASC';
    const stmt = this.db.prepare(query);
    return stmt.all(goalId) as GoalIntermediateMilestone[];
  }
}