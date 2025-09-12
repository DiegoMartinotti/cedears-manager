import axios from 'axios'
import * as cheerio from 'cheerio'
import { UVA, UVAData, UVAInflationAdjustment } from '../models/UVA.js'
import { CacheService } from './cacheService.js'
import { RateLimitService } from './rateLimitService.js'
import { createLogger } from '../utils/logger.js'
import { format, parseISO, subDays } from 'date-fns'

const logger = createLogger('UVAService')

export interface UVAUpdateResult {
  success: boolean
  date: string
  value?: number
  error?: string
  cached?: boolean
  source: 'bcra' | 'estadisticas' | 'cache'
}

export interface UVAHistoricalData {
  date: string
  value: number
  source: string
}

export class UVAService {
  private uvaModel = new UVA()
  private cache: CacheService
  private rateLimiter: RateLimitService

  // URLs de APIs
  private readonly BCRA_UVA_URL = 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables_datos.asp?serie=7913&detalle=Unidad%20de%20Valor%20Adquisitivo%20(UVA)%20(en%20pesos%20desde%20el%2031.3.17,%20base%2031.3.16=14.05%20pesos)'
  private readonly ESTADISTICAS_BCRA_API = 'https://api.estadisticasbcra.com/uva'

  // Configuración de cache
  private readonly CACHE_TTL_MINUTES = 60 // Cache por 1 hora
  private readonly RATE_LIMIT_PER_MINUTE = 30

  constructor() {
    this.cache = new CacheService()
    this.rateLimiter = new RateLimitService({
      maxRequestsPerMinute: this.RATE_LIMIT_PER_MINUTE,
      maxRequestsPerHour: this.RATE_LIMIT_PER_MINUTE * 4,
      maxConcurrentRequests: 3
    })
  }

  /**
   * Obtiene el valor UVA más reciente desde cualquier fuente disponible
   */
  // eslint-disable-next-line max-lines-per-function
  async getLatestUVAValue(): Promise<UVAUpdateResult> {
    const today = format(new Date(), 'yyyy-MM-dd')
    
    try {
      // Intentar obtener desde cache primero
      const cached = await this.getCachedUVAValue(today)
      if (cached) {
        return {
          success: true,
          date: today,
          value: cached.value,
          cached: true,
          source: 'cache'
        }
      }

      // Intentar obtener desde base de datos
      const dbValue = await this.uvaModel.findByDate(today)
      if (dbValue) {
        await this.setCachedUVAValue(today, dbValue.value)
        return {
          success: true,
          date: today,
          value: dbValue.value,
          cached: false,
          source: dbValue.source as any
        }
      }

      // Intentar scraping de BCRA
      const bcraResult = await this.fetchUVAFromBCRA()
      if (bcraResult.success && bcraResult.value) {
        await this.uvaModel.upsertUVA({
          date: today,
          value: bcraResult.value,
          source: 'bcra'
        })
        await this.setCachedUVAValue(today, bcraResult.value)
        return bcraResult
      }

      // Fallback a API de estadisticasbcra
      const estadisticasResult = await this.fetchUVAFromEstadisticas()
      if (estadisticasResult.success && estadisticasResult.value) {
        await this.uvaModel.upsertUVA({
          date: today,
          value: estadisticasResult.value,
          source: 'estadisticas'
        })
        await this.setCachedUVAValue(today, estadisticasResult.value)
        return estadisticasResult
      }

      // Si todo falla, obtener el último valor disponible
      const latestValue = await this.uvaModel.findLatest()
      if (latestValue) {
        logger.warn(`No se pudo obtener UVA para hoy, usando último valor disponible: ${latestValue.date}`)
        return {
          success: true,
          date: latestValue.date,
          value: latestValue.value,
          cached: false,
          source: latestValue.source as any
        }
      }

      throw new Error('No se pudo obtener ningún valor UVA')

    } catch (error) {
      logger.error('Error obteniendo valor UVA:', error)
      return {
        success: false,
        date: today,
        error: error instanceof Error ? error.message : 'Error desconocido',
        source: 'bcra'
      }
    }
  }

