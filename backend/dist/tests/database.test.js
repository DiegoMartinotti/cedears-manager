import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import DatabaseConnection from '../database/connection.js';
import { MigrationRunner } from '../database/migrations.js';
describe('Database Connection and Migrations', () => {
    beforeAll(async () => {
        // Setup test database
        process.env.DB_PATH = ':memory:'; // Use in-memory database for testing
    });
    afterAll(() => {
        // Cleanup
        DatabaseConnection.close();
    });
    it('should create database connection', () => {
        const db = DatabaseConnection.getInstance();
        expect(db).toBeDefined();
    });
    it('should run health check successfully', () => {
        const isHealthy = DatabaseConnection.isHealthy();
        expect(isHealthy).toBe(true);
    });
    it('should run all migrations successfully', async () => {
        const migrationRunner = new MigrationRunner();
        // Should not throw an error
        await expect(migrationRunner.runMigrations()).resolves.toBeUndefined();
    });
    it('should have all required tables after migrations', () => {
        const db = DatabaseConnection.getInstance();
        const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
        const tableNames = tables.map(t => t.name);
        expect(tableNames).toContain('instruments');
        expect(tableNames).toContain('portfolio_positions');
        expect(tableNames).toContain('trades');
        expect(tableNames).toContain('quotes');
        expect(tableNames).toContain('commission_config');
        expect(tableNames).toContain('financial_goals');
        expect(tableNames).toContain('migrations_log');
    });
    it('should have proper indexes on instruments table', () => {
        const db = DatabaseConnection.getInstance();
        const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='instruments'
    `).all();
        const indexNames = indexes.map(i => i.name);
        expect(indexNames).toContain('idx_instruments_symbol');
        expect(indexNames).toContain('idx_instruments_esg');
        expect(indexNames).toContain('idx_instruments_vegan');
        expect(indexNames).toContain('idx_instruments_active');
    });
});
//# sourceMappingURL=database.test.js.map