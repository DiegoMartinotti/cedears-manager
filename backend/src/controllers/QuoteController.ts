import { Request, Response } from 'express'
import { quoteService } from '../services/QuoteService.js'
import { quoteUpdateJob } from '../jobs/quoteUpdateJob.js'
import { createLogger } from '../utils/logger.js'
import { z } from 'zod'

const logger = createLogger('QuoteController')

// Esquemas de validación
const symbolParamSchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase()
})

const batchQuotesSchema = z.object({
  symbols: z.array(z.string().min(1).max(10)).min(1).max(50),
  forceRefresh: z.boolean().optional().default(false)
})

const quoteHistorySchema = z.object({
  symbol: z.string().min(1).max(10).toUpperCase(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  orderBy: z.enum(['date', 'price']).optional().default('date'),
  orderDirection: z.enum(['ASC', 'DESC']).optional().default('DESC')
})

const forceRefreshSchema = z.object({
  forceRefresh: z.boolean().optional().default(false)
})

export class QuoteController {
  /**
   * GET /quotes/:symbol - Obtiene cotización de un símbolo específico
   */
  async getQuote(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = symbolParamSchema.parse(req.params)
      const { forceRefresh } = forceRefreshSchema.parse(req.query)

      logger.info('Getting quote', { symbol, forceRefresh })

      const result = await quoteService.getQuote(symbol, forceRefresh)

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
          symbol
        })
        return
      }

      res.json({
        success: true,
        data: result,
        cached: result.cached || false
      })
    } catch (error) {
      logger.error('Error getting quote', { error })
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * POST /quotes/batch - Obtiene cotizaciones de múltiples símbolos
   */
  async getBatchQuotes(req: Request, res: Response): Promise<void> {
    try {
      const { symbols, forceRefresh } = batchQuotesSchema.parse(req.body)

      logger.info('Getting batch quotes', { symbolCount: symbols.length, forceRefresh })

      const results = await quoteService.getBatchQuotes(symbols, forceRefresh)
      
      const successCount = results.filter(r => r.success).length
      const failedCount = results.length - successCount

      res.json({
        success: true,
        data: results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failedCount
        }
      })
    } catch (error) {
      logger.error('Error getting batch quotes', { error })
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * GET /quotes/history/:symbol - Obtiene historial de cotizaciones
   */
  async getQuoteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = symbolParamSchema.parse(req.params)
      const queryData = quoteHistorySchema.parse({
        symbol,
        ...req.query
      })

      logger.info('Getting quote history', { symbol, filters: queryData })

      const quotes = await quoteService.getQuoteHistory(symbol, {
        fromDate: queryData.fromDate,
        toDate: queryData.toDate,
        limit: queryData.limit,
        orderBy: queryData.orderBy,
        orderDirection: queryData.orderDirection
      })

      res.json({
        success: true,
        data: quotes,
        count: quotes.length,
        filters: {
          symbol,
          fromDate: queryData.fromDate,
          toDate: queryData.toDate,
          limit: queryData.limit,
          orderBy: queryData.orderBy,
          orderDirection: queryData.orderDirection
        }
      })
    } catch (error) {
      logger.error('Error getting quote history', { error })
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * GET /quotes/latest/:symbol - Obtiene última cotización desde DB
   */
  async getLatestQuote(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = symbolParamSchema.parse(req.params)

      logger.debug('Getting latest quote from DB', { symbol })

      const quote = await quoteService.getLatestQuote(symbol)

      if (!quote) {   
        res.status(404).json({
          success: false,
          error: 'No quotes found for symbol',
          symbol
        })
        return
      }

      res.json({
        success: true,
        data: quote
      })
    } catch (error) {
      logger.error('Error getting latest quote', { error })
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * GET /quotes/watchlist - Obtiene cotizaciones de todos los instrumentos en watchlist
   */
  async getWatchlistQuotes(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('Getting watchlist quotes')

      const quotes = await quoteService.getWatchlistQuotes()

      res.json({
        success: true,
        data: quotes,
        count: quotes.length
      })
    } catch (error) {
      logger.error('Error getting watchlist quotes', { error })
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * POST /quotes/update - Ejecuta actualización manual de cotizaciones
   */
  async updateQuotes(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Manual quote update requested')

      const result = await quoteUpdateJob.executeUpdate()

      res.json({
        success: result.success,
        message: result.message,
        stats: result.stats
      })
    } catch (error) {
      logger.error('Error updating quotes', { error })
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * GET /quotes/market/hours - Obtiene información de horario de mercado
   */
  async getMarketHours(req: Request, res: Response): Promise<void> {
    try {
      const marketHours = quoteService.getMarketHours()

      res.json({
        success: true,
        data: marketHours
      })
    } catch (error) {
      logger.error('Error getting market hours', { error })
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * GET /quotes/stats - Obtiene estadísticas del servicio de cotizaciones
   */
  async getServiceStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await quoteService.getServiceStats()
      const jobStats = quoteUpdateJob.getStats()
      const jobConfig = quoteUpdateJob.getConfig()

      res.json({
        success: true,
        data: {
          service: stats,
          job: {
            stats: jobStats,
            config: jobConfig
          }
        }
      })
    } catch (error) {
      logger.error('Error getting service stats', { error })
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * POST /quotes/job/config - Actualiza configuración del job
   */
  async updateJobConfig(req: Request, res: Response): Promise<void> {
    try {
      const configSchema = z.object({
        enabled: z.boolean().optional(),
        schedule: z.string().optional(),
        marketHoursOnly: z.boolean().optional(),
        batchSize: z.number().min(1).max(100).optional(),
        retryAttempts: z.number().min(1).max(10).optional(),
        retryDelayMs: z.number().min(1000).max(60000).optional()
      })

      const newConfig = configSchema.parse(req.body)

      logger.info('Updating job config', { newConfig })

      quoteUpdateJob.updateConfig(newConfig)

      res.json({
        success: true,
        message: 'Job configuration updated',
        config: quoteUpdateJob.getConfig()
      })
    } catch (error) {
      logger.error('Error updating job config', { error })
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * POST /quotes/cleanup - Ejecuta limpieza de cotizaciones antiguas
   */
  async cleanupOldQuotes(req: Request, res: Response): Promise<void> {
    try {
      const cleanupSchema = z.object({
        daysToKeep: z.number().min(1).max(365).optional().default(30)
      })

      const { daysToKeep } = cleanupSchema.parse(req.body)

      logger.info('Manual quote cleanup requested', { daysToKeep })

      const result = await quoteUpdateJob.cleanupOldQuotes(daysToKeep)

      res.json({
        success: result.success,
        message: result.message,
        deletedCount: result.deletedCount
      })
    } catch (error) {
      logger.error('Error cleaning up quotes', { error })
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid parameters',
          details: error.errors
        })
        return
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * POST /quotes/job/restart - Reinicia el job de actualización
   */
  async restartJob(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Job restart requested')

      quoteUpdateJob.restart()

      res.json({
        success: true,
        message: 'Quote update job restarted',
        config: quoteUpdateJob.getConfig(),
        stats: quoteUpdateJob.getStats()
      })
    } catch (error) {
      logger.error('Error restarting job', { error })
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }

  /**
   * DELETE /quotes/job/stats - Resetea estadísticas del job
   */
  async resetJobStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Job stats reset requested')

      quoteUpdateJob.resetStats()

      res.json({
        success: true,
        message: 'Job statistics reset',
        stats: quoteUpdateJob.getStats()
      })
    } catch (error) {
      logger.error('Error resetting job stats', { error })
      
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

export const quoteController = new QuoteController()