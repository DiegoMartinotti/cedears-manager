import React, { useState } from 'react';
import { AlertTriangle, Check, Clock, TrendingDown, TrendingUp, Timer, Activity } from 'lucide-react';
import { SellAlertData } from '../../services/sellAnalysisService';

interface SellAlertsProps {
  alerts: SellAlertData[];
  onAcknowledge: (alertId: number) => void;
  isLoading: boolean;
}

const SellAlerts: React.FC<SellAlertsProps> = ({ alerts, onAcknowledge, isLoading }) => {
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SellAlertData['alert_type']>('all');

  const filteredAlerts = alerts.filter(alert => {
    const priorityMatch = filter === 'all' || alert.priority === filter;
    const typeMatch = typeFilter === 'all' || alert.alert_type === typeFilter;
    return priorityMatch && typeMatch && alert.is_active;
  });

  const getAlertIcon = (alertType: SellAlertData['alert_type']) => {
    switch (alertType) {
      case 'STOP_LOSS':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'TAKE_PROFIT_1':
      case 'TAKE_PROFIT_2':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'TRAILING_STOP':
        return <Activity className="w-5 h-5 text-blue-600" />;
      case 'TIME_BASED':
        return <Timer className="w-5 h-5 text-orange-600" />;
      case 'TECHNICAL':
        return <AlertTriangle className="w-5 h-5 text-purple-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: SellAlertData['priority']) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 border-blue-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[priority]}`}>
        {priority}
      </span>
    );
  };

  const getAlertTypeLabel = (alertType: SellAlertData['alert_type']) => {
    const labels = {
      STOP_LOSS: 'Stop Loss',
      TAKE_PROFIT_1: 'Take Profit 1',
      TAKE_PROFIT_2: 'Take Profit 2',
      TRAILING_STOP: 'Trailing Stop',
      TIME_BASED: 'Tiempo',
      TECHNICAL: 'Técnico',
    };
    return labels[alertType] || alertType;
  };

  const formatValue = (value: number, alertType: SellAlertData['alert_type']) => {
    if (alertType === 'TIME_BASED') {
      return `${Math.floor(value)} días`;
    }
    return `${value.toFixed(1)}%`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Prioridad:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Todas</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Tipo:</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
          >
            <option value="all">Todos</option>
            <option value="STOP_LOSS">Stop Loss</option>
            <option value="TAKE_PROFIT_1">Take Profit 1</option>
            <option value="TAKE_PROFIT_2">Take Profit 2</option>
            <option value="TRAILING_STOP">Trailing Stop</option>
            <option value="TIME_BASED">Por Tiempo</option>
            <option value="TECHNICAL">Técnico</option>
          </select>
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <span>Total: {filteredAlerts.length} alertas</span>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay alertas activas
          </h3>
          <p className="text-gray-600">
            {filter !== 'all' || typeFilter !== 'all'
              ? 'No hay alertas que coincidan con los filtros seleccionados.'
              : 'Todas las posiciones están bajo control.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${
                alert.priority === 'CRITICAL'
                  ? 'border-red-300 bg-red-50'
                  : alert.priority === 'HIGH'
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-1">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {alert.ticker}
                      </h4>
                      {getPriorityBadge(alert.priority)}
                      <span className="text-sm text-gray-500">
                        {getAlertTypeLabel(alert.alert_type)}
                      </span>
                    </div>

                    <p className="text-gray-700 mb-2">{alert.message}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Umbral: </span>
                        <span className="font-medium">
                          {formatValue(alert.threshold_value, alert.alert_type)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Actual: </span>
                        <span className="font-medium">
                          {formatValue(alert.current_value, alert.alert_type)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {alert.created_at && formatTimestamp(alert.created_at)}
                      </div>
                      {alert.acknowledged_at && (
                        <div className="flex items-center text-green-600">
                          <Check className="w-3 h-3 mr-1" />
                          Confirmada: {formatTimestamp(alert.acknowledged_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {!alert.acknowledged_at && alert.id && (
                    <button
                      onClick={() => onAcknowledge(alert.id!)}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        alert.priority === 'CRITICAL'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : alert.priority === 'HIGH'
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Confirmar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredAlerts.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Resumen de Alertas</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => {
              const count = filteredAlerts.filter(a => a.priority === priority).length;
              return (
                <div key={priority} className="text-center">
                  <div className="text-lg font-bold text-gray-900">{count}</div>
                  <div className="text-gray-600">{priority}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellAlerts;