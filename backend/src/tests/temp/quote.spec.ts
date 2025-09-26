import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Quote, QuoteData } from '../models/Quote.js'
import { QuoteService } from '../services/QuoteService.js'
import DatabaseConnection from '../database/connection.js'

// Mock Yahoo Finance
vi.mock('yahoo-finance2', () => ({
  default: {
    quoteSummary: vi.fn()
  }
}))

type QuoteTestContext = {
  quote: Quote
  db: any
}

const setupQuoteTestContext = (): QuoteTestContext => {
  const quote = new Quote()
  const db = DatabaseConnection.getInstance()

  try {
    db.exec('DELETE FROM quotes')
  } catch (error) {
    // Tabla puede no existir en la primera ejecución
  }

  return { quote, db }
}

const cleanupQuoteTestContext = (db: any) => {
  try {
    db.exec('DELETE FROM quotes')
  } catch (error) {
    // Ignorar errores de limpieza
  }
}

describe('Quote Model create', () => {
  let quote: Quote
  let db: any

  beforeEach(() => {
    ({ quote, db } = setupQuoteTestContext())
  })

  afterEach(() => {
    cleanupQuoteTestContext(db)
  })

  it('should create a new quote', async () => {
    const quoteData: Omit<QuoteData, 'id' | 'created_at'> = {
      instrument_id: 1,
      price: 100.50,
      volume: 1000,
      high: 105.00,
      low: 98.00,
      close: 102.00,
      quote_date: '2024-01-15',
      quote_time: '15:30:00',
      source: 'yahoo_finance'
    }

    const createdQuote = await quote.create(quoteData)

    expect(createdQuote).toBeDefined()
    expect(createdQuote.id).toBeDefined()
    expect(createdQuote.price).toBe(100.50)
    expect(createdQuote.instrument_id).toBe(1)
    expect(createdQuote.quote_date).toBe('2024-01-15')
  })

  it('should set default values correctly', async () => {
    const quoteData: Omit<QuoteData, 'id' | 'created_at'> = {
      instrument_id: 1,
      price: 100.50,
      quote_date: '2024-01-15'
    }

    const createdQuote = await quote.create(quoteData)

    expect(createdQuote.close).toBe(100.50)
    expect(createdQuote.source).toBe('yahoo_finance')
  })
})

describe('Quote Model findById', () => {
  let quote: Quote
  let db: any

  beforeEach(() => {
    ({ quote, db } = setupQuoteTestContext())
  })

  afterEach(() => {
    cleanupQuoteTestContext(db)
  })

  it('should find quote by id', async () => {
    const quoteData: Omit<QuoteData, 'id' | 'created_at'> = {
      instrument_id: 1,
      price: 100.50,
      quote_date: '2024-01-15'
    }

    const createdQuote = await quote.create(quoteData)
    const foundQuote = await quote.findById(createdQuote.id!)

    expect(foundQuote).toBeDefined()
    expect(foundQuote!.id).toBe(createdQuote.id)
    expect(foundQuote!.price).toBe(100.50)
  })

  it('should return null for non-existent quote', async () => {
    const foundQuote = await quote.findById(999)
    expect(foundQuote).toBeNull()
  })
})

describe('Quote Model upsertQuote', () => {
  let quote: Quote
  let db: any

  beforeEach(() => {
    ({ quote, db } = setupQuoteTestContext())
  })

  afterEach(() => {
    cleanupQuoteTestContext(db)
  })

  it('should create new quote when none exists', async () => {
    const quoteData: Omit<QuoteData, 'id' | 'created_at'> = {
      instrument_id: 1,
      price: 100.50,
      quote_date: '2024-01-15'
    }

    const result = await quote.upsertQuote(quoteData)

    expect(result).toBeDefined()
    expect(result.price).toBe(100.50)
  })

  it('should update existing quote for same instrument and date', async () => {
    const quoteData: Omit<QuoteData, 'id' | 'created_at'> = {
      instrument_id: 1,
      price: 100.50,
      quote_date: '2024-01-15'
    }

    await quote.create(quoteData)

    const updatedData = { ...quoteData, price: 105.00 }
    const result = await quote.upsertQuote(updatedData)

    expect(result.price).toBe(105.00)

    const allQuotes = await quote.findByInstrumentId(1)
    expect(allQuotes).toHaveLength(1)
  })
})

describe('Quote Model getLatestQuote', () => {
  let quote: Quote
  let db: any

  beforeEach(() => {
    ({ quote, db } = setupQuoteTestContext())
  })

  afterEach(() => {
    cleanupQuoteTestContext(db)
  })

  it('should return the most recent quote for an instrument', async () => {
    const instrument_id = 1

    await quote.create({
      instrument_id,
      price: 100.00,
      quote_date: '2024-01-14'
    })

    await quote.create({
      instrument_id,
      price: 105.00,
      quote_date: '2024-01-15'
    })

    const latestQuote = await quote.getLatestQuote(instrument_id)

    expect(latestQuote).toBeDefined()
    expect(latestQuote!.price).toBe(105.00)
    expect(latestQuote!.quote_date).toBe('2024-01-15')
  })

  it('should return null when no quotes exist', async () => {
    const latestQuote = await quote.getLatestQuote(999)
    expect(latestQuote).toBeNull()
  })
})

