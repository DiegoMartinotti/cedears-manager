import cron from 'node-cron';
import { quoteService } from '../services/QuoteService.js';
import { createLogger } from '../utils/logger.js';
import { format, isWeekend } from 'date-fns';
const logger = createLogger('QuoteUpdateJob');
export class QuoteUpdateJob {
    task = null;
    config;
    stats;
    isRunning = false;
    constructor(config = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            schedule: config.schedule || '*/2 * * * *', // Cada 2 minutos por defecto
            marketHoursOnly: config.marketHoursOnly ?? true,
            batchSize: config.batchSize || 50,
            retryAttempts: config.retryAttempts || 3,
            retryDelayMs: config.retryDelayMs || 5000
        };
        this.stats = {
            lastRun: null,
            lastSuccess: null,
            lastError: null,
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            quotesUpdated: 0,
            averageExecutionTime: 0,
            isRunning: false
        };
        logger.info('QuoteUpdateJob initialized', { config: this.config });
    }
    /**
     * Inicia el job programado
     */
    start() {
        if (!this.config.enabled) {
            logger.info('QuoteUpdateJob is disabled');
            return;
        }
        if (this.task) {
            logger.warn('QuoteUpdateJob is already running');
            return;
        }
        this.task = cron.schedule(this.config.schedule, async () => {
            await this.executeUpdate();
        }, {
            scheduled: false,
            timezone: 'America/New_York' // NYSE timezone
        });
        this.task.start();
        logger.info('QuoteUpdateJob started', {
            schedule: this.config.schedule,
            marketHoursOnly: this.config.marketHoursOnly
        });
    }
    /**
     * Detiene el job programado
     */
    stop() {
        if (!this.task) {
            logger.warn('QuoteUpdateJob is not running');
            return;
        }
        this.task.stop();
        this.task = null;
        logger.info('QuoteUpdateJob stopped');
    }
    /**
     * Reinicia el job con nueva configuración
     */
    restart(newConfig) {
        this.stop();
        if (newConfig) {
            this.config = { ...this.config, ...newConfig };
            logger.info('QuoteUpdateJob configuration updated', { config: this.config });
        }
        this.start();
    }
    /**
     * Ejecuta actualización manual inmediata
     */
    async executeUpdate() {
        if (this.isRunning) {
            logger.warn('Quote update already in progress, skipping');
            return { success: false, message: 'Update already in progress' };
        }
        const startTime = Date.now();
        this.isRunning = true;
        this.stats.isRunning = true;
        this.stats.totalRuns++;
        this.stats.lastRun = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        try {
            logger.info('Starting quote update job');
            // Verificar si debemos ejecutar solo en horario de mercado
            if (this.config.marketHoursOnly && !this.shouldRunNow()) {
                logger.info('Skipping update - outside market hours');
                this.isRunning = false;
                this.stats.isRunning = false;
                return {
                    success: true,
                    message: 'Skipped - outside market hours'
                };
            }
            // Ejecutar actualización con reintentos
            let lastError = null;
            let results = null;
            for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
                try {
                    logger.debug('Quote update attempt', { attempt });
                    results = await quoteService.updateAllWatchlistQuotes();
                    break; // Éxito, salir del loop de reintentos
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error('Unknown error');
                    logger.warn('Quote update attempt failed', {
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
            if (!results && lastError) {
                throw lastError;
            }
            // Procesar resultados
            const successCount = results.filter((r) => r.success).length;
            const failedCount = results.length - successCount;
            const executionTime = Date.now() - startTime;
            // Actualizar estadísticas
            this.stats.successfulRuns++;
            this.stats.lastSuccess = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            this.stats.quotesUpdated += successCount;
            this.updateAverageExecutionTime(executionTime);
            logger.info('Quote update completed successfully', {
                total: results.length,
                successful: successCount,
                failed: failedCount,
                executionTime: `${executionTime}ms`
            });
            // Log detalles de fallos si los hay
            if (failedCount > 0) {
                const failedSymbols = results
                    .filter((r) => !r.success)
                    .map((r) => `${r.symbol}: ${r.error}`);
                logger.warn('Some quotes failed to update', {
                    failedCount,
                    failures: failedSymbols.slice(0, 5) // Solo los primeros 5 para evitar spam
                });
            }
            return {
                success: true,
                message: `Updated ${successCount}/${results.length} quotes`,
                stats: {
                    successful: successCount,
                    failed: failedCount,
                    executionTime,
                    results: results.slice(0, 10) // Solo las primeras 10 para response
                }
            };
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.stats.failedRuns++;
            this.stats.lastError = `${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}: ${errorMessage}`;
            this.updateAverageExecutionTime(executionTime);
            logger.error('Quote update job failed', {
                error: errorMessage,
                executionTime: `${executionTime}ms`
            });
            return {
                success: false,
                message: `Update failed: ${errorMessage}`,
                stats: { executionTime }
            };
        }
        finally {
            this.isRunning = false;
            this.stats.isRunning = false;
        }
    }
    /**
     * Ejecuta limpieza de cotizaciones antiguas
     */
    async cleanupOldQuotes(daysToKeep = 30) {
        try {
            logger.info('Starting quote cleanup', { daysToKeep });
            const deletedCount = await quoteService.cleanupOldQuotes(daysToKeep);
            logger.info('Quote cleanup completed', { deletedCount });
            return {
                success: true,
                message: `Deleted ${deletedCount} old quotes`,
                deletedCount
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Quote cleanup failed', { error: errorMessage });
            return {
                success: false,
                message: `Cleanup failed: ${errorMessage}`
            };
        }
    }
    /**
     * Programa limpieza automática de cotizaciones antiguas
     */
    scheduleCleanup(schedule = '0 2 * * 0') {
        cron.schedule(schedule, async () => {
            logger.info('Running scheduled quote cleanup');
            await this.cleanupOldQuotes();
        }, {
            timezone: 'America/New_York'
        });
        logger.info('Quote cleanup scheduled', { schedule });
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
        logger.info('QuoteUpdateJob configuration updated', {
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
            quotesUpdated: 0,
            averageExecutionTime: 0,
            isRunning: this.isRunning
        };
        logger.info('QuoteUpdateJob stats reset');
    }
    /**
     * Determina si el job debe ejecutarse ahora
     */
    shouldRunNow() {
        const now = new Date();
        // No ejecutar en fines de semana si está configurado para horario de mercado
        if (isWeekend(now) && this.config.marketHoursOnly) {
            return false;
        }
        // Verificar horario de mercado NYSE (9:30 AM - 4:00 PM ET)
        const marketHours = quoteService.getMarketHours();
        if (this.config.marketHoursOnly && !marketHours.isOpen) {
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
     * Cierra el job y libera recursos
     */
    shutdown() {
        this.stop();
        logger.info('QuoteUpdateJob shut down');
    }
}
// Singleton instance
export const quoteUpdateJob = new QuoteUpdateJob({
    enabled: true,
    schedule: '*/2 * * * *', // Cada 2 minutos
    marketHoursOnly: true,
    batchSize: 50,
    retryAttempts: 3,
    retryDelayMs: 5000
});
// Auto-iniciar cuando se importa
if (process.env.NODE_ENV !== 'test') {
    quoteUpdateJob.start();
    // Programar limpieza automática los domingos
    quoteUpdateJob.scheduleCleanup();
}
//# sourceMappingURL=quoteUpdateJob.js.map