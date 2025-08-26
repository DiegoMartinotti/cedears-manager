import { Database, RunResult } from 'better-sqlite3';
import { SimpleDatabase } from '../database/SimpleDatabase';

// Types for the 7 scenario tables
export interface ScenarioDefinition {
  id?: number;
  name: string;
  description: string;
  category: 'MACRO' | 'MARKET' | 'SECTOR' | 'CUSTOM';
  is_active: boolean;
  is_predefined: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScenarioVariable {
  id?: number;
  scenario_id: number;
  variable_type: 'INFLATION' | 'USD_ARS' | 'INTEREST_RATE' | 'MARKET_CRASH' | 'SECTOR_GROWTH' | 'COMMODITY_PRICE';
  variable_name: string;
  current_value: number;
  scenario_value: number;
  change_percentage: number;
  impact_duration_months: number;
  created_at?: string;
}

export interface ScenarioResult {
  id?: number;
  scenario_id: number;
  simulation_date: string;
  portfolio_value_before: number;
  portfolio_value_after: number;
  total_return_percentage: number;
  risk_adjusted_return: number;
  max_drawdown: number;
  volatility: number;
  confidence_level: number;
  simulation_duration_months: number;
  metadata?: string; // JSON string
  created_at?: string;
}

export interface ScenarioInstrumentImpact {
  id?: number;
  scenario_result_id: number;
  instrument_id: number;
  current_price: number;
  projected_price: number;
  price_change_percentage: number;
  position_impact: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'HEDGE';
  confidence: number;
  reasoning?: string;
  created_at?: string;
}

export interface ScenarioTemplate {
  id?: number;
  name: string;
  description: string;
  category: string;
  template_data: string; // JSON string with variables
  usage_count: number;
  is_public: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface ScenarioComparison {
  id?: number;
  name: string;
  scenario_ids: string; // JSON array of scenario IDs
  comparison_metrics: string; // JSON object with metrics
  best_case_scenario_id?: number;
  worst_case_scenario_id?: number;
  recommended_scenario_id?: number;
  created_by: string;
  created_at?: string;
}

export interface ScenarioMonteCarlo {
  id?: number;
  scenario_id: number;
  iterations: number;
  confidence_intervals: string; // JSON object
  mean_return: number;
  median_return: number;
  std_deviation: number;
  var_95: number;
  var_99: number;
  probability_positive: number;
  probability_loss: number;
  simulation_data: string; // JSON array of results
  created_at?: string;
}

// Statistics interfaces
export interface ScenarioStats {
  total_scenarios: number;
  active_scenarios: number;
  predefined_scenarios: number;
  custom_scenarios: number;
  simulations_run: number;
  average_confidence: number;
  categories: Record<string, number>;
}

export interface ScenarioSummary extends ScenarioDefinition {
  variables_count: number;
  last_simulation?: string;
  simulation_count: number;
  average_return?: number;
  average_confidence?: number;
}

export class ScenarioModel {
  private db: Database;

  constructor() {
    this.db = SimpleDatabase.getInstance().getDatabase();
  }

  // ==================== SCENARIO DEFINITIONS ====================

  async createScenario(scenario: Omit<ScenarioDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_definitions (name, description, category, is_active, is_predefined, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      scenario.name,
      scenario.description,
      scenario.category,
      scenario.is_active ? 1 : 0,
      scenario.is_predefined ? 1 : 0,
      scenario.created_by
    ) as RunResult;

    return result.lastInsertRowid as number;
  }

  async getScenario(id: number): Promise<ScenarioDefinition | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM scenario_definitions WHERE id = ?
    `);
    
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      is_active: Boolean(row.is_active),
      is_predefined: Boolean(row.is_predefined)
    };
  }

  async getAllScenarios(filters: {
    category?: string;
    is_active?: boolean;
    is_predefined?: boolean;
  } = {}): Promise<ScenarioSummary[]> {
    const { query, params } = this.buildScenariosQuery(filters);
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return this.mapScenarioRows(rows);
  }

  private buildScenariosQuery(filters: any) {
    let query = `
      SELECT 
        sd.*,
        COUNT(DISTINCT sv.id) as variables_count,
        MAX(sr.simulation_date) as last_simulation,
        COUNT(DISTINCT sr.id) as simulation_count,
        AVG(sr.total_return_percentage) as average_return,
        AVG(sr.confidence_level) as average_confidence
      FROM scenario_definitions sd
      LEFT JOIN scenario_variables sv ON sd.id = sv.scenario_id
      LEFT JOIN scenario_results sr ON sd.id = sr.scenario_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.category) {
      conditions.push('sd.category = ?');
      params.push(filters.category);
    }

    if (filters.is_active !== undefined) {
      conditions.push('sd.is_active = ?');
      params.push(filters.is_active ? 1 : 0);
    }

