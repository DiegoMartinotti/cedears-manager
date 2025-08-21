import { Router } from 'express'
import { ContextualAnalysisController } from '../controllers/ContextualAnalysisController.js'

const router = Router()

/**
 * Rutas para análisis contextual con Claude
 */

// === ANÁLISIS PRINCIPAL ===

// POST /api/contextual/analyze - Análisis contextual completo de un símbolo
router.post('/analyze', ContextualAnalysisController.analyzeSymbol)

// POST /api/contextual/portfolio - Análisis contextual de portafolio
router.post('/portfolio', ContextualAnalysisController.analyzePortfolio)

// POST /api/contextual/report - Generación de reportes personalizados
router.post('/report', ContextualAnalysisController.generateCustomReport)

// === COMPONENTES ESPECÍFICOS ===

// GET /api/contextual/news/:symbol - Análisis de noticias para un símbolo
router.get('/news/:symbol', ContextualAnalysisController.getNewsAnalysis)

// GET /api/contextual/sentiment - Sentiment general del mercado
router.get('/sentiment', ContextualAnalysisController.getMarketSentiment)

// GET /api/contextual/earnings/:symbol - Análisis de earnings
router.get('/earnings/:symbol', ContextualAnalysisController.getEarningsAnalysis)

// GET /api/contextual/trends/:symbol - Predicción de tendencias
router.get('/trends/:symbol', ContextualAnalysisController.getTrendPrediction)

// === ANÁLISIS ESPECIALIZADOS ===

// GET /api/contextual/earnings/calendar - Calendario de próximos earnings
router.get('/earnings/calendar', ContextualAnalysisController.getEarningsCalendar)

// POST /api/contextual/portfolio/trends - Análisis de tendencias del portafolio
router.post('/portfolio/trends', ContextualAnalysisController.analyzePortfolioTrends)

// === ADMINISTRACIÓN ===

// GET /api/contextual/status - Estado de todos los servicios
router.get('/status', ContextualAnalysisController.getServicesStatus)

// POST /api/contextual/cache/clear - Limpiar cache de servicios
router.post('/cache/clear', ContextualAnalysisController.clearCache)

export default router