  /**
   * Scraping del sitio web del BCRA para obtener valor UVA
   */
  // eslint-disable-next-line max-lines-per-function
  private async fetchUVAFromBCRA(): Promise<UVAUpdateResult> {
    const today = format(new Date(), 'yyyy-MM-dd')
    
    try {
      if (!await this.rateLimiter.checkLimit()) {
        throw new Error('Rate limit excedido para scraping BCRA')
      }

      logger.info('Haciendo scraping de BCRA para obtener valor UVA...')
      
      const response = await axios.get(this.BCRA_UVA_URL, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      const $ = cheerio.load(response.data)
      
      // Buscar la tabla con los datos UVA
      let uvaValue: number | null = null
      let foundDate: string | null = null

      // El BCRA suele mostrar los datos en una tabla con class específica
      $('table tr').each((index, element) => {
        const cells = $(element).find('td')
        if (cells.length >= 2) {
          const dateText = cells.eq(0).text().trim()
          const valueText = cells.eq(1).text().trim()
          
          // Intentar parsear la fecha (formato dd/mm/yyyy)
          const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
          if (dateMatch) {
            const [, day, month, year] = dateMatch
            const parsedDate = `${year}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`
            
            // Intentar parsear el valor
              const valueMatch = valueText.replace(/[^\d,.]/g, '').replace(',', '.')
            const parsedValue = parseFloat(valueMatch)
            
            if (!isNaN(parsedValue) && parsedValue > 0) {
              // Tomar el valor más reciente
              if (!foundDate || parsedDate > foundDate) {
                foundDate = parsedDate
                uvaValue = parsedValue
              }
            }
          }
        }
      })

      if (uvaValue && foundDate) {
        logger.info(`Valor UVA obtenido de BCRA: ${uvaValue} para fecha ${foundDate}`)
        return {
          success: true,
          date: foundDate,
          value: uvaValue,
          source: 'bcra'
        }
      }

      throw new Error('No se pudo extraer valor UVA del sitio BCRA')

    } catch (error) {
      logger.error('Error en scraping BCRA:', error)
      return {
        success: false,
        date: today,
        error: error instanceof Error ? error.message : 'Error en scraping BCRA',
        source: 'bcra'
      }
    }
  }

  /**
   * Obtiene valor UVA desde la API de estadisticasbcra.com
   */
  private async fetchUVAFromEstadisticas(): Promise<UVAUpdateResult> {
    const today = format(new Date(), 'yyyy-MM-dd')
    
    try {
      if (!await this.rateLimiter.checkLimit()) {
        throw new Error('Rate limit excedido para API estadisticasbcra')
      }

      logger.info('Obteniendo valor UVA desde API estadisticasbcra...')
      
      const response = await axios.get(this.ESTADISTICAS_BCRA_API, {
        timeout: 5000,
        params: {
          fecha: today
        }
      })

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const latestData = response.data[0]
        const value = parseFloat(latestData.v || latestData.valor || latestData.value)
        const date = latestData.d || latestData.fecha || latestData.date

        if (!isNaN(value) && value > 0 && date) {
          logger.info(`Valor UVA obtenido de estadisticasbcra: ${value} para fecha ${date}`)
          return {
            success: true,
            date: format(parseISO(date), 'yyyy-MM-dd'),
            value,
            source: 'estadisticas'
          }
        }
      }

      throw new Error('Respuesta inválida de API estadisticasbcra')

    } catch (error) {
      logger.error('Error en API estadisticasbcra:', error)
      return {
        success: false,
        date: today,
        error: error instanceof Error ? error.message : 'Error en API estadisticasbcra',
        source: 'estadisticas'
      }
    }
  }

  /**
   * Actualiza valores UVA históricos para un rango de fechas
   */
  async updateHistoricalUVAValues(fromDate: string, toDate: string): Promise<{
    success: boolean
    processedCount: number
    errors: string[]
  }> {
    try {
      logger.info(`Actualizando valores UVA históricos desde ${fromDate} hasta ${toDate}`)
      
      const historicalData = await this.fetchHistoricalUVAFromEstadisticas(fromDate, toDate)
      
      if (historicalData.length === 0) {
        return {
          success: false,
          processedCount: 0,
          errors: ['No se encontraron datos históricos']
        }
      }

      const uvaValuesToInsert = historicalData.map(data => ({
        date: data.date,
        value: data.value,
        source: data.source
      }))

      const processedCount = await this.uvaModel.batchUpsert(uvaValuesToInsert)
      
      logger.info(`Se procesaron ${processedCount} valores UVA históricos`)
      
      return {
        success: true,
        processedCount,
        errors: []
      }

    } catch (error) {
      logger.error('Error actualizando valores UVA históricos:', error)
      return {
        success: false,
        processedCount: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      }
    }
  }

