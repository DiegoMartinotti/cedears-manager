import { Router } from 'express';
import { PortfolioController } from '../controllers/PortfolioController.js';
const router = Router();
const portfolioController = new PortfolioController();
// GET /api/v1/portfolio/positions - Get all portfolio positions
router.get('/positions', portfolioController.getPortfolioPositions.bind(portfolioController));
// GET /api/v1/portfolio/summary - Get portfolio summary
router.get('/summary', portfolioController.getPortfolioSummary.bind(portfolioController));
// GET /api/v1/portfolio/performance - Get portfolio performance analysis
router.get('/performance', portfolioController.getPortfolioPerformance.bind(portfolioController));
// POST /api/v1/portfolio/positions - Create new portfolio position
router.post('/positions', portfolioController.createPortfolioPosition.bind(portfolioController));
// POST /api/v1/portfolio/trade - Process trade and update position
router.post('/trade', portfolioController.processTradeAndUpdatePosition.bind(portfolioController));
// POST /api/v1/portfolio/rebalance - Calculate portfolio rebalancing
router.post('/rebalance', portfolioController.calculateRebalancing.bind(portfolioController));
// GET /api/v1/portfolio/positions/:id - Get specific portfolio position
router.get('/positions/:id', portfolioController.getPortfolioPosition.bind(portfolioController));
// PUT /api/v1/portfolio/positions/:id - Update portfolio position
router.put('/positions/:id', portfolioController.updatePortfolioPosition.bind(portfolioController));
// DELETE /api/v1/portfolio/positions/:id - Delete portfolio position
router.delete('/positions/:id', portfolioController.deletePortfolioPosition.bind(portfolioController));
// GET /api/v1/portfolio/instruments/:instrumentId/position - Get position by instrument
router.get('/instruments/:instrumentId/position', portfolioController.getPortfolioPositionByInstrument.bind(portfolioController));
// POST /api/v1/portfolio/instruments/:instrumentId/close - Close position for instrument
router.post('/instruments/:instrumentId/close', portfolioController.closePosition.bind(portfolioController));
export default router;
//# sourceMappingURL=portfolioRoutes.js.map