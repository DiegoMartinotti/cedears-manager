import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  AlertTriangle,
  Check,
  X,
  Building2,
  DollarSign,
  BarChart3
} from 'lucide-react'

interface Candidate {
  id?: number
  symbol?: string
  name?: string
  ticker?: string
  sector?: string
  recommendation: string
  confidenceScore: number
  esgScore?: number
  veganScore?: number
  marketCap?: number
  avgVolume?: number
  reasons?: string
  severity?: string
  reason?: string
  currentEsgScore?: number
  currentVeganScore?: number
  previousEsgScore?: number
  previousVeganScore?: number
  lostCriteria?: string
}

interface ReviewCandidateCardProps {
  candidate: Candidate
  candidateType: 'addition' | 'removal'
  onApprove: () => void
  onReject: () => void
  isLoading?: boolean
}

const ReviewCandidateCard: React.FC<ReviewCandidateCardProps> = ({
  candidate,
  candidateType,
  onApprove,
  onReject,
  isLoading = false
}) => {
  const symbol = candidate.symbol || candidate.ticker || 'N/A'
  const displayName = candidate.name || symbol

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'STRONG_ADD':
      case 'REMOVE_IMMEDIATELY':
        return 'destructive'
      case 'ADD':
      case 'REMOVE':
        return 'warning'
      case 'CONSIDER':
      case 'MONITOR':
        return 'secondary'
      case 'KEEP':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive'
      case 'HIGH':
        return 'warning'
      case 'MEDIUM':
        return 'secondary'
      case 'LOW':
        return 'success'
      default:
        return 'secondary'
    }
  }

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A'
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    return `$${value.toLocaleString()}`
  }

  const formatVolume = (value?: number) => {
    if (!value) return 'N/A'
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
    return value.toLocaleString()
  }

  const parseReasons = (reasons?: string) => {
    if (!reasons) return []
    try {
      return JSON.parse(reasons)
    } catch {
      return [reasons]
    }
  }

  const parseLostCriteria = (criteria?: string) => {
    if (!criteria) return []
    try {
      return JSON.parse(criteria)
    } catch {
      return [criteria]
    }
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {candidateType === 'addition' ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className="font-semibold text-gray-900">{symbol}</span>
          </div>
          <p className="text-sm text-gray-600 truncate" title={displayName}>
            {displayName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={getRecommendationColor(candidate.recommendation)}>
            {candidate.recommendation.replace('_', ' ')}
          </Badge>
          {candidate.severity && (
            <Badge variant={getSeverityColor(candidate.severity)} size="sm">
              {candidate.severity}
            </Badge>
          )}
        </div>
      </div>

      {/* Confidence Score */}
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-gray-600">Confianza:</span>
        <span className="font-medium">{candidate.confidenceScore.toFixed(1)}%</span>
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-green-500 rounded-full"
            style={{ width: `${candidate.confidenceScore}%` }}
          />
        </div>
      </div>

      {/* Details for Addition Candidates */}
      {candidateType === 'addition' && (
        <div className="space-y-2 mb-4">
          {candidate.sector && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Sector:</span>
              <span className="font-medium">{candidate.sector}</span>
            </div>
          )}
          
          {candidate.marketCap && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Market Cap:</span>
              <span className="font-medium">{formatCurrency(candidate.marketCap)}</span>
            </div>
          )}

          {candidate.avgVolume && (
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Volumen:</span>
              <span className="font-medium">{formatVolume(candidate.avgVolume)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="text-center p-2 bg-purple-50 rounded">
              <div className="text-lg font-bold text-purple-600">
                {candidate.esgScore?.toFixed(0) || 'N/A'}
              </div>
              <div className="text-xs text-purple-700">ESG Score</div>
            </div>
            <div className="text-center p-2 bg-emerald-50 rounded">
              <div className="text-lg font-bold text-emerald-600">
                {candidate.veganScore?.toFixed(0) || 'N/A'}
              </div>
              <div className="text-xs text-emerald-700">Vegan Score</div>
            </div>
          </div>

          {/* Reasons */}
          <div className="mt-3">
            <span className="text-xs font-medium text-gray-700">Razones:</span>
            <ul className="mt-1 space-y-1">
              {parseReasons(candidate.reasons).slice(0, 3).map((reason, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Details for Removal Candidates */}
      {candidateType === 'removal' && (
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-medium text-gray-700">Razón:</span>
              <p className="text-sm text-gray-600">{candidate.reason}</p>
            </div>
          </div>

          {/* Score Comparison */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-sm font-bold text-red-600">
                {candidate.previousEsgScore?.toFixed(0) || 'N/A'} → {candidate.currentEsgScore?.toFixed(0) || 'N/A'}
              </div>
              <div className="text-xs text-red-700">ESG Score</div>
              {candidate.previousEsgScore && candidate.currentEsgScore && (
                <div className="text-xs text-red-600">
                  ({candidate.currentEsgScore - candidate.previousEsgScore > 0 ? '+' : ''}{(candidate.currentEsgScore - candidate.previousEsgScore).toFixed(1)})
                </div>
              )}
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <div className="text-sm font-bold text-orange-600">
                {candidate.previousVeganScore?.toFixed(0) || 'N/A'} → {candidate.currentVeganScore?.toFixed(0) || 'N/A'}
              </div>
              <div className="text-xs text-orange-700">Vegan Score</div>
              {candidate.previousVeganScore && candidate.currentVeganScore && (
                <div className="text-xs text-orange-600">
                  ({candidate.currentVeganScore - candidate.previousVeganScore > 0 ? '+' : ''}{(candidate.currentVeganScore - candidate.previousVeganScore).toFixed(1)})
                </div>
              )}
            </div>
          </div>

          {/* Lost Criteria */}
          {candidate.lostCriteria && (
            <div className="mt-3">
              <span className="text-xs font-medium text-gray-700">Criterios Perdidos:</span>
              <ul className="mt-1 space-y-1">
                {parseLostCriteria(candidate.lostCriteria).map((criteria, index) => (
                  <li key={index} className="text-xs text-red-600 flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button
          onClick={onApprove}
          disabled={isLoading}
          size="sm"
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4 mr-1" />
          Aprobar
        </Button>
        <Button
          onClick={onReject}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4 mr-1" />
          Rechazar
        </Button>
      </div>
    </Card>
  )
}

export default ReviewCandidateCard