// Interfaces para el sistema de comisiones - Frontend Types

export interface CommissionConfig {
  id?: number
  name: string
  broker: string
  isActive: boolean
  buy: {
    percentage: number      // Porcentaje sobre el monto (ej: 0.005 = 0.5%)
    minimum: number         // Mínimo en ARS
    iva: number            // IVA sobre comisión (ej: 0.21 = 21%)
  }
  sell: {
    percentage: number
    minimum: number
    iva: number
  }
  custody: {
    exemptAmount: number        // Monto exento mensual
    monthlyPercentage: number   // Porcentaje mensual sobre excedente
    monthlyMinimum: number      // Mínimo mensual si aplica
    iva: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface CommissionCalculation {
  baseCommission: number
  ivaAmount: number
  totalCommission: number
  netAmount: number
  breakdown: {
    operationType: 'BUY' | 'SELL'
    totalAmount: number
    commissionRate: number
    minimumApplied: boolean
    ivaRate: number
  }
}

export interface CustodyCalculation {
  applicableAmount: number
  monthlyFee: number
  annualFee: number
  ivaAmount: number
  totalMonthlyCost: number
  isExempt: boolean
}

export interface CommissionProjection {
  operation: CommissionCalculation
  custody: CustodyCalculation
  totalFirstYearCost: number
  breakEvenImpact: number  // Porcentaje adicional necesario para break-even
}

export interface BrokerComparison {
  broker: string
  name: string
  operationCommission: CommissionCalculation
  custodyFee: CustodyCalculation
  totalFirstYearCost: number
  ranking: number
}

export interface CommissionAnalysis {
  totalCommissionsPaid: number
  totalTaxesPaid: number
  averageCommissionPerTrade: number
  commissionByType: {
    buy: { count: number; total: number }
    sell: { count: number; total: number }
  }
  monthlyBreakdown: Array<{
    month: string
    commissions: number
    taxes: number
    trades: number
  }>
}

export interface MinimumInvestmentCalculation {
  minimumAmount: number
  commissionPercentage: number
  recommendation: string
}

// Request types para API calls
export interface CalculateCommissionRequest {
  type: 'BUY' | 'SELL'
  amount: number
  portfolioValue?: number
  broker?: string
}

export interface CompareBrokersRequest {
  operationType: 'BUY' | 'SELL'
  operationAmount: number
  portfolioValue: number
}

export interface CalculateMinimumInvestmentRequest {
  commissionThreshold: number  // Porcentaje máximo de comisión deseado
  broker?: string
}

export interface CommissionAnalysisFilters {
  fromDate?: string
  toDate?: string
  instrumentId?: number
}

// Response types para API responses
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: string
}

export type CommissionConfigsResponse = ApiResponse<CommissionConfig[]>
export type CommissionCalculationResponse = ApiResponse<CommissionCalculation | CommissionProjection>
export type BrokerComparisonResponse = ApiResponse<BrokerComparison[]>
export type CommissionAnalysisResponse = ApiResponse<CommissionAnalysis>
export type MinimumInvestmentResponse = ApiResponse<MinimumInvestmentCalculation>
export type ActiveConfigResponse = ApiResponse<CommissionConfig>

// UI State types
export interface CommissionFormData {
  operationType: 'BUY' | 'SELL'
  amount: string
  portfolioValue: string
  selectedBroker?: string
}

export interface CommissionConfigFormData {
  name: string
  broker: string
  buyPercentage: string
  buyMinimum: string
  buyIva: string
  sellPercentage: string
  sellMinimum: string
  sellIva: string
  custodyExemptAmount: string
  custodyMonthlyPercentage: string
  custodyMonthlyMinimum: string
  custodyIva: string
}

// Error types
export interface CommissionError {
  code: string
  message: string
  field?: string
}

// Chart data types para visualizaciones
export interface CommissionChartData {
  month: string
  commissions: number
  taxes: number
  trades: number
  total: number
}

export interface BrokerChartData {
  broker: string
  name: string
  operationCost: number
  custodyCost: number
  totalCost: number
  ranking: number
}