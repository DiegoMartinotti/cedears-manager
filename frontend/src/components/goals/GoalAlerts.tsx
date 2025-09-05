import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { Alert } from '../ui/Alert';
import { GoalAlert, GoalDashboardData } from '../../services/goalService';

interface GoalAlertsProps {
  dashboard: GoalDashboardData | null;
  onCheckAlerts: () => Promise<void>;
  loading?: boolean;
}

export function GoalAlerts({ dashboard, onCheckAlerts, loading = false }: GoalAlertsProps) {
  const [alerts, setAlerts] = useState<GoalAlert[]>([]);
  const [alertSummary, setAlertSummary] = useState<{
    active: number;
    triggered: number;
    highPriority: number;
  }>({ active: 0, triggered: 0, highPriority: 0 });

  useEffect(() => {
    if (dashboard?.activeAlerts) {
      setAlerts(dashboard.activeAlerts);
      
      const summary = {
        active: dashboard.activeAlerts.length,
        triggered: dashboard.activeAlerts.filter(a => a.trigger_count > 0).length,
        highPriority: dashboard.activeAlerts.filter(a => a.alert_type === 'DEVIATION' || a.alert_type === 'TIME_TARGET').length
      };
      
      setAlertSummary(summary);
    }
  }, [dashboard]);

  if (!dashboard) {
    return (
      <Card className="p-6 bg-white border-gray-200">
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg font-medium mb-2">Sin datos de alertas</div>
          <p className="text-gray-400 mb-4">Carga un objetivo para ver las alertas configuradas</p>
        </div>
      </Card>
    );
  }

  const { goal, latestProgress } = dashboard;

  const getAlertTypeLabel = (type: string): string => {
    switch (type) {
      case 'DEVIATION':
        return 'Desviación del Plan';
      case 'PROGRESS_SLOW':
        return 'Progreso Lento';
      case 'TIME_TARGET':
        return 'Tiempo Objetivo';
      case 'MILESTONE':
        return 'Hito Alcanzado';
      default:
        return type;
    }
  };

  const getAlertTypeIcon = (type: string): string => {
    switch (type) {
      case 'DEVIATION':
        return '📉';
      case 'PROGRESS_SLOW':
        return '🐌';
      case 'TIME_TARGET':
        return '⏰';
      case 'MILESTONE':
        return '🏆';
      default:
        return '⚠️';
    }
  };

  const getAlertSeverityColor = (alert: GoalAlert): string => {
    if (alert.alert_type === 'DEVIATION' && alert.trigger_count > 0) {
      return 'border-red-200 bg-red-50';
    }
    if (alert.alert_type === 'TIME_TARGET' && alert.trigger_count > 0) {
      return 'border-orange-200 bg-orange-50';
    }
    if (alert.trigger_count > 5) {
      return 'border-yellow-200 bg-yellow-50';
    }
    return 'border-gray-200 bg-gray-50';
  };

  const calculateCurrentAlertStatus = () => {
    if (!latestProgress || !goal) return [];

    const currentAlerts = [];

    // Verificar desviación del plan
    if (Math.abs(latestProgress.deviation_from_plan) > 2) {
      currentAlerts.push({
        type: 'DEVIATION',
        severity: Math.abs(latestProgress.deviation_from_plan) > 5 ? 'high' : 'medium',
        message: `Desviación del ${latestProgress.deviation_from_plan >= 0 ? '+' : ''}${latestProgress.deviation_from_plan.toFixed(1)}% vs. plan original`,
        recommendation: latestProgress.deviation_from_plan < 0 
          ? 'Considera incrementar aportes o revisar expectativas de retorno'
          : 'Excelente rendimiento, considera mantener la estrategia actual'
      });
    }

    // Verificar progreso lento
    if (latestProgress.progress_percentage < 25 && goal.created_date) {
      const monthsSinceCreation = Math.floor(
        (new Date().getTime() - new Date(goal.created_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      if (monthsSinceCreation > 6) {
        currentAlerts.push({
          type: 'PROGRESS_SLOW',
          severity: 'medium',
          message: `Progreso del ${latestProgress.progress_percentage.toFixed(1)}% después de ${monthsSinceCreation} meses`,
          recommendation: 'Revisa tu estrategia de inversión o considera ajustar el objetivo'
        });
      }
    }

    // Verificar proximidad a fecha objetivo
    if (goal.target_date) {
      const daysToTarget = Math.floor(
        (new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysToTarget < 365 && latestProgress.progress_percentage < 80) {
        currentAlerts.push({
          type: 'TIME_TARGET',
          severity: daysToTarget < 180 ? 'high' : 'medium',
          message: `Faltan ${Math.floor(daysToTarget / 30)} meses para la fecha objetivo y el progreso es ${latestProgress.progress_percentage.toFixed(1)}%`,
          recommendation: 'Considera acelerar aportes o extender la fecha objetivo'
        });
      }
    }

    return currentAlerts;
  };

  const currentAlerts = calculateCurrentAlertStatus();

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'low':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumen de alertas */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🚨 Sistema de Alertas</h3>
            <p className="text-gray-600 text-sm">Monitoreo automático del progreso hacia tu objetivo</p>
          </div>
          <Button 
            onClick={onCheckAlerts}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? '⏳ Verificando...' : '🔍 Verificar Alertas'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-blue-800 text-sm font-medium mb-1">Alertas Activas</div>
            <div className="text-blue-900 text-3xl font-bold">{alertSummary.active}</div>
            <div className="text-blue-600 text-xs mt-1">Configuradas</div>
          </div>

          <div className="text-center bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-orange-800 text-sm font-medium mb-1">Disparadas</div>
            <div className="text-orange-900 text-3xl font-bold">{alertSummary.triggered}</div>
            <div className="text-orange-600 text-xs mt-1">Han sido activadas</div>
          </div>

          <div className="text-center bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800 text-sm font-medium mb-1">Alta Prioridad</div>
            <div className="text-red-900 text-3xl font-bold">{alertSummary.highPriority}</div>
            <div className="text-red-600 text-xs mt-1">Críticas</div>
          </div>
        </div>
      </Card>

      {/* Alertas actuales del sistema */}
      {currentAlerts.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">⚠️ Alertas Actuales</h3>
          
          <div className="space-y-4">
            {currentAlerts.map((alert, index) => (
              <Alert key={index} className={getSeverityColor(alert.severity)}>
                <div className="flex items-start space-x-3">
                  <span className="text-xl">{getAlertTypeIcon(alert.type)}</span>
                  <div className="flex-1">
                    <div className="font-medium mb-1">{getAlertTypeLabel(alert.type)}</div>
                    <div className="text-sm mb-2">{alert.message}</div>
                    <div className="text-xs opacity-75">
                      💡 <strong>Recomendación:</strong> {alert.recommendation}
                    </div>
                  </div>
                  <Badge 
                    className={
                      alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }
                  >
                    {alert.severity === 'high' ? 'Alta' : 
                     alert.severity === 'medium' ? 'Media' : 'Baja'}
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Alertas configuradas */}
      {alerts.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">⚙️ Alertas Configuradas</h3>
          
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border ${getAlertSeverityColor(alert)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getAlertTypeIcon(alert.alert_type)}</span>
                    <div>
                      <div className="font-medium">{getAlertTypeLabel(alert.alert_type)}</div>
                      <div className="text-sm text-gray-600">
                        Umbral: {alert.threshold_value}{alert.threshold_type === 'PERCENTAGE' ? '%' : 
                                alert.threshold_type === 'DAYS' ? ' días' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch 
                      checked={alert.is_enabled}
                      disabled={true} // Solo lectura por ahora
                      size="sm"
                    />
                    <Badge variant="outline">
                      {alert.trigger_count} disparos
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-gray-700 mb-2">
                  <strong>Mensaje:</strong> {alert.message_template}
                </div>

                {alert.last_triggered && (
                  <div className="text-xs text-gray-500">
                    Último disparo: {new Date(alert.last_triggered).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Configuración de nuevas alertas (placeholder) */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">➕ Configurar Nuevas Alertas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-purple-800 mb-3">🎯 Tipos de Alertas Disponibles:</h4>
            <div className="space-y-2 text-sm text-purple-700">
              <div className="flex items-center space-x-2">
                <span>📉</span>
                <span><strong>Desviación:</strong> Cuando el rendimiento se desvía del plan</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🐌</span>
                <span><strong>Progreso Lento:</strong> Cuando el avance es menor al esperado</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>⏰</span>
                <span><strong>Tiempo Límite:</strong> Cuando se acerca la fecha objetivo</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🏆</span>
                <span><strong>Hitos:</strong> Cuando se alcanzan metas intermedias</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-blue-800 mb-3">📊 Métricas Monitoreadas:</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <div>• Porcentaje de progreso hacia la meta</div>
              <div>• Desviación del retorno esperado</div>
              <div>• Tiempo restante para fecha objetivo</div>
              <div>• Rendimiento mensual de la cartera</div>
              <div>• Cumplimiento de aportes planificados</div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white/70 rounded-lg border border-purple-100">
          <div className="text-sm text-purple-600">
            <strong>🔧 Próximamente:</strong> Interfaz para configurar alertas personalizadas con umbrales específicos, 
            frecuencia de verificación y canales de notificación. Por ahora, las alertas se configuran automáticamente 
            basadas en las mejores prácticas de seguimiento de objetivos financieros.
          </div>
        </div>
      </Card>

      {/* Historial de alertas recientes */}
      {alerts.some(a => a.trigger_count > 0) && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">📋 Historial Reciente</h3>
          
          <div className="space-y-3">
            {alerts
              .filter(a => a.trigger_count > 0)
              .sort((a, b) => new Date(b.last_triggered || '').getTime() - new Date(a.last_triggered || '').getTime())
              .slice(0, 5)
              .map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span>{getAlertTypeIcon(alert.alert_type)}</span>
                    <div>
                      <div className="font-medium text-sm">{getAlertTypeLabel(alert.alert_type)}</div>
                      <div className="text-xs text-gray-600">
                        {alert.last_triggered 
                          ? new Date(alert.last_triggered).toLocaleDateString('es-ES')
                          : 'Fecha no disponible'
                        }
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {alert.trigger_count} vez{alert.trigger_count > 1 ? 'es' : ''}
                  </Badge>
                </div>
              ))
            }
          </div>
        </Card>
      )}

      {/* Sin alertas activas */}
      {currentAlerts.length === 0 && alerts.length === 0 && (
        <Card className="p-6 bg-green-50 border border-green-200">
          <div className="text-center py-8">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <div className="text-green-800 text-lg font-medium mb-2">Todo está en orden</div>
            <p className="text-green-700">
              No hay alertas activas para este objetivo. Tu progreso está dentro de los parámetros esperados.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}