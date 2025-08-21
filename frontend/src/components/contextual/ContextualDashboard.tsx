import React from 'react'
import { TrendingUp, TrendingDown, AlertTriangle, Target, Brain, Clock } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ContextualDashboardProps {
  symbol: string
  analysisData: any
  isLoading: boolean
}

export function ContextualDashboard({ symbol, analysisData, isLoading }: ContextualDashboardProps) {
  if (isLoading && !analysisData) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size={32} />
        <span className="ml-3 text-gray-600">Analizando {symbol}...</span>
      </div>
    )
  }

  if (!analysisData) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Selecciona un símbolo para analizar
        </h3>
        <p className="text-gray-600">
          Usa el buscador arriba para obtener un análisis completo con IA
        </p>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score > 40) return 'text-green-600'
    if (score > 10) return 'text-green-500'
    if (score > -10) return 'text-yellow-600'
    if (score > -40) return 'text-red-500'
    return 'text-red-600'
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
      case 'BUY':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'STRONG_SELL':
      case 'SELL':
        return <TrendingDown className="w-5 h-5 text-red-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    }
  }

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'LOW':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Recommendation Summary */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getRecommendationIcon(analysisData.overallAssessment.recommendation)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Recomendación Principal
              </h3>
              <p className="text-sm text-gray-600">
                {analysisData.overallAssessment.reasoning}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(analysisData.overallAssessment.score)}`}>
              {analysisData.overallAssessment.score > 0 ? '+' : ''}{analysisData.overallAssessment.score}
            </div>
            <div className="text-sm text-gray-500">Score General</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-sm text-gray-500">Noticias</div>
            <div className={`font-medium ${analysisData.components.news ? 
              analysisData.components.news.sentiment > 0 ? 'text-green-600' : 
              analysisData.components.news.sentiment < 0 ? 'text-red-600' : 'text-gray-600'
              : 'text-gray-400'}`}>
              {analysisData.components.news ? 
                `${analysisData.components.news.sentiment > 0 ? '+' : ''}${analysisData.components.news.sentiment}` 
                : 'N/A'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Sentiment</div>
            <div className={`font-medium ${analysisData.components.marketSentiment ? 
              analysisData.components.marketSentiment.sentimentScore > 0 ? 'text-green-600' : 
              analysisData.components.marketSentiment.sentimentScore < 0 ? 'text-red-600' : 'text-gray-600'
              : 'text-gray-400'}`}>
              {analysisData.components.marketSentiment ? 
                analysisData.components.marketSentiment.overallSentiment 
                : 'N/A'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Earnings</div>
            <div className={`font-medium ${analysisData.components.earnings ? 
              ['STRONG_BEAT', 'BEAT'].includes(analysisData.components.earnings.lastReport.assessment) ? 'text-green-600' :
              ['STRONG_MISS', 'MISS'].includes(analysisData.components.earnings.lastReport.assessment) ? 'text-red-600' : 'text-yellow-600'
              : 'text-gray-400'}`}>
              {analysisData.components.earnings ? 
                analysisData.components.earnings.lastReport.assessment.replace('_', ' ')
                : 'N/A'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-500">Tendencia</div>
            <div className={`font-medium ${analysisData.components.trends ? 
              analysisData.components.trends.shortTerm.direction === 'BULLISH' ? 'text-green-600' :
              analysisData.components.trends.shortTerm.direction === 'BEARISH' ? 'text-red-600' : 'text-gray-600'
              : 'text-gray-400'}`}>
              {analysisData.components.trends ? 
                analysisData.components.trends.shortTerm.direction
                : 'N/A'}
            </div>
          </div>
        </div>
      </Card>

      {/* Claude Insights */}
      {analysisData.claudeInsights && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Insights de IA</h3>
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              {analysisData.claudeInsights.confidence}% confianza
            </Badge>
          </div>
          
          <p className="text-gray-700 mb-4">
            {analysisData.claudeInsights.summary}
          </p>
          
          {analysisData.claudeInsights.keyPoints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Puntos Clave:</h4>
              <ul className="space-y-1">
                {analysisData.claudeInsights.keyPoints.map((point: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="text-sm text-gray-600 pt-2 border-t border-gray-200">
            <strong>Contexto de Mercado:</strong> {analysisData.claudeInsights.marketContext}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risks */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Riesgos Identificados</h3>
          </div>
          
          {analysisData.risks.length > 0 ? (
            <div className="space-y-3">
              {analysisData.risks.slice(0, 5).map((risk: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{risk.risk}</h4>
                    <Badge className={getRiskColor(risk.severity)}>
                      {risk.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {risk.timeframe}
                    </span>
                  </div>
                  {risk.mitigation && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      Mitigación: {risk.mitigation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No se identificaron riesgos significativos</p>
          )}
        </Card>

        {/* Opportunities */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Oportunidades</h3>
          </div>
          
          {analysisData.opportunities.length > 0 ? (
            <div className="space-y-3">
              {analysisData.opportunities.slice(0, 5).map((opportunity: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm">{opportunity.opportunity}</h4>
                    <Badge className={getRiskColor(opportunity.potential)}>
                      {opportunity.potential}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {opportunity.timeframe}
                    </span>
                  </div>
                  {opportunity.requirements && (
                    <p className="text-xs text-gray-600 mt-2 italic">
                      Requisitos: {opportunity.requirements}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No se identificaron oportunidades específicas</p>
          )}
        </Card>
      </div>

      {/* Action Items */}
      {analysisData.actionItems.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan de Acción</h3>
          
          <div className="space-y-3">
            {analysisData.actionItems.map((action: any, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm">{action.action}</h4>
                    <Badge className={getPriorityColor(action.priority)}>
                      {action.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{action.description}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {action.timeframe}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}