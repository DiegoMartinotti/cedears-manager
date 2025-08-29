/**
 * Resumen de Impacto - Componente para mostrar el impacto total de estrategias activas
 */

import React from 'react';
import { Card } from '../../../ui/Card';
import { formatCurrency } from '../utils/strategyHelpers';

interface AccelerationStrategy {
  id: number;
  goal_id: number;
  strategy_name: string;
  acceleration_type: 'MARKET_TIMING' | 'SECTOR_ROTATION' | 'VOLATILITY_HARVEST' | 'DIVIDEND_CAPTURE' | 'TAX_OPTIMIZATION' | 'COST_REDUCTION' | 'LEVERAGE_PRUDENT';
  potential_acceleration_months: number;
  risk_increase_factor: number;
  complexity_score: number;
  capital_requirements: number;
  expected_return_boost?: number;
  implementation_timeline_days: number;
  recommendation_confidence?: number;
  is_recommended: boolean;
  is_active: boolean;
  activated_date?: string;
}

interface ImpactSummaryProps {
  activeStrategies: AccelerationStrategy[];
}

export const ImpactSummary: React.FC<ImpactSummaryProps> = ({ activeStrategies }) => {
  if (activeStrategies.length === 0) return null;

  return (
    <Card className="p-4 mt-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
      <h5 className="font-medium text-gray-900 mb-3">📊 Impacto Total de Estrategias Activas</h5>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Aceleración Total:</div>
          <div className="text-lg font-bold text-green-600">
            {activeStrategies.reduce((sum, s) => sum + s.potential_acceleration_months, 0)} meses
          </div>
        </div>
        <div>
          <div className="text-gray-600">Retorno Extra:</div>
          <div className="text-lg font-bold text-blue-600">
            +{activeStrategies.reduce((sum, s) => sum + (s.expected_return_boost || 0), 0).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-gray-600">Capital Requerido:</div>
          <div className="text-lg font-bold text-purple-600">
            {formatCurrency(activeStrategies.reduce((sum, s) => sum + s.capital_requirements, 0))}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Riesgo Promedio:</div>
          <div className="text-lg font-bold text-orange-600">
            +{(((activeStrategies.reduce((sum, s) => sum + s.risk_increase_factor, 0) / activeStrategies.length) - 1) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </Card>
  );
};