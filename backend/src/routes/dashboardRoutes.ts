import { Router } from 'express'
import { dashboardController } from '../controllers/DashboardController.js'

const router = Router()

/**
 * Dashboard Routes
 * Base path: /api/dashboard
 */

// GET /api/dashboard/summary - Resumen completo del dashboard
router.get('/summary', (req, res) => dashboardController.getDashboardSummary(req, res))

// GET /api/dashboard/portfolio-summary - Resumen del portfolio
router.get('/portfolio-summary', (req, res) => dashboardController.getPortfolioSummary(req, res))

// GET /api/dashboard/positions - Posiciones actuales
router.get('/positions', (req, res) => dashboardController.getCurrentPositions(req, res))

// GET /api/dashboard/market-summary - Resumen del mercado
router.get('/market-summary', (req, res) => dashboardController.getMarketSummary(req, res))

// GET /api/dashboard/performance - Métricas de performance
router.get('/performance', (req, res) => dashboardController.getPerformanceMetrics(req, res))

// GET /api/dashboard/distribution - Datos de distribución para gráficos
router.get('/distribution', (req, res) => dashboardController.getDistributionData(req, res))

// GET /api/dashboard/health - Health check
router.get('/health', (req, res) => dashboardController.getHealthCheck(req, res))

// POST /api/dashboard/refresh - Refrescar datos del dashboard
router.post('/refresh', (req, res) => dashboardController.refreshDashboard(req, res))

export default router