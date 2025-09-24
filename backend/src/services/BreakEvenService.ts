import { BreakEvenModel, BreakEvenAnalysis, BreakEvenProjection, BreakEvenOptimization } from '../models/BreakEven.js'
import { TradeService } from './TradeService.js'
import { CommissionService } from './CommissionService.js'
import { UVAService } from './UVAService.js'
import { QuoteService } from './QuoteService.js'
import { createLogger } from '../utils/logger.js'
import { Instrument } from '../models/Instrument.js'

const logger = createLogger('BreakEvenService')

export interface BreakEvenCalculationParams {
  tradeId: number
  currentPrice?: number
  projectionMonths?: number
  inflationRate?: number
  includeProjectedCustody?: boolean
  scenarioType?: string
}

export interface BreakEvenCalculationResult {
  analysis: BreakEvenAnalysis
  projections: BreakEvenProjection[]
  optimizations: BreakEvenOptimization[]
}

export interface BreakEvenMatrixParams {
  instrumentId: number
  purchasePrice: number
  quantity: number
  inflationRates: number[]
  timeHorizons: number[] // meses
}

export interface BreakEvenMatrixResult {
  inflationRate: number
  timeHorizon: number
  breakEvenPrice: number
  totalCosts: number
  daysToBreakEven: number
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

export class BreakEvenService {
  private breakEvenModel: BreakEvenModel
  private tradeService: TradeService
  private commissionService: CommissionService
  private uvaService: UVAService
  private quoteService: QuoteService
  private readonly instrumentModel: Instrument

  constructor() {
    this.breakEvenModel = new BreakEvenModel()
    this.tradeService = new TradeService()
    this.commissionService = new CommissionService()
    this.uvaService = new UVAService()
    this.quoteService = new QuoteService()
    this.instrumentModel = new Instrument()
  }

