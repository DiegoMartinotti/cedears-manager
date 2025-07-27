import { Request, Response } from 'express';
export declare class ClaudeController {
    /**
     * GET /api/claude/status
     * Obtiene el estado de los servicios de Claude
     */
    static getStatus(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/claude/analyze
     * Ejecuta un análisis técnico usando Claude
     */
    static analyze(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/claude/quick-analysis
     * Análisis rápido con configuración predeterminada
     */
    static quickAnalysis(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/claude/initialize
     * Inicializa los servicios de Claude
     */
    static initialize(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/claude/reset
     * Reinicia caché y contadores
     */
    static reset(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/claude/metrics
     * Obtiene métricas detalladas de performance
     */
    static getMetrics(req: Request, res: Response): Promise<void>;
}
