import { Router, Request, Response } from 'express'
import Database from 'better-sqlite3'
import { GoalProjectionController } from '../controllers/GoalProjectionController'
import { GoalExportService, ExportOptions, InvestmentPlan } from '../services/GoalExportService'
import { GoalProjectionService } from '../services/GoalProjectionService'
import { createLogger } from '../utils/logger'

type RouteMethod = 'get' | 'post' | 'put'

type ExportFormat = ExportOptions['format']

type GoalRouteHandler = GoalProjectionController['calculateProjections']
type ExportOptionsBuilder = typeof buildPdfOptions
type ExportMetaBuilder = typeof pdfResponseMeta

interface SimpleRouteDefinition {
  method: RouteMethod
  path: string
  handler: GoalRouteHandler
}

interface ExportDefinition {
  path: string
  format: ExportFormat
  buildOptions: ExportOptionsBuilder
  responseMeta: ExportMetaBuilder
  planType?: InvestmentPlan['plan_type']
  errorMessage: string
}

interface ExportServices {
  projectionService: GoalProjectionService
  exportService: GoalExportService
}

interface CustomExportPayload {
  planType: InvestmentPlan['plan_type']
  format: string
  customName?: string
  includeSections: Record<string, unknown>
  templateOptions: Record<string, unknown>
}

const logger = createLogger('GoalProjectionRoutes')

export function createGoalProjectionRoutes(db: Database.Database): Router {
  const router = Router()
  const controller = new GoalProjectionController(db)
  const exportService = new GoalExportService(db)
  const projectionService = new GoalProjectionService(db)

  registerProjectionRoutes(router, controller)
  registerSensitivityRoutes(router, controller)
  registerRecommendationRoutes(router, controller)
  registerAdminRoutes(router, controller)
  registerExportRoutes(router, projectionService, exportService)
  registerAnalyticsRoutes(router, db, projectionService)

  return router
}

function registerProjectionRoutes(router: Router, controller: GoalProjectionController): void {
  registerSimpleRoutes(router, [
    {
      method: 'post',
      path: '/goals/:id/projections/calculate',
      handler: controller.calculateProjections.bind(controller)
    },
    {
      method: 'get',
      path: '/goals/:id/projections/current',
      handler: controller.getCurrentProjections.bind(controller)
    },
    {
      method: 'put',
      path: '/goals/:id/projections/adjust',
      handler: controller.adjustProjections.bind(controller)
    }
  ])
}

function registerSensitivityRoutes(router: Router, controller: GoalProjectionController): void {
  registerSimpleRoutes(router, [
    {
      method: 'post',
      path: '/goals/:id/sensitivity/analyze',
      handler: controller.performSensitivityAnalysis.bind(controller)
    },
    {
      method: 'post',
      path: '/goals/:id/sensitivity/monte-carlo',
      handler: controller.performMonteCarloSimulation.bind(controller)
    },
    {
      method: 'get',
      path: '/goals/:id/sensitivity/scenarios',
      handler: controller.getScenarios.bind(controller)
    }
  ])
}

function registerRecommendationRoutes(router: Router, controller: GoalProjectionController): void {
  registerSimpleRoutes(router, [
    {
      method: 'post',
      path: '/goals/:id/recommendations',
      handler: controller.generateRecommendations.bind(controller)
    },
    {
      method: 'get',
      path: '/goals/:id/recommendations/latest',
      handler: controller.getLatestRecommendations.bind(controller)
    },
    {
      method: 'post',
      path: '/goals/:id/recommendations/apply',
      handler: controller.applyRecommendation.bind(controller)
    }
  ])
}

function registerAdminRoutes(router: Router, controller: GoalProjectionController): void {
  registerSimpleRoutes(router, [
    {
      method: 'post',
      path: '/goals/projections/recalculate-all',
      handler: controller.recalculateAllProjections.bind(controller)
    }
  ])
}

function registerExportRoutes(
  router: Router,
  projectionService: GoalProjectionService,
  exportService: GoalExportService
): void {
  getStandardExportDefinitions().forEach((definition) => {
    router.get(definition.path, async (req, res) => {
      await handleStandardExport(req, res, { projectionService, exportService }, definition)
    })
  })

  router.post('/goals/:id/export/investment-plan', async (req, res) => {
    await handleCustomPlanExport(req, res, { projectionService, exportService })
  })
}

