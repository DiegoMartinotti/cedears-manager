import Database from 'better-sqlite3';
import { FinancialGoal, GoalProgress } from '../models/FinancialGoal';
import { GoalProjectionSummary } from './GoalProjectionService';
import { SensitivityAnalysis, MonteCarloResult } from './SensitivityAnalysisService';
import { PortfolioService } from './PortfolioService';
import { claudeAnalysisService } from './claudeAnalysisService.js';
import { ClaudeServiceError } from './claudeService.js';
import { createLogger } from '../utils/logger.js'

const logger = createLogger('ClaudeGoalAdvisorService')

/**
 * Servicio de recomendaciones personalizadas con Claude para objetivos financieros
 * Step 27.4: Recomendaciones personalizadas de Claude
 */

export interface GoalRecommendation {
  id?: number;
  goal_id: number;
  recommendation_type: 'STRATEGY_ADJUSTMENT' | 'CONTRIBUTION_OPTIMIZATION' | 'RISK_MANAGEMENT' | 'TIMELINE_ADJUSTMENT' | 'DIVERSIFICATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  description: string;
  reasoning: string;
  implementation_steps: string[];
  estimated_impact: {
    time_reduction_months?: number;
    additional_return_percentage?: number;
    risk_reduction_percentage?: number;
    cost_savings?: number;
  };
  confidence_score: number; // 0-100
  created_at: string;
  expires_at: string;
  is_implemented: boolean;
  implementation_notes?: string;
}

export interface GoalAnalysisContext {
  goal: FinancialGoal;
  current_progress: GoalProgress;
  projection_summary: GoalProjectionSummary;
  sensitivity_analysis: SensitivityAnalysis;
  monte_carlo_results: MonteCarloResult;
  portfolio_context: any;
  market_conditions: any;
  user_profile: {
    risk_tolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    investment_experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    age_range: string;
    financial_situation: 'BUILDING' | 'GROWING' | 'PRESERVING';
  };
}

export interface PersonalizedStrategy {
  goal_id: number;
  strategy_name: string;
  description: string;
  recommended_actions: {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  risk_assessment: {
    current_risk_level: string;
    optimal_risk_level: string;
    risk_adjustments_needed: string[];
  };
  optimization_opportunities: {
    contribution_strategy: string;
    asset_allocation: string;
    tax_efficiency: string;
    timing_optimization: string;
  };
  success_metrics: {
    key_indicators: string[];
    milestone_targets: { [key: string]: number };
    review_frequency: string;
  };
}

export class ClaudeGoalAdvisorService {
  private db: Database.Database;
  private portfolioService: PortfolioService;

  constructor(db: Database.Database) {
    this.db = db;
    this.portfolioService = new PortfolioService();
  }

  private async runClaudePrompt(
    prompt: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const requestContext = JSON.stringify(context);

    try {
      const result = await claudeAnalysisService.analyze({
        prompt,
        context: requestContext
      });

      if (!result.analysis) {
        throw new Error('Claude no devolvió un análisis válido');
      }

      return result.analysis;
    } catch (error) {
      if (error instanceof ClaudeServiceError && error.code === 'NOT_INITIALIZED') {
        await claudeAnalysisService.initialize();
        const retry = await claudeAnalysisService.analyze({
          prompt,
          context: requestContext
        });
        if (!retry.analysis) {
          throw new Error('Claude no devolvió un análisis válido');
        }
        return retry.analysis;
      }

      logger.error('Error ejecutando análisis con Claude', { error });
      throw error;
    }
  }

  /**
   * Genera recomendaciones personalizadas usando Claude
   */
  async generatePersonalizedRecommendations(
    context: GoalAnalysisContext
  ): Promise<GoalRecommendation[]> {
    const analysisPrompt = this.buildAnalysisPrompt(context);
    const analysis = await this.runClaudePrompt(analysisPrompt, {
      goal_id: context.goal.id,
      prompt_type: 'goal_optimization'
    });

    const recommendations = await this.parseClaudeRecommendations(
      analysis,
      context.goal.id
    );

    // Guardar recomendaciones en base de datos
    await this.saveRecommendations(recommendations);

    return recommendations;
  }

