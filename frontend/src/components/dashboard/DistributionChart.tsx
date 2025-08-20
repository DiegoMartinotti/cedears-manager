import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useDistributionData } from '../../hooks/useDashboard'
import type { DistributionData } from '../../../../shared/src/types'

interface DistributionChartProps {
  data?: DistributionData
  isLoading?: boolean
  height?: number
}

type ViewMode = 'asset' | 'sector' | 'esg'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">
          {data.symbol || data.sector || data.category}
        </p>
        {data.companyName && (
          <p className="text-sm text-gray-600 mb-1">{data.companyName}</p>
        )}
        <p className="text-sm">
          <span className="text-gray-600">Valor: </span>
          <span className="font-medium">
            {new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
              minimumFractionDigits: 0
            }).format(data.value)}
          </span>
        </p>
        <p className="text-sm">
          <span className="text-gray-600">Porcentaje: </span>
          <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </p>
        {data.positionsCount && (
          <p className="text-sm">
            <span className="text-gray-600">Posiciones: </span>
            <span className="font-medium">{data.positionsCount}</span>
          </p>
        )}
      </div>
    )
  }
  return null
}

const LoadingSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div className="animate-pulse">
    <div className="flex justify-center items-center mb-4 space-x-2">
      <div className="h-8 bg-gray-300 rounded w-20"></div>
      <div className="h-8 bg-gray-300 rounded w-20"></div>
      <div className="h-8 bg-gray-300 rounded w-20"></div>
    </div>
    <div 
      className="bg-gray-200 rounded-lg mx-auto"
      style={{ width: '100%', height: height - 100 }}
    ></div>
  </div>
)

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
    <div className="text-4xl mb-2">📊</div>
    <p className="text-lg font-medium mb-1">No hay datos para mostrar</p>
    <p className="text-sm">Agrega posiciones a tu portfolio para ver la distribución</p>
  </div>
)

export const DistributionChart: React.FC<DistributionChartProps> = ({ 
  data: propData, 
  isLoading: propIsLoading,
  height = 400 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('asset')
  const query = useDistributionData({ enabled: !propData })
  
  const data = propData || query.data
  const isLoading = propIsLoading ?? query.isLoading
  const error = query.error

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error al cargar distribución</h3>
          <p className="text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingSkeleton height={height} />
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="p-6">
        <EmptyState />
      </Card>
    )
  }

  const getCurrentData = () => {
    switch (viewMode) {
      case 'asset':
        return data.byAsset.slice(0, 10) // Top 10 assets
      case 'sector':
        return data.bySector
      case 'esg':
        return data.byESGStatus
      default:
        return data.byAsset
    }
  }

  const getCurrentTitle = () => {
    switch (viewMode) {
      case 'asset':
        return 'Distribución por Activo'
      case 'sector':
        return 'Distribución por Sector'
      case 'esg':
        return 'Distribución ESG/Vegana'
      default:
        return 'Distribución'
    }
  }

  const currentData = getCurrentData()
  const hasData = currentData && currentData.length > 0

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">
          {getCurrentTitle()}
        </h2>
        
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'asset' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('asset')}
          >
            Activos
          </Button>
          <Button
            variant={viewMode === 'sector' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('sector')}
          >
            Sectores
          </Button>
          <Button
            variant={viewMode === 'esg' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('esg')}
          >
            ESG
          </Button>
        </div>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={height - 100}>
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={Math.min(height / 4, 120)}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  labelLine={false}
                >
                  {currentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || `hsl(${index * 45}, 70%, 60%)`} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full lg:w-80">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalles</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {currentData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color || `hsl(${index * 45}, 70%, 60%)` }}
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {'symbol' in item ? item.symbol : 
                         'sector' in item ? item.sector : 
                         item.category}
                      </p>
                      {'companyName' in item && item.companyName && (
                        <p className="text-xs text-gray-500">{item.companyName}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {item.percentage.toFixed(1)}%
                    </Badge>
                    {'positionsCount' in item && item.positionsCount && (
                      <p className="text-xs text-gray-500 mt-1">
                        {item.positionsCount} pos.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasData && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              Mostrando {currentData.length} {viewMode === 'asset' ? 'activos' : 'categorías'}
            </span>
            <span>
              Total: {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0
              }).format(currentData.reduce((sum, item) => sum + item.value, 0))}
            </span>
          </div>
        </div>
      )}
    </Card>
  )
}