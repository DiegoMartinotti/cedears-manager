/**
 * Migration 015: Create Monthly Review Tables
 * Creates tables for monthly watchlist review system and change tracking
 */

const migration = {
  version: 15,
  description: 'Create monthly review tables for Step 21 implementation',
  
  up: function(db) {
    console.log('Running migration 015: Creating monthly review tables...')
    
    try {
      // Table for tracking changes in watchlist (already defined in PRD)
      db.exec(`
        CREATE TABLE IF NOT EXISTS watchlist_changes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instrument_id INTEGER NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('ADD', 'REMOVE', 'UPDATE')),
          reason TEXT NOT NULL,
          claude_confidence REAL NOT NULL DEFAULT 0.0,
          user_approved INTEGER, -- NULL = pending, 1 = approved, 0 = rejected
          change_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          review_id INTEGER, -- References monthly_reviews.id
          old_data TEXT, -- JSON snapshot of old instrument data
          new_data TEXT, -- JSON snapshot of new instrument data
          metadata TEXT, -- JSON with additional metadata
          FOREIGN KEY (instrument_id) REFERENCES instruments(id),
          FOREIGN KEY (review_id) REFERENCES monthly_reviews(id)
        );
      `)

      // Table for monthly review sessions
      db.exec(`
        CREATE TABLE IF NOT EXISTS monthly_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          review_date DATE NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
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
          summary TEXT, -- JSON summary of the review
          errors TEXT, -- JSON array of errors if any
          claude_report TEXT, -- Full Claude analysis report
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Table for tracking instrument candidates (potential additions)
      db.exec(`
        CREATE TABLE IF NOT EXISTS instrument_candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          name TEXT,
          market TEXT,
          sector TEXT,
          market_cap REAL,
          avg_volume REAL,
          esg_score REAL,
          vegan_score REAL,
          claude_analysis TEXT, -- JSON with Claude's detailed analysis
          recommendation TEXT NOT NULL CHECK(recommendation IN ('STRONG_ADD', 'ADD', 'CONSIDER', 'REJECT')),
          confidence_score REAL NOT NULL DEFAULT 0.0,
          reasons TEXT, -- JSON array of reasons for recommendation
          discovered_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          review_id INTEGER,
          status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'ADDED')) DEFAULT 'PENDING',
          user_decision_date DATETIME,
          user_notes TEXT,
          FOREIGN KEY (review_id) REFERENCES monthly_reviews(id)
        );
      `)

      // Table for tracking removal candidates (instruments that lost criteria)
      db.exec(`
        CREATE TABLE IF NOT EXISTS removal_candidates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          instrument_id INTEGER NOT NULL,
          reason TEXT NOT NULL,
          severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
          lost_criteria TEXT, -- JSON array of lost ESG/Vegan criteria
          current_esg_score REAL,
          current_vegan_score REAL,
          previous_esg_score REAL,
          previous_vegan_score REAL,
          claude_analysis TEXT, -- JSON with Claude's analysis
          recommendation TEXT NOT NULL CHECK(recommendation IN ('REMOVE_IMMEDIATELY', 'REMOVE', 'MONITOR', 'KEEP')),
          confidence_score REAL NOT NULL DEFAULT 0.0,
          discovered_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          review_id INTEGER,
          status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED')) DEFAULT 'PENDING',
          user_decision_date DATETIME,
          user_notes TEXT,
          FOREIGN KEY (instrument_id) REFERENCES instruments(id),
          FOREIGN KEY (review_id) REFERENCES monthly_reviews(id)
        );
      `)

      // Table for review configuration and settings
      db.exec(`
        CREATE TABLE IF NOT EXISTS review_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          setting_name TEXT NOT NULL UNIQUE,
          setting_value TEXT NOT NULL,
          setting_type TEXT NOT NULL CHECK(setting_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
          description TEXT,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_watchlist_changes_instrument ON watchlist_changes(instrument_id);
        CREATE INDEX IF NOT EXISTS idx_watchlist_changes_review ON watchlist_changes(review_id);
        CREATE INDEX IF NOT EXISTS idx_watchlist_changes_date ON watchlist_changes(change_date);
        CREATE INDEX IF NOT EXISTS idx_watchlist_changes_status ON watchlist_changes(user_approved);
        
        CREATE INDEX IF NOT EXISTS idx_monthly_reviews_date ON monthly_reviews(review_date);
        CREATE INDEX IF NOT EXISTS idx_monthly_reviews_status ON monthly_reviews(status);
        
        CREATE INDEX IF NOT EXISTS idx_instrument_candidates_review ON instrument_candidates(review_id);
        CREATE INDEX IF NOT EXISTS idx_instrument_candidates_symbol ON instrument_candidates(symbol);
        CREATE INDEX IF NOT EXISTS idx_instrument_candidates_status ON instrument_candidates(status);
        CREATE INDEX IF NOT EXISTS idx_instrument_candidates_recommendation ON instrument_candidates(recommendation);
        
        CREATE INDEX IF NOT EXISTS idx_removal_candidates_instrument ON removal_candidates(instrument_id);
        CREATE INDEX IF NOT EXISTS idx_removal_candidates_review ON removal_candidates(review_id);
        CREATE INDEX IF NOT EXISTS idx_removal_candidates_status ON removal_candidates(status);
        CREATE INDEX IF NOT EXISTS idx_removal_candidates_severity ON removal_candidates(severity);
        
        CREATE INDEX IF NOT EXISTS idx_review_settings_name ON review_settings(setting_name);
      `)

      // Insert default settings
      db.exec(`
        INSERT OR IGNORE INTO review_settings (setting_name, setting_value, setting_type, description)
        VALUES 
          ('max_watchlist_size', '100', 'NUMBER', 'Maximum number of instruments in watchlist'),
          ('min_esg_score', '60', 'NUMBER', 'Minimum ESG score for inclusion'),
          ('min_vegan_score', '70', 'NUMBER', 'Minimum Vegan score for inclusion'),
          ('auto_approve_threshold', '0.8', 'NUMBER', 'Confidence threshold for auto-approval'),
          ('removal_grace_period_days', '30', 'NUMBER', 'Days to wait before removing instruments'),
          ('enable_auto_approval', 'true', 'BOOLEAN', 'Enable automatic approval of high-confidence changes'),
          ('notification_enabled', 'true', 'BOOLEAN', 'Send notifications for review updates'),
          ('claude_analysis_enabled', 'true', 'BOOLEAN', 'Use Claude for detailed analysis'),
          ('max_candidates_per_review', '50', 'NUMBER', 'Maximum candidates to evaluate per review'),
          ('scan_schedule', '{"day": 1, "hour": 9, "minute": 0}', 'JSON', 'Monthly scan schedule');
      `)

      console.log('✅ Migration 015 completed successfully')
      return true
      
    } catch (error) {
      console.error('❌ Migration 015 failed:', error.message)
      throw error
    }
  },

  down: function(db) {
    console.log('Rolling back migration 015: Dropping monthly review tables...')
    
    try {
      // Drop indexes first
      db.exec(`
        DROP INDEX IF EXISTS idx_watchlist_changes_instrument;
        DROP INDEX IF EXISTS idx_watchlist_changes_review;
        DROP INDEX IF EXISTS idx_watchlist_changes_date;
        DROP INDEX IF EXISTS idx_watchlist_changes_status;
        DROP INDEX IF EXISTS idx_monthly_reviews_date;
        DROP INDEX IF EXISTS idx_monthly_reviews_status;
        DROP INDEX IF EXISTS idx_instrument_candidates_review;
        DROP INDEX IF EXISTS idx_instrument_candidates_symbol;
        DROP INDEX IF EXISTS idx_instrument_candidates_status;
        DROP INDEX IF EXISTS idx_instrument_candidates_recommendation;
        DROP INDEX IF EXISTS idx_removal_candidates_instrument;
        DROP INDEX IF EXISTS idx_removal_candidates_review;
        DROP INDEX IF EXISTS idx_removal_candidates_status;
        DROP INDEX IF EXISTS idx_removal_candidates_severity;
        DROP INDEX IF EXISTS idx_review_settings_name;
      `)
      
      // Drop tables
      db.exec('DROP TABLE IF EXISTS review_settings;')
      db.exec('DROP TABLE IF EXISTS removal_candidates;')
      db.exec('DROP TABLE IF EXISTS instrument_candidates;')
      db.exec('DROP TABLE IF EXISTS watchlist_changes;')
      db.exec('DROP TABLE IF EXISTS monthly_reviews;')
      
      console.log('✅ Migration 015 rollback completed')
      return true
      
    } catch (error) {
      console.error('❌ Migration 015 rollback failed:', error.message)
      throw error
    }
  }
}

module.exports = migration