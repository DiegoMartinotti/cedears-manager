/**
 * Controlador del Optimizador de Estrategia de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import { Request, Response } from 'express';
import { GoalOptimizerService } from '../services/GoalOptimizerService';
import { GoalAccelerationService } from '../services/GoalAccelerationService';
import { GoalOpportunityIntegrationService } from '../services/GoalOpportunityIntegrationService';
import {
  CreateGapAnalysisDto,
  CreateOptimizationStrategyDto,
  CreateContributionPlanDto,
  CreateMilestoneDto,
  CreateAccelerationStrategyDto
} from '../models/GoalOptimizer';
import { OpportunityMatchCriteria } from '../services/GoalOpportunityIntegrationService';

export class GoalOptimizerController {
  private optimizerService: GoalOptimizerService;
  private accelerationService: GoalAccelerationService;
  private opportunityIntegrationService: GoalOpportunityIntegrationService;

  constructor(
    optimizerService: GoalOptimizerService,
    accelerationService: GoalAccelerationService,
    opportunityIntegrationService: GoalOpportunityIntegrationService
  ) {
    this.optimizerService = optimizerService;
    this.accelerationService = accelerationService;
    this.opportunityIntegrationService = opportunityIntegrationService;
  }

  // 28.1: Análisis de gap entre actual y objetivo
  analyzeGap = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const customData: CreateGapAnalysisDto = req.body;
      const gapAnalysis = await this.optimizerService.performGapAnalysis(goalId, customData);

      res.json({
        success: true,
        data: gapAnalysis,
        message: 'Análisis de gap completado exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.2: Obtener estrategias de optimización
  getOptimizationStrategies = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const strategies = await this.optimizerService.generateOptimizationStrategies(goalId);

      res.json({
        success: true,
        data: strategies,
        message: 'Estrategias de optimización generadas exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.2: Calcular planes de contribución optimizados
  calculateContributionPlans = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const plans = await this.optimizerService.generateContributionPlans(goalId);

      res.json({
        success: true,
        data: plans,
        message: 'Planes de contribución calculados exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.3: Obtener hitos intermedios
  getIntermediateMilestones = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const milestones = await this.optimizerService.generateIntermediateMilestones(goalId);

      res.json({
        success: true,
        data: milestones,
        message: 'Hitos intermedios generados exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.4: Obtener estrategias de aceleración
  getAccelerationStrategies = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const strategies = await this.accelerationService.generateAccelerationStrategies(goalId);

      res.json({
        success: true,
        data: strategies,
        message: 'Estrategias de aceleración generadas exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.4: Activar estrategia de aceleración
  activateAccelerationStrategy = async (req: Request, res: Response) => {
    try {
      const { strategyId } = req.params;
      const id = parseInt(strategyId);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de estrategia inválido'
        });
      }

      const activatedStrategy = await this.accelerationService.activateAccelerationStrategy(id);

      res.json({
        success: true,
        data: activatedStrategy,
        message: 'Estrategia de aceleración activada exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.4: Desactivar estrategia de aceleración
  deactivateAccelerationStrategy = async (req: Request, res: Response) => {
    try {
      const { strategyId } = req.params;
      const { reason } = req.body;
      const id = parseInt(strategyId);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de estrategia inválido'
        });
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Razón de desactivación requerida'
        });
      }

      const deactivatedStrategy = await this.accelerationService.deactivateAccelerationStrategy(id, reason);

      res.json({
        success: true,
        data: deactivatedStrategy,
        message: 'Estrategia de aceleración desactivada exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.5: Obtener oportunidades vinculadas a objetivo
  getMatchedOpportunities = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      // Criterios opcionales del query string
      const criteria: Partial<OpportunityMatchCriteria> = {};
      
      if (req.query.risk_tolerance) {
        criteria.risk_tolerance = req.query.risk_tolerance as 'LOW' | 'MEDIUM' | 'HIGH';
      }
      
      if (req.query.capital_available) {
        criteria.capital_available = parseFloat(req.query.capital_available as string);
      }
      
      if (req.query.esg_compliant) {
        criteria.esg_compliant = req.query.esg_compliant === 'true';
      }
      
      if (req.query.vegan_friendly) {
        criteria.vegan_friendly = req.query.vegan_friendly === 'true';
      }

      const matches = await this.opportunityIntegrationService.matchOpportunitiesForGoal(goalId, criteria);

      res.json({
        success: true,
        data: matches,
        message: 'Oportunidades vinculadas obtenidas exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28.5: Ejecutar acción sobre oportunidad
  executeOpportunityAction = async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params;
      const { action, amount_invested, execution_price, notes } = req.body;
      const id = parseInt(matchId);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de match inválido'
        });
      }

      if (!['BUY', 'SELL', 'HOLD', 'IGNORE'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Acción inválida. Debe ser: BUY, SELL, HOLD, o IGNORE'
        });
      }

      const actionDetails = {
        amount_invested: amount_invested ? parseFloat(amount_invested) : undefined,
        execution_price: execution_price ? parseFloat(execution_price) : undefined,
        notes: notes || undefined
      };

      const updatedMatch = await this.opportunityIntegrationService.executeOpportunityAction(
        id, 
        action, 
        actionDetails
      );

      res.json({
        success: true,
        data: updatedMatch,
        message: `Acción ${action} ejecutada exitosamente`
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // 28: Resumen completo del optimizador
  getOptimizerSummary = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      // Obtener resumen base del optimizador
      const summary = await this.optimizerService.getOptimizerSummary(goalId);
      
      // Agregar estrategias de aceleración
      const accelerationStrategies = await this.accelerationService.getAccelerationStrategiesByGoal(goalId);
      summary.acceleration_strategies = accelerationStrategies;
      
      // Agregar oportunidades vinculadas
      const opportunityMatches = await this.opportunityIntegrationService.getOpportunityMatchesByGoal(goalId);
      summary.opportunity_matches = opportunityMatches;

      res.json({
        success: true,
        data: summary,
        message: 'Resumen del optimizador obtenido exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Crear estrategia de optimización personalizada
  createOptimizationStrategy = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const strategyData: CreateOptimizationStrategyDto = req.body;

      // Validaciones básicas
      if (!strategyData.strategy_name || !strategyData.strategy_type || !strategyData.description) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: strategy_name, strategy_type, description'
        });
      }

      strategyData.goal_id = goalId;

      // Crear la estrategia (se implementaría el método en el servicio)
      const newStrategy = {
        ...strategyData,
        id: Date.now(), // Mock ID
        impact_score: 75,
        effort_level: 'MEDIUM' as const,
        time_to_implement_days: 14,
        estimated_time_savings_months: 2,
        estimated_cost_savings: 0,
        is_applied: false,
        applied_date: null,
        results_tracking: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: newStrategy,
        message: 'Estrategia de optimización creada exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Crear plan de contribución personalizado
  createContributionPlan = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      const planData: CreateContributionPlanDto = req.body;

      // Validaciones básicas
      if (!planData.plan_name || !planData.optimized_monthly_contribution) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos requeridos: plan_name, optimized_monthly_contribution'
        });
      }

      if (planData.optimized_monthly_contribution <= 0) {
        return res.status(400).json({
          success: false,
          error: 'La contribución mensual debe ser mayor a 0'
        });
      }

      planData.goal_id = goalId;

      // Crear el plan (se implementaría el método en el servicio)
      const newPlan = {
        ...planData,
        id: Date.now(), // Mock ID
        base_monthly_contribution: 1000, // Mock value
        contribution_increase: planData.optimized_monthly_contribution - 1000,
        extra_annual_contributions: 0,
        dynamic_adjustments: true,
        seasonal_adjustments: null,
        affordability_score: 80,
        stress_test_scenarios: null,
        projected_completion_date: null,
        time_savings_months: null,
        total_savings_amount: null,
        success_probability: 85,
        monitoring_frequency_days: 30,
        is_active: false,
        activated_date: null,
        performance_tracking: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: newPlan,
        message: 'Plan de contribución creado exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Activar plan de contribución
  activateContributionPlan = async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const id = parseInt(planId);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de plan inválido'
        });
      }

      // Mock activation
      const activatedPlan = {
        id: id,
        is_active: true,
        activated_date: new Date().toISOString(),
        message: 'Plan activado exitosamente'
      };

      res.json({
        success: true,
        data: activatedPlan,
        message: 'Plan de contribución activado exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Actualizar progreso de hito
  updateMilestoneProgress = async (req: Request, res: Response) => {
    try {
      const { milestoneId } = req.params;
      const { current_progress, is_achieved, notes } = req.body;
      const id = parseInt(milestoneId);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID de hito inválido'
        });
      }

      if (current_progress !== undefined && (current_progress < 0 || current_progress > 100)) {
        return res.status(400).json({
          success: false,
          error: 'El progreso debe estar entre 0 y 100'
        });
      }

      // Mock update
      const updatedMilestone = {
        id: id,
        current_progress: current_progress || 0,
        progress_percentage: current_progress || 0,
        is_achieved: is_achieved || false,
        achieved_date: is_achieved ? new Date().toISOString() : null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: updatedMilestone,
        message: 'Progreso de hito actualizado exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };

  // Obtener recomendaciones personalizadas
  getPersonalizedRecommendations = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goalId = parseInt(id);

      if (isNaN(goalId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de objetivo inválido'
        });
      }

      // Mock recommendations
      const recommendations = [
        {
          priority: 'HIGH' as const,
          category: 'CONTRIBUTION' as const,
          title: 'Aumentar Aporte Mensual',
          description: 'Incrementar tu aporte mensual en $500 para acelerar tu objetivo en 8 meses',
          impact_estimate: '8 meses de aceleración',
          effort_required: 'MEDIUM' as const,
          time_frame: '1-2 semanas para implementar',
          success_probability: 85,
          action_items: [
            'Revisar presupuesto mensual',
            'Identificar gastos reducibles',
            'Configurar transferencia automática'
          ]
        },
        {
          priority: 'MEDIUM' as const,
          category: 'OPPORTUNITY' as const,
          title: 'Oportunidad en GGAL',
          description: 'GGAL presenta una oportunidad técnica con 78% de match con tu objetivo',
          impact_estimate: '$2,400 de ganancia potencial',
          effort_required: 'LOW' as const,
          time_frame: '48 horas de vigencia',
          success_probability: 72,
          action_items: [
            'Revisar análisis técnico',
            'Evaluar asignación de capital',
            'Ejecutar operación si procede'
          ]
        }
      ];

      res.json({
        success: true,
        data: recommendations,
        message: 'Recomendaciones personalizadas generadas exitosamente'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}