  /**
   * Calcula el break-even completo para una operación
    */
    // eslint-disable-next-line max-lines-per-function
  async calculateBreakEven(params: BreakEvenCalculationParams): Promise<BreakEvenCalculationResult> {
    try {
      logger.info(`Calculating break-even for trade ${params.tradeId}`)

      // Obtener datos de la operación
      const trade = await this.tradeService.findById(params.tradeId)
      if (!trade) {
        throw new Error(`Trade with id ${params.tradeId} not found`)
      }

      if (trade.type !== 'BUY') {
        throw new Error('Break-even analysis only available for BUY trades')
      }

      const currentPrice = await this.resolveCurrentPrice(trade, params.currentPrice)

      // Calcular componentes del break-even
      const breakEvenComponents = await this.calculateBreakEvenComponents(trade)

      // Crear análisis principal
      const analysis = await this.createBreakEvenAnalysis(
        trade,
        breakEvenComponents,
        currentPrice,
        params.scenarioType || 'BASE'
      )

      // Generar proyecciones
      const projections = await this.generateProjections(
        analysis,
        params.projectionMonths || 12,
        params.inflationRate
      )

      // Generar optimizaciones
      const optimizations = await this.generateOptimizations(analysis, trade, breakEvenComponents)

      logger.info(`Break-even calculation completed for trade ${params.tradeId}`)
      
      return {
        analysis,
        projections,
        optimizations
      }
    } catch (error) {
      logger.error('Error calculating break-even:', error)
      throw new Error(`Failed to calculate break-even: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private async resolveCurrentPrice(trade: any, requestedPrice?: number): Promise<number> {
    if (requestedPrice !== undefined) {
      return requestedPrice
    }

    const instrument = await this.instrumentModel.findById(trade.instrument_id)
    if (!instrument?.symbol) {
      logger.warn(`Instrument ${trade.instrument_id} not found, using trade price`)
      return trade.price
    }

    try {
      const quoteResult = await this.quoteService.getQuote(instrument.symbol)
      if (quoteResult.price === undefined) {
        logger.warn(`Quote for ${instrument.symbol} missing price, using trade price`)
        return trade.price
      }

      return quoteResult.price
    } catch (error) {
      logger.warn(`Could not get current price for ${instrument.symbol}, using trade price`)
      return trade.price
    }
  }

  /**
   * Calcula los componentes individuales que conforman el break-even
   */
  private async calculateBreakEvenComponents(trade: any) {
    // Comisión de compra (ya pagada)
    const buyCommission = trade.commission || 0

    // Comisión de venta (estimada)
    const sellCommission = await this.estimateSellCommission(trade.total_amount)

    // Custodia acumulada desde la compra
    const custodyImpact = await this.calculateAccumulatedCustody(trade)

    // Impacto de inflación usando UVA
    const inflationImpact = await this.calculateInflationImpact(trade)

    // Impacto fiscal (estimado)
    const taxImpact = await this.calculateTaxImpact(trade)

    const totalCosts = buyCommission + sellCommission + custodyImpact + inflationImpact + taxImpact
    
    // Break-even price = (precio_compra * cantidad + costos_totales) / cantidad
    const breakEvenPrice = (trade.price * trade.quantity + totalCosts) / trade.quantity

    return {
      purchasePrice: trade.price,
      breakEvenPrice,
      totalCosts,
      buyCommission,
      sellCommission,
      custodyImpact,
      inflationImpact,
      taxImpact
    }
  }

  /**
   * Estima la comisión de venta basada en el monto actual de la posición
   */
  private async estimateSellCommission(amount: number): Promise<number> {
    try {
        const config = await this.commissionService.getDefaultConfiguration()
        if (!config) {
          // Usar configuración por defecto del sistema
          return Math.max(amount * 0.005, 150) * 1.21 // 0.5% + IVA, mínimo $150
        }

        const calculation = this.commissionService.calculateOperationCommission('SELL', amount, config)
        return calculation.totalCommission
      } catch (error) {
      logger.warn('Could not get commission configuration, using default')
      return Math.max(amount * 0.005, 150) * 1.21
      }
    }

  /**
   * Calcula la custodia acumulada desde la fecha de compra
   */
  private async calculateAccumulatedCustody(trade: any): Promise<number> {
    try {
      const monthsSincePurchase = this.getMonthsSinceDate(trade.trade_date)
      if (monthsSincePurchase <= 0) {
        return 0
      }

      // Estimación de custodia mensual (0.25% sobre montos > $1M)
      const portfolioValue = trade.total_amount // Aproximación simplificada
      
      if (portfolioValue <= 1000000) {
        return 0 // Exento
      }

      const monthlyFee = (portfolioValue - 1000000) * 0.0025 * 1.21 // 0.25% + IVA sobre excedente
      return monthlyFee * monthsSincePurchase
    } catch (error) {
      logger.warn('Error calculating custody impact, using 0')
      return 0
    }
  }

  /**
   * Calcula el impacto de la inflación usando UVA
   */
  private async calculateInflationImpact(trade: any): Promise<number> {
    try {
        const currentUVA = await this.uvaService.getLatestUVAValue()
        const purchaseDate = new Date(trade.trade_date)

        // Buscar UVA de la fecha de compra (aproximada)
        const historicalUVA = await this.getUVAForDate(purchaseDate)

        if (!historicalUVA || currentUVA?.value === undefined) {
          return 0
        }

        const inflationAdjustment = (currentUVA.value / historicalUVA) - 1
      return trade.total_amount * inflationAdjustment
    } catch (error) {
      logger.warn('Error calculating inflation impact, using 0')
      return 0
    }
  }

  /**
   * Calcula el impacto fiscal estimado
   */
  private async calculateTaxImpact(trade: any): Promise<number> {
    try {
      const settings = await this.breakEvenModel.getSetting('tax_rate_threshold')
      const taxRate = settings ? parseFloat(settings.setting_value) : 0.15

      // Estimación simplificada: 15% sobre la ganancia potencial
      const monthsHeld = this.getMonthsSinceDate(trade.trade_date)
      
      // Solo aplicar impuestos si se mantiene más de 12 meses
      if (monthsHeld < 12) {
        return 0
      }

      // Estimación conservadora del 5% del valor de la posición
      return trade.total_amount * 0.05 * taxRate
    } catch (error) {
      logger.warn('Error calculating tax impact, using 0')
      return 0
    }
  }

  /**
   * Crea el registro de análisis de break-even
   */
  private async createBreakEvenAnalysis(
    trade: any,
    components: any,
    currentPrice: number,
    scenarioType: string
  ): Promise<BreakEvenAnalysis> {
    const distanceToBreakEven = currentPrice - components.breakEvenPrice
    const distancePercentage = (distanceToBreakEven / components.breakEvenPrice) * 100
    
    // Estimación de días para alcanzar break-even (simplificada)
    const daysToBreakEven = distanceToBreakEven <= 0 
      ? Math.abs(distanceToBreakEven / components.breakEvenPrice * 365) // Estimación anual
      : 0

    const now = new Date()
    const [datePart] = now.toISOString().split('T')
    const calculationDate = datePart ?? now.toISOString()

    return await this.breakEvenModel.createAnalysis({
      trade_id: trade.id,
      instrument_id: trade.instrument_id,
      calculation_date: calculationDate,
      break_even_price: components.breakEvenPrice,
      current_price: currentPrice,
      distance_to_break_even: distanceToBreakEven,
      distance_percentage: distancePercentage,
      days_to_break_even: Math.round(daysToBreakEven),
      total_costs: components.totalCosts,
      purchase_price: components.purchasePrice,
      commission_impact: components.buyCommission + components.sellCommission,
      custody_impact: components.custodyImpact,
      inflation_impact: components.inflationImpact,
      tax_impact: components.taxImpact,
      confidence_level: 0.8,
      scenario_type: scenarioType
    })
  }

  /**
   * Genera proyecciones de break-even a futuro
   */
  private async generateProjections(
    analysis: BreakEvenAnalysis,
    maxMonths: number,
    customInflationRate?: number
  ): Promise<BreakEvenProjection[]> {
    const projections: BreakEvenProjection[] = []
    
    // Obtener tasa de inflación
    const settings = await this.breakEvenModel.getSetting('default_inflation_rate')
    const defaultInflationRate = settings ? parseFloat(settings.setting_value) : 0.12
    const inflationRate = customInflationRate || defaultInflationRate

    // Generar 3 escenarios: optimista, base, pesimista
    const scenarios = [
      { type: 'OPTIMISTIC', name: 'Optimista', rate: inflationRate * 0.7, probability: 0.25 },
      { type: 'BASE', name: 'Base', rate: inflationRate, probability: 0.50 },
      { type: 'PESSIMISTIC', name: 'Pesimista', rate: inflationRate * 1.3, probability: 0.25 }
    ]

    for (const scenario of scenarios) {
      for (let months = 3; months <= maxMonths; months += 3) {
        const projectedBreakEven = analysis.break_even_price * Math.pow(1 + scenario.rate / 12, months)
        const projectionDate = new Date()
        projectionDate.setMonth(projectionDate.getMonth() + months)

          const [projectionDatePart] = projectionDate.toISOString().split('T')
          const projectionDateIso = projectionDatePart ?? projectionDate.toISOString()

          const projection = await this.breakEvenModel.createProjection({
            analysis_id: analysis.id!,
            trade_id: analysis.trade_id,
            projection_date: projectionDateIso,
          months_ahead: months,
          inflation_rate: scenario.rate,
          projected_break_even: projectedBreakEven,
          scenario_type: scenario.type,
          scenario_name: scenario.name,
          probability: scenario.probability
        })

        projections.push(projection)
      }
    }

    return projections
  }

  /**
   * Genera sugerencias de optimización
    */
    // eslint-disable-next-line max-lines-per-function
    private async generateOptimizations(
    analysis: BreakEvenAnalysis,
    trade: any,
    components: any
  ): Promise<BreakEvenOptimization[]> {
    const optimizations: BreakEvenOptimization[] = []

    // Sugerencia 1: Optimización de comisiones
    if (components.buyCommission + components.sellCommission > components.totalCosts * 0.3) {
      optimizations.push(await this.breakEvenModel.createOptimization({
        analysis_id: analysis.id!,
        trade_id: trade.id,
        suggestion_type: 'COMMISSION_OPTIMIZATION',
        suggestion_title: 'Optimizar Comisiones',
        suggestion_description: 'Las comisiones representan una proporción alta de los costos. Considera cambiar de broker o negociar mejores tarifas.',
        potential_savings: (components.buyCommission + components.sellCommission) * 0.2,
        potential_time_reduction: 30,
        implementation_difficulty: 'MEDIUM',
        priority: 2,
        is_automated: false,
        is_applicable: true
      }))
    }

    // Sugerencia 2: Gestión de custodia
    if (components.custodyImpact > 0) {
      optimizations.push(await this.breakEvenModel.createOptimization({
        analysis_id: analysis.id!,
        trade_id: trade.id,
        suggestion_type: 'CUSTODY_OPTIMIZATION',
        suggestion_title: 'Optimizar Custodia',
        suggestion_description: 'La custodia mensual está impactando el break-even. Considera diversificar en múltiples brokers o mantener posiciones menores.',
        potential_savings: components.custodyImpact * 0.5,
        potential_time_reduction: 60,
        implementation_difficulty: 'HIGH',
        priority: 3,
        is_automated: false,
        is_applicable: true
      }))
    }

    // Sugerencia 3: Timing de venta
    if (analysis.distance_percentage! < -5) {
      optimizations.push(await this.breakEvenModel.createOptimization({
        analysis_id: analysis.id!,
        trade_id: trade.id,
        suggestion_type: 'TIMING_OPTIMIZATION',
        suggestion_title: 'Revisar Timing de Venta',
        suggestion_description: 'La posición está significativamente por debajo del break-even. Considera mantener más tiempo o evaluar stop-loss.',
        potential_time_reduction: analysis.days_to_break_even! * 0.15,
        implementation_difficulty: 'LOW',
        priority: 1,
        is_automated: false,
        is_applicable: true
      }))
    }

    // Sugerencia 4: Cobertura inflacionaria
    if (components.inflationImpact > components.totalCosts * 0.2) {
      optimizations.push(await this.breakEvenModel.createOptimization({
        analysis_id: analysis.id!,
        trade_id: trade.id,
        suggestion_type: 'INFLATION_HEDGE',
        suggestion_title: 'Cobertura Inflacionaria',
        suggestion_description: 'La inflación está impactando significativamente. Considera instrumentos con cobertura inflacionaria.',
        potential_savings: components.inflationImpact * 0.3,
        implementation_difficulty: 'MEDIUM',
        priority: 2,
        is_automated: false,
        is_applicable: true
      }))
    }

    return optimizations
  }

  /**
   * Genera una matriz de sensibilidad de break-even
   */
  async generateBreakEvenMatrix(params: BreakEvenMatrixParams): Promise<BreakEvenMatrixResult[]> {
    const results: BreakEvenMatrixResult[] = []

    for (const inflationRate of params.inflationRates) {
      for (const timeHorizon of params.timeHorizons) {
        // Calcular costos base
        const buyCommission = Math.max(params.purchasePrice * params.quantity * 0.005, 150) * 1.21
        const sellCommission = buyCommission // Aproximación
        
        // Custodia (aproximada)
        const custodyMonths = timeHorizon
        const custodyFee = custodyMonths * 500 * 1.21 // Estimación conservadora
        
        // Inflación
        const inflationAdjustment = Math.pow(1 + inflationRate / 12, timeHorizon) - 1
        const inflationImpact = params.purchasePrice * params.quantity * inflationAdjustment
        
        const totalCosts = buyCommission + sellCommission + custodyFee + inflationImpact
        const breakEvenPrice = (params.purchasePrice + totalCosts / params.quantity)
        
        // Días estimados (simplificado)
        const daysToBreakEven = timeHorizon * 30

        results.push({
          inflationRate,
          timeHorizon,
          breakEvenPrice,
          totalCosts,
          daysToBreakEven
        })
      }
    }

    return results
  }

  /**
   * Obtiene resumen de break-even de todo el portafolio
   */
  async getPortfolioBreakEvenSummary(): Promise<PortfolioBreakEvenSummary> {
    try {
      const summary = await this.breakEvenModel.getBreakEvenSummary()
      
      return {
        totalPositions: summary.total_analyses,
        positionsAboveBreakEven: summary.positions_above_break_even,
        positionsBelowBreakEven: summary.positions_below_break_even,
        averageDaysToBreakEven: summary.avg_days_to_break_even,
        totalPotentialSavings: summary.total_potential_savings,
        criticalPositions: summary.most_critical_positions.map(pos => ({
          tradeId: pos.trade_id,
          symbol: pos.symbol,
          distancePercentage: pos.distance_percentage,
          daysToBreakEven: pos.days_to_break_even,
          totalCosts: 0 // Se calculará por separado si es necesario
        }))
      }
    } catch (error) {
      logger.error('Error getting portfolio break-even summary:', error)
      throw new Error(`Failed to get portfolio summary: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene análisis de break-even por ID de trade
   */
  async getBreakEvenByTradeId(tradeId: number): Promise<BreakEvenAnalysis | null> {
    const analyses = await this.breakEvenModel.findAnalysesByTradeId(tradeId)
    return analyses[0] ?? null
  }

  // Métodos auxiliares privados
  private getMonthsSinceDate(dateString: string): number {
    const date = new Date(dateString)
    const now = new Date()
    
    const years = now.getFullYear() - date.getFullYear()
    const months = now.getMonth() - date.getMonth()
    
    return years * 12 + months
  }

  private async getUVAForDate(date: Date): Promise<number> {
    try {
      // Implementación simplificada - en producción buscaría en base de datos
        const currentUVA = await this.uvaService.getLatestUVAValue()

        // Estimación basada en inflación histórica promedio
        const monthsAgo = this.getMonthsSinceDate(date.toISOString())
        const estimatedInflation = Math.pow(1.12, monthsAgo / 12) // 12% anual promedio

        if (currentUVA?.value === undefined) {
          return 100
        }

        return currentUVA.value / estimatedInflation
      } catch (error) {
        return 100 // Valor base si no se puede calcular
      }
    }
}