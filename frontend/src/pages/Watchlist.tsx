import { useState } from 'react'
import { InstrumentFilters } from '@cedears-manager/shared/types'
import { InstrumentList } from '../components/InstrumentList'
import { InstrumentDetail } from '../components/InstrumentDetail'
import { InstrumentForm } from '../components/InstrumentForm'
import { InstrumentSearch } from '../components/InstrumentSearch'
import { ESGVeganQuickFilters } from '../components/ESGVeganFilters'
import { InstrumentLimitIndicator, useCanAddInstrument } from '../components/InstrumentLimitManager'
import { Button } from '../components/ui/Button'
import { Plus, Search, TrendingUp } from 'lucide-react'

type ViewMode = 'list' | 'detail' | 'form'

export default function Watchlist() {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<number | null>(null)
  const [editingInstrument, setEditingInstrument] = useState<any>(null)
  
  // Filter state
  const [filters, setFilters] = useState<InstrumentFilters>({ isActive: true })
  const [showSearch, setShowSearch] = useState(false)
  
  // Limit management
  const limitInfo = useCanAddInstrument()

  // Handlers
  const handleInstrumentClick = (instrument: any) => {
    setSelectedInstrumentId(instrument.id)
    setViewMode('detail')
  }

  const handleInstrumentEdit = (instrument: any) => {
    setEditingInstrument(instrument)
    setViewMode('form')
  }

  const handleCreateNew = () => {
    if (!limitInfo.canAdd) return
    setEditingInstrument(null)
    setViewMode('form')
  }

  const handleFormSuccess = () => {
    setViewMode('list')
    setEditingInstrument(null)
  }

  const handleFormCancel = () => {
    setViewMode('list')
    setEditingInstrument(null)
  }

  const handleBackToList = () => {
    setViewMode('list')
    setSelectedInstrumentId(null)
  }

  const handleInstrumentDelete = () => {
    setViewMode('list')
    setSelectedInstrumentId(null)
  }

  const handleSearchSelect = (instrument: any) => {
    setSelectedInstrumentId(instrument.id)
    setViewMode('detail')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
              Watchlist
            </h2>
            <p className="text-muted-foreground">
              Gestión inteligente de CEDEARs ESG/Veganos
            </p>
          </div>
          <InstrumentLimitIndicator />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={showSearch ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-4 h-4 mr-1" />
            Search
          </Button>
          
          <Button
            onClick={handleCreateNew}
            disabled={!limitInfo.canAdd}
            className={!limitInfo.canAdd ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Instrument
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="max-w-md">
          <InstrumentSearch
            onInstrumentSelect={handleSearchSelect}
            placeholder="Search instruments by symbol, name, or sector..."
          />
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex items-center justify-between">
        <ESGVeganQuickFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
        <div className="text-sm text-muted-foreground">
          {limitInfo.totalCount} of {limitInfo.maxInstruments} instruments
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'list' && (
        <InstrumentList
          filters={filters}
          onInstrumentClick={handleInstrumentClick}
          onInstrumentEdit={handleInstrumentEdit}
          height={600}
        />
      )}

      {viewMode === 'detail' && selectedInstrumentId && (
        <InstrumentDetail
          instrumentId={selectedInstrumentId}
          onEdit={handleInstrumentEdit}
          onBack={handleBackToList}
          onDelete={handleInstrumentDelete}
        />
      )}

      {viewMode === 'form' && (
        <div className="max-w-4xl mx-auto">
          <InstrumentForm
            instrument={editingInstrument}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}
    </div>
  )
}