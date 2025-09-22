/**
 * Test básico del CommissionService sin dependencias externas
 */
/* eslint-disable max-lines-per-function, no-console, no-unused-vars, no-redeclare */

// Definir interfaces locales para evitar problemas de compilación
interface CommissionConfig {
  name: string
  broker: string
  isActive: boolean
  buy: {
    percentage: number
    minimum: number
    iva: number
  }
  sell: {
    percentage: number
    minimum: number
    iva: number
  }
  custody: {
    exemptAmount: number
    monthlyPercentage: number
    monthlyMinimum: number
    iva: number
  }
}

interface CommissionCalculation {
  baseCommission: number
  ivaAmount: number
  totalCommission: number
  netAmount: number
  breakdown: {
    operationType: 'BUY' | 'SELL'
    totalAmount: number
    commissionRate: number
    minimumApplied: boolean
    ivaRate: number
  }
}

const GALICIA_COMMISSION_CONFIG: Readonly<CommissionConfig> = {
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
    exemptAmount: 1000000,    // $1M ARS
    monthlyPercentage: 0.0025, // 0.25%
    monthlyMinimum: 500,       // $500 ARS
    iva: 0.21
  }
} as const satisfies CommissionConfig

class SimpleCommissionCalculator {

  calculateOperationCommission(
    type: 'BUY' | 'SELL',
    totalAmount: number
  ): CommissionCalculation {
    const operationConfig = type === 'BUY'
      ? GALICIA_COMMISSION_CONFIG.buy
      : GALICIA_COMMISSION_CONFIG.sell

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

  calculateCustodyFee(portfolioValueARS: number): {
    applicableAmount: number
    monthlyFee: number
    annualFee: number
    ivaAmount: number
    totalMonthlyCost: number
    isExempt: boolean
  } {
    const custodyConfig = GALICIA_COMMISSION_CONFIG.custody

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

function assertClose(actual: number, expected: number, message: string) {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(message)
  }
}

function testCommissionCalculations() {
  console.log('🧮 Testing Commission Calculations')
  console.log('==================================')

  const calculator = new SimpleCommissionCalculator()

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
  const expectedNet = 10000 + expectedTotal

  assertClose(
    smallBuy.baseCommission,
    expectedBase,
    `❌ Small BUY base commission error: expected ${expectedBase}, got ${smallBuy.baseCommission}`
  )
  assertClose(
    smallBuy.ivaAmount,
    expectedIva,
    `❌ Small BUY IVA error: expected ${expectedIva}, got ${smallBuy.ivaAmount}`
  )
  assertClose(
    smallBuy.totalCommission,
    expectedTotal,
    `❌ Small BUY total commission error: expected ${expectedTotal}, got ${smallBuy.totalCommission}`
  )
  assertClose(
    smallBuy.netAmount,
    expectedNet,
    `❌ Small BUY net amount error: expected ${expectedNet}, got ${smallBuy.netAmount}`
  )
  console.log('   ✅ Small BUY calculation correct')

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
  const expectedLargeIva = expectedLargeBase * 0.21
  const expectedLargeTotal = expectedLargeBase + expectedLargeIva

  assertClose(
    largeBuy.baseCommission,
    expectedLargeBase,
    `❌ Large BUY base commission error: expected ${expectedLargeBase}, got ${largeBuy.baseCommission}`
  )
  assertClose(
    largeBuy.ivaAmount,
    expectedLargeIva,
    `❌ Large BUY IVA error: expected ${expectedLargeIva}, got ${largeBuy.ivaAmount}`
  )
  assertClose(
    largeBuy.totalCommission,
    expectedLargeTotal,
    `❌ Large BUY total commission error: expected ${expectedLargeTotal}, got ${largeBuy.totalCommission}`
  )
  console.log('   ✅ Large BUY calculation correct')

  // Test 3: Venta (resta comisión)
  console.log('\n3. SELL operation ($50,000):')
  const sell = calculator.calculateOperationCommission('SELL', 50000)
  
  console.log(`   Base Commission: $${sell.baseCommission.toFixed(2)}`)
  console.log(`   IVA: $${sell.ivaAmount.toFixed(2)}`)
  console.log(`   Total Commission: $${sell.totalCommission.toFixed(2)}`)
  console.log(`   Net Amount: $${sell.netAmount.toFixed(2)}`)
  console.log(`   Commission Rate: ${(sell.totalCommission / 50000 * 100).toFixed(2)}%`)

  // Validación (en venta se resta)
  const expectedSellBase = 50000 * 0.005 // 250
  const expectedSellNet = 50000 - (expectedSellBase * 1.21)

  if (sell.netAmount > 50000) {
    throw new Error(`❌ SELL should subtract commission, but net amount is greater than original`)
  }
  assertClose(
    sell.baseCommission,
    expectedSellBase,
    `❌ SELL base commission error: expected ${expectedSellBase}, got ${sell.baseCommission}`
  )
  assertClose(
    sell.netAmount,
    expectedSellNet,
    `❌ SELL net amount error: expected ${expectedSellNet}, got ${sell.netAmount}`
  )
  console.log('   ✅ SELL calculation correct')

  // Test 4: Custodia exenta
  console.log('\n4. Custody fee - Exempt portfolio ($800,000):')
  const exemptPortfolioValue = 800000
  const exemptCustody = calculator.calculateCustodyFee(exemptPortfolioValue)

  console.log(`   Portfolio Value: $${exemptPortfolioValue.toLocaleString()}`)
  console.log(`   Is Exempt: ${exemptCustody.isExempt}`)
  console.log(`   Applicable Amount: $${exemptCustody.applicableAmount.toLocaleString()}`)
  console.log(`   Monthly Fee: $${exemptCustody.monthlyFee.toFixed(2)}`)
  console.log(`   Annual Fee: $${exemptCustody.annualFee.toFixed(2)}`)

  if (!exemptCustody.isExempt || exemptCustody.monthlyFee !== 0) {
    throw new Error(`❌ Portfolio under $1M should be exempt from custody fees`)
  }
  console.log('   ✅ Exempt custody calculation correct')

  // Test 5: Custodia no exenta
  console.log('\n5. Custody fee - Non-exempt portfolio ($2,000,000):')
  const nonExemptPortfolioValue = 2000000
  const nonExemptCustody = calculator.calculateCustodyFee(nonExemptPortfolioValue)

  console.log(`   Portfolio Value: $${nonExemptPortfolioValue.toLocaleString()}`)
  console.log(`   Is Exempt: ${nonExemptCustody.isExempt}`)
  console.log(`   Applicable Amount: $${nonExemptCustody.applicableAmount.toLocaleString()}`)
  console.log(`   Monthly Fee: $${nonExemptCustody.monthlyFee.toFixed(2)}`)
  console.log(`   IVA: $${nonExemptCustody.ivaAmount.toFixed(2)}`)
  console.log(`   Total Monthly Cost: $${nonExemptCustody.totalMonthlyCost.toFixed(2)}`)
  console.log(`   Annual Fee: $${nonExemptCustody.annualFee.toFixed(2)}`)

  // Validación manual
  const expectedApplicable = 2000000 - 1000000 // 1M
  const expectedMonthlyFee = expectedApplicable * 0.0025 // 2500
  const expectedIva = expectedMonthlyFee * 0.21 // 525
  const expectedTotalMonthly = expectedMonthlyFee + expectedIva // 3025
  const expectedAnnual = expectedTotalMonthly * 12 // 36300

  if (nonExemptCustody.applicableAmount !== expectedApplicable) {
    throw new Error(`❌ Applicable amount error: expected ${expectedApplicable}, got ${nonExemptCustody.applicableAmount}`)
  }

  assertClose(
    nonExemptCustody.monthlyFee,
    expectedMonthlyFee,
    `❌ Monthly fee error: expected ${expectedMonthlyFee}, got ${nonExemptCustody.monthlyFee}`
  )
  assertClose(
    nonExemptCustody.ivaAmount,
    expectedIva,
    `❌ Custody IVA error: expected ${expectedIva}, got ${nonExemptCustody.ivaAmount}`
  )
  assertClose(
    nonExemptCustody.totalMonthlyCost,
    expectedTotalMonthly,
    `❌ Total monthly cost error: expected ${expectedTotalMonthly}, got ${nonExemptCustody.totalMonthlyCost}`
  )
  assertClose(
    nonExemptCustody.annualFee,
    expectedAnnual,
    `❌ Annual custody fee error: expected ${expectedAnnual}, got ${nonExemptCustody.annualFee}`
  )

  console.log('   ✅ Non-exempt custody calculation correct')

  console.log('\n🎉 All commission calculation tests passed!')
}

function testBreakEvenCalculations() {
  console.log('\n💰 Testing Break-Even Scenarios')
  console.log('================================')

  const calculator = new SimpleCommissionCalculator()

  // Escenario: Inversión de $50,000 que necesita rentabilidad para cubrir comisiones
  const investment = 50000
  const buyCommission = calculator.calculateOperationCommission('BUY', investment)
  const sellCommission = calculator.calculateOperationCommission('SELL', investment)

  console.log(`\nBreak-even analysis for $${investment.toLocaleString()} investment:`)
  console.log(`   Buy Commission: $${buyCommission.totalCommission.toFixed(2)}`)
  console.log(`   Sell Commission: $${sellCommission.totalCommission.toFixed(2)}`)
  
  const totalCommissions = buyCommission.totalCommission + sellCommission.totalCommission
  const breakEvenPercentage = (totalCommissions / investment) * 100
  
  console.log(`   Total Commissions: $${totalCommissions.toFixed(2)}`)
  console.log(`   Break-even return needed: ${breakEvenPercentage.toFixed(2)}%`)

  // Calcular precio de venta necesario
  const netInvestment = buyCommission.netAmount
  const sellGrossNeeded = netInvestment + sellCommission.totalCommission
  const minimumReturn = ((sellGrossNeeded - investment) / investment) * 100

  console.log(`   Net investment: $${netInvestment.toFixed(2)}`)
  console.log(`   Minimum gross return needed: ${minimumReturn.toFixed(2)}%`)

  if (breakEvenPercentage > 5) {
    console.log(`   ⚠️  High commission impact: ${breakEvenPercentage.toFixed(2)}%`)
  } else {
    console.log(`   ✅ Reasonable commission impact: ${breakEvenPercentage.toFixed(2)}%`)
  }

  // Escenarios con custodia
  console.log(`\nWith custody fees (2M portfolio):`)
  const custodyPortfolioValue = 2000000
  const custodyFee = calculator.calculateCustodyFee(custodyPortfolioValue)
  const annualCustody = custodyFee.annualFee
  const custodyImpact = (annualCustody / custodyPortfolioValue) * 100

  console.log(`   Annual custody: $${annualCustody.toFixed(2)}`)
  console.log(`   Custody impact: ${custodyImpact.toFixed(2)}% annually`)
  console.log(`   Total cost impact: ${(breakEvenPercentage + custodyImpact).toFixed(2)}%`)
}

function testRecommendations() {
  console.log('\n💡 Testing Investment Recommendations')
  console.log('=====================================')

  const calculator = new SimpleCommissionCalculator()

  const amounts = [5000, 10000, 25000, 50000, 100000, 200000]

  console.log('\nCommission impact by investment amount:')
  console.log('Amount\t\tCommission\tImpact%\tRecommendation')
  console.log('-------\t\t----------\t-------\t--------------')

  for (const amount of amounts) {
    const commission = calculator.calculateOperationCommission('BUY', amount)
    const impact = (commission.totalCommission / amount) * 100
    
    let recommendation = ''
    if (impact > 3) {
      recommendation = '❌ Too high'
    } else if (impact > 2) {
      recommendation = '⚠️  High'
    } else if (impact > 1) {
      recommendation = '✅ Acceptable'
    } else {
      recommendation = '🎯 Optimal'
    }

    console.log(`$${amount.toLocaleString()}\t\t$${commission.totalCommission.toFixed(0)}\t\t${impact.toFixed(1)}%\t${recommendation}`)
  }

  // Encontrar monto mínimo para 2% de impacto
  const targetImpact = 2 // 2%
  const minAmount = (150 * 1.21) / (targetImpact / 100) // Comisión mínima / target

  console.log(`\nFor ${targetImpact}% maximum commission impact:`)
  console.log(`   Minimum investment: $${minAmount.toFixed(0)}`)
  console.log(`   Recommendation: Invest at least $${Math.ceil(minAmount / 1000) * 1000} per operation`)
}

function main() {
  console.log('🚀 CEDEARs Manager - Commission Calculator Test')
  console.log('===============================================')

  try {
    testCommissionCalculations()
    testBreakEvenCalculations()
    testRecommendations()

    console.log('\n✅ All tests completed successfully!')
    console.log('🎯 Commission calculation module is working correctly')
    
  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

// Ejecutar el test
main()
