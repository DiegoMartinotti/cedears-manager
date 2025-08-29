/**
 * Modelos TypeScript para el Optimizador de Estrategia de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

// 28.1: Modelo de Análisis de Gap
export interface GoalGapAnalysis {
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
  analysis_details: GapAnalysisDetails | null;
  created_at: string;
  updated_at: string;
}

export interface GapAnalysisDetails {
  current_monthly_performance: number;
  required_monthly_performance: number;
  performance_gap: number;
  historical_volatility: number;
  success_probability: number;
  confidence_intervals: {
    low_estimate: number;
    high_estimate: number;
    confidence_level: number;
  };
  contributing_factors: {
    market_performance: number;
    contribution_consistency: number;
    expense_ratio_impact: number;
    timing_effects: number;
  };
  recommendations: string[];
}

// 28.2: Modelo de Estrategias de Optimización
export interface GoalOptimizationStrategy {
  id: number;
  goal_id: number;
  strategy_name: string;
  strategy_type: 'INCREASE_CONTRIBUTION' | 'IMPROVE_RETURNS' | 'REDUCE_COSTS' | 'DIVERSIFICATION' | 'RISK_ADJUSTMENT' | 'OPPORTUNITY_CAPTURE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact_score: number;
  effort_level: 'LOW' | 'MEDIUM' | 'HIGH';
  time_to_implement_days: number;
  estimated_time_savings_months: number | null;
  estimated_cost_savings: number | null;
  description: string;
  implementation_steps: ImplementationStep[] | null;
  requirements: StrategyRequirement[] | null;
  risks: StrategyRisk[] | null;
  is_applied: boolean;
  applied_date: string | null;
  results_tracking: StrategyResultsTracking | null;
  created_at: string;
  updated_at: string;
}

export interface ImplementationStep {
  step_number: number;
  description: string;
  estimated_hours: number;
  dependencies: string[];
  resources_needed: string[];
  success_criteria: string;
}

export interface StrategyRequirement {
  requirement_type: 'FINANCIAL' | 'TECHNICAL' | 'TIME' | 'KNOWLEDGE';
  description: string;
  is_met: boolean;
  how_to_fulfill: string;
}

export interface StrategyRisk {
  risk_type: 'FINANCIAL' | 'OPERATIONAL' | 'MARKET' | 'REGULATORY';
  description: string;
  probability: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  mitigation_strategy: string;
}

export interface StrategyResultsTracking {
  implementation_date: string;
  expected_results: any;
  actual_results: any;
  performance_delta: number;
  lessons_learned: string[];
  adjustments_made: string[];
}

// 28.2: Modelo de Planes de Contribución
export interface GoalContributionPlan {
  id: number;
  goal_id: number;
  plan_name: string;
  plan_type: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';
  base_monthly_contribution: number;
  optimized_monthly_contribution: number;
  contribution_increase: number;
  extra_annual_contributions: number;
  bonus_contributions: BonusContribution[] | null;
  dynamic_adjustments: boolean;
  seasonal_adjustments: SeasonalAdjustment[] | null;
  affordability_score: number | null;
  stress_test_scenarios: StressTestScenario[] | null;
  projected_completion_date: string | null;
  time_savings_months: number | null;
  total_savings_amount: number | null;
  success_probability: number | null;
  monitoring_frequency_days: number;
  is_active: boolean;
  activated_date: string | null;
  performance_tracking: ContributionPerformanceTracking | null;
  created_at: string;
  updated_at: string;
}

export interface BonusContribution {
  month: number; // 1-12
  amount: number;
  source: string; // "bonus", "tax_refund", "extra_income"
  frequency: 'ONCE' | 'YEARLY' | 'VARIABLE';
  probability: number; // 0-100
}

export interface SeasonalAdjustment {
  months: number[]; // Array de meses (1-12)
  adjustment_factor: number; // Multiplicador (0.8 = 20% reducción, 1.2 = 20% aumento)
  reason: string;
}

export interface StressTestScenario {
  scenario_name: string;
  income_reduction_percentage: number;
  expense_increase_percentage: number;
  market_downturn_percentage: number;
  adjusted_contribution: number;
  impact_on_goal_months: number;
  recovery_strategy: string;
}

export interface ContributionPerformanceTracking {
  actual_contributions: MonthlyContribution[];
  adherence_percentage: number;
  adjustments_made: ContributionAdjustment[];
  performance_vs_projection: number;
}

export interface MonthlyContribution {
  month: string; // YYYY-MM
  planned_amount: number;
  actual_amount: number;
  variance: number;
  variance_reason: string | null;
}

export interface ContributionAdjustment {
  adjustment_date: string;
  old_amount: number;
  new_amount: number;
  reason: string;
  duration_months: number | null;
}

// 28.3: Modelo de Hitos Intermedios
export interface GoalIntermediateMilestone {
  id: number;
  goal_id: number;
  milestone_name: string;
  milestone_type: 'PERCENTAGE' | 'AMOUNT' | 'TIME_BASED' | 'PERFORMANCE';
  milestone_order: number;
  target_amount: number | null;
  target_percentage: number | null;
  target_date: string | null;
  current_progress: number;
  progress_percentage: number;
  is_achieved: boolean;
  achieved_date: string | null;
  celebration_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  reward_suggestion: string | null;
  next_milestone_id: number | null;
  dependency_milestones: number[] | null;
  auto_calculated: boolean;
  adjustment_history: MilestoneAdjustment[] | null;
  motivation_message: string | null;
  difficulty_level: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'AMBITIOUS';
  estimated_completion_date: string | null;
  buffer_days: number;
  created_at: string;
  updated_at: string;
}

export interface MilestoneAdjustment {
  adjustment_date: string;
  field_changed: string;
  old_value: any;
  new_value: any;
  reason: string;
  auto_adjustment: boolean;
}

// 28.4: Modelo de Estrategias de Aceleración
export interface GoalAccelerationStrategy {
  id: number;
  goal_id: number;
  strategy_name: string;
  acceleration_type: 'MARKET_TIMING' | 'SECTOR_ROTATION' | 'VOLATILITY_HARVEST' | 'DIVIDEND_CAPTURE' | 'TAX_OPTIMIZATION' | 'COST_REDUCTION' | 'LEVERAGE_PRUDENT';
  potential_acceleration_months: number;
  risk_increase_factor: number;
  complexity_score: number;
  capital_requirements: number;
  expected_return_boost: number | null;
  implementation_timeline_days: number;
  monitoring_requirements: MonitoringRequirement[] | null;
  exit_conditions: ExitCondition[] | null;
  success_metrics: SuccessMetric[] | null;
  historical_performance: HistoricalPerformanceData | null;
  market_conditions_required: string | null;
  portfolio_impact_analysis: PortfolioImpactAnalysis | null;
  recommendation_confidence: number | null;
  claude_analysis: string | null;
  is_recommended: boolean;
  is_active: boolean;
  activated_date: string | null;
  deactivated_date: string | null;
  performance_tracking: AccelerationPerformanceTracking | null;
  created_at: string;
  updated_at: string;
}

export interface MonitoringRequirement {
  metric_name: string;
  check_frequency_days: number;
  threshold_values: {
    warning: number;
    critical: number;
  };
  action_required: string;
}

export interface ExitCondition {
  condition_type: 'TIME_BASED' | 'PERFORMANCE_BASED' | 'RISK_BASED' | 'MARKET_BASED';
  description: string;
  trigger_value: number;
  action_to_take: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SuccessMetric {
  metric_name: string;
  target_value: number;
  measurement_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  current_value: number | null;
  trend_direction: 'IMPROVING' | 'STABLE' | 'DECLINING' | null;
}

export interface HistoricalPerformanceData {
  time_periods: string[]; // Array de períodos (YYYY-MM)
  returns: number[]; // Retornos correspondientes
  volatility: number;
  max_drawdown: number;
  sharpe_ratio: number;
  success_rate: number; // Porcentaje de períodos exitosos
  average_duration_days: number;
}

export interface PortfolioImpactAnalysis {
  correlation_impact: number;
  diversification_benefit: number;
  liquidity_impact: number;
  cost_impact: number;
  tax_efficiency_impact: number;
  overall_impact_score: number; // 0-100
}

export interface AccelerationPerformanceTracking {
  start_date: string;
  target_acceleration_months: number;
  actual_acceleration_months: number | null;
  incremental_returns: number[];
  risk_metrics: {
    volatility_increase: number;
    max_drawdown: number;
    risk_adjusted_return: number;
  };
  adjustments_made: string[];
  lessons_learned: string[];
}

// 28.5: Modelo de Matching con Oportunidades
export interface GoalOpportunityMatch {
  id: number;
  goal_id: number;
  opportunity_id: number;
  match_score: number;
  impact_on_goal: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  time_sensitivity_hours: number | null;
  capital_allocation_suggestion: number | null;
  risk_alignment_score: number | null;
  diversification_impact: number | null;
  expected_contribution_to_goal: number | null;
  opportunity_details: OpportunityDetails | null;
  analysis_timestamp: string;
  expiration_timestamp: string | null;
  action_taken: boolean;
  action_date: string | null;
  action_details: ActionDetails | null;
  result_tracking: OpportunityResultTracking | null;
  claude_recommendation: string | null;
  user_feedback: string | null;
  performance_after_action: PerformanceAfterAction | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityDetails {
  instrument_symbol: string;
  opportunity_type: string;
  entry_price: number;
  target_price: number | null;
  stop_loss: number | null;
  expected_holding_period_days: number;
  confidence_level: number;
  risk_factors: string[];
  catalyst_events: string[];
}

export interface ActionDetails {
  action_type: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
  amount_invested: number | null;
  execution_price: number | null;
  execution_timestamp: string;
  notes: string | null;
}

export interface OpportunityResultTracking {
  expected_return: number;
  actual_return: number | null;
  holding_period_days: number | null;
  exit_reason: string | null;
  goal_contribution_actual: number | null;
  lessons_learned: string[];
}

export interface PerformanceAfterAction {
  goal_progress_before: number;
  goal_progress_after: number | null;
  time_to_goal_before_months: number;
  time_to_goal_after_months: number | null;
  portfolio_impact: number | null;
}

// DTOs para creación y actualización
export interface CreateGapAnalysisDto {
  goal_id: number;
  analysis_details?: GapAnalysisDetails;
}

export interface CreateOptimizationStrategyDto {
  goal_id: number;
  strategy_name: string;
  strategy_type: GoalOptimizationStrategy['strategy_type'];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  implementation_steps?: ImplementationStep[];
  requirements?: StrategyRequirement[];
  risks?: StrategyRisk[];
}

export interface CreateContributionPlanDto {
  goal_id: number;
  plan_name: string;
  plan_type?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';
  optimized_monthly_contribution: number;
  bonus_contributions?: BonusContribution[];
  seasonal_adjustments?: SeasonalAdjustment[];
}

export interface CreateMilestoneDto {
  goal_id: number;
  milestone_name: string;
  milestone_type: 'PERCENTAGE' | 'AMOUNT' | 'TIME_BASED' | 'PERFORMANCE';
  target_amount?: number;
  target_percentage?: number;
  target_date?: string;
  difficulty_level?: 'EASY' | 'MODERATE' | 'CHALLENGING' | 'AMBITIOUS';
  motivation_message?: string;
}

export interface CreateAccelerationStrategyDto {
  goal_id: number;
  strategy_name: string;
  acceleration_type: GoalAccelerationStrategy['acceleration_type'];
  potential_acceleration_months: number;
  risk_increase_factor: number;
  complexity_score: number;
  capital_requirements?: number;
  expected_return_boost?: number;
  implementation_timeline_days: number;
}

// Tipos de respuesta para APIs
export interface GoalOptimizerSummary {
  goal_id: number;
  gap_analysis: GoalGapAnalysis | null;
  optimization_strategies: GoalOptimizationStrategy[];
  contribution_plans: GoalContributionPlan[];
  milestones: GoalIntermediateMilestone[];
  acceleration_strategies: GoalAccelerationStrategy[];
  opportunity_matches: GoalOpportunityMatch[];
  overall_score: number; // 0-100, qué tan optimizado está el objetivo
  next_recommended_actions: string[];
}

export interface OptimizationRecommendation {
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