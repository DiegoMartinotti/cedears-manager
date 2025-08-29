/**
 * Estrategias de Aceleración - Optimizador de Objetivos
 * Paso 28.4: Estrategias para acelerar metas
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Alert } from '../../ui/Alert';

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
  const [selectedStrategy, setSelectedStrategy] = useState<AccelerationStrategy | null>(null);
  const [showDetails, setShowDetails] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    loadAccelerationStrategies();
  }, [goalId]);

  const loadAccelerationStrategies = async () => {
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
  };

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

  const deactivateStrategy = async (strategy: AccelerationStrategy, reason: string) => {
    try {
      // En implementación real: llamada a API
      // await fetch(`/api/goal-optimizer/acceleration-strategies/${strategy.id}/deactivate`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ reason })
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'MARKET_TIMING': '📈',
      'SECTOR_ROTATION': '🔄',
      'VOLATILITY_HARVEST': '⚖️',
      'DIVIDEND_CAPTURE': '💰',
      'TAX_OPTIMIZATION': '📊',
      'COST_REDUCTION': '✂️',
      'LEVERAGE_PRUDENT': '⚡'
    };
    return icons[type as keyof typeof icons] || '🎯';
  };

  const getTypeText = (type: string) => {
    const texts = {
      'MARKET_TIMING': 'Market Timing',
      'SECTOR_ROTATION': 'Rotación Sectorial',
      'VOLATILITY_HARVEST': 'Cosecha de Volatilidad',
      'DIVIDEND_CAPTURE': 'Captura de Dividendos',
      'TAX_OPTIMIZATION': 'Optimización Fiscal',
      'COST_REDUCTION': 'Reducción de Costos',
      'LEVERAGE_PRUDENT': 'Apalancamiento Prudente'
    };
    return texts[type as keyof typeof texts] || type;
  };

  const getRiskColor = (factor: number) => {
    if (factor <= 1.0) return 'text-green-600';
    if (factor <= 1.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplexityColor = (score: number) => {
    if (score <= 4) return 'text-green-600';
    if (score <= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="small" />
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
            {isGenerating && <LoadingSpinner size="small" />}
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
                <Card key={strategy.id} className="p-4 border-green-200 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-2xl">{getTypeIcon(strategy.acceleration_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h5 className="font-medium text-green-900">{strategy.strategy_name}</h5>
                          <Badge className="bg-green-100 text-green-800">Activo</Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            {getTypeText(strategy.acceleration_type)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-green-600">Aceleración:</span>
                            <div className="font-semibold">{strategy.potential_acceleration_months} meses</div>
                          </div>
                          <div>
                            <span className="text-green-600">Riesgo:</span>
                            <div className={`font-medium ${getRiskColor(strategy.risk_increase_factor)}`}>
                              +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-green-600">Retorno Extra:</span>
                            <div className="font-medium">
                              {strategy.expected_return_boost ? `+${strategy.expected_return_boost}%` : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-green-600">Desde:</span>
                            <div className="font-medium">
                              {strategy.activated_date && 
                                new Date(strategy.activated_date).toLocaleDateString('es-AR')
                              }
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-green-700">
                          <Button
                            onClick={() => toggleDetails(strategy.id)}
                            size="small"
                            variant="outline"
                            className="text-xs"
                          >
                            {showDetails[strategy.id] ? 'Ocultar' : 'Ver'} Detalles
                          </Button>
                          <Button
                            onClick={() => deactivateStrategy(strategy, 'Desactivada manualmente')}
                            size="small"
                            variant="outline"
                            className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Desactivar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalles expandidos para estrategias activas */}
                  {showDetails[strategy.id] && (
                    <div className="mt-4 pt-4 border-t border-green-200 space-y-4">
                      {/* Métricas de éxito */}
                      {strategy.success_metrics && strategy.success_metrics.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-green-800 mb-2">Métricas de Éxito</h6>
                          <div className="space-y-2">
                            {strategy.success_metrics.map((metric, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-green-700">{metric.metric_name}:</span>
                                <span className="font-medium">
                                  {metric.current_value ?? 'Midiendo...'} / {metric.target_value}
                                  <span className="text-green-600 ml-1">({metric.measurement_frequency})</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Monitoreo requerido */}
                      {strategy.monitoring_requirements && strategy.monitoring_requirements.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-green-800 mb-2">Monitoreo Requerido</h6>
                          <div className="space-y-2 text-sm">
                            {strategy.monitoring_requirements.map((req, index) => (
                              <div key={index} className="text-green-700">
                                • {req.metric_name} - Revisar cada {req.check_frequency_days} días
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Condiciones de salida */}
                      {strategy.exit_conditions && strategy.exit_conditions.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-green-800 mb-2">Condiciones de Salida</h6>
                          <div className="space-y-2 text-sm">
                            {strategy.exit_conditions.map((condition, index) => (
                              <div key={index} className="text-green-700">
                                • {condition.description} (Prioridad: {condition.priority})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
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
                <Card key={strategy.id} className="p-4 border-blue-200 bg-blue-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="text-2xl">{getTypeIcon(strategy.acceleration_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h5 className="font-medium text-blue-900">{strategy.strategy_name}</h5>
                          <Badge className="bg-blue-100 text-blue-800">Recomendada</Badge>
                          <Badge className="bg-gray-100 text-gray-800">
                            {getTypeText(strategy.acceleration_type)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                          <div>
                            <span className="text-blue-600">Aceleración:</span>
                            <div className="font-semibold text-blue-900">
                              {strategy.potential_acceleration_months} meses
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-600">Riesgo:</span>
                            <div className={`font-medium ${getRiskColor(strategy.risk_increase_factor)}`}>
                              +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}%
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-600">Complejidad:</span>
                            <div className={`font-medium ${getComplexityColor(strategy.complexity_score)}`}>
                              {strategy.complexity_score}/10
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-600">Capital:</span>
                            <div className="font-medium">
                              {strategy.capital_requirements > 0 ? 
                                formatCurrency(strategy.capital_requirements) : 
                                'No requiere'
                              }
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-600">Confianza:</span>
                            <div className={`font-medium ${getConfidenceColor(strategy.recommendation_confidence)}`}>
                              {strategy.recommendation_confidence || 'N/A'}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-blue-700">
                            Implementación: {strategy.implementation_timeline_days} días
                          </span>
                          {strategy.expected_return_boost && (
                            <span className="text-blue-700">
                              • Retorno extra: +{strategy.expected_return_boost}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => toggleDetails(strategy.id)}
                        size="small"
                        variant="outline"
                      >
                        {showDetails[strategy.id] ? 'Ocultar' : 'Ver'} Detalles
                      </Button>
                      <Button
                        onClick={() => activateStrategy(strategy)}
                        size="small"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Activar
                      </Button>
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  {showDetails[strategy.id] && (
                    <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h6 className="font-medium text-blue-800 mb-2">Información General</h6>
                          <div className="space-y-1 text-blue-700">
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
                          <h6 className="font-medium text-blue-800 mb-2">Impacto Esperado</h6>
                          <div className="space-y-1 text-blue-700">
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
                  )}
                </Card>
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
                <Card key={strategy.id} className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl opacity-60">{getTypeIcon(strategy.acceleration_type)}</div>
                      <div>
                        <h5 className="font-medium text-gray-800">{strategy.strategy_name}</h5>
                        <div className="text-sm text-gray-600">
                          {strategy.potential_acceleration_months} meses • Riesgo +{((strategy.risk_increase_factor - 1) * 100).toFixed(0)}% • Complejidad {strategy.complexity_score}/10
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-gray-200 text-gray-700">
                        No recomendada
                      </Badge>
                      <Button
                        onClick={() => toggleDetails(strategy.id)}
                        size="small"
                        variant="outline"
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                  
                  {showDetails[strategy.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Alert type="warning" title="Estrategia no recomendada">
                        Esta estrategia no es recomendada actualmente debido a condiciones de mercado, 
                        alta complejidad o baja confianza en los resultados.
                      </Alert>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Resumen de impacto */}
        {activeStrategies.length > 0 && (
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
        )}
      </Card>
    </div>
  );
};