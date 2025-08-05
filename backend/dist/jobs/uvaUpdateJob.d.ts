export interface UVAJobConfig {
    enabled: boolean;
    schedule: string;
    businessDaysOnly: boolean;
    retryAttempts: number;
    retryDelayMs: number;
    historicalUpdateDays: number;
}
export interface UVAJobStats {
    lastRun: string | null;
    lastSuccess: string | null;
    lastError: string | null;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    valuesUpdated: number;
    averageExecutionTime: number;
    isRunning: boolean;
    lastUVAValue?: number;
    lastUVADate?: string;
}
export declare class UVAUpdateJob {
    private task;
    private cleanupTask;
    private config;
    private stats;
    private isRunning;
    private uvaService;
    constructor(config?: Partial<UVAJobConfig>);
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
    restart(newConfig?: Partial<UVAJobConfig>): void;
    /**
     * Ejecuta actualización manual inmediata
     */
    executeUpdate(): Promise<{
        success: boolean;
        message: string;
        stats?: any;
    }>;
    /**
     * Actualiza datos históricos recientes por si faltaron algunos días
     */
    private updateRecentHistoricalData;
    /**
     * Ejecuta actualización histórica masiva
     */
    updateHistoricalData(fromDate: string, toDate: string): Promise<{
        success: boolean;
        message: string;
        processedCount?: number;
    }>;
    /**
     * Ejecuta limpieza de valores UVA antiguos
     */
    cleanupOldUVAValues(daysToKeep?: number): Promise<{
        success: boolean;
        message: string;
        deletedCount?: number;
    }>;
    /**
     * Programa limpieza automática de valores UVA antiguos
     */
    private scheduleCleanup;
    /**
     * Obtiene estadísticas del job
     */
    getStats(): UVAJobStats;
    /**
     * Obtiene configuración actual
     */
    getConfig(): UVAJobConfig;
    /**
     * Actualiza configuración
     */
    updateConfig(newConfig: Partial<UVAJobConfig>): void;
    /**
     * Resetea estadísticas
     */
    resetStats(): void;
    /**
     * Determina si el job debe ejecutarse hoy
     */
    private shouldRunToday;
    /**
     * Actualiza el tiempo promedio de ejecución
     */
    private updateAverageExecutionTime;
    /**
     * Obtiene estadísticas de la base de datos UVA
     */
    getUVADatabaseStats(): Promise<any>;
    /**
     * Cierra el job y libera recursos
     */
    shutdown(): void;
}
export declare const uvaUpdateJob: UVAUpdateJob;
