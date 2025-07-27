import { createLogger } from '../utils/logger.js';
const logger = createLogger('rate-limit-service');
/**
 * Servicio de rate limiting para controlar llamadas a Claude
 */
export class RateLimitService {
    config;
    minuteRequests = [];
    hourRequests = [];
    concurrentRequests = new Set();
    stats;
    cleanupInterval = null;
    constructor(config = {}) {
        this.config = {
            maxRequestsPerMinute: config.maxRequestsPerMinute || 20,
            maxRequestsPerHour: config.maxRequestsPerHour || 100,
            maxConcurrentRequests: config.maxConcurrentRequests || 5
        };
        this.stats = {
            totalRequests: 0,
            rejectedRequests: 0,
            currentMinuteRequests: 0,
            currentHourRequests: 0,
            currentConcurrentRequests: 0,
            resetTimes: {
                minute: Date.now() + 60000,
                hour: Date.now() + 3600000
            }
        };
        // Limpiar registros antiguos cada 30 segundos
        this.startCleanupTimer(30000);
        logger.info('RateLimitService initialized', { config: this.config });
    }
    /**
     * Verifica si una solicitud puede proceder
     */
    checkLimit(requestId = this.generateRequestId()) {
        const now = Date.now();
        // Limpiar registros antiguos antes de verificar
        this.cleanup(now);
        // Verificar límite de solicitudes concurrentes
        if (this.concurrentRequests.size >= this.config.maxConcurrentRequests) {
            this.stats.rejectedRequests++;
            logger.warn('Request rejected: concurrent limit exceeded', {
                requestId,
                current: this.concurrentRequests.size,
                limit: this.config.maxConcurrentRequests
            });
            return {
                allowed: false,
                reason: 'Concurrent requests limit exceeded',
                remainingMinute: Math.max(0, this.config.maxRequestsPerMinute - this.minuteRequests.length),
                remainingHour: Math.max(0, this.config.maxRequestsPerHour - this.hourRequests.length),
                resetTimeMinute: this.getNextMinuteReset(now),
                resetTimeHour: this.getNextHourReset(now),
                currentConcurrent: this.concurrentRequests.size
            };
        }
        // Verificar límite por minuto
        if (this.minuteRequests.length >= this.config.maxRequestsPerMinute) {
            this.stats.rejectedRequests++;
            logger.warn('Request rejected: minute limit exceeded', {
                requestId,
                current: this.minuteRequests.length,
                limit: this.config.maxRequestsPerMinute
            });
            return {
                allowed: false,
                reason: 'Requests per minute limit exceeded',
                remainingMinute: 0,
                remainingHour: Math.max(0, this.config.maxRequestsPerHour - this.hourRequests.length),
                resetTimeMinute: this.getNextMinuteReset(now),
                resetTimeHour: this.getNextHourReset(now),
                currentConcurrent: this.concurrentRequests.size
            };
        }
        // Verificar límite por hora
        if (this.hourRequests.length >= this.config.maxRequestsPerHour) {
            this.stats.rejectedRequests++;
            logger.warn('Request rejected: hour limit exceeded', {
                requestId,
                current: this.hourRequests.length,
                limit: this.config.maxRequestsPerHour
            });
            return {
                allowed: false,
                reason: 'Requests per hour limit exceeded',
                remainingMinute: Math.max(0, this.config.maxRequestsPerMinute - this.minuteRequests.length),
                remainingHour: 0,
                resetTimeMinute: this.getNextMinuteReset(now),
                resetTimeHour: this.getNextHourReset(now),
                currentConcurrent: this.concurrentRequests.size
            };
        }
        // Solicitud permitida
        logger.debug('Request allowed', { requestId });
        return {
            allowed: true,
            remainingMinute: Math.max(0, this.config.maxRequestsPerMinute - this.minuteRequests.length - 1),
            remainingHour: Math.max(0, this.config.maxRequestsPerHour - this.hourRequests.length - 1),
            resetTimeMinute: this.getNextMinuteReset(now),
            resetTimeHour: this.getNextHourReset(now),
            currentConcurrent: this.concurrentRequests.size
        };
    }
    /**
     * Inicia el seguimiento de una solicitud
     */
    startRequest(requestId = this.generateRequestId()) {
        const now = Date.now();
        const request = { timestamp: now, id: requestId };
        this.minuteRequests.push(request);
        this.hourRequests.push(request);
        this.concurrentRequests.add(requestId);
        this.stats.totalRequests++;
        this.stats.currentMinuteRequests = this.minuteRequests.length;
        this.stats.currentHourRequests = this.hourRequests.length;
        this.stats.currentConcurrentRequests = this.concurrentRequests.size;
        logger.debug('Request started', {
            requestId,
            concurrentCount: this.concurrentRequests.size,
            minuteCount: this.minuteRequests.length,
            hourCount: this.hourRequests.length
        });
        return requestId;
    }
    /**
     * Finaliza el seguimiento de una solicitud
     */
    endRequest(requestId) {
        if (this.concurrentRequests.has(requestId)) {
            this.concurrentRequests.delete(requestId);
            this.stats.currentConcurrentRequests = this.concurrentRequests.size;
            logger.debug('Request ended', {
                requestId,
                remainingConcurrent: this.concurrentRequests.size
            });
        }
        else {
            logger.warn('Attempted to end unknown request', { requestId });
        }
    }
    /**
     * Wrapper para ejecutar una función con rate limiting
     */
    async executeWithLimit(fn, requestId) {
        const id = requestId || this.generateRequestId();
        // Verificar límites
        const status = this.checkLimit(id);
        if (!status.allowed) {
            throw new Error(`Rate limit exceeded: ${status.reason}`);
        }
        // Iniciar seguimiento
        this.startRequest(id);
        try {
            const result = await fn();
            return result;
        }
        finally {
            // Finalizar seguimiento siempre
            this.endRequest(id);
        }
    }
    /**
     * Obtiene estadísticas actuales
     */
    getStats() {
        const now = Date.now();
        this.cleanup(now);
        return {
            ...this.stats,
            currentMinuteRequests: this.minuteRequests.length,
            currentHourRequests: this.hourRequests.length,
            currentConcurrentRequests: this.concurrentRequests.size,
            resetTimes: {
                minute: this.getNextMinuteReset(now),
                hour: this.getNextHourReset(now)
            }
        };
    }
    /**
     * Obtiene la configuración actual
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Actualiza la configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        logger.info('Rate limit configuration updated', { config: this.config });
    }
    /**
     * Reinicia todos los contadores
     */
    reset() {
        this.minuteRequests = [];
        this.hourRequests = [];
        this.concurrentRequests.clear();
        const now = Date.now();
        this.stats = {
            totalRequests: 0,
            rejectedRequests: 0,
            currentMinuteRequests: 0,
            currentHourRequests: 0,
            currentConcurrentRequests: 0,
            resetTimes: {
                minute: now + 60000,
                hour: now + 3600000
            }
        };
        logger.info('Rate limiter reset');
    }
    /**
     * Limpia registros antiguos
     */
    cleanup(now) {
        const oneMinuteAgo = now - 60000;
        const oneHourAgo = now - 3600000;
        // Limpiar registros de minutos
        const initialMinuteCount = this.minuteRequests.length;
        this.minuteRequests = this.minuteRequests.filter(req => req.timestamp > oneMinuteAgo);
        // Limpiar registros de horas
        const initialHourCount = this.hourRequests.length;
        this.hourRequests = this.hourRequests.filter(req => req.timestamp > oneHourAgo);
        // Log si se limpiaron registros
        if (initialMinuteCount !== this.minuteRequests.length || initialHourCount !== this.hourRequests.length) {
            logger.debug('Rate limit cleanup performed', {
                minuteRequestsRemoved: initialMinuteCount - this.minuteRequests.length,
                hourRequestsRemoved: initialHourCount - this.hourRequests.length,
                remainingMinute: this.minuteRequests.length,
                remainingHour: this.hourRequests.length
            });
        }
    }
    /**
     * Inicia el temporizador de limpieza automática
     */
    startCleanupTimer(intervalMs) {
        this.cleanupInterval = setInterval(() => {
            this.cleanup(Date.now());
        }, intervalMs);
    }
    /**
     * Calcula el tiempo de reset del próximo minuto
     */
    getNextMinuteReset(now) {
        return Math.ceil(now / 60000) * 60000;
    }
    /**
     * Calcula el tiempo de reset de la próxima hora
     */
    getNextHourReset(now) {
        return Math.ceil(now / 3600000) * 3600000;
    }
    /**
     * Genera un ID único para solicitudes
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Cierra el servicio y limpia recursos
     */
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.reset();
        logger.info('RateLimitService shut down');
    }
}
// Singleton instance para Claude
export const rateLimitService = new RateLimitService({
    maxRequestsPerMinute: 15, // Conservador para Claude
    maxRequestsPerHour: 80, // Límite horario seguro
    maxConcurrentRequests: 3 // Máximo 3 análisis simultáneos
});
//# sourceMappingURL=rateLimitService.js.map