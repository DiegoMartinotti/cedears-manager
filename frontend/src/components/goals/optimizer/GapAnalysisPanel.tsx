/**
 * Panel de Análisis de Gap - Optimizador de Objetivos
 * Paso 28.1: Análisis de gap entre actual y objetivo
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { Alert } from '../../ui/Alert';

interface GapAnalysis {
  id: number;
  goal_id: number;
  analysis_date: string;
  current_capital: number;
  target_capital: number;
  gap_amount: number;
  gap_percentage: number;
  current_monthly_contribution: number;
  required_monthly_contribution: number;
  contribution_gap: number;
  months_remaining: number | null;
  projected_completion_date: string | null;
  deviation_from_plan: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  analysis_details: {
    current_monthly_performance: number;
    required_monthly_performance: number;
    performance_gap: number;
    success_probability: number;
    recommendations: string[];
  } | null;
}

interface GapAnalysisPanelProps {
  goalId: number;
  onAnalysisComplete?: (analysis: GapAnalysis) => void;
}

export const GapAnalysisPanel: React.FC<GapAnalysisPanelProps> = ({
  goalId,
  onAnalysisComplete
}) => {
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cargar análisis existente al montar el componente
  useEffect(() => {
    loadExistingAnalysis();
  }, [loadExistingAnalysis]);

  const loadExistingAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // En una implementación real, cargarías el análisis más reciente
      // Para este ejemplo, simulamos datos
      const mockAnalysis: GapAnalysis = {
        id: 1,
        goal_id: goalId,
        analysis_date: new Date().toISOString().split('T')[0],
        current_capital: 27500,
        target_capital: 100000,
        gap_amount: 72500,
        gap_percentage: 72.5,
        current_monthly_contribution: 800,
        required_monthly_contribution: 1450,
        contribution_gap: 650,
        months_remaining: 48,
        projected_completion_date: '2028-12-31',
        deviation_from_plan: -8.2,
        risk_level: 'MEDIUM',
        analysis_details: {
          current_monthly_performance: 1.2,
          required_monthly_performance: 2.1,
          performance_gap: 0.9,
          success_probability: 78,
          recommendations: [
            'Aumentar aporte mensual en $650',
            'Considerar aportes extraordinarios en bonificaciones',
            'Evaluar estrategias de mayor rentabilidad'
          ]
        }
      };
      
      setGapAnalysis(mockAnalysis);
    } catch (err) {
      console.error('Error loading gap analysis:', err);
      setError('Error al cargar el análisis de gap');
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  const performNewAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Simular llamada a API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // En una implementación real:
      // const response = await fetch(`/api/goal-optimizer/${goalId}/analyze-gap`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({})
      // });
      // const result = await response.json();
      
      await loadExistingAnalysis();
      
      if (onAnalysisComplete && gapAnalysis) {
        onAnalysisComplete(gapAnalysis);
      }
    } catch (err) {
      console.error('Error performing gap analysis:', err);
      setError('Error al realizar el análisis de gap');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelText = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'Bajo Riesgo';
      case 'MEDIUM': return 'Riesgo Moderado';
      case 'HIGH': return 'Alto Riesgo';
      default: return 'Sin Evaluar';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <LoadingSpinner size="small" />
          <span>Cargando análisis de gap...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert type="error" title="Error">
          {error}
        </Alert>
        <Button 
          onClick={performNewAnalysis}
          className="mt-4"
        >
          Reintentar Análisis
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Análisis de Gap del Objetivo
          </h3>
          {gapAnalysis && (
            <p className="text-sm text-gray-500">
              Última actualización: {new Date(gapAnalysis.analysis_date).toLocaleDateString('es-AR')}
            </p>
          )}
        </div>
        <Button
          onClick={performNewAnalysis}
          disabled={isAnalyzing}
          className="flex items-center space-x-2"
        >
          {isAnalyzing && <LoadingSpinner size="small" />}
          <span>{isAnalyzing ? 'Analizando...' : 'Actualizar Análisis'}</span>
        </Button>
      </div>

      {gapAnalysis ? (
        <div className="space-y-6">
          {/* Métricas principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-600">Capital Actual</div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(gapAnalysis.current_capital)}
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-purple-600">Objetivo</div>
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(gapAnalysis.target_capital)}
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-orange-600">Gap Restante</div>
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(gapAnalysis.gap_amount)}
              </div>
              <div className="text-sm text-orange-700">
                {gapAnalysis.gap_percentage.toFixed(1)}% del objetivo
              </div>
            </div>
          </div>

          {/* Estado del objetivo */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Estado Actual</h4>
              <Badge className={getRiskLevelColor(gapAnalysis.risk_level)}>
                {getRiskLevelText(gapAnalysis.risk_level)}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Aporte Actual</div>
                <div className="font-medium">{formatCurrency(gapAnalysis.current_monthly_contribution)}/mes</div>
              </div>
              
              <div>
                <div className="text-gray-500">Aporte Requerido</div>
                <div className="font-medium">{formatCurrency(gapAnalysis.required_monthly_contribution)}/mes</div>
              </div>
              
              <div>
                <div className="text-gray-500">Gap de Aporte</div>
                <div className="font-medium text-red-600">
                  {formatCurrency(gapAnalysis.contribution_gap)}/mes
                </div>
              </div>
              
              <div>
                <div className="text-gray-500">Tiempo Restante</div>
                <div className="font-medium">
                  {gapAnalysis.months_remaining ? `${gapAnalysis.months_remaining} meses` : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Performance y proyección */}
          {gapAnalysis.analysis_details && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Performance</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rendimiento Actual:</span>
                    <span className="font-medium">
                      {gapAnalysis.analysis_details.current_monthly_performance.toFixed(2)}%/mes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rendimiento Requerido:</span>
                    <span className="font-medium">
                      {gapAnalysis.analysis_details.required_monthly_performance.toFixed(2)}%/mes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gap de Performance:</span>
                    <span className={`font-medium ${gapAnalysis.analysis_details.performance_gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercentage(gapAnalysis.analysis_details.performance_gap)}/mes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desviación del Plan:</span>
                    <span className={`font-medium ${gapAnalysis.deviation_from_plan >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(gapAnalysis.deviation_from_plan)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Proyección</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Probabilidad de Éxito:</span>
                    <span className={`font-medium ${
                      gapAnalysis.analysis_details.success_probability >= 80 ? 'text-green-600' :
                      gapAnalysis.analysis_details.success_probability >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {gapAnalysis.analysis_details.success_probability}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha Proyectada:</span>
                    <span className="font-medium">
                      {gapAnalysis.projected_completion_date ? 
                        new Date(gapAnalysis.projected_completion_date).toLocaleDateString('es-AR') : 
                        'No determinada'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {gapAnalysis.analysis_details?.recommendations && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-3">Recomendaciones</h5>
              <ul className="space-y-2">
                {gapAnalysis.analysis_details.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-blue-800">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Barra de progreso visual */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progreso del Objetivo</span>
              <span className="text-sm text-gray-500">
                {(100 - gapAnalysis.gap_percentage).toFixed(1)}% completado
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100 - gapAnalysis.gap_percentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{formatCurrency(gapAnalysis.current_capital)}</span>
              <span>{formatCurrency(gapAnalysis.target_capital)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-4">
            No se ha realizado un análisis de gap para este objetivo.
          </div>
          <Button onClick={performNewAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? 'Analizando...' : 'Realizar Análisis de Gap'}
          </Button>
        </div>
      )}
    </Card>
  );
};