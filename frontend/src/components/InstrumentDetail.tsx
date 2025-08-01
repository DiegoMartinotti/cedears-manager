import React, { useState } from 'react'
import { InstrumentUI } from '@cedears-manager/shared/types'
import { useInstrument, useUpdateInstrument, useDeleteInstrument } from '../hooks/useInstruments'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { AlertDialog } from './ui/AlertDialog'
import { 
  Building, 
  DollarSign, 
  Calendar, 
  Activity,
  Shield,
  Leaf,
  Edit,
  Trash2,
  ArrowLeft,
  MoreVertical,
  Star,
  StarOff,
  AlertCircle,
  CheckCircle,
  Info,
  Copy,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '../utils/cn'

interface InstrumentDetailProps {
  instrumentId: number
  onEdit?: (instrument: InstrumentUI) => void
  onBack?: () => void
  onDelete?: () => void
  className?: string
}

interface InstrumentDetailViewProps {
  instrument: InstrumentUI
  onEdit?: (instrument: InstrumentUI) => void
  onBack?: () => void
  onDelete?: () => void
  className?: string
}

const InstrumentDetailView: React.FC<InstrumentDetailViewProps> = ({
  instrument,
  onEdit,
  onBack,
  onDelete,
  className
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showActionMenu, setShowActionMenu] = useState(false)
  
  const updateMutation = useUpdateInstrument()
  const deleteMutation = useDeleteInstrument()

  const handleDelete = () => {
    deleteMutation.mutate(instrument.id, {
      onSuccess: () => {
        onDelete?.()
        setShowDeleteDialog(false)
      }
    })
  }

  const handleToggleESG = () => {
    updateMutation.mutate({
      id: instrument.id,
      data: { isESGCompliant: !instrument.isESGCompliant }
    })
  }

  const handleToggleVegan = () => {
    updateMutation.mutate({
      id: instrument.id,
      data: { isVeganFriendly: !instrument.isVeganFriendly }
    })
  }

  const handleToggleActive = () => {
    updateMutation.mutate({
      id: instrument.id,
      data: { isActive: !instrument.isActive }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add toast notification here
  }

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return 'N/A'
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`
    return `$${marketCap.toLocaleString()}`
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {instrument.symbol}
              </h1>
              <div className="flex space-x-2">
                {instrument.isESGCompliant && (
                  <Badge variant="success">
                    <Shield className="w-3 h-3 mr-1" />
                    ESG
                  </Badge>
                )}
                {instrument.isVeganFriendly && (
                  <Badge variant="secondary">
                    <Leaf className="w-3 h-3 mr-1" />
                    Vegan
                  </Badge>
                )}
                {!instrument.isActive && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-lg">
              {instrument.companyName}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(instrument)}
            disabled={updateMutation.isPending}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActionMenu(!showActionMenu)}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            
            {showActionMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => copyToClipboard(instrument.symbol)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Symbol
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleToggleActive}
                    disabled={updateMutation.isPending}
                  >
                    {instrument.isActive ? (
                      <>
                        <StarOff className="w-4 h-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 mr-2" />
                        Activate
                      </>
                    )}
                  </button>
                  <div className="border-t border-gray-100"></div>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Symbol</label>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-mono font-semibold">
                    {instrument.symbol}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(instrument.symbol)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Currency</label>
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <p className="text-lg font-semibold">
                    {instrument.underlyingCurrency}
                  </p>
                </div>
              </div>
            </div>

            {instrument.underlyingSymbol && (
              <div>
                <label className="text-sm font-medium text-gray-500">Underlying Symbol</label>
                <p className="text-lg font-mono">
                  {instrument.underlyingSymbol}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Ratio</label>
                <p className="text-lg">
                  1:{instrument.ratio}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="flex items-center space-x-2">
                  {instrument.isActive ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    instrument.isActive ? "text-green-600" : "text-red-600"
                  )}>
                    {instrument.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Business</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Company Name</label>
              <p className="text-lg">{instrument.companyName}</p>
            </div>

            {instrument.sector && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sector</label>
                <div className="flex items-center space-x-1">
                  <Building className="w-4 h-4 text-gray-400" />
                  <p className="text-lg">{instrument.sector}</p>
                </div>
              </div>
            )}

            {instrument.industry && (
              <div>
                <label className="text-sm font-medium text-gray-500">Industry</label>
                <p className="text-lg">{instrument.industry}</p>
              </div>
            )}

            {instrument.marketCap && (
              <div>
                <label className="text-sm font-medium text-gray-500">Market Cap</label>
                <p className="text-lg font-semibold">
                  {formatMarketCap(instrument.marketCap)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance & ESG */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Compliance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ESG Compliance */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-full",
                  instrument.isESGCompliant ? "bg-green-100" : "bg-gray-100"
                )}>
                  <Shield className={cn(
                    "w-4 h-4",
                    instrument.isESGCompliant ? "text-green-600" : "text-gray-400"
                  )} />
                </div>
                <div>
                  <h4 className="font-medium">ESG Compliant</h4>
                  <p className="text-xs text-gray-500">Environmental, Social & Governance</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleESG}
                disabled={updateMutation.isPending}
                className={cn(
                  instrument.isESGCompliant 
                    ? "text-green-600 hover:text-green-700" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {instrument.isESGCompliant ? <CheckCircle /> : <AlertCircle />}
              </Button>
            </div>

            {/* Vegan Friendly */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-full",
                  instrument.isVeganFriendly ? "bg-blue-100" : "bg-gray-100"
                )}>
                  <Leaf className={cn(
                    "w-4 h-4",
                    instrument.isVeganFriendly ? "text-blue-600" : "text-gray-400"
                  )} />
                </div>
                <div>
                  <h4 className="font-medium">Vegan Friendly</h4>
                  <p className="text-xs text-gray-500">No animal products or testing</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleVegan}
                disabled={updateMutation.isPending}
                className={cn(
                  instrument.isVeganFriendly 
                    ? "text-blue-600 hover:text-blue-700" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {instrument.isVeganFriendly ? <CheckCircle /> : <AlertCircle />}
              </Button>
            </div>

            {/* Compliance Score */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Compliance Score</h4>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((instrument.isESGCompliant ? 1 : 0) + (instrument.isVeganFriendly ? 1 : 0)) * 50}%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {(instrument.isESGCompliant ? 1 : 0) + (instrument.isVeganFriendly ? 1 : 0)}/2
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Created</h4>
                <p className="text-sm text-gray-600">
                  {format(instrument.createdAt, 'PPP')} at {format(instrument.createdAt, 'p')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Last Updated</h4>
                <p className="text-sm text-gray-600">
                  {format(instrument.updatedAt, 'PPP')} at {format(instrument.updatedAt, 'p')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Instrument"
        description={`Are you sure you want to delete ${instrument.symbol} (${instrument.companyName})? This action cannot be undone and will remove all associated data.`}
        onConfirm={handleDelete}
        confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Loading overlay for mutations */}
      {updateMutation.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Updating instrument...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export const InstrumentDetail: React.FC<InstrumentDetailProps> = ({
  instrumentId,
  onEdit,
  onBack,
  onDelete,
  className
}) => {
  const { data: instrument, isLoading, error } = useInstrument(instrumentId)

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading instrument details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("text-center p-8", className)}>
        <div className="text-red-600 mb-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Error Loading Instrument</h3>
          <p className="text-sm text-gray-600 mt-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          Go Back
        </Button>
      </div>
    )
  }

  if (!instrument) {
    return (
      <div className={cn("text-center p-8", className)}>
        <div className="text-gray-500 mb-4">
          <AlertCircle className="w-12 h-12 mx-auto mb-2" />
          <h3 className="text-lg font-semibold">Instrument Not Found</h3>
          <p className="text-sm text-gray-600 mt-2">
            The instrument you're looking for doesn't exist or has been removed.
          </p>
        </div>
        <Button onClick={onBack} variant="outline">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <InstrumentDetailView
      instrument={instrument}
      onEdit={onEdit}
      onBack={onBack}
      onDelete={onDelete}
      className={className}
    />
  )
}

export default InstrumentDetail