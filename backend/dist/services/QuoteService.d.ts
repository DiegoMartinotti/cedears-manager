import { QuoteData, QuoteSearchFilters } from '../models/Quote.js';
export interface YahooQuoteData {
    symbol: string;
    regularMarketTime: Date;
    regularMarketPrice: number;
    regularMarketVolume?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketPreviousClose?: number;
}
export interface QuoteUpdateResult {
    success: boolean;
    symbol: string;
    price?: number;
    error?: string;
    cached?: boolean;
    source: string;
}
export interface MarketHours {
    isOpen: boolean;
    nextOpen?: Date;
    nextClose?: Date;
    timezone: string;
}
export declare class QuoteService {
    private quoteModel;
    private instrumentModel;
    private cache;
    private rateLimiter;
    private readonly MARKET_TIMEZONE;
    private readonly MARKET_OPEN_HOUR;
    private readonly MARKET_OPEN_MINUTE;
    private readonly MARKET_CLOSE_HOUR;
    private readonly MARKET_CLOSE_MINUTE;
    private readonly CACHE_TTL_MARKET_OPEN;
    private readonly CACHE_TTL_MARKET_CLOSED;
    private readonly CACHE_TTL_WEEKEND;
    constructor();
    /**
     * Obtiene cotización de un símbolo desde Yahoo Finance con cache
     */
    getQuote(symbol: string, forceRefresh?: boolean): Promise<QuoteUpdateResult>;
    /**
     * Obtiene cotizaciones de múltiples símbolos en lote
     */
    getBatchQuotes(symbols: string[], forceRefresh?: boolean): Promise<QuoteUpdateResult[]>;
    /**
     * Obtiene cotizaciones de todos los instrumentos activos
     */
    updateAllWatchlistQuotes(): Promise<QuoteUpdateResult[]>;
    /**
     * Obtiene historial de cotizaciones desde la base de datos
     */
    getQuoteHistory(symbol: string, filters?: Partial<QuoteSearchFilters>): Promise<QuoteData[]>;
    /**
     * Obtiene la última cotización de un símbolo desde la base de datos
     */
    getLatestQuote(symbol: string): Promise<QuoteData | null>;
    /**
     * Obtiene últimas cotizaciones de todos los instrumentos en watchlist
     */
    getWatchlistQuotes(): Promise<QuoteData[]>;
    /**
     * Verifica si el mercado está abierto
     */
    getMarketHours(): MarketHours;
    /**
     * Limpia cotizaciones antiguas (más de 30 días)
     */
    cleanupOldQuotes(daysToKeep?: number): Promise<number>;
    /**
     * Obtiene estadísticas del servicio
     */
    getServiceStats(): Promise<{
        quotes: {
            total: number;
            dateRange: {
                earliest: string | null;
                latest: string | null;
            };
        };
        cache: import("./cacheService.js").CacheStats;
        rateLimit: import("./rateLimitService.js").RateLimitStats;
        market: MarketHours;
    }>;
    /**
     * Obtiene cotización desde Yahoo Finance (método privado)
     */
    private fetchYahooQuote;
    /**
     * Guarda cotización en la base de datos
     */
    private saveQuoteToDatabase;
    /**
     * Calcula TTL adaptativo basado en horario de mercado
     */
    private getAdaptiveCacheTTL;
    /**
     * Cierra el servicio y libera recursos
     */
    shutdown(): void;
}
export declare const quoteService: QuoteService;
