import React, { useState } from 'react'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Alert } from '../components/ui/Alert'
import { useMonthlyReview } from '../hooks/useMonthlyReview'
import ReviewCandidateCard from '../components/monthly-review/ReviewCandidateCard'
import ReviewApprovalActions from '../components/monthly-review/ReviewApprovalActions'
import ReviewImpactPreview from '../components/monthly-review/ReviewImpactPreview'
import ReviewHistory from '../components/monthly-review/ReviewHistory'
import { 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Settings,
  Play,
  Eye
} from 'lucide-react'

const MonthlyReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState('current')
  const {
    currentReview,
    isLoadingCurrent,
    previewChanges,
    watchlistStats,
    jobStatus,
    triggerManualReview,
    applyChanges,
    approveCandidate,
    rejectCandidate,
    bulkUpdateCandidates,
    refetchCurrent,
    isLoadingPreview
  } = useMonthlyReview()

  const handleTriggerManualReview = async () => {
    try {
      await triggerManualReview.mutateAsync()
      // Refresh current review data
      refetchCurrent()
    } catch (error) {
      // Error handling for manual review trigger
    }
  }

  const handleApplyChanges = async (dryRun = false) => {
    if (!currentReview?.data?.review?.id) return
    
    try {
      await applyChanges.mutateAsync({
        reviewId: currentReview.data.review.id,
        dryRun
      })
      refetchCurrent()
    } catch (error) {
      // Error handling for apply changes
    }
  }

  const renderCurrentReview = () => {
    if (isLoadingCurrent) {
      return <LoadingSpinner />
    }

    if (!currentReview?.data?.review) {
      return (
        <Card className="p-8 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay revisión mensual activa
          </h3>
          <p className="text-gray-600 mb-6">
            La próxima revisión automática se ejecutará el 1° de cada mes a las 6:00 AM.
          </p>
          <Button 
            onClick={handleTriggerManualReview}
            disabled={triggerManualReview.isPending}
            className="inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Ejecutar Revisión Manual
          </Button>
        </Card>
      )
    }

    const { review, candidates, pendingChanges: reviewPending, needsUserAction } = currentReview.data
    
    return (
      <div className="space-y-6">
        {/* Review Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Revisión Mensual - {new Date(review.reviewDate).toLocaleDateString()}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <Badge 
                  variant={
                    review.status === 'COMPLETED' ? 'success' : 
                    review.status === 'IN_PROGRESS' ? 'secondary' : 
                    review.status === 'FAILED' ? 'destructive' : 'secondary'
                  }
                >
                  {review.status}
                </Badge>
                {needsUserAction && (
                  <Badge variant="destructive" className="animate-pulse">
                    Acción Requerida
                  </Badge>
                )}
              </div>
            </div>
            {review.status === 'COMPLETED' && (
              <div className="text-right">
                <Button 
                  onClick={() => handleApplyChanges(true)}
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  disabled={applyChanges.isPending}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Simular
                </Button>
                <Button 
                  onClick={() => handleApplyChanges(false)}
                  disabled={applyChanges.isPending || (reviewPending.additions.length + reviewPending.removals.length === 0)}
                  className="inline-flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aplicar Cambios Aprobados
                </Button>
              </div>
            )}
          </div>

          {/* Review Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {candidates.additions.length}
              </div>
              <div className="text-sm text-blue-700">Candidatos para Agregar</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {candidates.removals.length}
              </div>
              <div className="text-sm text-red-700">Candidatos para Remover</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {review.autoApproved || 0}
              </div>
              <div className="text-sm text-green-700">Auto-aprobados</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {review.pendingApprovals || 0}
              </div>
              <div className="text-sm text-yellow-700">Pendientes</div>
            </div>
          </div>
        </Card>

        {/* Pending Candidates */}
        {needsUserAction && (
          <div className="space-y-4">
            {/* Addition Candidates */}
            {reviewPending.additions.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Candidatos para Agregar ({reviewPending.additions.length})
                  </h3>
                  <ReviewApprovalActions
                    candidates={reviewPending.additions}
                    candidateType="addition"
                    reviewId={review.id!}
                    onBulkAction={bulkUpdateCandidates}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reviewPending.additions.map((candidate) => (
                    <ReviewCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      candidateType="addition"
                      onApprove={() => approveCandidate.mutate({ 
                        candidateId: candidate.id!, 
                        candidateType: 'addition',
                        reviewId: review.id!
                      })}
                      onReject={() => rejectCandidate.mutate({ 
                        candidateId: candidate.id!, 
                        candidateType: 'addition',
                        reviewId: review.id!
                      })}
                      isLoading={approveCandidate.isPending || rejectCandidate.isPending}
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Removal Candidates */}
            {reviewPending.removals.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Candidatos para Remover ({reviewPending.removals.length})
                  </h3>
                  <ReviewApprovalActions
                    candidates={reviewPending.removals}
                    candidateType="removal"
                    reviewId={review.id!}
                    onBulkAction={bulkUpdateCandidates}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reviewPending.removals.map((candidate) => (
                    <ReviewCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      candidateType="removal"
                      onApprove={() => approveCandidate.mutate({ 
                        candidateId: candidate.id!, 
                        candidateType: 'removal',
                        reviewId: review.id!
                      })}
                      onReject={() => rejectCandidate.mutate({ 
                        candidateId: candidate.id!, 
                        candidateType: 'removal',
                        reviewId: review.id!
                      })}
                      isLoading={approveCandidate.isPending || rejectCandidate.isPending}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Impact Preview */}
        <ReviewImpactPreview
          reviewId={review.id!}
          previewData={previewChanges?.data}
          isLoading={isLoadingPreview}
        />
      </div>
    )
  }

  const renderWatchlistStats = () => {
    if (!watchlistStats?.data) {
      return <LoadingSpinner />
    }

    const { stats, suggestions } = watchlistStats.data

    return (
      <div className="space-y-6">
        {/* Current Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Estadísticas de la Watchlist
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {stats.totalInstruments}
              </div>
              <div className="text-sm text-blue-700">Total Instrumentos</div>
              <div className="text-xs text-gray-500">de 100 máximo</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {stats.utilizationPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-green-700">Utilización</div>
              <div className="text-xs text-gray-500">{stats.availableSlots} slots libres</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {stats.esgCompliant}
              </div>
              <div className="text-sm text-purple-700">ESG Compliant</div>
              <div className="text-xs text-gray-500">
                {((stats.esgCompliant / stats.totalInstruments) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-3xl font-bold text-emerald-600">
                {stats.veganFriendly}
              </div>
              <div className="text-sm text-emerald-700">Vegan Friendly</div>
              <div className="text-xs text-gray-500">
                {((stats.veganFriendly / stats.totalInstruments) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Sector Distribution */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Distribución por Sector</h4>
            <div className="space-y-2">
              {Object.entries(stats.bySection).map(([sector, count]) => (
                <div key={sector} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{sector}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(count / stats.totalInstruments) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Optimization Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Sugerencias de Optimización
            </h3>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <Alert
                  key={index}
                  variant={
                    suggestion.priority === 'high' ? 'destructive' :
                    suggestion.priority === 'medium' ? 'warning' : 'default'
                  }
                >
                  <AlertCircle className="w-4 h-4" />
                  <div>
                    <div className="font-medium capitalize">{suggestion.type.replace('_', ' ')}</div>
                    <div className="text-sm">{suggestion.message}</div>
                  </div>
                </Alert>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  const renderJobStatus = () => {
    if (!jobStatus?.data) {
      return <LoadingSpinner />
    }

    const status = jobStatus.data

    return (
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Estado del Sistema
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Próximas Ejecuciones</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Próxima Revisión:</span>
                <span className="font-medium">
                  {new Date(status.nextReviewDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recordatorio:</span>
                <span className="font-medium">
                  {new Date(status.nextReminderDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Verificación:</span>
                <span className="font-medium">
                  {new Date(status.nextStatusCheck).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Limpieza:</span>
                <span className="font-medium">
                  {new Date(status.nextCleanup).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Estado Actual</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${status.isRunning ? 'bg-yellow-500' : 'bg-green-500'}`} />
                <span>{status.isRunning ? 'Revisión en progreso' : 'Sistema inactivo'}</span>
              </div>
              <div className="text-gray-600">
                Zona horaria: {status.timezone}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button 
            onClick={handleTriggerManualReview}
            disabled={triggerManualReview.isPending || status.isRunning}
            className="inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {status.isRunning ? 'Revisión en Progreso...' : 'Ejecutar Revisión Manual'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revisión Mensual</h1>
        <p className="text-gray-600">
          Gestión automática de la watchlist con análisis ESG y criterios veganos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'current' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('current')}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Revisión Actual
          </Button>
          <Button
            variant={activeTab === 'stats' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('stats')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Estadísticas
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Historial
          </Button>
          <Button
            variant={activeTab === 'system' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('system')}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Sistema
          </Button>
        </div>

        <div className="mt-6">
          {activeTab === 'current' && renderCurrentReview()}
          {activeTab === 'stats' && renderWatchlistStats()}
          {activeTab === 'history' && <ReviewHistory />}
          {activeTab === 'system' && renderJobStatus()}
        </div>
      </Tabs>
    </div>
  )
}

export default MonthlyReview