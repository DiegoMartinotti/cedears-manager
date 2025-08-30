import React from 'react'
import { cn } from '../../utils/cn'
import { LoadingSkeleton } from './LoadingSpinner'

interface SkeletonCardProps {
  className?: string
  showHeader?: boolean
  showFooter?: boolean
  lines?: number
  animated?: boolean
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className,
  showHeader = true,
  showFooter = false,
  lines = 3,
  animated = true
}) => {
  return (
    <div className={cn(
      'p-6 border border-border rounded-lg bg-card',
      animated && 'animate-pulse',
      className
    )}>
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <LoadingSkeleton width={40} height={40} className="rounded-full" />
          <div className="space-y-2 flex-1">
            <LoadingSkeleton height={20} width="60%" />
            <LoadingSkeleton height={16} width="40%" />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <LoadingSkeleton
            key={i}
            height={16}
            width={i === lines - 1 ? '80%' : '100%'}
          />
        ))}
      </div>
      
      {showFooter && (
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
          <LoadingSkeleton height={32} width={80} />
          <LoadingSkeleton height={32} width={100} />
        </div>
      )}
    </div>
  )
}

// Skeleton específico para instrumentos financieros
export const InstrumentSkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-4 border border-border rounded-lg bg-card animate-pulse', className)}>
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2">
          <LoadingSkeleton height={20} width={80} /> {/* Ticker */}
          <LoadingSkeleton height={16} width={120} /> {/* Name */}
        </div>
        <div className="text-right space-y-2">
          <LoadingSkeleton height={20} width={60} /> {/* Price */}
          <LoadingSkeleton height={16} width={40} /> {/* Change % */}
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <LoadingSkeleton height={14} width={60} /> {/* Volume */}
        <LoadingSkeleton height={14} width={80} /> {/* Market cap */}
      </div>
    </div>
  )
}

// Skeleton para métricas del dashboard
export const DashboardMetricSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-6 bg-card border border-border rounded-lg animate-pulse', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton height={14} width={100} /> {/* Label */}
          <LoadingSkeleton height={32} width={80} />  {/* Value */}
        </div>
        <LoadingSkeleton width={48} height={48} className="rounded-lg" /> {/* Icon */}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <LoadingSkeleton height={14} width={60} /> {/* Change indicator */}
          <LoadingSkeleton height={14} width={80} /> {/* Description */}
        </div>
      </div>
    </div>
  )
}

// Skeleton para lista de oportunidades
export const OpportunitySkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('p-4 border border-border rounded-lg bg-card animate-pulse', className)}>
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2 flex-1">
          <LoadingSkeleton height={18} width={100} /> {/* Ticker */}
          <LoadingSkeleton height={14} width={200} /> {/* Description */}
        </div>
        <div className="space-y-2 text-right">
          <LoadingSkeleton height={24} width={60} /> {/* Score */}
          <LoadingSkeleton height={14} width={80} /> {/* Potential */}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="space-y-1">
          <LoadingSkeleton height={12} width="100%" />
          <LoadingSkeleton height={16} width="80%" />
        </div>
        <div className="space-y-1">
          <LoadingSkeleton height={12} width="100%" />
          <LoadingSkeleton height={16} width="80%" />
        </div>
        <div className="space-y-1">
          <LoadingSkeleton height={12} width="100%" />
          <LoadingSkeleton height={16} width="80%" />
        </div>
      </div>
    </div>
  )
}