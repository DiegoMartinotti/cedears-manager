import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenarioService } from '../services/scenarioService';

// Types
export interface Scenario {
  id: number;
  name: string;
  description: string;
  category: 'MACRO' | 'MARKET' | 'SECTOR' | 'CUSTOM';
  is_active: boolean;
  is_predefined: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
  variables_count: number;
  last_simulation?: string;
  simulation_count: number;
  average_return?: number;
  average_confidence?: number;
}

export interface ScenarioVariable {
  id?: number;
  scenario_id: number;
  variable_type: 'INFLATION' | 'USD_ARS' | 'INTEREST_RATE' | 'MARKET_CRASH' | 'SECTOR_GROWTH' | 'COMMODITY_PRICE';
  variable_name: string;
  current_value: number;
  scenario_value: number;
  change_percentage: number;
  impact_duration_months: number;
  created_at?: string;
}

export interface WhatIfAnalysisRequest {
  scenarioId: number;
  timeHorizonMonths: number;
  confidenceLevel?: number;
  includeMonteCarloSimulation?: boolean;
  includeInstrumentAnalysis?: boolean;
}

export interface WhatIfAnalysisResult {
  scenarioId: number;
  scenarioName: string;
  simulationDate: string;
  timeHorizonMonths: number;
  portfolioImpact: {
    currentValue: number;
    projectedValue: number;
    totalReturn: number;
    totalReturnPercentage: number;
    adjustedForInflation: boolean;
    inflationAdjustedReturn?: number;
  };
  instrumentImpacts: Array<{
    instrumentId: number;
    ticker: string;
    name: string;
    currentPrice: number;
    projectedPrice: number;
    priceChangePercentage: number;
    positionImpact: number;
    recommendation: 'BUY' | 'SELL' | 'HOLD' | 'HEDGE';
    confidence: number;
    reasoning: string;
  }>;
  riskMetrics: {
    maxDrawdown: number;
    volatility: number;
    sharpeRatio?: number;
    valueAtRisk95: number;
    valueAtRisk99: number;
    probabilityOfLoss: number;
    worstCaseScenario: number;
    stressTestResult: number;
  };
  claudeInsights: {
    executiveSummary: string;
    keyRisks: string[];
    keyOpportunities: string[];
    mitigationStrategies: string[];
    marketContextualAnalysis: string;
    timelineAnalysis: string;
    confidenceAssessment: string;
    alternativeScenarios: string[];
  };
  monteCarloResults?: {
    iterations: number;
    meanReturn: number;
    medianReturn: number;
    standardDeviation: number;
    confidenceIntervals: {
      p5: number;
      p10: number;
      p25: number;
      p75: number;
      p90: number;
      p95: number;
    };
  };
  confidence: number;
  keyFindings: string[];
  actionableRecommendations: string[];
}

