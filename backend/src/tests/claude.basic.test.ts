import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { cacheService } from '../services/cacheService.js'
import { rateLimitService } from '../services/rateLimitService.js'
import { claudeLogger } from '../utils/claudeLogger.js'

describe('Claude Services Basic Tests', () => {
  beforeEach(() => {
    // Reset all services
    cacheService.clear()
    rateLimitService.reset()
    claudeLogger.resetMetrics()
  })

  describe('CacheService Tests', () => {
    it('should store and retrieve analysis results', () => {
      const analysisResult = {
        success: true,
        analysis: 'Análisis de prueba',
        confidence: 75,
        recommendation: 'HOLD' as const
      }

      const key = cacheService.generateAnalysisKey(
        'prompt de prueba',
        'AAPL',
        'test context'
      )

      cacheService.setAnalysis(key, analysisResult, 5)
      const retrieved = cacheService.getAnalysis(key)

      expect(retrieved).toEqual(analysisResult)
    })

    it('should expire cache entries after TTL', async () => {
      const analysisResult = {
        success: true,
        analysis: 'Análisis temporal',
        confidence: 80
      }

      const key = 'test:expiry:key'
      cacheService.set(key, analysisResult, 100) // 100ms TTL

      // Inmediatamente debería estar disponible
      expect(cacheService.get(key)).toEqual(analysisResult)

      // Después del TTL debería expirar
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(cacheService.get(key)).toBeNull()
    })

    it('should generate consistent cache keys', () => {
      const key1 = cacheService.generateAnalysisKey('prompt', 'AAPL', 'context')
      const key2 = cacheService.generateAnalysisKey('prompt', 'AAPL', 'context')
      const key3 = cacheService.generateAnalysisKey('different', 'AAPL', 'context')

      expect(key1).toBe(key2)
      expect(key1).not.toBe(key3)
    })

    it('should handle cache info and stats', () => {
      // Set some data
      cacheService.set('test1', { data: 'value1' }, 5000)
      cacheService.set('test2', { data: 'value2' }, 10000)

      const stats = cacheService.getStats()
      expect(stats.entries).toBe(2)
      expect(stats.hits).toBe(0) // No hits yet
      expect(stats.misses).toBe(0) // No misses yet

      // Get data to trigger hits
      cacheService.get('test1')
      cacheService.get('nonexistent')

      const updatedStats = cacheService.getStats()
      expect(updatedStats.hits).toBe(1)
      expect(updatedStats.misses).toBe(1)

      const info = cacheService.getInfo()
      expect(info.stats.entries).toBe(2)
      expect(info.entries).toHaveLength(2)
      expect(info.config.defaultTTL).toBeDefined()
    })

    it('should cleanup expired entries', async () => {
      // Add entries with different TTLs
      cacheService.set('short', { data: 'expires soon' }, 50)
      cacheService.set('long', { data: 'expires later' }, 5000)

      expect(cacheService.getStats().entries).toBe(2)

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      // Manual cleanup
      const removedCount = cacheService.cleanup()
      expect(removedCount).toBe(1)
      expect(cacheService.getStats().entries).toBe(1)
      expect(cacheService.get('long')).toBeTruthy()
      expect(cacheService.get('short')).toBeNull()
    })
  })

  describe('RateLimitService Tests', () => {
    it('should allow requests within limits', () => {
      const status = rateLimitService.checkLimit('test-request-1')
      expect(status.allowed).toBe(true)
      expect(status.remainingMinute).toBeGreaterThan(0)
      expect(status.remainingHour).toBeGreaterThan(0)
      expect(status.currentConcurrent).toBe(0)
    })

    it('should track concurrent requests', () => {
      const requestId1 = rateLimitService.startRequest('concurrent-1')
      const requestId2 = rateLimitService.startRequest('concurrent-2')

      const stats = rateLimitService.getStats()
      expect(stats.currentConcurrentRequests).toBe(2)
      expect(stats.totalRequests).toBe(2)

      rateLimitService.endRequest(requestId1)
      rateLimitService.endRequest(requestId2)

      const finalStats = rateLimitService.getStats()
      expect(finalStats.currentConcurrentRequests).toBe(0)
    })

    it('should execute function with rate limiting', async () => {
      let executed = false
      const testFunction = async () => {
        executed = true
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'success'
      }

      const result = await rateLimitService.executeWithLimit(testFunction)
      
      expect(executed).toBe(true)
      expect(result).toBe('success')
    })

    it('should reject when concurrent limit exceeded', () => {
      // Llenar el límite de solicitudes concurrentes
      const config = rateLimitService.getConfig()
      const requests: string[] = []

      for (let i = 0; i < config.maxConcurrentRequests; i++) {
        requests.push(rateLimitService.startRequest(`concurrent-${i}`))
      }

      // La siguiente debería ser rechazada
      const status = rateLimitService.checkLimit('overflow-request')
      expect(status.allowed).toBe(false)
      expect(status.reason).toContain('Concurrent')

      // Limpiar
      requests.forEach(id => rateLimitService.endRequest(id))
    })

    it('should track requests per minute', () => {
      const initialStats = rateLimitService.getStats()
      
      // Make several requests
      for (let i = 0; i < 5; i++) {
        const requestId = rateLimitService.startRequest(`minute-test-${i}`)
        rateLimitService.endRequest(requestId)
      }

      const finalStats = rateLimitService.getStats()
      expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 5)
      expect(finalStats.currentMinuteRequests).toBe(5)
    })

    it('should update configuration', () => {
      const originalConfig = rateLimitService.getConfig()
      
      rateLimitService.updateConfig({
        maxRequestsPerMinute: 50,
        maxConcurrentRequests: 10
      })

      const newConfig = rateLimitService.getConfig()
      expect(newConfig.maxRequestsPerMinute).toBe(50)
      expect(newConfig.maxConcurrentRequests).toBe(10)
      expect(newConfig.maxRequestsPerHour).toBe(originalConfig.maxRequestsPerHour) // Should remain unchanged
    })
  })

  describe('Claude Logger Tests', () => {
    it('should initialize with default metrics', () => {
      const metrics = claudeLogger.getMetrics()
      
      expect(metrics.totalAnalyses).toBe(0)
      expect(metrics.successfulAnalyses).toBe(0)
      expect(metrics.failedAnalyses).toBe(0)
      expect(metrics.cacheHits).toBe(0)
      expect(metrics.cacheMisses).toBe(0)
      expect(metrics.rateLimitHits).toBe(0)
      expect(metrics.averageExecutionTime).toBe(0)
      expect(metrics.analysisConfidence.high).toBe(0)
      expect(metrics.analysisConfidence.medium).toBe(0)
      expect(metrics.analysisConfidence.low).toBe(0)
      expect(metrics.recommendations.buy).toBe(0)
      expect(metrics.recommendations.sell).toBe(0)
      expect(metrics.recommendations.hold).toBe(0)
      expect(Object.keys(metrics.instruments)).toHaveLength(0)
    })

    it('should log different types of events', () => {
      // Test that logging methods don't throw errors
      expect(() => {
        claudeLogger.analysisStarted({
          requestId: 'test-123',
          instrumentCode: 'AAPL',
          promptLength: 100,
          useCache: true,
          cacheKey: 'test-key'
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.analysisCompleted({
          requestId: 'test-123',
          instrumentCode: 'AAPL',
          executionTime: 1500,
          confidence: 85,
          recommendation: 'BUY',
          fromCache: false,
          cacheKey: 'test-key'
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.analysisFailed({
          requestId: 'test-456',
          instrumentCode: 'GOOGL',
          error: 'Network timeout',
          errorCode: 'TIMEOUT',
          executionTime: 30000,
          retryCount: 2
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.cacheHit({
          cacheKey: 'test-cache-key',
          instrumentCode: 'MSFT',
          age: 60000
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.cacheMiss({
          cacheKey: 'missing-key',
          instrumentCode: 'TSLA'
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.rateLimitHit({
          reason: 'Concurrent requests limit exceeded',
          remainingMinute: 0,
          remainingHour: 45,
          waitTime: 2000
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.performanceMetrics({
          operation: 'analysis',
          duration: 2500,
          success: true,
          details: { instrumentCode: 'AMZN' }
        })
      }).not.toThrow()

      expect(() => {
        claudeLogger.lowConfidenceWarning({
          instrumentCode: 'NFLX',
          confidence: 35,
          recommendation: 'HOLD',
          reasoning: 'Insufficient data'
        })
      }).not.toThrow()
    })

    it('should get performance stats', () => {
      const stats = claudeLogger.getPerformanceStats()
      
      expect(stats).toHaveProperty('successRate')
      expect(stats).toHaveProperty('cacheHitRate')
      expect(stats).toHaveProperty('averageExecutionTime')
      expect(stats).toHaveProperty('confidenceDistribution')
      expect(stats).toHaveProperty('topInstruments')
      
      expect(typeof stats.successRate).toBe('number')
      expect(typeof stats.cacheHitRate).toBe('number')
      expect(typeof stats.averageExecutionTime).toBe('number')
      expect(Array.isArray(stats.topInstruments)).toBe(true)
    })

    it('should handle metrics reset', () => {
      // Add some metrics manually by calling cache/rate limit methods
      claudeLogger.cacheHit({ cacheKey: 'test', instrumentCode: 'AAPL', age: 1000 })
      claudeLogger.cacheMiss({ cacheKey: 'test2', instrumentCode: 'GOOGL' })
      
      let metrics = claudeLogger.getMetrics()
      expect(metrics.cacheHits).toBe(1)
      expect(metrics.cacheMisses).toBe(1)

      claudeLogger.resetMetrics()
      
      metrics = claudeLogger.getMetrics()
      expect(metrics.cacheHits).toBe(0)
      expect(metrics.cacheMisses).toBe(0)
      expect(metrics.totalAnalyses).toBe(0)
    })
  })

  describe('Service Integration Tests', () => {
    it('should work together without errors', async () => {
      // Test that services can be used together
      const cacheKey = cacheService.generateAnalysisKey('test prompt', 'AAPL')
      
      // Check rate limit
      const rateLimitStatus = rateLimitService.checkLimit()
      expect(rateLimitStatus.allowed).toBe(true)
      
      // Store in cache
      const analysisData = {
        success: true,
        analysis: 'Test analysis',
        confidence: 85,
        recommendation: 'BUY'
      }
      
      cacheService.setAnalysis(cacheKey, analysisData)
      
      // Retrieve from cache
      const retrieved = cacheService.getAnalysis(cacheKey)
      expect(retrieved).toEqual(analysisData)
      
      // Log the operations
      claudeLogger.cacheHit({ cacheKey, instrumentCode: 'AAPL', age: 100 })
      
      // Check stats
      const cacheStats = cacheService.getStats()
      const rateLimitStats = rateLimitService.getStats()
      const loggerMetrics = claudeLogger.getMetrics()
      
      expect(cacheStats.entries).toBe(1)
      expect(cacheStats.hits).toBe(1)
      expect(loggerMetrics.cacheHits).toBe(1)
    })

    it('should handle service shutdown gracefully', () => {
      expect(() => {
        cacheService.shutdown()
        rateLimitService.shutdown()
        claudeLogger.shutdown()
      }).not.toThrow()
    })
  })
})