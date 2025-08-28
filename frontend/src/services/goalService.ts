import { api } from './api';

// Interfaces que coinciden con el backend
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
  activeAlerts: any[];
  calculatedProjection: GoalCalculationResult;
}

export interface CreateGoalRequest {
  name: string;
  type: 'CAPITAL' | 'MONTHLY_INCOME' | 'RETURN_RATE';
  target_amount?: number;
  target_date?: string;
  monthly_contribution?: number;
  expected_return_rate: number;
  description?: string;
  currency?: 'USD' | 'ARS';
}

export interface SimulationRequest {
  extraAmount: number;
  months: number;
}

export interface MultipleSimulationRequest {
  scenarios: Array<{
    name: string;
    extraAmount: number;
    months: number;
  }>;
}

class GoalService {
  private baseUrl = '/api/v1/goals';

  // 26.1: Crear nuevo objetivo
  async createGoal(goalData: CreateGoalRequest): Promise<FinancialGoal> {
    const response = await api.post<{
      success: boolean;
      data: FinancialGoal;
      message: string;
    }>(this.baseUrl, goalData);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al crear objetivo');
    }

    return response.data.data;
  }

  // 26.1: Obtener todos los objetivos
  async getAllGoals(): Promise<FinancialGoal[]> {
    const response = await api.get<{
      success: boolean;
      data: FinancialGoal[];
    }>(this.baseUrl);

    if (!response.data.success) {
      throw new Error('Error al obtener objetivos');
    }

    return response.data.data;
  }

  // 26.1: Obtener objetivo por ID
  async getGoalById(goalId: number): Promise<FinancialGoal> {
    const response = await api.get<{
      success: boolean;
      data: FinancialGoal;
    }>(`${this.baseUrl}/${goalId}`);

    if (!response.data.success) {
      throw new Error('Error al obtener objetivo');
    }

    return response.data.data;
  }

  // 26.2: Calculadora de tiempo para meta
  async calculateTimeToGoal(goalId: number): Promise<GoalCalculationResult> {
    const response = await api.get<{
      success: boolean;
      data: GoalCalculationResult;
      message: string;
    }>(`${this.baseUrl}/${goalId}/calculate`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al calcular tiempo');
    }

    return response.data.data;
  }

  // 26.3: Dashboard completo del objetivo
  async getGoalDashboard(goalId: number): Promise<GoalDashboardData> {
    const response = await api.get<{
      success: boolean;
      data: GoalDashboardData;
    }>(`${this.baseUrl}/${goalId}/dashboard`);

    if (!response.data.success) {
      throw new Error('Error al obtener dashboard del objetivo');
    }

    return response.data.data;
  }

  // 26.3: Actualizar progreso
  async updateGoalProgress(goalId: number): Promise<GoalProgress> {
    const response = await api.post<{
      success: boolean;
      data: GoalProgress;
      message: string;
    }>(`${this.baseUrl}/${goalId}/update-progress`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al actualizar progreso');
    }

    return response.data.data;
  }

  // 26.4: Simular aporte extraordinario
  async simulateExtraContribution(goalId: number, simulation: SimulationRequest): Promise<GoalSimulation> {
    const response = await api.post<{
      success: boolean;
      data: GoalSimulation;
      message: string;
    }>(`${this.baseUrl}/${goalId}/simulate-contribution`, simulation);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al simular aporte');
    }

    return response.data.data;
  }

  // 26.4: Simular múltiples escenarios
  async simulateMultipleScenarios(goalId: number, request: MultipleSimulationRequest): Promise<GoalSimulation[]> {
    const response = await api.post<{
      success: boolean;
      data: GoalSimulation[];
      message: string;
    }>(`${this.baseUrl}/${goalId}/simulate-scenarios`, request);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al simular escenarios');
    }

    return response.data.data;
  }

  // 26.5: Verificar alertas
  async checkAlerts(): Promise<void> {
    const response = await api.post<{
      success: boolean;
      message: string;
    }>(`${this.baseUrl}/check-alerts`);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al verificar alertas');
    }
  }

  // Endpoints auxiliares
  async getGoalsSummary(): Promise<any> {
    const response = await api.get<{
      success: boolean;
      data: any;
    }>(`${this.baseUrl}/summary`);

    if (!response.data.success) {
      throw new Error('Error al obtener resumen de objetivos');
    }

    return response.data.data;
  }

  async getGoalsWithProgress(): Promise<Array<{
    goal: FinancialGoal;
    latestProgress: GoalProgress | null;
    calculatedProjection: GoalCalculationResult | null;
  }>> {
    const response = await api.get<{
      success: boolean;
      data: Array<{
        goal: FinancialGoal;
        latestProgress: GoalProgress | null;
        calculatedProjection: GoalCalculationResult | null;
      }>;
    }>(`${this.baseUrl}/with-progress`);

    if (!response.data.success) {
      throw new Error('Error al obtener objetivos con progreso');
    }

    return response.data.data;
  }

  // Utilities
  formatCurrency(amount: number, currency: 'USD' | 'ARS' = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatMonths(months: number): string {
    if (months < 12) {
      return `${Math.round(months)} mes${months > 1 ? 'es' : ''}`;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return `${years} año${years > 1 ? 's' : ''}`;
    }
    return `${years} año${years > 1 ? 's' : ''} y ${Math.round(remainingMonths)} mes${remainingMonths > 1 ? 'es' : ''}`;
  }

  calculateProgressColor(percentage: number): string {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 25) return 'text-orange-600';
    return 'text-red-600';
  }

  getGoalTypeLabel(type: string): string {
    switch (type) {
      case 'CAPITAL':
        return 'Meta de Capital';
      case 'MONTHLY_INCOME':
        return 'Renta Mensual';
      case 'RETURN_RATE':
        return 'Tasa de Retorno';
      default:
        return type;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Activo';
      case 'ACHIEVED':
        return 'Logrado';
      case 'PAUSED':
        return 'Pausado';
      default:
        return status;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600 bg-green-100';
      case 'ACHIEVED':
        return 'text-blue-600 bg-blue-100';
      case 'PAUSED':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }
}

export const goalService = new GoalService();