    if (filters.is_predefined !== undefined) {
      conditions.push('sd.is_predefined = ?');
      params.push(filters.is_predefined ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY sd.id ORDER BY sd.created_at DESC';
    
    return { query, params };
  }

  private mapScenarioRows(rows: any[]): ScenarioSummary[] {
    return rows.map(row => ({
      ...row,
      is_active: Boolean(row.is_active),
      is_predefined: Boolean(row.is_predefined),
      variables_count: row.variables_count || 0,
      simulation_count: row.simulation_count || 0,
      average_return: row.average_return || null,
      average_confidence: row.average_confidence || null
    }));
  }

  async updateScenario(id: number, updates: Partial<ScenarioDefinition>): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }

    if (updates.category !== undefined) {
      fields.push('category = ?');
      params.push(updates.category);
    }

    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.is_active ? 1 : 0);
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE scenario_definitions 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...params) as RunResult;
    return result.changes > 0;
  }

  async deleteScenario(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM scenario_definitions WHERE id = ?');
    const result = stmt.run(id) as RunResult;
    return result.changes > 0;
  }

  // ==================== SCENARIO VARIABLES ====================

  async createVariable(variable: Omit<ScenarioVariable, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_variables 
      (scenario_id, variable_type, variable_name, current_value, scenario_value, change_percentage, impact_duration_months)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      variable.scenario_id,
      variable.variable_type,
      variable.variable_name,
      variable.current_value,
      variable.scenario_value,
      variable.change_percentage,
      variable.impact_duration_months
    ) as RunResult;

    return result.lastInsertRowid as number;
  }

  async getScenarioVariables(scenarioId: number): Promise<ScenarioVariable[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM scenario_variables 
      WHERE scenario_id = ? 
      ORDER BY variable_type, variable_name
    `);
    
    return stmt.all(scenarioId) as ScenarioVariable[];
  }

  async updateVariable(id: number, updates: Partial<ScenarioVariable>): Promise<boolean> {
    const fields: string[] = [];
    const params: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) return false;

    params.push(id);
    const stmt = this.db.prepare(`
      UPDATE scenario_variables 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...params) as RunResult;
    return result.changes > 0;
  }

  async deleteVariable(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM scenario_variables WHERE id = ?');
    const result = stmt.run(id) as RunResult;
    return result.changes > 0;
  }

  // ==================== SCENARIO RESULTS ====================

  async createResult(result: Omit<ScenarioResult, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_results 
      (scenario_id, simulation_date, portfolio_value_before, portfolio_value_after, 
       total_return_percentage, risk_adjusted_return, max_drawdown, volatility,
       confidence_level, simulation_duration_months, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertResult = stmt.run(
      result.scenario_id,
      result.simulation_date,
      result.portfolio_value_before,
      result.portfolio_value_after,
      result.total_return_percentage,
      result.risk_adjusted_return,
      result.max_drawdown,
      result.volatility,
      result.confidence_level,
      result.simulation_duration_months,
      result.metadata || null
    ) as RunResult;

    return insertResult.lastInsertRowid as number;
  }

  async getScenarioResults(scenarioId: number, limit?: number): Promise<ScenarioResult[]> {
    let query = `
      SELECT * FROM scenario_results 
      WHERE scenario_id = ? 
      ORDER BY simulation_date DESC
    `;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    const stmt = this.db.prepare(query);
    return stmt.all(scenarioId) as ScenarioResult[];
  }

  async getLatestResult(scenarioId: number): Promise<ScenarioResult | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM scenario_results 
      WHERE scenario_id = ? 
      ORDER BY simulation_date DESC 
      LIMIT 1
    `);
    
    return stmt.get(scenarioId) as ScenarioResult | null;
  }

  // ==================== SCENARIO INSTRUMENT IMPACTS ====================

  async createInstrumentImpact(impact: Omit<ScenarioInstrumentImpact, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_instrument_impacts 
      (scenario_result_id, instrument_id, current_price, projected_price, 
       price_change_percentage, position_impact, recommendation, confidence, reasoning)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      impact.scenario_result_id,
      impact.instrument_id,
      impact.current_price,
      impact.projected_price,
      impact.price_change_percentage,
      impact.position_impact,
      impact.recommendation,
      impact.confidence,
      impact.reasoning || null
    ) as RunResult;

    return result.lastInsertRowid as number;
  }

  async getResultInstrumentImpacts(resultId: number): Promise<(ScenarioInstrumentImpact & { ticker: string; name: string })[]> {
    const stmt = this.db.prepare(`
      SELECT 
        sii.*,
        i.ticker,
        i.name
      FROM scenario_instrument_impacts sii
      JOIN instruments i ON sii.instrument_id = i.id
      WHERE sii.scenario_result_id = ?
      ORDER BY ABS(sii.price_change_percentage) DESC
    `);
    
    return stmt.all(resultId) as (ScenarioInstrumentImpact & { ticker: string; name: string })[];
  }

  // ==================== SCENARIO TEMPLATES ====================

  async createTemplate(template: Omit<ScenarioTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_templates 
      (name, description, category, template_data, usage_count, is_public, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      template.name,
      template.description,
      template.category,
      template.template_data,
      template.usage_count || 0,
      template.is_public ? 1 : 0,
      template.created_by
    ) as RunResult;

    return result.lastInsertRowid as number;
  }

  async getTemplates(isPublic?: boolean): Promise<ScenarioTemplate[]> {
    let query = 'SELECT * FROM scenario_templates';
    const params: any[] = [];

    if (isPublic !== undefined) {
      query += ' WHERE is_public = ?';
      params.push(isPublic ? 1 : 0);
    }

    query += ' ORDER BY usage_count DESC, created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(row => ({
      ...row,
      is_public: Boolean(row.is_public)
    }));
  }

  async incrementTemplateUsage(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE scenario_templates 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    const result = stmt.run(id) as RunResult;
    return result.changes > 0;
  }

  // ==================== SCENARIO COMPARISONS ====================

  async createComparison(comparison: Omit<ScenarioComparison, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_comparisons 
      (name, scenario_ids, comparison_metrics, best_case_scenario_id, 
       worst_case_scenario_id, recommended_scenario_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      comparison.name,
      comparison.scenario_ids,
      comparison.comparison_metrics,
      comparison.best_case_scenario_id || null,
      comparison.worst_case_scenario_id || null,
      comparison.recommended_scenario_id || null,
      comparison.created_by
    ) as RunResult;

    return result.lastInsertRowid as number;
  }

  async getComparisons(createdBy?: string): Promise<ScenarioComparison[]> {
    let query = 'SELECT * FROM scenario_comparisons';
    const params: any[] = [];

    if (createdBy) {
      query += ' WHERE created_by = ?';
      params.push(createdBy);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as ScenarioComparison[];
  }

  // ==================== SCENARIO MONTE CARLO ====================

  async createMonteCarlo(monteCarlo: Omit<ScenarioMonteCarlo, 'id' | 'created_at'>): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO scenario_monte_carlo 
      (scenario_id, iterations, confidence_intervals, mean_return, median_return,
       std_deviation, var_95, var_99, probability_positive, probability_loss, simulation_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      monteCarlo.scenario_id,
      monteCarlo.iterations,
      monteCarlo.confidence_intervals,
      monteCarlo.mean_return,
      monteCarlo.median_return,
      monteCarlo.std_deviation,
      monteCarlo.var_95,
      monteCarlo.var_99,
      monteCarlo.probability_positive,
      monteCarlo.probability_loss,
      monteCarlo.simulation_data
    ) as RunResult;

    return result.lastInsertRowid as number;
  }

  async getMonteCarloResults(scenarioId: number): Promise<ScenarioMonteCarlo[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM scenario_monte_carlo 
      WHERE scenario_id = ? 
      ORDER BY created_at DESC
    `);
    
    return stmt.all(scenarioId) as ScenarioMonteCarlo[];
  }

  // ==================== STATISTICS ====================

  async getStats(): Promise<ScenarioStats> {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM scenario_definitions');
    const activeStmt = this.db.prepare('SELECT COUNT(*) as count FROM scenario_definitions WHERE is_active = 1');
    const predefinedStmt = this.db.prepare('SELECT COUNT(*) as count FROM scenario_definitions WHERE is_predefined = 1');
    const customStmt = this.db.prepare('SELECT COUNT(*) as count FROM scenario_definitions WHERE is_predefined = 0');
    const simulationsStmt = this.db.prepare('SELECT COUNT(*) as count FROM scenario_results');
    const avgConfidenceStmt = this.db.prepare('SELECT AVG(confidence_level) as avg FROM scenario_results');
    const categoriesStmt = this.db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM scenario_definitions 
      GROUP BY category
    `);

    const total = (totalStmt.get() as any)?.count || 0;
    const active = (activeStmt.get() as any)?.count || 0;
    const predefined = (predefinedStmt.get() as any)?.count || 0;
    const custom = (customStmt.get() as any)?.count || 0;
    const simulations = (simulationsStmt.get() as any)?.count || 0;
    const avgConfidence = (avgConfidenceStmt.get() as any)?.avg || 0;
    const categoryRows = categoriesStmt.all() as any[];

    const categories: Record<string, number> = {};
    categoryRows.forEach(row => {
      categories[row.category] = row.count;
    });

    return {
      total_scenarios: total,
      active_scenarios: active,
      predefined_scenarios: predefined,
      custom_scenarios: custom,
      simulations_run: simulations,
      average_confidence: Math.round(avgConfidence * 100) / 100,
      categories
    };
  }

  async cleanup(): Promise<void> {
    // Clean up old scenario results (keep last 100 per scenario)
    const stmt = this.db.prepare(`
      DELETE FROM scenario_results 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY scenario_id ORDER BY simulation_date DESC) as rn
          FROM scenario_results
        ) WHERE rn <= 100
      )
    `);
    
    stmt.run();
  }
}

export const scenarioModel = new ScenarioModel();