import { Router } from 'express'
import instrumentRoutes from './instrumentRoutes.js'
import portfolioRoutes from './portfolioRoutes.js'
import claudeRoutes from './claudeRoutes.js'
import quoteRoutes from './quoteRoutes.js'
import uvaRoutes from './uvaRoutes.js'
import tradeRoutes from './tradeRoutes.js'
import dashboardRoutes from './dashboardRoutes.js'
import commissionRoutes from './commission-routes.js'
import { custodyRoutes } from './custodyRoutes.js'
import reportsRoutes from './reportsRoutes.js'
import { technicalIndicatorRoutes } from './technicalIndicatorRoutes.js'
import opportunityRoutes from './opportunityRoutes.js'
import sellAnalysisRoutes from './sellAnalysisRoutes.js'
import contextualAnalysisRoutes from './contextualAnalysisRoutes.js'
import esgVeganRoutes from './esgVeganRoutes.js'
import notificationRoutes from './notificationRoutes.js'
import monthlyReviewRoutes from './monthlyReviewRoutes.js'
import sectorBalanceRoutes from './sectorBalance.routes.js'
import benchmarkRoutes from './benchmarkRoutes.js'
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
      claude: '/api/v1/claude',
      quotes: '/api/v1/quotes',
      uva: '/api/v1/uva',
      trades: '/api/v1/trades',
      dashboard: '/api/v1/dashboard',
      commissions: '/api/v1/commissions',
      custody: '/api/v1/custody',
      reports: '/api/v1/reports',
      technicalIndicators: '/api/v1/technical-indicators',
      opportunities: '/api/v1/opportunities',
      sellAnalysis: '/api/v1/sell-analysis',
      contextualAnalysis: '/api/v1/contextual',
      esgVegan: '/api/v1/esg-vegan',
      notifications: '/api/v1/notifications',
      monthlyReview: '/api/v1/monthly-review',
      sectorBalance: '/api/v1/sector-balance',
      benchmark: '/api/v1/benchmark',
      health: '/api/v1/health'
    },
    timestamp: new Date().toISOString()
  })
})

// Mount route modules
router.use('/instruments', instrumentRoutes)
router.use('/portfolio', portfolioRoutes)
router.use('/claude', claudeRoutes)
router.use('/quotes', quoteRoutes)
router.use('/uva', uvaRoutes)
router.use('/trades', tradeRoutes)
router.use('/dashboard', dashboardRoutes)
router.use('/commissions', commissionRoutes)
router.use('/custody', custodyRoutes)
router.use('/reports', reportsRoutes)
router.use('/technical-indicators', technicalIndicatorRoutes)
router.use('/opportunities', opportunityRoutes)
router.use('/sell-analysis', sellAnalysisRoutes)
router.use('/contextual', contextualAnalysisRoutes)
router.use('/esg-vegan', esgVeganRoutes)
router.use('/notifications', notificationRoutes)
router.use('/monthly-review', monthlyReviewRoutes)
router.use('/sector-balance', sectorBalanceRoutes)
router.use('/benchmark', benchmarkRoutes)

export default router