import {
  GICS_SECTORS,
  findSectorByKeywords,
  getSectorMappingByTicker,
  getSectorByName
} from '../constants/gicsSectors.js'
import SectorClassificationModel from '../models/SectorClassification.js'
import { Instrument } from '../models/Instrument.js'
import { createLogger } from '../utils/logger.js'
import type { 
  SectorClassification,
  ClassificationUpdate 
} from '../types/sectorBalance.types.js'

const logger = createLogger('GICSClassificationService')

export class GICSClassificationService {
  private sectorClassificationModel = new SectorClassificationModel()
  private instrumentModel = new Instrument()

  // ============================================================================
  // Core Classification Methods
  // ============================================================================

  /**
   * Classify a single instrument using multiple methods
   */
  async classifyInstrument(instrumentId: number): Promise<SectorClassification | null> {
    try {
      const instrument = await this.instrumentModel.findById(instrumentId)
      if (!instrument) {
        logger.warn(`Instrument ${instrumentId} not found`)
        return null
      }

      const classification = await this.determineClassification(
        instrument.symbol,
        instrument.company_name,
        instrument.sector || undefined,
        instrument.industry || undefined
      )

      if (!classification) {
        logger.warn(`Could not classify instrument ${instrument.symbol}`)
        return null
      }

      // Upsert classification
      const result = await this.sectorClassificationModel.upsertByInstrumentId(
        instrumentId,
        classification
      )

      logger.info(`Classified ${instrument.symbol} as ${classification.gicsSector} (${classification.confidenceScore}% confidence)`)
      return result
    } catch (error) {
      logger.error(`Error classifying instrument ${instrumentId}:`, error)
      return null
    }
  }

  /**
   * Classify multiple instruments in batch
   */
  async batchClassifyInstruments(instrumentIds: number[]): Promise<{
    successful: SectorClassification[]
    failed: number[]
    updates: ClassificationUpdate[]
  }> {
    const successful: SectorClassification[] = []
    const failed: number[] = []
    const updates: ClassificationUpdate[] = []

    logger.info(`Starting batch classification for ${instrumentIds.length} instruments`)

    for (const instrumentId of instrumentIds) {
      try {
        const existing = await this.sectorClassificationModel.findByInstrumentId(instrumentId)
        const classification = await this.classifyInstrument(instrumentId)
        
        if (classification) {
          successful.push(classification)
          
          // Track updates
          if (existing && existing.gicsSector !== classification.gicsSector) {
            updates.push({
              instrumentId,
              oldSector: existing.gicsSector,
              newSector: classification.gicsSector,
              confidence: classification.confidenceScore,
              source: classification.source,
              reason: 'Batch reclassification'
            })
          }
        } else {
          failed.push(instrumentId)
        }
      } catch (error) {
        logger.error(`Error in batch classification for instrument ${instrumentId}:`, error)
        failed.push(instrumentId)
      }
    }

    logger.info(`Batch classification completed: ${successful.length} successful, ${failed.length} failed`)
    return { successful, failed, updates }
  }

  /**
   * Automatically classify all unclassified instruments
   */
  async autoClassifyAll(): Promise<{
    newClassifications: number
    updates: number
    errors: number
  }> {
    try {
      // Get all active instruments
      const instruments = await this.instrumentModel.findAll({ isActive: true })
      const instrumentIds = instruments.map(i => i.id!).filter(id => id !== undefined)

      logger.info(`Starting auto-classification for ${instrumentIds.length} instruments`)

      const result = await this.batchClassifyInstruments(instrumentIds)
      
      return {
        newClassifications: result.successful.length,
        updates: result.updates.length,
        errors: result.failed.length
      }
    } catch (error) {
      logger.error('Error in auto classification:', error)
      return { newClassifications: 0, updates: 0, errors: 1 }
    }
  }

  // ============================================================================
  // Classification Logic
  // ============================================================================

