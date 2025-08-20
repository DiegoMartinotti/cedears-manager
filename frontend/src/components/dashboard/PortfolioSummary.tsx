import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { usePortfolioSummary } from '../../hooks/useDashboard'
import type { PortfolioSummary as PortfolioSummaryType } from '../../../../shared/src/types'

interface PortfolioSummaryProps {
  data?: PortfolioSummaryType
  isLoading?: boolean
  showInflationAdjusted?: boolean
}

interface SummaryCardProps {
  title: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'positive' | 'negative' | 'neutral'
  isLoading?: boolean
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  variant = 'default',
  isLoading = false 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'neutral':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
        <div className="h-6 bg-gray-300 rounded w-24 mb-1"></div>
        <div className="h-3 bg-gray-300 rounded w-16"></div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg border ${getVariantStyles()}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">
        {title}
      </div>
      <div className="text-2xl font-bold mb-1">
        {typeof value === 'number' ? formatCurrency(value) : value}
      </div>
      {subtitle && (
        <div className="text-xs opacity-75">
          {subtitle}
        </div>
      )}
    </div>
  )
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

const getPercentageVariant = (value: number): 'positive' | 'negative' | 'neutral' => {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ 
  data: propData, 
  isLoading: propIsLoading,
  showInflationAdjusted = true 
}) => {
  const query = usePortfolioSummary({ enabled: !propData })
  
  const data = propData || query.data
  const isLoading = propIsLoading ?? query.isLoading
  const error = query.error

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error al cargar resumen</h3>
          <p className="text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Resumen del Portfolio
        </h2>
        <Badge variant="outline">
          {data?.totalPositions || 0} posiciones
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Valor Total"
          value={data?.totalValue || 0}
          subtitle="Valor de mercado actual"
          variant="default"
          isLoading={isLoading}
        />
        
        <SummaryCard
          title="Costo Total"
          value={data?.totalCost || 0}
          subtitle="Inversión total realizada"
          variant="neutral"
          isLoading={isLoading}
        />
        
        <SummaryCard
          title="Ganancia/Pérdida"
          value={data?.unrealizedPnL || 0}
          subtitle={data ? formatPercentage(data.unrealizedPnLPercentage) : '0%'}
          variant={data ? getPercentageVariant(data.unrealizedPnL) : 'neutral'}
          isLoading={isLoading}
        />
        
        <SummaryCard
          title="Cambio del Día"
          value={data?.dayChange || 0}
          subtitle={data ? formatPercentage(data.dayChangePercentage) : '0%'}
          variant={data ? getPercentageVariant(data.dayChange) : 'neutral'}
          isLoading={isLoading}
        />
      </div>

      {/* Métricas ajustadas por inflación */}
      {showInflationAdjusted && data?.inflationAdjustedValue && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Ajustado por Inflación (UVA)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard
              title="Valor Ajustado"
              value={data.inflationAdjustedValue}
              subtitle="Valor corregido por inflación"
              variant="neutral"
              isLoading={isLoading}
            />
            
            {data.inflationAdjustedReturn !== undefined && (
              <SummaryCard
                title="Retorno Real"
                value={formatPercentage(data.inflationAdjustedReturn)}
                subtitle="Ganancia descontando inflación"
                variant={getPercentageVariant(data.inflationAdjustedReturn)}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* Métricas de comisiones */}
      {data && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Impacto de Comisiones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              title="Comisiones Pagadas"
              value={data.totalCommissions || 0}
              subtitle="Total en operaciones"
              variant="negative"
              isLoading={isLoading}
            />
            
            <SummaryCard
              title="Custodia Estimada"
              value={data.estimatedCustodyFee || 0}
              subtitle="Mensual proyectada"
              variant="negative"
              isLoading={isLoading}
            />
            
            <SummaryCard
              title="Rentabilidad Neta"
              value={formatPercentage((data.unrealizedPnLPercentage || 0) - (data.commissionImpact || 0))}
              subtitle="Después de comisiones"
              variant={getPercentageVariant((data.unrealizedPnLPercentage || 0) - (data.commissionImpact || 0))}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Indicadores de rendimiento */}
      {data && !isLoading && (
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Última actualización: {new Date().toLocaleTimeString('es-AR')}
            </span>
            
            <div className="flex space-x-2">
              {data.unrealizedPnLPercentage > 10 && (
                <Badge variant="success">Excelente rendimiento</Badge>
              )}
              {data.unrealizedPnLPercentage > 0 && data.unrealizedPnLPercentage <= 10 && (
                <Badge variant="default">Rendimiento positivo</Badge>
              )}
              {data.unrealizedPnLPercentage < 0 && (
                <Badge variant="destructive">Necesita atención</Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}