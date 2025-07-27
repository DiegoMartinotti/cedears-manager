#!/usr/bin/env tsx
import express from 'express';
import cors from 'cors';
import { createLogger } from './utils/logger.js';
import SimpleDatabaseConnection from './database/simple-connection.js';
import { SimpleInstrumentService } from './services/SimpleInstrumentService.js';
const logger = createLogger('minimal-test');
async function runMinimalTest() {
    logger.info('🧪 Starting minimal backend test...');
    try {
        // Test 1: Database Connection
        logger.info('Testing database connection...');
        const db = SimpleDatabaseConnection.getInstance();
        const isHealthy = SimpleDatabaseConnection.isHealthy();
        logger.info(`Database health: ${isHealthy ? 'OK' : 'FAILED'}`);
        // Test 2: Instrument Service
        logger.info('Testing instrument service...');
        const instrumentService = new SimpleInstrumentService();
        // Create test instrument
        const testInstrument = {
            symbol: 'TEST',
            company_name: 'Test Company',
            sector: 'Technology',
            is_esg_compliant: true,
            is_vegan_friendly: true
        };
        const created = await instrumentService.createInstrument(testInstrument);
        logger.info(`Created instrument: ${created.symbol} (ID: ${created.id})`);
        // Get instrument by ID
        const retrieved = await instrumentService.getInstrumentById(created.id);
        logger.info(`Retrieved instrument: ${retrieved.symbol}`);
        // Get all instruments
        const all = await instrumentService.getAllInstruments();
        logger.info(`Total instruments: ${all.length}`);
        // Test 3: Express App
        logger.info('Testing Express app...');
        const app = express();
        app.use(cors());
        app.use(express.json());
        // Simple health endpoint
        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                database: SimpleDatabaseConnection.isHealthy()
            });
        });
        // Simple instruments endpoint
        app.get('/api/instruments', async (req, res) => {
            try {
                const instruments = await instrumentService.getAllInstruments();
                res.json({
                    success: true,
                    data: instruments
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Start server
        const PORT = 3001;
        const server = app.listen(PORT, () => {
            logger.info(`✅ Test server started on port ${PORT}`);
            logger.info(`📊 Health check: http://localhost:${PORT}/health`);
            logger.info(`📋 Instruments: http://localhost:${PORT}/api/instruments`);
        });
        // Wait 2 seconds then stop
        setTimeout(() => {
            server.close(() => {
                SimpleDatabaseConnection.close();
                logger.info('✅ Minimal test completed successfully!');
                process.exit(0);
            });
        }, 2000);
    }
    catch (error) {
        logger.error('❌ Minimal test failed:', error);
        SimpleDatabaseConnection.close();
        process.exit(1);
    }
}
// Run test
runMinimalTest();
//# sourceMappingURL=minimal-test.js.map