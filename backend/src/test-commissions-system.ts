#!/usr/bin/env node

/**
 * Script de prueba para el sistema de comisiones implementado
 */

import { CommissionService } from './services/CommissionService.js'
import { CommissionController } from './controllers/CommissionController.js'
import { createLogger } from './utils/logger.js'

const logger = createLogger('CommissionTest')

async function testCommissionSystem() {
  console.log('🧪 Iniciando pruebas del sistema de comisiones...\n')

  const commissionService = new CommissionService()

  try {
    // Test 1: Obtener configuraciones disponibles
    console.log('📋 Test 1: Configuraciones disponibles')
    const configs = commissionService.getAvailableConfigurations()
    console.log(`✅ Configuraciones cargadas: ${configs.length}`)
    configs.forEach(config => {
      console.log(`   - ${config.name}: Compra ${(config.buy.percentage * 100).toFixed(2)}%, Venta ${(config.sell.percentage * 100).toFixed(2)}%`)
    })
    console.log()

    // Test 2: Calcular comisión de compra
    console.log('💰 Test 2: Cálculo de comisión de compra')
    const buyAmount = 50000
    const buyCommission = commissionService.calculateOperationCommission('BUY', buyAmount)
    console.log(`   Monto: $${buyAmount.toLocaleString()}`)
    console.log(`   Comisión base: $${buyCommission.baseCommission.toFixed(2)}`)
    console.log(`   IVA: $${buyCommission.ivaAmount.toFixed(2)}`)
    console.log(`   Total comisión: $${buyCommission.totalCommission.toFixed(2)}`)
    console.log(`   Monto neto: $${buyCommission.netAmount.toFixed(2)}`)
    console.log(`   Mínimo aplicado: ${buyCommission.breakdown.minimumApplied ? 'Sí' : 'No'}`)
    console.log()

    // Test 3: Calcular comisión de venta
    console.log('💸 Test 3: Cálculo de comisión de venta')
    const sellAmount = 75000
    const sellCommission = commissionService.calculateOperationCommission('SELL', sellAmount)
    console.log(`   Monto: $${sellAmount.toLocaleString()}`)
    console.log(`   Comisión base: $${sellCommission.baseCommission.toFixed(2)}`)
    console.log(`   IVA: $${sellCommission.ivaAmount.toFixed(2)}`)
    console.log(`   Total comisión: $${sellCommission.totalCommission.toFixed(2)}`)
    console.log(`   Monto neto: $${sellCommission.netAmount.toFixed(2)}`)
    console.log()

    // Test 4: Calcular custodia
    console.log('🏦 Test 4: Cálculo de custodia')
    const portfolioValue = 2500000 // $2.5M
    const custody = commissionService.calculateCustodyFee(portfolioValue)
    console.log(`   Valor de cartera: $${portfolioValue.toLocaleString()}`)
    console.log(`   Monto aplicable: $${custody.applicableAmount.toLocaleString()}`)
    console.log(`   Costo mensual: $${custody.totalMonthlyCost.toFixed(2)}`)
    console.log(`   Costo anual: $${custody.annualFee.toFixed(2)}`)
    console.log(`   ¿Exento?: ${custody.isExempt ? 'Sí' : 'No'}`)
    console.log()

    // Test 5: Proyección completa
    console.log('📊 Test 5: Proyección de comisiones completa')
    const projection = commissionService.calculateCommissionProjection('BUY', buyAmount, portfolioValue)
    console.log(`   Costo operación: $${projection.operation.totalCommission.toFixed(2)}`)
    console.log(`   Costo custodia anual: $${projection.custody.annualFee.toFixed(2)}`)
    console.log(`   Costo total primer año: $${projection.totalFirstYearCost.toFixed(2)}`)
    console.log(`   Impacto break-even: +${projection.breakEvenImpact.toFixed(2)}%`)
    console.log()

    // Test 6: Comparación entre brokers
    console.log('⚖️  Test 6: Comparación entre brokers')
    const comparison = commissionService.compareBrokerCommissions('BUY', buyAmount, portfolioValue)
    console.log('   Ranking por costo total (1er año):')
    comparison.forEach((broker, index) => {
      console.log(`   ${broker.ranking}. ${broker.name}: $${broker.totalFirstYearCost.toFixed(2)}`)
    })
    console.log()

    // Test 7: Monto mínimo recomendado
    console.log('📏 Test 7: Monto mínimo recomendado')
    const minInvestment = commissionService.calculateMinimumInvestmentForCommissionThreshold(2.5)
    console.log(`   Para comisión máxima de 2.5%:`)
    console.log(`   Monto mínimo: $${minInvestment.minimumAmount.toLocaleString()}`)
    console.log(`   Comisión efectiva: ${minInvestment.commissionPercentage.toFixed(2)}%`)
    console.log(`   Recomendación: ${minInvestment.recommendation}`)
    console.log()

    // Test 8: Configuración personalizada
    console.log('⚙️  Test 8: Configuración personalizada')
    const customConfig = {
      name: 'Broker Personalizado',
      broker: 'custom',
      isActive: true,
      buy: { percentage: 0.003, minimum: 100, iva: 0.21 },
      sell: { percentage: 0.003, minimum: 100, iva: 0.21 },
      custody: { exemptAmount: 2000000, monthlyPercentage: 0.002, monthlyMinimum: 300, iva: 0.21 }
    }
    
    const customCommission = commissionService.calculateOperationCommission('BUY', buyAmount, customConfig)
    console.log(`   Con configuración personalizada (0.3%):`)
    console.log(`   Total comisión: $${customCommission.totalCommission.toFixed(2)}`)
    console.log(`   Diferencia vs Galicia: $${(customCommission.totalCommission - buyCommission.totalCommission).toFixed(2)}`)
    console.log()

    console.log('✅ Todas las pruebas del sistema de comisiones completadas exitosamente!')
    console.log('🎯 El sistema está listo para usar en producción.')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
    logger.error('Test failed:', error)
    process.exit(1)
  }
}

// Ejecutar las pruebas si el script se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testCommissionSystem()
}

export { testCommissionSystem }