export interface ScenarioRecommendations {
  scenarioId: number;
  scenarioName: string;
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'POOR' | 'DANGEROUS';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceLevel: number;
  strategicRecommendations: Array<{
    id: string;
    category: 'POSITIONING' | 'DIVERSIFICATION' | 'HEDGING' | 'LIQUIDITY';
    title: string;
    description: string;
    rationale: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    timeHorizon: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
    expectedImpact: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  tacticalActions: Array<{
    id: string;
    action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' | 'INCREASE' | 'HEDGE';
    instrumentTicker: string;
    instrumentName: string;
    currentPosition?: number;
    recommendedPosition: number;
    positionChange: number;
    changePercentage: number;
    reasoning: string;
    confidence: number;
    urgency: 'IMMEDIATE' | 'THIS_WEEK' | 'THIS_MONTH' | 'NEXT_QUARTER';
    estimatedCost?: number;
    expectedReturn: number;
  }>;
  claudeInsights: {
    strategicAssessment: string;
    topPriorities: string[];
    riskWarnings: string[];
    opportunityHighlights: string[];
    implementationAdvice: string;
    marketTimingGuidance: string;
    esgConsiderations: string[];
    argentineContextFactors: string[];
  };
  implementationGuide: Array<{
    stepNumber: number;
    title: string;
    description: string;
    dependencies: string[];
    estimatedTime: string;
    resources: string[];
    successCriteria: string[];
    rollbackPlan?: string;
  }>;
}

export interface ScenarioTemplate {
  id?: number;
  name: string;
  description: string;
  category: string;
  template_data: string;
  usage_count: number;
  is_public: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateScenarioData {
  name: string;
  description: string;
  category: 'MACRO' | 'MARKET' | 'SECTOR' | 'CUSTOM';
  is_active?: boolean;
  is_predefined?: boolean;
  created_by: string;
}

export interface UpdateScenarioData {
  name?: string;
  description?: string;
  category?: 'MACRO' | 'MARKET' | 'SECTOR' | 'CUSTOM';
  is_active?: boolean;
}

export interface RecommendationRequest {
  riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  timeHorizon?: number;
  priorityFocus?: 'RETURN' | 'RISK' | 'BALANCED';
}

// Query keys
export const scenarioQueryKeys = {
  all: ['scenarios'] as const,
  scenarios: () => [...scenarioQueryKeys.all, 'list'] as const,
  scenario: (id: number) => [...scenarioQueryKeys.all, 'scenario', id] as const,
  variables: (scenarioId: number) => [...scenarioQueryKeys.all, 'variables', scenarioId] as const,
  results: (scenarioId: number) => [...scenarioQueryKeys.all, 'results', scenarioId] as const,
  analysis: (scenarioId: number) => [...scenarioQueryKeys.all, 'analysis', scenarioId] as const,
  recommendations: (scenarioId: number) => [...scenarioQueryKeys.all, 'recommendations', scenarioId] as const,
  templates: () => [...scenarioQueryKeys.all, 'templates'] as const,
  comparisons: () => [...scenarioQueryKeys.all, 'comparisons'] as const,
  stats: () => [...scenarioQueryKeys.all, 'stats'] as const,
  monteCarlo: (scenarioId: number) => [...scenarioQueryKeys.all, 'monte-carlo', scenarioId] as const
};

// Main hook for scenario analysis
export const useScenarioAnalysis = () => {
  const queryClient = useQueryClient();

  // Get all scenarios
  const {
    data: scenarios = [],
    isLoading: scenariosLoading,
    error: scenariosError,
    refetch: refetchScenarios
  } = useQuery({
    queryKey: scenarioQueryKeys.scenarios(),
    queryFn: scenarioService.getAllScenarios,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  // Get scenario templates
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError
  } = useQuery({
    queryKey: scenarioQueryKeys.templates(),
    queryFn: scenarioService.getTemplates,
    staleTime: 30 * 60 * 1000 // 30 minutes
  });

  // Create scenario mutation
  const createScenarioMutation = useMutation({
    mutationFn: scenarioService.createScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenarios() });
    }
  });

