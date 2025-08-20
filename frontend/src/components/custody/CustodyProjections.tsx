import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface CustodyProjectionsProps {
  currentPortfolioValue: number
}

export const CustodyProjections: React.FC<CustodyProjectionsProps> = ({
  currentPortfolioValue
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Proyecciones de Custodia</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Componente en desarrollo - mostrará proyecciones futuras de custodia</p>
        <p>Valor actual: ${currentPortfolioValue.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}