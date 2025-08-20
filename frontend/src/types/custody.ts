// Tipos base para custodia
export interface CustodyCalculation {
  applicableAmount: number
  monthlyFee: number
  annualFee: number
  ivaAmount: number
  totalMonthlyCost: number
  isExempt: boolean
}

export interface CustodyFeeRecord {
  id: number
  month: string
  portfolio_value: number
  fee_percentage: number
  fee_amount: number
  iva_amount: number
  total_charged: number
  payment_date?: string
  broker: string
  is_exempt: boolean
  applicable_amount: number
  created_at: string
  updated_at: string
}

export interface CustodyStatus {
  currentPortfolioValue: number
  custodyCalculation: CustodyCalculation
  isExempt: boolean
  nextCustodyDate: string
  lastCalculatedCustody?: CustodyFeeRecord | null
  jobStatus: {
    isRunning: boolean
    lastExecution: string | null
    nextExecution: string | null
    successfulExecutions: number
    failedExecutions: number
  }
}

// Filtros para histórico
export interface CustodyHistoryFilters {
  startMonth?: string
  endMonth?: string
  broker?: string
  isExempt?: boolean
  minAmount?: number
  maxAmount?: number
}

// Respuesta del histórico
export interface CustodyHistoryResponse {
  records: CustodyFeeRecord[]
  statistics: {
    totalRecords: number
    totalPaid: number
    averageMonthly: number
    exemptMonths: number
    nonExemptMonths: number
    yearlyBreakdown: Array<{
      year: string
      total: number
      months: number
      average: number
    }>
  }
  totalRecords: number
}

// Parámetros para proyecciones
export interface CustodyProjectionParams {
  portfolioValue: number
  months?: number
  monthlyGrowthRate?: number
  broker?: string
}

// Respuesta de proyecciones
export interface CustodyProjectionResponse {
  projections: Array<{
    month: number
    portfolioValue: number
    custodyCalculation: CustodyCalculation
    cumulativeCustody: number
    isThresholdCrossed: boolean
  }>
  summary: {
    totalMonths: number
    totalProjectedCustody: number
    averageMonthly: number
    thresholdCrossings: number
    finalPortfolioValue: number
  }
  parameters: CustodyProjectionParams
}

// Parámetros para optimización
export interface CustodyOptimizationParams {
  portfolioValue: number
  targetAnnualReturn?: number
  broker?: string
}

// Respuesta de optimización
export interface CustodyOptimizationResponse {
  optimization: {
    optimizedSize: number
    currentCustody: number
    optimizedCustody: number
    savingsAnnual: number
    recommendation: string
    strategy: 'MAINTAIN_EXEMPT' | 'MINIMIZE_CUSTODY' | 'ACCEPT_CUSTODY'
    alternatives: Array<{
      portfolioSize: number
      custodyFee: number
      netReturn: number
      description: string
    }>
  }
  impactAnalysis: {
    grossReturn: number
    custodyImpact: number
    netReturn: number
    annualCustodyFee: number
    impactPercentage: number
    recommendations: string[]
  }
  parameters: CustodyOptimizationParams
}

// Parámetros para cálculo manual
export interface CustodyCalculationParams {
  portfolioValue: number
  broker?: string
}

// Respuesta de cálculo manual
export interface CustodyCalculationResponse {
  portfolioValue: number
  broker: string
  custodyCalculation: CustodyCalculation
  thresholdInfo: {
    exemptAmount: number
    minimumMonthlyFee: number
    minimumAnnualFee: number
    recommendedStrategy: string
  }
  recommendations: string[]
}

// Parámetros para análisis de impacto
export interface CustodyImpactAnalysisParams {
  portfolioValue: number
  expectedAnnualReturn: number
  broker?: string
}

// Respuesta de análisis de impacto
export interface CustodyImpactAnalysisResponse {
  analysis: {
    grossReturn: number
    custodyImpact: number
    netReturn: number
    annualCustodyFee: number
    impactPercentage: number
    recommendations: string[]
  }
  brokerComparisons: Array<{
    broker: string
    custodyFee: number
    impactPercentage: number
    netReturn: number
  }>
  parameters: CustodyImpactAnalysisParams
}

// Estado del job
export interface CustodyJobStatusResponse {
  jobStats: {
    lastExecution: string | null
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    lastError: string | null
    lastCalculatedFee: number | null
    portfolioValueAtLastRun: number | null
    isRunning: boolean
    nextExecution: string | null
  }
  configuration: {
    enabled: boolean
    schedule: string
    timezone: string
  }
}

// Parámetros para job mensual
export interface MonthlyJobParams {
  targetMonth?: string
  dryRun?: boolean
}

// Respuesta del job mensual
export interface MonthlyJobResponse {
  jobResult: {
    success: boolean
    custodyFee?: number
    portfolioValue?: number
    isExempt?: boolean
    error?: string
  }
  targetMonth: string
  dryRun: boolean
}

// Tipos para componentes UI
export interface CustodyTabProps {
  custodyStatus?: CustodyStatus
  onRefresh?: () => void
}

export interface CustodyProjectionTabProps {
  currentPortfolioValue: number
}

export interface CustodyOptimizerTabProps {
  currentPortfolioValue: number
  currentCustodyFee: number
  isExempt?: boolean
}

// Tipos para gráficos
export interface CustodyChartData {
  month: string
  portfolioValue: number
  custodyFee: number
  isExempt: boolean
  cumulativeCustody?: number
}

export interface CustodyComparisonData {
  broker: string
  custodyFee: number
  impactPercentage: number
  netReturn: number
  ranking: number
}

// Tipos para configuración
export interface CustodyConfiguration {
  exemptAmount: number
  monthlyPercentage: number
  monthlyMinimum: number
  iva: number
  broker: string
}

// Error types
export interface CustodyError {
  code: string
  message: string
  details?: any
}

// Estados de loading
export interface CustodyLoadingStates {
  isLoadingStatus: boolean
  isLoadingHistory: boolean
  isLoadingProjections: boolean
  isLoadingOptimization: boolean
  isCalculating: boolean
  isAnalyzing: boolean
  isRunningJob: boolean
}

// Utilidades para formateo
export interface CustodyFormatters {
  formatCurrency: (amount: number, currency?: 'ARS' | 'USD') => string
  formatPercentage: (value: number, decimals?: number) => string
  formatDate: (date: string) => string
  formatMonth: (month: string) => string
}

// Estado del formulario de cálculo
export interface CustodyCalculationForm {
  portfolioValue: string
  broker: string
  expectedReturn: string
  months: string
  monthlyGrowthRate: string
}

// Validaciones
export interface CustodyValidation {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

// Dashboard data
export interface CustodyDashboardData {
  status: CustodyStatus
  jobStatus: CustodyJobStatusResponse
  recentHistory: CustodyHistoryResponse
  summary: {
    totalPaidThisYear: number
    averageMonthly: number
    nextPayment: string | null
    exemptionStatus: 'EXEMPT' | 'APPROACHING_LIMIT' | 'PAYING_CUSTODY'
  }
}