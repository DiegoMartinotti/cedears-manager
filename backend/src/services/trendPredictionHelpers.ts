import { claudeAnalysisService } from './claudeAnalysisService.js'
import { createLogger } from '../utils/logger.js'
import { TrendPrediction } from './trendPredictionTypes.js'

const logger = createLogger('trend-prediction-service')

export function generateScenarios(symbol: string, prediction: any): {
  name: string
  probability: number
  description: string
  priceImpact: number
  timeToImpact: string
}[] {
  let baseImpact = 0
  if (prediction.direction === 'BULLISH') {
    baseImpact = 8
  } else if (prediction.direction === 'BEARISH') {
    baseImpact = -8
  }

  return [
    {
      name: 'Base Case',
      probability: 60,
      description: 'Escenario más probable basado en tendencias actuales',
      priceImpact: baseImpact,
      timeToImpact: '1-3 meses'
    },
    {
      name: 'Bull Case',
      probability: 25,
      description: 'Escenario optimista con catalizadores positivos',
      priceImpact: 20,
      timeToImpact: '3-6 meses'
    },
    {
      name: 'Bear Case',
      probability: 15,
      description: 'Escenario pesimista con factores de riesgo',
      priceImpact: -15,
      timeToImpact: '1-2 meses'
    }
  ]
}

type TrendClaudeResult = {
  reasoning: string
  keyInsights: string[]
  monitoringPoints: string[]
  confidence: number
}

const TREND_DEFAULT: TrendClaudeResult = {
  reasoning: 'Análisis con Claude no disponible',
  keyInsights: [],
  monitoringPoints: [],
  confidence: 50
}

function buildTrendPrompt(symbol: string, timeframe: string, data: any): string {
  const keyFactorsText = data.keyFactors
    .map((f: any) => `- ${f.factor}: ${f.impact} (${f.description})`)
    .join('\n')
  const scenariosText = data.scenarios
    .map((s: any) => `- ${s.name} (${s.probability}%): ${s.description}`)
    .join('\n')
  const lines = [
    `Analiza la predicción de tendencia para ${symbol} en timeframe ${timeframe}:`,
    '',
    'PREDICCIÓN ACTUAL:',
    `- Dirección: ${data.prediction.direction}`,
    `- Confianza: ${data.prediction.confidence}%`,
    `- Fuerza: ${data.prediction.strength}`,
    '',
    'SCORES COMPONENTES:',
    `- Técnico: ${data.scores.technicalScore}`,
    `- Fundamental: ${data.scores.fundamentalScore}`,
    `- Sentiment: ${data.scores.sentimentScore}`,
    `- Noticias: ${data.scores.newsScore}`,
    `- General: ${data.scores.overallScore}`,
    '',
    'FACTORES CLAVE:',
    keyFactorsText,
    '',
    'ESCENARIOS:',
    scenariosText,
    '',
    'Por favor proporciona:',
    '1. RAZONAMIENTO: Análisis detallado de la predicción (2-3 oraciones)',
    '2. INSIGHTS_CLAVE: 3-5 insights más importantes',
    '3. PUNTOS_MONITOREO: Qué métricas/eventos vigilar de cerca',
    '4. CONFIANZA: Tu nivel de confianza en esta predicción (0-100)',
    '',
    'Considera contexto macro, estacionalidad y eventos próximos.',
    '',
    'Responde en formato JSON:',
    '{',
    '  "reasoning": "Análisis detallado...",',
    '  "keyInsights": ["insight1", "insight2", "insight3"],',
    '  "monitoringPoints": ["punto1", "punto2", "punto3"],',
    '  "confidence": 85',
    '}',
    ''
  ]
  return lines.join('\n')
}

function parseTrendResponse(response: any): TrendClaudeResult {
  if (response.success && response.analysis) {
    try {
      const result = JSON.parse(response.analysis)
      return {
        reasoning: result.reasoning || 'Análisis no disponible',
        keyInsights: result.keyInsights || [],
        monitoringPoints: result.monitoringPoints || [],
        confidence: result.confidence || 70
      }
    } catch {
      return TREND_DEFAULT
    }
  }
  return TREND_DEFAULT
}

export async function analyzeWithClaude(
  symbol: string,
  timeframe: string,
  data: any
): Promise<TrendClaudeResult> {
  const prompt = buildTrendPrompt(symbol, timeframe, data)
  try {
    const response = await claudeAnalysisService.analyze({
      prompt,
      instrumentCode: symbol,
      context: `Predicción de tendencia ${timeframe} para ${symbol}`
    }, {
      useCache: true,
      cacheTTLMinutes: 60,
      retryAttempts: 2
    })
    return parseTrendResponse(response)
  } catch (error) {
    logger.warn('Claude trend analysis failed', { symbol, error })
    return {
      reasoning: 'Error en análisis con Claude',
      keyInsights: [],
      monitoringPoints: [],
      confidence: 30
    }
  }
}

export function extractKeyThemes(allFactors: any[]): string[] {
  const themes = new Map<string, number>()
  allFactors.forEach(factor => {
    const theme = factor.factor
    themes.set(theme, (themes.get(theme) || 0) + 1)
  })
  return Array.from(themes.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme)
}

export function generatePortfolioRecommendations(predictions: TrendPrediction[]): {
  action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' | 'ADD'
  symbol: string
  reason: string
  urgency: 'HIGH' | 'MEDIUM' | 'LOW'
}[] {
  const recommendations: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' | 'ADD'
    symbol: string
    reason: string
    urgency: 'HIGH' | 'MEDIUM' | 'LOW'
  }[] = []

  predictions.forEach(prediction => {
    const { symbol, prediction: pred } = prediction

    if (pred.direction === 'BULLISH' && pred.confidence > 70) {
      recommendations.push({
        action: 'ADD',
        symbol,
        reason: `Tendencia alcista fuerte con ${pred.confidence}% confianza`,
        urgency: pred.strength === 'STRONG' ? 'HIGH' : 'MEDIUM'
      })
    } else if (pred.direction === 'BEARISH' && pred.confidence > 70) {
      recommendations.push({
        action: 'REDUCE',
        symbol,
        reason: `Tendencia bajista con ${pred.confidence}% confianza`,
        urgency: pred.strength === 'STRONG' ? 'HIGH' : 'MEDIUM'
      })
    } else if (pred.confidence < 50) {
      recommendations.push({
        action: 'HOLD',
        symbol,
        reason: `Baja confianza en predicción (${pred.confidence}%)`,
        urgency: 'LOW'
      })
    }
  })

  return recommendations.slice(0, 8)
}

