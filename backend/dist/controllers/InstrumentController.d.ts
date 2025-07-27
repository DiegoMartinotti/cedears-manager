import { Request, Response } from 'express';
export declare class InstrumentController {
    private instrumentService;
    createInstrument(req: Request, res: Response): Promise<void>;
    getInstrument(req: Request, res: Response): Promise<void>;
    getAllInstruments(req: Request, res: Response): Promise<void>;
    updateInstrument(req: Request, res: Response): Promise<void>;
    deleteInstrument(req: Request, res: Response): Promise<void>;
    getESGInstruments(req: Request, res: Response): Promise<void>;
    getVeganInstruments(req: Request, res: Response): Promise<void>;
    searchInstruments(req: Request, res: Response): Promise<void>;
    toggleESGCompliance(req: Request, res: Response): Promise<void>;
    toggleVeganFriendly(req: Request, res: Response): Promise<void>;
    bulkCreateInstruments(req: Request, res: Response): Promise<void>;
}
