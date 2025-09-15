import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Badge } from '../components/ui/Badge'
import { CommissionConfig } from '../components/commissions/CommissionConfig'
import { useCommissions } from '../hooks/useCommissions'
import {
  CommissionProjection,
  BrokerComparison,
  CommissionAnalysis,
  MinimumInvestmentCalculation,
  CommissionFormData
} from '../types/commissions'

// Helper component para las métricas de análisis
const AnalysisMetrics: React.FC<{ analysisResult: CommissionAnalysis }> = ({ analysisResult }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <h4 className="font-medium text-gray-700 mb-2">Total Comisiones</h4>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(analysisResult.totalCommissionsPaid)}
        </p>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium text-gray-700 mb-2">Total Impuestos</h4>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(analysisResult.totalTaxesPaid)}
        </p>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium text-gray-700 mb-2">Promedio por Operación</h4>
        <p className="text-2xl font-bold text-green-600">
          {formatCurrency(analysisResult.averageCommissionPerTrade)}
        </p>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium text-gray-700 mb-2">Total Operaciones</h4>
        <p className="text-2xl font-bold text-gray-600">
          {analysisResult.commissionByType.buy.count + analysisResult.commissionByType.sell.count}
        </p>
      </Card>
    </div>
  )
}

// Helper component para la tabla de evolución mensual
const MonthlyBreakdownTable: React.FC<{ analysisResult: CommissionAnalysis }> = ({ analysisResult }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  if (!analysisResult.monthlyBreakdown.length) return null

  return (
    <Card className="p-6">
      <h4 className="font-medium text-gray-700 mb-4">Evolución Mensual</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Mes</th>
              <th className="text-right p-2">Comisiones</th>
              <th className="text-right p-2">Impuestos</th>
              <th className="text-right p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {analysisResult.monthlyBreakdown.map((month, index) => (
              <tr key={index} className="border-b">
                <td className="p-2">{month.month}</td>
                <td className="text-right p-2">{formatCurrency(month.commissions)}</td>
                <td className="text-right p-2">{formatCurrency(month.taxes)}</td>
                <td className="text-right p-2 font-semibold">{formatCurrency(month.commissions + month.taxes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// eslint-disable-next-line max-lines-per-function
export const Commissions: React.FC = () => {
  const {
    configs,
    activeConfig,
    error,
    calculateCommission,
    compareBrokers,
    analyzeCommissions,
    calculateMinimumInvestment,
    clearError
  } = useCommissions()

  const [activeTab, setActiveTab] = useState<'calculator' | 'comparison' | 'analysis' | 'config'>('calculator')
  const [calculatorForm, setCalculatorForm] = useState<CommissionFormData>({
    operationType: 'BUY',
    amount: '',
    portfolioValue: '',
    selectedBroker: ''
  })

  const [calculationResult, setCalculationResult] = useState<CommissionProjection | null>(null)
  const [comparisonResult, setComparisonResult] = useState<BrokerComparison[] | null>(null)
  const [analysisResult, setAnalysisResult] = useState<CommissionAnalysis | null>(null)
  const [minimumInvestmentResult, setMinimumInvestmentResult] = useState<MinimumInvestmentCalculation | null>(null)

  const [isCalculating, setIsCalculating] = useState(false)
  const [comparisonForm, setComparisonForm] = useState({
    operationType: 'BUY' as 'BUY' | 'SELL',
    amount: '',
    portfolioValue: ''
  })

  const [minimumInvestmentForm, setMinimumInvestmentForm] = useState({
    threshold: '2.5',
    broker: ''
  })

  const handleCalculatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!calculatorForm.amount || parseFloat(calculatorForm.amount) <= 0) {
      return
    }

    setIsCalculating(true)
    clearError()

    try {
      const result = await calculateCommission({
        type: calculatorForm.operationType,
        amount: parseFloat(calculatorForm.amount),
        portfolioValue: calculatorForm.portfolioValue ? parseFloat(calculatorForm.portfolioValue) : undefined,
        broker: calculatorForm.selectedBroker || undefined
      })

      if (result && 'custody' in result) {
        setCalculationResult(result as CommissionProjection)
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const handleComparisonSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comparisonForm.amount || !comparisonForm.portfolioValue) return

    setIsCalculating(true)
    clearError()

    try {
      const result = await compareBrokers({
        operationType: comparisonForm.operationType,
        operationAmount: parseFloat(comparisonForm.amount),
        portfolioValue: parseFloat(comparisonForm.portfolioValue)
      })

      setComparisonResult(result)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleAnalysisLoad = useCallback(async () => {
    setIsCalculating(true)
    clearError()

    try {
      const result = await analyzeCommissions()
      setAnalysisResult(result)
    } finally {
      setIsCalculating(false)
    }
  }, [analyzeCommissions, clearError])

  const handleMinimumInvestmentCalculate = async () => {
    if (!minimumInvestmentForm.threshold) return

    setIsCalculating(true)
    clearError()

    try {
      const result = await calculateMinimumInvestment({
        commissionThreshold: parseFloat(minimumInvestmentForm.threshold),
        broker: minimumInvestmentForm.broker || undefined
      })

      setMinimumInvestmentResult(result)
    } finally {
      setIsCalculating(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'analysis' && !analysisResult) {
      handleAnalysisLoad()
    }
  }, [activeTab, analysisResult, handleAnalysisLoad])

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sistema de Comisiones</h1>
        
        {activeConfig && (
          <Badge variant="success">
            Activo: {activeConfig.name}
          </Badge>
        )}
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'calculator', label: 'Calculadora' },
            { id: 'comparison', label: 'Comparar Brokers' },
            { id: 'analysis', label: 'Análisis Histórico' },
            { id: 'config', label: 'Configuración' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
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

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Calculadora de Comisiones</h3>
            
            <form onSubmit={handleCalculatorSubmit} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="calculator-operation-type" className="text-sm font-medium">Tipo de operación</label>
                <Select
                  id="calculator-operation-type"
                  value={calculatorForm.operationType}
                  onChange={(e) => setCalculatorForm(prev => ({ ...prev, operationType: e.target.value as 'BUY' | 'SELL' }))}
                >
                  <option value="BUY">Compra</option>
                  <option value="SELL">Venta</option>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="calculator-amount" className="text-sm font-medium">Monto de la operación (ARS)</label>
                <Input
                  id="calculator-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={calculatorForm.amount}
                  onChange={(e) => setCalculatorForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="50000"
                  required
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="calculator-portfolio-value" className="text-sm font-medium">Valor actual de cartera (ARS) - Opcional</label>
                <Input
                  id="calculator-portfolio-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={calculatorForm.portfolioValue}
                  onChange={(e) => setCalculatorForm(prev => ({ ...prev, portfolioValue: e.target.value }))}
                  placeholder="1000000"
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="calculator-broker" className="text-sm font-medium">Broker - Opcional</label>
                <Select
                  id="calculator-broker"
                  value={calculatorForm.selectedBroker}
                  onChange={(e) => setCalculatorForm(prev => ({ ...prev, selectedBroker: e.target.value }))}
                >
                  <option value="">Configuración activa</option>
                  {configs.map(config => (
                    <option key={config.broker} value={config.broker}>
                      {config.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isCalculating || !calculatorForm.amount}
                variant="default"
                className="w-full"
              >
                {isCalculating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Calculando...</span>
                  </>
                ) : (
                  'Calcular Comisiones'
                )}
              </Button>
            </form>

            {/* Minimum Investment Calculator */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="font-medium text-gray-700 mb-4">Monto Mínimo Recomendado</h4>
              
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="minimum-threshold" className="text-sm font-medium">Porcentaje máximo de comisión (%)</label>
                  <Input
                    id="minimum-threshold"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={minimumInvestmentForm.threshold}
                    onChange={(e) => setMinimumInvestmentForm(prev => ({ ...prev, threshold: e.target.value }))}
                    placeholder="2.5"
                  />
                </div>

                <Button
                  onClick={handleMinimumInvestmentCalculate}
                  disabled={isCalculating}
                  variant="outline"
                  size="sm"
                >
                  Calcular Mínimo
                </Button>

                {minimumInvestmentResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-800">
                      Monto mínimo recomendado: {formatCurrency(minimumInvestmentResult.minimumAmount)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Comisión efectiva: {formatPercentage(minimumInvestmentResult.commissionPercentage)}
                    </p>
                    <p className="text-sm text-blue-600 mt-2">
                      {minimumInvestmentResult.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {calculationResult && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Resultado del Cálculo</h3>
              
              <div className="space-y-4">
                {/* Comisión de Operación */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Comisión de Operación</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Comisión base:</span>
                      <p className="font-medium">{formatCurrency(calculationResult.operation.baseCommission)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">IVA:</span>
                      <p className="font-medium">{formatCurrency(calculationResult.operation.ivaAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total operación:</span>
                      <p className="font-medium text-lg">{formatCurrency(calculationResult.operation.totalCommission)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Monto neto:</span>
                      <p className="font-medium text-lg">{formatCurrency(calculationResult.operation.netAmount)}</p>
                    </div>
                  </div>
                </div>

                {/* Comisión de Custodia */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Comisión de Custodia Anual</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Monto aplicable:</span>
                      <p className="font-medium">{formatCurrency(calculationResult.custody.applicableAmount)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Costo mensual:</span>
                      <p className="font-medium">{formatCurrency(calculationResult.custody.totalMonthlyCost)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Costo anual:</span>
                      <p className="font-medium text-lg">{formatCurrency(calculationResult.custody.annualFee)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Estado:</span>
                      <p className="font-medium">
                        {calculationResult.custody.isExempt ? (
                          <Badge variant="success">Exento</Badge>
                        ) : (
                          <Badge variant="destructive">Aplica</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumen Total */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Resumen Total (Primer Año)</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Costo total estimado:</span>
                      <span className="font-medium text-blue-800">{formatCurrency(calculationResult.totalFirstYearCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Impacto en rentabilidad:</span>
                      <span className="font-medium text-blue-800">+{formatPercentage(calculationResult.breakEvenImpact)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Necesitas una rentabilidad adicional de {formatPercentage(calculationResult.breakEvenImpact)} para cubrir todos los costos.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Comparación entre Brokers</h3>
            
            <form onSubmit={handleComparisonSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="comparison-operation-type" className="text-sm font-medium">Tipo de operación</label>
                <Select
                  id="comparison-operation-type"
                  value={comparisonForm.operationType}
                  onChange={(e) => setComparisonForm(prev => ({ ...prev, operationType: e.target.value as 'BUY' | 'SELL' }))}
                >
                  <option value="BUY">Compra</option>
                  <option value="SELL">Venta</option>
                </Select>
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="comparison-amount" className="text-sm font-medium">Monto operación (ARS)</label>
                <Input
                  id="comparison-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={comparisonForm.amount}
                  onChange={(e) => setComparisonForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="50000"
                  required
                />
              </div>

              <div className="flex flex-col space-y-2">
                <label htmlFor="comparison-portfolio-value" className="text-sm font-medium">Valor de cartera (ARS)</label>
                <Input
                  id="comparison-portfolio-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={comparisonForm.portfolioValue}
                  onChange={(e) => setComparisonForm(prev => ({ ...prev, portfolioValue: e.target.value }))}
                  placeholder="1000000"
                  required
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isCalculating || !comparisonForm.amount || !comparisonForm.portfolioValue}
                  variant="default"
                  className="w-full"
                >
                  {isCalculating ? <LoadingSpinner size="sm" /> : 'Comparar'}
                </Button>
              </div>
            </form>
          </Card>

          {comparisonResult && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Resultados de Comparación</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Ranking</th>
                      <th className="text-left py-3 px-2">Broker</th>
                      <th className="text-right py-3 px-2">Comisión Operación</th>
                      <th className="text-right py-3 px-2">Custodia Anual</th>
                      <th className="text-right py-3 px-2">Costo Total (1er Año)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.map((comparison) => (
                      <tr key={comparison.broker} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <Badge variant={comparison.ranking === 1 ? 'success' : 'default'}>
                            #{comparison.ranking}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-medium">{comparison.name}</td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(comparison.operationCommission.totalCommission)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(comparison.custodyFee.annualFee)}
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {formatCurrency(comparison.totalFirstYearCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Análisis Histórico de Comisiones</h3>
            <Button
              onClick={handleAnalysisLoad}
              disabled={isCalculating}
              variant="outline"
            >
              {isCalculating ? <LoadingSpinner size="sm" /> : 'Actualizar'}
            </Button>
          </div>

          {analysisResult && (
            <AnalysisMetrics analysisResult={analysisResult} />
          )}

          {analysisResult && (
            <MonthlyBreakdownTable analysisResult={analysisResult} />
          )}
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <CommissionConfig />
      )}
    </div>
  )
}