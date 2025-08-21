import React from 'react';
import { Activity, TrendingUp, AlertTriangle, Clock, BarChart3, PieChart } from 'lucide-react';

interface SellAnalysisStatsProps {
  stats: any;
  isLoading: boolean;
}

const SellAnalysisStats: React.FC<SellAnalysisStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay estadísticas disponibles
        </h3>
        <p className="text-gray-600">
          Las estadísticas se generarán después del primer análisis.
        </p>
      </div>
    );
  }

  const { analysis, alerts, recent_activity } = stats;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Análisis Realizados</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis?.total_analysis || 0}
              </p>
              <p className="text-xs text-gray-500">
                Últimas 24h: {recent_activity?.last_24h_analysis || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Alertas Generadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {alerts?.total_alerts || 0}
              </p>
              <p className="text-xs text-gray-500">
                Activas: {recent_activity?.active_alerts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Score Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {analysis?.avg_sell_score?.toFixed(1) || '0.0'}
              </p>
              <p className="text-xs text-gray-500">
                Posiciones analizadas: {recent_activity?.positions_analyzed || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Breakdown */}
      {analysis?.recommendations_breakdown && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Distribución de Recomendaciones
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(analysis.recommendations_breakdown).map(([recommendation, count]) => (
                <div key={recommendation} className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">
                    {recommendation.replace('_', ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk Levels Breakdown */}
      {analysis?.risk_levels_breakdown && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Niveles de Riesgo
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analysis.risk_levels_breakdown).map(([level, count]) => {
                const colors = {
                  LOW: 'bg-green-50 text-green-800 border-green-200',
                  MEDIUM: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                  HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
                  CRITICAL: 'bg-red-50 text-red-800 border-red-200',
                };
                
                return (
                  <div key={level} className={`text-center p-3 rounded border ${colors[level as keyof typeof colors] || 'bg-gray-50'}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm">{level}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Breakdown */}
      {alerts?.alerts_by_type && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Alertas por Tipo</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {Object.entries(alerts.alerts_by_type).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Alertas por Prioridad</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {Object.entries(alerts.alerts_by_priority).map(([priority, count]) => {
                  const colors = {
                    LOW: 'text-blue-600',
                    MEDIUM: 'text-yellow-600',
                    HIGH: 'text-orange-600',
                    CRITICAL: 'text-red-600',
                  };
                  
                  return (
                    <div key={priority} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{priority}</span>
                      <span className={`text-sm font-medium ${colors[priority as keyof typeof colors] || 'text-gray-900'}`}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Análisis Hoy</p>
              <p className="text-xl font-bold text-blue-600">
                {analysis?.today_analysis || 0}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Alertas</p>
              <p className="text-xl font-bold text-orange-600">
                {alerts?.total_alerts || 0}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertas Activas</p>
              <p className="text-xl font-bold text-red-600">
                {alerts?.active_alerts || 0}
              </p>
            </div>
            <Activity className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Estado del Sistema</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Análisis Reciente</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Últimas 24 horas:</span>
                  <span className="font-medium">{recent_activity?.last_24h_analysis || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Posiciones analizadas:</span>
                  <span className="font-medium">{recent_activity?.positions_analyzed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Score promedio:</span>
                  <span className="font-medium">{analysis?.avg_sell_score?.toFixed(1) || '0.0'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Estado de Alertas</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Alertas activas:</span>
                  <span className="font-medium">{recent_activity?.active_alerts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total generadas:</span>
                  <span className="font-medium">{alerts?.total_alerts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sistema:</span>
                  <span className="text-green-600 font-medium">Operativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellAnalysisStats;