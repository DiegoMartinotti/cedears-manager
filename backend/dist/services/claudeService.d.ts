import { EventEmitter } from 'events';
export interface ClaudeAnalysisRequest {
    prompt: string;
    instrumentCode?: string;
    marketData?: any;
    context?: string;
}
export interface ClaudeAnalysisResponse {
    success: boolean;
    analysis?: string;
    confidence?: number;
    recommendation?: 'BUY' | 'SELL' | 'HOLD';
    reasoning?: string;
    error?: string;
    executionTime?: number;
}
export declare class ClaudeServiceError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class ClaudeService extends EventEmitter {
    private claudeCliPath;
    private isInitialized;
    private pendingRequests;
    constructor();
    /**
     * Inicializa el servicio y verifica la conexión con Claude CLI
     */
    initialize(): Promise<void>;
    /**
     * Verifica que Claude CLI esté disponible
     */
    private checkClaudeCliAvailability;
    /**
     * Ejecuta un análisis técnico usando Claude CLI
     */
    analyze(request: ClaudeAnalysisRequest): Promise<ClaudeAnalysisResponse>;
    /**
     * Ejecuta el comando de Claude CLI con el prompt dado
     */
    private executeClaudeCommand;
    /**
     * Construye el prompt completo para el análisis
     */
    private buildAnalysisPrompt;
    /**
     * Parsea la respuesta de Claude CLI
     */
    private parseClaudeResponse;
    /**
     * Verifica el estado del servicio
     */
    getStatus(): {
        initialized: boolean;
        pendingRequests: number;
    };
    /**
     * Cierra el servicio y limpia recursos
     */
    shutdown(): Promise<void>;
}
export declare const claudeService: ClaudeService;
