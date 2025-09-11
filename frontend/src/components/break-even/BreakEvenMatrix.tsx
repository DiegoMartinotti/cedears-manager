import { useState } from 'react'
import { Grid3X3, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { useBreakEvenMatrix } from '../../hooks/useBreakEven'

interface BreakEvenMatrixProps {
  instrumentId: number
  purchasePrice: number
  quantity: number
  className?: string
}

export default function BreakEvenMatrix({ instrumentId, purchasePrice, quantity, className = '' }: BreakEvenMatrixProps) {
  const [inflationRates] = useState([0.08, 0.12, 0.16, 0.20, 0.25]) // 8%, 12%, 16%, 20%, 25%
  const [timeHorizons] = useState([3, 6, 12, 18, 24, 36]) // meses

  const { data, isLoading, error } = useBreakEvenMatrix({
    instrumentId,
    purchasePrice,
    quantity,
    inflationRates,
    timeHorizons
  }, {
    enabled: !!(instrumentId && purchasePrice && quantity)
  })

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Grid3X3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Matriz de Sensibilidad</h3>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Grid3X3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Matriz de Sensibilidad</h3>
          </div>
          <div className="flex items-center justify-center h-64 text-red-600">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Error al cargar la matriz</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.matrix) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Grid3X3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Matriz de Sensibilidad</h3>
          </div>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay datos disponibles</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Organizar datos en matriz
  const matrixData = data.matrix.reduce((acc, item) => {
    if (!acc[item.inflationRate]) {
      acc[item.inflationRate] = {}
    }
    acc[item.inflationRate][item.timeHorizon] = item
    return acc
  }, {} as Record<number, Record<number, typeof data.matrix[0]>>)

  const getCellColor = (breakEvenPrice: number) => {
    const percentageAbovePurchase = ((breakEvenPrice - purchasePrice) / purchasePrice) * 100
    
    if (percentageAbovePurchase <= 5) return 'bg-green-100 text-green-800'
    if (percentageAbovePurchase <= 15) return 'bg-yellow-100 text-yellow-800'
    if (percentageAbovePurchase <= 25) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const getCellIcon = (breakEvenPrice: number) => {
    const percentageAbovePurchase = ((breakEvenPrice - purchasePrice) / purchasePrice) * 100
    
    if (percentageAbovePurchase <= 15) {
      return <TrendingUp className="w-3 h-3" />
    }
    return <TrendingDown className="w-3 h-3" />
  }

  const formatPercentage = (rate: number) => `${(rate * 100).toFixed(0)}%`

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Matriz de Sensibilidad</h3>
          </div>
          
          <div className="text-sm text-gray-600">
            Precio compra: <span className="font-medium">${purchasePrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">¿Cómo leer esta matriz?</div>
              <p>
                Cada celda muestra el precio break-even según diferentes escenarios de inflación y tiempo.
                Los colores indican qué tan favorable es cada escenario comparado con tu precio de compra.
              </p>
            </div>
          </div>
        </div>

        {/* Matriz */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left font-medium text-gray-700 border-b">
                  Inflación / Tiempo
                </th>
                {timeHorizons.map(months => (
                  <th key={months} className="p-3 text-center font-medium text-gray-700 border-b">
                    {months} {months === 1 ? 'mes' : 'meses'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inflationRates.map(rate => (
                <tr key={rate} className="hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-700 border-b bg-gray-50">
                    {formatPercentage(rate)}
                  </td>
                  {timeHorizons.map(months => {
                    const cellData = matrixData[rate]?.[months]
                    
                    if (!cellData) {
                      return (
                        <td key={months} className="p-3 border-b text-center text-gray-400">
                          N/A
                        </td>
                      )
                    }
                    
                    return (
                      <td 
                        key={months} 
                        className={`p-3 border-b text-center ${getCellColor(cellData.breakEvenPrice)}`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            {getCellIcon(cellData.breakEvenPrice)}
                            <span className="font-medium">
                              ${cellData.breakEvenPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs opacity-75">
                            {((cellData.breakEvenPrice - purchasePrice) / purchasePrice * 100).toFixed(1)}%
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Leyenda */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-100 rounded border"></div>
            <span className="text-gray-600">
              <span className="font-medium text-green-700">Excelente:</span> ≤5% sobre compra
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-yellow-100 rounded border"></div>
            <span className="text-gray-600">
              <span className="font-medium text-yellow-700">Bueno:</span> 5-15% sobre compra
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-orange-100 rounded border"></div>
            <span className="text-gray-600">
              <span className="font-medium text-orange-700">Regular:</span> 15-25% sobre compra
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-100 rounded border"></div>
            <span className="text-gray-600">
              <span className="font-medium text-red-700">Crítico:</span> {'>'}25% sobre compra
            </span>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Insights de la Matriz:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mejor escenario */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Mejor Escenario</span>
              </div>
              <div className="text-xs text-green-700">
                Inflación {formatPercentage(Math.min(...inflationRates))}, 3 meses: Break-even más bajo
              </div>
            </div>

            {/* Peor escenario */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Peor Escenario</span>
              </div>
              <div className="text-xs text-red-700">
                Inflación {formatPercentage(Math.max(...inflationRates))}, 36 meses: Break-even más alto
              </div>
            </div>
          </div>
        </div>

        {/* Recomendación */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Recomendación Estratégica</div>
              <p>
                Considera vender posiciones antes de los 12 meses para minimizar el impacto de la inflación 
                y costos acumulados, especialmente si la inflación supera el 16% anual.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}