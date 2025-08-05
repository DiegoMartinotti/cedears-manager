/**
 * Test básico del sistema de comisiones - JavaScript puro
 */

class CommissionCalculator {
  constructor() {
    this.config = {
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
        exemptAmount: 1000000,    // $1M ARS
        monthlyPercentage: 0.0025, // 0.25%
        monthlyMinimum: 500,       // $500 ARS
        iva: 0.21
      }
    }
  }

  calculateOperationCommission(type, totalAmount) {
    const operationConfig = type === 'BUY' ? this.config.buy : this.config.sell

    // Calcular comisión base
    const percentageCommission = totalAmount * operationConfig.percentage
    const baseCommission = Math.max(percentageCommission, operationConfig.minimum)
    const minimumApplied = percentageCommission < operationConfig.minimum

    // Calcular IVA
    const ivaAmount = baseCommission * operationConfig.iva
    const totalCommission = baseCommission + ivaAmount

    // Calcular monto neto
    const netAmount = type === 'BUY' 
      ? totalAmount + totalCommission
      : totalAmount - totalCommission

    return {
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
  }

  calculateCustodyFee(portfolioValueARS) {
    const custodyConfig = this.config.custody
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

    return {
      applicableAmount,
      monthlyFee,
      annualFee,
      ivaAmount,
      totalMonthlyCost,
      isExempt
    }
  }
}

