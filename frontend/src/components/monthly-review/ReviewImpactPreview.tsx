import React from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  BarChart3,
  Target,
  Users,
  Leaf
} from 'lucide-react'

interface PreviewData {
  current: {
    totalInstruments: number
    esgCompliant: number
    veganFriendly: number
    utilizationPercentage: number
    availableSlots: number
  }
  projected: {
    totalInstruments: number
    esgCompliant: number
    veganFriendly: number
    utilizationPercentage: number
    availableSlots: number
  }
  impact: {
    instrumentChange: number
    esgChange: number
    veganChange: number
    willExceedLimit: boolean
  }
  candidates: {
    additions: any[]
    removals: any[]
  }
}

interface ReviewImpactPreviewProps {
  reviewId: number
  previewData?: PreviewData
  isLoading?: boolean
}

const ReviewImpactPreview: React.FC<ReviewImpactPreviewProps> = ({
  reviewId: _reviewId,
  previewData,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Previsualización de Impacto
        </h3>
        <LoadingSpinner />
      </Card>
    )
  }

  if (!previewData) {
    return null
  }

  const { current, projected, impact, candidates } = previewData

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return null
  }

  const formatChange = (change: number, showPlus = true) => {
    if (change === 0) return '±0'
    return `${showPlus && change > 0 ? '+' : ''}${change}`
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Previsualización de Impacto
        </h3>
        {impact.willExceedLimit && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Excederá Límite
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Instruments */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className={`text-sm font-medium flex items-center gap-1 ${getChangeColor(impact.instrumentChange)}`}>
              {getChangeIcon(impact.instrumentChange)}
              {formatChange(impact.instrumentChange)}
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {current.totalInstruments} → {projected.totalInstruments}
          </div>
          <div className="text-sm text-blue-700">Total Instrumentos</div>
          <div className="text-xs text-gray-600 mt-1">
            Utilización: {projected.utilizationPercentage.toFixed(1)}%
          </div>
        </div>

        {/* ESG Compliance */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className={`text-sm font-medium flex items-center gap-1 ${getChangeColor(impact.esgChange)}`}>
              {getChangeIcon(impact.esgChange)}
              {formatChange(impact.esgChange)}
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {current.esgCompliant} → {projected.esgCompliant}
          </div>
          <div className="text-sm text-purple-700">ESG Compliant</div>
          <div className="text-xs text-gray-600 mt-1">
            {projected.totalInstruments > 0 ? ((projected.esgCompliant / projected.totalInstruments) * 100).toFixed(1) : 0}% del total
          </div>
        </div>

        {/* Vegan Friendly */}
        <div className="bg-emerald-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <span className={`text-sm font-medium flex items-center gap-1 ${getChangeColor(impact.veganChange)}`}>
              {getChangeIcon(impact.veganChange)}
              {formatChange(impact.veganChange)}
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {current.veganFriendly} → {projected.veganFriendly}
          </div>
          <div className="text-sm text-emerald-700">Vegan Friendly</div>
          <div className="text-xs text-gray-600 mt-1">
            {projected.totalInstruments > 0 ? ((projected.veganFriendly / projected.totalInstruments) * 100).toFixed(1) : 0}% del total
          </div>
        </div>

        {/* Available Slots */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className={`text-sm font-medium ${impact.willExceedLimit ? 'text-red-600' : 'text-gray-600'}`}>
              {projected.availableSlots < 0 ? 'EXCEDE' : 'DISPONIBLE'}
            </span>
          </div>
          <div className={`text-2xl font-bold ${impact.willExceedLimit ? 'text-red-600' : 'text-gray-600'}`}>
            {current.availableSlots} → {projected.availableSlots}
          </div>
          <div className="text-sm text-gray-700">Slots Disponibles</div>
          <div className="text-xs text-gray-600 mt-1">
            de 100 máximo
          </div>
        </div>
      </div>

      {/* Warnings */}
      {impact.willExceedLimit && (
        <div className="mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 mb-1">
                  Advertencia: Límite de Instrumentos Excedido
                </h4>
                <p className="text-sm text-red-700">
                  Los cambios propuestos resultarían en {projected.totalInstruments} instrumentos, 
                  excediendo el límite máximo de 100. Debes rechazar algunos candidatos para adición 
                  o aprobar más candidatos para remoción.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changes Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Additions */}
        {candidates.additions.length > 0 && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Adiciones Pendientes ({candidates.additions.length})
            </h4>
            <div className="space-y-2">
              {candidates.additions.slice(0, 5).map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">
                    {candidate.symbol}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {candidate.recommendation?.replace('_', ' ')}
                    </Badge>
                    <span className="text-gray-600">
                      {candidate.confidenceScore?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              {candidates.additions.length > 5 && (
                <div className="text-sm text-gray-600 text-center pt-2">
                  +{candidates.additions.length - 5} más...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Removals */}
        {candidates.removals.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium text-red-900 mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Remociones Pendientes ({candidates.removals.length})
            </h4>
            <div className="space-y-2">
              {candidates.removals.slice(0, 5).map((candidate: any) => (
                <div key={candidate.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">
                    {candidate.ticker || candidate.symbol}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        candidate.severity === 'CRITICAL' ? 'destructive' :
                        candidate.severity === 'HIGH' ? 'destructive' : 'secondary'
                      }
                      size="sm"
                    >
                      {candidate.severity}
                    </Badge>
                    <span className="text-gray-600">
                      {candidate.confidenceScore?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              {candidates.removals.length > 5 && (
                <div className="text-sm text-gray-600 text-center pt-2">
                  +{candidates.removals.length - 5} más...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Impact Summary */}
      {(impact.instrumentChange !== 0 || impact.esgChange !== 0 || impact.veganChange !== 0) && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Resumen de Impacto</h4>
          <div className="text-sm text-blue-800 space-y-1">
            {impact.instrumentChange !== 0 && (
              <div>
                • La watchlist {impact.instrumentChange > 0 ? 'crecerá' : 'se reducirá'} en {Math.abs(impact.instrumentChange)} instrumentos
              </div>
            )}
            {impact.esgChange !== 0 && (
              <div>
                • {impact.esgChange > 0 ? 'Se agregarán' : 'Se removerán'} {Math.abs(impact.esgChange)} instrumentos ESG compliant
              </div>
            )}
            {impact.veganChange !== 0 && (
              <div>
                • {impact.veganChange > 0 ? 'Se agregarán' : 'Se removerán'} {Math.abs(impact.veganChange)} instrumentos vegan-friendly
              </div>
            )}
            {impact.willExceedLimit && (
              <div className="text-red-700 font-medium">
                • ⚠️ Se excederá el límite máximo de 100 instrumentos
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export default ReviewImpactPreview