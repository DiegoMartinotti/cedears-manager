import { UVAService } from './UVAService';
import Database from 'better-sqlite3';

/**
 * Motor de cálculo de interés compuesto avanzado para proyecciones financieras
 * Step 27.1: Motor de cálculo de interés compuesto
 */

export interface ProjectionParameters {
  presentValue: number;          // Valor presente (capital inicial)
  monthlyContribution: number;   // Aporte mensual
  annualReturnRate: number;      // Tasa de retorno anual (%)
  inflationRate?: number;        // Tasa de inflación anual (%)
  periods: number;               // Número de períodos (meses)
  contributionGrowthRate?: number; // Crecimiento anual de aportes (%)
  dividendYield?: number;        // Rendimiento por dividendos (%)
  reinvestDividends?: boolean;   // Reinvertir dividendos
}

export interface ProjectionResult {
  futureValue: number;                    // Valor futuro nominal
  realFutureValue: number;               // Valor futuro ajustado por inflación
  totalContributions: number;            // Total de aportes realizados
  totalGrowth: number;                   // Crecimiento por rendimientos
  totalDividends: number;                // Total de dividendos recibidos
  effectiveAnnualReturn: number;         // Retorno anual efectivo
  realAnnualReturn: number;              // Retorno real (ajustado por inflación)
  monthlyProjections: MonthlyProjection[]; // Proyección mes a mes
}

export interface MonthlyProjection {
  month: number;
  capitalBeginning: number;
  contribution: number;
  growth: number;
  dividends: number;
  capitalEnding: number;
  realValue: number;
  cumulativeContributions: number;
}

export interface CompoundGrowthScenario {
  scenarioName: string;
  parameters: ProjectionParameters;
  result: ProjectionResult;
  probabilityWeight?: number;
}

export class CompoundInterestEngine {
  private uvaService: UVAService;
  
  constructor(db: Database.Database) {
    this.uvaService = new UVAService(db);
  }

  /**
   * Calcula el valor futuro con interés compuesto
   * FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r]
   */
  async calculateFutureValue(params: ProjectionParameters): Promise<ProjectionResult> {
    const monthlyReturn = params.annualReturnRate / 100 / 12;
    const monthlyInflation = (params.inflationRate || 0) / 100 / 12;
    const monthlyContributionGrowth = (params.contributionGrowthRate || 0) / 100 / 12;
    const monthlyDividendYield = (params.dividendYield || 0) / 100 / 12;

    let capital = params.presentValue;
    let totalContributions = params.presentValue;
    let totalDividends = 0;
    let monthlyContribution = params.monthlyContribution;
    
    const monthlyProjections: MonthlyProjection[] = [];
    
    for (let month = 1; month <= params.periods; month++) {
      const capitalBeginning = capital;
      
      // Crecimiento de los aportes según la tasa especificada
      if (month > 1 && params.contributionGrowthRate) {
        monthlyContribution = monthlyContribution * (1 + monthlyContributionGrowth);
      }
      
      // Dividendos del mes
      const monthlyDividends = capital * monthlyDividendYield;
      
      // Crecimiento por rendimientos del capital
      const growth = capital * monthlyReturn;
      
      // Agregar aporte mensual
      capital += monthlyContribution;
      totalContributions += monthlyContribution;
      
      // Aplicar crecimiento
      capital += growth;
      
      // Dividendos
      totalDividends += monthlyDividends;
      if (params.reinvestDividends) {
        capital += monthlyDividends;
      }
      
      // Calcular valor real ajustado por inflación
      const realValue = capital / Math.pow(1 + monthlyInflation, month);
      
      monthlyProjections.push({
        month,
        capitalBeginning,
        contribution: monthlyContribution,
        growth,
        dividends: monthlyDividends,
        capitalEnding: capital,
        realValue,
        cumulativeContributions: totalContributions
      });
    }

    const futureValue = capital;
    const totalGrowth = futureValue - totalContributions - (params.reinvestDividends ? 0 : totalDividends);
    const realFutureValue = futureValue / Math.pow(1 + monthlyInflation, params.periods);
    
    // Calcular retorno anual efectivo
    const yearsInvested = params.periods / 12;
    const effectiveAnnualReturn = Math.pow(futureValue / params.presentValue, 1 / yearsInvested) - 1;
    const realAnnualReturn = Math.pow(realFutureValue / params.presentValue, 1 / yearsInvested) - 1;

    return {
      futureValue,
      realFutureValue,
      totalContributions,
      totalGrowth,
      totalDividends,
      effectiveAnnualReturn: effectiveAnnualReturn * 100,
      realAnnualReturn: realAnnualReturn * 100,
      monthlyProjections
    };
  }

