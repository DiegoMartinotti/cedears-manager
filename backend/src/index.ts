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
import apiRoutes from './routes/index.js'

// Load environment variables
dotenv.config()

const app = express()
const logger = createLogger('server')
const PORT = process.env.PORT || 3001

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
    message: 'CEDEARs Manager Backend',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  })
})

// Mount API routes
app.use('/api/v1', apiRoutes)

// Legacy API endpoint for backwards compatibility
app.get('/api', (_, res) => {
  res.json({
    message: 'CEDEARs Manager API v1.0.0',
    status: 'ready',
    timestamp: new Date().toISOString(),
    documentation: {
      v1: '/api/v1',
      health: '/api/v1/health',
      instruments: '/api/v1/instruments',
      portfolio: '/api/v1/portfolio'
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
      logger.info(`🚀 CEDEARs Manager Backend started on port ${PORT}`)
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