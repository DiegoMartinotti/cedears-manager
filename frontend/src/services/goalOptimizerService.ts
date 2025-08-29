/**
 * Servicio Frontend del Optimizador de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import { apiClient } from './api';

// Interfaces para el optimizador
export interface GapAnalysis {
  id: number;
  goal_id: number;
  analysis_date: string;
  current_capital: number;
  target_capital: number;
  gap_amount: number;
  gap_percentage: number;
  current_monthly_contribution: number;
  required_monthly_contribution: number;
  contribution_gap: number;
  months_remaining: number | null;
  projected_completion_date: string | null;
  deviation_from_plan: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  analysis_details: {
    current_monthly_performance: number;
    required_monthly_performance: number;
    performance_gap: number;
    success_probability: number;
    recommendations: string[];
  } | null;
}

export interface OptimizationStrategy {
  id: number;
  goal_id: number;
  strategy_name: string;
  strategy_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact_score: number;
  effort_level: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  is_applied: boolean;
  time_to_implement_days: number;
  estimated_time_savings_months: number | null;
}

export interface ContributionPlan {
  id: number;
  goal_id: number;
  plan_name: string;
  plan_type: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';
  base_monthly_contribution: number;
  optimized_monthly_contribution: number;
  contribution_increase: number;
  success_probability: number | null;
  time_savings_months: number | null;
  affordability_score: number | null;
  is_active: boolean;
  bonus_contributions?: Array<{
    month: number;
    amount: number;
    source: string;
    probability: number;
  }>;
}

export interface Milestone {
  id: number;
  goal_id: number;
  milestone_name: string;
  milestone_type: 'PERCENTAGE' | 'AMOUNT' | 'TIME_BASED' | 'PERFORMANCE';
  milestone_order: number;
  target_amount?: number;
  target_percentage?: number;
  target_date?: string;
  current_progress: number;
  progress_percentage: number;
  is_achieved: boolean;
  achieved_date?: string;
  celebration_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  difficulty_level: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'AMBITIOUS';
  motivation_message?: string;
}

export interface AccelerationStrategy {
  id: number;
  goal_id: number;
  strategy_name: string;
  acceleration_type: string;
  potential_acceleration_months: number;
  risk_increase_factor: number;
  complexity_score: number;
  capital_requirements: number;
  expected_return_boost?: number;
  implementation_timeline_days: number;
  recommendation_confidence?: number;
  is_recommended: boolean;
  is_active: boolean;
  activated_date?: string;
}

export interface OpportunityMatch {
  id: number;
  goal_id: number;
  opportunity_id: number;
  match_score: number;
  impact_on_goal: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  time_sensitivity_hours: number | null;
  capital_allocation_suggestion: number | null;
  expected_contribution_to_goal: number | null;
  opportunity_details: {
    instrument_symbol: string;
    opportunity_type: string;
    entry_price: number;
    target_price?: number;
    confidence_level: number;
  } | null;
  claude_recommendation: string | null;
  action_taken: boolean;
}

export interface OptimizerSummary {
  goal_id: number;
  gap_analysis: GapAnalysis | null;
  optimization_strategies: OptimizationStrategy[];
  contribution_plans: ContributionPlan[];
  milestones: Milestone[];
  acceleration_strategies: AccelerationStrategy[];
  opportunity_matches: OpportunityMatch[];
  overall_score: number;
  next_recommended_actions: string[];
}

export interface PersonalizedRecommendation {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'CONTRIBUTION' | 'STRATEGY' | 'MILESTONE' | 'OPPORTUNITY' | 'ACCELERATION';
  title: string;
  description: string;
  impact_estimate: string;
  effort_required: 'LOW' | 'MEDIUM' | 'HIGH';
  time_frame: string;
  success_probability: number;
  action_items: string[];
}

class GoalOptimizerService {
  private baseUrl = '/api/goal-optimizer';

  // 28.1: Análisis de gap
  async analyzeGap(goalId: number, customData?: any): Promise<GapAnalysis> {
    const response = await apiClient.post(`${this.baseUrl}/${goalId}/analyze-gap`, customData);
    return response.data.data;
  }

  // 28.2: Estrategias de optimización
  async getOptimizationStrategies(goalId: number): Promise<OptimizationStrategy[]> {
    const response = await apiClient.get(`${this.baseUrl}/${goalId}/optimization-strategies`);
    return response.data.data;
  }

  async createOptimizationStrategy(goalId: number, strategyData: {
    strategy_name: string;
    strategy_type: string;
    description: string;
    priority?: string;
  }): Promise<OptimizationStrategy> {
    const response = await apiClient.post(`${this.baseUrl}/${goalId}/optimization-strategies`, strategyData);
    return response.data.data;
  }

  // 28.2: Planes de contribución
  async calculateContributionPlans(goalId: number): Promise<ContributionPlan[]> {
    const response = await apiClient.post(`${this.baseUrl}/${goalId}/calculate-contributions`);
    return response.data.data;
  }

  async createContributionPlan(goalId: number, planData: {
    plan_name: string;
    optimized_monthly_contribution: number;
    plan_type?: string;
    bonus_contributions?: Array<{
      month: number;
      amount: number;
      source: string;
      probability: number;
    }>;
  }): Promise<ContributionPlan> {
    const response = await apiClient.post(`${this.baseUrl}/${goalId}/contribution-plans`, planData);
    return response.data.data;
  }

  async activateContributionPlan(planId: number): Promise<ContributionPlan> {
    const response = await apiClient.put(`${this.baseUrl}/contribution-plans/${planId}/activate`);
    return response.data.data;
  }

  // 28.3: Hitos intermedios
  async getIntermediateMilestones(goalId: number): Promise<Milestone[]> {
    const response = await apiClient.get(`${this.baseUrl}/${goalId}/intermediate-milestones`);
    return response.data.data;
  }

  async updateMilestoneProgress(milestoneId: number, progressData: {
    current_progress?: number;
    is_achieved?: boolean;
    notes?: string;
  }): Promise<Milestone> {
    const response = await apiClient.put(`${this.baseUrl}/milestones/${milestoneId}/progress`, progressData);
    return response.data.data;
  }

  // 28.4: Estrategias de aceleración
  async getAccelerationStrategies(goalId: number): Promise<AccelerationStrategy[]> {
    const response = await apiClient.get(`${this.baseUrl}/${goalId}/acceleration-strategies`);
    return response.data.data;
  }

  async activateAccelerationStrategy(strategyId: number): Promise<AccelerationStrategy> {
    const response = await apiClient.put(`${this.baseUrl}/acceleration-strategies/${strategyId}/activate`);
    return response.data.data;
  }

  async deactivateAccelerationStrategy(strategyId: number, reason: string): Promise<AccelerationStrategy> {
    const response = await apiClient.put(`${this.baseUrl}/acceleration-strategies/${strategyId}/deactivate`, {
      reason
    });
    return response.data.data;
  }

  // 28.5: Oportunidades vinculadas
  async getMatchedOpportunities(goalId: number, filters?: {
    risk_tolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
    capital_available?: number;
    esg_compliant?: boolean;
    vegan_friendly?: boolean;
  }): Promise<OpportunityMatch[]> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = queryParams.toString() ? 
      `${this.baseUrl}/${goalId}/matched-opportunities?${queryParams}` :
      `${this.baseUrl}/${goalId}/matched-opportunities`;

    const response = await apiClient.get(url);
    return response.data.data;
  }

  async executeOpportunityAction(matchId: number, actionData: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
    amount_invested?: number;
    execution_price?: number;
    notes?: string;
  }): Promise<OpportunityMatch> {
    const response = await apiClient.post(`${this.baseUrl}/opportunity-matches/${matchId}/execute`, actionData);
    return response.data.data;
  }

  // 28: Resumen completo del optimizador
  async getOptimizerSummary(goalId: number): Promise<OptimizerSummary> {
    const response = await apiClient.get(`${this.baseUrl}/${goalId}/summary`);
    return response.data.data;
  }

  // Recomendaciones personalizadas
  async getPersonalizedRecommendations(goalId: number): Promise<PersonalizedRecommendation[]> {
    const response = await apiClient.get(`${this.baseUrl}/${goalId}/recommendations`);
    return response.data.data;
  }

  // Métodos de utilidad
  async refreshAllAnalysis(goalId: number): Promise<OptimizerSummary> {
    // Ejecutar análisis completo en secuencia
    try {
      await this.analyzeGap(goalId);
      await this.getOptimizationStrategies(goalId);
      await this.calculateContributionPlans(goalId);
      await this.getIntermediateMilestones(goalId);
      await this.getAccelerationStrategies(goalId);
      await this.getMatchedOpportunities(goalId);
      
      return await this.getOptimizerSummary(goalId);
    } catch (error) {
      console.error('Error refreshing analysis:', error);
      throw error;
    }
  }

  // Calcular impacto total de estrategias
  calculateTotalImpact(summary: OptimizerSummary): {
    totalAccelerationMonths: number;
    totalReturnBoost: number;
    totalCapitalRequired: number;
    averageRiskIncrease: number;
    overallConfidence: number;
  } {
    const activeStrategies = summary.acceleration_strategies.filter(s => s.is_active);
    
    const totalAccelerationMonths = activeStrategies.reduce(
      (sum, s) => sum + s.potential_acceleration_months, 0
    );
    
    const totalReturnBoost = activeStrategies.reduce(
      (sum, s) => sum + (s.expected_return_boost || 0), 0
    );
    
    const totalCapitalRequired = activeStrategies.reduce(
      (sum, s) => sum + s.capital_requirements, 0
    );
    
    const averageRiskIncrease = activeStrategies.length > 0 ? 
      activeStrategies.reduce((sum, s) => sum + s.risk_increase_factor, 0) / activeStrategies.length - 1 : 0;
    
    const overallConfidence = activeStrategies.length > 0 ?
      activeStrategies.reduce((sum, s) => sum + (s.recommendation_confidence || 70), 0) / activeStrategies.length : 0;

    return {
      totalAccelerationMonths,
      totalReturnBoost,
      totalCapitalRequired,
      averageRiskIncrease,
      overallConfidence
    };
  }

  // Obtener próximas acciones prioritarias
  getNextActions(summary: OptimizerSummary): Array<{
    type: 'gap' | 'contribution' | 'strategy' | 'milestone' | 'opportunity';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    title: string;
    description: string;
    action: string;
  }> {
    const actions: any[] = [];

    // Revisar gap crítico
    if (summary.gap_analysis && summary.gap_analysis.risk_level === 'HIGH') {
      actions.push({
        type: 'gap',
        priority: 'URGENT',
        title: 'Gap Crítico Detectado',
        description: `El objetivo tiene un riesgo alto con ${summary.gap_analysis.gap_percentage.toFixed(1)}% pendiente`,
        action: 'Revisar estrategia de inversión'
      });
    }

    // Revisar contribuciones
    if (summary.gap_analysis && summary.gap_analysis.contribution_gap > 0) {
      actions.push({
        type: 'contribution',
        priority: 'HIGH',
        title: 'Aumentar Aportes Mensuales',
        description: `Aumentar $${summary.gap_analysis.contribution_gap.toLocaleString()} mensuales`,
        action: 'Activar plan de contribución optimizada'
      });
    }

    // Estrategias recomendadas sin aplicar
    const recommendedStrategies = summary.acceleration_strategies.filter(s => s.is_recommended && !s.is_active);
    if (recommendedStrategies.length > 0) {
      actions.push({
        type: 'strategy',
        priority: 'MEDIUM',
        title: 'Estrategias Disponibles',
        description: `${recommendedStrategies.length} estrategias de aceleración disponibles`,
        action: 'Revisar y activar estrategias recomendadas'
      });
    }

    // Oportunidades urgentes
    const urgentOpportunities = summary.opportunity_matches.filter(o => o.priority_level === 'URGENT' && !o.action_taken);
    if (urgentOpportunities.length > 0) {
      actions.push({
        type: 'opportunity',
        priority: 'URGENT',
        title: 'Oportunidades Urgentes',
        description: `${urgentOpportunities.length} oportunidades con alta prioridad disponibles`,
        action: 'Revisar y ejecutar oportunidades'
      });
    }

    // Hitos próximos a alcanzar
    const nextMilestone = summary.milestones.find(m => !m.is_achieved && m.progress_percentage > 80);
    if (nextMilestone) {
      actions.push({
        type: 'milestone',
        priority: 'LOW',
        title: 'Hito Próximo',
        description: `${nextMilestone.milestone_name} está al ${nextMilestone.progress_percentage.toFixed(1)}%`,
        action: 'Continuar con el plan actual'
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

export const goalOptimizerService = new GoalOptimizerService();