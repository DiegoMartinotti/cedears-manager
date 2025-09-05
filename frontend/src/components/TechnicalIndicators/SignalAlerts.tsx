import { useState } from 'react'
import { useActiveSignals, useForceJobRun } from '../../hooks/useTechnicalIndicators'
import { technicalIndicatorService } from '../../services/technicalIndicatorService'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Alert, AlertDescription } from '../ui/Alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  Target,
  BarChart3
} from 'lucide-react'

interface SignalAlertsProps {
  showFilters?: boolean
  maxSignals?: number
  minStrength?: number
  compact?: boolean
}

export function SignalAlerts({ 
  showFilters = true, 
  maxSignals = 20, 
  minStrength = 0,
  compact = false 
}: SignalAlertsProps) {
  const [filters, setFilters] = useState({
    signals: ['BUY', 'SELL'] as ('BUY' | 'SELL' | 'HOLD')[],
    minStrength: minStrength,
    limit: maxSignals
  })

  const { data: signals, isLoading, error, refetch } = useActiveSignals(filters)
  const forceJobMutation = useForceJobRun()

  const handleForceRefresh = async () => {
    try {
      await forceJobMutation.mutateAsync()
      setTimeout(() => refetch(), 5000) // Refetch after job starts
    } catch (error) {
      console.error('Error forcing job run:', error)
    }
  }

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="w-4 h-4" />
      case 'SELL':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getIndicatorIcon = (indicator: string) => {
    switch (indicator) {
      case 'RSI':
        return <Activity className="w-3 h-3" />
      case 'MACD':
        return <BarChart3 className="w-3 h-3" />
      case 'SMA':
      case 'EMA':
        return <TrendingUp className="w-3 h-3" />
      case 'BB':
        return <Target className="w-3 h-3" />
      default:
        return <Activity className="w-3 h-3" />
    }
  }

  const getSignalColorClass = (signal: string) => {
    return technicalIndicatorService.getSignalColor(signal)
  }

  const formatValue = (indicator: any) => {
    return technicalIndicatorService.formatIndicatorValue(indicator)
  }

  const toggleSignalFilter = (signal: 'BUY' | 'SELL' | 'HOLD') => {
    setFilters(prev => ({
      ...prev,
      signals: prev.signals.includes(signal)
        ? prev.signals.filter(s => s !== signal)
        : [...prev.signals, signal]
    }))
  }

  const groupedSignals = signals?.reduce((acc, signal) => {
    if (!acc[signal.symbol]) {
      acc[signal.symbol] = []
    }
    acc[signal.symbol].push(signal)
    return acc
  }, {} as Record<string, typeof signals>)

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
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
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading signals. Please try again.
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-semibold flex items-center gap-2 ${compact ? 'text-sm' : 'text-lg'}`}>
          <AlertTriangle className="w-5 h-5" />
          Active Signals
          {signals && signals.length > 0 && (
            <Badge variant="secondary">{signals.length}</Badge>
          )}
        </h3>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleForceRefresh}
            disabled={forceJobMutation.isPending}
          >
            {forceJobMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && !compact && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {(['BUY', 'SELL', 'HOLD'] as const).map(signal => (
              <Button
                key={signal}
                variant={filters.signals.includes(signal) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSignalFilter(signal)}
                className="flex items-center gap-1"
              >
                {getSignalIcon(signal)}
                {signal}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Min Strength:</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minStrength}
              onChange={(e) => setFilters(prev => ({ ...prev, minStrength: Number(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-12">{filters.minStrength}%</span>
          </div>
        </div>
      )}

      {/* Lista de señales */}
      {!signals || signals.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No active signals found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try adjusting filters or force refresh data
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedSignals || {}).map(([symbol, symbolSignals]) => (
            <div key={symbol} className="border border-gray-200 rounded-lg p-3">
              <div className="font-semibold text-gray-800 mb-2 flex items-center justify-between">
                <span>{symbol}</span>
                <Badge variant="outline" className="text-xs">
                  {symbolSignals.length} signal{symbolSignals.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {symbolSignals.map((signal, index) => (
                  <div key={`${signal.indicator}-${index}`} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="text-gray-400">
                        {getIndicatorIcon(signal.indicator)}
                      </div>
                      <div className={compact ? 'text-sm' : ''}>
                        <span className="font-medium">{signal.indicator}</span>
                        {signal.period && (
                          <span className="text-xs text-gray-500 ml-1">({signal.period})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`text-right ${compact ? 'text-sm' : ''}`}>
                        <div className="font-mono text-sm">
                          {formatValue(signal)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {signal.strength}% strength
                        </div>
                      </div>

                      <Badge 
                        variant="secondary" 
                        className={`${getSignalColorClass(signal.signal)} flex items-center gap-1`}
                      >
                        {getSignalIcon(signal.signal)}
                        {signal.signal}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                Last update: {new Date(symbolSignals[0]?.timestamp || '').toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen estadístico */}
      {signals && signals.length > 0 && !compact && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm font-semibold text-green-600">
                {signals.filter(s => s.signal === 'BUY').length}
              </div>
              <div className="text-xs text-gray-500">BUY signals</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-red-600">
                {signals.filter(s => s.signal === 'SELL').length}
              </div>
              <div className="text-xs text-gray-500">SELL signals</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">
                {Math.round(signals.reduce((sum, s) => sum + s.strength, 0) / signals.length)}%
              </div>
              <div className="text-xs text-gray-500">Avg strength</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}