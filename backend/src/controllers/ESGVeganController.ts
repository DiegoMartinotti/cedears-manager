/* eslint-disable max-lines-per-function */
import { Request, Response } from 'express'
import { z } from 'zod'
import ESGAnalysisService from '../services/ESGAnalysisService.js'
import VeganAnalysisService from '../services/VeganAnalysisService.js'
import ESGEvaluationModel from '../models/ESGEvaluation.js'
import VeganEvaluationModel from '../models/VeganEvaluation.js'
import { getESGVeganEvaluationJob } from '../jobs/ESGVeganEvaluationJob.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('ESGVeganController')

// Validation schemas
const instrumentIdSchema = z.object({
  instrumentId: z.string().transform(Number).refine(n => n > 0, 'Invalid instrument ID')
})

const esgFiltersSchema = z.object({
  instrumentId: z.string().transform(Number).optional(),
  minScore: z.string().transform(Number).optional(),
  maxScore: z.string().transform(Number).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minConfidence: z.string().transform(Number).optional(),
  hasControversies: z.string().transform(val => val === 'true').optional()
})

const veganFiltersSchema = z.object({
  instrumentId: z.string().transform(Number).optional(),
  minScore: z.string().transform(Number).optional(),
  maxScore: z.string().transform(Number).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  noAnimalTesting: z.string().transform(val => val === 'true').optional(),
  noAnimalProducts: z.string().transform(val => val === 'true').optional(),
  plantBasedFocus: z.string().transform(val => val === 'true').optional(),
  supplyChainVegan: z.string().transform(val => val === 'true').optional(),
  hasCertification: z.string().transform(val => val === 'true').optional()
})

export class ESGVeganController {
  private esgService = new ESGAnalysisService()
  private veganService = new VeganAnalysisService()
  private esgModel = new ESGEvaluationModel()
  private veganModel = new VeganEvaluationModel()

  /**
   * GET /esg/evaluations
   * Get all ESG evaluations with optional filters
   */
  getESGEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = esgFiltersSchema.parse(req.query)
      const evaluations = this.esgModel.findAll(filters)
      
