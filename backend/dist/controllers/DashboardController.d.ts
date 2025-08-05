import { Request, Response } from 'express';
export declare class DashboardController {
    private dashboardService;
    /**
     * GET /api/dashboard/summary
     * Obtiene el resumen completo del dashboard
     */
    getDashboardSummary(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/dashboard/portfolio-summary
     * Obtiene solo el resumen del portfolio
     */
    getPortfolioSummary(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/dashboard/positions
     * Obtiene las posiciones actuales
     */
    getCurrentPositions(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/dashboard/market-summary
     * Obtiene el resumen del mercado
     */
    getMarketSummary(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/dashboard/performance
     * Obtiene las métricas de performance
     */
    getPerformanceMetrics(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/dashboard/distribution
     * Obtiene los datos de distribución para gráficos
     */
    getDistributionData(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/dashboard/health
     * Endpoint de health check para el dashboard
     */
    getHealthCheck(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/dashboard/refresh
     * Fuerza la actualización de datos del dashboard
     */
    refreshDashboard(req: Request, res: Response): Promise<void>;
}
export declare const dashboardController: DashboardController;
