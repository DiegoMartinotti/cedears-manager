import { PortfolioPosition, PortfolioPositionData, PortfolioPositionWithInstrument } from '../models/PortfolioPosition.js'
import { Trade, TradeData } from '../models/Trade.js'
import { InstrumentService } from './InstrumentService.js'
import { createLogger } from '../utils/logger.js'
import type { PortfolioPositionCreateInput, PortfolioPositionUpdateInput } from '../schemas/portfolio.schema.js'
import type { TradeCreateInput } from '../schemas/trade.schema.js'

const logger = createLogger('PortfolioService')

export class PortfolioService {
  private portfolioModel = new PortfolioPosition()
  private tradeModel = new Trade()
  private instrumentService = new InstrumentService()

  async getPortfolioPositions(): Promise<PortfolioPositionWithInstrument[]> {
    logger.info('Getting all portfolio positions')
    return await this.portfolioModel.findAllWithInstruments()
  }

  async getPortfolioPosition(id: number): Promise<PortfolioPositionData> {
    logger.info(`Getting portfolio position: ${id}`)
    
    const position = await this.portfolioModel.findById(id)
    if (!position) {
      throw new Error(`Portfolio position with ID ${id} not found`)
    }

    return position
  }

  async getPortfolioPositionByInstrument(instrumentId: number): Promise<PortfolioPositionData | null> {
    logger.info(`Getting portfolio position for instrument: ${instrumentId}`)
    
    // Verify instrument exists
    await this.instrumentService.getInstrumentById(instrumentId)
    
    return await this.portfolioModel.findByInstrumentId(instrumentId)
  }

  async createPortfolioPosition(data: PortfolioPositionCreateInput): Promise<PortfolioPositionData> {
    logger.info(`Creating portfolio position for instrument: ${data.instrument_id}`)
    
    // Verify instrument exists
    await this.instrumentService.getInstrumentById(data.instrument_id)
    
    // Check if position already exists
    const existing = await this.portfolioModel.findByInstrumentId(data.instrument_id)
    if (existing) {
      throw new Error(`Portfolio position for instrument ${data.instrument_id} already exists`)
    }

    const position = await this.portfolioModel.create(data)
    logger.info(`Portfolio position created successfully: ${position.id}`)
    
    return position
  }

  async updatePortfolioPosition(id: number, data: PortfolioPositionUpdateInput): Promise<PortfolioPositionData> {
    logger.info(`Updating portfolio position: ${id}`)
    
    const position = await this.portfolioModel.update(id, data)
    if (!position) {
      throw new Error(`Portfolio position with ID ${id} not found`)
    }

    logger.info(`Portfolio position updated successfully: ${id}`)
    return position
  }

  async deletePortfolioPosition(id: number): Promise<void> {
    logger.info(`Deleting portfolio position: ${id}`)
    
    const success = await this.portfolioModel.delete(id)
    if (!success) {
      throw new Error(`Portfolio position with ID ${id} not found`)
    }

    logger.info(`Portfolio position deleted successfully: ${id}`)
  }

  async processTradeAndUpdatePosition(tradeData: TradeCreateInput): Promise<{
    trade: TradeData
    position: PortfolioPositionData
  }> {
    logger.info(`Processing trade and updating position for instrument: ${tradeData.instrument_id}`)
    
    // Verify instrument exists
    await this.instrumentService.getInstrumentById(tradeData.instrument_id)
    
    // Create the trade
    const trade = await this.tradeModel.create(tradeData)
    
    // Get or create portfolio position
    let position = await this.portfolioModel.findByInstrumentId(tradeData.instrument_id)
    
    if (!position) {
      // Create new position
      position = await this.portfolioModel.create({
        instrument_id: tradeData.instrument_id,
        quantity: 0,
        average_cost: 0,
        total_cost: 0
      })
    }

    // Calculate new position values
    const newPosition = this.calculateNewPosition(position, trade)
    
    // Update position
    const updatedPosition = await this.portfolioModel.update(position.id!, newPosition)
    if (!updatedPosition) {
      throw new Error('Failed to update portfolio position')
    }

    logger.info(`Trade processed and position updated: Trade ID ${trade.id}, Position ID ${updatedPosition.id}`)
    
    return {
      trade,
      position: updatedPosition
    }
  }

  private calculateNewPosition(currentPosition: PortfolioPositionData, trade: TradeData): Partial<PortfolioPositionData> {
    const currentQuantity = currentPosition.quantity
    const currentTotalCost = currentPosition.total_cost
    
    if (trade.type === 'BUY') {
      // Adding to position
      const newQuantity = currentQuantity + trade.quantity
      const newTotalCost = currentTotalCost + trade.net_amount
      const newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0
      
      return {
        quantity: newQuantity,
        average_cost: newAverageCost,
        total_cost: newTotalCost
      }
    } else {
      // Selling from position
      const newQuantity = Math.max(0, currentQuantity - trade.quantity)
      
      if (newQuantity === 0) {
        // Position closed
        return {
          quantity: 0,
          average_cost: 0,
          total_cost: 0
        }
      } else {
        // Partial sale - maintain average cost, reduce total cost proportionally
        const saleRatio = trade.quantity / currentQuantity
        const newTotalCost = currentTotalCost * (1 - saleRatio)
        
        return {
          quantity: newQuantity,
          average_cost: currentPosition.average_cost, // Keep same average cost
          total_cost: newTotalCost
        }
      }
    }
  }

