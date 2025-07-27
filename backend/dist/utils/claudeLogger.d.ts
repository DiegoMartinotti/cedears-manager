/**
 * Métricas específicas para análisis de Claude
 */
export interface ClaudeMetrics {
    totalAnalyses: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    cacheHits: number;
    cacheMisses: number;
    rateLimitHits: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
    analysisConfidence: {
        high: number;
        medium: number;
        low: number;
    };
    recommendations: {
        buy: number;
        sell: number;
        hold: number;
    };
    instruments: Record<string, {
        analyses: number;
        avgConfidence: number;
        lastAnalysis: string;
    }>;
}
/**
 * Logger especializado para operaciones de Claude con métricas avanzadas
 */
export declare class ClaudeLogger {
    private logger;
    private metrics;
    private metricsFile;
    constructor();
    /**
     * Log inicio de análisis
     */
    analysisStarted(data: {
        requestId: string;
        instrumentCode?: string;
        promptLength: number;
        useCache: boolean;
        cacheKey?: string;
    }): void;
    /**
     * Log análisis completado exitosamente
     */
    analysisCompleted(data: {
        requestId: string;
        instrumentCode?: string;
        executionTime: number;
        confidence?: number;
        recommendation?: string;
        fromCache: boolean;
        cacheKey?: string;
    }): void;
    /**
     * Log análisis fallido
     */
    analysisFailed(data: {
        requestId: string;
        instrumentCode?: string;
        error: string;
        errorCode?: string;
        executionTime?: number;
        retryCount?: number;
    }): void;
    /**
     * Log hit de caché
     */
    cacheHit(data: {
        cacheKey: string;
        instrumentCode?: string;
        age: number;
    }): void;
    /**
     * Log miss de caché
     */
    cacheMiss(data: {
        cacheKey: string;
        instrumentCode?: string;
    }): void;
    /**
     * Log rate limit alcanzado
     */
    rateLimitHit(data: {
        reason: string;
        remainingMinute: number;
        remainingHour: number;
        waitTime?: number;
    }): void;
    /**
     * Log métricas de performance
     */
    performanceMetrics(data: {
        operation: string;
        duration: number;
        success: boolean;
        details?: any;
    }): void;
    /**
     * Log análisis de confianza baja
     */
    lowConfidenceWarning(data: {
        instrumentCode?: string;
        confidence: number;
        recommendation: string;
        reasoning?: string;
    }): void;
    /**
     * Obtiene métricas actuales
     */
    getMetrics(): ClaudeMetrics;
    /**
     * Obtiene estadísticas de performance
     */
    getPerformanceStats(): {
        successRate: number;
        cacheHitRate: number;
        averageExecutionTime: number;
        confidenceDistribution: {
            high: number;
            medium: number;
            low: number;
        };
        topInstruments: Array<{
            code: string;
            analyses: number;
            avgConfidence: number;
        }>;
    };
    /**
     * Reinicia métricas
     */
    resetMetrics(): void;
    /**
     * Exporta logs para análisis
     */
    exportLogs(fromDate: Date, toDate: Date): Promise<any[]>;
    /**
     * Crea formato personalizado para logs de Claude
     */
    private createClaudeFormat;
    /**
     * Inicializa estructura de métricas
     */
    private initializeMetrics;
    /**
     * Actualiza métricas de éxito
     */
    private updateSuccessMetrics;
    /**
     * Actualiza métricas de fallo
     */
    private updateFailureMetrics;
    /**
     * Carga métricas desde archivo
     */
    private loadMetrics;
    /**
     * Guarda métricas a archivo
     */
    private saveMetrics;
    /**
     * Cierra el logger y guarda métricas finales
     */
    shutdown(): void;
}
export declare const claudeLogger: ClaudeLogger;
