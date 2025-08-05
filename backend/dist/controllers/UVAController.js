import { UVAService } from '../services/UVAService.js';
import { uvaUpdateJob } from '../jobs/uvaUpdateJob.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';
const logger = createLogger('UVAController');
// Esquemas de validación
const dateParamSchema = z.object({
    date: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid date format. Use YYYY-MM-DD')
});
const dateRangeSchema = z.object({
    fromDate: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid fromDate format. Use YYYY-MM-DD'),
    toDate: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid toDate format. Use YYYY-MM-DD')
});
const searchUVASchema = z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    source: z.enum(['bcra', 'estadisticas']).optional(),
    limit: z.coerce.number().min(1).max(1000).optional().default(100),
    orderBy: z.enum(['date', 'value']).optional().default('date'),
    orderDirection: z.enum(['ASC', 'DESC']).optional().default('DESC')
});
const inflationAdjustmentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    fromDate: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid fromDate format. Use YYYY-MM-DD'),
    toDate: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid toDate format. Use YYYY-MM-DD')
});
const historicalUpdateSchema = z.object({
    fromDate: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid fromDate format. Use YYYY-MM-DD'),
    toDate: z.string().refine((date) => {
        const parsed = parseISO(date);
        return isValid(parsed);
    }, 'Invalid toDate format. Use YYYY-MM-DD')
});
const cleanupSchema = z.object({
    daysToKeep: z.number().min(30).max(3650).optional().default(365)
});
const jobConfigSchema = z.object({
    enabled: z.boolean().optional(),
    schedule: z.string().optional(),
    businessDaysOnly: z.boolean().optional(),
    retryAttempts: z.number().min(1).max(10).optional(),
    retryDelayMs: z.number().min(1000).max(60000).optional(),
    historicalUpdateDays: z.number().min(1).max(30).optional()
});
export class UVAController {
    uvaService = new UVAService();
    /**
     * GET /uva/latest - Obtiene el valor UVA más reciente
     */
    async getLatest(req, res) {
        try {
            logger.info('Getting latest UVA value');
            const result = await this.uvaService.getLatestUVAValue();
            if (!result.success) {
                res.status(404).json({
                    success: false,
                    error: result.error,
                    message: 'Failed to get latest UVA value'
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    date: result.date,
                    value: result.value,
                    source: result.source,
                    cached: result.cached || false
                }
            });
        }
        catch (error) {
            logger.error('Error getting latest UVA value', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * GET /uva/date/:date - Obtiene valor UVA para una fecha específica
     */
    async getByDate(req, res) {
        try {
            const { date } = dateParamSchema.parse(req.params);
            logger.info('Getting UVA value by date', { date });
            // Buscar en base de datos primero
            const result = await this.uvaService.getLatestUVAValue();
            if (!result.success) {
                res.status(404).json({
                    success: false,
                    error: 'UVA value not found for this date',
                    date
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    date: result.date,
                    value: result.value,
                    source: result.source
                }
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid date parameter',
                    details: error.errors
                });
                return;
            }
            logger.error('Error getting UVA value by date', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * GET /uva/search - Busca valores UVA con filtros
     */
    async search(req, res) {
        try {
            const filters = searchUVASchema.parse(req.query);
            logger.info('Searching UVA values', { filters });
            // TODO: Implementar búsqueda en el modelo UVA
            // const results = await this.uvaService.searchUVAValues(filters)
            res.json({
                success: true,
                data: [],
                filters,
                total: 0
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid search parameters',
                    details: error.errors
                });
                return;
            }
            logger.error('Error searching UVA values', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/inflation-adjustment - Calcula ajuste por inflación
     */
    async calculateInflationAdjustment(req, res) {
        try {
            const { amount, fromDate, toDate } = inflationAdjustmentSchema.parse(req.body);
            logger.info('Calculating inflation adjustment', { amount, fromDate, toDate });
            const result = await this.uvaService.calculateInflationAdjustment(amount, fromDate, toDate);
            res.json({
                success: true,
                data: result
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid adjustment parameters',
                    details: error.errors
                });
                return;
            }
            logger.error('Error calculating inflation adjustment', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * GET /uva/statistics - Obtiene estadísticas de valores UVA
     */
    async getStatistics(req, res) {
        try {
            logger.info('Getting UVA statistics');
            const stats = await this.uvaService.getUVAStatistics();
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            logger.error('Error getting UVA statistics', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/update - Fuerza actualización manual de UVA
     */
    async forceUpdate(req, res) {
        try {
            logger.info('Forcing UVA update');
            const result = await uvaUpdateJob.executeUpdate();
            if (!result.success) {
                res.status(500).json({
                    success: false,
                    error: result.message,
                    stats: result.stats
                });
                return;
            }
            res.json({
                success: true,
                message: result.message,
                data: result.stats
            });
        }
        catch (error) {
            logger.error('Error forcing UVA update', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/historical-update - Actualiza datos históricos
     */
    async updateHistorical(req, res) {
        try {
            const { fromDate, toDate } = historicalUpdateSchema.parse(req.body);
            logger.info('Updating historical UVA data', { fromDate, toDate });
            const result = await uvaUpdateJob.updateHistoricalData(fromDate, toDate);
            if (!result.success) {
                res.status(500).json({
                    success: false,
                    error: result.message
                });
                return;
            }
            res.json({
                success: true,
                message: result.message,
                data: {
                    processedCount: result.processedCount,
                    fromDate,
                    toDate
                }
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid date range parameters',
                    details: error.errors
                });
                return;
            }
            logger.error('Error updating historical UVA data', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * DELETE /uva/cleanup - Limpia valores UVA antiguos
     */
    async cleanup(req, res) {
        try {
            const { daysToKeep } = cleanupSchema.parse(req.body);
            logger.info('Cleaning up old UVA values', { daysToKeep });
            const result = await uvaUpdateJob.cleanupOldUVAValues(daysToKeep);
            if (!result.success) {
                res.status(500).json({
                    success: false,
                    error: result.message
                });
                return;
            }
            res.json({
                success: true,
                message: result.message,
                data: {
                    deletedCount: result.deletedCount,
                    daysToKeep
                }
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid cleanup parameters',
                    details: error.errors
                });
                return;
            }
            logger.error('Error cleaning up UVA values', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    // === JOB MANAGEMENT ENDPOINTS ===
    /**
     * GET /uva/job/status - Obtiene estado del job de actualización
     */
    async getJobStatus(req, res) {
        try {
            logger.info('Getting UVA job status');
            const stats = uvaUpdateJob.getStats();
            const config = uvaUpdateJob.getConfig();
            const dbStats = await uvaUpdateJob.getUVADatabaseStats();
            res.json({
                success: true,
                data: {
                    stats,
                    config,
                    database: dbStats
                }
            });
        }
        catch (error) {
            logger.error('Error getting UVA job status', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * PUT /uva/job/config - Actualiza configuración del job
     */
    async updateJobConfig(req, res) {
        try {
            const newConfig = jobConfigSchema.parse(req.body);
            logger.info('Updating UVA job configuration', { newConfig });
            uvaUpdateJob.updateConfig(newConfig);
            res.json({
                success: true,
                message: 'Job configuration updated successfully',
                data: uvaUpdateJob.getConfig()
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid job configuration',
                    details: error.errors
                });
                return;
            }
            logger.error('Error updating UVA job configuration', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/job/start - Inicia el job de actualización
     */
    async startJob(req, res) {
        try {
            logger.info('Starting UVA update job');
            uvaUpdateJob.start();
            res.json({
                success: true,
                message: 'UVA update job started successfully',
                data: uvaUpdateJob.getStats()
            });
        }
        catch (error) {
            logger.error('Error starting UVA job', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/job/stop - Detiene el job de actualización
     */
    async stopJob(req, res) {
        try {
            logger.info('Stopping UVA update job');
            uvaUpdateJob.stop();
            res.json({
                success: true,
                message: 'UVA update job stopped successfully',
                data: uvaUpdateJob.getStats()
            });
        }
        catch (error) {
            logger.error('Error stopping UVA job', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/job/restart - Reinicia el job de actualización
     */
    async restartJob(req, res) {
        try {
            const newConfig = req.body ? jobConfigSchema.partial().parse(req.body) : undefined;
            logger.info('Restarting UVA update job', { newConfig });
            uvaUpdateJob.restart(newConfig);
            res.json({
                success: true,
                message: 'UVA update job restarted successfully',
                data: {
                    stats: uvaUpdateJob.getStats(),
                    config: uvaUpdateJob.getConfig()
                }
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid job configuration',
                    details: error.errors
                });
                return;
            }
            logger.error('Error restarting UVA job', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * POST /uva/job/reset-stats - Resetea estadísticas del job
     */
    async resetJobStats(req, res) {
        try {
            logger.info('Resetting UVA job statistics');
            uvaUpdateJob.resetStats();
            res.json({
                success: true,
                message: 'Job statistics reset successfully',
                data: uvaUpdateJob.getStats()
            });
        }
        catch (error) {
            logger.error('Error resetting UVA job stats', { error });
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
// Singleton instance
export const uvaController = new UVAController();
//# sourceMappingURL=UVAController.js.map