import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GoalCalculationResult } from '../../services/goalService';
import { goalService } from '../../services/goalService';

interface GoalCalculatorProps {
  calculation: GoalCalculationResult | null;
  loading: boolean;
  error: string | null;
  onRecalculate: () => void;
}

export function GoalCalculator({ calculation, loading, error, onRecalculate }: GoalCalculatorProps) {
  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Calculando tiempo para alcanzar meta...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-white border-red-200">
        <div className="text-center py-8">
          <div className="text-red-600 text-lg font-medium mb-2">Error en Cálculos</div>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={onRecalculate} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
            Reintentar Cálculo
          </Button>
        </div>
      </Card>
    );
  }

  if (!calculation) {
    return (
      <Card className="p-6 bg-white border-gray-200">
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg font-medium mb-2">Sin Cálculos</div>
          <p className="text-gray-400 mb-4">Presiona el botón para calcular el tiempo necesario</p>
          <Button onClick={onRecalculate} className="bg-blue-600 hover:bg-blue-700">
            🧮 Calcular Tiempo a Meta
          </Button>
        </div>
      </Card>
    );
  }

  const getProbabilityColor = (probability: number): string => {
    if (probability >= 80) return 'text-green-600 bg-green-100';
    if (probability >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProbabilityIcon = (probability: number): string => {
    if (probability >= 80) return '🟢';
    if (probability >= 60) return '🟡';
    return '🔴';
  };

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">⏱️ Calculadora de Tiempo</h3>
          <p className="text-gray-600 text-sm">Proyecciones basadas en parámetros actuales</p>
        </div>
        <Button 
          onClick={onRecalculate} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          🔄 Recalcular
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Tiempo para alcanzar meta */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 text-sm font-medium mb-1">Tiempo Estimado</div>
          <div className="text-blue-900 text-2xl font-bold">
            {goalService.formatMonths(calculation.timeToGoalMonths)}
          </div>
          <div className="text-blue-600 text-xs mt-1">
            {calculation.timeToGoalYears.toFixed(1)} años
          </div>
        </div>

        {/* Inversión total necesaria */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-purple-800 text-sm font-medium mb-1">Inversión Total</div>
          <div className="text-purple-900 text-2xl font-bold">
            {goalService.formatCurrency(calculation.totalInvestmentNeeded)}
          </div>
          <div className="text-purple-600 text-xs mt-1">
            Aportes necesarios
          </div>
        </div>

        {/* Aporte mensual requerido */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 text-sm font-medium mb-1">Aporte Mensual</div>
          <div className="text-green-900 text-2xl font-bold">
            {goalService.formatCurrency(calculation.monthlyInvestmentNeeded)}
          </div>
          <div className="text-green-600 text-xs mt-1">
            Para alcanzar meta
          </div>
        </div>

        {/* Probabilidad de éxito */}
        <div className={`border rounded-lg p-4 ${getProbabilityColor(calculation.probabilityOfSuccess)}`}>
          <div className="text-sm font-medium mb-1 opacity-80">Probabilidad de Éxito</div>
          <div className="text-2xl font-bold flex items-center">
            <span className="mr-2">{getProbabilityIcon(calculation.probabilityOfSuccess)}</span>
            {calculation.probabilityOfSuccess.toFixed(0)}%
          </div>
          <div className="text-xs mt-1 opacity-75">
            Basado en histórico
          </div>
        </div>
      </div>

      {/* Detalles adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumen del objetivo */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">📊 Resumen del Objetivo</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monto Final Proyectado:</span>
              <span className="font-medium text-gray-900">
                {goalService.formatCurrency(calculation.projectedFinalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tiempo en Meses:</span>
              <span className="font-medium text-gray-900">
                {Math.ceil(calculation.timeToGoalMonths)} meses
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tiempo en Años:</span>
              <span className="font-medium text-gray-900">
                {calculation.timeToGoalYears.toFixed(1)} años
              </span>
            </div>
          </div>
        </div>

        {/* Análisis de factibilidad */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-800 mb-3">🎯 Análisis de Factibilidad</h4>
          <div className="space-y-2 text-sm text-orange-700">
            {calculation.probabilityOfSuccess >= 80 && (
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Alta probabilidad de éxito. Objetivo realista.</span>
              </div>
            )}
            
            {calculation.probabilityOfSuccess >= 60 && calculation.probabilityOfSuccess < 80 && (
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <span>Probabilidad moderada. Considera ajustar parámetros.</span>
              </div>
            )}
            
            {calculation.probabilityOfSuccess < 60 && (
              <div className="flex items-center">
                <span className="text-red-600 mr-2">🚨</span>
                <span>Baja probabilidad. Revisa expectativas de retorno.</span>
              </div>
            )}

            {calculation.timeToGoalYears > 20 && (
              <div className="flex items-center">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <span>Objetivo a muy largo plazo. Considera metas intermedias.</span>
              </div>
            )}

            {calculation.monthlyInvestmentNeeded > 2000 && (
              <div className="flex items-center">
                <span className="text-purple-600 mr-2">💰</span>
                <span>Aporte mensual considerable. Verifica capacidad.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-3">💡 Recomendaciones</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <div className="font-medium mb-1">Para acelerar el objetivo:</div>
            <ul className="space-y-1 text-xs">
              <li>• Incrementar aportes mensuales</li>
              <li>• Buscar mayores retornos (con cuidado)</li>
              <li>• Hacer aportes extraordinarios</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1">Para mayor seguridad:</div>
            <ul className="space-y-1 text-xs">
              <li>• Usar expectativas conservadoras</li>
              <li>• Diversificar inversiones</li>
              <li>• Crear un fondo de emergencia</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Nota importante */}
      <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-4">
        <strong>Importante:</strong> Estos cálculos son proyecciones basadas en supuestos. 
        Los resultados reales pueden variar debido a la volatilidad del mercado, cambios económicos y otros factores.
        Considera estas cifras como orientativas y revisa regularmente tu estrategia.
      </div>
    </Card>
  );
}