import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Play, 
  Plus, 
  Settings, 
  BarChart3, 
  TrendingUp, 
  Target,
  Brain,
  Shuffle,
  Download,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useScenarioAnalysis } from '../hooks/useScenarioAnalysis';

interface Scenario {
  id: number;
  name: string;
  description: string;
  category: 'MACRO' | 'MARKET' | 'SECTOR' | 'CUSTOM';
  is_active: boolean;
  is_predefined: boolean;
  created_by: string;
  created_at: string;
  variables_count: number;
  last_simulation?: string;
  simulation_count: number;
  average_return?: number;
  average_confidence?: number;
}

interface WhatIfResult {
  scenarioId: number;
  scenarioName: string;
  portfolioImpact: {
    currentValue: number;
    projectedValue: number;
    totalReturn: number;
    totalReturnPercentage: number;
  };
  riskMetrics: {
    maxDrawdown: number;
    volatility: number;
    probabilityOfLoss: number;
  };
  confidence: number;
  keyFindings: string[];
}

interface Recommendations {
  scenarioId: number;
  scenarioName: string;
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'POOR' | 'DANGEROUS';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  strategicRecommendations: Array<{
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
  claudeInsights: {
    strategicAssessment: string;
    topPriorities: string[];
    opportunityHighlights: string[];
  };
}

const Scenarios: React.FC = () => {
  return <ScenariosPage />
}

/* eslint-disable max-lines-per-function, no-console */
const ScenariosPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'analysis' | 'recommendations' | 'templates'>('scenarios');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [analysisResult, setAnalysisResult] = useState<WhatIfResult | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [_showCreateScenario, setShowCreateScenario] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const {
    scenarios: _scenarios,
    templates: _templates,
    isLoading: _scenariosLoading,
    createScenario: _createScenario,
    runWhatIfAnalysis: _runWhatIfAnalysis,
    generateRecommendations: _generateRecommendations
  } = useScenarioAnalysis();

  // Sample data for demonstration
  const sampleScenarios: Scenario[] = [
    {
      id: 1,
      name: 'Crisis Argentina 2024',
      description: 'Escenario de crisis económica con alta inflación y devaluación',
      category: 'MACRO',
      is_active: true,
      is_predefined: true,
      created_by: 'system',
      created_at: '2024-01-15T10:00:00Z',
      variables_count: 4,
      last_simulation: '2024-01-20T15:30:00Z',
      simulation_count: 8,
      average_return: -12.5,
      average_confidence: 0.78
    },
    {
      id: 2,
      name: 'Tech Correction 2024',
      description: 'Corrección del sector tecnológico del 25-30%',
      category: 'SECTOR',
      is_active: true,
      is_predefined: true,
      created_by: 'system',
      created_at: '2024-01-10T08:00:00Z',
      variables_count: 3,
      last_simulation: '2024-01-18T12:00:00Z',
      simulation_count: 5,
      average_return: -8.2,
      average_confidence: 0.82
    },
    {
      id: 3,
      name: 'Recovery Scenario',
      description: 'Escenario de recuperación económica post-crisis',
      category: 'MARKET',
      is_active: true,
      is_predefined: false,
      created_by: 'user',
      created_at: '2024-01-12T14:00:00Z',
      variables_count: 5,
      simulation_count: 3,
      average_return: 18.7,
      average_confidence: 0.65
    }
  ];

  const handleRunAnalysis = async (scenario: Scenario) => {
    if (!scenario) return;
    
    setAnalysisLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResult: WhatIfResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        portfolioImpact: {
          currentValue: 50000,
          projectedValue: scenario.average_return ? 50000 * (1 + scenario.average_return / 100) : 48000,
          totalReturn: scenario.average_return ? 50000 * (scenario.average_return / 100) : -2000,
          totalReturnPercentage: scenario.average_return || -4.0
        },
        riskMetrics: {
          maxDrawdown: Math.abs((scenario.average_return || -4) * 1.2),
          volatility: 18.5,
          probabilityOfLoss: scenario.average_return && scenario.average_return > 0 ? 25 : 65
        },
        confidence: scenario.average_confidence || 0.75,
        keyFindings: [
          `Portfolio return: ${(scenario.average_return || -4).toFixed(1)}%`,
          `Maximum drawdown: ${Math.abs((scenario.average_return || -4) * 1.2).toFixed(1)}%`,
          'High correlation with USD movements',
          'ESG screening maintains quality',
          'Liquidity risk manageable'
        ]
      };
      