  /**
   * Obtiene datos históricos UVA desde API estadisticasbcra
   */
  private async fetchHistoricalUVAFromEstadisticas(fromDate: string, toDate: string): Promise<UVAHistoricalData[]> {
    try {
      const response = await axios.get(this.ESTADISTICAS_BCRA_API, {
        timeout: 15000,
        params: {
          desde: fromDate,
          hasta: toDate
        }
      })

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Respuesta inválida de API estadisticasbcra para datos históricos')
      }

      const historicalData: UVAHistoricalData[] = []
      
      for (const item of response.data) {
        const value = parseFloat(item.v || item.valor || item.value)
        const date = item.d || item.fecha || item.date

        if (!isNaN(value) && value > 0 && date) {
          historicalData.push({
            date: format(parseISO(date), 'yyyy-MM-dd'),
            value,
            source: 'estadisticas'
          })
        }
      }

      return historicalData.sort((a, b) => a.date.localeCompare(b.date))

    } catch (error) {
      logger.error('Error obteniendo datos históricos UVA:', error)
      return []
    }
  }

  /**
   * Calcula ajuste por inflación entre dos fechas
   */
  async calculateInflationAdjustment(
    amount: number,
    fromDate: string,
    toDate: string
  ): Promise<UVAInflationAdjustment> {
    return this.uvaModel.calculateInflationAdjustment(amount, fromDate, toDate)
  }

  /**
   * Obtiene valor UVA desde cache
   */
  private async getCachedUVAValue(date: string): Promise<{ value: number } | null> {
    try {
      const cacheKey = `uva_value_${date}`
      const cached = await this.cache.get(cacheKey)
      return cached && typeof cached === 'string' ? JSON.parse(cached) : null
    } catch (error) {
      logger.warn('Error obteniendo UVA desde cache:', error)
      return null
    }
  }

  /**
   * Guarda valor UVA en cache
   */
  private async setCachedUVAValue(date: string, value: number): Promise<void> {
    try {
      const cacheKey = `uva_value_${date}`
      await this.cache.set(cacheKey, JSON.stringify({ value }), this.CACHE_TTL_MINUTES * 60)
    } catch (error) {
      logger.warn('Error guardando UVA en cache:', error)
    }
  }

  /**
   * Obtiene estadísticas de valores UVA almacenados
   */
  async getUVAStatistics(): Promise<{
    totalCount: number
    dateRange: { earliest: string | null; latest: string | null }
    sources: { [key: string]: number }
    latestValue?: UVAData
  }> {
    try {
      const [totalCount, dateRange, latestValue] = await Promise.all([
        this.uvaModel.getUVACount(),
        this.uvaModel.getDateRange(),
        this.uvaModel.findLatest()
      ])

      // Obtener estadísticas por fuente
      const sources: { [key: string]: number } = {}
      const allValues = await this.uvaModel.search({ limit: 1000 })
      
      for (const uvaValue of allValues) {
        const source = uvaValue.source || 'unknown'
        sources[source] = (sources[source] || 0) + 1
      }

      return {
        totalCount,
        dateRange,
        sources,
        latestValue: latestValue || undefined
      }

    } catch (error) {
      logger.error('Error obteniendo estadísticas UVA:', error)
      throw new Error(`Failed to get UVA statistics: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Limpia valores UVA antiguos para mantener el rendimiento
   */
  async cleanupOldUVAValues(keepDays: number = 365): Promise<number> {
    try {
      const cutoffDate = format(subDays(new Date(), keepDays), 'yyyy-MM-dd')
      const deletedCount = await this.uvaModel.deleteOldUVAValues(cutoffDate)
      
      logger.info(`Se eliminaron ${deletedCount} valores UVA anteriores a ${cutoffDate}`)
      return deletedCount

    } catch (error) {
      logger.error('Error limpiando valores UVA antiguos:', error)
      throw new Error(`Failed to cleanup old UVA values: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}