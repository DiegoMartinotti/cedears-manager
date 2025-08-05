import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { TradeService, CommissionConfig } from '../services/TradeService.js'
import { CommissionService } from '../services/CommissionService.js'

// Mock de las dependencias
jest.mock('../models/Trade.js')
jest.mock('../models/Instrument.js')
jest.mock('../models/UVA.js')
jest.mock('../utils/logger.js')

describe('TradeService', () => {
  let tradeService: TradeService
  let commissionService: CommissionService

  beforeEach(() => {
    tradeService = new TradeService()
    commissionService = new CommissionService()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Commission Calculations', () => {
    const testConfig: CommissionConfig = {
      name: 'Test Broker',
      broker: 'test',
      isActive: true,
      buy: {
        percentage: 0.005, // 0.5%
        minimum: 150,      // $150 ARS
        iva: 0.21         // 21%
      },
      sell: {
        percentage: 0.005,
        minimum: 150,
        iva: 0.21
      },
      custody: {
        exemptAmount: 1000000,     // $1M ARS
        monthlyPercentage: 0.0025, // 0.25%
        monthlyMinimum: 500,       // $500 ARS
        iva: 0.21
      }
    }

    it('should calculate buy commission correctly for small amounts (minimum applies)', () => {
      const result = commissionService.calculateOperationCommission('BUY', 10000, testConfig)

      // Para $10,000: 0.5% = $50, pero mínimo es $150
      const expectedBaseCommission = 150 // Mínimo aplicado
      const expectedIva = expectedBaseCommission * 0.21 // 21% IVA
      const expectedTotalCommission = expectedBaseCommission + expectedIva
      const expectedNetAmount = 10000 + expectedTotalCommission

      expect(result.baseCommission).toBe(expectedBaseCommission)
      expect(result.ivaAmount).toBe(expectedIva)
      expect(result.totalCommission).toBe(expectedTotalCommission)
      expect(result.netAmount).toBe(expectedNetAmount)
      expect(result.breakdown.minimumApplied).toBe(true)
    })

    it('should calculate buy commission correctly for large amounts (percentage applies)', () => {
      const result = commissionService.calculateOperationCommission('BUY', 100000, testConfig)

      // Para $100,000: 0.5% = $500, mayor que mínimo $150
      const expectedBaseCommission = 500 // Porcentaje aplicado
      const expectedIva = expectedBaseCommission * 0.21
      const expectedTotalCommission = expectedBaseCommission + expectedIva
      const expectedNetAmount = 100000 + expectedTotalCommission

      expect(result.baseCommission).toBe(expectedBaseCommission)
      expect(result.ivaAmount).toBe(expectedIva)
      expect(result.totalCommission).toBe(expectedTotalCommission)
      expect(result.netAmount).toBe(expectedNetAmount)
      expect(result.breakdown.minimumApplied).toBe(false)
    })

    it('should calculate sell commission correctly (subtracts from amount)', () => {
      const result = commissionService.calculateOperationCommission('SELL', 100000, testConfig)

      const expectedBaseCommission = 500
      const expectedIva = expectedBaseCommission * 0.21
      const expectedTotalCommission = expectedBaseCommission + expectedIva
      const expectedNetAmount = 100000 - expectedTotalCommission // Resta en venta

      expect(result.netAmount).toBe(expectedNetAmount)
    })

    it('should calculate custody fee correctly when below exempt amount', () => {
      const result = commissionService.calculateCustodyFee(500000, testConfig) // Menor a $1M

      expect(result.isExempt).toBe(true)
      expect(result.applicableAmount).toBe(0)
      expect(result.monthlyFee).toBe(0)
      expect(result.totalMonthlyCost).toBe(0)
      expect(result.annualFee).toBe(0)
    })

    it('should calculate custody fee correctly when above exempt amount', () => {
      const portfolioValue = 2000000 // $2M ARS
      const result = commissionService.calculateCustodyFee(portfolioValue, testConfig)

      const applicableAmount = portfolioValue - testConfig.custody.exemptAmount // $1M excedente
      const expectedMonthlyFee = applicableAmount * testConfig.custody.monthlyPercentage // $2,500
      const expectedIva = expectedMonthlyFee * testConfig.custody.iva
      const expectedTotalMonthlyCost = expectedMonthlyFee + expectedIva
      const expectedAnnualFee = expectedTotalMonthlyCost * 12

      expect(result.isExempt).toBe(false)
      expect(result.applicableAmount).toBe(applicableAmount)
      expect(result.monthlyFee).toBe(expectedMonthlyFee)
      expect(result.ivaAmount).toBe(expectedIva)
      expect(result.totalMonthlyCost).toBe(expectedTotalMonthlyCost)
      expect(result.annualFee).toBe(expectedAnnualFee)
    })

    it('should apply minimum custody fee when percentage is too low', () => {
      const portfolioValue = 1100000 // $1.1M (solo $100k excedente)
      const result = commissionService.calculateCustodyFee(portfolioValue, testConfig)

      // $100k * 0.25% = $250, pero mínimo es $500
      const expectedMonthlyFee = testConfig.custody.monthlyMinimum // $500
      const expectedIva = expectedMonthlyFee * testConfig.custody.iva
      const expectedTotalMonthlyCost = expectedMonthlyFee + expectedIva

      expect(result.monthlyFee).toBe(expectedMonthlyFee)
      expect(result.totalMonthlyCost).toBe(expectedTotalMonthlyCost)
    })
  })

  describe('Commission Projections', () => {
    it('should project total first year cost correctly', () => {
      const result = commissionService.calculateCommissionProjection(
        'BUY',
        50000,    // Operación de $50k
        800000,   // Cartera actual $800k
        commissionService.getDefaultConfiguration()
      )

      expect(result.operation.totalCommission).toBeGreaterThan(0)
      expect(result.custody.annualFee).toBeGreaterThan(0)
      expect(result.totalFirstYearCost).toBe(
        result.operation.totalCommission + result.custody.annualFee
      )
      expect(result.breakEvenImpact).toBeGreaterThan(0)
    })

    it('should calculate break-even impact percentage correctly', () => {
      const operationAmount = 100000
      const result = commissionService.calculateCommissionProjection(
        'BUY',
        operationAmount,
        500000, // Bajo el límite de custodia
        commissionService.getDefaultConfiguration()
      )

      const expectedBreakEvenImpact = (result.totalFirstYearCost / operationAmount) * 100

      expect(result.breakEvenImpact).toBeCloseTo(expectedBreakEvenImpact, 2)
    })
  })

  describe('Minimum Investment Calculation', () => {
    it('should calculate minimum investment for 2% commission threshold', () => {
      const result = commissionService.calculateMinimumInvestmentForCommissionThreshold(
        2.0, // 2% threshold
        commissionService.getDefaultConfiguration()
      )

      // Con mínimo $150 + IVA 21% = $181.5, para 2% necesitamos $9,075
      const config = commissionService.getDefaultConfiguration()
      const minimumCommissionWithIva = config.buy.minimum * (1 + config.buy.iva)
      const expectedMinimum = minimumCommissionWithIva / 0.02

      expect(result.minimumAmount).toBeCloseTo(expectedMinimum, -1) // Aproximado a decenas
      expect(result.commissionPercentage).toBeLessThanOrEqual(2.1) // Con algo de tolerancia
    })

    it('should provide appropriate recommendation for different amounts', () => {
      const lowThreshold = commissionService.calculateMinimumInvestmentForCommissionThreshold(5.0)
      const highThreshold = commissionService.calculateMinimumInvestmentForCommissionThreshold(0.5)

      expect(lowThreshold.minimumAmount).toBeLessThan(10000)
      expect(lowThreshold.recommendation).toContain('muy bajo')

      expect(highThreshold.minimumAmount).toBeGreaterThan(50000)
      expect(highThreshold.recommendation).toContain('alto')
    })
  })

  describe('Broker Comparison', () => {
    it('should compare brokers and rank by total cost', () => {
      const comparison = commissionService.compareBrokerCommissions(
        'BUY',
        100000,  // $100k operation
        1500000  // $1.5M portfolio
      )

      expect(comparison.length).toBeGreaterThan(1)
      expect(comparison[0].ranking).toBe(1) // Cheapest is ranked 1
      
      // Verify ranking order (cheapest to most expensive)
      for (let i = 1; i < comparison.length; i++) {
        expect(comparison[i].totalFirstYearCost).toBeGreaterThanOrEqual(
          comparison[i - 1].totalFirstYearCost
        )
        expect(comparison[i].ranking).toBe(i + 1)
      }
    })

    it('should include all required broker information', () => {
      const comparison = commissionService.compareBrokerCommissions('BUY', 50000, 1000000)

      comparison.forEach(broker => {
        expect(broker.broker).toBeDefined()
        expect(broker.name).toBeDefined()
        expect(broker.operationCommission).toBeDefined()
        expect(broker.custodyFee).toBeDefined()
        expect(broker.totalFirstYearCost).toBeGreaterThan(0)
        expect(broker.ranking).toBeGreaterThan(0)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero operation amount', () => {
      expect(() => {
        commissionService.calculateOperationCommission('BUY', 0)
      }).not.toThrow()

      const result = commissionService.calculateOperationCommission('BUY', 0)
      expect(result.baseCommission).toBe(150) // Minimum still applies
    })

    it('should handle very large amounts', () => {
      const largeAmount = 10000000 // $10M
      const result = commissionService.calculateOperationCommission('BUY', largeAmount)

      expect(result.baseCommission).toBe(largeAmount * 0.005) // Percentage, not minimum
      expect(result.totalCommission).toBeGreaterThan(result.baseCommission)
    })

    it('should handle negative portfolio values gracefully', () => {
      const result = commissionService.calculateCustodyFee(-100000)
      
      expect(result.isExempt).toBe(true)
      expect(result.applicableAmount).toBe(0)
      expect(result.monthlyFee).toBe(0)
    })
  })

  describe('Configuration Management', () => {
    it('should get all available broker configurations', () => {
      const configs = commissionService.getAvailableConfigurations()
      
      expect(configs.length).toBeGreaterThan(0)
      configs.forEach(config => {
        expect(config.isActive).toBe(true)
        expect(config.broker).toBeDefined()
        expect(config.name).toBeDefined()
        expect(config.buy).toBeDefined()
        expect(config.sell).toBeDefined()
        expect(config.custody).toBeDefined()
      })
    })

    it('should get configuration by broker name', () => {
      const galiciaConfig = commissionService.getConfigurationByBroker('galicia')
      
      expect(galiciaConfig).not.toBeNull()
      expect(galiciaConfig?.broker).toBe('galicia')
      expect(galiciaConfig?.name).toBe('Banco Galicia')
    })

    it('should return null for non-existent broker', () => {
      const invalidConfig = commissionService.getConfigurationByBroker('nonexistent')
      
      expect(invalidConfig).toBeNull()
    })

    it('should set and use default configuration', () => {
      const originalDefault = commissionService.getDefaultConfiguration()
      
      // Change to different broker
      const success = commissionService.setDefaultConfiguration('santander')
      expect(success).toBe(true)
      
      const newDefault = commissionService.getDefaultConfiguration()
      expect(newDefault.broker).toBe('santander')
      
      // Restore original
      commissionService.setDefaultConfiguration(originalDefault.broker)
    })
  })
})

describe('Integration Tests', () => {
  let tradeService: TradeService
  let commissionService: CommissionService

  beforeEach(() => {
    tradeService = new TradeService()
    commissionService = new CommissionService()
  })

  describe('Real-world Scenarios', () => {
    it('should calculate realistic commission for typical CEDEAR purchase', () => {
      // Escenario: Compra de $50,000 ARS de CEDEAR AAPL con cartera de $800,000
      const operationAmount = 50000
      const portfolioValue = 800000

      const projection = commissionService.calculateCommissionProjection(
        'BUY',
        operationAmount,
        portfolioValue
      )

      // Validaciones de mundo real
      expect(projection.operation.totalCommission).toBeLessThan(operationAmount * 0.02) // Menos del 2%
      expect(projection.breakEvenImpact).toBeLessThan(3.0) // Menos del 3% total
      expect(projection.custody.isExempt).toBe(true) // Bajo el límite de $1M
    })

    it('should warn about high commission impact for small trades', () => {
      // Escenario: Compra pequeña de $5,000 ARS
      const smallAmount = 5000
      
      const calculation = commissionService.calculateOperationCommission('BUY', smallAmount)
      const commissionPercentage = (calculation.totalCommission / smallAmount) * 100

      expect(commissionPercentage).toBeGreaterThan(3.0) // Más del 3%
      expect(calculation.breakdown.minimumApplied).toBe(true) // Mínimo aplicado
    })

    it('should calculate custody fees for large portfolio', () => {
      // Escenario: Cartera de $5M ARS
      const largePortfolio = 5000000
      
      const custodyFee = commissionService.calculateCustodyFee(largePortfolio)
      
      expect(custodyFee.isExempt).toBe(false)
      expect(custodyFee.applicableAmount).toBe(4000000) // $4M aplicable
      expect(custodyFee.annualFee).toBeGreaterThan(10000) // Significativo
    })

    it('should identify best broker for different scenarios', () => {
      const scenarios = [
        { operation: 25000, portfolio: 500000, description: 'Small trade, small portfolio' },
        { operation: 100000, portfolio: 2000000, description: 'Large trade, large portfolio' },
        { operation: 10000, portfolio: 800000, description: 'Very small trade' }
      ]

      scenarios.forEach(scenario => {
        const comparison = commissionService.compareBrokerCommissions(
          'BUY',
          scenario.operation,
          scenario.portfolio
        )

        expect(comparison.length).toBeGreaterThan(1)
        
        const cheapest = comparison[0]
        const mostExpensive = comparison[comparison.length - 1]
        
        expect(cheapest.totalFirstYearCost).toBeLessThan(mostExpensive.totalFirstYearCost)
        
        console.log(`Scenario: ${scenario.description}`)
        console.log(`Cheapest: ${cheapest.name} - $${cheapest.totalFirstYearCost.toFixed(2)}`)
        console.log(`Most expensive: ${mostExpensive.name} - $${mostExpensive.totalFirstYearCost.toFixed(2)}`)
      })
    })
  })

  describe('Performance Tests', () => {
    it('should calculate commissions quickly for batch operations', () => {
      const startTime = Date.now()
      
      // Simular 100 cálculos de comisiones
      for (let i = 0; i < 100; i++) {
        commissionService.calculateOperationCommission(
          'BUY',
          Math.random() * 100000 + 10000 // Entre $10k y $110k
        )
      }
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(1000) // Menos de 1 segundo
    })

    it('should handle large broker comparisons efficiently', () => {
      const startTime = Date.now()
      
      // Simular 50 comparaciones
      for (let i = 0; i < 50; i++) {
        commissionService.compareBrokerCommissions(
          'BUY',
          Math.random() * 200000 + 20000,
          Math.random() * 3000000 + 500000
        )
      }
      
      const endTime = Date.now()
      const executionTime = endTime - startTime
      
      expect(executionTime).toBeLessThan(2000) // Menos de 2 segundos
    })
  })
})