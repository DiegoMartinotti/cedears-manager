import Database from 'better-sqlite3';
import { CompoundInterestEngine, ProjectionParameters, ProjectionResult } from './CompoundInterestEngine';
import { FinancialGoal } from '../models/FinancialGoal';

/**
 * Servicio de análisis de sensibilidad para proyecciones de objetivos
 * Step 27.3: Análisis de sensibilidad (cambios en tasas)
 */

export interface SensitivityParameter {
  name: string;
  baseValue: number;
  variations: number[];
  unit: string;
  description: string;
}

export interface SensitivityResult {
  parameter: string;
  variation: number;
  originalValue: number;
  newValue: number;
  futureValue: number;
  realFutureValue: number;
  timeToGoalMonths: number;
  impactPercentage: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SensitivityAnalysis {
  goal_id: number;
  analysis_date: string;
  base_scenario: ProjectionResult;
  parameters_analyzed: string[];
  results: SensitivityResult[];
  summary: {
    most_sensitive_parameter: string;
    least_sensitive_parameter: string;
    average_impact: number;
    risk_assessment: string;
  };
}

export interface StressTestScenario {
  name: string;
  description: string;
  parameters: Partial<ProjectionParameters>;
  probability: number;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
}

export interface MonteCarloResult {
  goal_id: number;
  simulations: number;
  confidence_intervals: {
    p10: number;    // 10% probabilidad (pesimista)
    p25: number;    // 25% probabilidad
    p50: number;    // 50% probabilidad (mediana)
    p75: number;    // 75% probabilidad
    p90: number;    // 90% probabilidad (optimista)
  };
  success_probability: number; // Probabilidad de alcanzar el objetivo
  expected_shortfall: number;  // Déficit esperado en caso de no alcanzar
  volatility_metrics: {
    standard_deviation: number;
    coefficient_of_variation: number;
    value_at_risk_95: number;
    expected_shortfall_95: number;
  };
}

export class SensitivityAnalysisService {
  private db: Database.Database;
  private compoundEngine: CompoundInterestEngine;

  constructor(db: Database.Database) {
    this.db = db;
    this.compoundEngine = new CompoundInterestEngine(db);
  }

  /**
   * Análisis completo de sensibilidad para un objetivo
   */
  async performSensitivityAnalysis(
    goal: FinancialGoal,
    currentCapital: number
  ): Promise<SensitivityAnalysis> {
    const baseParams = this.buildBaseParameters(goal, currentCapital);
    const baseResult = await this.compoundEngine.calculateFutureValue(baseParams);
    
    const parametersToAnalyze = this.getParametersToAnalyze();
    const allResults: SensitivityResult[] = [];
    
    for (const parameter of parametersToAnalyze) {
      const results = await this.analyzeParameterSensitivity(
        baseParams, 
        baseResult, 
        parameter
      );
      allResults.push(...results);
    }
    
    const summary = this.generateSensitivitySummary(allResults);
    
    return {
      goal_id: goal.id,
      // Split puede retornar undefined si no se encuentra 'T'; usamos ! para asegurar string
      analysis_date: new Date().toISOString().split('T')[0]!,
      base_scenario: baseResult,
      parameters_analyzed: parametersToAnalyze.map(p => p.name),
      results: allResults,
      summary
    };
  }

  /**
   * Análisis de sensibilidad para un parámetro específico
   */
  private async analyzeParameterSensitivity(
    baseParams: ProjectionParameters,
    baseResult: ProjectionResult,
    parameter: SensitivityParameter
  ): Promise<SensitivityResult[]> {
    const results: SensitivityResult[] = [];
    
    for (const variation of parameter.variations) {
      const modifiedParams = this.applyParameterVariation(baseParams, parameter.name, variation);
      const result = await this.compoundEngine.calculateFutureValue(modifiedParams);
      
      const impactPercentage = ((result.futureValue - baseResult.futureValue) / baseResult.futureValue) * 100;
      const riskLevel = this.assessRiskLevel(Math.abs(impactPercentage));
      
      results.push({
        parameter: parameter.name,
        variation,
        originalValue: parameter.baseValue,
        newValue: parameter.baseValue + variation,
        futureValue: result.futureValue,
        realFutureValue: result.realFutureValue,
        timeToGoalMonths: this.estimateTimeToGoal(result, baseParams),
        impactPercentage,
        riskLevel
      });
    }
    
    return results;
  }

  /**
   * Pruebas de estrés con escenarios adversos
   */
  async performStressTest(
    goal: FinancialGoal,
    currentCapital: number
  ): Promise<{ scenario: StressTestScenario; result: ProjectionResult }[]> {
    const baseParams = this.buildBaseParameters(goal, currentCapital);
    const stressScenarios = this.getStressTestScenarios();
    const results: { scenario: StressTestScenario; result: ProjectionResult }[] = [];
    
    for (const scenario of stressScenarios) {
      const stressParams = { ...baseParams, ...scenario.parameters };
      const result = await this.compoundEngine.calculateFutureValue(stressParams);
      
      results.push({ scenario, result });
    }
    
    return results;
  }

