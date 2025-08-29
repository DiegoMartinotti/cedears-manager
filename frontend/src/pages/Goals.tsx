import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { CreateGoalForm } from '../components/goals/CreateGoalForm';
import { GoalDashboard } from '../components/goals/GoalDashboard';
import { GoalCalculator } from '../components/goals/GoalCalculator';
import { ContributionSimulator } from '../components/goals/ContributionSimulator';
import { GoalAlerts } from '../components/goals/GoalAlerts';
import { useGoalTracker } from '../hooks/useGoalTracker';
import { goalService } from '../services/goalService';

export default function Goals() {
  const navigate = useNavigate();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const {
    goals,
    createGoal,
    dashboard,
    refreshDashboard,
    updateProgress,
    calculation,
    calculate,
    simulations,
    simulate,
    simulateMultiple,
    isLoading,
    hasError,
    updateCompleteProgress
  } = useGoalTracker(selectedGoalId);

  const handleCreateGoal = async (goalData: any) => {
    await createGoal(goalData);
    setShowCreateForm(false);
    // Si es el primer objetivo, seleccionarlo automáticamente
    if (goals.length === 0) {
      // Recargar goals y seleccionar el nuevo
      setTimeout(() => {
        if (goals.length > 0) {
          setSelectedGoalId(goals[0].id);
        }
      }, 500);
    }
  };

  const handleSelectGoal = (goalId: number) => {
    setSelectedGoalId(goalId);
    setActiveTab('dashboard');
  };

  const handleCalculateTime = () => {
    if (selectedGoalId) {
      calculate(selectedGoalId);
    }
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Crear Objetivo Financiero</h2>
          <Button 
            variant="outline" 
            onClick={() => setShowCreateForm(false)}
          >
            ← Volver a Objetivos
          </Button>
        </div>
        <CreateGoalForm
          onSubmit={handleCreateGoal}
          onCancel={() => setShowCreateForm(false)}
          loading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🎯 Objetivos Financieros</h2>
          <p className="text-gray-600 text-sm">
            Seguimiento inteligente de tus metas de inversión
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          ➕ Nuevo Objetivo
        </Button>
      </div>

      {/* Lista de objetivos */}
      {goals.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mis Objetivos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedGoalId === goal.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => handleSelectGoal(goal.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{goal.name}</h4>
                  <Badge className={goalService.getStatusColor(goal.status)}>
                    {goalService.getStatusLabel(goal.status)}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {goalService.getGoalTypeLabel(goal.type)}
                </div>
                {goal.target_amount && (
                  <div className="text-lg font-semibold text-gray-900">
                    {goalService.formatCurrency(goal.target_amount, goal.currency)}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Creado: {new Date(goal.created_date).toLocaleDateString('es-ES')}
                </div>
                
                {/* Botón de optimizador */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Button
                    size="small"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/goals/${goal.id}/optimizer`);
                    }}
                  >
                    🚀 Optimizador
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sin objetivos */}
      {goals.length === 0 && !isLoading && (
        <Card className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Comienza a Planificar tu Futuro Financiero!
            </h3>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Define tus metas financieras y recibe seguimiento inteligente con proyecciones, 
              simulaciones y alertas para alcanzar tus objetivos más rápido.
            </p>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
            >
              🚀 Crear Mi Primer Objetivo
            </Button>
          </div>

          {/* Beneficios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-blue-200">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-gray-900 mb-1">Seguimiento Inteligente</div>
              <div className="text-sm text-gray-600">
                Monitoreo automático del progreso con ajustes por inflación
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🧮</div>
              <div className="font-medium text-gray-900 mb-1">Simulaciones Avanzadas</div>
              <div className="text-sm text-gray-600">
                Calcula el impacto de aportes extras y cambios de estrategia
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="font-medium text-gray-900 mb-1">Alertas Proactivas</div>
              <div className="text-sm text-gray-600">
                Notificaciones cuando necesites ajustar tu plan
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Dashboard del objetivo seleccionado */}
      {selectedGoal && (
        <div className="space-y-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
                { id: 'calculator', label: '⏱️ Calculadora', icon: '⏱️' },
                { id: 'simulator', label: '🧮 Simulador', icon: '🧮' },
                { id: 'alerts', label: '⚠️ Alertas', icon: '⚠️' },
                { id: 'optimizer', label: '🚀 Optimizador', icon: '🚀' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          {activeTab === 'dashboard' && (
            <GoalDashboard
              dashboard={dashboard}
              loading={isLoading}
              error={hasError}
              onUpdateProgress={updateCompleteProgress}
              onRefresh={refreshDashboard}
            />
          )}

          {activeTab === 'calculator' && (
            <GoalCalculator
              calculation={calculation}
              loading={isLoading}
              error={hasError}
              onRecalculate={handleCalculateTime}
            />
          )}

          {activeTab === 'simulator' && (
            <ContributionSimulator
              goalId={selectedGoalId}
              currency={selectedGoal.currency}
              currentCapital={dashboard?.latestProgress?.current_capital || 0}
              onSimulate={simulate}
              onSimulateMultiple={simulateMultiple}
              simulations={simulations}
              loading={isLoading}
              error={hasError}
            />
          )}

          {activeTab === 'alerts' && (
            <GoalAlerts
              dashboard={dashboard}
              onCheckAlerts={async () => {
                // Implementar verificación de alertas
                console.log('Checking alerts...');
              }}
              loading={isLoading}
            />
          )}

          {activeTab === 'optimizer' && selectedGoalId && (
            <Card className="p-6">
              <div className="text-center space-y-4">
                <div className="text-6xl">🚀</div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Optimizador de Estrategia
                </h3>
                <p className="text-gray-600 max-w-lg mx-auto">
                  Accede al optimizador avanzado para analizar gaps, generar estrategias de aceleración, 
                  calcular aportes optimizados y vincular oportunidades de mercado con tu objetivo.
                </p>
                <Button
                  onClick={() => navigate(`/goals/${selectedGoalId}/optimizer`)}
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
                >
                  🚀 Abrir Optimizador Completo
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-8 border-t">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-medium text-gray-900 mb-1">Análisis de Gap</div>
                    <div className="text-sm text-gray-600">
                      Identifica la diferencia entre tu situación actual y tu objetivo
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">💰</div>
                    <div className="font-medium text-gray-900 mb-1">Optimizar Aportes</div>
                    <div className="text-sm text-gray-600">
                      Calcula los aportes mensuales óptimos para tu situación
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">⚡</div>
                    <div className="font-medium text-gray-900 mb-1">Acelerar Metas</div>
                    <div className="text-sm text-gray-600">
                      Estrategias avanzadas para alcanzar tu objetivo más rápido
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="font-medium text-gray-900 mb-1">Oportunidades</div>
                    <div className="text-sm text-gray-600">
                      Vincula oportunidades de mercado específicas a tu objetivo
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Error global */}
      {hasError && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <div className="text-red-600 font-medium">Error del Sistema</div>
          <div className="text-red-500 text-sm">{hasError}</div>
        </Card>
      )}

      {/* Loading global */}
      {isLoading && goals.length === 0 && (
        <Card className="p-8 bg-white">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando objetivos...</span>
          </div>
        </Card>
      )}
    </div>
  );
}