describe('Quote Model batchUpsert', () => {
  let quote: Quote
  let db: any

  beforeEach(() => {
    ({ quote, db } = setupQuoteTestContext())
  })

  afterEach(() => {
    cleanupQuoteTestContext(db)
  })

  it('should process multiple quotes', async () => {
    const quotes: Omit<QuoteData, 'id' | 'created_at'>[] = [
      {
        instrument_id: 1,
        price: 100.00,
        quote_date: '2024-01-15'
      },
      {
        instrument_id: 2,
        price: 200.00,
        quote_date: '2024-01-15'
      }
    ]

    const processedCount = await quote.batchUpsert(quotes)

    expect(processedCount).toBe(2)

    const quote1 = await quote.getLatestQuote(1)
    const quote2 = await quote.getLatestQuote(2)

    expect(quote1!.price).toBe(100.00)
    expect(quote2!.price).toBe(200.00)
  })

  it('should return 0 for empty array', async () => {
    const processedCount = await quote.batchUpsert([])
    expect(processedCount).toBe(0)
  })
})

describe('Quote Model deleteOldQuotes', () => {
  let quote: Quote
  let db: any

  beforeEach(() => {
    ({ quote, db } = setupQuoteTestContext())
  })

  afterEach(() => {
    cleanupQuoteTestContext(db)
  })

  it('should delete quotes older than specified date', async () => {
    await quote.create({
      instrument_id: 1,
      price: 100.00,
      quote_date: '2024-01-01'
    })

    await quote.create({
      instrument_id: 1,
      price: 105.00,
      quote_date: '2024-01-15'
    })

    const deletedCount = await quote.deleteOldQuotes('2024-01-10')

    expect(deletedCount).toBe(1)

    const remainingQuotes = await quote.findByInstrumentId(1)
    expect(remainingQuotes).toHaveLength(1)
    expect(remainingQuotes[0].quote_date).toBe('2024-01-15')
  })
})

describe('QuoteService getMarketHours', () => {
  let quoteService: QuoteService

  beforeEach(() => {
    vi.clearAllMocks()
    quoteService = new QuoteService()
  })

  afterEach(() => {
    quoteService.shutdown()
  })

  it('should return market hours information', () => {
    const marketHours = quoteService.getMarketHours()

    expect(marketHours).toBeDefined()
    expect(marketHours.timezone).toBe('America/New_York')
    expect(typeof marketHours.isOpen).toBe('boolean')
  })

  it('should detect weekends as closed', () => {
    const originalDate = Date
    const mockDate = new Date('2024-01-13T12:00:00')

    vi.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new originalDate(...args as any)
    })

    const marketHours = quoteService.getMarketHours()
    expect(marketHours.isOpen).toBe(false)

    vi.restoreAllMocks()
  })
})

describe('QuoteService getAdaptiveCacheTTL', () => {
  let quoteService: QuoteService

  beforeEach(() => {
    vi.clearAllMocks()
    quoteService = new QuoteService()
  })

  afterEach(() => {
    quoteService.shutdown()
  })

  it('should return shorter TTL during market hours', () => {
    const originalDate = Date
    const mockDate = new Date('2024-01-15T14:00:00')

    vi.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return mockDate
      }
      return new originalDate(...args as any)
    })

    const ttl = (quoteService as any).getAdaptiveCacheTTL()

    expect(ttl).toBeLessThanOrEqual(2 * 60 * 1000)

    vi.restoreAllMocks()
  })
})

const createQuoteService = () => {
  vi.clearAllMocks()
  return new QuoteService()
}

const shutdownQuoteService = (service: QuoteService) => {
  service.shutdown()
}

describe('QuoteService fetchYahooQuote success', () => {
  let quoteService: QuoteService

  beforeEach(() => {
    quoteService = createQuoteService()
  })

  afterEach(() => {
    shutdownQuoteService(quoteService)
  })

  it('should handle successful Yahoo Finance response', async () => {
    const mockQuote = {
      price: {
        regularMarketPrice: 150.50
      }
    }

    const yahooFinance = await import('yahoo-finance2')
    vi.mocked(yahooFinance.default.quoteSummary).mockResolvedValue(mockQuote)

    const result = await (quoteService as any).fetchYahooQuote('AAPL')

    expect(result.success).toBe(true)
    expect(result.price).toBe(150.50)
    expect(result.symbol).toBe('AAPL')
  })
})

describe('QuoteService fetchYahooQuote errors', () => {
  let quoteService: QuoteService

  beforeEach(() => {
    quoteService = createQuoteService()
  })

  afterEach(() => {
    shutdownQuoteService(quoteService)
  })

  it('should handle Yahoo Finance errors', async () => {
    const yahooFinance = await import('yahoo-finance2')
    vi.mocked(yahooFinance.default.quoteSummary).mockRejectedValue(new Error('API Error'))

    const result = await (quoteService as any).fetchYahooQuote('INVALID')

    expect(result.success).toBe(false)
    expect(result.error).toContain('API Error')
  })

  it('should handle invalid price data', async () => {
    const mockQuote = {
      price: {
        regularMarketPrice: null
      }
    }

    const yahooFinance = await import('yahoo-finance2')
    vi.mocked(yahooFinance.default.quoteSummary).mockResolvedValue(mockQuote)

    const result = await (quoteService as any).fetchYahooQuote('AAPL')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid price data')
  })
})
