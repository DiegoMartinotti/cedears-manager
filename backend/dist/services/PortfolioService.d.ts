import { PortfolioPositionData, PortfolioPositionWithInstrument } from '../models/PortfolioPosition.js';
import { TradeData } from '../models/Trade.js';
import type { PortfolioPositionCreateInput, PortfolioPositionUpdateInput } from '../schemas/portfolio.schema.js';
import type { TradeCreateInput } from '../schemas/trade.schema.js';
export declare class PortfolioService {
    private portfolioModel;
    private tradeModel;
    private instrumentService;
    getPortfolioPositions(): Promise<PortfolioPositionWithInstrument[]>;
    getPortfolioPosition(id: number): Promise<PortfolioPositionData>;
    getPortfolioPositionByInstrument(instrumentId: number): Promise<PortfolioPositionData | null>;
    createPortfolioPosition(data: PortfolioPositionCreateInput): Promise<PortfolioPositionData>;
    updatePortfolioPosition(id: number, data: PortfolioPositionUpdateInput): Promise<PortfolioPositionData>;
    deletePortfolioPosition(id: number): Promise<void>;
    processTradeAndUpdatePosition(tradeData: TradeCreateInput): Promise<{
        trade: TradeData;
        position: PortfolioPositionData;
    }>;
    private calculateNewPosition;
    getPortfolioSummary(): Promise<{
        total_positions: number;
        total_cost: number;
        market_value: number;
        unrealized_pnl: number;
        unrealized_pnl_percentage: number;
    }>;
    getPortfolioPerformance(): Promise<Array<{
        symbol: string;
        company_name: string;
        quantity: number;
        average_cost: number;
        current_price: number;
        market_value: number;
        unrealized_pnl: number;
        unrealized_pnl_percentage: number;
        weight_percentage: number;
    }>>;
    closePosition(instrumentId: number): Promise<void>;
    rebalancePortfolio(targetAllocations: Array<{
        instrument_id: number;
        target_percentage: number;
    }>): Promise<Array<{
        instrument_id: number;
        symbol: string;
        current_percentage: number;
        target_percentage: number;
        rebalance_amount: number;
        action: 'BUY' | 'SELL' | 'HOLD';
    }>>;
}
