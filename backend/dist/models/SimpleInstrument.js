import SimpleDatabaseConnection from '../database/simple-connection.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('SimpleInstrument');
export class SimpleInstrument {
    async create(data) {
        try {
            const instrumentData = {
                ...data,
                symbol: data.symbol.toUpperCase(),
                is_esg_compliant: data.is_esg_compliant || false,
                is_vegan_friendly: data.is_vegan_friendly || false,
                underlying_currency: data.underlying_currency || 'USD',
                ratio: data.ratio || 1.0,
                is_active: data.is_active !== undefined ? data.is_active : true
            };
            const result = SimpleDatabaseConnection.insert('instruments', instrumentData);
            logger.info(`Instrument created: ${result.symbol} (ID: ${result.id})`);
            return result;
        }
        catch (error) {
            logger.error('Error creating instrument:', error);
            throw new Error(`Failed to create instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findById(id) {
        try {
            return SimpleDatabaseConnection.findById('instruments', id);
        }
        catch (error) {
            logger.error('Error finding instrument by id:', error);
            throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findBySymbol(symbol) {
        try {
            return SimpleDatabaseConnection.findBy('instruments', {
                symbol: symbol.toUpperCase(),
                is_active: true
            });
        }
        catch (error) {
            logger.error('Error finding instrument by symbol:', error);
            throw new Error(`Failed to find instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async findAll(filters) {
        try {
            const criteria = {};
            if (filters?.isActive !== undefined) {
                criteria.is_active = filters.isActive;
            }
            if (filters?.isESG !== undefined) {
                criteria.is_esg_compliant = filters.isESG;
            }
            if (filters?.isVegan !== undefined) {
                criteria.is_vegan_friendly = filters.isVegan;
            }
            if (filters?.sector) {
                criteria.sector = filters.sector;
            }
            const results = SimpleDatabaseConnection.findAll('instruments', criteria);
            return results.sort((a, b) => a.symbol.localeCompare(b.symbol));
        }
        catch (error) {
            logger.error('Error finding instruments:', error);
            throw new Error(`Failed to find instruments: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async update(id, data) {
        try {
            if (data.symbol) {
                data.symbol = data.symbol.toUpperCase();
            }
            const result = SimpleDatabaseConnection.update('instruments', id, data);
            if (result) {
                logger.info(`Instrument updated: ${result.symbol} (ID: ${id})`);
            }
            return result;
        }
        catch (error) {
            logger.error('Error updating instrument:', error);
            throw new Error(`Failed to update instrument: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async delete(id) {
        try {
            const success = SimpleDatabaseConnection.delete('instruments', id);
            if (success) {
                logger.info(`Instrument deleted: ID ${id}`);
            }
            return success;
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
            const results = SimpleDatabaseConnection.search('instruments', searchTerm, ['company_name', 'symbol']);
            return results
                .filter((item) => item.is_active)
                .sort((a, b) => a.symbol.localeCompare(b.symbol))
                .slice(0, 50);
        }
        catch (error) {
            logger.error('Error searching instruments:', error);
            throw new Error(`Failed to search instruments: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=SimpleInstrument.js.map