import DatabaseConnection from '../database/connection.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('Instrument');
export class Instrument {
    db = DatabaseConnection.getInstance();
    async create(data) {
        try {
            const stmt = this.db.prepare(`
        INSERT INTO instruments (
          symbol, company_name, sector, industry, market_cap,
          is_esg_compliant, is_vegan_friendly, underlying_symbol,
          underlying_currency, ratio, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            const result = stmt.run(data.symbol, data.company_name, data.sector || null, data.industry || null, data.market_cap || null, data.is_esg_compliant || false, data.is_vegan_friendly || false, data.underlying_symbol || null, data.underlying_currency || 'USD', data.ratio || 1.0, data.is_active !== undefined ? data.is_active : true);
            return this.findById(result.lastInsertRowid);
        }
        catch (error) {
            logger.error('Error creating instrument:', error);
            throw new Error(`Failed to create instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM instruments WHERE id = ?');
            const result = stmt.get(id);
            return result || null;
        }
        catch (error) {
            logger.error('Error finding instrument by id:', error);
            throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findBySymbol(symbol) {
        try {
            const stmt = this.db.prepare('SELECT * FROM instruments WHERE symbol = ? AND is_active = 1');
            const result = stmt.get(symbol.toUpperCase());
            return result || null;
        }
        catch (error) {
            logger.error('Error finding instrument by symbol:', error);
            throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAll(filters) {
        try {
            let query = 'SELECT * FROM instruments WHERE 1=1';
            const params = [];
            if (filters?.isActive !== undefined) {
                query += ' AND is_active = ?';
                params.push(filters.isActive ? 1 : 0);
            }
            if (filters?.isESG !== undefined) {
                query += ' AND is_esg_compliant = ?';
                params.push(filters.isESG ? 1 : 0);
            }
            if (filters?.isVegan !== undefined) {
                query += ' AND is_vegan_friendly = ?';
                params.push(filters.isVegan ? 1 : 0);
            }
            if (filters?.sector) {
                query += ' AND sector = ?';
                params.push(filters.sector);
            }
            query += ' ORDER BY symbol ASC';
            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        }
        catch (error) {
            logger.error('Error finding instruments:', error);
            throw new Error(`Failed to find instruments: ${error instanceof Error ? error.message : String(error)}`);
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
        UPDATE instruments 
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
            logger.error('Error updating instrument:', error);
            throw new Error(`Failed to update instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async delete(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM instruments WHERE id = ?');
            const result = stmt.run(id);
            return result.changes > 0;
        }
        catch (error) {
            logger.error('Error deleting instrument:', error);
            throw new Error(`Failed to delete instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async getESGInstruments() {
        return this.findAll({ isActive: true, isESG: true });
    }
    async getVeganInstruments() {
        return this.findAll({ isActive: true, isVegan: true });
    }
    async searchByName(searchTerm) {
        try {
            const stmt = this.db.prepare(`
        SELECT * FROM instruments 
        WHERE (company_name LIKE ? OR symbol LIKE ?) 
        AND is_active = 1
        ORDER BY symbol ASC
        LIMIT 50
      `);
            const term = `%${searchTerm}%`;
            return stmt.all(term, term);
        }
        catch (error) {
            logger.error('Error searching instruments:', error);
            throw new Error(`Failed to search instruments: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=Instrument.js.map