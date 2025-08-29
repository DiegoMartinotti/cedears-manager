/**
 * Migración 021: Tablas para proyecciones y escenarios de objetivos
 * Step 27: Proyecciones y Escenarios de Objetivos - Database Schema
 */

const migration021 = {
  up: (db) => {
    console.log('Aplicando migración 021: Creando tablas de proyecciones de objetivos...');

    // Tabla principal de proyecciones de objetivos
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_projections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        projection_date DATE NOT NULL,
        scenario_name TEXT NOT NULL,
        projection_type TEXT CHECK(projection_type IN ('OPTIMISTIC', 'REALISTIC', 'PESSIMISTIC', 'MONTE_CARLO')) NOT NULL,
        parameters TEXT NOT NULL, -- JSON con ProjectionParameters
        result TEXT NOT NULL, -- JSON con ProjectionResult
        confidence_level INTEGER CHECK(confidence_level >= 0 AND confidence_level <= 100),
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        UNIQUE(goal_id, projection_date, scenario_name)
      )
    `);

    // Tabla de análisis de sensibilidad
    db.exec(`
      CREATE TABLE IF NOT EXISTS sensitivity_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        analysis_date DATE NOT NULL,
        base_scenario TEXT NOT NULL, -- JSON con ProjectionResult base
        parameters_analyzed TEXT NOT NULL, -- JSON array con parámetros analizados
        results TEXT NOT NULL, -- JSON array con SensitivityResult[]
        summary TEXT NOT NULL, -- JSON con resumen del análisis
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        UNIQUE(goal_id, analysis_date)
      )
    `);

    // Tabla de recomendaciones de Claude para objetivos
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        recommendation_type TEXT CHECK(recommendation_type IN (
          'STRATEGY_ADJUSTMENT', 'CONTRIBUTION_OPTIMIZATION', 'RISK_MANAGEMENT', 
          'TIMELINE_ADJUSTMENT', 'DIVERSIFICATION'
        )) NOT NULL,
        priority TEXT CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        implementation_steps TEXT, -- JSON array
        estimated_impact TEXT, -- JSON con impactos estimados
        confidence_score INTEGER CHECK(confidence_score >= 0 AND confidence_score <= 100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        is_implemented BOOLEAN DEFAULT FALSE,
        implementation_notes TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      )
    `);

    // Tabla de planes de inversión exportables
    db.exec(`
      CREATE TABLE IF NOT EXISTS investment_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        plan_name TEXT NOT NULL,
        plan_type TEXT CHECK(plan_type IN ('STANDARD', 'OPTIMIZED', 'CUSTOM')) DEFAULT 'STANDARD',
        parameters TEXT NOT NULL, -- JSON con parámetros del plan
        projection_data TEXT NOT NULL, -- JSON con datos de proyección
        contribution_schedule TEXT NOT NULL, -- JSON con calendario de aportes
        milestones TEXT, -- JSON con hitos del plan
        export_format TEXT CHECK(export_format IN ('PDF', 'EXCEL', 'JSON')) DEFAULT 'PDF',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_exported_at DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        notes TEXT,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      )
    `);

    // Tabla de simulaciones Monte Carlo detalladas
    db.exec(`
      CREATE TABLE IF NOT EXISTS monte_carlo_simulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        simulation_date DATE NOT NULL,
        simulations_count INTEGER NOT NULL,
        confidence_intervals TEXT NOT NULL, -- JSON con intervalos de confianza
        success_probability REAL NOT NULL,
        expected_shortfall REAL,
        volatility_metrics TEXT NOT NULL, -- JSON con métricas de volatilidad
        distribution_data TEXT, -- JSON con datos de distribución (opcional)
        parameters_used TEXT NOT NULL, -- JSON con parámetros utilizados
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        UNIQUE(goal_id, simulation_date)
      )
    `);

    // Tabla de escenarios de stress testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS stress_test_scenarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        scenario_name TEXT NOT NULL,
        scenario_description TEXT NOT NULL,
        severity TEXT CHECK(severity IN ('MILD', 'MODERATE', 'SEVERE')) NOT NULL,
        probability REAL CHECK(probability >= 0 AND probability <= 100),
        parameters TEXT NOT NULL, -- JSON con parámetros del escenario
        result TEXT NOT NULL, -- JSON con resultado de la proyección
        impact_analysis TEXT, -- JSON con análisis de impacto
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      )
    `);

    // Tabla de estrategias personalizadas generadas por Claude
    db.exec(`
      CREATE TABLE IF NOT EXISTS personalized_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        strategy_name TEXT NOT NULL,
        description TEXT NOT NULL,
        recommended_actions TEXT NOT NULL, -- JSON con acciones recomendadas
        risk_assessment TEXT NOT NULL, -- JSON con evaluación de riesgo
        optimization_opportunities TEXT NOT NULL, -- JSON con oportunidades
        success_metrics TEXT NOT NULL, -- JSON con métricas de éxito
        confidence_score INTEGER CHECK(confidence_score >= 0 AND confidence_score <= 100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        user_feedback TEXT, -- Feedback del usuario sobre la estrategia
        implementation_status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, IMPLEMENTED, ABANDONED
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      )
    `);

    // Tabla de correlaciones entre parámetros
    db.exec(`
      CREATE TABLE IF NOT EXISTS parameter_correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        parameter1 TEXT NOT NULL,
        parameter2 TEXT NOT NULL,
        correlation_coefficient REAL CHECK(correlation_coefficient >= -1 AND correlation_coefficient <= 1),
        confidence_level REAL,
        calculation_date DATE NOT NULL,
        data_points_used INTEGER,
        methodology TEXT, -- Descripción del método usado para calcular correlación
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        UNIQUE(goal_id, parameter1, parameter2, calculation_date)
      )
    `);

    // Índices para optimización de queries
    console.log('Creando índices para optimización...');

    // Índices para goal_projections
    db.exec('CREATE INDEX IF NOT EXISTS idx_goal_projections_goal_id ON goal_projections(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_goal_projections_date ON goal_projections(projection_date DESC)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_goal_projections_type ON goal_projections(projection_type)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_goal_projections_active ON goal_projections(is_active, goal_id)');

    // Índices para sensitivity_analysis
    db.exec('CREATE INDEX IF NOT EXISTS idx_sensitivity_goal_id ON sensitivity_analysis(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_sensitivity_date ON sensitivity_analysis(analysis_date DESC)');

    // Índices para goal_recommendations
    db.exec('CREATE INDEX IF NOT EXISTS idx_recommendations_goal_id ON goal_recommendations(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON goal_recommendations(priority, goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON goal_recommendations(expires_at)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_recommendations_implemented ON goal_recommendations(is_implemented, goal_id)');

    // Índices para investment_plans
    db.exec('CREATE INDEX IF NOT EXISTS idx_investment_plans_goal_id ON investment_plans(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_investment_plans_active ON investment_plans(is_active, goal_id)');

    // Índices para monte_carlo_simulations
    db.exec('CREATE INDEX IF NOT EXISTS idx_monte_carlo_goal_id ON monte_carlo_simulations(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_monte_carlo_date ON monte_carlo_simulations(simulation_date DESC)');

    // Índices para stress_test_scenarios
    db.exec('CREATE INDEX IF NOT EXISTS idx_stress_test_goal_id ON stress_test_scenarios(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_stress_test_severity ON stress_test_scenarios(severity, goal_id)');

    // Índices para personalized_strategies
    db.exec('CREATE INDEX IF NOT EXISTS idx_strategies_goal_id ON personalized_strategies(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_strategies_active ON personalized_strategies(is_active, goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_strategies_status ON personalized_strategies(implementation_status)');

    // Índices para parameter_correlations
    db.exec('CREATE INDEX IF NOT EXISTS idx_correlations_goal_id ON parameter_correlations(goal_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_correlations_params ON parameter_correlations(parameter1, parameter2)');

    console.log('Migración 021 aplicada exitosamente.');
    
    // Insertar datos de ejemplo para testing
    console.log('Insertando datos de ejemplo...');
    
    // Ejemplo de escenarios de stress test predefinidos
    const stressTestExamples = [
      {
        name: 'Crisis Financiera Global',
        description: 'Caída del mercado del 40% con recuperación lenta en 3 años',
        severity: 'SEVERE',
        probability: 5,
        parameters: JSON.stringify({
          annualReturnRate: -15,
          inflationRate: 180,
          volatilityIncrease: 200
        })
      },
      {
        name: 'Recesión Moderada',
        description: 'Recesión económica con retornos negativos por 18 meses',
        severity: 'MODERATE', 
        probability: 15,
        parameters: JSON.stringify({
          annualReturnRate: -5,
          inflationRate: 150,
          contributionImpact: -10
        })
      },
      {
        name: 'Inflación Descontrolada',
        description: 'Inflación muy alta sin llegar a hiperinflación',
        severity: 'MODERATE',
        probability: 25,
        parameters: JSON.stringify({
          annualReturnRate: 5,
          inflationRate: 300,
          realReturnImpact: -80
        })
      }
    ];

    // Insertar ejemplos solo si hay objetivos en la tabla
    const goalCount = db.prepare('SELECT COUNT(*) as count FROM financial_goals').get();
    
    if (goalCount.count > 0) {
      const firstGoalId = db.prepare('SELECT id FROM financial_goals LIMIT 1').get()?.id;
      
      if (firstGoalId) {
        const insertStressTest = db.prepare(`
          INSERT OR IGNORE INTO stress_test_scenarios 
          (goal_id, scenario_name, scenario_description, severity, probability, parameters, result, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        for (const scenario of stressTestExamples) {
          insertStressTest.run([
            firstGoalId,
            scenario.name,
            scenario.description,
            scenario.severity,
            scenario.probability,
            scenario.parameters,
            JSON.stringify({ simulationResult: 'pending' })
          ]);
        }
        
        console.log('Datos de ejemplo insertados correctamente.');
      }
    }

    console.log('✅ Migración 021 completada: Sistema de proyecciones y escenarios implementado');
  },

  down: (db) => {
    console.log('Revirtiendo migración 021: Eliminando tablas de proyecciones...');
    
    // Eliminar índices primero
    const indices = [
      'idx_goal_projections_goal_id', 'idx_goal_projections_date', 'idx_goal_projections_type', 'idx_goal_projections_active',
      'idx_sensitivity_goal_id', 'idx_sensitivity_date',
      'idx_recommendations_goal_id', 'idx_recommendations_priority', 'idx_recommendations_expires', 'idx_recommendations_implemented',
      'idx_investment_plans_goal_id', 'idx_investment_plans_active',
      'idx_monte_carlo_goal_id', 'idx_monte_carlo_date',
      'idx_stress_test_goal_id', 'idx_stress_test_severity',
      'idx_strategies_goal_id', 'idx_strategies_active', 'idx_strategies_status',
      'idx_correlations_goal_id', 'idx_correlations_params'
    ];
    
    for (const index of indices) {
      try {
        db.exec(`DROP INDEX IF EXISTS ${index}`);
      } catch (error) {
        console.log(`Warning: No se pudo eliminar índice ${index}`);
      }
    }
    
    // Eliminar tablas en orden correcto (respetando foreign keys)
    const tables = [
      'parameter_correlations',
      'personalized_strategies', 
      'stress_test_scenarios',
      'monte_carlo_simulations',
      'investment_plans',
      'goal_recommendations',
      'sensitivity_analysis',
      'goal_projections'
    ];
    
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    
    console.log('Migración 021 revertida exitosamente.');
  }
};

module.exports = migration021;