export interface CommissionConfig {
  id?: number
  name: string
  broker: string
  isActive: boolean
  buy: {
    percentage: number    // Porcentaje de comisión (ej: 0.005 = 0.5%)
    minimum: number      // Comisión mínima en ARS
    iva: number         // Porcentaje de IVA (ej: 0.21 = 21%)
  }
  sell: {
    percentage: number
    minimum: number
    iva: number
  }
  custody: {
    exemptAmount: number        // Monto exento de custodia en ARS
    monthlyPercentage: number   // Porcentaje mensual de custodia
    monthlyMinimum: number      // Mínimo mensual de custodia en ARS
    iva: number
  }
}

export interface CommissionCalculation {
  baseCommission: number      // Comisión base sin IVA
  ivaAmount: number          // Monto del IVA
  totalCommission: number    // Comisión total (base + IVA)
  netAmount: number         // Monto neto después de comisiones
  breakdown: {
    operationType: 'BUY' | 'SELL'
    totalAmount: number
    commissionRate: number
    minimumApplied: boolean  // Si se aplicó la comisión mínima
    ivaRate: number
  }
}

export interface CustodyCalculation {
  applicableAmount: number    // Monto sobre el cual se calcula custodia
  monthlyFee: number         // Cuota mensual de custodia sin IVA
  annualFee: number         // Cuota anual total (incluyendo IVA)
  ivaAmount: number         // IVA mensual
  totalMonthlyCost: number  // Costo mensual total (fee + IVA)
  isExempt: boolean         // Si está exento de custodia
}

export interface CommissionProjection {
  operation: CommissionCalculation
  custody: CustodyCalculation
  totalFirstYearCost: number
  breakEvenImpact: number  // Porcentaje adicional necesario para break-even
}