import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, RefreshCw, Settings, Activity, Target } from 'lucide-react';
import { useSellAnalysisDashboard } from '../hooks/useSellAnalysis';
import SellAlerts from '../components/sell-analysis/SellAlerts';
import PositionAnalysisList from '../components/sell-analysis/PositionAnalysisList';
import SellAnalysisStats from '../components/sell-analysis/SellAnalysisStats';
import SellThresholdsConfig from '../components/sell-analysis/SellThresholdsConfig';
import { SellThresholds } from '../services/sellAnalysisService';

const SellAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'positions' | 'stats' | 'config'>('overview');
  const [thresholds, setThresholds] = useState<SellThresholds>({
    take_profit_1: 15,
    take_profit_2: 20,
    stop_loss: -8,
    trailing_stop_trigger: 10,
    trailing_stop_distance: 5,
    time_based_days: 90,
  });

  const {
    overview,
    alerts,
    stats,
    calculateAll,
    acknowledgeAlert,
    refresh,
    isLoading,
    error
  } = useSellAnalysisDashboard();

  const handleRefresh = () => {
    refresh.refreshAll();
  };

  const handleCalculateAll = () => {
    calculateAll.mutate(thresholds);
  };

  const handleThresholdsChange = (newThresholds: SellThresholds) => {
    setThresholds(newThresholds);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar análisis de venta</h2>
          <p className="text-gray-600 mb-4">No se pudieron cargar los datos del análisis.</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análisis de Venta</h1>
          <p className="text-gray-600">
            Monitoreo continuo de posiciones y oportunidades de venta
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCalculateAll}
            disabled={calculateAll.isPending}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Activity className="w-4 h-4 mr-2" />
            {calculateAll.isPending ? 'Analizando...' : 'Analizar Todo'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {overview.data && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Posiciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.data.overview.total_positions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${overview.data.overview.total_portfolio_value.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">%</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Score Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.data.overview.avg_sell_score}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Alertas Activas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overview.data.overview.active_alerts}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                overview.data.overview.total_net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <span className={`font-bold ${
                  overview.data.overview.total_net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  $
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Ganancia Neta</p>
                <p className={`text-2xl font-bold ${
                  overview.data.overview.total_net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${overview.data.overview.total_net_profit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Resumen', icon: TrendingUp },
            { id: 'alerts', name: 'Alertas', icon: AlertTriangle },
            { id: 'positions', name: 'Posiciones', icon: Target },
            { id: 'stats', name: 'Estadísticas', icon: Activity },
            { id: 'config', name: 'Configuración', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
                {tab.id === 'alerts' && alerts.data && alerts.data.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {alerts.data.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Critical Alerts */}
            {overview.data?.critical_alerts && overview.data.critical_alerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-medium text-red-800">
                    Alertas Críticas ({overview.data.critical_alerts.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {overview.data.critical_alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div>
                        <span className="font-medium text-gray-900">{alert.ticker}</span>
                        <span className="text-gray-600 ml-2">{alert.message}</span>
                      </div>
                      <button
                        onClick={() => alert.id && acknowledgeAlert.mutate(alert.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Confirmar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Opportunities */}
            {overview.data?.top_opportunities && overview.data.top_opportunities.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-medium text-gray-900">
                    Mejores Oportunidades de Venta
                  </h3>
                </div>
                <div className="p-4">
                  <PositionAnalysisList 
                    positions={overview.data.top_opportunities}
                    showLimit={5}
                  />
                </div>
              </div>
            )}

            {/* Recommendations Summary */}
            {overview.data?.recommendations && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(overview.data.recommendations).map(([recommendation, positions]) => (
                  <div key={recommendation} className="bg-white p-4 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {recommendation.replace('_', ' ')}
                    </h4>
                    <p className="text-2xl font-bold text-blue-600">{positions.length}</p>
                    <p className="text-sm text-gray-600">posiciones</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <SellAlerts 
            alerts={alerts.data || []}
            onAcknowledge={(alertId) => acknowledgeAlert.mutate(alertId)}
            isLoading={alerts.isLoading}
          />
        )}

        {activeTab === 'positions' && overview.data && (
          <div className="space-y-6">
            {Object.entries(overview.data.recommendations).map(([recommendation, positions]) => (
              positions.length > 0 && (
                <div key={recommendation} className="bg-white rounded-lg shadow border">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">
                      {recommendation.replace('_', ' ')} ({positions.length})
                    </h3>
                  </div>
                  <div className="p-4">
                    <PositionAnalysisList positions={positions} />
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {activeTab === 'stats' && (
          <SellAnalysisStats 
            stats={stats.data}
            isLoading={stats.isLoading}
          />
        )}

        {activeTab === 'config' && (
          <SellThresholdsConfig
            thresholds={thresholds}
            onChange={handleThresholdsChange}
            onSave={() => {
              // The thresholds will be used in the next analysis
              handleCalculateAll();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SellAnalysis;