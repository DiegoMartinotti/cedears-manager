import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp, TrendingDown, Target } from 'lucide-react'

interface BreakEvenChartProps {
  analysis: {
    break_even_price: number
    current_price: number
    purchase_price: number
    distance_percentage: number
  }
  projections?: Array<{
    months_ahead: number
    projected_break_even: number
    scenario_type: string
    scenario_name?: string
    probability?: number
  }>
  priceHistory?: Array<{
    date: string
    price: number
  }>
  className?: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm text-gray-600 mb-1">{`Mes: ${label}`}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {`${entry.name}: $${entry.value?.toFixed(2)}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function BreakEvenChart({ analysis, projections = [], priceHistory = [], className = '' }: BreakEvenChartProps) {
  // Preparar datos para el gráfico
  const chartData = []
  
  // Punto actual (mes 0)
  chartData.push({
    month: 0,
    current_price: analysis.current_price,
    break_even_base: analysis.break_even_price,
    break_even_optimistic: analysis.break_even_price,
    break_even_pessimistic: analysis.break_even_price,
    purchase_price: analysis.purchase_price
  })

  // Agregar proyecciones
  const groupedProjections = projections.reduce((acc, proj) => {
    if (!acc[proj.months_ahead]) {
      acc[proj.months_ahead] = {}
    }
    acc[proj.months_ahead][proj.scenario_type.toLowerCase()] = proj.projected_break_even
    return acc
  }, {} as Record<number, Record<string, number>>)

  Object.entries(groupedProjections).forEach(([month, scenarios]) => {
    chartData.push({
      month: parseInt(month),
      break_even_base: scenarios.base || analysis.break_even_price,
      break_even_optimistic: scenarios.optimistic || analysis.break_even_price,
      break_even_pessimistic: scenarios.pessimistic || analysis.break_even_price,
      purchase_price: analysis.purchase_price,
      current_price: month === '0' ? analysis.current_price : undefined
    })
  })

  // Ordenar por meses
  chartData.sort((a, b) => a.month - b.month)

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`

  const getStatusIcon = () => {
    if (analysis.distance_percentage > 5) return <TrendingUp className="w-5 h-5 text-green-600" />
    if (analysis.distance_percentage > 0) return <Target className="w-5 h-5 text-yellow-600" />
    return <TrendingDown className="w-5 h-5 text-red-600" />
  }

  const getStatusColor = () => {
    if (analysis.distance_percentage > 5) return 'text-green-600 bg-green-50 border-green-200'
    if (analysis.distance_percentage > 0) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getStatusMessage = () => {
    if (analysis.distance_percentage > 10) return 'Muy por encima del break-even'
    if (analysis.distance_percentage > 5) return 'Por encima del break-even'
    if (analysis.distance_percentage > 0) return 'Cerca del break-even'
    if (analysis.distance_percentage > -5) return 'Por debajo del break-even'
    return 'Muy por debajo del break-even'
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Evolución del Break-Even</h3>
          
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusMessage()}</span>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-600 mb-1">Precio Compra</div>
            <div className="text-lg font-bold text-blue-900">${analysis.purchase_price.toFixed(2)}</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-600 mb-1">Break-Even Actual</div>
            <div className="text-lg font-bold text-purple-900">${analysis.break_even_price.toFixed(2)}</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Precio Actual</div>
            <div className="text-lg font-bold text-gray-900">${analysis.current_price?.toFixed(2) || 'N/A'}</div>
          </div>
          
          <div className={`rounded-lg p-3 ${analysis.distance_percentage >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`text-xs mb-1 ${analysis.distance_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Distancia
            </div>
            <div className={`text-lg font-bold ${analysis.distance_percentage >= 0 ? 'text-green-900' : 'text-red-900'}`}>
              {analysis.distance_percentage >= 0 ? '+' : ''}{analysis.distance_percentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(value) => `${value}m`}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Precio de compra - línea de referencia */}
              <ReferenceLine 
                y={analysis.purchase_price} 
                stroke="#3b82f6" 
                strokeDasharray="5 5" 
                label={{ value: "Precio Compra", position: "insideTopLeft" }}
              />
              
              {/* Precio actual - punto */}
              {analysis.current_price && (
                <ReferenceLine 
                  y={analysis.current_price} 
                  stroke="#6b7280" 
                  strokeWidth={2}
                  label={{ value: "Precio Actual", position: "insideTopRight" }}
                />
              )}
              
              {/* Líneas de break-even proyectado */}
              <Line 
                type="monotone" 
                dataKey="break_even_optimistic" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="8 4"
                name="Break-Even (Optimista)"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
              
              <Line 
                type="monotone" 
                dataKey="break_even_base" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                name="Break-Even (Base)"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                connectNulls={false}
              />
              
              <Line 
                type="monotone" 
                dataKey="break_even_pessimistic" 
                stroke="#ef4444" 
                strokeWidth={2}
                strokeDasharray="8 4"
                name="Break-Even (Pesimista)"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda explicativa */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500 rounded"></div>
            <span className="text-gray-600">
              <span className="font-medium text-green-700">Optimista:</span> Inflación menor a la esperada
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-500 rounded"></div>
            <span className="text-gray-600">
              <span className="font-medium text-purple-700">Base:</span> Inflación según expectativas
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 rounded"></div>
            <span className="text-gray-600">
              <span className="font-medium text-red-700">Pesimista:</span> Inflación mayor a la esperada
            </span>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">¿Cómo interpretar este gráfico?</div>
              <p>
                Las líneas muestran cómo evoluciona tu precio break-even a lo largo del tiempo considerando 
                inflación y costos acumulados. Si el precio actual está por encima de la línea, estás en ganancia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}