import { simpleTechnicalIndicatorModel, TechnicalIndicatorData } from '../models/SimpleTechnicalIndicator'
import { quoteModel } from '../models/Quote'
import { SimpleInstrument } from '../models/SimpleInstrument'
import { logger } from '../utils/logger'

/* eslint-disable max-lines-per-function */

type TradeSignal = 'BUY' | 'SELL' | 'HOLD'

export interface PriceData {
  date: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CalculatedIndicators {
  symbol: string
  rsi: {
    value: number
    signal: TradeSignal
    strength: number
  }
  sma: {
    sma20: number
    sma50: number
    sma200: number
    signal: TradeSignal
    strength: number
  }
  ema: {
    ema12: number
    ema26: number
    signal: TradeSignal
    strength: number
  }
  macd: {
    line: number
    signal: number
    histogram: number
    signalType: TradeSignal
    strength: number
  }
  extremes: {
    yearHigh: number
    yearLow: number
    current: number
    distanceFromHigh: number
    distanceFromLow: number
    signal: TradeSignal
    strength: number
  }
}

export class TechnicalAnalysisService {
  
  /**
   * Calcula todos los indicadores técnicos para un símbolo
   */
  async calculateIndicators(symbol: string, days: number = 200): Promise<CalculatedIndicators | null> {
    try {
      const prices = await this.getPriceData(symbol, days)
      if (prices.length === 0) {
        logger.warn(`No price data available for ${symbol}`)
        return null
      }

      if (prices.length < 26) {
        logger.warn(`Insufficient price data for ${symbol}: ${prices.length} days`)
        return null
      }

      const current = prices.at(-1)
      if (!current) {
        logger.warn(`Unable to determine current price for ${symbol}`)
        return null
      }
      
      // Calcular indicadores
      const rsi = this.calculateRSI(prices)
      const smas = this.calculateSMA(prices)
      const emas = this.calculateEMA(prices)
      const macd = this.calculateMACD(prices)
      const extremes = await this.calculateExtremes(symbol, prices, current.close)

      return {
        symbol,
        rsi: {
          value: rsi.value,
          signal: rsi.signal,
          strength: rsi.strength
        },
        sma: {
          sma20: smas.sma20,
          sma50: smas.sma50,
          sma200: smas.sma200,
          signal: smas.signal,
          strength: smas.strength
        },
        ema: {
          ema12: emas.ema12,
          ema26: emas.ema26,
          signal: emas.signal,
          strength: emas.strength
        },
        macd: {
          line: macd.line,
          signal: macd.signal,
          histogram: macd.histogram,
          signalType: macd.signalType,
          strength: macd.strength
        },
        extremes: {
          yearHigh: extremes.yearHigh,
          yearLow: extremes.yearLow,
          current: extremes.current,
          distanceFromHigh: extremes.distanceFromHigh,
          distanceFromLow: extremes.distanceFromLow,
          signal: extremes.signal,
          strength: extremes.strength
        }
      }
    } catch (error) {
      logger.error(`Error calculating indicators for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Calcula RSI (Relative Strength Index) con período de 14 días
   */
  private calculateRSI(prices: PriceData[], period: number = 14): {
    value: number
    signal: TradeSignal
    strength: number
  } {
    if (prices.length < period + 1) {
      return { value: 50, signal: 'HOLD', strength: 0 }
    }

    const changes = this.buildPriceChanges(prices)
    const { avgGain: initialAvgGain, avgLoss: initialAvgLoss } = this.computeInitialRsiAverages(changes, period)
    const { avgGain, avgLoss } = this.smoothRsiAverages(changes, period, initialAvgGain, initialAvgLoss)

    const safeAvgLoss = avgLoss === 0 ? 1e-9 : avgLoss
    const rs = avgGain / safeAvgLoss
    const rsi = avgLoss === 0
      ? 100
      : 100 - (100 / (1 + rs))

    const { signal, strength } = this.evaluateRsiSignal(rsi)

    return { value: rsi, signal, strength }
  }

  private buildPriceChanges(prices: PriceData[]): number[] {
    const changes: number[] = []
    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i]
      const previousPrice = prices[i - 1]
      if (!currentPrice || !previousPrice) {
        continue
      }
      changes.push(currentPrice.close - previousPrice.close)
    }
    return changes
  }

  private computeInitialRsiAverages(changes: number[], period: number): { avgGain: number; avgLoss: number } {
    let avgGain = 0
    let avgLoss = 0

    for (let i = 0; i < period; i++) {
      const delta = changes[i] ?? 0
      if (delta > 0) {
        avgGain += delta
      } else {
        avgLoss += Math.abs(delta)
      }
    }

    return {
      avgGain: avgGain / period,
      avgLoss: avgLoss / period
    }
  }

  private smoothRsiAverages(
    changes: number[],
    period: number,
    initialAvgGain: number,
    initialAvgLoss: number
  ): { avgGain: number; avgLoss: number } {
    let avgGain = initialAvgGain
    let avgLoss = initialAvgLoss
    const decayFactor = (period - 1) / period

    for (let i = period; i < changes.length; i++) {
      const change = changes[i] ?? 0
      if (change > 0) {
        avgGain = (avgGain * decayFactor) + (change / period)
        avgLoss *= decayFactor
      } else {
        avgGain *= decayFactor
        avgLoss = (avgLoss * decayFactor) + (Math.abs(change) / period)
      }
    }

    return { avgGain, avgLoss }
  }

  private evaluateRsiSignal(rsi: number): { signal: TradeSignal; strength: number } {
    if (rsi <= 30) {
      const strength = Math.max(0, Math.min(100, (30 - rsi) * 3))
      return { signal: 'BUY', strength: Math.round(strength) }
    }

    if (rsi >= 70) {
      const strength = Math.max(0, Math.min(100, (rsi - 70) * 3))
      return { signal: 'SELL', strength: Math.round(strength) }
    }

    const neutralStrength = Math.abs(50 - rsi) / 2
    return { signal: 'HOLD', strength: Math.round(neutralStrength) }
  }

  /**
   * Calcula SMA (Simple Moving Average) para 20, 50 y 200 períodos
   */
  private calculateSMA(prices: PriceData[]): {
    sma20: number
    sma50: number
    sma200: number
    signal: TradeSignal
    strength: number
  } {
    if (prices.length === 0) {
      return { sma20: 0, sma50: 0, sma200: 0, signal: 'HOLD', strength: 0 }
    }

    const sma20 = this.calculateSingleSMA(prices, 20)
    const sma50 = this.calculateSingleSMA(prices, 50)
    const sma200 = this.calculateSingleSMA(prices, 200)
    const current = prices.at(-1)?.close ?? 0

    // Generar señales basadas en cruces de medias
    let signal: TradeSignal = 'HOLD'
    let strength = 0

    // Señal alcista: precio > SMA20 > SMA50 > SMA200
    if (current > sma20 && sma20 > sma50 && sma50 > sma200) {
      signal = 'BUY'
      strength = 85
    }
    // Señal bajista: precio < SMA20 < SMA50 < SMA200
    else if (current < sma20 && sma20 < sma50 && sma50 < sma200) {
      signal = 'SELL'
      strength = 85
    }
    // Señal alcista moderada: precio > SMA20 > SMA50
    else if (current > sma20 && sma20 > sma50) {
      signal = 'BUY'
      strength = 60
    }
    // Señal bajista moderada: precio < SMA20 < SMA50
    else if (current < sma20 && sma20 < sma50) {
      signal = 'SELL'
      strength = 60
    }
    // Señal débil: solo precio vs SMA20
    else if (current > sma20) {
      signal = 'BUY'
      strength = 30
    } else if (current < sma20) {
      signal = 'SELL'
      strength = 30
    }

    return { sma20, sma50, sma200, signal, strength }
  }

  private calculateSingleSMA(prices: PriceData[], period: number): number {
    if (prices.length === 0) return 0
    if (prices.length < period) return prices[prices.length - 1]?.close ?? 0

    const sum = prices.slice(-period).reduce((acc, price) => acc + price.close, 0)
    return sum / period
  }

  /**
   * Calcula EMA (Exponential Moving Average) para 12 y 26 períodos
   */
  private calculateEMA(prices: PriceData[]): {
    ema12: number
    ema26: number
    signal: TradeSignal
    strength: number
  } {
    const ema12 = this.calculateSingleEMA(prices, 12)
    const ema26 = this.calculateSingleEMA(prices, 26)

    // Generar señales basadas en cruce de EMAs
    let signal: TradeSignal = 'HOLD'
    let strength = 0

    const spread = ((ema12 - ema26) / ema26) * 100

    if (spread > 0.5) {
      signal = 'BUY'
      strength = Math.min(100, Math.abs(spread) * 20)
    } else if (spread < -0.5) {
      signal = 'SELL'
      strength = Math.min(100, Math.abs(spread) * 20)
    } else {
      strength = Math.abs(spread) * 10
    }

    return { ema12, ema26, signal, strength: Math.round(strength) }
  }

  private calculateSingleEMA(prices: PriceData[], period: number): number {
    if (prices.length === 0) return 0
    if (prices.length < period) return prices[prices.length - 1]?.close ?? 0

    const multiplier = 2 / (period + 1)
    let ema = prices[0]?.close ?? 0

    for (let i = 1; i < prices.length; i++) {
      const price = prices[i]
      if (!price) {
        continue
      }
      ema = (price.close * multiplier) + (ema * (1 - multiplier))
    }

    return ema
  }

  /**
   * Calcula MACD (Moving Average Convergence Divergence)
   */
  private calculateMACD(prices: PriceData[]): {
    line: number
    signal: number
    histogram: number
    signalType: TradeSignal
    strength: number
  } {
    const ema12 = this.calculateSingleEMA(prices, 12)
    const ema26 = this.calculateSingleEMA(prices, 26)
    const macdLine = ema12 - ema26

    // Para la señal MACD, necesitamos EMA de 9 períodos del MACD line
    // Simplificado: usamos el valor actual como señal
    const macdSignal = macdLine * 0.9 // Aproximación

    const histogram = macdLine - macdSignal

    // Generar señales
    let signalType: TradeSignal = 'HOLD'
    let strength = 0

    if (histogram > 0 && macdLine > 0) {
      signalType = 'BUY'
      strength = Math.min(100, Math.abs(histogram) * 1000)
    } else if (histogram < 0 && macdLine < 0) {
      signalType = 'SELL'
      strength = Math.min(100, Math.abs(histogram) * 1000)
    } else {
      strength = Math.abs(histogram) * 500
    }

    return {
      line: macdLine,
      signal: macdSignal,
      histogram,
      signalType,
      strength: Math.round(strength)
    }
  }

  /**
   * Calcula extremos del año y distancias
   */
  private async calculateExtremes(symbol: string, prices: PriceData[], currentPrice: number): Promise<{
    yearHigh: number
    yearLow: number
    current: number
    distanceFromHigh: number
    distanceFromLow: number
    signal: TradeSignal
    strength: number
  }> {
    if (prices.length === 0) {
      logger.warn(`No prices available to calculate extremes for ${symbol}`)
      return {
        yearHigh: currentPrice,
        yearLow: currentPrice,
        current: currentPrice,
        distanceFromHigh: 0,
        distanceFromLow: 0,
        signal: 'HOLD',
        strength: 0
      }
    }

    const lookback = prices.slice(-365)
    const highs = lookback.map(price => price.high)
    const lows = lookback.map(price => price.low)

    const rawHigh = Math.max(...highs)
    const rawLow = Math.min(...lows)

    const yearHigh = Number.isFinite(rawHigh) ? rawHigh : currentPrice
    const yearLow = Number.isFinite(rawLow) ? rawLow : currentPrice

    const distanceFromHigh = yearHigh === 0 ? 0 : ((yearHigh - currentPrice) / yearHigh) * 100
    const distanceFromLow = yearLow === 0 ? 0 : ((currentPrice - yearLow) / yearLow) * 100

    // Generar señales basadas en proximidad a extremos
    let signal: TradeSignal = 'HOLD'
    let strength = 0

    // Cerca del mínimo anual (oportunidad de compra)
    if (distanceFromLow < 15) {
      signal = 'BUY'
      strength = Math.max(0, 100 - (distanceFromLow * 5))
    }
    // Cerca del máximo anual (oportunidad de venta)
    else if (distanceFromHigh < 5) {
      signal = 'SELL'
      strength = Math.max(0, 100 - (distanceFromHigh * 10))
    }
    // Zona neutral
    else {
      strength = Math.min(distanceFromLow, distanceFromHigh) / 2
    }

    return {
      yearHigh,
      yearLow,
      current: currentPrice,
      distanceFromHigh: Math.round(distanceFromHigh * 100) / 100,
      distanceFromLow: Math.round(distanceFromLow * 100) / 100,
      signal,
      strength: Math.round(strength)
    }
  }

  /**
   * Guarda todos los indicadores calculados en la base de datos
   */
  async saveIndicators(indicators: CalculatedIndicators): Promise<void> {
    const timestamp = new Date().toISOString()
    
    const indicatorData: Omit<TechnicalIndicatorData, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        symbol: indicators.symbol,
        indicator: 'RSI',
        period: 14,
        value: indicators.rsi.value,
        signal: indicators.rsi.signal,
        strength: indicators.rsi.strength,
        metadata: { rsiValue: indicators.rsi.value },
        timestamp
      },
      {
        symbol: indicators.symbol,
        indicator: 'SMA',
        value: indicators.sma.sma20,
        signal: indicators.sma.signal,
        strength: indicators.sma.strength,
        metadata: {
          sma20: indicators.sma.sma20,
          sma50: indicators.sma.sma50,
          sma200: indicators.sma.sma200
        },
        timestamp
      },
      {
        symbol: indicators.symbol,
        indicator: 'EMA',
        value: indicators.ema.ema12,
        signal: indicators.ema.signal,
        strength: indicators.ema.strength,
        metadata: {
          ema12: indicators.ema.ema12,
          ema26: indicators.ema.ema26
        },
        timestamp
      },
      {
        symbol: indicators.symbol,
        indicator: 'MACD',
        value: indicators.macd.line,
        signal: indicators.macd.signalType,
        strength: indicators.macd.strength,
        metadata: {
          macdLine: indicators.macd.line,
          macdSignal: indicators.macd.signal,
          macdHistogram: indicators.macd.histogram
        },
        timestamp
      }
    ]

    // Agregar indicador de extremos si hay datos válidos
    if (indicators.extremes.yearHigh > 0) {
      indicatorData.push({
        symbol: indicators.symbol,
        indicator: 'BB', // Usamos BB para representar extremos
        value: indicators.extremes.current,
        signal: indicators.extremes.signal,
        strength: indicators.extremes.strength,
        metadata: {
          yearHigh: indicators.extremes.yearHigh,
          yearLow: indicators.extremes.yearLow,
          distanceFromHigh: indicators.extremes.distanceFromHigh,
          distanceFromLow: indicators.extremes.distanceFromLow
        },
        timestamp
      })
    }

    simpleTechnicalIndicatorModel.batchUpsert(indicatorData)
    logger.info(`Saved ${indicatorData.length} technical indicators for ${indicators.symbol}`)
  }

  /**
   * Calcula indicadores para todos los instrumentos activos
   */
  async calculateAllActiveInstruments(): Promise<number> {
    try {
      const instrumentModel = new SimpleInstrument()
      const instruments = await instrumentModel.findAll({ isActive: true })
      let processedCount = 0

      for (const instrument of instruments) {
        const indicators = await this.calculateIndicators(instrument.symbol)
        if (indicators) {
          await this.saveIndicators(indicators)
          processedCount++
        }
        
        // Pequeña pausa para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      logger.info(`Technical analysis completed for ${processedCount} instruments`)
      return processedCount
    } catch (error) {
      logger.error('Error in calculateAllActiveInstruments:', error)
      throw error
    }
  }

  /**
   * Obtiene datos de precios históricos para un símbolo
   */
  private async getPriceData(symbol: string, days: number): Promise<PriceData[]> {
    const quotes = await quoteModel.search({
      symbol,
      limit: days,
      orderBy: 'date',
      orderDirection: 'DESC'
    })

    return quotes
      .map(quote => {
        const dateString = `${quote.quote_date}T${quote.quote_time ?? '00:00:00'}`
        return {
          date: new Date(dateString),
          open: quote.price,
          high: quote.high ?? quote.price,
          low: quote.low ?? quote.price,
          close: quote.close ?? quote.price,
          volume: quote.volume ?? 0
        }
      })
      .filter(price => Number.isFinite(price.open) && Number.isFinite(price.close))
      .reverse() // Orden cronológico para cálculos
  }

  /**
   * Obtiene señales activas de compra/venta
   */
  async getActiveSignals(): Promise<TechnicalIndicatorData[]> {
    return simpleTechnicalIndicatorModel.getActiveSignals(['BUY', 'SELL'])
  }

  /**
   * Obtiene los últimos indicadores para un símbolo
   */
  async getLatestIndicators(symbol: string): Promise<TechnicalIndicatorData[]> {
    return simpleTechnicalIndicatorModel.getLatestIndicators(symbol)
  }

  /**
   * Limpia indicadores antiguos
   */
  async cleanupOldIndicators(daysToKeep: number = 90): Promise<number> {
    const deletedCount = simpleTechnicalIndicatorModel.deleteOldIndicators(daysToKeep)
    logger.info(`Cleaned up ${deletedCount} old technical indicators`)
    return deletedCount
  }

  /**
   * Obtiene estadísticas del servicio
   */
  async getServiceStats() {
    return simpleTechnicalIndicatorModel.getStats()
  }
}

// Singleton instance
export const technicalAnalysisService = new TechnicalAnalysisService()