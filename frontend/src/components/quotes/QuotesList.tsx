import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react'

export interface WatchlistQuote {
  id?: number
  instrument_id: number
  price: number
  volume?: number
  high?: number
  low?: number
  close?: number
  quote_date: string
  quote_time?: string
  source?: string
  created_at?: string
  instrument?: {
    id: number
    symbol: string
    company_name: string
    sector?: string
    underlying_symbol?: string
  }
}

export interface QuotesListProps {
  quotes: WatchlistQuote[]
  loading?: boolean
  error?: string
  onRefresh?: () => void
  onSymbolClick?: (symbol: string) => void
  showCompanyName?: boolean
  showSector?: boolean
  showLastUpdate?: boolean
  refreshInterval?: number
}

export const QuotesList: React.FC<QuotesListProps> = ({
  quotes,
  loading = false,
  error,
  onRefresh,
  onSymbolClick,
  showCompanyName = true,
  showSector = false,
  showLastUpdate = true,
  refreshInterval = 30000 // 30 segundos por defecto
}) => {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return

    const interval = setInterval(() => {
      onRefresh()
      setLastRefresh(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, onRefresh, refreshInterval])

  // Actualizar timestamp cuando se refresca
  useEffect(() => {
    if (!loading && quotes.length > 0) {
      setLastRefresh(new Date())
    }
  }, [loading, quotes])

  // Función para determinar el color del cambio de precio
  const getPriceChangeColor = (price?: number, previousClose?: number) => {
    if (!price || !previousClose) return 'text-gray-600'
    
    if (price > previousClose) return 'text-green-600'
    if (price < previousClose) return 'text-red-600'
    return 'text-gray-600'
  }

  // Función para formatear el volumen
  const formatVolume = (volume?: number) => {
    if (!volume) return '-'
    
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toLocaleString()
  }

  // Función para determinar si el mercado está activo
  const isMarketActive = () => {
    const now = new Date()
    const hours = now.getHours()
    const day = now.getDay()
    
    // Aproximación: NYSE horario 9:30-16:00 ET, lun-vie
    return day >= 1 && day <= 5 && hours >= 9 && hours <= 16
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error al cargar cotizaciones</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">
            Cotizaciones en Tiempo Real
          </h3>
          {isMarketActive() && (
            <Badge variant="success" className="flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              Mercado Activo
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {showLastUpdate && lastRefresh && (
            <span className="text-sm text-gray-500">
              Actualizado: {format(lastRefresh, 'HH:mm:ss')}
            </span>
          )}
          
          {onRefresh && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </Button>
              
              <Button
                onClick={() => {
                  onRefresh()
                  setLastRefresh(new Date())
                }}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && quotes.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Cargando cotizaciones...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && quotes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">Sin cotizaciones disponibles</div>
          <div className="text-gray-400 text-sm">Agrega instrumentos a tu watchlist</div>
        </div>
      )}

      {/* Quotes list */}
      {quotes.length > 0 && (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
            <div className="col-span-3">Símbolo</div>
            <div className="col-span-2 text-right">Precio</div>
            <div className="col-span-2 text-right">Cambio</div>
            <div className="col-span-2 text-right">Volumen</div>
            <div className="col-span-2 text-right">Máx/Mín</div>
            <div className="col-span-1 text-center">Fuente</div>
          </div>

          {/* Quote rows */}
          {quotes.map((quote) => {
            const symbol = quote.instrument?.symbol || 'N/A'
            const companyName = quote.instrument?.company_name || ''
            const sector = quote.instrument?.sector || ''
            
            return (
              <div
                key={`${quote.instrument_id}-${quote.id}`}
                className="grid grid-cols-12 gap-4 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onSymbolClick?.(symbol)}
              >
                {/* Símbolo y empresa */}
                <div className="col-span-3">
                  <div className="font-semibold text-gray-900">{symbol}</div>
                  {showCompanyName && companyName && (
                    <div className="text-sm text-gray-600 truncate">{companyName}</div>
                  )}
                  {showSector && sector && (
                    <Badge variant="secondary" className="text-xs mt-1">
                      {sector}
                    </Badge>
                  )}
                </div>

                {/* Precio */}
                <div className="col-span-2 text-right">
                  <div className="font-semibold text-gray-900">
                    ${quote.price.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(new Date(`${quote.quote_date}T${quote.quote_time || '00:00:00'}`), 'HH:mm')}
                  </div>
                </div>

                {/* Cambio */}
                <div className="col-span-2 text-right">
                  {quote.close && quote.price !== quote.close ? (
                    <div className={`flex items-center justify-end ${getPriceChangeColor(quote.price, quote.close)}`}>
                      {quote.price > quote.close ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      <div>
                        <div className="font-medium">
                          {((quote.price - quote.close) / quote.close * 100).toFixed(2)}%
                        </div>
                        <div className="text-sm">
                          {quote.price > quote.close ? '+' : ''}
                          {(quote.price - quote.close).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">-</div>
                  )}
                </div>

                {/* Volumen */}
                <div className="col-span-2 text-right">
                  <div className="font-medium text-gray-900">
                    {formatVolume(quote.volume)}
                  </div>
                </div>

                {/* Máximo/Mínimo */}
                <div className="col-span-2 text-right">
                  {quote.high && quote.low ? (
                    <div className="text-sm">
                      <div className="text-green-600">${quote.high.toFixed(2)}</div>
                      <div className="text-red-600">${quote.low.toFixed(2)}</div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">-</div>
                  )}
                </div>

                {/* Fuente */}
                <div className="col-span-1 text-center">
                  <Badge variant="outline" className="text-xs">
                    {quote.source === 'yahoo_finance' ? 'YF' : quote.source?.toUpperCase() || 'N/A'}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>
            {quotes.length} {quotes.length === 1 ? 'instrumento' : 'instrumentos'}
          </span>
          <span>Datos diferidos 15-20 min</span>
        </div>
      </div>
    </Card>
  )
}