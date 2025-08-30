/**
 * Página Principal del Optimizador de Objetivos
 * Paso 28: Optimizador de Estrategia para Objetivos
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Alert } from '../components/ui/Alert';
import { useGoalOptimizer } from '../hooks/useGoalOptimizer';

// Componentes del optimizador
import { GapAnalysisPanel } from '../components/goals/optimizer/GapAnalysisPanel';
import { ContributionOptimizer } from '../components/goals/optimizer/ContributionOptimizer';
import { MilestoneTracker } from '../components/goals/optimizer/MilestoneTracker';
import { AccelerationStrategies } from '../components/goals/optimizer/AccelerationStrategies';

interface GoalOpportunityMatch {
  id: number;
  goal_id: number;
  opportunity_id: number;
  match_score: number;
  impact_on_goal: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  time_sensitivity_hours: number | null;
  capital_allocation_suggestion: number | null;
  expected_contribution_to_goal: number | null;
  opportunity_details: {
    instrument_symbol: string;
    opportunity_type: string;
    entry_price: number;
    target_price?: number;
    confidence_level: number;
  } | null;
  claude_recommendation: string | null;
  action_taken: boolean;
}

const OpportunityMatcher: React.FC<{ opportunities: GoalOpportunityMatch[] }> = ({
  opportunities 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      case 'LOW': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const urgentOpportunities = opportunities.filter(o => o.priority_level === 'URGENT' && !o.action_taken);
  const highPriorityOpportunities = opportunities.filter(o => o.priority_level === 'HIGH' && !o.action_taken);
  const otherOpportunities = opportunities.filter(o => 
    ['MEDIUM', 'LOW'].includes(o.priority_level) && !o.action_taken
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Oportunidades Vinculadas al Objetivo
            </h3>
            <p className="text-sm text-gray-500">
              {opportunities.length} oportunidades encontradas • {opportunities.filter(o => !o.action_taken).length} disponibles
            </p>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              No se encontraron oportunidades vinculadas a este objetivo.
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Oportunidades urgentes */}
            {urgentOpportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-red-900 mb-4 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span>Oportunidades Urgentes ({urgentOpportunities.length})</span>
                </h4>
                <div className="space-y-3">
                  {urgentOpportunities.map((opportunity) => (
                    <Card key={opportunity.id} className="p-4 border-red-200 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className="font-medium text-red-900">
                              {opportunity.opportunity_details?.instrument_symbol}
                            </h5>
                            <Badge className={getPriorityColor(opportunity.priority_level)}>
                              {opportunity.priority_level}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              Match {opportunity.match_score}%
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                            <div>
                              <span className="text-red-600">Contribución:</span>
                              <div className="font-semibold">
                                {opportunity.expected_contribution_to_goal ? 
                                  formatCurrency(opportunity.expected_contribution_to_goal) : 'N/A'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-red-600">Capital Sugerido:</span>
                              <div className="font-semibold">
                                {opportunity.capital_allocation_suggestion ? 
                                  formatCurrency(opportunity.capital_allocation_suggestion) : 'N/A'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-red-600">Precio Entrada:</span>
                              <div className="font-semibold">
                                {formatCurrency(opportunity.opportunity_details?.entry_price || 0)}
                              </div>
                            </div>
                            <div>
                              <span className="text-red-600">Tiempo Restante:</span>
                              <div className="font-semibold">
                                {opportunity.time_sensitivity_hours ? 
                                  `${opportunity.time_sensitivity_hours}h` : 'N/A'
                                }
                              </div>
                            </div>
                          </div>

                          {opportunity.claude_recommendation && (
                            <div className="text-sm text-red-800 italic bg-red-100 p-2 rounded">
                              💡 {opportunity.claude_recommendation}
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4 space-y-2">
                          <Button size="small" className="bg-red-600 hover:bg-red-700">
                            Revisar
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Oportunidades de alta prioridad */}
            {highPriorityOpportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-orange-900 mb-4 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>Alta Prioridad ({highPriorityOpportunities.length})</span>
                </h4>
                <div className="space-y-3">
                  {highPriorityOpportunities.map((opportunity) => (
                    <Card key={opportunity.id} className="p-4 border-orange-200 bg-orange-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className="font-medium text-orange-900">
                              {opportunity.opportunity_details?.instrument_symbol}
                            </h5>
                            <Badge className={getPriorityColor(opportunity.priority_level)}>
                              {opportunity.priority_level}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              Match {opportunity.match_score}%
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-orange-700">
                            Contribución estimada: {opportunity.expected_contribution_to_goal ? 
                              formatCurrency(opportunity.expected_contribution_to_goal) : 'N/A'
                            }
                          </div>
                        </div>
                        
                        <Button size="small" variant="outline">
                          Revisar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Otras oportunidades */}
            {otherOpportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  Otras Oportunidades ({otherOpportunities.length})
                </h4>
                <div className="grid gap-3">
                  {otherOpportunities.map((opportunity) => (
                    <div key={opportunity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">
                          {opportunity.opportunity_details?.instrument_symbol}
                        </span>
                        <Badge className={getPriorityColor(opportunity.priority_level)}>
                          {opportunity.priority_level}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Match {opportunity.match_score}%
                        </span>
                      </div>
                      <Button size="small" variant="outline">
                        Ver Detalles
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export const GoalOptimizer: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  
  const {
    summary,
    gapAnalysis,
    metrics,
    nextActions,
    isLoading,
    isRefreshing,
    error,
    refreshAll,
    clearError
  } = useGoalOptimizer(Number(goalId), {
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutos
  });

  if (!goalId) {
    return (
      <div className="p-6">
        <Alert type="error" title="Error">
          ID de objetivo no proporcionado
        </Alert>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Cargando optimizador de objetivos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert type="error" title="Error al cargar el optimizador">
          {error}
          <div className="mt-4 space-x-2">
            <Button onClick={() => refreshAll()}>
              Reintentar
            </Button>
            <Button onClick={() => clearError()} variant="outline">
              Limpiar Error
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Optimizador de Objetivos
          </h1>
          <p className="text-gray-600">
            Optimiza tu estrategia para alcanzar tus objetivos financieros más rápido
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isRefreshing && (
            <div className="flex items-center space-x-2 text-blue-600">
              <LoadingSpinner size="small" />
              <span className="text-sm">Actualizando...</span>
            </div>
          )}
          <Button
            onClick={refreshAll}
            disabled={isRefreshing}
            variant="outline"
          >
            Actualizar Todo
          </Button>
        </div>
      </div>

      {/* Métricas generales */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="text-sm font-medium text-blue-700">Score General</div>
            <div className="text-2xl font-bold text-blue-900">{summary.overall_score}/100</div>
            <div className="text-xs text-blue-600">Nivel de optimización</div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
            <div className="text-sm font-medium text-green-700">Estrategias Activas</div>
            <div className="text-2xl font-bold text-green-900">{metrics.activeStrategies}</div>
            <div className="text-xs text-green-600">
              Aceleración: {metrics.totalAccelerationMonths} meses
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="text-sm font-medium text-purple-700">Hitos Completados</div>
            <div className="text-2xl font-bold text-purple-900">
              {metrics.completedMilestones}/{summary.milestones.length}
            </div>
            <div className="text-xs text-purple-600">
              {((metrics.completedMilestones / summary.milestones.length) * 100).toFixed(0)}% progreso
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100">
            <div className="text-sm font-medium text-orange-700">Oportunidades</div>
            <div className="text-2xl font-bold text-orange-900">{metrics.urgentOpportunities}</div>
            <div className="text-xs text-orange-600">Urgentes disponibles</div>
          </Card>
        </div>
      )}

      {/* Próximas acciones prioritarias */}
      {nextActions.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <h3 className="font-medium text-indigo-900 mb-4">🎯 Próximas Acciones Recomendadas</h3>
          <div className="space-y-3">
            {nextActions.slice(0, 3).map((action, index) => (
              <div key={index} className="flex items-start space-x-3">
                <Badge className={`${
                  action.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                  action.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                  action.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                } flex-shrink-0`}>
                  {action.priority}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium text-indigo-900">{action.title}</div>
                  <div className="text-sm text-indigo-700">{action.description}</div>
                  <div className="text-xs text-indigo-600 mt-1">💡 {action.action}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="grid w-full grid-cols-5">
          <Tabs.Trigger value="overview">Resumen</Tabs.Trigger>
          <Tabs.Trigger value="gap">Análisis Gap</Tabs.Trigger>
          <Tabs.Trigger value="contributions">Contribuciones</Tabs.Trigger>
          <Tabs.Trigger value="strategies">Estrategias</Tabs.Trigger>
          <Tabs.Trigger value="opportunities">Oportunidades</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Análisis de Gap resumido */}
            {gapAnalysis && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Estado del Objetivo</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Capital Actual:</span>
                    <span className="font-semibold">{formatCurrency(gapAnalysis.current_capital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Objetivo:</span>
                    <span className="font-semibold">{formatCurrency(gapAnalysis.target_capital)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gap Restante:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(gapAnalysis.gap_amount)} ({gapAnalysis.gap_percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full"
                      style={{ width: `${Math.min(100 - gapAnalysis.gap_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Hitos próximos */}
            {summary && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Hitos Próximos</h3>
                <div className="space-y-3">
                  {summary.milestones
                    .filter(m => !m.is_achieved)
                    .slice(0, 3)
                    .map((milestone) => (
                      <div key={milestone.id} className="flex items-center justify-between">
                        <span className="text-sm">{milestone.milestone_name}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {milestone.progress_percentage.toFixed(1)}%
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-1">
                            <div
                              className="bg-green-500 h-1 rounded-full"
                              style={{ width: `${milestone.progress_percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}
          </div>
        </Tabs.Content>

        <Tabs.Content value="gap">
          <GapAnalysisPanel goalId={Number(goalId)} />
        </Tabs.Content>

        <Tabs.Content value="contributions">
          <ContributionOptimizer 
            goalId={Number(goalId)}
            currentContribution={gapAnalysis?.current_monthly_contribution || 0}
            requiredContribution={gapAnalysis?.required_monthly_contribution || 0}
          />
        </Tabs.Content>

        <Tabs.Content value="strategies">
          <div className="space-y-6">
            <MilestoneTracker 
              goalId={Number(goalId)}
              currentCapital={gapAnalysis?.current_capital || 0}
              targetCapital={gapAnalysis?.target_capital || 0}
            />
            <AccelerationStrategies goalId={Number(goalId)} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="opportunities">
          <OpportunityMatcher 
            opportunities={summary?.opportunity_matches || []}
          />
        </Tabs.Content>
      </Tabs>
    </div>
  );
};