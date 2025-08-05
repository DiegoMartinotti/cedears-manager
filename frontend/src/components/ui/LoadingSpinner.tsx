import React from 'react'
import { cn } from '../../utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  children?: React.ReactNode
}

interface LoadingSkeletonProps {
  className?: string
  height?: string | number
  width?: string | number
  rounded?: boolean
}

interface LoadingStateProps {
  isLoading: boolean
  error?: Error | string | null
  children: React.ReactNode
  fallback?: React.ReactNode
  errorFallback?: React.ReactNode
  retryButton?: boolean
  onRetry?: () => void
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className, 
  children 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  return (
    <div className="flex items-center justify-center">
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
          sizeClasses[size],
          className
        )}
      />
      {children && (
        <span className="ml-2 text-gray-600">
          {children}
        </span>
      )}
    </div>
  )
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  height = '1rem',
  width = '100%',
  rounded = true
}) => {
  const heightValue = typeof height === 'number' ? `${height}px` : height
  const widthValue = typeof width === 'number' ? `${width}px` : width

  return (
    <div
      className={cn(
        'animate-pulse bg-gray-300',
        rounded ? 'rounded' : '',
        className
      )}
      style={{
        height: heightValue,
        width: widthValue
      }}
    />
  )
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  children,
  fallback,
  errorFallback,
  retryButton = false,
  onRetry
}) => {
  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>
    }

    const errorMessage = error instanceof Error ? error.message : String(error)

    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 text-4xl mb-4">❌</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error al cargar datos
        </h3>
        <p className="text-gray-600 mb-4 max-w-md">
          {errorMessage}
        </p>
        {retryButton && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        )}
      </div>
    )
  }

  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg">
          Cargando...
        </LoadingSpinner>
      </div>
    )
  }

  return <>{children}</>
}

// Componente para páginas completas
export const PageLoadingState: React.FC<{
  title?: string
  subtitle?: string
}> = ({ 
  title = 'Cargando...', 
  subtitle = 'Por favor espera mientras cargamos los datos' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-8">
      <LoadingSpinner size="xl" />
      <h2 className="mt-4 text-xl font-semibold text-gray-900">
        {title}
      </h2>
      <p className="mt-2 text-gray-600 text-center max-w-md">
        {subtitle}
      </p>
    </div>
  )
}

// Componente para errores de página completa
export const PageErrorState: React.FC<{
  title?: string
  subtitle?: string
  onRetry?: () => void
  showRetry?: boolean
}> = ({
  title = 'Error al cargar',
  subtitle = 'Ha ocurrido un error inesperado. Por favor, intenta de nuevo.',
  onRetry,
  showRetry = true
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-8">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        {title}
      </h2>
      <p className="text-gray-600 text-center max-w-md mb-6">
        {subtitle}
      </p>
      {showRetry && (
        <div className="space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Recargar página
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      )}
    </div>
  )
}