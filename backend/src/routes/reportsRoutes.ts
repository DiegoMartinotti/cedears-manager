import { Router } from 'express';
import { ReportsController } from '../controllers/ReportsController';

const router = Router();
const reportsController = new ReportsController();

// Main report generation endpoints
router.get('/dashboard', reportsController.getDashboard.bind(reportsController));
router.get('/impact-analysis', reportsController.getImpactAnalysis.bind(reportsController));
router.get('/commission-comparison', reportsController.getCommissionComparison.bind(reportsController));
router.get('/annual/:year', reportsController.getAnnualReport.bind(reportsController));

// Custom report generation
router.post('/generate', reportsController.generateCustomReport.bind(reportsController));

// Export functionality
router.post('/export', reportsController.exportReport.bind(reportsController));
router.get('/export/history', reportsController.getExportHistory.bind(reportsController));
router.get('/export/statistics', reportsController.getExportStatistics.bind(reportsController));
router.get('/export/:id/download', reportsController.downloadExport.bind(reportsController));
router.delete('/export/cleanup', reportsController.cleanupExpiredExports.bind(reportsController));

// Tax specific endpoints
router.get('/tax-export/:year', reportsController.getTaxExportData.bind(reportsController));

// Health check
router.get('/health', reportsController.getReportsHealth.bind(reportsController));

export default router;