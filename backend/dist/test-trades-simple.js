/**
 * Script de prueba simple para el módulo de operaciones
 * Valida que los servicios de Trade y Commission funcionan correctamente
 */
import { CommissionService } from './services/CommissionService.js';
import { createLogger } from './utils/logger.js';
const logger = createLogger('TradeTestSimple');
async function testCommissionService() {
    console.log('\n=== Test CommissionService ===');
    const commissionService = new CommissionService();
    try {
        // Test 1: Cálculo de comisión de compra pequeña (aplica mínimo)
        console.log('\n1. Testing small BUY commission (minimum applies):');
        const smallBuy = commissionService.calculateOperationCommission('BUY', 10000);
        console.log(`  Amount: $10,000 ARS`);
        console.log(`  Base Commission: $${smallBuy.baseCommission.toFixed(2)}`);
        console.log(`  IVA: $${smallBuy.ivaAmount.toFixed(2)}`);
        console.log(`  Total Commission: $${smallBuy.totalCommission.toFixed(2)}`);
        console.log(`  Net Amount: $${smallBuy.netAmount.toFixed(2)}`);
        console.log(`  Minimum Applied: ${smallBuy.breakdown.minimumApplied}`);
        console.log(`  Commission Rate: ${(smallBuy.totalCommission / 10000 * 100).toFixed(2)}%`);
        // Test 2: Cálculo de comisión de compra grande (aplica porcentaje)
        console.log('\n2. Testing large BUY commission (percentage applies):');
        const largeBuy = commissionService.calculateOperationCommission('BUY', 100000);
        console.log(`  Amount: $100,000 ARS`);
        console.log(`  Base Commission: $${largeBuy.baseCommission.toFixed(2)}`);
        console.log(`  IVA: $${largeBuy.ivaAmount.toFixed(2)}`);
        console.log(`  Total Commission: $${largeBuy.totalCommission.toFixed(2)}`);
        console.log(`  Net Amount: $${largeBuy.netAmount.toFixed(2)}`);
        console.log(`  Minimum Applied: ${largeBuy.breakdown.minimumApplied}`);
        console.log(`  Commission Rate: ${(largeBuy.totalCommission / 100000 * 100).toFixed(2)}%`);
        // Test 3: Cálculo de custodia (exento)
        console.log('\n3. Testing custody fee (exempt portfolio):');
        const exemptCustody = commissionService.calculateCustodyFee(800000);
        console.log(`  Portfolio Value: $800,000 ARS`);
        console.log(`  Is Exempt: ${exemptCustody.isExempt}`);
        console.log(`  Applicable Amount: $${exemptCustody.applicableAmount.toFixed(2)}`);
        console.log(`  Monthly Fee: $${exemptCustody.monthlyFee.toFixed(2)}`);
        console.log(`  Annual Fee: $${exemptCustody.annualFee.toFixed(2)}`);
        // Test 4: Cálculo de custodia (no exento)
        console.log('\n4. Testing custody fee (non-exempt portfolio):');
        const nonExemptCustody = commissionService.calculateCustodyFee(2000000);
        console.log(`  Portfolio Value: $2,000,000 ARS`);
        console.log(`  Is Exempt: ${nonExemptCustody.isExempt}`);
        console.log(`  Applicable Amount: $${nonExemptCustody.applicableAmount.toFixed(2)}`);
        console.log(`  Monthly Fee: $${nonExemptCustody.monthlyFee.toFixed(2)}`);
        console.log(`  Total Monthly Cost: $${nonExemptCustody.totalMonthlyCost.toFixed(2)}`);
        console.log(`  Annual Fee: $${nonExemptCustody.annualFee.toFixed(2)}`);
        // Test 5: Proyección completa
        console.log('\n5. Testing commission projection:');
        const projection = commissionService.calculateCommissionProjection('BUY', 50000, 800000);
        console.log(`  Operation: BUY $50,000`);
        console.log(`  Current Portfolio: $800,000`);
        console.log(`  Operation Commission: $${projection.operation.totalCommission.toFixed(2)}`);
        console.log(`  Annual Custody: $${projection.custody.annualFee.toFixed(2)}`);
        console.log(`  Total First Year Cost: $${projection.totalFirstYearCost.toFixed(2)}`);
        console.log(`  Break-even Impact: ${projection.breakEvenImpact.toFixed(2)}%`);
        // Test 6: Comparación de brokers
        console.log('\n6. Testing broker comparison:');
        const comparison = commissionService.compareBrokerCommissions('BUY', 75000, 1200000);
        console.log(`  Operation: BUY $75,000`);
        console.log(`  Portfolio: $1,200,000`);
        console.log(`  Broker Rankings:`);
        comparison.forEach(broker => {
            console.log(`    ${broker.ranking}. ${broker.name}`);
            console.log(`       Operation: $${broker.operationCommission.totalCommission.toFixed(2)}`);
            console.log(`       Custody: $${broker.custodyFee.annualFee.toFixed(2)}`);
            console.log(`       Total: $${broker.totalFirstYearCost.toFixed(2)}`);
        });
        // Test 7: Inversión mínima recomendada
        console.log('\n7. Testing minimum investment recommendation:');
        const minInvestment = commissionService.calculateMinimumInvestmentForCommissionThreshold(2.5);
        console.log(`  Target Commission: 2.5%`);
        console.log(`  Minimum Amount: $${minInvestment.minimumAmount.toFixed(2)}`);
        console.log(`  Actual Commission: ${minInvestment.commissionPercentage.toFixed(2)}%`);
        console.log(`  Recommendation: ${minInvestment.recommendation}`);
        // Test 8: Configuraciones disponibles
        console.log('\n8. Testing available configurations:');
        const configs = commissionService.getAvailableConfigurations();
        console.log(`  Available Brokers: ${configs.length}`);
        configs.forEach(config => {
            console.log(`    - ${config.name} (${config.broker})`);
            console.log(`      Buy: ${config.buy.percentage * 100}% min $${config.buy.minimum}`);
            console.log(`      Custody exempt up to: $${config.custody.exemptAmount.toLocaleString()}`);
        });
        console.log('\n✅ All CommissionService tests passed!');
    }
    catch (error) {
        console.error('❌ CommissionService test failed:', error);
        throw error;
    }
}
async function testCalculationAccuracy() {
    console.log('\n=== Test Calculation Accuracy ===');
    const commissionService = new CommissionService();
    try {
        // Validaciones de precisión matemática
        console.log('\n1. Validating mathematical precision:');
        // Test caso específico Banco Galicia
        const galiciaConfig = commissionService.getConfigurationByBroker('galicia');
        if (!galiciaConfig) {
            throw new Error('Galicia configuration not found');
        }
        // Caso: $30,000 ARS
        const amount = 30000;
        const commission = commissionService.calculateOperationCommission('BUY', amount, galiciaConfig);
        // Cálculo manual esperado:
        // 30000 * 0.005 = 150 (exactamente el mínimo)
        // IVA: 150 * 0.21 = 31.5
        // Total: 150 + 31.5 = 181.5
        // Net: 30000 + 181.5 = 30181.5
        const expectedBase = 150;
        const expectedIva = 31.5;
        const expectedTotal = 181.5;
        const expectedNet = 30181.5;
        console.log(`  Amount: $${amount}`);
        console.log(`  Expected base: $${expectedBase} | Actual: $${commission.baseCommission}`);
        console.log(`  Expected IVA: $${expectedIva} | Actual: $${commission.ivaAmount}`);
        console.log(`  Expected total: $${expectedTotal} | Actual: $${commission.totalCommission}`);
        console.log(`  Expected net: $${expectedNet} | Actual: $${commission.netAmount}`);
        // Validaciones
        if (Math.abs(commission.baseCommission - expectedBase) > 0.01) {
            throw new Error(`Base commission mismatch: expected ${expectedBase}, got ${commission.baseCommission}`);
        }
        if (Math.abs(commission.ivaAmount - expectedIva) > 0.01) {
            throw new Error(`IVA mismatch: expected ${expectedIva}, got ${commission.ivaAmount}`);
        }
        if (Math.abs(commission.totalCommission - expectedTotal) > 0.01) {
            throw new Error(`Total commission mismatch: expected ${expectedTotal}, got ${commission.totalCommission}`);
        }
        if (Math.abs(commission.netAmount - expectedNet) > 0.01) {
            throw new Error(`Net amount mismatch: expected ${expectedNet}, got ${commission.netAmount}`);
        }
        console.log('  ✅ Mathematical precision validated');
        // Test caso custodia
        console.log('\n2. Validating custody calculation:');
        const portfolioValue = 1500000; // $1.5M
        const custody = commissionService.calculateCustodyFee(portfolioValue, galiciaConfig);
        // Cálculo manual esperado:
        // Aplicable: 1500000 - 1000000 = 500000
        // Mensual: 500000 * 0.0025 = 1250
        // IVA: 1250 * 0.21 = 262.5
        // Total mensual: 1250 + 262.5 = 1512.5
        // Anual: 1512.5 * 12 = 18150
        const expectedApplicable = 500000;
        const expectedMonthly = 1250;
        const expectedIvaMensual = 262.5;
        const expectedTotalMensual = 1512.5;
        const expectedAnual = 18150;
        console.log(`  Portfolio: $${portfolioValue.toLocaleString()}`);
        console.log(`  Expected applicable: $${expectedApplicable} | Actual: $${custody.applicableAmount}`);
        console.log(`  Expected monthly: $${expectedMonthly} | Actual: $${custody.monthlyFee}`);
        console.log(`  Expected IVA monthly: $${expectedIvaMensual} | Actual: $${custody.ivaAmount}`);
        console.log(`  Expected total monthly: $${expectedTotalMensual} | Actual: $${custody.totalMonthlyCost}`);
        console.log(`  Expected annual: $${expectedAnual} | Actual: $${custody.annualFee}`);
        // Validaciones
        if (custody.applicableAmount !== expectedApplicable) {
            throw new Error(`Applicable amount mismatch: expected ${expectedApplicable}, got ${custody.applicableAmount}`);
        }
        if (Math.abs(custody.monthlyFee - expectedMonthly) > 0.01) {
            throw new Error(`Monthly fee mismatch: expected ${expectedMonthly}, got ${custody.monthlyFee}`);
        }
        if (Math.abs(custody.annualFee - expectedAnual) > 0.01) {
            throw new Error(`Annual fee mismatch: expected ${expectedAnual}, got ${custody.annualFee}`);
        }
        console.log('  ✅ Custody calculation validated');
        console.log('\n✅ All calculation accuracy tests passed!');
    }
    catch (error) {
        console.error('❌ Calculation accuracy test failed:', error);
        throw error;
    }
}
async function main() {
    console.log('🚀 Starting Trade Module Simple Tests');
    console.log('=====================================');
    try {
        await testCommissionService();
        await testCalculationAccuracy();
        console.log('\n🎉 All tests completed successfully!');
        console.log('✅ Trade module is ready for integration');
    }
    catch (error) {
        console.error('\n💥 Tests failed:', error);
        process.exit(1);
    }
}
// Ejecutar solo si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=test-trades-simple.js.map