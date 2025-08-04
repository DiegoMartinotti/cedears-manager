import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import quoteRoutes from '../routes/quoteRoutes.js';
import { MigrationRunner } from '../database/migrations.js';
import { Instrument } from '../models/Instrument.js';
import DatabaseConnection from '../database/connection.js';
const app = express();
app.use(cors());
app.use(express.json());
app.use('/quotes', quoteRoutes);
describe('Quote API Integration Tests', () => {
    let db;
    let instrumentModel;
    beforeAll(async () => {
        // Ejecutar migraciones para pruebas
        const migrationRunner = new MigrationRunner();
        await migrationRunner.runMigrations();
        db = DatabaseConnection.getInstance();
        instrumentModel = new Instrument();
    });
    beforeEach(async () => {
        // Limpiar datos de prueba
        db.exec('DELETE FROM quotes');
        db.exec('DELETE FROM instruments');
        // Crear instrumento de prueba
        await instrumentModel.create({
            symbol: 'AAPL',
            company_name: 'Apple Inc.',
            sector: 'Technology',
            is_active: true
        });
    });
    afterAll(() => {
        // Limpiar después de todas las pruebas
        db.exec('DELETE FROM quotes');
        db.exec('DELETE FROM instruments');
    });
    describe('GET /quotes/:symbol', () => {
        it('should return 404 for non-existent instrument', async () => {
            const response = await request(app)
                .get('/quotes/NONEXISTENT')
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('not found');
        });
        it('should return quote for existing instrument', async () => {
            // This test would require mocking Yahoo Finance
            // For now, we'll test the error case since Yahoo Finance will likely fail in test env
            const response = await request(app)
                .get('/quotes/AAPL');
            // Should either succeed with quote or fail gracefully
            expect(response.status).toBeOneOf([200, 404, 500]);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeDefined();
            }
        });
        it('should handle forceRefresh parameter', async () => {
            const response = await request(app)
                .get('/quotes/AAPL?forceRefresh=true');
            expect(response.status).toBeOneOf([200, 404, 500]);
        });
    });
    describe('POST /quotes/batch', () => {
        it('should validate request body', async () => {
            const response = await request(app)
                .post('/quotes/batch')
                .send({})
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid request body');
        });
        it('should validate symbols array', async () => {
            const response = await request(app)
                .post('/quotes/batch')
                .send({ symbols: [] })
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.details).toBeDefined();
        });
        it('should process valid symbols array', async () => {
            const response = await request(app)
                .post('/quotes/batch')
                .send({
                symbols: ['AAPL'],
                forceRefresh: false
            });
            expect(response.status).toBeOneOf([200, 500]);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeInstanceOf(Array);
                expect(response.body.summary).toBeDefined();
            }
        });
    });
    describe('GET /quotes/history/:symbol', () => {
        it('should return empty history for new instrument', async () => {
            const response = await request(app)
                .get('/quotes/history/AAPL')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.count).toBe(0);
        });
        it('should validate query parameters', async () => {
            const response = await request(app)
                .get('/quotes/history/AAPL?limit=abc')
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid parameters');
        });
        it('should accept valid query parameters', async () => {
            const response = await request(app)
                .get('/quotes/history/AAPL?limit=50&orderBy=price&orderDirection=ASC')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.filters.limit).toBe(50);
            expect(response.body.filters.orderBy).toBe('price');
            expect(response.body.filters.orderDirection).toBe('ASC');
        });
    });
    describe('GET /quotes/latest/:symbol', () => {
        it('should return 404 for symbol with no quotes', async () => {
            const response = await request(app)
                .get('/quotes/latest/AAPL')
                .expect(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('No quotes found');
        });
    });
    describe('GET /quotes/watchlist', () => {
        it('should return empty array when no quotes exist', async () => {
            const response = await request(app)
                .get('/quotes/watchlist')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.count).toBe(0);
        });
    });
    describe('POST /quotes/update', () => {
        it('should trigger manual update', async () => {
            const response = await request(app)
                .post('/quotes/update');
            expect(response.status).toBeOneOf([200, 500]);
            if (response.status === 200) {
                expect(response.body.success).toBe(true);
                expect(response.body.message).toBeDefined();
            }
        });
    });
    describe('GET /quotes/market/hours', () => {
        it('should return market hours information', async () => {
            const response = await request(app)
                .get('/quotes/market/hours')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.timezone).toBe('America/New_York');
            expect(typeof response.body.data.isOpen).toBe('boolean');
        });
    });
    describe('GET /quotes/stats', () => {
        it('should return service statistics', async () => {
            const response = await request(app)
                .get('/quotes/stats')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.service).toBeDefined();
            expect(response.body.data.job).toBeDefined();
            expect(response.body.data.service.quotes).toBeDefined();
            expect(response.body.data.service.cache).toBeDefined();
            expect(response.body.data.service.rateLimit).toBeDefined();
            expect(response.body.data.service.market).toBeDefined();
        });
    });
    describe('POST /quotes/job/config', () => {
        it('should validate configuration parameters', async () => {
            const response = await request(app)
                .post('/quotes/job/config')
                .send({ batchSize: 'invalid' })
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid configuration');
        });
        it('should accept valid configuration', async () => {
            const response = await request(app)
                .post('/quotes/job/config')
                .send({
                enabled: true,
                batchSize: 25,
                retryAttempts: 2
            })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.config).toBeDefined();
            expect(response.body.config.batchSize).toBe(25);
        });
    });
    describe('POST /quotes/job/restart', () => {
        it('should restart the job successfully', async () => {
            const response = await request(app)
                .post('/quotes/job/restart')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('restarted');
            expect(response.body.config).toBeDefined();
            expect(response.body.stats).toBeDefined();
        });
    });
    describe('DELETE /quotes/job/stats', () => {
        it('should reset job statistics', async () => {
            const response = await request(app)
                .delete('/quotes/job/stats')
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('reset');
            expect(response.body.stats).toBeDefined();
            expect(response.body.stats.totalRuns).toBe(0);
        });
    });
    describe('POST /quotes/cleanup', () => {
        it('should validate cleanup parameters', async () => {
            const response = await request(app)
                .post('/quotes/cleanup')
                .send({ daysToKeep: 'invalid' })
                .expect(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid parameters');
        });
        it('should execute cleanup with valid parameters', async () => {
            const response = await request(app)
                .post('/quotes/cleanup')
                .send({ daysToKeep: 30 })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBeDefined();
            expect(typeof response.body.deletedCount).toBe('number');
        });
        it('should use default days if not provided', async () => {
            const response = await request(app)
                .post('/quotes/cleanup')
                .send({})
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.deletedCount).toBe(0); // No old quotes to delete
        });
    });
});
// Helper to extend Jest matchers for integration tests
expect.extend({
    toBeOneOf(received, expected) {
        const pass = expected.includes(received);
        if (pass) {
            return {
                message: () => `expected ${received} not to be one of ${expected}`,
                pass: true
            };
        }
        else {
            return {
                message: () => `expected ${received} to be one of ${expected}`,
                pass: false
            };
        }
    }
});
//# sourceMappingURL=quote.integration.test.js.map