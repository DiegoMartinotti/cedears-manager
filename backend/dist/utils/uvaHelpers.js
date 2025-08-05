import { UVAService } from '../services/UVAService.js';
import { createLogger } from './logger.js';
import { format, parseISO, isValid, differenceInDays, startOfMonth, startOfYear } from 'date-fns';
const logger = createLogger('UVAHelpers');
/**
 * Instancia del servicio UVA para operaciones
 */
const uvaService = new UVAService();
/**
 * Convierte un monto de pesos nominales a pesos constantes (ajustados por UVA)
 */
export async function convertToConstantPesos(nominalAmount, fromDate, toDate) {
    try {
        const targetDate = toDate || format(new Date(), 'yyyy-MM-dd');
        if (!isValid(parseISO(fromDate)) || !isValid(parseISO(targetDate))) {
            return {
                success: false,
                originalAmount: nominalAmount,
                fromDate,
                toDate: targetDate,
                error: 'Invalid date format'
            };
        }
        const adjustment = await uvaService.calculateInflationAdjustment(nominalAmount, fromDate, targetDate);
        return {
            success: true,
            originalAmount: nominalAmount,
            adjustedAmount: adjustment.adjustedAmount,
            inflationRate: adjustment.inflationRate,
            fromDate,
            toDate: targetDate
        };
    }
    catch (error) {
        logger.error('Error converting to constant pesos', { error, nominalAmount, fromDate, toDate });
        return {
            success: false,
            originalAmount: nominalAmount,
            fromDate,
            toDate: toDate || format(new Date(), 'yyyy-MM-dd'),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Calcula el poder adquisitivo relativo entre dos fechas
 */
export async function calculatePurchasingPower(fromDate, toDate) {
    try {
        if (!isValid(parseISO(fromDate)) || !isValid(parseISO(toDate))) {
            return {
                success: false,
                fromDate,
                toDate,
                error: 'Invalid date format'
            };
        }
        // Usar $1000 como base para calcular el ratio
        const baseAmount = 1000;
        const adjustment = await uvaService.calculateInflationAdjustment(baseAmount, fromDate, toDate);
        const purchasingPowerRatio = baseAmount / adjustment.adjustedAmount;
        let interpretation;
        if (purchasingPowerRatio > 1) {
            interpretation = `El poder adquisitivo se redujo ${((1 - purchasingPowerRatio) * 100).toFixed(1)}%`;
        }
        else if (purchasingPowerRatio < 1) {
            interpretation = `El poder adquisitivo aumentó ${((purchasingPowerRatio - 1) * -100).toFixed(1)}%`;
        }
        else {
            interpretation = 'El poder adquisitivo se mantuvo estable';
        }
        return {
            success: true,
            fromDate,
            toDate,
            purchasingPowerRatio,
            inflationRate: adjustment.inflationRate,
            fromUVA: adjustment.fromUVA,
            toUVA: adjustment.toUVA,
            interpretation
        };
    }
    catch (error) {
        logger.error('Error calculating purchasing power', { error, fromDate, toDate });
        return {
            success: false,
            fromDate,
            toDate,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Calcula la rentabilidad real (ajustada por inflación) de una inversión
 */
export async function calculateRealReturn(initialAmount, finalAmount, fromDate, toDate) {
    try {
        if (!isValid(parseISO(fromDate)) || !isValid(parseISO(toDate))) {
            return {
                success: false,
                initialAmount,
                finalAmount,
                nominalReturn: finalAmount - initialAmount,
                nominalReturnPercentage: ((finalAmount - initialAmount) / initialAmount) * 100,
                fromDate,
                toDate,
                error: 'Invalid date format'
            };
        }
        const nominalReturn = finalAmount - initialAmount;
        const nominalReturnPercentage = (nominalReturn / initialAmount) * 100;
        // Ajustar el monto final por inflación para calcular rentabilidad real
        const adjustment = await uvaService.calculateInflationAdjustment(finalAmount, toDate, fromDate);
        const realFinalAmount = adjustment.adjustedAmount;
        const realReturn = realFinalAmount - initialAmount;
        const realReturnPercentage = (realReturn / initialAmount) * 100;
        return {
            success: true,
            initialAmount,
            finalAmount,
            nominalReturn,
            nominalReturnPercentage,
            realReturn,
            realReturnPercentage,
            inflationRate: adjustment.inflationRate,
            fromDate,
            toDate,
            outperformedInflation: realReturnPercentage > 0
        };
    }
    catch (error) {
        logger.error('Error calculating real return', { error, initialAmount, finalAmount, fromDate, toDate });
        return {
            success: false,
            initialAmount,
            finalAmount,
            nominalReturn: finalAmount - initialAmount,
            nominalReturnPercentage: ((finalAmount - initialAmount) / initialAmount) * 100,
            fromDate,
            toDate,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Convierte múltiples montos a pesos constantes
 */
export async function batchConvertToConstantPesos(amounts, targetDate) {
    const target = targetDate || format(new Date(), 'yyyy-MM-dd');
    const results = [];
    for (const item of amounts) {
        try {
            const result = await convertToConstantPesos(item.amount, item.date, target);
            results.push({
                id: item.id,
                originalAmount: item.amount,
                adjustedAmount: result.adjustedAmount,
                date: item.date,
                targetDate: target,
                success: result.success,
                error: result.error
            });
        }
        catch (error) {
            results.push({
                id: item.id,
                originalAmount: item.amount,
                date: item.date,
                targetDate: target,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    return results;
}
/**
 * Calcula la inflación acumulada para un período específico
 */
export async function calculateAccumulatedInflation(fromDate, toDate) {
    try {
        if (!isValid(parseISO(fromDate)) || !isValid(parseISO(toDate))) {
            return {
                success: false,
                fromDate,
                toDate,
                error: 'Invalid date format'
            };
        }
        const adjustment = await uvaService.calculateInflationAdjustment(1, fromDate, toDate);
        const days = differenceInDays(parseISO(toDate), parseISO(fromDate));
        const annualizedInflation = days > 0 ? (Math.pow(1 + adjustment.inflationRate, 365 / days) - 1) : 0;
        return {
            success: true,
            fromDate,
            toDate,
            inflationRate: adjustment.inflationRate,
            inflationPercentage: adjustment.inflationRate * 100,
            annualizedInflation: annualizedInflation * 100,
            days,
            fromUVA: adjustment.fromUVA,
            toUVA: adjustment.toUVA
        };
    }
    catch (error) {
        logger.error('Error calculating accumulated inflation', { error, fromDate, toDate });
        return {
            success: false,
            fromDate,
            toDate,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Obtiene estadísticas de inflación para diferentes períodos
 */
export async function getInflationStatistics(referenceDate) {
    try {
        const refDate = referenceDate || format(new Date(), 'yyyy-MM-dd');
        const refDateParsed = parseISO(refDate);
        if (!isValid(refDateParsed)) {
            return {
                success: false,
                referenceDate: refDate,
                error: 'Invalid reference date format'
            };
        }
        // Calcular inflación mensual
        const monthStart = format(startOfMonth(refDateParsed), 'yyyy-MM-dd');
        const monthlyInflation = await calculateAccumulatedInflation(monthStart, refDate);
        // Calcular inflación trimestral (últimos 3 meses)
        const quarterStart = format(startOfMonth(new Date(refDateParsed.getFullYear(), refDateParsed.getMonth() - 2, 1)), 'yyyy-MM-dd');
        const quarterlyInflation = await calculateAccumulatedInflation(quarterStart, refDate);
        // Calcular inflación anual
        const yearStart = format(startOfYear(refDateParsed), 'yyyy-MM-dd');
        const yearlyInflation = await calculateAccumulatedInflation(yearStart, refDate);
        return {
            success: true,
            referenceDate: refDate,
            monthly: monthlyInflation.success ? {
                inflationRate: monthlyInflation.inflationRate,
                fromDate: monthlyInflation.fromDate,
                toDate: monthlyInflation.toDate
            } : undefined,
            quarterly: quarterlyInflation.success ? {
                inflationRate: quarterlyInflation.inflationRate,
                fromDate: quarterlyInflation.fromDate,
                toDate: quarterlyInflation.toDate
            } : undefined,
            yearly: yearlyInflation.success ? {
                inflationRate: yearlyInflation.inflationRate,
                fromDate: yearlyInflation.fromDate,
                toDate: yearlyInflation.toDate
            } : undefined
        };
    }
    catch (error) {
        logger.error('Error getting inflation statistics', { error, referenceDate });
        return {
            success: false,
            referenceDate: referenceDate || format(new Date(), 'yyyy-MM-dd'),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Convierte un precio de CEDEAR a valor ajustado por inflación desde su fecha base
 */
export async function adjustCedearPriceForInflation(currentPrice, baseDate, targetDate) {
    try {
        const target = targetDate || format(new Date(), 'yyyy-MM-dd');
        const result = await convertToConstantPesos(currentPrice, baseDate, target);
        if (!result.success) {
            return {
                success: false,
                originalPrice: currentPrice,
                baseDate,
                targetDate: target,
                error: result.error
            };
        }
        const inflationImpact = result.adjustedAmount - currentPrice;
        return {
            success: true,
            originalPrice: currentPrice,
            adjustedPrice: result.adjustedAmount,
            baseDate,
            targetDate: target,
            inflationImpact
        };
    }
    catch (error) {
        logger.error('Error adjusting CEDEAR price for inflation', { error, currentPrice, baseDate, targetDate });
        return {
            success: false,
            originalPrice: currentPrice,
            baseDate,
            targetDate: targetDate || format(new Date(), 'yyyy-MM-dd'),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Calcula el valor futuro de una inversión considerando inflación esperada
 */
export async function calculateFutureValueWithInflation(presentValue, nominalRate, periods, expectedInflationRate) {
    try {
        // Si no se proporciona inflación esperada, usar la inflación histórica del último año
        let inflationRate = expectedInflationRate;
        if (!inflationRate) {
            const oneYearAgo = format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
            const today = format(new Date(), 'yyyy-MM-dd');
            const inflationData = await calculateAccumulatedInflation(oneYearAgo, today);
            if (inflationData.success && inflationData.annualizedInflation) {
                inflationRate = inflationData.annualizedInflation / 100;
            }
            else {
                inflationRate = 0.5; // Default 50% anual si no se puede obtener data
            }
        }
        const nominalFutureValue = presentValue * Math.pow(1 + nominalRate, periods);
        const realRate = (1 + nominalRate) / (1 + inflationRate) - 1;
        const realFutureValue = presentValue * Math.pow(1 + realRate, periods);
        return {
            success: true,
            presentValue,
            nominalRate,
            periods,
            expectedInflationRate: inflationRate,
            nominalFutureValue,
            realFutureValue,
            realRate
        };
    }
    catch (error) {
        logger.error('Error calculating future value with inflation', {
            error, presentValue, nominalRate, periods, expectedInflationRate
        });
        const nominalFutureValue = presentValue * Math.pow(1 + nominalRate, periods);
        const defaultInflation = expectedInflationRate || 0.5;
        return {
            success: false,
            presentValue,
            nominalRate,
            periods,
            expectedInflationRate: defaultInflation,
            nominalFutureValue,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Formatea montos con indicadores de ajuste por inflación
 */
export function formatInflationAdjustedAmount(originalAmount, adjustedAmount, currency = 'ARS') {
    const difference = adjustedAmount - originalAmount;
    const percentage = (difference / originalAmount) * 100;
    let indicator;
    if (Math.abs(percentage) < 0.1) {
        indicator = '➡️';
    }
    else if (difference > 0) {
        indicator = '📈';
    }
    else {
        indicator = '📉';
    }
    const formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency
    });
    return {
        original: formatter.format(originalAmount),
        adjusted: formatter.format(adjustedAmount),
        difference: formatter.format(Math.abs(difference)),
        percentage: `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`,
        indicator
    };
}
//# sourceMappingURL=uvaHelpers.js.map