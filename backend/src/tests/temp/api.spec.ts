import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index.js'
import DatabaseConnection from '../database/connection.js'

type InstrumentOverrides = Partial<{
  symbol: string
  company_name: string
  sector: string
  is_esg_compliant: boolean
  is_vegan_friendly: boolean
}>

const createInstrument = async (overrides: InstrumentOverrides = {}) => {
  const defaults = {
    symbol: `TEMP-${Date.now()}`,
    company_name: 'Temporary Instrument',
    sector: 'Technology',
    is_esg_compliant: true,
    is_vegan_friendly: true
  }

  const response = await request(app)
    .post('/api/v1/instruments')
    .send({ ...defaults, ...overrides })
    .expect(201)

  return response.body.data
}

beforeAll(async () => {
  process.env.DB_PATH = ':memory:'
  await new Promise(resolve => setTimeout(resolve, 1000))
})

afterAll(() => {
  DatabaseConnection.close()
})

describe('Health Checks', () => {
  it('should return server status on root endpoint', async () => {
    const response = await request(app)
      .get('/')
      .expect(200)

    expect(response.body).toHaveProperty('message')
    expect(response.body).toHaveProperty('status', 'running')
    expect(response.body).toHaveProperty('timestamp')
  })

  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body).toHaveProperty('status', 'ok')
    expect(response.body).toHaveProperty('timestamp')
    expect(response.body).toHaveProperty('environment')
  })

  it('should return API v1 health status', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .expect(200)

    expect(response.body).toHaveProperty('status')
    expect(response.body).toHaveProperty('services')
    expect(response.body.services).toHaveProperty('database')
    expect(response.body.services).toHaveProperty('api', 'healthy')
  })

  it('should return API v1 info', async () => {
    const response = await request(app)
      .get('/api/v1')
      .expect(200)

    expect(response.body).toHaveProperty('name', 'CEDEARs Manager API')
    expect(response.body).toHaveProperty('version', '1.0.0')
    expect(response.body).toHaveProperty('endpoints')
  })
})

describe('Instruments API - listing and filters', () => {
  it('should get empty instruments list initially', async () => {
    const response = await request(app)
      .get('/api/v1/instruments')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('should search instruments', async () => {
    await createInstrument({ symbol: 'TSLA', company_name: 'Tesla, Inc.' })

    const response = await request(app)
      .get('/api/v1/instruments/search?q=Tesla')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data.length).toBeGreaterThan(0)
  })

  it('should get ESG instruments', async () => {
    await createInstrument({ symbol: 'ESG1', company_name: 'ESG Company' })

    const response = await request(app)
      .get('/api/v1/instruments/esg')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data.every((inst: any) => inst.is_esg_compliant)).toBe(true)
  })
})

describe('Instruments API - creation and details', () => {
  it('should create a new instrument', async () => {
    const response = await request(app)
      .post('/api/v1/instruments')
      .send({
        symbol: 'AAPL',
        company_name: 'Apple Inc.',
        sector: 'Technology',
        is_esg_compliant: true,
        is_vegan_friendly: false
      })
      .expect(201)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data).toHaveProperty('id')
  })

  it('should get instrument by ID', async () => {
    const created = await createInstrument({ symbol: 'GOOGL', company_name: 'Alphabet Inc.' })

    const response = await request(app)
      .get(`/api/v1/instruments/${created.id}`)
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data).toHaveProperty('id', created.id)
  })
})

describe('Instruments API - updates', () => {
  it('should update an instrument', async () => {
    const created = await createInstrument({ symbol: 'MSFT', company_name: 'Microsoft Corp.' })

    const response = await request(app)
      .put(`/api/v1/instruments/${created.id}`)
      .send({
        company_name: 'Microsoft Corporation',
        is_esg_compliant: true
      })
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data).toHaveProperty('company_name', 'Microsoft Corporation')
  })
})

describe('Portfolio API - positions and summary', () => {
  it('should get empty portfolio initially', async () => {
    const response = await request(app)
      .get('/api/v1/portfolio/positions')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(Array.isArray(response.body.data)).toBe(true)
  })

  it('should get portfolio summary', async () => {
    const response = await request(app)
      .get('/api/v1/portfolio/summary')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data).toHaveProperty('total_positions')
    expect(response.body.data).toHaveProperty('market_value')
  })

  it('should get portfolio performance', async () => {
    const response = await request(app)
      .get('/api/v1/portfolio/performance')
      .expect(200)

    expect(response.body).toHaveProperty('success', true)
    expect(Array.isArray(response.body.data)).toBe(true)
  })
})

describe('Portfolio API - trades', () => {
  let instrumentId: number

  beforeAll(async () => {
    const created = await createInstrument({ symbol: 'TEST', company_name: 'Test Company' })
    instrumentId = created.id
  })

  it('should process a trade and create position', async () => {
    const tradeData = {
      instrument_id: instrumentId,
      type: 'BUY',
      quantity: 100,
      price: 150.00,
      total_amount: 15000.00,
      commission: 90.00,
      taxes: 9.00,
      net_amount: 15099.00,
      trade_date: '2024-01-15'
    }

    const response = await request(app)
      .post('/api/v1/portfolio/trade')
      .send(tradeData)
      .expect(201)

    expect(response.body).toHaveProperty('success', true)
    expect(response.body.data.trade).toHaveProperty('type', 'BUY')
    expect(response.body.data.position).toHaveProperty('quantity', 100)
  })
})

describe('Error Handling', () => {
  it('should return 404 for non-existent instrument', async () => {
    const response = await request(app)
      .get('/api/v1/instruments/99999')
      .expect(404)

    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
  })

  it('should return 404 for non-existent endpoints', async () => {
    const response = await request(app)
      .get('/api/v1/nonexistent')
      .expect(404)

    expect(response.body).toHaveProperty('error')
  })

  it('should validate request data', async () => {
    const response = await request(app)
      .post('/api/v1/instruments')
      .send({ symbol: '', company_name: '' })
      .expect(400)

    expect(response.body).toHaveProperty('success', false)
    expect(response.body).toHaveProperty('error')
  })
})
