import cron from 'node-cron';
import { UVAService } from '../services/UVAService.js';
import { createLogger } from '../utils/logger.js';
import { format, isWeekend, subDays } from 'date-fns';
const logger = createLogger('UVAUpdateJob');
export class UVAUpdateJob {
    task = null;
    cleanupTask = null;
    config;
    stats;
    isRunning = false;
    uvaService;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            schedule: config.schedule || '0 18 * * 1-5', // 6 PM días laborales
            businessDaysOnly: config.businessDaysOnly ?? true,
            retryAttempts: config.retryAttempts || 3,
            retryDelayMs: config.retryDelayMs || 10000, // 10 segundos entre reintentos
            historicalUpdateDays: config.historicalUpdateDays || 7
        };
        this.stats = {
            lastRun: null,
            lastSuccess: null,
            lastError: null,
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            valuesUpdated: 0,
            averageExecutionTime: 0,
            isRunning: false
        };
        this.uvaService = new UVAService();
        logger.info('UVAUpdateJob initialized', { config: this.config });
    }
    /**
     * Inicia el job programado
     */
    start() {
        if (!this.config.enabled) {
            logger.info('UVAUpdateJob is disabled');
            return;
        }
        if (this.task) {
            logger.warn('UVAUpdateJob is already running');
            return;
        }
        this.task = cron.schedule(this.config.schedule, async () => {
            await this.executeUpdate();
        }, {
            scheduled: false,
            timezone: 'America/Argentina/Buenos_Aires' // Timezone de Argentina
        });
        this.task.start();
        // Programar limpieza automática semanal
        this.scheduleCleanup();
        logger.info('UVAUpdateJob started', {
            schedule: this.config.schedule,
            businessDaysOnly: this.config.businessDaysOnly
        });
    }
    /**
     * Detiene el job programado
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
        }
        if (this.cleanupTask) {
            this.cleanupTask.stop();
            this.cleanupTask = null;
        }
        logger.info('UVAUpdateJob stopped');
    }
    /**
     * Reinicia el job con nueva configuración
     */
    restart(newConfig) {
        this.stop();
        if (newConfig) {
            this.config = { ...this.config, ...newConfig };
            logger.info('UVAUpdateJob configuration updated', { config: this.config });
        }
        this.start();
    }
    /**
     * Ejecuta actualización manual inmediata
     */
    async executeUpdate() {
        if (this.isRunning) {
            logger.warn('UVA update already in progress, skipping');
            return { success: false, message: 'Update already in progress' };
        }
        const startTime = Date.now();
        this.isRunning = true;
        this.stats.isRunning = true;
        this.stats.totalRuns++;
        this.stats.lastRun = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        try {
            logger.info('Starting UVA update job');
            // Verificar si debemos ejecutar solo en días laborales
            if (this.config.businessDaysOnly && !this.shouldRunToday()) {
                logger.info('Skipping UVA update - weekend day');
                this.isRunning = false;
                this.stats.isRunning = false;
                return {
                    success: true,
                    message: 'Skipped - weekend day'
                };
            }
            // Ejecutar actualización con reintentos
            let lastError = null;
            let result = null;
            for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
                try {
                    logger.debug('UVA update attempt', { attempt });
                    // Obtener valor UVA más reciente
                    result = await this.uvaService.getLatestUVAValue();
                    if (result.success) {
                        // También actualizar algunos días históricos por si faltaron
                        await this.updateRecentHistoricalData();
                        break; // Éxito, salir del loop de reintentos
                    }
                    else {
                        throw new Error(result.error || 'Failed to get UVA value');
                    }
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error('Unknown error');
                    logger.warn('UVA update attempt failed', {
                        attempt,
                        error: lastError.message
                    });
                    // Esperar antes del siguiente intento
                    if (attempt < this.config.retryAttempts) {
                        await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
                    }
                }
            }
            // Verificar si todos los intentos fallaron
            if (!result || !result.success) {
                throw lastError || new Error('All update attempts failed');
            }
            const executionTime = Date.now() - startTime;
            // Actualizar estadísticas
            this.stats.successfulRuns++;
            this.stats.lastSuccess = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            this.stats.valuesUpdated++;
            this.stats.lastUVAValue = result.value;
            this.stats.lastUVADate = result.date;
            this.updateAverageExecutionTime(executionTime);
            logger.info('UVA update completed successfully', {
                date: result.date,
                value: result.value,
                source: result.source,
                cached: result.cached,
                executionTime: `${executionTime}ms`
            });
            return {
                success: true,
                message: `UVA value updated: ${result.value} for ${result.date}`,
                stats: {
                    date: result.date,
                    value: result.value,
                    source: result.source,
                    cached: result.cached,
                    executionTime
                }
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.stats.failedRuns++;
            this.stats.lastError = `${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}: ${errorMessage}`;
            this.updateAverageExecutionTime(executionTime);
            logger.error('UVA update job failed', {
                error: errorMessage,
                executionTime: `${executionTime}ms`
            });
            return {
                success: false,
                message: `UVA update failed: ${errorMessage}`,
                stats: { executionTime }
            };
        }
        finally {
            this.isRunning = false;
            this.stats.isRunning = false;
        }
    }
    /**
     * Actualiza datos históricos recientes por si faltaron algunos días
     */
    async updateRecentHistoricalData() {
        try {
            const fromDate = format(subDays(new Date(), this.config.historicalUpdateDays), 'yyyy-MM-dd');
            const toDate = format(new Date(), 'yyyy-MM-dd');
            logger.debug('Updating recent historical UVA data', { fromDate, toDate });
            const historicalResult = await this.uvaService.updateHistoricalUVAValues(fromDate, toDate);
            if (historicalResult.success && historicalResult.processedCount > 0) {
                this.stats.valuesUpdated += historicalResult.processedCount;
                logger.info('Historical UVA data updated', {
                    processedCount: historicalResult.processedCount
                });
            }
        }
        catch (error) {
            logger.warn('Failed to update recent historical UVA data', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // No propagar el error, es opcional
        }
    }
    /**
     * Ejecuta actualización histórica masiva
     */
    async updateHistoricalData(fromDate, toDate) {
        try {
            logger.info('Starting historical UVA data update', { fromDate, toDate });
            const result = await this.uvaService.updateHistoricalUVAValues(fromDate, toDate);
            if (result.success) {
                logger.info('Historical UVA data update completed', {
                    processedCount: result.processedCount
                });
                return {
                    success: true,
                    message: `Updated ${result.processedCount} historical UVA values`,
                    processedCount: result.processedCount
                };
            }
            else {
                throw new Error(result.errors.join(', '));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Historical UVA data update failed', { error: errorMessage });
            return {
                success: false,
                message: `Historical update failed: ${errorMessage}`
            };
        }
    }
    /**
     * Ejecuta limpieza de valores UVA antiguos
     */
    async cleanupOldUVAValues(daysToKeep = 365) {
        try {
            logger.info('Starting UVA values cleanup', { daysToKeep });
            const deletedCount = await this.uvaService.cleanupOldUVAValues(daysToKeep);
            logger.info('UVA values cleanup completed', { deletedCount });
            return {
                success: true,
                message: `Deleted ${deletedCount} old UVA values`,
                deletedCount
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('UVA values cleanup failed', { error: errorMessage });
            return {
                success: false,
                message: `Cleanup failed: ${errorMessage}`
            };
        }
    }
    /**
     * Programa limpieza automática de valores UVA antiguos
     */
    scheduleCleanup(schedule = '0 3 * * 0') {
        this.cleanupTask = cron.schedule(schedule, async () => {
            logger.info('Running scheduled UVA values cleanup');
            await this.cleanupOldUVAValues();
        }, {
            timezone: 'America/Argentina/Buenos_Aires'
        });
        logger.info('UVA cleanup scheduled', { schedule });
    }
    /**
     * Obtiene estadísticas del job
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Obtiene configuración actual
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Actualiza configuración
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        logger.info('UVAUpdateJob configuration updated', {
            oldConfig,
            newConfig: this.config
        });
        // Reiniciar si el schedule cambió y el job está corriendo
        if (oldConfig.schedule !== this.config.schedule && this.task) {
            this.restart();
        }
    }
    /**
     * Resetea estadísticas
     */
    resetStats() {
        this.stats = {
            lastRun: null,
            lastSuccess: null,
            lastError: null,
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            valuesUpdated: 0,
            averageExecutionTime: 0,
            isRunning: this.isRunning
        };
        logger.info('UVAUpdateJob stats reset');
    }
    /**
     * Determina si el job debe ejecutarse hoy
     */
    shouldRunToday() {
        const now = new Date();
        // Si está configurado para días laborales, no ejecutar en fines de semana
        if (this.config.businessDaysOnly && isWeekend(now)) {
            return false;
        }
        return true;
    }
    /**
     * Actualiza el tiempo promedio de ejecución
     */
    updateAverageExecutionTime(executionTime) {
        if (this.stats.totalRuns === 1) {
            this.stats.averageExecutionTime = executionTime;
        }
        else {
            // Promedio móvil simple
            this.stats.averageExecutionTime =
                (this.stats.averageExecutionTime * (this.stats.totalRuns - 1) + executionTime) / this.stats.totalRuns;
        }
    }
    /**
     * Obtiene estadísticas de la base de datos UVA
     */
    async getUVADatabaseStats() {
        try {
            return await this.uvaService.getUVAStatistics();
        }
        catch (error) {
            logger.error('Error getting UVA database stats', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return null;
        }
    }
    /**
     * Cierra el job y libera recursos
     */
    shutdown() {
        this.stop();
        logger.info('UVAUpdateJob shut down');
    }
}
// Singleton instance
export const uvaUpdateJob = new UVAUpdateJob({
    enabled: true,
    schedule: '0 18 * * 1-5', // 6 PM días laborales
    businessDaysOnly: true,
    retryAttempts: 3,
    retryDelayMs: 10000,
    historicalUpdateDays: 7
});
// Auto-iniciar cuando se importa (excepto en tests)
if (process.env.NODE_ENV !== 'test') {
    uvaUpdateJob.start();
}
//# sourceMappingURL=uvaUpdateJob.js.map