import React from 'react'
import { cn } from '../../utils/cn'
import { LoadingSkeleton } from './LoadingSpinner'

interface SkeletonChartProps {
  height?: number
  width?: string | number
  showLegend?: boolean
  showTitle?: boolean
  type?: 'line' | 'bar' | 'pie' | 'area'
  className?: string
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({
  height = 300,
  width = '100%',
  showLegend = true,
  showTitle = true,
  type = 'line',
  className
}) => {
  const heightValue = typeof height === 'number' ? `${height}px` : height
  const widthValue = typeof width === 'number' ? `${width}px` : width

  return (
    <div className={cn('p-6 bg-card border border-border rounded-lg animate-pulse', className)}>
      {/* Title */}
      {showTitle && (
        <div className="mb-4">
          <LoadingSkeleton height={24} width="40%" />
        </div>
      )}
      
      {/* Chart area */}
      <div 
        className="relative bg-muted/20 rounded-lg flex items-end justify-center overflow-hidden"
        style={{ height: heightValue, width: widthValue }}
      >
        {type === 'line' && <LineChartSkeleton />}
        {type === 'bar' && <BarChartSkeleton />}
        {type === 'pie' && <PieChartSkeleton />}
        {type === 'area' && <AreaChartSkeleton />}
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <LoadingSkeleton width={12} height={12} className="rounded-full" />
              <LoadingSkeleton height={14} width={60} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Skeleton para gráfico de líneas
const LineChartSkeleton: React.FC = () => (
  <div className="w-full h-full p-4 relative">
    {/* Grid lines */}
    <div className="absolute inset-4 border-l border-b border-muted opacity-30" />
    
    {/* Y-axis labels */}
    <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between">
      {Array.from({ length: 5 }).map((_, i) => (
        <LoadingSkeleton key={i} height={10} width={24} />
      ))}
    </div>
    
    {/* X-axis labels */}
    <div className="absolute bottom-0 left-4 right-4 flex justify-between">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingSkeleton key={i} height={10} width={32} />
      ))}
    </div>
    
    {/* Line path */}
    <div className="absolute inset-4">
      <div className="w-full h-full relative">
        <div className="absolute bottom-8 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 rounded" />
        <div className="absolute bottom-12 left-8 w-3/4 h-1 bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 rounded" />
      </div>
    </div>
  </div>
)

// Skeleton para gráfico de barras
const BarChartSkeleton: React.FC = () => (
  <div className="w-full h-full p-4 flex items-end justify-around gap-2">
    {Array.from({ length: 8 }).map((_, i) => {
      const height = 40 + Math.random() * 60
      return (
        <div key={i} className="flex flex-col items-center gap-2">
          <LoadingSkeleton 
            height={`${height}%`} 
            width={24} 
            className="bg-primary/20" 
          />
          <LoadingSkeleton height={10} width={20} />
        </div>
      )
    })}
  </div>
)

// Skeleton para gráfico circular
const PieChartSkeleton: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="relative">
      <LoadingSkeleton 
        width={160} 
        height={160} 
        className="rounded-full bg-gradient-conic from-primary/30 via-secondary/30 to-muted/30" 
      />
      <div className="absolute inset-8">
        <LoadingSkeleton width={96} height={96} className="rounded-full bg-card" />
      </div>
    </div>
  </div>
)

// Skeleton para gráfico de área
const AreaChartSkeleton: React.FC = () => (
  <div className="w-full h-full p-4 relative">
    {/* Grid */}
    <div className="absolute inset-4 border-l border-b border-muted opacity-30" />
    
    {/* Y-axis */}
    <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between">
      {Array.from({ length: 5 }).map((_, i) => (
        <LoadingSkeleton key={i} height={10} width={24} />
      ))}
    </div>
    
    {/* X-axis */}
    <div className="absolute bottom-0 left-4 right-4 flex justify-between">
      {Array.from({ length: 6 }).map((_, i) => (
        <LoadingSkeleton key={i} height={10} width={32} />
      ))}
    </div>
    
    {/* Area fill */}
    <div className="absolute inset-4">
      <div className="w-full h-full relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-primary/20 to-transparent rounded-t-lg" />
        <div className="absolute bottom-0 left-0 w-3/4 h-24 bg-gradient-to-t from-primary/10 to-transparent rounded-t-lg" />
      </div>
    </div>
  </div>
)

// Skeleton específico para métricas de dashboard con mini gráfico
export const MetricChartSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 bg-card border border-border rounded-lg animate-pulse', className)}>
    <div className="flex justify-between items-start mb-3">
      <div className="space-y-2">
        <LoadingSkeleton height={14} width={80} />
        <LoadingSkeleton height={28} width={100} />
      </div>
      <LoadingSkeleton height={40} width={80} className="bg-primary/10" />
    </div>
    
    <div className="flex items-center gap-2">
      <LoadingSkeleton height={12} width={60} />
      <LoadingSkeleton height={12} width={40} />
    </div>
  </div>
)