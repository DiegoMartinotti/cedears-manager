import React, { useState } from 'react'
import { 
  Calculator2, 
  TrendingUp, 
  Grid3X3, 
  Lightbulb,
  AlertCircle,
  DollarSign,
  Clock,
  Target
} from 'lucide-react'
import BreakEvenCalculator from '../components/break-even/BreakEvenCalculator'
// TODO: Implement these components when needed
// import BreakEvenChart from '../components/break-even/BreakEvenChart'
// import BreakEvenMatrix from '../components/break-even/BreakEvenMatrix'
// import BreakEvenOptimizer from '../components/break-even/BreakEvenOptimizer'
import { 
  usePortfolioBreakEvenSummary, 
  useBreakEvenSummary, 
  useBreakEvenHealth 
} from '../hooks/useBreakEven'

type TabType = 'calculator' | 'portfolio' | 'projections' | 'optimization'

export default function BreakEven() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator')

  // Queries
  const { data: portfolioSummary, isLoading: portfolioLoading } = usePortfolioBreakEvenSummary()
  const { isLoading: summaryLoading } = useBreakEvenSummary()
  // TODO: Use summary data when implementing the UI
  // const { data: summary } = useBreakEvenSummary()
  const { data: health, isLoading: healthLoading } = useBreakEvenHealth()

  const tabs = [
    {
      id: 'calculator' as const,
      name: 'Calculadora',
      icon: Calculator2,
      description: 'Cálculo interactivo de break-even'
    },
    {
      id: 'portfolio' as const,
      name: 'Análisis de Cartera',
      icon: TrendingUp,
      description: 'Break-even de todas las posiciones'
    },
    {
      id: 'projections' as const,
      name: 'Proyecciones',
      icon: Grid3X3,
      description: 'Matriz de sensibilidad y escenarios'
    },
    {
      id: 'optimization' as const,
      name: 'Optimización',
      icon: Lightbulb,
      description: 'Sugerencias de mejora'
    }
  ]

  const TabButton = ({ tab, isActive, onClick }: { 
    tab: typeof tabs[0], 
    isActive: boolean, 
    onClick: () => void 
  }) => (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        isActive 
          ? 'border-blue-500 text-blue-600 bg-blue-50' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <tab.icon className="w-4 h-4" />
      <span className="hidden sm:inline">{tab.name}</span>
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Calculator2 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Análisis de Break-Even</h1>
            <p className="text-gray-600">Calculadora de punto de equilibrio con inflación y comisiones</p>
          </div>
        </div>
        
        {/* Health status */}
        {health && !healthLoading && (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
            health.status === 'healthy' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              health.status === 'healthy' ? 'bg-green-600' : 'bg-red-600'
            }`} />
            Sistema {health.status === 'healthy' ? 'Operativo' : 'Con Problemas'}
          </div>
        )}
      </div>

      {/* Resumen general */}
      {portfolioSummary && !portfolioLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Total Posiciones</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {portfolioSummary.totalPositions}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Sobre Break-Even</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {portfolioSummary.positionsAboveBreakEven}
            </div>
            <div className="text-xs text-green-600">
              {portfolioSummary.totalPositions > 0 
                ? ((portfolioSummary.positionsAboveBreakEven / portfolioSummary.totalPositions) * 100).toFixed(1)
                : 0}% del total
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">Días Promedio</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {portfolioSummary.averageDaysToBreakEven}
            </div>
            <div className="text-xs text-blue-600">
              para break-even
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-600">Ahorro Potencial</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              ${portfolioSummary.totalPotentialSavings.toFixed(0)}
            </div>
            <div className="text-xs text-purple-600">
              en optimizaciones
            </div>
          </div>
        </div>
      )}

      {/* Alertas críticas */}
      {portfolioSummary?.criticalPositions && portfolioSummary.criticalPositions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Posiciones Críticas ({portfolioSummary.criticalPositions.length})
              </h3>
              <p className="text-sm text-red-700 mb-3">
                Las siguientes posiciones están significativamente por debajo del break-even:
              </p>
              <div className="space-y-2">
                {portfolioSummary.criticalPositions.slice(0, 3).map((position, index) => (
                  <div key={index} className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-red-800">{position.symbol}</span>
                    <span className="text-red-600">
                      {position.distancePercentage.toFixed(1)}% por debajo
                    </span>
                    <span className="text-red-600">
                      ~{position.daysToBreakEven} días para recuperar
                    </span>
                  </div>
                ))}
                {portfolioSummary.criticalPositions.length > 3 && (
                  <div className="text-sm text-red-600">
                    +{portfolioSummary.criticalPositions.length - 3} posiciones más...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Calculadora */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Calculadora de Break-Even</h2>
                <p className="text-gray-600">
                  Calcula el punto de equilibrio considerando comisiones, custodia e inflación
                </p>
              </div>
              
              <BreakEvenCalculator />
            </div>
          )}

          {/* Tab: Análisis de Cartera */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Análisis de Cartera</h2>
                <p className="text-gray-600">
                  Break-even de todas tus posiciones actuales
                </p>
              </div>

              {portfolioLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : portfolioSummary?.criticalPositions && portfolioSummary.criticalPositions.length > 0 ? (
                <div className="space-y-4">
                  {portfolioSummary.criticalPositions.map((position, index) => (
                    <div key={index} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800">
                              {position.symbol.substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{position.symbol}</h3>
                            <p className="text-sm text-gray-600">Trade #{position.tradeId}</p>
                          </div>
                        </div>
                        
                        <div className={`text-right ${
                          position.distancePercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <div className="font-medium">
                            {position.distancePercentage >= 0 ? '+' : ''}{position.distancePercentage.toFixed(1)}%
                          </div>
                          <div className="text-sm opacity-75">
                            {position.daysToBreakEven} días
                          </div>
                        </div>
                      </div>
                      
                      {/* Aquí se podría agregar un BreakEvenChart específico para esta posición */}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay posiciones críticas</h3>
                  <p>Todas tus posiciones están en buen estado respecto al break-even.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Proyecciones */}
          {activeTab === 'projections' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Proyecciones y Matriz</h2>
                <p className="text-gray-600">
                  Análisis de sensibilidad y escenarios what-if
                </p>
              </div>

              {/* Formulario para configurar matriz */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Configurar Análisis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instrumento ID
                    </label>
                    <input
                      type="number"
                      placeholder="ej: 1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Compra
                    </label>
                    <input
                      type="number"
                      placeholder="ej: 150.00"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      placeholder="ej: 10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Generar Matriz
                </button>
              </div>

              {/* Aquí se mostraría el componente BreakEvenMatrix cuando se configure */}
              <div className="text-center py-12 text-gray-500">
                <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Configura los parámetros</h3>
                <p>Ingresa los datos de la operación para generar la matriz de sensibilidad.</p>
              </div>
            </div>
          )}

          {/* Tab: Optimización */}
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Optimizaciones</h2>
                <p className="text-gray-600">
                  Sugerencias para mejorar tu break-even
                </p>
              </div>

              {/* Aquí se mostraría el componente BreakEvenOptimizer */}
              <div className="text-center py-12 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una posición</h3>
                <p>Elige una operación específica para ver sugerencias de optimización personalizadas.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}