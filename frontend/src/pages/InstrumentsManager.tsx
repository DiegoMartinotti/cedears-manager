import React, { useState } from 'react'
import { InstrumentUI, InstrumentFilters } from '@cedears-manager/shared/types'
import { InstrumentList } from '../components/InstrumentList'
import { InstrumentDetail } from '../components/InstrumentDetail'
import { InstrumentForm } from '../components/InstrumentForm'
import { InstrumentSearch } from '../components/InstrumentSearch'
import { ESGVeganFilters, ESGVeganQuickFilters } from '../components/ESGVeganFilters'
import { InstrumentLimitManager, InstrumentLimitIndicator, useCanAddInstrument } from '../components/InstrumentLimitManager'
import { Button } from '../components/ui/Button'
import { 
  Plus, 
  Filter, 
  Grid, 
  List, 
  Search, 
  TrendingUp,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '../utils/cn'

type ViewMode = 'list' | 'detail' | 'form'
type LayoutMode = 'grid' | 'list'

export const InstrumentsManager: React.FC = () => {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('list')
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<number | null>(null)
  const [editingInstrument, setEditingInstrument] = useState<InstrumentUI | null>(null)
  
  // Filter state
  const [filters, setFilters] = useState<InstrumentFilters>({ isActive: true })
  const [showFilters, setShowFilters] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // Selection state
  const [selectedInstruments, setSelectedInstruments] = useState<Set<number>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  // Limit management
  const limitInfo = useCanAddInstrument()

  // Handlers
  const handleInstrumentClick = (instrument: InstrumentUI) => {
    setSelectedInstrumentId(instrument.id)
    setViewMode('detail')
  }

  const handleInstrumentEdit = (instrument: InstrumentUI) => {
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
    // Could show success toast here
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

  const handleSearchSelect = (instrument: InstrumentUI) => {
    setSelectedInstrumentId(instrument.id)
    setViewMode('detail')
  }

  const resetFilters = () => {
    setFilters({ isActive: true })
  }

  const hasActiveFilters = filters.isESG || filters.isVegan || filters.sector

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
                Instruments Manager
              </h1>
              <InstrumentLimitIndicator onClick={() => setShowFilters(!showFilters)} />
            </div>

            <div className="flex items-center space-x-2">
              {/* Search Toggle */}
              <Button
                variant={showSearch ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="w-4 h-4 mr-1" />
                Search
              </Button>

              {/* Filter Toggle */}
              <Button
                variant={showFilters || hasActiveFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={hasActiveFilters ? "bg-blue-600" : ""}
              >
                <Filter className="w-4 h-4 mr-1" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs">
                    {(filters.isESG ? 1 : 0) + (filters.isVegan ? 1 : 0) + (filters.sector ? 1 : 0)}
                  </span>
                )}
              </Button>

              {/* View Mode Toggles */}
              {viewMode === 'list' && (
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={layoutMode === 'list' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setLayoutMode('list')}
                    className="rounded-r-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={layoutMode === 'grid' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setLayoutMode('grid')}
                    className="rounded-l-none"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Bulk Actions */}
              {bulkMode && selectedInstruments.size > 0 && (
                <div className="flex items-center space-x-2 border-l pl-2">
                  <span className="text-sm text-gray-600">
                    {selectedInstruments.size} selected
                  </span>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Add New Button */}
              <Button
                onClick={handleCreateNew}
                disabled={!limitInfo.canAdd}
                className={cn(
                  "transition-all",
                  !limitInfo.canAdd && "opacity-50 cursor-not-allowed"
                )}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Instrument
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mt-4">
              <InstrumentSearch
                onInstrumentSelect={handleSearchSelect}
                placeholder="Search instruments by symbol, name, or sector..."
                className="max-w-md"
              />
            </div>
          )}

          {/* Quick Filters */}
          <div className="mt-4 flex items-center justify-between">
            <ESGVeganQuickFilters
              filters={filters}
              onFiltersChange={setFilters}
            />
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>View:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkMode(!bulkMode)}
                className={bulkMode ? "bg-blue-50 text-blue-700" : ""}
              >
                {bulkMode ? 'Exit Bulk' : 'Bulk Select'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar - Filters */}
        {showFilters && (
          <div className="w-80 bg-white border-r h-screen sticky top-16 overflow-y-auto">
            <div className="p-4 space-y-4">
              <InstrumentLimitManager
                onViewAll={() => setShowFilters(false)}
                onAddNew={handleCreateNew}
              />
              
              <ESGVeganFilters
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {viewMode === 'list' && (
            <InstrumentList
              filters={filters}
              onInstrumentClick={handleInstrumentClick}
              onInstrumentEdit={handleInstrumentEdit}
              selectable={bulkMode}
              selectedInstruments={selectedInstruments}
              onSelectionChange={setSelectedInstruments}
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
      </div>

      {/* Footer/Status Bar */}
      <div className="bg-white border-t px-6 py-3 sticky bottom-0">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>
              {limitInfo.totalCount} of {limitInfo.maxInstruments} instruments
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <div className={cn(
              "w-2 h-2 rounded-full",
              limitInfo.isAtLimit 
                ? "bg-red-500" 
                : limitInfo.isNearLimit 
                  ? "bg-amber-500" 
                  : "bg-green-500"
            )} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstrumentsManager