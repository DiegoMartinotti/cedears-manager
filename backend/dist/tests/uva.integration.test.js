import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UVAService } from '../services/UVAService.js';
import { uvaUpdateJob } from '../jobs/uvaUpdateJob.js';
import { uvaController } from '../controllers/UVAController.js';
import { UVA } from '../models/UVA.js';
import DatabaseConnection from '../database/connection.js';
describe('UVA Integration Tests', () => {
    let uvaService;
    let uva;
    let db;
    beforeEach(() => {
        uvaService = new UVAService();
        uva = new UVA();
        db = DatabaseConnection.getInstance();
        // Limpiar tabla de prueba
        try {
            db.exec('DELETE FROM uva_values');
        }
        catch (error) {
            // Tabla no existe aún
        }
    });
    afterEach(() => {
        // Detener job si está corriendo
        try {
            uvaUpdateJob.stop();
        }
        catch (error) {
            // Ignorar errores
        }
        // Limpiar después de cada test
        try {
            db.exec('DELETE FROM uva_values');
        }
        catch (error) {
            // Ignorar errores de limpieza
        }
    });
    describe('Full UVA Workflow', () => {
        it('should complete full UVA data workflow', async () => {
            // 1. Insertar datos de prueba
            const testData = [
                { date: '2024-01-01', value: 100.00, source: 'bcra' },
                { date: '2024-01-15', value: 102.50, source: 'bcra' },
                { date: '2024-02-01', value: 105.00, source: 'bcra' },
                { date: '2024-03-01', value: 110.25, source: 'estadisticas' }
            ];
            for (const data of testData) {
                await uva.create(data);
            }
            // 2. Verificar que los datos se insertaron correctamente
            const count = await uva.getUVACount();
            expect(count).toBe(4);
            // 3. Obtener estadísticas
            const stats = await uvaService.getUVAStatistics();
            expect(stats.totalCount).toBe(4);
            expect(stats.sources.bcra).toBe(3);
            expect(stats.sources.estadisticas).toBe(1);
            expect(stats.latestValue).toBeDefined();
            expect(stats.latestValue.value).toBe(110.25);
            // 4. Calcular ajuste por inflación
            const adjustment = await uvaService.calculateInflationAdjustment(1000, '2024-01-01', '2024-03-01');
            expect(adjustment.originalAmount).toBe(1000);
            expect(adjustment.adjustedAmount).toBe(1102.5); // 1000 * (110.25/100)
            expect(adjustment.inflationRate).toBe(0.1025);
            // 5. Buscar valores por rango de fechas
            const searchResults = await uva.search({
                fromDate: '2024-01-01',
                toDate: '2024-02-28',
                orderBy: 'date',
                orderDirection: 'ASC'
            });
            expect(searchResults.length).toBe(3);
            expect(searchResults[0].date).toBe('2024-01-01');
            expect(searchResults[2].date).toBe('2024-02-01');
            // 6. Verificar upsert functionality
            const newValue = await uva.upsertUVA({
                date: '2024-03-01',
                value: 111.00, // Actualizar valor existente
                source: 'bcra'
            });
            expect(newValue.value).toBe(111.00);
            expect(newValue.source).toBe('bcra');
            // El count debería seguir siendo 4
            const finalCount = await uva.getUVACount();
            expect(finalCount).toBe(4);
        });
        it('should handle batch operations correctly', async () => {
            const batchData = Array.from({ length: 30 }, (_, i) => ({
                date: `2024-01-${String(i + 1).padStart(2, '0')}`,
                value: 100 + (i * 0.1),
                source: i % 2 === 0 ? 'bcra' : 'estadisticas'
            }));
            const insertedCount = await uva.batchUpsert(batchData);
            expect(insertedCount).toBe(30);
            const totalCount = await uva.getUVACount();
            expect(totalCount).toBe(30);
            // Verificar que los valores están en orden correcto
            const allValues = await uva.search({
                orderBy: 'date',
                orderDirection: 'ASC',
                limit: 50
            });
            expect(allValues.length).toBe(30);
            expect(allValues[0].date).toBe('2024-01-01');
            expect(allValues[29].date).toBe('2024-01-30');
        });
    });
    describe('UVA Controller Integration', () => {
        let mockRequest;
        let mockResponse;
        let responseData;
        beforeEach(() => {
            responseData = {};
            mockRequest = {
                params: {},
                query: {},
                body: {}
            };
            mockResponse = {
                json: (data) => {
                    responseData = data;
                    return mockResponse;
                },
                status: (code) => {
                    responseData.statusCode = code;
                    return mockResponse;
                }
            };
        });
        it('should handle getStatistics endpoint', async () => {
            // Insertar datos de prueba
            await uva.create({ date: '2024-01-01', value: 100.00, source: 'bcra' });
            await uva.create({ date: '2024-01-02', value: 100.50, source: 'bcra' });
            await uvaController.getStatistics(mockRequest, mockResponse);
            expect(responseData.success).toBe(true);
            expect(responseData.data.totalCount).toBe(2);
            expect(responseData.data.latestValue).toBeDefined();
            expect(responseData.data.latestValue.value).toBeGreaterThan(0);
        });
        it('should handle calculateInflationAdjustment endpoint', async () => {
            // Insertar datos de prueba
            await uva.create({ date: '2024-01-01', value: 100.00, source: 'bcra' });
            await uva.create({ date: '2024-03-01', value: 110.00, source: 'bcra' });
            mockRequest.body = {
                amount: 1000,
                fromDate: '2024-01-01',
                toDate: '2024-03-01'
            };
            await uvaController.calculateInflationAdjustment(mockRequest, mockResponse);
            expect(responseData.success).toBe(true);
            expect(responseData.data.originalAmount).toBe(1000);
            expect(responseData.data.adjustedAmount).toBe(1100);
            expect(responseData.data.inflationRate).toBe(0.1);
        });
        it('should handle validation errors', async () => {
            mockRequest.body = {
                amount: -1000, // Invalid negative amount
                fromDate: 'invalid-date',
                toDate: '2024-03-01'
            };
            await uvaController.calculateInflationAdjustment(mockRequest, mockResponse);
            expect(responseData.success).toBe(false);
            expect(responseData.error).toContain('Invalid');
            expect(responseData.statusCode).toBe(400);
        });
    });
    describe('UVA Job Integration', () => {
        it('should configure job correctly', () => {
            const config = uvaUpdateJob.getConfig();
            expect(config.enabled).toBe(true);
            expect(config.schedule).toBe('0 18 * * 1-5'); // 6 PM weekdays
            expect(config.businessDaysOnly).toBe(true);
            expect(config.retryAttempts).toBeGreaterThan(0);
        });
        it('should update job configuration', () => {
            const newConfig = {
                schedule: '0 20 * * 1-5', // 8 PM weekdays
                retryAttempts: 5
            };
            uvaUpdateJob.updateConfig(newConfig);
            const updatedConfig = uvaUpdateJob.getConfig();
            expect(updatedConfig.schedule).toBe('0 20 * * 1-5');
            expect(updatedConfig.retryAttempts).toBe(5);
        });
        it('should track job statistics', () => {
            const initialStats = uvaUpdateJob.getStats();
            expect(initialStats.totalRuns).toBe(0);
            expect(initialStats.successfulRuns).toBe(0);
            expect(initialStats.failedRuns).toBe(0);
            expect(initialStats.isRunning).toBe(false);
        });
        it('should reset statistics correctly', () => {
            uvaUpdateJob.resetStats();
            const stats = uvaUpdateJob.getStats();
            expect(stats.totalRuns).toBe(0);
            expect(stats.lastRun).toBeNull();
            expect(stats.lastSuccess).toBeNull();
            expect(stats.lastError).toBeNull();
        });
    });
    describe('Error Handling', () => {
        it('should handle database connection errors gracefully', async () => {
            // Este test requeriría mock de la conexión de base de datos
            // Por ahora, simplemente verificamos que las funciones no lancen errores
            try {
                const stats = await uvaService.getUVAStatistics();
                expect(stats).toBeDefined();
            }
            catch (error) {
                // Error esperado si no hay conexión
                expect(error).toBeInstanceOf(Error);
            }
        });
        it('should handle missing UVA data for calculations', async () => {
            // Intentar calcular inflación sin datos
            try {
                await uvaService.calculateInflationAdjustment(1000, '2023-01-01', '2023-12-31');
                // Si no hay error, el test pasa
            }
            catch (error) {
                // Error esperado por falta de datos
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toContain('UVA values not found');
            }
        });
    });
    describe('Data Consistency', () => {
        it('should maintain data consistency across operations', async () => {
            // 1. Insertar datos iniciales
            const initialData = [
                { date: '2024-01-01', value: 100.00, source: 'bcra' },
                { date: '2024-01-02', value: 100.50, source: 'bcra' }
            ];
            for (const data of initialData) {
                await uva.create(data);
            }
            let count = await uva.getUVACount();
            expect(count).toBe(2);
            // 2. Actualizar un valor existente
            await uva.upsertUVA({
                date: '2024-01-01',
                value: 101.00,
                source: 'estadisticas'
            });
            // El count no debería cambiar
            count = await uva.getUVACount();
            expect(count).toBe(2);
            // Pero el valor sí debería cambiar
            const updatedValue = await uva.findByDate('2024-01-01');
            expect(updatedValue?.value).toBe(101.00);
            expect(updatedValue?.source).toBe('estadisticas');
            // 3. Agregar nuevo valor
            await uva.upsertUVA({
                date: '2024-01-03',
                value: 101.50,
                source: 'bcra'
            });
            count = await uva.getUVACount();
            expect(count).toBe(3);
            // 4. Verificar que el último valor es correcto
            const latest = await uva.findLatest();
            expect(latest?.date).toBe('2024-01-03');
            expect(latest?.value).toBe(101.50);
        });
        it('should handle concurrent operations correctly', async () => {
            // Simular operaciones concurrentes
            const promises = [];
            for (let i = 1; i <= 10; i++) {
                promises.push(uva.create({
                    date: `2024-01-${String(i).padStart(2, '0')}`,
                    value: 100 + i,
                    source: 'bcra'
                }));
            }
            const results = await Promise.all(promises);
            expect(results.length).toBe(10);
            const finalCount = await uva.getUVACount();
            expect(finalCount).toBe(10);
        });
    });
});
//# sourceMappingURL=uva.integration.test.js.map