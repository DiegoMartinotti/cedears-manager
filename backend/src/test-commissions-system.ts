#!/usr/bin/env node

/**
 * Script de prueba para el sistema de comisiones implementado
 */

import { CommissionService } from './services/CommissionService.js'
import { CommissionController } from './controllers/CommissionController.js'
import { createLogger } from './utils/logger.js'

const logger = createLogger('CommissionTest')

async function testCommissionSystem() {

  const commissionService = new CommissionService()

  try {
    // Test 1: Obtener configuraciones disponibles
    const configs = commissionService.getAvailableConfigurations()
    configs.forEach(config => {
    })

    // Test 2: Calcular comisión de compra
    const buyAmount = 50000
    const buyCommission = commissionService.calculateOperationCommission('BUY', buyAmount)

    // Test 3: Calcular comisión de venta
    const sellAmount = 75000
    const sellCommission = commissionService.calculateOperationCommission('SELL', sellAmount)

    // Test 4: Calcular custodia
    const portfolioValue = 2500000 // $2.5M
    const custody = commissionService.calculateCustodyFee(portfolioValue)

    // Test 5: Proyección completa
    const projection = commissionService.calculateCommissionProjection('BUY', buyAmount, portfolioValue)

    // Test 6: Comparación entre brokers
    const comparison = commissionService.compareBrokerCommissions('BUY', buyAmount, portfolioValue)
    comparison.forEach((broker, index) => {
    })

    // Test 7: Monto mínimo recomendado
    const minInvestment = commissionService.calculateMinimumInvestmentForCommissionThreshold(2.5)

    // Test 8: Configuración personalizada
    const customConfig = {
      name: 'Broker Personalizado',
      broker: 'custom',
      isActive: true,
      buy: { percentage: 0.003, minimum: 100, iva: 0.21 },
      sell: { percentage: 0.003, minimum: 100, iva: 0.21 },
      custody: { exemptAmount: 2000000, monthlyPercentage: 0.002, monthlyMinimum: 300, iva: 0.21 }
    }
    
    const customCommission = commissionService.calculateOperationCommission('BUY', buyAmount, customConfig)

  } catch (error) {
    logger.error('Test failed:', error)
    process.exit(1)
  }
}

// Ejecutar las pruebas si el script se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testCommissionSystem()
}

export { testCommissionSystem }
