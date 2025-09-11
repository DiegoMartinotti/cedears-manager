import yahooFinance from 'yahoo-finance2'
import { rateLimitService } from './rateLimitService.js'
import { createLogger } from '../utils/logger.js'
import { EarningsData } from './earningsAnalysisTypes.js'
import { claudeAnalysisService } from './claudeAnalysisService.js'
import { randomInt } from 'crypto'

const logger = createLogger('earnings-analysis-service')

export async function fetchFromYahooFinance(symbol: string): Promise<EarningsData | null> {
  try {
    await rateLimitService.executeWithLimit(async () => Promise.resolve())
    const quote = await yahooFinance.quoteSummary(symbol, {
      modules: ['earnings', 'earningsHistory', 'earningsTrend']
    })
    const earnings = quote?.earningsHistory?.history?.[0]
    if (!earnings) {
      return null
    }
    return {
      symbol,
      fiscalDateEnding: earnings.quarter || '',
      reportedDate: new Date().toISOString().split('T')[0],
      reportedEPS: earnings.epsActual || 0,
      estimatedEPS: earnings.epsEstimate || 0,
      surprise: (earnings.epsActual || 0) - (earnings.epsEstimate || 0),
      surprisePercentage:
        ((earnings.epsActual || 0) - (earnings.epsEstimate || 0)) /
        (earnings.epsEstimate || 1) * 100,
      revenue: 0 // Yahoo Finance módulo earnings no incluye revenue
    }
  } catch (error) {
    logger.warn('Yahoo Finance earnings fetch failed', { symbol, error })
    return null
  }
}

function secureRandom(min: number, max: number): number {
  const rand = randomInt(0, 1000000) / 1000000
  return min + rand * (max - min)
}

export function generateFallbackData(symbol: string): EarningsData {
  const estimatedEPS = secureRandom(1.5, 2.0)
  const actualEPS = estimatedEPS + secureRandom(-0.15, 0.15)
  return {
    symbol,
    fiscalDateEnding: '2024-03-31',
    reportedDate: new Date().toISOString().split('T')[0],
    reportedEPS: actualEPS,
    estimatedEPS,
    surprise: actualEPS - estimatedEPS,
    surprisePercentage: ((actualEPS - estimatedEPS) / estimatedEPS) * 100,
    revenue: 5000000000
  }
}

export async function getCompetitorComparison(): Promise<{
  symbol: string
  epsGrowth: number
  revenueGrowth: number
  relative: 'OUTPERFORM' | 'INLINE' | 'UNDERPERFORM'
}[]> {
  return [
    { symbol: 'SP500', epsGrowth: 0.05, revenueGrowth: 0.04, relative: 'INLINE' }
  ]
}

function buildPrompt(symbol: string, earnings: EarningsData, context: any): string {
  const lines = [
    `Analiza los resultados de earnings de ${symbol}:`,
    '',
    'DATOS DE EARNINGS:',
    `- EPS Reportado: $${earnings.reportedEPS}`,
    `- EPS Estimado: $${earnings.estimatedEPS}`,
    `- Sorpresa EPS: ${earnings.surprisePercentage}%`,
    `- Revenue: $${earnings.revenue ? (earnings.revenue / 1000000).toFixed(0) + 'M' : 'N/A'}`,
    `- Fecha: ${earnings.reportedDate}`,
    '',
    'ANÁLISIS AUTOMÁTICO:',
    `- Assessment General: ${context.overallAssessment}`,
    `- Análisis EPS: ${context.epsAnalysis.description}`,
    `- Análisis Revenue: ${context.revenueAnalysis?.description || 'No disponible'}`,
    '',
    'CONTEXTO HISTÓRICO:',
    `- Beats consecutivos: ${context.historicalContext.consecutiveBeats}`,
    `- Misses consecutivos: ${context.historicalContext.consecutiveMisses}`,
    `- Promedio sorpresas últimos trimestres: ${context.historicalContext.avgSurpriseLastQuarters}%`,
    '',
    'Por favor proporciona:',
    '1. ANÁLISIS: Evaluación detallada de los resultados (2-3 oraciones)',
    '2. PUNTOS_CLAVE: 3-5 puntos más importantes de estos earnings',
    '3. RIESGOS: Principales riesgos identificados',
    '4. OPORTUNIDADES: Oportunidades que surgen de estos resultados',
    '5. OUTLOOK: Perspectiva para próximos trimestres',
    '6. CONFIANZA: Tu nivel de confianza en este análisis (0-100)',
    '',
    'Considera el contexto del sector y las condiciones macroeconómicas actuales.',
    '',
    'Responde en formato JSON:',
    '{',
    '  "analysis": "Análisis detallado...",',
    '  "keyPoints": ["punto1", "punto2", "punto3"],',
    '  "risks": ["riesgo1", "riesgo2"],',
    '  "opportunities": ["oportunidad1", "oportunidad2"],',
    '  "outlook": "Perspectiva próximos trimestres...",',
    '  "confidence": 85',
    '}',
    ''
  ]
  return lines.join('\n')
}

type ClaudeEarningsResult = {
  analysis: string
  keyPoints: string[]
  risks: string[]
  opportunities: string[]
  outlook: string
  confidence: number
}

const DEFAULT_RESULT: ClaudeEarningsResult = {
  analysis: 'Análisis con Claude no disponible',
  keyPoints: [],
  risks: [],
  opportunities: [],
  outlook: 'Outlook no disponible',
  confidence: 50
}

function parseResponse(response: any): ClaudeEarningsResult {
  if (response.success && response.analysis) {
    try {
      const result = JSON.parse(response.analysis)
      return {
        analysis: result.analysis || 'Análisis no disponible',
        keyPoints: result.keyPoints || [],
        risks: result.risks || [],
        opportunities: result.opportunities || [],
        outlook: result.outlook || 'Outlook no disponible',
        confidence: result.confidence || 70
      }
    } catch {
      return DEFAULT_RESULT
    }
  }
  return DEFAULT_RESULT
}

export async function analyzeWithClaude(
  symbol: string,
  earnings: EarningsData,
  context: any
): Promise<ClaudeEarningsResult> {
  const prompt = buildPrompt(symbol, earnings, context)
  try {
    const response = await claudeAnalysisService.analyze({
      prompt,
      instrumentCode: symbol,
      context: `Análisis de earnings para ${symbol}`
    }, {
      useCache: true,
      cacheTTLMinutes: 120,
      retryAttempts: 2
    })
    return parseResponse(response)
  } catch (error) {
    logger.warn('Claude earnings analysis failed', { symbol, error })
    return {
      analysis: 'Error en análisis con Claude',
      keyPoints: [],
      risks: [],
      opportunities: [],
      outlook: 'Outlook no disponible',
      confidence: 30
    }
  }
}
