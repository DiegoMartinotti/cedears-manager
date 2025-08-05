/**
 * Convierte un monto de pesos nominales a pesos constantes (ajustados por UVA)
 */
export declare function convertToConstantPesos(nominalAmount: number, fromDate: string, toDate?: string): Promise<{
    success: boolean;
    originalAmount: number;
    adjustedAmount?: number;
    inflationRate?: number;
    fromDate: string;
    toDate: string;
    error?: string;
}>;
/**
 * Calcula el poder adquisitivo relativo entre dos fechas
 */
export declare function calculatePurchasingPower(fromDate: string, toDate: string): Promise<{
    success: boolean;
    fromDate: string;
    toDate: string;
    purchasingPowerRatio?: number;
    inflationRate?: number;
    fromUVA?: number;
    toUVA?: number;
    interpretation?: string;
    error?: string;
}>;
/**
 * Calcula la rentabilidad real (ajustada por inflación) de una inversión
 */
export declare function calculateRealReturn(initialAmount: number, finalAmount: number, fromDate: string, toDate: string): Promise<{
    success: boolean;
    initialAmount: number;
    finalAmount: number;
    nominalReturn: number;
    nominalReturnPercentage: number;
    realReturn?: number;
    realReturnPercentage?: number;
    inflationRate?: number;
    fromDate: string;
    toDate: string;
    outperformedInflation?: boolean;
    error?: string;
}>;
/**
 * Convierte múltiples montos a pesos constantes
 */
export declare function batchConvertToConstantPesos(amounts: Array<{
    amount: number;
    date: string;
    id?: string;
}>, targetDate?: string): Promise<Array<{
    id?: string;
    originalAmount: number;
    adjustedAmount?: number;
    date: string;
    targetDate: string;
    success: boolean;
    error?: string;
}>>;
/**
 * Calcula la inflación acumulada para un período específico
 */
export declare function calculateAccumulatedInflation(fromDate: string, toDate: string): Promise<{
    success: boolean;
    fromDate: string;
    toDate: string;
    inflationRate?: number;
    inflationPercentage?: number;
    annualizedInflation?: number;
    days?: number;
    fromUVA?: number;
    toUVA?: number;
    error?: string;
}>;
/**
 * Obtiene estadísticas de inflación para diferentes períodos
 */
export declare function getInflationStatistics(referenceDate?: string): Promise<{
    success: boolean;
    referenceDate: string;
    monthly?: {
        inflationRate: number;
        fromDate: string;
        toDate: string;
    };
    quarterly?: {
        inflationRate: number;
        fromDate: string;
        toDate: string;
    };
    yearly?: {
        inflationRate: number;
        fromDate: string;
        toDate: string;
    };
    error?: string;
}>;
/**
 * Convierte un precio de CEDEAR a valor ajustado por inflación desde su fecha base
 */
export declare function adjustCedearPriceForInflation(currentPrice: number, baseDate: string, targetDate?: string): Promise<{
    success: boolean;
    originalPrice: number;
    adjustedPrice?: number;
    baseDate: string;
    targetDate: string;
    inflationImpact?: number;
    error?: string;
}>;
/**
 * Calcula el valor futuro de una inversión considerando inflación esperada
 */
export declare function calculateFutureValueWithInflation(presentValue: number, nominalRate: number, periods: number, expectedInflationRate?: number): Promise<{
    success: boolean;
    presentValue: number;
    nominalRate: number;
    periods: number;
    expectedInflationRate: number;
    nominalFutureValue: number;
    realFutureValue?: number;
    realRate?: number;
    error?: string;
}>;
/**
 * Formatea montos con indicadores de ajuste por inflación
 */
export declare function formatInflationAdjustedAmount(originalAmount: number, adjustedAmount: number, currency?: string): {
    original: string;
    adjusted: string;
    difference: string;
    percentage: string;
    indicator: '📈' | '📉' | '➡️';
};
