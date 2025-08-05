#!/usr/bin/env tsx
import axios from 'axios';
const API_BASE = 'http://localhost:3001/api/v1';
async function testUVAAPI() {
    try {
        console.log('🌐 Probando API UVA...');
        // 1. Verificar health check
        console.log('\n1. 🔍 Health Check...');
        const health = await axios.get(`${API_BASE}/health`);
        console.log(`   Status: ${health.data.status}`);
        // 2. Obtener estadísticas UVA
        console.log('\n2. 📊 Estadísticas UVA...');
        const stats = await axios.get(`${API_BASE}/uva/statistics`);
        console.log(`   Total valores: ${stats.data.data.totalCount}`);
        console.log(`   Fuentes: ${JSON.stringify(stats.data.data.sources)}`);
        console.log(`   Último valor: ${stats.data.data.latestValue?.value} (${stats.data.data.latestValue?.date})`);
        // 3. Obtener último valor UVA
        console.log('\n3. 📈 Último valor UVA...');
        const latest = await axios.get(`${API_BASE}/uva/latest`);
        console.log(`   Fecha: ${latest.data.data.date}`);
        console.log(`   Valor: ${latest.data.data.value}`);
        console.log(`   Fuente: ${latest.data.data.source}`);
        // 4. Calcular ajuste por inflación
        console.log('\n4. 💰 Ajuste por inflación...');
        const adjustment = await axios.post(`${API_BASE}/uva/inflation-adjustment`, {
            amount: 1000,
            fromDate: '2024-01-01',
            toDate: '2024-03-01'
        });
        console.log(`   Monto original: $${adjustment.data.data.originalAmount}`);
        console.log(`   Monto ajustado: $${adjustment.data.data.adjustedAmount}`);
        console.log(`   Tasa de inflación: ${(adjustment.data.data.inflationRate * 100).toFixed(2)}%`);
        // 5. Forzar actualización
        console.log('\n5. 🔄 Forzar actualización...');
        const update = await axios.post(`${API_BASE}/uva/update`);
        console.log(`   Éxito: ${update.data.success}`);
        console.log(`   Mensaje: ${update.data.message}`);
        // 6. Estado del job
        console.log('\n6. ⚙️ Estado del job...');
        const jobStatus = await axios.get(`${API_BASE}/uva/job/status`);
        console.log(`   Job activo: ${jobStatus.data.data.config.enabled}`);
        console.log(`   Horario: ${jobStatus.data.data.config.schedule}`);
        console.log(`   Total ejecuciones: ${jobStatus.data.data.stats.totalRuns}`);
        console.log(`   Ejecuciones exitosas: ${jobStatus.data.data.stats.successfulRuns}`);
        // 7. Buscar valores UVA
        console.log('\n7. 🔍 Búsqueda de valores...');
        const search = await axios.get(`${API_BASE}/uva/search?fromDate=2024-01-01&toDate=2024-12-31&limit=5`);
        console.log(`   Resultados encontrados: ${search.data.total}`);
        console.log('\n🎉 ¡API UVA funcionando correctamente!');
    }
    catch (error) {
        console.error('❌ Error probando API UVA:', error.response?.data || error.message);
        process.exit(1);
    }
}
// Ejecutar el test
testUVAAPI().then(() => {
    console.log('\n✅ Test de API finalizado');
    process.exit(0);
}).catch(error => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
});
//# sourceMappingURL=test-uva-api.js.map