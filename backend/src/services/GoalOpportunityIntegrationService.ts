/**
 * Servicio de Integración de Objetivos con Oportunidades de Mercado
 * Paso 28.5: Integración con oportunidades de compra
 */

import Database from 'better-sqlite3';
import {
  GoalOpportunityMatch,
  OpportunityDetails,
  ActionDetails,
  OpportunityResultTracking
} from '../models/GoalOptimizer';
import { GoalTrackerService } from './GoalTrackerService';
import { OpportunityService } from './OpportunityService';
import { PortfolioService } from './PortfolioService';
import { NotificationService } from './NotificationService';
import { FinancialGoal } from '../models/FinancialGoal';
import { OpportunityData } from '../models/Opportunity';
import type { OpportunityTechnicalTag } from '../types/opportunity';
import { SectorBalanceService } from './SectorBalanceService';

export interface OpportunityMatchCriteria {
  goal_id: number;
  risk_tolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  time_horizon_months: number;
  capital_available: number;
  sector_preferences?: string[];
  exclude_sectors?: string[];
  min_expected_return?: number;
  max_volatility?: number;
  esg_compliant?: boolean;
  vegan_friendly?: boolean;
}

export interface GoalOpportunityScore {
  overall_score: number;
  risk_alignment: number;
  time_alignment: number;
  capital_efficiency: number;
  diversification_benefit: number;
  goal_contribution_potential: number;
  confidence_level: number;
}

export class GoalOpportunityIntegrationService {
  private db: Database.Database;
  private goalTrackerService: GoalTrackerService;
  private opportunityService: OpportunityService;
  private portfolioService: PortfolioService;
  private notificationService: NotificationService;
  private readonly sectorBalanceService: SectorBalanceService;

  constructor(db: Database.Database) {
    this.db = db;
    this.goalTrackerService = new GoalTrackerService(db);
    this.opportunityService = new OpportunityService();
    this.portfolioService = new PortfolioService();
    this.notificationService = new NotificationService(db);
    this.sectorBalanceService = new SectorBalanceService();
  }

  // 28.5: Identificar y calificar oportunidades para un objetivo específico
  async matchOpportunitiesForGoal(goalId: number, criteria?: Partial<OpportunityMatchCriteria>): Promise<GoalOpportunityMatch[]> {
    const goal = await this.ensureGoal(goalId);
    const matchCriteria = await this.buildMatchingCriteria(goal, criteria);
    const matches = await this.evaluateOpportunities(goal, matchCriteria);
    return this.persistTopMatches(matches);
  }

