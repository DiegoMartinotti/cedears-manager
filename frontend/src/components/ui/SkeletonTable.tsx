import React from 'react'
import { cn } from '../../utils/cn'
import { LoadingSkeleton } from './LoadingSpinner'

interface SkeletonTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
  rowClassName?: string
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
  rowClassName
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Table container */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        {showHeader && (
          <div className="bg-muted/50 px-6 py-3 border-b border-border">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className="flex-1">
                  <LoadingSkeleton 
                    height={16} 
                    width={`${60 + Math.random() * 40}%`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className={cn('px-6 py-4 animate-pulse', rowClassName)}
            >
              <div className="flex gap-4 items-center">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <div key={colIndex} className="flex-1">
                    <LoadingSkeleton 
                      height={14} 
                      width={`${50 + Math.random() * 50}%`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Skeleton específico para tabla de trades
export const TradeTableSkeleton: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className 
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="bg-muted/50 px-6 py-3 border-b border-border">
          <div className="grid grid-cols-7 gap-4">
            <LoadingSkeleton height={16} width="80%" />  {/* Fecha */}
            <LoadingSkeleton height={16} width="60%" />  {/* Ticker */}
            <LoadingSkeleton height={16} width="40%" />  {/* Tipo */}
            <LoadingSkeleton height={16} width="60%" />  {/* Cantidad */}
            <LoadingSkeleton height={16} width="50%" />  {/* Precio */}
            <LoadingSkeleton height={16} width="70%" />  {/* Total */}
            <LoadingSkeleton height={16} width="80%" />  {/* Comisión */}
          </div>
        </div>
        
        {/* Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="grid grid-cols-7 gap-4 items-center">
                <LoadingSkeleton height={14} width="90%" />
                <div className="flex items-center gap-2">
                  <LoadingSkeleton width={24} height={24} className="rounded" />
                  <LoadingSkeleton height={14} width="60%" />
                </div>
                <LoadingSkeleton height={12} width="50%" />
                <LoadingSkeleton height={14} width="70%" />
                <LoadingSkeleton height={14} width="80%" />
                <LoadingSkeleton height={14} width="90%" />
                <LoadingSkeleton height={14} width="60%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Skeleton para tabla de portafolio
export const PortfolioTableSkeleton: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 8, 
  className 
}) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="bg-muted/50 px-6 py-3 border-b border-border">
          <div className="grid grid-cols-6 gap-4">
            <LoadingSkeleton height={16} width="100%" /> {/* Instrumento */}
            <LoadingSkeleton height={16} width="80%" />  {/* Cantidad */}
            <LoadingSkeleton height={16} width="70%" />  {/* Precio actual */}
            <LoadingSkeleton height={16} width="90%" />  {/* Valor total */}
            <LoadingSkeleton height={16} width="60%" />  {/* Ganancia */}
            <LoadingSkeleton height={16} width="50%" />  {/* % Cartera */}
          </div>
        </div>
        
        {/* Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <LoadingSkeleton width={32} height={32} className="rounded-full" />
                  <div className="space-y-1">
                    <LoadingSkeleton height={14} width={60} />
                    <LoadingSkeleton height={12} width={80} />
                  </div>
                </div>
                <LoadingSkeleton height={14} width="70%" />
                <LoadingSkeleton height={14} width="80%" />
                <LoadingSkeleton height={14} width="90%" />
                <LoadingSkeleton height={14} width="60%" />
                <LoadingSkeleton height={20} width="80%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}