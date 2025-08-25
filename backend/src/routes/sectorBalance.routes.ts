import { Router } from 'express'
import SectorBalanceController from '../controllers/sectorBalanceController.js'

const router = Router()
const controller = new SectorBalanceController()

// ============================================================================
// Overview and Analysis Routes
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/overview
 * @desc Get complete sector balance overview including distributions, alerts, and suggestions
 * @access Public
 */
router.get('/overview', controller.overview)

/**
 * @route GET /api/v1/sector-balance/distribution
 * @desc Get current sector distribution with detailed breakdown
 * @access Public
 */
router.get('/distribution', controller.distribution)

/**
 * @route GET /api/v1/sector-balance/portfolio-analysis
 * @desc Get complete portfolio balance analysis including risk metrics
 * @access Public
 */
router.get('/portfolio-analysis', controller.portfolioAnalysis)

/**
 * @route POST /api/v1/sector-balance/analyze
 * @desc Run comprehensive sector analysis and generate alerts/suggestions
 * @access Public
 */
router.post('/analyze', controller.analyze)

// ============================================================================
// Recommendations and Simulation Routes
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/recommendations
 * @desc Get personalized rebalancing recommendations
 * @access Public
 */
router.get('/recommendations', controller.recommendations)

/**
 * @route POST /api/v1/sector-balance/simulate
 * @desc Simulate rebalancing scenario with custom allocations
 * @body { targetAllocations: Record<string, number>, maxTransactionCost?: number, minTradeSize?: number, excludeInstruments?: number[] }
 * @access Public
 */
router.post('/simulate', controller.simulate)

// ============================================================================
// Alerts Management Routes
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/alerts
 * @desc Get active concentration alerts with optional severity filter
 * @query severity - Filter by alert severity (LOW, MEDIUM, HIGH, CRITICAL)
 * @access Public
 */
router.get('/alerts', controller.alerts)

/**
 * @route PUT /api/v1/sector-balance/alerts/:id/acknowledge
 * @desc Acknowledge a concentration alert
 * @param id - Alert ID
 * @access Public
 */
router.put('/alerts/:id/acknowledge', controller.acknowledgeAlert)

// ============================================================================
// Classification Management Routes
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/classifications
 * @desc Get sector classifications with filtering options
 * @query sector - Filter by GICS sector
 * @query source - Filter by classification source (AUTO, MANUAL, YAHOO, EXTERNAL)
 * @query minConfidence - Minimum confidence score (0-100)
 * @query limit - Maximum number of results
 * @query offset - Results offset for pagination
 * @access Public
 */
router.get('/classifications', controller.classifications)

/**
 * @route POST /api/v1/sector-balance/classify
 * @desc Classify instruments using GICS taxonomy
 * @body { instrumentIds?: number[], force?: boolean }
 * @access Public
 */
router.post('/classify', controller.classify)

/**
 * @route GET /api/v1/sector-balance/classification-quality
 * @desc Get classification quality report and recommendations
 * @access Public
 */
router.get('/classification-quality', controller.classificationQuality)

// ============================================================================
// Advanced Analysis Routes
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/health-score
 * @desc Get comprehensive portfolio health score with detailed factors
 * @access Public
 */
router.get('/health-score', controller.healthScore)

/**
 * @route GET /api/v1/sector-balance/sector-stats
 * @desc Get detailed statistics for each sector in the portfolio
 * @access Public
 */
router.get('/sector-stats', controller.sectorStats)

/**
 * @route GET /api/v1/sector-balance/risk-analysis
 * @desc Get comprehensive risk analysis including concentration and correlation risks
 * @access Public
 */
router.get('/risk-analysis', controller.riskAnalysis)

/**
 * @route GET /api/v1/sector-balance/performance/:months
 * @desc Get sector performance analysis for specified time period
 * @param months - Number of months to analyze (1-60)
 * @access Public
 */
router.get('/performance/:months', controller.performance)

// ============================================================================
// Configuration and Settings Routes
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/targets
 * @desc Get sector balance targets configuration
 * @query activeOnly - Return only active targets (default: true)
 * @access Public
 */
router.get('/targets', controller.targets)

/**
 * @route PUT /api/v1/sector-balance/targets/:id
 * @desc Update sector balance target configuration
 * @param id - Target ID
 * @body Partial target data to update
 * @access Public
 */
router.put('/targets/:id', controller.updateTarget)

// ============================================================================
// Health Check Route
// ============================================================================

/**
 * @route GET /api/v1/sector-balance/health
 * @desc Health check for sector balance service
 * @access Public
 */
router.get('/health', controller.health)

export default router