import { createLogger } from '../utils/logger.js';
import { Trade } from '../models/Trade.js';
const logger = createLogger('CommissionService');
export class CommissionService {
    constructor() {
        this.tradeModel = new Trade();
        // Configuraciones predefinidas de comisiones por broker
        this.brokerConfigs = {
            'galicia': {
                name: 'Banco Galicia',
                broker: 'galicia',
                isActive: true,
                buy: {
                    percentage: 0.005, // 0.5%
                    minimum: 150, // $150 ARS
                    iva: 0.21 // 21%
                },
                sell: {
                    percentage: 0.005,
                    minimum: 150,
                    iva: 0.21
                },
                custody: {
                    exemptAmount: 1000000, // $1M ARS exento
                    monthlyPercentage: 0.0025, // 0.25% mensual
                    monthlyMinimum: 500, // $500 ARS mínimo
                    iva: 0.21
                }
            },
            'santander': {
                name: 'Banco Santander',
                broker: 'santander',
                isActive: true,
                buy: {
                    percentage: 0.006, // 0.6%
                    minimum: 200,
                    iva: 0.21
                },
                sell: {
                    percentage: 0.006,
                    minimum: 200,
                    iva: 0.21
                },
                custody: {
                    exemptAmount: 500000,
                    monthlyPercentage: 0.003, // 0.3% mensual
                    monthlyMinimum: 600,
                    iva: 0.21
                }
            },
            'macro': {
                name: 'Banco Macro',
                broker: 'macro',
                isActive: true,
                buy: {
                    percentage: 0.0055, // 0.55%
                    minimum: 180,
                    iva: 0.21
                },
                sell: {
                    percentage: 0.0055,
                    minimum: 180,
                    iva: 0.21
                },
                custody: {
                    exemptAmount: 800000,
                    monthlyPercentage: 0.0028,
                    monthlyMinimum: 450,
                    iva: 0.21
                }
            }
        };
        this.defaultConfig = this.brokerConfigs['galicia'];
    }
    /**
     * Calcula comisiones para una operación específica
     */
    calculateOperationCommission(type, totalAmount, config) {
        try {
            const commissionConfig = config || this.defaultConfig;
            const operationConfig = type === 'BUY' ? commissionConfig.buy : commissionConfig.sell;
            // Calcular comisión base
            const percentageCommission = totalAmount * operationConfig.percentage;
            const baseCommission = Math.max(percentageCommission, operationConfig.minimum);
            const minimumApplied = percentageCommission < operationConfig.minimum;
            // Calcular IVA
            const ivaAmount = baseCommission * operationConfig.iva;
            const totalCommission = baseCommission + ivaAmount;
            // Calcular monto neto (para compras se suma, para ventas se resta)
            const netAmount = type === 'BUY'
                ? totalAmount + totalCommission
                : totalAmount - totalCommission;
            const calculation = {
                baseCommission,
                ivaAmount,
                totalCommission,
                netAmount,
                breakdown: {
                    operationType: type,
                    totalAmount,
                    commissionRate: operationConfig.percentage,
                    minimumApplied,
                    ivaRate: operationConfig.iva
                }
            };
            logger.debug(`Calculated ${type} commission:`, calculation);
            return calculation;
        }
        catch (error) {
            logger.error('Error calculating operation commission:', error);
            throw new Error(`Failed to calculate commission: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Calcula el costo de custodia mensual
     */
    calculateCustodyFee(portfolioValueARS, config) {
        try {
            const commissionConfig = config || this.defaultConfig;
            const custodyConfig = commissionConfig.custody;
            const isExempt = portfolioValueARS <= custodyConfig.exemptAmount;
            const applicableAmount = Math.max(0, portfolioValueARS - custodyConfig.exemptAmount);
            let monthlyFee = 0;
            if (!isExempt && applicableAmount > 0) {
                const percentageFee = applicableAmount * custodyConfig.monthlyPercentage;
                monthlyFee = Math.max(percentageFee, custodyConfig.monthlyMinimum);
            }
            const ivaAmount = monthlyFee * custodyConfig.iva;
            const totalMonthlyCost = monthlyFee + ivaAmount;
            const annualFee = totalMonthlyCost * 12;
            const calculation = {
                applicableAmount,
                monthlyFee,
                annualFee,
                ivaAmount,
                totalMonthlyCost,
                isExempt
            };
            logger.debug('Calculated custody fee:', calculation);
            return calculation;
        }
        catch (error) {
            logger.error('Error calculating custody fee:', error);
            throw new Error(`Failed to calculate custody fee: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Proyecta el impacto total de comisiones para una operación
     */
    calculateCommissionProjection(type, operationAmount, currentPortfolioValueARS, config) {
        try {
            const operationCommission = this.calculateOperationCommission(type, operationAmount, config);
            // Para proyección de custodia, usar el valor de cartera después de la operación
            const projectedPortfolioValue = type === 'BUY'
                ? currentPortfolioValueARS + operationAmount
                : currentPortfolioValueARS; // En venta, el valor se mantiene similar
            const custody = this.calculateCustodyFee(projectedPortfolioValue, config);
            const totalFirstYearCost = operationCommission.totalCommission + custody.annualFee;
            // Calcular impacto en break-even (porcentaje adicional necesario para cubrir comisiones)
            const breakEvenImpact = (totalFirstYearCost / operationAmount) * 100;
            const projection = {
                operation: operationCommission,
                custody,
                totalFirstYearCost,
                breakEvenImpact
            };
            logger.info('Commission projection calculated:', {
                type,
                operationAmount,
                totalFirstYearCost,
                breakEvenImpact: `${breakEvenImpact.toFixed(2)}%`
            });
            return projection;
        }
        catch (error) {
            logger.error('Error calculating commission projection:', error);
            throw new Error(`Failed to calculate commission projection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Obtiene las configuraciones de comisiones disponibles
     */
    getAvailableConfigurations() {
        return Object.values(this.brokerConfigs).filter(config => config.isActive);
    }
    /**
     * Obtiene configuración por broker
     */
    getConfigurationByBroker(broker) {
        return this.brokerConfigs[broker] || null;
    }
    /**
     * Análisis de comisiones históricas para un período
     */
    async analyzeHistoricalCommissions(filters) {
        try {
            const trades = await this.tradeModel.findAll(filters);
            let totalCommissions = 0;
            let totalTaxes = 0;
            const commissionByType = {
                buy: { count: 0, total: 0 },
                sell: { count: 0, total: 0 }
            };
            const monthlyData = new Map();
            for (const trade of trades) {
                totalCommissions += trade.commission || 0;
                totalTaxes += trade.taxes || 0;
                const type = trade.type.toLowerCase();
                commissionByType[type].count++;
                commissionByType[type].total += trade.commission || 0;
                const month = trade.trade_date.substring(0, 7); // YYYY-MM
                const monthData = monthlyData.get(month) || { commissions: 0, taxes: 0, trades: 0 };
                monthData.commissions += trade.commission || 0;
                monthData.taxes += trade.taxes || 0;
                monthData.trades++;
                monthlyData.set(month, monthData);
            }
            const monthlyBreakdown = Array.from(monthlyData.entries())
                .map(([month, data]) => ({
                month,
                commissions: data.commissions,
                taxes: data.taxes,
                trades: data.trades
            }))
                .sort((a, b) => b.month.localeCompare(a.month));
            const analysis = {
                totalCommissionsPaid: totalCommissions,
                totalTaxesPaid: totalTaxes,
                averageCommissionPerTrade: trades.length > 0 ? totalCommissions / trades.length : 0,
                commissionByType,
                monthlyBreakdown
            };
            logger.info('Historical commission analysis:', {
                totalTrades: trades.length,
                totalCommissions,
                totalTaxes,
                avgCommissionPerTrade: analysis.averageCommissionPerTrade
            });
            return analysis;
        }
        catch (error) {
            logger.error('Error analyzing historical commissions:', error);
            throw new Error(`Failed to analyze historical commissions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Compara comisiones entre diferentes brokers
     */
    compareBrokerCommissions(operationType, operationAmount, portfolioValueARS) {
        const comparisons = Object.values(this.brokerConfigs)
            .filter(config => config.isActive)
            .map(config => {
            const operationCommission = this.calculateOperationCommission(operationType, operationAmount, config);
            const custodyFee = this.calculateCustodyFee(portfolioValueARS, config);
            const totalFirstYearCost = operationCommission.totalCommission + custodyFee.annualFee;
            return {
                broker: config.broker,
                name: config.name,
                operationCommission,
                custodyFee,
                totalFirstYearCost,
                ranking: 0 // Se asignará después
            };
        })
            .sort((a, b) => a.totalFirstYearCost - b.totalFirstYearCost);
        // Asignar ranking
        comparisons.forEach((comparison, index) => {
            comparison.ranking = index + 1;
        });
        logger.info('Broker commission comparison:', {
            operation: operationType,
            amount: operationAmount,
            cheapest: comparisons[0]?.name
        });
        return comparisons;
    }
    /**
     * Calcula el monto mínimo de inversión recomendado para que las comisiones no superen un porcentaje dado
     */
    calculateMinimumInvestmentForCommissionThreshold(commissionThresholdPercentage, // ej: 2.5 para 2.5%
    config) {
        try {
            const commissionConfig = config || this.defaultConfig;
            // Usar configuración de compra como referencia
            const buyConfig = commissionConfig.buy;
            const minimumCommission = buyConfig.minimum * (1 + buyConfig.iva);
            // Calcular monto mínimo donde la comisión sea igual al threshold deseado
            const minimumAmount = minimumCommission / (commissionThresholdPercentage / 100);
            // Verificar el porcentaje real con este monto
            const actualCommission = this.calculateOperationCommission('BUY', minimumAmount, commissionConfig);
            const actualPercentage = (actualCommission.totalCommission / minimumAmount) * 100;
            const recommendation = minimumAmount < 10000
                ? "Monto mínimo muy bajo, considere operaciones más grandes para eficiencia de costos"
                : minimumAmount > 100000
                    ? "Monto mínimo alto debido a comisiones fijas, considere un broker con menores comisiones mínimas"
                    : "Monto recomendado para mantener costos bajo control";
            logger.info('Calculated minimum investment:', {
                threshold: `${commissionThresholdPercentage}%`,
                minimumAmount,
                actualPercentage: `${actualPercentage.toFixed(2)}%`
            });
            return {
                minimumAmount,
                commissionPercentage: actualPercentage,
                recommendation
            };
        }
        catch (error) {
            logger.error('Error calculating minimum investment:', error);
            throw new Error(`Failed to calculate minimum investment: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Obtiene la configuración por defecto
     */
    getDefaultConfiguration() {
        return this.defaultConfig;
    }
    /**
     * Establece una nueva configuración por defecto
     */
    setDefaultConfiguration(broker) {
        const config = this.brokerConfigs[broker];
        if (config && config.isActive) {
            this.defaultConfig = config;
            logger.info(`Default configuration changed to: ${config.name}`);
            return true;
        }
        return false;
    }
}
