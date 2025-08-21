/**
 * Migration: Create sell_alerts table
 * Description: Table to store sell alerts and notifications for positions
 */

export const up = (db) => {
  console.log('Running migration: 011_create_sell_alerts');
  
  const sellAlertsTable = {
    tableName: 'sell_alerts',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      position_id: 'INTEGER NOT NULL',
      instrument_id: 'INTEGER NOT NULL',
      ticker: 'TEXT NOT NULL',
      alert_type: 'TEXT NOT NULL CHECK(alert_type IN ("TAKE_PROFIT_1", "TAKE_PROFIT_2", "STOP_LOSS", "TRAILING_STOP", "TIME_BASED", "TECHNICAL"))',
      threshold_value: 'REAL NOT NULL',
      current_value: 'REAL NOT NULL',
      priority: 'TEXT NOT NULL CHECK(priority IN ("LOW", "MEDIUM", "HIGH", "CRITICAL"))',
      message: 'TEXT NOT NULL',
      is_active: 'BOOLEAN NOT NULL DEFAULT 1',
      created_at: 'TEXT NOT NULL',
      acknowledged_at: 'TEXT'
    },
    indexes: [
      'CREATE INDEX idx_sell_alerts_position_id ON sell_alerts(position_id)',
      'CREATE INDEX idx_sell_alerts_instrument_id ON sell_alerts(instrument_id)',
      'CREATE INDEX idx_sell_alerts_ticker ON sell_alerts(ticker)',
      'CREATE INDEX idx_sell_alerts_alert_type ON sell_alerts(alert_type)',
      'CREATE INDEX idx_sell_alerts_priority ON sell_alerts(priority)',
      'CREATE INDEX idx_sell_alerts_is_active ON sell_alerts(is_active)',
      'CREATE INDEX idx_sell_alerts_created_at ON sell_alerts(created_at)',
      'CREATE INDEX idx_sell_alerts_acknowledged_at ON sell_alerts(acknowledged_at)',
      'CREATE INDEX idx_sell_alerts_active_by_position ON sell_alerts(position_id, is_active)',
      'CREATE INDEX idx_sell_alerts_active_by_priority ON sell_alerts(priority, is_active)'
    ]
  };

  // Create table
  const createTableSQL = `
    CREATE TABLE ${sellAlertsTable.tableName} (
      ${Object.entries(sellAlertsTable.columns)
        .map(([name, definition]) => `${name} ${definition}`)
        .join(',\n      ')}
    )
  `;

  console.log('Creating sell_alerts table...');
  db.exec(createTableSQL);

  // Create indexes
  console.log('Creating indexes for sell_alerts table...');
  sellAlertsTable.indexes.forEach(indexSQL => {
    db.exec(indexSQL);
  });

  console.log('✅ Migration 011_create_sell_alerts completed successfully');
};

export const down = (db) => {
  console.log('Rolling back migration: 011_create_sell_alerts');
  
  // Drop indexes first (indexes are automatically dropped when table is dropped, but explicit for clarity)
  const indexes = [
    'idx_sell_alerts_position_id',
    'idx_sell_alerts_instrument_id',
    'idx_sell_alerts_ticker',
    'idx_sell_alerts_alert_type',
    'idx_sell_alerts_priority',
    'idx_sell_alerts_is_active',
    'idx_sell_alerts_created_at',
    'idx_sell_alerts_acknowledged_at',
    'idx_sell_alerts_active_by_position',
    'idx_sell_alerts_active_by_priority'
  ];

  indexes.forEach(indexName => {
    try {
      db.exec(`DROP INDEX IF EXISTS ${indexName}`);
    } catch (error) {
      console.warn(`Could not drop index ${indexName}:`, error.message);
    }
  });

  // Drop table
  console.log('Dropping sell_alerts table...');
  db.exec('DROP TABLE IF EXISTS sell_alerts');

  console.log('✅ Migration 011_create_sell_alerts rolled back successfully');
};