import { describe, it, expect } from 'vitest'

describe('Test Suite Básico', () => {
  it('debe ejecutarse correctamente', () => {
    expect(1 + 1).toBe(2)
  })

  it('debe validar strings', () => {
    const testString = 'CEDEARs Manager'
    expect(testString).toContain('CEDEAR')
    expect(testString.length).toBeGreaterThan(0)
  })

  it('debe validar arrays', () => {
    const testArray = ['AAPL', 'GOOGL', 'MSFT']
    expect(testArray).toHaveLength(3)
    expect(testArray).toContain('AAPL')
  })

  it('debe validar objetos', () => {
    const testObject = {
      symbol: 'AAPL',
      price: 150.50,
      isESG: true
    }
    expect(testObject).toHaveProperty('symbol')
    expect(testObject.price).toBeGreaterThan(0)
    expect(testObject.isESG).toBe(true)
  })

  it('debe manejar promesas', async () => {
    const asyncFunction = async () => {
      return new Promise(resolve => setTimeout(() => resolve('success'), 10))
    }
    
    const result = await asyncFunction()
    expect(result).toBe('success')
  })
})