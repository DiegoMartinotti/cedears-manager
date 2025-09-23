import Database from 'better-sqlite3';
import { 
  FinancialGoal, 
  GoalProgress, 
  GoalSimulation, 
  GoalMilestone,
  GoalAlert,
  CreateFinancialGoalDto,
  GoalCalculationResult,
  GoalDashboardData
} from '../models/FinancialGoal';

export class GoalTrackerService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  private formatDate(date: Date = new Date()): string {
    const isoString = date.toISOString()
    const [day] = isoString.split('T')
    return day ?? isoString
  }

  // 26.1: Crear nuevo objetivo financiero
  async createFinancialGoal(goalData: CreateFinancialGoalDto): Promise<FinancialGoal> {
    const query = `
      INSERT INTO financial_goals (
        name, type, target_amount, target_date, monthly_contribution,
        expected_return_rate, description, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const stmt = this.db.prepare(query);
    const info = stmt.run(
      goalData.name,
      goalData.type,
      goalData.target_amount,
      goalData.target_date,
      goalData.monthly_contribution || 0,
      goalData.expected_return_rate,
      goalData.description,
      goalData.currency || 'USD'
    );
    const row = this.db.prepare('SELECT * FROM financial_goals WHERE id = ?').get(info.lastInsertRowid);
    return row as FinancialGoal;
  }

  // 26.1: Obtener todos los objetivos
  async getAllGoals(): Promise<FinancialGoal[]> {
    const query = 'SELECT * FROM financial_goals ORDER BY created_date DESC';
    const rows = this.db.prepare(query).all();
    return rows as FinancialGoal[];
  }

  // 26.1: Obtener objetivo por ID
  async getGoalById(goalId: number): Promise<FinancialGoal | null> {
    const query = 'SELECT * FROM financial_goals WHERE id = ?';
    const row = this.db.prepare(query).get(goalId);
    return (row as FinancialGoal) || null;
  }

  // 26.2: Calculadora de tiempo para alcanzar metas
  async calculateTimeToGoal(goalId: number): Promise<GoalCalculationResult> {
    const goal = await this.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    // Por ahora usar un valor simulado de capital actual
    const currentCapital = 25000; // $25,000 USD simulado

    return this.performGoalCalculations(goal, currentCapital);
  }

  private performGoalCalculations(goal: FinancialGoal, currentCapital: number): GoalCalculationResult {
    const monthlyReturn = goal.expected_return_rate / 100 / 12;
    const monthlyContribution = goal.monthly_contribution;

    switch (goal.type) {
      case 'CAPITAL':
        return this.calculateCapitalGoal(goal.target_amount!, currentCapital, monthlyContribution, monthlyReturn);
      
      case 'MONTHLY_INCOME':
        return this.calculateIncomeGoal(goal.target_amount!, currentCapital, monthlyContribution, monthlyReturn);
      
      case 'RETURN_RATE':
        return this.calculateReturnRateGoal(goal.expected_return_rate, currentCapital, monthlyContribution);
      
      default:
        throw new Error('Tipo de objetivo no válido');
    }
  }

  private calculateCapitalGoal(targetAmount: number, currentCapital: number, monthlyContribution: number, monthlyReturn: number): GoalCalculationResult {
    const remainingCapital = targetAmount - currentCapital;
    
    if (remainingCapital <= 0) {
      return {
        timeToGoalMonths: 0,
        timeToGoalYears: 0,
        totalInvestmentNeeded: 0,
        monthlyInvestmentNeeded: 0,
        projectedFinalAmount: currentCapital,
        probabilityOfSuccess: 100
      };
    }

    // Fórmula de anualidad con valor presente
    let months = 0;
    if (monthlyReturn > 0) {
      // Cálculo iterativo para encontrar el tiempo
      let capital = currentCapital;
      while (capital < targetAmount && months < 600) { // Max 50 años
        capital = capital * (1 + monthlyReturn) + monthlyContribution;
        months++;
      }
    } else {
      months = remainingCapital / monthlyContribution;
    }

    const totalInvestment = monthlyContribution * months;
    const probabilityOfSuccess = this.calculateProbabilityOfSuccess(monthlyReturn * 12, months / 12);

    return {
      timeToGoalMonths: Math.ceil(months),
      timeToGoalYears: Math.round((months / 12) * 10) / 10,
      totalInvestmentNeeded: totalInvestment,
      monthlyInvestmentNeeded: monthlyContribution,
      projectedFinalAmount: targetAmount,
      probabilityOfSuccess
    };
  }

  private calculateIncomeGoal(monthlyIncomeTarget: number, currentCapital: number, monthlyContribution: number, monthlyReturn: number): GoalCalculationResult {
    // Para generar renta mensual, necesitamos un capital que genere esa renta
    // Suponiendo un retiro del 4% anual (0.33% mensual)
    const withdrawalRate = 0.04 / 12; // 4% anual / 12 meses
    const requiredCapital = monthlyIncomeTarget / withdrawalRate;
    
    return this.calculateCapitalGoal(requiredCapital, currentCapital, monthlyContribution, monthlyReturn);
  }

  private calculateReturnRateGoal(targetReturnRate: number, currentCapital: number, monthlyContribution: number): GoalCalculationResult {
    // Para objetivos de rentabilidad, calculamos el tiempo necesario para duplicar o alcanzar cierto múltiplo
    const targetMultiplier = 2; // Duplicar el capital como ejemplo
    const targetAmount = currentCapital * targetMultiplier;
    const monthlyReturn = targetReturnRate / 100 / 12;
    
    return this.calculateCapitalGoal(targetAmount, currentCapital, monthlyContribution, monthlyReturn);
  }

  private calculateProbabilityOfSuccess(annualReturn: number, years: number): number {
    // Fórmula simplificada basada en volatilidad histórica del mercado
    const returnAdjustment = annualReturn > 0.08 ? 0.85 : 0.95; // Penalizar retornos muy optimistas
    
    let baseProbability = 80; // Base 80%
    if (annualReturn > 0.15) baseProbability -= 20; // Penalizar retornos muy altos
    if (years > 10) baseProbability += 10; // Beneficiar el largo plazo
    
    return Math.max(30, Math.min(95, baseProbability * returnAdjustment));
  }

  // 26.3: Actualizar progreso del objetivo
  async updateGoalProgress(goalId: number): Promise<GoalProgress> {
    const goal = await this.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    // Usar datos simulados por ahora
    const currentCapital = 27500; // $27,500 USD simulado (crecimiento)
    const monthlyIncome = 180; // $180 USD de dividendos simulado
    
    const actualReturnRate = 9.2; // 9.2% anual simulado
    const projectedCompletion = await this.calculateProjectedCompletion(goal, currentCapital);
    const progressPercentage = this.calculateProgressPercentage(goal, currentCapital);
    const deviation = actualReturnRate - goal.expected_return_rate;

    const progressData: Omit<GoalProgress, 'id'> = {
      goal_id: goalId,
      date: this.formatDate(),
      current_capital: currentCapital,
      monthly_income: monthlyIncome,
      actual_return_rate: actualReturnRate,
      projected_completion_date: projectedCompletion,
      progress_percentage: progressPercentage,
      deviation_from_plan: deviation,
      metrics: {
        monthly_performance: 1.2, // 1.2% mensual simulado
        cumulative_return: 15.3, // 15.3% acumulado simulado
        time_to_goal_months: 0,
        required_monthly_return: 0,
        capital_growth_rate: 0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.saveGoalProgress(progressData);
  }

  private async saveGoalProgress(progressData: Omit<GoalProgress, 'id'>): Promise<GoalProgress> {
    const query = `
      INSERT OR REPLACE INTO goal_progress (
        goal_id, date, current_capital, monthly_income, actual_return_rate,
        projected_completion_date, progress_percentage, deviation_from_plan, metrics
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const stmt = this.db.prepare(query)
    stmt.run(
      progressData.goal_id,
      progressData.date,
      progressData.current_capital,
      progressData.monthly_income,
      progressData.actual_return_rate,
      progressData.projected_completion_date,
      progressData.progress_percentage,
      progressData.deviation_from_plan,
      JSON.stringify(progressData.metrics)
    )

    const selectStmt = this.db.prepare('SELECT * FROM goal_progress WHERE goal_id = ? AND date = ? ORDER BY date DESC LIMIT 1')
    const row = selectStmt.get(progressData.goal_id, progressData.date) as GoalProgress | undefined

    if (!row) {
      throw new Error('No se pudo registrar el progreso del objetivo')
    }

    return row
  }

  // 26.4: Simulador de aportes extraordinarios
  async simulateExtraContribution(goalId: number, extraAmount: number, months: number): Promise<GoalSimulation> {
    const goal = await this.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    const currentCapital = 25000; // Usar valor simulado
    
    // Calcular escenario base
    const baseScenario = this.performGoalCalculations(goal, currentCapital);
    
    // Calcular escenario con aporte extra
    const newMonthlyContribution = goal.monthly_contribution + (extraAmount / months);
    const modifiedGoal = { ...goal, monthly_contribution: newMonthlyContribution };
    const newScenario = this.performGoalCalculations(modifiedGoal, currentCapital);
    
    const timeSaved = baseScenario.timeToGoalMonths - newScenario.timeToGoalMonths;
    
    const simulationData: Omit<GoalSimulation, 'id'> = {
      goal_id: goalId,
      simulation_date: this.formatDate(),
      scenario_name: `Aporte Extra $${extraAmount.toLocaleString()} por ${months} meses`,
      extra_contribution: extraAmount,
      new_return_rate: goal.expected_return_rate,
      impact_months: months,
      new_completion_date: this.calculateNewCompletionDate(newScenario.timeToGoalMonths),
      time_saved_months: timeSaved,
      simulation_details: {
        original_months: baseScenario.timeToGoalMonths,
        new_months: newScenario.timeToGoalMonths,
        total_extra_investment: extraAmount,
        impact_on_final_amount: newScenario.projectedFinalAmount - baseScenario.projectedFinalAmount,
        risk_assessment: this.assessRiskLevel(extraAmount, currentCapital)
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.saveGoalSimulation(simulationData);
  }

  private calculateNewCompletionDate(monthsToGoal: number): string {
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToGoal);
    return this.formatDate(completionDate);
  }

  private assessRiskLevel(extraAmount: number, currentCapital: number): string {
    const percentage = (extraAmount / currentCapital) * 100;
    if (percentage < 5) return 'Bajo';
    if (percentage < 15) return 'Moderado';
    return 'Alto';
  }

  // 26.3: Dashboard de progreso completo
  async getGoalDashboard(goalId: number): Promise<GoalDashboardData> {
    const goal = await this.getGoalById(goalId);
    if (!goal) {
      throw new Error('Objetivo no encontrado');
    }

    const [latestProgress, milestones, simulations, alerts, calculation] = await Promise.all([
      this.getLatestProgress(goalId),
      this.getMilestones(goalId),
      this.getRecentSimulations(goalId),
      this.getActiveAlerts(goalId),
      this.calculateTimeToGoal(goalId)
    ]);

    return {
      goal,
      latestProgress: latestProgress || await this.updateGoalProgress(goalId),
      milestones,
      recentSimulations: simulations,
      activeAlerts: alerts,
      calculatedProjection: calculation
    };
  }

  // Métodos auxiliares privados
  private calculateActualReturnRate(): number {
    // Por ahora retornar un valor simulado
    return 8.5; // 8.5% anual simulado
  }

  private async calculateProjectedCompletion(goal: FinancialGoal, currentCapital: number): Promise<string> {
    const calculation = this.performGoalCalculations(goal, currentCapital);
    return this.calculateNewCompletionDate(calculation.timeToGoalMonths);
  }

  private calculateProgressPercentage(goal: FinancialGoal, currentCapital: number): number {
    if (goal.type === 'CAPITAL' && goal.target_amount) {
      return Math.min(100, (currentCapital / goal.target_amount) * 100);
    }
    return 0; // Implementar para otros tipos
  }

  private async getLatestProgress(goalId: number): Promise<GoalProgress | null> {
    const stmt = this.db.prepare('SELECT * FROM goal_progress WHERE goal_id = ? ORDER BY date DESC LIMIT 1')
    const row = stmt.get(goalId)
    return (row as GoalProgress) || null
  }

  private async getMilestones(goalId: number): Promise<GoalMilestone[]> {
    const stmt = this.db.prepare('SELECT * FROM goal_milestones WHERE goal_id = ? ORDER BY milestone_percentage ASC')
    const rows = stmt.all(goalId)
    return rows as GoalMilestone[]
  }

  private async getRecentSimulations(goalId: number): Promise<GoalSimulation[]> {
    const stmt = this.db.prepare('SELECT * FROM goal_simulations WHERE goal_id = ? ORDER BY simulation_date DESC LIMIT 5')
    const rows = stmt.all(goalId)
    return rows as GoalSimulation[]
  }

  private async getActiveAlerts(goalId: number): Promise<GoalAlert[]> {
    const stmt = this.db.prepare('SELECT * FROM goal_alerts WHERE goal_id = ? AND is_enabled = 1')
    const rows = stmt.all(goalId)
    return rows as GoalAlert[]
  }

  private async saveGoalSimulation(simulationData: Omit<GoalSimulation, 'id'>): Promise<GoalSimulation> {
    const query = `
      INSERT INTO goal_simulations (
        goal_id, simulation_date, scenario_name, extra_contribution,
        new_return_rate, impact_months, new_completion_date, time_saved_months, simulation_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const stmt = this.db.prepare(query)
    const result = stmt.run(
      simulationData.goal_id,
      simulationData.simulation_date,
      simulationData.scenario_name,
      simulationData.extra_contribution,
      simulationData.new_return_rate,
      simulationData.impact_months,
      simulationData.new_completion_date,
      simulationData.time_saved_months,
      JSON.stringify(simulationData.simulation_details)
    )

    const selectStmt = this.db.prepare('SELECT * FROM goal_simulations WHERE id = ?')
    const row = selectStmt.get(result.lastInsertRowid) as GoalSimulation | undefined

    if (!row) {
      throw new Error('No se pudo guardar la simulación del objetivo')
    }

    return row
  }

  // 26.5: Sistema de alertas
  async checkGoalAlerts(): Promise<void> {
    const goals = await this.getAllGoals();
    
    for (const goal of goals) {
      if (goal.status === 'ACTIVE') {
        await this.processGoalAlerts(goal);
      }
    }
  }

  private async processGoalAlerts(goal: FinancialGoal): Promise<void> {
    const progress = await this.getLatestProgress(goal.id);
    if (!progress) return;

    const alerts = await this.getActiveAlerts(goal.id);
    
    for (const alert of alerts) {
      const shouldTrigger = this.evaluateAlertCondition(alert, goal, progress);
      
      if (shouldTrigger) {
        await this.triggerGoalAlert(alert);
      }
    }
  }

  private evaluateAlertCondition(alert: GoalAlert, goal: FinancialGoal, progress: GoalProgress): boolean {
    switch (alert.alert_type) {
      case 'DEVIATION':
        return Math.abs(progress.deviation_from_plan) > alert.threshold_value;
      
      case 'PROGRESS_SLOW':
        return progress.progress_percentage < alert.threshold_value;
      
      case 'TIME_TARGET':
        if (goal.target_date) {
          const daysToTarget = Math.floor((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysToTarget < alert.threshold_value;
        }
        return false;
      
      default:
        return false;
    }
  }

  private async triggerGoalAlert(alert: GoalAlert): Promise<void> {
    // Por ahora comentado para evitar dependencias
    // TODO: Implementar cuando se integre con el sistema de notificaciones
    
    // Crear notificación
    // await this.notificationService.createNotification({
    //   type: 'ALERT',
    //   priority: 'MEDIUM',
    //   title: `Alerta de Objetivo: ${goal.name}`,
    //   message: this.formatAlertMessage(alert, goal, progress),
    //   data: JSON.stringify({
    //     goalId: goal.id,
    //     alertId: alert.id,
    //     alertType: alert.alert_type,
    //     currentProgress: progress.progress_percentage
    //   })
    // });

    // Actualizar contador de disparos
    this.updateAlertTriggerCount(alert.id);
  }

  private formatAlertMessage(alert: GoalAlert, goal: FinancialGoal, progress: GoalProgress): string {
    const template = alert.message_template;
    return template
      .replace('{goalName}', goal.name)
      .replace('{currentProgress}', `${progress.progress_percentage.toFixed(1)}%`)
      .replace('{deviation}', `${progress.deviation_from_plan.toFixed(1)}%`)
      .replace('{currentCapital}', `$${progress.current_capital.toLocaleString()}`);
  }

  private updateAlertTriggerCount(alertId: number): void {
    const query = 'UPDATE goal_alerts SET trigger_count = trigger_count + 1, last_triggered = ? WHERE id = ?'
    const stmt = this.db.prepare(query)
    stmt.run(new Date().toISOString(), alertId)
  }
}