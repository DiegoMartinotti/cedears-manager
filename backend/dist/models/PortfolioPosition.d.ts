export interface PortfolioPositionData {
    id?: number;
    instrument_id: number;
    quantity: number;
    average_cost: number;
    total_cost: number;
    created_at?: string;
    updated_at?: string;
}
export interface PortfolioPositionWithInstrument extends PortfolioPositionData {
    symbol?: string;
    company_name?: string;
    current_price?: number;
    market_value?: number;
    unrealized_pnl?: number;
    unrealized_pnl_percentage?: number;
}
export declare class PortfolioPosition {
    private db;
    create(data: Omit<PortfolioPositionData, 'id' | 'created_at' | 'updated_at'>): Promise<PortfolioPositionData>;
    findById(id: number): Promise<PortfolioPositionData | null>;
    findByInstrumentId(instrumentId: number): Promise<PortfolioPositionData | null>;
    findAll(): Promise<PortfolioPositionData[]>;
    findAllWithInstruments(): Promise<PortfolioPositionWithInstrument[]>;
    update(id: number, data: Partial<Omit<PortfolioPositionData, 'id' | 'created_at'>>): Promise<PortfolioPositionData | null>;
    updateByInstrumentId(instrumentId: number, data: Partial<Omit<PortfolioPositionData, 'id' | 'instrument_id' | 'created_at'>>): Promise<PortfolioPositionData | null>;
    delete(id: number): Promise<boolean>;
    deleteByInstrumentId(instrumentId: number): Promise<boolean>;
    getTotalPortfolioValue(): Promise<{
        total_cost: number;
        market_value: number;
        unrealized_pnl: number;
    }>;
}