  private async ensureGoal(goalId: number): Promise<FinancialGoal> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }
    return goal;
  }

  private async evaluateOpportunities(
    goal: FinancialGoal,
    criteria: OpportunityMatchCriteria
  ): Promise<GoalOpportunityMatch[]> {
    const opportunities = await this.opportunityService.scanForOpportunities({
      min_score_threshold: 50,
      max_opportunities_per_day: 50,
      require_esg_compliance: criteria.esg_compliant,
      require_vegan_friendly: criteria.vegan_friendly,
      excluded_sectors: criteria.exclude_sectors
    });

    const matches: GoalOpportunityMatch[] = [];

    for (const opportunity of opportunities) {
      const match = await this.processOpportunity(goal, opportunity, criteria);
      if (match) {
        matches.push(match);
      }
    }

    return this.sortMatches(matches);
  }

  private async processOpportunity(
    goal: FinancialGoal,
    opportunity: OpportunityData,
    criteria: OpportunityMatchCriteria
  ): Promise<GoalOpportunityMatch | null> {
    const score = await this.calculateOpportunityScore(goal, opportunity, criteria);

    if (score.overall_score < 60) {
      return null;
    }

    return this.createOpportunityMatch(goal, opportunity, score, criteria);
  }

  private sortMatches(matches: GoalOpportunityMatch[]): GoalOpportunityMatch[] {
    const priorityWeight: Record<GoalOpportunityMatch['priority_level'], number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1
    };

    return matches
      .slice()
      .sort((a, b) => {
        const aPriority = priorityWeight[a.priority_level] || 1;
        const bPriority = priorityWeight[b.priority_level] || 1;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        return b.match_score - a.match_score;
      });
  }

  private async persistTopMatches(matches: GoalOpportunityMatch[]): Promise<GoalOpportunityMatch[]> {
    const savedMatches: GoalOpportunityMatch[] = [];
    const topMatches = matches.slice(0, 10);

    for (const match of topMatches) {
      const saved = await this.saveOpportunityMatch(match);
      savedMatches.push(saved);
    }

    await this.createPriorityNotifications(savedMatches);

    return savedMatches;
  }

  private async buildMatchingCriteria(goal: FinancialGoal, userCriteria?: Partial<OpportunityMatchCriteria>): Promise<OpportunityMatchCriteria> {
    const currentCapital = await this.getCurrentCapital();
    const availableCapital = currentCapital * 0.2; // Máximo 20% para nuevas oportunidades
    
    // Calcular horizonte temporal basado en fecha objetivo
    let timeHorizonMonths = 60; // Default 5 años
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const currentDate = new Date();
      timeHorizonMonths = Math.max(1, Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }

    // Determinar tolerancia al riesgo basada en objetivo y tiempo
    let riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (timeHorizonMonths > 120) { // Más de 10 años
      riskTolerance = 'HIGH';
    } else if (timeHorizonMonths < 36) { // Menos de 3 años
      riskTolerance = 'LOW';
    }

    return {
      goal_id: goal.id,
      risk_tolerance: riskTolerance,
      time_horizon_months: timeHorizonMonths,
      capital_available: availableCapital,
      min_expected_return: Math.max(goal.expected_return_rate - 2, 8), // Al menos 2% menos que objetivo
      max_volatility: timeHorizonMonths > 60 ? 0.25 : 0.15, // Mayor volatilidad para plazos largos
      esg_compliant: true, // Por defecto ESG compliant
      vegan_friendly: true, // Por defecto vegan friendly
      ...userCriteria
    };
  }

  private async calculateOpportunityScore(
    goal: FinancialGoal, 
    opportunity: OpportunityData, 
    criteria: OpportunityMatchCriteria
  ): Promise<GoalOpportunityScore> {
    
    // 1. Alineación de riesgo (25% del score)
    const riskAlignment = await this.calculateRiskAlignment(opportunity, criteria);
    
    // 2. Alineación temporal (20% del score)
    const timeAlignment = this.calculateTimeAlignment(opportunity, criteria);
    
    // 3. Eficiencia de capital (20% del score)
    const capitalEfficiency = this.calculateCapitalEfficiency(opportunity, criteria);
    
    // 4. Beneficio de diversificación (15% del score)
    const diversificationBenefit = await this.calculateDiversificationBenefit(opportunity);
    
    // 5. Potencial de contribución al objetivo (20% del score)
    const goalContributionPotential = await this.calculateGoalContribution(opportunity, goal, criteria);

    // Calcular score general ponderado
    const overallScore = (
      riskAlignment * 0.25 +
      timeAlignment * 0.20 +
      capitalEfficiency * 0.20 +
      diversificationBenefit * 0.15 +
      goalContributionPotential * 0.20
    );

    // Nivel de confianza basado en datos disponibles y consistencia
    const confidenceLevel = this.calculateConfidenceLevel(opportunity, [
      riskAlignment, timeAlignment, capitalEfficiency, diversificationBenefit, goalContributionPotential
    ]);

    return {
      overall_score: Math.round(overallScore),
      risk_alignment: Math.round(riskAlignment),
      time_alignment: Math.round(timeAlignment),
      capital_efficiency: Math.round(capitalEfficiency),
      diversification_benefit: Math.round(diversificationBenefit),
      goal_contribution_potential: Math.round(goalContributionPotential),
      confidence_level: Math.round(confidenceLevel)
    };
  }

  private async calculateRiskAlignment(opportunity: OpportunityData, criteria: OpportunityMatchCriteria): Promise<number> {
    const riskScoreMap = {
      'LOW': { min: 0, max: 30, optimal: 20 },
      'MEDIUM': { min: 20, max: 60, optimal: 40 },
      'HIGH': { min: 50, max: 100, optimal: 75 }
    };
    
    const riskRange = riskScoreMap[criteria.risk_tolerance];
    const opportunityRiskScore = opportunity.composite_score; // Usar como proxy de riesgo

    // Calcular qué tan cerca está del rango óptimo
    if (opportunityRiskScore >= riskRange.min && opportunityRiskScore <= riskRange.max) {
      const distanceFromOptimal = Math.abs(opportunityRiskScore - riskRange.optimal);
      const maxDistance = Math.max(riskRange.optimal - riskRange.min, riskRange.max - riskRange.optimal);
      return 100 - (distanceFromOptimal / maxDistance) * 50; // Score entre 50-100
    } else {
      // Fuera del rango aceptable
      const minDistance = Math.min(
        Math.abs(opportunityRiskScore - riskRange.min),
        Math.abs(opportunityRiskScore - riskRange.max)
      );
      return Math.max(0, 50 - minDistance); // Penalizar estar fuera del rango
    }
  }

  private calculateTimeAlignment(opportunity: OpportunityData, criteria: OpportunityMatchCriteria): number {
    // Estimar horizonte temporal de la oportunidad basado en tipo y volatilidad
    let opportunityTimeHorizon = 12; // Default 12 meses

    if (this.hasTechnicalTag(opportunity, 'TECHNICAL_BREAKOUT')) {
      opportunityTimeHorizon = 3; // 3 meses para breakouts técnicos
    } else if (this.hasTechnicalTag(opportunity, 'VALUE_PLAY')) {
      opportunityTimeHorizon = 18; // 18 meses para value plays
    } else if (this.hasTechnicalTag(opportunity, 'DIVIDEND_ARISTOCRAT')) {
      opportunityTimeHorizon = 36; // 3 años para dividend aristocrats
    }

    // Calcular alineación temporal
    const timeDifference = Math.abs(criteria.time_horizon_months - opportunityTimeHorizon);
    const maxAcceptableDifference = Math.max(criteria.time_horizon_months * 0.5, 6);
    
    if (timeDifference <= maxAcceptableDifference) {
      return 100 - (timeDifference / maxAcceptableDifference) * 30; // Score entre 70-100
    } else {
      return Math.max(0, 70 - timeDifference); // Penalizar grandes diferencias
    }
  }

  private calculateCapitalEfficiency(opportunity: OpportunityData, criteria: OpportunityMatchCriteria): number {
    const minInvestment = opportunity.min_investment || 1000; // $1000 mínimo default
    const suggestedAllocation = Math.min(criteria.capital_available * 0.1, 5000); // Máx $5000 por oportunidad
    
    if (minInvestment > criteria.capital_available) {
      return 0; // No hay capital suficiente
    }
    
    // Más eficiente si permite inversión fraccionada o montos pequeños
    const efficiencyRatio = suggestedAllocation / minInvestment;
    
    if (efficiencyRatio >= 2) {
      return 100; // Muy eficiente
    } else if (efficiencyRatio >= 1) {
      return 70 + (efficiencyRatio - 1) * 30; // Entre 70-100
    } else {
      return Math.max(20, efficiencyRatio * 70); // Entre 20-70
    }
  }

  private async calculateDiversificationBenefit(opportunity: OpportunityData): Promise<number> {
    try {
      // Obtener exposición sectorial actual del portafolio
      const overview = await this.sectorBalanceService.getSectorBalanceOverview();
      const currentSectorExposure = overview.sectorDistributions.reduce<Record<string, number>>((acc, distribution) => {
        acc[distribution.sector] = distribution.percentage / 100;
        return acc;
      }, {});

      const opportunitySector = opportunity.sector || 'Unknown';
      const currentExposure = currentSectorExposure[opportunitySector] || 0;
      
      // Beneficio de diversificación inversamente proporcional a exposición actual
      if (currentExposure === 0) {
        return 100; // Nuevo sector = máximo beneficio
      } else if (currentExposure < 0.1) { // Menos del 10%
        return 80;
      } else if (currentExposure < 0.2) { // Menos del 20%
        return 60;
      } else if (currentExposure < 0.3) { // Menos del 30%
        return 40;
      } else {
        return 20; // Alta exposición existente
      }
    } catch (error) {
      return 50; // Score neutral si no hay datos
    }
  }

  private async calculateGoalContribution(
    opportunity: OpportunityData, 
    goal: FinancialGoal, 
    criteria: OpportunityMatchCriteria
  ): Promise<number> {
    // Estimar contribución potencial al objetivo
    const expectedReturn = opportunity.expected_return?.upside_percentage ?? goal.expected_return_rate;
    const suggestedInvestment = Math.min(criteria.capital_available * 0.05, 3000); // $3000 máximo
    const timeToGoalMonths = criteria.time_horizon_months;
    
    // Calcular valor futuro de la inversión
    const monthlyReturn = expectedReturn / 100 / 12;
    const futureValue = suggestedInvestment * Math.pow(1 + monthlyReturn, timeToGoalMonths);
    const totalReturn = futureValue - suggestedInvestment;
    
    // Calcular qué porcentaje del gap del objetivo esto representaría
    const currentCapital = await this.getCurrentCapital();
    const goalGap = Math.max(0, (goal.target_amount || 0) - currentCapital);
    
    if (goalGap === 0) {
      return 50; // Objetivo ya alcanzado
    }
    
    const contributionPercentage = (totalReturn / goalGap) * 100;
    
    // Score basado en el porcentaje de contribución
    if (contributionPercentage >= 10) {
      return 100; // Contribución muy significativa
    } else if (contributionPercentage >= 5) {
      return 80 + (contributionPercentage - 5) * 4; // Entre 80-100
    } else if (contributionPercentage >= 2) {
      return 60 + (contributionPercentage - 2) * 6.67; // Entre 60-80
    } else if (contributionPercentage >= 1) {
      return 40 + (contributionPercentage - 1) * 20; // Entre 40-60
    } else {
      return Math.max(10, contributionPercentage * 40); // Entre 10-40
    }
  }

  private calculateConfidenceLevel(opportunity: OpportunityData, scores: number[]): number {
    // Factores que afectan la confianza
    let confidence = 70; // Base confidence
    
    // 1. Consistencia de scores (menor desviación estándar = mayor confianza)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    confidence += Math.max(-20, 20 - stdDev); // Penalizar alta desviación
    
    // 2. Calidad de datos de la oportunidad
    if (opportunity.confidence_score) {
      confidence = (confidence + opportunity.confidence_score) / 2;
    }
    
    // 3. Disponibilidad de datos históricos
    if (opportunity.price_change_1m !== undefined && opportunity.price_change_3m !== undefined) {
      confidence += 5; // Bonus por tener datos históricos
    }
    
    return Math.max(30, Math.min(95, confidence));
  }

  private async createOpportunityMatch(
    goal: FinancialGoal,
    opportunity: OpportunityData,
    score: GoalOpportunityScore,
    criteria: OpportunityMatchCriteria
  ): Promise<GoalOpportunityMatch> {
    const timeSensitivity = this.calculateTimeSensitivity(opportunity);
    const priority = this.determinePriorityLevel(score.overall_score, timeSensitivity);
    const capitalAllocation = this.calculateOptimalAllocation(opportunity, criteria, score);
    const expectedContribution = await this.estimateGoalContribution(opportunity, goal, capitalAllocation);
    const claudeRecommendation = await this.generateClaudeRecommendation(
      goal,
      opportunity,
      score,
      capitalAllocation
    );

    return this.composeOpportunityMatch({
      goal,
      opportunity,
      score,
      capitalAllocation,
      timeSensitivity,
      expectedContribution,
      priority,
      claudeRecommendation
    });
  }

  private composeOpportunityMatch(params: {
    goal: FinancialGoal
    opportunity: OpportunityData
    score: GoalOpportunityScore
    capitalAllocation: number
    timeSensitivity: number
    expectedContribution: number
    priority: GoalOpportunityMatch['priority_level']
    claudeRecommendation: string
  }): GoalOpportunityMatch {
    const {
      goal,
      opportunity,
      score,
      capitalAllocation,
      timeSensitivity,
      expectedContribution,
      priority,
      claudeRecommendation
    } = params

    return {
      id: 0,
      goal_id: goal.id,
      opportunity_id: opportunity.id || 0,
      match_score: score.overall_score,
      impact_on_goal: expectedContribution,
      priority_level: priority,
      time_sensitivity_hours: timeSensitivity,
      capital_allocation_suggestion: capitalAllocation,
      risk_alignment_score: score.risk_alignment,
      diversification_impact: score.diversification_benefit,
      expected_contribution_to_goal: expectedContribution,
      opportunity_details: this.buildOpportunityDetails(opportunity),
      analysis_timestamp: new Date().toISOString(),
      expiration_timestamp: this.calculateExpirationTime(opportunity),
      action_taken: false,
      action_date: null,
      action_details: null,
      result_tracking: null,
      claude_recommendation: claudeRecommendation,
      user_feedback: null,
      performance_after_action: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private buildOpportunityDetails(opportunity: OpportunityData): OpportunityDetails {
    return {
      instrument_symbol: opportunity.symbol,
      opportunity_type: opportunity.opportunity_type || 'UNKNOWN',
      entry_price: opportunity.current_price || 0,
      target_price: opportunity.target_price ?? null,
      stop_loss: opportunity.stop_loss ?? null,
      expected_holding_period_days: this.estimateHoldingPeriod(opportunity),
      confidence_level: opportunity.confidence_score || 70,
      risk_factors: this.identifyRiskFactors(opportunity),
      catalyst_events: this.identifyCatalysts(opportunity)
    }
  }

  private calculateTimeSensitivity(opportunity: OpportunityData): number {
    // Determinar urgencia basada en tipo de oportunidad y volatilidad
    if (this.hasTechnicalTag(opportunity, 'TECHNICAL_BREAKOUT')) {
      return 24; // 24 horas para breakouts técnicos
    } else if (this.hasTechnicalTag(opportunity, 'EARNINGS_MOMENTUM')) {
      return 72; // 72 horas antes de earnings
    } else if (this.hasTechnicalTag(opportunity, 'OVERSOLD_BOUNCE')) {
      return 48; // 48 horas para rebounds
    } else {
      return 168; // 1 semana para otros tipos
    }
  }

  private determinePriorityLevel(overallScore: number, timeSensitivityHours: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (overallScore >= 85 && timeSensitivityHours <= 48) {
      return 'URGENT';
    } else if (overallScore >= 80 || (overallScore >= 70 && timeSensitivityHours <= 24)) {
      return 'HIGH';
    } else if (overallScore >= 65) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  private calculateOptimalAllocation(
    opportunity: OpportunityData, 
    criteria: OpportunityMatchCriteria, 
    score: GoalOpportunityScore
  ): number {
    const baseAllocation = criteria.capital_available * 0.05; // 5% base
    const scoreMultiplier = score.overall_score / 100; // 0.6 - 1.0
    const riskAdjustment = score.risk_alignment / 100; // Ajuste por alineación de riesgo
    
    const optimalAllocation = baseAllocation * scoreMultiplier * riskAdjustment;
    
    // Límites mínimo y máximo
    const minAllocation = 500; // $500 mínimo
    const maxAllocation = Math.min(criteria.capital_available * 0.1, 8000); // $8000 máximo
    
    return Math.max(minAllocation, Math.min(maxAllocation, optimalAllocation));
  }

  private async estimateGoalContribution(
    opportunity: OpportunityData, 
    goal: FinancialGoal, 
    allocation: number
  ): Promise<number> {
    const expectedReturn = opportunity.expected_return?.upside_percentage ?? goal.expected_return_rate;
    const holdingPeriodMonths = this.estimateHoldingPeriod(opportunity) / 30;
    
    const monthlyReturn = expectedReturn / 100 / 12;
    const futureValue = allocation * Math.pow(1 + monthlyReturn, holdingPeriodMonths);
    
    return futureValue - allocation; // Ganancia esperada
  }

  private async generateClaudeRecommendation(
    goal: FinancialGoal,
    opportunity: OpportunityData,
    score: GoalOpportunityScore,
    allocation: number
  ): Promise<string> {
    // Simulación de recomendación de Claude
    const riskLevel = score.risk_alignment >= 75 ? 'bajo riesgo' : score.risk_alignment >= 50 ? 'riesgo moderado' : 'alto riesgo';
    const timeframe = this.estimateHoldingPeriod(opportunity) > 365 ? 'largo plazo' : 'corto-medio plazo';
    
    return `Esta oportunidad en ${opportunity.symbol} presenta un match del ${score.overall_score}% con tu objetivo "${goal.name}". ` +
           `Es una inversión de ${riskLevel} con horizonte ${timeframe}. ` +
           `La asignación sugerida de $${allocation.toLocaleString()} podría contribuir significativamente a tu meta. ` +
           `Recomiendo ${score.overall_score >= 80 ? 'proceder con la inversión' : 'evaluar cuidadosamente'} considerando tu perfil de riesgo.`;
  }

  private estimateHoldingPeriod(opportunity: OpportunityData): number {
    // Estimar período de tenencia en días
    const typeMap: { [key: string]: number } = {
      'TECHNICAL_BREAKOUT': 90,
      'OVERSOLD_BOUNCE': 30,
      'EARNINGS_MOMENTUM': 60,
      'VALUE_PLAY': 365,
      'DIVIDEND_ARISTOCRAT': 730,
      'GROWTH_MOMENTUM': 180
    };
    
    return typeMap[opportunity.opportunity_type || 'VALUE_PLAY'] || 180;
  }

  private identifyRiskFactors(opportunity: OpportunityData): string[] {
    const risks: string[] = [];
    
    if (opportunity.volatility && opportunity.volatility > 0.3) {
      risks.push('Alta volatilidad histórica');
    }
    
    if (opportunity.sector === 'Technology') {
      risks.push('Sector de alta beta y volatilidad');
    }
    
    if (!opportunity.has_earnings_growth) {
      risks.push('Crecimiento de earnings incierto');
    }
    
    risks.push('Riesgo de mercado general');
    risks.push('Riesgo cambiario (USD/ARS)');
    
    return risks;
  }

  private identifyCatalysts(opportunity: OpportunityData): string[] {
    const catalysts: string[] = [];

    if (opportunity.has_upcoming_earnings) {
      catalysts.push('Próximo reporte de earnings');
    }

    if (this.hasTechnicalTag(opportunity, 'TECHNICAL_BREAKOUT')) {
      catalysts.push('Breakout técnico confirmado');
    }

    if (this.hasTechnicalTag(opportunity, 'DIVIDEND_ARISTOCRAT')) {
      catalysts.push('Historial consistente de dividendos');
    }

    catalysts.push('Tendencia sectorial positiva');

    return catalysts;
  }

  private calculateExpirationTime(opportunity: OpportunityData): string {
    const hoursToExpire = this.calculateTimeSensitivity(opportunity);
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + hoursToExpire);
    return expirationDate.toISOString();
  }

  // Ejecutar acción sobre una oportunidad
  async executeOpportunityAction(
    matchId: number, 
    action: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE',
    actionDetails?: Partial<ActionDetails>
  ): Promise<GoalOpportunityMatch> {
    const match = await this.getOpportunityMatch(matchId);
    if (!match) {
      throw new Error('Match de oportunidad no encontrado');
    }

    const fullActionDetails: ActionDetails = {
      action_type: action,
      amount_invested: actionDetails?.amount_invested || null,
      execution_price: actionDetails?.execution_price || null,
      execution_timestamp: new Date().toISOString(),
      notes: actionDetails?.notes || null
    };

    const updateQuery = `
      UPDATE goal_opportunity_matches 
      SET action_taken = 1, action_date = ?, action_details = ?
      WHERE id = ?
      RETURNING *
    `;

    const stmt = this.db.prepare(updateQuery);
    const updatedMatch = stmt.get(
      new Date().toISOString(),
      JSON.stringify(fullActionDetails),
      matchId
    ) as GoalOpportunityMatch;

    // Inicializar tracking de resultados si es una compra
    if (action === 'BUY' && actionDetails?.amount_invested) {
      await this.initializeResultTracking(matchId, actionDetails.amount_invested);
    }

    return updatedMatch;
  }

  private async initializeResultTracking(matchId: number, amountInvested: number): Promise<void> {
    const match = await this.getOpportunityMatch(matchId);
    if (!match || !match.opportunity_details) return;

    const initialTracking: OpportunityResultTracking = {
      expected_return: amountInvested * 0.15, // 15% retorno esperado
      actual_return: null,
      holding_period_days: null,
      exit_reason: null,
      goal_contribution_actual: null,
      lessons_learned: []
    };

    const updateQuery = `
      UPDATE goal_opportunity_matches 
      SET result_tracking = ?
      WHERE id = ?
    `;

    const stmt = this.db.prepare(updateQuery);
    stmt.run(JSON.stringify(initialTracking), matchId);
  }

  // Crear notificaciones para oportunidades prioritarias
  private async createPriorityNotifications(matches: GoalOpportunityMatch[]): Promise<void> {
    const priorityMatches = matches.filter(m => ['HIGH', 'URGENT'].includes(m.priority_level));
    
    for (const match of priorityMatches) {
      await this.notificationService.createNotification({
        type: 'OPPORTUNITY',
        priority: match.priority_level === 'URGENT' ? 'HIGH' : 'MEDIUM',
        title: `Oportunidad ${match.priority_level.toLowerCase()} para objetivo`,
        message: `${match.opportunity_details?.instrument_symbol} - Match ${match.match_score}% - $${match.expected_contribution_to_goal?.toLocaleString()} potencial`,
        data: JSON.stringify({
          goalId: match.goal_id,
          matchId: match.id,
          symbol: match.opportunity_details?.instrument_symbol,
          matchScore: match.match_score,
          timeSensitivity: match.time_sensitivity_hours
        })
      });
    }
  }

  // Métodos auxiliares
  private async getCurrentCapital(): Promise<number> {
    try {
      const summary = await this.portfolioService.getPortfolioSummary();
      return summary.market_value || 25000;
    } catch {
      return 25000;
    }
  }

  private hasTechnicalTag(opportunity: OpportunityData, tag: OpportunityTechnicalTag): boolean {
    return opportunity.technical_tags?.includes(tag) ?? false;
  }

  // Métodos de persistencia
  private async saveOpportunityMatch(match: GoalOpportunityMatch): Promise<GoalOpportunityMatch> {
    const query = `
      INSERT INTO goal_opportunity_matches (
        goal_id, opportunity_id, match_score, impact_on_goal, priority_level,
        time_sensitivity_hours, capital_allocation_suggestion, risk_alignment_score,
        diversification_impact, expected_contribution_to_goal, opportunity_details,
        analysis_timestamp, expiration_timestamp, claude_recommendation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `;

    const stmt = this.db.prepare(query);
    const result = stmt.get(
      match.goal_id, match.opportunity_id, match.match_score, match.impact_on_goal,
      match.priority_level, match.time_sensitivity_hours, match.capital_allocation_suggestion,
      match.risk_alignment_score, match.diversification_impact, match.expected_contribution_to_goal,
      JSON.stringify(match.opportunity_details), match.analysis_timestamp,
      match.expiration_timestamp, match.claude_recommendation
    ) as GoalOpportunityMatch;

    return result;
  }

  private async getOpportunityMatch(matchId: number): Promise<GoalOpportunityMatch | null> {
    const query = 'SELECT * FROM goal_opportunity_matches WHERE id = ?';
    const stmt = this.db.prepare(query);
    return stmt.get(matchId) as GoalOpportunityMatch || null;
  }

  // Obtener matches por objetivo
  async getOpportunityMatchesByGoal(goalId: number): Promise<GoalOpportunityMatch[]> {
    const query = `
      SELECT * FROM goal_opportunity_matches 
      WHERE goal_id = ? 
      ORDER BY priority_level DESC, match_score DESC, analysis_timestamp DESC
    `;
    const stmt = this.db.prepare(query);
    return stmt.all(goalId) as GoalOpportunityMatch[];
  }

  // Obtener matches activos (no expirados y no ejecutados)
  async getActiveOpportunityMatches(goalId?: number): Promise<GoalOpportunityMatch[]> {
    const baseQuery = `
      SELECT * FROM goal_opportunity_matches 
      WHERE action_taken = 0 
      AND (expiration_timestamp IS NULL OR expiration_timestamp > ?)
    `;
    
    const query = goalId ? `${baseQuery} AND goal_id = ?` : baseQuery;
    const stmt = this.db.prepare(query);
    const params = goalId ? [new Date().toISOString(), goalId] : [new Date().toISOString()];
    
    return stmt.all(...params) as GoalOpportunityMatch[];
  }
}