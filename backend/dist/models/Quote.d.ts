import { InstrumentData } from './Instrument.js';
export interface QuoteData {
    id?: number;
    instrument_id: number;
    price: number;
    volume?: number;
    high?: number;
    low?: number;
    close?: number;
    quote_date: string;
    quote_time?: string;
    source?: string;
    created_at?: string;
}
export interface QuoteWithInstrument extends QuoteData {
    instrument?: InstrumentData;
}
export interface QuoteSearchFilters {
    instrumentId?: number;
    symbol?: string;
    fromDate?: string;
    toDate?: string;
    source?: string;
    limit?: number;
    orderBy?: 'date' | 'price';
    orderDirection?: 'ASC' | 'DESC';
}
export declare class Quote {
    private db;
    create(data: Omit<QuoteData, 'id' | 'created_at'>): Promise<QuoteData>;
    findById(id: number): Promise<QuoteData | null>;
    findByInstrumentId(instrumentId: number, limit?: number): Promise<QuoteData[]>;
    findBySymbol(symbol: string, limit?: number): Promise<QuoteWithInstrument[]>;
    search(filters: QuoteSearchFilters): Promise<QuoteWithInstrument[]>;
    getLatestQuote(instrumentId: number): Promise<QuoteData | null>;
    getLatestQuoteBySymbol(symbol: string): Promise<QuoteWithInstrument | null>;
    upsertQuote(data: Omit<QuoteData, 'id' | 'created_at'>): Promise<QuoteData>;
    batchUpsert(quotes: Omit<QuoteData, 'id' | 'created_at'>[]): Promise<number>;
    deleteOldQuotes(beforeDate: string): Promise<number>;
    getQuoteCount(): Promise<number>;
    getDateRange(): Promise<{
        earliest: string | null;
        latest: string | null;
    }>;
    getWatchlistQuotes(limit?: number): Promise<QuoteWithInstrument[]>;
}
