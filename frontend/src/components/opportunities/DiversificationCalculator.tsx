import { useState, useEffect } from 'react'
import { 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  PieChart,
  Target,
  X,
  RefreshCw
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useDiversificationCalculator } from '../../hooks/useOpportunities'

interface DiversificationCalculatorProps {
  preselectedSymbol?: string
  onClose?: () => void
}

export function DiversificationCalculator({ 
  preselectedSymbol, 
  onClose 
}: DiversificationCalculatorProps) {
  const [symbol, setSymbol] = useState(preselectedSymbol || '')
  const [investmentAmount, setInvestmentAmount] = useState<number>(0)
  const [hasCalculated, setHasCalculated] = useState(false)

  const { calculate, result, isCalculating, error, reset } = useDiversificationCalculator()

  useEffect(() => {
    if (preselectedSymbol) {
      setSymbol(preselectedSymbol)
    }
  }, [preselectedSymbol])

  const handleCalculate = async () => {
    if (!symbol.trim() || investmentAmount <= 0) {
      return
    }

    try {
      await calculate({ symbol: symbol.toUpperCase(), investmentAmount })
      setHasCalculated(true)
    } catch (error) {
      console.error('Error calculating diversification:', error)
    }
  }

  const handleReset = () => {
    reset()
    setHasCalculated(false)
    setSymbol(preselectedSymbol || '')
    setInvestmentAmount(0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getActionColor = (action: 'PROCEED' | 'ADJUST_AMOUNT' | 'AVOID') => {
    switch (action) {
      case 'PROCEED':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'ADJUST_AMOUNT':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'AVOID':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getActionIcon = (action: 'PROCEED' | 'ADJUST_AMOUNT' | 'AVOID') => {
    switch (action) {
      case 'PROCEED':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'ADJUST_AMOUNT':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'AVOID':
        return <X className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getActionText = (action: 'PROCEED' | 'ADJUST_AMOUNT' | 'AVOID') => {
    switch (action) {
      case 'PROCEED':
        return 'Proceder con la Inversión'
      case 'ADJUST_AMOUNT':
        return 'Ajustar Monto'
      case 'AVOID':
        return 'Evitar Inversión'
      default:
        return 'Desconocido'
    }
  }

  return (
    <Card className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Calculadora de Diversificación</h2>
            <p className="text-sm text-muted-foreground">
              Analiza el impacto de una nueva inversión en tu cartera
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Input Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Símbolo del Instrumento
          </label>
          <Input
            type="text"
            placeholder="Ej: AAPL"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="uppercase"
            disabled={isCalculating}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Monto de Inversión (USD)
          </label>
          <Input
            type="number"
            placeholder="Ej: 5000"
            value={investmentAmount || ''}
            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            min="1"
            step="100"
            disabled={isCalculating}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          onClick={handleCalculate}
          disabled={!symbol.trim() || investmentAmount <= 0 || isCalculating}
          className="flex-1"
        >
          {isCalculating ? (
            <>
              <LoadingSpinner className="w-4 h-4 mr-2" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular Impacto
            </>
          )}
        </Button>
        
        {hasCalculated && (
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Nueva Consulta
          </Button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 font-medium">Error en el cálculo</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && hasCalculated && (
        <div className="space-y-6">
          {/* Recommendation Summary */}
          <Card className={`p-4 border-2 ${getActionColor(result.final_recommendation.action)}`}>
            <div className="flex items-center gap-3 mb-3">
              {getActionIcon(result.final_recommendation.action)}
              <h3 className="text-lg font-bold">
                {getActionText(result.final_recommendation.action)}
              </h3>
            </div>
            
            {result.final_recommendation.suggested_amount && (
              <div className="mb-3">
                <p className="text-sm font-medium">Monto Sugerido:</p>
                <p className="text-xl font-bold">
                  {formatCurrency(result.final_recommendation.suggested_amount)}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              {result.final_recommendation.reasons.map((reason, index) => (
                <div key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-current mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{reason}</span>
                </div>
              ))}
            </div>
            
            {result.final_recommendation.risk_factors.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Factores de Riesgo:</p>
                {result.final_recommendation.risk_factors.map((risk, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-current mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{risk}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Diversification Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium text-foreground">Análisis de Diversificación</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor Actual de Cartera</span>
                  <span className="font-medium">
                    {formatCurrency(result.diversification_check.current_portfolio_value)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Inversión Propuesta</span>
                  <span className="font-medium">
                    {formatCurrency(result.diversification_check.proposed_investment)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Concentración en Posición</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {result.diversification_check.concentration_percentage.toFixed(1)}%
                    </span>
                    {result.diversification_check.concentration_percentage > result.diversification_check.max_allowed_concentration && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Concentración Sectorial</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {result.diversification_check.sector_concentration.toFixed(1)}%
                    </span>
                    {result.diversification_check.sector_concentration > 25 && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Dentro de Límites</span>
                    <Badge className={result.diversification_check.is_within_limits ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {result.diversification_check.is_within_limits ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-medium text-foreground">Impacto de Comisiones</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Comisión de Operación</span>
                  <span className="font-medium">
                    {formatCurrency(result.commission_impact.operation_commission)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Custodia Mensual</span>
                  <span className="font-medium">
                    {formatCurrency(result.commission_impact.custody_monthly)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Costo Total Primer Año</span>
                  <span className="font-medium">
                    {formatCurrency(result.commission_impact.total_first_year)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Break-even Requerido</span>
                  <span className="font-medium">
                    {result.commission_impact.break_even_percentage.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Upside Neto</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${result.commission_impact.net_upside_after_costs > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.commission_impact.net_upside_after_costs > 0 ? '+' : ''}
                      {result.commission_impact.net_upside_after_costs.toFixed(2)}%
                    </span>
                    {result.commission_impact.is_profitable ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rentable</span>
                    <Badge className={result.commission_impact.is_profitable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {result.commission_impact.is_profitable ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Risk Level Indicator */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-medium text-foreground">Nivel de Riesgo</h3>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge 
                className={`px-3 py-1 ${
                  result.diversification_check.recommendation.risk_level === 'LOW' 
                    ? 'bg-green-100 text-green-800' 
                    : result.diversification_check.recommendation.risk_level === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {result.diversification_check.recommendation.risk_level === 'LOW' && 'Bajo'}
                {result.diversification_check.recommendation.risk_level === 'MEDIUM' && 'Medio'}
                {result.diversification_check.recommendation.risk_level === 'HIGH' && 'Alto'}
              </Badge>
              
              <span className="text-sm text-muted-foreground">
                {result.diversification_check.recommendation.reason}
              </span>
            </div>
          </Card>
        </div>
      )}
    </Card>
  )
}