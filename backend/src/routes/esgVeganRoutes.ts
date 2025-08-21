import { Router } from 'express'
import ESGVeganController from '../controllers/ESGVeganController.js'

const router = Router()
const controller = new ESGVeganController()

// ESG Routes
router.get('/esg/evaluations', controller.getESGEvaluations)
router.get('/esg/evaluations/:instrumentId', controller.getESGEvaluation)
router.post('/esg/analyze/:instrumentId', controller.analyzeESG)
router.get('/esg/statistics', controller.getESGStatistics)
router.get('/esg/instruments-needing-review', controller.getESGInstrumentsNeedingReview)

// Vegan Routes
router.get('/vegan/evaluations', controller.getVeganEvaluations)
router.get('/vegan/evaluations/:instrumentId', controller.getVeganEvaluation)
router.post('/vegan/analyze/:instrumentId', controller.analyzeVegan)
router.get('/vegan/statistics', controller.getVeganStatistics)
router.get('/vegan/instruments-needing-review', controller.getVeganInstrumentsNeedingReview)

// Combined Routes
router.post('/analyze/:instrumentId', controller.analyzeInstrument)
router.get('/overview', controller.getOverview)
router.get('/combined/:instrumentId', controller.getCombinedEvaluation)

// Job Management Routes
router.post('/job/manual-evaluation', controller.triggerManualEvaluation)
router.get('/job/status', controller.getJobStatus)

export default router