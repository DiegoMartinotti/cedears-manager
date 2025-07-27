#!/usr/bin/env tsx

import { MigrationRunner } from './migrations.js'
import { createLogger } from '../utils/logger.js'
import DatabaseConnection from './connection.js'

const logger = createLogger('migrate')

async function main() {
  try {
    logger.info('🚀 Starting database migration process...')
    
    const migrationRunner = new MigrationRunner()
    await migrationRunner.runMigrations()
    
    logger.info('✅ Database migration completed successfully')
    
    // Close database connection
    DatabaseConnection.close()
    process.exit(0)
  } catch (error) {
    logger.error('❌ Database migration failed:', error)
    DatabaseConnection.close()
    process.exit(1)
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}