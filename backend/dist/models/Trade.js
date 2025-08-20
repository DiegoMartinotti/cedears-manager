import DatabaseConnection from '../database/connection.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('Trade');
export class Trade {
    constructor() {
        this.db = DatabaseConnection.getInstance();
    }
    async create(data) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO trades (
          instrument_id, type, quantity, price, total_amount,
          commission, taxes, net_amount, trade_date, settlement_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const result = stmt.run(data.instrument_id, data.type, data.quantity, data.price, data.total_amount, data.commission || 0, data.taxes || 0, data.net_amount, data.trade_date, data.settlement_date || null, data.notes || null);
            const newTrade = await this.findById(result.lastInsertRowid);
            if (!newTrade) {
                throw new Error('Failed to retrieve created trade');
            }
            return newTrade;
        }
        catch (error) {
            logger.error('Error creating trade:', error);
            throw new Error(`Failed to create trade: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM trades WHERE id = ?');
            const result = stmt.get(id);
            return result || null;
        }
        catch (error) {
            logger.error('Error finding trade by id:', error);
            throw new Error(`Failed to find trade: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAll(filters) {
        try {
            let query = 'SELECT * FROM trades WHERE 1=1';
            const params = [];
            if (filters?.instrumentId) {
                query += ' AND instrument_id = ?';
                params.push(filters.instrumentId);
            }
            if (filters?.type) {
                query += ' AND type = ?';
                params.push(filters.type);
            }
            if (filters?.fromDate) {
                query += ' AND trade_date >= ?';
                params.push(filters.fromDate);
            }
            if (filters?.toDate) {
                query += ' AND trade_date <= ?';
                params.push(filters.toDate);
            }
            query += ' ORDER BY trade_date DESC, created_at DESC';
            if (filters?.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
                if (filters?.offset) {
                    query += ' OFFSET ?';
                    params.push(filters.offset);
                }
            }
            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        }
        catch (error) {
            logger.error('Error finding trades:', error);
            throw new Error(`Failed to find trades: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAllWithInstruments(filters) {
        try {
            let query = `
        SELECT 
          t.*,
          i.symbol,
          i.company_name
        FROM trades t
        INNER JOIN instruments i ON t.instrument_id = i.id
        WHERE 1=1
      `;
            const params = [];
            if (filters?.instrumentId) {
                query += ' AND t.instrument_id = ?';
                params.push(filters.instrumentId);
            }
            if (filters?.type) {
                query += ' AND t.type = ?';
                params.push(filters.type);
            }
            if (filters?.fromDate) {
                query += ' AND t.trade_date >= ?';
                params.push(filters.fromDate);
            }
            if (filters?.toDate) {
                query += ' AND t.trade_date <= ?';
                params.push(filters.toDate);
            }
            query += ' ORDER BY t.trade_date DESC, t.created_at DESC';
            if (filters?.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
                if (filters?.offset) {
                    query += ' OFFSET ?';
                    params.push(filters.offset);
                }
            }
            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        }
        catch (error) {
            logger.error('Error finding trades with instruments:', error);
            throw new Error(`Failed to find trades: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findByInstrumentId(instrumentId, limit) {
        return this.findAll({ instrumentId, limit });
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
            params.push(id);
            const stmt = this.db.prepare(`
        UPDATE trades 
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
            logger.error('Error updating trade:', error);
            throw new Error(`Failed to update trade: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async delete(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM trades WHERE id = ?');
            const result = stmt.run(id);
            return result.changes > 0;
        }
        catch (error) {
            logger.error('Error deleting trade:', error);
            throw new Error(`Failed to delete trade: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getTradesSummary(instrumentId) {
        try {
            let query = `
        SELECT 
          COUNT(*) as total_trades,
          SUM(CASE WHEN type = 'BUY' THEN 1 ELSE 0 END) as total_buys,
          SUM(CASE WHEN type = 'SELL' THEN 1 ELSE 0 END) as total_sells,
          COALESCE(SUM(CASE WHEN type = 'BUY' THEN total_amount ELSE 0 END), 0) as total_buy_amount,
          COALESCE(SUM(CASE WHEN type = 'SELL' THEN total_amount ELSE 0 END), 0) as total_sell_amount,
          COALESCE(SUM(commission), 0) as total_commission,
          COALESCE(SUM(taxes), 0) as total_taxes
        FROM trades
      `;
            const params = [];
            if (instrumentId) {
                query += ' WHERE instrument_id = ?';
                params.push(instrumentId);
            }
            const stmt = this.db.prepare(query);
            const result = stmt.get(...params);
            return {
                total_trades: result.total_trades || 0,
                total_buys: result.total_buys || 0,
                total_sells: result.total_sells || 0,
                total_buy_amount: result.total_buy_amount || 0,
                total_sell_amount: result.total_sell_amount || 0,
                total_commission: result.total_commission || 0,
                total_taxes: result.total_taxes || 0
            };
        }
        catch (error) {
            logger.error('Error getting trades summary:', error);
            throw new Error(`Failed to get trades summary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getMonthlyTradesSummary(year) {
        try {
            let query = `
        SELECT 
          strftime('%Y-%m', trade_date) as month,
          COUNT(*) as total_trades,
          COALESCE(SUM(CASE WHEN type = 'BUY' THEN total_amount ELSE 0 END), 0) as buy_amount,
          COALESCE(SUM(CASE WHEN type = 'SELL' THEN total_amount ELSE 0 END), 0) as sell_amount,
          COALESCE(SUM(CASE WHEN type = 'SELL' THEN total_amount ELSE -total_amount END), 0) as net_amount
        FROM trades
      `;
            const params = [];
            if (year) {
                query += ' WHERE strftime("%Y", trade_date) = ?';
                params.push(year.toString());
            }
            query += ' GROUP BY strftime("%Y-%m", trade_date) ORDER BY month DESC';
            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        }
        catch (error) {
            logger.error('Error getting monthly trades summary:', error);
            throw new Error(`Failed to get monthly trades summary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
