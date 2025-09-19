import { type ReactElement, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useIndicatorHistory, useExtremes } from '../../hooks/useTechnicalIndicators'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { BarChart3, TrendingUp, Activity, Target } from 'lucide-react'

interface TechnicalChartProps {
  symbol: string
  height?: number
  showControls?: boolean
}

type IndicatorType = 'RSI' | 'SMA' | 'EMA' | 'MACD'
type TimeRange = '7D' | '30D' | '90D' | '1Y'

export function TechnicalChart({ symbol, height = 300, showControls = true }: TechnicalChartProps) {
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('RSI')
  const [timeRange, setTimeRange] = useState<TimeRange>('30D')

  const getDaysFromRange = (range: TimeRange): number => {
    switch (range) {
      case '7D': return 7
      case '30D': return 30
      case '90D': return 90
      case '1Y': return 365
      default: return 30
    }
  }

  const { data: indicators, isLoading } = useIndicatorHistory(symbol, {
    indicator: selectedIndicator,
    days: getDaysFromRange(timeRange),
    limit: 100
  })

  const { data: extremes } = useExtremes(symbol)

  const getIndicatorColor = (indicator: IndicatorType): string => {
    switch (indicator) {
      case 'RSI':
        return '#8884d8'
      case 'SMA':
        return '#82ca9d'
      case 'EMA':
        return '#ffc658'
      case 'MACD':
        return '#ff7300'
      default:
        return '#8884d8'
    }
  }

  const getIndicatorIcon = (indicator: IndicatorType) => {
    switch (indicator) {
      case 'RSI':
        return <Activity className="w-4 h-4" />
      case 'SMA':
      case 'EMA':
        return <TrendingUp className="w-4 h-4" />
      case 'MACD':
        return <BarChart3 className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const formatTooltipValue = (value: number, indicator: IndicatorType): string => {
    switch (indicator) {
      case 'RSI':
        return `${value.toFixed(1)}`
      case 'SMA':
      case 'EMA':
        return `$${value.toFixed(2)}`
      case 'MACD':
        return `${value.toFixed(4)}`
      default:
        return value.toFixed(2)
    }
  }

  const chartData = indicators?.map(indicator => ({
    date: new Date(indicator.timestamp).toLocaleDateString(),
    fullDate: indicator.timestamp,
    value: indicator.value,
    signal: indicator.signal,
    strength: indicator.strength
  })) || []

  const renderSignalDot = (props: any): ReactElement<SVGElement> => {
    const { payload, cx = 0, cy = 0 } = props || {}

    const color = payload?.signal === 'BUY'
      ? '#22c55e'
      : payload?.signal === 'SELL'
        ? '#ef4444'
        : '#6b7280'

    return (
      <circle
        cx={cx}
        cy={cy}
        r={payload ? 3 : 0}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    )
  }

  const getReferenceLines = () => {
    if (selectedIndicator === 'RSI') {
      return [
        <ReferenceLine key="rsi-oversold" y={30} stroke="#ef4444" strokeDasharray="5 5" label="Oversold" />,
        <ReferenceLine key="rsi-overbought" y={70} stroke="#ef4444" strokeDasharray="5 5" label="Overbought" />
      ]
    }
    return []
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium">{new Date(data.fullDate).toLocaleDateString()}</p>
          <p className="text-sm">
            <span className="font-medium">{selectedIndicator}:</span> {formatTooltipValue(data.value, selectedIndicator)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`text-xs ${
              data.signal === 'BUY' ? 'text-green-600 bg-green-100' :
              data.signal === 'SELL' ? 'text-red-600 bg-red-100' :
              'text-yellow-600 bg-yellow-100'
            }`}>
              {data.signal}
            </Badge>
            <span className="text-xs text-gray-500">Strength: {data.strength}%</span>
          </div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {getIndicatorIcon(selectedIndicator)}
          {selectedIndicator} Chart
          <span className="text-sm text-gray-500">({symbol})</span>
        </h3>

        {showControls && (
          <div className="flex gap-2">
            {/* Selector de indicador */}
            <div className="flex gap-1">
              {(['RSI', 'SMA', 'EMA', 'MACD'] as IndicatorType[]).map(indicator => (
                <Button
                  key={indicator}
                  variant={selectedIndicator === indicator ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedIndicator(indicator)}
                >
                  {indicator}
                </Button>
              ))}
            </div>

            {/* Selector de tiempo */}
            <div className="flex gap-1">
              {(['7D', '30D', '90D', '1Y'] as TimeRange[]).map(range => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No chart data available</p>
          <p className="text-sm text-gray-500">Technical indicators need to be calculated first</p>
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
                domain={selectedIndicator === 'RSI' ? [0, 100] : ['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {getReferenceLines()}
              
              <Line
                type="monotone"
                dataKey="value"
                stroke={getIndicatorColor(selectedIndicator)}
                strokeWidth={2}
                dot={renderSignalDot}
                activeDot={{ r: 5, stroke: getIndicatorColor(selectedIndicator), strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Info adicional */}
      {extremes && selectedIndicator === 'RSI' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-600" />
              <span className="font-medium">Price Extremes:</span>
            </div>
            <div className="flex gap-4">
              <span>High: <span className="font-mono">${extremes.yearHigh.toFixed(2)}</span></span>
              <span>Low: <span className="font-mono">${extremes.yearLow.toFixed(2)}</span></span>
              <span>Current: <span className="font-mono">${extremes.current.toFixed(2)}</span></span>
            </div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-semibold text-green-600">
                {chartData.filter(d => d.signal === 'BUY').length}
              </div>
              <div className="text-xs text-gray-500">BUY signals</div>
            </div>
            <div>
              <div className="font-semibold text-red-600">
                {chartData.filter(d => d.signal === 'SELL').length}
              </div>
              <div className="text-xs text-gray-500">SELL signals</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600">
                {chartData.length}
              </div>
              <div className="text-xs text-gray-500">Data points</div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}