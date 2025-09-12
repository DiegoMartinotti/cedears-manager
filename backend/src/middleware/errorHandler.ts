import { Request, Response, NextFunction } from 'express'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('error-handler')

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500
  const isOperational = err.isOperational || false
  
  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    isOperational,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  })
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  const errorResponse = {
    success: false,
    error: {
      message: isDevelopment ? err.message : 'Internal Server Error',
      ...(isDevelopment && { stack: err.stack }),
      statusCode,
      timestamp: new Date().toISOString()
    }
  }
  
  res.status(statusCode).json(errorResponse)
}

export function createError(message: string, statusCode = 500, isOperational = true): AppError {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = isOperational
  return error
}