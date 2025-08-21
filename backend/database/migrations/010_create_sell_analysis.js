/**
 * Migration: Create sell_analysis table
 * Description: Table to store sell analysis data for positions
 */

export const up = (db) => {
  console.log('Running migration: 010_create_sell_analysis');
  
  const sellAnalysisTable = {
    tableName: 'sell_analysis',
    columns: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      position_id: 'INTEGER NOT NULL',
      instrument_id: 'INTEGER NOT NULL',
      ticker: 'TEXT NOT NULL',
      current_price: 'REAL NOT NULL',
      avg_buy_price: 'REAL NOT NULL',
      quantity: 'INTEGER NOT NULL',
      gross_profit_pct: 'REAL NOT NULL',
      net_profit_pct: 'REAL NOT NULL',
      gross_profit_ars: 'REAL NOT NULL',
      net_profit_ars: 'REAL NOT NULL',
      commission_impact: 'REAL NOT NULL',
      inflation_adjustment: 'REAL NOT NULL',
      sell_score: 'INTEGER NOT NULL',
      technical_score: 'INTEGER NOT NULL',
      fundamental_score: 'INTEGER NOT NULL',
      profit_score: 'INTEGER NOT NULL',
      time_score: 'INTEGER NOT NULL',
      market_score: 'INTEGER NOT NULL',
      recommendation: 'TEXT NOT NULL CHECK(recommendation IN ("HOLD", "TAKE_PROFIT_1", "TAKE_PROFIT_2", "STOP_LOSS", "TRAILING_STOP"))',
      recommendation_reason: 'TEXT NOT NULL',
      risk_level: 'TEXT NOT NULL CHECK(risk_level IN ("LOW", "MEDIUM", "HIGH", "CRITICAL"))',
      days_held: 'INTEGER NOT NULL',
      analysis_date: 'TEXT NOT NULL',
      created_at: 'TEXT NOT NULL',
      updated_at: 'TEXT NOT NULL'
    },
    indexes: [
      'CREATE INDEX idx_sell_analysis_position_id ON sell_analysis(position_id)',
      'CREATE INDEX idx_sell_analysis_instrument_id ON sell_analysis(instrument_id)',
      'CREATE INDEX idx_sell_analysis_ticker ON sell_analysis(ticker)',
      'CREATE INDEX idx_sell_analysis_recommendation ON sell_analysis(recommendation)',
      'CREATE INDEX idx_sell_analysis_risk_level ON sell_analysis(risk_level)',
      'CREATE INDEX idx_sell_analysis_analysis_date ON sell_analysis(analysis_date)',
      'CREATE INDEX idx_sell_analysis_sell_score ON sell_analysis(sell_score)',
      'CREATE INDEX idx_sell_analysis_created_at ON sell_analysis(created_at)'
    ]
  };

  // Create table
  const createTableSQL = `
    CREATE TABLE ${sellAnalysisTable.tableName} (
      ${Object.entries(sellAnalysisTable.columns)
        .map(([name, definition]) => `${name} ${definition}`)
        .join(',\n      ')}
    )
  `;

  console.log('Creating sell_analysis table...');
  db.exec(createTableSQL);

  // Create indexes
  console.log('Creating indexes for sell_analysis table...');
  sellAnalysisTable.indexes.forEach(indexSQL => {
    db.exec(indexSQL);
  });

  console.log('✅ Migration 010_create_sell_analysis completed successfully');
};

export const down = (db) => {
  console.log('Rolling back migration: 010_create_sell_analysis');
  
  // Drop indexes first (indexes are automatically dropped when table is dropped, but explicit for clarity)
  const indexes = [
    'idx_sell_analysis_position_id',
    'idx_sell_analysis_instrument_id', 
    'idx_sell_analysis_ticker',
    'idx_sell_analysis_recommendation',
    'idx_sell_analysis_risk_level',
    'idx_sell_analysis_analysis_date',
    'idx_sell_analysis_sell_score',
    'idx_sell_analysis_created_at'
  ];

  indexes.forEach(indexName => {
    try {
      db.exec(`DROP INDEX IF EXISTS ${indexName}`);
    } catch (error) {
      console.warn(`Could not drop index ${indexName}:`, error.message);
    }
  });

  // Drop table
  console.log('Dropping sell_analysis table...');
  db.exec('DROP TABLE IF EXISTS sell_analysis');

  console.log('✅ Migration 010_create_sell_analysis rolled back successfully');
};