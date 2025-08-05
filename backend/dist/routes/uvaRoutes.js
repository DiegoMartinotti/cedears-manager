import { Router } from 'express';
import { uvaController } from '../controllers/UVAController.js';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('UVARoutes');
const router = Router();
// === ENDPOINTS DE DATOS UVA ===
/**
 * GET /uva/latest - Obtiene el valor UVA más reciente
 * Response: { success: boolean, data: { date: string, value: number, source: string, cached: boolean } }
 */
router.get('/latest', async (req, res) => {
    await uvaController.getLatest(req, res);
});
/**
 * GET /uva/date/:date - Obtiene valor UVA para una fecha específica
 * Params: date (YYYY-MM-DD)
 * Response: { success: boolean, data: { date: string, value: number, source: string } }
 */
router.get('/date/:date', async (req, res) => {
    await uvaController.getByDate(req, res);
});
/**
 * GET /uva/search - Busca valores UVA con filtros
 * Query params: fromDate?, toDate?, source?, limit?, orderBy?, orderDirection?
 * Response: { success: boolean, data: UVAData[], filters: object, total: number }
 */
router.get('/search', async (req, res) => {
    await uvaController.search(req, res);
});
/**
 * GET /uva/statistics - Obtiene estadísticas de valores UVA almacenados
 * Response: { success: boolean, data: { totalCount: number, dateRange: object, sources: object, latestValue?: UVAData } }
 */
router.get('/statistics', async (req, res) => {
    await uvaController.getStatistics(req, res);
});
// === ENDPOINTS DE CÁLCULOS ===
/**
 * POST /uva/inflation-adjustment - Calcula ajuste por inflación
 * Body: { amount: number, fromDate: string, toDate: string }
 * Response: { success: boolean, data: UVAInflationAdjustment }
 */
router.post('/inflation-adjustment', async (req, res) => {
    await uvaController.calculateInflationAdjustment(req, res);
});
// === ENDPOINTS DE GESTIÓN DE DATOS ===
/**
 * POST /uva/update - Fuerza actualización manual de UVA
 * Response: { success: boolean, message: string, data?: object }
 */
router.post('/update', async (req, res) => {
    await uvaController.forceUpdate(req, res);
});
/**
 * POST /uva/historical-update - Actualiza datos históricos para un rango de fechas
 * Body: { fromDate: string, toDate: string }
 * Response: { success: boolean, message: string, data?: { processedCount: number } }
 */
router.post('/historical-update', async (req, res) => {
    await uvaController.updateHistorical(req, res);
});
/**
 * DELETE /uva/cleanup - Limpia valores UVA antiguos
 * Body: { daysToKeep?: number } (default: 365)
 * Response: { success: boolean, message: string, data?: { deletedCount: number } }
 */
router.delete('/cleanup', async (req, res) => {
    await uvaController.cleanup(req, res);
});
// === ENDPOINTS DE GESTIÓN DEL JOB ===
/**
 * GET /uva/job/status - Obtiene estado del job de actualización UVA
 * Response: { success: boolean, data: { stats: object, config: object, database: object } }
 */
router.get('/job/status', async (req, res) => {
    await uvaController.getJobStatus(req, res);
});
/**
 * PUT /uva/job/config - Actualiza configuración del job
 * Body: { enabled?, schedule?, businessDaysOnly?, retryAttempts?, retryDelayMs?, historicalUpdateDays? }
 * Response: { success: boolean, message: string, data: JobConfig }
 */
router.put('/job/config', async (req, res) => {
    await uvaController.updateJobConfig(req, res);
});
/**
 * POST /uva/job/start - Inicia el job de actualización
 * Response: { success: boolean, message: string, data: JobStats }
 */
router.post('/job/start', async (req, res) => {
    await uvaController.startJob(req, res);
});
/**
 * POST /uva/job/stop - Detiene el job de actualización
 * Response: { success: boolean, message: string, data: JobStats }
 */
router.post('/job/stop', async (req, res) => {
    await uvaController.stopJob(req, res);
});
/**
 * POST /uva/job/restart - Reinicia el job de actualización
 * Body: { config?: Partial<JobConfig> }
 * Response: { success: boolean, message: string, data: { stats: JobStats, config: JobConfig } }
 */
router.post('/job/restart', async (req, res) => {
    await uvaController.restartJob(req, res);
});
/**
 * POST /uva/job/reset-stats - Resetea estadísticas del job
 * Response: { success: boolean, message: string, data: JobStats }
 */
router.post('/job/reset-stats', async (req, res) => {
    await uvaController.resetJobStats(req, res);
});
// Middleware de logging para todas las rutas UVA
router.use((req, res, next) => {
    logger.info('UVA API request', {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.method !== 'GET' ? req.body : undefined
    });
    next();
});
logger.info('UVA routes configured successfully');
export default router;
//# sourceMappingURL=uvaRoutes.js.map