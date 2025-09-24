import axios from 'axios'
import * as cheerio from 'cheerio'
import ESGEvaluationModel, { ESGEvaluation, ESGScoreBreakdown } from '../models/ESGEvaluation.js'
import { Instrument as InstrumentModel } from '../models/Instrument.js'
import { ClaudeContextualService, type ComprehensiveAnalysisResult } from './ClaudeContextualService.js'
import { NewsAnalysisService, type NewsAnalysisResult } from './NewsAnalysisService.js'
import { createLogger } from '../utils/logger.js'
import { RateLimitService } from './rateLimitService.js'

const logger = createLogger('ESGAnalysisService')

export interface ESGDataSource {
  name: string
  type: 'API' | 'SCRAPING' | 'MANUAL' | 'REPORT'
  url?: string
  reliability: number
}

export interface ESGAnalysisResult {
  instrumentId: number
  symbol: string
  environmentalScore: number
  socialScore: number
  governanceScore: number
  totalScore: number
  confidenceLevel: number
  analysisSummary: string
  dataSources: string[]
  keyMetrics: {
    carbonEmissions?: number
    renewableEnergy?: number
    diversityScore?: number
    boardIndependence?: number
    ethicsScore?: number
  }
  controversies: string[]
  analysisDate: string
  nextReviewDate: string
}

export interface ESGControversy {
  title: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  date: string
  source: string
  impact: number
}

// eslint-disable-next-line no-unused-vars
type NewsFilter = (news: NewsAnalysisResult) => boolean

export class ESGAnalysisService {
  private esgModel = new ESGEvaluationModel()
  private instrumentModel = new InstrumentModel()
  private claudeService = new ClaudeContextualService()
  private newsService = new NewsAnalysisService()
  private readonly rateLimiter = new RateLimitService()

  private readonly DATA_SOURCES: ESGDataSource[] = [
    { name: 'Yahoo Finance ESG', type: 'API', url: 'https://query1.finance.yahoo.com/v1/finance/esgChart', reliability: 85 },
    { name: 'Sustainalytics', type: 'SCRAPING', url: 'https://www.sustainalytics.com/', reliability: 95 },
    { name: 'MSCI ESG', type: 'SCRAPING', url: 'https://www.msci.com/our-solutions/esg-investing', reliability: 90 },
    { name: 'CDP Climate', type: 'SCRAPING', url: 'https://www.cdp.net/', reliability: 88 },
    { name: 'Company Reports', type: 'REPORT', reliability: 92 },
    { name: 'News Sentiment', type: 'API', reliability: 70 }
  ]

  /**
   * Perform comprehensive ESG analysis for an instrument
   */
  async analyzeInstrument(instrumentId: number): Promise<ESGAnalysisResult> {
    logger.info(`Starting ESG analysis for instrument ${instrumentId}`)

    try {
      const instrument = await this.instrumentModel.findById(instrumentId)
      if (!instrument) {
        throw new Error(`Instrument ${instrumentId} not found`)
      }

      // Gather data from multiple sources
      const [
        yahooESGData,
        sustainalyticsData,
        newsData,
        controversies
      ] = await Promise.allSettled([
        this.getYahooFinanceESGData(instrument.symbol),
        this.getSustainalyticsData(instrument.symbol, instrument.company_name),
        this.getESGNewsAnalysis(instrument.symbol, instrument.company_name),
        this.detectControversies(instrument.symbol, instrument.company_name)
      ])

      // Combine and analyze all data
      const analysisResult = await this.combineESGData({
        instrumentId,
        symbol: instrument.symbol,
        companyName: instrument.company_name,
        yahooData: yahooESGData.status === 'fulfilled' ? yahooESGData.value : null,
        sustainalyticsData: sustainalyticsData.status === 'fulfilled' ? sustainalyticsData.value : null,
        newsData: newsData.status === 'fulfilled' ? newsData.value : null,
        controversies: controversies.status === 'fulfilled' ? controversies.value : []
      })

      // Save to database
      await this.saveESGEvaluation(analysisResult)

      logger.info(`ESG analysis completed for ${instrument.symbol}`)
      return analysisResult

    } catch (error) {
      logger.error(`Error analyzing ESG for instrument ${instrumentId}:`, error)
      throw error
    }
  }

