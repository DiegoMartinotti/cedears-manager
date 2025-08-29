/**
 * Rutas del Optimizador de Estrategia de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import { Router } from 'express';
import { GoalOptimizerController } from '../controllers/GoalOptimizerController';
import { GoalOptimizerService } from '../services/GoalOptimizerService';
import { GoalAccelerationService } from '../services/GoalAccelerationService';
import { GoalOpportunityIntegrationService } from '../services/GoalOpportunityIntegrationService';
import DatabaseConnection from '../database/connection';

const router = Router();

// Inicializar servicios y controlador
const db = DatabaseConnection.getInstance();
const optimizerService = new GoalOptimizerService(db);
const accelerationService = new GoalAccelerationService(db);
const opportunityIntegrationService = new GoalOpportunityIntegrationService(db);
const optimizerController = new GoalOptimizerController(
  optimizerService,
  accelerationService,
  opportunityIntegrationService
);

// ========== RUTAS PRINCIPALES DEL OPTIMIZADOR ==========

// 28: Resumen completo del optimizador para un objetivo
router.get('/:id/summary', optimizerController.getOptimizerSummary);

// 28: Recomendaciones personalizadas para un objetivo
router.get('/:id/recommendations', optimizerController.getPersonalizedRecommendations);

// ========== ANÁLISIS DE GAP (28.1) ==========

// POST /api/goal-optimizer/:id/analyze-gap
// Realizar análisis de gap entre situación actual y objetivo
router.post('/:id/analyze-gap', optimizerController.analyzeGap);

// ========== ESTRATEGIAS DE OPTIMIZACIÓN (28.2) ==========

// GET /api/goal-optimizer/:id/optimization-strategies
// Obtener estrategias de optimización para el objetivo
router.get('/:id/optimization-strategies', optimizerController.getOptimizationStrategies);

// POST /api/goal-optimizer/:id/optimization-strategies
// Crear estrategia de optimización personalizada
router.post('/:id/optimization-strategies', optimizerController.createOptimizationStrategy);

// POST /api/goal-optimizer/:id/calculate-contributions
// Calcular planes de contribución optimizados
router.post('/:id/calculate-contributions', optimizerController.calculateContributionPlans);

// POST /api/goal-optimizer/:id/contribution-plans
// Crear plan de contribución personalizado
router.post('/:id/contribution-plans', optimizerController.createContributionPlan);

// PUT /api/goal-optimizer/contribution-plans/:planId/activate
// Activar un plan de contribución específico
router.put('/contribution-plans/:planId/activate', optimizerController.activateContributionPlan);

// ========== HITOS INTERMEDIOS (28.3) ==========

// GET /api/goal-optimizer/:id/intermediate-milestones
// Obtener hitos intermedios para el objetivo
router.get('/:id/intermediate-milestones', optimizerController.getIntermediateMilestones);

// PUT /api/goal-optimizer/milestones/:milestoneId/progress
// Actualizar progreso de un hito específico
router.put('/milestones/:milestoneId/progress', optimizerController.updateMilestoneProgress);

// ========== ESTRATEGIAS DE ACELERACIÓN (28.4) ==========

// GET /api/goal-optimizer/:id/acceleration-strategies
// Obtener estrategias de aceleración para el objetivo
router.get('/:id/acceleration-strategies', optimizerController.getAccelerationStrategies);

// PUT /api/goal-optimizer/acceleration-strategies/:strategyId/activate
// Activar una estrategia de aceleración
router.put('/acceleration-strategies/:strategyId/activate', optimizerController.activateAccelerationStrategy);

// PUT /api/goal-optimizer/acceleration-strategies/:strategyId/deactivate
// Desactivar una estrategia de aceleración
router.put('/acceleration-strategies/:strategyId/deactivate', optimizerController.deactivateAccelerationStrategy);

// ========== INTEGRACIÓN CON OPORTUNIDADES (28.5) ==========

// GET /api/goal-optimizer/:id/matched-opportunities
// Obtener oportunidades de mercado vinculadas al objetivo
// Query params opcionales: risk_tolerance, capital_available, esg_compliant, vegan_friendly
router.get('/:id/matched-opportunities', optimizerController.getMatchedOpportunities);

// POST /api/goal-optimizer/opportunity-matches/:matchId/execute
// Ejecutar acción sobre una oportunidad vinculada
// Body: { action: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE', amount_invested?, execution_price?, notes? }
router.post('/opportunity-matches/:matchId/execute', optimizerController.executeOpportunityAction);

export { router as goalOptimizerRoutes };