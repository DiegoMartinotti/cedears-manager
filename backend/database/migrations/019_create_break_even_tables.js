// Migration 019: Create break-even analysis tables
// This migration creates tables for break-even analysis functionality

const migration019 = {
  up: (db) => {
    console.log('Running migration 019: Creating break-even analysis tables...')
    
    // 1. Tabla principal de análisis de break-even
    db.exec(`
      CREATE TABLE IF NOT EXISTS break_even_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trade_id INTEGER NOT NULL,
        instrument_id INTEGER NOT NULL,
        calculation_date DATE NOT NULL,
        break_even_price REAL NOT NULL,
        current_price REAL,
        distance_to_break_even REAL,
        distance_percentage REAL,
        days_to_break_even INTEGER,
        total_costs REAL NOT NULL,
        purchase_price REAL NOT NULL,
        commission_impact REAL NOT NULL,
        custody_impact REAL NOT NULL,
        inflation_impact REAL NOT NULL,
        tax_impact REAL DEFAULT 0,
        confidence_level REAL DEFAULT 0.8,
        scenario_type TEXT DEFAULT 'BASE',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
        FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
      )
    `)
    
    // 2. Tabla de proyecciones temporales de break-even
    db.exec(`
      CREATE TABLE IF NOT EXISTS break_even_projections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        trade_id INTEGER NOT NULL,
        projection_date DATE NOT NULL,
        months_ahead INTEGER NOT NULL,
        inflation_rate REAL NOT NULL,
        projected_break_even REAL NOT NULL,
        scenario_type TEXT NOT NULL,
        scenario_name TEXT,
        probability REAL DEFAULT 0.33,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES break_even_analysis(id) ON DELETE CASCADE,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      )
    `)
    
    // 3. Tabla de optimizaciones y sugerencias
    db.exec(`
      CREATE TABLE IF NOT EXISTS break_even_optimizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        trade_id INTEGER NOT NULL,
        suggestion_type TEXT NOT NULL,
        suggestion_title TEXT NOT NULL,
        suggestion_description TEXT NOT NULL,
        potential_savings REAL,
        potential_time_reduction INTEGER,
        implementation_difficulty TEXT CHECK(implementation_difficulty IN ('LOW', 'MEDIUM', 'HIGH')),
        priority INTEGER CHECK(priority BETWEEN 1 AND 5),
        is_automated BOOLEAN DEFAULT FALSE,
        is_applicable BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES break_even_analysis(id) ON DELETE CASCADE,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      )
    `)
    
    // 4. Tabla de matriz de sensibilidad (escenarios what-if)
    db.exec(`
      CREATE TABLE IF NOT EXISTS break_even_sensitivity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id INTEGER NOT NULL,
        trade_id INTEGER NOT NULL,
        variable_name TEXT NOT NULL,
        variable_value REAL NOT NULL,
        resulting_break_even REAL NOT NULL,
        impact_percentage REAL NOT NULL,
        scenario_label TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (analysis_id) REFERENCES break_even_analysis(id) ON DELETE CASCADE,
        FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
      )
    `)
    
    // 5. Tabla de configuración de parámetros para break-even
    db.exec(`
      CREATE TABLE IF NOT EXISTS break_even_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_name TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type TEXT CHECK(setting_type IN ('NUMBER', 'BOOLEAN', 'STRING', 'JSON')) DEFAULT 'STRING',
        description TEXT,
        is_user_configurable BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Índices para optimizar consultas
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_analysis_trade_id ON break_even_analysis(trade_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_analysis_instrument_id ON break_even_analysis(instrument_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_analysis_date ON break_even_analysis(calculation_date)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_analysis_scenario ON break_even_analysis(scenario_type)`)
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_projections_analysis_id ON break_even_projections(analysis_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_projections_date ON break_even_projections(projection_date)`)
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_optimizations_analysis_id ON break_even_optimizations(analysis_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_optimizations_priority ON break_even_optimizations(priority)`)
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_sensitivity_analysis_id ON break_even_sensitivity(analysis_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_sensitivity_variable ON break_even_sensitivity(variable_name)`)
    
    db.exec(`CREATE INDEX IF NOT EXISTS idx_break_even_settings_name ON break_even_settings(setting_name)`)
    
    // Insertar configuración default
    db.exec(`
      INSERT OR IGNORE INTO break_even_settings (setting_name, setting_value, setting_type, description) VALUES
      ('default_inflation_rate', '0.12', 'NUMBER', 'Tasa de inflación anual por defecto para proyecciones'),
      ('default_projection_months', '12', 'NUMBER', 'Meses por defecto para proyecciones de break-even'),
      ('tax_rate_threshold', '0.15', 'NUMBER', 'Tasa de impuesto a las ganancias'),
      ('confidence_threshold', '0.75', 'NUMBER', 'Umbral mínimo de confianza para recomendaciones'),
      ('show_tax_impact', 'true', 'BOOLEAN', 'Mostrar impacto de impuestos en cálculos'),
      ('enable_optimizations', 'true', 'BOOLEAN', 'Habilitar generación de sugerencias de optimización')
    `)
    
    console.log('Migration 019 completed successfully: Break-even analysis tables created')
  },
  
  down: (db) => {
    console.log('Rolling back migration 019: Dropping break-even analysis tables...')
    
    // Drop tables in reverse order to respect foreign key constraints
    db.exec('DROP TABLE IF EXISTS break_even_settings')
    db.exec('DROP TABLE IF EXISTS break_even_sensitivity')
    db.exec('DROP TABLE IF EXISTS break_even_optimizations')
    db.exec('DROP TABLE IF EXISTS break_even_projections')
    db.exec('DROP TABLE IF EXISTS break_even_analysis')
    
    console.log('Migration 019 rollback completed')
  }
}

export default migration019