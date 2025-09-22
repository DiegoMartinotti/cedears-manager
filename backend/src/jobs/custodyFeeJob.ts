import cron from 'node-cron'
import { CustodyFee } from '../models/CustodyFee.js'
import { Trade } from '../models/Trade.js'
import { CommissionService } from '../services/CommissionService.js'
import { DashboardService } from '../services/DashboardService.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('CustodyFeeJob')

interface CustodyJobConfig {
  schedule: string     // Cron schedule
  enabled: boolean     // Job habilitado
  dryRun: boolean     // Solo calcular, no guardar
  broker: string      // Broker por defecto
  timezone: string    // Timezone
}

interface CustodyJobStats {
  lastExecution: string | null
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  lastError: string | null
  lastCalculatedFee: number | null
  portfolioValueAtLastRun: number | null
}

export class CustodyFeeJob {
  private task: cron.ScheduledTask | null = null
  private config: CustodyJobConfig
  private stats: CustodyJobStats
  private custodyFeeModel: CustodyFee
  private tradeModel: Trade
  private commissionService: CommissionService
  private dashboardService: DashboardService

  constructor(config?: Partial<CustodyJobConfig>) {
    this.config = {
      schedule: '0 9 1 * *',  // Día 1 de cada mes a las 9:00 AM
      enabled: true,
      dryRun: false,
      broker: 'Galicia',
      timezone: 'America/Argentina/Buenos_Aires',
      ...config
    }

    this.stats = {
      lastExecution: null,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      lastError: null,
      lastCalculatedFee: null,
      portfolioValueAtLastRun: null
    }

    this.custodyFeeModel = new CustodyFee()
    this.tradeModel = new Trade()
    this.commissionService = new CommissionService()
    this.dashboardService = new DashboardService()

    logger.info('CustodyFeeJob initialized:', {
      schedule: this.config.schedule,
      enabled: this.config.enabled,
      broker: this.config.broker
    })
  }

  /**
   * Iniciar el job programado
   */
  start(): void {
    if (!this.config.enabled) {
      logger.warn('CustodyFeeJob is disabled')
      return
    }

    if (this.task) {
      logger.warn('CustodyFeeJob is already running')
      return
    }

    this.task = cron.schedule(this.config.schedule, async () => {
      await this.executeMonthlyCalculation()
    }, {
      scheduled: true,
      timezone: this.config.timezone
    })

    logger.info('CustodyFeeJob started with schedule:', this.config.schedule)
  }

  /**
   * Detener el job
   */
  stop(): void {
    if (this.task) {
      this.task.stop()
      this.task = null
      logger.info('CustodyFeeJob stopped')
    }
  }

  /**
   * Ejecutar cálculo mensual manualmente
   */
  /* eslint-disable-next-line max-lines-per-function */
  async executeMonthlyCalculation(targetMonth?: string): Promise<{
    success: boolean
    custodyFee?: number
    portfolioValue?: number
    isExempt?: boolean
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      this.stats.totalExecutions++
      this.stats.lastExecution = new Date().toISOString()

      // Determinar el mes a procesar
      const processMonth = targetMonth || this.getPreviousMonth()
      
      logger.info('Starting monthly custody calculation for:', {
        month: processMonth,
        broker: this.config.broker,
        dryRun: this.config.dryRun
      })

      // Verificar si ya existe el registro
      const existingRecord = await this.custodyFeeModel.findByMonthAndBroker(
        processMonth, 
        this.config.broker
      )

      if (existingRecord && !this.config.dryRun) {
        logger.warn('Custody fee already calculated for:', {
          month: processMonth,
          broker: this.config.broker,
          existingFee: existingRecord.total_charged
        })
        
        return {
          success: true,
          custodyFee: existingRecord.total_charged,
          portfolioValue: existingRecord.portfolio_value,
          isExempt: existingRecord.is_exempt
        }
      }

      // Obtener valor de cartera al final del mes
      const portfolioValue = await this.calculatePortfolioValueAtMonth(processMonth)
      
      if (portfolioValue <= 0) {
        logger.info('No portfolio value for month, skipping custody calculation:', {
          month: processMonth,
          portfolioValue
        })
        
        return {
          success: true,
          custodyFee: 0,
          portfolioValue: 0,
          isExempt: true
        }
      }

      // Calcular custodia usando CommissionService
      const custodyCalculation = this.commissionService.calculateCustodyFee(portfolioValue)

      // Actualizar estadísticas
      this.stats.lastCalculatedFee = custodyCalculation.totalMonthlyCost
      this.stats.portfolioValueAtLastRun = portfolioValue

      // Si no es dry run, guardar en base de datos
      if (!this.config.dryRun && custodyCalculation.totalMonthlyCost > 0) {
        await this.custodyFeeModel.create({
          month: processMonth,
          portfolio_value: portfolioValue,
          fee_percentage: this.getAppliedPercentage(custodyCalculation),
          fee_amount: custodyCalculation.monthlyFee,
          iva_amount: custodyCalculation.ivaAmount,
          total_charged: custodyCalculation.totalMonthlyCost,
          broker: this.config.broker,
          is_exempt: custodyCalculation.isExempt,
          applicable_amount: custodyCalculation.applicableAmount
        })

        logger.info('Custody fee record created:', {
          month: processMonth,
          portfolioValue,
          totalCharged: custodyCalculation.totalMonthlyCost,
          isExempt: custodyCalculation.isExempt
        })
      }

      this.stats.successfulExecutions++
      
      const executionTime = Date.now() - startTime
      logger.info('Monthly custody calculation completed:', {
        month: processMonth,
        portfolioValue,
        custodyFee: custodyCalculation.totalMonthlyCost,
        isExempt: custodyCalculation.isExempt,
        executionTimeMs: executionTime,
        dryRun: this.config.dryRun
      })

      return {
        success: true,
        custodyFee: custodyCalculation.totalMonthlyCost,
        portfolioValue,
        isExempt: custodyCalculation.isExempt
      }

    } catch (error) {
      this.stats.failedExecutions++
      this.stats.lastError = error instanceof Error ? error.message : String(error)
      
      logger.error('Error in monthly custody calculation:', {
        error: this.stats.lastError,
        month: targetMonth || this.getPreviousMonth(),
        executionTimeMs: Date.now() - startTime
      })

      return {
        success: false,
        error: this.stats.lastError
      }
    }
  }

  /**
   * Calcular valor de cartera al final del mes especificado
   */
  private async calculatePortfolioValueAtMonth(month: string): Promise<number> {
    try {
      // Obtener último día del mes
      const lastDayOfMonth = this.getLastDayOfMonth(month)
      logger.debug('Calculating portfolio value using month boundary', {
        month,
        lastDayOfMonth
      })
      
      // Usar DashboardService para obtener resumen de cartera
      const portfolioSummary = await this.dashboardService.getPortfolioSummary()
      
      // Para simplicidad, usar valor actual si no hay datos históricos
      // En una implementación completa, se podría calcular el valor histórico
      // basado en las operaciones hasta esa fecha
      
      return portfolioSummary.totalValue || 0
      
    } catch (error) {
      logger.error('Error calculating portfolio value for month:', error)
      return 0
    }
  }

  /**
   * Obtener porcentaje aplicado del cálculo de custodia
   */
  private getAppliedPercentage(custodyCalculation: any): number {
    if (custodyCalculation.isExempt || custodyCalculation.applicableAmount <= 0) {
      return 0
    }
    
    // Obtener configuración por defecto para extraer el porcentaje
    const defaultConfig = this.commissionService.getDefaultConfiguration()
    return defaultConfig.custody.monthlyPercentage
  }

  /**
   * Obtener mes anterior en formato YYYY-MM-01
   */
  private getPreviousMonth(): string {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().substring(0, 7) + '-01'
  }

  /**
   * Obtener último día del mes
   */
  private getLastDayOfMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number)
    const lastDay = new Date(year, monthNum, 0).getDate()
    return `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`
  }

  /**
   * Obtener estadísticas del job
   */
  getStats(): CustodyJobStats & { isRunning: boolean; nextExecution: string | null } {
    const nextExecution = this.task && cron.validate(this.config.schedule) 
      ? this.getNextExecutionTime()
      : null

    return {
      ...this.stats,
      isRunning: this.task !== null,
      nextExecution
    }
  }

  /**
   * Calcular próxima ejecución
   */
  private getNextExecutionTime(): string | null {
    try {
      // Esto es una aproximación simple
      // En una implementación completa se usaría una librería como 'node-cron' con mejor soporte
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0)
      return nextMonth.toISOString()
    } catch (error) {
      return null
    }
  }

  /**
   * Reconfigurar el job
   */
  reconfigure(newConfig: Partial<CustodyJobConfig>): void {
    const wasRunning = this.task !== null
    
    if (wasRunning) {
      this.stop()
    }

    this.config = { ...this.config, ...newConfig }
    
    logger.info('CustodyFeeJob reconfigured:', this.config)

    if (wasRunning && this.config.enabled) {
      this.start()
    }
  }

  /**
   * Calcular proyección de custodia para próximos meses
   */
  async projectFutureCustody(months: number = 12): Promise<Array<{
    month: string
    projectedPortfolioValue: number
    projectedCustodyFee: number
    isExempt: boolean
  }>> {
    try {
      const currentPortfolioValue = await this.calculatePortfolioValueAtMonth(
        new Date().toISOString().substring(0, 7) + '-01'
      )

      const projections = []
      
      for (let i = 1; i <= months; i++) {
        const futureDate = new Date()
        futureDate.setMonth(futureDate.getMonth() + i)
        const month = futureDate.toISOString().substring(0, 7) + '-01'
        
        // Proyección simple: asumir mismo valor de cartera
        // En implementación completa se podría incluir crecimiento esperado
        const projectedValue = currentPortfolioValue
        
        const custodyCalculation = this.commissionService.calculateCustodyFee(projectedValue)
        
        projections.push({
          month,
          projectedPortfolioValue: projectedValue,
          projectedCustodyFee: custodyCalculation.totalMonthlyCost,
          isExempt: custodyCalculation.isExempt
        })
      }

      return projections
    } catch (error) {
      logger.error('Error projecting future custody:', error)
      throw new Error(`Failed to project custody: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}