import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
// Load environment variables
dotenv.config();
const app = express();
const logger = createLogger('server');
const PORT = process.env.PORT || 3001;
// Security and performance middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
}));
app.use(compression());
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
}));
// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Logging
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));
// Health check endpoint
app.get('/health', (_, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});
// API routes will be added here
app.get('/api', (_, res) => {
    res.json({
        message: 'CEDEARs Manager API v1.0.0',
        status: 'ready',
        timestamp: new Date().toISOString()
    });
});
// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);
// Start server
const server = app.listen(PORT, () => {
    logger.info(`🚀 CEDEARs Manager Backend started on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});
export default app;
//# sourceMappingURL=index.js.map