import { Router } from 'express';
import { scenarioController } from '../controllers/ScenarioController';

const router = Router();

// ==================== SCENARIO MANAGEMENT ROUTES ====================

/**
 * @route   POST /api/v1/scenarios
 * @desc    Create a new scenario
 * @access  Private
 * @body    { name, description, category, is_active?, is_predefined?, created_by }
 */
router.post('/', async (req, res) => {
  await scenarioController.createScenario(req, res);
});

/**
 * @route   GET /api/v1/scenarios
 * @desc    Get all scenarios with optional filters
 * @access  Private
 * @query   ?category=MACRO&is_active=true&is_predefined=false
 */
router.get('/', async (req, res) => {
  await scenarioController.getAllScenarios(req, res);
});

/**
 * @route   GET /api/v1/scenarios/:id
 * @desc    Get scenario by ID with variables and results
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  await scenarioController.getScenario(req, res);
});

/**
 * @route   PUT /api/v1/scenarios/:id
 * @desc    Update scenario by ID
 * @access  Private
 * @body    { name?, description?, category?, is_active? }
 */
router.put('/:id', async (req, res) => {
  await scenarioController.updateScenario(req, res);
});

/**
 * @route   DELETE /api/v1/scenarios/:id
 * @desc    Delete scenario by ID
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  await scenarioController.deleteScenario(req, res);
});

// ==================== SCENARIO VARIABLES ROUTES ====================

/**
 * @route   POST /api/v1/scenarios/variables
 * @desc    Create a new scenario variable
 * @access  Private
 * @body    { scenario_id, variable_type, variable_name, current_value, scenario_value, change_percentage, impact_duration_months }
 */
router.post('/variables', async (req, res) => {
  await scenarioController.createVariable(req, res);
});

/**
 * @route   GET /api/v1/scenarios/:scenarioId/variables
 * @desc    Get all variables for a scenario
 * @access  Private
 */
router.get('/:scenarioId/variables', async (req, res) => {
  await scenarioController.getScenarioVariables(req, res);
});

/**
 * @route   PUT /api/v1/scenarios/variables/:id
 * @desc    Update scenario variable by ID
 * @access  Private
 * @body    { variable_name?, current_value?, scenario_value?, change_percentage?, impact_duration_months? }
 */
router.put('/variables/:id', async (req, res) => {
  await scenarioController.updateVariable(req, res);
});

/**
 * @route   DELETE /api/v1/scenarios/variables/:id
 * @desc    Delete scenario variable by ID
 * @access  Private
 */
router.delete('/variables/:id', async (req, res) => {
  await scenarioController.deleteVariable(req, res);
});

// ==================== WHAT-IF ANALYSIS ROUTES (Step 24.4) ====================

/**
 * @route   POST /api/v1/scenarios/what-if-analysis
 * @desc    Run what-if analysis for a scenario (Step 24.4)
 * @access  Private
 * @body    { scenarioId, timeHorizonMonths, confidenceLevel?, includeMonteCarloSimulation?, includeInstrumentAnalysis? }
 */
router.post('/what-if-analysis', async (req, res) => {
  await scenarioController.runWhatIfAnalysis(req, res);
});

/**
 * @route   POST /api/v1/scenarios/:id/analyze
 * @desc    Run what-if analysis for specific scenario
 * @access  Private
 * @body    { timeHorizonMonths, confidenceLevel?, includeMonteCarloSimulation?, includeInstrumentAnalysis? }
 */
router.post('/:id/analyze', async (req, res) => {
  // Convert route param to body param for consistency
  req.body.scenarioId = parseInt(req.params.id);
  await scenarioController.runWhatIfAnalysis(req, res);
});

// ==================== RECOMMENDATIONS ROUTES (Step 24.5) ====================

/**
 * @route   POST /api/v1/scenarios/:scenarioId/recommendations
 * @desc    Generate recommendations for scenario (Step 24.5)
 * @access  Private
 * @body    { riskTolerance?, timeHorizon?, priorityFocus? }
 */
router.post('/:scenarioId/recommendations', async (req, res) => {
  await scenarioController.generateRecommendations(req, res);
});

// ==================== RESULTS ROUTES ====================

/**
 * @route   GET /api/v1/scenarios/:scenarioId/results
 * @desc    Get analysis results for scenario
 * @access  Private
 * @query   ?limit=10
 */
router.get('/:scenarioId/results', async (req, res) => {
  await scenarioController.getScenarioResults(req, res);
});

/**
 * @route   GET /api/v1/scenarios/results/:resultId/instrument-impacts
 * @desc    Get instrument impacts for a specific result
 * @access  Private
 */
router.get('/results/:resultId/instrument-impacts', async (req, res) => {
  await scenarioController.getResultInstrumentImpacts(req, res);
});

// ==================== TEMPLATES ROUTES ====================

/**
 * @route   GET /api/v1/scenarios/templates
 * @desc    Get all scenario templates
 * @access  Private
 * @query   ?is_public=true
 */
