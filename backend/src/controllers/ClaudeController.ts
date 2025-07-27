import { Request, Response } from 'express'
import { claudeAnalysisService } from '../services/claudeAnalysisService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('claude-controller')

export class ClaudeController {
  /**
   * GET /api/claude/status
   * Obtiene el estado de los servicios de Claude
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const stats = claudeAnalysisService.getServiceStats()
      const systemInfo = claudeAnalysisService.getSystemInfo()

      res.json({
        success: true,
        data: {
          status: stats,
          systemInfo,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      logger.error('Failed to get Claude status', { error })
      res.status(500).json({
        success: false,
        error: 'Failed to get Claude status',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/claude/analyze
   * Ejecuta un análisis técnico usando Claude
   */
  static async analyze(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, instrumentCode, context, options } = req.body

      // Validaciones básicas
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Prompt is required and must be a string'
        })
        return
      }

      if (prompt.length > 10000) {
        res.status(400).json({
          success: false,
          error: 'Prompt too long (max 10000 characters)'
        })
        return
      }

      logger.info('Analysis request received', {
        instrumentCode,
        promptLength: prompt.length,
        hasContext: !!context
      })

      // Ejecutar análisis
      const result = await claudeAnalysisService.analyze(
        {
          prompt,
          instrumentCode,
          context,
          marketData: req.body.marketData
        },
        options || {}
      )

      logger.info('Analysis completed', {
        instrumentCode,
        success: result.success,
        fromCache: result.fromCache,
        executionTime: result.executionTime
      })

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('Analysis failed', { error, instrumentCode: req.body?.instrumentCode })
      res.status(500).json({
        success: false,
        error: 'Analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/claude/quick-analysis
   * Análisis rápido con configuración predeterminada
   */
  static async quickAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, instrumentCode } = req.body

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Prompt is required and must be a string'
        })
        return
      }

      logger.info('Quick analysis request', { instrumentCode, promptLength: prompt.length })

      const result = await claudeAnalysisService.quickAnalysis(prompt, instrumentCode)

      res.json({
        success: true,
        data: result
      })

    } catch (error) {
      logger.error('Quick analysis failed', { error })
      res.status(500).json({
        success: false,
        error: 'Quick analysis failed',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/claude/initialize
   * Inicializa los servicios de Claude
   */
  static async initialize(req: Request, res: Response): Promise<void> {
    try {
      await claudeAnalysisService.initialize()

      logger.info('Claude services initialized successfully')

      res.json({
        success: true,
        message: 'Claude services initialized successfully',
        data: claudeAnalysisService.getServiceStats()
      })

    } catch (error) {
      logger.error('Failed to initialize Claude services', { error })
      res.status(500).json({
        success: false,
        error: 'Failed to initialize Claude services',
        message: (error as Error).message
      })
    }
  }

  /**
   * POST /api/claude/reset
   * Reinicia caché y contadores
   */
  static async reset(req: Request, res: Response): Promise<void> {
    try {
      await claudeAnalysisService.reset()

      logger.info('Claude services reset successfully')

      res.json({
        success: true,
        message: 'Claude services reset successfully'
      })

    } catch (error) {
      logger.error('Failed to reset Claude services', { error })
      res.status(500).json({
        success: false,
        error: 'Failed to reset Claude services',
        message: (error as Error).message
      })
    }
  }

  /**
   * GET /api/claude/metrics
   * Obtiene métricas detalladas de performance
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const systemInfo = claudeAnalysisService.getSystemInfo()

      res.json({
        success: true,
        data: {
          ...systemInfo,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      logger.error('Failed to get Claude metrics', { error })
      res.status(500).json({
        success: false,
        error: 'Failed to get Claude metrics',
        message: (error as Error).message
      })
    }
  }
}