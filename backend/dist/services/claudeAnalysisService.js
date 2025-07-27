import { claudeService, ClaudeServiceError } from './claudeService.js';
import { cacheService } from './cacheService.js';
import { rateLimitService } from './rateLimitService.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('claude-analysis-service');
/**
 * Servicio principal para análisis con Claude que integra cache, rate limiting y manejo de errores
 */
export class ClaudeAnalysisService {
    isInitialized = false;
    retryDelays = [1000, 2000, 5000]; // ms
    constructor() {
        logger.info('ClaudeAnalysisService created');
    }
    /**
     * Inicializa todos los servicios dependientes
     */
    async initialize() {
        try {
            logger.info('Initializing Claude Analysis Service...');
            // Inicializar Claude service
            await claudeService.initialize();
            this.isInitialized = true;
            logger.info('Claude Analysis Service initialized successfully');
        }
        catch (error) {
            logger.error('Failed to initialize Claude Analysis Service', { error });
            throw error;
        }
    }
    /**
     * Ejecuta un análisis técnico con todas las protecciones
     */
    async analyze(request, options = {}) {
        if (!this.isInitialized) {
            throw new ClaudeServiceError('Claude Analysis Service not initialized', 'NOT_INITIALIZED');
        }
        const { useCache = true, cacheTTLMinutes = 5, retryAttempts = 2, retryDelayMs = 1000, priority = 'normal' } = options;
        const cacheKey = useCache ? cacheService.generateAnalysisKey(request.prompt, request.instrumentCode, request.context) : null;
        // 1. Verificar caché primero
        if (useCache && cacheKey) {
            const cachedResult = cacheService.getAnalysis(cacheKey);
            if (cachedResult) {
                logger.info('Analysis served from cache', {
                    instrumentCode: request.instrumentCode,
                    cacheKey
                });
                return {
                    ...cachedResult,
                    fromCache: true,
                    cacheKey
                };
            }
        }
        // 2. Ejecutar análisis con rate limiting y retry
        let lastError = null;
        let retryCount = 0;
        for (let attempt = 0; attempt <= retryAttempts; attempt++) {
            try {
                // Verificar rate limits
                const rateLimitStatus = rateLimitService.checkLimit();
                if (!rateLimitStatus.allowed) {
                    const waitTime = this.calculateWaitTime(rateLimitStatus);
                    logger.warn('Rate limit exceeded, waiting...', {
                        reason: rateLimitStatus.reason,
                        waitTime,
                        attempt: attempt + 1
                    });
                    if (attempt < retryAttempts) {
                        await this.sleep(waitTime);
                        continue;
                    }
                    else {
                        throw new ClaudeServiceError(`Rate limit exceeded: ${rateLimitStatus.reason}`, 'RATE_LIMIT_EXCEEDED', rateLimitStatus);
                    }
                }
                // Ejecutar análisis con rate limiting
                const result = await rateLimitService.executeWithLimit(async () => {
                    return await claudeService.analyze(request);
                });
                // 3. Guardar en caché si es exitoso
                if (result.success && useCache && cacheKey) {
                    cacheService.setAnalysis(cacheKey, result, cacheTTLMinutes);
                }
                logger.info('Analysis completed successfully', {
                    instrumentCode: request.instrumentCode,
                    success: result.success,
                    retryCount,
                    fromCache: false
                });
                return {
                    ...result,
                    fromCache: false,
                    rateLimitStatus,
                    retryCount,
                    cacheKey: cacheKey || undefined
                };
            }
            catch (error) {
                lastError = error;
                retryCount++;
                // Determinar si debe reintentar
                if (attempt < retryAttempts && this.shouldRetry(error)) {
                    const delay = retryDelayMs * Math.pow(2, attempt); // Backoff exponencial
                    logger.warn('Analysis failed, retrying...', {
                        instrumentCode: request.instrumentCode,
                        attempt: attempt + 1,
                        error: error.message,
                        delayMs: delay
                    });
                    await this.sleep(delay);
                    continue;
                }
                // No reintentar más
                break;
            }
        }
        // Si llegamos aquí, todos los intentos fallaron
        logger.error('Analysis failed after all retries', {
            instrumentCode: request.instrumentCode,
            retryCount,
            finalError: lastError?.message
        });
        return {
            success: false,
            error: lastError?.message || 'Analysis failed after retries',
            retryCount,
            fromCache: false,
            cacheKey: cacheKey || undefined
        };
    }
    /**
     * Análisis simple para casos básicos
     */
    async quickAnalysis(prompt, instrumentCode) {
        return this.analyze({ prompt, instrumentCode }, { useCache: true, cacheTTLMinutes: 10, retryAttempts: 1 });
    }
    /**
     * Análisis detallado con datos de mercado
     */
    async detailedAnalysis(request, marketData) {
        const enhancedRequest = {
            ...request,
            marketData,
            context: request.context || 'Análisis técnico detallado de CEDEAR'
        };
        return this.analyze(enhancedRequest, {
            useCache: true,
            cacheTTLMinutes: 3, // Cache más corto para análisis detallado
            retryAttempts: 3,
            priority: 'high'
        });
    }
    /**
     * Obtiene estadísticas de todos los servicios
     */
    getServiceStats() {
        return {
            claude: claudeService.getStatus(),
            cache: cacheService.getStats(),
            rateLimit: rateLimitService.getStats(),
            analysis: { initialized: this.isInitialized }
        };
    }
    /**
     * Obtiene información detallada del sistema
     */
    getSystemInfo() {
        return {
            services: this.getServiceStats(),
            cacheInfo: cacheService.getInfo(),
            rateLimitConfig: rateLimitService.getConfig()
        };
    }
    /**
     * Limpia cachés y reinicia contadores
     */
    async reset() {
        logger.info('Resetting Claude Analysis Service...');
        cacheService.clear();
        rateLimitService.reset();
        logger.info('Claude Analysis Service reset completed');
    }
    /**
     * Determina si un error es recuperable
     */
    shouldRetry(error) {
        // No reintentar errores de validación o configuración
        if (error instanceof ClaudeServiceError) {
            const nonRetryableCodes = [
                'NOT_INITIALIZED',
                'PARSE_ERROR',
                'INVALID_REQUEST'
            ];
            return !nonRetryableCodes.includes(error.code);
        }
        // Reintentar errores de red/timeout
        const retryableMessages = [
            'timeout',
            'network',
            'connection',
            'ECONNRESET',
            'ETIMEDOUT'
        ];
        return retryableMessages.some(msg => error.message.toLowerCase().includes(msg.toLowerCase()));
    }
    /**
     * Calcula tiempo de espera basado en rate limiting
     */
    calculateWaitTime(rateLimitStatus) {
        if (rateLimitStatus.reason?.includes('concurrent')) {
            return 2000; // 2 segundos para límites concurrentes
        }
        if (rateLimitStatus.reason?.includes('minute')) {
            return Math.max(5000, rateLimitStatus.resetTimeMinute - Date.now());
        }
        if (rateLimitStatus.reason?.includes('hour')) {
            return Math.max(60000, rateLimitStatus.resetTimeHour - Date.now());
        }
        return 5000; // Default 5 segundos
    }
    /**
     * Función helper para esperar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Cierra todos los servicios
     */
    async shutdown() {
        logger.info('Shutting down Claude Analysis Service...');
        await claudeService.shutdown();
        cacheService.shutdown();
        rateLimitService.shutdown();
        this.isInitialized = false;
        logger.info('Claude Analysis Service shut down completed');
    }
}
// Singleton instance
export const claudeAnalysisService = new ClaudeAnalysisService();
//# sourceMappingURL=claudeAnalysisService.js.map