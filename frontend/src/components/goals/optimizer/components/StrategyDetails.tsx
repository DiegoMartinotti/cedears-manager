/**
 * Detalles de Estrategia - Componente para mostrar información detallada
 */

import React from 'react';
import { Alert } from '../../../ui/Alert';
import { getTypeText, formatCurrency } from '../utils/strategyHelpers';

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
  monitoring_requirements?: Array<{
    metric_name: string;
    check_frequency_days: number;
    threshold_values: { warning: number; critical: number };
    action_required: string;
  }>;
  exit_conditions?: Array<{
    condition_type: 'TIME_BASED' | 'PERFORMANCE_BASED' | 'RISK_BASED' | 'MARKET_BASED';
    description: string;
    trigger_value: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  success_metrics?: Array<{
    metric_name: string;
    target_value: number;
    current_value?: number;
    measurement_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  }>;
}

interface StrategyDetailsProps {
  strategy: AccelerationStrategy;
  variant: 'active' | 'recommended' | 'other';
  showDetails: boolean;
}

export const StrategyDetails: React.FC<StrategyDetailsProps> = ({
  strategy,
  variant,
  showDetails
}) => {
  if (!showDetails) return null;

  const getBorderColor = () => {
    switch (variant) {
      case 'active':
        return 'border-green-200';
      case 'recommended':
        return 'border-blue-200';
      default:
        return 'border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'active':
        return 'text-green-800';
      case 'recommended':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getSecondaryTextColor = () => {
    switch (variant) {
      case 'active':
        return 'text-green-700';
      case 'recommended':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  if (variant === 'other') {
    return (
      <div className={`mt-4 pt-4 border-t ${getBorderColor()}`}>
        <Alert type="warning" title="Estrategia no recomendada">
          Esta estrategia no es recomendada actualmente debido a condiciones de mercado, 
          alta complejidad o baja confianza en los resultados.
        </Alert>
      </div>
    );
  }

  if (variant === 'active') {
    return (
      <div className={`mt-4 pt-4 border-t ${getBorderColor()} space-y-4`}>
        {/* Métricas de éxito */}
        {strategy.success_metrics && strategy.success_metrics.length > 0 && (
          <div>
            <h6 className={`text-sm font-medium ${getTextColor()} mb-2`}>Métricas de Éxito</h6>
            <div className="space-y-2">
              {strategy.success_metrics.map((metric, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className={getSecondaryTextColor()}>{metric.metric_name}:</span>
                  <span className="font-medium">
                    {metric.current_value ?? 'Midiendo...'} / {metric.target_value}
                    <span className={`${getSecondaryTextColor().replace('700', '600')} ml-1`}>({metric.measurement_frequency})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitoreo requerido */}
        {strategy.monitoring_requirements && strategy.monitoring_requirements.length > 0 && (
          <div>
            <h6 className={`text-sm font-medium ${getTextColor()} mb-2`}>Monitoreo Requerido</h6>
            <div className="space-y-2 text-sm">
              {strategy.monitoring_requirements.map((req, index) => (
                <div key={index} className={getSecondaryTextColor()}>
                  • {req.metric_name} - Revisar cada {req.check_frequency_days} días
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Condiciones de salida */}
        {strategy.exit_conditions && strategy.exit_conditions.length > 0 && (
          <div>
            <h6 className={`text-sm font-medium ${getTextColor()} mb-2`}>Condiciones de Salida</h6>
            <div className="space-y-2 text-sm">
              {strategy.exit_conditions.map((condition, index) => (
                <div key={index} className={getSecondaryTextColor()}>
                  • {condition.description} (Prioridad: {condition.priority})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // variant === 'recommended'
  return (
    <div className={`mt-4 pt-4 border-t ${getBorderColor()} space-y-3`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h6 className={`font-medium ${getTextColor()} mb-2`}>Información General</h6>
          <div className={`space-y-1 ${getSecondaryTextColor()}`}>
            <div>Tipo: {getTypeText(strategy.acceleration_type)}</div>
            <div>Complejidad: {strategy.complexity_score}/10</div>
            <div>Timeline: {strategy.implementation_timeline_days} días</div>
            <div>
              Capital requerido: {strategy.capital_requirements > 0 ? 
                formatCurrency(strategy.capital_requirements) : 'Ninguno'
              }
            </div>
          </div>
        </div>
        <div>
          <h6 className={`font-medium ${getTextColor()} mb-2`}>Impacto Esperado</h6>
          <div className={`space-y-1 ${getSecondaryTextColor()}`}>
            <div>Aceleración: {strategy.potential_acceleration_months} meses</div>
            <div>
              Aumento de riesgo: +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}%
            </div>
            {strategy.expected_return_boost && (
              <div>Retorno adicional: +{strategy.expected_return_boost}% anual</div>
            )}
            <div>
              Confianza: {strategy.recommendation_confidence || 'No especificada'}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};