import winston from 'winston'
import path from 'path'

const logDir = process.env.LOG_DIR || './logs'

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, service }) => {
    const serviceName = service ? `[${service}]` : ''
    return `${timestamp} ${level.toUpperCase()} ${serviceName} ${stack || message}`
  })
)

// Create logger factory
export function createLogger(service?: string) {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service },
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        )
      }),
      
      // File transports for production
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    ],
    
    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log')
      })
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, 'rejections.log')
      })
    ]
  })
}

// Default logger instance
export const logger = createLogger('app')