import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { Card } from '../ui/Card'

export interface QuoteData {
  id?: number
  instrument_id: number
  price: number
  volume?: number
  high?: number
  low?: number
  close?: number
  quote_date: string
  quote_time?: string
  source?: string
  created_at?: string
}

export interface QuoteChartProps {
  data: QuoteData[]
  symbol: string
  height?: number
  chartType?: 'line' | 'area'
  showVolume?: boolean
  timeRange?: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
  onTimeRangeChange?: (range: string) => void
  loading?: boolean
  error?: string
}

interface ChartDataPoint {
  date: string
  price: number
  volume?: number
  high?: number
  low?: number
  close?: number
  timestamp: number
  formattedDate: string
}

const timeRangeOptions = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'Todo' }
]

export const QuoteChart: React.FC<QuoteChartProps> = ({
  data,
  symbol,
  height = 300,
  chartType = 'line',
  timeRange = '1M',
  onTimeRangeChange,
  loading = false,
  error
}) => {
  // Procesar datos para el gráfico
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!data || data.length === 0) return []

    return data
      .map(quote => {
        const timestamp = new Date(`${quote.quote_date}${quote.quote_time ? `T${quote.quote_time}` : ''}`).getTime()
        
        return {
          date: quote.quote_date,
          price: quote.price,
          volume: quote.volume,
          high: quote.high,
          low: quote.low,
          close: quote.close || quote.price,
          timestamp,
          formattedDate: format(parseISO(quote.quote_date), 'dd/MM/yyyy')
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp) // Ordenar por fecha
  }, [data])

  // Calcular métricas del período
  const metrics = useMemo(() => {
    if (chartData.length === 0) return null

    const prices = chartData.map(d => d.price)
    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const highPrice = Math.max(...prices)
    const lowPrice = Math.min(...prices)
    
    const change = lastPrice - firstPrice
    const changePercent = (change / firstPrice) * 100

    return {
      current: lastPrice,
      change,
      changePercent,
      high: highPrice,
      low: lowPrice,
      volume: chartData.reduce((sum, d) => sum + (d.volume || 0), 0)
    }
  }, [chartData])

  // Función para formatear tooltip
  const formatTooltip = (value: any, name: string) => {
    if (name === 'price') {
      return [`$${value.toFixed(2)}`, 'Precio']
    }
    if (name === 'volume') {
      return [value.toLocaleString(), 'Volumen']
    }
    return [value, name]
  }

  // Función para formatear label del tooltip
  const formatTooltipLabel = (label: string) => {
    return `Fecha: ${label}`
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando cotizaciones...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-2">Error al cargar datos</div>
            <div className="text-gray-600 text-sm">{error}</div>
          </div>
        </div>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-2">Sin datos disponibles</div>
            <div className="text-gray-400 text-sm">No hay cotizaciones para {symbol}</div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {/* Header con símbolo y métricas */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{symbol}</h3>
          {metrics && (
            <div className="flex items-center space-x-4 mt-2">
              <div className="text-2xl font-bold text-gray-900">
                ${metrics.current.toFixed(2)}
              </div>
              <div className={`flex items-center ${metrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="text-sm font-medium">
                  {metrics.changePercent >= 0 ? '+' : ''}
                  {metrics.changePercent.toFixed(2)}%
                </span>
                <span className="text-sm ml-1">
                  ({metrics.change >= 0 ? '+' : ''}${metrics.change.toFixed(2)})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selector de rango temporal */}
        {onTimeRangeChange && (
          <div className="flex space-x-1">
            {timeRangeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => onTimeRangeChange(option.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === option.value
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Métricas adicionales */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-sm">
          <div>
            <div className="text-gray-500">Máximo</div>
            <div className="font-semibold">${metrics.high.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">Mínimo</div>
            <div className="font-semibold">${metrics.low.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">Volumen</div>
            <div className="font-semibold">{metrics.volume.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-500">Puntos</div>
            <div className="font-semibold">{chartData.length}</div>
          </div>
        </div>
      )}

      {/* Gráfico */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={formatTooltipLabel}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="#3b82f6"
                fillOpacity={0.1}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={formatTooltipLabel}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer con información adicional */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Fuente: Yahoo Finance</span>
          <span>{chartData.length} puntos de datos</span>
        </div>
      </div>
    </Card>
  )
}