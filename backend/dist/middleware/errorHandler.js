import { createLogger } from '../utils/logger.js';
const logger = createLogger('error-handler');
export function errorHandler(err, req, res, _) {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;
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
    });
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
        success: false,
        error: {
            message: isDevelopment ? err.message : 'Internal Server Error',
            ...(isDevelopment && { stack: err.stack }),
            statusCode,
            timestamp: new Date().toISOString()
        }
    };
    res.status(statusCode).json(errorResponse);
}
export function createError(message, statusCode = 500, isOperational = true) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = isOperational;
    return error;
}
//# sourceMappingURL=errorHandler.js.map