  /**
   * Get ESG data from Yahoo Finance
   */
  private async getYahooFinanceESGData(symbol: string): Promise<any> {
    try {
      return await this.withRateLimit(`yahoo-${symbol}`, async () => {
        const response = await axios.get(`https://query1.finance.yahoo.com/v1/finance/esgChart`, {
          params: { symbol },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (response.data?.esgChart?.result?.[0]) {
          const esgData = response.data.esgChart.result[0]
          return {
            totalScore: esgData.totalEsg?.raw || 0,
            environmentalScore: esgData.environmentScore?.raw || 0,
            socialScore: esgData.socialScore?.raw || 0,
            governanceScore: esgData.governanceScore?.raw || 0,
            controversyLevel: esgData.adult || 0,
            percentile: esgData.percentile?.raw || 0,
            source: 'Yahoo Finance'
          }
        }

        return null
      })
    } catch (error) {
      logger.warn(`Failed to get Yahoo Finance ESG data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Scrape ESG data from Sustainalytics (simplified)
   */
  private async getSustainalyticsData(symbol: string, companyName: string): Promise<any> {
    try {
      return await this.withRateLimit(`sustainalytics-${symbol}`, async () => {
        // This is a simplified implementation - in production you'd need proper scraping
        const searchUrl = `https://www.sustainalytics.com/esg-rating/${companyName.toLowerCase().replace(/\s+/g, '-')}`

        const response = await axios.get(searchUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const $ = cheerio.load(response.data)

        // Extract ESG score if available
        const score = $('.esg-score').text().trim()
        const risk = $('.esg-risk').text().trim()

        return {
          esgScore: score ? parseFloat(score) : null,
          riskLevel: risk,
          source: 'Sustainalytics',
          confidence: 85
        }
      })
    } catch (error) {
      logger.warn(`Failed to get Sustainalytics data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Analyze ESG-related news using Claude
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async getESGNewsAnalysis(symbol: string, companyName: string): Promise<any> {
    try {
      const keywords = ['esg', 'sustainability', 'environment', 'governance', 'diversity']
      const newsArticles = await this.fetchFilteredNews(
        symbol,
        30,
        10,
        (result: NewsAnalysisResult) => {
          const text = `${result.article.title} ${result.article.description ?? ''}`.toLowerCase()
          return keywords.some(keyword => text.includes(keyword))
        }
      )

      if (newsArticles.length === 0) {
        return null
      }

      const prompt = `
        Analyze the following news articles about ${companyName} (${symbol}) from an ESG perspective.
        Rate the company on Environmental (E), Social (S), and Governance (G) factors on a scale of 0-100.

        Articles:
        ${newsArticles.map((result: NewsAnalysisResult, i: number) => `${i + 1}. ${result.article.title}: ${result.article.description}`).join('\n')}

        Provide your analysis in this JSON format:
        {
          "environmentalScore": number,
          "socialScore": number,
          "governanceScore": number,
          "keyFindings": ["finding1", "finding2"],
          "positiveFactors": ["factor1", "factor2"],
          "negativeFactors": ["factor1", "factor2"],
          "confidence": number (0-100),
          "reasoning": "explanation"
        }
      `

      const analysis = await this.requestClaudeAnalysis(symbol, prompt)

      return this.parseClaudeESGResponse(this.extractClaudeSummary(analysis))

    } catch (error) {
      logger.warn(`Failed to get ESG news analysis for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Detect ESG controversies
   */
  // eslint-disable-next-line max-lines-per-function
  private async detectControversies(symbol: string, companyName: string): Promise<ESGControversy[]> {
    try {
      const controversyKeywords = [
        'lawsuit', 'fine', 'penalty', 'violation', 'scandal', 'controversy',
        'environmental damage', 'labor issues', 'discrimination', 'corruption'
      ]

      const newsArticles = await this.fetchFilteredNews(
        symbol,
        40,
        20,
        (result: NewsAnalysisResult) => {
          const text = `${result.article.title} ${result.article.description ?? ''}`.toLowerCase()
          return controversyKeywords.some(keyword => text.includes(keyword))
        }
      )

      if (newsArticles.length === 0) {
        return []
      }

      const prompt = `
        Analyze the following news articles about ${companyName} (${symbol}) to identify ESG controversies.

        Articles:
        ${newsArticles.map((result: NewsAnalysisResult, i: number) => `${i + 1}. ${result.article.title}: ${result.article.description} (${result.article.publishedAt})`).join('\n')}

        Return a JSON array of controversies with this format:
        [
          {
            "title": "Brief title",
            "description": "Description of the controversy",
            "severity": "LOW|MEDIUM|HIGH|CRITICAL",
            "date": "YYYY-MM-DD",
            "source": "news source",
            "impact": number (0-100)
          }
        ]
        
        Only include significant ESG-related controversies. Ignore minor news.
      `

      const analysis = await this.requestClaudeAnalysis(symbol, prompt)

      return this.parseControversiesResponse(this.extractClaudeSummary(analysis))

    } catch (error) {
      logger.warn(`Failed to detect controversies for ${symbol}:`, error)
      return []
    }
  }

  /**
   * Combine data from multiple sources and calculate final scores
   */
  // eslint-disable-next-line max-lines-per-function
  private async combineESGData(data: {
    instrumentId: number
    symbol: string
    companyName: string
    yahooData: any
    sustainalyticsData: any
    newsData: any
    controversies: ESGControversy[]
  }): Promise<ESGAnalysisResult> {
    
    const scores = {
      environmental: 0,
      social: 0,
      governance: 0
    }

    const dataSources: string[] = []
    const keyMetrics: any = {}

    const sources: Array<{
      label: string
      confidence: number
      contributions: { environmental: number; social: number; governance: number }
    }> = []

    if (data.yahooData) {
      sources.push({
        label: 'Yahoo Finance',
        confidence: 85,
        contributions: {
          environmental: data.yahooData.environmentalScore * 0.4,
          social: data.yahooData.socialScore * 0.4,
          governance: data.yahooData.governanceScore * 0.4
        }
      })
    }

    if (data.sustainalyticsData?.esgScore) {
      const sustainScore = 100 - data.sustainalyticsData.esgScore
      sources.push({
        label: 'Sustainalytics',
        confidence: data.sustainalyticsData.confidence || 90,
        contributions: {
          environmental: sustainScore * 0.3,
          social: sustainScore * 0.3,
          governance: sustainScore * 0.3
        }
      })
    }

    if (data.newsData) {
      sources.push({
        label: 'News Analysis',
        confidence: data.newsData.confidence || 70,
        contributions: {
          environmental: data.newsData.environmentalScore * 0.2,
          social: data.newsData.socialScore * 0.2,
          governance: data.newsData.governanceScore * 0.2
        }
      })
    }

    let totalConfidence = 0
    sources.forEach(source => {
      scores.environmental += source.contributions.environmental
      scores.social += source.contributions.social
      scores.governance += source.contributions.governance
      dataSources.push(source.label)
      totalConfidence += source.confidence
    })

    const sourceCount = sources.length
    const controversyPenalty = this.calculateControversyPenalty(data.controversies)

    if (sourceCount > 0) {
      scores.environmental = Math.max(0, scores.environmental - controversyPenalty)
      scores.social = Math.max(0, scores.social - controversyPenalty)
      scores.governance = Math.max(0, scores.governance - controversyPenalty)
    }

    const totalScore = (scores.environmental * 0.4 + scores.social * 0.3 + scores.governance * 0.3)
    const confidenceLevel = sourceCount > 0 ? totalConfidence / sourceCount : 0

    // Use Claude for final analysis and insights
    const claudeAnalysis = await this.getClaudeESGInsights({
      symbol: data.symbol,
      companyName: data.companyName,
      scores,
      controversies: data.controversies,
      dataSources
    })

    const [analysisDatePart] = new Date().toISOString().split('T')
    const analysisDate = analysisDatePart ?? new Date().toISOString()
    const [nextReviewDatePart] = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')
    const nextReviewDate = nextReviewDatePart ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    return {
      instrumentId: data.instrumentId,
      symbol: data.symbol,
      environmentalScore: Math.round(scores.environmental * 100) / 100,
      socialScore: Math.round(scores.social * 100) / 100,
      governanceScore: Math.round(scores.governance * 100) / 100,
      totalScore: Math.round(totalScore * 100) / 100,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      analysisSummary: claudeAnalysis,
      dataSources,
      keyMetrics,
      controversies: data.controversies.map(c => `${c.title} (${c.severity})`),
      analysisDate,
      nextReviewDate
    }
  }

  /**
   * Get Claude insights for final ESG analysis
   */
  /* eslint-disable-next-line max-lines-per-function */
  private async getClaudeESGInsights(data: {
    symbol: string
    companyName: string
    scores: { environmental: number; social: number; governance: number }
    controversies: ESGControversy[]
    dataSources: string[]
  }): Promise<string> {
    try {
      const prompt = `
        Provide a comprehensive ESG analysis summary for ${data.companyName} (${data.symbol}).
        
        Calculated Scores:
        - Environmental: ${data.scores.environmental}/100
        - Social: ${data.scores.social}/100  
        - Governance: ${data.scores.governance}/100
        
        Data Sources: ${data.dataSources.join(', ')}
        
        Controversies: ${data.controversies.length} identified
        ${data.controversies.map(c => `- ${c.title} (${c.severity})`).join('\n')}
        
        Provide a concise analysis including:
        1. Key strengths and weaknesses
        2. Main ESG risks and opportunities
        3. Recommendations for investors
        4. Outlook and trends
        
        Keep response under 500 words.
      `

      const analysis = await this.requestClaudeAnalysis(data.symbol, prompt)

      const summary = this.extractClaudeSummary(analysis)
      return summary || 'Analysis not available'

    } catch (error) {
      logger.warn(`Failed to get Claude ESG insights for ${data.symbol}:`, error)
      return 'ESG analysis completed with automated scoring.'
    }
  }

  /**
   * Save ESG evaluation to database
   */
  private async saveESGEvaluation(result: ESGAnalysisResult): Promise<void> {
    try {
      const evaluation: Omit<ESGEvaluation, 'id' | 'created_at' | 'updated_at'> = {
        instrument_id: result.instrumentId,
        environmental_score: result.environmentalScore,
        social_score: result.socialScore,
        governance_score: result.governanceScore,
        total_score: result.totalScore,
        evaluation_date: result.analysisDate,
        data_sources: result.dataSources.join(', '),
        confidence_level: result.confidenceLevel,
        next_review_date: result.nextReviewDate,
        analysis_summary: result.analysisSummary || `ESG analysis completed using ${result.dataSources.length} data sources`,
        key_metrics: JSON.stringify(result.keyMetrics),
        controversies: result.controversies.join('; ')
      }

      this.esgModel.create(evaluation)
      
      // Update instrument ESG flag
      this.esgModel.updateInstrumentESGFlags()

    } catch (error) {
      logger.error('Error saving ESG evaluation:', error)
      throw error
    }
  }

  /**
   * Parse Claude's ESG analysis response
   */
  private parseClaudeESGResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return null
    } catch (error) {
      logger.warn('Failed to parse Claude ESG response:', error)
      return null
    }
  }

  /**
   * Parse controversies response
   */
  private parseControversiesResponse(response: string): ESGControversy[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return []
    } catch (error) {
      logger.warn('Failed to parse controversies response:', error)
      return []
    }
  }

  /**
   * Get ESG analysis statistics
   */
  getStatistics() {
    return this.esgModel.getStatistics()
  }

  /**
   * Get instruments needing ESG review
   */
  getInstrumentsNeedingReview() {
    return this.esgModel.getInstrumentsNeedingReview()
  }

  /**
   * Get ESG trends for an instrument
   */
  getTrends(instrumentId: number, months: number = 12) {
    return this.esgModel.getTrends(instrumentId, months)
  }

  /**
   * Calculate ESG score breakdown
   */
  calculateScoreBreakdown(
    environmentalScore: number,
    socialScore: number,
    governanceScore: number
  ): ESGScoreBreakdown {
    return this.esgModel.calculateScoreBreakdown(environmentalScore, socialScore, governanceScore)
  }

  private extractClaudeSummary(analysis: ComprehensiveAnalysisResult): string {
    const summaryParts: string[] = []
    if (analysis.claudeInsights?.summary) {
      summaryParts.push(analysis.claudeInsights.summary)
    }

    if (analysis.claudeInsights?.keyPoints?.length) {
      summaryParts.push(`Key points: ${analysis.claudeInsights.keyPoints.join('; ')}`)
    }

    if (analysis.claudeInsights?.strategicRecommendations?.length) {
      summaryParts.push(`Recommendations: ${analysis.claudeInsights.strategicRecommendations.join('; ')}`)
    }

    return summaryParts.join('\n')
  }

  private async withRateLimit<T>(requestId: string, fn: () => Promise<T>): Promise<T> {
    return this.rateLimiter.executeWithLimit(fn, requestId)
  }

  private async fetchFilteredNews(
    symbol: string,
    pageSize: number,
    limit: number,
    predicate: NewsFilter
  ): Promise<NewsAnalysisResult[]> {
    const newsResults = await this.newsService.searchNews(symbol, {
      symbol,
      pageSize
    }, {
      useCache: true,
      cacheTTLMinutes: 10,
      analyzeWithClaude: true
    })

    return newsResults.filter(article => predicate(article)).slice(0, limit)
  }

  private calculateControversyPenalty(controversies: ESGControversy[]): number {
    return controversies.reduce((penalty, controversy) => {
      const severityFactor = controversy.severity === 'CRITICAL' ? 0.5
        : controversy.severity === 'HIGH' ? 0.3
          : controversy.severity === 'MEDIUM' ? 0.1
            : 0.05
      return penalty + (controversy.impact * severityFactor)
    }, 0)
  }

  private requestClaudeAnalysis(symbol: string, prompt: string): Promise<ComprehensiveAnalysisResult> {
    return this.claudeService.analyzeSymbol({
      symbol,
      analysisType: 'CUSTOM',
      options: {
        includeNews: false,
        includeSentiment: false,
        includeEarnings: false,
        includeTrends: false,
        customPrompt: prompt,
        useCache: false
      }
    })
  }
}

export default ESGAnalysisService
