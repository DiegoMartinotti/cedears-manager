import { useState } from 'react'
import { useLatestIndicators, useCalculateIndicators } from '../../hooks/useTechnicalIndicators'
import { technicalIndicatorService } from '../../services/technicalIndicatorService'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, Target, BarChart3 } from 'lucide-react'
import type { TechnicalIndicator } from '../../../../shared/src/types'

interface TechnicalIndicatorsListProps {
  symbol: string
  showCalculateButton?: boolean
  compact?: boolean
}

interface IndicatorWithExtras extends TechnicalIndicator {
  period?: number
  metadata?: Record<string, unknown>
}

export function TechnicalIndicatorsList({
  symbol,
  showCalculateButton = true,
  compact = false
}: TechnicalIndicatorsListProps) {
  const [calculating, setCalculating] = useState(false)
  const { data, isLoading, error, refetch } = useLatestIndicators(symbol)
  const indicators: IndicatorWithExtras[] = (data || []) as IndicatorWithExtras[]
  const calculateMutation = useCalculateIndicators()

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      await calculateMutation.mutateAsync({ symbol })
      setTimeout(() => refetch(), 2000) // Refetch after calculation
    } catch (error) {
      console.error('Error calculating indicators:', error)
    } finally {
      setCalculating(false)
    }
  }

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="w-4 h-4" />
      case 'SELL':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  const getIndicatorIcon = (indicator: string) => {
    switch (indicator) {
      case 'RSI':
        return <Activity className="w-4 h-4" />
      case 'MACD':
        return <BarChart3 className="w-4 h-4" />
      case 'SMA':
      case 'EMA':
        return <TrendingUp className="w-4 h-4" />
      case 'BB':
        return <Target className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const formatValue = (indicator: any) => {
    return technicalIndicatorService.formatIndicatorValue(indicator)
  }

  const getSignalColorClass = (signal: string) => {
    return technicalIndicatorService.getSignalColor(signal)
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading technical indicators</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  if (!indicators || indicators.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No technical indicators available for {symbol}</p>
          {showCalculateButton && (
            <Button 
              onClick={handleCalculate} 
              disabled={calculating}
              size="sm"
            >
              {calculating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Calculate Indicators
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const lastUpdate = new Date(indicators[0]?.timestamp || '').toLocaleString()

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-semibold flex items-center gap-2 ${compact ? 'text-sm' : 'text-lg'}`}>
          <Activity className="w-5 h-5" />
          Technical Indicators
          {!compact && <span className="text-sm text-gray-500">({symbol})</span>}
        </h3>
        
        <div className="flex gap-2">
          {showCalculateButton && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCalculate}
              disabled={calculating}
            >
              {calculating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {indicators.map((indicator, index) => (
          <div key={`${indicator.indicator}-${index}`} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="text-gray-400">
                {getIndicatorIcon(indicator.indicator)}
              </div>
              <div>
                <div className={`font-medium ${compact ? 'text-sm' : ''}`}>
                  {indicator.indicator}
                  {indicator.period && <span className="text-xs text-gray-500">({indicator.period})</span>}
                </div>
                {!compact && (
                  <div className="text-xs text-gray-500">
                    {technicalIndicatorService.getIndicatorDescription(indicator.indicator)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`text-right ${compact ? 'text-sm' : ''}`}>
                <div className="font-mono font-semibold">
                  {formatValue(indicator)}
                </div>
                {!compact && (
                  <div className="text-xs text-gray-500">
                    Strength: {indicator.strength}%
                  </div>
                )}
              </div>

              <Badge variant="secondary" className={`${getSignalColorClass(indicator.signal)} flex items-center gap-1`}>
                {getSignalIcon(indicator.signal)}
                {indicator.signal}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Last updated: {lastUpdate}
          </div>
        </div>
      )}

      {/* Metadata expandida para indicadores específicos */}
      {!compact && indicators.some(i => i.metadata) && (
        <div className="mt-4 space-y-2">
          {indicators.filter(i => i.metadata && Object.keys(i.metadata).length > 0).map((indicator, index) => (
            <details key={`${indicator.indicator}-details-${index}`} className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                {indicator.indicator} Details
              </summary>
              <div className="mt-2 pl-4 space-y-1">
                {Object.entries(indicator.metadata || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500">{key}:</span>
                    <span className="font-mono">
                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  )
}
