import { Router } from 'express';
import { CommissionController } from '../controllers/CommissionController.js';
const router = Router();
const commissionController = new CommissionController();
// GET /api/v1/commissions/configs - Obtener configuraciones disponibles
router.get('/configs', (req, res) => commissionController.getCommissionConfigs(req, res));
// POST /api/v1/commissions/config - Guardar configuración personalizada
router.post('/config', (req, res) => commissionController.saveCommissionConfig(req, res));
// GET /api/v1/commissions/active - Obtener configuración activa
router.get('/active', (req, res) => commissionController.getActiveConfig(req, res));
// PUT /api/v1/commissions/active/:broker - Establecer configuración activa
router.put('/active/:broker', (req, res) => commissionController.setActiveConfig(req, res));
// POST /api/v1/commissions/calculate - Calcular comisión para operación
router.post('/calculate', (req, res) => commissionController.calculateCommission(req, res));
// GET /api/v1/commissions/analysis - Análisis histórico de comisiones
router.get('/analysis', (req, res) => commissionController.analyzeCommissions(req, res));
// POST /api/v1/commissions/compare - Comparar comisiones entre brokers
router.post('/compare', (req, res) => commissionController.compareBrokers(req, res));
// POST /api/v1/commissions/minimum-investment - Calcular monto mínimo recomendado
router.post('/minimum-investment', (req, res) => commissionController.calculateMinimumInvestment(req, res));
export default router;
//# sourceMappingURL=commission-routes.js.map