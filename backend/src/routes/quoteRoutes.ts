import { Router } from 'express'
import { quoteController } from '../controllers/QuoteController.js'

const router = Router()

/**
 * Rutas para gestión de cotizaciones
 */

// Obtener cotización específica
router.get('/:symbol', quoteController.getQuote.bind(quoteController))

// Obtener cotizaciones en lote
router.post('/batch', quoteController.getBatchQuotes.bind(quoteController))

// Obtener historial de cotizaciones
router.get('/history/:symbol', quoteController.getQuoteHistory.bind(quoteController))

// Obtener última cotización desde DB
router.get('/latest/:symbol', quoteController.getLatestQuote.bind(quoteController))

// Obtener cotizaciones del watchlist
router.get('/watchlist', quoteController.getWatchlistQuotes.bind(quoteController))

// Ejecutar actualización manual
router.post('/update', quoteController.updateQuotes.bind(quoteController))

// Información de horario de mercado
router.get('/market/hours', quoteController.getMarketHours.bind(quoteController))

// Estadísticas del servicio
router.get('/stats', quoteController.getServiceStats.bind(quoteController))

// Gestión del job de actualización
router.post('/job/config', quoteController.updateJobConfig.bind(quoteController))
router.post('/job/restart', quoteController.restartJob.bind(quoteController))
router.delete('/job/stats', quoteController.resetJobStats.bind(quoteController))

// Limpieza de cotizaciones antiguas
router.post('/cleanup', quoteController.cleanupOldQuotes.bind(quoteController))

export default router