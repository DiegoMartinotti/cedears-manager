import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GoalDashboardData } from '../../services/goalService';
import { goalService } from '../../services/goalService';

interface GoalDashboardProps {
  dashboard: GoalDashboardData | null;
  loading: boolean;
  error: string | null;
  onUpdateProgress: () => void;
  onRefresh: () => void;
}

export function GoalDashboard({ 
  dashboard, 
  loading, 
  error, 
  onUpdateProgress, 
  onRefresh 
}: GoalDashboardProps) {
  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Cargando dashboard del objetivo...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-white border-red-200">
        <div className="text-center py-8">
          <div className="text-red-600 text-lg font-medium mb-2">Error al cargar dashboard</div>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={onRefresh} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  if (!dashboard) {
    return (
      <Card className="p-6 bg-white border-gray-200">
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg font-medium mb-2">Sin datos</div>
          <p className="text-gray-400 mb-4">No se pudo cargar el dashboard</p>
          <Button onClick={onRefresh} className="bg-blue-600 hover:bg-blue-700">
            Cargar Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  const { goal, latestProgress, calculatedProjection } = dashboard;

  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getDeviationColor = (deviation: number): string => {
    if (Math.abs(deviation) <= 1) return 'text-green-600';
    if (Math.abs(deviation) <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDeviationIcon = (deviation: number): string => {
    if (deviation > 1) return '📈';
    if (deviation < -1) return '📉';
    return '➡️';
  };

  return (
    <div className="space-y-6">
      {/* Header del objetivo */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{goal.name}</h2>
              <Badge className={goalService.getStatusColor(goal.status)}>
                {goalService.getStatusLabel(goal.status)}
              </Badge>
              <Badge variant="outline">
                {goalService.getGoalTypeLabel(goal.type)}
              </Badge>
            </div>
            {goal.description && (
              <p className="text-gray-600">{goal.description}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={onUpdateProgress} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              🔄 Actualizar
            </Button>
            <Button 
              onClick={onRefresh} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              📊 Refrescar
            </Button>
          </div>
        </div>

        {/* Información básica del objetivo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {goal.target_amount && (
            <div>
              <div className="text-gray-600 mb-1">Meta</div>
              <div className="font-semibold text-lg">
                {goalService.formatCurrency(goal.target_amount, goal.currency)}
              </div>
            </div>
          )}
          <div>
            <div className="text-gray-600 mb-1">Aporte Mensual</div>
            <div className="font-semibold text-lg">
              {goalService.formatCurrency(goal.monthly_contribution, goal.currency)}
            </div>
          </div>
          <div>
            <div className="text-gray-600 mb-1">Retorno Esperado</div>
            <div className="font-semibold text-lg">
              {goalService.formatPercentage(goal.expected_return_rate)}
            </div>
          </div>
          {goal.target_date && (
            <div>
              <div className="text-gray-600 mb-1">Fecha Objetivo</div>
              <div className="font-semibold text-lg">
                {new Date(goal.target_date).toLocaleDateString('es-ES')}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Progreso actual */}
      {latestProgress && (
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">📈 Progreso Actual</h3>
            <div className="text-sm text-gray-500">
              Actualizado: {new Date(latestProgress.date).toLocaleDateString('es-ES')}
            </div>
          </div>

          {/* Barra de progreso */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Progreso hacia la meta
              </span>
              <span className={`text-sm font-bold ${goalService.calculateProgressColor(latestProgress.progress_percentage)}`}>
                {goalService.formatPercentage(latestProgress.progress_percentage)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${getProgressBarColor(latestProgress.progress_percentage)}`}
                style={{ width: `${Math.min(100, latestProgress.progress_percentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Inicio</span>
              <span>Meta Alcanzada</span>
            </div>
          </div>

          {/* Métricas clave */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-800 text-sm font-medium mb-1">Capital Actual</div>
              <div className="text-blue-900 text-2xl font-bold">
                {goalService.formatCurrency(latestProgress.current_capital, goal.currency)}
              </div>
              <div className="text-blue-600 text-xs mt-1">
                Valor de cartera
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm font-medium mb-1">Ingresos Mensuales</div>
              <div className="text-green-900 text-2xl font-bold">
                {goalService.formatCurrency(latestProgress.monthly_income, goal.currency)}
              </div>
              <div className="text-green-600 text-xs mt-1">
                Último mes
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-purple-800 text-sm font-medium mb-1">Rentabilidad Real</div>
              <div className="text-purple-900 text-2xl font-bold">
                {goalService.formatPercentage(latestProgress.actual_return_rate)}
              </div>
              <div className="text-purple-600 text-xs mt-1">
                Anualizada
              </div>
            </div>

            <div className={`border rounded-lg p-4 ${latestProgress.deviation_from_plan >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`text-sm font-medium mb-1 ${latestProgress.deviation_from_plan >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                Desviación del Plan
              </div>
              <div className={`text-2xl font-bold flex items-center ${getDeviationColor(latestProgress.deviation_from_plan)}`}>
                <span className="mr-2">{getDeviationIcon(latestProgress.deviation_from_plan)}</span>
                {latestProgress.deviation_from_plan >= 0 ? '+' : ''}{goalService.formatPercentage(latestProgress.deviation_from_plan)}
              </div>
              <div className={`text-xs mt-1 ${latestProgress.deviation_from_plan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                vs. esperado
              </div>
            </div>
          </div>

          {/* Proyecciones */}
          {latestProgress.projected_completion_date && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-orange-800 mb-2">🎯 Proyección Actualizada</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-orange-700 mb-1">Fecha de Completion Proyectada:</div>
                  <div className="font-semibold text-orange-900">
                    {new Date(latestProgress.projected_completion_date).toLocaleDateString('es-ES')}
                  </div>
                </div>
                {goal.target_date && (
                  <div>
                    <div className="text-orange-700 mb-1">Diferencia vs. Fecha Objetivo:</div>
                    <div className="font-semibold text-orange-900">
                      {(() => {
                        const projected = new Date(latestProgress.projected_completion_date);
                        const target = new Date(goal.target_date);
                        const diffMonths = (projected.getTime() - target.getTime()) / (1000 * 60 * 60 * 24 * 30);
                        if (diffMonths < 0) {
                          return `${Math.abs(Math.round(diffMonths))} meses antes ✅`;
                        } else if (diffMonths > 0) {
                          return `${Math.round(diffMonths)} meses después ⚠️`;
                        }
                        return 'En tiempo ✅';
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Calculadora de tiempo */}
      {calculatedProjection && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ Proyección de Tiempo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-800 text-sm font-medium mb-1">Tiempo Restante</div>
              <div className="text-blue-900 text-3xl font-bold">
                {goalService.formatMonths(calculatedProjection.timeToGoalMonths)}
              </div>
              <div className="text-blue-600 text-sm mt-1">
                ({calculatedProjection.timeToGoalYears.toFixed(1)} años)
              </div>
            </div>

            <div className="text-center bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm font-medium mb-1">Inversión Restante</div>
              <div className="text-green-900 text-3xl font-bold">
                {goalService.formatCurrency(calculatedProjection.totalInvestmentNeeded)}
              </div>
              <div className="text-green-600 text-sm mt-1">
                En aportes totales
              </div>
            </div>

            <div className="text-center bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-purple-800 text-sm font-medium mb-1">Probabilidad</div>
              <div className="text-purple-900 text-3xl font-bold">
                {calculatedProjection.probabilityOfSuccess.toFixed(0)}%
              </div>
              <div className="text-purple-600 text-sm mt-1">
                De alcanzar meta
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Hitos y alertas */}
      {dashboard.milestones && dashboard.milestones.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Hitos</h3>
          <div className="space-y-3">
            {dashboard.milestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${milestone.is_achieved ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="font-medium">{milestone.milestone_name}</div>
                    <div className="text-sm text-gray-600">
                      {milestone.milestone_amount && 
                        `${goalService.formatCurrency(milestone.milestone_amount)} - `
                      }
                      {goalService.formatPercentage(milestone.milestone_percentage)}
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  {milestone.is_achieved ? (
                    <Badge className="bg-green-100 text-green-800">
                      ✅ Logrado
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Pendiente
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Simulaciones recientes */}
      {dashboard.recentSimulations && dashboard.recentSimulations.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🧮 Simulaciones Recientes</h3>
          <div className="space-y-3">
            {dashboard.recentSimulations.slice(0, 3).map((simulation) => (
              <div key={simulation.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{simulation.scenario_name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(simulation.simulation_date).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div className="text-sm text-gray-600 grid grid-cols-2 gap-4">
                  <div>Aporte extra: {goalService.formatCurrency(simulation.extra_contribution)}</div>
                  <div>
                    Tiempo ahorrado: {simulation.time_saved_months > 0 ? 
                      `${simulation.time_saved_months.toFixed(1)} meses` : 
                      'No significativo'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}