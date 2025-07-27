#!/usr/bin/env tsx
import { InstrumentService } from '../services/InstrumentService.js';
import { createLogger } from '../utils/logger.js';
import DatabaseConnection from './connection.js';
const logger = createLogger('seed');
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
const sampleCommissionConfig = {
    broker_name: 'Banco Galicia',
    commission_rate: 0.0060, // 0.6%
    minimum_commission: 100.00,
    market_tax_rate: 0.0006, // 0.06%
    iva_rate: 0.2100, // 21%
    is_active: true,
    effective_from: new Date().toISOString().split('T')[0]
};
async function seedDatabase() {
    try {
        logger.info('🌱 Starting database seeding...');
        const instrumentService = new InstrumentService();
        const db = DatabaseConnection.getInstance();
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
        // Seed commission configuration
        logger.info('Seeding commission configuration...');
        try {
            const existingConfig = db.prepare('SELECT * FROM commission_config WHERE is_active = 1').get();
            if (existingConfig) {
                logger.info('⏭️  Active commission configuration already exists');
            }
            else {
                const stmt = db.prepare(`
          INSERT INTO commission_config (
            broker_name, commission_rate, minimum_commission, 
            market_tax_rate, iva_rate, is_active, effective_from
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
                stmt.run(sampleCommissionConfig.broker_name, sampleCommissionConfig.commission_rate, sampleCommissionConfig.minimum_commission, sampleCommissionConfig.market_tax_rate, sampleCommissionConfig.iva_rate, sampleCommissionConfig.is_active ? 1 : 0, sampleCommissionConfig.effective_from);
                logger.info('✅ Created commission configuration');
            }
        }
        catch (error) {
            logger.error('Error seeding commission configuration:', error);
        }
        logger.info(`✅ Database seeding completed successfully`);
        logger.info(`📊 Summary:`);
        logger.info(`   - Instruments created: ${createdInstruments.length}`);
        logger.info(`   - Total instruments in DB: ${sampleInstruments.length}`);
        // Close database connection
        DatabaseConnection.close();
        process.exit(0);
    }
    catch (error) {
        logger.error('❌ Database seeding failed:', error);
        DatabaseConnection.close();
        process.exit(1);
    }
}
// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedDatabase();
}
export { seedDatabase };
//# sourceMappingURL=seed.js.map