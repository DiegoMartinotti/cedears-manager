export interface InstrumentData {
    id?: number;
    symbol: string;
    company_name: string;
    sector?: string;
    industry?: string;
    market_cap?: number;
    is_esg_compliant?: boolean;
    is_vegan_friendly?: boolean;
    underlying_symbol?: string;
    underlying_currency?: string;
    ratio?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}
export declare class SimpleInstrument {
    create(data: Omit<InstrumentData, 'id' | 'created_at' | 'updated_at'>): Promise<InstrumentData>;
    findById(id: number): Promise<InstrumentData | null>;
    findBySymbol(symbol: string): Promise<InstrumentData | null>;
    findAll(filters?: {
        isActive?: boolean;
        isESG?: boolean;
        isVegan?: boolean;
        sector?: string;
    }): Promise<InstrumentData[]>;
    update(id: number, data: Partial<Omit<InstrumentData, 'id' | 'created_at'>>): Promise<InstrumentData | null>;
    delete(id: number): Promise<boolean>;
    getESGInstruments(): Promise<InstrumentData[]>;
    getVeganInstruments(): Promise<InstrumentData[]>;
    searchByName(searchTerm: string): Promise<InstrumentData[]>;
}
