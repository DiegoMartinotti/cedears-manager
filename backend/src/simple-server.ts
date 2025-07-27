#!/usr/bin/env tsx

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createLogger } from './utils/logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFoundHandler.js'
import SimpleDatabaseConnection from './database/simple-connection.js'
import { SimpleInstrumentService } from './services/SimpleInstrumentService.js'
import {
  InstrumentCreateSchema,
  InstrumentUpdateSchema,
  InstrumentQuerySchema,
  InstrumentParamsSchema
} from './schemas/instrument.schema.js'

// Load environment variables
dotenv.config()

const app = express()
const logger = createLogger('simple-server')
const PORT = process.env.PORT || 3001

// Initialize services
const instrumentService = new SimpleInstrumentService()

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
}))
app.use(compression())
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'file://',
    'app://.', // Electron protocol
    /^file:\/\//,
    /^app:\/\//
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Request parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}))

// Root endpoint for wait-on health checks
app.get('/', (_, res) => {
  res.json({
    message: 'CEDEARs Manager Backend (Simple)',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/health', (_, res) => {
  const dbHealthy = SimpleDatabaseConnection.isHealthy()
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0-simple',
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      api: 'healthy'
    }
  })
})

// API v1 info endpoint
app.get('/api/v1', (_, res) => {
  res.json({
    name: 'CEDEARs Manager API (Simple)',
    version: '1.0.0-simple',
    description: 'Simplified backend API for CEDEARs portfolio management',
    endpoints: {
      instruments: '/api/v1/instruments',
      health: '/api/v1/health'
    },
    timestamp: new Date().toISOString()
  })
})

// API v1 health check
app.get('/api/v1/health', (_, res) => {
  const dbHealthy = SimpleDatabaseConnection.isHealthy()
  res.json({
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0-simple',
    services: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      api: 'healthy'
    }
  })
})

// Instruments endpoints
app.get('/api/v1/instruments', async (req, res) => {
  try {
    logger.info('Getting all instruments')
    
    const filters = InstrumentQuerySchema.parse(req.query)
    const instruments = await instrumentService.getAllInstruments(filters)

    res.json({
      success: true,
      data: instruments,
      meta: {
        total: instruments.length,
        filters: filters
      }
    })
  } catch (error) {
    logger.error('Error getting instruments:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get instruments'
    })
  }
})

app.post('/api/v1/instruments', async (req, res) => {
  try {
    logger.info('Creating new instrument')
    
    const validatedData = InstrumentCreateSchema.parse(req.body)
    const instrument = await instrumentService.createInstrument(validatedData)

    res.status(201).json({
      success: true,
      data: instrument,
      message: 'Instrument created successfully'
    })
  } catch (error) {
    logger.error('Error creating instrument:', error)
    
    if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to create instrument'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create instrument'
      })
    }
  }
})

app.get('/api/v1/instruments/search', async (req, res) => {
  try {
    const searchTerm = req.query.q as string
    
    if (!searchTerm) {
      res.status(400).json({
        success: false,
        error: 'Search term is required',
        message: 'Please provide a search term using the "q" parameter'
      })
      return
    }

    logger.info(`Searching instruments: ${searchTerm}`)
    
    const instruments = await instrumentService.searchInstruments(searchTerm)

    res.json({
      success: true,
      data: instruments,
      meta: {
        total: instruments.length,
        search_term: searchTerm
      }
    })
  } catch (error) {
    logger.error('Error searching instruments:', error)
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to search instruments'
    })
  }
})

app.get('/api/v1/instruments/esg', async (req, res) => {
  try {
    logger.info('Getting ESG compliant instruments')
    
    const instruments = await instrumentService.getESGInstruments()

    res.json({
      success: true,
      data: instruments,
      meta: {
        total: instruments.length,
        filter: 'ESG compliant'
      }
    })
  } catch (error) {
    logger.error('Error getting ESG instruments:', error)
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get ESG instruments'
    })
  }
})

app.get('/api/v1/instruments/vegan', async (req, res) => {
  try {
    logger.info('Getting vegan-friendly instruments')
    
    const instruments = await instrumentService.getVeganInstruments()

    res.json({
      success: true,
      data: instruments,
      meta: {
        total: instruments.length,
        filter: 'Vegan friendly'
      }
    })
  } catch (error) {
    logger.error('Error getting vegan instruments:', error)
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get vegan instruments'
    })
  }
})

app.get('/api/v1/instruments/:id', async (req, res) => {
  try {
    logger.info(`Getting instrument: ${req.params.id}`)
    
    const { id } = InstrumentParamsSchema.parse(req.params)
    const instrument = await instrumentService.getInstrumentById(id)

    res.json({
      success: true,
      data: instrument
    })
  } catch (error) {
    logger.error('Error getting instrument:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
        message: 'Instrument not found'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get instrument'
      })
    }
  }
})

app.put('/api/v1/instruments/:id', async (req, res) => {
  try {
    logger.info(`Updating instrument: ${req.params.id}`)
    
    const { id } = InstrumentParamsSchema.parse(req.params)
    const validatedData = InstrumentUpdateSchema.parse(req.body)
    
    const instrument = await instrumentService.updateInstrument(id, validatedData)

    res.json({
      success: true,
      data: instrument,
      message: 'Instrument updated successfully'
    })
  } catch (error) {
    logger.error('Error updating instrument:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
        message: 'Instrument not found'
      })
    } else if (error instanceof Error) {
      res.status(400).json({
        success: false,
        error: error.message,
        message: 'Failed to update instrument'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update instrument'
      })
    }
  }
})

app.delete('/api/v1/instruments/:id', async (req, res) => {
  try {
    logger.info(`Deleting instrument: ${req.params.id}`)
    
    const { id } = InstrumentParamsSchema.parse(req.params)
    await instrumentService.deleteInstrument(id)

    res.json({
      success: true,
      message: 'Instrument deleted successfully'
    })
  } catch (error) {
    logger.error('Error deleting instrument:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
        message: 'Instrument not found'
      })
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to delete instrument'
      })
    }
  }
})

// Legacy API endpoint for backwards compatibility
app.get('/api', (_, res) => {
  res.json({
    message: 'CEDEARs Manager API v1.0.0-simple',
    status: 'ready',
    timestamp: new Date().toISOString(),
    documentation: {
      v1: '/api/v1',
      health: '/api/v1/health',
      instruments: '/api/v1/instruments'
    }
  })
})

// Error handling middleware
app.use(notFoundHandler)
app.use(errorHandler)

// Initialize database and start server
async function startServer() {
  try {
    // Initialize simple database
    SimpleDatabaseConnection.getInstance()
    logger.info('✅ Database initialized')

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 CEDEARs Manager Backend (Simple) started on port ${PORT}`)
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`📊 Health check: http://localhost:${PORT}/health`)
      logger.info(`📖 API Documentation: http://localhost:${PORT}/api/v1`)
    })

    // Graceful shutdown handlers
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`)
      server.close(() => {
        logger.info('HTTP server closed')
        // Close database connection
        try {
          SimpleDatabaseConnection.close()
        } catch (error) {
          logger.error('Error closing database connection:', error)
        }
        logger.info('Process terminated')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the application
startServer()

export default app