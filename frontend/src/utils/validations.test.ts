import { describe, it, expect } from 'vitest'
import { 
  cedearSchema, 
  tradeSchema, 
  financialGoalSchema,
  commissionConfigSchema,
  searchSchema 
} from './validations'

describe('cedearSchema', () => {
  const validCEDEAR = {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    underlyingSymbol: 'AAPL',
    ratio: 1.0,
    currency: 'USD' as const,
    isESG: false,
    isVegan: true,
    sector: 'Technology',
    exchange: 'NASDAQ' as const
  }

  it('valida un CEDEAR válido', () => {
    const result = cedearSchema.safeParse(validCEDEAR)
    expect(result.success).toBe(true)
  })

  it('rechaza símbolo vacío', () => {
    const result = cedearSchema.safeParse({ ...validCEDEAR, symbol: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El símbolo es requerido')
    }
  })

  it('rechaza símbolo con caracteres inválidos', () => {
    const result = cedearSchema.safeParse({ ...validCEDEAR, symbol: 'aapl!' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El símbolo debe contener solo letras mayúsculas, números y puntos')
    }
  })

  it('rechaza ratio negativo', () => {
    const result = cedearSchema.safeParse({ ...validCEDEAR, ratio: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El ratio debe ser un número positivo')
    }
  })

  it('rechaza moneda inválida', () => {
    const result = cedearSchema.safeParse({ ...validCEDEAR, currency: 'EUR' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('La moneda debe ser USD o ARS')
    }
  })
})

describe('tradeSchema', () => {
  const validTrade = {
    cedearId: 'cedear-123',
    type: 'BUY' as const,
    quantity: 100,
    price: 150.5,
    commission: 5.0,
    date: new Date('2024-01-01'),
    notes: 'Compra inicial'
  }

  it('valida un trade válido', () => {
    const result = tradeSchema.safeParse(validTrade)
    expect(result.success).toBe(true)
  })

  it('rechaza cantidad cero', () => {
    const result = tradeSchema.safeParse({ ...validTrade, quantity: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('La cantidad debe ser un número positivo')
    }
  })

  it('rechaza precio negativo', () => {
    const result = tradeSchema.safeParse({ ...validTrade, price: -10 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El precio debe ser un número positivo')
    }
  })

  it('rechaza fecha futura', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)
    
    const result = tradeSchema.safeParse({ ...validTrade, date: futureDate })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('La fecha no puede ser futura')
    }
  })

  it('acepta notas opcionales', () => {
    const { notes: _notes, ...tradeWithoutNotes } = validTrade
    const result = tradeSchema.safeParse(tradeWithoutNotes)
    expect(result.success).toBe(true)
  })
})

describe('financialGoalSchema', () => {
  const validGoal = {
    name: 'Retiro',
    targetAmount: 500000,
    currentAmount: 50000,
    deadline: new Date('2030-12-31'),
    category: 'retirement' as const,
    priority: 'high' as const
  }

  it('valida un objetivo válido', () => {
    const result = financialGoalSchema.safeParse(validGoal)
    expect(result.success).toBe(true)
  })

  it('rechaza monto objetivo muy bajo', () => {
    const result = financialGoalSchema.safeParse({ ...validGoal, targetAmount: 500 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El monto mínimo es $1,000')
    }
  })

  it('rechaza fecha límite en el pasado', () => {
    const pastDate = new Date('2020-01-01')
    const result = financialGoalSchema.safeParse({ ...validGoal, deadline: pastDate })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('La fecha límite debe ser futura')
    }
  })

  it('acepta monto actual por defecto', () => {
    const { currentAmount: _currentAmount, ...goalWithoutCurrent } = validGoal
    const result = financialGoalSchema.safeParse(goalWithoutCurrent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currentAmount).toBe(0)
    }
  })
})

describe('commissionConfigSchema', () => {
  const validConfig = {
    name: 'Comisión Estándar',
    type: 'percentage' as const,
    value: 1.5,
    minAmount: 10,
    maxAmount: 1000
  }

  it('valida una configuración válida', () => {
    const result = commissionConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  it('rechaza nombre vacío', () => {
    const result = commissionConfigSchema.safeParse({ ...validConfig, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El nombre de la configuración es requerido')
    }
  })

  it('rechaza monto mínimo mayor al máximo', () => {
    const result = commissionConfigSchema.safeParse({ 
      ...validConfig, 
      minAmount: 1000, 
      maxAmount: 500 
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('El monto mínimo debe ser menor o igual al monto máximo')
    }
  })

  it('acepta configuración sin montos opcionales', () => {
    const { minAmount: _minAmount, maxAmount: _maxAmount, ...configWithoutAmounts } = validConfig
    const result = commissionConfigSchema.safeParse(configWithoutAmounts)
    expect(result.success).toBe(true)
  })
})

describe('searchSchema', () => {
  const validSearch = {
    query: 'AAPL',
    filters: {
      isESG: true,
      isVegan: false,
      sectors: ['Technology'],
      exchanges: ['NASDAQ'],
      currency: 'USD' as const
    }
  }

  it('valida una búsqueda válida', () => {
    const result = searchSchema.safeParse(validSearch)
    expect(result.success).toBe(true)
  })

  it('acepta búsqueda sin filtros', () => {
    const { filters: _filters, ...searchWithoutFilters } = validSearch
    const result = searchSchema.safeParse(searchWithoutFilters)
    expect(result.success).toBe(true)
  })

  it('rechaza query muy larga', () => {
    const longQuery = 'a'.repeat(101)
    const result = searchSchema.safeParse({ ...validSearch, query: longQuery })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('La búsqueda no puede tener más de 100 caracteres')
    }
  })

  it('acepta query vacía', () => {
    const result = searchSchema.safeParse({ ...validSearch, query: '' })
    expect(result.success).toBe(true)
  })
})