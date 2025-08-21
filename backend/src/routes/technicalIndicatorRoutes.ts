import { Router } from 'express'
import { technicalIndicatorController } from '../controllers/TechnicalIndicatorController'

const router = Router()

// GET /api/v1/technical-indicators/:symbol - Últimos indicadores para un símbolo
router.get('/:symbol', technicalIndicatorController.getLatestIndicators.bind(technicalIndicatorController))

// GET /api/v1/technical-indicators/:symbol/history - Historial de indicadores
router.get('/:symbol/history', technicalIndicatorController.getIndicatorHistory.bind(technicalIndicatorController))

// GET /api/v1/technical-indicators/:symbol/extremes - Mínimos y máximos anuales
router.get('/:symbol/extremes', technicalIndicatorController.getExtremes.bind(technicalIndicatorController))

// GET /api/v1/technical-indicators/signals - Señales activas de trading
router.get('/signals', technicalIndicatorController.getActiveSignals.bind(technicalIndicatorController))

// GET /api/v1/technical-indicators/stats - Estadísticas del sistema
router.get('/stats', technicalIndicatorController.getStats.bind(technicalIndicatorController))

// GET /api/v1/technical-indicators/job/status - Estado del job
router.get('/job/status', technicalIndicatorController.getJobStatus.bind(technicalIndicatorController))

// POST /api/v1/technical-indicators/calculate - Calcular indicadores manualmente
router.post('/calculate', technicalIndicatorController.calculateIndicators.bind(technicalIndicatorController))

// POST /api/v1/technical-indicators/job/force-run - Forzar ejecución del job
router.post('/job/force-run', technicalIndicatorController.forceJobRun.bind(technicalIndicatorController))

// DELETE /api/v1/technical-indicators/cleanup - Limpiar indicadores antiguos
router.delete('/cleanup', technicalIndicatorController.cleanupOldIndicators.bind(technicalIndicatorController))

export { router as technicalIndicatorRoutes }