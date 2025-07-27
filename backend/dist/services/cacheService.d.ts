export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    key: string;
}
export interface CacheStats {
    hits: number;
    misses: number;
    entries: number;
    memoryUsage: number;
}
/**
 * Servicio de caché en memoria con TTL para análisis de Claude
 */
export declare class CacheService {
    private cache;
    private defaultTTL;
    private maxEntries;
    private stats;
    private cleanupInterval;
    constructor(options?: {
        defaultTTL?: number;
        maxEntries?: number;
        cleanupIntervalMs?: number;
    });
    /**
     * Almacena un valor en el caché
     */
    set<T>(key: string, data: T, ttl?: number): void;
    /**
     * Obtiene un valor del caché
     */
    get<T>(key: string): T | null;
    /**
     * Verifica si existe una clave en el caché y no ha expirado
     */
    has(key: string): boolean;
    /**
     * Elimina una entrada específica del caché
     */
    delete(key: string): boolean;
    /**
     * Elimina todas las entradas del caché
     */
    clear(): void;
    /**
     * Genera una clave de caché para análisis de Claude
     */
    generateAnalysisKey(prompt: string, instrumentCode?: string, context?: string): string;
    /**
     * Almacena resultado de análisis de Claude con TTL específico
     */
    setAnalysis(key: string, analysis: any, ttlMinutes?: number): void;
    /**
     * Obtiene resultado de análisis de Claude desde caché
     */
    getAnalysis(key: string): any | null;
    /**
     * Limpia entradas expiradas del caché
     */
    cleanup(): number;
    /**
     * Obtiene estadísticas del caché
     */
    getStats(): CacheStats;
    /**
     * Obtiene información detallada del caché
     */
    getInfo(): {
        stats: CacheStats;
        config: {
            defaultTTL: number;
            maxEntries: number;
        };
        entries: Array<{
            key: string;
            age: number;
            ttl: number;
        }>;
    };
    /**
     * Inicia el temporizador de limpieza automática
     */
    private startCleanupTimer;
    /**
     * Elimina las entradas más antiguas cuando se alcanza el límite
     */
    private evictOldest;
    /**
     * Actualiza las estadísticas del caché
     */
    private updateStats;
    /**
     * Genera un hash simple de una cadena
     */
    private hashString;
    /**
     * Cierra el servicio y limpia recursos
     */
    shutdown(): void;
}
export declare const cacheService: CacheService;
