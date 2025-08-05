import { Trade, TradeData, TradeWithInstrument } from '../models/Trade.js';
import { CommissionConfig } from './CommissionService.js';
export interface TradeAnalysis {
    breakEvenPrice: number;
    realGainPercentage: number;
    inflationAdjustedCost: number;
    totalCommissions: number;
    netProfit: number;
    annualizedReturn: number;
    daysHeld?: number;
}
export interface DiversificationValidation {
    isValid: boolean;
    violations: string[];
    warnings: string[];
    currentAllocations: Array<{
        symbol: string;
        allocation: number;
        limit: number;
    }>;
}
export declare class TradeService {
    private tradeModel;
    private instrumentModel;
    private uvaModel;
    private commissionService;
    /**
     * Calcula comisiones automáticamente para una operación
     */
    calculateCommissions(type: 'BUY' | 'SELL', totalAmount: number, config?: CommissionConfig): Promise<{
        commission: number;
        taxes: number;
        netAmount: number;
    }>;
    /**
     * Crea una nueva operación con cálculos automáticos
     */
    createTrade(data: Omit<TradeData, 'id' | 'created_at' | 'commission' | 'taxes' | 'net_amount'> & {
        commissionConfig?: CommissionConfig;
    }): Promise<TradeData>;
    /**
     * Analiza una operación existente considerando inflación y comisiones
     */
    analyzeTrade(tradeId: number, currentPrice?: number): Promise<TradeAnalysis>;
    /**
     * Valida la diversificación de la cartera antes de una compra
     */
    validateDiversification(instrumentId: number, purchaseAmount: number): Promise<DiversificationValidation>;
    /**
     * Obtiene el resumen de operaciones con métricas avanzadas
     */
    getAdvancedSummary(instrumentId?: number): Promise<{
        basic: Awaited<ReturnType<Trade['getTradesSummary']>>;
        performance: {
            totalRealizedGains: number;
            averageHoldingPeriod: number;
            winRate: number;
            bestTrade: number;
            worstTrade: number;
        };
        diversification: {
            activePositions: number;
            topPosition: {
                symbol: string;
                allocation: number;
            };
            concentrationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
        };
    }>;
    /**
     * Métodos auxiliares privados
     */
    private getCompletedTrades;
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
    getMonthlyTradesSummary(year?: number): Promise<{
        month: string;
        total_trades: number;
        buy_amount: number;
        sell_amount: number;
        net_amount: number;
    }[]>;
}
