import React, { useState } from 'react'
import { Button } from '../ui/Button'
import { CheckSquare, XSquare, Filter } from 'lucide-react'

interface Candidate {
  id?: number
  recommendation?: string
  confidenceScore?: number
  severity?: string
}

interface ReviewApprovalActionsProps {
  candidates: Candidate[]
  candidateType: 'addition' | 'removal'
  reviewId: number
  onBulkAction: any // Mutation from useMonthlyReview
}

const ReviewApprovalActions: React.FC<ReviewApprovalActionsProps> = ({
  candidates,
  candidateType,
  reviewId,
  onBulkAction
}) => {
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  const handleSelectAll = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set())
    } else {
      const allIds = candidates.map(c => c.id!).filter(id => id !== undefined)
      setSelectedCandidates(new Set(allIds))
    }
  }

  const handleSelectByRecommendation = (recommendation: string) => {
    const filteredIds = candidates
      .filter(c => c.recommendation === recommendation)
      .map(c => c.id!)
      .filter(id => id !== undefined)
    
    setSelectedCandidates(new Set(filteredIds))
  }

  const handleSelectByConfidence = (minConfidence: number) => {
    const filteredIds = candidates
      .filter(c => (c.confidenceScore || 0) >= minConfidence)
      .map(c => c.id!)
      .filter(id => id !== undefined)
    
    setSelectedCandidates(new Set(filteredIds))
  }

  const handleSelectBySeverity = (severity: string) => {
    const filteredIds = candidates
      .filter(c => c.severity === severity)
      .map(c => c.id!)
      .filter(id => id !== undefined)
    
    setSelectedCandidates(new Set(filteredIds))
  }

  const handleBulkApprove = () => {
    if (selectedCandidates.size === 0) return

    onBulkAction.mutate({
      candidateIds: Array.from(selectedCandidates),
      candidateType,
      action: 'approve',
      reviewId
    })

    setSelectedCandidates(new Set())
  }

  const handleBulkReject = () => {
    if (selectedCandidates.size === 0) return

    onBulkAction.mutate({
      candidateIds: Array.from(selectedCandidates),
      candidateType,
      action: 'reject',
      reviewId
    })

    setSelectedCandidates(new Set())
  }

  const getUniqueRecommendations = () => {
    return [...new Set(candidates.map(c => c.recommendation).filter(Boolean))]
  }

  const getUniqueSeverities = () => {
    return [...new Set(candidates.map(c => c.severity).filter(Boolean))]
  }

  if (candidates.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
        
        {selectedCandidates.size > 0 && (
          <>
            <Button
              onClick={handleBulkApprove}
              disabled={onBulkAction.isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
            >
              <CheckSquare className="w-4 h-4" />
              Aprobar ({selectedCandidates.size})
            </Button>
            <Button
              onClick={handleBulkReject}
              disabled={onBulkAction.isPending}
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50 flex items-center gap-1"
            >
              <XSquare className="w-4 h-4" />
              Rechazar ({selectedCandidates.size})
            </Button>
          </>
        )}
      </div>

      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Selección Rápida</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Select All */}
            <Button
              onClick={handleSelectAll}
              variant="outline"
              size="sm"
              className="justify-start"
            >
              {selectedCandidates.size === candidates.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              <span className="ml-auto text-gray-500">({candidates.length})</span>
            </Button>

            {/* By Recommendation */}
            {candidateType === 'addition' && (
              <>
                {getUniqueRecommendations().includes('STRONG_ADD') && (
                  <Button
                    onClick={() => handleSelectByRecommendation('STRONG_ADD')}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    Strong Add
                    <span className="ml-auto text-gray-500">
                      ({candidates.filter(c => c.recommendation === 'STRONG_ADD').length})
                    </span>
                  </Button>
                )}
                {getUniqueRecommendations().includes('ADD') && (
                  <Button
                    onClick={() => handleSelectByRecommendation('ADD')}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    Add
                    <span className="ml-auto text-gray-500">
                      ({candidates.filter(c => c.recommendation === 'ADD').length})
                    </span>
                  </Button>
                )}
              </>
            )}

            {candidateType === 'removal' && (
              <>
                {getUniqueSeverities().includes('CRITICAL') && (
                  <Button
                    onClick={() => handleSelectBySeverity('CRITICAL')}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    Críticos
                    <span className="ml-auto text-gray-500">
                      ({candidates.filter(c => c.severity === 'CRITICAL').length})
                    </span>
                  </Button>
                )}
                {getUniqueSeverities().includes('HIGH') && (
                  <Button
                    onClick={() => handleSelectBySeverity('HIGH')}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                  >
                    Alta Prioridad
                    <span className="ml-auto text-gray-500">
                      ({candidates.filter(c => c.severity === 'HIGH').length})
                    </span>
                  </Button>
                )}
              </>
            )}

            {/* By Confidence */}
            <Button
              onClick={() => handleSelectByConfidence(90)}
              variant="outline"
              size="sm"
              className="justify-start"
            >
              Confianza ≥ 90%
              <span className="ml-auto text-gray-500">
                ({candidates.filter(c => (c.confidenceScore || 0) >= 90).length})
              </span>
            </Button>

            <Button
              onClick={() => handleSelectByConfidence(80)}
              variant="outline"
              size="sm"
              className="justify-start"
            >
              Confianza ≥ 80%
              <span className="ml-auto text-gray-500">
                ({candidates.filter(c => (c.confidenceScore || 0) >= 80).length})
              </span>
            </Button>
          </div>

          {/* Individual Selection */}
          <div className="mt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Selección Individual</h5>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {candidates.map((candidate) => (
                <label key={candidate.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCandidates.has(candidate.id!)}
                    onChange={(e) => {
                      const newSelection = new Set(selectedCandidates)
                      if (e.target.checked) {
                        newSelection.add(candidate.id!)
                      } else {
                        newSelection.delete(candidate.id!)
                      }
                      setSelectedCandidates(newSelection)
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1">
                    {(candidate as any).symbol || (candidate as any).ticker || `ID: ${candidate.id}`}
                  </span>
                  <span className="text-gray-500">
                    {candidate.confidenceScore?.toFixed(0)}%
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewApprovalActions