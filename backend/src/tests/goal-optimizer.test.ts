/**
 * Tests para el Optimizador de Estrategia de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { GoalOptimizerService } from '../services/GoalOptimizerService';
import { GoalAccelerationService } from '../services/GoalAccelerationService';
import { GoalOpportunityIntegrationService } from '../services/GoalOpportunityIntegrationService';
import { GoalTrackerService } from '../services/GoalTrackerService';

describe('GoalOptimizerService', () => {
  let db: Database.Database;
  let optimizerService: GoalOptimizerService;
  let goalTrackerService: GoalTrackerService;
  let testGoalId: number;

  beforeEach(async () => {
    // Crear base de datos en memoria para tests
    db = new Database(':memory:');
    
    // Crear tablas necesarias
    db.exec(`
      CREATE TABLE financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target_amount REAL,
        target_date TEXT,
        monthly_contribution REAL DEFAULT 0,
        expected_return_rate REAL NOT NULL,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ACTIVE',
        description TEXT,
        currency TEXT DEFAULT 'USD',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE goal_gap_analysis (
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
        risk_level TEXT DEFAULT 'MEDIUM',
        analysis_details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );

      CREATE TABLE goal_optimization_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        strategy_name TEXT NOT NULL,
        strategy_type TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIUM',
        impact_score REAL NOT NULL,
        effort_level TEXT DEFAULT 'MEDIUM',
        time_to_implement_days INTEGER DEFAULT 0,
        estimated_time_savings_months REAL,
        estimated_cost_savings REAL,
        description TEXT NOT NULL,
        implementation_steps TEXT,
        requirements TEXT,
        risks TEXT,
        is_applied BOOLEAN DEFAULT 0,
        applied_date TEXT,
        results_tracking TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );

      CREATE TABLE goal_contribution_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        plan_name TEXT NOT NULL,
        plan_type TEXT DEFAULT 'MODERATE',
        base_monthly_contribution REAL NOT NULL,
        optimized_monthly_contribution REAL NOT NULL,
        contribution_increase REAL NOT NULL,
        extra_annual_contributions REAL DEFAULT 0,
        bonus_contributions TEXT,
        dynamic_adjustments BOOLEAN DEFAULT 1,
        seasonal_adjustments TEXT,
        affordability_score REAL,
        stress_test_scenarios TEXT,
        projected_completion_date TEXT,
        time_savings_months REAL,
        total_savings_amount REAL,
        success_probability REAL,
        monitoring_frequency_days INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT 0,
        activated_date TEXT,
        performance_tracking TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );

      CREATE TABLE goal_intermediate_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        milestone_name TEXT NOT NULL,
        milestone_type TEXT NOT NULL,
        milestone_order INTEGER NOT NULL,
        target_amount REAL,
        target_percentage REAL,
        target_date TEXT,
        current_progress REAL DEFAULT 0,
        progress_percentage REAL DEFAULT 0,
        is_achieved BOOLEAN DEFAULT 0,
        achieved_date TEXT,
        celebration_tier TEXT DEFAULT 'BRONZE',
        reward_suggestion TEXT,
        next_milestone_id INTEGER,
        dependency_milestones TEXT,
        auto_calculated BOOLEAN DEFAULT 1,
        adjustment_history TEXT,
        motivation_message TEXT,
        difficulty_level TEXT DEFAULT 'MODERATE',
        estimated_completion_date TEXT,
        buffer_days INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE,
        FOREIGN KEY (next_milestone_id) REFERENCES goal_intermediate_milestones(id)
      );
    `);

    // Inicializar servicios
    optimizerService = new GoalOptimizerService(db);
    goalTrackerService = new GoalTrackerService(db);

    // Crear objetivo de prueba
    const goal = await goalTrackerService.createFinancialGoal({
      name: 'Test Goal',
      type: 'CAPITAL',
      target_amount: 100000,
      target_date: '2025-12-31',
      monthly_contribution: 1000,
      expected_return_rate: 10,
      description: 'Test goal for optimizer',
      currency: 'USD'
    });

    testGoalId = goal.id;
  });

  afterEach(() => {
    db.close();
  });

  describe('performGapAnalysis', () => {
    it('should calculate gap analysis correctly', async () => {
      const gapAnalysis = await optimizerService.performGapAnalysis(testGoalId);

      expect(gapAnalysis).toBeDefined();
      expect(gapAnalysis.goal_id).toBe(testGoalId);
      expect(gapAnalysis.target_capital).toBe(100000);
      expect(gapAnalysis.gap_amount).toBeGreaterThan(0);
      expect(gapAnalysis.gap_percentage).toBeGreaterThan(0);
      expect(gapAnalysis.risk_level).toMatch(/^(LOW|MEDIUM|HIGH)$/);
    });

    it('should calculate required monthly contribution', async () => {
      const gapAnalysis = await optimizerService.performGapAnalysis(testGoalId);

      expect(gapAnalysis.required_monthly_contribution).toBeGreaterThan(0);
      expect(gapAnalysis.contribution_gap).toBeDefined();
    });

    it('should assess risk level based on gap percentage', async () => {
      const gapAnalysis = await optimizerService.performGapAnalysis(testGoalId);

      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(gapAnalysis.risk_level);
    });
  });

  describe('generateOptimizationStrategies', () => {
    it('should generate optimization strategies after gap analysis', async () => {
      // Primero realizar análisis de gap
      await optimizerService.performGapAnalysis(testGoalId);

      const strategies = await optimizerService.generateOptimizationStrategies(testGoalId);

      expect(strategies).toBeDefined();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);

      // Verificar que las estrategias tengan los campos correctos
      const firstStrategy = strategies[0];
      expect(firstStrategy.goal_id).toBe(testGoalId);
      expect(firstStrategy.strategy_name).toBeDefined();
      expect(firstStrategy.strategy_type).toBeDefined();
      expect(firstStrategy.description).toBeDefined();
    });

    it('should prioritize strategies correctly', async () => {
      await optimizerService.performGapAnalysis(testGoalId);
      const strategies = await optimizerService.generateOptimizationStrategies(testGoalId);

      const priorities = strategies.map(s => s.priority);
      expect(priorities).toContain('HIGH'); // Debe haber al menos una estrategia de alta prioridad
    });
  });

  describe('generateContributionPlans', () => {
    it('should generate contribution plans', async () => {
      await optimizerService.performGapAnalysis(testGoalId);
      const plans = await optimizerService.generateContributionPlans(testGoalId);

      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(3); // Conservative, Moderate, Aggressive

      // Verificar tipos de planes
      const planTypes = plans.map(p => p.plan_type);
      expect(planTypes).toContain('CONSERVATIVE');
      expect(planTypes).toContain('MODERATE');
      expect(planTypes).toContain('AGGRESSIVE');
    });

    it('should calculate contribution increases correctly', async () => {
      await optimizerService.performGapAnalysis(testGoalId);
      const plans = await optimizerService.generateContributionPlans(testGoalId);

      plans.forEach(plan => {
        expect(plan.optimized_monthly_contribution).toBeGreaterThanOrEqual(plan.base_monthly_contribution);
        expect(plan.contribution_increase).toBe(plan.optimized_monthly_contribution - plan.base_monthly_contribution);
      });
    });
  });

  describe('generateIntermediateMilestones', () => {
    it('should generate intermediate milestones', async () => {
      const milestones = await optimizerService.generateIntermediateMilestones(testGoalId);

      expect(milestones).toBeDefined();
      expect(Array.isArray(milestones)).toBe(true);
      expect(milestones.length).toBeGreaterThan(0);

      // Verificar orden de hitos
      for (let i = 0; i < milestones.length - 1; i++) {
        expect(milestones[i].milestone_order).toBeLessThan(milestones[i + 1].milestone_order);
      }
    });

    it('should create percentage-based milestones', async () => {
      const milestones = await optimizerService.generateIntermediateMilestones(testGoalId);

      const percentageMilestones = milestones.filter(m => m.milestone_type === 'PERCENTAGE');
      expect(percentageMilestones.length).toBeGreaterThan(0);

      // Verificar que los porcentajes son correctos
      percentageMilestones.forEach(milestone => {
        expect(milestone.target_percentage).toBeGreaterThan(0);
        expect(milestone.target_percentage).toBeLessThanOrEqual(100);
        expect(milestone.target_amount).toBeGreaterThan(0);
      });
    });
  });

  describe('getOptimizerSummary', () => {
    it('should return complete optimizer summary', async () => {
      // Generar datos necesarios
      await optimizerService.performGapAnalysis(testGoalId);
      await optimizerService.generateOptimizationStrategies(testGoalId);
      await optimizerService.generateContributionPlans(testGoalId);
      await optimizerService.generateIntermediateMilestones(testGoalId);

      const summary = await optimizerService.getOptimizerSummary(testGoalId);

      expect(summary).toBeDefined();
      expect(summary.goal_id).toBe(testGoalId);
      expect(summary.gap_analysis).toBeDefined();
      expect(summary.optimization_strategies).toBeDefined();
      expect(summary.contribution_plans).toBeDefined();
      expect(summary.milestones).toBeDefined();
      expect(summary.overall_score).toBeGreaterThanOrEqual(0);
      expect(summary.overall_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(summary.next_recommended_actions)).toBe(true);
    });

    it('should calculate overall optimization score', async () => {
      await optimizerService.performGapAnalysis(testGoalId);
      await optimizerService.generateOptimizationStrategies(testGoalId);
      await optimizerService.generateContributionPlans(testGoalId);
      await optimizerService.generateIntermediateMilestones(testGoalId);

      const summary = await optimizerService.getOptimizerSummary(testGoalId);

      expect(typeof summary.overall_score).toBe('number');
      expect(summary.overall_score).toBeGreaterThanOrEqual(0);
      expect(summary.overall_score).toBeLessThanOrEqual(100);
    });
  });
});

describe('GoalAccelerationService', () => {
  let db: Database.Database;
  let accelerationService: GoalAccelerationService;
  let goalTrackerService: GoalTrackerService;
  let testGoalId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    
    // Crear tablas necesarias (simplificadas para test)
    db.exec(`
      CREATE TABLE financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target_amount REAL,
        target_date TEXT,
        monthly_contribution REAL DEFAULT 0,
        expected_return_rate REAL NOT NULL,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ACTIVE',
        description TEXT,
        currency TEXT DEFAULT 'USD',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE goal_acceleration_strategies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        goal_id INTEGER NOT NULL,
        strategy_name TEXT NOT NULL,
        acceleration_type TEXT NOT NULL,
        potential_acceleration_months REAL NOT NULL,
        risk_increase_factor REAL NOT NULL,
        complexity_score REAL NOT NULL,
        capital_requirements REAL DEFAULT 0,
        expected_return_boost REAL,
        implementation_timeline_days INTEGER NOT NULL,
        monitoring_requirements TEXT,
        exit_conditions TEXT,
        success_metrics TEXT,
        historical_performance TEXT,
        market_conditions_required TEXT,
        portfolio_impact_analysis TEXT,
        recommendation_confidence REAL,
        claude_analysis TEXT,
        is_recommended BOOLEAN DEFAULT 1,
        is_active BOOLEAN DEFAULT 0,
        activated_date TEXT,
        deactivated_date TEXT,
        performance_tracking TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );
    `);

    accelerationService = new GoalAccelerationService(db);
    goalTrackerService = new GoalTrackerService(db);

    const goal = await goalTrackerService.createFinancialGoal({
      name: 'Test Acceleration Goal',
      type: 'CAPITAL',
      target_amount: 100000,
      monthly_contribution: 1000,
      expected_return_rate: 10,
      currency: 'USD'
    });

    testGoalId = goal.id;
  });

  afterEach(() => {
    db.close();
  });

  describe('generateAccelerationStrategies', () => {
    it('should generate acceleration strategies', async () => {
      const strategies = await accelerationService.generateAccelerationStrategies(testGoalId);

      expect(strategies).toBeDefined();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should include different acceleration types', async () => {
      const strategies = await accelerationService.generateAccelerationStrategies(testGoalId);

      const types = strategies.map(s => s.acceleration_type);
      expect(types.length).toBeGreaterThan(1);
      expect(types).toContain('MARKET_TIMING');
      expect(types).toContain('DIVIDEND_CAPTURE');
    });

    it('should calculate risk factors correctly', async () => {
      const strategies = await accelerationService.generateAccelerationStrategies(testGoalId);

      strategies.forEach(strategy => {
        expect(strategy.risk_increase_factor).toBeGreaterThanOrEqual(1.0);
        expect(strategy.complexity_score).toBeGreaterThanOrEqual(1);
        expect(strategy.complexity_score).toBeLessThanOrEqual(10);
        expect(strategy.potential_acceleration_months).toBeGreaterThan(0);
      });
    });
  });
});

describe('Integration Tests', () => {
  let db: Database.Database;
  let optimizerService: GoalOptimizerService;
  let testGoalId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    
    // Crear todas las tablas necesarias
    db.exec(`
      CREATE TABLE financial_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target_amount REAL,
        target_date TEXT,
        monthly_contribution REAL DEFAULT 0,
        expected_return_rate REAL NOT NULL,
        created_date TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ACTIVE',
        description TEXT,
        currency TEXT DEFAULT 'USD',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE goal_gap_analysis (
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
        risk_level TEXT DEFAULT 'MEDIUM',
        analysis_details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (goal_id) REFERENCES financial_goals(id) ON DELETE CASCADE
      );

      -- Agregar otras tablas necesarias...
    `);

    optimizerService = new GoalOptimizerService(db);
    
    const goalTrackerService = new GoalTrackerService(db);
    const goal = await goalTrackerService.createFinancialGoal({
      name: 'Integration Test Goal',
      type: 'CAPITAL',
      target_amount: 100000,
      target_date: '2026-12-31',
      monthly_contribution: 800,
      expected_return_rate: 8,
      currency: 'USD'
    });

    testGoalId = goal.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should complete full optimization workflow', async () => {
    // 1. Análisis de gap
    const gapAnalysis = await optimizerService.performGapAnalysis(testGoalId);
    expect(gapAnalysis).toBeDefined();

    // 2. Generar estrategias
    const strategies = await optimizerService.generateOptimizationStrategies(testGoalId);
    expect(strategies.length).toBeGreaterThan(0);

    // 3. Generar planes de contribución
    const plans = await optimizerService.generateContributionPlans(testGoalId);
    expect(plans.length).toBe(3);

    // 4. Generar hitos
    const milestones = await optimizerService.generateIntermediateMilestones(testGoalId);
    expect(milestones.length).toBeGreaterThan(0);

    // 5. Obtener resumen completo
    const summary = await optimizerService.getOptimizerSummary(testGoalId);
    expect(summary.goal_id).toBe(testGoalId);
    expect(summary.gap_analysis).toBeDefined();
    expect(summary.optimization_strategies.length).toBeGreaterThan(0);
    expect(summary.contribution_plans.length).toBe(3);
    expect(summary.milestones.length).toBeGreaterThan(0);
  });
});