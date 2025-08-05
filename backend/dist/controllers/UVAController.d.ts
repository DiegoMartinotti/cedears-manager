import { Request, Response } from 'express';
export declare class UVAController {
    private uvaService;
    /**
     * GET /uva/latest - Obtiene el valor UVA más reciente
     */
    getLatest(req: Request, res: Response): Promise<void>;
    /**
     * GET /uva/date/:date - Obtiene valor UVA para una fecha específica
     */
    getByDate(req: Request, res: Response): Promise<void>;
    /**
     * GET /uva/search - Busca valores UVA con filtros
     */
    search(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/inflation-adjustment - Calcula ajuste por inflación
     */
    calculateInflationAdjustment(req: Request, res: Response): Promise<void>;
    /**
     * GET /uva/statistics - Obtiene estadísticas de valores UVA
     */
    getStatistics(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/update - Fuerza actualización manual de UVA
     */
    forceUpdate(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/historical-update - Actualiza datos históricos
     */
    updateHistorical(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /uva/cleanup - Limpia valores UVA antiguos
     */
    cleanup(req: Request, res: Response): Promise<void>;
    /**
     * GET /uva/job/status - Obtiene estado del job de actualización
     */
    getJobStatus(req: Request, res: Response): Promise<void>;
    /**
     * PUT /uva/job/config - Actualiza configuración del job
     */
    updateJobConfig(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/job/start - Inicia el job de actualización
     */
    startJob(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/job/stop - Detiene el job de actualización
     */
    stopJob(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/job/restart - Reinicia el job de actualización
     */
    restartJob(req: Request, res: Response): Promise<void>;
    /**
     * POST /uva/job/reset-stats - Resetea estadísticas del job
     */
    resetJobStats(req: Request, res: Response): Promise<void>;
}
export declare const uvaController: UVAController;