  // Update scenario mutation
  const updateScenarioMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateScenarioData }) => 
      scenarioService.updateScenario(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenarios() });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenario(variables.id) });
    }
  });

  // Delete scenario mutation
  const deleteScenarioMutation = useMutation({
    mutationFn: scenarioService.deleteScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenarios() });
    }
  });

  // Run what-if analysis mutation
  const runWhatIfAnalysisMutation = useMutation({
    mutationFn: scenarioService.runWhatIfAnalysis,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: scenarioQueryKeys.analysis(variables.scenarioId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: scenarioQueryKeys.results(variables.scenarioId) 
      });
    }
  });

  // Generate recommendations mutation
  const generateRecommendationsMutation = useMutation({
    mutationFn: ({ scenarioId, request }: { scenarioId: number; request: RecommendationRequest }) =>
      scenarioService.generateRecommendations(scenarioId, request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: scenarioQueryKeys.recommendations(variables.scenarioId) 
      });
    }
  });

  // Compare scenarios mutation
  const compareScenariosMutation = useMutation({
    mutationFn: ({ scenarioIds, userId }: { scenarioIds: number[]; userId: string }) =>
      scenarioService.compareScenarios(scenarioIds, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.comparisons() });
    }
  });

  return {
    // Data
    scenarios,
    templates,
    
    // Loading states
    isLoading: scenariosLoading || templatesLoading,
    scenariosLoading,
    templatesLoading,
    
    // Errors
    scenariosError,
    templatesError,
    
    // Mutations
    createScenario: createScenarioMutation.mutateAsync,
    updateScenario: updateScenarioMutation.mutateAsync,
    deleteScenario: deleteScenarioMutation.mutateAsync,
    runWhatIfAnalysis: runWhatIfAnalysisMutation.mutateAsync,
    generateRecommendations: generateRecommendationsMutation.mutateAsync,
    compareScenarios: compareScenariosMutation.mutateAsync,
    
    // Mutation states
    isCreating: createScenarioMutation.isPending,
    isUpdating: updateScenarioMutation.isPending,
    isDeleting: deleteScenarioMutation.isPending,
    isAnalyzing: runWhatIfAnalysisMutation.isPending,
    isGeneratingRecommendations: generateRecommendationsMutation.isPending,
    isComparingScenarios: compareScenariosMutation.isPending,
    
    // Mutation errors
    createError: createScenarioMutation.error,
    updateError: updateScenarioMutation.error,
    deleteError: deleteScenarioMutation.error,
    analysisError: runWhatIfAnalysisMutation.error,
    recommendationsError: generateRecommendationsMutation.error,
    comparisonError: compareScenariosMutation.error,
    
    // Refetch functions
    refetchScenarios,
    
    // Reset mutations
    resetCreateScenario: createScenarioMutation.reset,
    resetUpdateScenario: updateScenarioMutation.reset,
    resetDeleteScenario: deleteScenarioMutation.reset,
    resetAnalysis: runWhatIfAnalysisMutation.reset,
    resetRecommendations: generateRecommendationsMutation.reset,
    resetComparison: compareScenariosMutation.reset
  };
};

// Hook for specific scenario
export const useScenario = (scenarioId: number) => {
  const queryClient = useQueryClient();

  const {
    data: scenario,
    isLoading: scenarioLoading,
    error: scenarioError
  } = useQuery({
    queryKey: scenarioQueryKeys.scenario(scenarioId),
    queryFn: () => scenarioService.getScenario(scenarioId),
    enabled: !!scenarioId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  const {
    data: variables = [],
    isLoading: variablesLoading,
    error: variablesError
  } = useQuery({
    queryKey: scenarioQueryKeys.variables(scenarioId),
    queryFn: () => scenarioService.getScenarioVariables(scenarioId),
    enabled: !!scenarioId,
    staleTime: 2 * 60 * 1000
  });

  const {
    data: results = [],
    isLoading: resultsLoading,
    error: resultsError
  } = useQuery({
    queryKey: scenarioQueryKeys.results(scenarioId),
    queryFn: () => scenarioService.getScenarioResults(scenarioId),
    enabled: !!scenarioId,
    staleTime: 5 * 60 * 1000
  });

  // Create variable mutation
  const createVariableMutation = useMutation({
    mutationFn: scenarioService.createVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.variables(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenario(scenarioId) });
    }
  });

  // Update variable mutation
  const updateVariableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ScenarioVariable> }) =>
      scenarioService.updateVariable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.variables(scenarioId) });
    }
  });

  // Delete variable mutation
  const deleteVariableMutation = useMutation({
    mutationFn: scenarioService.deleteVariable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.variables(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenario(scenarioId) });
    }
  });

  return {
    // Data
    scenario,
    variables,
    results,
    
    // Loading states
    isLoading: scenarioLoading || variablesLoading || resultsLoading,
    scenarioLoading,
    variablesLoading,
    resultsLoading,
    
    // Errors
    scenarioError,
    variablesError,
    resultsError,
    
    // Mutations
    createVariable: createVariableMutation.mutateAsync,
    updateVariable: updateVariableMutation.mutateAsync,
    deleteVariable: deleteVariableMutation.mutateAsync,
    
    // Mutation states
    isCreatingVariable: createVariableMutation.isPending,
    isUpdatingVariable: updateVariableMutation.isPending,
    isDeletingVariable: deleteVariableMutation.isPending,
    
    // Mutation errors
    createVariableError: createVariableMutation.error,
    updateVariableError: updateVariableMutation.error,
    deleteVariableError: deleteVariableMutation.error
  };
};

