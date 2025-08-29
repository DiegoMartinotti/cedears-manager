import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { GoalProjectionService, GoalProjectionSummary } from '../services/GoalProjectionService';
import { SensitivityAnalysisService } from '../services/SensitivityAnalysisService';
import { ClaudeGoalAdvisorService } from '../services/ClaudeGoalAdvisorService';
import { CompoundInterestEngine, ProjectionParameters } from '../services/CompoundInterestEngine';
import { GoalTrackerService } from '../services/GoalTrackerService';
import { PortfolioService } from '../services/PortfolioService';

/**
 * Controlador para endpoints de proyecciones y escenarios de objetivos
 * Step 27: Proyecciones y Escenarios de Objetivos - API Controller
 */

export class GoalProjectionController {
  private db: Database.Database;
  private goalProjectionService: GoalProjectionService;
  private sensitivityService: SensitivityAnalysisService;
  private claudeAdvisorService: ClaudeGoalAdvisorService;
  private compoundEngine: CompoundInterestEngine;
  private goalTrackerService: GoalTrackerService;
  private portfolioService: PortfolioService;

  constructor(db: Database.Database) {
    this.db = db;
    this.goalProjectionService = new GoalProjectionService(db);
    this.sensitivityService = new SensitivityAnalysisService(db);
    this.claudeAdvisorService = new ClaudeGoalAdvisorService(db);
    this.compoundEngine = new CompoundInterestEngine(db);
    this.goalTrackerService = new GoalTrackerService(db);
    this.portfolioService = new PortfolioService(db);
  }

  /**
   * POST /goals/:id/projections/calculate
   * Calcula proyecciones completas para un objetivo
   */
  async calculateProjections(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);
      const { recalculate = false } = req.body;

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      // Si no es recálculo forzado, verificar si hay proyecciones recientes
      if (!recalculate) {
        const existingProjections = await this.goalProjectionService.getGoalProjections(goalId);
        if (existingProjections.length > 0) {
          const latestProjection = existingProjections[0];
          const isRecent = new Date(latestProjection.projection_date).getTime() > 
                          (Date.now() - 24 * 60 * 60 * 1000); // Menos de 24 horas
          
          if (isRecent) {
            res.json({
              success: true,
              data: existingProjections,
              cached: true,
              message: 'Proyecciones desde caché (últimas 24h)'
            });
            return;
          }
        }
      }

      const projectionSummary = await this.goalProjectionService.generateGoalProjections(goalId);
      
      // Guardar proyecciones
      await this.goalProjectionService.saveGoalProjections(projectionSummary.scenarios);

