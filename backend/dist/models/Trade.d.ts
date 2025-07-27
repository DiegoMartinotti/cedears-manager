export interface TradeData {
    id?: number;
    instrument_id: number;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    total_amount: number;
    commission?: number;
    taxes?: number;
    net_amount: number;
    trade_date: string;
    settlement_date?: string;
    notes?: string;
    created_at?: string;
}
export interface TradeWithInstrument extends TradeData {
    symbol?: string;
    company_name?: string;
}
export declare class Trade {
    private db;
    create(data: Omit<TradeData, 'id' | 'created_at'>): Promise<TradeData>;
    findById(id: number): Promise<TradeData | null>;
    findAll(filters?: {
        instrumentId?: number;
        type?: 'BUY' | 'SELL';
        fromDate?: string;
        toDate?: string;
        limit?: number;
        offset?: number;
    }): Promise<TradeData[]>;
    findAllWithInstruments(filters?: {
        instrumentId?: number;
        type?: 'BUY' | 'SELL';
        fromDate?: string;
        toDate?: string;
        limit?: number;
        offset?: number;
    }): Promise<TradeWithInstrument[]>;
    findByInstrumentId(instrumentId: number, limit?: number): Promise<TradeData[]>;
    update(id: number, data: Partial<Omit<TradeData, 'id' | 'created_at'>>): Promise<TradeData | null>;
    delete(id: number): Promise<boolean>;
    getTradesSummary(instrumentId?: number): Promise<{
        total_trades: number;
        total_buys: number;
        total_sells: number;
        total_buy_amount: number;
        total_sell_amount: number;
        total_commission: number;
        total_taxes: number;
    }>;
    getMonthlyTradesSummary(year?: number): Promise<Array<{
        month: string;
        total_trades: number;
        buy_amount: number;
        sell_amount: number;
        net_amount: number;
    }>>;
}
