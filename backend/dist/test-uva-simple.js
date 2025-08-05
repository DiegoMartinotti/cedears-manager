#!/usr/bin/env tsx
import { MigrationRunner } from './database/migrations.js';
import { UVA } from './models/UVA.js';
import { UVAService } from './services/UVAService.js';
import { createLogger } from './utils/logger.js';
const logger = createLogger('UVA-Test');
async function testUVASystem() {
    try {
        console.log('🚀 Iniciando test del sistema UVA...');
        // 1. Ejecutar migraciones
        console.log('📦 Ejecutando migraciones...');
        const migrationRunner = new MigrationRunner();
        await migrationRunner.runMigrations();
        console.log('✅ Migraciones completadas');
        // 2. Crear instancia del modelo UVA
        const uva = new UVA();
        console.log('✅ Modelo UVA creado');
        // 3. Insertar datos de prueba
        console.log('💾 Insertando datos de prueba...');
        const testData = [
            { date: '2024-01-01', value: 100.00, source: 'bcra' },
            { date: '2024-01-15', value: 102.50, source: 'bcra' },
            { date: '2024-02-01', value: 105.00, source: 'bcra' },
            { date: '2024-03-01', value: 110.25, source: 'estadisticas' }
        ];
        for (const data of testData) {
            const created = await uva.create(data);
            console.log(`   ✅ Creado UVA: ${created.date} = ${created.value}`);
        }
        // 4. Verificar conteo
        const count = await uva.getUVACount();
        console.log(`📊 Total valores UVA: ${count}`);
        // 5. Obtener el último valor
        const latest = await uva.findLatest();
        console.log(`📈 Último valor UVA: ${latest?.date} = ${latest?.value} (${latest?.source})`);
        // 6. Calcular ajuste por inflación
        console.log('💰 Calculando ajuste por inflación...');
        const adjustment = await uva.calculateInflationAdjustment(1000, '2024-01-01', '2024-03-01');
        console.log(`   Original: $${adjustment.originalAmount}`);
        console.log(`   Ajustado: $${adjustment.adjustedAmount}`);
        console.log(`   Inflación: ${(adjustment.inflationRate * 100).toFixed(2)}%`);
        // 7. Probar servicio UVA
        console.log('🔧 Probando UVAService...');
        const uvaService = new UVAService();
        const stats = await uvaService.getUVAStatistics();
        console.log(`   Total valores: ${stats.totalCount}`);
        console.log(`   Fuentes: ${JSON.stringify(stats.sources)}`);
        console.log(`   Rango fechas: ${stats.dateRange.earliest} - ${stats.dateRange.latest}`);
        // 8. Probar búsqueda
        console.log('🔍 Probando búsqueda...');
        const searchResults = await uva.search({
            fromDate: '2024-01-01',
            toDate: '2024-02-28',
            orderBy: 'date',
            orderDirection: 'ASC',
            limit: 10
        });
        console.log(`   Resultados encontrados: ${searchResults.length}`);
        searchResults.forEach(result => {
            console.log(`   - ${result.date}: ${result.value} (${result.source})`);
        });
        // 9. Probar upsert
        console.log('🔄 Probando upsert...');
        const upserted = await uva.upsertUVA({
            date: '2024-03-01',
            value: 111.00, // Actualizar valor existente
            source: 'bcra'
        });
        console.log(`   Actualizado: ${upserted.date} = ${upserted.value} (${upserted.source})`);
        const finalCount = await uva.getUVACount();
        console.log(`📊 Total final valores UVA: ${finalCount}`);
        console.log('🎉 ¡Test del sistema UVA completado con éxito!');
    }
    catch (error) {
        console.error('❌ Error en test UVA:', error);
        process.exit(1);
    }
}
// Ejecutar el test
testUVASystem().then(() => {
    console.log('✅ Test finalizado');
    process.exit(0);
}).catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
});
//# sourceMappingURL=test-uva-simple.js.map