      res.json({
        success: true,
        data: projectionSummary,
        cached: false,
        message: 'Proyecciones calculadas exitosamente'
      });

    } catch (error) {
      console.error('Error calculando proyecciones:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * GET /goals/:id/projections/current
   * Obtiene las proyecciones actuales de un objetivo
   */
  async getCurrentProjections(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const projections = await this.goalProjectionService.getGoalProjections(goalId);

      if (projections.length === 0) {
        res.status(404).json({ 
          error: 'No se encontraron proyecciones',
          message: 'Ejecute el cálculo de proyecciones primero' 
        });
        return;
      }

      res.json({
        success: true,
        data: projections,
        count: projections.length
      });

    } catch (error) {
      console.error('Error obteniendo proyecciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * PUT /goals/:id/projections/adjust
   * Ajusta proyecciones con parámetros personalizados
   */
  async adjustProjections(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);
      const {
        monthlyContribution,
        annualReturnRate,
        inflationRate,
        contributionGrowthRate,
        periods
      } = req.body;

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const goal = await this.goalTrackerService.getGoalById(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Objetivo no encontrado' });
        return;
      }

      // Construir parámetros personalizados
      const customParams: ProjectionParameters = {
        presentValue: 25000, // Valor simulado - debería venir del portafolio
        monthlyContribution: monthlyContribution || goal.monthly_contribution,
        annualReturnRate: annualReturnRate || goal.expected_return_rate,
        inflationRate: inflationRate || 120,
        periods: periods || 60, // 5 años por defecto
        contributionGrowthRate: contributionGrowthRate || 25,
        dividendYield: 3,
        reinvestDividends: true
      };

      const customProjection = await this.compoundEngine.calculateFutureValue(customParams);

      res.json({
        success: true,
        data: {
          custom_parameters: customParams,
          projection_result: customProjection,
          comparison: {
            vs_base_scenario: {
              future_value_difference: 0, // Se calcularía vs escenario base
              time_difference_months: 0
            }
          }
        }
      });

    } catch (error) {
      console.error('Error ajustando proyecciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * POST /goals/:id/sensitivity/analyze
   * Realiza análisis de sensibilidad completo
   */
  async performSensitivityAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const goal = await this.goalTrackerService.getGoalById(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Objetivo no encontrado' });
        return;
      }

      const currentCapital = 25000; // Simulado
      const analysis = await this.sensitivityService.performSensitivityAnalysis(goal, currentCapital);
      
      // Guardar análisis
      await this.sensitivityService.saveSensitivityAnalysis(analysis);

      res.json({
        success: true,
        data: analysis,
        insights: {
          key_findings: this.extractKeyFindings(analysis),
          risk_level: analysis.summary.risk_assessment,
          actionable_recommendations: this.generateActionableInsights(analysis)
        }
      });

    } catch (error) {
      console.error('Error en análisis de sensibilidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * POST /goals/:id/sensitivity/monte-carlo
   * Ejecuta simulación Monte Carlo
   */
  async performMonteCarloSimulation(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);
      const { simulations = 1000 } = req.body;

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      if (simulations < 100 || simulations > 50000) {
        res.status(400).json({ 
          error: 'Número de simulaciones debe estar entre 100 y 50,000' 
        });
        return;
      }

      const goal = await this.goalTrackerService.getGoalById(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Objetivo no encontrado' });
        return;
      }

      const currentCapital = 25000; // Simulado
      const monteCarloResults = await this.sensitivityService.performMonteCarloAnalysis(
        goal, 
        currentCapital, 
        simulations
      );

      res.json({
        success: true,
        data: monteCarloResults,
        interpretation: {
          success_probability_text: this.interpretSuccessProbability(monteCarloResults.success_probability),
          confidence_range: `${monteCarloResults.confidence_intervals.p25.toLocaleString()} - ${monteCarloResults.confidence_intervals.p75.toLocaleString()}`,
          risk_assessment: this.assessMonteCarloRisk(monteCarloResults),
          recommendations: this.generateMonteCarloRecommendations(monteCarloResults)
        }
      });

    } catch (error) {
      console.error('Error en simulación Monte Carlo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * GET /goals/:id/sensitivity/scenarios
   * Obtiene escenarios de sensibilidad predefinidos
   */
  async getScenarios(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const goal = await this.goalTrackerService.getGoalById(goalId);
      if (!goal) {
        res.status(404).json({ error: 'Objetivo no encontrado' });
        return;
      }

      const currentCapital = 25000; // Simulado
      const stressTests = await this.sensitivityService.performStressTest(goal, currentCapital);

      res.json({
        success: true,
        data: {
          stress_tests: stressTests,
          scenario_summary: {
            total_scenarios: stressTests.length,
            severity_breakdown: this.categorizeSeverity(stressTests),
            worst_case: stressTests.reduce((worst, current) => 
              current.result.realFutureValue < worst.result.realFutureValue ? current : worst
            ),
            best_case: stressTests.reduce((best, current) =>
              current.result.realFutureValue > best.result.realFutureValue ? current : best
            )
          }
        }
      });

    } catch (error) {
      console.error('Error obteniendo escenarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * POST /goals/:id/recommendations
   * Genera recomendaciones personalizadas con Claude
   */
  async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);
      const { forceRefresh = false } = req.body;

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      // Construir contexto completo para Claude
      const context = await this.buildAnalysisContext(goalId);
      
      const recommendations = await this.claudeAdvisorService.generatePersonalizedRecommendations(context);
      const strategy = await this.claudeAdvisorService.generatePersonalizedStrategy(context);

      res.json({
        success: true,
        data: {
          recommendations,
          personalized_strategy: strategy,
          context_summary: {
            goal_type: context.goal.type,
            progress_percentage: context.current_progress.progress_percentage,
            risk_level: context.user_profile.risk_tolerance,
            recommendations_count: recommendations.length
          }
        }
      });

    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * GET /goals/:id/recommendations/latest
   * Obtiene las recomendaciones más recientes
   */
  async getLatestRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const stmt = this.db.prepare(`
        SELECT * FROM goal_recommendations 
        WHERE goal_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC 
        LIMIT 10
      `);

      const recommendations = stmt.all(goalId);

      res.json({
        success: true,
        data: recommendations,
        summary: {
          total_active: recommendations.length,
          by_priority: this.groupByPriority(recommendations),
          implementation_rate: this.calculateImplementationRate(recommendations)
        }
      });

    } catch (error) {
      console.error('Error obteniendo recomendaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * POST /goals/:id/recommendations/apply
   * Marca una recomendación como implementada
   */
  async applyRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const goalId = parseInt(req.params.id);
      const { recommendationId, implementationNotes } = req.body;

      if (isNaN(goalId) || !recommendationId) {
        res.status(400).json({ error: 'Parámetros inválidos' });
        return;
      }

      const stmt = this.db.prepare(`
        UPDATE goal_recommendations 
        SET is_implemented = 1, implementation_notes = ?, updated_at = datetime('now')
        WHERE id = ? AND goal_id = ?
      `);

      const result = stmt.run(implementationNotes || '', recommendationId, goalId);

      if (result.changes === 0) {
        res.status(404).json({ error: 'Recomendación no encontrada' });
        return;
      }

      res.json({
        success: true,
        message: 'Recomendación marcada como implementada',
        recommendation_id: recommendationId
      });

    } catch (error) {
      console.error('Error aplicando recomendación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * GET /goals/projections/recalculate-all
   * Recalcula todas las proyecciones activas
   */
  async recalculateAllProjections(req: Request, res: Response): Promise<void> {
    try {
      await this.goalProjectionService.recalculateAllProjections();

      res.json({
        success: true,
        message: 'Recálculo de todas las proyecciones iniciado',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error recalculando proyecciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  /**
   * Métodos auxiliares privados
   */
  private async buildAnalysisContext(goalId: number): Promise<any> {
    const goal = await this.goalTrackerService.getGoalById(goalId);
    if (!goal) throw new Error('Objetivo no encontrado');

    const currentProgress = await this.goalTrackerService.updateGoalProgress(goalId);
    const projectionSummary = await this.goalProjectionService.generateGoalProjections(goalId);
    const sensitivityAnalysis = await this.sensitivityService.performSensitivityAnalysis(goal, 25000);
    const monteCarloResults = await this.sensitivityService.performMonteCarloAnalysis(goal, 25000);

    return {
      goal,
      current_progress: currentProgress,
      projection_summary: projectionSummary,
      sensitivity_analysis: sensitivityAnalysis,
      monte_carlo_results: monteCarloResults,
      portfolio_context: {}, // Se obtendría del portfolio service
      market_conditions: {},
      user_profile: {
        risk_tolerance: 'MODERATE',
        investment_experience: 'INTERMEDIATE',
        age_range: '30-45',
        financial_situation: 'GROWING'
      }
    };
  }

  private extractKeyFindings(analysis: any): string[] {
    const findings = [];
    
    if (analysis.summary.most_sensitive_parameter) {
      findings.push(`El parámetro más sensible es: ${analysis.summary.most_sensitive_parameter}`);
    }
    
    if (analysis.summary.average_impact > 15) {
      findings.push('El objetivo muestra alta sensibilidad a cambios en parámetros');
    }
    
    return findings;
  }

  private generateActionableInsights(analysis: any): string[] {
    const insights = [];
    
    if (analysis.summary.risk_assessment === 'Alto') {
      insights.push('Considere diversificar más su estrategia de inversión');
      insights.push('Aumente la frecuencia de revisión de sus objetivos');
    }
    
    return insights;
  }

  private interpretSuccessProbability(probability: number): string {
    if (probability >= 80) return 'Muy alta probabilidad de éxito';
    if (probability >= 60) return 'Buena probabilidad de éxito';
    if (probability >= 40) return 'Probabilidad moderada de éxito';
    return 'Baja probabilidad de éxito - requiere ajustes';
  }

  private assessMonteCarloRisk(results: any): string {
    const cv = results.volatility_metrics.coefficient_of_variation;
    
    if (cv > 0.5) return 'Alto riesgo';
    if (cv > 0.3) return 'Riesgo moderado';
    return 'Bajo riesgo';
  }

  private generateMonteCarloRecommendations(results: any): string[] {
    const recs = [];
    
    if (results.success_probability < 60) {
      recs.push('Considere aumentar sus contribuciones mensuales');
      recs.push('Revise su estrategia de asignación de activos');
    }
    
    return recs;
  }

  private categorizeSeverity(stressTests: any[]): any {
    return {
      severe: stressTests.filter(t => t.scenario.severity === 'SEVERE').length,
      moderate: stressTests.filter(t => t.scenario.severity === 'MODERATE').length,
      mild: stressTests.filter(t => t.scenario.severity === 'MILD').length
    };
  }

  private groupByPriority(recommendations: any[]): any {
    return {
      urgent: recommendations.filter(r => r.priority === 'URGENT').length,
      high: recommendations.filter(r => r.priority === 'HIGH').length,
      medium: recommendations.filter(r => r.priority === 'MEDIUM').length,
      low: recommendations.filter(r => r.priority === 'LOW').length
    };
  }

  private calculateImplementationRate(recommendations: any[]): number {
    if (recommendations.length === 0) return 0;
    const implemented = recommendations.filter(r => r.is_implemented).length;
    return Math.round((implemented / recommendations.length) * 100);
  }
}