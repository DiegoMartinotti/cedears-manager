/* eslint-disable no-console */
import { apiClient } from './api';
import type {
  Scenario,
  ScenarioVariable,
  WhatIfAnalysisRequest,
  WhatIfAnalysisResult,
  ScenarioRecommendations,
  ScenarioTemplate,
  CreateScenarioData,
  UpdateScenarioData,
  RecommendationRequest
} from '../hooks/useScenarioAnalysis';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: any;
}

export interface ApiError {
  success: false;
  error: string;
  details?: any;
}

export interface ScenarioFilters {
  category?: 'MACRO' | 'MARKET' | 'SECTOR' | 'CUSTOM';
  is_active?: boolean;
  is_predefined?: boolean;
}

export interface ScenarioDetailResponse {
  scenario: Scenario;
  variables: ScenarioVariable[];
  latestResult?: any;
  recentResults: any[];
}

export interface ScenarioComparison {
  id: number;
  name: string;
  scenario_ids: string;
  comparison_metrics: string;
  best_case_scenario_id?: number;
  worst_case_scenario_id?: number;
  recommended_scenario_id?: number;
  created_by: string;
  created_at: string;
}

export interface ScenarioStats {
  scenarios: {
    total_scenarios: number;
    active_scenarios: number;
    predefined_scenarios: number;
    custom_scenarios: number;
    simulations_run: number;
    average_confidence: number;
    categories: Record<string, number>;
  };
  analysis: any;
}

export interface MonteCarloResult {
  id?: number;
  scenario_id: number;
  iterations: number;
  confidence_intervals: string;
  mean_return: number;
  median_return: number;
  std_deviation: number;
  var_95: number;
  var_99: number;
  probability_positive: number;
  probability_loss: number;
  simulation_data: string;
  created_at?: string;
}

class ScenarioService {
  private readonly basePath = '/api/v1/scenarios';

  // ==================== SCENARIO MANAGEMENT ====================

  async getAllScenarios(filters?: ScenarioFilters): Promise<Scenario[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters?.is_predefined !== undefined) params.append('is_predefined', filters.is_predefined.toString());
      
      const queryString = params.toString();
      const url = queryString ? `${this.basePath}?${queryString}` : this.basePath;
      
