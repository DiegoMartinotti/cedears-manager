/**
 * Construye un resumen para análisis de earnings
 */
export function buildEarningsSummary(earningsAnalysis: any, historicalEarnings: any[]) {
  return {
    current: earningsAnalysis,
    historical: historicalEarnings,
    summary: {
      assessment: earningsAnalysis.analysis.overallAssessment,
      surprise: earningsAnalysis.earningsData.surprisePercentage,
      priceImpact: earningsAnalysis.analysis.priceImpact.expectedDirection
    }
  }
}

/**
 * Calcula estadísticas de noticias
 */
export function calculateNewsStats(newsAnalysis: any[], newsSentiment: any) {
  return {
    newsAnalysis,
    sentiment: newsSentiment,
    summary: {
      articlesCount: newsAnalysis.length,
      avgRelevance: newsAnalysis.reduce((sum, n) => sum + n.relevance, 0) / newsAnalysis.length || 0,
      sentimentScore: newsSentiment.sentimentScore
    }
  }
}

/**
 * Construye respuesta para cálculo de comisiones
 */
export function buildCommissionResponse(
  operationCommission: any,
  projection: any = null
) {
  return projection ? projection : { operation: operationCommission }
}