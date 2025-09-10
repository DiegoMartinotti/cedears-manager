import React, { useMemo, useState, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { InstrumentUI, InstrumentFilters } from '@cedears-manager/shared/types'
import { useInstruments, useDeleteInstrument, useToggleESGCompliance, useToggleVeganFriendly } from '../hooks/useInstruments'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Card } from './ui/Card'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Switch } from './ui/Switch'
import { AlertDialog } from './ui/AlertDialog'
import { 
  TrendingUp, 
  TrendingDown,
  Search,
  Edit,
  Trash2,
  Leaf,
  Shield,
  DollarSign,
  Building,
  Calendar,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils/cn'

interface InstrumentListProps {
  filters?: InstrumentFilters
  onInstrumentClick?: (instrument: InstrumentUI) => void
  onInstrumentEdit?: (instrument: InstrumentUI) => void
  selectable?: boolean
  selectedInstruments?: Set<number>
  onSelectionChange?: (selected: Set<number>) => void
  height?: number
  className?: string
}

interface InstrumentRowProps {
  index: number
  style: React.CSSProperties
  data: {
    instruments: InstrumentUI[]
    onInstrumentClick?: (instrument: InstrumentUI) => void
    onInstrumentEdit?: (instrument: InstrumentUI) => void
    onDelete: (id: number) => void
    onToggleESG: (id: number) => void
    onToggleVegan: (id: number) => void
    selectable?: boolean
    selectedInstruments?: Set<number>
    onSelectionChange?: (selected: Set<number>) => void
  }
}

const InstrumentRow: React.FC<InstrumentRowProps> = ({ index, style, data }) => {
  const instrument = data.instruments[index]
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  if (!instrument) {
    return (
      <div style={style} className="px-4 py-2">
        <div className="animate-pulse bg-gray-200 h-16 rounded-md"></div>
      </div>
    )
  }

  const isSelected = data.selectedInstruments?.has(instrument.id) || false

  const handleSelectionChange = (checked: boolean) => {
    if (data.onSelectionChange && data.selectedInstruments) {
      const newSelection = new Set(data.selectedInstruments)
      if (checked) {
        newSelection.add(instrument.id)
      } else {
        newSelection.delete(instrument.id)
      }
      data.onSelectionChange(newSelection)
    }
  }

  const handleDelete = () => {
    data.onDelete(instrument.id)
    setShowDeleteDialog(false)
  }

  return (
    <div style={style} className="px-4 py-2">
      <Card className={cn(
        "p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer",
        isSelected && "ring-2 ring-blue-500",
        !instrument.isActive && "opacity-60"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {data.selectable && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => handleSelectionChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <div 
              className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center"
              onClick={() => data.onInstrumentClick?.(instrument)}
            >
              {/* Symbol and Company */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {instrument.symbol}
                  </h3>
                  <div className="flex space-x-1">
                    {instrument.isESGCompliant && (
                      <Badge variant="success" size="sm">
                        <Shield className="w-3 h-3 mr-1" />
                        ESG
                      </Badge>
                    )}
                    {instrument.isVeganFriendly && (
                      <Badge variant="secondary" size="sm">
                        <Leaf className="w-3 h-3 mr-1" />
                        Vegan
                      </Badge>
                    )}
                  </div>
                  {!instrument.isActive && (
                    <Badge variant="destructive" size="sm">Inactive</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {instrument.companyName}
                </p>
                {instrument.underlyingSymbol && (
                  <p className="text-xs text-gray-500">
                    Underlying: {instrument.underlyingSymbol}
                  </p>
                )}
              </div>

              {/* Sector and Industry */}
              <div>
                {instrument.sector && (
                  <div className="flex items-center text-sm">
                    <Building className="w-4 h-4 mr-1 text-gray-400" />
                    <span className="truncate">{instrument.sector}</span>
                  </div>
                )}
                {instrument.industry && (
                  <p className="text-xs text-gray-500 truncate mt-1">
                    {instrument.industry}
                  </p>
                )}
              </div>

              {/* Financial Info */}
              <div>
                <div className="flex items-center text-sm">
                  <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                  <span>{instrument.underlyingCurrency}</span>
                </div>
                {instrument.ratio && instrument.ratio !== 1 && (
                  <p className="text-xs text-gray-500">
                    Ratio: 1:{instrument.ratio}
                  </p>
                )}
                {instrument.marketCap && (
                  <p className="text-xs text-gray-500">
                    Cap: ${(instrument.marketCap / 1e9).toFixed(1)}B
                  </p>
                )}
              </div>

              {/* Status Toggles */}
              <div className="flex flex-col space-y-2">
                <div 
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    data.onToggleESG(instrument.id)
                  }}
                >
                  <Switch 
                    checked={instrument.isESGCompliant}
                    size="sm"
                  />
                  <span className="text-xs text-gray-600">ESG</span>
                </div>
                <div 
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    data.onToggleVegan(instrument.id)
                  }}
                >
                  <Switch 
                    checked={instrument.isVeganFriendly}
                    size="sm"
                  />
                  <span className="text-xs text-gray-600">Vegan</span>
                </div>
              </div>

              {/* Dates */}
              <div className="text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span>Added: {format(instrument.createdAt, 'MMM dd')}</span>
                </div>
                {instrument.updatedAt && instrument.updatedAt !== instrument.createdAt && (
                  <div className="flex items-center mt-1">
                    <Activity className="w-3 h-3 mr-1" />
                    <span>Updated: {format(instrument.updatedAt, 'MMM dd')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                data.onInstrumentEdit?.(instrument)
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete Instrument"
          description={`Are you sure you want to delete ${instrument.symbol} (${instrument.companyName})? This action cannot be undone.`}
          onConfirm={handleDelete}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </Card>
    </div>
  )
}

export const InstrumentList: React.FC<InstrumentListProps> = ({
  filters,
  onInstrumentClick,
  onInstrumentEdit,
  selectable = false,
  selectedInstruments,
  onSelectionChange,
  height = 600,
  className
}) => {
  const [localFilters, setLocalFilters] = useState<InstrumentFilters>(filters || {})
  const [searchTerm, setSearchTerm] = useState('')

  // Use the instruments hook with filters
  const { instruments, isLoading, error, refetch } = useInstruments(localFilters)
  
  // Mutations
  const deleteMutation = useDeleteInstrument()
  const toggleESGMutation = useToggleESGCompliance()
  const toggleVeganMutation = useToggleVeganFriendly()

  // Filter instruments based on search term
  const filteredInstruments = useMemo(() => {
    if (!searchTerm.trim()) return instruments

    const term = searchTerm.toLowerCase()
    return instruments.filter(instrument => 
      instrument.symbol.toLowerCase().includes(term) ||
      instrument.companyName.toLowerCase().includes(term) ||
      instrument.sector?.toLowerCase().includes(term) ||
      instrument.industry?.toLowerCase().includes(term)
    )
  }, [instruments, searchTerm])

  // Calculate item count for virtualizer
  const itemCount = filteredInstruments.length

  // Callbacks for row actions
  const handleDelete = useCallback((id: number) => {
    deleteMutation.mutate(id)
  }, [deleteMutation])

  const handleToggleESG = useCallback((id: number) => {
    toggleESGMutation.mutate(id)
  }, [toggleESGMutation])

  const handleToggleVegan = useCallback((id: number) => {
    toggleVeganMutation.mutate(id)
  }, [toggleVeganMutation])

  // Data for virtualized rows
  const rowData = useMemo(() => ({
    instruments: filteredInstruments,
    onInstrumentClick,
    onInstrumentEdit,
    onDelete: handleDelete,
    onToggleESG: handleToggleESG,
    onToggleVegan: handleToggleVegan,
    selectable,
    selectedInstruments,
    onSelectionChange,
  }), [
    filteredInstruments,
    onInstrumentClick,
    onInstrumentEdit,
    handleDelete,
    handleToggleESG,
    handleToggleVegan,
    selectable,
    selectedInstruments,
    onSelectionChange,
  ])

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (onSelectionChange) {
      const allIds = new Set(filteredInstruments.map(i => i.id))
      onSelectionChange(allIds)
    }
  }

  const handleSelectNone = () => {
    if (onSelectionChange) {
      onSelectionChange(new Set())
    }
  }

  if (error) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <div className="text-red-600 mb-4">
          <TrendingDown className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Instruments</h3>
          <p className="text-sm text-gray-600 mt-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </Card>
    )
  }

  let listContent: React.ReactNode
  if (isLoading) {
    listContent = (
      <div className="p-8 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading instruments...</p>
      </div>
    )
  } else if (itemCount === 0) {
    listContent = (
      <div className="p-8 text-center text-gray-500">
        <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold mb-2">No instruments found</h3>
        <p className="text-sm">
          {searchTerm
            ? `No instruments match "${searchTerm}". Try adjusting your search or filters.`
            : 'No instruments available. Add some instruments to get started.'}
        </p>
      </div>
    )
  } else {
    listContent = (
      <List
        height={height}
        width={800}
        itemCount={itemCount}
        itemSize={120} // Height of each row
        itemData={rowData}
        overscanCount={5} // Render extra items for smooth scrolling
      >
        {InstrumentRow}
      </List>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search instruments by symbol, name, or sector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
          <div className="flex gap-2">
            <Select
              value={localFilters.sector || ''}
              onChange={(e) =>
                setLocalFilters(prev => ({ ...prev, sector: e.target.value || undefined }))
              }
            >
            <option value="">All Sectors</option>
            <option value="Technology">Technology</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Financial">Financial</option>
            <option value="Consumer">Consumer</option>
            <option value="Energy">Energy</option>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalFilters(prev => ({ ...prev, isESG: !prev.isESG }))}
            className={localFilters.isESG ? 'bg-green-50 text-green-700' : ''}
          >
            <Shield className="w-4 h-4 mr-1" />
            ESG
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalFilters(prev => ({ ...prev, isVegan: !prev.isVegan }))}
            className={localFilters.isVegan ? 'bg-blue-50 text-blue-700' : ''}
          >
            <Leaf className="w-4 h-4 mr-1" />
            Vegan
          </Button>
        </div>
      </div>

      {/* Selection Controls */}
      {selectable && selectedInstruments && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
          <span className="text-sm text-gray-600">
            {selectedInstruments.size} of {filteredInstruments.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSelectNone}>
              Select None
            </Button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {isLoading ? 'Loading...' : `${filteredInstruments.length} instruments`}
          {searchTerm && ` matching "${searchTerm}"`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <TrendingUp className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Virtualized List */}
      <Card className="overflow-hidden">
        {listContent}
      </Card>
    </div>
  )
}

export default InstrumentList