function getStandardExportDefinitions(): ExportDefinition[] {
  return [
    {
      path: '/goals/:id/export/pdf',
      format: 'PDF',
      buildOptions: buildPdfOptions,
      planType: 'STANDARD',
      responseMeta: pdfResponseMeta,
      errorMessage: 'Error generando PDF'
    },
    {
      path: '/goals/:id/export/excel',
      format: 'EXCEL',
      buildOptions: buildExcelOptions,
      planType: 'STANDARD',
      responseMeta: excelResponseMeta,
      errorMessage: 'Error generando Excel'
    },
    {
      path: '/goals/:id/export/json',
      format: 'JSON',
      buildOptions: buildJsonOptions,
      planType: 'STANDARD',
      responseMeta: jsonResponseMeta,
      errorMessage: 'Error generando JSON'
    }
  ]
}

function registerAnalyticsRoutes(
  router: Router,
  db: Database.Database,
  projectionService: GoalProjectionService
): void {
  registerSummaryRoute(router, projectionService)
  registerPerformanceRoute(router, db)
  registerComparisonRoute(router, db)
}

function registerSummaryRoute(router: Router, projectionService: GoalProjectionService): void {
  router.get('/goals/:id/projections/summary', async (req, res) => {
    const goalId = getGoalIdOrRespond(req, res)
    if (goalId === null) {
      return
    }

    try {
      const summary = await projectionService.generateGoalProjections(goalId)
      res.json({
        success: true,
        data: {
          goal: summary.goal,
          current_projection: summary.current_projection,
          scenarios: summary.scenarios
        }
      })
    } catch (error) {
      logger.error('Error obteniendo resumen de proyecciones', { error, goalId })
      res.status(500).json({ error: 'Error obteniendo resumen de proyecciones' })
    }
  })
}

function registerPerformanceRoute(router: Router, db: Database.Database): void {
  router.get('/goals/:id/projections/performance', async (req, res) => {
    const goalId = getGoalIdOrRespond(req, res)
    if (goalId === null) {
      return
    }

    try {
      const historicalProjections = fetchHistoricalProjections(db, goalId)
      res.json({
        success: true,
        data: {
          historical_projections: historicalProjections,
          performance_trends: buildPerformanceTrends(historicalProjections)
        }
      })
    } catch (error) {
      logger.error('Error en análisis de performance', { error, goalId })
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  })
}

function registerComparisonRoute(router: Router, db: Database.Database): void {
  router.get('/goals/:id/projections/comparison', async (req, res) => {
    const goalId = getGoalIdOrRespond(req, res)
    if (goalId === null) {
      return
    }

    try {
      const { filter, params } = buildScenarioFilter(req.query.scenarios)
      const comparisons = fetchComparisonData(db, goalId, filter, params)
      res.json({
        success: true,
        data: {
          scenarios: comparisons,
          comparison_metrics: buildComparisonMetrics(comparisons)
        }
      })
    } catch (error) {
      logger.error('Error en comparación de escenarios', { error, goalId })
      res.status(500).json({ error: 'Error interno del servidor' })
    }
  })
}

function registerSimpleRoutes(router: Router, routes: SimpleRouteDefinition[]): void {
  routes.forEach(({ method, path, handler }) => {
    router[method](path, async (req, res) => handler(req, res))
  })
}

function getGoalIdOrRespond(req: Request, res: Response): number | null {
  const goalId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(goalId)) {
    res.status(400).json({ error: 'ID de objetivo inválido' })
    return null
  }
  return goalId
}

function parseBooleanParam(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return Boolean(value)
}

function buildPdfOptions(req: Request): ExportOptions {
  return {
    format: 'PDF',
    include_charts: parseBooleanParam(req.query.charts, false),
    include_sensitivity: parseBooleanParam(req.query.sensitivity, false),
    include_recommendations: parseBooleanParam(req.query.recommendations, false),
    include_detailed_schedule: parseBooleanParam(req.query.detailed, false),
    language: (req.query.lang as 'ES' | 'EN') || 'ES',
    template_style: (req.query.style as ExportOptions['template_style']) || 'PROFESSIONAL'
  }
}

function buildExcelOptions(req: Request): ExportOptions {
  return {
    format: 'EXCEL',
    include_charts: parseBooleanParam(req.query.charts, false),
    include_sensitivity: parseBooleanParam(req.query.sensitivity, false),
    include_recommendations: parseBooleanParam(req.query.recommendations, false),
    include_detailed_schedule: parseBooleanParam(req.query.detailed, false),
    language: (req.query.lang as 'ES' | 'EN') || 'ES',
    template_style: (req.query.style as ExportOptions['template_style']) || 'PROFESSIONAL'
  }
}

function buildJsonOptions(req: Request): ExportOptions {
  return {
    format: 'JSON',
    include_charts: false,
    include_sensitivity: parseBooleanParam(req.query.sensitivity, true),
    include_recommendations: parseBooleanParam(req.query.recommendations, true),
    include_detailed_schedule: parseBooleanParam(req.query.detailed, true),
    language: (req.query.lang as 'ES' | 'EN') || 'ES',
    template_style: 'DETAILED'
  }
}