      const response = await apiClient.get<ApiResponse<Scenario[]>>(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
      throw new Error('Failed to fetch scenarios');
    }
  }

  async getScenario(id: number): Promise<ScenarioDetailResponse> {
    try {
      const response = await apiClient.get<ApiResponse<ScenarioDetailResponse>>(`${this.basePath}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch scenario:', error);
      throw new Error('Failed to fetch scenario');
    }
  }

  async createScenario(data: CreateScenarioData): Promise<Scenario> {
    try {
      const response = await apiClient.post<ApiResponse<Scenario>>(this.basePath, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create scenario:', error);
      throw new Error('Failed to create scenario');
    }
  }

  async updateScenario(id: number, data: UpdateScenarioData): Promise<Scenario> {
    try {
      const response = await apiClient.put<ApiResponse<Scenario>>(`${this.basePath}/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update scenario:', error);
      throw new Error('Failed to update scenario');
    }
  }

  async deleteScenario(id: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.basePath}/${id}`);
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      throw new Error('Failed to delete scenario');
    }
  }

  // ==================== SCENARIO VARIABLES ====================

  async getScenarioVariables(scenarioId: number): Promise<ScenarioVariable[]> {
    try {
      const response = await apiClient.get<ApiResponse<ScenarioVariable[]>>(`${this.basePath}/${scenarioId}/variables`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch scenario variables:', error);
      throw new Error('Failed to fetch scenario variables');
    }
  }

  async createVariable(data: Omit<ScenarioVariable, 'id' | 'created_at'>): Promise<{ id: number }> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: number }>>(`${this.basePath}/variables`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create variable:', error);
      throw new Error('Failed to create variable');
    }
  }

  async updateVariable(id: number, data: Partial<ScenarioVariable>): Promise<void> {
    try {
      await apiClient.put<ApiResponse<void>>(`${this.basePath}/variables/${id}`, data);
    } catch (error) {
      console.error('Failed to update variable:', error);
      throw new Error('Failed to update variable');
    }
  }

  async deleteVariable(id: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.basePath}/variables/${id}`);
    } catch (error) {
      console.error('Failed to delete variable:', error);
      throw new Error('Failed to delete variable');
    }
  }

  // ==================== WHAT-IF ANALYSIS (Step 24.4) ====================

  async runWhatIfAnalysis(request: WhatIfAnalysisRequest): Promise<WhatIfAnalysisResult> {
    try {
      const response = await apiClient.post<ApiResponse<WhatIfAnalysisResult>>(
        `${this.basePath}/what-if-analysis`,
        request
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to run what-if analysis:', error);
      throw new Error('Failed to run what-if analysis');
    }
  }

  async runScenarioAnalysis(scenarioId: number, request: Omit<WhatIfAnalysisRequest, 'scenarioId'>): Promise<WhatIfAnalysisResult> {
    try {
      const response = await apiClient.post<ApiResponse<WhatIfAnalysisResult>>(
        `${this.basePath}/${scenarioId}/analyze`,
        request
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to run scenario analysis:', error);
      throw new Error('Failed to run scenario analysis');
    }
  }

  // ==================== RECOMMENDATIONS (Step 24.5) ====================

  async generateRecommendations(scenarioId: number, request: RecommendationRequest): Promise<ScenarioRecommendations> {
    try {
      const response = await apiClient.post<ApiResponse<ScenarioRecommendations>>(
        `${this.basePath}/${scenarioId}/recommendations`,
        request
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  // ==================== RESULTS ====================

  async getScenarioResults(scenarioId: number, limit?: number): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      
      const queryString = params.toString();
      const url = queryString ? 
        `${this.basePath}/${scenarioId}/results?${queryString}` : 
        `${this.basePath}/${scenarioId}/results`;
      
      const response = await apiClient.get<ApiResponse<any[]>>(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch scenario results:', error);
      throw new Error('Failed to fetch scenario results');
    }
  }

  async getResultInstrumentImpacts(resultId: number): Promise<any[]> {
    try {
      const response = await apiClient.get<ApiResponse<any[]>>(`${this.basePath}/results/${resultId}/instrument-impacts`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch instrument impacts:', error);
      throw new Error('Failed to fetch instrument impacts');
    }
  }

  // Get latest analysis result for a scenario
  async getLatestAnalysisResult(scenarioId: number): Promise<WhatIfAnalysisResult | null> {
    try {
      const results = await this.getScenarioResults(scenarioId, 1);
      if (results.length === 0) return null;
      
      const latestResult = results[0];
      const instrumentImpacts = await this.getResultInstrumentImpacts(latestResult.id);
      
      // Transform database result to WhatIfAnalysisResult format
      return this.transformToWhatIfResult(scenarioId, latestResult, instrumentImpacts);
    } catch (error) {
      console.error('Failed to fetch latest analysis result:', error);
      return null;
    }
  }

  // Get latest recommendations for a scenario
  async getLatestRecommendations(_scenarioId: number): Promise<ScenarioRecommendations | null> {
    try {
      // This would be implemented when recommendation storage is added
      // For now, return null to indicate no stored recommendations
      return null;
    } catch (error) {
      console.error('Failed to fetch latest recommendations:', error);
      return null;
    }
  }

  // ==================== TEMPLATES ====================

  async getTemplates(isPublic?: boolean): Promise<ScenarioTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (isPublic !== undefined) params.append('is_public', isPublic.toString());
      
      const queryString = params.toString();
      const url = queryString ? 
        `${this.basePath}/templates/list?${queryString}` : 
        `${this.basePath}/templates/list`;
      
      const response = await apiClient.get<ApiResponse<ScenarioTemplate[]>>(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw new Error('Failed to fetch templates');
    }
  }

  async createTemplate(data: Omit<ScenarioTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<{ id: number }> {
    try {
      const response = await apiClient.post<ApiResponse<{ id: number }>>(`${this.basePath}/templates`, data);
      return response.data.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error('Failed to create template');
    }
  }

  async createFromTemplate(templateId: number, data: { name?: string; description?: string; created_by: string }): Promise<ScenarioDetailResponse> {
    try {
      const response = await apiClient.post<ApiResponse<ScenarioDetailResponse>>(
        `${this.basePath}/templates/${templateId}/create`,
        data
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to create from template:', error);
      throw new Error('Failed to create from template');
    }
  }

  // ==================== COMPARISON ====================

  async compareScenarios(scenarioIds: number[], userId: string): Promise<any> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `${this.basePath}/compare`,
        { scenario_ids: scenarioIds, user_id: userId }
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to compare scenarios:', error);
      throw new Error('Failed to compare scenarios');
    }
  }

  async getComparisons(createdBy?: string): Promise<ScenarioComparison[]> {
    try {
      const params = new URLSearchParams();
      if (createdBy) params.append('created_by', createdBy);
      
      const queryString = params.toString();
      const url = queryString ? 
        `${this.basePath}/comparisons?${queryString}` : 
        `${this.basePath}/comparisons`;
      
      const response = await apiClient.get<ApiResponse<ScenarioComparison[]>>(url);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch comparisons:', error);
      throw new Error('Failed to fetch comparisons');
    }
  }

  // ==================== MONTE CARLO ====================

  async getMonteCarloResults(scenarioId: number): Promise<MonteCarloResult[]> {
    try {
      const response = await apiClient.get<ApiResponse<MonteCarloResult[]>>(`${this.basePath}/${scenarioId}/monte-carlo`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch Monte Carlo results:', error);
      throw new Error('Failed to fetch Monte Carlo results');
    }
  }

  // ==================== UTILITIES ====================

  async getStats(): Promise<ScenarioStats> {
    try {
      const response = await apiClient.get<ApiResponse<ScenarioStats>>(`${this.basePath}/system/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw new Error('Failed to fetch stats');
    }
  }

  async cleanup(): Promise<void> {
    try {
      await apiClient.post<ApiResponse<void>>(`${this.basePath}/system/cleanup`);
    } catch (error) {
      console.error('Failed to cleanup:', error);
      throw new Error('Failed to cleanup');
    }
  }

  async getHealth(): Promise<any> {
    try {
      const response = await apiClient.get<any>(`${this.basePath}/health`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch health:', error);
      throw new Error('Failed to fetch health');
    }
  }

  // ==================== HELPER METHODS ====================

  private transformToWhatIfResult(
    scenarioId: number,
    result: any,
    instrumentImpacts: any[]
  ): WhatIfAnalysisResult {
    // Parse metadata if available
    const metadata = result.metadata ? JSON.parse(result.metadata) : {};
    
    return {
      scenarioId,
      scenarioName: result.scenario_name || `Scenario ${scenarioId}`,
      simulationDate: result.simulation_date,
      timeHorizonMonths: result.simulation_duration_months,
      portfolioImpact: {
        currentValue: result.portfolio_value_before,
        projectedValue: result.portfolio_value_after,
        totalReturn: result.portfolio_value_after - result.portfolio_value_before,
        totalReturnPercentage: result.total_return_percentage,
        adjustedForInflation: true, // Assume true for now
        inflationAdjustedReturn: result.total_return_percentage
      },
      instrumentImpacts: instrumentImpacts.map(impact => ({
        instrumentId: impact.instrument_id,
        ticker: impact.ticker,
        name: impact.name,
        currentPrice: impact.current_price,
        projectedPrice: impact.projected_price,
        priceChangePercentage: impact.price_change_percentage,
        positionImpact: impact.position_impact,
        recommendation: impact.recommendation,
        confidence: impact.confidence,
        reasoning: impact.reasoning || 'Standard scenario impact'
      })),
      riskMetrics: metadata.riskMetrics || {
        maxDrawdown: result.max_drawdown,
        volatility: result.volatility,
        sharpeRatio: result.risk_adjusted_return,
        valueAtRisk95: result.portfolio_value_before * 0.05,
        valueAtRisk99: result.portfolio_value_before * 0.01,
        probabilityOfLoss: 30,
        worstCaseScenario: result.total_return_percentage * 1.5,
        stressTestResult: result.max_drawdown
      },
      claudeInsights: {
        executiveSummary: 'Scenario analysis completed successfully.',
        keyRisks: ['Market volatility', 'Currency risk', 'Concentration risk'],
        keyOpportunities: ['Value creation', 'Portfolio optimization', 'Risk hedging'],
        mitigationStrategies: ['Diversification', 'Hedging', 'Risk monitoring'],
        marketContextualAnalysis: 'Market conditions require careful monitoring.',
        timelineAnalysis: 'Impacts expected over medium term.',
        confidenceAssessment: 'Moderate confidence with key uncertainties.',
        alternativeScenarios: ['Base case', 'Optimistic case', 'Pessimistic case']
      },
      monteCarloResults: undefined, // Would be populated if available
      confidence: result.confidence_level,
      keyFindings: [
        `Portfolio return: ${result.total_return_percentage.toFixed(1)}%`,
        `Maximum drawdown: ${result.max_drawdown.toFixed(1)}%`,
        `Risk-adjusted return: ${result.risk_adjusted_return.toFixed(2)}`
      ],
      actionableRecommendations: [
        'Monitor key risk indicators',
        'Review portfolio diversification',
        'Consider hedging strategies'
      ]
    };
  }

  // Error handling helper
  private handleApiError(error: any): never {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('An unexpected error occurred');
    }
  }

  // Data validation helper
  private validateScenarioData(data: any): boolean {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Scenario name is required');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Scenario description is required');
    }
    if (!data.category || !['MACRO', 'MARKET', 'SECTOR', 'CUSTOM'].includes(data.category)) {
      throw new Error('Valid scenario category is required');
    }
    if (!data.created_by || data.created_by.trim().length === 0) {
      throw new Error('Creator information is required');
    }
    return true;
  }

  // Rate limiting helper
  private async rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await requestFn();
      } catch (error: any) {
        if (error.response?.status === 429 && retries < maxRetries - 1) {
          // Rate limited, wait and retry
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        }
        throw error;
      }
    }
    
    throw new Error('Request failed after maximum retries');
  }
}

export const scenarioService = new ScenarioService();
export type { ScenarioService };