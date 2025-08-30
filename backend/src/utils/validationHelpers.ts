import { Response } from 'express'

/**
 * Valida un parámetro de símbolo
 * @param symbol - El símbolo a validar
 * @param res - Response object para enviar errores
 * @returns true si es válido, false si ya se envió una respuesta de error
 */
export function validateSymbolParam(symbol: string, res: Response): boolean {
  if (!symbol || symbol.length > 10) {
    res.status(400).json({
      success: false,
      error: 'Invalid symbol parameter'
    })
    return false
  }
  return true
}

/**
 * Maneja errores estándar de validación de esquemas Zod
 */
export function handleValidationError(validation: any, res: Response): boolean {
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid request data',
      details: validation.error.issues
    })
    return false
  }
  return true
}

/**
 * Valida que un prompt sea válido para análisis
 * @param prompt - El prompt a validar
 * @param res - Response object para enviar errores
 * @returns true si es válido, false si ya se envió una respuesta de error
 */
export function validatePrompt(prompt: string, res: Response): boolean {
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Prompt is required and must be a string'
    })
    return false
  }

  if (prompt.length > 10000) {
    res.status(400).json({
      success: false,
      error: 'Prompt too long (max 10000 characters)'
    })
    return false
  }

  return true
}

/**
 * Valida parámetros de operación para cálculo de comisiones
 * @param type - Tipo de operación
 * @param amount - Monto de la operación
 * @param res - Response object para enviar errores
 * @returns true si es válido, false si ya se envió una respuesta de error
 */
export function validateOperationParams(type: string, amount: number, res: Response): boolean {
  if (!type || !amount) {
    res.status(400).json({
      success: false,
      error: 'Operation type and amount are required'
    })
    return false
  }

  if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
    res.status(400).json({
      success: false,
      error: 'Operation type must be BUY or SELL'
    })
    return false
  }

  if (amount <= 0) {
    res.status(400).json({
      success: false,
      error: 'Amount must be greater than 0'
    })
    return false
  }

  return true
}