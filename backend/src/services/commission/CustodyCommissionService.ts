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
   * Calcula proyecciones de custodia futuras por meses
   */
  projectFutureCustody(
    currentPortfolioValueARS: number,
    months: number = 12,
    expectedMonthlyGrowthRate: number = 0.015, // 1.5% mensual por defecto
    config: CommissionConfig
  ): Array<{
    month: number
    portfolioValue: number
    custodyCalculation: CustodyCalculation
    cumulativeCustody: number
    isThresholdCrossed: boolean
  }> {
    try {
      const projections = []
      let cumulativeCustody = 0

      for (let month = 1; month <= months; month++) {
        const projectedValue = currentPortfolioValueARS * Math.pow(1 + expectedMonthlyGrowthRate, month)
        const custodyCalculation = this.calculateCustodyFee(projectedValue, config)
        
        cumulativeCustody += custodyCalculation.totalMonthlyCost
        
        // Verificar si se cruza el umbral
        const previousValue = month === 1 
          ? currentPortfolioValueARS 
          : currentPortfolioValueARS * Math.pow(1 + expectedMonthlyGrowthRate, month - 1)
        const previousCalculation = this.calculateCustodyFee(previousValue, config)
        const isThresholdCrossed = previousCalculation.isExempt && !custodyCalculation.isExempt

        projections.push({
          month,
          portfolioValue: projectedValue,
          custodyCalculation,
          cumulativeCustody,
          isThresholdCrossed
        })
      }

      logger.debug('Future custody projections calculated:', {
        currentValue: currentPortfolioValueARS,
        months,
        monthlyGrowthRate: expectedMonthlyGrowthRate,
        totalProjections: projections.length
      })

      return projections
    } catch (error) {
      logger.error('Error projecting future custody:', error)
      throw new Error(`Failed to project future custody: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Analiza el impacto de custodia en rentabilidad anualizada
   */
  analyzeImpactOnReturns(
    portfolioValueARS: number,
    expectedAnnualReturn: number,
    config: CommissionConfig
  ): {
    grossReturn: number
    custodyImpact: number
    netReturn: number
    annualCustodyFee: number
    impactPercentage: number
    recommendations: string[]
  } {
    try {
      const custodyCalculation = this.calculateCustodyFee(portfolioValueARS, config)
      const annualCustodyFee = custodyCalculation.annualFee
      
      const grossReturn = portfolioValueARS * (expectedAnnualReturn / 100)
      const custodyImpact = annualCustodyFee
      const netReturn = grossReturn - custodyImpact
      const impactPercentage = (custodyImpact / grossReturn) * 100

      const recommendations = this.generateReturnImpactRecommendations(
        impactPercentage,
        custodyCalculation.isExempt,
        portfolioValueARS,
        config.custody.exemptAmount
      )

      logger.debug('Custody impact on returns analyzed:', {
        portfolioValue: portfolioValueARS,
        expectedReturn: expectedAnnualReturn,
        custodyImpact: custodyImpact,
        impactPercentage: impactPercentage
      })

      return {
        grossReturn,
        custodyImpact,
        netReturn,
        annualCustodyFee,
        impactPercentage,
        recommendations
      }
    } catch (error) {
      logger.error('Error analyzing custody impact on returns:', error)
      throw new Error(`Failed to analyze impact: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Optimizador de tamaño de cartera para minimizar custodia
   */
  optimizePortfolioSize(
    currentPortfolioValueARS: number,
    targetAnnualReturn: number,
    config: CommissionConfig
  ): {
    optimizedSize: number
    currentCustody: number
    optimizedCustody: number
    savingsAnnual: number
    recommendation: string
    strategy: 'MAINTAIN_EXEMPT' | 'MINIMIZE_CUSTODY' | 'ACCEPT_CUSTODY'
    alternatives: Array<{
      portfolioSize: number
      custodyFee: number
      netReturn: number
      description: string
    }>
  } {
    try {
      const currentCustody = this.calculateCustodyFee(currentPortfolioValueARS, config)
      const exemptAmount = config.custody.exemptAmount

      let strategy: 'MAINTAIN_EXEMPT' | 'MINIMIZE_CUSTODY' | 'ACCEPT_CUSTODY'
      let optimizedSize = currentPortfolioValueARS
      let recommendation = ''

      // Análisis de estrategias
      if (currentPortfolioValueARS <= exemptAmount) {
        strategy = 'MAINTAIN_EXEMPT'
        optimizedSize = exemptAmount
        recommendation = `Mantener cartera por debajo de $${exemptAmount.toLocaleString()} para evitar custodia completamente`
      } else if (currentCustody.totalMonthlyCost <= currentCustody.monthlyFee * 2) {
        // Si la custodia es baja comparada con el mínimo
        strategy = 'MINIMIZE_CUSTODY'
        optimizedSize = this.findOptimalSizeAboveThreshold(currentPortfolioValueARS, config)
        recommendation = `Ajustar cartera a $${optimizedSize.toLocaleString()} para optimizar ratio custodia/valor`
      } else {
        strategy = 'ACCEPT_CUSTODY'
        optimizedSize = currentPortfolioValueARS
        recommendation = `Aceptar custodia actual y enfocar en maximizar rentabilidad`
      }

      const optimizedCustody = this.calculateCustodyFee(optimizedSize, config)
      const savingsAnnual = currentCustody.annualFee - optimizedCustody.annualFee

      // Generar alternativas
      const alternatives = this.generatePortfolioAlternatives(currentPortfolioValueARS, targetAnnualReturn, config)

      logger.info('Portfolio size optimization completed:', {
        currentSize: currentPortfolioValueARS,
        optimizedSize,
        strategy,
        savingsAnnual
      })

      return {
        optimizedSize,
        currentCustody: currentCustody.annualFee,
        optimizedCustody: optimizedCustody.annualFee,
        savingsAnnual,
        recommendation,
        strategy,
        alternatives
      }
    } catch (error) {
      logger.error('Error optimizing portfolio size:', error)
      throw new Error(`Failed to optimize portfolio: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Encuentra el tamaño óptimo de cartera por encima del umbral
   */
  private findOptimalSizeAboveThreshold(currentValue: number, config: CommissionConfig): number {
    const exemptAmount = config.custody.exemptAmount
    const minimumFee = config.custody.monthlyMinimum * (1 + config.custody.iva)
    
    // Calcular el valor donde la custodia porcentual iguala al mínimo
    const optimalExcessValue = minimumFee / config.custody.monthlyPercentage
    const optimalTotalValue = exemptAmount + optimalExcessValue

    // Si el valor actual está cerca del óptimo, mantenerlo
    if (Math.abs(currentValue - optimalTotalValue) / optimalTotalValue < 0.1) {
      return currentValue
    }

    return optimalTotalValue
  }

  /**
   * Genera alternativas de tamaño de cartera
   */
  private generatePortfolioAlternatives(
    currentValue: number,
    targetReturn: number,
    config: CommissionConfig
  ): Array<{
    portfolioSize: number
    custodyFee: number
    netReturn: number
    description: string
  }> {
    const exemptAmount = config.custody.exemptAmount
    const alternatives = []

    // Alternativa 1: Mantenerse exento
    if (currentValue > exemptAmount) {
      const exemptCustody = this.calculateCustodyFee(exemptAmount, config)
      alternatives.push({
        portfolioSize: exemptAmount,
        custodyFee: exemptCustody.annualFee,
        netReturn: exemptAmount * (targetReturn / 100),
        description: 'Mantener cartera exenta de custodia'
      })
    }

    // Alternativa 2: Tamaño óptimo por encima del umbral
    const optimalSize = this.findOptimalSizeAboveThreshold(currentValue, config)
    if (optimalSize !== currentValue) {
      const optimalCustody = this.calculateCustodyFee(optimalSize, config)
      alternatives.push({
        portfolioSize: optimalSize,
        custodyFee: optimalCustody.annualFee,
        netReturn: (optimalSize * (targetReturn / 100)) - optimalCustody.annualFee,
        description: 'Tamaño óptimo para minimizar ratio custodia/valor'
      })
    }

    // Alternativa 3: 50% más grande
    const largerSize = currentValue * 1.5
    const largerCustody = this.calculateCustodyFee(largerSize, config)
    alternatives.push({
      portfolioSize: largerSize,
      custodyFee: largerCustody.annualFee,
      netReturn: (largerSize * (targetReturn / 100)) - largerCustody.annualFee,
      description: 'Cartera 50% más grande (mayor escala)'
    })

    return alternatives.sort((a, b) => b.netReturn - a.netReturn)
  }

  /**
   * Genera recomendaciones basadas en el impacto en rentabilidad
   */
  private generateReturnImpactRecommendations(
    impactPercentage: number,
    isExempt: boolean,
    portfolioValue: number,
    exemptAmount: number
  ): string[] {
    const recommendations = []

    if (isExempt) {
      recommendations.push('✅ Tu cartera está exenta de custodia actualmente')
      if (portfolioValue > exemptAmount * 0.8) {
        recommendations.push('⚠️ Te acercas al límite de exención, considera estrategia de crecimiento')
      }
    } else {
      if (impactPercentage > 15) {
        recommendations.push('🔴 Alto impacto de custodia en rentabilidad (>15%)')
        recommendations.push('💡 Considera reducir cartera o diversificar en otros brokers')
      } else if (impactPercentage > 5) {
        recommendations.push('🟡 Impacto moderado de custodia en rentabilidad (5-15%)')
        recommendations.push('💡 Evalúa si el crecimiento compensa la custodia')
      } else {
        recommendations.push('🟢 Impacto bajo de custodia en rentabilidad (<5%)')
        recommendations.push('💡 Custodia aceptable, enfoca en maximizar rentabilidad')
      }
    }

    if (!isExempt && portfolioValue < exemptAmount * 1.2) {
      recommendations.push('💡 Considera mantener cartera por debajo del límite de exención')
    }

    return recommendations
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