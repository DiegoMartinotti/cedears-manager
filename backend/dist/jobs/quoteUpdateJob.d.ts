export interface JobConfig {
    enabled: boolean;
    schedule: string;
    marketHoursOnly: boolean;
    batchSize: number;
    retryAttempts: number;
    retryDelayMs: number;
}
export interface JobStats {
    lastRun: string | null;
    lastSuccess: string | null;
    lastError: string | null;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    quotesUpdated: number;
    averageExecutionTime: number;
    isRunning: boolean;
}
export declare class QuoteUpdateJob {
    private task;
    private config;
    private stats;
    private isRunning;
    constructor(config?: Partial<JobConfig>);
    /**
     * Inicia el job programado
     */
    start(): void;
    /**
     * Detiene el job programado
     */
    stop(): void;
    /**
     * Reinicia el job con nueva configuración
     */
    restart(newConfig?: Partial<JobConfig>): void;
    /**
     * Ejecuta actualización manual inmediata
     */
    executeUpdate(): Promise<{
        success: boolean;
        message: string;
        stats?: any;
    }>;
    /**
     * Ejecuta limpieza de cotizaciones antiguas
     */
    cleanupOldQuotes(daysToKeep?: number): Promise<{
        success: boolean;
        message: string;
        deletedCount?: number;
    }>;
    /**
     * Programa limpieza automática de cotizaciones antiguas
     */
    scheduleCleanup(schedule?: string): void;
    /**
     * Obtiene estadísticas del job
     */
    getStats(): JobStats;
    /**
     * Obtiene configuración actual
     */
    getConfig(): JobConfig;
    /**
     * Actualiza configuración
     */
    updateConfig(newConfig: Partial<JobConfig>): void;
    /**
     * Resetea estadísticas
     */
    resetStats(): void;
    /**
     * Determina si el job debe ejecutarse ahora
     */
    private shouldRunNow;
    /**
     * Actualiza el tiempo promedio de ejecución
     */
    private updateAverageExecutionTime;
    /**
     * Cierra el job y libera recursos
     */
    shutdown(): void;
}
export declare const quoteUpdateJob: QuoteUpdateJob;
