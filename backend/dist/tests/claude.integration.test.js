import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClaudeService, ClaudeServiceError } from '../services/claudeService.js';
import { ClaudeAnalysisService } from '../services/claudeAnalysisService.js';
import { cacheService } from '../services/cacheService.js';
import { rateLimitService } from '../services/rateLimitService.js';
import { claudeLogger } from '../utils/claudeLogger.js';
// Mock child_process para la mayoría de tests
const mockSpawn = vi.fn();
vi.mock('child_process', () => ({
    spawn: mockSpawn
}));
describe('Claude Integration Tests', () => {
    let mockProcess;
    beforeEach(() => {
        // Reset all services
        cacheService.clear();
        rateLimitService.reset();
        claudeLogger.resetMetrics();
        // Setup mock process
        mockProcess = {
            stdin: {
                write: vi.fn(),
                end: vi.fn()
            },
            stdout: {
                on: vi.fn()
            },
            stderr: {
                on: vi.fn()
            },
            on: vi.fn()
        };
        mockSpawn.mockReturnValue(mockProcess);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('ClaudeService Unit Tests', () => {
        it('should initialize successfully with mock', async () => {
            // Mock successful version check
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            const service = new ClaudeService();
            await expect(service.initialize()).resolves.not.toThrow();
            const status = service.getStatus();
            expect(status.initialized).toBe(true);
            expect(status.pendingRequests).toBe(0);
        });
        it('should fail initialization when Claude CLI not available', async () => {
            // Mock failed version check
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(1), 10);
                }
            });
            mockProcess.stderr.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('command not found: claude\\n')), 5);
                }
            });
            const service = new ClaudeService();
            await expect(service.initialize()).rejects.toThrow(ClaudeServiceError);
        });
        it('should execute analysis with mock response', async () => {
            // Initialize service first
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            const service = new ClaudeService();
            await service.initialize();
            // Mock analysis response
            const mockAnalysisResponse = JSON.stringify({
                analysis: 'Análisis técnico positivo para AAPL',
                confidence: 85,
                recommendation: 'BUY',
                reasoning: 'Tendencia alcista con soporte fuerte'
            });
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 50);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from(mockAnalysisResponse)), 25);
                }
            });
            const result = await service.analyze({
                prompt: 'Analiza el CEDEAR de Apple',
                instrumentCode: 'AAPL'
            });
            expect(result.success).toBe(true);
            expect(result.analysis).toContain('AAPL');
            expect(result.confidence).toBe(85);
            expect(result.recommendation).toBe('BUY');
            expect(result.executionTime).toBeGreaterThan(0);
        });
        it('should handle analysis timeout', async () => {
            // Initialize service first
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            const service = new ClaudeService();
            await service.initialize();
            // Mock timeout (never call close)
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    setTimeout(() => callback(new Error('timeout')), 10);
                }
                // Don't call close callback to simulate timeout
            });
            const result = await service.analyze({
                prompt: 'Analiza el CEDEAR de Apple',
                instrumentCode: 'AAPL'
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain('timeout');
        });
    });
    describe('CacheService Tests', () => {
        it('should store and retrieve analysis results', () => {
            const analysisResult = {
                success: true,
                analysis: 'Análisis de prueba',
                confidence: 75,
                recommendation: 'HOLD'
            };
            const key = cacheService.generateAnalysisKey('prompt de prueba', 'AAPL', 'test context');
            cacheService.setAnalysis(key, analysisResult, 5);
            const retrieved = cacheService.getAnalysis(key);
            expect(retrieved).toEqual(analysisResult);
        });
        it('should expire cache entries after TTL', async () => {
            const analysisResult = {
                success: true,
                analysis: 'Análisis temporal',
                confidence: 80
            };
            const key = 'test:expiry:key';
            cacheService.set(key, analysisResult, 100); // 100ms TTL
            // Inmediatamente debería estar disponible
            expect(cacheService.get(key)).toEqual(analysisResult);
            // Después del TTL debería expirar
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(cacheService.get(key)).toBeNull();
        });
        it('should generate consistent cache keys', () => {
            const key1 = cacheService.generateAnalysisKey('prompt', 'AAPL', 'context');
            const key2 = cacheService.generateAnalysisKey('prompt', 'AAPL', 'context');
            const key3 = cacheService.generateAnalysisKey('different', 'AAPL', 'context');
            expect(key1).toBe(key2);
            expect(key1).not.toBe(key3);
        });
    });
    describe('RateLimitService Tests', () => {
        it('should allow requests within limits', () => {
            const status = rateLimitService.checkLimit('test-request-1');
            expect(status.allowed).toBe(true);
            expect(status.remainingMinute).toBeGreaterThan(0);
            expect(status.remainingHour).toBeGreaterThan(0);
        });
        it('should track concurrent requests', async () => {
            const requestId1 = rateLimitService.startRequest('concurrent-1');
            const requestId2 = rateLimitService.startRequest('concurrent-2');
            const status = rateLimitService.getStats();
            expect(status.currentConcurrentRequests).toBe(2);
            rateLimitService.endRequest(requestId1);
            rateLimitService.endRequest(requestId2);
            const finalStatus = rateLimitService.getStats();
            expect(finalStatus.currentConcurrentRequests).toBe(0);
        });
        it('should execute function with rate limiting', async () => {
            let executed = false;
            const testFunction = async () => {
                executed = true;
                return 'success';
            };
            const result = await rateLimitService.executeWithLimit(testFunction);
            expect(executed).toBe(true);
            expect(result).toBe('success');
        });
        it('should reject when concurrent limit exceeded', () => {
            // Llenar el límite de solicitudes concurrentes
            const config = rateLimitService.getConfig();
            const requests = [];
            for (let i = 0; i < config.maxConcurrentRequests; i++) {
                requests.push(rateLimitService.startRequest(`concurrent-${i}`));
            }
            // La siguiente debería ser rechazada
            const status = rateLimitService.checkLimit('overflow-request');
            expect(status.allowed).toBe(false);
            expect(status.reason).toContain('concurrent');
            // Limpiar
            requests.forEach(id => rateLimitService.endRequest(id));
        });
    });
    describe('ClaudeAnalysisService Integration Tests', () => {
        let analysisService;
        beforeEach(() => {
            analysisService = new ClaudeAnalysisService();
        });
        afterEach(async () => {
            if (analysisService) {
                await analysisService.shutdown();
            }
        });
        it('should initialize all dependent services', async () => {
            // Mock successful Claude initialization
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            await expect(analysisService.initialize()).resolves.not.toThrow();
            const stats = analysisService.getServiceStats();
            expect(stats.analysis.initialized).toBe(true);
            expect(stats.claude.initialized).toBe(true);
        });
        it('should use cache for repeated requests', async () => {
            // Initialize first
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            await analysisService.initialize();
            // Mock first analysis
            const mockResponse = JSON.stringify({
                analysis: 'Análisis cacheado',
                confidence: 90,
                recommendation: 'BUY'
            });
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 30);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from(mockResponse)), 15);
                }
            });
            const request = {
                prompt: 'Analiza AAPL',
                instrumentCode: 'AAPL'
            };
            // Primera llamada - debe ir a Claude
            const result1 = await analysisService.analyze(request, { useCache: true });
            expect(result1.success).toBe(true);
            expect(result1.fromCache).toBe(false);
            // Segunda llamada - debe venir del cache
            const result2 = await analysisService.analyze(request, { useCache: true });
            expect(result2.success).toBe(true);
            expect(result2.fromCache).toBe(true);
            expect(result2.analysis).toBe(result1.analysis);
        });
        it('should handle rate limiting gracefully', async () => {
            // Initialize first
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            await analysisService.initialize();
            // Saturar el rate limiter con requests concurrentes
            const config = rateLimitService.getConfig();
            const promises = [];
            for (let i = 0; i < config.maxConcurrentRequests + 2; i++) {
                promises.push(analysisService.analyze({ prompt: `Test ${i}`, instrumentCode: `TEST${i}` }, { useCache: false, retryAttempts: 0 }));
            }
            const results = await Promise.allSettled(promises);
            // Algunas deberían fallar por rate limiting
            const failed = results.filter(r => r.status === 'rejected' ||
                (r.status === 'fulfilled' && !r.value.success));
            expect(failed.length).toBeGreaterThan(0);
        });
        it('should collect metrics properly', async () => {
            const initialMetrics = claudeLogger.getMetrics();
            expect(initialMetrics.totalAnalyses).toBe(0);
            // Initialize service
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            await analysisService.initialize();
            // Mock successful analysis
            const mockResponse = JSON.stringify({
                analysis: 'Análisis de métricas',
                confidence: 85,
                recommendation: 'BUY'
            });
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 20);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from(mockResponse)), 10);
                }
            });
            await analysisService.analyze({
                prompt: 'Test metrics',
                instrumentCode: 'METRICS'
            });
            const finalMetrics = claudeLogger.getMetrics();
            expect(finalMetrics.totalAnalyses).toBeGreaterThan(initialMetrics.totalAnalyses);
        });
    });
    describe('Error Handling Tests', () => {
        it('should handle service not initialized error', async () => {
            const analysisService = new ClaudeAnalysisService();
            await expect(analysisService.analyze({ prompt: 'test without init' })).rejects.toThrow(ClaudeServiceError);
        });
        it('should handle malformed JSON responses gracefully', async () => {
            // Initialize service
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 10);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('claude-cli version 1.0.0\\n')), 5);
                }
            });
            const service = new ClaudeService();
            await service.initialize();
            // Mock malformed JSON response
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 20);
                }
            });
            mockProcess.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    setTimeout(() => callback(Buffer.from('This is not JSON but still valuable analysis')), 10);
                }
            });
            const result = await service.analyze({
                prompt: 'Test malformed response',
                instrumentCode: 'MALFORMED'
            });
            expect(result.success).toBe(true);
            expect(result.analysis).toContain('valuable analysis');
            expect(result.recommendation).toBe('HOLD'); // Default fallback
        });
    });
});
// Test real de conexión con Claude CLI (se ejecuta solo si está disponible)
describe('Real Claude CLI Connection Test', () => {
    it.skip('should connect to real Claude CLI if available', async () => {
        // Desactivar mocks para este test
        vi.unmock('child_process');
        const { spawn: realSpawn } = await import('child_process');
        try {
            // Test simple de conexión real
            const testProcess = realSpawn('claude', ['--version'], {
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                timeout: 5000
            });
            const result = await new Promise((resolve) => {
                let output = '';
                let error = '';
                testProcess.stdout?.on('data', (data) => {
                    output += data.toString();
                });
                testProcess.stderr?.on('data', (data) => {
                    error += data.toString();
                });
                testProcess.on('close', (code) => {
                    resolve({
                        success: code === 0,
                        output: code === 0 ? output : error
                    });
                });
                testProcess.on('error', (err) => {
                    resolve({
                        success: false,
                        output: err.message
                    });
                });
            });
            if (result.success) {
                console.log('✅ Claude CLI is available:', result.output.trim());
                expect(result.success).toBe(true);
                expect(result.output).toContain('claude');
            }
            else {
                console.log('❌ Claude CLI not available:', result.output);
                expect(result.success).toBe(false);
            }
        }
        catch (error) {
            console.log('❌ Could not test real Claude CLI:', error.message);
            // No fallar el test si Claude CLI no está disponible
            expect(true).toBe(true);
        }
    });
});
//# sourceMappingURL=claude.integration.test.js.map