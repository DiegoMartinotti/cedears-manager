import { Trade } from '../models/Trade.js';
import { Instrument } from '../models/Instrument.js';
import { UVA } from '../models/UVA.js';
import { CommissionService } from './CommissionService.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('TradeService');
export class TradeService {
    tradeModel = new Trade();
    instrumentModel = new Instrument();
    uvaModel = new UVA();
    commissionService = new CommissionService();
    /**
     * Calcula comisiones automáticamente para una operación
     */
    async calculateCommissions(type, totalAmount, config) {
        try {
            const calculation = this.commissionService.calculateOperationCommission(type, totalAmount, config);
            return {
                commission: calculation.totalCommission,
                taxes: calculation.ivaAmount,
                netAmount: calculation.netAmount
            };
        }
        catch (error) {
            logger.error('Error calculating commissions:', error);
            throw new Error(`Failed to calculate commissions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Crea una nueva operación con cálculos automáticos
     */
    async createTrade(data) {
        try {
            // Verificar que el instrumento existe
            const instrument = await this.instrumentModel.findById(data.instrument_id);
            if (!instrument) {
                throw new Error(`Instrument with ID ${data.instrument_id} not found`);
            }
            // Calcular comisiones automáticamente
            const commissions = await this.calculateCommissions(data.type, data.total_amount, data.commissionConfig);
            // Validar diversificación antes de crear la operación
            if (data.type === 'BUY') {
                const diversificationCheck = await this.validateDiversification(data.instrument_id, data.total_amount);
                if (!diversificationCheck.isValid) {
                    logger.warn('Diversification violations detected:', diversificationCheck.violations);
                    // En lugar de fallar, solo loggeamos las advertencias
                    // El usuario puede decidir continuar
                }
            }
            const tradeData = {
                ...data,
                commission: commissions.commission,
                taxes: commissions.taxes,
                net_amount: commissions.netAmount
            };
            const newTrade = await this.tradeModel.create(tradeData);
            logger.info(`Created ${data.type} trade:`, {
                id: newTrade.id,
                symbol: instrument.symbol,
                quantity: data.quantity,
                price: data.price,
                totalAmount: data.total_amount,
                commission: commissions.commission
            });
            return newTrade;
        }
        catch (error) {
            logger.error('Error creating trade:', error);
            throw error;
        }
    }
    /**
     * Analiza una operación existente considerando inflación y comisiones
     */
    async analyzeTrade(tradeId, currentPrice) {
        try {
            const trade = await this.tradeModel.findById(tradeId);
            if (!trade) {
                throw new Error(`Trade with ID ${tradeId} not found`);
            }
            if (trade.type !== 'BUY') {
                throw new Error('Trade analysis is only available for BUY trades');
            }
            const instrument = await this.instrumentModel.findById(trade.instrument_id);
            if (!instrument) {
                throw new Error(`Instrument not found for trade ${tradeId}`);
            }
            // Obtener valores UVA para ajuste por inflación
            const tradeDate = new Date(trade.trade_date);
            const today = new Date();
            const uvaAtTrade = await this.uvaModel.findByDate(trade.trade_date);
            const currentUva = await this.uvaModel.getLatest();
            if (!uvaAtTrade || !currentUva) {
                logger.warn('UVA data not available, using nominal values');
            }
            // Calcular costo ajustado por inflación
            const inflationAdjustedCost = uvaAtTrade && currentUva
                ? calculateInflationAdjustment(trade.net_amount, uvaAtTrade.value, currentUva.value)
                : trade.net_amount;
            // Calcular precio de break-even
            const totalCostPerShare = trade.net_amount / trade.quantity;
            const inflationAdjustedCostPerShare = inflationAdjustedCost / trade.quantity;
            // Estimar comisión de venta
            const estimatedSellPrice = currentPrice || trade.price * 1.1; // Estimación si no se proporciona precio
            const estimatedSellAmount = estimatedSellPrice * trade.quantity;
            const sellCommissions = await this.calculateCommissions('SELL', estimatedSellAmount);
            const breakEvenPrice = (inflationAdjustedCost + sellCommissions.commission) / trade.quantity;
            // Calcular ganancia real si se proporciona precio actual
            let realGainPercentage = 0;
            let netProfit = 0;
            let annualizedReturn = 0;
            if (currentPrice) {
                const currentValue = currentPrice * trade.quantity;
                const netCurrentValue = currentValue - sellCommissions.commission;
                netProfit = netCurrentValue - inflationAdjustedCost;
                realGainPercentage = (netProfit / inflationAdjustedCost) * 100;
                // Calcular rentabilidad anualizada
                const daysHeld = Math.max(1, Math.floor((today.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24)));
                const yearsHeld = daysHeld / 365.25;
                annualizedReturn = Math.pow(1 + (realGainPercentage / 100), 1 / yearsHeld) - 1;
            }
            const analysis = {
                breakEvenPrice,
                realGainPercentage,
                inflationAdjustedCost,
                totalCommissions: trade.commission + (sellCommissions?.commission || 0),
                netProfit,
                annualizedReturn: annualizedReturn * 100,
                daysHeld: currentPrice ? Math.floor((today.getTime() - tradeDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined
            };
            logger.info(`Analyzed trade ${tradeId}:`, analysis);
            return analysis;
        }
        catch (error) {
            logger.error('Error analyzing trade:', error);
            throw new Error(`Failed to analyze trade: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Valida la diversificación de la cartera antes de una compra
     */
    async validateDiversification(instrumentId, purchaseAmount) {
        try {
            // Obtener todas las posiciones actuales (compras - ventas)
            const allTrades = await this.tradeModel.findAllWithInstruments();
            // Calcular posiciones netas por instrumento
            const positions = new Map();
            for (const trade of allTrades) {
                const key = trade.instrument_id;
                const existing = positions.get(key) || {
                    symbol: trade.symbol || '',
                    netQuantity: 0,
                    netAmount: 0
                };
                if (trade.type === 'BUY') {
                    existing.netQuantity += trade.quantity;
                    existing.netAmount += trade.net_amount;
                }
                else {
                    existing.netQuantity -= trade.quantity;
                    existing.netAmount -= trade.net_amount;
                }
                positions.set(key, existing);
            }
            // Calcular valor total de la cartera incluyendo la nueva compra
            let totalPortfolioValue = purchaseAmount;
            for (const position of positions.values()) {
                if (position.netAmount > 0) {
                    totalPortfolioValue += position.netAmount;
                }
            }
            // Simular la nueva posición
            const newPosition = positions.get(instrumentId) || {
                symbol: '',
                netQuantity: 0,
                netAmount: 0
            };
            newPosition.netAmount += purchaseAmount;
            const violations = [];
            const warnings = [];
            const currentAllocations = [];
            // Validar límites de diversificación
            const MAX_SINGLE_POSITION = 0.15; // 15% máximo por posición
            const MAX_SECTOR_CONCENTRATION = 0.40; // 40% máximo por sector (simplificado)
            for (const [instrumentId, position] of positions.entries()) {
                if (position.netAmount <= 0)
                    continue;
                const allocation = position.netAmount / totalPortfolioValue;
                currentAllocations.push({
                    symbol: position.symbol,
                    allocation: allocation * 100,
                    limit: MAX_SINGLE_POSITION * 100
                });
                if (allocation > MAX_SINGLE_POSITION) {
                    violations.push(`${position.symbol} would represent ${(allocation * 100).toFixed(1)}% of portfolio (max: ${MAX_SINGLE_POSITION * 100}%)`);
                }
                else if (allocation > MAX_SINGLE_POSITION * 0.8) {
                    warnings.push(`${position.symbol} would represent ${(allocation * 100).toFixed(1)}% of portfolio (approaching 15% limit)`);
                }
            }
            // Validar número máximo de posiciones (simplificado)
            const activePositions = Array.from(positions.values()).filter(p => p.netAmount > 0).length;
            if (activePositions > 20) {
                warnings.push(`Portfolio has ${activePositions} positions (consider consolidating)`);
            }
            const isValid = violations.length === 0;
            logger.info('Diversification validation:', {
                isValid,
                violations: violations.length,
                warnings: warnings.length,
                totalValue: totalPortfolioValue,
                activePositions
            });
            return {
                isValid,
                violations,
                warnings,
                currentAllocations
            };
        }
        catch (error) {
            logger.error('Error validating diversification:', error);
            throw new Error(`Failed to validate diversification: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Obtiene el resumen de operaciones con métricas avanzadas
     */
    async getAdvancedSummary(instrumentId) {
        try {
            const basicSummary = await this.tradeModel.getTradesSummary(instrumentId);
            const trades = await this.tradeModel.findAllWithInstruments({ instrumentId });
            // Calcular métricas de performance
            const completedTrades = this.getCompletedTrades(trades);
            let totalRealizedGains = 0;
            let totalHoldingDays = 0;
            let winningTrades = 0;
            let bestTrade = 0;
            let worstTrade = 0;
            for (const completedTrade of completedTrades) {
                const gain = completedTrade.sellAmount - completedTrade.buyAmount;
                totalRealizedGains += gain;
                totalHoldingDays += completedTrade.holdingDays;
                if (gain > 0)
                    winningTrades++;
                if (gain > bestTrade)
                    bestTrade = gain;
                if (gain < worstTrade)
                    worstTrade = gain;
            }
            const averageHoldingPeriod = completedTrades.length > 0
                ? totalHoldingDays / completedTrades.length
                : 0;
            const winRate = completedTrades.length > 0
                ? (winningTrades / completedTrades.length) * 100
                : 0;
            // Calcular diversificación
            const diversificationValidation = await this.validateDiversification(0, 0); // Solo para obtener métricas
            const topAllocation = diversificationValidation.currentAllocations
                .sort((a, b) => b.allocation - a.allocation)[0];
            const concentrationRisk = topAllocation?.allocation > 20 ? 'HIGH'
                : topAllocation?.allocation > 10 ? 'MEDIUM'
                    : 'LOW';
            return {
                basic: basicSummary,
                performance: {
                    totalRealizedGains,
                    averageHoldingPeriod,
                    winRate,
                    bestTrade,
                    worstTrade
                },
                diversification: {
                    activePositions: diversificationValidation.currentAllocations.length,
                    topPosition: {
                        symbol: topAllocation?.symbol || '',
                        allocation: topAllocation?.allocation || 0
                    },
                    concentrationRisk
                }
            };
        }
        catch (error) {
            logger.error('Error getting advanced summary:', error);
            throw new Error(`Failed to get advanced summary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Métodos auxiliares privados
     */
    getCompletedTrades(trades) {
        // Implementación simplificada - agrupa compras y ventas por instrumento
        const tradesByInstrument = new Map();
        for (const trade of trades) {
            const existing = tradesByInstrument.get(trade.instrument_id) || [];
            existing.push(trade);
            tradesByInstrument.set(trade.instrument_id, existing);
        }
        const completedTrades = [];
        for (const [instrumentId, instrumentTrades] of tradesByInstrument.entries()) {
            const buys = instrumentTrades.filter(t => t.type === 'BUY').sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
            const sells = instrumentTrades.filter(t => t.type === 'SELL').sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
            // Emparejamiento simplificado FIFO
            let buyIndex = 0;
            let sellIndex = 0;
            while (buyIndex < buys.length && sellIndex < sells.length) {
                const buy = buys[buyIndex];
                const sell = sells[sellIndex];
                const buyDate = new Date(buy.trade_date);
                const sellDate = new Date(sell.trade_date);
                const holdingDays = Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
                completedTrades.push({
                    symbol: buy.symbol || '',
                    buyAmount: buy.net_amount,
                    sellAmount: sell.net_amount,
                    holdingDays
                });
                buyIndex++;
                sellIndex++;
            }
        }
        return completedTrades;
    }
    // Métodos de acceso directo al modelo Trade
    async findById(id) {
        return this.tradeModel.findById(id);
    }
    async findAll(filters) {
        return this.tradeModel.findAll(filters);
    }
    async findAllWithInstruments(filters) {
        return this.tradeModel.findAllWithInstruments(filters);
    }
    async update(id, data) {
        return this.tradeModel.update(id, data);
    }
    async delete(id) {
        return this.tradeModel.delete(id);
    }
    async getTradesSummary(instrumentId) {
        return this.tradeModel.getTradesSummary(instrumentId);
    }
    async getMonthlyTradesSummary(year) {
        return this.tradeModel.getMonthlyTradesSummary(year);
    }
}
//# sourceMappingURL=TradeService.js.map