  /**
   * Determine the best classification for an instrument
   */
  private async determineClassification(
    ticker: string,
    companyName: string,
    existingSector?: string,
    existingIndustry?: string
  ): Promise<Omit<SectorClassification, 'id' | 'instrumentId' | 'createdAt' | 'updatedAt'> | null> {
    const methods = [
      () => this.classifyByDirectMapping(ticker),
      () => this.classifyByExistingData(existingSector, existingIndustry),
      () => this.classifyByKeywords(companyName, ticker),
      () => this.classifyByTicker(ticker),
      () => this.classifyByCompanyName(companyName)
    ]

    let bestClassification: any = null
    let bestScore = 0

    for (const method of methods) {
      const result = await method()
      if (result && result.confidenceScore > bestScore) {
        bestClassification = result
        bestScore = result.confidenceScore
      }
    }

    return bestClassification
  }

  /**
   * Classify using direct mapping from constants
   */
  private async classifyByDirectMapping(ticker: string) {
    const mapping = getSectorMappingByTicker(ticker)
    if (!mapping) return null

    const sector = getSectorByName(mapping.sector)
    if (!sector) return null

    return {
      gicsSector: sector.name,
      gicsIndustryGroup: mapping.industryGroup,
      gicsIndustry: mapping.industry,
      gicsSubIndustry: mapping.subIndustry,
      lastUpdated: new Date().toISOString(),
      source: 'MANUAL' as const,
      confidenceScore: mapping.confidence
    }
  }

  /**
   * Classify using existing sector/industry data
   */
  private async classifyByExistingData(sector?: string, industry?: string) {
    if (!sector) return null

    const gicsSector = getSectorByName(sector) || this.findSectorByPartialMatch(sector)
    if (!gicsSector) return null

    return {
      gicsSector: gicsSector.name,
      gicsIndustryGroup: industry,
      gicsIndustry: industry,
      gicsSubIndustry: undefined,
      lastUpdated: new Date().toISOString(),
      source: 'AUTO' as const,
      confidenceScore: 80
    }
  }

  /**
   * Classify using keyword matching
   */
  private async classifyByKeywords(companyName: string, ticker: string) {
    const sector = findSectorByKeywords(companyName, ticker)
    if (!sector) return null

    return {
      gicsSector: sector.name,
      gicsIndustryGroup: undefined,
      gicsIndustry: undefined,
      gicsSubIndustry: undefined,
      lastUpdated: new Date().toISOString(),
      source: 'AUTO' as const,
      confidenceScore: 70
    }
  }

  /**
   * Classify based on ticker patterns
   */
  private async classifyByTicker(ticker: string) {
    const patterns = this.getTickerPatterns()
    
    for (const [pattern, sectorName, confidence] of patterns) {
      if (pattern.test(ticker)) {
        const sector = getSectorByName(sectorName)
        if (sector) {
          return {
            gicsSector: sector.name,
            gicsIndustryGroup: undefined,
            gicsIndustry: undefined,
            gicsSubIndustry: undefined,
            lastUpdated: new Date().toISOString(),
            source: 'AUTO' as const,
            confidenceScore: confidence
          }
        }
      }
    }

    return null
  }

  /**
   * Classify based on company name patterns
   */
  private async classifyByCompanyName(companyName: string) {
    const namePatterns = this.getCompanyNamePatterns()
    const lowerName = companyName.toLowerCase()
    
    for (const [keywords, sectorName, confidence] of namePatterns) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword.toLowerCase())) {
          const sector = getSectorByName(sectorName)
          if (sector) {
            return {
              gicsSector: sector.name,
              gicsIndustryGroup: undefined,
              gicsIndustry: undefined,
              gicsSubIndustry: undefined,
              lastUpdated: new Date().toISOString(),
              source: 'AUTO' as const,
              confidenceScore: confidence
            }
          }
        }
      }
    }

    return null
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Find sector by partial name match
   */
  private findSectorByPartialMatch(partialName: string) {
    const lower = partialName.toLowerCase()
    return GICS_SECTORS.find(sector => 
      sector.name.toLowerCase().includes(lower) ||
      lower.includes(sector.name.toLowerCase())
    )
  }

  /**
   * Get ticker pattern rules
   */
  private getTickerPatterns(): Array<[RegExp, string, number]> {
    return [
      // Technology patterns
      [/^(TECH|SOFT|COMP|DATA|CYBER)/i, 'Information Technology', 60],
      [/^(APP|MICRO|INTEL|AMD|NVDA)/i, 'Information Technology', 65],
      
      // Financial patterns
      [/^(BANK|FIN|INS|MORT|LOAN)/i, 'Financials', 60],
      [/^(JPM|BAC|WFC|GS|MS|C)/i, 'Financials', 70],
      
      // Healthcare patterns
      [/^(MED|PHARM|BIO|HEALTH)/i, 'Health Care', 60],
      [/^(JNJ|PFE|MRK|ABT)/i, 'Health Care', 70],
      
      // Energy patterns
      [/^(OIL|GAS|ENERGY|PETRO)/i, 'Energy', 60],
      [/^(XOM|CVX|COP|EOG)/i, 'Energy', 70],
      
      // Consumer patterns
      [/^(CONS|RETAIL|STORE)/i, 'Consumer Discretionary', 55],
      [/^(FOOD|BEVERAGE|DRINK)/i, 'Consumer Staples', 55],
      
      // Industrial patterns
      [/^(IND|MANU|AERO|DEF)/i, 'Industrials', 55],
      
      // Utilities patterns
      [/^(UTIL|ELEC|WATER|GAS)/i, 'Utilities', 60],
      
      // Materials patterns
      [/^(METAL|MINING|CHEM|MATER)/i, 'Materials', 55],
      
      // Real Estate patterns
      [/^(REIT|REAL|PROP)/i, 'Real Estate', 60],
      
      // Communication patterns
      [/^(TEL|COMM|MEDIA|BROAD)/i, 'Communication Services', 55]
    ]
  }

  /**
   * Get company name pattern rules
   */
  private getCompanyNamePatterns(): Array<[string[], string, number]> {
    return [
      // Technology
      [['technology', 'software', 'systems', 'computer', 'internet', 'digital', 'data', 'cloud'], 'Information Technology', 50],
      [['microsoft', 'apple', 'google', 'amazon', 'meta', 'facebook', 'netflix', 'tesla'], 'Information Technology', 65],
      
      // Healthcare
      [['pharmaceutical', 'healthcare', 'medical', 'hospital', 'clinic', 'biotech', 'drug'], 'Health Care', 50],
      [['johnson', 'pfizer', 'merck', 'abbott', 'bristol'], 'Health Care', 65],
      
      // Financial
      [['bank', 'financial', 'insurance', 'investment', 'capital', 'fund', 'credit'], 'Financials', 50],
      [['jpmorgan', 'goldman', 'morgan', 'citigroup', 'wells'], 'Financials', 65],
      
      // Energy
      [['oil', 'gas', 'energy', 'petroleum', 'refining', 'drilling', 'exploration'], 'Energy', 50],
      [['exxon', 'chevron', 'conocophillips', 'marathon'], 'Energy', 65],
      
      // Consumer Discretionary
      [['retail', 'restaurant', 'hotel', 'entertainment', 'media', 'automotive', 'apparel'], 'Consumer Discretionary', 45],
      [['disney', 'mcdonalds', 'starbucks', 'nike', 'home depot'], 'Consumer Discretionary', 60],
      
      // Consumer Staples
      [['food', 'beverage', 'household', 'personal care', 'tobacco', 'grocery'], 'Consumer Staples', 45],
      [['coca cola', 'pepsi', 'procter', 'walmart', 'costco'], 'Consumer Staples', 60],
      
      // Industrials
      [['industrial', 'manufacturing', 'aerospace', 'defense', 'transportation', 'logistics'], 'Industrials', 45],
      [['boeing', 'caterpillar', 'general electric', '3m', 'honeywell'], 'Industrials', 60],
      
      // Materials
      [['chemical', 'metals', 'mining', 'materials', 'steel', 'aluminum', 'copper'], 'Materials', 45],
      [['dupont', 'dow', 'newmont', 'freeport'], 'Materials', 60],
      
      // Utilities
      [['utility', 'electric', 'power', 'gas', 'water', 'renewable'], 'Utilities', 50],
      [['nextera', 'dominion', 'duke', 'southern'], 'Utilities', 65],
      
      // Communication Services
      [['telecommunication', 'wireless', 'internet', 'cable', 'broadcasting', 'media'], 'Communication Services', 45],
      [['verizon', 'comcast', 'disney', 'netflix'], 'Communication Services', 60],
      
      // Real Estate
      [['real estate', 'reit', 'property', 'development', 'construction'], 'Real Estate', 50]
    ]
  }

  // ============================================================================
  // Validation and Quality Control
  // ============================================================================

  /**
   * Validate a classification result
   */
  async validateClassification(classification: SectorClassification): Promise<{
    isValid: boolean
    score: number
    issues: string[]
  }> {
    const issues: string[] = []
    let score = 100

    // Check if sector exists in GICS
    const sector = getSectorByName(classification.gicsSector)
    if (!sector) {
      issues.push(`Invalid GICS sector: ${classification.gicsSector}`)
      score -= 50
    }

    // Check confidence score
    if (classification.confidenceScore < 30) {
      issues.push('Low confidence score')
      score -= 20
    }

    // Check source validity
    if (!['AUTO', 'MANUAL', 'YAHOO', 'EXTERNAL'].includes(classification.source)) {
      issues.push(`Invalid source: ${classification.source}`)
      score -= 10
    }

    // Check data freshness
    const lastUpdated = new Date(classification.lastUpdated)
    const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 90) {
      issues.push('Classification is outdated')
      score -= 15
    }

    return {
      isValid: issues.length === 0,
      score: Math.max(0, score),
      issues
    }
  }

  /**
   * Get classification quality report
   */
  async getQualityReport(): Promise<{
    totalClassifications: number
    highQuality: number
    mediumQuality: number
    lowQuality: number
    needsReview: SectorClassification[]
    averageConfidence: number
  }> {
    try {
      const stats = await this.sectorClassificationModel.getClassificationStats()
      const { highConfidence, lowConfidence } = await this.sectorClassificationModel.getClassificationsByConfidence(70)
      
      return {
        totalClassifications: stats.totalClassifications,
        highQuality: highConfidence.length,
        mediumQuality: Math.max(0, stats.totalClassifications - highConfidence.length - lowConfidence.length),
        lowQuality: lowConfidence.length,
        needsReview: lowConfidence.slice(0, 20), // Top 20 that need review
        averageConfidence: stats.averageConfidence
      }
    } catch (error) {
      logger.error('Error generating quality report:', error)
      return {
        totalClassifications: 0,
        highQuality: 0,
        mediumQuality: 0,
        lowQuality: 0,
        needsReview: [],
        averageConfidence: 0
      }
    }
  }

  // ============================================================================
  // Maintenance Methods
  // ============================================================================

  /**
   * Update outdated classifications
   */
  async updateOutdatedClassifications(daysOld: number = 30): Promise<{
    updated: number
    failed: number
  }> {
    try {
      const outdated = await this.sectorClassificationModel.getOutdatedClassifications(daysOld)
      let updated = 0
      let failed = 0

      logger.info(`Updating ${outdated.length} outdated classifications`)

      for (const classification of outdated) {
        try {
          const result = await this.classifyInstrument(classification.instrumentId)
          if (result) {
            updated++
          } else {
            failed++
          }
        } catch (error) {
          logger.error(`Failed to update classification for instrument ${classification.instrumentId}:`, error)
          failed++
        }
      }

      logger.info(`Updated ${updated} classifications, ${failed} failed`)
      return { updated, failed }
    } catch (error) {
      logger.error('Error updating outdated classifications:', error)
      return { updated: 0, failed: 0 }
    }
  }

  /**
   * Cleanup low-confidence automatic classifications
   */
  async cleanupLowConfidence(minConfidence: number = 40): Promise<number> {
    try {
      const deleted = await this.sectorClassificationModel.cleanupOutdated(minConfidence)
      logger.info(`Cleaned up ${deleted} low-confidence classifications`)
      return deleted
    } catch (error) {
      logger.error('Error cleaning up low-confidence classifications:', error)
      return 0
    }
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<boolean> {
    return await this.sectorClassificationModel.healthCheck()
  }
}

export default GICSClassificationService