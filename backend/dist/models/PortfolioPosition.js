import DatabaseConnection from '../database/connection.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('PortfolioPosition');
export class PortfolioPosition {
    db = DatabaseConnection.getInstance();
    async create(data) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO portfolio_positions (instrument_id, quantity, average_cost, total_cost)
        VALUES (?, ?, ?, ?)
      `);
            const result = stmt.run(data.instrument_id, data.quantity, data.average_cost, data.total_cost);
            return this.findById(result.lastInsertRowid);
        }
        catch (error) {
            logger.error('Error creating portfolio position:', error);
            throw new Error(`Failed to create portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM portfolio_positions WHERE id = ?');
            const result = stmt.get(id);
            return result || null;
        }
        catch (error) {
            logger.error('Error finding portfolio position by id:', error);
            throw new Error(`Failed to find portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findByInstrumentId(instrumentId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM portfolio_positions WHERE instrument_id = ?');
            const result = stmt.get(instrumentId);
            return result || null;
        }
        catch (error) {
            logger.error('Error finding portfolio position by instrument id:', error);
            throw new Error(`Failed to find portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAll() {
        try {
            const stmt = this.db.prepare('SELECT * FROM portfolio_positions ORDER BY updated_at DESC');
            return stmt.all();
        }
        catch (error) {
            logger.error('Error finding all portfolio positions:', error);
            throw new Error(`Failed to find portfolio positions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAllWithInstruments() {
        try {
            const stmt = this.db.prepare(`
        SELECT 
          pp.*,
          i.symbol,
          i.company_name,
          q.price as current_price,
          (pp.quantity * q.price) as market_value,
          ((pp.quantity * q.price) - pp.total_cost) as unrealized_pnl,
          (((pp.quantity * q.price) - pp.total_cost) / pp.total_cost * 100) as unrealized_pnl_percentage
        FROM portfolio_positions pp
        INNER JOIN instruments i ON pp.instrument_id = i.id
        LEFT JOIN (
          SELECT 
            instrument_id,
            price,
            ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY quote_date DESC, created_at DESC) as rn
          FROM quotes
        ) q ON i.id = q.instrument_id AND q.rn = 1
        WHERE pp.quantity > 0
        ORDER BY pp.updated_at DESC
      `);
            return stmt.all();
        }
        catch (error) {
            logger.error('Error finding portfolio positions with instruments:', error);
            throw new Error(`Failed to find portfolio positions: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async update(id, data) {
        try {
            const updateFields = [];
            const params = [];
            for (const [key, value] of Object.entries(data)) {
                if (key !== 'id' && key !== 'created_at') {
                    updateFields.push(`${key} = ?`);
                    params.push(value);
                }
            }
            if (updateFields.length === 0) {
                return this.findById(id);
            }
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(id);
            const stmt = this.db.prepare(`
        UPDATE portfolio_positions 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `);
            const result = stmt.run(...params);
            if (result.changes === 0) {
                return null;
            }
            return this.findById(id);
        }
        catch (error) {
            logger.error('Error updating portfolio position:', error);
            throw new Error(`Failed to update portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async updateByInstrumentId(instrumentId, data) {
        try {
            const updateFields = [];
            const params = [];
            for (const [key, value] of Object.entries(data)) {
                if (key !== 'id' && key !== 'instrument_id' && key !== 'created_at') {
                    updateFields.push(`${key} = ?`);
                    params.push(value);
                }
            }
            if (updateFields.length === 0) {
                return this.findByInstrumentId(instrumentId);
            }
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(instrumentId);
            const stmt = this.db.prepare(`
        UPDATE portfolio_positions 
        SET ${updateFields.join(', ')} 
        WHERE instrument_id = ?
      `);
            const result = stmt.run(...params);
            if (result.changes === 0) {
                return null;
            }
            return this.findByInstrumentId(instrumentId);
        }
        catch (error) {
            logger.error('Error updating portfolio position by instrument id:', error);
            throw new Error(`Failed to update portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async delete(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM portfolio_positions WHERE id = ?');
            const result = stmt.run(id);
            return result.changes > 0;
        }
        catch (error) {
            logger.error('Error deleting portfolio position:', error);
            throw new Error(`Failed to delete portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async deleteByInstrumentId(instrumentId) {
        try {
            const stmt = this.db.prepare('DELETE FROM portfolio_positions WHERE instrument_id = ?');
            const result = stmt.run(instrumentId);
            return result.changes > 0;
        }
        catch (error) {
            logger.error('Error deleting portfolio position by instrument id:', error);
            throw new Error(`Failed to delete portfolio position: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getTotalPortfolioValue() {
        try {
            const stmt = this.db.prepare(`
        SELECT 
          COALESCE(SUM(pp.total_cost), 0) as total_cost,
          COALESCE(SUM(pp.quantity * q.price), 0) as market_value,
          COALESCE(SUM((pp.quantity * q.price) - pp.total_cost), 0) as unrealized_pnl
        FROM portfolio_positions pp
        INNER JOIN instruments i ON pp.instrument_id = i.id
        LEFT JOIN (
          SELECT 
            instrument_id,
            price,
            ROW_NUMBER() OVER (PARTITION BY instrument_id ORDER BY quote_date DESC, created_at DESC) as rn
          FROM quotes
        ) q ON i.id = q.instrument_id AND q.rn = 1
        WHERE pp.quantity > 0
      `);
            const result = stmt.get();
            return result;
        }
        catch (error) {
            logger.error('Error calculating total portfolio value:', error);
            throw new Error(`Failed to calculate portfolio value: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=PortfolioPosition.js.map