      res.json({
        success: true,
        data: evaluations,
        count: evaluations.length
      })
    } catch (error) {
      logger.error('Error getting ESG evaluations:', error)
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error instanceof z.ZodError ? error.errors : String(error)
      })
    }
  }

  /**
   * GET /esg/evaluations/:instrumentId
   * Get ESG evaluation for specific instrument
   */
  getESGEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = instrumentIdSchema.parse(req.params)
      const evaluation = this.esgModel.findLatestByInstrument(instrumentId)
      
      if (!evaluation) {
        res.status(404).json({
          success: false,
          error: 'ESG evaluation not found for this instrument'
        })
        return
      }

      // Get trends data
      const trends = this.esgModel.getTrends(instrumentId, 12)
      
      // Get score breakdown
      const breakdown = this.esgModel.calculateScoreBreakdown(
        evaluation.environmental_score,
        evaluation.social_score,
        evaluation.governance_score
      )

      res.json({
        success: true,
        data: {
          evaluation,
          trends,
          breakdown
        }
      })
    } catch (error) {
      logger.error('Error getting ESG evaluation:', error)
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error instanceof z.ZodError ? error.errors : String(error)
      })
    }
  }

  /**
   * POST /esg/analyze/:instrumentId
   * Trigger ESG analysis for specific instrument
   */
  analyzeESG = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = instrumentIdSchema.parse(req.params)
      
      logger.info(`Starting ESG analysis for instrument ${instrumentId}`)
      const result = await this.esgService.analyzeInstrument(instrumentId)
      
      res.json({
        success: true,
        data: result,
        message: 'ESG analysis completed successfully'
      })
    } catch (error) {
      logger.error('Error analyzing ESG:', error)
      res.status(500).json({
        success: false,
        error: 'ESG analysis failed',
        details: String(error)
      })
    }
  }

  /**
   * GET /esg/statistics
   * Get ESG analysis statistics
   */
  getESGStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const statistics = this.esgService.getStatistics()
      
      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Error getting ESG statistics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get ESG statistics',
        details: String(error)
      })
    }
  }

  /**
   * GET /esg/instruments-needing-review
   * Get instruments that need ESG review
   */
  getESGInstrumentsNeedingReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const instruments = this.esgService.getInstrumentsNeedingReview()
      
      res.json({
        success: true,
        data: instruments,
        count: instruments.length
      })
    } catch (error) {
      logger.error('Error getting instruments needing ESG review:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get instruments needing review',
        details: String(error)
      })
    }
  }

  /**
   * GET /vegan/evaluations
   * Get all Vegan evaluations with optional filters
   */
  getVeganEvaluations = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters = veganFiltersSchema.parse(req.query)
      const evaluations = this.veganModel.findAll(filters)
      
      res.json({
        success: true,
        data: evaluations,
        count: evaluations.length
      })
    } catch (error) {
      logger.error('Error getting Vegan evaluations:', error)
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error instanceof z.ZodError ? error.errors : String(error)
      })
    }
  }

  /**
   * GET /vegan/evaluations/:instrumentId
   * Get Vegan evaluation for specific instrument
   */
  getVeganEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = instrumentIdSchema.parse(req.params)
      const evaluation = this.veganModel.findLatestByInstrument(instrumentId)
      
      if (!evaluation) {
        res.status(404).json({
          success: false,
          error: 'Vegan evaluation not found for this instrument'
        })
        return
      }

      // Get trends data
      const trends = this.veganModel.getTrends(instrumentId, 12)
      
      // Get criteria breakdown
      const breakdown = this.veganService.getVeganCriteriaBreakdown(evaluation)

      res.json({
        success: true,
        data: {
          evaluation,
          trends,
          breakdown
        }
      })
    } catch (error) {
      logger.error('Error getting Vegan evaluation:', error)
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error instanceof z.ZodError ? error.errors : String(error)
      })
    }
  }

  /**
   * POST /vegan/analyze/:instrumentId
   * Trigger Vegan analysis for specific instrument
   */
  analyzeVegan = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = instrumentIdSchema.parse(req.params)
      
      logger.info(`Starting Vegan analysis for instrument ${instrumentId}`)
      const result = await this.veganService.analyzeInstrument(instrumentId)
      
      res.json({
        success: true,
        data: result,
        message: 'Vegan analysis completed successfully'
      })
    } catch (error) {
      logger.error('Error analyzing Vegan criteria:', error)
      res.status(500).json({
        success: false,
        error: 'Vegan analysis failed',
        details: String(error)
      })
    }
  }

  /**
   * GET /vegan/statistics
   * Get Vegan analysis statistics
   */
  getVeganStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const statistics = this.veganService.getStatistics()
      
      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      logger.error('Error getting Vegan statistics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get Vegan statistics',
        details: String(error)
      })
    }
  }

  /**
   * GET /vegan/instruments-needing-review
   * Get instruments that need Vegan review
   */
  getVeganInstrumentsNeedingReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const instruments = this.veganService.getInstrumentsNeedingReview()
      
      res.json({
        success: true,
        data: instruments,
        count: instruments.length
      })
    } catch (error) {
      logger.error('Error getting instruments needing Vegan review:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get instruments needing review',
        details: String(error)
      })
    }
  }

  /**
   * POST /analyze/:instrumentId
   * Trigger both ESG and Vegan analysis for specific instrument
   */
  analyzeInstrument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = instrumentIdSchema.parse(req.params)
      
      logger.info(`Starting comprehensive ESG/Vegan analysis for instrument ${instrumentId}`)
      
      // Run both analyses in parallel
      const [esgResult, veganResult] = await Promise.allSettled([
        this.esgService.analyzeInstrument(instrumentId),
        this.veganService.analyzeInstrument(instrumentId)
      ])

      const response: any = {
        success: true,
        data: {},
        message: 'Analysis completed'
      }

      if (esgResult.status === 'fulfilled') {
        response.data.esg = esgResult.value
      } else {
        response.data.esgError = String(esgResult.reason)
      }

      if (veganResult.status === 'fulfilled') {
        response.data.vegan = veganResult.value
      } else {
        response.data.veganError = String(veganResult.reason)
      }

      // Determine overall success
      if (esgResult.status === 'rejected' && veganResult.status === 'rejected') {
        response.success = false
        response.message = 'Both ESG and Vegan analyses failed'
      } else if (esgResult.status === 'rejected') {
        response.message = 'Vegan analysis completed, ESG analysis failed'
      } else if (veganResult.status === 'rejected') {
        response.message = 'ESG analysis completed, Vegan analysis failed'
      } else {
        response.message = 'Both ESG and Vegan analyses completed successfully'
      }

      res.json(response)
    } catch (error) {
      logger.error('Error analyzing instrument:', error)
      res.status(500).json({
        success: false,
        error: 'Comprehensive analysis failed',
        details: String(error)
      })
    }
  }

  /**
   * GET /overview
   * Get overview of ESG and Vegan evaluations
   */
  getOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const [esgStats, veganStats] = await Promise.all([
        this.esgService.getStatistics(),
        this.veganService.getStatistics()
      ])

      const [esgReview, veganReview] = await Promise.all([
        this.esgService.getInstrumentsNeedingReview(),
        this.veganService.getInstrumentsNeedingReview()
      ])

      res.json({
        success: true,
        data: {
          esg: {
            statistics: esgStats,
            instrumentsNeedingReview: esgReview.length
          },
          vegan: {
            statistics: veganStats,
            instrumentsNeedingReview: veganReview.length
          },
          summary: {
            totalEvaluations: esgStats.totalEvaluations + veganStats.totalEvaluations,
            averageESGScore: esgStats.averageScore,
            averageVeganScore: veganStats.averageScore,
            instrumentsCovered: Math.max(esgStats.instrumentsCovered, veganStats.instrumentsCovered)
          }
        }
      })
    } catch (error) {
      logger.error('Error getting overview:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get overview',
        details: String(error)
      })
    }
  }

  /**
   * POST /job/manual-evaluation
   * Trigger manual evaluation job
   */
  triggerManualEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = req.body
      
      const job = getESGVeganEvaluationJob()
      
      // Start manual evaluation (this will be async)
      job.runManualEvaluation(instrumentId).catch(error => {
        logger.error('Manual evaluation failed:', error)
      })
      
      res.json({
        success: true,
        message: instrumentId 
          ? `Manual evaluation started for instrument ${instrumentId}`
          : 'Manual evaluation started for all instruments'
      })
    } catch (error) {
      logger.error('Error triggering manual evaluation:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to trigger manual evaluation',
        details: String(error)
      })
    }
  }

  /**
   * GET /job/status
   * Get evaluation job status
   */
  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const job = getESGVeganEvaluationJob()
      const status = job.getStatus()
      
      res.json({
        success: true,
        data: status
      })
    } catch (error) {
      logger.error('Error getting job status:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        details: String(error)
      })
    }
  }

  /**
   * GET /combined/:instrumentId
   * Get combined ESG and Vegan data for an instrument
   */
  getCombinedEvaluation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { instrumentId } = instrumentIdSchema.parse(req.params)
      
      const [esgEvaluation, veganEvaluation] = await Promise.all([
        this.esgModel.findLatestByInstrument(instrumentId),
        this.veganModel.findLatestByInstrument(instrumentId)
      ])

      const [esgTrends, veganTrends] = await Promise.all([
        this.esgModel.getTrends(instrumentId, 12),
        this.veganModel.getTrends(instrumentId, 12)
      ])

      res.json({
        success: true,
        data: {
          esg: {
            evaluation: esgEvaluation,
            trends: esgTrends,
            breakdown: esgEvaluation ? this.esgModel.calculateScoreBreakdown(
              esgEvaluation.environmental_score,
              esgEvaluation.social_score,
              esgEvaluation.governance_score
            ) : null
          },
          vegan: {
            evaluation: veganEvaluation,
            trends: veganTrends,
            breakdown: veganEvaluation ? this.veganService.getVeganCriteriaBreakdown(veganEvaluation) : null
          },
          hasEvaluations: !!(esgEvaluation || veganEvaluation)
        }
      })
    } catch (error) {
      logger.error('Error getting combined evaluation:', error)
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error instanceof z.ZodError ? error.errors : String(error)
      })
    }
  }
}

export default ESGVeganController