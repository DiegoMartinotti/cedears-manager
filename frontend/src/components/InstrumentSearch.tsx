import React, { useState, useEffect, useRef, useCallback } from 'react'
import { InstrumentUI } from '@cedears-manager/shared/types'
import { useInstrumentSearch } from '../hooks/useInstruments'
import { Input } from './ui/Input'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { 
  Search, 
  X, 
  Loader2, 
  TrendingUp,
  Shield,
  Leaf,
  Building,
  DollarSign
} from 'lucide-react'
import { cn } from '../utils/cn'

interface InstrumentSearchProps {
  onInstrumentSelect?: (instrument: InstrumentUI) => void
  onSearchChange?: (searchTerm: string, results: InstrumentUI[]) => void
  placeholder?: string
  className?: string
  showDropdown?: boolean
  maxResults?: number
  disabled?: boolean
  autoFocus?: boolean
  clearOnSelect?: boolean
}

// Custom hook for debounced search
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const InstrumentSearch: React.FC<InstrumentSearchProps> = ({
  onInstrumentSelect,
  onSearchChange,
  placeholder = "Search instruments by symbol, name, or sector...",
  className,
  showDropdown = true,
  maxResults = 10,
  disabled = false,
  autoFocus = false,
  clearOnSelect = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Use the search hook with debounced term
  const { 
    data: searchResults = [], 
    isLoading, 
    error, 
    isFetching 
  } = useInstrumentSearch(debouncedSearchTerm, debouncedSearchTerm.length >= 2)

  // Limit results to maxResults
  const limitedResults = searchResults.slice(0, maxResults)

  // Notify parent of search changes
  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearchTerm, limitedResults)
    }
  }, [debouncedSearchTerm, limitedResults, onSearchChange])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    setIsOpen(value.length >= 2)
    setSelectedIndex(-1)
  }, [])

  // Handle instrument selection
  const handleInstrumentSelect = useCallback((instrument: InstrumentUI) => {
    onInstrumentSelect?.(instrument)
    if (clearOnSelect) {
      setSearchTerm('')
    }
    setIsOpen(false)
    setSelectedIndex(-1)
  }, [onInstrumentSelect, clearOnSelect])

  // Handle clear search
  const handleClear = useCallback(() => {
    setSearchTerm('')
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || limitedResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < limitedResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < limitedResults.length) {
          handleInstrumentSelect(limitedResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }, [isOpen, limitedResults, selectedIndex, handleInstrumentSelect])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10",
            searchTerm && "pr-20" // Extra padding for clear button
          )}
        />
        
        {/* Loading indicator */}
        {isFetching && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
        
        {/* Clear button */}
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && isOpen && (
        <div ref={dropdownRef} className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card className="border shadow-lg bg-white max-h-96 overflow-y-auto">
            {/* Loading state */}
            {isLoading && (
              <div className="p-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">Searching...</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 text-center text-red-600">
                <p className="text-sm">Error searching instruments</p>
              </div>
            )}

            {/* No results */}
            {!isLoading && !error && limitedResults.length === 0 && debouncedSearchTerm.length >= 2 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No instruments found for "{debouncedSearchTerm}"</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try searching by symbol, company name, or sector
                </p>
              </div>
            )}

            {/* Search results */}
            {!isLoading && !error && limitedResults.length > 0 && (
              <div className="py-2">
                {limitedResults.map((instrument, index) => (
                  <div
                    key={instrument.id}
                    className={cn(
                      "px-4 py-3 cursor-pointer transition-colors border-l-2 border-transparent",
                      "hover:bg-gray-50",
                      selectedIndex === index && "bg-blue-50 border-l-blue-500"
                    )}
                    onClick={() => handleInstrumentSelect(instrument)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {instrument.symbol}
                          </h4>
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
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {instrument.companyName}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {instrument.sector && (
                            <div className="flex items-center">
                              <Building className="w-3 h-3 mr-1" />
                              <span>{instrument.sector}</span>
                            </div>
                          )}
                          {instrument.underlyingCurrency && (
                            <div className="flex items-center">
                              <DollarSign className="w-3 h-3 mr-1" />
                              <span>{instrument.underlyingCurrency}</span>
                            </div>
                          )}
                          {instrument.ratio && instrument.ratio !== 1 && (
                            <span>Ratio: 1:{instrument.ratio}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Show more indicator */}
                {searchResults.length > maxResults && (
                  <div className="px-4 py-2 text-center text-xs text-gray-500 border-t">
                    Showing {maxResults} of {searchResults.length} results
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

// Alternative compact search component for inline use
export const InstrumentSearchCompact: React.FC<{
  onSelect: (instrument: InstrumentUI) => void
  placeholder?: string
  className?: string
}> = ({ onSelect, placeholder = "Search...", className }) => {
  return (
    <InstrumentSearch
      onInstrumentSelect={onSelect}
      placeholder={placeholder}
      className={className}
      maxResults={5}
      clearOnSelect={true}
      showDropdown={true}
    />
  )
}

export default InstrumentSearch