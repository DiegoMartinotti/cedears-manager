import { Router } from 'express'
import { opportunityController } from '../controllers/OpportunityController.js'

const router = Router()

/**
 * Rutas de Oportunidades de Compra
 * Base: /api/v1/opportunities
 */

// GET /api/v1/opportunities/today - Oportunidades del día
router.get('/today', opportunityController.getTodaysOpportunities.bind(opportunityController))

// GET /api/v1/opportunities/top - Mejores oportunidades por score
router.get('/top', opportunityController.getTopOpportunities.bind(opportunityController))

// GET /api/v1/opportunities/search - Búsqueda con filtros avanzados
router.get('/search', opportunityController.searchOpportunities.bind(opportunityController))

// GET /api/v1/opportunities/stats - Estadísticas de oportunidades
router.get('/stats', opportunityController.getOpportunityStats.bind(opportunityController))

// GET /api/v1/opportunities/health - Health check del sistema
router.get('/health', opportunityController.healthCheck.bind(opportunityController))

// GET /api/v1/opportunities/:id - Oportunidad específica por ID
router.get('/:id', opportunityController.getOpportunityById.bind(opportunityController))

// POST /api/v1/opportunities/calculate-diversification - Calculadora de diversificación
router.post('/calculate-diversification', opportunityController.calculateDiversification.bind(opportunityController))

// POST /api/v1/opportunities/scan/manual - Scan manual de oportunidades
router.post('/scan/manual', opportunityController.runManualScan.bind(opportunityController))

// GET /api/v1/opportunities/scanner/status - Estado del scanner
router.get('/scanner/status', opportunityController.getScannerStatus.bind(opportunityController))

// POST /api/v1/opportunities/scanner/force-run - Forzar ejecución del scanner
router.post('/scanner/force-run', opportunityController.forceScannerRun.bind(opportunityController))

export default router