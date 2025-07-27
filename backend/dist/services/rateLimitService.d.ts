export interface RateLimitConfig {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxConcurrentRequests: number;
}
export interface RateLimitStatus {
    allowed: boolean;
    reason?: string;
    remainingMinute: number;
    remainingHour: number;
    resetTimeMinute: number;
    resetTimeHour: number;
    currentConcurrent: number;
}
export interface RateLimitStats {
    totalRequests: number;
    rejectedRequests: number;
    currentMinuteRequests: number;
    currentHourRequests: number;
    currentConcurrentRequests: number;
    resetTimes: {
        minute: number;
        hour: number;
    };
}
/**
 * Servicio de rate limiting para controlar llamadas a Claude
 */
export declare class RateLimitService {
    private config;
    private minuteRequests;
    private hourRequests;
    private concurrentRequests;
    private stats;
    private cleanupInterval;
    constructor(config?: Partial<RateLimitConfig>);
    /**
     * Verifica si una solicitud puede proceder
     */
    checkLimit(requestId?: string): RateLimitStatus;
    /**
     * Inicia el seguimiento de una solicitud
     */
    startRequest(requestId?: string): string;
    /**
     * Finaliza el seguimiento de una solicitud
     */
    endRequest(requestId: string): void;
    /**
     * Wrapper para ejecutar una función con rate limiting
     */
    executeWithLimit<T>(fn: () => Promise<T>, requestId?: string): Promise<T>;
    /**
     * Obtiene estadísticas actuales
     */
    getStats(): RateLimitStats;
    /**
     * Obtiene la configuración actual
     */
    getConfig(): RateLimitConfig;
    /**
     * Actualiza la configuración
     */
    updateConfig(newConfig: Partial<RateLimitConfig>): void;
    /**
     * Reinicia todos los contadores
     */
    reset(): void;
    /**
     * Limpia registros antiguos
     */
    private cleanup;
    /**
     * Inicia el temporizador de limpieza automática
     */
    private startCleanupTimer;
    /**
     * Calcula el tiempo de reset del próximo minuto
     */
    private getNextMinuteReset;
    /**
     * Calcula el tiempo de reset de la próxima hora
     */
    private getNextHourReset;
    /**
     * Genera un ID único para solicitudes
     */
    private generateRequestId;
    /**
     * Cierra el servicio y limpia recursos
     */
    shutdown(): void;
}
export declare const rateLimitService: RateLimitService;