function pdfResponseMeta(plan: InvestmentPlan): Record<string, unknown> {
  return {
    plan_summary: {
      goal_name: plan.goal_details.name,
      success_probability: plan.executive_summary.success_probability,
      total_pages: 'Variable'
    }
  }
}

function excelResponseMeta(plan: InvestmentPlan): Record<string, unknown> {
  return {
    plan_summary: {
      goal_name: plan.goal_details.name,
      sheets_included: ['Resumen', 'Calendario', 'Proyecciones', 'Análisis']
    }
  }
}

function jsonResponseMeta(plan: InvestmentPlan): Record<string, unknown> {
  return {
    plan_summary: {
      goal_name: plan.goal_details.name,
      data_completeness: '100%',
      format_version: '1.0'
    }
  }
}

function parseCustomExportPayload(body: unknown): CustomExportPayload {
  const {
    plan_type = 'STANDARD',
    export_format = 'PDF',
    custom_name,
    include_sections = {},
    template_options = {}
  } = (body || {}) as Record<string, unknown>

  return {
    planType: plan_type as InvestmentPlan['plan_type'],
    format: String(export_format).toUpperCase(),
    customName: typeof custom_name === 'string' ? custom_name : undefined,
    includeSections: include_sections as Record<string, unknown>,
    templateOptions: template_options as Record<string, unknown>
  }
}

function buildCustomResponseData(
  plan: InvestmentPlan,
  exportResult: { fileName: string },
  options: ExportOptions,
  payload: CustomExportPayload
): Record<string, unknown> {
  return {
    plan_id: plan.id ?? null,
    download_url: `/downloads/${exportResult.fileName}`,
    file_name: exportResult.fileName,
    plan_type: plan.plan_type,
    export_format: options.format,
    generated_at: new Date().toISOString(),
    customizations_applied: {
      custom_name: Boolean(payload.customName),
      template_style: options.template_style,
      sections_included: Object.keys(payload.includeSections).length
    }
  }
}

async function handleStandardExport(
  req: Request,
  res: Response,
  services: ExportServices,
  definition: ExportDefinition
): Promise<void> {
  const goalId = getGoalIdOrRespond(req, res)
  if (goalId === null) {
    return
  }

  try {
    const options = definition.buildOptions(req)
    const plan = await generatePlan(goalId, services.projectionService, services.exportService, definition.planType)
    const exportResult = await exportPlan(services.exportService, plan, definition.format, options)

    res.json({
      success: true,
      data: {
        download_url: `/downloads/${exportResult.fileName}`,
        file_name: exportResult.fileName,
        generated_at: new Date().toISOString(),
        ...definition.responseMeta(plan)
      }
    })
  } catch (error) {
    logger.error('Error exportando plan de objetivo', {
      error,
      goalId,
      format: definition.format
    })
    res.status(500).json({ error: definition.errorMessage })
  }
}

async function handleCustomPlanExport(
  req: Request,
  res: Response,
  services: ExportServices
): Promise<void> {
  const goalId = getGoalIdOrRespond(req, res)
  if (goalId === null) {
    return
  }

  const payload = parseCustomExportPayload(req.body)
  if (!isExportFormat(payload.format)) {
    res.status(400).json({ error: 'Formato de exportación no válido' })
    return
  }

  try {
    const options = buildCustomOptions(payload.includeSections, payload.templateOptions, payload.format)
    const plan = await generatePlan(goalId, services.projectionService, services.exportService, payload.planType)

    if (payload.customName) {
      plan.plan_name = payload.customName
    }

    const exportResult = await exportPlan(services.exportService, plan, options.format, options)

    res.json({
      success: true,
      data: buildCustomResponseData(plan, exportResult, options, payload),
      message: 'Plan de inversión generado exitosamente'
    })
  } catch (error) {
    logger.error('Error generando plan personalizado', {
      error,
      goalId,
      format: payload.format
    })
    res.status(500).json({ error: 'Error generando plan de inversión' })
  }
}

function isExportFormat(value: string): value is ExportFormat {
  return value === 'PDF' || value === 'EXCEL' || value === 'JSON'
}

function buildCustomOptions(
  includeSections: Record<string, unknown>,
  templateOptions: Record<string, unknown>,
  format: string
): ExportOptions {
  const templateStyle = templateOptions.style as ExportOptions['template_style'] | undefined
  const language = templateOptions.language as 'ES' | 'EN' | undefined

  return {
    format: format as ExportFormat,
    include_charts: includeSections.charts !== false,
    include_sensitivity: includeSections.sensitivity !== false,
    include_recommendations: includeSections.recommendations !== false,
    include_detailed_schedule: includeSections.detailed_schedule !== false,
    language: language || 'ES',
    template_style: templateStyle || 'PROFESSIONAL'
  }
}