  /**
   * Genera estrategia personalizada completa
   */
  async generatePersonalizedStrategy(
    context: GoalAnalysisContext
  ): Promise<PersonalizedStrategy> {
    const strategyPrompt = this.buildStrategyPrompt(context);

    const analysis = await this.runClaudePrompt(strategyPrompt, {
      goal_id: context.goal.id,
      prompt_type: 'strategy_development',
      risk_profile: context.user_profile.risk_tolerance
    });

    return this.parsePersonalizedStrategy(analysis, context.goal.id);
  }

  /**
   * Análisis de desviaciones y alertas predictivas
   */
  async analyzeGoalDeviations(
    goalId: number,
    context: GoalAnalysisContext
  ): Promise<{
    deviation_severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
    root_causes: string[];
    corrective_actions: GoalRecommendation[];
    predictive_alerts: {
      probability: number;
      timeline: string;
      impact: string;
      prevention_strategy: string;
    }[];
  }> {
    const deviationPrompt = this.buildDeviationAnalysisPrompt(context);

    const analysisText = await this.runClaudePrompt(deviationPrompt, {
      goal_id: goalId,
      prompt_type: 'deviation_analysis'
    });

    const analysis = JSON.parse(analysisText);
    
    // Generar acciones correctivas como recomendaciones
    const correctiveActions = await this.generateCorrectiveActions(
      goalId,
      analysis.root_causes
    );

    return {
      deviation_severity: analysis.severity,
      root_causes: analysis.root_causes,
      corrective_actions: correctiveActions,
      predictive_alerts: analysis.predictive_alerts
    };
  }

  /**
   * Optimización de contribuciones basada en IA
   */
  async optimizeContributionStrategy(
    context: GoalAnalysisContext
  ): Promise<{
    current_strategy: string;
    optimized_strategy: string;
    contribution_schedule: {
      month: number;
      recommended_amount: number;
      reasoning: string;
    }[];
    expected_improvement: {
      time_saved_months: number;
      additional_growth: number;
      risk_adjustment: number;
    };
  }> {
    const optimizationPrompt = this.buildContributionOptimizationPrompt(context);

    const analysis = await this.runClaudePrompt(optimizationPrompt, {
      goal_id: context.goal.id,
      prompt_type: 'contribution_optimization'
    });

    return JSON.parse(analysis);
  }

  /**
   * Análisis de oportunidades de mercado para objetivos
   */
  async analyzeMarketOpportunities(
    goalId: number,
    context: GoalAnalysisContext
  ): Promise<{
    current_opportunities: {
      instrument: string;
      opportunity_type: string;
      confidence: number;
      impact_on_goal: string;
      action_required: string;
    }[];
    strategic_timing: {
      next_review_date: string;
      optimal_entry_points: string[];
      market_cycle_position: string;
    };
    risk_considerations: {
      concentration_risks: string[];
      market_risks: string[];
      mitigation_strategies: string[];
    };
  }> {
    const marketPrompt = this.buildMarketOpportunityPrompt(context);
    
    const analysis = await this.runClaudePrompt(marketPrompt, {
      goal_id: goalId,
      prompt_type: 'market_opportunity_analysis'
    });

    return JSON.parse(analysis);
  }

