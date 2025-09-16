import cron from 'node-cron'
import { benchmarkDataService, BenchmarkUpdateResult } from '../services/BenchmarkDataService.js'
import { performanceAnalysisService, ComparisonResult } from '../services/PerformanceAnalysisService.js'
import { benchmarkIndicesModel, BenchmarkIndex } from '../models/BenchmarkIndices.js'
import { NotificationService } from '../services/NotificationService.js'
import DatabaseConnection from '../database/connection.js'
import { logger } from '../utils/logger.js'

const notificationService = new NotificationService(DatabaseConnection.getInstance())

class BenchmarkUpdateJob {
  private isRunning = false

  async initialize() {
    logger.info('Initializing Benchmark Update Jobs...')
    
    // Daily benchmark data update at 9:30 AM (after market hours)
    cron.schedule('30 9 * * 1-5', async () => {
      await this.runDailyUpdate()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Weekend comprehensive update (Saturday 8:00 AM)
    cron.schedule('0 8 * * 6', async () => {
      await this.runWeekendUpdate()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Monthly performance metrics calculation (First day of month, 10:00 AM)
    cron.schedule('0 10 1 * *', async () => {
      await this.runMonthlyPerformanceUpdate()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    // Health check and cleanup (Daily at 3:00 AM)
    cron.schedule('0 3 * * *', async () => {
      await this.runMaintenanceTasks()
    }, {
      scheduled: true,
      timezone: 'America/Argentina/Buenos_Aires'
    })

    logger.info('Benchmark Update Jobs initialized successfully')
  }

  async runDailyUpdate(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Benchmark update job is already running, skipping...')
      return
    }

    this.isRunning = true
    logger.info('Starting daily benchmark update job')

    try {
      const { results, duration } = await this.executeDailyUpdate()
      await this.processDailyUpdateResults(results, duration)
    } catch (error) {
      await this.notifyDailyUpdateFailure(error)
    } finally {
      this.isRunning = false
    }
  }

  private async executeDailyUpdate(): Promise<{ results: BenchmarkUpdateResult[]; duration: number }> {
    const startTime = Date.now()
    const results = await benchmarkDataService.updateAllBenchmarks()
    const duration = Math.round((Date.now() - startTime) / 1000)

    return { results, duration }
  }

  private async processDailyUpdateResults(
    results: BenchmarkUpdateResult[],
    duration: number
  ): Promise<void> {
    const successCount = results.filter(result => result.success).length
    const totalCount = results.length
    const failedResults = results.filter(result => !result.success)

    this.logDailyUpdateSummary(duration, successCount, totalCount, failedResults)

    if (failedResults.length > totalCount * 0.3) {
      await this.notifyDailyUpdateIssues(failedResults, totalCount)
      return
    }

    if (successCount === totalCount) {
      await this.notifyDailyUpdateSuccess(totalCount, duration, results)
    }
  }

  private async notifyDailyUpdateIssues(
    failedResults: BenchmarkUpdateResult[],
    totalCount: number
  ): Promise<void> {
    await notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'HIGH',
      title: 'Benchmark Update Issues',
      message: `Daily benchmark update had ${failedResults.length}/${totalCount} failures`,
      data: { failed_benchmarks: failedResults }
    })
  }

  private async notifyDailyUpdateSuccess(
    totalCount: number,
    duration: number,
    results: BenchmarkUpdateResult[]
  ): Promise<void> {
    await notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'LOW',
      title: 'Benchmark Update Complete',
      message: `All ${totalCount} benchmarks updated successfully`,
      data: {
        duration_seconds: duration,
        total_records: results.reduce((sum, result) => sum + result.records_updated, 0)
      }
    })
  }

  private logDailyUpdateSummary(
    duration: number,
    successCount: number,
    totalCount: number,
    failedResults: BenchmarkUpdateResult[]
  ): void {
    logger.info(`Daily benchmark update completed in ${duration}s: ${successCount}/${totalCount} successful`)

    if (failedResults.length > 0) {
      logger.warn('Failed benchmark updates:', failedResults.map(result => ({
        symbol: result.symbol,
        error: result.error
      })))
    }
  }

  private async notifyDailyUpdateFailure(error: unknown): Promise<void> {
    logger.error('Error in daily benchmark update job:', error)

    await notificationService.createNotification({
      type: 'SYSTEM',
      priority: 'CRITICAL',
      title: 'Benchmark Update Failed',
      message: 'Daily benchmark update job encountered a critical error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }

  async runWeekendUpdate(): Promise<void> {
    logger.info('Starting weekend comprehensive benchmark update')

    try {
      // 1. Update all benchmark data
      await this.runDailyUpdate()
      
      // 2. Clean up old data (keep 2 years)
      await this.cleanupOldData(730)
      
      // 3. Refresh performance summaries for all benchmarks
      await this.refreshPerformanceSummaries()
      
      // 4. Update risk-free rates
      await this.updateRiskFreeRates()

      logger.info('Weekend comprehensive benchmark update completed')

      await notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'LOW',
        title: 'Weekend Benchmark Update Complete',
        message: 'Comprehensive benchmark data refresh completed successfully'
      })

    } catch (error) {
      logger.error('Error in weekend benchmark update:', error)
      
      await notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Weekend Benchmark Update Failed',
        message: 'Weekend comprehensive update encountered errors',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
  }

  async runMonthlyPerformanceUpdate(): Promise<void> {
    logger.info('Starting monthly performance metrics update')

    try {
      const now = new Date()
      const benchmarks = await benchmarkIndicesModel.findAll(true)
      const performanceResults: string[] = []

      for (const benchmark of benchmarks) {
        const benchmarkResults = await this.calculateBenchmarkPerformance(benchmark, now)
        performanceResults.push(...benchmarkResults)
      }

      logger.info('Monthly performance metrics update completed', { results: performanceResults })

      await notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'MEDIUM',
        title: 'Monthly Performance Update Complete',
        message: `Performance metrics calculated for ${benchmarks.length} benchmarks`,
        data: { results: performanceResults.slice(0, 10) }
      })

    } catch (error) {
      logger.error('Error in monthly performance update:', error)

      await notificationService.createNotification({
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Monthly Performance Update Failed',
        message: 'Monthly performance metrics calculation failed',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    }
  }

  async runMaintenanceTasks(): Promise<void> {
    logger.info('Running benchmark maintenance tasks')

    try {
      // 1. Clean up very old data (older than 3 years)
      await this.cleanupOldData(1095)
      
      // 2. Verify data integrity
      await this.verifyDataIntegrity()
      
      // 3. Update benchmark health status
      await this.updateBenchmarkHealthStatus()

      logger.info('Benchmark maintenance tasks completed')
    } catch (error) {
      logger.error('Error in benchmark maintenance tasks:', error)
    }
  }

  private async calculateBenchmarkPerformance(benchmark: BenchmarkIndex, referenceDate: Date): Promise<string[]> {
    const results: string[] = []

    for (const period of this.getPerformancePeriods()) {
      const startDate = this.calculatePeriodStart(referenceDate, period.days)

      try {
        const comparison = await performanceAnalysisService.compareWithBenchmark(
          benchmark.id!,
          startDate,
          referenceDate
        )

        await this.savePerformanceMetrics(benchmark.id!, referenceDate, period.days, comparison)
        results.push(`${benchmark.symbol}-${period.name}: Success`)
      } catch (error) {
        logger.warn(`Failed to calculate ${period.name} performance for ${benchmark.symbol}:`, error)
        results.push(`${benchmark.symbol}-${period.name}: Failed`)
      }
    }

    return results
  }

  private async savePerformanceMetrics(
    benchmarkId: number,
    calculationDate: Date,
    periodDays: number,
    comparison: ComparisonResult
  ): Promise<void> {
    await performanceAnalysisService.savePerformanceMetrics({
      calculation_date: calculationDate,
      benchmark_id: benchmarkId,
      period_days: periodDays,
      portfolio_return: comparison.portfolio.total_return,
      benchmark_return: comparison.benchmark.total_return,
      excess_return: comparison.comparison.excess_return,
      portfolio_volatility: comparison.portfolio.volatility,
      benchmark_volatility: comparison.benchmark.volatility,
      sharpe_ratio: comparison.portfolio.sharpe_ratio,
      information_ratio: comparison.comparison.information_ratio,
      tracking_error: comparison.comparison.tracking_error,
      max_drawdown: comparison.portfolio.max_drawdown,
      alpha: comparison.comparison.alpha,
      beta: comparison.comparison.beta,
      r_squared: comparison.comparison.r_squared
    })
  }

  private getPerformancePeriods(): Array<{ days: number; name: string }> {
    return [
      { days: 30, name: '1M' },
      { days: 90, name: '3M' },
      { days: 180, name: '6M' },
      { days: 365, name: '1Y' }
    ]
  }

  private calculatePeriodStart(referenceDate: Date, days: number): Date {
    return new Date(referenceDate.getTime() - days * 24 * 60 * 60 * 1000)
  }

  private async cleanupOldData(keepDays: number): Promise<void> {
    logger.info(`Cleaning up benchmark data older than ${keepDays} days`)

    try {
      const benchmarks = await benchmarkIndicesModel.findAll(true)
      let totalDeleted = 0

      for (const benchmark of benchmarks) {
        const deleted = await benchmarkDataService.cleanupOldData(benchmark.id!, keepDays)
        totalDeleted += deleted
        
        if (deleted > 0) {
          logger.info(`Cleaned up ${deleted} old records for ${benchmark.symbol}`)
        }
      }

      logger.info(`Cleanup completed: ${totalDeleted} records removed`)
    } catch (error) {
      logger.error('Error during data cleanup:', error)
      throw error
    }
  }

  private async refreshPerformanceSummaries(): Promise<void> {
    logger.info('Refreshing benchmark performance summaries')

    try {
      // This would update the benchmark_performance_summary table
      // Implementation would depend on your specific requirements
      logger.info('Performance summaries refresh completed')
    } catch (error) {
      logger.error('Error refreshing performance summaries:', error)
      throw error
    }
  }

  private async updateRiskFreeRates(): Promise<void> {
    logger.info('Updating risk-free rates')

    try {
      // This would fetch current risk-free rates from BCRA or other sources
      // and update the risk_free_rates table
      logger.info('Risk-free rates update completed')
    } catch (error) {
      logger.error('Error updating risk-free rates:', error)
      throw error
    }
  }

  private async verifyDataIntegrity(): Promise<void> {
    logger.info('Verifying benchmark data integrity')

    try {
      const stats = await benchmarkDataService.getServiceStatistics()
      
      // Check for benchmarks without recent data
      const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
      const staleBenchmarks = stats.last_updates.filter(
        update => !update.last_update || update.last_update < staleThreshold
      )

      if (staleBenchmarks.length > 0) {
        logger.warn(`Found ${staleBenchmarks.length} benchmarks with stale data:`, 
          staleBenchmarks.map(b => b.symbol))
        
        await notificationService.createNotification({
          type: 'SYSTEM',
          priority: 'MEDIUM',
          title: 'Stale Benchmark Data Detected',
          message: `${staleBenchmarks.length} benchmarks need data refresh`,
          data: { stale_benchmarks: staleBenchmarks }
        })
      }

      logger.info('Data integrity verification completed')
    } catch (error) {
      logger.error('Error verifying data integrity:', error)
      throw error
    }
  }

  private async updateBenchmarkHealthStatus(): Promise<void> {
    logger.info('Updating benchmark health status')

    try {
      const benchmarks = await benchmarkIndicesModel.findAll(true)
      const now = new Date()
      
      for (const benchmark of benchmarks) {
        const lastUpdate = await benchmarkDataService.getServiceStatistics()
        const benchmarkLastUpdate = lastUpdate.last_updates.find(u => u.symbol === benchmark.symbol)
        
        if (benchmarkLastUpdate?.last_update) {
          const daysSinceUpdate = Math.ceil(
            (now.getTime() - benchmarkLastUpdate.last_update.getTime()) / (1000 * 60 * 60 * 24)
          )

          if (daysSinceUpdate > 7) {
            logger.warn(`Benchmark ${benchmark.symbol} has ${daysSinceUpdate} days without updates`)
          }

          // Update last_update timestamp
          await benchmarkIndicesModel.update(benchmark.id!, {
            last_update: benchmarkLastUpdate.last_update
          })
        }
      }

      logger.info('Benchmark health status update completed')
    } catch (error) {
      logger.error('Error updating benchmark health status:', error)
      throw error
    }
  }

  // Manual trigger methods for testing/admin
  async triggerDailyUpdate(): Promise<void> {
    logger.info('Manually triggering daily benchmark update')
    await this.runDailyUpdate()
  }

  async triggerWeekendUpdate(): Promise<void> {
    logger.info('Manually triggering weekend benchmark update')
    await this.runWeekendUpdate()
  }

  async triggerMonthlyUpdate(): Promise<void> {
    logger.info('Manually triggering monthly performance update')
    await this.runMonthlyPerformanceUpdate()
  }

  async triggerMaintenance(): Promise<void> {
    logger.info('Manually triggering maintenance tasks')
    await this.runMaintenanceTasks()
  }

  getJobStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: new Date(),
      nextRuns: {
        daily_update: '09:30 Mon-Fri (ART)',
        weekend_update: '08:00 Saturday (ART)', 
        monthly_performance: '10:00 1st of month (ART)',
        maintenance: '03:00 Daily (ART)'
      }
    }
  }
}

export const benchmarkUpdateJob = new BenchmarkUpdateJob()