async function generatePlan(
  goalId: number,
  projectionService: GoalProjectionService,
  exportService: GoalExportService,
  planType: InvestmentPlan['plan_type'] = 'STANDARD'
): Promise<InvestmentPlan> {
  const summary = await projectionService.generateGoalProjections(goalId)
  return exportService.generateInvestmentPlan(goalId, summary, planType)
}

async function exportPlan(
  exportService: GoalExportService,
  plan: InvestmentPlan,
  format: ExportFormat,
  options: ExportOptions
): Promise<{ fileName: string }> {
  switch (format) {
    case 'PDF':
      return exportService.exportToPDF(plan, options)
    case 'EXCEL':
      return exportService.exportToExcel(plan, options)
    case 'JSON':
    default:
      return exportService.exportToJSON(plan, options)
  }
}

function fetchHistoricalProjections(db: Database.Database, goalId: number): any[] {
  const stmt = db.prepare(`
    SELECT
      projection_date,
      scenario_name,
      projection_type,
      json_extract(result, '$.futureValue') AS projected_value,
      json_extract(result, '$.effectiveAnnualReturn') AS projected_return,
      confidence_level
    FROM goal_projections
    WHERE goal_id = ?
    ORDER BY projection_date DESC
    LIMIT 12
  `)

  return stmt.all(goalId)
}

function buildPerformanceTrends(historical: any[]): Record<string, unknown> {
  if (historical.length === 0) {
    return {
      projection_accuracy: 'Sin datos',
      trend_direction: 'UNKNOWN',
      confidence_evolution: 'Sin información'
    }
  }

  const confidenceValues = historical.map((item) => item.confidence_level || 0)
  const avgConfidence =
    confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length

  return {
    projection_accuracy: avgConfidence > 75 ? 'Alta' : avgConfidence > 50 ? 'Media' : 'Baja',
    trend_direction: historical[0].projected_value >= historical.at(-1)?.projected_value ? 'STABLE' : 'IMPROVING',
    confidence_evolution: avgConfidence >= 70 ? 'Creciente' : 'En evaluación'
  }
}

function buildScenarioFilter(scenarios: unknown): { filter: string; params: unknown[] } {
  if (typeof scenarios !== 'string' || scenarios.trim() === '') {
    return { filter: '', params: [] }
  }

  const scenarioList = scenarios.split(',').map((item) => item.trim()).filter(Boolean)
  if (scenarioList.length === 0) {
    return { filter: '', params: [] }
  }

  const placeholders = scenarioList.map(() => '?').join(',')
  return {
    filter: `AND projection_type IN (${placeholders})`,
    params: scenarioList
  }
}

function fetchComparisonData(
  db: Database.Database,
  goalId: number,
  filter: string,
  params: unknown[]
): any[] {
  const stmt = db.prepare(`
    SELECT
      projection_type,
      scenario_name,
      json_extract(result, '$.futureValue') AS future_value,
      json_extract(result, '$.realFutureValue') AS real_future_value,
      json_extract(result, '$.effectiveAnnualReturn') AS annual_return,
      json_extract(result, '$.timeToGoalMonths') AS time_to_goal,
      confidence_level,
      last_updated
    FROM goal_projections
    WHERE goal_id = ? AND is_active = 1 ${filter}
    ORDER BY projection_type, last_updated DESC
  `)

  return stmt.all(goalId, ...params)
}

function buildComparisonMetrics(comparisons: any[]): Record<string, unknown> {
  if (comparisons.length === 0) {
    return {
      value_range: { min: 0, max: 0, spread: 0 },
      return_range: { min: 0, max: 0 },
      recommended_scenario: null
    }
  }

  const realValues = comparisons.map((item) => item.real_future_value || 0)
  const returns = comparisons.map((item) => item.annual_return || 0)
  const minValue = Math.min(...realValues)
  const maxValue = Math.max(...realValues)
  const minReturn = Math.min(...returns)
  const maxReturn = Math.max(...returns)

  const recommended =
    comparisons.find((item) => item.projection_type === 'REALISTIC')?.scenario_name ||
    comparisons[0]?.scenario_name ||
    null

  return {
    value_range: {
      min: minValue,
      max: maxValue,
      spread: maxValue - minValue
    },
    return_range: {
      min: minReturn,
      max: maxReturn
    },
    recommended_scenario: recommended
  }
}
