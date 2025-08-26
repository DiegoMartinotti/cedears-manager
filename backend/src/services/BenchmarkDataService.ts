import axios from 'axios'
import { benchmarkIndicesModel, BenchmarkIndex } from '../models/BenchmarkIndices.js'
import { benchmarkDataModel, BenchmarkDataRecord } from '../models/BenchmarkData.js'
import { QuoteService } from './QuoteService.js'
import { rateLimitService } from './rateLimitService.js'
import logger from '../utils/logger.js'

export interface YahooFinanceQuote {
  symbol: string
  regularMarketPrice: number
  regularMarketPreviousClose: number
  regularMarketOpen: number
  regularMarketDayHigh: number
  regularMarketDayLow: number
  regularMarketVolume: number
  regularMarketTime: number
}

export interface YahooHistoricalData {
  date: Date
  open: number
  high: number
  low: number
  close: number
  adjClose: number
  volume: number
}

export interface BenchmarkUpdateResult {
  benchmark_id: number
  symbol: string
  records_updated: number
  last_update_date: Date
  success: boolean
  error?: string
}

export class BenchmarkDataService {
  private quoteService: QuoteService
  private readonly yahooBaseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart'
  private readonly yahooHistoryUrl = 'https://query1.finance.yahoo.com/v7/finance/download'
  
  constructor() {
    this.quoteService = new QuoteService()
  }

