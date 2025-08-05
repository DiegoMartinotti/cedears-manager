import { Request, Response } from 'express';
export declare class TradeController {
    private tradeService;
    private commissionService;
    /**
     * GET /trades
     * Obtiene todas las operaciones con filtros opcionales
     */
    getTrades(req: Request, res: Response): Promise<void>;
    /**
     * GET /trades/:id
     * Obtiene una operación específica por ID
     */
    getTradeById(req: Request, res: Response): Promise<void>;
    /**
     * POST /trades
     * Crea una nueva operación con cálculo automático de comisiones
     */
    createTrade(req: Request, res: Response): Promise<void>;
    /**
     * PUT /trades/:id
     * Actualiza una operación existente
     */
    updateTrade(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /trades/:id
     * Elimina una operación
     */
    deleteTrade(req: Request, res: Response): Promise<void>;
    /**
     * POST /trades/calculate-commission
     * Calcula comisiones para una operación sin crearla
     */
    calculateCommission(req: Request, res: Response): Promise<void>;
    /**
     * POST /trades/project-commission
     * Proyecta el impacto total de comisiones (operación + custodia)
     */
    projectCommission(req: Request, res: Response): Promise<void>;
    /**
     * GET /trades/:id/analyze
     * Analiza una operación considerando inflación y comisiones
     */
    analyzeTrade(req: Request, res: Response): Promise<void>;
    /**
     * POST /trades/validate-diversification
     * Valida diversificación antes de una compra
     */
    validateDiversification(req: Request, res: Response): Promise<void>;
    /**
     * GET /trades/summary
     * Obtiene resumen de operaciones con métricas avanzadas
     */
    getTradesSummary(req: Request, res: Response): Promise<void>;
    /**
     * GET /trades/monthly-summary
     * Obtiene resumen mensual de operaciones
     */
    getMonthlyTradesSummary(req: Request, res: Response): Promise<void>;
    /**
     * GET /commissions/brokers
     * Obtiene configuraciones de comisiones disponibles
     */
    getBrokerConfigurations(req: Request, res: Response): Promise<void>;
    /**
     * POST /commissions/compare
     * Compara comisiones entre brokers
     */
    compareBrokerCommissions(req: Request, res: Response): Promise<void>;
    /**
     * GET /commissions/history
     * Analiza comisiones históricas
     */
    getCommissionHistory(req: Request, res: Response): Promise<void>;
    /**
     * POST /commissions/minimum-investment
     * Calcula inversión mínima recomendada para threshold de comisiones
     */
    getMinimumInvestmentRecommendation(req: Request, res: Response): Promise<void>;
    /**
     * Manejo centralizado de errores
     */
    private handleError;
}
