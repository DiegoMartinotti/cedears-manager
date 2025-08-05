/**
 * Test básico del CommissionService sin dependencias externas
 */
interface CommissionConfig {
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
}
interface CommissionCalculation {
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
declare class SimpleCommissionCalculator {
    private galiciaConfig;
    calculateOperationCommission(type: 'BUY' | 'SELL', totalAmount: number): CommissionCalculation;
    calculateCustodyFee(portfolioValueARS: number): {
        applicableAmount: number;
        monthlyFee: number;
        annualFee: number;
        ivaAmount: number;
        totalMonthlyCost: number;
        isExempt: boolean;
    };
}
declare function testCommissionCalculations(): void;
