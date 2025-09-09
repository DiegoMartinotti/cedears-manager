/**
 * Optimizador de Contribuciones - Optimizador de Objetivos
 * Paso 28.2: Sugerencias de aumento de aportes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Input } from '../../ui/Input';

interface ContributionPlan {
  id: number;
  goal_id: number;
  plan_name: string;
  plan_type: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';
  base_monthly_contribution: number;
  optimized_monthly_contribution: number;
  contribution_increase: number;
  success_probability: number;
  time_savings_months: number | null;
  affordability_score: number | null;
  is_active: boolean;
  bonus_contributions?: Array<{
    month: number;
    amount: number;
    source: string;
    probability: number;
  }>;
}

interface ContributionOptimizerProps {
  goalId: number;
  currentContribution: number;
  requiredContribution: number;
  onPlanSelected?: (plan: ContributionPlan) => void;
}

export const ContributionOptimizer: React.FC<ContributionOptimizerProps> = ({
  goalId,
  currentContribution,
  requiredContribution,
  onPlanSelected
}) => {
  const [plans, setPlans] = useState<ContributionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ContributionPlan | null>(null);
  const [customAmount, setCustomAmount] = useState(currentContribution);
  const [showCustomPlan, setShowCustomPlan] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const loadContributionPlans = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simular datos de planes
      const mockPlans: ContributionPlan[] = [
        {
          id: 1,
          goal_id: goalId,
          plan_name: 'Plan Conservador',
          plan_type: 'CONSERVATIVE',
          base_monthly_contribution: currentContribution,
          optimized_monthly_contribution: currentContribution * 1.15,
          contribution_increase: currentContribution * 0.15,
          success_probability: 82,
          time_savings_months: 6,
          affordability_score: 95,
          is_active: false,
          bonus_contributions: [
            { month: 12, amount: currentContribution * 0.5, source: 'aguinaldo', probability: 85 }
          ]
        },
        {
          id: 2,
          goal_id: goalId,
          plan_name: 'Plan Moderado',
          plan_type: 'MODERATE',
          base_monthly_contribution: currentContribution,
          optimized_monthly_contribution: (currentContribution + requiredContribution) / 2,
          contribution_increase: ((currentContribution + requiredContribution) / 2) - currentContribution,
          success_probability: 78,
          time_savings_months: 12,
          affordability_score: 75,
          is_active: false,
          bonus_contributions: [
            { month: 6, amount: currentContribution * 0.5, source: 'aguinaldo', probability: 85 },
            { month: 12, amount: currentContribution, source: 'aguinaldo', probability: 85 }
          ]
        },
        {
          id: 3,
          goal_id: goalId,
          plan_name: 'Plan Agresivo',
          plan_type: 'AGGRESSIVE',
          base_monthly_contribution: currentContribution,
          optimized_monthly_contribution: requiredContribution,
          contribution_increase: requiredContribution - currentContribution,
          success_probability: 85,
          time_savings_months: 18,
          affordability_score: 55,
          is_active: false,
          bonus_contributions: [
            { month: 3, amount: currentContribution * 0.3, source: 'extra_income', probability: 60 },
            { month: 6, amount: currentContribution * 0.5, source: 'aguinaldo', probability: 85 },
            { month: 9, amount: currentContribution * 0.3, source: 'extra_income', probability: 60 },
            { month: 12, amount: currentContribution, source: 'aguinaldo', probability: 85 }
          ]
        }
      ];
      
      setPlans(mockPlans);
    } catch (error) {
      console.error('Error loading contribution plans:', error);
    } finally {
      setIsLoading(false);
    }
  }, [goalId, currentContribution, requiredContribution]);

  useEffect(() => {
    loadContributionPlans();
  }, [goalId, loadContributionPlans]);

  const calculateCustomPlan = async () => {
    if (customAmount <= currentContribution) {
      return;
    }

    setIsCalculating(true);
    
    try {
      // Simular cálculo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const customPlan: ContributionPlan = {
        id: Date.now(),
        goal_id: goalId,
        plan_name: 'Plan Personalizado',
        plan_type: 'CUSTOM',
        base_monthly_contribution: currentContribution,
        optimized_monthly_contribution: customAmount,
        contribution_increase: customAmount - currentContribution,
        success_probability: Math.min(95, 70 + (customAmount / requiredContribution) * 20),
        time_savings_months: Math.round((customAmount - currentContribution) / 100 * 2),
        affordability_score: Math.max(20, 100 - (customAmount - currentContribution) / 50),
        is_active: false
      };
      
      setSelectedPlan(customPlan);
    } catch (error) {
      console.error('Error calculating custom plan:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const activatePlan = async (plan: ContributionPlan) => {
    try {
      // En implementación real: llamada a API
      // await fetch(`/api/goal-optimizer/contribution-plans/${plan.id}/activate`, { method: 'PUT' });
      
      setPlans(prev => prev.map(p => ({ ...p, is_active: p.id === plan.id })));
      
      if (onPlanSelected) {
        onPlanSelected({ ...plan, is_active: true });
      }
    } catch (error) {
      console.error('Error activating plan:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'CONSERVATIVE': return 'bg-green-100 text-green-800';
      case 'MODERATE': return 'bg-blue-100 text-blue-800';
      case 'AGGRESSIVE': return 'bg-red-100 text-red-800';
      case 'CUSTOM': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanTypeText = (type: string) => {
    switch (type) {
      case 'CONSERVATIVE': return 'Conservador';
      case 'MODERATE': return 'Moderado';
      case 'AGGRESSIVE': return 'Agresivo';
      case 'CUSTOM': return 'Personalizado';
      default: return type;
    }
  };

  const getAffordabilityColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="sm" />
          <span>Cargando planes de contribución...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Optimizador de Contribuciones
            </h3>
            <p className="text-sm text-gray-500">
              Encuentra el plan de aportes que mejor se adapte a tu situación
            </p>
          </div>
          <Button
            onClick={() => setShowCustomPlan(!showCustomPlan)}
            variant="outline"
          >
            Plan Personalizado
          </Button>
        </div>

        {/* Información actual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600">Aporte Actual</div>
            <div className="text-lg font-semibold">{formatCurrency(currentContribution)}/mes</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Aporte Requerido</div>
            <div className="text-lg font-semibold text-red-600">{formatCurrency(requiredContribution)}/mes</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Diferencia</div>
            <div className="text-lg font-semibold text-orange-600">
              {formatCurrency(requiredContribution - currentContribution)}/mes
            </div>
          </div>
        </div>

        {/* Plan personalizado */}
        {showCustomPlan && (
          <Card className="p-4 mb-6 border-purple-200">
            <h4 className="font-medium text-gray-900 mb-4">Crear Plan Personalizado</h4>
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Aporte Mensual
                </label>
                <Input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  placeholder="Ingrese el monto"
                  className="w-full"
                  min={currentContribution}
                  max={requiredContribution * 1.2}
                />
              </div>
              <Button
                onClick={calculateCustomPlan}
                disabled={isCalculating || customAmount <= currentContribution}
                className="flex items-center space-x-2"
              >
                {isCalculating && <LoadingSpinner size="sm" />}
                <span>{isCalculating ? 'Calculando...' : 'Calcular'}</span>
              </Button>
            </div>
            
            {selectedPlan && selectedPlan.plan_type === 'CUSTOM' && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Aumento:</span>
                    <div className="font-medium">{formatCurrency(selectedPlan.contribution_increase)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Ahorro de Tiempo:</span>
                    <div className="font-medium">{selectedPlan.time_savings_months} meses</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Prob. Éxito:</span>
                    <div className="font-medium">{selectedPlan.success_probability}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Factibilidad:</span>
                    <div className={`font-medium ${getAffordabilityColor(selectedPlan.affordability_score)}`}>
                      {selectedPlan.affordability_score}%
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => activatePlan(selectedPlan)}
                  className="mt-3"
                  size="sm"
                >
                  Activar Plan Personalizado
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Planes predefinidos */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Planes Sugeridos</h4>
          
          {plans.map((plan) => (
            <Card key={plan.id} className={`p-4 ${plan.is_active ? 'border-blue-500 bg-blue-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="font-medium text-gray-900">{plan.plan_name}</h5>
                    <Badge className={getPlanTypeColor(plan.plan_type)}>
                      {getPlanTypeText(plan.plan_type)}
                    </Badge>
                    {plan.is_active && (
                      <Badge className="bg-blue-100 text-blue-800">Activo</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600">Nuevo Aporte:</span>
                      <div className="font-semibold text-lg">
                        {formatCurrency(plan.optimized_monthly_contribution)}/mes
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Aumento:</span>
                      <div className="font-medium text-orange-600">
                        +{formatCurrency(plan.contribution_increase)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Ahorro de Tiempo:</span>
                      <div className="font-medium">
                        {plan.time_savings_months} meses
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Prob. Éxito:</span>
                      <div className="font-medium text-green-600">
                        {plan.success_probability}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>
                      Factibilidad: 
                      <span className={`ml-1 font-medium ${getAffordabilityColor(plan.affordability_score)}`}>
                        {plan.affordability_score}%
                      </span>
                    </span>
                    {plan.bonus_contributions && plan.bonus_contributions.length > 0 && (
                      <span>
                        • Incluye {plan.bonus_contributions.length} aportes extraordinarios
                      </span>
                    )}
                  </div>

                  {/* Aportes extraordinarios */}
                  {plan.bonus_contributions && plan.bonus_contributions.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Aportes Extraordinarios:
                      </div>
                      <div className="space-y-1 text-sm">
                        {plan.bonus_contributions.map((bonus, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-600">
                              {new Date(2024, bonus.month - 1).toLocaleDateString('es-AR', { month: 'long' })} 
                              ({bonus.source})
                            </span>
                            <span className="font-medium">
                              {formatCurrency(bonus.amount)} ({bonus.probability}% prob.)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  {!plan.is_active ? (
                    <Button
                      onClick={() => activatePlan(plan)}
                      size="sm"
                    >
                      Activar Plan
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                    >
                      Plan Activo
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Comparación visual */}
        <Card className="p-4 mt-6 bg-blue-50">
          <h5 className="font-medium text-blue-900 mb-3">Comparación de Planes</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-blue-800">
                  <th className="text-left p-2">Plan</th>
                  <th className="text-center p-2">Aporte Mensual</th>
                  <th className="text-center p-2">Aumento</th>
                  <th className="text-center p-2">Ahorro Tiempo</th>
                  <th className="text-center p-2">Probabilidad</th>
                  <th className="text-center p-2">Factibilidad</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className={`${plan.is_active ? 'bg-blue-100' : 'bg-white'}`}>
                    <td className="p-2 font-medium">{plan.plan_name}</td>
                    <td className="p-2 text-center">{formatCurrency(plan.optimized_monthly_contribution)}</td>
                    <td className="p-2 text-center text-orange-600">
                      +{formatCurrency(plan.contribution_increase)}
                    </td>
                    <td className="p-2 text-center">{plan.time_savings_months}m</td>
                    <td className="p-2 text-center text-green-600">{plan.success_probability}%</td>
                    <td className={`p-2 text-center font-medium ${getAffordabilityColor(plan.affordability_score)}`}>
                      {plan.affordability_score}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Card>
    </div>
  );
};