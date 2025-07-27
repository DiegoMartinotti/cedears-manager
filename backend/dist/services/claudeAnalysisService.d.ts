import { ClaudeAnalysisRequest, ClaudeAnalysisResponse } from './claudeService.js';
export interface AnalysisOptions {
    useCache?: boolean;
    cacheTTLMinutes?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
    priority?: 'low' | 'normal' | 'high';
}
export interface EnhancedAnalysisResponse extends ClaudeAnalysisResponse {
    fromCache?: boolean;
    rateLimitStatus?: any;
    retryCount?: number;
    cacheKey?: string;
}
/**
 * Servicio principal para análisis con Claude que integra cache, rate limiting y manejo de errores
 */
export declare class ClaudeAnalysisService {
    private isInitialized;
    private retryDelays;
    constructor();
    /**
     * Inicializa todos los servicios dependientes
     */
    initialize(): Promise<void>;
    /**
     * Ejecuta un análisis técnico con todas las protecciones
     */
    analyze(request: ClaudeAnalysisRequest, options?: AnalysisOptions): Promise<EnhancedAnalysisResponse>;
    /**
     * Análisis simple para casos básicos
     */
    quickAnalysis(prompt: string, instrumentCode?: string): Promise<EnhancedAnalysisResponse>;
    /**
     * Análisis detallado con datos de mercado
     */
    detailedAnalysis(request: ClaudeAnalysisRequest, marketData?: any): Promise<EnhancedAnalysisResponse>;
    /**
     * Obtiene estadísticas de todos los servicios
     */
    getServiceStats(): {
        claude: any;
        cache: any;
        rateLimit: any;
        analysis: {
            initialized: boolean;
        };
    };
    /**
     * Obtiene información detallada del sistema
     */
    getSystemInfo(): any;
    /**
     * Limpia cachés y reinicia contadores
     */
    reset(): Promise<void>;
    /**
     * Determina si un error es recuperable
     */
    private shouldRetry;
    /**
     * Calcula tiempo de espera basado en rate limiting
     */
    private calculateWaitTime;
    /**
     * Función helper para esperar
     */
    private sleep;
    /**
     * Cierra todos los servicios
     */
    shutdown(): Promise<void>;
}
export declare const claudeAnalysisService: ClaudeAnalysisService;