      setAnalysisResult(mockResult);
      setActiveTab('analysis');
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!analysisResult) return;
    
    setRecommendationsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const mockRecommendations: Recommendations = {
        scenarioId: analysisResult.scenarioId,
        scenarioName: analysisResult.scenarioName,
        overallRating: analysisResult.portfolioImpact.totalReturnPercentage > 10 ? 'GOOD' : 
                       analysisResult.portfolioImpact.totalReturnPercentage > 0 ? 'NEUTRAL' : 'POOR',
        riskLevel: analysisResult.riskMetrics.maxDrawdown > 20 ? 'HIGH' : 
                  analysisResult.riskMetrics.maxDrawdown > 10 ? 'MEDIUM' : 'LOW',
        strategicRecommendations: [
          {
            title: 'Defensive Positioning',
            description: 'Reduce portfolio risk through defensive allocation',
            priority: 'HIGH'
          },
          {
            title: 'Currency Hedging',
            description: 'Implement peso-dollar hedging strategies',
            priority: 'HIGH'
          },
          {
            title: 'Diversification Enhancement',
            description: 'Broaden sector and geographic exposure',
            priority: 'MEDIUM'
          }
        ],
        claudeInsights: {
          strategicAssessment: `Scenario ${analysisResult.scenarioName} suggests challenging market conditions requiring defensive positioning and active risk management.`,
          topPriorities: [
            'Implement defensive measures immediately',
            'Monitor currency movements closely',
            'Maintain adequate liquidity buffer',
            'Review position sizing limits',
            'Prepare contingency plans'
          ],
          opportunityHighlights: [
            'Value opportunities in market dislocation',
            'ESG positioning advantage',
            'CEDEAR currency hedging benefits',
            'Sector rotation possibilities'
          ]
        }
      };
      
      setRecommendations(mockRecommendations);
      setActiveTab('recommendations');
    } catch (error) {
      console.error('Recommendations failed:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MACRO': return 'bg-red-100 text-red-800';
      case 'MARKET': return 'bg-blue-100 text-blue-800';
      case 'SECTOR': return 'bg-green-100 text-green-800';
      case 'CUSTOM': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'NEUTRAL': return 'text-yellow-600';
      case 'POOR': return 'text-orange-600';
      case 'DANGEROUS': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Simulador de Escenarios</h1>
          <p className="text-gray-600 mt-1">
            Análisis what-if con Claude AI y recomendaciones estratégicas
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowCreateScenario(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Escenario
          </Button>
          <Button>
            <Shuffle className="w-4 h-4 mr-2" />
            Comparar Escenarios
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[
            { key: 'scenarios', label: 'Escenarios', icon: BarChart3 },
            { key: 'analysis', label: 'Análisis What-If', icon: TrendingUp },
            { key: 'recommendations', label: 'Recomendaciones', icon: Brain },
            { key: 'templates', label: 'Plantillas', icon: Settings }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Scenarios Tab */}
        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar escenarios..."
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="">Todas las categorías</option>
                  <option value="MACRO">Macro</option>
                  <option value="MARKET">Mercado</option>
                  <option value="SECTOR">Sector</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
                <Button variant="outline">
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {sampleScenarios.map((scenario) => (
                <Card key={scenario.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{scenario.name}</h3>
                        <Badge className={getCategoryColor(scenario.category)}>
                          {scenario.category}
                        </Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{scenario.description}</p>
                    </div>
                    {scenario.is_active ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Scenario Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-gray-500">Variables</div>
                      <div className="font-semibold">{scenario.variables_count}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Simulaciones</div>
                      <div className="font-semibold">{scenario.simulation_count}</div>
                    </div>
                    {scenario.average_return !== undefined && (
                      <div>
                        <div className="text-gray-500">Retorno Promedio</div>
                        <div className={`font-semibold ${scenario.average_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {scenario.average_return > 0 ? '+' : ''}{scenario.average_return.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {scenario.average_confidence && (
                      <div>
                        <div className="text-gray-500">Confianza</div>
                        <div className="font-semibold">{(scenario.average_confidence * 100).toFixed(0)}%</div>
                      </div>
                    )}
                  </div>

                  {/* Last Simulation */}
                  {scenario.last_simulation && (
                    <div className="text-xs text-gray-500 mb-4 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Última simulación: {new Date(scenario.last_simulation).toLocaleDateString()}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedScenario(scenario);
                        handleRunAnalysis(scenario);
                      }}
                      disabled={analysisLoading}
                    >
                      {analysisLoading && selectedScenario?.id === scenario.id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Ejecutar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {analysisResult ? (
              <>
                {/* Analysis Header */}
                <Card className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Análisis What-If: {analysisResult.scenarioName}
                      </h2>
                      <p className="text-gray-600">
                        Análisis completo con proyecciones de impacto y métricas de riesgo
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Nivel de Confianza</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {(analysisResult.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Portfolio Impact */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Impacto en Portfolio</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Valor Actual</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${analysisResult.portfolioImpact.currentValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Valor Proyectado</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${analysisResult.portfolioImpact.projectedValue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Retorno Total</div>
                      <div className={`text-2xl font-bold ${analysisResult.portfolioImpact.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analysisResult.portfolioImpact.totalReturn >= 0 ? '+' : ''}${analysisResult.portfolioImpact.totalReturn.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Retorno %</div>
                      <div className={`text-2xl font-bold ${analysisResult.portfolioImpact.totalReturnPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analysisResult.portfolioImpact.totalReturnPercentage >= 0 ? '+' : ''}{analysisResult.portfolioImpact.totalReturnPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Risk Metrics */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Riesgo</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Máximo Drawdown</div>
                      <div className="text-xl font-bold text-red-600">
                        {analysisResult.riskMetrics.maxDrawdown.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Volatilidad</div>
                      <div className="text-xl font-bold text-yellow-600">
                        {analysisResult.riskMetrics.volatility.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Probabilidad de Pérdida</div>
                      <div className="text-xl font-bold text-orange-600">
                        {analysisResult.riskMetrics.probabilityOfLoss.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Key Findings */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Hallazgos Clave</h3>
                  <div className="space-y-2">
                    {analysisResult.keyFindings.map((finding, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{finding}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Action Button */}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleGenerateRecommendations}
                    disabled={recommendationsLoading}
                  >
                    {recommendationsLoading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-5 h-5 mr-2" />
                    )}
                    Generar Recomendaciones con Claude
                  </Button>
                </div>
              </>
            ) : (
              <Card className="p-12 text-center">
                <TrendingUp className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay análisis disponible</h3>
                <p className="text-gray-600 mb-6">
                  Selecciona un escenario y ejecuta el análisis what-if para ver los resultados aquí.
                </p>
                <Button onClick={() => setActiveTab('scenarios')}>
                  Ir a Escenarios
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {recommendations ? (
              <>
                {/* Recommendations Header */}
                <Card className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Recomendaciones: {recommendations.scenarioName}
                      </h2>
                      <p className="text-gray-600">
                        Recomendaciones estratégicas generadas por Claude AI
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Calificación General</div>
                      <div className={`text-2xl font-bold ${getRatingColor(recommendations.overallRating)}`}>
                        {recommendations.overallRating}
                      </div>
                      <Badge className={`mt-1 ${getRiskLevelColor(recommendations.riskLevel)}`}>
                        Riesgo {recommendations.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Strategic Assessment */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-blue-600" />
                    Evaluación Estratégica de Claude
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {recommendations.claudeInsights.strategicAssessment}
                  </p>
                </Card>

                {/* Top Priorities */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-red-600" />
                    Prioridades Principales
                  </h3>
                  <div className="space-y-3">
                    {recommendations.claudeInsights.topPriorities.map((priority, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{priority}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Strategic Recommendations */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recomendaciones Estratégicas</h3>
                  <div className="space-y-4">
                    {recommendations.strategicRecommendations.map((rec, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                          <Badge 
                            className={
                              rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                              rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Opportunities */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    Oportunidades Destacadas
                  </h3>
                  <div className="space-y-2">
                    {recommendations.claudeInsights.opportunityHighlights.map((opportunity, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-gray-700">{opportunity}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Reporte
                  </Button>
                  <Button>
                    Implementar Recomendaciones
                  </Button>
                </div>
              </>
            ) : (
              <Card className="p-12 text-center">
                <Brain className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay recomendaciones disponibles</h3>
                <p className="text-gray-600 mb-6">
                  Ejecuta primero un análisis what-if para generar recomendaciones personalizadas con Claude AI.
                </p>
                <Button onClick={() => setActiveTab('analysis')}>
                  Ir a Análisis
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <Card className="p-12 text-center">
            <Settings className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Plantillas de Escenarios</h3>
            <p className="text-gray-600 mb-6">
              Las plantillas predefinidas estarán disponibles próximamente.
            </p>
            <Button variant="outline">
              Ver Plantillas Disponibles
            </Button>
          </Card>
        )}
      </div>

      {/* Loading Overlay */}
      {(analysisLoading || recommendationsLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 max-w-md text-center">
            <RefreshCw className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {analysisLoading ? 'Ejecutando Análisis What-If...' : 'Generando Recomendaciones...'}
            </h3>
            <p className="text-gray-600">
              {analysisLoading ? 
                'Claude está analizando el escenario y calculando impactos en tu portfolio.' :
                'Claude está generando recomendaciones estratégicas personalizadas.'
              }
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Esto puede tomar unos momentos...
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Scenarios;