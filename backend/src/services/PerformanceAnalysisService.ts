import { benchmarkDataModel } from '../models/BenchmarkData.js'
import DatabaseConnection from '../database/connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('PerformanceAnalysisService')

export interface PerformanceMetrics {
  calculation_date: Date
  benchmark_id?: number
  period_days: number
  portfolio_return: number
  benchmark_return?: number
  excess_return?: number
  portfolio_volatility: number
  benchmark_volatility?: number
  sharpe_ratio?: number
  information_ratio?: number
  tracking_error?: number
  max_drawdown?: number
  calmar_ratio?: number
  sortino_ratio?: number
  alpha?: number
  beta?: number
  r_squared?: number
  var_95?: number
  var_99?: number
}

export interface RiskMetrics {
  var_95: number // Value at Risk 95%
  var_99: number // Value at Risk 99%
  expected_shortfall_95: number
  expected_shortfall_99: number
  max_drawdown: number
  max_drawdown_duration: number
  volatility: number
  downside_deviation: number
  skewness: number
  kurtosis: number
}

export interface ComparisonResult {
  portfolio: {
    total_return: number
    annualized_return: number
    volatility: number
    sharpe_ratio: number
    max_drawdown: number
  }
  benchmark: {
    symbol: string
    name: string
    total_return: number
    annualized_return: number
    volatility: number
    sharpe_ratio: number
    max_drawdown: number
  }
  comparison: {
    excess_return: number
    tracking_error: number
    information_ratio: number
    beta: number
    alpha: number
    r_squared: number
    correlation: number
  }
  period: {
    start_date: Date
    end_date: Date
    days: number
  }
}

export interface RiskFreeRate {
  date: Date
  annual_rate: number
  daily_rate: number
}

export class PerformanceAnalysisService {
  private db = DatabaseConnection.getInstance()

