import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card } from './Card'
import { Button } from './Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="p-6 m-4">
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Algo salió mal
            </h2>
            <p className="text-gray-600 mb-4">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <details className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="text-sm text-red-600 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <div className="mt-6 space-x-4">
              <Button
                onClick={() => window.location.reload()}
                variant="default"
              >
                Recargar página
              </Button>
              <Button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                variant="outline"
              >
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </Card>
      )
    }

    return this.props.children
  }
}

// Hook para manejo de errores en componentes funcionales
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = () => setError(null)

  const handleError = React.useCallback((error: Error) => {
    // eslint-disable-next-line no-console
    console.error('Error handled:', error)
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { handleError, resetError, error }
}