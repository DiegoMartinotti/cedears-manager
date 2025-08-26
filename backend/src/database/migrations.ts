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
  },
  {
    id: '015_create_monthly_review_tables',
    description: 'Create monthly review system tables for automated watchlist management',
    up: `
      -- Monthly Reviews Main Table
      CREATE TABLE IF NOT EXISTS monthly_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
        total_instruments_scanned INTEGER DEFAULT 0,
        new_instruments_found INTEGER DEFAULT 0,
        removed_instruments INTEGER DEFAULT 0,
        updated_instruments INTEGER DEFAULT 0,
        pending_approvals INTEGER DEFAULT 0,
        auto_approved INTEGER DEFAULT 0,
        user_rejected INTEGER DEFAULT 0,
        scan_started_at DATETIME,
        scan_completed_at DATETIME,
        user_review_started_at DATETIME,
        user_review_completed_at DATETIME,
        summary TEXT, -- JSON string
        errors TEXT, -- JSON string
        claude_report TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Watchlist Changes Table
      CREATE TABLE IF NOT EXISTS watchlist_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        action VARCHAR(10) NOT NULL CHECK (action IN ('ADD', 'REMOVE', 'UPDATE')),
        reason TEXT NOT NULL,
        claude_confidence DECIMAL(5,2) NOT NULL,
        user_approved INTEGER, -- null = pending, 1 = approved, 0 = rejected
        change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        review_id INTEGER,
        old_data TEXT, -- JSON string
        new_data TEXT, -- JSON string
        metadata TEXT, -- JSON string
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE,
        FOREIGN KEY (review_id) REFERENCES monthly_reviews(id) ON DELETE CASCADE
      );

      -- Instrument Candidates Table (for additions)
      CREATE TABLE IF NOT EXISTS instrument_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(255),
        market VARCHAR(50),
        sector VARCHAR(100),
        market_cap DECIMAL(15,2),
        avg_volume DECIMAL(15,0),
        esg_score DECIMAL(5,2),
        vegan_score DECIMAL(5,2),
        claude_analysis TEXT, -- JSON string
        recommendation VARCHAR(20) NOT NULL CHECK (recommendation IN ('STRONG_ADD', 'ADD', 'CONSIDER', 'REJECT')),
        confidence_score DECIMAL(5,2) NOT NULL,
        reasons TEXT, -- JSON string
        discovered_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        review_id INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ADDED')),
        user_decision_date DATETIME,
        user_notes TEXT,
        FOREIGN KEY (review_id) REFERENCES monthly_reviews(id) ON DELETE CASCADE
      );

      -- Removal Candidates Table (for removals)
      CREATE TABLE IF NOT EXISTS removal_candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        lost_criteria TEXT, -- JSON string
        current_esg_score DECIMAL(5,2),
        current_vegan_score DECIMAL(5,2),
        previous_esg_score DECIMAL(5,2),
        previous_vegan_score DECIMAL(5,2),
        claude_analysis TEXT, -- JSON string
        recommendation VARCHAR(20) NOT NULL CHECK (recommendation IN ('REMOVE_IMMEDIATELY', 'REMOVE', 'MONITOR', 'KEEP')),
        confidence_score DECIMAL(5,2) NOT NULL,
        discovered_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        review_id INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')),
        user_decision_date DATETIME,
        user_notes TEXT,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE,
        FOREIGN KEY (review_id) REFERENCES monthly_reviews(id) ON DELETE CASCADE
      );

      -- Review Settings Table (configuration)
      CREATE TABLE IF NOT EXISTS review_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        description TEXT,
        data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
        is_editable BOOLEAN DEFAULT TRUE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for performance
      CREATE INDEX idx_monthly_reviews_date ON monthly_reviews(review_date);
      CREATE INDEX idx_monthly_reviews_status ON monthly_reviews(status);
      CREATE UNIQUE INDEX idx_monthly_reviews_date_unique ON monthly_reviews(review_date);
      
      CREATE INDEX idx_watchlist_changes_instrument ON watchlist_changes(instrument_id);
      CREATE INDEX idx_watchlist_changes_review ON watchlist_changes(review_id);
      CREATE INDEX idx_watchlist_changes_action ON watchlist_changes(action);
      CREATE INDEX idx_watchlist_changes_date ON watchlist_changes(change_date);
      CREATE INDEX idx_watchlist_changes_user_approved ON watchlist_changes(user_approved);
      
      CREATE INDEX idx_instrument_candidates_symbol ON instrument_candidates(symbol);
      CREATE INDEX idx_instrument_candidates_review ON instrument_candidates(review_id);
      CREATE INDEX idx_instrument_candidates_recommendation ON instrument_candidates(recommendation);
      CREATE INDEX idx_instrument_candidates_status ON instrument_candidates(status);
      CREATE INDEX idx_instrument_candidates_confidence ON instrument_candidates(confidence_score);
      
      CREATE INDEX idx_removal_candidates_instrument ON removal_candidates(instrument_id);
      CREATE INDEX idx_removal_candidates_review ON removal_candidates(review_id);
      CREATE INDEX idx_removal_candidates_recommendation ON removal_candidates(recommendation);
      CREATE INDEX idx_removal_candidates_status ON removal_candidates(status);
      CREATE INDEX idx_removal_candidates_severity ON removal_candidates(severity);
      CREATE INDEX idx_removal_candidates_confidence ON removal_candidates(confidence_score);
      
      CREATE UNIQUE INDEX idx_review_settings_key ON review_settings(setting_key);

      -- Insert default settings
      INSERT OR IGNORE INTO review_settings (setting_key, setting_value, description, data_type) VALUES
      ('max_instruments_limit', '100', 'Maximum number of instruments in watchlist', 'number'),
      ('min_confidence_auto_approve', '90.0', 'Minimum confidence score for auto-approval', 'number'),
      ('review_day_of_month', '1', 'Day of month to run review (1-28)', 'number'),
      ('review_hour', '6', 'Hour of day to run review (0-23)', 'number'),
      ('enable_auto_approval', 'true', 'Enable automatic approval of high-confidence changes', 'boolean'),
      ('esg_min_score_threshold', '70.0', 'Minimum ESG score for inclusion', 'number'),
      ('vegan_min_score_threshold', '80.0', 'Minimum Vegan score for inclusion', 'number'),
      ('market_cap_min_threshold', '1000000000', 'Minimum market cap in USD', 'number'),
      ('volume_min_threshold', '100000', 'Minimum average daily volume', 'number'),
      ('remove_on_criteria_loss', 'true', 'Auto-remove instruments that lose ESG/Vegan criteria', 'boolean'),
      ('notification_types', '["REVIEW_STARTED", "APPROVAL_NEEDED", "REVIEW_COMPLETED"]', 'Types of notifications to send', 'json'),
      ('backup_before_changes', 'true', 'Create backup before applying changes', 'boolean');
    `,
    down: `
      -- Drop indexes first
      DROP INDEX IF EXISTS idx_review_settings_key;
      DROP INDEX IF EXISTS idx_removal_candidates_confidence;
      DROP INDEX IF EXISTS idx_removal_candidates_severity;
      DROP INDEX IF EXISTS idx_removal_candidates_status;
      DROP INDEX IF EXISTS idx_removal_candidates_recommendation;
      DROP INDEX IF EXISTS idx_removal_candidates_review;
      DROP INDEX IF EXISTS idx_removal_candidates_instrument;
      DROP INDEX IF EXISTS idx_instrument_candidates_confidence;
      DROP INDEX IF EXISTS idx_instrument_candidates_status;
      DROP INDEX IF EXISTS idx_instrument_candidates_recommendation;
      DROP INDEX IF EXISTS idx_instrument_candidates_review;
      DROP INDEX IF EXISTS idx_instrument_candidates_symbol;
      DROP INDEX IF EXISTS idx_watchlist_changes_user_approved;
      DROP INDEX IF EXISTS idx_watchlist_changes_date;
      DROP INDEX IF EXISTS idx_watchlist_changes_action;
      DROP INDEX IF EXISTS idx_watchlist_changes_review;
      DROP INDEX IF EXISTS idx_watchlist_changes_instrument;
      DROP INDEX IF EXISTS idx_monthly_reviews_date_unique;
      DROP INDEX IF EXISTS idx_monthly_reviews_status;
      DROP INDEX IF EXISTS idx_monthly_reviews_date;
      
      -- Drop tables
      DROP TABLE IF EXISTS review_settings;
      DROP TABLE IF EXISTS removal_candidates;
      DROP TABLE IF EXISTS instrument_candidates;
      DROP TABLE IF EXISTS watchlist_changes;
      DROP TABLE IF EXISTS monthly_reviews;
    `
  },
  {
    id: '016_create_sector_balance_tables',
    description: 'Create tables for sector balance analysis and GICS classification',
    up: `
      -- Sector classifications table
      CREATE TABLE IF NOT EXISTS sector_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_id INTEGER UNIQUE NOT NULL,
        gics_sector VARCHAR(100) NOT NULL,
        gics_industry_group VARCHAR(100),
        gics_industry VARCHAR(100),
        gics_sub_industry VARCHAR(100),
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        source VARCHAR(50) DEFAULT 'AUTO',
        confidence_score DECIMAL(5,2) DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );
      
      -- Sector balance targets configuration
      CREATE TABLE IF NOT EXISTS sector_balance_targets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector VARCHAR(100) UNIQUE NOT NULL,
        target_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        min_percentage DECIMAL(5,2) NOT NULL DEFAULT 3.00,
        max_percentage DECIMAL(5,2) NOT NULL DEFAULT 25.00,
        priority INTEGER DEFAULT 3,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Historical sector balance analysis
      CREATE TABLE IF NOT EXISTS sector_balance_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_date DATE NOT NULL,
        sector VARCHAR(100) NOT NULL,
        current_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        target_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        deviation DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        recommendation TEXT,
        action_required VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'LOW',
        total_value DECIMAL(15,2) DEFAULT 0.00,
        instrument_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Concentration alerts
      CREATE TABLE IF NOT EXISTS concentration_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sector VARCHAR(100) NOT NULL,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        current_percentage DECIMAL(5,2) NOT NULL,
        threshold_percentage DECIMAL(5,2) NOT NULL,
        message TEXT NOT NULL,
        action_required TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Rebalancing suggestions
      CREATE TABLE IF NOT EXISTS rebalancing_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_date DATE NOT NULL,
        sector VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL, -- REDUCE, INCREASE, MAINTAIN
        current_allocation DECIMAL(5,2) NOT NULL,
        suggested_allocation DECIMAL(5,2) NOT NULL,
        amount_to_adjust DECIMAL(15,2) NOT NULL,
        suggested_instruments TEXT, -- JSON array of instrument symbols
        reasoning TEXT,
        priority INTEGER DEFAULT 3,
        impact_score DECIMAL(5,2) DEFAULT 0.00,
        is_implemented BOOLEAN DEFAULT FALSE,
        implemented_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for performance
      CREATE INDEX idx_sector_classifications_instrument ON sector_classifications(instrument_id);
      CREATE INDEX idx_sector_classifications_sector ON sector_classifications(gics_sector);
      CREATE INDEX idx_sector_classifications_updated ON sector_classifications(last_updated);
      
      CREATE INDEX idx_sector_balance_targets_sector ON sector_balance_targets(sector);
      CREATE INDEX idx_sector_balance_targets_active ON sector_balance_targets(is_active);
      
      CREATE INDEX idx_sector_balance_history_date ON sector_balance_history(analysis_date);
      CREATE INDEX idx_sector_balance_history_sector ON sector_balance_history(sector);
      CREATE INDEX idx_sector_balance_history_priority ON sector_balance_history(priority);
      
      CREATE INDEX idx_concentration_alerts_active ON concentration_alerts(is_active);
      CREATE INDEX idx_concentration_alerts_severity ON concentration_alerts(severity);
      CREATE INDEX idx_concentration_alerts_sector ON concentration_alerts(sector);
      CREATE INDEX idx_concentration_alerts_created ON concentration_alerts(created_at);
      
      CREATE INDEX idx_rebalancing_suggestions_date ON rebalancing_suggestions(analysis_date);
      CREATE INDEX idx_rebalancing_suggestions_sector ON rebalancing_suggestions(sector);
      CREATE INDEX idx_rebalancing_suggestions_priority ON rebalancing_suggestions(priority);
      CREATE INDEX idx_rebalancing_suggestions_implemented ON rebalancing_suggestions(is_implemented);
      
      -- Insert default sector balance targets (GICS Level 1 Sectors)
      INSERT OR IGNORE INTO sector_balance_targets (sector, target_percentage, min_percentage, max_percentage, priority) VALUES
        ('Energy', 8.00, 3.00, 15.00, 4),
        ('Materials', 7.00, 3.00, 12.00, 4),
        ('Industrials', 10.00, 5.00, 18.00, 3),
        ('Consumer Discretionary', 12.00, 5.00, 20.00, 2),
        ('Consumer Staples', 8.00, 4.00, 15.00, 3),
        ('Health Care', 15.00, 8.00, 25.00, 1),
        ('Financials', 12.00, 5.00, 20.00, 2),
        ('Information Technology', 25.00, 10.00, 30.00, 1),
        ('Communication Services', 8.00, 3.00, 15.00, 3),
        ('Utilities', 4.00, 2.00, 8.00, 5),
        ('Real Estate', 5.00, 2.00, 10.00, 4);
    `,
    down: `
      -- Drop indexes
      DROP INDEX IF EXISTS idx_rebalancing_suggestions_implemented;
      DROP INDEX IF EXISTS idx_rebalancing_suggestions_priority;
      DROP INDEX IF EXISTS idx_rebalancing_suggestions_sector;
      DROP INDEX IF EXISTS idx_rebalancing_suggestions_date;
      
      DROP INDEX IF EXISTS idx_concentration_alerts_created;
      DROP INDEX IF EXISTS idx_concentration_alerts_sector;
      DROP INDEX IF EXISTS idx_concentration_alerts_severity;
      DROP INDEX IF EXISTS idx_concentration_alerts_active;
      
      DROP INDEX IF EXISTS idx_sector_balance_history_priority;
      DROP INDEX IF EXISTS idx_sector_balance_history_sector;
      DROP INDEX IF EXISTS idx_sector_balance_history_date;
      
      DROP INDEX IF EXISTS idx_sector_balance_targets_active;
      DROP INDEX IF EXISTS idx_sector_balance_targets_sector;
      
      DROP INDEX IF EXISTS idx_sector_classifications_updated;
      DROP INDEX IF EXISTS idx_sector_classifications_sector;
      DROP INDEX IF EXISTS idx_sector_classifications_instrument;
      
      -- Drop tables
      DROP TABLE IF EXISTS rebalancing_suggestions;
      DROP TABLE IF EXISTS concentration_alerts;
      DROP TABLE IF EXISTS sector_balance_history;
      DROP TABLE IF EXISTS sector_balance_targets;
      DROP TABLE IF EXISTS sector_classifications;
    `
  },
  {
    id: '017_create_benchmark_tables',
    description: 'Create benchmark tables for portfolio performance comparison',
    up: `
      -- Benchmark Indices Table
      CREATE TABLE IF NOT EXISTS benchmark_indices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        country VARCHAR(10) DEFAULT 'US',
        currency VARCHAR(3) DEFAULT 'USD',
        category VARCHAR(50) NOT NULL, -- 'EQUITY', 'BOND', 'COMMODITY', 'CURRENCY'
        subcategory VARCHAR(100), -- 'LARGE_CAP', 'SMALL_CAP', 'EMERGING_MARKETS', etc
        data_source VARCHAR(50) NOT NULL DEFAULT 'yahoo',
        is_active BOOLEAN DEFAULT TRUE,
        update_frequency VARCHAR(20) DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY
        last_update DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Benchmark Historical Data Table
      CREATE TABLE IF NOT EXISTS benchmark_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        benchmark_id INTEGER NOT NULL,
        date DATE NOT NULL,
        open_price DECIMAL(12,4),
        high_price DECIMAL(12,4),
        low_price DECIMAL(12,4),
        close_price DECIMAL(12,4) NOT NULL,
        volume BIGINT DEFAULT 0,
        adjusted_close DECIMAL(12,4),
        dividend_amount DECIMAL(8,4) DEFAULT 0.00,
        split_coefficient DECIMAL(8,4) DEFAULT 1.0000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (benchmark_id) REFERENCES benchmark_indices(id) ON DELETE CASCADE
      );

      -- Portfolio Benchmark Comparisons Table
      CREATE TABLE IF NOT EXISTS portfolio_benchmark_comparisons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comparison_date DATE NOT NULL,
        benchmark_id INTEGER NOT NULL,
        portfolio_return DECIMAL(8,4) NOT NULL, -- Daily/Period return %
        benchmark_return DECIMAL(8,4) NOT NULL, -- Benchmark return %
        outperformance DECIMAL(8,4) NOT NULL, -- Portfolio - Benchmark
        portfolio_value DECIMAL(15,2) NOT NULL,
        benchmark_normalized_value DECIMAL(15,2) NOT NULL,
        period_type VARCHAR(20) DEFAULT 'DAILY', -- DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
        volatility_portfolio DECIMAL(8,4),
        volatility_benchmark DECIMAL(8,4),
        correlation DECIMAL(6,4), -- Correlation coefficient
        beta DECIMAL(8,4), -- Portfolio beta vs benchmark
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (benchmark_id) REFERENCES benchmark_indices(id) ON DELETE CASCADE
      );

      -- Performance Metrics Table
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calculation_date DATE NOT NULL,
        benchmark_id INTEGER,
        period_days INTEGER NOT NULL, -- 30, 90, 180, 365, etc
        portfolio_return DECIMAL(8,4) NOT NULL,
        benchmark_return DECIMAL(8,4),
        excess_return DECIMAL(8,4), -- Portfolio - Benchmark
        portfolio_volatility DECIMAL(8,4) NOT NULL,
        benchmark_volatility DECIMAL(8,4),
        sharpe_ratio DECIMAL(8,4),
        information_ratio DECIMAL(8,4), -- Excess return / tracking error
        tracking_error DECIMAL(8,4), -- Std dev of excess returns
        max_drawdown DECIMAL(8,4), -- Maximum peak-to-trough decline
        calmar_ratio DECIMAL(8,4), -- Annual return / max drawdown
        sortino_ratio DECIMAL(8,4), -- Return / downside deviation
        alpha DECIMAL(8,4), -- Jensen's alpha
        beta DECIMAL(8,4), -- Systematic risk measure
        r_squared DECIMAL(6,4), -- R² correlation
        var_95 DECIMAL(8,4), -- Value at Risk 95%
        var_99 DECIMAL(8,4), -- Value at Risk 99%
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (benchmark_id) REFERENCES benchmark_indices(id) ON DELETE SET NULL
      );

      -- Risk-Free Rate Table (for Sharpe ratio calculations)
      CREATE TABLE IF NOT EXISTS risk_free_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL UNIQUE,
        country VARCHAR(10) NOT NULL DEFAULT 'AR',
        rate_type VARCHAR(50) NOT NULL DEFAULT 'TREASURY_30D', -- TREASURY_30D, TREASURY_90D, LEBAC, etc
        annual_rate DECIMAL(8,4) NOT NULL, -- Annual rate %
        daily_rate DECIMAL(8,6) NOT NULL, -- Daily rate %
        source VARCHAR(50) DEFAULT 'BCRA',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Benchmark Performance Summary Table (for quick lookups)
      CREATE TABLE IF NOT EXISTS benchmark_performance_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        benchmark_id INTEGER NOT NULL,
        summary_date DATE NOT NULL,
        period VARCHAR(20) NOT NULL, -- 1D, 1W, 1M, 3M, 6M, 1Y, YTD, ALL
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        start_value DECIMAL(12,4) NOT NULL,
        end_value DECIMAL(12,4) NOT NULL,
        total_return DECIMAL(8,4) NOT NULL, -- Total return %
        annualized_return DECIMAL(8,4), -- Annualized return %
        volatility DECIMAL(8,4), -- Annualized volatility %
        max_drawdown DECIMAL(8,4),
        best_day DECIMAL(8,4), -- Best daily return
        worst_day DECIMAL(8,4), -- Worst daily return
        positive_days INTEGER, -- Count of positive days
        negative_days INTEGER, -- Count of negative days
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (benchmark_id) REFERENCES benchmark_indices(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX idx_benchmark_indices_symbol ON benchmark_indices(symbol);
      CREATE INDEX idx_benchmark_indices_category ON benchmark_indices(category);
      CREATE INDEX idx_benchmark_indices_active ON benchmark_indices(is_active);
      CREATE INDEX idx_benchmark_indices_country ON benchmark_indices(country);

      CREATE UNIQUE INDEX idx_benchmark_data_unique ON benchmark_data(benchmark_id, date);
      CREATE INDEX idx_benchmark_data_date ON benchmark_data(date);
      CREATE INDEX idx_benchmark_data_close_price ON benchmark_data(close_price);

      CREATE UNIQUE INDEX idx_portfolio_comparisons_unique ON portfolio_benchmark_comparisons(comparison_date, benchmark_id, period_type);
      CREATE INDEX idx_portfolio_comparisons_date ON portfolio_benchmark_comparisons(comparison_date);
      CREATE INDEX idx_portfolio_comparisons_benchmark ON portfolio_benchmark_comparisons(benchmark_id);
      CREATE INDEX idx_portfolio_comparisons_period ON portfolio_benchmark_comparisons(period_type);

      CREATE UNIQUE INDEX idx_performance_metrics_unique ON performance_metrics(calculation_date, benchmark_id, period_days);
      CREATE INDEX idx_performance_metrics_date ON performance_metrics(calculation_date);
      CREATE INDEX idx_performance_metrics_period ON performance_metrics(period_days);
      CREATE INDEX idx_performance_metrics_sharpe ON performance_metrics(sharpe_ratio);

      CREATE INDEX idx_risk_free_rates_date ON risk_free_rates(date);
      CREATE INDEX idx_risk_free_rates_country ON risk_free_rates(country);
      CREATE INDEX idx_risk_free_rates_type ON risk_free_rates(rate_type);

      CREATE UNIQUE INDEX idx_benchmark_summary_unique ON benchmark_performance_summary(benchmark_id, summary_date, period);
      CREATE INDEX idx_benchmark_summary_date ON benchmark_performance_summary(summary_date);
      CREATE INDEX idx_benchmark_summary_period ON benchmark_performance_summary(period);
      CREATE INDEX idx_benchmark_summary_return ON benchmark_performance_summary(total_return);

      -- Insert default benchmark indices
      INSERT OR IGNORE INTO benchmark_indices (symbol, name, description, country, currency, category, subcategory, data_source) VALUES
        ('SPY', 'SPDR S&P 500 ETF', 'S&P 500 Index tracking ETF', 'US', 'USD', 'EQUITY', 'LARGE_CAP', 'yahoo'),
        ('QQQ', 'Invesco QQQ Trust', 'NASDAQ-100 Index tracking ETF', 'US', 'USD', 'EQUITY', 'TECH_LARGE_CAP', 'yahoo'),
        ('IWM', 'iShares Russell 2000 ETF', 'Russell 2000 Small Cap Index', 'US', 'USD', 'EQUITY', 'SMALL_CAP', 'yahoo'),
        ('EFA', 'iShares MSCI EAFE ETF', 'MSCI EAFE International Index', 'INTL', 'USD', 'EQUITY', 'DEVELOPED_MARKETS', 'yahoo'),
        ('EEM', 'iShares MSCI Emerging Markets', 'MSCI Emerging Markets Index', 'EM', 'USD', 'EQUITY', 'EMERGING_MARKETS', 'yahoo'),
        ('AGG', 'iShares Core US Aggregate Bond', 'US Aggregate Bond Index', 'US', 'USD', 'BOND', 'AGGREGATE', 'yahoo'),
        ('GLD', 'SPDR Gold Shares', 'Gold commodity tracking', 'GLOBAL', 'USD', 'COMMODITY', 'PRECIOUS_METALS', 'yahoo'),
        ('VTI', 'Vanguard Total Stock Market', 'Total US Stock Market Index', 'US', 'USD', 'EQUITY', 'TOTAL_MARKET', 'yahoo'),
        ('^MERV', 'MERVAL Index', 'Buenos Aires Stock Exchange Index', 'AR', 'ARS', 'EQUITY', 'ARGENTINA', 'yahoo'),
        ('MELI', 'MercadoLibre Inc', 'Leading Latin American e-commerce', 'LATAM', 'USD', 'EQUITY', 'TECH_LARGE_CAP', 'yahoo');

      -- Insert default risk-free rates (Argentina)
      INSERT OR IGNORE INTO risk_free_rates (date, country, rate_type, annual_rate, daily_rate, source) 
      VALUES (DATE('now'), 'AR', 'TREASURY_30D', 85.00, 0.2329, 'BCRA');
    `,
    down: `
      -- Drop indexes
      DROP INDEX IF EXISTS idx_benchmark_summary_return;
      DROP INDEX IF EXISTS idx_benchmark_summary_period;
      DROP INDEX IF EXISTS idx_benchmark_summary_date;
      DROP INDEX IF EXISTS idx_benchmark_summary_unique;
      DROP INDEX IF EXISTS idx_risk_free_rates_type;
      DROP INDEX IF EXISTS idx_risk_free_rates_country;
      DROP INDEX IF EXISTS idx_risk_free_rates_date;
      DROP INDEX IF EXISTS idx_performance_metrics_sharpe;
      DROP INDEX IF EXISTS idx_performance_metrics_period;
      DROP INDEX IF EXISTS idx_performance_metrics_date;
      DROP INDEX IF EXISTS idx_performance_metrics_unique;
      DROP INDEX IF EXISTS idx_portfolio_comparisons_period;
      DROP INDEX IF EXISTS idx_portfolio_comparisons_benchmark;
      DROP INDEX IF EXISTS idx_portfolio_comparisons_date;
      DROP INDEX IF EXISTS idx_portfolio_comparisons_unique;
      DROP INDEX IF EXISTS idx_benchmark_data_close_price;
      DROP INDEX IF EXISTS idx_benchmark_data_date;
      DROP INDEX IF EXISTS idx_benchmark_data_unique;
      DROP INDEX IF EXISTS idx_benchmark_indices_country;
      DROP INDEX IF EXISTS idx_benchmark_indices_active;
      DROP INDEX IF EXISTS idx_benchmark_indices_category;
      DROP INDEX IF EXISTS idx_benchmark_indices_symbol;
      
      -- Drop tables
      DROP TABLE IF EXISTS benchmark_performance_summary;
      DROP TABLE IF EXISTS risk_free_rates;
      DROP TABLE IF EXISTS performance_metrics;
      DROP TABLE IF EXISTS portfolio_benchmark_comparisons;
      DROP TABLE IF EXISTS benchmark_data;
      DROP TABLE IF EXISTS benchmark_indices;
    `
  },
  {
    id: '018_create_scenario_simulation_tables',
    description: 'Create scenario simulation tables for what-if analysis',
    up: `
      -- Scenario Definitions Table
      CREATE TABLE IF NOT EXISTS scenario_definitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) NOT NULL DEFAULT 'CUSTOM', -- MACRO, MARKET, SECTOR, CUSTOM
        is_predefined BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by VARCHAR(50) DEFAULT 'USER',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Scenario Variables Table
      CREATE TABLE IF NOT EXISTS scenario_variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id INTEGER NOT NULL,
        variable_type VARCHAR(50) NOT NULL, -- INFLATION, DOLLAR_RATE, INTEREST_RATE, MARKET_CRASH, SECTOR_GROWTH, etc
        variable_name VARCHAR(100) NOT NULL,
        current_value DECIMAL(12,4),
        scenario_value DECIMAL(12,4) NOT NULL,
        change_percentage DECIMAL(8,4),
        impact_duration_months INTEGER DEFAULT 12,
        ramp_up_months INTEGER DEFAULT 0, -- Gradual change over time
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id) ON DELETE CASCADE
      );

      -- Scenario Results Table
      CREATE TABLE IF NOT EXISTS scenario_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id INTEGER NOT NULL,
        simulation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        portfolio_current_value DECIMAL(15,2) NOT NULL,
        portfolio_scenario_value DECIMAL(15,2) NOT NULL,
        portfolio_change_percentage DECIMAL(8,4) NOT NULL,
        portfolio_change_amount DECIMAL(15,2) NOT NULL,
        current_monthly_income DECIMAL(12,2) DEFAULT 0.00,
        scenario_monthly_income DECIMAL(12,2) DEFAULT 0.00,
        income_change_percentage DECIMAL(8,4) DEFAULT 0.00,
        risk_metrics TEXT, -- JSON with VaR, volatility, etc
        top_winners TEXT, -- JSON array of best performing instruments
        top_losers TEXT, -- JSON array of worst performing instruments
        sector_impacts TEXT, -- JSON with sector-by-sector analysis
        recommendations TEXT, -- JSON with AI recommendations
        confidence_level DECIMAL(5,2) DEFAULT 0.00,
        simulation_duration_seconds INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id) ON DELETE CASCADE
      );

      -- Scenario Instrument Impact Table (detailed per-instrument results)
      CREATE TABLE IF NOT EXISTS scenario_instrument_impacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_result_id INTEGER NOT NULL,
        instrument_id INTEGER NOT NULL,
        current_price DECIMAL(10,4) NOT NULL,
        scenario_price DECIMAL(10,4) NOT NULL,
        price_change_percentage DECIMAL(8,4) NOT NULL,
        current_position_value DECIMAL(12,2),
        scenario_position_value DECIMAL(12,2),
        position_impact_amount DECIMAL(12,2),
        impact_reasoning TEXT, -- Why this instrument was affected
        sector VARCHAR(100),
        correlation_factor DECIMAL(6,4), -- How correlated to the main scenario variable
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scenario_result_id) REFERENCES scenario_results(id) ON DELETE CASCADE,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      -- Scenario History Table (for tracking multiple runs of the same scenario)
      CREATE TABLE IF NOT EXISTS scenario_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scenario_id INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        variables_snapshot TEXT NOT NULL, -- JSON snapshot of variables at time of run
        results_summary TEXT NOT NULL, -- JSON summary of key results
        run_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        portfolio_snapshot TEXT, -- JSON of portfolio at time of simulation
        market_conditions TEXT, -- JSON of market conditions when run
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scenario_id) REFERENCES scenario_definitions(id) ON DELETE CASCADE
      );

      -- Macro Economic Indicators Table (for scenario modeling)
      CREATE TABLE IF NOT EXISTS macro_indicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indicator_name VARCHAR(100) NOT NULL, -- INFLATION_AR, USD_ARS, LEBAC_RATE, etc
        date DATE NOT NULL,
        value DECIMAL(12,4) NOT NULL,
        unit VARCHAR(20) DEFAULT 'PERCENTAGE', -- PERCENTAGE, RATIO, INDEX, CURRENCY
        source VARCHAR(50) DEFAULT 'BCRA',
        is_estimate BOOLEAN DEFAULT FALSE,
        confidence_level DECIMAL(5,2) DEFAULT 100.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Correlation Matrix Table (for advanced scenario modeling)
      CREATE TABLE IF NOT EXISTS instrument_correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        instrument_a_id INTEGER NOT NULL,
        instrument_b_id INTEGER NOT NULL,
        correlation_coefficient DECIMAL(6,4) NOT NULL, -- -1.0 to 1.0
        period_days INTEGER NOT NULL DEFAULT 252, -- Trading days used for calculation
        calculation_date DATE NOT NULL,
        significance_level DECIMAL(5,2) DEFAULT 95.00,
        sample_size INTEGER,
        is_significant BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instrument_a_id) REFERENCES instruments(id) ON DELETE CASCADE,
        FOREIGN KEY (instrument_b_id) REFERENCES instruments(id) ON DELETE CASCADE
      );

      -- Create indexes for performance
      CREATE INDEX idx_scenario_definitions_category ON scenario_definitions(category);
      CREATE INDEX idx_scenario_definitions_active ON scenario_definitions(is_active);
      CREATE INDEX idx_scenario_definitions_predefined ON scenario_definitions(is_predefined);

      CREATE INDEX idx_scenario_variables_scenario ON scenario_variables(scenario_id);
      CREATE INDEX idx_scenario_variables_type ON scenario_variables(variable_type);

      CREATE INDEX idx_scenario_results_scenario ON scenario_results(scenario_id);
      CREATE INDEX idx_scenario_results_date ON scenario_results(simulation_date);
      CREATE INDEX idx_scenario_results_confidence ON scenario_results(confidence_level);

      CREATE INDEX idx_scenario_instrument_impacts_result ON scenario_instrument_impacts(scenario_result_id);
      CREATE INDEX idx_scenario_instrument_impacts_instrument ON scenario_instrument_impacts(instrument_id);
      CREATE INDEX idx_scenario_instrument_impacts_sector ON scenario_instrument_impacts(sector);

      CREATE INDEX idx_scenario_history_scenario ON scenario_history(scenario_id);
      CREATE INDEX idx_scenario_history_date ON scenario_history(run_date);
      CREATE INDEX idx_scenario_history_version ON scenario_history(version);

      CREATE UNIQUE INDEX idx_macro_indicators_unique ON macro_indicators(indicator_name, date);
      CREATE INDEX idx_macro_indicators_name ON macro_indicators(indicator_name);
      CREATE INDEX idx_macro_indicators_date ON macro_indicators(date);

      CREATE UNIQUE INDEX idx_correlations_unique ON instrument_correlations(instrument_a_id, instrument_b_id, period_days, calculation_date);
      CREATE INDEX idx_correlations_instrument_a ON instrument_correlations(instrument_a_id);
      CREATE INDEX idx_correlations_instrument_b ON instrument_correlations(instrument_b_id);
      CREATE INDEX idx_correlations_date ON instrument_correlations(calculation_date);

      -- Insert predefined scenarios
      INSERT OR IGNORE INTO scenario_definitions (name, description, category, is_predefined, created_by) VALUES
        ('Recesión Global', 'Escenario de recesión económica global con caída de mercados desarrollados', 'MACRO', TRUE, 'SYSTEM'),
        ('Hiperinflación Argentina', 'Escenario de aceleración inflacionaria en Argentina (>100% anual)', 'MACRO', TRUE, 'SYSTEM'),
        ('Boom Tecnológico', 'Escenario de crecimiento acelerado del sector tecnológico', 'SECTOR', TRUE, 'SYSTEM'),
        ('Crisis Energética', 'Escenario de crisis en el sector energético con alzas de precios', 'SECTOR', TRUE, 'SYSTEM'),
        ('Estabilización Cambiaria', 'Escenario de estabilización del tipo de cambio USD/ARS', 'MACRO', TRUE, 'SYSTEM'),
        ('Normalización Monetaria', 'Escenario de normalización de tasas de interés en Argentina', 'MACRO', TRUE, 'SYSTEM');

      -- Insert predefined variables for Recesión Global scenario
      INSERT OR IGNORE INTO scenario_variables (scenario_id, variable_type, variable_name, current_value, scenario_value, change_percentage, impact_duration_months) VALUES
        (1, 'MARKET_INDEX', 'S&P 500 Change', 0.00, -25.00, -25.00, 6),
        (1, 'MARKET_INDEX', 'NASDAQ Change', 0.00, -30.00, -30.00, 6),
        (1, 'VOLATILITY', 'VIX Level', 20.00, 45.00, 125.00, 12),
        (1, 'INTEREST_RATE', 'Fed Funds Rate', 5.25, 2.00, -61.90, 12);

      -- Insert predefined variables for Hiperinflación Argentina scenario  
      INSERT OR IGNORE INTO scenario_variables (scenario_id, variable_type, variable_name, current_value, scenario_value, change_percentage, impact_duration_months) VALUES
        (2, 'INFLATION', 'Inflación Anual AR', 85.00, 150.00, 76.47, 18),
        (2, 'EXCHANGE_RATE', 'USD/ARS', 350.00, 600.00, 71.43, 18),
        (2, 'INTEREST_RATE', 'LEBAC Rate', 85.00, 120.00, 41.18, 12);

      -- Insert current macro indicators
      INSERT OR IGNORE INTO macro_indicators (indicator_name, date, value, unit, source) VALUES
        ('INFLATION_AR', DATE('now'), 85.00, 'PERCENTAGE', 'BCRA'),
        ('USD_ARS', DATE('now'), 350.00, 'RATIO', 'BCRA'),
        ('LEBAC_RATE', DATE('now'), 85.00, 'PERCENTAGE', 'BCRA'),
        ('SP500_LEVEL', DATE('now'), 4500.00, 'INDEX', 'YAHOO'),
        ('VIX_LEVEL', DATE('now'), 20.00, 'INDEX', 'YAHOO'),
        ('FED_FUNDS_RATE', DATE('now'), 5.25, 'PERCENTAGE', 'FED');
    `,
    down: `
      -- Drop indexes
      DROP INDEX IF EXISTS idx_correlations_date;
      DROP INDEX IF EXISTS idx_correlations_instrument_b;
      DROP INDEX IF EXISTS idx_correlations_instrument_a;
      DROP INDEX IF EXISTS idx_correlations_unique;
      DROP INDEX IF EXISTS idx_macro_indicators_date;
      DROP INDEX IF EXISTS idx_macro_indicators_name;
      DROP INDEX IF EXISTS idx_macro_indicators_unique;
      DROP INDEX IF EXISTS idx_scenario_history_version;
      DROP INDEX IF EXISTS idx_scenario_history_date;
      DROP INDEX IF EXISTS idx_scenario_history_scenario;
      DROP INDEX IF EXISTS idx_scenario_instrument_impacts_sector;
      DROP INDEX IF EXISTS idx_scenario_instrument_impacts_instrument;
      DROP INDEX IF EXISTS idx_scenario_instrument_impacts_result;
      DROP INDEX IF EXISTS idx_scenario_results_confidence;
      DROP INDEX IF EXISTS idx_scenario_results_date;
      DROP INDEX IF EXISTS idx_scenario_results_scenario;
      DROP INDEX IF EXISTS idx_scenario_variables_type;
      DROP INDEX IF EXISTS idx_scenario_variables_scenario;
      DROP INDEX IF EXISTS idx_scenario_definitions_predefined;
      DROP INDEX IF EXISTS idx_scenario_definitions_active;
      DROP INDEX IF EXISTS idx_scenario_definitions_category;
      
      -- Drop tables
      DROP TABLE IF EXISTS instrument_correlations;
      DROP TABLE IF EXISTS macro_indicators;
      DROP TABLE IF EXISTS scenario_history;
      DROP TABLE IF EXISTS scenario_instrument_impacts;
      DROP TABLE IF EXISTS scenario_results;
      DROP TABLE IF EXISTS scenario_variables;
      DROP TABLE IF EXISTS scenario_definitions;
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