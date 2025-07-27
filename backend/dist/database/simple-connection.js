import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('database');
class SimpleDatabaseConnection {
    static instance = null;
    static DB_PATH = process.env.DB_PATH || join(process.cwd(), 'database', 'simple-db.json');
    static getInstance() {
        if (!SimpleDatabaseConnection.instance) {
            SimpleDatabaseConnection.instance = SimpleDatabaseConnection.createConnection();
        }
        return SimpleDatabaseConnection.instance;
    }
    static createConnection() {
        try {
            // Ensure database directory exists
            const dbDir = join(SimpleDatabaseConnection.DB_PATH, '..');
            if (!existsSync(dbDir)) {
                mkdirSync(dbDir, { recursive: true });
                logger.info(`Created database directory: ${dbDir}`);
            }
            // Try to load existing database
            if (existsSync(SimpleDatabaseConnection.DB_PATH)) {
                try {
                    const data = readFileSync(SimpleDatabaseConnection.DB_PATH, 'utf8');
                    const db = JSON.parse(data);
                    logger.info(`Database loaded from: ${SimpleDatabaseConnection.DB_PATH}`);
                    return db;
                }
                catch (error) {
                    logger.warn('Failed to load existing database, creating new one:', error);
                }
            }
            // Create new database
            const db = {
                instruments: [],
                portfolio_positions: [],
                trades: [],
                quotes: [],
                commission_config: [],
                financial_goals: [],
                migrations_log: []
            };
            SimpleDatabaseConnection.save(db);
            logger.info(`New database created: ${SimpleDatabaseConnection.DB_PATH}`);
            return db;
        }
        catch (error) {
            logger.error('Failed to connect to database:', error);
            throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    static save(db) {
        try {
            const database = db || SimpleDatabaseConnection.instance;
            if (database) {
                writeFileSync(SimpleDatabaseConnection.DB_PATH, JSON.stringify(database, null, 2));
            }
        }
        catch (error) {
            logger.error('Failed to save database:', error);
        }
    }
    static close() {
        if (SimpleDatabaseConnection.instance) {
            SimpleDatabaseConnection.save();
            SimpleDatabaseConnection.instance = null;
            logger.info('Database connection closed');
        }
    }
    // Health check method
    static isHealthy() {
        try {
            const db = SimpleDatabaseConnection.getInstance();
            return db !== null;
        }
        catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }
    // Helper methods for CRUD operations
    static insert(table, data) {
        const db = SimpleDatabaseConnection.getInstance();
        const id = Math.max(0, ...db[table].map((item) => item.id || 0)) + 1;
        const record = { ...data, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        db[table].push(record);
        SimpleDatabaseConnection.save();
        return record;
    }
    static findById(table, id) {
        const db = SimpleDatabaseConnection.getInstance();
        return db[table].find((item) => item.id === id) || null;
    }
    static findBy(table, criteria) {
        const db = SimpleDatabaseConnection.getInstance();
        return db[table].find((item) => {
            return Object.entries(criteria).every(([key, value]) => item[key] === value);
        }) || null;
    }
    static findAll(table, criteria) {
        const db = SimpleDatabaseConnection.getInstance();
        if (!criteria) {
            return db[table];
        }
        return db[table].filter((item) => {
            return Object.entries(criteria).every(([key, value]) => {
                if (value === undefined)
                    return true;
                return item[key] === value;
            });
        });
    }
    static update(table, id, data) {
        const db = SimpleDatabaseConnection.getInstance();
        const index = db[table].findIndex((item) => item.id === id);
        if (index === -1) {
            return null;
        }
        const updated = { ...db[table][index], ...data, updated_at: new Date().toISOString() };
        db[table][index] = updated;
        SimpleDatabaseConnection.save();
        return updated;
    }
    static delete(table, id) {
        const db = SimpleDatabaseConnection.getInstance();
        const index = db[table].findIndex((item) => item.id === id);
        if (index === -1) {
            return false;
        }
        db[table].splice(index, 1);
        SimpleDatabaseConnection.save();
        return true;
    }
    static search(table, searchTerm, fields) {
        const db = SimpleDatabaseConnection.getInstance();
        const term = searchTerm.toLowerCase();
        return db[table].filter((item) => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    }
}
export default SimpleDatabaseConnection;
//# sourceMappingURL=simple-connection.js.map