/**
 * Hook personalizado para el Optimizador de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  goalOptimizerService,
  type GapAnalysis,
  type OptimizationStrategy,
  type ContributionPlan,
  type Milestone,
  type AccelerationStrategy,
  type OpportunityMatch,
  type OptimizerSummary,
  type PersonalizedRecommendation
} from '../services/goalOptimizerService';

export interface UseGoalOptimizerOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // en milisegundos
  enableRealTimeUpdates?: boolean;
}

export interface GoalOptimizerState {
  // Datos
  summary: OptimizerSummary | null;
  gapAnalysis: GapAnalysis | null;
  strategies: OptimizationStrategy[];
  contributionPlans: ContributionPlan[];
  milestones: Milestone[];
  accelerationStrategies: AccelerationStrategy[];
  opportunities: OpportunityMatch[];
  recommendations: PersonalizedRecommendation[];

  // Estados de carga
  isLoading: boolean;
  isRefreshing: boolean;
  isAnalyzing: boolean;
  
  // Estados específicos
  isLoadingStrategies: boolean;
  isLoadingPlans: boolean;
  isLoadingMilestones: boolean;
  isLoadingAcceleration: boolean;
  isLoadingOpportunities: boolean;
  
  // Errores
  error: string | null;
  errors: {
    summary?: string;
    gapAnalysis?: string;
    strategies?: string;
    plans?: string;
    milestones?: string;
    acceleration?: string;
    opportunities?: string;
  };

  // Métricas calculadas
  metrics: {
    totalAccelerationMonths: number;
    totalReturnBoost: number;
    totalCapitalRequired: number;
    averageRiskIncrease: number;
    overallConfidence: number;
    completedMilestones: number;
    activeStrategies: number;
    urgentOpportunities: number;
  };

  // Próximas acciones
  nextActions: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    action: string;
  }>;
}

export interface UseGoalOptimizerReturn extends GoalOptimizerState {
  // Métodos de carga
  loadSummary: () => Promise<void>;
  refreshAll: () => Promise<void>;
  loadGapAnalysis: () => Promise<void>;
  loadStrategies: () => Promise<void>;
  loadContributionPlans: () => Promise<void>;
  loadMilestones: () => Promise<void>;
  loadAccelerationStrategies: () => Promise<void>;
  loadOpportunities: (filters?: any) => Promise<void>;
  loadRecommendations: () => Promise<void>;

  // Acciones del gap
  performGapAnalysis: (customData?: any) => Promise<void>;

  // Acciones de estrategias
  createOptimizationStrategy: (strategyData: {
    strategy_name: string;
    strategy_type: string;
    description: string;
    priority?: string;
  }) => Promise<void>;

  // Acciones de contribución
  calculateContributionPlans: () => Promise<void>;
  createContributionPlan: (planData: {
    plan_name: string;
    optimized_monthly_contribution: number;
    plan_type?: string;
    bonus_contributions?: Array<any>;
  }) => Promise<void>;
  activateContributionPlan: (planId: number) => Promise<void>;

  // Acciones de hitos
  updateMilestoneProgress: (milestoneId: number, progressData: {
    current_progress?: number;
    is_achieved?: boolean;
    notes?: string;
  }) => Promise<void>;

  // Acciones de aceleración
  activateAccelerationStrategy: (strategyId: number) => Promise<void>;
  deactivateAccelerationStrategy: (strategyId: number, reason: string) => Promise<void>;

  // Acciones de oportunidades
  executeOpportunityAction: (matchId: number, actionData: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
    amount_invested?: number;
    execution_price?: number;
    notes?: string;
  }) => Promise<void>;

  // Utilidades
  clearError: (type?: string) => void;
  forceRefresh: () => Promise<void>;
}

export const useGoalOptimizer = (
  goalId: number,
  options: UseGoalOptimizerOptions = {}
): UseGoalOptimizerReturn => {
  const { autoRefresh = false, refreshInterval = 300000, _enableRealTimeUpdates = false } = options;

  // Estado inicial
  const [state, setState] = useState<GoalOptimizerState>({
    summary: null,
    gapAnalysis: null,
    strategies: [],
    contributionPlans: [],
    milestones: [],
    accelerationStrategies: [],
    opportunities: [],
    recommendations: [],
    
    isLoading: true,
    isRefreshing: false,
    isAnalyzing: false,
    
    isLoadingStrategies: false,
    isLoadingPlans: false,
    isLoadingMilestones: false,
    isLoadingAcceleration: false,
    isLoadingOpportunities: false,
    
    error: null,
    errors: {},
    
    metrics: {
      totalAccelerationMonths: 0,
      totalReturnBoost: 0,
      totalCapitalRequired: 0,
      averageRiskIncrease: 0,
      overallConfidence: 0,
      completedMilestones: 0,
      activeStrategies: 0,
      urgentOpportunities: 0
    },
    
    nextActions: []
  });

  // Función para calcular métricas
  const calculateMetrics = useCallback((summary: OptimizerSummary | null) => {
    if (!summary) {
      return {
        totalAccelerationMonths: 0,
        totalReturnBoost: 0,
        totalCapitalRequired: 0,
        averageRiskIncrease: 0,
        overallConfidence: 0,
        completedMilestones: 0,
        activeStrategies: 0,
        urgentOpportunities: 0
      };
    }

    const impact = goalOptimizerService.calculateTotalImpact(summary);
    const completedMilestones = summary.milestones.filter(m => m.is_achieved).length;
    const activeStrategies = summary.acceleration_strategies.filter(s => s.is_active).length;
    const urgentOpportunities = summary.opportunity_matches.filter(o => 
      o.priority_level === 'URGENT' && !o.action_taken
    ).length;

    return {
      ...impact,
      completedMilestones,
      activeStrategies,
      urgentOpportunities
    };
  }, []);

  // Función para actualizar estado de manera segura
  const updateState = useCallback((updates: Partial<GoalOptimizerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Función para manejar errores
  const handleError = useCallback((error: any, type: string) => {
    const errorMessage = error.response?.data?.error || error.message || 'Error desconocido';
    console.error(`Error in ${type}:`, error);
    
    updateState({
      errors: { ...state.errors, [type]: errorMessage },
      error: errorMessage
    });
  }, [state.errors, updateState]);

  // Cargar resumen completo
  const loadSummary = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null, errors: {} });
      
      const summary = await goalOptimizerService.getOptimizerSummary(goalId);
      const metrics = calculateMetrics(summary);
      const nextActions = goalOptimizerService.getNextActions(summary);
      
      updateState({
        summary,
        gapAnalysis: summary.gap_analysis,
        strategies: summary.optimization_strategies,
        contributionPlans: summary.contribution_plans,
        milestones: summary.milestones,
        accelerationStrategies: summary.acceleration_strategies,
        opportunities: summary.opportunity_matches,
        metrics,
        nextActions,
        isLoading: false
      });
    } catch (error) {
      handleError(error, 'summary');
      updateState({ isLoading: false });
    }
  }, [goalId, calculateMetrics, updateState, handleError]);

  // Refrescar todo
  const refreshAll = useCallback(async () => {
    try {
      updateState({ isRefreshing: true });
      await goalOptimizerService.refreshAllAnalysis(goalId);
      await loadSummary();
    } catch (error) {
      handleError(error, 'refresh');
    } finally {
      updateState({ isRefreshing: false });
    }
  }, [goalId, loadSummary, updateState, handleError]);

  // Análisis de gap
  const performGapAnalysis = useCallback(async (customData?: any) => {
    try {
      updateState({ isAnalyzing: true });
      
      const gapAnalysis = await goalOptimizerService.analyzeGap(goalId, customData);
      updateState({ gapAnalysis, isAnalyzing: false });
      
      // Recargar el resumen después del análisis
      await loadSummary();
    } catch (error) {
      handleError(error, 'gapAnalysis');
      updateState({ isAnalyzing: false });
    }
  }, [goalId, loadSummary, updateState, handleError]);

  const loadGapAnalysis = useCallback(async () => {
    await performGapAnalysis();
  }, [performGapAnalysis]);

  // Estrategias de optimización
  const loadStrategies = useCallback(async () => {
    try {
      updateState({ isLoadingStrategies: true });
      
      const strategies = await goalOptimizerService.getOptimizationStrategies(goalId);
      updateState({ strategies, isLoadingStrategies: false });
    } catch (error) {
      handleError(error, 'strategies');
      updateState({ isLoadingStrategies: false });
    }
  }, [goalId, updateState, handleError]);

  const createOptimizationStrategy = useCallback(async (strategyData: {
    strategy_name: string;
    strategy_type: string;
    description: string;
    priority?: string;
  }) => {
    try {
      await goalOptimizerService.createOptimizationStrategy(goalId, strategyData);
      await loadStrategies();
    } catch (error) {
      handleError(error, 'strategies');
    }
  }, [goalId, loadStrategies, handleError]);

  // Planes de contribución
  const loadContributionPlans = useCallback(async () => {
    try {
      updateState({ isLoadingPlans: true });
      
      const plans = await goalOptimizerService.calculateContributionPlans(goalId);
      updateState({ contributionPlans: plans, isLoadingPlans: false });
    } catch (error) {
      handleError(error, 'plans');
      updateState({ isLoadingPlans: false });
    }
  }, [goalId, updateState, handleError]);

  const calculateContributionPlans = useCallback(async () => {
    await loadContributionPlans();
  }, [loadContributionPlans]);

  const createContributionPlan = useCallback(async (planData: {
    plan_name: string;
    optimized_monthly_contribution: number;
    plan_type?: string;
    bonus_contributions?: Array<any>;
  }) => {
    try {
      await goalOptimizerService.createContributionPlan(goalId, planData);
      await loadContributionPlans();
    } catch (error) {
      handleError(error, 'plans');
    }
  }, [goalId, loadContributionPlans, handleError]);

  const activateContributionPlan = useCallback(async (planId: number) => {
    try {
      await goalOptimizerService.activateContributionPlan(planId);
      await loadContributionPlans();
    } catch (error) {
      handleError(error, 'plans');
    }
  }, [loadContributionPlans, handleError]);

  // Hitos
  const loadMilestones = useCallback(async () => {
    try {
      updateState({ isLoadingMilestones: true });
      
      const milestones = await goalOptimizerService.getIntermediateMilestones(goalId);
      updateState({ milestones, isLoadingMilestones: false });
    } catch (error) {
      handleError(error, 'milestones');
      updateState({ isLoadingMilestones: false });
    }
  }, [goalId, updateState, handleError]);

  const updateMilestoneProgress = useCallback(async (milestoneId: number, progressData: {
    current_progress?: number;
    is_achieved?: boolean;
    notes?: string;
  }) => {
    try {
      await goalOptimizerService.updateMilestoneProgress(milestoneId, progressData);
      await loadMilestones();
    } catch (error) {
      handleError(error, 'milestones');
    }
  }, [loadMilestones, handleError]);

  // Estrategias de aceleración
  const loadAccelerationStrategies = useCallback(async () => {
    try {
      updateState({ isLoadingAcceleration: true });
      
      const strategies = await goalOptimizerService.getAccelerationStrategies(goalId);
      updateState({ accelerationStrategies: strategies, isLoadingAcceleration: false });
    } catch (error) {
      handleError(error, 'acceleration');
      updateState({ isLoadingAcceleration: false });
    }
  }, [goalId, updateState, handleError]);

  const activateAccelerationStrategy = useCallback(async (strategyId: number) => {
    try {
      await goalOptimizerService.activateAccelerationStrategy(strategyId);
      await loadAccelerationStrategies();
      await loadSummary(); // Actualizar métricas
    } catch (error) {
      handleError(error, 'acceleration');
    }
  }, [loadAccelerationStrategies, loadSummary, handleError]);

  const deactivateAccelerationStrategy = useCallback(async (strategyId: number, reason: string) => {
    try {
      await goalOptimizerService.deactivateAccelerationStrategy(strategyId, reason);
      await loadAccelerationStrategies();
      await loadSummary(); // Actualizar métricas
    } catch (error) {
      handleError(error, 'acceleration');
    }
  }, [loadAccelerationStrategies, loadSummary, handleError]);

  // Oportunidades
  const loadOpportunities = useCallback(async (filters?: any) => {
    try {
      updateState({ isLoadingOpportunities: true });
      
      const opportunities = await goalOptimizerService.getMatchedOpportunities(goalId, filters);
      updateState({ opportunities, isLoadingOpportunities: false });
    } catch (error) {
      handleError(error, 'opportunities');
      updateState({ isLoadingOpportunities: false });
    }
  }, [goalId, updateState, handleError]);

  const executeOpportunityAction = useCallback(async (matchId: number, actionData: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
    amount_invested?: number;
    execution_price?: number;
    notes?: string;
  }) => {
    try {
      await goalOptimizerService.executeOpportunityAction(matchId, actionData);
      await loadOpportunities();
    } catch (error) {
      handleError(error, 'opportunities');
    }
  }, [loadOpportunities, handleError]);

  // Recomendaciones
  const loadRecommendations = useCallback(async () => {
    try {
      const recommendations = await goalOptimizerService.getPersonalizedRecommendations(goalId);
      updateState({ recommendations });
    } catch (error) {
      handleError(error, 'recommendations');
    }
  }, [goalId, updateState, handleError]);

  // Utilidades
  const clearError = useCallback((type?: string) => {
    if (type) {
      updateState({ 
        errors: { ...state.errors, [type]: undefined },
        error: state.error === state.errors[type] ? null : state.error
      });
    } else {
      updateState({ error: null, errors: {} });
    }
  }, [state.errors, state.error, updateState]);

  const forceRefresh = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  // Auto-refresh
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && !state.isLoading) {
      intervalId = setInterval(async () => {
        if (!state.isRefreshing) {
          await loadSummary();
        }
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, state.isLoading, state.isRefreshing, loadSummary]);

  // Cargar datos iniciales
  useEffect(() => {
    if (goalId) {
      loadSummary();
    }
  }, [goalId, loadSummary]);

  // Cargar recomendaciones cuando cambie el summary
  useEffect(() => {
    if (state.summary && !state.isLoading) {
      loadRecommendations();
    }
  }, [state.summary, state.isLoading, loadRecommendations]);

  return {
    ...state,
    
    // Métodos de carga
    loadSummary,
    refreshAll,
    loadGapAnalysis,
    loadStrategies,
    loadContributionPlans,
    loadMilestones,
    loadAccelerationStrategies,
    loadOpportunities,
    loadRecommendations,

    // Acciones
    performGapAnalysis,
    createOptimizationStrategy,
    calculateContributionPlans,
    createContributionPlan,
    activateContributionPlan,
    updateMilestoneProgress,
    activateAccelerationStrategy,
    deactivateAccelerationStrategy,
    executeOpportunityAction,

    // Utilidades
    clearError,
    forceRefresh
  };
};