  async calculatePortfolioMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics> {
    try {
      // Get portfolio daily returns
      const portfolioReturns = await this.getPortfolioDailyReturns(startDate, endDate)
      
      if (portfolioReturns.length === 0) {
        throw new Error('No portfolio data available for the specified period')
      }

      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calculate basic portfolio metrics
      const dailyReturns = portfolioReturns.map(entry => entry.return)
      const totalReturn = this.calculateTotalReturn(dailyReturns)
      const annualizedReturn = this.annualizeReturn(totalReturn, days)
      const volatility = this.calculateVolatility(dailyReturns)
      const maxDrawdown = this.calculateMaxDrawdown(dailyReturns)
      const downsideDeviation = this.calculateDownsideDeviation(dailyReturns)
      
      // Get risk-free rate for Sharpe ratio calculation
      const riskFreeRate = await this.getRiskFreeRate(endDate)
      const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility, riskFreeRate.annual_rate)
      const sortinoRatio = this.calculateSortinoRatio(annualizedReturn, downsideDeviation, riskFreeRate.annual_rate)
      const calmarRatio = maxDrawdown !== 0 ? annualizedReturn / Math.abs(maxDrawdown) : 0
      
      // Calculate VaR
      const var95 = this.calculateVaR(dailyReturns, 0.05)
      const var99 = this.calculateVaR(dailyReturns, 0.01)

      return {
        calculation_date: new Date(),
        period_days: days,
        portfolio_return: totalReturn,
        portfolio_volatility: volatility,
        sharpe_ratio: sharpeRatio,
        tracking_error: 0, // Will be calculated when comparing to benchmark
        max_drawdown: maxDrawdown,
        calmar_ratio: calmarRatio,
        sortino_ratio: sortinoRatio,
        var_95: var95,
        var_99: var99
      }
    } catch (error) {
      logger.error('Error calculating portfolio metrics:', error)
      throw new Error('Failed to calculate portfolio metrics')
    }
  }

  async compareWithBenchmark(
    benchmarkId: number,
    startDate: Date,
    endDate: Date
  ): Promise<ComparisonResult> {
    try {
      const { days, portfolioSeries, benchmarkSeries } = await this.loadPairedReturnSeries(benchmarkId, startDate, endDate)
      const riskFreeRate = await this.getRiskFreeRate(endDate)
      const portfolioStats = this.buildReturnStats(portfolioSeries, riskFreeRate, days)
      const benchmarkStats = this.buildReturnStats(benchmarkSeries, riskFreeRate, days)
      const comparison = this.buildComparisonMetrics(
        portfolioStats,
        benchmarkStats,
        { portfolio: portfolioSeries, benchmark: benchmarkSeries },
        riskFreeRate
      )
      const benchmarkInfo = this.getBenchmarkMetadata(benchmarkId)

      return {
        portfolio: {
          total_return: portfolioStats.totalReturn,
          annualized_return: portfolioStats.annualizedReturn,
          volatility: portfolioStats.volatility,
          sharpe_ratio: portfolioStats.sharpeRatio,
          max_drawdown: portfolioStats.maxDrawdown
        },
        benchmark: {
          symbol: benchmarkInfo.symbol,
          name: benchmarkInfo.name,
          total_return: benchmarkStats.totalReturn,
          annualized_return: benchmarkStats.annualizedReturn,
          volatility: benchmarkStats.volatility,
          sharpe_ratio: benchmarkStats.sharpeRatio,
          max_drawdown: benchmarkStats.maxDrawdown
        },
        comparison,
        period: {
          start_date: startDate,
          end_date: endDate,
          days
        }
      }
    } catch (error) {
      logger.error('Error comparing with benchmark:', error)
      throw new Error('Failed to compare with benchmark')
    }
  }

  private async loadPairedReturnSeries(
    benchmarkId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{ days: number; portfolioSeries: number[]; benchmarkSeries: number[] }> {
    const portfolioReturns = await this.getPortfolioDailyReturns(startDate, endDate)
    const benchmarkReturns = await this.getBenchmarkDailyReturns(benchmarkId, startDate, endDate)

    if (portfolioReturns.length === 0 || benchmarkReturns.length === 0) {
      throw new Error('Insufficient data for comparison')
    }

    const alignedData = this.alignReturns(portfolioReturns, benchmarkReturns)
    const pairedReturns = alignedData.portfolio.flatMap((point, index) => {
      const benchmarkPoint = alignedData.benchmark[index]
      if (!benchmarkPoint) {
        return []
      }

      return [{
        portfolio: point.return,
        benchmark: benchmarkPoint.return
      }]
    })

    if (pairedReturns.length < 30) {
      throw new Error('Insufficient aligned data for reliable comparison (minimum 30 days required)')
    }

    return {
      days: pairedReturns.length,
      portfolioSeries: pairedReturns.map(item => item.portfolio),
      benchmarkSeries: pairedReturns.map(item => item.benchmark)
    }
  }

  private buildReturnStats(series: number[], riskFreeRate: RiskFreeRate, days: number) {
    const totalReturn = this.calculateTotalReturn(series)
    const annualizedReturn = this.annualizeReturn(totalReturn, days)
    const volatility = this.calculateVolatility(series)
    const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility, riskFreeRate.annual_rate)
    const maxDrawdown = this.calculateMaxDrawdown(series)

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown
    }
  }

  private buildComparisonMetrics(
    portfolioStats: { totalReturn: number; annualizedReturn: number; volatility: number; sharpeRatio: number; maxDrawdown: number },
    benchmarkStats: { totalReturn: number; annualizedReturn: number; volatility: number; sharpeRatio: number; maxDrawdown: number },
    series: { portfolio: number[]; benchmark: number[] },
    riskFreeRate: RiskFreeRate
  ) {
    const excessReturns = series.portfolio.map((value, index) => value - (series.benchmark[index] ?? 0))
    const excessReturn = portfolioStats.annualizedReturn - benchmarkStats.annualizedReturn
    const trackingError = this.calculateVolatility(excessReturns)
    const informationRatio = trackingError !== 0 ? excessReturn / trackingError : 0
    const beta = this.calculateBeta(series.portfolio, series.benchmark)
    const alpha = portfolioStats.annualizedReturn - (riskFreeRate.annual_rate + beta * (benchmarkStats.annualizedReturn - riskFreeRate.annual_rate))
    const correlation = this.calculateCorrelation(series.portfolio, series.benchmark)

    return {
      excess_return: excessReturn,
      tracking_error: trackingError,
      information_ratio: informationRatio,
      beta,
      alpha,
      r_squared: Math.pow(correlation, 2),
      correlation
    }
  }

  private getBenchmarkMetadata(benchmarkId: number): { symbol: string; name: string } {
    const benchmarkStmt = this.db.prepare('SELECT symbol, name FROM benchmark_indices WHERE id = ?')
    const benchmarkInfo = benchmarkStmt.get(benchmarkId) as { symbol: string; name: string } | undefined

    if (!benchmarkInfo) {
      throw new Error(`Benchmark with id ${benchmarkId} not found`)
    }

    return benchmarkInfo
  }

  async calculateRiskMetrics(returns: number[]): Promise<RiskMetrics> {
    if (returns.length === 0) {
      throw new Error('No returns data provided')
    }

    const var95 = this.calculateVaR(returns, 0.05)
    const var99 = this.calculateVaR(returns, 0.01)
    const es95 = this.calculateExpectedShortfall(returns, 0.05)
    const es99 = this.calculateExpectedShortfall(returns, 0.01)
    const maxDrawdown = this.calculateMaxDrawdown(returns)
    const maxDDDuration = this.calculateMaxDrawdownDuration(returns)
    const volatility = this.calculateVolatility(returns)
    const downsideDeviation = this.calculateDownsideDeviation(returns)
    const skewness = this.calculateSkewness(returns)
    const kurtosis = this.calculateKurtosis(returns)

    return {
      var_95: var95,
      var_99: var99,
      expected_shortfall_95: es95,
      expected_shortfall_99: es99,
      max_drawdown: maxDrawdown,
      max_drawdown_duration: maxDDDuration,
      volatility: volatility,
      downside_deviation: downsideDeviation,
      skewness: skewness,
      kurtosis: kurtosis
    }
  }

  async savePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO performance_metrics (
          calculation_date, benchmark_id, period_days, portfolio_return, benchmark_return,
          excess_return, portfolio_volatility, benchmark_volatility, sharpe_ratio,
          information_ratio, tracking_error, max_drawdown, calmar_ratio, sortino_ratio,
          alpha, beta, r_squared, var_95, var_99
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const params = this.serializePerformanceMetrics(metrics)
      stmt.run(...params)
    } catch (error) {
      logger.error('Error saving performance metrics:', error)
      throw new Error('Failed to save performance metrics')
    }
  }

  // Private helper methods

  private serializePerformanceMetrics(metrics: PerformanceMetrics) {
    return [
      metrics.calculation_date.toISOString().split('T')[0],
      this.toNullable(metrics.benchmark_id),
      metrics.period_days,
      metrics.portfolio_return,
      this.toNullable(metrics.benchmark_return),
      this.toNullable(metrics.excess_return),
      metrics.portfolio_volatility,
      this.toNullable(metrics.benchmark_volatility),
      this.toNullable(metrics.sharpe_ratio),
      this.toNullable(metrics.information_ratio),
      this.toNullable(metrics.tracking_error),
      this.toNullable(metrics.max_drawdown),
      this.toNullable(metrics.calmar_ratio),
      this.toNullable(metrics.sortino_ratio),
      this.toNullable(metrics.alpha),
      this.toNullable(metrics.beta),
      this.toNullable(metrics.r_squared),
      this.toNullable(metrics.var_95),
      this.toNullable(metrics.var_99)
    ] as const
  }

  private toNullable<T>(value: T | null | undefined): T | null {
    return value ?? null
  }

  private async getPortfolioDailyReturns(startDate: Date, endDate: Date): Promise<Array<{ date: Date; return: number; value: number }>> {
    try {
      // This would need to integrate with your actual portfolio service
      // For now, returning mock data - you'll need to implement this based on your portfolio structure
      
      logger.warn('Portfolio historical values service not available; using mock returns for performance analysis')
      return this.generateMockReturns(startDate, endDate)
    } catch (error) {
      logger.error('Error getting portfolio daily returns:', error)
      return this.generateMockReturns(startDate, endDate)
    }
  }

  private async getBenchmarkDailyReturns(benchmarkId: number, startDate: Date, endDate: Date): Promise<Array<{ date: Date; return: number }>> {
    const benchmarkData = await benchmarkDataModel.findByBenchmarkIdRange(benchmarkId, startDate, endDate)
    const returns: Array<{ date: Date; return: number }> = []
    
    for (let i = 1; i < benchmarkData.length; i++) {
      const previous = benchmarkData[i - 1]
      const current = benchmarkData[i]

      if (!previous || !current || previous.close_price === undefined || current.close_price === undefined) {
        continue
      }

      const dailyReturn = ((current.close_price - previous.close_price) / previous.close_price) * 100
      const date = current.date ?? previous.date

      if (!date) {
        continue
      }

      returns.push({
        date,
        return: dailyReturn
      })
    }
    
    return returns
  }

  private alignReturns(
    portfolioReturns: Array<{ date: Date; return: number; value: number }>,
    benchmarkReturns: Array<{ date: Date; return: number }>
  ): {
    portfolio: Array<{ date: Date; return: number; value: number }>
    benchmark: Array<{ date: Date; return: number }>
  } {
    const aligned = {
      portfolio: [] as Array<{ date: Date; return: number; value: number }>,
      benchmark: [] as Array<{ date: Date; return: number }>
    }

    const benchmarkMap = this.buildBenchmarkReturnMap(benchmarkReturns)

    for (const pr of portfolioReturns) {
      const dateKey = pr.date?.toISOString().split('T')[0]
      if (!dateKey) {
        continue
      }

      const benchmarkReturn = benchmarkMap.get(dateKey)
      if (benchmarkReturn === undefined) {
        continue
      }

      aligned.portfolio.push(pr)
      aligned.benchmark.push({
        date: pr.date,
        return: benchmarkReturn
      })
    }

    return aligned
  }

  private buildBenchmarkReturnMap(benchmarkReturns: Array<{ date: Date; return: number }>): Map<string, number> {
    const benchmarkMap = new Map<string, number>()

    for (const entry of benchmarkReturns) {
      const isoDate = entry.date?.toISOString().split('T')[0]
      if (!isoDate) {
        continue
      }

      benchmarkMap.set(isoDate, entry.return)
    }

    return benchmarkMap
  }

  private calculateTotalReturn(returns: number[]): number {
    return returns.reduce((total, ret) => total * (1 + ret / 100), 1) - 1
  }

  private annualizeReturn(totalReturn: number, days: number): number {
    return (Math.pow(1 + totalReturn, 365 / days) - 1) * 100
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (returns.length - 1)
    return Math.sqrt(variance * 252) // Annualized
  }

  private calculateDownsideDeviation(returns: number[], targetReturn: number = 0): number {
    const negativeReturns = returns.filter(ret => ret < targetReturn).map(ret => ret - targetReturn)
    if (negativeReturns.length === 0) return 0
    
    const variance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
    return Math.sqrt(variance * 252)
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let peak = 1
    let maxDrawdown = 0
    let cumulative = 1

    for (const ret of returns) {
      cumulative *= (1 + ret / 100)
      
      if (cumulative > peak) {
        peak = cumulative
      }
      
      const drawdown = (peak - cumulative) / peak
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    return maxDrawdown * 100
  }

  private calculateMaxDrawdownDuration(returns: number[]): number {
    let peak = 1
    let cumulative = 1
    let maxDuration = 0
    let currentDuration = 0

    for (const ret of returns) {
      cumulative *= (1 + ret / 100)
      
      if (cumulative > peak) {
        peak = cumulative
        if (currentDuration > maxDuration) {
          maxDuration = currentDuration
        }
        currentDuration = 0
      } else {
        currentDuration++
      }
    }

    if (currentDuration > maxDuration) {
      maxDuration = currentDuration
    }

    return maxDuration
  }

  private calculateSharpeRatio(annualizedReturn: number, volatility: number, riskFreeRate: number): number {
    return volatility !== 0 ? (annualizedReturn - riskFreeRate) / volatility : 0
  }

  private calculateSortinoRatio(annualizedReturn: number, downsideDeviation: number, riskFreeRate: number): number {
    return downsideDeviation !== 0 ? (annualizedReturn - riskFreeRate) / downsideDeviation : 0
  }

  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) return 1
    
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length
    
    let covariance = 0
    let benchmarkVariance = 0
    let pairCount = 0

    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioValue = portfolioReturns[i]
      const benchmarkValue = benchmarkReturns[i]

      if (portfolioValue === undefined || benchmarkValue === undefined) {
        continue
      }

      const portfolioDeviation = portfolioValue - portfolioMean
      const benchmarkDeviation = benchmarkValue - benchmarkMean

      covariance += portfolioDeviation * benchmarkDeviation
      benchmarkVariance += benchmarkDeviation * benchmarkDeviation
      pairCount += 1
    }

    if (pairCount < 2) {
      return 1
    }

    covariance /= (pairCount - 1)
    benchmarkVariance /= (pairCount - 1)

    return benchmarkVariance !== 0 ? covariance / benchmarkVariance : 1
  }

  private calculateCorrelation(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) return 0
    
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length
    
    let covariance = 0
    let portfolioVariance = 0
    let benchmarkVariance = 0
    let pairCount = 0
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioValue = portfolioReturns[i]
      const benchmarkValue = benchmarkReturns[i]

      if (portfolioValue === undefined || benchmarkValue === undefined) {
        continue
      }

      const portfolioDeviation = portfolioValue - portfolioMean
      const benchmarkDeviation = benchmarkValue - benchmarkMean

      covariance += portfolioDeviation * benchmarkDeviation
      portfolioVariance += portfolioDeviation * portfolioDeviation
      benchmarkVariance += benchmarkDeviation * benchmarkDeviation
      pairCount += 1
    }

    if (pairCount < 2) {
      return 0
    }

    const portfolioStdDev = Math.sqrt(portfolioVariance / (pairCount - 1))
    const benchmarkStdDev = Math.sqrt(benchmarkVariance / (pairCount - 1))

    return (portfolioStdDev !== 0 && benchmarkStdDev !== 0)
      ? (covariance / (pairCount - 1)) / (portfolioStdDev * benchmarkStdDev)
      : 0
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor(confidence * sortedReturns.length)
    return sortedReturns[index] || 0
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    const sortedReturns = [...returns].sort((a, b) => a - b)
    const index = Math.floor(confidence * sortedReturns.length)
    const tailReturns = sortedReturns.slice(0, index + 1)
    return tailReturns.length > 0 ? tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length : 0
  }

  private calculateSkewness(returns: number[]): number {
    if (returns.length < 3) return 0
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    
    if (stdDev === 0) return 0
    
    const skewness = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 3), 0) / returns.length
    return skewness
  }

  private calculateKurtosis(returns: number[]): number {
    if (returns.length < 4) return 0
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    
    if (stdDev === 0) return 0
    
    const kurtosis = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / stdDev, 4), 0) / returns.length
    return kurtosis - 3 // Excess kurtosis
  }

  private async getRiskFreeRate(date: Date): Promise<RiskFreeRate> {
    try {
      const stmt = this.db.prepare(`
        SELECT annual_rate, daily_rate FROM risk_free_rates 
        WHERE date <= ? AND country = 'AR'
        ORDER BY date DESC 
        LIMIT 1
      `)
      
      const result = stmt.get(date.toISOString().split('T')[0]) as any
      
      if (result) {
        return {
          date: date,
          annual_rate: result.annual_rate,
          daily_rate: result.daily_rate
        }
      }
      
      // Default to Argentina's current high rate if no data
      return {
        date: date,
        annual_rate: 85.00,
        daily_rate: 0.2329
      }
    } catch (error) {
      logger.error('Error getting risk-free rate:', error)
      return {
        date: date,
        annual_rate: 85.00,
        daily_rate: 0.2329
      }
    }
  }

  private generateMockReturns(startDate: Date, endDate: Date): Array<{ date: Date; return: number; value: number }> {
    const returns: Array<{ date: Date; return: number; value: number }> = []
    const current = new Date(startDate)
    let value = 100000 // Starting portfolio value
    
    while (current <= endDate) {
      const dailyReturn = (Math.random() - 0.48) * 2 // Slightly positive bias
      value *= (1 + dailyReturn / 100)
      
      returns.push({
        date: new Date(current),
        return: dailyReturn,
        value: value
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    return returns
  }
}

export const performanceAnalysisService = new PerformanceAnalysisService()
