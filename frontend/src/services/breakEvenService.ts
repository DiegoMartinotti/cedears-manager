import api from '../utils/api'

const BASE_URL = '/api/v1/break-even'

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    message: string
    details?: string
  }
  meta?: any
  timestamp: string
}

// Interfaces para el frontend
export interface BreakEvenAnalysis {
  id?: number
  trade_id: number
  instrument_id: number
  calculation_date: string
  break_even_price: number
  current_price?: number
  distance_to_break_even?: number
  distance_percentage?: number
  days_to_break_even?: number
  total_costs: number
  purchase_price: number
  commission_impact: number
  custody_impact: number
  inflation_impact: number
  tax_impact?: number
  confidence_level?: number
  scenario_type?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface BreakEvenProjection {
  id?: number
  analysis_id: number
  trade_id: number
  projection_date: string
  months_ahead: number
  inflation_rate: number
  projected_break_even: number
  scenario_type: string
  scenario_name?: string
  probability?: number
  created_at?: string
}

export interface BreakEvenOptimization {
  id?: number
  analysis_id: number
  trade_id: number
  suggestion_type: string
  suggestion_title: string
  suggestion_description: string
  potential_savings?: number
  potential_time_reduction?: number
  implementation_difficulty: 'LOW' | 'MEDIUM' | 'HIGH'
  priority: number
  is_automated?: boolean
  is_applicable?: boolean
  created_at?: string
}

export interface BreakEvenCalculationResult {
  analysis: BreakEvenAnalysis
  projections: BreakEvenProjection[]
  optimizations: BreakEvenOptimization[]
}

export interface PortfolioBreakEvenSummary {
  totalPositions: number
  positionsAboveBreakEven: number
  positionsBelowBreakEven: number
  averageDaysToBreakEven: number
  totalPotentialSavings: number
  criticalPositions: Array<{
    tradeId: number
    symbol: string
    distancePercentage: number
    daysToBreakEven: number
    totalCosts: number
  }>
}

export interface BreakEvenMatrixResult {
  inflationRate: number
  timeHorizon: number
  breakEvenPrice: number
  totalCosts: number
  daysToBreakEven: number
}

export interface BreakEvenSimulationInputs {
  purchasePrice: number
  quantity: number
  currentPrice: number
  commissionRate?: number
  inflationRate?: number
  custodyMonths?: number
}

export interface BreakEvenSimulationResult {
  inputs: BreakEvenSimulationInputs
  results: {
    totalInvestment: number
    breakEvenPrice: number
    currentPrice: number
    profit: number
    profitPercentage: number
    costsBreakdown: {
      buyCommission: number
      sellCommission: number
      custodyFee: number
      inflationImpact: number
      totalCosts: number
    }
    distanceToBreakEven: number
    distancePercentage: number
  }
}

export interface StrategyComparison {
  strategy: string
  sellPrice: number
  breakEvenPrice: number
  profit: number
  profitPercentage: number
  totalCosts: number
  daysToBreakEven: number
}

export class BreakEvenService {
  /**
   * Calcula el break-even completo para una operación
   */
  async calculateBreakEven(params: {
    tradeId: number
    currentPrice?: number
    projectionMonths?: number
    inflationRate?: number
    includeProjectedCustody?: boolean
    scenarioType?: string
  }): Promise<BreakEvenCalculationResult> {
    try {
      const response = await api.post<ApiResponse<BreakEvenCalculationResult>>(
        `${BASE_URL}/calculate/${params.tradeId}`,
        {
          currentPrice: params.currentPrice,
          projectionMonths: params.projectionMonths,
          inflationRate: params.inflationRate,
          includeProjectedCustody: params.includeProjectedCustody,
          scenarioType: params.scenarioType
        }
      )
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to calculate break-even')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error calculating break-even:', error)
      throw new Error(`Failed to calculate break-even: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Genera proyecciones de break-even
   */
  async generateProjection(params: {
    tradeId: number
    inflationRate?: number
    months?: number
  }): Promise<{ analysis: BreakEvenAnalysis; projections: BreakEvenProjection[] }> {
    try {
      const response = await api.post<ApiResponse<{ analysis: BreakEvenAnalysis; projections: BreakEvenProjection[] }>>(
        `${BASE_URL}/projection`,
        params
      )
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to generate projection')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error generating projection:', error)
      throw new Error(`Failed to generate projection: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene el resumen de break-even del portafolio
   */
  async getPortfolioSummary(): Promise<PortfolioBreakEvenSummary> {
    try {
      const response = await api.post<ApiResponse<PortfolioBreakEvenSummary>>(`${BASE_URL}/portfolio`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get portfolio summary')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting portfolio summary:', error)
      throw new Error(`Failed to get portfolio summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Genera matriz de sensibilidad de break-even
   */
  async generateMatrix(params: {
    instrumentId: number
    purchasePrice: number
    quantity: number
    inflationRates: number[]
    timeHorizons: number[]
  }): Promise<{ matrix: BreakEvenMatrixResult[]; parameters: typeof params }> {
    try {
      const response = await api.post<ApiResponse<{ matrix: BreakEvenMatrixResult[]; parameters: typeof params }>>(
        `${BASE_URL}/matrix`,
        params
      )
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to generate matrix')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error generating matrix:', error)
      throw new Error(`Failed to generate matrix: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene sugerencias de optimización
   */
  async getOptimizations(tradeId: number): Promise<{
    optimizations: BreakEvenOptimization[]
    analysis: BreakEvenAnalysis
  }> {
    try {
      const response = await api.get<ApiResponse<{
        optimizations: BreakEvenOptimization[]
        analysis: BreakEvenAnalysis
      }>>(`${BASE_URL}/optimization/${tradeId}`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get optimizations')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting optimizations:', error)
      throw new Error(`Failed to get optimizations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Compara diferentes estrategias de venta
   */
  async compareStrategies(params: {
    tradeId: number
    strategies: Array<{
      name: string
      sellPrice: number
      sellDate?: string
      additionalCosts?: number
    }>
  }): Promise<{ tradeId: number; comparisons: StrategyComparison[] }> {
    try {
      const response = await api.post<ApiResponse<{ tradeId: number; comparisons: StrategyComparison[] }>>(
        `${BASE_URL}/compare`,
        params
      )
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to compare strategies')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error comparing strategies:', error)
      throw new Error(`Failed to compare strategies: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene análisis de break-even por ID de trade
   */
  async getByTradeId(tradeId: number): Promise<BreakEvenAnalysis> {
    try {
      const response = await api.get<ApiResponse<BreakEvenAnalysis>>(`${BASE_URL}/trade/${tradeId}`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get break-even analysis')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting break-even by trade ID:', error)
      throw new Error(`Failed to get break-even analysis: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene resumen estadístico
   */
  async getSummary(): Promise<PortfolioBreakEvenSummary> {
    try {
      const response = await api.get<ApiResponse<PortfolioBreakEvenSummary>>(`${BASE_URL}/summary`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to get summary')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error getting summary:', error)
      throw new Error(`Failed to get summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Simulador interactivo de break-even
   */
  async simulate(inputs: BreakEvenSimulationInputs): Promise<{ simulation: BreakEvenSimulationResult }> {
    try {
      const response = await api.post<ApiResponse<{ simulation: BreakEvenSimulationResult }>>(
        `${BASE_URL}/simulate`,
        inputs
      )
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to simulate break-even')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error simulating break-even:', error)
      throw new Error(`Failed to simulate break-even: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Health check del servicio
   */
  async healthCheck(): Promise<{
    status: string
    statistics: {
      totalAnalyses: number
      avgDaysToBreakEven: number
      healthyPositions: number
      concerningPositions: number
    }
    services: {
      breakEvenService: string
      database: string
    }
  }> {
    try {
      const response = await api.get<ApiResponse<any>>(`${BASE_URL}/health`)
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Health check failed')
      }
      
      return response.data.data
    } catch (error) {
      console.error('Error in health check:', error)
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// Instancia singleton del servicio
const breakEvenService = new BreakEvenService()
export default breakEvenService