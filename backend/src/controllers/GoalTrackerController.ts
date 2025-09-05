import { Request, Response } from 'express';
import { GoalTrackerService } from '../services/GoalTrackerService';
import { CreateFinancialGoalDto } from '../models/FinancialGoal';

export class GoalTrackerController {
  private goalService: GoalTrackerService;

  constructor(goalService: GoalTrackerService) {
    this.goalService = goalService;
  }

  // 26.1: Crear nuevo objetivo financiero
  createGoal = async (req: Request, res: Response) => {
    try {
      const goalData: CreateFinancialGoalDto = req.body;
      
      // Validaciones básicas
      if (!goalData.name || !goalData.type || !goalData.expected_return_rate) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: name, type, expected_return_rate'
        });
      }

      // Validar tipo de objetivo
      if (!['CAPITAL', 'MONTHLY_INCOME', 'RETURN_RATE'].includes(goalData.type)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de objetivo inválido. Debe ser: CAPITAL, MONTHLY_INCOME, o RETURN_RATE'
        });
      }

      // Validar target_amount para objetivos que lo requieren
      if ((goalData.type === 'CAPITAL' || goalData.type === 'MONTHLY_INCOME') && !goalData.target_amount) {
        return res.status(400).json({
          success: false,
          error: 'target_amount es requerido para objetivos de tipo CAPITAL y MONTHLY_INCOME'
        });
      }

      const goal = await this.goalService.createFinancialGoal(goalData);

      return res.json({
        success: true,
        data: goal,
        message: 'Objetivo financiero creado exitosamente'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.1: Obtener todos los objetivos
  getAllGoals = async (req: Request, res: Response) => {
    try {
      const goals = await this.goalService.getAllGoals();

      return res.json({
        success: true,
        data: goals
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.1: Obtener objetivo por ID
  getGoalById = async (req: Request, res: Response) => {
    try {
      const goalId = this.parseGoalId(req, res);
      if (!goalId) return;

      const goal = await this.goalService.getGoalById(goalId);

      if (!goal) {
        return res.status(404).json({
          success: false,
          error: 'Objetivo no encontrado'
        });
      }

      return res.json({
        success: true,
        data: goal
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.2: Calculadora de tiempo para alcanzar metas
  calculateTimeToGoal = async (req: Request, res: Response) => {
    try {
      const goalId = this.parseGoalId(req, res);
      if (!goalId) return;

      const calculation = await this.goalService.calculateTimeToGoal(goalId);

      return res.json({
        success: true,
        data: calculation,
        message: 'Cálculos de tiempo realizados exitosamente'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.3: Dashboard completo de progreso
  getGoalDashboard = async (req: Request, res: Response) => {
    try {
      const goalId = this.parseGoalId(req, res);
      if (!goalId) return;

      const dashboard = await this.goalService.getGoalDashboard(goalId);

      return res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.3: Actualizar progreso manualmente
  updateGoalProgress = async (req: Request, res: Response) => {
    try {
      const goalId = this.parseGoalId(req, res);
      if (!goalId) return;

      const progress = await this.goalService.updateGoalProgress(goalId);

      return res.json({
        success: true,
        data: progress,
        message: 'Progreso actualizado exitosamente'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.4: Simulador de aportes extraordinarios
  simulateExtraContribution = async (req: Request, res: Response) => {
    try {
      const goalId = this.parseGoalId(req, res);
      if (!goalId) return;

      const { extraAmount, months } = req.body;
      
      if (!extraAmount || !months) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: extraAmount, months'
        });
      }

      if (extraAmount <= 0 || months <= 0) {
        return res.status(400).json({
          success: false,
          error: 'extraAmount y months deben ser mayores a 0'
        });
      }

      const simulation = await this.goalService.simulateExtraContribution(goalId, extraAmount, months);

      return res.json({
        success: true,
        data: simulation,
        message: 'Simulación de aporte extraordinario completada'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 26.4: Simular múltiples escenarios
  simulateMultipleScenarios = async (req: Request, res: Response) => {
    try {
      const goalId = this.parseGoalId(req, res);
      if (!goalId) return;

      const scenarios = this.validateScenarios(req, res);
      if (!scenarios) return;

      const simulations = await this.processScenarios(goalId, scenarios);

      return res.json({
        success: true,
        data: simulations,
        message: `${simulations.length} simulaciones completadas`
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  private parseGoalId(req: Request, res: Response): number | null {
    const { id } = req.params;
    if (typeof id !== 'string') {
      res.status(400).json({
        success: false,
        error: 'ID de objetivo inválido'
      });
      return null;
    }
    const goalId = parseInt(id, 10);
    if (isNaN(goalId)) {
      res.status(400).json({
        success: false,
        error: 'ID de objetivo inválido'
      });
      return null;
    }
    return goalId;
  }

  private validateScenarios(req: Request, res: Response): any[] | null {
    const { scenarios } = req.body;
    
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Debe proporcionar un array de escenarios'
      });
      return null;
    }
    return scenarios;
  }

  private async processScenarios(goalId: number, scenarios: any[]) {
    const simulations = [];
    
    for (const scenario of scenarios) {
      const { name, extraAmount, months } = scenario;
      if (extraAmount && months) {
        try {
          const simulation = await this.goalService.simulateExtraContribution(goalId, extraAmount, months);
          simulations.push({
            scenarioName: name || simulation.scenario_name,
            ...simulation
          });
        } catch (error: any) {
          simulations.push({
            scenarioName: name,
            error: error.message
          });
        }
      }
    }
    
    return simulations;
  }

  // 26.5: Verificar alertas manualmente
  checkAlerts = async (req: Request, res: Response) => {
    try {
      await this.goalService.checkGoalAlerts();

      return res.json({
        success: true,
        message: 'Verificación de alertas completada'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Endpoints auxiliares
  
  // Obtener resumen de todos los objetivos
  getGoalsSummary = async (req: Request, res: Response) => {
    try {
      const goals = await this.goalService.getAllGoals();

      const summary = {
        totalGoals: goals.length,
        activeGoals: goals.filter(g => g.status === 'ACTIVE').length,
        achievedGoals: goals.filter(g => g.status === 'ACHIEVED').length,
        pausedGoals: goals.filter(g => g.status === 'PAUSED').length,
        goalsByType: {
          capital: goals.filter(g => g.type === 'CAPITAL').length,
          monthlyIncome: goals.filter(g => g.type === 'MONTHLY_INCOME').length,
          returnRate: goals.filter(g => g.type === 'RETURN_RATE').length
        }
      };

      return res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Obtener objetivos con progreso reciente
  getGoalsWithProgress = async (req: Request, res: Response) => {
    try {
      const goals = await this.goalService.getAllGoals();
      const goalsWithProgress = [] as any[];

      for (const goal of goals) {
        try {
          const dashboard = await this.goalService.getGoalDashboard(goal.id);
          goalsWithProgress.push({
            goal: goal,
            latestProgress: dashboard.latestProgress,
            calculatedProjection: dashboard.calculatedProjection
          });
        } catch (error) {
          goalsWithProgress.push({
            goal: goal,
            latestProgress: null,
            calculatedProjection: null
          });
        }
      }

      return res.json({
        success: true,
        data: goalsWithProgress
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}