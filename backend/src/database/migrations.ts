import DatabaseConnection from './connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('migrations')

export interface Migration {
  id: string
  description: string
  up: string
  down: string
}

export const migrations: Migration[] = [
  {
    id: '001_create_instruments',
    description: 'Create instruments table for CEDEARs tracking',
    up: `
      CREATE TABLE IF NOT EXISTS instruments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol VARCHAR(10) NOT NULL UNIQUE,
        company_name VARCHAR(255) NOT NULL,
        sector VARCHAR(100),
        industry VARCHAR(100),
        market_cap DECIMAL(15,2),
        is_esg_compliant BOOLEAN DEFAULT FALSE,
        is_vegan_friendly BOOLEAN DEFAULT FALSE,
        underlying_symbol VARCHAR(10),
        underlying_currency VARCHAR(3) DEFAULT 'USD',
        ratio DECIMAL(10,4) DEFAULT 1.0000,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_instruments_symbol ON instruments(symbol);
      CREATE INDEX idx_instruments_esg ON instruments(is_esg_compliant);
      CREATE INDEX idx_instruments_vegan ON instruments(is_vegan_friendly);
      CREATE INDEX idx_instruments_active ON instruments(is_active);
    `,
    down: `
      DROP INDEX IF EXISTS idx_instruments_active;
      DROP INDEX IF EXISTS idx_instruments_vegan;
      DROP INDEX IF EXISTS idx_instruments_esg;
      DROP INDEX IF EXISTS idx_instruments_symbol;
      DROP TABLE IF EXISTS instruments;
    `
  },
  {
    id: '002_create_portfolio_positions',
    description: 'Create portfolio positions table for tracking holdings',
    up: `
      CREATE TABLE IF NOT EXISTS portfolio_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        quantity DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
        average_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
        total_cost DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );
      
      CREATE UNIQUE INDEX idx_portfolio_positions_instrument ON portfolio_positions(instrument_id);
      CREATE INDEX idx_portfolio_positions_quantity ON portfolio_positions(quantity);
    `,
    down: `
      DROP INDEX IF EXISTS idx_portfolio_positions_quantity;
      DROP INDEX IF EXISTS idx_portfolio_positions_instrument;
      DROP TABLE IF EXISTS portfolio_positions;
    `
  },
  {
    id: '003_create_trades',
    description: 'Create trades table for transaction history',
    up: `
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        type VARCHAR(4) NOT NULL CHECK (type IN ('BUY', 'SELL')),
        quantity DECIMAL(15,4) NOT NULL,
        price DECIMAL(10,4) NOT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        commission DECIMAL(10,2) DEFAULT 0.00,
        taxes DECIMAL(10,2) DEFAULT 0.00,
        net_amount DECIMAL(15,2) NOT NULL,
        trade_date DATE NOT NULL,
        settlement_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );
      
      CREATE INDEX idx_trades_instrument ON trades(instrument_id);
      CREATE INDEX idx_trades_type ON trades(type);
      CREATE INDEX idx_trades_date ON trades(trade_date);
      CREATE INDEX idx_trades_created ON trades(created_at);
    `,
    down: `
      DROP INDEX IF EXISTS idx_trades_created;
      DROP INDEX IF EXISTS idx_trades_date;
      DROP INDEX IF EXISTS idx_trades_type;
      DROP INDEX IF EXISTS idx_trades_instrument;
      DROP TABLE IF EXISTS trades;
    `
  },
  {
    id: '004_create_quotes',
    description: 'Create quotes table for price history',
    up: `
      CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        price DECIMAL(10,4) NOT NULL,
        volume INTEGER DEFAULT 0,
        high DECIMAL(10,4),
        low DECIMAL(10,4),
        close DECIMAL(10,4),
        quote_date DATE NOT NULL,
        quote_time TIME,
        source VARCHAR(50) DEFAULT 'yahoo_finance',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );
      
      CREATE UNIQUE INDEX idx_quotes_instrument_date ON quotes(instrument_id, quote_date);
      CREATE INDEX idx_quotes_date ON quotes(quote_date);
      CREATE INDEX idx_quotes_price ON quotes(price);
    `,
    down: `
      DROP INDEX IF EXISTS idx_quotes_price;
      DROP INDEX IF EXISTS idx_quotes_date;
      DROP INDEX IF EXISTS idx_quotes_instrument_date;
      DROP TABLE IF EXISTS quotes;
    `
  },
  {
    id: '005_create_commission_config',
    description: 'Create commission configuration table',
    up: `
      CREATE TABLE IF NOT EXISTS commission_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        broker_name VARCHAR(100) NOT NULL DEFAULT 'Banco Galicia',
        commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0060,
        minimum_commission DECIMAL(10,2) NOT NULL DEFAULT 100.00,
        market_tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0006,
        iva_rate DECIMAL(5,4) NOT NULL DEFAULT 0.2100,
        is_active BOOLEAN DEFAULT TRUE,
        effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_commission_config_active ON commission_config(is_active);
      CREATE INDEX idx_commission_config_date ON commission_config(effective_from);
    `,
    down: `
      DROP INDEX IF EXISTS idx_commission_config_date;
      DROP INDEX IF EXISTS idx_commission_config_active;
      DROP TABLE IF EXISTS commission_config;
    `
  },
  {
    id: '006_create_financial_goals',
    description: 'Create financial goals table',
    up: `
      CREATE TABLE IF NOT EXISTS financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_amount DECIMAL(15,2) NOT NULL,
        current_amount DECIMAL(15,2) DEFAULT 0.00,
        target_date DATE NOT NULL,
        monthly_contribution DECIMAL(10,2) DEFAULT 0.00,
        expected_return_rate DECIMAL(5,4) DEFAULT 0.1500,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_financial_goals_active ON financial_goals(is_active);
      CREATE INDEX idx_financial_goals_target_date ON financial_goals(target_date);
    `,
    down: `
      DROP INDEX IF EXISTS idx_financial_goals_target_date;
      DROP INDEX IF EXISTS idx_financial_goals_active;
      DROP TABLE IF EXISTS financial_goals;
    `
  },
  {
    id: '007_create_migrations_log',
    description: 'Create migrations log table for tracking applied migrations',
    up: `
      CREATE TABLE IF NOT EXISTS migrations_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id VARCHAR(255) NOT NULL UNIQUE,
        description VARCHAR(500),
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: `
      DROP TABLE IF EXISTS migrations_log;
    `
  }
]

export class MigrationRunner {
  private db = DatabaseConnection.getInstance()

  async runMigrations(): Promise<void> {
    logger.info('Starting database migrations...')
    
    // Ensure migrations log table exists
    const migrationLogMigration = migrations.find(m => m.id === '007_create_migrations_log')
    if (migrationLogMigration) {
      this.db.exec(migrationLogMigration.up)
    }

    const appliedMigrations = this.getAppliedMigrations()
    
    for (const migration of migrations) {
      if (!appliedMigrations.includes(migration.id)) {
        logger.info(`Applying migration: ${migration.id} - ${migration.description}`)
        
        try {
          this.db.exec(migration.up)
          this.logMigration(migration.id, migration.description)
          logger.info(`✅ Migration ${migration.id} applied successfully`)
        } catch (error) {
          logger.error(`❌ Failed to apply migration ${migration.id}:`, error)
          throw error
        }
      } else {
        logger.info(`⏭️  Migration ${migration.id} already applied`)
      }
    }
    
    logger.info('All migrations completed successfully')
  }

  private getAppliedMigrations(): string[] {
    try {
      const stmt = this.db.prepare('SELECT migration_id FROM migrations_log ORDER BY applied_at')
      const results = stmt.all() as { migration_id: string }[]
      return results.map(r => r.migration_id)
    } catch (error) {
      // migrations_log table doesn't exist yet
      return []
    }
  }

  private logMigration(migrationId: string, description: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO migrations_log (migration_id, description) 
      VALUES (?, ?)
    `)
    stmt.run(migrationId, description)
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    const migration = migrations.find(m => m.id === migrationId)
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`)
    }

    logger.info(`Rolling back migration: ${migrationId}`)
    
    try {
      this.db.exec(migration.down)
      
      // Remove from migrations log
      const stmt = this.db.prepare('DELETE FROM migrations_log WHERE migration_id = ?')
      stmt.run(migrationId)
      
      logger.info(`✅ Migration ${migrationId} rolled back successfully`)
    } catch (error) {
      logger.error(`❌ Failed to rollback migration ${migrationId}:`, error)
      throw error
    }
  }
}