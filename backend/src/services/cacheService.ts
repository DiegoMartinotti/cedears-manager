import { createLogger } from '../utils/logger.js'

const logger = createLogger('cache-service')

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

export interface CacheStats {
  hits: number
  misses: number
  entries: number
  memoryUsage: number
}

/**
 * Servicio de caché en memoria con TTL para análisis de Claude
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private defaultTTL: number
  private maxEntries: number
  private stats: CacheStats = { hits: 0, misses: 0, entries: 0, memoryUsage: 0 }
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: {
    defaultTTL?: number
    maxEntries?: number
    cleanupIntervalMs?: number
  } = {}) {
    this.defaultTTL = options.defaultTTL || 300000 // 5 minutos por defecto
    this.maxEntries = options.maxEntries || 1000
    
    // Configurar limpieza automática cada 60 segundos por defecto
    const cleanupInterval = options.cleanupIntervalMs || 60000
    this.startCleanupTimer(cleanupInterval)
    
    logger.info('CacheService initialized', {
      defaultTTL: this.defaultTTL,
      maxEntries: this.maxEntries,
      cleanupInterval
    })
  }

  /**
   * Almacena un valor en el caché
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.defaultTTL
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: actualTTL,
      key
    }

    // Si el caché está lleno, eliminar entradas más antiguas
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest()
    }

    this.cache.set(key, entry)
    this.updateStats()

    logger.debug('Cache entry stored', {
      key,
      ttl: actualTTL,
      size: this.cache.size
    })
  }

  /**
   * Obtiene un valor del caché
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      logger.debug('Cache miss', { key })
      return null
    }

    // Verificar si la entrada ha expirado
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      this.updateStats()
      logger.debug('Cache entry expired', { key, age: now - entry.timestamp })
      return null
    }

    this.stats.hits++
    logger.debug('Cache hit', { key, age: now - entry.timestamp })
    return entry.data
  }

  /**
   * Verifica si existe una clave en el caché y no ha expirado
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Elimina una entrada específica del caché
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key)
    if (result) {
      this.updateStats()
      logger.debug('Cache entry deleted', { key })
    }
    return result
  }

  /**
   * Elimina todas las entradas del caché
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, entries: 0, memoryUsage: 0 }
    logger.info('Cache cleared', { previousSize: size })
  }

  /**
   * Genera una clave de caché para análisis de Claude
   */
  generateAnalysisKey(prompt: string, instrumentCode?: string, context?: string): string {
    const components = [
      'claude_analysis',
      instrumentCode || 'general',
      this.hashString(prompt),
      context ? this.hashString(context) : ''
    ].filter(Boolean)
    
    return components.join(':')
  }

  /**
   * Almacena resultado de análisis de Claude con TTL específico
   */
  setAnalysis(key: string, analysis: any, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000 // Convertir a ms
    this.set(key, analysis, ttl)
    
    logger.info('Claude analysis cached', {
      key,
      ttlMinutes,
      confidence: analysis.confidence
    })
  }

  /**
   * Obtiene resultado de análisis de Claude desde caché
   */
  getAnalysis(key: string): any | null {
    const result = this.get(key)
    if (result) {
      logger.info('Claude analysis retrieved from cache', { key })
    }
    return result
  }

  /**
   * Limpia entradas expiradas del caché
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      this.updateStats()
      logger.info('Cache cleanup completed', { removed, remaining: this.cache.size })
    }

    return removed
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Obtiene información detallada del caché
   */
  getInfo(): {
    stats: CacheStats
    config: { defaultTTL: number; maxEntries: number }
    entries: Array<{ key: string; age: number; ttl: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }))

    return {
      stats: this.getStats(),
      config: {
        defaultTTL: this.defaultTTL,
        maxEntries: this.maxEntries
      },
      entries
    }
  }

  /**
   * Inicia el temporizador de limpieza automática
   */
  private startCleanupTimer(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, intervalMs)
  }

  /**
   * Elimina las entradas más antiguas cuando se alcanza el límite
   */
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTimestamp = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      logger.debug('Evicted oldest cache entry', { key: oldestKey })
    }
  }

  /**
   * Actualiza las estadísticas del caché
   */
  private updateStats(): void {
    this.stats.entries = this.cache.size
    // Estimación simple del uso de memoria
    this.stats.memoryUsage = this.cache.size * 1024 // ~1KB por entrada promedio
  }

  /**
   * Genera un hash simple de una cadena
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convertir a 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Cierra el servicio y limpia recursos
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    this.clear()
    logger.info('CacheService shut down')
  }
}

// Singleton instance para análisis de Claude
export const cacheService = new CacheService({
  defaultTTL: 300000, // 5 minutos
  maxEntries: 500,    // Máximo 500 análisis en caché
  cleanupIntervalMs: 60000 // Limpiar cada minuto
})