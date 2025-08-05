import { DashboardService } from '../services/DashboardService.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('DashboardController');
export class DashboardController {
    dashboardService = new DashboardService();
    /**
     * GET /api/dashboard/summary
     * Obtiene el resumen completo del dashboard
     */
    async getDashboardSummary(req, res) {
        try {
            logger.info('Getting dashboard summary');
            const summary = await this.dashboardService.getDashboardSummary();
            res.json({
                success: true,
                data: summary,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error getting dashboard summary:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get dashboard summary',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * GET /api/dashboard/portfolio-summary
     * Obtiene solo el resumen del portfolio
     */
    async getPortfolioSummary(req, res) {
        try {
            logger.info('Getting portfolio summary');
            const portfolioSummary = await this.dashboardService.getPortfolioSummary();
            res.json({
                success: true,
                data: portfolioSummary,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error getting portfolio summary:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get portfolio summary',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * GET /api/dashboard/positions
     * Obtiene las posiciones actuales
     */
    async getCurrentPositions(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 20;
            logger.info(`Getting current positions (limit: ${limit})`);
            const positions = await this.dashboardService.getCurrentPositions(limit);
            res.json({
                success: true,
                data: positions,
                meta: {
                    total: positions.length,
                    limit
                },
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error getting current positions:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get current positions',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * GET /api/dashboard/market-summary
     * Obtiene el resumen del mercado
     */
    async getMarketSummary(req, res) {
        try {
            logger.info('Getting market summary');
            const marketSummary = await this.dashboardService.getMarketSummary();
            res.json({
                success: true,
                data: marketSummary,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error getting market summary:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get market summary',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * GET /api/dashboard/performance
     * Obtiene las métricas de performance
     */
    async getPerformanceMetrics(req, res) {
        try {
            logger.info('Getting performance metrics');
            const performanceMetrics = await this.dashboardService.getPerformanceMetrics();
            res.json({
                success: true,
                data: performanceMetrics,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error getting performance metrics:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get performance metrics',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * GET /api/dashboard/distribution
     * Obtiene los datos de distribución para gráficos
     */
    async getDistributionData(req, res) {
        try {
            logger.info('Getting distribution data');
            const distributionData = await this.dashboardService.getDistributionData();
            res.json({
                success: true,
                data: distributionData,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error getting distribution data:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get distribution data',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * GET /api/dashboard/health
     * Endpoint de health check para el dashboard
     */
    async getHealthCheck(req, res) {
        try {
            logger.debug('Dashboard health check');
            // Verificar que los servicios principales estén funcionando
            const healthChecks = await Promise.allSettled([
                this.dashboardService.getPortfolioSummary(),
                // Podrían agregarse más verificaciones específicas aquí
            ]);
            const isHealthy = healthChecks.every(result => result.status === 'fulfilled');
            const response = {
                success: true,
                data: {
                    status: isHealthy ? 'healthy' : 'degraded',
                    services: {
                        portfolio: healthChecks[0].status === 'fulfilled' ? 'up' : 'down'
                    },
                    timestamp: new Date().toISOString()
                }
            };
            res.status(isHealthy ? 200 : 503).json(response);
        }
        catch (error) {
            logger.error('Error in dashboard health check:', error);
            res.status(500).json({
                success: false,
                data: {
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * POST /api/dashboard/refresh
     * Fuerza la actualización de datos del dashboard
     */
    async refreshDashboard(req, res) {
        try {
            logger.info('Refreshing dashboard data');
            // Aquí se podrían limpiar caches, actualizar cotizaciones, etc.
            const summary = await this.dashboardService.getDashboardSummary();
            res.json({
                success: true,
                data: summary,
                message: 'Dashboard data refreshed successfully',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            logger.error('Error refreshing dashboard:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to refresh dashboard',
                    details: error instanceof Error ? error.message : String(error)
                },
                timestamp: new Date().toISOString()
            });
        }
    }
}
// Export singleton instance
export const dashboardController = new DashboardController();
//# sourceMappingURL=DashboardController.js.map