  /**
   * Análisis Monte Carlo avanzado
   */
    // eslint-disable-next-line max-lines-per-function
    async performMonteCarloAnalysis(
      goal: FinancialGoal,
      currentCapital: number,
      simulations: number = 10000
    ): Promise<MonteCarloResult> {
    const baseParams = this.buildBaseParameters(goal, currentCapital);
    const results: number[] = [];
    const targetAmount = goal.target_amount || 100000;
    let successCount = 0;
    const shortfalls: number[] = [];
    
    for (let i = 0; i < simulations; i++) {
      const randomParams = this.generateRandomParameters(baseParams);
      const projection = await this.compoundEngine.calculateFutureValue(randomParams);
      
      results.push(projection.realFutureValue);
      
      if (projection.realFutureValue >= targetAmount) {
        successCount++;
      } else {
        shortfalls.push(targetAmount - projection.realFutureValue);
      }
    }
    
    results.sort((a, b) => a - b);
    
    const confidenceIntervals = {
      p10: this.calculatePercentile(results, 10),
      p25: this.calculatePercentile(results, 25),
      p50: this.calculatePercentile(results, 50),
      p75: this.calculatePercentile(results, 75),
      p90: this.calculatePercentile(results, 90)
    };
    
    const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
    const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / results.length;
    const standardDeviation = Math.sqrt(variance);
    
    const var95 = this.calculatePercentile(results, 5); // VaR al 95%
    const es95 = results.slice(0, Math.floor(results.length * 0.05))
                       .reduce((sum, val) => sum + val, 0) / Math.floor(results.length * 0.05);
    
    return {
      goal_id: goal.id,
      simulations,
      confidence_intervals: confidenceIntervals,
      success_probability: (successCount / simulations) * 100,
      expected_shortfall: shortfalls.length > 0 ? 
        shortfalls.reduce((sum, val) => sum + val, 0) / shortfalls.length : 0,
      volatility_metrics: {
        standard_deviation: standardDeviation,
        coefficient_of_variation: standardDeviation / mean,
        value_at_risk_95: var95,
        expected_shortfall_95: es95
      }
    };
  }

  /**
   * Análisis de correlación entre parámetros
   */
    async analyzeParameterCorrelations(): Promise<{ [key: string]: { [key: string]: number } }> {
      const parameters = ['annualReturnRate', 'inflationRate', 'monthlyContribution'];
    const correlationMatrix: { [key: string]: { [key: string]: number } } = {};
    
    for (const param1 of parameters) {
      correlationMatrix[param1] = {};
      for (const param2 of parameters) {
        if (param1 === param2) {
          correlationMatrix[param1][param2] = 1.0;
        } else {
          // Simular correlación basada en lógica económica
          correlationMatrix[param1][param2] = this.estimateCorrelation(param1, param2);
        }
      }
    }
    
    return correlationMatrix;
  }