  /**
   * Calcula el aporte mensual necesario para alcanzar un objetivo
   */
  async calculateRequiredContribution(
    presentValue: number,
    futureValue: number,
    annualReturnRate: number,
    periods: number,
    inflationAdjusted: boolean = true
  ): Promise<number> {
    const monthlyReturn = annualReturnRate / 100 / 12;
    let targetValue = futureValue;

    if (inflationAdjusted) {
      const inflationRate = await this.getEstimatedInflationRate();
      const monthlyInflation = inflationRate / 100 / 12;
      targetValue = futureValue * Math.pow(1 + monthlyInflation, periods);
    }
    
    if (monthlyReturn === 0) {
      // Sin interés, cálculo simple
      return (targetValue - presentValue) / periods;
    }
    
    // Fórmula de anualidad: PMT = (FV - PV × (1 + r)^n) / [((1 + r)^n - 1) / r]
    const futureValueOfPV = presentValue * Math.pow(1 + monthlyReturn, periods);
    const annuityFactor = (Math.pow(1 + monthlyReturn, periods) - 1) / monthlyReturn;
    
    return (targetValue - futureValueOfPV) / annuityFactor;
  }

  /**
   * Calcula el tiempo necesario para alcanzar un objetivo
   */
  async calculateTimeToGoal(
    presentValue: number,
    futureValue: number,
    monthlyContribution: number,
    annualReturnRate: number,
    inflationAdjusted: boolean = true
  ): Promise<number> {
    const monthlyReturn = annualReturnRate / 100 / 12;
    const targetValue = futureValue;
    
    if (inflationAdjusted) {
      const inflationRate = await this.getEstimatedInflationRate();
      const monthlyInflation = inflationRate / 100 / 12;
      
      // Método iterativo para encontrar el tiempo con inflación
      let months = 0;
      let capital = presentValue;
      const maxIterations = 600; // 50 años máximo
      
      while (capital < futureValue && months < maxIterations) {
        capital = capital * (1 + monthlyReturn) + monthlyContribution;
        const realValue = capital / Math.pow(1 + monthlyInflation, months + 1);
        months++;
        
        if (realValue >= futureValue) {
          break;
        }
      }
      
      return months;
    }
    
    if (monthlyReturn === 0) {
      return (targetValue - presentValue) / monthlyContribution;
    }
    
    // Fórmula logarítmica para tiempo
    const ratio = (targetValue * monthlyReturn + monthlyContribution) / 
                 (presentValue * monthlyReturn + monthlyContribution);
    
    return Math.log(ratio) / Math.log(1 + monthlyReturn);
  }

  /**
   * Crea múltiples escenarios de crecimiento compuesto
   */
  async generateMultipleScenarios(
    baseParams: ProjectionParameters,
    returnVariations: number[] = [-2, -1, 0, 1, 2, 3] // Variaciones en %
  ): Promise<CompoundGrowthScenario[]> {
    const scenarios: CompoundGrowthScenario[] = [];
    
    for (const variation of returnVariations) {
      const modifiedParams = {
        ...baseParams,
        annualReturnRate: baseParams.annualReturnRate + variation
      };
      
      const result = await this.calculateFutureValue(modifiedParams);
      
      scenarios.push({
        scenarioName: `Retorno ${variation >= 0 ? '+' : ''}${variation}% (${modifiedParams.annualReturnRate.toFixed(1)}% anual)`,
        parameters: modifiedParams,
        result,
        probabilityWeight: this.calculateScenarioProbability(variation)
      });
    }
    
    return scenarios;
  }

