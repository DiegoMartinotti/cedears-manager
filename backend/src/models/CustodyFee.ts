import SimpleDatabaseConnection from '../database/simple-connection.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('CustodyFee')

export interface CustodyFeeRecord {
  id?: number
  month: string          // Format: YYYY-MM-01
  portfolio_value: number // Valor total de cartera en ARS
  fee_percentage: number  // Porcentaje aplicado
  fee_amount: number     // Fee base sin IVA
  iva_amount: number     // IVA calculado
  total_charged: number  // Total cobrado (fee + IVA)
  payment_date?: string  // Fecha de cobro efectivo
  broker: string         // Broker (Galicia, Santander, etc.)
  is_exempt: boolean     // Si estuvo exento
  applicable_amount: number // Monto aplicable (portfolio_value - exempt_amount)
  created_at?: string
  updated_at?: string
}

export interface CustodyFeeFilters {
  startMonth?: string
  endMonth?: string
  broker?: string
  isExempt?: boolean
  minAmount?: number
  maxAmount?: number
}

export class CustodyFee {
  private db: SimpleDatabase

  constructor() {
    this.db = SimpleDatabase.getInstance()
  }

  /**
   * Crear un nuevo registro de custodia
   */
  async create(custodyFee: Omit<CustodyFeeRecord, 'id' | 'created_at' | 'updated_at'>): Promise<CustodyFeeRecord> {
    try {
      const now = new Date().toISOString()
      const record: CustodyFeeRecord = {
        ...custodyFee,
        created_at: now,
        updated_at: now
      }

      // Validar que no exista ya un registro para ese mes y broker
      const existing = await this.findByMonthAndBroker(custodyFee.month, custodyFee.broker)
      if (existing) {
        throw new Error(`Custody fee already exists for ${custodyFee.month} - ${custodyFee.broker}`)
      }

      const custodyFees = await this.db.read<CustodyFeeRecord[]>('custody_fees') || []
      const newId = Math.max(0, ...custodyFees.map(cf => cf.id || 0)) + 1
      
      record.id = newId
      custodyFees.push(record)
      
      await this.db.write('custody_fees', custodyFees)

      logger.info('Created custody fee record:', { 
        id: newId, 
        month: record.month, 
        broker: record.broker,
        total_charged: record.total_charged 
      })

      return record
    } catch (error) {
      logger.error('Error creating custody fee:', error)
      throw new Error(`Failed to create custody fee: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Buscar por mes y broker
   */
  async findByMonthAndBroker(month: string, broker: string): Promise<CustodyFeeRecord | null> {
    try {
      const custodyFees = await this.db.read<CustodyFeeRecord[]>('custody_fees') || []
      return custodyFees.find(cf => cf.month === month && cf.broker === broker) || null
    } catch (error) {
      logger.error('Error finding custody fee by month and broker:', error)
      return null
    }
  }

  /**
   * Obtener todos los registros con filtros
   */
  async findAll(filters: CustodyFeeFilters = {}): Promise<CustodyFeeRecord[]> {
    try {
      const custodyFees = await this.db.read<CustodyFeeRecord[]>('custody_fees') || []
      
      return custodyFees.filter(cf => {
        if (filters.startMonth && cf.month < filters.startMonth) return false
        if (filters.endMonth && cf.month > filters.endMonth) return false
        if (filters.broker && cf.broker !== filters.broker) return false
        if (filters.isExempt !== undefined && cf.is_exempt !== filters.isExempt) return false
        if (filters.minAmount && cf.total_charged < filters.minAmount) return false
        if (filters.maxAmount && cf.total_charged > filters.maxAmount) return false
        return true
      }).sort((a, b) => b.month.localeCompare(a.month)) // Más recientes primero
    } catch (error) {
      logger.error('Error finding custody fees:', error)
      throw new Error(`Failed to find custody fees: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtener por ID
   */
  async findById(id: number): Promise<CustodyFeeRecord | null> {
    try {
      const custodyFees = await this.db.read<CustodyFeeRecord[]>('custody_fees') || []
      return custodyFees.find(cf => cf.id === id) || null
    } catch (error) {
      logger.error('Error finding custody fee by ID:', error)
      return null
    }
  }

  /**
   * Actualizar fecha de pago
   */
  async updatePaymentDate(id: number, paymentDate: string): Promise<boolean> {
    try {
      const custodyFees = await this.db.read<CustodyFeeRecord[]>('custody_fees') || []
      const index = custodyFees.findIndex(cf => cf.id === id)
      
      if (index === -1) {
        throw new Error(`Custody fee with ID ${id} not found`)
      }

      custodyFees[index].payment_date = paymentDate
      custodyFees[index].updated_at = new Date().toISOString()
      
      await this.db.write('custody_fees', custodyFees)

      logger.info('Updated custody fee payment date:', { id, paymentDate })
      return true
    } catch (error) {
      logger.error('Error updating custody fee payment date:', error)
      throw new Error(`Failed to update custody fee: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtener estadísticas de custodia
   */
  async getStatistics(filters: CustodyFeeFilters = {}): Promise<{
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
  }> {
    try {
      const records = await this.findAll(filters)
      
      const totalRecords = records.length
      const totalPaid = records.reduce((sum, r) => sum + r.total_charged, 0)
      const averageMonthly = totalRecords > 0 ? totalPaid / totalRecords : 0
      const exemptMonths = records.filter(r => r.is_exempt).length
      const nonExemptMonths = totalRecords - exemptMonths

      // Breakdown por año
      const yearlyMap = new Map<string, { total: number, months: number }>()
      
      records.forEach(record => {
        const year = record.month.substring(0, 4)
        const existing = yearlyMap.get(year) || { total: 0, months: 0 }
        existing.total += record.total_charged
        existing.months += 1
        yearlyMap.set(year, existing)
      })

      const yearlyBreakdown = Array.from(yearlyMap.entries())
        .map(([year, data]) => ({
          year,
          total: data.total,
          months: data.months,
          average: data.total / data.months
        }))
        .sort((a, b) => b.year.localeCompare(a.year))

      return {
        totalRecords,
        totalPaid,
        averageMonthly,
        exemptMonths,
        nonExemptMonths,
        yearlyBreakdown
      }
    } catch (error) {
      logger.error('Error calculating custody statistics:', error)
      throw new Error(`Failed to calculate statistics: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Eliminar registros antiguos (para limpieza)
   */
  async cleanup(olderThanMonths: number = 36): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths)
      const cutoffMonth = cutoffDate.toISOString().substring(0, 7) + '-01'

      const custodyFees = await this.db.read<CustodyFeeRecord[]>('custody_fees') || []
      const originalCount = custodyFees.length
      
      const filtered = custodyFees.filter(cf => cf.month >= cutoffMonth)
      
      if (filtered.length !== originalCount) {
        await this.db.write('custody_fees', filtered)
        const deletedCount = originalCount - filtered.length
        
        logger.info('Cleaned up old custody fee records:', { 
          deleted: deletedCount, 
          remaining: filtered.length,
          cutoffMonth 
        })
        
        return deletedCount
      }

      return 0
    } catch (error) {
      logger.error('Error cleaning up custody fees:', error)
      throw new Error(`Failed to cleanup custody fees: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}