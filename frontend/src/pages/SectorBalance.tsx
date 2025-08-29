import React, { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Target, BarChart3, PieChart as PieChartIcon, Shield, Zap, RefreshCw } from 'lucide-react'
import { useSectorBalanceDashboard, useSectorBalanceAnalytics, useRunSectorAnalysis, useAcknowledgeAlert } from '../hooks/useSectorBalance'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { SECTOR_COLORS, ALERT_SEVERITY_COLORS, STATUS_COLORS } from '../types/sectorBalance.types'
import type { SectorDistribution, ConcentrationAlert, RebalanceRecommendation, BalanceHealthScore } from '../types/sectorBalance.types'

const SectorBalance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'recommendations' | 'alerts'>('overview')
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  // Data hooks
  const { overview, healthScore, alerts, recommendations, isLoading, error, refetchAll } = useSectorBalanceDashboard()
  const _analyticsData = useSectorBalanceAnalytics(12)
  const runAnalysis = useRunSectorAnalysis()
  const acknowledgeAlert = useAcknowledgeAlert()

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Sector Balance</h3>
          <p className="text-red-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to load sector balance data'}
          </p>
          <Button onClick={refetchAll} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const handleRunAnalysis = async () => {
    try {
      await runAnalysis.mutateAsync()
      refetchAll()
    } catch (error) {
      console.error('Error running analysis:', error)
    }
  }

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId)
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sector Balance</h1>
            <p className="text-gray-600">Portfolio diversification and sector allocation analysis</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleRunAnalysis} 
            disabled={runAnalysis.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Activity className="w-4 h-4 mr-2" />
            {runAnalysis.isPending ? 'Analyzing...' : 'Run Analysis'}
          </Button>
          
          <Button onClick={refetchAll} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: PieChartIcon },
            { key: 'analytics', label: 'Analytics', icon: TrendingUp },
            { key: 'recommendations', label: 'Recommendations', icon: Target },
            { key: 'alerts', label: 'Alerts', icon: AlertTriangle }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {key === 'alerts' && alerts.data && alerts.data.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {alerts.data.length}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && overview.data && (
        <OverviewTab 
          overview={overview.data} 
          healthScore={healthScore.data}
          onSectorSelect={setSelectedSector}
          selectedSector={selectedSector}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab 
          analyticsData={analyticsData}
          isLoading={analyticsData.isLoading}
        />
      )}

      {activeTab === 'recommendations' && recommendations.data && (
        <RecommendationsTab recommendations={recommendations.data} />
      )}

      {activeTab === 'alerts' && alerts.data && (
        <AlertsTab 
          alerts={alerts.data} 
          onAcknowledge={handleAcknowledgeAlert}
        />
      )}
    </div>
  )
}

// ============================================================================
// Overview Tab Component
// ============================================================================

interface OverviewTabProps {
  overview: any
  healthScore?: BalanceHealthScore
  onSectorSelect: (sector: string | null) => void
  selectedSector: string | null
}

