import React, { useState } from 'react';
import { Settings, Save, RotateCcw, Info } from 'lucide-react';
import { SellThresholds } from '../../services/sellAnalysisService';

interface SellThresholdsConfigProps {
  thresholds: SellThresholds;
  onChange: (thresholds: SellThresholds) => void;
  onSave: () => void;
}

const SellThresholdsConfig: React.FC<SellThresholdsConfigProps> = ({
  thresholds,
  onChange,
  onSave
}) => {
  const [localThresholds, setLocalThresholds] = useState<SellThresholds>(thresholds);
  const [hasChanges, setHasChanges] = useState(false);

  const defaultThresholds: SellThresholds = {
    take_profit_1: 15,
    take_profit_2: 20,
    stop_loss: -8,
    trailing_stop_trigger: 10,
    trailing_stop_distance: 5,
    time_based_days: 90,
  };

  const handleChange = (key: keyof SellThresholds, value: number) => {
    const newThresholds = {
      ...localThresholds,
      [key]: value
    };
    setLocalThresholds(newThresholds);
    setHasChanges(true);
  };

  const handleSave = () => {
    onChange(localThresholds);
    setHasChanges(false);
    onSave();
  };

  const handleReset = () => {
    setLocalThresholds(defaultThresholds);
    setHasChanges(true);
  };

  const handleCancel = () => {
    setLocalThresholds(thresholds);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configuración de Umbrales
          </h2>
          <p className="text-gray-600 mt-1">
            Configura los umbrales para las alertas de venta automáticas
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar
            </button>
          </div>
        )}
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Take Profit Settings */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b bg-green-50">
            <h3 className="text-lg font-medium text-green-800">
              Take Profit - Toma de Ganancias
            </h3>
            <p className="text-sm text-green-600 mt-1">
              Umbrales para alertas de venta con ganancias
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Take Profit 1 (%)
              </label>
              <input
                type="number"
                value={localThresholds.take_profit_1 || ''}
                onChange={(e) => handleChange('take_profit_1', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Primera señal de venta moderada (recomendado: 15%)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Take Profit 2 (%)
              </label>
              <input
                type="number"
                value={localThresholds.take_profit_2 || ''}
                onChange={(e) => handleChange('take_profit_2', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Señal de venta fuerte (recomendado: 20%)
              </p>
            </div>
          </div>
        </div>

        {/* Stop Loss Settings */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b bg-red-50">
            <h3 className="text-lg font-medium text-red-800">
              Stop Loss - Protección de Pérdidas
            </h3>
            <p className="text-sm text-red-600 mt-1">
              Umbrales para limitar pérdidas
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stop Loss (%)
              </label>
              <input
                type="number"
                value={localThresholds.stop_loss || ''}
                onChange={(e) => handleChange('stop_loss', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="-50"
                max="0"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Pérdida máxima antes de venta automática (recomendado: -8%)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-yellow-800 font-medium">Importante</p>
                  <p className="text-yellow-700">
                    El stop loss se calcula considerando inflación y comisiones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trailing Stop Settings */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b bg-purple-50">
            <h3 className="text-lg font-medium text-purple-800">
              Trailing Stop - Seguimiento Dinámico
            </h3>
            <p className="text-sm text-purple-600 mt-1">
              Stop loss que se ajusta con las ganancias
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activación (%)
              </label>
              <input
                type="number"
                value={localThresholds.trailing_stop_trigger || ''}
                onChange={(e) => handleChange('trailing_stop_trigger', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ganancia mínima para activar trailing stop
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distancia (%)
              </label>
              <input
                type="number"
                value={localThresholds.trailing_stop_distance || ''}
                onChange={(e) => handleChange('trailing_stop_distance', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max="50"
                step="0.1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Distancia desde el máximo para activar venta
              </p>
            </div>
          </div>
        </div>

        {/* Time-Based Settings */}
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b bg-orange-50">
            <h3 className="text-lg font-medium text-orange-800">
              Alertas por Tiempo
            </h3>
            <p className="text-sm text-orange-600 mt-1">
              Revisiones basadas en tiempo de tenencia
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Días para Revisión
              </label>
              <input
                type="number"
                value={localThresholds.time_based_days || ''}
                onChange={(e) => handleChange('time_based_days', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="1000"
                step="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Después de cuántos días sugerir revisión (recomendado: 90)
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">Consejo</p>
                  <p className="text-blue-700">
                    Las alertas por tiempo solo se activan si hay ganancias positivas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleReset}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Predeterminados
          </button>
        </div>

        <div className="text-sm text-gray-600">
          {hasChanges ? (
            <span className="text-orange-600 font-medium">
              Tienes cambios sin guardar
            </span>
          ) : (
            <span>
              Configuración actualizada
            </span>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Vista Previa de Configuración
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="font-medium text-green-800">Take Profit 1</div>
              <div className="text-lg font-bold text-green-600">
                {localThresholds.take_profit_1}%
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="font-medium text-green-800">Take Profit 2</div>
              <div className="text-lg font-bold text-green-600">
                {localThresholds.take_profit_2}%
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="font-medium text-red-800">Stop Loss</div>
              <div className="text-lg font-bold text-red-600">
                {localThresholds.stop_loss}%
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="font-medium text-purple-800">Trailing Trigger</div>
              <div className="text-lg font-bold text-purple-600">
                {localThresholds.trailing_stop_trigger}%
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="font-medium text-purple-800">Trailing Distance</div>
              <div className="text-lg font-bold text-purple-600">
                {localThresholds.trailing_stop_distance}%
              </div>
            </div>
            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <div className="font-medium text-orange-800">Revisión</div>
              <div className="text-lg font-bold text-orange-600">
                {localThresholds.time_based_days} días
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellThresholdsConfig;