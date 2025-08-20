import { apiClient } from './api'
import type { 
  CustodyStatus,
  CustodyHistoryResponse,
  CustodyHistoryFilters,
  CustodyProjectionParams,
  CustodyProjectionResponse,
  CustodyOptimizationParams,
  CustodyOptimizationResponse,
  CustodyCalculationParams,
  CustodyCalculationResponse,
  CustodyImpactAnalysisParams,
  CustodyImpactAnalysisResponse,
  CustodyJobStatusResponse,
  MonthlyJobParams,
  MonthlyJobResponse
} from '../types/custody'

class CustodyService {
  private readonly baseUrl = '/custody'

  /**
   * Obtener estado actual de custodia
   */
  async getCurrentStatus(): Promise<CustodyStatus> {
    const response = await apiClient.get(`${this.baseUrl}/current`)
    return response.data.data
  }

  /**
   * Obtener histórico de fees de custodia
   */
  async getHistory(filters?: CustodyHistoryFilters): Promise<CustodyHistoryResponse> {
    const params = new URLSearchParams()
    
    if (filters?.startMonth) params.append('startMonth', filters.startMonth)
    if (filters?.endMonth) params.append('endMonth', filters.endMonth)
    if (filters?.broker) params.append('broker', filters.broker)
    if (filters?.isExempt !== undefined) params.append('isExempt', String(filters.isExempt))
    if (filters?.minAmount) params.append('minAmount', String(filters.minAmount))
    if (filters?.maxAmount) params.append('maxAmount', String(filters.maxAmount))

    const response = await apiClient.get(`${this.baseUrl}/history?${params.toString()}`)
    return response.data.data
  }

  /**
   * Obtener proyecciones de custodia
   */
  async getProjections(params: CustodyProjectionParams): Promise<CustodyProjectionResponse> {
    const queryParams = new URLSearchParams({
      portfolioValue: String(params.portfolioValue),
      months: String(params.months || 12),
      monthlyGrowthRate: String(params.monthlyGrowthRate || 0.015),
      broker: params.broker || 'Galicia'
    })

    const response = await apiClient.get(`${this.baseUrl}/projection?${queryParams.toString()}`)
    return response.data.data
  }

  /**
   * Obtener optimización de custodia
   */
  async getOptimization(params: CustodyOptimizationParams): Promise<CustodyOptimizationResponse> {
    const queryParams = new URLSearchParams({
      portfolioValue: String(params.portfolioValue),
      targetAnnualReturn: String(params.targetAnnualReturn || 15),
      broker: params.broker || 'Galicia'
    })

    const response = await apiClient.get(`${this.baseUrl}/optimization?${queryParams.toString()}`)
    return response.data.data
  }

  /**
   * Calcular custodia manualmente
   */
  async calculateCustody(params: CustodyCalculationParams): Promise<CustodyCalculationResponse> {
    const response = await apiClient.post(`${this.baseUrl}/calculate`, params)
    return response.data.data
  }

  /**
   * Análisis de impacto en rentabilidad
   */
  async analyzeImpact(params: CustodyImpactAnalysisParams): Promise<CustodyImpactAnalysisResponse> {
    const response = await apiClient.post(`${this.baseUrl}/impact-analysis`, params)
    return response.data.data
  }

  /**
   * Obtener estado del job de custodia
   */
  async getJobStatus(): Promise<CustodyJobStatusResponse> {
    const response = await apiClient.get(`${this.baseUrl}/job/status`)
    return response.data.data
  }

  /**
   * Ejecutar job mensual manualmente
   */
  async runMonthlyJob(params: MonthlyJobParams = {}): Promise<MonthlyJobResponse> {
    const response = await apiClient.post(`${this.baseUrl}/run-monthly-job`, params)
    return response.data.data
  }

  /**
   * Actualizar fecha de pago de un fee de custodia
   */
  async updatePaymentDate(id: number, paymentDate: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${this.baseUrl}/update-payment-date/${id}`, {
      paymentDate
    })
    return response.data.data
  }

  /**
   * Obtener resumen de custodia para dashboard
   */
  async getDashboardSummary(): Promise<{
    currentStatus: CustodyStatus
    jobStatus: CustodyJobStatusResponse
    recentHistory: CustodyHistoryResponse
  }> {
    const [currentStatus, jobStatus, recentHistory] = await Promise.all([
      this.getCurrentStatus(),
      this.getJobStatus(),
      this.getHistory({ endMonth: new Date().toISOString().substring(0, 7) + '-01' })
    ])

    return {
      currentStatus,
      jobStatus,
      recentHistory
    }
  }

  /**
   * Calcular múltiples escenarios de custodia
   */
  async calculateMultipleScenarios(baseParams: CustodyCalculationParams, scenarios: Array<{
    name: string
    portfolioValue: number
  }>): Promise<Array<{
    name: string
    result: CustodyCalculationResponse
  }>> {
    const results = await Promise.all(
      scenarios.map(async scenario => ({
        name: scenario.name,
        result: await this.calculateCustody({
          ...baseParams,
          portfolioValue: scenario.portfolioValue
        })
      }))
    )

    return results
  }

  /**
   * Obtener comparación entre brokers
   */
  async compareBrokers(portfolioValue: number, expectedReturn: number): Promise<Array<{
    broker: string
    custodyFee: number
    impactPercentage: number
    netReturn: number
  }>> {
    try {
      const analysis = await this.analyzeImpact({
        portfolioValue,
        expectedAnnualReturn: expectedReturn,
        broker: 'Galicia' // Se usará internamente para obtener comparaciones
      })

      return analysis.brokerComparisons || []
    } catch (error) {
      console.error('Error comparing brokers:', error)
      return []
    }
  }

  /**
   * Validar configuración de custodia
   */
  validateCustodyParams(params: Partial<CustodyCalculationParams>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!params.portfolioValue || params.portfolioValue < 0) {
      errors.push('El valor de cartera debe ser mayor a 0')
    }

    if (params.portfolioValue && params.portfolioValue > 100000000) {
      errors.push('El valor de cartera parece excesivamente alto')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Formatear montos para display
   */
  formatCurrency(amount: number, currency: 'ARS' | 'USD' = 'ARS'): string {
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    return formatter.format(amount)
  }

  /**
   * Calcular porcentaje de impacto
   */
  calculateImpactPercentage(custodyFee: number, portfolioValue: number): number {
    if (portfolioValue <= 0) return 0
    return (custodyFee / portfolioValue) * 100
  }

  /**
   * Generar recomendaciones básicas
   */
  generateRecommendations(custodyData: {
    isExempt: boolean
    portfolioValue: number
    monthlyCustody: number
    exemptAmount: number
  }): string[] {
    const recommendations: string[] = []

    if (custodyData.isExempt) {
      recommendations.push('✅ Tu cartera está exenta de custodia')
      
      if (custodyData.portfolioValue > custodyData.exemptAmount * 0.9) {
        recommendations.push('⚠️ Te acercas al límite de exención, planifica el crecimiento')
      }
    } else {
      const annualCustody = custodyData.monthlyCustody * 12
      const impactPercentage = this.calculateImpactPercentage(annualCustody, custodyData.portfolioValue)

      if (impactPercentage > 2) {
        recommendations.push('🔴 La custodia tiene un impacto significativo en tu cartera')
        recommendations.push('💡 Considera optimizar el tamaño de cartera o cambiar de broker')
      } else if (impactPercentage > 1) {
        recommendations.push('🟡 La custodia tiene un impacto moderado')
        recommendations.push('💡 Monitorea el crecimiento para evaluar el costo-beneficio')
      } else {
        recommendations.push('🟢 El impacto de custodia es bajo y aceptable')
      }

      if (custodyData.portfolioValue < custodyData.exemptAmount * 1.2) {
        recommendations.push('💡 Podrías considerar mantener la cartera por debajo del límite')
      }
    }

    return recommendations
  }
}

export const custodyService = new CustodyService()