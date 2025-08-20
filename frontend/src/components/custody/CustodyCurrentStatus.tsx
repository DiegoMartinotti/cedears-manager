import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Alert, AlertDescription } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useCustodyCalculation, useRunMonthlyJob } from '../../hooks/useCustody'
import { custodyService } from '../../services/custodyService'
import type { CustodyStatus } from '../../types/custody'
import { 
  Shield, 
  Calculator, 
  Calendar, 
  Play, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface CustodyCurrentStatusProps {
  custodyStatus?: CustodyStatus
  onRefresh?: () => void
}

export const CustodyCurrentStatus: React.FC<CustodyCurrentStatusProps> = ({
  custodyStatus,
  onRefresh
}) => {
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationResult, setCalculationResult] = useState<any>(null)
  
  const { mutateAsync: calculateCustody } = useCustodyCalculation()
  const { mutateAsync: runMonthlyJob, isPending: isRunningJob } = useRunMonthlyJob()

  if (!custodyStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Cargando estado de custodia...</span>
      </div>
    )
  }

  const { 
    currentPortfolioValue, 
    custodyCalculation, 
    isExempt, 
    nextCustodyDate,
    jobStatus 
  } = custodyStatus

  const handleRecalculate = async () => {
    setIsCalculating(true)
    try {
      const result = await calculateCustody({
        portfolioValue: currentPortfolioValue,
        broker: 'Galicia'
      })
      setCalculationResult(result)
    } catch (error) {
      console.error('Error recalculating custody:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleRunJob = async () => {
    try {
      await runMonthlyJob({ dryRun: true })
      onRefresh?.()
    } catch (error) {
      console.error('Error running monthly job:', error)
    }
  }

  const getExemptionStatus = () => {
    if (isExempt) {
      return {
        status: 'exempt',
        color: 'green',
        icon: CheckCircle,
        message: 'Tu cartera está exenta de custodia'
      }
    } else {
      return {
        status: 'paying',
        color: 'orange',
        icon: AlertCircle,
        message: 'Tu cartera está sujeta a custodia mensual'
      }
    }
  }

  const exemptionInfo = getExemptionStatus()
  const ExemptionIcon = exemptionInfo.icon

  const recommendations = custodyService.generateRecommendations({
    isExempt,
    portfolioValue: currentPortfolioValue,
    monthlyCustody: custodyCalculation.totalMonthlyCost,
    exemptAmount: 1000000 // Debería venir de configuración
  })

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-${exemptionInfo.color}-100`}>
                <ExemptionIcon className={`h-5 w-5 text-${exemptionInfo.color}-600`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Estado</p>
                <Badge variant={isExempt ? 'success' : 'warning'}>
                  {isExempt ? 'Exento' : 'Con Custodia'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor de Cartera</p>
                <p className="text-lg font-semibold">
                  {custodyService.formatCurrency(currentPortfolioValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Custodia Mensual</p>
                <p className="text-lg font-semibold">
                  {custodyService.formatCurrency(custodyCalculation.totalMonthlyCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Custodia Anual</p>
                <p className="text-lg font-semibold">
                  {custodyService.formatCurrency(custodyCalculation.annualFee)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custody Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Detalles de Custodia</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monto Aplicable:</span>
                <span className="font-medium">
                  {custodyService.formatCurrency(custodyCalculation.applicableAmount)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Fee Mensual (sin IVA):</span>
                <span className="font-medium">
                  {custodyService.formatCurrency(custodyCalculation.monthlyFee)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">IVA (21%):</span>
                <span className="font-medium">
                  {custodyService.formatCurrency(custodyCalculation.ivaAmount)}
                </span>
              </div>
              
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Mensual:</span>
                <span className="font-semibold text-lg">
                  {custodyService.formatCurrency(custodyCalculation.totalMonthlyCost)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Impacto Anual:</span>
                <span className="font-medium">
                  {custodyService.calculateImpactPercentage(
                    custodyCalculation.annualFee, 
                    currentPortfolioValue
                  ).toFixed(2)}% del valor de cartera
                </span>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button 
                onClick={handleRecalculate}
                disabled={isCalculating}
                variant="outline"
                className="w-full"
              >
                {isCalculating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Recalculando...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Recalcular Custodia
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Job Status & Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Job Automatizado</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <Badge variant={jobStatus.isRunning ? 'default' : 'secondary'}>
                  {jobStatus.isRunning ? 'Ejecutándose' : 'Inactivo'}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Última Ejecución:</span>
                <span className="font-medium">
                  {jobStatus.lastExecution 
                    ? new Date(jobStatus.lastExecution).toLocaleDateString('es-AR')
                    : 'Nunca'
                  }
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Próxima Ejecución:</span>
                <span className="font-medium">
                  {nextCustodyDate || 'No programada'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Ejecuciones Exitosas:</span>
                <span className="font-medium text-green-600">
                  {jobStatus.successfulExecutions}
                </span>
              </div>
              
              {jobStatus.failedExecutions > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fallos:</span>
                  <span className="font-medium text-red-600">
                    {jobStatus.failedExecutions}
                  </span>
                </div>
              )}
            </div>

            <Button 
              onClick={handleRunJob}
              disabled={isRunningJob}
              variant="outline"
              className="w-full"
            >
              {isRunningJob ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Ejecutando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Ejecutar Job (Dry Run)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Result */}
      {calculationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado del Recálculo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Valor de Cartera:</strong> {custodyService.formatCurrency(calculationResult.portfolioValue)}</p>
              <p><strong>Custodia Mensual:</strong> {custodyService.formatCurrency(calculationResult.custodyCalculation.totalMonthlyCost)}</p>
              <p><strong>Estado:</strong> {calculationResult.custodyCalculation.isExempt ? 'Exento' : 'Con Custodia'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}