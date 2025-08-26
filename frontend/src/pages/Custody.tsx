import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Alert, AlertDescription } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { CustodyCurrentStatus } from '../components/custody/CustodyCurrentStatus'
import { CustodyHistory } from '../components/custody/CustodyHistory'
import { CustodyProjections } from '../components/custody/CustodyProjections'
import { CustodyOptimizer } from '../components/custody/CustodyOptimizer'
import { useCustodyStatus } from '../hooks/useCustody'
import { Shield, Calendar, TrendingUp, Settings } from 'lucide-react'

export const CustodyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('current')
  const { 
    data: custodyStatus, 
    isLoading, 
    error, 
    refetch 
  } = useCustodyStatus()

  const handleRefresh = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-lg">Cargando información de custodia...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Error al cargar la información de custodia: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  const isExempt = custodyStatus?.custodyCalculation?.isExempt
  const monthlyFee = custodyStatus?.custodyCalculation?.totalMonthlyCost || 0
  const portfolioValue = custodyStatus?.currentPortfolioValue || 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Custodia
          </h1>
          <p className="text-gray-600 mt-2">
            Administra y optimiza los costos de custodia de tu cartera
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge 
            variant={isExempt ? 'success' : 'warning'}
            className="text-sm px-3 py-1"
          >
            {isExempt ? '✅ Exento' : '💰 Con Custodia'}
          </Badge>
          <Button onClick={handleRefresh} variant="outline">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Valor de Cartera</p>
                <p className="text-lg font-semibold">
                  ${portfolioValue.toLocaleString()} ARS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Custodia Mensual</p>
                <p className="text-lg font-semibold">
                  ${monthlyFee.toFixed(2)} ARS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Próximo Cobro</p>
                <p className="text-lg font-semibold">
                  {custodyStatus?.nextCustodyDate || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Estado Actual</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="projections" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Proyecciones</span>
          </TabsTrigger>
          <TabsTrigger value="optimizer" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Optimizador</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <CustodyCurrentStatus 
            custodyStatus={custodyStatus}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <CustodyHistory />
        </TabsContent>

        <TabsContent value="projections" className="mt-6">
          <CustodyProjections 
            currentPortfolioValue={portfolioValue}
          />
        </TabsContent>

        <TabsContent value="optimizer" className="mt-6">
          <CustodyOptimizer 
            currentPortfolioValue={portfolioValue}
            currentCustodyFee={monthlyFee}
            isExempt={isExempt}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CustodyPage