  /**
   * Métodos de construcción de prompts
   */
  // eslint-disable-next-line max-lines-per-function
  private buildAnalysisPrompt(context: GoalAnalysisContext): string {
    return `
Como experto financiero especializado en objetivos de inversión, analiza la siguiente situación y genera recomendaciones personalizadas:

**OBJETIVO FINANCIERO:**
- Nombre: ${context.goal.name}
- Tipo: ${context.goal.type}
- Monto objetivo: $${context.goal.target_amount?.toLocaleString()}
- Fecha objetivo: ${context.goal.target_date}
- Contribución mensual actual: $${context.goal.monthly_contribution}
- Retorno esperado: ${context.goal.expected_return_rate}%

**PROGRESO ACTUAL:**
- Capital actual: $${context.current_progress.current_capital}
- Progreso: ${context.current_progress.progress_percentage.toFixed(1)}%
- Desviación del plan: ${context.current_progress.deviation_from_plan.toFixed(1)}%
- Retorno real: ${context.current_progress.actual_return_rate}%

**ANÁLISIS DE SENSIBILIDAD:**
- Parámetro más sensible: ${context.sensitivity_analysis.summary.most_sensitive_parameter}
- Impacto promedio: ${context.sensitivity_analysis.summary.average_impact}%
- Evaluación de riesgo: ${context.sensitivity_analysis.summary.risk_assessment}

**SIMULACIÓN MONTE CARLO:**
- Probabilidad de éxito: ${context.monte_carlo_results.success_probability.toFixed(1)}%
- Valor mediano esperado: $${context.monte_carlo_results.confidence_intervals.p50.toLocaleString()}
- VaR 95%: $${context.monte_carlo_results.volatility_metrics.value_at_risk_95.toLocaleString()}

**PERFIL DEL INVERSOR:**
- Tolerancia al riesgo: ${context.user_profile.risk_tolerance}
- Experiencia: ${context.user_profile.investment_experience}
- Situación financiera: ${context.user_profile.financial_situation}

GENERA recomendaciones específicas y accionables en las siguientes categorías:
1. Ajustes de estrategia
2. Optimización de contribuciones  
3. Gestión de riesgos
4. Ajustes de timeline
5. Diversificación

Para cada recomendación, incluye:
- Prioridad (LOW/MEDIUM/HIGH/URGENT)
- Descripción clara
- Razonamiento técnico
- Pasos de implementación
- Impacto estimado
- Nivel de confianza (0-100)

Responde en formato JSON estructurado.
    `;
  }

  private buildStrategyPrompt(context: GoalAnalysisContext): string {
    return `
Desarrolla una estrategia personalizada completa para el objetivo "${context.goal.name}".

Datos clave del objetivo:
- Tipo: ${context.goal.type}
- Monto objetivo: $${context.goal.target_amount?.toLocaleString() ?? 'N/A'}
- Fecha objetivo: ${context.goal.target_date ?? 'Sin definir'}
- Contribución mensual actual: $${context.goal.monthly_contribution}
- Retorno esperado: ${context.goal.expected_return_rate}%
- Progreso actual: ${context.current_progress.progress_percentage.toFixed(1)}%
- Perfil de riesgo del inversor: ${context.user_profile.risk_tolerance}

Genera una estrategia integral que incluya:
1. **Acciones recomendadas** (inmediatas, corto plazo y largo plazo).
2. **Evaluación de riesgos** con acciones de mitigación.
3. **Oportunidades de optimización** en contribuciones, asignación de activos y eficiencia fiscal.
4. **Métricas de éxito** con indicadores y frecuencia de revisión.

Responde en formato JSON estructurado y detallado.
    `;
  }

  private buildDeviationAnalysisPrompt(context: GoalAnalysisContext): string {
    return `
Analiza las desviaciones del objetivo "${context.goal.name}" y genera alertas predictivas.

Datos de seguimiento:
- Progreso actual: ${context.current_progress.progress_percentage.toFixed(1)}%
- Desviación del plan: ${context.current_progress.deviation_from_plan.toFixed(1)}%
- Capital actual: $${context.current_progress.current_capital.toLocaleString()}
- Horizonte temporal restante: ${context.goal.target_date ?? 'Sin definir'}

Identifica:
1. Severidad de la desviación (MINOR/MODERATE/MAJOR/CRITICAL).
2. Causas raíz basadas en los datos.
3. Acciones correctivas específicas.
4. Alertas predictivas con probabilidades y horizonte temporal.

Responde en formato JSON estructurado.
    `;
  }

  private buildContributionOptimizationPrompt(context: GoalAnalysisContext): string {
    return `
Optimiza la estrategia de contribuciones para el objetivo "${context.goal.name}".

Información relevante:
- Contribución mensual actual: $${context.goal.monthly_contribution}
- Capital actual: $${context.current_progress.current_capital.toLocaleString()}
- Probabilidad de éxito Monte Carlo: ${context.monte_carlo_results.success_probability.toFixed(1)}%
- Perfil de riesgo: ${context.user_profile.risk_tolerance}

Genera:
1. Análisis de la estrategia actual.
2. Estrategia optimizada con ajustes sugeridos.
3. Calendario de contribuciones mensuales recomendado.
4. Mejoras esperadas cuantificadas en tiempo y crecimiento.

Responde en formato JSON detallado.
    `;
  }

