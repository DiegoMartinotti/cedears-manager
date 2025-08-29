import { Router } from 'express';
import Database from 'better-sqlite3';
import { GoalProjectionController } from '../controllers/GoalProjectionController';
import { GoalExportService } from '../services/GoalExportService';
import { GoalProjectionService } from '../services/GoalProjectionService';

/**
 * Rutas para proyecciones y escenarios de objetivos
 * Step 27: Proyecciones y Escenarios de Objetivos - API Routes
 */

export function createGoalProjectionRoutes(db: Database.Database): Router {
  const router = Router();
  const controller = new GoalProjectionController(db);
  const exportService = new GoalExportService(db);
  const projectionService = new GoalProjectionService(db);

  // ===========================================
  // PROYECCIONES PRINCIPALES
  // ===========================================
  
  /**
   * POST /goals/:id/projections/calculate
   * Calcula proyecciones completas para un objetivo
   * 
   * Body: {
   *   recalculate?: boolean // Forzar recálculo aunque existan proyecciones recientes
   * }
   */
  router.post('/goals/:id/projections/calculate', async (req, res) => {
    await controller.calculateProjections(req, res);
  });

  /**
   * GET /goals/:id/projections/current
   * Obtiene las proyecciones actuales de un objetivo
   */
  router.get('/goals/:id/projections/current', async (req, res) => {
    await controller.getCurrentProjections(req, res);
  });

  /**
   * PUT /goals/:id/projections/adjust
   * Ajusta proyecciones con parámetros personalizados
   * 
   * Body: {
   *   monthlyContribution?: number,
   *   annualReturnRate?: number,
   *   inflationRate?: number,
   *   contributionGrowthRate?: number,
   *   periods?: number
   * }
   */
  router.put('/goals/:id/projections/adjust', async (req, res) => {
    await controller.adjustProjections(req, res);
  });

  // ===========================================
  // ANÁLISIS DE SENSIBILIDAD
  // ===========================================

  /**
   * POST /goals/:id/sensitivity/analyze
   * Realiza análisis de sensibilidad completo
   */
  router.post('/goals/:id/sensitivity/analyze', async (req, res) => {
    await controller.performSensitivityAnalysis(req, res);
  });

  /**
   * POST /goals/:id/sensitivity/monte-carlo
   * Ejecuta simulación Monte Carlo
   * 
   * Body: {
   *   simulations?: number // Número de simulaciones (100-50000, default: 1000)
   * }
   */
  router.post('/goals/:id/sensitivity/monte-carlo', async (req, res) => {
    await controller.performMonteCarloSimulation(req, res);
  });

  /**
   * GET /goals/:id/sensitivity/scenarios
   * Obtiene escenarios de sensibilidad y stress tests
   */
  router.get('/goals/:id/sensitivity/scenarios', async (req, res) => {
    await controller.getScenarios(req, res);
  });

  // ===========================================
  // RECOMENDACIONES PERSONALIZADAS (CLAUDE)
  // ===========================================

  /**
   * POST /goals/:id/recommendations
   * Genera recomendaciones personalizadas con Claude
   * 
   * Body: {
   *   forceRefresh?: boolean // Forzar regeneración de recomendaciones
   * }
   */
  router.post('/goals/:id/recommendations', async (req, res) => {
    await controller.generateRecommendations(req, res);
  });

  /**
   * GET /goals/:id/recommendations/latest
   * Obtiene las recomendaciones más recientes y activas
   */
  router.get('/goals/:id/recommendations/latest', async (req, res) => {
    await controller.getLatestRecommendations(req, res);
  });

  /**
   * POST /goals/:id/recommendations/apply
   * Marca una recomendación como implementada
   * 
   * Body: {
   *   recommendationId: number,
   *   implementationNotes?: string
   * }
   */
  router.post('/goals/:id/recommendations/apply', async (req, res) => {
    await controller.applyRecommendation(req, res);
  });

  // ===========================================
  // UTILIDADES ADMINISTRATIVAS
  // ===========================================

  /**
   * POST /goals/projections/recalculate-all
   * Recalcula todas las proyecciones activas (admin)
   */
  router.post('/goals/projections/recalculate-all', async (req, res) => {
    await controller.recalculateAllProjections(req, res);
  });

  // ===========================================
  // EXPORTACIÓN DE PLANES DE INVERSIÓN
  // ===========================================

  /**
   * GET /goals/:id/export/pdf
   * Genera y descarga plan de inversión en PDF
   */
  router.get('/goals/:id/export/pdf', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const options = {
        format: 'PDF' as const,
        include_charts: req.query.charts === 'true',
        include_sensitivity: req.query.sensitivity === 'true',
        include_recommendations: req.query.recommendations === 'true',
        include_detailed_schedule: req.query.detailed === 'true',
        language: (req.query.lang as 'ES' | 'EN') || 'ES',
        template_style: (req.query.style as any) || 'PROFESSIONAL'
      };

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      // Obtener datos de proyección
      const projectionSummary = await projectionService.generateGoalProjections(goalId);
      const plan = await exportService.generateInvestmentPlan(goalId, projectionSummary);
      const exportResult = await exportService.exportToPDF(plan, options);

      res.json({
        success: true,
        data: {
          download_url: `/downloads/${exportResult.fileName}`,
          file_name: exportResult.fileName,
          generated_at: new Date().toISOString(),
          plan_summary: {
            goal_name: plan.goal_details.name,
            success_probability: plan.executive_summary.success_probability,
            total_pages: 'Variable'
          }
        }
      });

    } catch (error) {
      console.error('Error exportando PDF:', error);
      res.status(500).json({ error: 'Error generando PDF' });
    }
  });

  /**
   * GET /goals/:id/export/excel
   * Genera y descarga plan de inversión en Excel
   */
  router.get('/goals/:id/export/excel', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const options = {
        format: 'EXCEL' as const,
        include_charts: req.query.charts === 'true',
        include_sensitivity: req.query.sensitivity === 'true',
        include_recommendations: req.query.recommendations === 'true',
        include_detailed_schedule: req.query.detailed === 'true',
        language: (req.query.lang as 'ES' | 'EN') || 'ES',
        template_style: (req.query.style as any) || 'PROFESSIONAL'
      };

      const projectionSummary = await projectionService.generateGoalProjections(goalId);
      const plan = await exportService.generateInvestmentPlan(goalId, projectionSummary);
      const exportResult = await exportService.exportToExcel(plan, options);

      res.json({
        success: true,
        data: {
          download_url: `/downloads/${exportResult.fileName}`,
          file_name: exportResult.fileName,
          generated_at: new Date().toISOString(),
          plan_summary: {
            goal_name: plan.goal_details.name,
            sheets_included: ['Resumen', 'Calendario', 'Proyecciones', 'Análisis']
          }
        }
      });

    } catch (error) {
      console.error('Error exportando Excel:', error);
      res.status(500).json({ error: 'Error generando Excel' });
    }
  });

  /**
   * GET /goals/:id/export/json
   * Genera y descarga plan de inversión en JSON
   */
  router.get('/goals/:id/export/json', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const options = {
        format: 'JSON' as const,
        include_charts: false, // JSON no incluye gráficos
        include_sensitivity: req.query.sensitivity !== 'false',
        include_recommendations: req.query.recommendations !== 'false',
        include_detailed_schedule: req.query.detailed !== 'false',
        language: (req.query.lang as 'ES' | 'EN') || 'ES',
        template_style: 'DETAILED' as const
      };

      const projectionSummary = await projectionService.generateGoalProjections(goalId);
      const plan = await exportService.generateInvestmentPlan(goalId, projectionSummary);
      const exportResult = await exportService.exportToJSON(plan, options);

      res.json({
        success: true,
        data: {
          download_url: `/downloads/${exportResult.fileName}`,
          file_name: exportResult.fileName,
          generated_at: new Date().toISOString(),
          plan_summary: {
            goal_name: plan.goal_details.name,
            data_completeness: '100%',
            format_version: '1.0'
          }
        }
      });

    } catch (error) {
      console.error('Error exportando JSON:', error);
      res.status(500).json({ error: 'Error generando JSON' });
    }
  });

  /**
   * POST /goals/:id/export/investment-plan
   * Genera plan de inversión personalizado
   */
  router.post('/goals/:id/export/investment-plan', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const { 
        plan_type = 'STANDARD',
        export_format = 'PDF',
        custom_name,
        include_sections = {},
        template_options = {}
      } = req.body;

      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      const options = {
        format: export_format,
        include_charts: include_sections.charts !== false,
        include_sensitivity: include_sections.sensitivity !== false,
        include_recommendations: include_sections.recommendations !== false,
        include_detailed_schedule: include_sections.detailed_schedule !== false,
        language: template_options.language || 'ES',
        template_style: template_options.style || 'PROFESSIONAL'
      };

      const projectionSummary = await projectionService.generateGoalProjections(goalId);
      let plan = await exportService.generateInvestmentPlan(goalId, projectionSummary, plan_type);
      
      // Personalizar nombre si se proporciona
      if (custom_name) {
        plan.plan_name = custom_name;
      }

      let exportResult;
      switch (export_format.toLowerCase()) {
        case 'pdf':
          exportResult = await exportService.exportToPDF(plan, options);
          break;
        case 'excel':
          exportResult = await exportService.exportToExcel(plan, options);
          break;
        case 'json':
          exportResult = await exportService.exportToJSON(plan, options);
          break;
        default:
          res.status(400).json({ error: 'Formato de exportación no válido' });
          return;
      }

      res.json({
        success: true,
        data: {
          plan_id: plan.id,
          download_url: `/downloads/${exportResult.fileName}`,
          file_name: exportResult.fileName,
          plan_type: plan.plan_type,
          export_format: export_format.toUpperCase(),
          generated_at: new Date().toISOString(),
          customizations_applied: {
            custom_name: !!custom_name,
            template_style: options.template_style,
            sections_included: Object.keys(include_sections).length
          }
        },
        message: 'Plan de inversión generado exitosamente'
      });

    } catch (error) {
      console.error('Error generando plan personalizado:', error);
      res.status(500).json({ error: 'Error generando plan de inversión' });
    }
  });

  // ===========================================
  // ENDPOINTS ADICIONALES DE CONSULTA
  // ===========================================

  /**
   * GET /goals/:id/projections/summary
   * Resumen ejecutivo de proyecciones
   */
  router.get('/goals/:id/projections/summary', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      // Obtener datos principales
      const projections = await controller.getCurrentProjections(req, res);
      
      // Este endpoint devolvería un resumen consolidado
      // Por simplicidad, redirigir a proyecciones actuales por ahora
      
    } catch (error) {
      console.error('Error en resumen de proyecciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  /**
   * GET /goals/:id/projections/performance
   * Análisis de performance vs proyecciones anteriores
   */
  router.get('/goals/:id/projections/performance', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      
      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      // Consulta de performance histórica
      const stmt = db.prepare(`
        SELECT 
          projection_date,
          scenario_name,
          projection_type,
          json_extract(result, '$.futureValue') as projected_value,
          json_extract(result, '$.effectiveAnnualReturn') as projected_return,
          confidence_level
        FROM goal_projections 
        WHERE goal_id = ? 
        ORDER BY projection_date DESC 
        LIMIT 12
      `);

      const historicalProjections = stmt.all(goalId);

      res.json({
        success: true,
        data: {
          historical_projections: historicalProjections,
          performance_trends: {
            projection_accuracy: 'En desarrollo', // Calcularía precisión de proyecciones pasadas
            trend_direction: 'STABLE', // IMPROVING, STABLE, DECLINING
            confidence_evolution: 'Creciente' // Evolución de la confianza en las proyecciones
          }
        }
      });

    } catch (error) {
      console.error('Error en análisis de performance:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  /**
   * GET /goals/:id/projections/comparison
   * Compara diferentes escenarios de proyección
   */
  router.get('/goals/:id/projections/comparison', async (req, res) => {
    try {
      const goalId = parseInt(req.params.id);
      const { scenarios } = req.query; // Lista de tipos de escenario a comparar
      
      if (isNaN(goalId)) {
        res.status(400).json({ error: 'ID de objetivo inválido' });
        return;
      }

      let scenarioFilter = '';
      let params = [goalId];
      
      if (scenarios && typeof scenarios === 'string') {
        const scenarioList = scenarios.split(',');
        const placeholders = scenarioList.map(() => '?').join(',');
        scenarioFilter = `AND projection_type IN (${placeholders})`;
        params.push(...scenarioList);
      }

      const stmt = db.prepare(`
        SELECT 
          projection_type,
          scenario_name,
          json_extract(result, '$.futureValue') as future_value,
          json_extract(result, '$.realFutureValue') as real_future_value,
          json_extract(result, '$.effectiveAnnualReturn') as annual_return,
          json_extract(result, '$.timeToGoalMonths') as time_to_goal,
          confidence_level,
          last_updated
        FROM goal_projections 
        WHERE goal_id = ? AND is_active = 1 ${scenarioFilter}
        ORDER BY projection_type, last_updated DESC
      `);

      const comparisons = stmt.all(...params);

      res.json({
        success: true,
        data: {
          scenarios: comparisons,
          comparison_metrics: {
            value_range: {
              min: Math.min(...comparisons.map(c => c.real_future_value)),
              max: Math.max(...comparisons.map(c => c.real_future_value)),
              spread: 0 // Se calcularía la diferencia
            },
            return_range: {
              min: Math.min(...comparisons.map(c => c.annual_return)),
              max: Math.max(...comparisons.map(c => c.annual_return)),
            },
            recommended_scenario: comparisons.find(c => c.projection_type === 'REALISTIC')?.scenario_name || 'Realista'
          }
        }
      });

    } catch (error) {
      console.error('Error en comparación de escenarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  return router;
}