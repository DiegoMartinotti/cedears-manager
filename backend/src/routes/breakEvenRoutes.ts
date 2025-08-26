import { Router } from 'express'
import { BreakEvenController } from '../controllers/BreakEvenController.js'

const router = Router()
const breakEvenController = new BreakEvenController()

/**
 * Break-Even Analysis Routes
 * 
 * Este módulo maneja todas las rutas relacionadas con el análisis de break-even
 * incluyendo cálculos, proyecciones, optimizaciones y comparaciones.
 */

// Ruta de health check
router.get('/health', (req, res) => breakEvenController.healthCheck(req, res))

// Rutas principales de análisis
router.post('/calculate/:tradeId', (req, res) => breakEvenController.calculateBreakEven(req, res))
router.post('/projection', (req, res) => breakEvenController.generateProjection(req, res))
router.post('/portfolio', (req, res) => breakEvenController.analyzePortfolio(req, res))

// Rutas de matriz y simulación
router.post('/matrix', (req, res) => breakEvenController.generateMatrix(req, res))
router.post('/simulate', (req, res) => breakEvenController.simulate(req, res))

// Rutas de optimización y comparación
router.get('/optimization/:tradeId', (req, res) => breakEvenController.getOptimizations(req, res))
router.post('/compare', (req, res) => breakEvenController.compareStrategies(req, res))

// Rutas de consulta
router.get('/trade/:tradeId', (req, res) => breakEvenController.getByTradeId(req, res))
router.get('/summary', (req, res) => breakEvenController.getSummary(req, res))

export default router