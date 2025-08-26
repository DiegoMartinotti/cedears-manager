import express from 'express'
import { benchmarkController } from '../controllers/BenchmarkController.js'

const router = express.Router()

// Benchmark indices management
router.get('/indices', benchmarkController.getBenchmarkIndices.bind(benchmarkController))
router.get('/indices/:id', benchmarkController.getBenchmarkById.bind(benchmarkController))
router.post('/indices', benchmarkController.createBenchmark.bind(benchmarkController))
router.put('/indices/:id', benchmarkController.updateBenchmark.bind(benchmarkController))
router.delete('/indices/:id', benchmarkController.deleteBenchmark.bind(benchmarkController))

// Benchmark data operations
router.get('/data/:benchmarkId', benchmarkController.getBenchmarkData.bind(benchmarkController))
router.get('/latest/:benchmarkId', benchmarkController.getLatestBenchmarkData.bind(benchmarkController))
router.post('/update/:benchmarkId', benchmarkController.updateBenchmarkData.bind(benchmarkController))
router.post('/update-all', benchmarkController.updateAllBenchmarks.bind(benchmarkController))

// Performance analysis
router.post('/compare/:benchmarkId', benchmarkController.compareWithBenchmark.bind(benchmarkController))
router.get('/performance-metrics', benchmarkController.getPerformanceMetrics.bind(benchmarkController))
router.get('/returns/:benchmarkId', benchmarkController.getBenchmarkReturns.bind(benchmarkController))

// Real-time data
router.get('/quote/:benchmarkId', benchmarkController.getCurrentQuote.bind(benchmarkController))

// Service management
router.get('/statistics', benchmarkController.getBenchmarkStatistics.bind(benchmarkController))
router.get('/health', benchmarkController.getHealthCheck.bind(benchmarkController))

export default router