  /**
   * Calcula el break-even point (punto de equilibrio)
   */
  async calculateBreakEven(
    presentValue: number,
    monthlyContribution: number,
    annualReturnRate: number
  ): Promise<{ months: number; totalContributions: number; totalGrowth: number }> {
    const monthlyReturn = annualReturnRate / 100 / 12;
    let capital = presentValue;
    let totalContributions = presentValue;
    let months = 0;
    
    // Encontrar cuando el crecimiento iguala las contribuciones
    while (months < 600) { // Máximo 50 años
      capital = capital * (1 + monthlyReturn) + monthlyContribution;
      totalContributions += monthlyContribution;
      months++;
      
      const totalGrowth = capital - totalContributions;
      
      if (totalGrowth >= totalContributions - presentValue) {
        return {
          months,
          totalContributions,
          totalGrowth
        };
      }
    }
    
    throw new Error('No se pudo calcular el punto de equilibrio en un plazo razonable');
  }

  /**
   * Análisis de sensibilidad para cambios en parámetros
   */
  async performSensitivityAnalysis(
    baseParams: ProjectionParameters,
    parameterName: keyof ProjectionParameters,
    variations: number[]
  ): Promise<{ variation: number; result: ProjectionResult }[]> {
    const results: { variation: number; result: ProjectionResult }[] = [];
    
    for (const variation of variations) {
      const modifiedParams = { ...baseParams };
      
      switch (parameterName) {
        case 'annualReturnRate':
          modifiedParams.annualReturnRate = baseParams.annualReturnRate + variation;
          break;
        case 'monthlyContribution':
          modifiedParams.monthlyContribution = baseParams.monthlyContribution * (1 + variation / 100);
          break;
        case 'inflationRate':
          modifiedParams.inflationRate = (baseParams.inflationRate || 0) + variation;
          break;
        default:
          continue;
      }
      
      const result = await this.calculateFutureValue(modifiedParams);
      results.push({ variation, result });
    }
    
    return results;
  }

  /**
   * Cálculo de valor presente de una serie de flujos futuros
   */
  calculatePresentValue(
    futureValue: number,
    annualDiscountRate: number,
    periods: number
  ): number {
    const monthlyDiscountRate = annualDiscountRate / 100 / 12;
    return futureValue / Math.pow(1 + monthlyDiscountRate, periods);
  }

  /**
   * Calcula la tasa interna de retorno (TIR) para una serie de flujos
   */
  calculateIRR(
    initialInvestment: number,
    cashFlows: number[]
  ): number {
    // Implementación simplificada usando método iterativo
    let rate = 0.1; // Tasa inicial del 10%
    const tolerance = 0.0001;
    const maxIterations = 1000;
    
    for (let i = 0; i < maxIterations; i++) {
      let npv = -initialInvestment;
      let npvDerivative = 0;
      
      for (let t = 0; t < cashFlows.length; t++) {
        const period = t + 1;
        npv += cashFlows[t] / Math.pow(1 + rate, period);
        npvDerivative -= (period * cashFlows[t]) / Math.pow(1 + rate, period + 1);
      }
      
      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Convertir a porcentaje
      }
      
      rate = rate - npv / npvDerivative;
      
      if (rate < -0.99) rate = -0.99; // Evitar tasas imposibles
    }
    
    throw new Error('No se pudo calcular la TIR');
  }

  /**
   * Métodos auxiliares privados
   */
  private async getEstimatedInflationRate(): Promise<number> {
    try {
      // Obtener inflación promedio de los últimos 12 meses desde UVA
      const currentUVA = await this.uvaService.getLatest();
      const yearAgoUVA = await this.uvaService.getByDate(
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
      
      if (currentUVA && yearAgoUVA) {
        const inflationRate = ((currentUVA.value / yearAgoUVA.value) - 1) * 100;
        return Math.max(0, Math.min(300, inflationRate)); // Limitar entre 0% y 300%
      }
    } catch (error) {
      
    }
    
    // Fallback: estimación conservadora para Argentina
    return 120; // 120% anual estimado
  }

  private calculateScenarioProbability(variation: number): number {
    // Distribución normal simplificada
    // Escenario base (0% variación) tiene mayor probabilidad
    const standardDeviation = 2;
    const probability = Math.exp(-0.5 * Math.pow(variation / standardDeviation, 2));
    return Math.round(probability * 100) / 100;
  }
}
