import { UVAData, UVAInflationAdjustment } from '../models/UVA.js';
export interface UVAUpdateResult {
    success: boolean;
    date: string;
    value?: number;
    error?: string;
    cached?: boolean;
    source: 'bcra' | 'estadisticas' | 'cache';
}
export interface UVAHistoricalData {
    date: string;
    value: number;
    source: string;
}
export declare class UVAService {
    private uvaModel;
    private cache;
    private rateLimiter;
    private readonly BCRA_UVA_URL;
    private readonly ESTADISTICAS_BCRA_API;
    private readonly CACHE_TTL_MINUTES;
    private readonly RATE_LIMIT_PER_MINUTE;
    constructor();
    /**
     * Obtiene el valor UVA más reciente desde cualquier fuente disponible
     */
    getLatestUVAValue(): Promise<UVAUpdateResult>;
    /**
     * Scraping del sitio web del BCRA para obtener valor UVA
     */
    private fetchUVAFromBCRA;
    /**
     * Obtiene valor UVA desde la API de estadisticasbcra.com
     */
    private fetchUVAFromEstadisticas;
    /**
     * Actualiza valores UVA históricos para un rango de fechas
     */
    updateHistoricalUVAValues(fromDate: string, toDate: string): Promise<{
        success: boolean;
        processedCount: number;
        errors: string[];
    }>;
    /**
     * Obtiene datos históricos UVA desde API estadisticasbcra
     */
    private fetchHistoricalUVAFromEstadisticas;
    /**
     * Calcula ajuste por inflación entre dos fechas
     */
    calculateInflationAdjustment(amount: number, fromDate: string, toDate: string): Promise<UVAInflationAdjustment>;
    /**
     * Obtiene valor UVA desde cache
     */
    private getCachedUVAValue;
    /**
     * Guarda valor UVA en cache
     */
    private setCachedUVAValue;
    /**
     * Obtiene estadísticas de valores UVA almacenados
     */
    getUVAStatistics(): Promise<{
        totalCount: number;
        dateRange: {
            earliest: string | null;
            latest: string | null;
        };
        sources: {
            [key: string]: number;
        };
        latestValue?: UVAData;
    }>;
    /**
     * Limpia valores UVA antiguos para mantener el rendimiento
     */
    cleanupOldUVAValues(keepDays?: number): Promise<number>;
}
