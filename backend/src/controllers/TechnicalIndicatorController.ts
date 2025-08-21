import { Request, Response } from 'express'
import { z } from 'zod'
import { technicalAnalysisService } from '../services/TechnicalAnalysisService'
import { technicalIndicatorModel } from '../models/TechnicalIndicator'
import { technicalAnalysisJob } from '../jobs/technicalAnalysisJob'
import { logger } from '../utils/logger'

// Schemas de validación
const getIndicatorsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  indicator: z.enum(['RSI', 'MACD', 'SMA', 'EMA', 'BB', 'STOCH']).optional(),
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0)
})

const getHistorySchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  indicator: z.enum(['RSI', 'MACD', 'SMA', 'EMA', 'BB', 'STOCH']).optional(),
  days: z.coerce.number().min(1).max(365).default(30),
  limit: z.coerce.number().min(1).max(1000).default(100)
})

const calculateIndicatorsSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').optional(),
  symbols: z.array(z.string()).optional(),
  force: z.boolean().default(false)
}).refine(data => data.symbol || data.symbols, {
  message: 'Either symbol or symbols array is required'
})

const getSignalsSchema = z.object({
  signals: z.array(z.enum(['BUY', 'SELL', 'HOLD'])).default(['BUY', 'SELL']),
  minStrength: z.coerce.number().min(0).max(100).default(0),
  limit: z.coerce.number().min(1).max(100).default(20)
})

export class TechnicalIndicatorController {

