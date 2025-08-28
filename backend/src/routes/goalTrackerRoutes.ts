import { Router } from 'express';
import { GoalTrackerController } from '../controllers/GoalTrackerController';
import { GoalTrackerService } from '../services/GoalTrackerService';
import DatabaseConnection from '../database/connection.js';

const router = Router();

// Inicializar servicio y controlador
const db = DatabaseConnection.getInstance();
const goalService = new GoalTrackerService(db);
const goalController = new GoalTrackerController(goalService);

// 26.1: Rutas para gestión de objetivos financieros
router.post('/', goalController.createGoal);
router.get('/', goalController.getAllGoals);
router.get('/summary', goalController.getGoalsSummary);
router.get('/with-progress', goalController.getGoalsWithProgress);
router.get('/:id', goalController.getGoalById);

// 26.2: Rutas para cálculos de tiempo
router.get('/:id/calculate', goalController.calculateTimeToGoal);

// 26.3: Rutas para dashboard y progreso
router.get('/:id/dashboard', goalController.getGoalDashboard);
router.post('/:id/update-progress', goalController.updateGoalProgress);

// 26.4: Rutas para simulaciones
router.post('/:id/simulate-contribution', goalController.simulateExtraContribution);
router.post('/:id/simulate-scenarios', goalController.simulateMultipleScenarios);

// 26.5: Rutas para alertas
router.post('/check-alerts', goalController.checkAlerts);

export { router as goalTrackerRoutes };