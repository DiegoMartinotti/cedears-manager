import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Calculator, 
  Clock, 
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { OpportunityData } from '../../hooks/useOpportunities'

interface OpportunityCardProps {
  opportunity: OpportunityData
  onViewDetails: () => void
  onCalculate: () => void
  onViewScore: () => void
}

export function OpportunityCard({ 
  opportunity, 
  onViewDetails, 
  onCalculate, 
  onViewScore 
}: OpportunityCardProps) {
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500 text-white'
    if (score >= 70) return 'bg-blue-500 text-white'
    if (score >= 60) return 'bg-yellow-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const getTypeColor = (type: 'BUY' | 'STRONG_BUY') => {
    return type === 'STRONG_BUY' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
  }

  const getRiskColor = (volatility: number) => {
    if (volatility < 20) return 'text-green-600'
    if (volatility < 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return 'N/A'
    
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`
    return `$${marketCap.toLocaleString()}`
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffHours < 1) {
      return `hace ${diffMinutes} min`
    } else if (diffHours < 24) {
      return `hace ${diffHours}h`
    } else {
      const diffDays = Math.floor(diffHours / 24)
      return `hace ${diffDays}d`
    }
  }

  const getSignalIcon = (signal: 'BUY' | 'SELL' | 'HOLD') => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'SELL':
        return <TrendingDown className="w-3 h-3 text-red-600" />
      default:
        return <Activity className="w-3 h-3 text-gray-600" />
    }
  }

  const strongSignals = Object.values(opportunity.technical_signals).filter(
    signal => signal.signal === 'BUY' && signal.strength > 70
  ).length

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow duration-200 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-foreground">{opportunity.symbol}</h3>
            <Badge className={getTypeColor(opportunity.opportunity_type)}>
              {opportunity.opportunity_type === 'STRONG_BUY' ? 'Compra Fuerte' : 'Compra'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {opportunity.company_name}
          </p>
        </div>
        
        <div className="text-right">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold ${getScoreColor(opportunity.composite_score)}`}>
            {opportunity.composite_score}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Ranking #{opportunity.ranking}</p>
        </div>
      </div>

      {/* Price and Market Data */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Precio Actual</span>
          <span className="font-medium text-foreground">
            {formatCurrency(opportunity.market_data.current_price)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Precio Objetivo</span>
          <span className="font-medium text-green-600">
            {formatCurrency(opportunity.expected_return.target_price)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Upside Potencial</span>
          <span className="font-bold text-green-600">
            +{opportunity.expected_return.upside_percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Technical Signals Summary */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Señales Técnicas</span>
          <span className="text-xs text-muted-foreground">
            {strongSignals} señales fuertes
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1 text-xs">
            {getSignalIcon(opportunity.technical_signals.rsi.signal)}
            <span className="text-muted-foreground">RSI:</span>
            <span className="font-medium">{opportunity.technical_signals.rsi.value.toFixed(0)}</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs">
            {getSignalIcon(opportunity.technical_signals.sma.signal)}
            <span className="text-muted-foreground">SMA:</span>
            <span className="font-medium">{opportunity.technical_signals.sma.strength}</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs">
            {getSignalIcon(opportunity.technical_signals.distance_from_low.signal)}
            <span className="text-muted-foreground">Dist. Mín:</span>
            <span className="font-medium">{opportunity.technical_signals.distance_from_low.percentage.toFixed(0)}%</span>
          </div>
          
          <div className="flex items-center gap-1 text-xs">
            {getSignalIcon(opportunity.technical_signals.macd.signal)}
            <span className="text-muted-foreground">MACD:</span>
            <span className="font-medium">{opportunity.technical_signals.macd.strength}</span>
          </div>
        </div>
      </div>

      {/* ESG and Risk Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {opportunity.esg_criteria.is_esg_compliant && (
            <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              ESG
            </Badge>
          )}
          {opportunity.esg_criteria.is_vegan_friendly && (
            <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
              <CheckCircle className="w-3 h-3 mr-1" />
              Vegan
            </Badge>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Volatilidad</p>
          <p className={`text-sm font-medium ${getRiskColor(opportunity.risk_assessment.volatility)}`}>
            {opportunity.risk_assessment.volatility.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Time Info */}
      <div className="flex items-center justify-between mb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Detectada {getTimeAgo(opportunity.detected_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          <span>{opportunity.expected_return.time_horizon_days}d horizonte</span>
        </div>
      </div>

      {/* Market Cap and Volume */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <div>
          <span className="text-muted-foreground">Market Cap: </span>
          <span className="font-medium">{formatMarketCap(opportunity.market_data.market_cap)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Confianza: </span>
          <span className="font-medium">{opportunity.expected_return.confidence_level}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onViewDetails}
          className="flex-1"
        >
          <Eye className="w-4 h-4 mr-2" />
          Detalles
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onViewScore}
          className="flex-1"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Score
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          onClick={onCalculate}
          className="flex-1"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Calcular
        </Button>
      </div>

      {/* Warning if low confidence */}
      {opportunity.expected_return.confidence_level < 60 && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="text-xs text-yellow-700">Confianza baja - Evaluar con cuidado</span>
        </div>
      )}

      {/* High volatility warning */}
      {opportunity.risk_assessment.volatility > 50 && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-xs text-red-700">Alta volatilidad - Mayor riesgo</span>
        </div>
      )}
    </Card>
  )
}