const OverviewTab: React.FC<OverviewTabProps> = ({ 
  overview, 
  healthScore, 
  onSectorSelect, 
  selectedSector 
}) => {
  // Prepare pie chart data
  const pieData = overview.sectorDistributions.map((dist: SectorDistribution) => ({
    name: dist.sector,
    value: dist.percentage,
    totalValue: dist.totalValue,
    instrumentCount: dist.instrumentCount,
    status: dist.status,
    fill: SECTOR_COLORS[dist.sector as keyof typeof SECTOR_COLORS] || '#6B7280'
  }))

  // Prepare bar chart data
  const barData = overview.sectorDistributions.map((dist: SectorDistribution) => ({
    sector: dist.sector.substring(0, 20), // Truncate long names
    current: dist.percentage,
    target: dist.targetPercentage,
    deviation: Math.abs(dist.deviation)
  }))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${overview.totalPortfolioValue.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sectors</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview.balancedSectorCount}/{overview.sectorCount}
              </p>
              <p className="text-xs text-gray-500">Balanced</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Health Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {healthScore?.overall || 'N/A'}/100
              </p>
            </div>
            <div className={`p-2 rounded-lg ${
              (healthScore?.overall || 0) >= 80 ? 'bg-green-100' :
              (healthScore?.overall || 0) >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <Shield className={`w-6 h-6 ${
                (healthScore?.overall || 0) >= 80 ? 'text-green-600' :
                (healthScore?.overall || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">
                {overview.alertCount}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${
              overview.alertCount === 0 ? 'bg-green-100' :
              overview.alertCount < 3 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                overview.alertCount === 0 ? 'text-green-600' :
                overview.alertCount < 3 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Current Allocation */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Sector Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                onClick={(data) => onSectorSelect(data.name)}
              >
                {pieData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    stroke={selectedSector === entry.name ? '#1f2937' : 'none'}
                    strokeWidth={selectedSector === entry.name ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allocation']}
                labelFormatter={(name) => `Sector: ${name}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar Chart - Current vs Target */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current vs Target Allocation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="sector" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Bar dataKey="current" fill="#3b82f6" name="Current" />
              <Bar dataKey="target" fill="#e5e7eb" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Sector Details Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sector Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Sector</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Current</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Target</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Deviation</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Value</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {overview.sectorDistributions.map((dist: SectorDistribution) => (
                <tr 
                  key={dist.sector}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    selectedSector === dist.sector ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onSectorSelect(dist.sector)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SECTOR_COLORS[dist.sector as keyof typeof SECTOR_COLORS] || '#6B7280' }}
                      />
                      <span className="font-medium">{dist.sector}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4">{dist.percentage.toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{dist.targetPercentage.toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">
                    <span className={`flex items-center justify-end ${
                      dist.deviation > 0 ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {dist.deviation > 0 ? (
                        <TrendingUp className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 mr-1" />
                      )}
                      {Math.abs(dist.deviation).toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right py-3 px-4">
                    ${dist.totalValue.toLocaleString()}
                  </td>
                  <td className="text-center py-3 px-4">
                    <Badge 
                      variant={dist.status === 'BALANCED' ? 'default' : 'destructive'}
                      style={{ 
                        backgroundColor: STATUS_COLORS[dist.status as keyof typeof STATUS_COLORS],
                        color: 'white'
                      }}
                    >
                      {dist.status.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ============================================================================
// Analytics Tab Component
// ============================================================================

interface AnalyticsTabProps {
  analyticsData: any
  isLoading: boolean
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analyticsData: _analyticsData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Advanced Analytics</h3>
        <p className="text-gray-500">
          Detailed sector performance, risk analysis, and historical trends will be displayed here.
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Recommendations Tab Component
// ============================================================================

interface RecommendationsTabProps {
  recommendations: RebalanceRecommendation[]
}

const RecommendationsTab: React.FC<RecommendationsTabProps> = ({ recommendations }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{rec.sector}</h3>
                  <p className="text-sm text-gray-600">{rec.action} allocation</p>
                </div>
                <Badge 
                  variant={rec.priority === 'HIGH' || rec.priority === 'CRITICAL' ? 'destructive' : 'default'}
                >
                  {rec.priority} Priority
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Current</p>
                  <p className="text-xl font-semibold">{rec.currentAllocation.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Target</p>
                  <p className="text-xl font-semibold">{rec.targetAllocation.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Adjustment</p>
                  <p className="text-xl font-semibold">${rec.amountToAdjust.toLocaleString()}</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{rec.reasoning}</p>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Expected improvement: +{rec.impact.diversificationImprovement.toFixed(1)}%
                </div>
                <Button variant="outline" size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  Simulate
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Recommendations</h3>
            <p className="text-gray-500">
              Your portfolio is well-balanced. No rebalancing recommendations at this time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Alerts Tab Component
// ============================================================================

interface AlertsTabProps {
  alerts: ConcentrationAlert[]
  onAcknowledge: (alertId: number) => void
}

const AlertsTab: React.FC<AlertsTabProps> = ({ alerts, onAcknowledge }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <Card key={alert.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge 
                      style={{ 
                        backgroundColor: ALERT_SEVERITY_COLORS[alert.severity as keyof typeof ALERT_SEVERITY_COLORS],
                        color: 'white'
                      }}
                    >
                      {alert.severity}
                    </Badge>
                    <h3 className="text-lg font-semibold text-gray-900">{alert.sector}</h3>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{alert.message}</p>
                  
                  {alert.actionRequired && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <div className="flex items-start">
                        <Zap className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-blue-800 text-sm">{alert.actionRequired}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Current: {alert.currentPercentage.toFixed(1)}%</span>
                    <span>Threshold: {alert.thresholdPercentage.toFixed(1)}%</span>
                    <span>{new Date(alert.createdAt!).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex-shrink-0 ml-4">
                  {!alert.isAcknowledged && alert.id && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onAcknowledge(alert.id!)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">All Clear</h3>
            <p className="text-gray-500">
              No concentration alerts at this time. Your portfolio diversification looks healthy.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SectorBalance