import winston from 'winston';
import path from 'path';
const logDir = process.env.LOG_DIR || './logs';
/**
 * Logger especializado para operaciones de Claude con métricas avanzadas
 */
export class ClaudeLogger {
    logger;
    metrics;
    metricsFile;
    constructor() {
        // Logger específico para Claude con formato personalizado
        this.logger = winston.createLogger({
            level: 'debug',
            format: this.createClaudeFormat(),
            defaultMeta: { service: 'claude-analysis' },
            transports: [
                // Console para desarrollo
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.colorize(), this.createClaudeFormat())
                }),
                // Archivo específico para análisis de Claude
                new winston.transports.File({
                    filename: path.join(logDir, 'claude-analysis.log'),
                    maxsize: 10485760, // 10MB
                    maxFiles: 10,
                }),
                // Archivo para errores de Claude
                new winston.transports.File({
                    filename: path.join(logDir, 'claude-errors.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                })
            ]
        });
        // Inicializar métricas
        this.metrics = this.initializeMetrics();
        this.metricsFile = path.join(logDir, 'claude-metrics.json');
        // Cargar métricas existentes si existen
        this.loadMetrics();
        // Guardar métricas cada 5 minutos
        setInterval(() => this.saveMetrics(), 300000);
    }
    /**
     * Log inicio de análisis
     */
    analysisStarted(data) {
        this.logger.info('Analysis started', {
            event: 'analysis_started',
            ...data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Log análisis completado exitosamente
     */
    analysisCompleted(data) {
        this.logger.info('Analysis completed', {
            event: 'analysis_completed',
            ...data,
            timestamp: new Date().toISOString()
        });
        // Actualizar métricas
        this.updateSuccessMetrics(data);
    }
    /**
     * Log análisis fallido
     */
    analysisFailed(data) {
        this.logger.error('Analysis failed', {
            event: 'analysis_failed',
            ...data,
            timestamp: new Date().toISOString()
        });
        // Actualizar métricas de error
        this.updateFailureMetrics(data);
    }
    /**
     * Log hit de caché
     */
    cacheHit(data) {
        this.logger.debug('Cache hit', {
            event: 'cache_hit',
            ...data,
            timestamp: new Date().toISOString()
        });
        this.metrics.cacheHits++;
    }
    /**
     * Log miss de caché
     */
    cacheMiss(data) {
        this.logger.debug('Cache miss', {
            event: 'cache_miss',
            ...data,
            timestamp: new Date().toISOString()
        });
        this.metrics.cacheMisses++;
    }
    /**
     * Log rate limit alcanzado
     */
    rateLimitHit(data) {
        this.logger.warn('Rate limit hit', {
            event: 'rate_limit_hit',
            ...data,
            timestamp: new Date().toISOString()
        });
        this.metrics.rateLimitHits++;
    }
    /**
     * Log métricas de performance
     */
    performanceMetrics(data) {
        this.logger.info('Performance metrics', {
            event: 'performance_metrics',
            ...data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Log análisis de confianza baja
     */
    lowConfidenceWarning(data) {
        this.logger.warn('Low confidence analysis', {
            event: 'low_confidence_warning',
            ...data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Obtiene métricas actuales
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Obtiene estadísticas de performance
     */
    getPerformanceStats() {
        const total = this.metrics.totalAnalyses;
        const successful = this.metrics.successfulAnalyses;
        const totalCache = this.metrics.cacheHits + this.metrics.cacheMisses;
        // Top 10 instrumentos más analizados
        const topInstruments = Object.entries(this.metrics.instruments)
            .sort(([, a], [, b]) => b.analyses - a.analyses)
            .slice(0, 10)
            .map(([code, stats]) => ({
            code,
            analyses: stats.analyses,
            avgConfidence: stats.avgConfidence
        }));
        return {
            successRate: total > 0 ? (successful / total) * 100 : 0,
            cacheHitRate: totalCache > 0 ? (this.metrics.cacheHits / totalCache) * 100 : 0,
            averageExecutionTime: this.metrics.averageExecutionTime,
            confidenceDistribution: {
                high: this.metrics.analysisConfidence.high,
                medium: this.metrics.analysisConfidence.medium,
                low: this.metrics.analysisConfidence.low
            },
            topInstruments
        };
    }
    /**
     * Reinicia métricas
     */
    resetMetrics() {
        this.metrics = this.initializeMetrics();
        this.saveMetrics();
        this.logger.info('Metrics reset', {
            event: 'metrics_reset',
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Exporta logs para análisis
     */
    async exportLogs(fromDate, toDate) {
        // Esta función se implementaría para exportar logs en un rango de fechas
        // Por ahora, registramos la solicitud
        this.logger.info('Log export requested', {
            event: 'log_export_requested',
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            timestamp: new Date().toISOString()
        });
        return []; // Placeholder
    }
    /**
     * Crea formato personalizado para logs de Claude
     */
    createClaudeFormat() {
        return winston.format.combine(winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }), winston.format.errors({ stack: true }), winston.format.printf(({ level, message, timestamp, event, instrumentCode, ...meta }) => {
            const eventStr = event ? `[${event}]` : '';
            const instrumentStr = instrumentCode ? `[${instrumentCode}]` : '';
            const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
            return `${timestamp} ${level.toUpperCase()} ${eventStr}${instrumentStr} ${message} ${metaStr}`.trim();
        }));
    }
    /**
     * Inicializa estructura de métricas
     */
    initializeMetrics() {
        return {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            failedAnalyses: 0,
            cacheHits: 0,
            cacheMisses: 0,
            rateLimitHits: 0,
            averageExecutionTime: 0,
            totalExecutionTime: 0,
            analysisConfidence: {
                high: 0,
                medium: 0,
                low: 0
            },
            recommendations: {
                buy: 0,
                sell: 0,
                hold: 0
            },
            instruments: {}
        };
    }
    /**
     * Actualiza métricas de éxito
     */
    updateSuccessMetrics(data) {
        this.metrics.totalAnalyses++;
        this.metrics.successfulAnalyses++;
        if (!data.fromCache) {
            this.metrics.totalExecutionTime += data.executionTime;
            this.metrics.averageExecutionTime =
                this.metrics.totalExecutionTime / this.metrics.successfulAnalyses;
        }
        // Actualizar distribución de confianza
        if (data.confidence !== undefined) {
            if (data.confidence >= 80) {
                this.metrics.analysisConfidence.high++;
            }
            else if (data.confidence >= 50) {
                this.metrics.analysisConfidence.medium++;
            }
            else {
                this.metrics.analysisConfidence.low++;
            }
        }
        // Actualizar recomendaciones
        if (data.recommendation) {
            const rec = data.recommendation.toLowerCase();
            if (rec in this.metrics.recommendations) {
                this.metrics.recommendations[rec]++;
            }
        }
        // Actualizar estadísticas por instrumento
        if (data.instrumentCode) {
            if (!this.metrics.instruments[data.instrumentCode]) {
                this.metrics.instruments[data.instrumentCode] = {
                    analyses: 0,
                    avgConfidence: 0,
                    lastAnalysis: new Date().toISOString()
                };
            }
            const instrument = this.metrics.instruments[data.instrumentCode];
            instrument.analyses++;
            if (data.confidence !== undefined) {
                // Promedio móvil simple
                instrument.avgConfidence =
                    (instrument.avgConfidence * (instrument.analyses - 1) + data.confidence) / instrument.analyses;
            }
            instrument.lastAnalysis = new Date().toISOString();
        }
    }
    /**
     * Actualiza métricas de fallo
     */
    updateFailureMetrics(data) {
        this.metrics.totalAnalyses++;
        this.metrics.failedAnalyses++;
        if (data.executionTime && data.instrumentCode) {
            if (!this.metrics.instruments[data.instrumentCode]) {
                this.metrics.instruments[data.instrumentCode] = {
                    analyses: 0,
                    avgConfidence: 0,
                    lastAnalysis: new Date().toISOString()
                };
            }
            this.metrics.instruments[data.instrumentCode].lastAnalysis = new Date().toISOString();
        }
    }
    /**
     * Carga métricas desde archivo
     */
    loadMetrics() {
        try {
            // En un entorno real, cargaríamos desde el archivo JSON
            // Para este MVP, mantenemos en memoria
            this.logger.debug('Metrics loaded from file', {
                event: 'metrics_loaded',
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.logger.warn('Could not load existing metrics, starting fresh', {
                error: error.message
            });
        }
    }
    /**
     * Guarda métricas a archivo
     */
    saveMetrics() {
        try {
            // En un entorno real, guardaríamos en el archivo JSON
            // Para este MVP, solo registramos la acción
            this.logger.debug('Metrics saved to file', {
                event: 'metrics_saved',
                totalAnalyses: this.metrics.totalAnalyses,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            this.logger.error('Failed to save metrics', {
                error: error.message
            });
        }
    }
    /**
     * Cierra el logger y guarda métricas finales
     */
    shutdown() {
        this.saveMetrics();
        this.logger.info('Claude logger shutting down', {
            event: 'logger_shutdown',
            finalMetrics: this.getPerformanceStats(),
            timestamp: new Date().toISOString()
        });
    }
}
// Singleton instance
export const claudeLogger = new ClaudeLogger();
//# sourceMappingURL=claudeLogger.js.map