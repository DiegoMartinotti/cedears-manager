import { Router } from 'express'
import { TradeController } from '../controllers/TradeController.js'

const router = Router()
const tradeController = new TradeController()

// Rutas principales de operaciones
router.get('/', tradeController.getTrades.bind(tradeController))
router.post('/', tradeController.createTrade.bind(tradeController))
router.get('/:id', tradeController.getTradeById.bind(tradeController))
router.put('/:id', tradeController.updateTrade.bind(tradeController))
router.delete('/:id', tradeController.deleteTrade.bind(tradeController))

// Análisis y validaciones
router.get('/:id/analyze', tradeController.analyzeTrade.bind(tradeController))
router.post('/validate-diversification', tradeController.validateDiversification.bind(tradeController))

// Cálculos de comisiones
router.post('/calculate-commission', tradeController.calculateCommission.bind(tradeController))
router.post('/project-commission', tradeController.projectCommission.bind(tradeController))

// Resúmenes y estadísticas
router.get('/summary/basic', tradeController.getTradesSummary.bind(tradeController))
router.get('/summary/monthly', tradeController.getMonthlyTradesSummary.bind(tradeController))

// Rutas de configuración de comisiones
router.get('/commissions/brokers', tradeController.getBrokerConfigurations.bind(tradeController))
router.post('/commissions/compare', tradeController.compareBrokerCommissions.bind(tradeController))
router.get('/commissions/history', tradeController.getCommissionHistory.bind(tradeController))
router.post('/commissions/minimum-investment', tradeController.getMinimumInvestmentRecommendation.bind(tradeController))

export default router