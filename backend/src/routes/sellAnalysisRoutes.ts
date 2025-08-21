import { Router } from 'express';
import { sellAnalysisController } from '../controllers/SellAnalysisController.js';

const router = Router();

// GET /api/v1/sell-analysis/alerts - Get all active sell alerts
router.get('/alerts', sellAnalysisController.getActiveAlerts.bind(sellAnalysisController));

// GET /api/v1/sell-analysis/positions/:id - Get detailed sell analysis for a specific position
router.get('/positions/:id', sellAnalysisController.getPositionAnalysis.bind(sellAnalysisController));

// POST /api/v1/sell-analysis/calculate - Manual trigger for sell analysis of all positions
router.post('/calculate', sellAnalysisController.calculateAllPositions.bind(sellAnalysisController));

// GET /api/v1/sell-analysis/history/:id - Get analysis history for a specific position
router.get('/history/:id', sellAnalysisController.getPositionHistory.bind(sellAnalysisController));

// POST /api/v1/sell-analysis/simulate - Simulate sell scenario for a position
router.post('/simulate', sellAnalysisController.simulateSell.bind(sellAnalysisController));

// PUT /api/v1/sell-analysis/alerts/:id/acknowledge - Acknowledge a specific alert
router.put('/alerts/:id/acknowledge', sellAnalysisController.acknowledgeAlert.bind(sellAnalysisController));

// GET /api/v1/sell-analysis/stats - Get service statistics
router.get('/stats', sellAnalysisController.getServiceStats.bind(sellAnalysisController));

// POST /api/v1/sell-analysis/cleanup - Trigger cleanup of old data
router.post('/cleanup', sellAnalysisController.triggerCleanup.bind(sellAnalysisController));

// GET /api/v1/sell-analysis/alerts/position/:id - Get all alerts for a specific position
router.get('/alerts/position/:id', sellAnalysisController.getPositionAlerts.bind(sellAnalysisController));

// GET /api/v1/sell-analysis/overview - Get overview of all positions with sell recommendations
router.get('/overview', sellAnalysisController.getOverview.bind(sellAnalysisController));

export default router;