/**
 * Estrategias de Aceleración - Optimizador de Objetivos
 * Paso 28.4: Estrategias para acelerar metas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { StrategyCard } from './components/StrategyCard';
import { ImpactSummary } from './components/ImpactSummary';

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

interface AccelerationStrategiesProps {
  goalId: number;
  onStrategyActivated?: (strategy: AccelerationStrategy) => void;
}

export const AccelerationStrategies: React.FC<AccelerationStrategiesProps> = ({
  goalId,
  onStrategyActivated
}) => {
  const [strategies, setStrategies] = useState<AccelerationStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [key: number]: boolean }>({});

  const loadAccelerationStrategies = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simular datos de estrategias
      const mockStrategies: AccelerationStrategy[] = [
        {
          id: 1,
          goal_id: goalId,
          strategy_name: 'Timing de Mercado Táctico',
          acceleration_type: 'MARKET_TIMING',
          potential_acceleration_months: 8,
          risk_increase_factor: 1.3,
          complexity_score: 7,
          capital_requirements: 2500,
          expected_return_boost: 3.5,
          implementation_timeline_days: 30,
          recommendation_confidence: 75,
          is_recommended: true,
          is_active: false,
          monitoring_requirements: [
            {
              metric_name: 'VIX Index',
              check_frequency_days: 1,
              threshold_values: { warning: 25, critical: 35 },
              action_required: 'Revisar exposición al riesgo'
            }
          ],
          exit_conditions: [
            {
              condition_type: 'RISK_BASED',
              description: 'VIX supera nivel crítico',
              trigger_value: 35,
              priority: 'HIGH'
            }
          ],
          success_metrics: [
            {
              metric_name: 'Months Accelerated',
              target_value: 8,
              measurement_frequency: 'MONTHLY'
            }
          ]
        },
        {
          id: 2,
          goal_id: goalId,
          strategy_name: 'Captura Sistemática de Dividendos',
          acceleration_type: 'DIVIDEND_CAPTURE',
          potential_acceleration_months: 4,
          risk_increase_factor: 1.1,
          complexity_score: 5,
          capital_requirements: 1200,
          expected_return_boost: 2.8,
          implementation_timeline_days: 14,
          recommendation_confidence: 85,
          is_recommended: true,
          is_active: false,
          monitoring_requirements: [
            {
              metric_name: 'Dividend Yield Portfolio',
              check_frequency_days: 30,
              threshold_values: { warning: 0.02, critical: 0.015 },
              action_required: 'Revisar selección de instrumentos dividenderos'
            }
          ]
        },
        {
          id: 3,
          goal_id: goalId,
          strategy_name: 'Cosecha de Volatilidad (Rebalanceo)',
          acceleration_type: 'VOLATILITY_HARVEST',
          potential_acceleration_months: 3,
          risk_increase_factor: 1.05,
          complexity_score: 4,
          capital_requirements: 0,
          expected_return_boost: 1.5,
          implementation_timeline_days: 7,
          recommendation_confidence: 90,
          is_recommended: true,
          is_active: true,
          activated_date: '2024-01-15'
        },
        {
          id: 4,
          goal_id: goalId,
          strategy_name: 'Optimización Integral de Costos',
          acceleration_type: 'COST_REDUCTION',
          potential_acceleration_months: 2,
          risk_increase_factor: 1.0,
          complexity_score: 3,
          capital_requirements: 0,
          implementation_timeline_days: 14,
          recommendation_confidence: 95,
          is_recommended: true,
          is_active: false
        },
        {
          id: 5,
          goal_id: goalId,
          strategy_name: 'Rotación Sectorial Táctica',
          acceleration_type: 'SECTOR_ROTATION',
          potential_acceleration_months: 12,
          risk_increase_factor: 1.4,
          complexity_score: 8,
          capital_requirements: 3000,
          expected_return_boost: 4.2,
          implementation_timeline_days: 45,
          recommendation_confidence: 68,
          is_recommended: false,
          is_active: false
        }
      ];
      
      setStrategies(mockStrategies);
    } catch (error) {
      console.error('Error loading acceleration strategies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    loadAccelerationStrategies();
  }, [loadAccelerationStrategies]);


  const generateNewStrategies = async () => {
    setIsGenerating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadAccelerationStrategies();
    } catch (error) {
      console.error('Error generating strategies:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const activateStrategy = async (strategy: AccelerationStrategy) => {
    try {
      // En implementación real: validar condiciones y activar
      // await fetch(`/api/goal-optimizer/acceleration-strategies/${strategy.id}/activate`, { method: 'PUT' });
      
      const updatedStrategy = { 
        ...strategy, 
        is_active: true, 
        activated_date: new Date().toISOString() 
      };
      
      setStrategies(prev => prev.map(s => s.id === strategy.id ? updatedStrategy : s));
      
      if (onStrategyActivated) {
        onStrategyActivated(updatedStrategy);
      }
    } catch (error) {
      console.error('Error activating strategy:', error);
    }
  };

  const deactivateStrategy = async (strategy: AccelerationStrategy) => {
    try {
      // En implementación real: llamada a API
      // await fetch(`/api/goal-optimizer/acceleration-strategies/${strategy.id}/deactivate`, {
      //   method: 'PUT'
      // });
      
      setStrategies(prev => prev.map(s => 
        s.id === strategy.id ? { ...s, is_active: false, activated_date: undefined } : s
      ));
    } catch (error) {
      console.error('Error deactivating strategy:', error);
    }
  };

  const toggleDetails = (strategyId: number) => {
    setShowDetails(prev => ({ ...prev, [strategyId]: !prev[strategyId] }));
  };


  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>Cargando estrategias de aceleración...</span>
        </div>
      </Card>
    );
  }

  const activeStrategies = strategies.filter(s => s.is_active);
  const recommendedStrategies = strategies.filter(s => s.is_recommended && !s.is_active);
  const otherStrategies = strategies.filter(s => !s.is_recommended && !s.is_active);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Estrategias de Aceleración
            </h3>
            <p className="text-sm text-gray-500">
              {activeStrategies.length} activas • {recommendedStrategies.length} recomendadas
            </p>
          </div>
          <Button
            onClick={generateNewStrategies}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isGenerating && <LoadingSpinner size="sm" />}
            <span>{isGenerating ? 'Generando...' : 'Actualizar Estrategias'}</span>
          </Button>
        </div>

        {/* Estrategias activas */}
        {activeStrategies.length > 0 && (
          <div className="mb-8">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Estrategias Activas ({activeStrategies.length})</span>
            </h4>
            
            <div className="space-y-4">
              {activeStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  variant="active"
                  showDetails={showDetails[strategy.id] || false}
                  onToggleDetails={() => toggleDetails(strategy.id)}
                  onDeactivate={() => deactivateStrategy(strategy)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Estrategias recomendadas */}
        {recommendedStrategies.length > 0 && (
          <div className="mb-8">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Estrategias Recomendadas ({recommendedStrategies.length})</span>
            </h4>
            
            <div className="space-y-4">
              {recommendedStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  variant="recommended"
                  showDetails={showDetails[strategy.id] || false}
                  onToggleDetails={() => toggleDetails(strategy.id)}
                  onActivate={() => activateStrategy(strategy)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Otras estrategias */}
        {otherStrategies.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span>Otras Estrategias ({otherStrategies.length})</span>
            </h4>
            
            <div className="space-y-4">
              {otherStrategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  variant="other"
                  showDetails={showDetails[strategy.id] || false}
                  onToggleDetails={() => toggleDetails(strategy.id)}
                />
              ))}
            </div>
          </div>
        )}

        <ImpactSummary activeStrategies={activeStrategies} />
      </Card>
    </div>
  );
};