router.get('/templates/list', async (req, res) => {
  await scenarioController.getTemplates(req, res);
});

/**
 * @route   POST /api/v1/scenarios/templates
 * @desc    Create a new scenario template
 * @access  Private
 * @body    { name, description, category, template_data, is_public?, created_by }
 */
router.post('/templates', async (req, res) => {
  await scenarioController.createTemplate(req, res);
});

/**
 * @route   POST /api/v1/scenarios/templates/:templateId/create
 * @desc    Create scenario from template
 * @access  Private
 * @body    { name?, description?, created_by }
 */
router.post('/templates/:templateId/create', async (req, res) => {
  await scenarioController.createFromTemplate(req, res);
});

// ==================== COMPARISON ROUTES ====================

/**
 * @route   POST /api/v1/scenarios/compare
 * @desc    Compare multiple scenarios
 * @access  Private
 * @body    { scenario_ids: number[], user_id: string }
 */
router.post('/compare', async (req, res) => {
  await scenarioController.compareScenarios(req, res);
});

/**
 * @route   GET /api/v1/scenarios/comparisons
 * @desc    Get scenario comparisons
 * @access  Private
 * @query   ?created_by=userId
 */
router.get('/comparisons', async (req, res) => {
  await scenarioController.getComparisons(req, res);
});

// ==================== MONTE CARLO ROUTES ====================

/**
 * @route   GET /api/v1/scenarios/:scenarioId/monte-carlo
 * @desc    Get Monte Carlo simulation results for scenario
 * @access  Private
 */
router.get('/:scenarioId/monte-carlo', async (req, res) => {
  await scenarioController.getMonteCarloResults(req, res);
});

// ==================== UTILITY ROUTES ====================

/**
 * @route   GET /api/v1/scenarios/stats
 * @desc    Get scenario system statistics
 * @access  Private
 */
router.get('/system/stats', async (req, res) => {
  await scenarioController.getStats(req, res);
});

/**
 * @route   POST /api/v1/scenarios/cleanup
 * @desc    Clean up old scenario data
 * @access  Private
 */
router.post('/system/cleanup', async (req, res) => {
  await scenarioController.cleanup(req, res);
});

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/v1/scenarios/health
 * @desc    Health check for scenario system
 * @access  Public
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      service: 'Scenario Analysis System',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        whatIfAnalysis: true,
        recommendations: true,
        monteCarloSimulation: true,
        scenarioComparison: true,
        templates: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'Scenario Analysis System',
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

// ==================== ROUTE DOCUMENTATION ====================

/**
 * Scenario Analysis API Routes
 * 
 * This module provides all API endpoints for the Scenario Analysis system,
 * implementing Steps 24.4 (What-if analysis with Claude) and 24.5 (Recommendations per scenario).
 * 
 * Main Features:
 * - Scenario CRUD operations
 * - Variable management
 * - What-if analysis with Claude integration
 * - AI-powered recommendations
 * - Monte Carlo simulations
 * - Scenario comparisons
 * - Template system
 * - Results tracking
 * 
 * Route Groups:
 * 1. Scenario Management: Basic CRUD for scenarios
 * 2. Variable Management: CRUD for scenario variables
 * 3. What-if Analysis: Core analysis functionality (Step 24.4)
 * 4. Recommendations: AI recommendations generation (Step 24.5)
 * 5. Results: Historical results and impacts
 * 6. Templates: Reusable scenario templates
 * 7. Comparison: Multi-scenario analysis
 * 8. Monte Carlo: Statistical simulations
 * 9. Utilities: Stats, cleanup, health
 * 
 * Authentication:
 * All routes except /health require authentication (to be implemented by middleware)
 * 
 * Error Handling:
 * All routes include comprehensive error handling with appropriate HTTP status codes
 * 
 * Validation:
 * Request bodies are validated using Zod schemas in the controller
 * 
 * Usage Examples:
 * 
 * 1. Create a scenario:
 *    POST /api/v1/scenarios
 *    Body: { name: "Crisis 2024", description: "Market crash scenario", category: "MARKET", created_by: "user1" }
 * 
 * 2. Add variables:
 *    POST /api/v1/scenarios/variables
 *    Body: { scenario_id: 1, variable_type: "MARKET_CRASH", variable_name: "S&P 500 Decline", current_value: 4500, scenario_value: 3150, change_percentage: -30, impact_duration_months: 6 }
 * 
 * 3. Run what-if analysis:
 *    POST /api/v1/scenarios/1/analyze
 *    Body: { timeHorizonMonths: 12, includeMonteCarloSimulation: true, includeInstrumentAnalysis: true }
 * 
 * 4. Generate recommendations:
 *    POST /api/v1/scenarios/1/recommendations
 *    Body: { riskTolerance: "MODERATE", priorityFocus: "BALANCED" }
 * 
 * 5. Compare scenarios:
 *    POST /api/v1/scenarios/compare
 *    Body: { scenario_ids: [1, 2, 3], user_id: "user1" }
 */