/**
 * Migración 022: Tablas para el Optimizador de Estrategia de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

const path = require('path');

function up(db) {
  console.log('Running migration 022: Creating goal optimizer tables...');
  
  try {
    // 28.1: Tabla de análisis de gap entre actual y objetivo
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_gap_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        analysis_date TEXT NOT NULL,
        current_capital REAL NOT NULL,
        target_capital REAL NOT NULL,
        gap_amount REAL NOT NULL,
        gap_percentage REAL NOT NULL,
        current_monthly_contribution REAL NOT NULL,
        required_monthly_contribution REAL NOT NULL,
        contribution_gap REAL NOT NULL,
        months_remaining INTEGER,
        projected_completion_date TEXT,
        deviation_from_plan REAL NOT NULL,
        risk_level TEXT CHECK(risk_level IN ('LOW', 'MEDIUM', 'HIGH')) DEFAULT 'MEDIUM',
        analysis_details TEXT, -- JSON con detalles del análisis
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );
    `);

    // 28.2: Tabla de estrategias de optimización sugeridas
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_optimization_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        strategy_name TEXT NOT NULL,
        strategy_type TEXT CHECK(strategy_type IN (
          'INCREASE_CONTRIBUTION', 
          'IMPROVE_RETURNS', 
          'REDUCE_COSTS', 
          'DIVERSIFICATION', 
          'RISK_ADJUSTMENT',
          'OPPORTUNITY_CAPTURE'
        )) NOT NULL,
        priority TEXT CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
        impact_score REAL NOT NULL, -- 0-100, impacto estimado en la meta
        effort_level TEXT CHECK(effort_level IN ('LOW', 'MEDIUM', 'HIGH')) DEFAULT 'MEDIUM',
        time_to_implement_days INTEGER DEFAULT 0,
        estimated_time_savings_months REAL,
        estimated_cost_savings REAL,
        description TEXT NOT NULL,
        implementation_steps TEXT, -- JSON con pasos de implementación
        requirements TEXT, -- JSON con requisitos
        risks TEXT, -- JSON con riesgos asociados
        is_applied BOOLEAN DEFAULT 0,
        applied_date TEXT,
        results_tracking TEXT, -- JSON con seguimiento de resultados
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );
    `);

    // 28.2: Tabla de planes de contribución optimizados
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_contribution_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        plan_name TEXT NOT NULL,
        plan_type TEXT CHECK(plan_type IN (
          'CONSERVATIVE', 
          'MODERATE', 
          'AGGRESSIVE', 
          'CUSTOM'
        )) DEFAULT 'MODERATE',
        base_monthly_contribution REAL NOT NULL,
        optimized_monthly_contribution REAL NOT NULL,
        contribution_increase REAL NOT NULL,
        extra_annual_contributions REAL DEFAULT 0,
        bonus_contributions TEXT, -- JSON con contribuciones extraordinarias
        dynamic_adjustments BOOLEAN DEFAULT 1, -- Permitir ajustes dinámicos
        seasonal_adjustments TEXT, -- JSON con ajustes estacionales
        affordability_score REAL, -- 0-100, qué tan factible es el plan
        stress_test_scenarios TEXT, -- JSON con escenarios de estrés
        projected_completion_date TEXT,
        time_savings_months REAL,
        total_savings_amount REAL,
        success_probability REAL, -- 0-100, probabilidad de éxito
        monitoring_frequency_days INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT 0,
        activated_date TEXT,
        performance_tracking TEXT, -- JSON con seguimiento
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );
    `);

    // 28.3: Tabla de hitos intermedios calculados automáticamente
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_intermediate_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        milestone_name TEXT NOT NULL,
        milestone_type TEXT CHECK(milestone_type IN (
          'PERCENTAGE', 
          'AMOUNT', 
          'TIME_BASED', 
          'PERFORMANCE'
        )) NOT NULL,
        milestone_order INTEGER NOT NULL, -- Orden de los hitos
        target_amount REAL,
        target_percentage REAL,
        target_date TEXT,
        current_progress REAL DEFAULT 0,
        progress_percentage REAL DEFAULT 0,
        is_achieved BOOLEAN DEFAULT 0,
        achieved_date TEXT,
        celebration_tier TEXT CHECK(celebration_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')) DEFAULT 'BRONZE',
        reward_suggestion TEXT, -- Sugerencia de celebración
        next_milestone_id INTEGER, -- Referencia al siguiente hito
        dependency_milestones TEXT, -- JSON con dependencias
        auto_calculated BOOLEAN DEFAULT 1, -- Si fue calculado automáticamente
        adjustment_history TEXT, -- JSON con historial de ajustes
        motivation_message TEXT,
        difficulty_level TEXT CHECK(difficulty_level IN ('EASY', 'MODERATE', 'CHALLENGING', 'AMBITIOUS')) DEFAULT 'MODERATE',
        estimated_completion_date TEXT,
        buffer_days INTEGER DEFAULT 0, -- Días de buffer
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        FOREIGN KEY (next_milestone_id) REFERENCES goal_intermediate_milestones(id)
      );
    `);

    // 28.4: Tabla de estrategias de aceleración específicas
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_acceleration_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        strategy_name TEXT NOT NULL,
        acceleration_type TEXT CHECK(acceleration_type IN (
          'MARKET_TIMING',
          'SECTOR_ROTATION',
          'VOLATILITY_HARVEST',
          'DIVIDEND_CAPTURE',
          'TAX_OPTIMIZATION',
          'COST_REDUCTION',
          'LEVERAGE_PRUDENT'
        )) NOT NULL,
        potential_acceleration_months REAL NOT NULL, -- Meses que puede acelerar
        risk_increase_factor REAL NOT NULL, -- Factor de aumento de riesgo 1.0 = sin cambio
        complexity_score REAL NOT NULL, -- 1-10, qué tan complejo es implementar
        capital_requirements REAL DEFAULT 0, -- Capital adicional requerido
        expected_return_boost REAL, -- % adicional de retorno esperado
        implementation_timeline_days INTEGER NOT NULL,
        monitoring_requirements TEXT, -- JSON con requisitos de monitoreo
        exit_conditions TEXT, -- JSON con condiciones de salida
        success_metrics TEXT, -- JSON con métricas de éxito
        historical_performance TEXT, -- JSON con performance histórica
        market_conditions_required TEXT, -- Condiciones de mercado necesarias
        portfolio_impact_analysis TEXT, -- JSON con análisis de impacto
        recommendation_confidence REAL, -- 0-100, confianza en la recomendación
        claude_analysis TEXT, -- Análisis de Claude sobre la estrategia
        is_recommended BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 0,
        activated_date TEXT,
        deactivated_date TEXT,
        performance_tracking TEXT, -- JSON con seguimiento de resultados
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );
    `);

    // 28.5: Tabla de vinculación entre objetivos y oportunidades de mercado
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_opportunity_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        opportunity_id INTEGER NOT NULL,
        match_score REAL NOT NULL, -- 0-100, qué tan bien encaja con el objetivo
        impact_on_goal REAL NOT NULL, -- Impacto estimado en meses/dinero
        priority_level TEXT CHECK(priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
        time_sensitivity_hours INTEGER, -- Horas restantes para aprovechar
        capital_allocation_suggestion REAL, -- % del capital a asignar
        risk_alignment_score REAL, -- 0-100, alineación con perfil de riesgo
        diversification_impact REAL, -- Impacto en diversificación del portafolio
        expected_contribution_to_goal REAL, -- $ esperados que aporte al objetivo
        opportunity_details TEXT, -- JSON con detalles de la oportunidad
        analysis_timestamp TEXT NOT NULL,
        expiration_timestamp TEXT, -- Cuándo expira esta oportunidad
        action_taken BOOLEAN DEFAULT 0,
        action_date TEXT,
        action_details TEXT, -- JSON con detalles de la acción tomada
        result_tracking TEXT, -- JSON con seguimiento de resultados
        claude_recommendation TEXT, -- Recomendación específica de Claude
        user_feedback TEXT, -- Feedback del usuario sobre la recomendación
        performance_after_action TEXT, -- JSON con performance post-acción
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        UNIQUE(goal_id, opportunity_id, analysis_timestamp)
      );
    `);

    // Índices para optimizar consultas frecuentes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goal_gap_analysis_goal_date ON goal_gap_analysis(goal_id, analysis_date DESC);
      CREATE INDEX IF NOT EXISTS idx_optimization_strategies_goal_priority ON goal_optimization_strategies(goal_id, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_contribution_plans_goal_active ON goal_contribution_plans(goal_id, is_active DESC);
      CREATE INDEX IF NOT EXISTS idx_milestones_goal_order ON goal_intermediate_milestones(goal_id, milestone_order ASC);
      CREATE INDEX IF NOT EXISTS idx_milestones_achievement ON goal_intermediate_milestones(is_achieved, target_date);
      CREATE INDEX IF NOT EXISTS idx_acceleration_strategies_goal_active ON goal_acceleration_strategies(goal_id, is_active DESC);
      CREATE INDEX IF NOT EXISTS idx_opportunity_matches_score ON goal_opportunity_matches(goal_id, match_score DESC);
      CREATE INDEX IF NOT EXISTS idx_opportunity_matches_priority ON goal_opportunity_matches(priority_level, time_sensitivity_hours ASC);
    `);

    // Triggers para mantener timestamps actualizados
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_goal_gap_analysis_timestamp
        AFTER UPDATE ON goal_gap_analysis
        FOR EACH ROW
        BEGIN
          UPDATE goal_gap_analysis SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_optimization_strategies_timestamp
        AFTER UPDATE ON goal_optimization_strategies
        FOR EACH ROW
        BEGIN
          UPDATE goal_optimization_strategies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_contribution_plans_timestamp
        AFTER UPDATE ON goal_contribution_plans
        FOR EACH ROW
        BEGIN
          UPDATE goal_contribution_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_intermediate_milestones_timestamp
        AFTER UPDATE ON goal_intermediate_milestones
        FOR EACH ROW
        BEGIN
          UPDATE goal_intermediate_milestones SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_acceleration_strategies_timestamp
        AFTER UPDATE ON goal_acceleration_strategies
        FOR EACH ROW
        BEGIN
          UPDATE goal_acceleration_strategies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

      CREATE TRIGGER IF NOT EXISTS update_opportunity_matches_timestamp
        AFTER UPDATE ON goal_opportunity_matches
        FOR EACH ROW
        BEGIN
          UPDATE goal_opportunity_matches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
    `);

    console.log('✅ Migration 022: Goal optimizer tables created successfully');
    
  } catch (error) {
    console.error('❌ Error in migration 022:', error);
    throw error;
  }
}

function down(db) {
  console.log('Rolling back migration 022: Dropping goal optimizer tables...');
  
  try {
    // Eliminar triggers primero
    db.exec(`
      DROP TRIGGER IF EXISTS update_goal_gap_analysis_timestamp;
      DROP TRIGGER IF EXISTS update_optimization_strategies_timestamp;
      DROP TRIGGER IF EXISTS update_contribution_plans_timestamp;
      DROP TRIGGER IF EXISTS update_intermediate_milestones_timestamp;
      DROP TRIGGER IF EXISTS update_acceleration_strategies_timestamp;
      DROP TRIGGER IF EXISTS update_opportunity_matches_timestamp;
    `);

    // Eliminar índices
    db.exec(`
      DROP INDEX IF EXISTS idx_goal_gap_analysis_goal_date;
      DROP INDEX IF EXISTS idx_optimization_strategies_goal_priority;
      DROP INDEX IF EXISTS idx_contribution_plans_goal_active;
      DROP INDEX IF EXISTS idx_milestones_goal_order;
      DROP INDEX IF EXISTS idx_milestones_achievement;
      DROP INDEX IF EXISTS idx_acceleration_strategies_goal_active;
      DROP INDEX IF EXISTS idx_opportunity_matches_score;
      DROP INDEX IF EXISTS idx_opportunity_matches_priority;
    `);

    // Eliminar tablas en orden inverso (respetando foreign keys)
    db.exec(`
      DROP TABLE IF EXISTS goal_opportunity_matches;
      DROP TABLE IF EXISTS goal_acceleration_strategies;
      DROP TABLE IF EXISTS goal_intermediate_milestones;
      DROP TABLE IF EXISTS goal_contribution_plans;
      DROP TABLE IF EXISTS goal_optimization_strategies;
      DROP TABLE IF EXISTS goal_gap_analysis;
    `);

    console.log('✅ Migration 022 rolled back successfully');
  } catch (error) {
    console.error('❌ Error rolling back migration 022:', error);
    throw error;
  }
}

module.exports = { up, down };