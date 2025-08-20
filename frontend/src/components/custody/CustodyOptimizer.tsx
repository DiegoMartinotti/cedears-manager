import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface CustodyOptimizerProps {
  currentPortfolioValue: number
  currentCustodyFee: number
  isExempt?: boolean
}

export const CustodyOptimizer: React.FC<CustodyOptimizerProps> = ({
  currentPortfolioValue,
  currentCustodyFee,
  isExempt
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimizador de Custodia</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo - optimizará el tamaño de cartera para minimizar custodia</p>
        <div className="mt-4 space-y-2">
          <p>Valor actual: ${currentPortfolioValue.toLocaleString()}</p>
          <p>Custodia mensual: ${currentCustodyFee.toFixed(2)}</p>
          <p>Estado: {isExempt ? 'Exento' : 'Con custodia'}</p>
        </div>
      </CardContent>
    </Card>
  )
}