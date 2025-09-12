import React, { useState } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useMonthlyReview } from '../../hooks/useMonthlyReview'
import {
  Calendar,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react'

interface ReviewDetailsProps {
  review: any
  reviewDetails: any
  isLoading: boolean
}

const ReviewDetailsSection: React.FC<ReviewDetailsProps> = ({
  review,
  reviewDetails,
  isLoading
}) => {
  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!reviewDetails) {
    return (
      <div className="text-sm text-gray-600">
        Error al cargar los detalles de la revisión.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-lg font-semibold text-green-600">
            {reviewDetails.candidates.additions.length}
          </div>
          <div className="text-xs text-gray-600">Candidatos Agregar</div>
        </div>
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-lg font-semibold text-red-600">
            {reviewDetails.candidates.removals.length}
          </div>
          <div className="text-xs text-gray-600">Candidatos Remover</div>
        </div>
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-lg font-semibold text-blue-600">
            {review.autoApproved || 0}
          </div>
          <div className="text-xs text-gray-600">Auto-aprobados</div>
        </div>
        <div className="text-center p-3 bg-white rounded border">
          <div className="text-lg font-semibold text-yellow-600">
            {review.userRejected || 0}
          </div>
          <div className="text-xs text-gray-600">Rechazados</div>
        </div>
      </div>

      {/* Candidates Preview */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Addition Candidates */}
        {reviewDetails.candidates.additions.length > 0 && (
          <div className="bg-white p-4 rounded border">
            <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Candidatos para Agregar
            </h5>
            <div className="space-y-1">
              {reviewDetails.candidates.additions.slice(0, 5).map((candidate: any) => (
                <div key={candidate.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{candidate.symbol}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {candidate.recommendation?.replace('_', ' ')}
                    </Badge>
                    <span className="text-gray-500">
                      {candidate.confidenceScore?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              {reviewDetails.candidates.additions.length > 5 && (
                <div className="text-xs text-gray-500 text-center pt-1">
                  +{reviewDetails.candidates.additions.length - 5} más...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Removal Candidates */}
        {reviewDetails.candidates.removals.length > 0 && (
          <div className="bg-white p-4 rounded border">
            <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              Candidatos para Remover
            </h5>
            <div className="space-y-1">
              {reviewDetails.candidates.removals.slice(0, 5).map((candidate: any) => (
                <div key={candidate.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{candidate.ticker || candidate.symbol}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        candidate.severity === 'CRITICAL' || candidate.severity === 'HIGH'
                          ? 'destructive'
                          : 'secondary'
                      }
                      size="sm"
                    >
                      {candidate.severity}
                    </Badge>
                    <span className="text-gray-500">
                      {candidate.confidenceScore?.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              {reviewDetails.candidates.removals.length > 5 && (
                <div className="text-xs text-gray-500 text-center pt-1">
                  +{reviewDetails.candidates.removals.length - 5} más...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Claude Report Summary */}
      {review.claudeReport && (
        <div className="bg-white p-4 rounded border">
          <h5 className="font-medium text-gray-900 mb-2">Reporte de Claude</h5>
          <div className="text-sm text-gray-600">
            {typeof review.claudeReport === 'string'
              ? review.claudeReport.substring(0, 200) + '...'
              : JSON.stringify(review.claudeReport).substring(0, 200) + '...'}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-white p-4 rounded border">
        <h5 className="font-medium text-gray-900 mb-2">Timeline</h5>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Iniciada:</span>
            <span>{review.scanStartedAt ? new Date(review.scanStartedAt).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Completada:</span>
            <span>{review.scanCompletedAt ? new Date(review.scanCompletedAt).toLocaleString() : 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span>Revisión Usuario:</span>
            <span>{
              review.userReviewCompletedAt
                ? new Date(review.userReviewCompletedAt).toLocaleString()
                : 'Pendiente'
            }</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const ReviewHistory: React.FC = () => {
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const limit = 10

  const {
    reviewHistory,
    isLoadingHistory,
    getReviewDetails,
    reviewDetails
  } = useMonthlyReview(page * limit, limit)

  const handleViewDetails = (reviewId: number) => {
    if (selectedReviewId === reviewId) {
      setSelectedReviewId(null)
    } else {
      setSelectedReviewId(reviewId)
      getReviewDetails.mutate(reviewId)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-yellow-600" />
      case 'PENDING':
        return <AlertCircle className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success'
      case 'FAILED':
        return 'destructive'
      case 'IN_PROGRESS':
        return 'secondary'
      case 'PENDING':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 'N/A'
    
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const diffMinutes = Math.round((end - start) / (1000 * 60))
    
    if (diffMinutes < 60) return `${diffMinutes}m`
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    return `${hours}h ${minutes}m`
  }

  if (isLoadingHistory) {
    return (
      <Card className="p-6">
        <LoadingSpinner />
      </Card>
    )
  }

  if (!reviewHistory?.data?.reviews || reviewHistory.data.reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay historial de revisiones
        </h3>
        <p className="text-gray-600">
          Las revisiones mensuales aparecerán aquí después de ejecutarse.
        </p>
      </Card>
    )
  }

  const { reviews, stats } = reviewHistory.data

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Estadísticas Generales
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalReviews}
            </div>
            <div className="text-sm text-blue-700">Total Revisiones</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.completedReviews}
            </div>
            <div className="text-sm text-green-700">Completadas</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.avgInstrumentsScanned || 0}
            </div>
            <div className="text-sm text-yellow-700">Promedio Escaneados</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {stats.avgProcessingTime ? `${Math.round(stats.avgProcessingTime)}m` : 'N/A'}
            </div>
            <div className="text-sm text-purple-700">Tiempo Promedio</div>
          </div>
        </div>
      </Card>

      {/* Reviews List */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Historial de Revisiones</h3>
        
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="border border-gray-200 rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleViewDetails(review.id!)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(review.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Revisión {formatDate(review.reviewDate)}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span>ID: {review.id}</span>
                        <span>
                          Duración: {formatDuration(review.scanStartedAt, review.scanCompletedAt)}
                        </span>
                        {review.totalInstrumentsScanned && (
                          <span>Escaneados: {review.totalInstrumentsScanned}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant={getStatusColor(review.status) as any}>
                        {review.status}
                      </Badge>
                      {review.pendingApprovals !== undefined && review.pendingApprovals > 0 && (
                        <div className="text-sm text-orange-600 mt-1">
                          {review.pendingApprovals} pendientes
                        </div>
                      )}
                    </div>
                    
                    <ChevronRight 
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        selectedReviewId === review.id ? 'rotate-90' : ''
                      }`} 
                    />
                  </div>
                </div>
              </div>

              {/* Review Details */}
              {selectedReviewId === review.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <ReviewDetailsSection
                    review={review}
                    reviewDetails={reviewDetails}
                    isLoading={getReviewDetails.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {stats.totalReviews > limit && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              variant="outline"
              size="sm"
            >
              Anterior
            </Button>
            
            <span className="text-sm text-gray-600">
              Página {page + 1} de {Math.ceil(stats.totalReviews / limit)}
            </span>
            
            <Button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= stats.totalReviews}
              variant="outline"
              size="sm"
            >
              Siguiente
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ReviewHistory