  private buildMarketOpportunityPrompt(context: GoalAnalysisContext): string {
    return `
Analiza oportunidades de mercado relevantes para el objetivo "${context.goal.name}".

Contexto:
- Horizonte temporal estimado: ${context.goal.target_date ?? 'Sin definir'}
- Capital disponible aproximado: $${context.current_progress.current_capital.toLocaleString()}
- Sensibilidad identificada: ${context.sensitivity_analysis.summary.most_sensitive_parameter}
- Perfil de riesgo: ${context.user_profile.risk_tolerance}

Identifica:
1. Oportunidades actuales específicas con impacto potencial en el objetivo.
2. Timing estratégico óptimo (ventanas de entrada/salida).
3. Consideraciones de riesgo y mitigaciones sugeridas.
4. Acciones requeridas priorizadas.

Responde en formato JSON estructurado.
    `;
  }

  /**
   * Métodos de parseo de respuestas de Claude
   */
  private async parseClaudeRecommendations(
    claudeResponse: string,
    goalId: number
  ): Promise<GoalRecommendation[]> {
    try {
      const parsed = JSON.parse(claudeResponse);
      const recommendations: GoalRecommendation[] = [];

      for (const rec of parsed.recommendations || []) {
        recommendations.push({
          goal_id: goalId,
          recommendation_type: rec.type || 'STRATEGY_ADJUSTMENT',
          priority: rec.priority || 'MEDIUM',
          title: rec.title,
          description: rec.description,
          reasoning: rec.reasoning,
          implementation_steps: rec.steps || [],
          estimated_impact: rec.impact || {},
          confidence_score: rec.confidence || 75,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_implemented: false
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error parsing Claude recommendations:', error)
      return [];
    }
  }

  private parsePersonalizedStrategy(
    claudeResponse: string,
    goalId: number
  ): PersonalizedStrategy {
    try {
      const parsed = JSON.parse(claudeResponse);
      return {
        goal_id: goalId,
        strategy_name: parsed.strategy_name || 'Estrategia Personalizada',
        description: parsed.description || '',
        recommended_actions: parsed.actions || { immediate: [], short_term: [], long_term: [] },
        risk_assessment: parsed.risk_assessment || {},
        optimization_opportunities: parsed.optimization || {},
        success_metrics: parsed.metrics || {}
      };
    } catch (error) {
      logger.error('Error parsing personalized strategy:', error)
      throw new Error('Failed to parse strategy from Claude response');
    }
  }

  /**
   * Métodos de persistencia
   */
  private async saveRecommendations(recommendations: GoalRecommendation[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO goal_recommendations (
        goal_id, recommendation_type, priority, title, description,
        reasoning, implementation_steps, estimated_impact, confidence_score,
        created_at, expires_at, is_implemented
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const rec of recommendations) {
        stmt.run([
          rec.goal_id,
          rec.recommendation_type,
          rec.priority,
          rec.title,
          rec.description,
          rec.reasoning,
          JSON.stringify(rec.implementation_steps),
          JSON.stringify(rec.estimated_impact),
          rec.confidence_score,
          rec.created_at,
          rec.expires_at,
          rec.is_implemented ? 1 : 0
        ]);
      }
    });

    transaction();
  }

  private async generateCorrectiveActions(
    goalId: number,
    rootCauses: string[]
  ): Promise<GoalRecommendation[]> {
    const actions: GoalRecommendation[] = [];
    
    for (const cause of rootCauses) {
      // Generar acción correctiva específica para cada causa
      actions.push({
        goal_id: goalId,
        recommendation_type: 'STRATEGY_ADJUSTMENT',
        priority: 'HIGH',
        title: `Corregir: ${cause}`,
        description: `Acción correctiva para abordar: ${cause}`,
        reasoning: `Detectado como causa raíz de desviación del objetivo`,
        implementation_steps: [`Analizar impacto de ${cause}`, `Implementar corrección`],
        estimated_impact: {},
        confidence_score: 80,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        is_implemented: false
      });
    }
    
    return actions;
  }
}