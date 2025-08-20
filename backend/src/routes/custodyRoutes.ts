import { Router } from 'express'
import { CustodyController } from '../controllers/CustodyController.js'

const router = Router()
const custodyController = new CustodyController()

// Estado actual de custodia
router.get('/current', custodyController.getCurrentCustodyStatus)

// Histórico de fees de custodia
router.get('/history', custodyController.getCustodyHistory)

// Proyecciones futuras
router.get('/projection', custodyController.getCustodyProjection)

// Calculadora manual
router.post('/calculate', custodyController.calculateCustody)

// Optimización de cartera
router.get('/optimization', custodyController.getCustodyOptimization)

// Análisis de impacto en rentabilidad
router.post('/impact-analysis', custodyController.analyzeCustodyImpact)

// Ejecutar job mensual manualmente
router.post('/run-monthly-job', custodyController.runMonthlyJob)

// Estado del job
router.get('/job/status', custodyController.getJobStatus)

// Actualizar fecha de pago
router.post('/update-payment-date/:id', custodyController.updatePaymentDate)

export { router as custodyRoutes }