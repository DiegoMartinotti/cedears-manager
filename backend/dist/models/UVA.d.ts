export interface UVAData {
    id?: number;
    date: string;
    value: number;
    source?: string;
    created_at?: string;
    updated_at?: string;
}
export interface UVASearchFilters {
    fromDate?: string;
    toDate?: string;
    source?: string;
    limit?: number;
    orderBy?: 'date' | 'value';
    orderDirection?: 'ASC' | 'DESC';
}
export interface UVAInflationAdjustment {
    originalAmount: number;
    adjustedAmount: number;
    inflationRate: number;
    fromDate: string;
    toDate: string;
    fromUVA?: number;
    toUVA?: number;
}
export declare class UVA {
    private db;
    create(data: Omit<UVAData, 'id' | 'created_at' | 'updated_at'>): Promise<UVAData>;
    findById(id: number): Promise<UVAData | null>;
    findByDate(date: string): Promise<UVAData | null>;
    findLatest(): Promise<UVAData | null>;
    findLatestBefore(date: string): Promise<UVAData | null>;
    search(filters: UVASearchFilters): Promise<UVAData[]>;
    upsertUVA(data: Omit<UVAData, 'id' | 'created_at' | 'updated_at'>): Promise<UVAData>;
    batchUpsert(uvaValues: Omit<UVAData, 'id' | 'created_at' | 'updated_at'>[]): Promise<number>;
    getDateRange(): Promise<{
        earliest: string | null;
        latest: string | null;
    }>;
    getUVACount(): Promise<number>;
    deleteOldUVAValues(beforeDate: string): Promise<number>;
    /**
     * Calculate inflation adjustment between two dates using UVA values
     */
    calculateInflationAdjustment(amount: number, fromDate: string, toDate: string): Promise<UVAInflationAdjustment>;
    /**
     * Get historical inflation rates for a specific period
     */
    getInflationRates(fromDate: string, toDate: string, periodType?: 'monthly' | 'yearly'): Promise<{
        date: string;
        rate: number;
        uvaValue: number;
    }[]>;
}