function runTests() {
  console.log('🧮 Testing Commission Calculations')
  console.log('==================================')

  const calculator = new CommissionCalculator()
  let allTestsPassed = true

  // Test 1: Compra pequeña (aplica mínimo)
  console.log('\n1. Small BUY operation ($10,000):')
  const smallBuy = calculator.calculateOperationCommission('BUY', 10000)
  
  console.log(`   Base Commission: $${smallBuy.baseCommission.toFixed(2)}`)
  console.log(`   IVA: $${smallBuy.ivaAmount.toFixed(2)}`)
  console.log(`   Total Commission: $${smallBuy.totalCommission.toFixed(2)}`)
  console.log(`   Net Amount: $${smallBuy.netAmount.toFixed(2)}`)
  console.log(`   Commission Rate: ${(smallBuy.totalCommission / 10000 * 100).toFixed(2)}%`)
  console.log(`   Minimum Applied: ${smallBuy.breakdown.minimumApplied}`)

  // Validación
  const expectedBase = 150 // Mínimo
  const expectedIva = 150 * 0.21
  const expectedTotal = expectedBase + expectedIva

  if (Math.abs(smallBuy.baseCommission - expectedBase) > 0.01) {
    console.log(`   ❌ ERROR: Expected base ${expectedBase}, got ${smallBuy.baseCommission}`)
    allTestsPassed = false
  } else {
    console.log('   ✅ Small BUY calculation correct')
  }

  // Test 2: Compra grande (aplica porcentaje)
  console.log('\n2. Large BUY operation ($100,000):')
  const largeBuy = calculator.calculateOperationCommission('BUY', 100000)
  
  console.log(`   Base Commission: $${largeBuy.baseCommission.toFixed(2)}`)
  console.log(`   IVA: $${largeBuy.ivaAmount.toFixed(2)}`)
  console.log(`   Total Commission: $${largeBuy.totalCommission.toFixed(2)}`)
  console.log(`   Net Amount: $${largeBuy.netAmount.toFixed(2)}`)
  console.log(`   Commission Rate: ${(largeBuy.totalCommission / 100000 * 100).toFixed(2)}%`)
  console.log(`   Minimum Applied: ${largeBuy.breakdown.minimumApplied}`)

  // Validación
  const expectedLargeBase = 100000 * 0.005 // 500
  if (Math.abs(largeBuy.baseCommission - expectedLargeBase) > 0.01) {
    console.log(`   ❌ ERROR: Expected base ${expectedLargeBase}, got ${largeBuy.baseCommission}`)
    allTestsPassed = false
  } else {
    console.log('   ✅ Large BUY calculation correct')
  }

  // Test 3: Venta
  console.log('\n3. SELL operation ($50,000):')
  const sell = calculator.calculateOperationCommission('SELL', 50000)
  
  console.log(`   Base Commission: $${sell.baseCommission.toFixed(2)}`)
  console.log(`   Total Commission: $${sell.totalCommission.toFixed(2)}`)
  console.log(`   Net Amount: $${sell.netAmount.toFixed(2)}`)

  if (sell.netAmount > 50000) {
    console.log(`   ❌ ERROR: SELL should subtract commission`)
    allTestsPassed = false
  } else {
    console.log('   ✅ SELL calculation correct')
  }

  // Test 4: Custodia exenta
  console.log('\n4. Custody - Exempt portfolio ($800,000):')
  const exemptCustody = calculator.calculateCustodyFee(800000)
  
  console.log(`   Is Exempt: ${exemptCustody.isExempt}`)
  console.log(`   Monthly Fee: $${exemptCustody.monthlyFee.toFixed(2)}`)
  console.log(`   Annual Fee: $${exemptCustody.annualFee.toFixed(2)}`)

  if (!exemptCustody.isExempt || exemptCustody.monthlyFee !== 0) {
    console.log(`   ❌ ERROR: Should be exempt`)
    allTestsPassed = false
  } else {
    console.log('   ✅ Exempt custody correct')
  }

  // Test 5: Custodia no exenta
  console.log('\n5. Custody - Non-exempt portfolio ($2,000,000):')
  const nonExemptCustody = calculator.calculateCustodyFee(2000000)
  
  console.log(`   Is Exempt: ${nonExemptCustody.isExempt}`)
  console.log(`   Applicable Amount: $${nonExemptCustody.applicableAmount.toLocaleString()}`)
  console.log(`   Monthly Fee: $${nonExemptCustody.monthlyFee.toFixed(2)}`)
  console.log(`   Total Monthly Cost: $${nonExemptCustody.totalMonthlyCost.toFixed(2)}`)
  console.log(`   Annual Fee: $${nonExemptCustody.annualFee.toFixed(2)}`)

  // Validación manual
  const expectedApplicable = 2000000 - 1000000 // 1M
  const expectedMonthlyFee = expectedApplicable * 0.0025 // 2500

  if (nonExemptCustody.applicableAmount !== expectedApplicable) {
    console.log(`   ❌ ERROR: Expected applicable ${expectedApplicable}, got ${nonExemptCustody.applicableAmount}`)
    allTestsPassed = false
  } else if (Math.abs(nonExemptCustody.monthlyFee - expectedMonthlyFee) > 0.01) {
    console.log(`   ❌ ERROR: Expected monthly ${expectedMonthlyFee}, got ${nonExemptCustody.monthlyFee}`)
    allTestsPassed = false
  } else {
    console.log('   ✅ Non-exempt custody correct')
  }

  // Test 6: Análisis de break-even
  console.log('\n6. Break-even analysis ($50,000 investment):')
  const investment = 50000
  const buyComm = calculator.calculateOperationCommission('BUY', investment)
  const sellComm = calculator.calculateOperationCommission('SELL', investment)
  
  const totalCommissions = buyComm.totalCommission + sellComm.totalCommission
  const breakEvenPercentage = (totalCommissions / investment) * 100
  
  console.log(`   Buy Commission: $${buyComm.totalCommission.toFixed(2)}`)
  console.log(`   Sell Commission: $${sellComm.totalCommission.toFixed(2)}`)
  console.log(`   Total Commissions: $${totalCommissions.toFixed(2)}`)
  console.log(`   Break-even return needed: ${breakEvenPercentage.toFixed(2)}%`)

  if (breakEvenPercentage > 5) {
    console.log(`   ⚠️  High commission impact`)
  } else {
    console.log(`   ✅ Reasonable commission impact`)
  }

  // Test 7: Recomendaciones por monto
  console.log('\n7. Commission impact by amount:')
  const amounts = [5000, 10000, 25000, 50000, 100000]
  
  for (const amount of amounts) {
    const commission = calculator.calculateOperationCommission('BUY', amount)
    const impact = (commission.totalCommission / amount) * 100
    
    let status = '✅ Good'
    if (impact > 3) status = '❌ Too high'
    else if (impact > 2) status = '⚠️  High'
    
    console.log(`   $${amount.toLocaleString()}: ${impact.toFixed(1)}% ${status}`)
  }

  console.log('\n' + '='.repeat(50))
  if (allTestsPassed) {
    console.log('🎉 All tests PASSED!')
    console.log('✅ Commission calculation system is working correctly')
  } else {
    console.log('❌ Some tests FAILED!')
    console.log('⚠️  Commission calculation system needs review')
  }

  return allTestsPassed
}

// Ejecutar los tests
const success = runTests()
process.exit(success ? 0 : 1)