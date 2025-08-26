import React, { useState, useEffect } from 'react'
import { Calculator, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useBreakEvenSimulationMutation } from '../../hooks/useBreakEven'

interface BreakEvenCalculatorProps {
  className?: string
  initialValues?: {
    purchasePrice?: number
    quantity?: number
    currentPrice?: number
  }
}

export default function BreakEvenCalculator({ className = '', initialValues }: BreakEvenCalculatorProps) {
  const [inputs, setInputs] = useState({
    purchasePrice: initialValues?.purchasePrice || 0,
    quantity: initialValues?.quantity || 0,
    currentPrice: initialValues?.currentPrice || 0,
    commissionRate: 0.005, // 0.5%
    inflationRate: 0.12, // 12% anual
    custodyMonths: 0
  })

  const simulationMutation = useBreakEvenSimulationMutation()

  // Auto-calcular cuando cambien los inputs
  useEffect(() => {
    if (inputs.purchasePrice > 0 && inputs.quantity > 0 && inputs.currentPrice > 0) {
      const timer = setTimeout(() => {
        simulationMutation.mutate(inputs)
      }, 500) // Debounce de 500ms

      return () => clearTimeout(timer)
    }
  }, [inputs, simulationMutation])

  const handleInputChange = (field: keyof typeof inputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }

  const results = simulationMutation.data?.simulation.results
  const isLoading = simulationMutation.isPending
  const hasResults = !!results

  const getDistanceColor = (percentage: number) => {
    if (percentage > 5) return 'text-green-600 bg-green-50'
    if (percentage > 0) return 'text-yellow-600 bg-yellow-50'
    if (percentage > -5) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getDistanceIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="w-4 h-4" />
    return <TrendingDown className="w-4 h-4" />
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Calculadora de Break-Even</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Parámetros de la Operación</h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio de Compra (USD)
              </label>
              <input
                type="number"
                value={inputs.purchasePrice || ''}
                onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: 150.50"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad de Acciones
              </label>
              <input
                type="number"
                value={inputs.quantity || ''}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: 10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Actual (USD)
              </label>
              <input
                type="number"
                value={inputs.currentPrice || ''}
                onChange={(e) => handleInputChange('currentPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: 160.25"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tasa de Comisión (%)
              </label>
              <input
                type="number"
                value={inputs.commissionRate * 100}
                onChange={(e) => handleInputChange('commissionRate', (parseFloat(e.target.value) || 0) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: 0.5"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inflación Anual (%)
              </label>
              <input
                type="number"
                value={inputs.inflationRate * 100}
                onChange={(e) => handleInputChange('inflationRate', (parseFloat(e.target.value) || 0) / 100)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: 12"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meses de Tenencia
              </label>
              <input
                type="number"
                value={inputs.custodyMonths || ''}
                onChange={(e) => handleInputChange('custodyMonths', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="ej: 6"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Resultados del Análisis</h4>
            
            {isLoading && (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!hasResults && !isLoading && (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Ingrese los valores para ver el análisis</p>
                </div>
              </div>
            )}

            {hasResults && !isLoading && (
              <div className="space-y-4">
                {/* Break-Even Price */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Precio Break-Even</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    ${results.breakEvenPrice.toFixed(2)}
                  </div>
                </div>

                {/* Distance to Break-Even */}
                <div className={`rounded-lg p-4 ${getDistanceColor(results.distancePercentage)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getDistanceIcon(results.distancePercentage)}
                    <span className="text-sm font-medium">Distancia al Break-Even</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {results.distancePercentage > 0 ? '+' : ''}{results.distancePercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm opacity-75">
                    ${Math.abs(results.distanceToBreakEven).toFixed(2)} {results.distancePercentage > 0 ? 'por encima' : 'por debajo'}
                  </div>
                </div>

                {/* Profit/Loss */}
                <div className={`rounded-lg p-4 ${results.profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {results.profit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${results.profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {results.profit >= 0 ? 'Ganancia' : 'Pérdida'} Potencial
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${results.profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {results.profit >= 0 ? '+' : ''}${results.profit.toFixed(2)}
                  </div>
                  <div className={`text-sm opacity-75 ${results.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {results.profitPercentage >= 0 ? '+' : ''}{results.profitPercentage.toFixed(1)}% del capital invertido
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Desglose de Costos</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Comisión Compra:</span>
                      <span className="text-gray-900">${results.costsBreakdown.buyCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Comisión Venta:</span>
                      <span className="text-gray-900">${results.costsBreakdown.sellCommission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custodia:</span>
                      <span className="text-gray-900">${results.costsBreakdown.custodyFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Impacto Inflación:</span>
                      <span className="text-gray-900">${results.costsBreakdown.inflationImpact.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-2">
                      <span className="text-gray-700">Total Costos:</span>
                      <span className="text-gray-900">${results.costsBreakdown.totalCosts.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                {results.distancePercentage < -10 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <div className="font-medium">Posición en Pérdida Significativa</div>
                      <div>La posición está más del 10% por debajo del break-even. Considera revisar tu estrategia.</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}