// Hook for scenario analysis results
export const useScenarioAnalysisResult = (scenarioId: number) => {
  const {
    data: analysisResult,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: scenarioQueryKeys.analysis(scenarioId),
    queryFn: () => scenarioService.getLatestAnalysisResult(scenarioId),
    enabled: !!scenarioId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 1
  });

  return {
    analysisResult,
    isLoading,
    error,
    refetch
  };
};

// Hook for scenario recommendations
export const useScenarioRecommendations = (scenarioId: number) => {
  const {
    data: recommendations,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: scenarioQueryKeys.recommendations(scenarioId),
    queryFn: () => scenarioService.getLatestRecommendations(scenarioId),
    enabled: !!scenarioId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 1
  });

  return {
    recommendations,
    isLoading,
    error,
    refetch
  };
};

// Hook for scenario comparisons
export const useScenarioComparisons = (userId?: string) => {
  const {
    data: comparisons = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: scenarioQueryKeys.comparisons(),
    queryFn: () => scenarioService.getComparisons(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000 // 15 minutes
  });

  return {
    comparisons,
    isLoading,
    error,
    refetch
  };
};

// Hook for Monte Carlo results
export const useMonteCarloResults = (scenarioId: number) => {
  const {
    data: monteCarloResults = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: scenarioQueryKeys.monteCarlo(scenarioId),
    queryFn: () => scenarioService.getMonteCarloResults(scenarioId),
    enabled: !!scenarioId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000 // 1 hour
  });

  return {
    monteCarloResults,
    isLoading,
    error,
    refetch
  };
};

// Hook for scenario statistics
export const useScenarioStats = () => {
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: scenarioQueryKeys.stats(),
    queryFn: scenarioService.getStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000 // 30 minutes
  });

  return {
    stats,
    isLoading,
    error,
    refetch
  };
};

// Utility hooks for common operations
export const useScenarioMutations = () => {
  const queryClient = useQueryClient();

  const invalidateScenarioQueries = (scenarioId?: number) => {
    if (scenarioId) {
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenario(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.variables(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.results(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.analysis(scenarioId) });
      queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.recommendations(scenarioId) });
    }
    queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.scenarios() });
  };

  const prefetchScenario = (scenarioId: number) => {
    queryClient.prefetchQuery({
      queryKey: scenarioQueryKeys.scenario(scenarioId),
      queryFn: () => scenarioService.getScenario(scenarioId),
      staleTime: 2 * 60 * 1000
    });
  };

  const prefetchScenarioVariables = (scenarioId: number) => {
    queryClient.prefetchQuery({
      queryKey: scenarioQueryKeys.variables(scenarioId),
      queryFn: () => scenarioService.getScenarioVariables(scenarioId),
      staleTime: 2 * 60 * 1000
    });
  };

  return {
    invalidateScenarioQueries,
    prefetchScenario,
    prefetchScenarioVariables
  };
};

// Export types for use in components
export type {
  Scenario,
  ScenarioVariable,
  WhatIfAnalysisRequest,
  WhatIfAnalysisResult,
  ScenarioRecommendations,
  ScenarioTemplate,
  CreateScenarioData,
  UpdateScenarioData,
  RecommendationRequest
};