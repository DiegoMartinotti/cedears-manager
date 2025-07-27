import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import DatabaseConnection from '../database/connection.js'
import { MigrationRunner } from '../database/migrations.js'
import { Instrument } from '../models/Instrument.js'
import { PortfolioPosition } from '../models/PortfolioPosition.js'
import { Trade } from '../models/Trade.js'

describe('Models', () => {
  let instrument: Instrument
  let portfolioPosition: PortfolioPosition
  let trade: Trade
  let testInstrumentId: number

  beforeAll(async () => {
    // Setup test database
    process.env.DB_PATH = ':memory:'
    
    // Run migrations
    const migrationRunner = new MigrationRunner()
    await migrationRunner.runMigrations()

    // Initialize models
    instrument = new Instrument()
    portfolioPosition = new PortfolioPosition()
    trade = new Trade()
  })

  afterAll(() => {
    DatabaseConnection.close()
  })

  beforeEach(async () => {
    // Clean up data before each test
    const db = DatabaseConnection.getInstance()
    db.exec('DELETE FROM trades')
    db.exec('DELETE FROM portfolio_positions')
    db.exec('DELETE FROM instruments')
  })

  describe('Instrument Model', () => {
    it('should create a new instrument', async () => {
      const instrumentData = {
        symbol: 'AAPL',
        company_name: 'Apple Inc.',
        sector: 'Technology',
        is_esg_compliant: true,
        is_vegan_friendly: false
      }

      const result = await instrument.create(instrumentData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.symbol).toBe('AAPL')
      expect(result.company_name).toBe('Apple Inc.')
      expect(result.is_esg_compliant).toBe(true)
      
      testInstrumentId = result.id!
    })

    it('should find instrument by ID', async () => {
      // Create instrument first
      const created = await instrument.create({
        symbol: 'GOOGL',
        company_name: 'Alphabet Inc.'
      })

      const found = await instrument.findById(created.id!)

      expect(found).toBeDefined()
      expect(found!.symbol).toBe('GOOGL')
      expect(found!.company_name).toBe('Alphabet Inc.')
    })

    it('should find instrument by symbol', async () => {
      await instrument.create({
        symbol: 'MSFT',
        company_name: 'Microsoft Corporation'
      })

      const found = await instrument.findBySymbol('MSFT')

      expect(found).toBeDefined()
      expect(found!.symbol).toBe('MSFT')
      expect(found!.company_name).toBe('Microsoft Corporation')
    })

    it('should return null for non-existent instrument', async () => {
      const found = await instrument.findBySymbol('NONEXISTENT')
      expect(found).toBeNull()
    })

    it('should update instrument', async () => {
      const created = await instrument.create({
        symbol: 'TSLA',
        company_name: 'Tesla Inc.'
      })

      const updated = await instrument.update(created.id!, {
        company_name: 'Tesla, Inc.',
        is_esg_compliant: true
      })

      expect(updated).toBeDefined()
      expect(updated!.company_name).toBe('Tesla, Inc.')
      expect(updated!.is_esg_compliant).toBe(true)
    })

    it('should get ESG instruments', async () => {
      await instrument.create({
        symbol: 'ESG1',
        company_name: 'ESG Company 1',
        is_esg_compliant: true
      })

      await instrument.create({
        symbol: 'NONESG',
        company_name: 'Non-ESG Company',
        is_esg_compliant: false
      })

      const esgInstruments = await instrument.getESGInstruments()

      expect(esgInstruments).toHaveLength(1)
      expect(esgInstruments[0].symbol).toBe('ESG1')
    })
  })

  describe('PortfolioPosition Model', () => {
    beforeEach(async () => {
      // Create a test instrument for portfolio tests
      const created = await instrument.create({
        symbol: 'TEST',
        company_name: 'Test Company'
      })
      testInstrumentId = created.id!
    })

    it('should create portfolio position', async () => {
      const positionData = {
        instrument_id: testInstrumentId,
        quantity: 100,
        average_cost: 150.50,
        total_cost: 15050.00
      }

      const result = await portfolioPosition.create(positionData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.instrument_id).toBe(testInstrumentId)
      expect(result.quantity).toBe(100)
      expect(result.average_cost).toBe(150.50)
    })

    it('should find position by instrument ID', async () => {
      await portfolioPosition.create({
        instrument_id: testInstrumentId,
        quantity: 50,
        average_cost: 100.00,
        total_cost: 5000.00
      })

      const found = await portfolioPosition.findByInstrumentId(testInstrumentId)

      expect(found).toBeDefined()
      expect(found!.instrument_id).toBe(testInstrumentId)
      expect(found!.quantity).toBe(50)
    })

    it('should update position', async () => {
      const created = await portfolioPosition.create({
        instrument_id: testInstrumentId,
        quantity: 100,
        average_cost: 150.00,
        total_cost: 15000.00
      })

      const updated = await portfolioPosition.update(created.id!, {
        quantity: 150,
        total_cost: 22500.00
      })

      expect(updated).toBeDefined()
      expect(updated!.quantity).toBe(150)
      expect(updated!.total_cost).toBe(22500.00)
    })
  })

  describe('Trade Model', () => {
    beforeEach(async () => {
      // Create a test instrument for trade tests
      const created = await instrument.create({
        symbol: 'TRADE',
        company_name: 'Trade Company'
      })
      testInstrumentId = created.id!
    })

    it('should create trade', async () => {
      const tradeData = {
        instrument_id: testInstrumentId,
        type: 'BUY' as const,
        quantity: 100,
        price: 150.00,
        total_amount: 15000.00,
        commission: 90.00,
        taxes: 9.00,
        net_amount: 15099.00,
        trade_date: '2024-01-15'
      }

      const result = await trade.create(tradeData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.type).toBe('BUY')
      expect(result.quantity).toBe(100)
      expect(result.price).toBe(150.00)
    })

    it('should find trades by instrument', async () => {
      await trade.create({
        instrument_id: testInstrumentId,
        type: 'BUY',
        quantity: 50,
        price: 100.00,
        total_amount: 5000.00,
        net_amount: 5050.00,
        trade_date: '2024-01-10'
      })

      const trades = await trade.findByInstrumentId(testInstrumentId)

      expect(trades).toHaveLength(1)
      expect(trades[0].instrument_id).toBe(testInstrumentId)
      expect(trades[0].type).toBe('BUY')
    })

    it('should get trades summary', async () => {
      // Create buy trade
      await trade.create({
        instrument_id: testInstrumentId,
        type: 'BUY',
        quantity: 100,
        price: 100.00,
        total_amount: 10000.00,
        commission: 60.00,
        taxes: 6.00,
        net_amount: 10066.00,
        trade_date: '2024-01-10'
      })

      // Create sell trade
      await trade.create({
        instrument_id: testInstrumentId,
        type: 'SELL',
        quantity: 50,
        price: 120.00,
        total_amount: 6000.00,
        commission: 36.00,
        taxes: 3.60,
        net_amount: 5960.40,
        trade_date: '2024-01-15'
      })

      const summary = await trade.getTradesSummary(testInstrumentId)

      expect(summary.total_trades).toBe(2)
      expect(summary.total_buys).toBe(1)
      expect(summary.total_sells).toBe(1)
      expect(summary.total_buy_amount).toBe(10000.00)
      expect(summary.total_sell_amount).toBe(6000.00)
    })
  })
})