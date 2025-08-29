/**
 * Tarjeta de Estrategia - Componente para mostrar información de estrategias
 */

import React from 'react';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { StrategyDetails } from './StrategyDetails';
import { getTypeIcon, getTypeText, getRiskColor, getComplexityColor, getConfidenceColor, formatCurrency } from '../utils/strategyHelpers';

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

interface StrategyCardProps {
  strategy: AccelerationStrategy;
  variant: 'active' | 'recommended' | 'other';
  showDetails: boolean;
  onToggleDetails: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export const StrategyCard: React.FC<StrategyCardProps> = ({
  strategy,
  variant,
  showDetails,
  onToggleDetails,
  onActivate,
  onDeactivate
}) => {
  const getCardStyle = () => {
    switch (variant) {
      case 'active':
        return 'border-green-200 bg-green-50';
      case 'recommended':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getBadgeStyle = () => {
    switch (variant) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'recommended':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getBadgeText = () => {
    switch (variant) {
      case 'active':
        return 'Activo';
      case 'recommended':
        return 'Recomendada';
      default:
        return 'No recomendada';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'active':
        return 'text-green-900';
      case 'recommended':
        return 'text-blue-900';
      default:
        return 'text-gray-800';
    }
  };

  const getSecondaryTextColor = () => {
    switch (variant) {
      case 'active':
        return 'text-green-600';
      case 'recommended':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (variant === 'other') {
    return (
      <Card className={`p-4 ${getCardStyle()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-xl opacity-60">{getTypeIcon(strategy.acceleration_type)}</div>
            <div>
              <h5 className={`font-medium ${getTextColor()}`}>{strategy.strategy_name}</h5>
              <div className={`text-sm ${getSecondaryTextColor()}`}>
                {strategy.potential_acceleration_months} meses • Riesgo +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}% • Complejidad {strategy.complexity_score}/10
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getBadgeStyle()}>
              {getBadgeText()}
            </Badge>
            <Button
              onClick={onToggleDetails}
              size="small"
              variant="outline"
            >
              Ver Detalles
            </Button>
          </div>
        </div>
        
        <StrategyDetails
          strategy={strategy}
          variant={variant}
          showDetails={showDetails}
        />
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${getCardStyle()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="text-2xl">{getTypeIcon(strategy.acceleration_type)}</div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h5 className={`font-medium ${getTextColor()}`}>{strategy.strategy_name}</h5>
              <Badge className={getBadgeStyle()}>{getBadgeText()}</Badge>
              <Badge className={variant === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                {getTypeText(strategy.acceleration_type)}
              </Badge>
            </div>
            
            {variant === 'active' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                <div>
                  <span className={getSecondaryTextColor()}>Aceleración:</span>
                  <div className="font-semibold">{strategy.potential_acceleration_months} meses</div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Riesgo:</span>
                  <div className={`font-medium ${getRiskColor(strategy.risk_increase_factor)}`}>
                    +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Retorno Extra:</span>
                  <div className="font-medium">
                    {strategy.expected_return_boost ? `+${strategy.expected_return_boost}%` : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Desde:</span>
                  <div className="font-medium">
                    {strategy.activated_date && 
                      new Date(strategy.activated_date).toLocaleDateString('es-AR')
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                <div>
                  <span className={getSecondaryTextColor()}>Aceleración:</span>
                  <div className={`font-semibold ${getTextColor()}`}>
                    {strategy.potential_acceleration_months} meses
                  </div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Riesgo:</span>
                  <div className={`font-medium ${getRiskColor(strategy.risk_increase_factor)}`}>
                    +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Complejidad:</span>
                  <div className={`font-medium ${getComplexityColor(strategy.complexity_score)}`}>
                    {strategy.complexity_score}/10
                  </div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Capital:</span>
                  <div className="font-medium">
                    {strategy.capital_requirements > 0 ? 
                      formatCurrency(strategy.capital_requirements) : 
                      'No requiere'
                    }
                  </div>
                </div>
                <div>
                  <span className={getSecondaryTextColor()}>Confianza:</span>
                  <div className={`font-medium ${getConfidenceColor(strategy.recommendation_confidence)}`}>
                    {strategy.recommendation_confidence || 'N/A'}%
                  </div>
                </div>
              </div>
            )}

            {variant === 'active' ? (
              <div className={`flex items-center space-x-4 text-sm ${getSecondaryTextColor().replace('600', '700')}`}>
                <Button
                  onClick={onToggleDetails}
                  size="small"
                  variant="outline"
                  className="text-xs"
                >
                  {showDetails ? 'Ocultar' : 'Ver'} Detalles
                </Button>
                <Button
                  onClick={onDeactivate}
                  size="small"
                  variant="outline"
                  className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                >
                  Desactivar
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-4 text-sm">
                <span className={getSecondaryTextColor().replace('600', '700')}>
                  Implementación: {strategy.implementation_timeline_days} días
                </span>
                {strategy.expected_return_boost && (
                  <span className={getSecondaryTextColor().replace('600', '700')}>
                    • Retorno extra: +{strategy.expected_return_boost}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {variant === 'recommended' && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={onToggleDetails}
              size="small"
              variant="outline"
            >
              {showDetails ? 'Ocultar' : 'Ver'} Detalles
            </Button>
            <Button
              onClick={onActivate}
              size="small"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Activar
            </Button>
          </div>
        )}
      </div>

      <StrategyDetails
        strategy={strategy}
        variant={variant}
        showDetails={showDetails}
      />
    </Card>
  );
};