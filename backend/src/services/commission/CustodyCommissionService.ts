import { logger } from '../../utils/logger.js'
import type { CommissionConfig, CustodyCalculation } from '../../types/commission.js'

/**
 * Servicio especializado en cálculos de comisiones de custodia
 */
export class CustodyCommissionService {
  /**
   * Calcula el costo de custodia mensual
   */
  calculateCustodyFee(
    portfolioValueARS: number,
    config: CommissionConfig
  ): CustodyCalculation {
    try {
      const custodyConfig = config.custody

      const isExempt = portfolioValueARS <= custodyConfig.exemptAmount
      const applicableAmount = Math.max(0, portfolioValueARS - custodyConfig.exemptAmount)

      let monthlyFee = 0
      if (!isExempt && applicableAmount > 0) {
        const percentageFee = applicableAmount * custodyConfig.monthlyPercentage
        monthlyFee = Math.max(percentageFee, custodyConfig.monthlyMinimum)
      }

      const ivaAmount = monthlyFee * custodyConfig.iva
      const totalMonthlyCost = monthlyFee + ivaAmount
      const annualFee = totalMonthlyCost * 12

      const calculation: CustodyCalculation = {
        applicableAmount,
        monthlyFee,
        annualFee,
        ivaAmount,
        totalMonthlyCost,
        isExempt
      }

      logger.debug('Calculated custody fee:', calculation)

      return calculation
    } catch (error) {
      logger.error('Error calculating custody fee:', error)
      throw new Error(`Failed to calculate custody fee: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Proyecta el costo de custodia para diferentes valores de cartera
   */
  projectCustodyForPortfolioGrowth(
    currentPortfolioValueARS: number,
    growthPercentages: number[],
    config: CommissionConfig
  ): Array<{
    portfolioValue: number
    growthPercentage: number
    custodyCalculation: CustodyCalculation
    isThresholdCrossed: boolean
  }> {
    try {
      const projections = growthPercentages.map(growthPercentage => {
        const futureValue = currentPortfolioValueARS * (1 + growthPercentage / 100)
        const custodyCalculation = this.calculateCustodyFee(futureValue, config)
        
        // Verificar si se cruza el umbral de exención
        const currentCalculation = this.calculateCustodyFee(currentPortfolioValueARS, config)
        const isThresholdCrossed = currentCalculation.isExempt && !custodyCalculation.isExempt

        return {
          portfolioValue: futureValue,
          growthPercentage,
          custodyCalculation,
          isThresholdCrossed
        }
      })

      logger.debug('Custody projection calculated for portfolio growth:', {
        currentValue: currentPortfolioValueARS,
        projections: projections.length
      })

      return projections
    } catch (error) {
      logger.error('Error projecting custody for portfolio growth:', error)
      throw new Error(`Failed to project custody costs: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Calcula el valor de cartera donde se activa la custodia
   */
  calculateCustodyThreshold(config: CommissionConfig): {
    exemptAmount: number
    minimumMonthlyFee: number
    minimumAnnualFee: number
    recommendedStrategy: string
  } {
    try {
      const custodyConfig = config.custody
      const minimumMonthlyFee = custodyConfig.monthlyMinimum * (1 + custodyConfig.iva)
      const minimumAnnualFee = minimumMonthlyFee * 12

      const recommendedStrategy = this.generateCustodyStrategy(
        custodyConfig.exemptAmount,
        minimumAnnualFee
      )

      logger.info('Custody threshold calculated:', {
        exemptAmount: custodyConfig.exemptAmount,
        minimumAnnualFee
      })

      return {
        exemptAmount: custodyConfig.exemptAmount,
        minimumMonthlyFee,
        minimumAnnualFee,
        recommendedStrategy
      }
    } catch (error) {
      logger.error('Error calculating custody threshold:', error)
      throw new Error(`Failed to calculate custody threshold: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Genera estrategia recomendada para custodia
   */
  private generateCustodyStrategy(exemptAmount: number, minimumAnnualFee: number): string {
    const strategies = []

    if (exemptAmount >= 500000) {
      strategies.push(`Mantener cartera por debajo de $${exemptAmount.toLocaleString()} para evitar custodia`)
    }

    if (minimumAnnualFee > 10000) {
      strategies.push("Considerar consolidar posiciones para reducir impact de custodia mínima")
    }

    strategies.push("Evaluar cost-benefit de crecimiento vs. costos de custodia adicionales")

    return strategies.join(". ")
  }
}