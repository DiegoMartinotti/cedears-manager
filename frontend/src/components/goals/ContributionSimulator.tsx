import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';
import { GoalSimulation, SimulationRequest } from '../../services/goalService';
import { goalService } from '../../services/goalService';

interface ContributionSimulatorProps {
  goalId: number;
  currency: 'USD' | 'ARS';
  currentCapital?: number;
  onSimulate: (goalId: number, simulation: SimulationRequest) => Promise<void>;
  onSimulateMultiple: (goalId: number, scenarios: Array<{name: string, extraAmount: number, months: number}>) => Promise<void>;
  simulations: GoalSimulation[];
  loading: boolean;
  error: string | null;
}

export function ContributionSimulator({
  goalId,
  currency,
  currentCapital = 0,
  onSimulate,
  onSimulateMultiple,
  simulations,
  loading,
  error
}: ContributionSimulatorProps) {
  const [simulationForm, setSimulationForm] = useState<SimulationRequest>({
    extraAmount: 0,
    months: 12
  });

  const [customScenarios, setCustomScenarios] = useState<Array<{name: string, extraAmount: number, months: number}>>([
    { name: 'Aporte Extra Anual', extraAmount: 5000, months: 12 },
    { name: 'Bono Semestral', extraAmount: 2500, months: 6 },
    { name: 'Ahorro Intensivo', extraAmount: 10000, months: 24 }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!simulationForm.extraAmount || simulationForm.extraAmount <= 0) {
      newErrors.extraAmount = 'El monto extra debe ser mayor a 0';
    }

    if (simulationForm.extraAmount > currentCapital * 10) {
      newErrors.extraAmount = 'El monto parece demasiado optimista';
    }

    if (!simulationForm.months || simulationForm.months <= 0) {
      newErrors.months = 'Los meses deben ser mayor a 0';
    }

    if (simulationForm.months > 240) { // Max 20 años
      newErrors.months = 'Período muy largo (máx. 240 meses)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSimulate(goalId, simulationForm);
    } catch (error) {
      // Error será manejado por el hook
    }
  };

  const handleMultipleSimulate = async () => {
    try {
      await onSimulateMultiple(goalId, customScenarios);
    } catch (error) {
      // Error será manejado por el hook
    }
  };

  const updateScenario = (index: number, field: string, value: any) => {
    const updated = [...customScenarios];
    updated[index] = { ...updated[index], [field]: value };
    setCustomScenarios(updated);
  };

  const addScenario = () => {
    setCustomScenarios([...customScenarios, {
      name: 'Nuevo Escenario',
      extraAmount: 1000,
      months: 12
    }]);
  };

  const removeScenario = (index: number) => {
    setCustomScenarios(customScenarios.filter((_: {name: string, extraAmount: number, months: number}, i: number) => i !== index));
  };

  const getImpactColor = (timeSaved: number): string => {
    if (timeSaved > 12) return 'text-green-600 bg-green-100';
    if (timeSaved > 6) return 'text-yellow-600 bg-yellow-100';
    if (timeSaved > 0) return 'text-blue-600 bg-blue-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getImpactIcon = (timeSaved: number): string => {
    if (timeSaved > 12) return '🚀';
    if (timeSaved > 6) return '⚡';
    if (timeSaved > 0) return '📈';
    return '➡️';
  };

  return (
    <div className="space-y-6">
      {/* Simulador individual */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🧮 Simulador de Aportes Extra</h3>
            <p className="text-gray-600 text-sm">Calcula el impacto de aportes extraordinarios en tu objetivo</p>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="extraAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Monto Extra ({currency})
              </label>
              <Input
                id="extraAmount"
                type="number"
                value={simulationForm.extraAmount || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSimulationForm((prev: SimulationRequest) => ({
                  ...prev,
                  extraAmount: parseFloat(e.target.value) || 0
                }))}
                placeholder="5000"
                className={errors.extraAmount ? 'border-red-300' : ''}
              />
              {errors.extraAmount && (
                <p className="text-red-600 text-sm mt-1">{errors.extraAmount}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Cantidad adicional a invertir
              </p>
            </div>

            <div>
              <label htmlFor="months" className="block text-sm font-medium text-gray-700 mb-2">
                Duración (meses)
              </label>
              <Input
                id="months"
                type="number"
                value={simulationForm.months || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSimulationForm((prev: SimulationRequest) => ({
                  ...prev,
                  months: parseInt(e.target.value) || 12
                }))}
                placeholder="12"
                className={errors.months ? 'border-red-300' : ''}
              />
              {errors.months && (
                <p className="text-red-600 text-sm mt-1">{errors.months}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Período de tiempo para el aporte extra
              </p>
            </div>
          </div>

          {/* Vista previa del aporte mensual equivalente */}
          {simulationForm.extraAmount && simulationForm.months && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-800 text-sm font-medium mb-2">📊 Vista Previa</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                <div>
                  <span className="block text-blue-600">Aporte mensual equivalente:</span>
                  <span className="font-semibold">
                    {goalService.formatCurrency(simulationForm.extraAmount / simulationForm.months, currency)}/mes
                  </span>
                </div>
                <div>
                  <span className="block text-blue-600">Total a invertir:</span>
                  <span className="font-semibold">
                    {goalService.formatCurrency(simulationForm.extraAmount, currency)}
                  </span>
                </div>
                <div>
                  <span className="block text-blue-600">Duración:</span>
                  <span className="font-semibold">
                    {goalService.formatMonths(simulationForm.months)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Simulando...</span>
                </>
              ) : (
                '🧮 Simular Aporte'
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Simulador de múltiples escenarios */}
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🎯 Escenarios Múltiples</h3>
            <p className="text-gray-600 text-sm">Compara diferentes estrategias de aportes extraordinarios</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={addScenario} variant="outline" size="sm">
              ➕ Agregar Escenario
            </Button>
            <Button 
              onClick={handleMultipleSimulate}
              disabled={loading || customScenarios.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Simulando...' : '🚀 Simular Todos'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {customScenarios.map((scenario: {name: string, extraAmount: number, months: number}, index: number) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Escenario
                  </label>
                  <Input
                    value={scenario.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateScenario(index, 'name', e.target.value)}
                    placeholder="Nombre del escenario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto ({currency})
                  </label>
                  <Input
                    type="number"
                    value={scenario.extraAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateScenario(index, 'extraAmount', parseFloat(e.target.value) || 0)}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meses
                  </label>
                  <Input
                    type="number"
                    value={scenario.months}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateScenario(index, 'months', parseInt(e.target.value) || 12)}
                    placeholder="12"
                  />
                </div>
                <div>
                  <Button
                    onClick={() => removeScenario(index)}
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    🗑️ Eliminar
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Aporte mensual equivalente: {goalService.formatCurrency(scenario.extraAmount / scenario.months, currency)}/mes
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Resultados de simulaciones */}
      {error && (
        <Card className="p-6 bg-white border-red-200">
          <div className="text-red-600 font-medium mb-2">Error en simulación</div>
          <p className="text-red-500 text-sm">{error}</p>
        </Card>
      )}

      {simulations && simulations.length > 0 && (
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">📊 Resultados de Simulaciones</h3>
          
          <div className="space-y-4">
            {simulations.slice(0, 10).map((simulation) => (
              <div key={simulation.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{simulation.scenario_name}</h4>
                    <div className="text-sm text-gray-600">
                      {new Date(simulation.simulation_date).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getImpactColor(simulation.time_saved_months)} variant="default">
                      {getImpactIcon(simulation.time_saved_months)}
                      {simulation.time_saved_months > 0
                        ? `${simulation.time_saved_months.toFixed(1)} meses ahorrados`
                        : 'Sin impacto significativo'
                      }
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Aporte Extra:</div>
                    <div className="font-semibold">
                      {goalService.formatCurrency(simulation.extra_contribution, currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Duración:</div>
                    <div className="font-semibold">
                      {goalService.formatMonths(simulation.impact_months)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Nueva Fecha:</div>
                    <div className="font-semibold">
                      {simulation.new_completion_date 
                        ? new Date(simulation.new_completion_date).toLocaleDateString('es-ES')
                        : 'No disponible'
                      }
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Evaluación:</div>
                    <div className="font-semibold">
                      {simulation.simulation_details?.risk_assessment || 'N/A'}
                    </div>
                  </div>
                </div>

                {simulation.simulation_details && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 grid grid-cols-2 gap-4">
                    <div>
                      Tiempo original: {simulation.simulation_details.original_months} meses
                    </div>
                    <div>
                      Tiempo nuevo: {simulation.simulation_details.new_months} meses
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {simulations.length > 10 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Mostrando las últimas 10 simulaciones de {simulations.length} total
            </div>
          )}
        </Card>
      )}

      {/* Recomendaciones */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Recomendaciones para Aportes Extra</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-green-800 mb-2">✅ Estrategias Efectivas:</h4>
            <ul className="space-y-1 text-green-700">
              <li>• Aportes regulares cada 6 meses (aguinaldo, bono)</li>
              <li>• Incrementar aportes en períodos de ingresos altos</li>
              <li>• Aprovechar deducciones fiscales si aplican</li>
              <li>• Reinvertir dividendos automáticamente</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-800 mb-2">⚠️ Consideraciones:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Mantener fondo de emergencia intacto</li>
              <li>• No comprometer liquidez necesaria</li>
              <li>• Considerar timing del mercado</li>
              <li>• Diversificar fuentes de aportes extras</li>
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-green-200 text-xs text-green-600">
          <strong>Tip:</strong> Los aportes extras son más efectivos al principio del período de inversión 
          debido al efecto del interés compuesto. Considera hacer aportes grandes temprano si tienes la capacidad.
        </div>
      </Card>
    </div>
  );
}