  async updateAllBenchmarks(): Promise<BenchmarkUpdateResult[]> {
    try {
      const benchmarks = await benchmarkIndicesModel.findAll(true)
      const results: BenchmarkUpdateResult[] = []
      
      logger.info(`Starting update for ${benchmarks.length} benchmarks`)
      
      for (const benchmark of benchmarks) {
        try {
          const result = await this.updateBenchmarkData(benchmark)
          results.push(result)
          
          // Rate limiting to avoid hitting API limits
          await this.delay(100)
        } catch (error) {
          logger.error(`Failed to update benchmark ${benchmark.symbol}:`, error)
          results.push({
            benchmark_id: benchmark.id!,
            symbol: benchmark.symbol,
            records_updated: 0,
            last_update_date: new Date(),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      logger.info(`Completed benchmark updates: ${results.filter(r => r.success).length}/${results.length} successful`)
      return results
    } catch (error) {
      logger.error('Error updating all benchmarks:', error)
      throw new Error('Failed to update all benchmarks')
    }
  }

  async updateBenchmarkData(benchmark: BenchmarkIndex): Promise<BenchmarkUpdateResult> {
    try {
      // Check rate limiting
      const rateLimitKey = `benchmark_update_${benchmark.symbol}`
      if (!await rateLimitService.checkRateLimit(rateLimitKey, 60, 1)) { // 1 per minute per symbol
        throw new Error('Rate limit exceeded')
      }

      const lastUpdateDate = await benchmarkDataModel.getLastUpdateDate(benchmark.id!)
      const startDate = lastUpdateDate 
        ? new Date(lastUpdateDate.getTime() + 24 * 60 * 60 * 1000) // Next day after last update
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago if no data
      
      const endDate = new Date()
      
      // Skip if already up to date
      if (lastUpdateDate && startDate > endDate) {
        return {
          benchmark_id: benchmark.id!,
          symbol: benchmark.symbol,
          records_updated: 0,
          last_update_date: lastUpdateDate,
          success: true
        }
      }

      let historicalData: YahooHistoricalData[]
      
      // Use different data sources based on the benchmark
      if (benchmark.data_source === 'yahoo') {
        historicalData = await this.fetchYahooHistoricalData(benchmark.symbol, startDate, endDate)
      } else {
        throw new Error(`Unsupported data source: ${benchmark.data_source}`)
      }

      if (historicalData.length === 0) {
        return {
          benchmark_id: benchmark.id!,
          symbol: benchmark.symbol,
          records_updated: 0,
          last_update_date: lastUpdateDate || new Date(),
          success: true
        }
      }

      // Convert to benchmark data format
      const benchmarkDataList: Omit<BenchmarkDataRecord, 'id' | 'created_at'>[] = historicalData.map(data => ({
        benchmark_id: benchmark.id!,
        date: data.date,
        open_price: data.open,
        high_price: data.high,
        low_price: data.low,
        close_price: data.close,
        volume: data.volume,
        adjusted_close: data.adjClose,
        dividend_amount: 0.00, // TODO: Fetch dividend data separately
        split_coefficient: 1.0000 // TODO: Handle stock splits
      }))

      // Batch insert the data
      const recordsUpdated = await benchmarkDataModel.createBatch(benchmarkDataList)
      
      // Update the benchmark's last_update timestamp
      await benchmarkIndicesModel.update(benchmark.id!, {
        last_update: endDate
      })

      await rateLimitService.logRequest(rateLimitKey)

      return {
        benchmark_id: benchmark.id!,
        symbol: benchmark.symbol,
        records_updated: recordsUpdated,
        last_update_date: endDate,
        success: true
      }
    } catch (error) {
      logger.error(`Error updating benchmark data for ${benchmark.symbol}:`, error)
      throw error
    }
  }

  async fetchYahooHistoricalData(
    symbol: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<YahooHistoricalData[]> {
    try {
      const period1 = Math.floor(startDate.getTime() / 1000)
      const period2 = Math.floor(endDate.getTime() / 1000)
      
      const url = `${this.yahooBaseUrl}/${symbol}?period1=${period1}&period2=${period2}&interval=1d&includeAdjustedClose=true`
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const result = response.data.chart.result[0]
      if (!result || !result.timestamp) {
        logger.warn(`No data returned for ${symbol}`)
        return []
      }

      const timestamps = result.timestamp
      const quotes = result.indicators.quote[0]
      const adjClose = result.indicators.adjclose[0].adjclose

      const historicalData: YahooHistoricalData[] = []

      for (let i = 0; i < timestamps.length; i++) {
        // Skip if any required data is null
        if (!quotes.close[i] || quotes.close[i] === null) continue
        
        historicalData.push({
          date: new Date(timestamps[i] * 1000),
          open: quotes.open[i] || quotes.close[i],
          high: quotes.high[i] || quotes.close[i],
          low: quotes.low[i] || quotes.close[i],
          close: quotes.close[i],
          adjClose: adjClose[i] || quotes.close[i],
          volume: quotes.volume[i] || 0
        })
      }

      logger.info(`Fetched ${historicalData.length} records for ${symbol}`)
      return historicalData
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Yahoo Finance API error for ${symbol}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message
        })
      } else {
        logger.error(`Error fetching Yahoo historical data for ${symbol}:`, error)
      }
      throw new Error(`Failed to fetch historical data for ${symbol}`)
    }
  }

  async fetchCurrentQuote(symbol: string): Promise<YahooFinanceQuote | null> {
    try {
      const rateLimitKey = `benchmark_quote_${symbol}`
      if (!await rateLimitService.checkRateLimit(rateLimitKey, 60, 5)) { // 5 per minute per symbol
        throw new Error('Rate limit exceeded for quotes')
      }

      const url = `${this.yahooBaseUrl}/${symbol}?interval=1d&range=1d`
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const result = response.data.chart.result[0]
      if (!result) return null

      const meta = result.meta
      const lastQuote = result.indicators.quote[0]
      const lastIndex = lastQuote.close.length - 1

      await rateLimitService.logRequest(rateLimitKey)

      return {
        symbol: meta.symbol,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketPreviousClose: meta.previousClose,
        regularMarketOpen: lastQuote.open[lastIndex] || meta.regularMarketPrice,
        regularMarketDayHigh: meta.regularMarketDayHigh,
        regularMarketDayLow: meta.regularMarketDayLow,
        regularMarketVolume: meta.regularMarketVolume,
        regularMarketTime: meta.regularMarketTime
      }
    } catch (error) {
      logger.error(`Error fetching current quote for ${symbol}:`, error)
      return null
    }
  }

  async getBenchmarkDataRange(
    benchmarkId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<BenchmarkDataRecord[]> {
    return await benchmarkDataModel.findByBenchmarkIdRange(benchmarkId, startDate, endDate)
  }

  async getLatestBenchmarkData(benchmarkId: number, limit: number = 1): Promise<BenchmarkDataRecord[]> {
    return await benchmarkDataModel.findLatestByBenchmarkId(benchmarkId, limit)
  }

  async calculateBenchmarkReturns(benchmarkId: number, startDate: Date, endDate: Date) {
    return await benchmarkDataModel.calculateReturns(benchmarkId, startDate, endDate)
  }

  async cleanupOldData(benchmarkId: number, keepDays: number = 730): Promise<number> {
    const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000)
    return await benchmarkDataModel.deleteOldData(benchmarkId, cutoffDate)
  }

  async getServiceStatistics(): Promise<{
    benchmarks: any
    data: any
    last_updates: Array<{ symbol: string; last_update: Date | null }>
  }> {
    const benchmarkStats = await benchmarkIndicesModel.getStatistics()
    const dataStats = await benchmarkDataModel.getStatistics()
    
    const benchmarks = await benchmarkIndicesModel.findAll(true)
    const lastUpdates = []
    
    for (const benchmark of benchmarks) {
      const lastUpdate = await benchmarkDataModel.getLastUpdateDate(benchmark.id!)
      lastUpdates.push({
        symbol: benchmark.symbol,
        last_update: lastUpdate
      })
    }

    return {
      benchmarks: benchmarkStats,
      data: dataStats,
      last_updates: lastUpdates
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const benchmarkDataService = new BenchmarkDataService()