export interface FinancialGoal {
  id: number;
  name: string;
  type: 'CAPITAL' | 'MONTHLY_INCOME' | 'RETURN_RATE';
  target_amount?: number;
  target_date?: string;
  monthly_contribution: number;
  expected_return_rate: number;
  created_date: string;
  status: 'ACTIVE' | 'ACHIEVED' | 'PAUSED';
  description?: string;
  currency: 'USD' | 'ARS';
  created_at: string;
  updated_at: string;
}

export interface GoalProgress {
  id: number;
  goal_id: number;
  date: string;
  current_capital: number;
  monthly_income: number;
  actual_return_rate: number;
  projected_completion_date?: string;
  progress_percentage: number;
  deviation_from_plan: number;
  metrics?: {
    monthly_performance: number;
    cumulative_return: number;
    time_to_goal_months: number;
    required_monthly_return: number;
    capital_growth_rate: number;
  };
  created_at: string;
  updated_at: string;
}

export interface GoalSimulation {
  id: number;
  goal_id: number;
  simulation_date: string;
  scenario_name: string;
  extra_contribution: number;
  new_return_rate: number;
  impact_months: number;
  new_completion_date?: string;
  time_saved_months: number;
  simulation_details?: {
    original_months: number;
    new_months: number;
    total_extra_investment: number;
    impact_on_final_amount: number;
    risk_assessment: string;
  };
  created_at: string;
  updated_at: string;
}

export interface GoalMilestone {
  id: number;
  goal_id: number;
  milestone_name: string;
  milestone_amount?: number;
  milestone_percentage: number;
  target_date?: string;
  achieved_date?: string;
  is_achieved: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalAlert {
  id: number;
  goal_id: number;
  alert_type: 'MILESTONE' | 'DEVIATION' | 'TIME_TARGET' | 'PROGRESS_SLOW';
  is_enabled: boolean;
  threshold_value: number;
  threshold_type: 'PERCENTAGE' | 'AMOUNT' | 'DAYS';
  message_template: string;
  last_triggered?: string;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

// DTOs para creación y actualización
export interface CreateFinancialGoalDto {
  name: string;
  type: 'CAPITAL' | 'MONTHLY_INCOME' | 'RETURN_RATE';
  target_amount?: number;
  target_date?: string;
  monthly_contribution?: number;
  expected_return_rate: number;
  description?: string;
  currency?: 'USD' | 'ARS';
}

export interface UpdateFinancialGoalDto {
  name?: string;
  target_amount?: number;
  target_date?: string;
  monthly_contribution?: number;
  expected_return_rate?: number;
  status?: 'ACTIVE' | 'ACHIEVED' | 'PAUSED';
  description?: string;
}

export interface GoalCalculationResult {
  timeToGoalMonths: number;
  timeToGoalYears: number;
  totalInvestmentNeeded: number;
  monthlyInvestmentNeeded: number;
  projectedFinalAmount: number;
  probabilityOfSuccess: number;
}

export interface GoalDashboardData {
  goal: FinancialGoal;
  latestProgress: GoalProgress;
  milestones: GoalMilestone[];
  recentSimulations: GoalSimulation[];
  activeAlerts: GoalAlert[];
  calculatedProjection: GoalCalculationResult;
}