  /**
   * Guarda análisis de sensibilidad en base de datos
   */
  async saveSensitivityAnalysis(analysis: SensitivityAnalysis): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sensitivity_analysis (
        goal_id, analysis_date, base_scenario, parameters_analyzed,
        results, summary
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      analysis.goal_id,
      analysis.analysis_date,
      JSON.stringify(analysis.base_scenario),
      JSON.stringify(analysis.parameters_analyzed),
      JSON.stringify(analysis.results),
      JSON.stringify(analysis.summary)
    ]);
  }

  /**
   * Métodos auxiliares privados
   */
  private buildBaseParameters(goal: FinancialGoal, currentCapital: number): ProjectionParameters {
    const targetDate = new Date(goal.target_date || Date.now() + 365 * 24 * 60 * 60 * 1000);
    const monthsToTarget = Math.max(1, Math.floor((targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)));

    return {
      presentValue: currentCapital,
      monthlyContribution: goal.monthly_contribution,
      annualReturnRate: goal.expected_return_rate,
      inflationRate: 120, // 120% anual para Argentina
      periods: monthsToTarget,
      contributionGrowthRate: 25, // 25% anual
      dividendYield: 3,
      reinvestDividends: true
    };
  }

  private getParametersToAnalyze(): SensitivityParameter[] {
    return [
      {
        name: 'annualReturnRate',
        baseValue: 10,
        variations: [-5, -3, -2, -1, 1, 2, 3, 5],
        unit: '%',
        description: 'Tasa de retorno anual'
      },
      {
        name: 'inflationRate',
        baseValue: 120,
        variations: [-40, -20, -10, 10, 20, 40, 60],
        unit: '%',
        description: 'Tasa de inflación anual'
      },
      {
        name: 'monthlyContribution',
        baseValue: 1000,
        variations: [-50, -30, -20, -10, 10, 20, 30, 50],
        unit: '%',
        description: 'Aporte mensual (variación porcentual)'
      },
      {
        name: 'contributionGrowthRate',
        baseValue: 25,
        variations: [-15, -10, -5, 5, 10, 15, 20],
        unit: '%',
        description: 'Crecimiento anual de aportes'
      }
    ];
  }

  private applyParameterVariation(
    baseParams: ProjectionParameters,
    parameterName: string,
    variation: number
  ): ProjectionParameters {
    const params = { ...baseParams };
    
    switch (parameterName) {
      case 'annualReturnRate':
        params.annualReturnRate = baseParams.annualReturnRate + variation;
        break;
      case 'inflationRate':
        params.inflationRate = (baseParams.inflationRate || 0) + variation;
        break;
      case 'monthlyContribution':
        params.monthlyContribution = baseParams.monthlyContribution * (1 + variation / 100);
        break;
      case 'contributionGrowthRate':
        params.contributionGrowthRate = (baseParams.contributionGrowthRate || 0) + variation;
        break;
    }
    
    return params;
  }

  private getStressTestScenarios(): StressTestScenario[] {
    return [
      {
        name: 'Crisis Financiera',
        description: 'Caída del mercado del 40% con recuperación gradual',
        parameters: {
          annualReturnRate: -15,
          inflationRate: 180
        },
        probability: 5,
        severity: 'SEVERE'
      },
      {
        name: 'Recesión Moderada',
        description: 'Retornos negativos por 2 años',
        parameters: {
          annualReturnRate: -5,
          inflationRate: 150
        },
        probability: 15,
        severity: 'MODERATE'
      },
      {
        name: 'Alta Inflación',
        description: 'Inflación descontrolada sin hiperinflación',
        parameters: {
          annualReturnRate: 5,
          inflationRate: 250
        },
        probability: 20,
        severity: 'MODERATE'
      },
      {
        name: 'Stagnation',
        description: 'Crecimiento económico nulo por período prolongado',
        parameters: {
          annualReturnRate: 2,
          inflationRate: 120
        },
        probability: 25,
        severity: 'MILD'
      }
    ];
  }

  private generateRandomParameters(baseParams: ProjectionParameters): ProjectionParameters {
    return {
      ...baseParams,
      annualReturnRate: this.generateNormalRandom(baseParams.annualReturnRate, 8),
      inflationRate: Math.max(0, this.generateNormalRandom(baseParams.inflationRate || 120, 30)),
      monthlyContribution: Math.max(0, this.generateNormalRandom(baseParams.monthlyContribution, baseParams.monthlyContribution * 0.1)),
      contributionGrowthRate: this.generateNormalRandom(baseParams.contributionGrowthRate || 25, 10)
    };
  }

  private generateNormalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    // El índice calculado siempre estará dentro del array tras Math.max, pero
    // con noUncheckedIndexedAccess es necesario afirmar que el valor existe
    return values[Math.max(0, index)]!;
  }

  private assessRiskLevel(impactPercentage: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (impactPercentage < 10) return 'LOW';
    if (impactPercentage < 25) return 'MEDIUM';
    return 'HIGH';
  }

  private estimateTimeToGoal(result: ProjectionResult, params: ProjectionParameters): number {
    // Estimación simplificada basada en el resultado
    return params.periods;
  }

  private generateSensitivitySummary(results: SensitivityResult[]): SensitivityAnalysis['summary'] {
    const parameterImpacts = new Map<string, number[]>();
    
    results.forEach(result => {
      if (!parameterImpacts.has(result.parameter)) {
        parameterImpacts.set(result.parameter, []);
      }
      parameterImpacts.get(result.parameter)!.push(Math.abs(result.impactPercentage));
    });
    
    let mostSensitive = '';
    let leastSensitive = '';
    let maxAvgImpact = 0;
    let minAvgImpact = Infinity;
    let totalImpact = 0;
    let totalResults = 0;
    
    parameterImpacts.forEach((impacts, parameter) => {
      const avgImpact = impacts.reduce((sum, val) => sum + val, 0) / impacts.length;
      totalImpact += avgImpact;
      totalResults++;
      
      if (avgImpact > maxAvgImpact) {
        maxAvgImpact = avgImpact;
        mostSensitive = parameter;
      }
      
      if (avgImpact < minAvgImpact) {
        minAvgImpact = avgImpact;
        leastSensitive = parameter;
      }
    });
    
    const averageImpact = totalImpact / totalResults;
    let riskAssessment = 'Bajo';
    
    if (averageImpact > 20) riskAssessment = 'Alto';
    else if (averageImpact > 10) riskAssessment = 'Moderado';
    
    return {
      most_sensitive_parameter: mostSensitive,
      least_sensitive_parameter: leastSensitive,
      average_impact: Math.round(averageImpact * 100) / 100,
      risk_assessment: riskAssessment
    };
  }

  private estimateCorrelation(param1: string, param2: string): number {
    // Correlaciones estimadas basadas en lógica económica
    const correlations: { [key: string]: number } = {
      'annualReturnRate-inflationRate': -0.3,  // Retornos suelen ser menores con alta inflación
      'annualReturnRate-monthlyContribution': 0.1, // Ligeramente positivo
      'inflationRate-monthlyContribution': 0.6,    // Los aportes crecen con inflación
    };
    
    const key1 = `${param1}-${param2}`;
    const key2 = `${param2}-${param1}`;
    
    return correlations[key1] || correlations[key2] || 0.0;
  }
}