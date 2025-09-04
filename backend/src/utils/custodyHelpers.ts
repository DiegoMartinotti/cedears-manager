import { Response } from 'express'
import { createLogger } from './logger.js'

const logger = createLogger('CustodyHelpers')

/** Tipos de validación */
export type NumericIdValidation =
  | { isValid: true; numericId: number }
  | { isValid: false; error: string }

export type DateValidation =
  | { isValid: true }
  | { isValid: false; error: string }

/**
 * Valida un ID numérico desde parámetros de request
 */
export function validateNumericId(id: string): NumericIdValidation {
  const numericId = parseInt(id)

  if (isNaN(numericId)) {
    return {
      isValid: false,
      error: 'Invalid custody fee ID'
    }
  }

  return { isValid: true, numericId }
}

/**
 * Valida formato de fecha YYYY-MM-DD
 */
export function validateDateString(dateString: string): DateValidation {
  if (!dateString) {
    return {
      isValid: false,
      error: 'Payment date is required'
    }
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) {
    return {
      isValid: false,
      error: 'Invalid payment date format. Expected YYYY-MM-DD'
    }
  }

  const date = new Date(dateString)
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return {
      isValid: false,
      error: 'Invalid payment date. Expected YYYY-MM-DD'
    }
  }

  return { isValid: true }
}

/**
 * Construye respuesta de proyección de custodia
 */
export function buildProjectionResponse({
  projections,
  months,
  portfolioValue,
  monthlyGrowthRate,
  broker
}: {
  projections: any[]
  months: number
  portfolioValue: number
  monthlyGrowthRate: number
  broker: string
}) {
  const totalProjectedCustody = projections.reduce((sum, p) => sum + p.custodyCalculation.totalMonthlyCost, 0)
  const thresholdCrossings = projections.filter(p => p.isThresholdCrossed)

  return {
    projections,
    summary: {
      totalMonths: months,
      totalProjectedCustody,
      averageMonthly: totalProjectedCustody / months,
      thresholdCrossings: thresholdCrossings.length,
      finalPortfolioValue: projections[projections.length - 1]?.portfolioValue || portfolioValue
    },
    parameters: {
      portfolioValue,
      months,
      monthlyGrowthRate,
      broker
    }
  }
}

/**
 * Construye respuesta de optimización de custodia
 */
export function buildOptimizationResponse({
  optimization,
  impactAnalysis,
  portfolioValue,
  targetAnnualReturn,
  broker
}: {
  optimization: any
  impactAnalysis: any
  portfolioValue: number
  targetAnnualReturn: number
  broker: string
}) {
  return {
    optimization,
    impactAnalysis,
    parameters: {
      portfolioValue,
      targetAnnualReturn,
      broker
    }
  }
}

/**
 * Construye respuesta de análisis de impacto
 */
export function buildImpactAnalysisResponse({
  analysis,
  brokerComparisons,
  portfolioValue,
  expectedAnnualReturn,
  broker
}: {
  analysis: any
  brokerComparisons: any[]
  portfolioValue: number
  expectedAnnualReturn: number
  broker: string
}) {
  return {
    analysis,
    brokerComparisons,
    parameters: {
      portfolioValue,
      expectedAnnualReturn,
      broker
    }
  }
}

/**
 * Construye respuesta de actualización exitosa
 */
export function buildUpdateResponse(updatedRecord: any, message: string) {
  return {
    custodyFee: updatedRecord,
    message
  }
}

/**
 * Maneja error estándar y envía respuesta HTTP
 */
export function handleControllerError(
  res: Response,
  error: unknown,
  operation: string,
  statusCode: number = 500
): void {
  logger.error(`Error in ${operation}:`, error)
  
  res.status(statusCode).json({
    success: false,
    error: `Failed to ${operation.toLowerCase()}`,
    message: error instanceof Error ? error.message : String(error)
  })
}

/**
 * Envía respuesta de éxito estándar
 */
export function sendSuccessResponse(res: Response, data: any): void {
  res.json({
    success: true,
    data
  })
}

/**
 * Envía respuesta de error de validación
 */
export function sendValidationError(res: Response, error: string, details?: any): void {
  res.status(400).json({
    success: false,
    error,
    ...(details && { details })
  })
}

/**
 * Envía respuesta de recurso no encontrado
 */
export function sendNotFoundError(res: Response, message: string): void {
  res.status(404).json({
    success: false,
    error: message
  })
}

/**
 * Calcula optimización con servicios
 */
export async function calculateOptimizationWithServices(
  custodyService: any,
  portfolioValue: number,
  targetAnnualReturn: number,
  config: any
) {
  const optimization = custodyService.optimizePortfolioSize(
    portfolioValue,
    targetAnnualReturn,
    config
  )

  const impactAnalysis = custodyService.analyzeImpactOnReturns(
    portfolioValue,
    targetAnnualReturn,
    config
  )

  return { optimization, impactAnalysis }
}

/**
 * Obtiene configuración y servicios para cálculos de custodia
 */
export function getCustodyServicesAndConfig(commissionService: any, broker: string) {
  const config = commissionService.getConfigurationByBroker(broker)
  const custodyService = commissionService.getCustodyService()
  
  return { config, custodyService }
}

/**
 * Log de información de operación
 */
export function logOperation(operation: string, params: Record<string, any>): void {
  logger.info(`${operation}:`, params)
}