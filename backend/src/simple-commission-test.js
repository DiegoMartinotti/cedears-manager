console.log('🧪 Iniciando prueba simple del sistema de comisiones...\n')

// Import CommissionService from the compiled version
import { CommissionService } from './services/CommissionService.js'

async function runSimpleTest() {
  try {
    const commissionService = new CommissionService()
    
    console.log('📋 Test: Configuraciones disponibles')
    const configs = commissionService.getAvailableConfigurations()
    console.log(`✅ Configuraciones cargadas: ${configs.length}`)
    
    console.log('\n💰 Test: Cálculo de comisión de compra')
    const buyAmount = 50000
    const buyCommission = commissionService.calculateOperationCommission('BUY', buyAmount)
    console.log(`   Monto: $${buyAmount.toLocaleString()}`)
    console.log(`   Total comisión: $${buyCommission.totalCommission.toFixed(2)}`)
    console.log(`   Monto neto: $${buyCommission.netAmount.toFixed(2)}`)
    
    console.log('\n🏦 Test: Cálculo de custodia')
    const portfolioValue = 2500000
    const custody = commissionService.calculateCustodyFee(portfolioValue)
    console.log(`   Valor de cartera: $${portfolioValue.toLocaleString()}`)
    console.log(`   Costo anual: $${custody.annualFee.toFixed(2)}`)
    console.log(`   ¿Exento?: ${custody.isExempt ? 'Sí' : 'No'}`)
    
    console.log('\n✅ Prueba completada exitosamente!')
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message)
  }
}

runSimpleTest()