#!/usr/bin/env tsx
import { SimpleInstrumentService } from './services/SimpleInstrumentService.js';
import { createLogger } from './utils/logger.js';
import SimpleDatabaseConnection from './database/simple-connection.js';
const logger = createLogger('seed-simple');
const sampleInstruments = [
    {
        symbol: 'AAPL',
        company_name: 'Apple Inc.',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        market_cap: 3000000000000,
        is_esg_compliant: true,
        is_vegan_friendly: false,
        underlying_symbol: 'AAPL',
        underlying_currency: 'USD',
        ratio: 10.0
    },
    {
        symbol: 'GOOGL',
        company_name: 'Alphabet Inc.',
        sector: 'Technology',
        industry: 'Internet Content & Information',
        market_cap: 1700000000000,
        is_esg_compliant: true,
        is_vegan_friendly: true,
        underlying_symbol: 'GOOGL',
        underlying_currency: 'USD',
        ratio: 5.0
    },
    {
        symbol: 'MSFT',
        company_name: 'Microsoft Corporation',
        sector: 'Technology',
        industry: 'Software Infrastructure',
        market_cap: 2800000000000,
        is_esg_compliant: true,
        is_vegan_friendly: true,
        underlying_symbol: 'MSFT',
        underlying_currency: 'USD',
        ratio: 4.0
    },
    {
        symbol: 'TSLA',
        company_name: 'Tesla, Inc.',
        sector: 'Automotive',
        industry: 'Electric Vehicles',
        market_cap: 800000000000,
        is_esg_compliant: true,
        is_vegan_friendly: true,
        underlying_symbol: 'TSLA',
        underlying_currency: 'USD',
        ratio: 2.0
    },
    {
        symbol: 'KO',
        company_name: 'The Coca-Cola Company',
        sector: 'Consumer Staples',
        industry: 'Beverages',
        market_cap: 250000000000,
        is_esg_compliant: false,
        is_vegan_friendly: false,
        underlying_symbol: 'KO',
        underlying_currency: 'USD',
        ratio: 5.0
    }
];
async function seedSimpleDatabase() {
    try {
        logger.info('🌱 Starting simple database seeding...');
        // Initialize database
        SimpleDatabaseConnection.getInstance();
        const instrumentService = new SimpleInstrumentService();
        // Seed instruments
        logger.info('Seeding sample instruments...');
        const createdInstruments = [];
        for (const instrumentData of sampleInstruments) {
            try {
                const existing = await instrumentService.getInstrumentBySymbol(instrumentData.symbol);
                logger.info(`⏭️  Instrument ${instrumentData.symbol} already exists`);
            }
            catch (error) {
                // Instrument doesn't exist, create it
                const instrument = await instrumentService.createInstrument(instrumentData);
                createdInstruments.push(instrument);
                logger.info(`✅ Created instrument: ${instrument.symbol}`);
            }
        }
        // Save database
        SimpleDatabaseConnection.save();
        logger.info(`✅ Simple database seeding completed successfully`);
        logger.info(`📊 Summary:`);
        logger.info(`   - Instruments created: ${createdInstruments.length}`);
        logger.info(`   - Total instruments in DB: ${sampleInstruments.length}`);
        // Close database connection
        SimpleDatabaseConnection.close();
        process.exit(0);
    }
    catch (error) {
        logger.error('❌ Simple database seeding failed:', error);
        SimpleDatabaseConnection.close();
        process.exit(1);
    }
}
// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedSimpleDatabase();
}
export { seedSimpleDatabase };
//# sourceMappingURL=seed-simple.js.map