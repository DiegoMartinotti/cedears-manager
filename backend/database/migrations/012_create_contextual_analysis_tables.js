/**
 * Migration 012: Create Contextual Analysis Tables
 * Creates tables for storing contextual analysis data, news cache, and analysis history
 */

const migration = {
  version: 12,
  description: 'Create contextual analysis tables for Step 18 implementation',
  
  up: function(db) {
    console.log('Running migration 012: Creating contextual analysis tables...')
    
    try {
      // Table for storing contextual analysis results
      db.exec(`
        CREATE TABLE IF NOT EXISTS contextual_analysis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          analysis_type TEXT NOT NULL CHECK(analysis_type IN ('COMPREHENSIVE', 'NEWS', 'SENTIMENT', 'EARNINGS', 'TRENDS')),
          timeframe TEXT CHECK(timeframe IN ('1D', '1W', '1M', '3M', '6M', '1Y')),
          overall_score INTEGER DEFAULT 0,
          confidence INTEGER DEFAULT 0,
          recommendation TEXT CHECK(recommendation IN ('STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL')),
          reasoning TEXT,
          key_factors TEXT, -- JSON array
          components_data TEXT, -- JSON object with all component analysis
          risks_data TEXT, -- JSON array of risks
          opportunities_data TEXT, -- JSON array of opportunities
          action_items_data TEXT, -- JSON array of action items
          claude_insights TEXT, -- JSON object with Claude analysis
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME, -- For cache expiration
          UNIQUE(symbol, analysis_type, timeframe)
        )
      `)
      
      // Table for caching news analysis
      db.exec(`
        CREATE TABLE IF NOT EXISTS news_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          article_url TEXT NOT NULL,
          article_title TEXT NOT NULL,
          article_description TEXT,
          source_name TEXT,
          published_at DATETIME,
          relevance_score INTEGER DEFAULT 0,
          impact_score INTEGER DEFAULT 0,
          impact_type TEXT CHECK(impact_type IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
          confidence INTEGER DEFAULT 0,
          key_points TEXT, -- JSON array
          analysis_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          UNIQUE(symbol, article_url)
        )
      `)
      
      // Table for market sentiment history
      db.exec(`
        CREATE TABLE IF NOT EXISTS market_sentiment_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          overall_sentiment TEXT NOT NULL CHECK(overall_sentiment IN ('FEAR', 'GREED', 'NEUTRAL')),
          sentiment_score INTEGER DEFAULT 0,
          confidence INTEGER DEFAULT 0,
          market_condition TEXT CHECK(market_condition IN ('BULL', 'BEAR', 'SIDEWAYS')),
          fear_greed_index INTEGER,
          volatility_index REAL,
          news_sentiment INTEGER DEFAULT 0,
          key_factors TEXT, -- JSON array
          analysis_summary TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date)
        )
      `)
      
      // Table for earnings analysis cache
      db.exec(`
        CREATE TABLE IF NOT EXISTS earnings_analysis_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          fiscal_date_ending DATE NOT NULL,
          reported_date DATE,
          reported_eps REAL,
          estimated_eps REAL,
          surprise REAL,
          surprise_percentage REAL,
          revenue REAL,
          estimated_revenue REAL,
          revenue_surprise REAL,
          revenue_surprise_percentage REAL,
          overall_assessment TEXT CHECK(overall_assessment IN ('STRONG_BEAT', 'BEAT', 'MIXED', 'MISS', 'STRONG_MISS')),
          eps_analysis TEXT, -- JSON object
          revenue_analysis TEXT, -- JSON object
          key_metrics TEXT, -- JSON array
          price_impact TEXT, -- JSON object
          historical_context TEXT, -- JSON object
          claude_analysis TEXT, -- JSON object
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          UNIQUE(symbol, fiscal_date_ending)
        )
      `)
      
      // Table for trend predictions
      db.exec(`
        CREATE TABLE IF NOT EXISTS trend_predictions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          timeframe TEXT NOT NULL CHECK(timeframe IN ('1W', '1M', '3M', '6M', '1Y')),
          direction TEXT NOT NULL CHECK(direction IN ('BULLISH', 'BEARISH', 'SIDEWAYS')),
          confidence INTEGER DEFAULT 0,
          strength TEXT CHECK(strength IN ('WEAK', 'MODERATE', 'STRONG')),
          probability_bullish INTEGER DEFAULT 0,
          probability_bearish INTEGER DEFAULT 0,
          probability_sideways INTEGER DEFAULT 0,
          technical_score INTEGER DEFAULT 0,
          fundamental_score INTEGER DEFAULT 0,
          sentiment_score INTEGER DEFAULT 0,
          news_score INTEGER DEFAULT 0,
          overall_score INTEGER DEFAULT 0,
          key_factors TEXT, -- JSON array
          risks TEXT, -- JSON array
          catalysts TEXT, -- JSON array
          scenarios TEXT, -- JSON array
          claude_analysis TEXT, -- JSON object
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          UNIQUE(symbol, timeframe)
        )
      `)
      
      // Table for portfolio analysis summary
      db.exec(`
        CREATE TABLE IF NOT EXISTS portfolio_analysis_summary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          analysis_date DATE NOT NULL,
          symbols_analyzed TEXT NOT NULL, -- JSON array of symbols
          overall_health TEXT CHECK(overall_health IN ('EXCELLENT', 'GOOD', 'FAIR', 'POOR')),
          total_score INTEGER DEFAULT 0,
          risk_level TEXT CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
          diversification_score INTEGER DEFAULT 0,
          bullish_symbols TEXT, -- JSON array
          bearish_symbols TEXT, -- JSON array
          neutral_symbols TEXT, -- JSON array
          market_themes TEXT, -- JSON array
          recommendations TEXT, -- JSON array
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(analysis_date)
        )
      `)
      
      // Table for contextual analysis job logs
      db.exec(`
        CREATE TABLE IF NOT EXISTS contextual_job_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_type TEXT NOT NULL,
          job_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('STARTED', 'COMPLETED', 'FAILED')),
          symbols_processed INTEGER DEFAULT 0,
          successful_analyses INTEGER DEFAULT 0,
          failed_analyses INTEGER DEFAULT 0,
          execution_time_ms INTEGER DEFAULT 0,
          error_message TEXT,
          details TEXT, -- JSON object with additional details
          started_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Create indexes for better performance
      console.log('Creating indexes for contextual analysis tables...')
      
      // Contextual Analysis indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_analysis_symbol ON contextual_analysis(symbol)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_analysis_type ON contextual_analysis(analysis_type)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_analysis_created ON contextual_analysis(created_at)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_analysis_expires ON contextual_analysis(expires_at)')
      
      // News Cache indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_news_cache_symbol ON news_cache(symbol)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_news_cache_published ON news_cache(published_at)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_news_cache_expires ON news_cache(expires_at)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_news_cache_relevance ON news_cache(relevance_score)')
      
      // Market Sentiment History indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_market_sentiment_date ON market_sentiment_history(date)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_market_sentiment_created ON market_sentiment_history(created_at)')
      
      // Earnings Analysis Cache indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_earnings_cache_symbol ON earnings_analysis_cache(symbol)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_earnings_cache_fiscal_date ON earnings_analysis_cache(fiscal_date_ending)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_earnings_cache_expires ON earnings_analysis_cache(expires_at)')
      
      // Trend Predictions indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_trend_predictions_symbol ON trend_predictions(symbol)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_trend_predictions_timeframe ON trend_predictions(timeframe)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_trend_predictions_expires ON trend_predictions(expires_at)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_trend_predictions_confidence ON trend_predictions(confidence)')
      
      // Portfolio Analysis Summary indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_portfolio_analysis_date ON portfolio_analysis_summary(analysis_date)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_portfolio_analysis_created ON portfolio_analysis_summary(created_at)')
      
      // Job Logs indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_job_logs_type ON contextual_job_logs(job_type)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_job_logs_name ON contextual_job_logs(job_name)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_job_logs_status ON contextual_job_logs(status)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_contextual_job_logs_started ON contextual_job_logs(started_at)')
      
      console.log('✅ Migration 012 completed successfully')
      return true
      
    } catch (error) {
      console.error('❌ Migration 012 failed:', error)
      throw error
    }
  },
  
  down: function(db) {
    console.log('Rolling back migration 012: Dropping contextual analysis tables...')
    
    try {
      // Drop indexes first
      const indexes = [
        'idx_contextual_analysis_symbol',
        'idx_contextual_analysis_type',
        'idx_contextual_analysis_created',
        'idx_contextual_analysis_expires',
        'idx_news_cache_symbol',
        'idx_news_cache_published',
        'idx_news_cache_expires',
        'idx_news_cache_relevance',
        'idx_market_sentiment_date',
        'idx_market_sentiment_created',
        'idx_earnings_cache_symbol',
        'idx_earnings_cache_fiscal_date',
        'idx_earnings_cache_expires',
        'idx_trend_predictions_symbol',
        'idx_trend_predictions_timeframe',
        'idx_trend_predictions_expires',
        'idx_trend_predictions_confidence',
        'idx_portfolio_analysis_date',
        'idx_portfolio_analysis_created',
        'idx_contextual_job_logs_type',
        'idx_contextual_job_logs_name',
        'idx_contextual_job_logs_status',
        'idx_contextual_job_logs_started'
      ]
      
      indexes.forEach(index => {
        try {
          db.exec(`DROP INDEX IF EXISTS ${index}`)
        } catch (error) {
          console.warn(`Warning: Could not drop index ${index}:`, error.message)
        }
      })
      
      // Drop tables in reverse order of creation
      const tables = [
        'contextual_job_logs',
        'portfolio_analysis_summary',
        'trend_predictions',
        'earnings_analysis_cache',
        'market_sentiment_history',
        'news_cache',
        'contextual_analysis'
      ]
      
      tables.forEach(table => {
        try {
          db.exec(`DROP TABLE IF EXISTS ${table}`)
          console.log(`Dropped table: ${table}`)
        } catch (error) {
          console.error(`Error dropping table ${table}:`, error)
        }
      })
      
      console.log('✅ Migration 012 rollback completed')
      return true
      
    } catch (error) {
      console.error('❌ Migration 012 rollback failed:', error)
      throw error
    }
  },
  
  // Validation function to check if migration was applied correctly
  validate: function(db) {
    try {
      // Check if all tables exist
      const tables = [
        'contextual_analysis',
        'news_cache', 
        'market_sentiment_history',
        'earnings_analysis_cache',
        'trend_predictions',
        'portfolio_analysis_summary',
        'contextual_job_logs'
      ]
      
      for (const table of tables) {
        const result = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(table)
        
        if (!result) {
          throw new Error(`Table ${table} does not exist`)
        }
      }
      
      // Check if indexes exist
      const criticalIndexes = [
        'idx_contextual_analysis_symbol',
        'idx_news_cache_symbol',
        'idx_trend_predictions_symbol'
      ]
      
      for (const index of criticalIndexes) {
        const result = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='index' AND name=?
        `).get(index)
        
        if (!result) {
          console.warn(`Warning: Index ${index} does not exist`)
        }
      }
      
      console.log('✅ Migration 012 validation passed')
      return true
      
    } catch (error) {
      console.error('❌ Migration 012 validation failed:', error)
      return false
    }
  }
}

module.exports = migration