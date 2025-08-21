import React, { useState } from 'react'
import { Search, TrendingUp, TrendingDown, Activity, FileText, AlertCircle } from 'lucide-react'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { useContextualAnalysis } from '../hooks/useContextualAnalysis'
import { ContextualDashboard } from '../components/contextual/ContextualDashboard'
import { NewsAnalysis } from '../components/contextual/NewsAnalysis'
import { MarketSentiment } from '../components/contextual/MarketSentiment'
import { EarningsReport } from '../components/contextual/EarningsReport'
import { TrendPrediction } from '../components/contextual/TrendPrediction'

export function ContextualAnalysis() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [searchSymbol, setSearchSymbol] = useState('')

  const {
    analyzeSymbol,
    getMarketSentiment,
    isLoading,
    error,
    data: analysisData
  } = useContextualAnalysis()

  const handleAnalyzeSymbol = async () => {
    if (!searchSymbol.trim()) return
    
    setSelectedSymbol(searchSymbol.toUpperCase())
    await analyzeSymbol({
      symbol: searchSymbol.toUpperCase(),
      analysisType: 'COMPREHENSIVE',
      timeframe: '1M',
      options: {
        includeNews: true,
        includeSentiment: true,
        includeEarnings: true,
        includeTrends: true,
        includeRecommendations: true,
        useCache: true
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyzeSymbol()
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_BUY':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'BUY':
        return 'bg-green-50 text-green-700 border-green-100'
      case 'HOLD':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100'
      case 'SELL':
        return 'bg-red-50 text-red-700 border-red-100'
      case 'STRONG_SELL':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  const tabItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Activity className="w-4 h-4" />
    },
    {
      id: 'news',
      label: 'Noticias',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'sentiment',
      label: 'Sentiment',
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: 'earnings',
      label: 'Earnings',
      icon: <TrendingDown className="w-4 h-4" />
    },
    {
      id: 'trends',
      label: 'Tendencias',
      icon: <Activity className="w-4 h-4" />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análisis Contextual</h1>
          <p className="text-gray-600 mt-1">
            Análisis completo con IA: noticias, sentiment, earnings y tendencias
          </p>
        </div>

        {/* Symbol Search */}
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Ej: AAPL, MSFT..."
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 w-40"
            />
          </div>
          <Button 
            onClick={handleAnalyzeSymbol}
            disabled={!searchSymbol.trim() || isLoading}
            className="whitespace-nowrap"
          >
            {isLoading ? <LoadingSpinner size={16} /> : 'Analizar'}
          </Button>
        </div>
      </div>

      {/* Analysis Summary */}
      {analysisData && selectedSymbol && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Análisis de {selectedSymbol}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Última actualización: {new Date(analysisData.timestamp).toLocaleString()}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Badge className={getRecommendationColor(analysisData.overallAssessment.recommendation)}>
                {analysisData.overallAssessment.recommendation}
              </Badge>
              
              <div className="text-sm">
                <span className="text-gray-500">Score:</span>
                <span className={`ml-1 font-medium ${
                  analysisData.overallAssessment.score > 0 ? 'text-green-600' : 
                  analysisData.overallAssessment.score < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {analysisData.overallAssessment.score > 0 ? '+' : ''}{analysisData.overallAssessment.score}
                </span>
              </div>

              <div className="text-sm">
                <span className="text-gray-500">Confianza:</span>
                <span className="ml-1 font-medium text-blue-600">
                  {analysisData.overallAssessment.confidence}%
                </span>
              </div>
            </div>
          </div>

          {/* Key Factors */}
          {analysisData.overallAssessment.keyFactors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Factores Clave:</h3>
              <div className="flex flex-wrap gap-2">
                {analysisData.overallAssessment.keyFactors.map((factor, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Error en el análisis</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </Card>
      )}

      {/* Tabs Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && (
            <ContextualDashboard 
              symbol={selectedSymbol}
              analysisData={analysisData}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'news' && (
            <NewsAnalysis 
              symbol={selectedSymbol}
              newsData={analysisData?.components.news}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'sentiment' && (
            <MarketSentiment 
              symbol={selectedSymbol}
              sentimentData={analysisData?.components.marketSentiment}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'earnings' && (
            <EarningsReport 
              symbol={selectedSymbol}
              earningsData={analysisData?.components.earnings}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'trends' && (
            <TrendPrediction 
              symbol={selectedSymbol}
              trendsData={analysisData?.components.trends}
              isLoading={isLoading}
            />
          )}
        </div>
      </Tabs>
    </div>
  )
}