  async getPortfolioSummary(): Promise<{
    total_positions: number
    total_cost: number
    market_value: number
    unrealized_pnl: number
    unrealized_pnl_percentage: number
  }> {
    logger.info('Getting portfolio summary')
    
    const positions = await this.portfolioModel.findAllWithInstruments()
    const portfolioValue = await this.portfolioModel.getTotalPortfolioValue()
    
    const totalPositions = positions.filter(p => p.quantity > 0).length
    const unrealizedPnlPercentage = portfolioValue.total_cost > 0 
      ? (portfolioValue.unrealized_pnl / portfolioValue.total_cost) * 100 
      : 0

    return {
      total_positions: totalPositions,
      total_cost: portfolioValue.total_cost,
      market_value: portfolioValue.market_value,
      unrealized_pnl: portfolioValue.unrealized_pnl,
      unrealized_pnl_percentage: unrealizedPnlPercentage
    }
  }

  async getPortfolioPerformance(): Promise<Array<{
    symbol: string
    company_name: string
    quantity: number
    average_cost: number
    current_price: number
    market_value: number
    unrealized_pnl: number
    unrealized_pnl_percentage: number
    weight_percentage: number
  }>> {
    logger.info('Getting portfolio performance')
    
    const positions = await this.portfolioModel.findAllWithInstruments()
    const portfolioValue = await this.portfolioModel.getTotalPortfolioValue()
    
    return positions
      .filter(p => p.quantity > 0)
      .map(position => {
        const marketValue = position.market_value || 0
        const weightPercentage = portfolioValue.market_value > 0 
          ? (marketValue / portfolioValue.market_value) * 100 
          : 0

        return {
          symbol: position.symbol || '',
          company_name: position.company_name || '',
          quantity: position.quantity,
          average_cost: position.average_cost,
          current_price: position.current_price || 0,
          market_value: marketValue,
          unrealized_pnl: position.unrealized_pnl || 0,
          unrealized_pnl_percentage: position.unrealized_pnl_percentage || 0,
          weight_percentage: weightPercentage
        }
      })
      .sort((a, b) => b.weight_percentage - a.weight_percentage)
  }

  async closePosition(instrumentId: number): Promise<void> {
    logger.info(`Closing position for instrument: ${instrumentId}`)
    
    const position = await this.portfolioModel.findByInstrumentId(instrumentId)
    if (!position) {
      throw new Error(`No position found for instrument ${instrumentId}`)
    }

    if (position.quantity <= 0) {
      throw new Error(`Position for instrument ${instrumentId} is already closed`)
    }

    // Update position to zero
    await this.portfolioModel.updateByInstrumentId(instrumentId, {
      quantity: 0,
      average_cost: 0,
      total_cost: 0
    })

    logger.info(`Position closed for instrument: ${instrumentId}`)
  }

  async rebalancePortfolio(targetAllocations: Array<{ instrument_id: number; target_percentage: number }>): Promise<Array<{
    instrument_id: number
    symbol: string
    current_percentage: number
    target_percentage: number
    rebalance_amount: number
    action: 'BUY' | 'SELL' | 'HOLD'
  }>> {
    logger.info('Calculating portfolio rebalancing')
    
    const positions = await this.portfolioModel.findAllWithInstruments()
    const portfolioValue = await this.portfolioModel.getTotalPortfolioValue()
    
    const totalTargetPercentage = targetAllocations.reduce((sum, allocation) => sum + allocation.target_percentage, 0)
    if (Math.abs(totalTargetPercentage - 100) > 0.01) {
      throw new Error('Target allocations must sum to 100%')
    }

    const rebalanceResults = []

    for (const allocation of targetAllocations) {
      const position = positions.find(p => p.instrument_id === allocation.instrument_id)
      const currentValue = position?.market_value || 0
      const currentPercentage = portfolioValue.market_value > 0 
        ? (currentValue / portfolioValue.market_value) * 100 
        : 0

      const targetValue = (allocation.target_percentage / 100) * portfolioValue.market_value
      const rebalanceAmount = targetValue - currentValue

      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
      if (Math.abs(rebalanceAmount) > portfolioValue.market_value * 0.01) { // 1% threshold
        action = rebalanceAmount > 0 ? 'BUY' : 'SELL'
      }

      // Get instrument info
      const instrument = await this.instrumentService.getInstrumentById(allocation.instrument_id)

      rebalanceResults.push({
        instrument_id: allocation.instrument_id,
        symbol: instrument.symbol,
        current_percentage: currentPercentage,
        target_percentage: allocation.target_percentage,
        rebalance_amount: Math.abs(rebalanceAmount),
        action
      })
    }

    return rebalanceResults
  }
}