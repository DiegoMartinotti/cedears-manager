import axios from 'axios'
import * as cheerio from 'cheerio'
import VeganEvaluationModel, { VeganEvaluation, VeganCriteria } from '../models/VeganEvaluation.js'
import { Instrument as InstrumentModel } from '../models/Instrument.js'
import { createLogger } from '../utils/logger.js'

const logger = createLogger('VeganAnalysisService')

export interface VeganDataSource {
  name: string
  type: 'DATABASE' | 'SCRAPING' | 'API' | 'MANUAL'
  url?: string
  reliability: number
}

export interface VeganAnalysisResult {
  instrumentId: number
  symbol: string
  noAnimalTesting: boolean
  noAnimalProducts: boolean
  plantBasedFocus: boolean
  supplyChainVegan: boolean
  veganScore: number
  certificationStatus?: string
  certifications: string[]
  animalTestingPolicy?: string
  supplyChainAnalysis?: string
  analysisDate: string
  dataSources: string[]
  confidenceLevel: number
  nextReviewDate: string
}

export interface VeganViolation {
  type: 'ANIMAL_TESTING' | 'ANIMAL_PRODUCTS' | 'SUPPLY_CHAIN' | 'CERTIFICATION'
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  source: string
  impact: number
}

export class VeganAnalysisService {
  private veganModel = new VeganEvaluationModel()
  private instrumentModel = new InstrumentModel()

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private readonly DATA_SOURCES: VeganDataSource[] = [
    { name: 'Vegan Society Database', type: 'DATABASE', url: 'https://www.vegansociety.com/', reliability: 95 },
    { name: 'PETA Database', type: 'SCRAPING', url: 'https://www.peta.org/', reliability: 85 },
    { name: 'Cruelty Free Database', type: 'DATABASE', url: 'https://crueltyfreekitty.com/', reliability: 90 },
    { name: 'Leaping Bunny', type: 'DATABASE', url: 'https://www.leapingbunny.org/', reliability: 98 },
    { name: 'Company Reports', type: 'MANUAL', reliability: 92 },
    { name: 'News Analysis', type: 'API', reliability: 75 }
  ]

  /**
   * Perform comprehensive Vegan analysis for an instrument
   */
  async analyzeInstrument(instrumentId: number): Promise<VeganAnalysisResult> {
    logger.info(`Starting Vegan analysis for instrument ${instrumentId}`)

    try {
      const instrument = await this.instrumentModel.findById(instrumentId)
      if (!instrument) {
        throw new Error(`Instrument ${instrumentId} not found`)
      }

      const [
        veganSocietyData,
        petaData,
        crueltyFreeData,
        leapingBunnyData,
        newsData,
        violations
      ] = await Promise.allSettled([
        this.getVeganSocietyData(instrument.symbol, instrument.company_name),
        this.getPETAData(instrument.symbol, instrument.company_name),
        this.getCrueltyFreeData(instrument.symbol, instrument.company_name),
        this.getLeapingBunnyData(instrument.symbol, instrument.company_name),
        this.getVeganNewsAnalysis(instrument.symbol, instrument.company_name),
        this.detectVeganViolations(instrument.symbol, instrument.company_name)
      ])

      const analysisResult = await this.combineVeganData({
        instrumentId,
        symbol: instrument.symbol,
        companyName: instrument.company_name,
        veganSocietyData: veganSocietyData.status === 'fulfilled' ? veganSocietyData.value : null,
        petaData: petaData.status === 'fulfilled' ? petaData.value : null,
        crueltyFreeData: crueltyFreeData.status === 'fulfilled' ? crueltyFreeData.value : null,
        leapingBunnyData: leapingBunnyData.status === 'fulfilled' ? leapingBunnyData.value : null,
        newsData: newsData.status === 'fulfilled' ? newsData.value : null,
        violations: violations.status === 'fulfilled' ? violations.value : []
      })

      await this.saveVeganEvaluation(analysisResult)

      logger.info(`Vegan analysis completed for ${instrument.symbol}`)
      return analysisResult

    } catch (error) {
      logger.error(`Error analyzing Vegan criteria for instrument ${instrumentId}:`, error)
      throw error
    }
  }

  /**
   * Check Vegan Society database
   */
  private async getVeganSocietyData(symbol: string, companyName: string): Promise<any> {
    try {
      await this.delay(3000)

      // Search for company in Vegan Society database
      const searchUrl = `https://www.vegansociety.com/trademark/search`
      
      const response = await axios.get(searchUrl, {
        params: {
          company: companyName,
          product: ''
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const $ = cheerio.load(response.data)
      
      const isRegistered = $('.trademark-result').length > 0
      const certifiedProducts = $('.product-name').toArray().map(el => $(el).text().trim())

      return {
        isVeganCertified: isRegistered,
        certifiedProducts,
        certificationLevel: isRegistered ? 'VEGAN_SOCIETY' : null,
        source: 'Vegan Society',
        confidence: 95
      }

    } catch (error) {
      logger.warn(`Failed to get Vegan Society data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Check PETA database for animal testing information
   */
  private async getPETAData(symbol: string, companyName: string): Promise<any> {
    try {
      await this.delay(3000)

      // Check PETA's cruelty-free database
      const searchUrl = `https://www.peta.org/living/personal-care-fashion/companies-do-dont-test-animals/`
      
      const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const $ = cheerio.load(response.data)
      
      // Look for company in cruelty-free list
      const crueltyFreeText = $('.content').text().toLowerCase()
      const companyInCrueltyFree = crueltyFreeText.includes(companyName.toLowerCase())
      
      // Look for company in companies that test list
      const companiesThatTest = $('.companies-that-test').text().toLowerCase()
      const companyTestsAnimals = companiesThatTest.includes(companyName.toLowerCase())

      return {
        doesAnimalTesting: companyTestsAnimals,
        isCrueltyFree: companyInCrueltyFree && !companyTestsAnimals,
        petaStatus: companyInCrueltyFree ? 'APPROVED' : companyTestsAnimals ? 'NOT_APPROVED' : 'UNKNOWN',
        source: 'PETA',
        confidence: 85
      }

    } catch (error) {
      logger.warn(`Failed to get PETA data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Check Cruelty Free database
   */
  private async getCrueltyFreeData(symbol: string, companyName: string): Promise<any> {
    try {
      await this.delay(2000)

      const searchUrl = `https://crueltyfreekitty.com/search/?brand=${encodeURIComponent(companyName)}`
      
      const response = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      const $ = cheerio.load(response.data)
      
      const crueltyFreeStatus = $('.cruelty-free-status').text().trim()
      const isCrueltyFree = crueltyFreeStatus.includes('Cruelty-Free')
      const isVegan = $('.vegan-status').text().includes('Vegan')

      return {
        isCrueltyFree,
        isVegan,
        status: crueltyFreeStatus,
        source: 'Cruelty Free Kitty',
        confidence: 90
      }

    } catch (error) {
      logger.warn(`Failed to get Cruelty Free data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Check Leaping Bunny certification
   */
  private async getLeapingBunnyData(symbol: string, companyName: string): Promise<any> {
    try {
      await this.delay(2000)

      const searchUrl = `https://www.leapingbunny.org/guide/search`
      
      const response = await axios.post(searchUrl, {
        company: companyName
      }, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      const $ = cheerio.load(response.data)
      
      const isCertified = $('.company-result').length > 0
      const certificationDate = $('.cert-date').text().trim()

      return {
        isLeapingBunnyCertified: isCertified,
        certificationDate,
        certificationLevel: isCertified ? 'GOLD_STANDARD' : null,
        source: 'Leaping Bunny',
        confidence: 98
      }

    } catch (error) {
      logger.warn(`Failed to get Leaping Bunny data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Analyze vegan-related news using Claude
   */
  private async getVeganNewsAnalysis(symbol: string, companyName: string): Promise<any> {
    void symbol
    void companyName
    return null
  }

  private async detectVeganViolations(symbol: string, companyName: string): Promise<VeganViolation[]> {
    void symbol
    void companyName
    return []
  }

  /**
   * Combine data from multiple sources and calculate final scores
   */
  /* eslint-disable max-lines-per-function, complexity */
  private async combineVeganData(data: {
    instrumentId: number
    symbol: string
    companyName: string
    veganSocietyData: any
    petaData: any
    crueltyFreeData: any
    leapingBunnyData: any
    newsData: any
    violations: VeganViolation[]
  }): Promise<VeganAnalysisResult> {
    
    let noAnimalTesting = false
    let noAnimalProducts = false
    let plantBasedFocus = false
    let supplyChainVegan = false
    
    const dataSources: string[] = []
    const certifications: string[] = []
    let totalConfidence = 0
    let sourceCount = 0

    // Process certification data (highest weight)
    if (data.veganSocietyData?.isVeganCertified) {
      noAnimalTesting = true
      noAnimalProducts = true
      plantBasedFocus = true
      certifications.push('Vegan Society')
      dataSources.push('Vegan Society')
      totalConfidence += 95
      sourceCount++
    }

    if (data.leapingBunnyData?.isLeapingBunnyCertified) {
      noAnimalTesting = true
      certifications.push('Leaping Bunny')
      dataSources.push('Leaping Bunny')
      totalConfidence += 98
      sourceCount++
    }

    // Process PETA data
    if (data.petaData) {
      if (data.petaData.isCrueltyFree) {
        noAnimalTesting = true
      }
      if (data.petaData.doesAnimalTesting) {
        noAnimalTesting = false // Override if confirmed testing
      }
      dataSources.push('PETA')
      totalConfidence += 85
      sourceCount++
    }

    // Process other cruelty-free data
    if (data.crueltyFreeData) {
      if (data.crueltyFreeData.isCrueltyFree) {
        noAnimalTesting = true
      }
      if (data.crueltyFreeData.isVegan) {
        noAnimalProducts = true
      }
      dataSources.push('Cruelty Free Kitty')
      totalConfidence += 90
      sourceCount++
    }

    // Process news analysis
    if (data.newsData) {
      noAnimalTesting = noAnimalTesting || data.newsData.noAnimalTesting
      noAnimalProducts = noAnimalProducts || data.newsData.noAnimalProducts
      plantBasedFocus = plantBasedFocus || data.newsData.plantBasedFocus
      supplyChainVegan = supplyChainVegan || data.newsData.supplyChainVegan
      dataSources.push('News Analysis')
      totalConfidence += data.newsData.confidence || 75
      sourceCount++
    }

    // Apply violation penalties
    data.violations.forEach(violation => {
      switch (violation.type) {
        case 'ANIMAL_TESTING':
          if (violation.severity === 'HIGH' || violation.severity === 'CRITICAL') {
            noAnimalTesting = false
          }
          break
        case 'ANIMAL_PRODUCTS':
          if (violation.severity === 'HIGH' || violation.severity === 'CRITICAL') {
            noAnimalProducts = false
          }
          break
        case 'SUPPLY_CHAIN':
          if (violation.severity === 'MEDIUM' || violation.severity === 'HIGH' || violation.severity === 'CRITICAL') {
            supplyChainVegan = false
          }
          break
      }
    })

    // Calculate vegan score
    const veganScore = this.veganModel.calculateVeganScore({
      noAnimalTesting,
      noAnimalProducts,
      plantBasedFocus,
      supplyChainVegan
    })

    const confidenceLevel = sourceCount > 0 ? totalConfidence / sourceCount : 0

    // Determine certification status
    const certificationStatus = certifications.length > 0 ? certifications[0] : 
                               veganScore >= 80 ? 'COMPLIANT' : 
                               veganScore >= 60 ? 'PARTIAL' : 'NON_COMPLIANT'

    return {
      instrumentId: data.instrumentId,
      symbol: data.symbol,
      noAnimalTesting,
      noAnimalProducts,
      plantBasedFocus,
      supplyChainVegan,
      veganScore,
      certificationStatus,
      certifications,
      animalTestingPolicy: data.petaData?.petaStatus || 'Unknown',
      supplyChainAnalysis: `Analyzed ${dataSources.length} sources`,
      analysisDate: new Date().toISOString().split('T')[0] ?? '',
      dataSources,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100,
      nextReviewDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '' // 120 days
    }
  }

  /**
   * Save Vegan evaluation to database
   */
  private async saveVeganEvaluation(result: VeganAnalysisResult): Promise<void> {
    try {
      const evaluation: Omit<VeganEvaluation, 'id' | 'created_at' | 'updated_at'> = {
        instrument_id: result.instrumentId,
        no_animal_testing: result.noAnimalTesting,
        no_animal_products: result.noAnimalProducts,
        plant_based_focus: result.plantBasedFocus,
        supply_chain_vegan: result.supplyChainVegan,
        vegan_score: result.veganScore,
        evaluation_date: result.analysisDate,
        certification_status: result.certificationStatus,
        vegan_certifications: result.certifications.join(', '),
        animal_testing_policy: result.animalTestingPolicy,
        supply_chain_analysis: result.supplyChainAnalysis
      }

      this.veganModel.create(evaluation)
      
      // Update instrument vegan flag
      this.veganModel.updateInstrumentVeganFlags()

    } catch (error) {
      logger.error('Error saving Vegan evaluation:', error)
      throw error
    }
  }

  /**
   * Parse Claude's vegan analysis response
   */
  private parseClaudeVeganResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return null
    } catch (error) {
      logger.warn('Failed to parse Claude vegan response:', error)
      return null
    }
  }

  /**
   * Parse violations response
   */
  private parseViolationsResponse(response: string): VeganViolation[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return []
    } catch (error) {
      logger.warn('Failed to parse violations response:', error)
      return []
    }
  }

  /**
   * Get vegan analysis statistics
   */
  getStatistics() {
    return this.veganModel.getStatistics()
  }

  /**
   * Get instruments needing vegan review
   */
  getInstrumentsNeedingReview() {
    return this.veganModel.getInstrumentsNeedingReview()
  }

  /**
   * Get vegan trends for an instrument
   */
  getTrends(instrumentId: number, months: number = 12) {
    return this.veganModel.getTrends(instrumentId, months)
  }

  /**
   * Get detailed vegan criteria breakdown
   */
  getVeganCriteriaBreakdown(evaluation: VeganEvaluation): VeganCriteria {
    return this.veganModel.getVeganCriteriaBreakdown(evaluation)
  }
  /* eslint-enable max-lines-per-function, complexity */
}

export default VeganAnalysisService
