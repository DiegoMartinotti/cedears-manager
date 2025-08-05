export interface CommissionConfig {
    id?: number;
    name: string;
    broker: string;
    isActive: boolean;
    buy: {
        percentage: number;
        minimum: number;
        iva: number;
    };
    sell: {
        percentage: number;
        minimum: number;
        iva: number;
    };
    custody: {
        exemptAmount: number;
        monthlyPercentage: number;
        monthlyMinimum: number;
        iva: number;
    };
    createdAt?: string;
    updatedAt?: string;
}
export interface CommissionCalculation {
    baseCommission: number;
    ivaAmount: number;
    totalCommission: number;
    netAmount: number;
    breakdown: {
        operationType: 'BUY' | 'SELL';
        totalAmount: number;
        commissionRate: number;
        minimumApplied: boolean;
        ivaRate: number;
    };
}
export interface CustodyCalculation {
    applicableAmount: number;
    monthlyFee: number;
    annualFee: number;
    ivaAmount: number;
    totalMonthlyCost: number;
    isExempt: boolean;
}
export interface CommissionProjection {
    operation: CommissionCalculation;
    custody: CustodyCalculation;
    totalFirstYearCost: number;
    breakEvenImpact: number;
}
export declare class CommissionService {
    private tradeModel;
    private brokerConfigs;
    private defaultConfig;
    /**
     * Calcula comisiones para una operación específica
     */
    calculateOperationCommission(type: 'BUY' | 'SELL', totalAmount: number, config?: CommissionConfig): CommissionCalculation;
    /**
     * Calcula el costo de custodia mensual
     */
    calculateCustodyFee(portfolioValueARS: number, config?: CommissionConfig): CustodyCalculation;
    /**
     * Proyecta el impacto total de comisiones para una operación
     */
    calculateCommissionProjection(type: 'BUY' | 'SELL', operationAmount: number, currentPortfolioValueARS: number, config?: CommissionConfig): CommissionProjection;
    /**
     * Obtiene las configuraciones de comisiones disponibles
     */
    getAvailableConfigurations(): CommissionConfig[];
    /**
     * Obtiene configuración por broker
     */
    getConfigurationByBroker(broker: string): CommissionConfig | null;
    /**
     * Análisis de comisiones históricas para un período
     */
    analyzeHistoricalCommissions(filters?: {
        fromDate?: string;
        toDate?: string;
        instrumentId?: number;
    }): Promise<{
        totalCommissionsPaid: number;
        totalTaxesPaid: number;
        averageCommissionPerTrade: number;
        commissionByType: {
            buy: {
                count: number;
                total: number;
            };
            sell: {
                count: number;
                total: number;
            };
        };
        monthlyBreakdown: Array<{
            month: string;
            commissions: number;
            taxes: number;
            trades: number;
        }>;
    }>;
    /**
     * Compara comisiones entre diferentes brokers
     */
    compareBrokerCommissions(operationType: 'BUY' | 'SELL', operationAmount: number, portfolioValueARS: number): Array<{
        broker: string;
        name: string;
        operationCommission: CommissionCalculation;
        custodyFee: CustodyCalculation;
        totalFirstYearCost: number;
        ranking: number;
    }>;
    /**
     * Calcula el monto mínimo de inversión recomendado para que las comisiones no superen un porcentaje dado
     */
    calculateMinimumInvestmentForCommissionThreshold(commissionThresholdPercentage: number, // ej: 2.5 para 2.5%
    config?: CommissionConfig): {
        minimumAmount: number;
        commissionPercentage: number;
        recommendation: string;
    };
    /**
     * Obtiene la configuración por defecto
     */
    getDefaultConfiguration(): CommissionConfig;
    /**
     * Establece una nueva configuración por defecto
     */
    setDefaultConfiguration(broker: string): boolean;
}
