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
    id: '007_create_uva_values',
    description: 'Create UVA values table for inflation adjustment tracking',
    up: `
      CREATE TABLE IF NOT EXISTS uva_values (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,
        value DECIMAL(12,6) NOT NULL,
        source VARCHAR(50) NOT NULL DEFAULT 'bcra',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE UNIQUE INDEX idx_uva_values_date ON uva_values(date);
      CREATE INDEX idx_uva_values_source ON uva_values(source);
      CREATE INDEX idx_uva_values_value ON uva_values(value);
    `,
    down: `
      DROP INDEX IF EXISTS idx_uva_values_value;
      DROP INDEX IF EXISTS idx_uva_values_source;
      DROP INDEX IF EXISTS idx_uva_values_date;
      DROP TABLE IF EXISTS uva_values;
    `
  },
  {
    id: '008_create_migrations_log',
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
  },
  {
    id: '009_create_cost_reports',
    description: 'Create cost reports table for managing report exports',
    up: `
      CREATE TABLE IF NOT EXISTS cost_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reportType VARCHAR(50) NOT NULL,
        reportDate DATE NOT NULL,
        dateRange VARCHAR(50) NOT NULL,
        reportData TEXT NOT NULL,
        generatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME,
        fileSize INTEGER,
        recordCount INTEGER,
        parameters TEXT NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('generating', 'ready', 'expired', 'error')),
        error TEXT
      );
      
      CREATE INDEX idx_cost_reports_type ON cost_reports(reportType);
      CREATE INDEX idx_cost_reports_status ON cost_reports(status);
      CREATE INDEX idx_cost_reports_date ON cost_reports(reportDate);
      CREATE INDEX idx_cost_reports_generated ON cost_reports(generatedAt);
    `,
    down: `
      DROP INDEX IF EXISTS idx_cost_reports_generated;
      DROP INDEX IF EXISTS idx_cost_reports_date;
      DROP INDEX IF EXISTS idx_cost_reports_status;
      DROP INDEX IF EXISTS idx_cost_reports_type;
      DROP TABLE IF EXISTS cost_reports;
    `
  },
  {
    id: '013_create_esg_vegan_tables',
    description: 'Create ESG and Vegan evaluation tables for automated sustainability analysis',
    up: `
      -- ESG Evaluations Table
      CREATE TABLE IF NOT EXISTS esg_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        environmental_score DECIMAL(5,2) DEFAULT 0.00,
        social_score DECIMAL(5,2) DEFAULT 0.00,
        governance_score DECIMAL(5,2) DEFAULT 0.00,
        total_score DECIMAL(5,2) DEFAULT 0.00,
        evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        data_sources TEXT,
        confidence_level DECIMAL(5,2) DEFAULT 0.00,
        next_review_date DATE,
        analysis_summary TEXT,
        key_metrics TEXT,
        controversies TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      -- Vegan Evaluations Table
      CREATE TABLE IF NOT EXISTS vegan_evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        no_animal_testing BOOLEAN DEFAULT FALSE,
        no_animal_products BOOLEAN DEFAULT FALSE,
        plant_based_focus BOOLEAN DEFAULT FALSE,
        supply_chain_vegan BOOLEAN DEFAULT FALSE,
        vegan_score DECIMAL(5,2) DEFAULT 0.00,
        evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
        certification_status VARCHAR(50),
        vegan_certifications TEXT,
        animal_testing_policy TEXT,
        supply_chain_analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      -- ESG Criteria History Table
      CREATE TABLE IF NOT EXISTS esg_criteria_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        criteria_type VARCHAR(20) NOT NULL CHECK (criteria_type IN ('ESG', 'VEGAN', 'ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE')),
        field_name VARCHAR(50) NOT NULL,
        old_value TEXT,
        new_value TEXT,
        change_date DATE NOT NULL DEFAULT CURRENT_DATE,
        change_magnitude DECIMAL(5,2),
        reason TEXT,
        source VARCHAR(100),
        confidence_level DECIMAL(5,2) DEFAULT 0.00,
        impact_level VARCHAR(10) CHECK (impact_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      -- Sustainability Reports Table
      CREATE TABLE IF NOT EXISTS sustainability_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        report_year INTEGER NOT NULL,
        report_title VARCHAR(255),
        report_url TEXT,
        report_type VARCHAR(50) DEFAULT 'SUSTAINABILITY',
        file_size INTEGER,
        page_count INTEGER,
        key_metrics TEXT,
        analysis_summary TEXT,
        extraction_confidence DECIMAL(5,2) DEFAULT 0.00,
        processing_status VARCHAR(20) DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
        processing_error TEXT,
        processed_date DATE,
        download_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      -- ESG Data Sources Table
      CREATE TABLE IF NOT EXISTS esg_data_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name VARCHAR(100) NOT NULL UNIQUE,
        source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('API', 'SCRAPING', 'MANUAL', 'REPORT')),
        source_url TEXT,
        reliability_score DECIMAL(5,2) DEFAULT 0.00,
        last_update_date DATE,
        update_frequency VARCHAR(20) DEFAULT 'WEEKLY',
        is_active BOOLEAN DEFAULT TRUE,
        rate_limit_per_day INTEGER DEFAULT 100,
        api_key_required BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for ESG Evaluations
      CREATE UNIQUE INDEX idx_esg_evaluations_instrument_date ON esg_evaluations(instrument_id, evaluation_date);
      CREATE INDEX idx_esg_evaluations_total_score ON esg_evaluations(total_score);
      CREATE INDEX idx_esg_evaluations_date ON esg_evaluations(evaluation_date);
      CREATE INDEX idx_esg_evaluations_confidence ON esg_evaluations(confidence_level);
      
      -- Indexes for Vegan Evaluations
      CREATE UNIQUE INDEX idx_vegan_evaluations_instrument_date ON vegan_evaluations(instrument_id, evaluation_date);
      CREATE INDEX idx_vegan_evaluations_score ON vegan_evaluations(vegan_score);
      CREATE INDEX idx_vegan_evaluations_date ON vegan_evaluations(evaluation_date);
      CREATE INDEX idx_vegan_evaluations_certification ON vegan_evaluations(certification_status);
      
      -- Indexes for History
      CREATE INDEX idx_esg_history_instrument ON esg_criteria_history(instrument_id);
      CREATE INDEX idx_esg_history_date ON esg_criteria_history(change_date);
      CREATE INDEX idx_esg_history_type ON esg_criteria_history(criteria_type);
      CREATE INDEX idx_esg_history_impact ON esg_criteria_history(impact_level);
      
      -- Indexes for Reports
      CREATE UNIQUE INDEX idx_sustainability_reports_instrument_year ON sustainability_reports(instrument_id, report_year);
      CREATE INDEX idx_sustainability_reports_status ON sustainability_reports(processing_status);
      CREATE INDEX idx_sustainability_reports_year ON sustainability_reports(report_year);
      
      -- Indexes for Data Sources
      CREATE INDEX idx_esg_sources_active ON esg_data_sources(is_active);
      CREATE INDEX idx_esg_sources_type ON esg_data_sources(source_type);
      CREATE INDEX idx_esg_sources_reliability ON esg_data_sources(reliability_score);

      -- Insert default data sources
      INSERT OR IGNORE INTO esg_data_sources (source_name, source_type, source_url, reliability_score, update_frequency) VALUES
      ('Yahoo Finance ESG', 'API', 'https://query1.finance.yahoo.com/v1/finance/esgChart', 85.00, 'DAILY'),
      ('Sustainalytics', 'SCRAPING', 'https://www.sustainalytics.com/', 95.00, 'WEEKLY'),
      ('MSCI ESG', 'SCRAPING', 'https://www.msci.com/our-solutions/esg-investing', 90.00, 'WEEKLY'),
      ('CDP Carbon Disclosure', 'SCRAPING', 'https://www.cdp.net/', 88.00, 'ANNUAL'),
      ('Company Reports', 'REPORT', null, 92.00, 'ANNUAL'),
      ('News Sentiment', 'API', null, 70.00, 'DAILY'),
      ('Vegan Society Database', 'SCRAPING', 'https://www.vegansociety.com/', 85.00, 'MONTHLY'),
      ('PETA Database', 'SCRAPING', 'https://www.peta.org/', 75.00, 'MONTHLY');
    `,
    down: `
      -- Drop indexes first
      DROP INDEX IF EXISTS idx_esg_sources_reliability;
      DROP INDEX IF EXISTS idx_esg_sources_type;
      DROP INDEX IF EXISTS idx_esg_sources_active;
      DROP INDEX IF EXISTS idx_sustainability_reports_year;
      DROP INDEX IF EXISTS idx_sustainability_reports_status;
      DROP INDEX IF EXISTS idx_sustainability_reports_instrument_year;
      DROP INDEX IF EXISTS idx_esg_history_impact;
      DROP INDEX IF EXISTS idx_esg_history_type;
      DROP INDEX IF EXISTS idx_esg_history_date;
      DROP INDEX IF EXISTS idx_esg_history_instrument;
      DROP INDEX IF EXISTS idx_vegan_evaluations_certification;
      DROP INDEX IF EXISTS idx_vegan_evaluations_date;
      DROP INDEX IF EXISTS idx_vegan_evaluations_score;
      DROP INDEX IF EXISTS idx_vegan_evaluations_instrument_date;
      DROP INDEX IF EXISTS idx_esg_evaluations_confidence;
      DROP INDEX IF EXISTS idx_esg_evaluations_date;
      DROP INDEX IF EXISTS idx_esg_evaluations_total_score;
      DROP INDEX IF EXISTS idx_esg_evaluations_instrument_date;
      
      -- Drop tables
      DROP TABLE IF EXISTS esg_data_sources;
      DROP TABLE IF EXISTS sustainability_reports;
      DROP TABLE IF EXISTS esg_criteria_history;
      DROP TABLE IF EXISTS vegan_evaluations;
      DROP TABLE IF EXISTS esg_evaluations;
    `
  }
]

export class MigrationRunner {
  private db = DatabaseConnection.getInstance()

  async runMigrations(): Promise<void> {
    logger.info('Starting database migrations...')
    
    // Ensure migrations log table exists
    const migrationLogMigration = migrations.find(m => m.id === '008_create_migrations_log')
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