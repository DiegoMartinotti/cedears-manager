import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Volume2,
  X,
  Info
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { OpportunityData } from '../../hooks/useOpportunities'

interface OpportunityScoreBreakdownProps {
  opportunity: OpportunityData
  onClose: () => void
}

export function OpportunityScoreBreakdown({ 
  opportunity, 
  onClose 
}: OpportunityScoreBreakdownProps) {
  
  const getSignalColor = (signal: 'BUY' | 'SELL' | 'HOLD') => {
    switch (signal) {
      case 'BUY':
        return 'text-green-600 bg-green-50'
      case 'SELL':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getSignalIcon = (signal: 'BUY' | 'SELL' | 'HOLD') => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="w-4 h-4" />
      case 'SELL':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getSignalText = (signal: 'BUY' | 'SELL' | 'HOLD') => {
    switch (signal) {
      case 'BUY':
        return 'Compra'
      case 'SELL':
        return 'Venta'
      default:
        return 'Neutro'
    }
  }

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'bg-green-500'
    if (strength >= 60) return 'bg-blue-500'
    if (strength >= 40) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getStrengthText = (strength: number) => {
    if (strength >= 80) return 'Muy Fuerte'
    if (strength >= 60) return 'Fuerte'
    if (strength >= 40) return 'Moderada'
    return 'Débil'
  }

  const calculateWeightedScore = (strength: number, weight: number) => {
    return (strength * weight).toFixed(1)
  }

  const totalWeight = Object.values(opportunity.technical_signals).reduce(
    (sum, signal) => sum + signal.weight, 0
  )

  const signals = [
    {
      name: 'RSI (Relative Strength Index)',
      key: 'rsi',
      data: opportunity.technical_signals.rsi,
      description: 'Mide si el instrumento está sobrecomprado o sobrevendido',
      details: `Valor actual: ${opportunity.technical_signals.rsi.value.toFixed(1)}. Umbral de sobreventa: ${opportunity.technical_signals.rsi.oversoldThreshold}`,
      icon: <Target className="w-5 h-5" />
    },
    {
      name: 'Medias Móviles (SMA)',
      key: 'sma',
      data: opportunity.technical_signals.sma,
      description: 'Analiza la tendencia mediante cruces de medias móviles',
      details: `SMA20: ${opportunity.technical_signals.sma.sma20.toFixed(2)}, SMA50: ${opportunity.technical_signals.sma.sma50.toFixed(2)}, SMA200: ${opportunity.technical_signals.sma.sma200.toFixed(2)}`,
      icon: <TrendingUp className="w-5 h-5" />
    },
    {
      name: 'Distancia del Mínimo Anual',
      key: 'distance_from_low',
      data: opportunity.technical_signals.distance_from_low,
      description: 'Evalúa qué tan cerca está el precio del mínimo anual',
      details: `Mínimo anual: $${opportunity.technical_signals.distance_from_low.yearLow.toFixed(2)}, Precio actual: $${opportunity.technical_signals.distance_from_low.currentPrice.toFixed(2)}`,
      icon: <Activity className="w-5 h-5" />
    },
    {
      name: 'Volumen Relativo',
      key: 'volume_relative',
      data: opportunity.technical_signals.volume_relative,
      description: 'Compara el volumen actual con el promedio histórico',
      details: `Volumen promedio: ${opportunity.technical_signals.volume_relative.avgVolume.toLocaleString()}, Volumen actual: ${opportunity.technical_signals.volume_relative.currentVolume.toLocaleString()}`,
      icon: <Volume2 className="w-5 h-5" />
    },
    {
      name: 'MACD',
      key: 'macd',
      data: opportunity.technical_signals.macd,
      description: 'Convergencia y divergencia de medias móviles exponenciales',
      details: `Línea MACD: ${opportunity.technical_signals.macd.line.toFixed(4)}, Señal: ${opportunity.technical_signals.macd.signalLine.toFixed(4)}, Histograma: ${opportunity.technical_signals.macd.histogram.toFixed(4)}`,
      icon: <BarChart3 className="w-5 h-5" />
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Desglose del Score - {opportunity.symbol}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {opportunity.company_name}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Score Overview */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Score Compuesto</h3>
              <div className="text-3xl font-bold text-primary">
                {opportunity.composite_score}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge className={opportunity.opportunity_type === 'STRONG_BUY' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                  {opportunity.opportunity_type === 'STRONG_BUY' ? 'Compra Fuerte' : 'Compra'}
                </Badge>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Ranking</p>
                <p className="text-lg font-bold text-foreground">#{opportunity.ranking}</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Confianza</p>
                <p className="text-lg font-bold text-foreground">{opportunity.expected_return.confidence_level}%</p>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Upside</p>
                <p className="text-lg font-bold text-green-600">+{opportunity.expected_return.upside_percentage.toFixed(1)}%</p>
              </div>
            </div>
          </Card>

          {/* Technical Signals Breakdown */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">Análisis de Señales Técnicas</h3>
            <div className="space-y-4">
              {signals.map((signal) => (
                <Card key={signal.key} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {signal.icon}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{signal.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getSignalColor(signal.data.signal)}>
                            {getSignalIcon(signal.data.signal)}
                            <span className="ml-1">{getSignalText(signal.data.signal)}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {signal.description}
                      </p>
                      
                      {/* Strength and Weight Bars */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Fuerza</span>
                            <span className="text-xs font-medium">{signal.data.strength}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getStrengthColor(signal.data.strength)}`}
                              style={{ width: `${signal.data.strength}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getStrengthText(signal.data.strength)}
                          </span>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Peso</span>
                            <span className="text-xs font-medium">{(signal.data.weight * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${signal.data.weight * 100}%` }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">Contribución</span>
                            <span className="text-xs font-medium">
                              {calculateWeightedScore(signal.data.strength, signal.data.weight)} pts
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${(signal.data.strength * signal.data.weight)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Technical Details */}
                      <div className="bg-gray-50 rounded p-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {signal.details}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Score Calculation Summary */}
          <Card className="p-4 bg-gray-50">
            <h3 className="text-lg font-bold text-foreground mb-4">Resumen del Cálculo</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Peso total utilizado:</span>
                <span className="font-medium">{(totalWeight * 100).toFixed(0)}%</span>
              </div>
              
              {signals.map((signal) => (
                <div key={signal.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {signal.name}: {signal.data.strength} × {(signal.data.weight * 100).toFixed(0)}%
                  </span>
                  <span className="font-medium">
                    {calculateWeightedScore(signal.data.strength, signal.data.weight)} pts
                  </span>
                </div>
              ))}
              
              <div className="border-t pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">Score Final:</span>
                  <span className="text-xl font-bold text-primary">
                    {opportunity.composite_score}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Interpretation Guide */}
          <Card className="p-4 border-blue-200 bg-blue-50">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Guía de Interpretación</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Rangos de Score:</h4>
                <ul className="space-y-1 text-blue-800">
                  <li>• 80-100: Oportunidad excelente</li>
                  <li>• 70-79: Oportunidad buena</li>
                  <li>• 60-69: Oportunidad moderada</li>
                  <li>• 50-59: Oportunidad débil</li>
                  <li>• &lt;50: No recomendada</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-blue-900 mb-2">Consideraciones:</h4>
                <ul className="space-y-1 text-blue-800">
                  <li>• El score se basa solo en análisis técnico</li>
                  <li>• Considerar también factores fundamentales</li>
                  <li>• Evaluar el contexto de mercado general</li>
                  <li>• Respetar límites de diversificación</li>
                  <li>• Calcular impacto de comisiones</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  )
}