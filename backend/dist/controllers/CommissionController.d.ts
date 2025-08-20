import { Request, Response } from 'express';
export declare class CommissionController {
    private commissionService;
    /**
     * GET /api/v1/commissions/configs
     * Obtiene todas las configuraciones de comisiones disponibles
     */
    getCommissionConfigs(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/commissions/config
     * Guarda o actualiza una configuración de comisiones personalizada
     */
    saveCommissionConfig(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/commissions/active
     * Obtiene la configuración de comisiones activa
     */
    getActiveConfig(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/commissions/calculate
     * Calcula comisiones para una operación específica
     */
    calculateCommission(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/v1/commissions/analysis
     * Análisis histórico de comisiones
     */
    analyzeCommissions(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/commissions/compare
     * Compara comisiones entre brokers
     */
    compareBrokers(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/v1/commissions/minimum-investment
     * Calcula el monto mínimo de inversión recomendado
     */
    calculateMinimumInvestment(req: Request, res: Response): Promise<void>;
    /**
     * PUT /api/v1/commissions/active/:broker
     * Establece una configuración como activa
     */
    setActiveConfig(req: Request, res: Response): Promise<void>;
}
