import { Request, Response } from 'express';
export declare class QuoteController {
    /**
     * GET /quotes/:symbol - Obtiene cotización de un símbolo específico
     */
    getQuote(req: Request, res: Response): Promise<void>;
    /**
     * POST /quotes/batch - Obtiene cotizaciones de múltiples símbolos
     */
    getBatchQuotes(req: Request, res: Response): Promise<void>;
    /**
     * GET /quotes/history/:symbol - Obtiene historial de cotizaciones
     */
    getQuoteHistory(req: Request, res: Response): Promise<void>;
    /**
     * GET /quotes/latest/:symbol - Obtiene última cotización desde DB
     */
    getLatestQuote(req: Request, res: Response): Promise<void>;
    /**
     * GET /quotes/watchlist - Obtiene cotizaciones de todos los instrumentos en watchlist
     */
    getWatchlistQuotes(req: Request, res: Response): Promise<void>;
    /**
     * POST /quotes/update - Ejecuta actualización manual de cotizaciones
     */
    updateQuotes(req: Request, res: Response): Promise<void>;
    /**
     * GET /quotes/market/hours - Obtiene información de horario de mercado
     */
    getMarketHours(req: Request, res: Response): Promise<void>;
    /**
     * GET /quotes/stats - Obtiene estadísticas del servicio de cotizaciones
     */
    getServiceStats(req: Request, res: Response): Promise<void>;
    /**
     * POST /quotes/job/config - Actualiza configuración del job
     */
    updateJobConfig(req: Request, res: Response): Promise<void>;
    /**
     * POST /quotes/cleanup - Ejecuta limpieza de cotizaciones antiguas
     */
    cleanupOldQuotes(req: Request, res: Response): Promise<void>;
    /**
     * POST /quotes/job/restart - Reinicia el job de actualización
     */
    restartJob(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /quotes/job/stats - Resetea estadísticas del job
     */
    resetJobStats(req: Request, res: Response): Promise<void>;
}
export declare const quoteController: QuoteController;
