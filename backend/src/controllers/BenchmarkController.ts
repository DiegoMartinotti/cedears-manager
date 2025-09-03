import { Request, Response } from 'express'
import { z } from 'zod'
import { benchmarkIndicesModel } from '../models/BenchmarkIndices.js'
import { benchmarkDataService } from '../services/BenchmarkDataService.js'
import { performanceAnalysisService } from '../services/PerformanceAnalysisService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('benchmark-controller')

// Validation schemas
const comparePerformanceSchema = z.object({
  benchmarkId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adjustForInflation: z.boolean().optional().default(true)
})

const createBenchmarkSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  country: z.string().max(10).default('US'),
  currency: z.string().max(3).default('USD'),
  category: z.enum(['EQUITY', 'BOND', 'COMMODITY', 'CURRENCY']),
  subcategory: z.string().max(100).optional(),
  data_source: z.string().max(50).default('yahoo'),
  update_frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY')
})

const updateBenchmarkSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  update_frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional()
})

export class BenchmarkController {
  // GET /api/v1/benchmark/indices
  async getBenchmarkIndices(req: Request, res: Response) {
    try {
      const { category, country, active_only } = req.query
      
      let benchmarks
      if (category) {
        benchmarks = await benchmarkIndicesModel.findByCategory(category as string)
      } else {
        benchmarks = await benchmarkIndicesModel.findAll(active_only !== 'false')
      }

      if (country) {
        benchmarks = benchmarks.filter(b => b.country === country)
      }

      res.json({
        success: true,
        data: benchmarks,
        count: benchmarks.length
      })
    } catch (error) {
      logger.error('Error getting benchmark indices:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get benchmark indices'
      })
    }
  }

  // GET /api/v1/benchmark/indices/:id
  async getBenchmarkById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const benchmark = await benchmarkIndicesModel.findById(parseInt(id))
      
      if (!benchmark) {
        return res.status(404).json({
          success: false,
          error: 'Benchmark not found'
        })
      }

      res.json({
        success: true,
        data: benchmark
      })
    } catch (error) {
      logger.error('Error getting benchmark by id:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get benchmark'
      })
    }
  }

  // POST /api/v1/benchmark/indices
  async createBenchmark(req: Request, res: Response) {
    try {
      const validatedData = createBenchmarkSchema.parse(req.body)
      
      const benchmark = await benchmarkIndicesModel.create({
        ...validatedData,
        is_active: true
      })

      res.status(201).json({
        success: true,
        data: benchmark
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        })
      }
      
      logger.error('Error creating benchmark:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create benchmark'
      })
    }
  }

  // PUT /api/v1/benchmark/indices/:id
  async updateBenchmark(req: Request, res: Response) {
    try {
      const { id } = req.params
      const validatedData = updateBenchmarkSchema.parse(req.body)
      
      const benchmark = await benchmarkIndicesModel.update(parseInt(id), validatedData)
      
      if (!benchmark) {
        return res.status(404).json({
          success: false,
          error: 'Benchmark not found'
        })
      }

      res.json({
        success: true,
        data: benchmark
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        })
      }
      
      logger.error('Error updating benchmark:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update benchmark'
      })
    }
  }

  // DELETE /api/v1/benchmark/indices/:id
  async deleteBenchmark(req: Request, res: Response) {
    try {
      const { id } = req.params
      const deleted = await benchmarkIndicesModel.delete(parseInt(id))
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Benchmark not found'
        })
      }

      res.json({
        success: true,
        message: 'Benchmark deleted successfully'
      })
    } catch (error) {
      logger.error('Error deleting benchmark:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to delete benchmark'
      })
    }
  }

  // GET /api/v1/benchmark/data/:benchmarkId
  async getBenchmarkData(req: Request, res: Response) {
    try {
      const { benchmarkId } = req.params
      const { startDate, endDate, limit } = req.query
      
      const id = parseInt(benchmarkId)
      const start = new Date(startDate as string)
      const end = new Date(endDate as string)
      const limitNum = limit ? parseInt(limit as string) : undefined

      const data = await benchmarkDataService.getBenchmarkDataRange(id, start, end)
      
      let limitedData = data
      if (limitNum && data.length > limitNum) {
        // Take evenly distributed samples if too much data
        const step = Math.floor(data.length / limitNum)
        limitedData = data.filter((_, index) => index % step === 0).slice(0, limitNum)
      }

      res.json({
        success: true,
        data: limitedData,
        count: limitedData.length,
        total_available: data.length
      })
    } catch (error) {
      logger.error('Error getting benchmark data:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get benchmark data'
      })
    }
  }

  // GET /api/v1/benchmark/latest/:benchmarkId
  async getLatestBenchmarkData(req: Request, res: Response) {
    try {
      const { benchmarkId } = req.params
      const { limit } = req.query
      
      const id = parseInt(benchmarkId)
      const limitNum = limit ? parseInt(limit as string) : 1

      const data = await benchmarkDataService.getLatestBenchmarkData(id, limitNum)

      res.json({
        success: true,
        data: data,
        count: data.length
      })
    } catch (error) {
      logger.error('Error getting latest benchmark data:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get latest benchmark data'
      })
    }
  }

  // POST /api/v1/benchmark/update/:benchmarkId
  async updateBenchmarkData(req: Request, res: Response) {
    try {
      const { benchmarkId } = req.params
      
      const benchmark = await benchmarkIndicesModel.findById(parseInt(benchmarkId))
      if (!benchmark) {
        return res.status(404).json({
          success: false,
          error: 'Benchmark not found'
        })
      }

      const result = await benchmarkDataService.updateBenchmarkData(benchmark)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Error updating benchmark data:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update benchmark data'
      })
    }
  }

  // POST /api/v1/benchmark/update-all
  async updateAllBenchmarks(req: Request, res: Response) {
    try {
      const results = await benchmarkDataService.updateAllBenchmarks()

      const successCount = results.filter(r => r.success).length
      const totalCount = results.length

      res.json({
        success: true,
        data: {
          results: results,
          summary: {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount
          }
        }
      })
    } catch (error) {
      logger.error('Error updating all benchmarks:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update all benchmarks'
      })
    }
  }

  // POST /api/v1/benchmark/compare/:benchmarkId
  async compareWithBenchmark(req: Request, res: Response) {
    try {
      const { benchmarkId } = req.params
      const validatedData = comparePerformanceSchema.parse(req.body)
      
      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)
      
      const comparison = await performanceAnalysisService.compareWithBenchmark(
        parseInt(benchmarkId),
        startDate,
        endDate
      )

      res.json({
        success: true,
        data: comparison
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        })
      }
      
      logger.error('Error comparing with benchmark:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to compare with benchmark'
      })
    }
  }

  // GET /api/v1/benchmark/performance-metrics
  async getPerformanceMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate, benchmarkId } = req.query
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        })
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)
      
      let metrics
      if (benchmarkId) {
        metrics = await performanceAnalysisService.compareWithBenchmark(
          parseInt(benchmarkId as string),
          start,
          end
        )
      } else {
        metrics = await performanceAnalysisService.calculatePortfolioMetrics(start, end)
      }

      res.json({
        success: true,
        data: metrics
      })
    } catch (error) {
      logger.error('Error getting performance metrics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get performance metrics'
      })
    }
  }

  // GET /api/v1/benchmark/returns/:benchmarkId
  async getBenchmarkReturns(req: Request, res: Response) {
    try {
      const { benchmarkId } = req.params
      const { startDate, endDate } = req.query
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        })
      }

      const start = new Date(startDate as string)
      const end = new Date(endDate as string)
      const id = parseInt(benchmarkId)

      const returns = await benchmarkDataService.calculateBenchmarkReturns(id, start, end)
      
      if (!returns) {
        return res.status(404).json({
          success: false,
          error: 'Insufficient data for return calculation'
        })
      }

      res.json({
        success: true,
        data: returns
      })
    } catch (error) {
      logger.error('Error getting benchmark returns:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get benchmark returns'
      })
    }
  }

  // GET /api/v1/benchmark/statistics
  async getBenchmarkStatistics(req: Request, res: Response) {
    try {
      const stats = await benchmarkDataService.getServiceStatistics()

      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      logger.error('Error getting benchmark statistics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get benchmark statistics'
      })
    }
  }

  // GET /api/v1/benchmark/quote/:benchmarkId
  async getCurrentQuote(req: Request, res: Response) {
    try {
      const { benchmarkId } = req.params
      
      const benchmark = await benchmarkIndicesModel.findById(parseInt(benchmarkId))
      if (!benchmark) {
        return res.status(404).json({
          success: false,
          error: 'Benchmark not found'
        })
      }

      const quote = await benchmarkDataService.fetchCurrentQuote(benchmark.symbol)
      
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'No current quote available'
        })
      }

      res.json({
        success: true,
        data: {
          benchmark: {
            id: benchmark.id,
            symbol: benchmark.symbol,
            name: benchmark.name
          },
          quote: quote,
          timestamp: new Date()
        }
      })
    } catch (error) {
      logger.error('Error getting current quote:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get current quote'
      })
    }
  }

  // GET /api/v1/benchmark/health
  async getHealthCheck(req: Request, res: Response) {
    try {
      const stats = await benchmarkDataService.getServiceStatistics()
      const now = new Date()
      
      // Check if any benchmark needs updating (hasn't been updated in the last 2 days)
      const staleThreshold = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const staleUpdates = stats.last_updates.filter(
        update => !update.last_update || update.last_update < staleThreshold
      )

      res.json({
        success: true,
        data: {
          service_status: 'healthy',
          last_check: now,
          statistics: stats,
          stale_benchmarks: staleUpdates.length,
          needs_attention: staleUpdates.length > 0,
          recommendations: staleUpdates.length > 0 
            ? ['Run benchmark update job to refresh stale data']
            : []
        }
      })
    } catch (error) {
      logger.error('Error getting health check:', error)
      res.status(500).json({
        success: false,
        error: 'Service health check failed',
        service_status: 'unhealthy'
      })
    }
  }
}

export const benchmarkController = new BenchmarkController()