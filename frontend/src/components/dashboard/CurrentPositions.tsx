import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useCurrentPositions } from '../../hooks/useDashboard'
import type { CurrentPosition } from '../../../../shared/src/types'

interface CurrentPositionsProps {
  data?: CurrentPosition[]
  isLoading?: boolean
  limit?: number
  showFilters?: boolean
}

interface PositionRowProps {
  position: CurrentPosition
  onClick?: (position: CurrentPosition) => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

const getPerformanceVariant = (value: number): 'success' | 'destructive' | 'secondary' => {
  if (value > 0) return 'success'
  if (value < 0) return 'destructive'
  return 'secondary'
}

const PositionRow: React.FC<PositionRowProps> = ({ position, onClick }) => {
  return (
    <tr 
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onClick?.(position)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div>
            <div className="font-semibold text-gray-900">{position.symbol}</div>
            <div className="text-sm text-gray-500 truncate max-w-32">
              {position.companyName}
            </div>
          </div>
          <div className="flex space-x-1">
            {position.isESGCompliant && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                ESG
              </Badge>
            )}
            {position.isVeganFriendly && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Vegan
              </Badge>
            )}
          </div>
        </div>
      </td>
      
      <td className="px-4 py-3 text-right">
        <div className="font-medium">{position.quantity.toLocaleString()}</div>
        <div className="text-sm text-gray-500">
          {formatCurrency(position.averageCost)}
        </div>
      </td>
      
      <td className="px-4 py-3 text-right">
        <div className="font-medium">{formatCurrency(position.currentPrice)}</div>
        {position.dayChange !== undefined && position.dayChangePercentage !== undefined && (
          <div className={`text-sm ${position.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(position.dayChangePercentage)}
          </div>
        )}
      </td>
      
      <td className="px-4 py-3 text-right">
        <div className="font-semibold">{formatCurrency(position.marketValue)}</div>
        <div className="text-sm text-gray-500">
          {position.weightPercentage.toFixed(1)}%
        </div>
      </td>
      
      <td className="px-4 py-3 text-right">
        <div className={`font-semibold ${position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(position.unrealizedPnL)}
        </div>
        <Badge variant={getPerformanceVariant(position.unrealizedPnL)} className="text-xs">
          {formatPercentage(position.unrealizedPnLPercentage)}
        </Badge>
      </td>
    </tr>
  )
}

const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {Array.from({ length: 5 }).map((_, index) => (
      <tr key={index}>
        <td className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div>
              <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-300 rounded w-24"></div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="h-4 bg-gray-300 rounded w-12 mb-1 ml-auto"></div>
          <div className="h-3 bg-gray-300 rounded w-16 ml-auto"></div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="h-4 bg-gray-300 rounded w-16 mb-1 ml-auto"></div>
          <div className="h-3 bg-gray-300 rounded w-12 ml-auto"></div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="h-4 bg-gray-300 rounded w-20 mb-1 ml-auto"></div>
          <div className="h-3 bg-gray-300 rounded w-10 ml-auto"></div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="h-4 bg-gray-300 rounded w-16 mb-1 ml-auto"></div>
          <div className="h-5 bg-gray-300 rounded w-12 ml-auto"></div>
        </td>
      </tr>
    ))}
  </div>
)

const EmptyState: React.FC = () => (
  <tr>
    <td colSpan={5} className="px-4 py-12 text-center">
      <div className="text-gray-500">
        <div className="text-4xl mb-2">📈</div>
        <p className="text-lg font-medium mb-1">No tienes posiciones activas</p>
        <p className="text-sm">Comienza invirtiendo en CEDEARs para ver tus posiciones aquí</p>
      </div>
    </td>
  </tr>
)

export const CurrentPositions: React.FC<CurrentPositionsProps> = ({ 
  data: propData, 
  isLoading: propIsLoading,
  limit = 10,
  showFilters = true 
}) => {
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'weight'>('value')
  const [filterESG, setFilterESG] = useState<boolean | null>(null)
  
  const query = useCurrentPositions(limit, { enabled: !propData })
  
  const data = propData || query.data
  const isLoading = propIsLoading ?? query.isLoading
  const error = query.error

  // Aplicar filtros y ordenamiento
  const processedData = React.useMemo(() => {
    if (!data) return []
    
    let filtered = [...data]
    
    // Filtrar por ESG si está activo
    if (filterESG !== null) {
      filtered = filtered.filter(pos => 
        filterESG ? pos.isESGCompliant || pos.isVeganFriendly : 
                   !pos.isESGCompliant && !pos.isVeganFriendly
      )
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'return':
          return b.unrealizedPnLPercentage - a.unrealizedPnLPercentage
        case 'weight':
          return b.weightPercentage - a.weightPercentage
        case 'value':
        default:
          return b.marketValue - a.marketValue
      }
    })
    
    return filtered
  }, [data, sortBy, filterESG])

  const handlePositionClick = (position: CurrentPosition) => {
    // TODO: Implementar navegación al detalle de la posición
    console.log('Clicked position:', position.symbol)
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error al cargar posiciones</h3>
          <p className="text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">
          Posiciones Actuales
        </h2>
        
        {showFilters && (
          <div className="flex flex-wrap gap-2">
            <div className="flex space-x-2">
              <Button
                variant={sortBy === 'value' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('value')}
              >
                Valor
              </Button>
              <Button
                variant={sortBy === 'return' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('return')}
              >
                Rentabilidad
              </Button>
              <Button
                variant={sortBy === 'weight' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('weight')}
              >
                Weight
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant={filterESG === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterESG(filterESG === true ? null : true)}
              >
                ESG/Vegan
              </Button>
              <Button
                variant={filterESG === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterESG(filterESG === false ? null : false)}
              >
                Tradicional
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Instrumento
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Cantidad
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Precio Actual
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Valor de Mercado
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                Ganancia/Pérdida
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <LoadingSkeleton />
            ) : !processedData || processedData.length === 0 ? (
              <EmptyState />
            ) : (
              processedData.map((position) => (
                <PositionRow
                  key={position.id}
                  position={position}
                  onClick={handlePositionClick}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {processedData && processedData.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              Mostrando {processedData.length} de {data?.length || 0} posiciones
            </span>
            <div className="flex space-x-4">
              <span>
                Valor total: {formatCurrency(
                  processedData.reduce((sum, pos) => sum + pos.marketValue, 0)
                )}
              </span>
              <span>
                P&L total: {formatCurrency(
                  processedData.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}