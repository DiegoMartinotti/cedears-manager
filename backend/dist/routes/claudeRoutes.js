import { Router } from 'express';
import { ClaudeController } from '../controllers/ClaudeController.js';
const router = Router();
/**
 * Rutas para análisis con Claude
 */
// GET /api/claude/status - Estado de servicios de Claude
router.get('/status', ClaudeController.getStatus);
// GET /api/claude/metrics - Métricas detalladas de performance
router.get('/metrics', ClaudeController.getMetrics);
// POST /api/claude/initialize - Inicializar servicios de Claude
router.post('/initialize', ClaudeController.initialize);
// POST /api/claude/reset - Reiniciar servicios
router.post('/reset', ClaudeController.reset);
// POST /api/claude/analyze - Análisis técnico completo
router.post('/analyze', ClaudeController.analyze);
// POST /api/claude/quick-analysis - Análisis rápido
router.post('/quick-analysis', ClaudeController.quickAnalysis);
export default router;
//# sourceMappingURL=claudeRoutes.js.map