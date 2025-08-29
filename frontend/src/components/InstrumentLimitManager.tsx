import React from 'react'
import { useInstrumentLimit } from '../hooks/useInstrumentLimit'
import { Card, CardContent } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  Target,
  AlertCircle
} from 'lucide-react'
import { cn } from '../utils/cn'

interface InstrumentLimitManagerProps {
  onViewAll?: () => void
  onAddNew?: () => void
  className?: string
}


export const InstrumentLimitManager: React.FC<InstrumentLimitManagerProps> = ({
  onViewAll,
  onAddNew,
  className
}) => {
  const limit = useInstrumentLimit()

  const getStatusColor = () => {
    if (limit.isAtLimit) return 'text-red-600'
    if (limit.isNearLimit) return 'text-amber-600'
    return 'text-green-600'
  }

  const getStatusIcon = () => {
    if (limit.isAtLimit) return <AlertTriangle className="w-5 h-5 text-red-600" />
    if (limit.isNearLimit) return <AlertCircle className="w-5 h-5 text-amber-600" />
    return <CheckCircle className="w-5 h-5 text-green-600" />
  }

  const getStatusMessage = () => {
    if (limit.isAtLimit) {
      return 'Watchlist is full. Remove instruments to add new ones.'
    }
    if (limit.isNearLimit) {
      return `Only ${limit.remaining} slots remaining. Consider optimizing your watchlist.`
    }
    return `${limit.remaining} slots available for new instruments.`
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="font-semibold text-gray-900">
              Watchlist Capacity
            </h3>
          </div>
          <Badge 
            variant={limit.isAtLimit ? 'destructive' : limit.isNearLimit ? 'outline' : 'secondary'}
            className="font-mono"
          >
            {limit.totalCount}/{limit.maxInstruments}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Used</span>
            <span>{limit.progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                limit.isAtLimit 
                  ? "bg-red-500" 
                  : limit.isNearLimit 
                    ? "bg-amber-500" 
                    : "bg-green-500"
              )}
              style={{ width: `${limit.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className={cn("text-sm mb-4", getStatusColor())}>
          <p>{getStatusMessage()}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-md">
            <div className="text-lg font-semibold text-gray-900">
              {limit.totalCount}
            </div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-md">
            <div className="text-lg font-semibold text-gray-900">
              {limit.remaining}
            </div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-md">
            <div className="text-lg font-semibold text-gray-900">
              {limit.maxInstruments}
            </div>
            <div className="text-xs text-gray-500">Maximum</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className="flex-1"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            View All
          </Button>
          <Button
            size="sm"
            onClick={onAddNew}
            disabled={limit.isAtLimit}
            className={cn(
              "flex-1",
              limit.isAtLimit && "opacity-50 cursor-not-allowed"
            )}
          >
            <Target className="w-4 h-4 mr-1" />
            Add New
          </Button>
        </div>

        {/* Warning for near limit */}
        {limit.isNearLimit && !limit.isAtLimit && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-amber-800 font-medium mb-1">
                  Approaching Limit
                </p>
                <p className="text-amber-700 text-xs">
                  Consider removing underperforming or duplicate instruments to maintain 
                  focus on your best opportunities.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* At limit warning */}
        {limit.isAtLimit && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-red-800 font-medium mb-1">
                  Watchlist Full
                </p>
                <p className="text-red-700 text-xs">
                  You've reached the maximum of 100 instruments. Remove some instruments 
                  to add new ones, or consider upgrading your plan.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for header/navbar
export const InstrumentLimitIndicator: React.FC<{
  onClick?: () => void
  className?: string
}> = ({ onClick, className }) => {
  const limit = useInstrumentLimit()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn("relative", className)}
    >
      <div className="flex items-center space-x-2">
        <div className={cn(
          "w-2 h-2 rounded-full",
          limit.isAtLimit 
            ? "bg-red-500" 
            : limit.isNearLimit 
              ? "bg-amber-500" 
              : "bg-green-500"
        )} />
        <span className="text-sm font-mono">
          {limit.totalCount}/{limit.maxInstruments}
        </span>
      </div>
      
      {limit.isAtLimit && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </Button>
  )
}

// Warning component for forms
export const InstrumentLimitWarning: React.FC<{
  show?: boolean
  onClose?: () => void
}> = ({ show = false, onClose }) => {
  const limit = useInstrumentLimit()

  if (!show || limit.canAddMore) return null

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <h4 className="text-red-800 font-medium">Cannot Add Instrument</h4>
            <p className="text-red-700 text-sm">
              You've reached the maximum limit of {limit.maxInstruments} instruments. 
              Please remove some instruments first.
            </p>
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </Button>
        )}
      </div>
    </div>
  )
}


export default InstrumentLimitManager