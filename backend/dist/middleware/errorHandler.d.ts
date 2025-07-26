import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare function errorHandler(err: AppError, req: Request, res: Response, _: NextFunction): void;
export declare function createError(message: string, statusCode?: number, isOperational?: boolean): AppError;
