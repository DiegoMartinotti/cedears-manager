import { useState } from 'react'
import { format } from 'date-fns'
import { Activity, TrendingUp, TrendingDown, RefreshCw, BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { QuotesList } from '@/components/quotes/QuotesList'
import { QuoteChart } from '@/components/quotes/QuoteChart'
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary'
import { DistributionChart } from '@/components/dashboard/DistributionChart'
import { CurrentPositions } from '@/components/dashboard/CurrentPositions'
import { SignalAlerts } from '@/components/TechnicalIndicators/SignalAlerts'
import { TechnicalIndicatorsList } from '@/components/TechnicalIndicators/TechnicalIndicatorsList'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageLoadingState, PageErrorState } from '@/components/ui/LoadingSpinner'
import { useWatchlistQuotes, useMarketHours, useUpdateQuotes, useQuoteChart } from '@/hooks/useQuotes'
import { useInstruments } from '@/hooks/useInstruments'
import { useDashboardData, useRefreshDashboard } from '@/hooks/useDashboard'
import { useSignalsOverview } from '@/hooks/useTechnicalIndicators'

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [chartTimeRange, setChartTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1M')

  // Hooks para datos
  const { data: instruments, isLoading: instrumentsLoading } = useInstruments()
  const watchlistQuotes = useWatchlistQuotes()
  const quotes = watchlistQuotes.data || []
  const quotesLoading = watchlistQuotes.isLoading
  const quotesError = watchlistQuotes.error
  const lastUpdate = watchlistQuotes.lastUpdate || null
  const forceRefresh = () => watchlistQuotes.refetch?.()
  const { data: marketHours } = useMarketHours()
  const updateQuotes = useUpdateQuotes()
  
  // Hooks del dashboard avanzado
  const dashboardData = useDashboardData({ 
    enabled: true,
    refetchInterval: 60000 // 1 minuto
  })
  const refreshDashboard = useRefreshDashboard()
  
  // Hook para señales técnicas
  const { buySignals, sellSignals, totalSignals, isLoading: signalsLoading } = useSignalsOverview()
  
  // Hook para el gráfico del símbolo seleccionado
  const { 
    data: chartData, 
    isLoading: chartLoading, 
    changeTimeRange 
  } = useQuoteChart(
    selectedSymbol || '', 
    chartTimeRange, 
    !!selectedSymbol
  )

  // Calcular métricas del dashboard
  const totalInstruments = instruments?.length || 0
  const totalQuotes = quotes?.length || 0
  const quotesWithPrices = quotes?.filter((q: any) => q.price > 0) || []
  
  // Calcular valor total de cartera (mock - necesitaría datos de portfolio)
  const totalPortfolioValue = quotesWithPrices.reduce((sum: number, quote: any) => sum + quote.price, 0)
  
  // Calcular cambios promedio
  const quotesWithChange = quotesWithPrices.filter((q: any) => q.close && q.price !== q.close)
  const averageChange = quotesWithChange.length > 0 
    ? quotesWithChange.reduce((sum: number, quote: any) => {
        if (quote.close) {
          return sum + ((quote.price - quote.close) / quote.close * 100)
        }
        return sum
      }, 0) / quotesWithChange.length
    : 0

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol)
  }

  const handleTimeRangeChange = (range: string) => {
    const newRange = range as typeof chartTimeRange
    setChartTimeRange(newRange)
    changeTimeRange(newRange)
  }

  const handleRefresh = async () => {
    try {
      // Refrescar cotizaciones
      await updateQuotes.mutateAsync()
      forceRefresh()
      
      // Refrescar dashboard si hay datos
      if (dashboardData.portfolioSummary.data) {
        await refreshDashboard.mutateAsync()
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
  }

  // Estados de loading y error principales
  const isInitialLoading = instrumentsLoading && !instruments
  const hasPortfolioData = dashboardData.portfolioSummary.data
  const hasCriticalError = dashboardData.isError && !hasPortfolioData

  if (isInitialLoading) {
    return (
      <PageLoadingState 
        title="Cargando Dashboard"
        subtitle="Obteniendo datos de instrumentos y cotizaciones..."
      />
    )
  }

  if (hasCriticalError) {
    return (
      <PageErrorState
        title="Error en el Dashboard"
        subtitle="No se pudieron cargar los datos principales del dashboard"
        onRetry={() => {
          forceRefresh()
          dashboardData.summary.refetch()
        }}
      />
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center space-x-3">
          {marketHours && (
            <Badge 
              variant={marketHours.isOpen ? "success" : "secondary"}
              className="flex items-center"
            >
              <Activity className="w-3 h-3 mr-1" />
              {marketHours.isOpen ? 'Mercado Abierto' : 'Mercado Cerrado'}
            </Badge>
          )}
          
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Actualizado: {format(lastUpdate, 'HH:mm:ss')}
            </span>
          )}

          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={updateQuotes.isPending || refreshDashboard.isPending}
          >
            <RefreshCw className={`w-4 h-4 ${(updateQuotes.isPending || refreshDashboard.isPending) ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Instrumentos</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{totalInstruments}</p>
          <p className="text-sm text-gray-500">En watchlist</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Cotizaciones</h3>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">{totalQuotes}</p>
          <p className="text-sm text-gray-500">Actualizadas</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2">
            {averageChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <h3 className="text-lg font-semibold">Cambio Promedio</h3>
          </div>
          <p className={`text-2xl font-bold mt-2 ${averageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {averageChange >= 0 ? '+' : ''}{averageChange.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-500">Hoy</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Valor Total</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            ${totalPortfolioValue.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">Mock - Suma de precios</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Señales Técnicas</h3>
          </div>
          <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-2xl font-bold text-orange-600">{totalSignals}</p>
            {signalsLoading && <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>}
          </div>
          <div className="flex space-x-2 text-xs mt-1">
            <span className="text-green-600">BUY: {buySignals.length}</span>
            <span className="text-red-600">SELL: {sellSignals.length}</span>
          </div>
        </Card>
      </div>

      {/* Señales Técnicas Activas */}
      {totalSignals > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ErrorBoundary fallback={
            <Card className="p-6">
              <div className="text-center text-red-600">
                <h3 className="text-lg font-semibold mb-2">Error en señales técnicas</h3>
                <p className="text-sm">No se pudieron cargar las señales técnicas</p>
              </div>
            </Card>
          }>
            <SignalAlerts 
              showFilters={false}
              maxSignals={10}
              minStrength={60}
              compact={true}
            />
          </ErrorBoundary>
          
          {selectedSymbol && (
            <ErrorBoundary fallback={
              <Card className="p-6">
                <div className="text-center text-red-600">
                  <h3 className="text-lg font-semibold mb-2">Error en indicadores</h3>
                  <p className="text-sm">No se pudieron cargar los indicadores técnicos</p>
                </div>
              </Card>
            }>
              <TechnicalIndicatorsList 
                symbol={selectedSymbol}
                showCalculateButton={true}
                compact={true}
              />
            </ErrorBoundary>
          )}
        </div>
      )}

      {/* Portfolio Summary - Nuevo componente */}
      {dashboardData.portfolioSummary.data && (
        <ErrorBoundary fallback={
          <Card className="p-6">
            <div className="text-center text-red-600">
              <h3 className="text-lg font-semibold mb-2">Error en resumen del portfolio</h3>
              <p className="text-sm">No se pudo cargar el resumen del portfolio</p>
            </div>
          </Card>
        }>
          <PortfolioSummary 
            data={dashboardData.portfolioSummary.data}
            isLoading={dashboardData.portfolioSummary.isLoading}
            showInflationAdjusted={true}
          />
        </ErrorBoundary>
      )}

      {/* Dashboard avanzado - Posiciones actuales y distribución */}
      {dashboardData.positions.data && dashboardData.positions.data.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ErrorBoundary fallback={
              <Card className="p-6">
                <div className="text-center text-red-600">
                  <h3 className="text-lg font-semibold mb-2">Error en posiciones</h3>
                  <p className="text-sm">No se pudieron cargar las posiciones actuales</p>
                </div>
              </Card>
            }>
              <CurrentPositions 
                data={dashboardData.positions.data}
                isLoading={dashboardData.positions.isLoading}
                limit={10}
                showFilters={true}
              />
            </ErrorBoundary>
          </div>
          <div className="xl:col-span-1">
            <ErrorBoundary fallback={
              <Card className="p-6">
                <div className="text-center text-red-600">
                  <h3 className="text-lg font-semibold mb-2">Error en distribución</h3>
                  <p className="text-sm">No se pudo cargar el gráfico de distribución</p>
                </div>
              </Card>
            }>
              <DistributionChart 
                data={dashboardData.distribution.data}
                isLoading={dashboardData.distribution.isLoading}
                height={500}
              />
            </ErrorBoundary>
          </div>
        </div>
      )}

      {/* Gráfico del símbolo seleccionado */}
      {selectedSymbol && (
        <div className="grid grid-cols-1 gap-6">
          <QuoteChart
            data={chartData || []}
            symbol={selectedSymbol}
            height={400}
            chartType="area"
            timeRange={chartTimeRange}
            onTimeRangeChange={handleTimeRangeChange}
            loading={chartLoading}
          />
        </div>
      )}

      {/* Lista de cotizaciones */}
      <div className="grid grid-cols-1 gap-6">
        {instrumentsLoading ? (
          <Card className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Cargando instrumentos...</span>
            </div>
          </Card>
        ) : totalInstruments === 0 ? (
          <Card className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-4">Bienvenido a CEDEARs Manager</h3>
              <p className="text-gray-600 mb-4">
                Esta es la aplicación de gestión inteligente de cartera de CEDEARs con criterios ESG/veganos.
              </p>
              <p className="text-gray-500">
                Comienza agregando instrumentos a tu watchlist para ver cotizaciones en tiempo real y realizar análisis técnico.
              </p>
            </div>
          </Card>
        ) : (
          <QuotesList
            quotes={quotes || []}
            loading={quotesLoading}
            error={quotesError?.message}
            onRefresh={forceRefresh}
            onSymbolClick={handleSymbolClick}
            showCompanyName={true}
            showSector={true}
            showLastUpdate={true}
            refreshInterval={30000}
          />
        )}
      </div>

      {/* Información adicional */}
      {totalInstruments > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Estado del Sistema</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Instrumentos activos:</span>
                <span className="font-medium">{totalInstruments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cotizaciones disponibles:</span>
                <span className="font-medium">{totalQuotes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Última actualización:</span>
                <span className="font-medium">
                  {lastUpdate ? format(lastUpdate, 'HH:mm:ss') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado del mercado:</span>
                <Badge variant={marketHours?.isOpen ? "success" : "secondary"}>
                  {marketHours?.isOpen ? 'Abierto' : 'Cerrado'}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
            <div className="space-y-3">
              <Button 
                onClick={handleRefresh}
                className="w-full justify-start"
                variant="outline"
                disabled={updateQuotes.isPending || refreshDashboard.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${(updateQuotes.isPending || refreshDashboard.isPending) ? 'animate-spin' : ''}`} />
                Actualizar Dashboard
              </Button>
              
              <Button 
                onClick={() => window.location.href = '#/watchlist'}
                className="w-full justify-start"
                variant="outline"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Watchlist Completo
              </Button>
              
              <Button 
                onClick={() => window.location.href = '#/instruments'}
                className="w-full justify-start"
                variant="outline"
              >
                <Activity className="w-4 h-4 mr-2" />
                Gestionar Instrumentos
              </Button>
            </div>
          </Card>
        </div>
      )}
      </div>
    </ErrorBoundary>
  )
}