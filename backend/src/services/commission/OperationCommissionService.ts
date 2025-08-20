import { logger } from '../../utils/logger.js'
import type { CommissionConfig, CommissionCalculation } from '../../types/commission.js'

/**
 * Servicio especializado en cálculos de comisiones de operaciones de compra y venta
 */
export class OperationCommissionService {
  /**
   * Calcula comisiones para una operación específica
   */
  calculateOperationCommission(
    type: 'BUY' | 'SELL',
    totalAmount: number,
    config: CommissionConfig
  ): CommissionCalculation {
    try {
      const operationConfig = type === 'BUY' ? config.buy : config.sell

      // Calcular comisión base
      const percentageCommission = totalAmount * operationConfig.percentage
      const baseCommission = Math.max(percentageCommission, operationConfig.minimum)
      const minimumApplied = percentageCommission < operationConfig.minimum

      // Calcular IVA
      const ivaAmount = baseCommission * operationConfig.iva
      const totalCommission = baseCommission + ivaAmount

      // Calcular monto neto (para compras se suma, para ventas se resta)
      const netAmount = type === 'BUY' 
        ? totalAmount + totalCommission
        : totalAmount - totalCommission

      const calculation: CommissionCalculation = {
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
      }

      logger.debug(`Calculated ${type} commission:`, calculation)

      return calculation
    } catch (error) {
      logger.error('Error calculating operation commission:', error)
      throw new Error(`Failed to calculate commission: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Calcula el monto mínimo de inversión recomendado para que las comisiones no superen un porcentaje dado
   */
  calculateMinimumInvestmentForCommissionThreshold(
    commissionThresholdPercentage: number,
    config: CommissionConfig
  ): {
    minimumAmount: number
    commissionPercentage: number
    recommendation: string
  } {
    try {
      // Usar configuración de compra como referencia
      const buyConfig = config.buy
      const minimumCommission = buyConfig.minimum * (1 + buyConfig.iva)
      
      // Calcular monto mínimo donde la comisión sea igual al threshold deseado
      const minimumAmount = minimumCommission / (commissionThresholdPercentage / 100)
      
      // Verificar el porcentaje real con este monto
      const actualCommission = this.calculateOperationCommission('BUY', minimumAmount, config)
      const actualPercentage = (actualCommission.totalCommission / minimumAmount) * 100

      const recommendation = this.generateRecommendation(minimumAmount)

      logger.info('Calculated minimum investment:', {
        threshold: `${commissionThresholdPercentage}%`,
        minimumAmount,
        actualPercentage: `${actualPercentage.toFixed(2)}%`
      })

      return {
        minimumAmount,
        commissionPercentage: actualPercentage,
        recommendation
      }
    } catch (error) {
      logger.error('Error calculating minimum investment:', error)
      throw new Error(`Failed to calculate minimum investment: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Genera recomendación basada en el monto mínimo calculado
   */
  private generateRecommendation(minimumAmount: number): string {
    if (minimumAmount < 10000) {
      return "Monto mínimo muy bajo, considere operaciones más grandes para eficiencia de costos"
    }
    
    if (minimumAmount > 100000) {
      return "Monto mínimo alto debido a comisiones fijas, considere un broker con menores comisiones mínimas"
    }
    
    return "Monto recomendado para mantener costos bajo control"
  }
}