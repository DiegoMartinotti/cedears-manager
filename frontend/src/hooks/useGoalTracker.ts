import { useState, useEffect, useCallback } from 'react';
import { 
  goalService, 
  FinancialGoal, 
  GoalDashboardData, 
  GoalCalculationResult,
  CreateGoalRequest,
  SimulationRequest 
} from '../services/goalService';

interface UseGoalsReturn {
  goals: FinancialGoal[];
  loading: boolean;
  error: string | null;
  createGoal: (goalData: CreateGoalRequest) => Promise<void>;
  refreshGoals: () => Promise<void>;
  getGoalsSummary: () => Promise<any>;
}

interface UseGoalDashboardReturn {
  dashboard: GoalDashboardData | null;
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
  updateProgress: () => Promise<void>;
}

interface UseGoalCalculatorReturn {
  calculation: GoalCalculationResult | null;
  loading: boolean;
  error: string | null;
  calculate: (goalId: number) => Promise<void>;
}

interface UseGoalSimulatorReturn {
  simulations: any[];
  loading: boolean;
  error: string | null;
  simulate: (goalId: number, simulation: SimulationRequest) => Promise<void>;
  simulateMultiple: (goalId: number, scenarios: Array<{name: string, extraAmount: number, months: number}>) => Promise<void>;
}

// Hook principal para gestionar todos los objetivos
export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const goalsData = await goalService.getAllGoals();
      setGoals(goalsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar objetivos');
      console.error('Error loading goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createGoal = useCallback(async (goalData: CreateGoalRequest) => {
    try {
      setLoading(true);
      setError(null);
      await goalService.createGoal(goalData);
      await refreshGoals(); // Refrescar la lista
    } catch (err: any) {
      setError(err.message || 'Error al crear objetivo');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshGoals]);

  const getGoalsSummary = useCallback(async () => {
    try {
      return await goalService.getGoalsSummary();
    } catch (err: any) {
      setError(err.message || 'Error al obtener resumen');
      throw err;
    }
  }, []);

  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  return {
    goals,
    loading,
    error,
    createGoal,
    refreshGoals,
    getGoalsSummary
  };
}

// Hook para el dashboard de un objetivo específico
export function useGoalDashboard(goalId: number | null): UseGoalDashboardReturn {
  const [dashboard, setDashboard] = useState<GoalDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (!goalId) return;
    
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await goalService.getGoalDashboard(goalId);
      setDashboard(dashboardData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar dashboard');
      console.error('Error loading goal dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  const updateProgress = useCallback(async () => {
    if (!goalId) return;
    
    try {
      setLoading(true);
      setError(null);
      await goalService.updateGoalProgress(goalId);
      await refreshDashboard(); // Refrescar después de actualizar
    } catch (err: any) {
      setError(err.message || 'Error al actualizar progreso');
      console.error('Error updating progress:', err);
    } finally {
      setLoading(false);
    }
  }, [goalId, refreshDashboard]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return {
    dashboard,
    loading,
    error,
    refreshDashboard,
    updateProgress
  };
}

// Hook para la calculadora de objetivos
export function useGoalCalculator(): UseGoalCalculatorReturn {
  const [calculation, setCalculation] = useState<GoalCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (goalId: number) => {
    try {
      setLoading(true);
      setError(null);
      const calculationResult = await goalService.calculateTimeToGoal(goalId);
      setCalculation(calculationResult);
    } catch (err: any) {
      setError(err.message || 'Error al calcular tiempo');
      console.error('Error calculating goal:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    calculation,
    loading,
    error,
    calculate
  };
}

// Hook para el simulador de aportes
export function useGoalSimulator(): UseGoalSimulatorReturn {
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (goalId: number, simulation: SimulationRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await goalService.simulateExtraContribution(goalId, simulation);
      setSimulations(prev => [result, ...prev].slice(0, 10)); // Mantener últimas 10 simulaciones
    } catch (err: any) {
      setError(err.message || 'Error al simular');
      console.error('Error simulating:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const simulateMultiple = useCallback(async (
    goalId: number, 
    scenarios: Array<{name: string, extraAmount: number, months: number}>
  ) => {
    try {
      setLoading(true);
      setError(null);
      const results = await goalService.simulateMultipleScenarios(goalId, { scenarios });
      setSimulations(prev => [...results, ...prev].slice(0, 20)); // Mantener últimas 20
    } catch (err: any) {
      setError(err.message || 'Error al simular escenarios');
      console.error('Error simulating multiple scenarios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    simulations,
    loading,
    error,
    simulate,
    simulateMultiple
  };
}

// Hook compuesto que combina todas las funcionalidades
export function useGoalTracker(goalId: number | null) {
  const goals = useGoals();
  const dashboard = useGoalDashboard(goalId);
  const calculator = useGoalCalculator();
  const simulator = useGoalSimulator();

  // Función para recalcular todo
  const recalculateAll = useCallback(async () => {
    if (goalId) {
      await Promise.all([
        dashboard.refreshDashboard(),
        calculator.calculate(goalId)
      ]);
    }
    await goals.refreshGoals();
  }, [goalId, dashboard, calculator, goals]);

  // Función para actualizar progreso completo
  const updateCompleteProgress = useCallback(async () => {
    if (goalId) {
      await dashboard.updateProgress();
      await calculator.calculate(goalId);
    }
  }, [goalId, dashboard, calculator]);

  const isLoading = goals.loading || dashboard.loading || calculator.loading || simulator.loading;
  const hasError = goals.error || dashboard.error || calculator.error || simulator.error;

  return {
    // Estado general
    isLoading,
    hasError: hasError || null,
    
    // Objetivos
    goals: goals.goals,
    createGoal: goals.createGoal,
    refreshGoals: goals.refreshGoals,
    getGoalsSummary: goals.getGoalsSummary,
    
    // Dashboard del objetivo actual
    dashboard: dashboard.dashboard,
    refreshDashboard: dashboard.refreshDashboard,
    updateProgress: dashboard.updateProgress,
    
    // Cálculos
    calculation: calculator.calculation,
    calculate: calculator.calculate,
    
    // Simulaciones
    simulations: simulator.simulations,
    simulate: simulator.simulate,
    simulateMultiple: simulator.simulateMultiple,
    
    // Funciones compuestas
    recalculateAll,
    updateCompleteProgress
  };
}