import { Router } from 'express'
import { InstrumentController } from '../controllers/InstrumentController.js'

const router = Router()
const instrumentController = new InstrumentController()

// GET /api/v1/instruments - Get all instruments with optional filters
router.get('/', instrumentController.getAllInstruments.bind(instrumentController))

// GET /api/v1/instruments/search - Search instruments by name or symbol
router.get('/search', instrumentController.searchInstruments.bind(instrumentController))

// GET /api/v1/instruments/esg - Get ESG compliant instruments
router.get('/esg', instrumentController.getESGInstruments.bind(instrumentController))

// GET /api/v1/instruments/vegan - Get vegan-friendly instruments
router.get('/vegan', instrumentController.getVeganInstruments.bind(instrumentController))

// POST /api/v1/instruments - Create new instrument
router.post('/', instrumentController.createInstrument.bind(instrumentController))

// POST /api/v1/instruments/bulk - Bulk create instruments
router.post('/bulk', instrumentController.bulkCreateInstruments.bind(instrumentController))

// GET /api/v1/instruments/:id - Get specific instrument
router.get('/:id', instrumentController.getInstrument.bind(instrumentController))

// PUT /api/v1/instruments/:id - Update instrument
router.put('/:id', instrumentController.updateInstrument.bind(instrumentController))

// DELETE /api/v1/instruments/:id - Delete instrument
router.delete('/:id', instrumentController.deleteInstrument.bind(instrumentController))

// POST /api/v1/instruments/:id/toggle-esg - Toggle ESG compliance
router.post('/:id/toggle-esg', instrumentController.toggleESGCompliance.bind(instrumentController))

// POST /api/v1/instruments/:id/toggle-vegan - Toggle vegan-friendly status
router.post('/:id/toggle-vegan', instrumentController.toggleVeganFriendly.bind(instrumentController))

export default router