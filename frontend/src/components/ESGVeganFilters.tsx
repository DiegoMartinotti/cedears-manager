import React, { useState, useMemo } from 'react'
import { InstrumentFilters } from '@cedears-manager/shared/types'
import { useESGInstruments, useVeganInstruments, useInstrumentSectors } from '../hooks/useInstruments'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Switch } from './ui/Switch'
import { Badge } from './ui/Badge'
import { Select } from './ui/Select'
import { 
  Shield, 
  Leaf, 
  Building, 
  Filter,
  X,
  RotateCcw,
  Info
} from 'lucide-react'
import { cn } from '../utils/cn'

interface ESGVeganFiltersProps {
  filters: InstrumentFilters
  onFiltersChange: (filters: InstrumentFilters) => void
  className?: string
  compact?: boolean
}

// ESG and Vegan criteria definitions
const ESG_CRITERIA = {
  environmental: {
    name: 'Environmental',
    description: 'Clean energy, waste reduction, carbon neutral',
    icon: '🌱'
  },
  social: {
    name: 'Social',
    description: 'Fair labor, community impact, diversity',
    icon: '🤝'
  },
  governance: {
    name: 'Governance',
    description: 'Ethical leadership, transparency, accountability',
    icon: '⚖️'
  }
}

const VEGAN_CRITERIA = {
  noAnimalTesting: {
    name: 'No Animal Testing',
    description: 'Does not test products on animals',
    icon: '🐰'
  },
  noAnimalProducts: {
    name: 'No Animal Products',
    description: 'Does not use animal-derived materials',
    icon: '🌿'
  },
  plantBased: {
    name: 'Plant-Based Focus',
    description: 'Actively promotes plant-based alternatives',
    icon: '🌾'
  }
}

