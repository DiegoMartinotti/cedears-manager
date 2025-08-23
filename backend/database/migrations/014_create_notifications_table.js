/**
 * Migration 014: Create Notifications Table
 * Creates table for in-app notification system with priorities and types
 */

const migration = {
  version: 14,
  description: 'Create notifications table for Step 20 implementation',
  
  up: function(db) {
    console.log('Running migration 014: Creating notifications table...')
    
    try {
      // Table for storing in-app notifications
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK(type IN ('OPPORTUNITY', 'ALERT', 'GOAL_PROGRESS', 'ESG_CHANGE', 'PORTFOLIO_UPDATE', 'SYSTEM', 'SELL_SIGNAL', 'WATCHLIST_CHANGE')),
          priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT, -- JSON data for additional information
          is_read INTEGER NOT NULL DEFAULT 0, -- SQLite uses INTEGER for boolean
          is_archived INTEGER NOT NULL DEFAULT 0,
          source_id INTEGER, -- Reference to the source entity (instrument_id, trade_id, etc.)
          source_type TEXT, -- Type of source entity
          action_type TEXT, -- Action that can be taken (VIEW_DETAIL, BUY_OPPORTUNITY, SELL_ALERT, etc.)
          action_url TEXT, -- URL for navigation action
          expires_at DATETIME, -- Optional expiration for temporary notifications
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source_type, source_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_archived, expires_at);
      `)

      // Table for notification preferences (future use)
      db.exec(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_type TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          min_priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(min_priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          max_notifications_per_type INTEGER DEFAULT 50,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Insert default notification preferences
      db.exec(`
        INSERT OR IGNORE INTO notification_preferences (notification_type, is_enabled, min_priority, max_notifications_per_type)
        VALUES 
          ('OPPORTUNITY', 1, 'MEDIUM', 20),
          ('ALERT', 1, 'HIGH', 30),
          ('GOAL_PROGRESS', 1, 'LOW', 10),
          ('ESG_CHANGE', 1, 'MEDIUM', 15),
          ('PORTFOLIO_UPDATE', 1, 'MEDIUM', 25),
          ('SYSTEM', 1, 'HIGH', 10),
          ('SELL_SIGNAL', 1, 'HIGH', 25),
          ('WATCHLIST_CHANGE', 1, 'MEDIUM', 20);
      `)

      console.log('✅ Migration 014 completed successfully')
      return true
      
    } catch (error) {
      console.error('❌ Migration 014 failed:', error.message)
      throw error
    }
  },

  down: function(db) {
    console.log('Rolling back migration 014: Dropping notifications tables...')
    
    try {
      // Drop indexes first
      db.exec(`
        DROP INDEX IF EXISTS idx_notifications_type;
        DROP INDEX IF EXISTS idx_notifications_priority;
        DROP INDEX IF EXISTS idx_notifications_is_read;
        DROP INDEX IF EXISTS idx_notifications_created_at;
        DROP INDEX IF EXISTS idx_notifications_source;
        DROP INDEX IF EXISTS idx_notifications_active;
      `)
      
      // Drop tables
      db.exec('DROP TABLE IF EXISTS notification_preferences;')
      db.exec('DROP TABLE IF EXISTS notifications;')
      
      console.log('✅ Migration 014 rollback completed')
      return true
      
    } catch (error) {
      console.error('❌ Migration 014 rollback failed:', error.message)
      throw error
    }
  }
}

module.exports = migration