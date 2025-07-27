import { Router } from 'express'
import instrumentRoutes from './instrumentRoutes.js'
import portfolioRoutes from './portfolioRoutes.js'
import SimpleDatabaseConnection from '../database/simple-connection.js'

const router = Router()

// Health check endpoint for API
router.get('/health', (req, res) => {
  const dbHealthy = SimpleDatabaseConnection.isHealthy()
  
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      api: 'healthy'
    }
  })
})

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'CEDEARs Manager API',
    version: '1.0.0',
    description: 'Backend API for CEDEARs portfolio management',
    endpoints: {
      instruments: '/api/v1/instruments',
      portfolio: '/api/v1/portfolio',
      health: '/api/v1/health'
    },
    timestamp: new Date().toISOString()
  })
})

// Mount route modules
router.use('/instruments', instrumentRoutes)
router.use('/portfolio', portfolioRoutes)

export default router