  /**
   * GET /api/v1/technical-indicators/:symbol
   * Obtiene los últimos indicadores técnicos para un símbolo
   */
  async getLatestIndicators(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params
      const validation = getIndicatorsSchema.safeParse({ symbol, ...req.query })

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        })
        return
      }

      const { symbol: validatedSymbol } = validation.data
      const indicators = await technicalAnalysisService.getLatestIndicators(validatedSymbol.toUpperCase())

      if (indicators.length === 0) {
        res.status(404).json({
          error: 'No technical indicators found',
          symbol: validatedSymbol,
          suggestion: 'Try calculating indicators first'
        })
        return
      }

      res.json({
        success: true,
        data: indicators,
        meta: {
          symbol: validatedSymbol,
          count: indicators.length,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error getting latest indicators:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/technical-indicators/:symbol/history
   * Obtiene el historial de indicadores técnicos para un símbolo
   */
  async getIndicatorHistory(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params
      const validation = getHistorySchema.safeParse({ symbol, ...req.query })

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        })
        return
      }

      const { symbol: validatedSymbol, indicator, days, limit } = validation.data

      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - days)

      const indicators = await technicalIndicatorModel.findBySymbol(validatedSymbol.toUpperCase(), {
        indicator,
        fromDate,
        limit
      })

      res.json({
        success: true,
        data: indicators,
        meta: {
          symbol: validatedSymbol,
          indicator: indicator || 'all',
          days,
          count: indicators.length,
          fromDate: fromDate.toISOString(),
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error getting indicator history:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/technical-indicators/signals
   * Obtiene señales activas de compra/venta
   */
  async getActiveSignals(req: Request, res: Response): Promise<void> {
    try {
      const validation = getSignalsSchema.safeParse(req.query)

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        })
        return
      }

      const { signals, minStrength, limit } = validation.data
      const activeSignals = await technicalAnalysisService.getActiveSignals()

      // Filtrar por fuerza mínima y señales solicitadas
      const filteredSignals = activeSignals
        .filter(signal => 
          signals.includes(signal.signal as any) && 
          signal.strength >= minStrength
        )
        .slice(0, limit)

      // Agrupar por señal para estadísticas
      const signalStats = signals.reduce((acc, signal) => {
        acc[signal] = filteredSignals.filter(s => s.signal === signal).length
        return acc
      }, {} as Record<string, number>)

      res.json({
        success: true,
        data: filteredSignals,
        meta: {
          totalSignals: filteredSignals.length,
          signalStats,
          filters: { signals, minStrength, limit },
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error getting active signals:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * POST /api/v1/technical-indicators/calculate
   * Calcula indicadores técnicos manualmente
   */
  async calculateIndicators(req: Request, res: Response): Promise<void> {
    try {
      const validation = calculateIndicatorsSchema.safeParse(req.body)

      if (!validation.success) {
        res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        })
        return
      }

      const { symbol, symbols, force } = validation.data
      const results = []

      if (symbol) {
        // Calcular para un símbolo específico
        const result = await technicalAnalysisJob.runManualAnalysis(symbol.toUpperCase())
        results.push({
          symbol: symbol.toUpperCase(),
          ...result
        })
      } else if (symbols) {
        // Calcular para múltiples símbolos
        for (const sym of symbols) {
          const result = await technicalAnalysisJob.runManualAnalysis(sym.toUpperCase())
          results.push({
            symbol: sym.toUpperCase(),
            ...result
          })
        }
      } else {
        // Calcular para todos los instrumentos activos
        const result = await technicalAnalysisJob.runManualAnalysis()
        results.push({
          symbol: 'ALL_ACTIVE',
          ...result
        })
      }

      const successCount = results.filter(r => r.success).length
      const totalProcessed = results.reduce((acc, r) => acc + r.processedCount, 0)

      res.json({
        success: successCount > 0,
        data: results,
        meta: {
          totalSymbols: results.length,
          successfulCalculations: successCount,
          totalProcessedInstruments: totalProcessed,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error calculating indicators:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/technical-indicators/:symbol/extremes
   * Obtiene mínimos y máximos anuales para un símbolo
   */
  async getExtremes(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params
      const { days = 365 } = req.query

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol parameter is required'
        })
        return
      }

      const extremes = technicalIndicatorModel.getExtremes(
        symbol.toUpperCase(), 
        Number(days) || 365
      )

      if (!extremes) {
        res.status(404).json({
          error: 'No price data found for symbol',
          symbol: symbol.toUpperCase()
        })
        return
      }

      // Calcular estadísticas adicionales
      const range = extremes.yearHigh - extremes.yearLow
      const currentPosition = ((extremes.current - extremes.yearLow) / range) * 100

      res.json({
        success: true,
        data: {
          ...extremes,
          range,
          currentPositionPercent: Math.round(currentPosition * 100) / 100,
          volatility: Math.round((range / extremes.yearLow) * 10000) / 100
        },
        meta: {
          symbol: symbol.toUpperCase(),
          period: `${days} days`,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error getting extremes:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/technical-indicators/stats
   * Obtiene estadísticas del sistema de indicadores técnicos
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await technicalAnalysisService.getServiceStats()
      const jobStatus = technicalAnalysisJob.getJobStatus()

      res.json({
        success: true,
        data: {
          indicators: stats,
          jobStatus,
          performance: {
            totalIndicators: stats.totalIndicators,
            activeSymbols: Object.keys(stats.bySymbol).length,
            averageIndicatorsPerSymbol: Math.round(stats.totalIndicators / Math.max(1, Object.keys(stats.bySymbol).length) * 100) / 100,
            lastUpdate: stats.lastUpdate
          }
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error getting technical indicators stats:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * GET /api/v1/technical-indicators/job/status
   * Obtiene el estado del job de análisis técnico
   */
  async getJobStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = technicalAnalysisJob.getJobStatus()

      res.json({
        success: true,
        data: status,
        meta: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error getting job status:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * POST /api/v1/technical-indicators/job/force-run
   * Fuerza la ejecución del job de análisis técnico
   */
  async forceJobRun(req: Request, res: Response): Promise<void> {
    try {
      // Ejecutar en background para no bloquear la respuesta
      technicalAnalysisJob.forceRun().catch(error => {
        logger.error('Error in forced job run:', error)
      })

      res.json({
        success: true,
        message: 'Technical analysis job started in background',
        data: {
          startedAt: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error forcing job run:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * DELETE /api/v1/technical-indicators/cleanup
   * Limpia indicadores técnicos antiguos
   */
  async cleanupOldIndicators(req: Request, res: Response): Promise<void> {
    try {
      const { days = 90 } = req.query
      const daysToKeep = Math.max(1, Math.min(365, Number(days)))

      const deletedCount = await technicalAnalysisService.cleanupOldIndicators(daysToKeep)

      res.json({
        success: true,
        data: {
          deletedIndicators: deletedCount,
          daysKept: daysToKeep
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Error cleaning up indicators:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// Singleton instance
export const technicalIndicatorController = new TechnicalIndicatorController()