import { Request, Response, NextFunction } from 'express'

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction // eslint-disable-line no-unused-vars
): void {
  const error = {
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString()
    }
  }
  
  res.status(404).json(error)
}