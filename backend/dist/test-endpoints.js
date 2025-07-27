#!/usr/bin/env tsx
import { createLogger } from './utils/logger.js';
import SimpleDatabaseConnection from './database/simple-connection.js';
import { SimpleInstrumentService } from './services/SimpleInstrumentService.js';
const logger = createLogger('test-endpoints');
async function testEndpoints() {
    try {
        logger.info('🧪 Testing backend components...');
        // Initialize database
        SimpleDatabaseConnection.getInstance();
        logger.info('✅ Database initialized');
        // Seed some test data
        const instrumentService = new SimpleInstrumentService();
        const testInstruments = [
            {
                symbol: 'AAPL',
                company_name: 'Apple Inc.',
                sector: 'Technology',
                is_esg_compliant: true,
                is_vegan_friendly: false
            },
            {
                symbol: 'GOOGL',
                company_name: 'Alphabet Inc.',
                sector: 'Technology',
                is_esg_compliant: true,
                is_vegan_friendly: true
            },
            {
                symbol: 'TSLA',
                company_name: 'Tesla, Inc.',
                sector: 'Automotive',
                is_esg_compliant: true,
                is_vegan_friendly: true
            }
        ];
        logger.info('Creating test instruments...');
        for (const instrument of testInstruments) {
            try {
                const created = await instrumentService.createInstrument(instrument);
                logger.info(`✅ Created: ${created.symbol}`);
            }
            catch (error) {
                // Might already exist, that's ok
                logger.info(`⏭️  ${instrument.symbol} already exists or error: ${error instanceof Error ? error.message : error}`);
            }
        }
        // Test all methods
        logger.info('Testing service methods...');
        // Get all instruments
        const allInstruments = await instrumentService.getAllInstruments();
        logger.info(`📋 Total instruments: ${allInstruments.length}`);
        // Get ESG instruments
        const esgInstruments = await instrumentService.getESGInstruments();
        logger.info(`🌱 ESG instruments: ${esgInstruments.length}`);
        // Get vegan instruments
        const veganInstruments = await instrumentService.getVeganInstruments();
        logger.info(`🌿 Vegan instruments: ${veganInstruments.length}`);
        // Search instruments
        const searchResults = await instrumentService.searchInstruments('Apple');
        logger.info(`🔍 Search 'Apple': ${searchResults.length} results`);
        // Test filtering
        const techInstruments = await instrumentService.getAllInstruments({ sector: 'Technology' });
        logger.info(`💻 Technology sector: ${techInstruments.length} instruments`);
        // Test update
        if (allInstruments.length > 0) {
            const firstInstrument = allInstruments[0];
            logger.info(`🔄 Testing update on ${firstInstrument.symbol}...`);
            const updated = await instrumentService.updateInstrument(firstInstrument.id, {
                market_cap: 3000000000000
            });
            logger.info(`✅ Updated market cap: ${updated.market_cap}`);
        }
        // Test health check
        const isHealthy = SimpleDatabaseConnection.isHealthy();
        logger.info(`❤️  Database health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
        // Save database
        SimpleDatabaseConnection.save();
        logger.info('💾 Database saved');
        logger.info('✅ All component tests passed!');
        // Check database file
        const fs = await import('fs');
        const path = await import('path');
        const dbPath = path.join(process.cwd(), 'database', 'simple-db.json');
        if (fs.existsSync(dbPath)) {
            const dbContent = fs.readFileSync(dbPath, 'utf8');
            const dbData = JSON.parse(dbContent);
            logger.info(`📄 Database file created with ${dbData.instruments?.length || 0} instruments`);
        }
        SimpleDatabaseConnection.close();
        logger.info('🎉 Backend testing completed successfully!');
    }
    catch (error) {
        logger.error('❌ Backend testing failed:', error);
        SimpleDatabaseConnection.close();
        process.exit(1);
    }
}
testEndpoints();
//# sourceMappingURL=test-endpoints.js.map