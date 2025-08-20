import { logger } from '../../utils/logger.js'
import type { CommissionConfig } from '../../types/commission.js'

/**
 * Servicio especializado en gestión de configuraciones de comisiones
 */
export class CommissionConfigService {
  // Configuraciones predefinidas de comisiones por broker
  private brokerConfigs: Record<string, CommissionConfig> = {
    'galicia': {
      name: 'Banco Galicia',
      broker: 'galicia',
      isActive: true,
      buy: {
        percentage: 0.005,  // 0.5%
        minimum: 150,       // $150 ARS
        iva: 0.21          // 21%
      },
      sell: {
        percentage: 0.005,
        minimum: 150,
        iva: 0.21
      },
      custody: {
        exemptAmount: 1000000,    // $1M ARS exento
        monthlyPercentage: 0.0025, // 0.25% mensual
        monthlyMinimum: 500,       // $500 ARS mínimo
        iva: 0.21
      }
    },
    'santander': {
      name: 'Banco Santander',
      broker: 'santander',
      isActive: true,
      buy: {
        percentage: 0.006,  // 0.6%
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
  }

  private defaultBroker = 'galicia'

  /**
   * Obtiene las configuraciones de comisiones disponibles
   */
  getAvailableConfigurations(): CommissionConfig[] {
    return Object.values(this.brokerConfigs).filter(config => config.isActive)
  }

  /**
   * Obtiene configuración por broker
   */
  getConfigurationByBroker(broker: string): CommissionConfig | null {
    return this.brokerConfigs[broker] || null
  }

  /**
   * Obtiene la configuración por defecto
   */
  getDefaultConfiguration(): CommissionConfig {
    const defaultConfig = this.brokerConfigs[this.defaultBroker]
    if (!defaultConfig) {
      throw new Error(`Default broker configuration not found: ${this.defaultBroker}`)
    }
    return defaultConfig
  }

  /**
   * Establece una nueva configuración por defecto
   */
  setDefaultConfiguration(broker: string): boolean {
    const config = this.brokerConfigs[broker]
    if (config && config.isActive) {
      this.defaultBroker = broker
      logger.info(`Default configuration changed to: ${config.name}`)
      return true
    }
    logger.warn(`Failed to set default configuration. Broker not found or inactive: ${broker}`)
    return false
  }

  /**
   * Valida que una configuración sea válida
   */
  validateConfiguration(config: CommissionConfig): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validar campos obligatorios
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Nombre del broker es obligatorio')
    }

    if (!config.broker || config.broker.trim().length === 0) {
      errors.push('Código del broker es obligatorio')
    }

    // Validar configuración de compra
    if (!this.validateOperationConfig(config.buy, 'compra')) {
      errors.push('Configuración de compra inválida')
    }

    // Validar configuración de venta
    if (!this.validateOperationConfig(config.sell, 'venta')) {
      errors.push('Configuración de venta inválida')
    }

    // Validar configuración de custodia
    if (!this.validateCustodyConfig(config.custody)) {
      errors.push('Configuración de custodia inválida')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Agrega una nueva configuración de broker
   */
  addBrokerConfiguration(config: CommissionConfig): boolean {
    try {
      const validation = this.validateConfiguration(config)
      if (!validation.isValid) {
        logger.error('Invalid broker configuration:', validation.errors)
        return false
      }

      if (this.brokerConfigs[config.broker]) {
        logger.warn(`Broker configuration already exists: ${config.broker}`)
        return false
      }

      this.brokerConfigs[config.broker] = config
      logger.info(`New broker configuration added: ${config.name}`)
      return true
    } catch (error) {
      logger.error('Error adding broker configuration:', error)
      return false
    }
  }

  /**
   * Actualiza una configuración existente
   */
  updateBrokerConfiguration(broker: string, config: CommissionConfig): boolean {
    try {
      if (!this.brokerConfigs[broker]) {
        logger.warn(`Broker configuration not found: ${broker}`)
        return false
      }

      const validation = this.validateConfiguration(config)
      if (!validation.isValid) {
        logger.error('Invalid broker configuration:', validation.errors)
        return false
      }

      this.brokerConfigs[broker] = config
      logger.info(`Broker configuration updated: ${config.name}`)
      return true
    } catch (error) {
      logger.error('Error updating broker configuration:', error)
      return false
    }
  }

  /**
   * Valida configuración de operación (compra/venta)
   */
  private validateOperationConfig(config: any, type: string): boolean {
    return (
      typeof config === 'object' &&
      typeof config.percentage === 'number' &&
      config.percentage >= 0 &&
      config.percentage <= 1 &&
      typeof config.minimum === 'number' &&
      config.minimum >= 0 &&
      typeof config.iva === 'number' &&
      config.iva >= 0 &&
      config.iva <= 1
    )
  }

  /**
   * Valida configuración de custodia
   */
  private validateCustodyConfig(config: any): boolean {
    return (
      typeof config === 'object' &&
      typeof config.exemptAmount === 'number' &&
      config.exemptAmount >= 0 &&
      typeof config.monthlyPercentage === 'number' &&
      config.monthlyPercentage >= 0 &&
      config.monthlyPercentage <= 1 &&
      typeof config.monthlyMinimum === 'number' &&
      config.monthlyMinimum >= 0 &&
      typeof config.iva === 'number' &&
      config.iva >= 0 &&
      config.iva <= 1
    )
  }

  /**
   * Obtiene estadísticas de las configuraciones
   */
  getConfigurationStats(): {
    totalConfigs: number
    activeConfigs: number
    averageCommissionRate: number
    lowestCommissionBroker: string
    highestExemptAmount: number
  } {
    const activeConfigs = this.getAvailableConfigurations()
    
    if (activeConfigs.length === 0) {
      return {
        totalConfigs: 0,
        activeConfigs: 0,
        averageCommissionRate: 0,
        lowestCommissionBroker: '',
        highestExemptAmount: 0
      }
    }

    const totalCommissionRates = activeConfigs.reduce((sum, config) => sum + config.buy.percentage, 0)
    const averageCommissionRate = totalCommissionRates / activeConfigs.length

    const lowestCommissionConfig = activeConfigs.reduce((lowest, current) => 
      current.buy.percentage < lowest.buy.percentage ? current : lowest
    )

    const highestExemptAmount = Math.max(...activeConfigs.map(config => config.custody.exemptAmount))

    return {
      totalConfigs: Object.keys(this.brokerConfigs).length,
      activeConfigs: activeConfigs.length,
      averageCommissionRate,
      lowestCommissionBroker: lowestCommissionConfig.name,
      highestExemptAmount
    }
  }
}