import { Request, Response } from 'express';
export declare class PortfolioController {
    private portfolioService;
    getPortfolioPositions(req: Request, res: Response): Promise<void>;
    getPortfolioPosition(req: Request, res: Response): Promise<void>;
    getPortfolioPositionByInstrument(req: Request, res: Response): Promise<void>;
    createPortfolioPosition(req: Request, res: Response): Promise<void>;
    updatePortfolioPosition(req: Request, res: Response): Promise<void>;
    deletePortfolioPosition(req: Request, res: Response): Promise<void>;
    processTradeAndUpdatePosition(req: Request, res: Response): Promise<void>;
    getPortfolioSummary(req: Request, res: Response): Promise<void>;
    getPortfolioPerformance(req: Request, res: Response): Promise<void>;
    closePosition(req: Request, res: Response): Promise<void>;
    calculateRebalancing(req: Request, res: Response): Promise<void>;
}
