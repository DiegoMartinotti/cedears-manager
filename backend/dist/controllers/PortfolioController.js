import { PortfolioService } from '../services/PortfolioService.js';
import { createLogger } from '../utils/logger.js';
import { PortfolioPositionCreateSchema, PortfolioPositionUpdateSchema, PortfolioPositionParamsSchema, PortfolioPositionInstrumentParamsSchema } from '../schemas/portfolio.schema.js';
import { TradeCreateSchema } from '../schemas/trade.schema.js';
const logger = createLogger('PortfolioController');
export class PortfolioController {
    portfolioService = new PortfolioService();
    async getPortfolioPositions(req, res) {
        try {
            logger.info('Getting all portfolio positions');
            const positions = await this.portfolioService.getPortfolioPositions();
            res.json({
                success: true,
                data: positions,
                meta: {
                    total: positions.length
                }
            });
        }
        catch (error) {
            logger.error('Error getting portfolio positions:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to get portfolio positions'
            });
        }
    }
    async getPortfolioPosition(req, res) {
        try {
            logger.info(`Getting portfolio position: ${req.params.id}`);
            const { id } = PortfolioPositionParamsSchema.parse(req.params);
            const position = await this.portfolioService.getPortfolioPosition(id);
            res.json({
                success: true,
                data: position
            });
        }
        catch (error) {
            logger.error('Error getting portfolio position:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: error.message,
                    message: 'Portfolio position not found'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to get portfolio position'
                });
            }
        }
    }
    async getPortfolioPositionByInstrument(req, res) {
        try {
            logger.info(`Getting portfolio position for instrument: ${req.params.instrumentId}`);
            const { instrumentId } = PortfolioPositionInstrumentParamsSchema.parse(req.params);
            const position = await this.portfolioService.getPortfolioPositionByInstrument(instrumentId);
            if (!position) {
                res.status(404).json({
                    success: false,
                    error: `No portfolio position found for instrument ${instrumentId}`,
                    message: 'Portfolio position not found'
                });
                return;
            }
            res.json({
                success: true,
                data: position
            });
        }
        catch (error) {
            logger.error('Error getting portfolio position by instrument:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: error.message,
                    message: 'Instrument not found'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to get portfolio position'
                });
            }
        }
    }
    async createPortfolioPosition(req, res) {
        try {
            logger.info('Creating new portfolio position');
            const validatedData = PortfolioPositionCreateSchema.parse(req.body);
            const position = await this.portfolioService.createPortfolioPosition(validatedData);
            res.status(201).json({
                success: true,
                data: position,
                message: 'Portfolio position created successfully'
            });
        }
        catch (error) {
            logger.error('Error creating portfolio position:', error);
            if (error instanceof Error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    message: 'Failed to create portfolio position'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to create portfolio position'
                });
            }
        }
    }
    async updatePortfolioPosition(req, res) {
        try {
            logger.info(`Updating portfolio position: ${req.params.id}`);
            const { id } = PortfolioPositionParamsSchema.parse(req.params);
            const validatedData = PortfolioPositionUpdateSchema.parse(req.body);
            const position = await this.portfolioService.updatePortfolioPosition(id, validatedData);
            res.json({
                success: true,
                data: position,
                message: 'Portfolio position updated successfully'
            });
        }
        catch (error) {
            logger.error('Error updating portfolio position:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: error.message,
                    message: 'Portfolio position not found'
                });
            }
            else if (error instanceof Error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    message: 'Failed to update portfolio position'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to update portfolio position'
                });
            }
        }
    }
    async deletePortfolioPosition(req, res) {
        try {
            logger.info(`Deleting portfolio position: ${req.params.id}`);
            const { id } = PortfolioPositionParamsSchema.parse(req.params);
            await this.portfolioService.deletePortfolioPosition(id);
            res.json({
                success: true,
                message: 'Portfolio position deleted successfully'
            });
        }
        catch (error) {
            logger.error('Error deleting portfolio position:', error);
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: error.message,
                    message: 'Portfolio position not found'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to delete portfolio position'
                });
            }
        }
    }
    async processTradeAndUpdatePosition(req, res) {
        try {
            logger.info('Processing trade and updating position');
            const validatedData = TradeCreateSchema.parse(req.body);
            const result = await this.portfolioService.processTradeAndUpdatePosition(validatedData);
            res.status(201).json({
                success: true,
                data: result,
                message: 'Trade processed and portfolio position updated successfully'
            });
        }
        catch (error) {
            logger.error('Error processing trade:', error);
            if (error instanceof Error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    message: 'Failed to process trade'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to process trade'
                });
            }
        }
    }
    async getPortfolioSummary(req, res) {
        try {
            logger.info('Getting portfolio summary');
            const summary = await this.portfolioService.getPortfolioSummary();
            res.json({
                success: true,
                data: summary
            });
        }
        catch (error) {
            logger.error('Error getting portfolio summary:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to get portfolio summary'
            });
        }
    }
    async getPortfolioPerformance(req, res) {
        try {
            logger.info('Getting portfolio performance');
            const performance = await this.portfolioService.getPortfolioPerformance();
            res.json({
                success: true,
                data: performance,
                meta: {
                    total_positions: performance.length
                }
            });
        }
        catch (error) {
            logger.error('Error getting portfolio performance:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to get portfolio performance'
            });
        }
    }
    async closePosition(req, res) {
        try {
            logger.info(`Closing position for instrument: ${req.params.instrumentId}`);
            const { instrumentId } = PortfolioPositionInstrumentParamsSchema.parse(req.params);
            await this.portfolioService.closePosition(instrumentId);
            res.json({
                success: true,
                message: 'Position closed successfully'
            });
        }
        catch (error) {
            logger.error('Error closing position:', error);
            if (error instanceof Error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    message: 'Failed to close position'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to close position'
                });
            }
        }
    }
    async calculateRebalancing(req, res) {
        try {
            logger.info('Calculating portfolio rebalancing');
            const targetAllocations = req.body;
            if (!Array.isArray(targetAllocations)) {
                res.status(400).json({
                    success: false,
                    error: 'Request body must be an array of target allocations',
                    message: 'Invalid request format'
                });
                return;
            }
            // Basic validation for target allocations
            for (const allocation of targetAllocations) {
                if (!allocation.instrument_id || typeof allocation.target_percentage !== 'number') {
                    res.status(400).json({
                        success: false,
                        error: 'Each allocation must have instrument_id and target_percentage',
                        message: 'Invalid allocation format'
                    });
                    return;
                }
            }
            const rebalanceResults = await this.portfolioService.rebalancePortfolio(targetAllocations);
            res.json({
                success: true,
                data: rebalanceResults,
                meta: {
                    total_instruments: rebalanceResults.length
                }
            });
        }
        catch (error) {
            logger.error('Error calculating rebalancing:', error);
            if (error instanceof Error) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    message: 'Failed to calculate rebalancing'
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Failed to calculate rebalancing'
                });
            }
        }
    }
}
//# sourceMappingURL=PortfolioController.js.map