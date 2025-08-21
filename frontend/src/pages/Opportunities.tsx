import React, { useState } from 'react'
import { 
  TrendingUp, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  Target,
  Clock,
  TrendingDown,
  Eye,
  Calculator
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Tabs } from '../components/ui/Tabs'
import { Select } from '../components/ui/Select'
import { useOpportunities } from '../hooks/useOpportunities'
import { OpportunityCard } from '../components/opportunities/OpportunityCard'
import { DiversificationCalculator } from '../components/opportunities/DiversificationCalculator'
import { OpportunityScoreBreakdown } from '../components/opportunities/OpportunityScoreBreakdown'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

interface OpportunityFilters {
  minScore: number
  maxScore: number
  opportunityType: 'ALL' | 'BUY' | 'STRONG_BUY'
  isESG: boolean | null
  isVegan: boolean | null
  searchTerm: string
}

export default function Opportunities() {
  const [activeTab, setActiveTab] = useState('today')
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [filters, setFilters] = useState<OpportunityFilters>({
    minScore: 60,
    maxScore: 100,
    opportunityType: 'ALL',
    isESG: null,
    isVegan: null,
    searchTerm: ''
  })

  const { 
    todaysOpportunities, 
    topOpportunities, 
    opportunityStats,
    scannerStatus,
    isLoading,
    error,
    refetch,
    runManualScan 
  } = useOpportunities()

  const handleFilterChange = (key: keyof OpportunityFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleManualScan = async () => {
    try {
      await runManualScan()
    } catch (error) {
      console.error('Error running manual scan:', error)
    }
  }

  const filteredOpportunities = (opportunities: any[]) => {
    return opportunities.filter(opp => {
      // Filtro por score
      if (opp.composite_score < filters.minScore || opp.composite_score > filters.maxScore) {
        return false
      }
      
      // Filtro por tipo
      if (filters.opportunityType !== 'ALL' && opp.opportunity_type !== filters.opportunityType) {
        return false
      }
      
      // Filtro ESG
      if (filters.isESG !== null && opp.esg_criteria.is_esg_compliant !== filters.isESG) {
        return false
      }
      
      // Filtro Vegan
      if (filters.isVegan !== null && opp.esg_criteria.is_vegan_friendly !== filters.isVegan) {
        return false
      }
      
      // Filtro de búsqueda
      if (filters.searchTerm && !opp.symbol.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
          !opp.company_name.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
        return false
      }
      
      return true
    })
  }

  const tabs = [
    { 
      id: 'today', 
      label: 'Hoy', 
      icon: <TrendingUp className="w-4 h-4" />,
      count: todaysOpportunities?.length || 0
    },
    { 
      id: 'top', 
      label: 'Top Score', 
      icon: <Target className="w-4 h-4" />,
      count: topOpportunities?.length || 0
    },
    { 
      id: 'calculator', 
      label: 'Calculadora', 
      icon: <Calculator className="w-4 h-4" />
    }
  ]

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error al cargar oportunidades</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            Oportunidades de Compra
          </h1>
          <p className="text-muted-foreground mt-1">
            Detección automática de oportunidades basada en análisis técnico
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scanner Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              scannerStatus?.isRunning ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <span className="text-muted-foreground">
              {scannerStatus?.isRunning ? 'Escaneando...' : 'Listo'}
            </span>
            {scannerStatus?.lastRun && (
              <span className="text-xs text-muted-foreground">
                <Clock className="w-3 h-3 inline mr-1" />
                {new Date(scannerStatus.lastRun).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <Button 
            onClick={handleManualScan} 
            variant="outline" 
            size="sm"
            disabled={isLoading || scannerStatus?.isRunning}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Escanear Ahora
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {opportunityStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Activas</p>
                <p className="text-2xl font-bold text-foreground">{opportunityStats.active}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score Promedio</p>
                <p className="text-2xl font-bold text-foreground">{opportunityStats.averageScore}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ESG Compliant</p>
                <p className="text-2xl font-bold text-foreground">{opportunityStats.esgCompliant}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Detectadas Hoy</p>
                <p className="text-2xl font-bold text-foreground">{opportunityStats.today}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar símbolo o empresa..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            value={String(filters.minScore)}
            onValueChange={(value) => handleFilterChange('minScore', Number(value))}
          >
            <option value="50">Score mín: 50</option>
            <option value="60">Score mín: 60</option>
            <option value="70">Score mín: 70</option>
            <option value="80">Score mín: 80</option>
          </Select>
          
          <Select
            value={filters.opportunityType}
            onValueChange={(value) => handleFilterChange('opportunityType', value)}
          >
            <option value="ALL">Todos los tipos</option>
            <option value="BUY">Compra</option>
            <option value="STRONG_BUY">Compra Fuerte</option>
          </Select>
          
          <Select
            value={filters.isESG === null ? 'ALL' : String(filters.isESG)}
            onValueChange={(value) => handleFilterChange('isESG', value === 'ALL' ? null : value === 'true')}
          >
            <option value="ALL">Cualquier ESG</option>
            <option value="true">Solo ESG</option>
            <option value="false">No ESG</option>
          </Select>
          
          <Select
            value={filters.isVegan === null ? 'ALL' : String(filters.isVegan)}
            onValueChange={(value) => handleFilterChange('isVegan', value === 'ALL' ? null : value === 'true')}
          >
            <option value="ALL">Cualquier Vegan</option>
            <option value="true">Solo Vegan</option>
            <option value="false">No Vegan</option>
          </Select>
          
          <Button 
            variant="outline" 
            onClick={() => setFilters({
              minScore: 60,
              maxScore: 100,
              opportunityType: 'ALL',
              isESG: null,
              isVegan: null,
              searchTerm: ''
            })}
          >
            <Filter className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'today' && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Oportunidades de Hoy ({filteredOpportunities(todaysOpportunities || []).length})
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOpportunities(todaysOpportunities || []).map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      onViewDetails={() => setSelectedOpportunity(opportunity)}
                      onCalculate={() => {
                        setSelectedOpportunity(opportunity)
                        setShowCalculator(true)
                      }}
                      onViewScore={() => {
                        setSelectedOpportunity(opportunity)
                        setShowScoreBreakdown(true)
                      }}
                    />
                  ))}
                </div>
              )}
              
              {filteredOpportunities(todaysOpportunities || []).length === 0 && !isLoading && (
                <Card className="p-8 text-center">
                  <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No hay oportunidades disponibles
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    No se encontraron oportunidades que cumplan con los filtros seleccionados.
                  </p>
                  <Button onClick={handleManualScan} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Ejecutar Scan
                  </Button>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'top' && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Mejores Oportunidades por Score ({filteredOpportunities(topOpportunities || []).length})
              </h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOpportunities(topOpportunities || []).map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      onViewDetails={() => setSelectedOpportunity(opportunity)}
                      onCalculate={() => {
                        setSelectedOpportunity(opportunity)
                        setShowCalculator(true)
                      }}
                      onViewScore={() => {
                        setSelectedOpportunity(opportunity)
                        setShowScoreBreakdown(true)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'calculator' && (
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">
                Calculadora de Diversificación
              </h3>
              <DiversificationCalculator />
            </div>
          )}
        </div>
      </Tabs>

      {/* Modals */}
      {showScoreBreakdown && selectedOpportunity && (
        <OpportunityScoreBreakdown
          opportunity={selectedOpportunity}
          onClose={() => {
            setShowScoreBreakdown(false)
            setSelectedOpportunity(null)
          }}
        />
      )}

      {showCalculator && selectedOpportunity && (
        <DiversificationCalculator
          preselectedSymbol={selectedOpportunity.symbol}
          onClose={() => {
            setShowCalculator(false)
            setSelectedOpportunity(null)
          }}
        />
      )}
    </div>
  )
}