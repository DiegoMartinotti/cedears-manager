import { useState, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw } from 'lucide-react'
import { DistributionChart } from '@/components/dashboard/DistributionChart'
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary'
import { CurrentPositions } from '@/components/dashboard/CurrentPositions'
import { QuoteChart } from '@/components/quotes/QuoteChart'
import { QuotesList } from '@/components/quotes/QuotesList'
import { SignalAlerts } from '@/components/TechnicalIndicators/SignalAlerts'
import { TechnicalIndicatorsList } from '@/components/TechnicalIndicators/TechnicalIndicatorsList'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PageLoadingState, PageErrorState } from '@/components/ui/LoadingSpinner'
import { useWatchlistQuotes, useUpdateQuotes, useQuoteChart } from '@/hooks/useQuotes'
import { useInstruments } from '@/hooks/useInstruments'
import { useDashboardData, useRefreshDashboard } from '@/hooks/useDashboard'
import { useSignalsOverview } from '@/hooks/useTechnicalIndicators'

export default function Dashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [chartTimeRange, setChartTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'>('1M')

  // Hooks básicos
  const { data: instruments, isLoading: instrumentsLoading } = useInstruments()
  const watchlistQuotes = useWatchlistQuotes()
  const updateQuotes = useUpdateQuotes()
  const dashboardData = useDashboardData({ enabled: true, refetchInterval: 60000 })
  const refreshDashboard = useRefreshDashboard()
  const { buySignals, sellSignals, isLoading: signalsLoading } = useSignalsOverview()
  const quoteChart = useQuoteChart(
    selectedSymbol || '',
    chartTimeRange,
    !!selectedSymbol
  )

  // Datos derivados
  const quotes = watchlistQuotes.data || []
  const quotesLoading = watchlistQuotes.isLoading
  const quotesError = watchlistQuotes.error
  const hasPortfolioData = dashboardData.portfolioSummary.data

  const handleRefresh = async () => {
    try {
      await updateQuotes.mutateAsync()
      watchlistQuotes.refetch?.()
      if (hasPortfolioData) {
        await refreshDashboard.mutateAsync()
      }
    } catch (error) {
      // Error handling
    }
  }

  // Estados de loading
  if (instrumentsLoading && !instruments) {
    return (
      <PageLoadingState 
        title="Cargando Dashboard"
        subtitle="Obteniendo datos de instrumentos..."
      />
    )
  }

  if (dashboardData.isError && !hasPortfolioData) {
    return (
      <PageErrorState
        title="Error en el Dashboard"
        subtitle="No se pudieron cargar los datos"
        onRetry={() => {
          watchlistQuotes.refetch?.()
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
            <Button
              onClick={handleRefresh}
              disabled={updateQuotes.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${updateQuotes.isPending ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Instrumentos"
            value={instruments?.length || 0}
            icon={<Activity className="h-4 w-4" />}
            trend="neutral"
          />
          <MetricCard
            title="Cotizaciones"
            value={quotes.length}
            icon={<DollarSign className="h-4 w-4" />}
            trend={quotesError ? "down" : "up"}
            loading={quotesLoading}
          />
          <MetricCard
            title="Señales Compra"
            value={buySignals.length}
            icon={<TrendingUp className="h-4 w-4 text-green-500" />}
            trend="up"
            loading={signalsLoading}
          />
          <MetricCard
            title="Señales Venta"
            value={sellSignals.length}
            icon={<TrendingDown className="h-4 w-4 text-red-500" />}
            trend="down"
            loading={signalsLoading}
          />
        </div>

        {/* Dashboard principal */}
        {hasPortfolioData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioSummary />
            <DistributionChart />
          </div>
        )}

        {/* Posiciones actuales */}
        {hasPortfolioData && (
          <CurrentPositions />
        )}

        {/* Cotizaciones y gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cotizaciones</h3>
            <QuotesList
              quotes={quotes}
              loading={quotesLoading}
              error={quotesError ? (quotesError as Error).message : undefined}
              onSymbolClick={setSelectedSymbol}
            />
          </div>
          
          {selectedSymbol && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Gráfico - {selectedSymbol}</h3>
              <QuoteChart
                data={quoteChart.data || []}
                symbol={selectedSymbol}
                timeRange={chartTimeRange}
                onTimeRangeChange={(range: string) => {
                  setChartTimeRange(range as any)
                  quoteChart.changeTimeRange(range as any)
                }}
                height={400}
                loading={quoteChart.isLoading}
                error={quoteChart.error ? (quoteChart.error as Error).message : undefined}
              />
            </div>
          )}
        </div>

        {/* Señales técnicas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SignalAlerts />
          {selectedSymbol && <TechnicalIndicatorsList symbol={selectedSymbol} />}
        </div>
      </div>
    </ErrorBoundary>
  )
}

// Componente helper para métricas
const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  loading = false 
}: {
  title: string
  value: number
  icon: ReactNode
  trend: 'up' | 'down' | 'neutral'
  loading?: boolean
}) => (
  <Card>
    <CardContent className="flex items-center p-6">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold">
            {loading ? '...' : value}
          </p>
        </div>
      </div>
      {trend !== 'neutral' && (
        <Badge 
          variant={trend === 'up' ? 'default' : 'destructive'}
          className="ml-auto"
        >
          {trend === 'up' ? '↗' : '↘'}
        </Badge>
      )}
    </CardContent>
  </Card>
)