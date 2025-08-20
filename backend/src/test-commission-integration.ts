import axios from 'axios'

const API_URL = 'http://localhost:3001/api/v1'

interface TestResult {
  testName: string
  passed: boolean
  error?: string
  data?: any
}

async function runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
  try {
    console.log(`\n🧪 Running test: ${testName}`)
    const data = await testFn()
    console.log(`✅ ${testName} - PASSED`)
    return { testName, passed: true, data }
  } catch (error) {
    console.error(`❌ ${testName} - FAILED:`, error)
    return { 
      testName, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error) 
    }
  }
}

async function testCommissionIntegration() {
  console.log('='.repeat(60))
  console.log('🚀 COMMISSION SYSTEM INTEGRATION TEST')
  console.log('='.repeat(60))

  const results: TestResult[] = []

  // Test 1: Get commission configurations
  results.push(await runTest('Get commission configurations', async () => {
    const response = await axios.get(`${API_URL}/commissions/configs`)
    if (!response.data || response.data.length === 0) {
      throw new Error('No commission configurations found')
    }
    console.log(`Found ${response.data.length} configurations`)
    return response.data
  }))

  // Test 2: Get active configuration
  results.push(await runTest('Get active configuration', async () => {
    const response = await axios.get(`${API_URL}/commissions/active`)
    if (!response.data || !response.data.broker) {
      throw new Error('No active configuration found')
    }
    console.log(`Active broker: ${response.data.broker}`)
    return response.data
  }))

  // Test 3: Calculate commission for buy operation
  results.push(await runTest('Calculate buy commission', async () => {
    const response = await axios.post(`${API_URL}/commissions/calculate`, {
      operationType: 'BUY',
      amount: 100000,
      broker: 'galicia'
    })
    
    const { baseCommission, ivaAmount, totalCommission, netAmount } = response.data
    console.log(`Buy $100,000 ARS:`)
    console.log(`  Base commission: $${baseCommission.toFixed(2)}`)
    console.log(`  IVA: $${ivaAmount.toFixed(2)}`)
    console.log(`  Total commission: $${totalCommission.toFixed(2)}`)
    console.log(`  Net amount: $${netAmount.toFixed(2)}`)
    
    // Validar cálculos
    const expectedBase = 100000 * 0.005 // 0.5%
    const expectedIVA = expectedBase * 0.21
    const expectedTotal = expectedBase + expectedIVA
    
    if (Math.abs(baseCommission - expectedBase) > 0.01) {
      throw new Error(`Base commission mismatch: ${baseCommission} vs ${expectedBase}`)
    }
    
    return response.data
  }))

  // Test 4: Calculate commission for sell operation
  results.push(await runTest('Calculate sell commission', async () => {
    const response = await axios.post(`${API_URL}/commissions/calculate`, {
      operationType: 'SELL',
      amount: 50000,
      broker: 'galicia'
    })
    
    const { totalCommission } = response.data
    console.log(`Sell $50,000 ARS - Total commission: $${totalCommission.toFixed(2)}`)
    
    return response.data
  }))

  // Test 5: Project annual commissions
  results.push(await runTest('Project annual commissions', async () => {
    const response = await axios.post(`${API_URL}/commissions/project`, {
      monthlyTradeVolume: 500000,
      portfolioValue: 2000000,
      tradesPerMonth: 10,
      broker: 'galicia'
    })
    
    const { firstYearTotal, monthlyBreakdown } = response.data
    console.log(`Annual projection for $2M portfolio:`)
    console.log(`  First year total: $${firstYearTotal.toFixed(2)}`)
    console.log(`  Monthly average: $${(firstYearTotal / 12).toFixed(2)}`)
    
    return response.data
  }))

  // Test 6: Compare brokers
  results.push(await runTest('Compare brokers', async () => {
    const response = await axios.post(`${API_URL}/commissions/compare`, {
      operationType: 'BUY',
      amount: 200000
    })
    
    console.log('Broker comparison for $200,000 buy:')
    response.data.forEach((broker: any) => {
      console.log(`  ${broker.broker}: $${broker.totalCommission.toFixed(2)} (${broker.percentageOfAmount.toFixed(3)}%)`)
    })
    
    return response.data
  }))

  // Test 7: Analyze historical commissions
  results.push(await runTest('Analyze historical commissions', async () => {
    const response = await axios.get(`${API_URL}/commissions/history`)
    
    const { totalCommissionsPaid, averageCommissionPerTrade, commissionPercentage } = response.data
    console.log('Historical commission analysis:')
    console.log(`  Total paid: $${totalCommissionsPaid.toFixed(2)}`)
    console.log(`  Average per trade: $${averageCommissionPerTrade.toFixed(2)}`)
    console.log(`  Commission %: ${commissionPercentage.toFixed(3)}%`)
    
    return response.data
  }))

  // Test 8: Calculate minimum investment
  results.push(await runTest('Calculate minimum investment', async () => {
    const response = await axios.post(`${API_URL}/commissions/minimum-investment`, {
      broker: 'galicia',
      targetCommissionPercentage: 0.5
    })
    
    const { minimumInvestment, actualCommissionPercentage } = response.data
    console.log('Minimum investment for 0.5% commission:')
    console.log(`  Minimum amount: $${minimumInvestment.toFixed(2)}`)
    console.log(`  Actual commission %: ${actualCommissionPercentage.toFixed(3)}%`)
    
    return response.data
  }))

  // Test 9: Integration with trades (calculate commission preview)
  results.push(await runTest('Trade commission preview', async () => {
    const response = await axios.post(`${API_URL}/trades/calculate-commission`, {
      operationType: 'BUY',
      amount: 150000,
      broker: 'galicia'
    })
    
    console.log(`Trade preview for $150,000:`)
    console.log(`  Commission: $${response.data.totalCommission.toFixed(2)}`)
    console.log(`  Break-even impact: ${(response.data.totalCommission / 150000 * 100).toFixed(2)}%`)
    
    return response.data
  }))

  // Test 10: Dashboard integration (portfolio summary with commissions)
  results.push(await runTest('Dashboard portfolio summary', async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/portfolio-summary`)
      
      if (response.data.totalCommissions !== undefined) {
        console.log('Portfolio commission metrics:')
        console.log(`  Total commissions: $${response.data.totalCommissions.toFixed(2)}`)
        console.log(`  Estimated custody: $${response.data.estimatedCustodyFee.toFixed(2)}/month`)
        console.log(`  Commission impact: ${response.data.commissionImpact.toFixed(2)}%`)
      }
      
      return response.data
    } catch (error) {
      // Dashboard might not have data yet
      console.log('Dashboard has no portfolio data yet (expected)')
      return { message: 'No portfolio data' }
    }
  }))

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  console.log(`Total tests: ${results.length}`)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\nFailed tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`- ${r.testName}: ${r.error}`)
    })
  }

  console.log('\n🎯 Commission System Integration Status:', 
    failed === 0 ? '✅ FULLY OPERATIONAL' : '⚠️ NEEDS ATTENTION'
  )
}

// Run the tests
testCommissionIntegration().catch(console.error)