export const ESGVeganFilters: React.FC<ESGVeganFiltersProps> = ({
  filters,
  onFiltersChange,
  className,
  compact = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Data hooks
  const { data: esgInstruments = [], isLoading: esgLoading } = useESGInstruments()
  const { data: veganInstruments = [], isLoading: veganLoading } = useVeganInstruments()
  const { data: sectors = [], isLoading: sectorsLoading } = useInstrumentSectors()

  // Computed stats
  const stats = useMemo(() => ({
    esgCount: esgInstruments.length,
    veganCount: veganInstruments.length,
    bothCount: esgInstruments.filter((inst: any) => 
      veganInstruments.some((vegan: any) => vegan.id === inst.id)
    ).length,
    totalESGVegan: new Set([
      ...esgInstruments.map((i: any) => i.id),
      ...veganInstruments.map((i: any) => i.id)
    ]).size
  }), [esgInstruments, veganInstruments])

  // Filter handlers
  const handleFilterChange = (key: keyof InstrumentFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const handleToggleESG = () => {
    handleFilterChange('isESG', !filters.isESG)
  }

  const handleToggleVegan = () => {
    handleFilterChange('isVegan', !filters.isVegan)
  }

  const handleSectorChange = (sector: string) => {
    handleFilterChange('sector', sector || undefined)
  }

  const resetFilters = () => {
    onFiltersChange({
      isActive: true // Keep only active filter
    })
  }

  const hasActiveFilters = filters.isESG || filters.isVegan || filters.sector

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <Button
          variant={filters.isESG ? "default" : "outline"}
          size="sm"
          onClick={handleToggleESG}
          className={cn(
            "transition-all",
            filters.isESG && "bg-green-600 hover:bg-green-700"
          )}
        >
          <Shield className="w-4 h-4 mr-1" />
          ESG
          {stats.esgCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {stats.esgCount}
            </Badge>
          )}
        </Button>
        
        <Button
          variant={filters.isVegan ? "default" : "outline"}
          size="sm"
          onClick={handleToggleVegan}
          className={cn(
            "transition-all",
            filters.isVegan && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          <Leaf className="w-4 h-4 mr-1" />
          Vegan
          {stats.veganCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {stats.veganCount}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>ESG & Vegan Filters</span>
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              {esgLoading ? '...' : stats.esgCount}
            </div>
            <div className="text-xs text-green-600">ESG Compliant</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {veganLoading ? '...' : stats.veganCount}
            </div>
            <div className="text-xs text-blue-600">Vegan Friendly</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {stats.bothCount}
            </div>
            <div className="text-xs text-purple-600">Both ESG & Vegan</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {stats.totalESGVegan}
            </div>
            <div className="text-xs text-gray-600">Total Compliant</div>
          </div>
        </div>

        {/* Main Filters */}
        <div className="space-y-4">
          {/* ESG Filter */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "p-2 rounded-full",
                filters.isESG ? "bg-green-100" : "bg-gray-100"
              )}>
                <Shield className={cn(
                  "w-5 h-5",
                  filters.isESG ? "text-green-600" : "text-gray-500"
                )} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">ESG Compliant</h3>
                <p className="text-sm text-gray-500">
                  Environmental, Social & Governance criteria
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                {stats.esgCount} available
              </Badge>
              <Switch
                checked={filters.isESG || false}
                onCheckedChange={handleToggleESG}
              />
            </div>
          </div>

          {/* Vegan Filter */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "p-2 rounded-full",
                filters.isVegan ? "bg-blue-100" : "bg-gray-100"
              )}>
                <Leaf className={cn(
                  "w-5 h-5",
                  filters.isVegan ? "text-blue-600" : "text-gray-500"
                )} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Vegan Friendly</h3>
                <p className="text-sm text-gray-500">
                  No animal products or testing
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="text-xs">
                {stats.veganCount} available
              </Badge>
              <Switch
                checked={filters.isVegan || false}
                onCheckedChange={handleToggleVegan}
              />
            </div>
          </div>
        </div>

        {/* Sector Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">
            <Building className="w-4 h-4 mr-1" />
            Sector
          </label>
          <Select
            value={filters.sector || ''}
            onChange={(e) => handleSectorChange(e.target.value)}
            disabled={sectorsLoading}
          >
            <option value="">All Sectors</option>
            {sectors.map((sector: string) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </Select>
        </div>

        {/* Advanced Options Toggle */}
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-gray-600"
          >
            <Info className="w-4 h-4 mr-1" />
            {showAdvanced ? 'Hide' : 'Show'} Criteria Details
          </Button>
        </div>

        {/* Advanced Criteria Details */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            {/* ESG Criteria */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Shield className="w-4 h-4 mr-1 text-green-600" />
                ESG Criteria
              </h4>
              <div className="grid gap-3">
                {Object.entries(ESG_CRITERIA).map(([key, criteria]) => (
                  <div key={key} className="flex items-center space-x-3 p-3 bg-green-50 rounded-md">
                    <span className="text-lg">{criteria.icon}</span>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">
                        {criteria.name}
                      </h5>
                      <p className="text-xs text-gray-600">
                        {criteria.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vegan Criteria */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Leaf className="w-4 h-4 mr-1 text-blue-600" />
                Vegan Criteria
              </h4>
              <div className="grid gap-3">
                {Object.entries(VEGAN_CRITERIA).map(([key, criteria]) => (
                  <div key={key} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-md">
                    <span className="text-lg">{criteria.icon}</span>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">
                        {criteria.name}
                      </h5>
                      <p className="text-xs text-gray-600">
                        {criteria.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Applied Filters Summary */}
        {hasActiveFilters && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Active Filters:
            </h4>
            <div className="flex flex-wrap gap-2">
              {filters.isESG && (
                <Badge variant="default" className="bg-green-600">
                  <Shield className="w-3 h-3 mr-1" />
                  ESG Compliant
                  <button 
                    className="ml-2 hover:bg-green-700 rounded-full"
                    onClick={() => handleFilterChange('isESG', false)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.isVegan && (
                <Badge variant="default" className="bg-blue-600">
                  <Leaf className="w-3 h-3 mr-1" />
                  Vegan Friendly
                  <button 
                    className="ml-2 hover:bg-blue-700 rounded-full"
                    onClick={() => handleFilterChange('isVegan', false)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.sector && (
                <Badge variant="outline">
                  <Building className="w-3 h-3 mr-1" />
                  {filters.sector}
                  <button 
                    className="ml-2 hover:bg-gray-200 rounded-full"
                    onClick={() => handleFilterChange('sector', undefined)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Quick filter buttons for toolbar
export const ESGVeganQuickFilters: React.FC<{
  filters: InstrumentFilters
  onFiltersChange: (filters: InstrumentFilters) => void
  className?: string
}> = ({ filters, onFiltersChange, className }) => {
  return (
    <ESGVeganFilters
      filters={filters}
      onFiltersChange={onFiltersChange}
      className={className}
      compact={true}
    />
  )
}

export default ESGVeganFilters