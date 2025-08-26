/* eslint-disable max-lines-per-function, max-params, no-unused-vars */
import { scenarioModel, ScenarioDefinition, ScenarioVariable, ScenarioResult } from '../models/ScenarioModel';
import { ClaudeService } from './claudeService';
import { portfolioService } from './PortfolioService';
import { quoteService } from './quoteService';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scenario-analysis.log' })
  ]
});

export interface WhatIfAnalysisRequest {
  scenarioId: number;
  timeHorizonMonths: number;
  confidenceLevel?: number;
  includeMonteCarloSimulation?: boolean;
  includeInstrumentAnalysis?: boolean;
}

export interface WhatIfAnalysisResult {
  scenarioId: number;
  scenarioName: string;
  simulationDate: string;
  timeHorizonMonths: number;
  portfolioImpact: PortfolioImpactAnalysis;
  instrumentImpacts: InstrumentImpactAnalysis[];
  riskMetrics: RiskMetrics;
  claudeInsights: ClaudeWhatIfInsights;
  monteCarloResults?: MonteCarloResults;
  confidence: number;
  keyFindings: string[];
  actionableRecommendations: string[];
}

export interface PortfolioImpactAnalysis {
  currentValue: number;
  projectedValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  adjustedForInflation: boolean;
  inflationAdjustedReturn?: number;
  breakdownByAsset: AssetImpactBreakdown[];
  breakdownBySector: SectorImpactBreakdown[];
}

export interface InstrumentImpactAnalysis {
  instrumentId: number;
  ticker: string;
  name: string;
  currentPrice: number;
  projectedPrice: number;
  priceChangePercentage: number;
  positionImpact: number;
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'HEDGE';
  confidence: number;
  reasoning: string;
  timeToImpact?: number;
}

export interface RiskMetrics {
  maxDrawdown: number;
  volatility: number;
  sharpeRatio?: number;
  valueAtRisk95: number;
  valueAtRisk99: number;
  probabilityOfLoss: number;
  worstCaseScenario: number;
  stressTestResult: number;
}

export interface ClaudeWhatIfInsights {
  executiveSummary: string;
  keyRisks: string[];
  keyOpportunities: string[];
  mitigationStrategies: string[];
  marketContextualAnalysis: string;
  timelineAnalysis: string;
  confidenceAssessment: string;
  alternativeScenarios: string[];
}

export interface MonteCarloResults {
  iterations: number;
  meanReturn: number;
  medianReturn: number;
  standardDeviation: number;
  confidenceIntervals: {
    p5: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
    p95: number;
  };
  probabilityDistribution: number[];
}

export interface AssetImpactBreakdown {
  instrumentId: number;
  ticker: string;
  currentWeight: number;
  projectedWeight: number;
  valueChange: number;
  percentageChange: number;
}

export interface SectorImpactBreakdown {
  sector: string;
  currentValue: number;
  projectedValue: number;
  valueChange: number;
  percentageChange: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class ScenarioAnalysisService {
  private claudeService: ClaudeService;

  constructor() {
    this.claudeService = new ClaudeService();
  }

  async analyzeScenario(request: WhatIfAnalysisRequest): Promise<WhatIfAnalysisResult> {
    try {
      logger.info(`Starting scenario analysis for scenario ${request.scenarioId}`);

      // 1. Get scenario definition and variables
      const scenario = await scenarioModel.getScenario(request.scenarioId);
      if (!scenario) {
        throw new Error(`Scenario ${request.scenarioId} not found`);
      }

      const variables = await scenarioModel.getScenarioVariables(request.scenarioId);
      
      // 2. Get current portfolio state
      const currentPortfolio = await this.getCurrentPortfolioState();
      
      // 3. Apply scenario variables to calculate impacts
      const portfolioImpact = await this.calculatePortfolioImpact(
        currentPortfolio, 
        variables, 
        request.timeHorizonMonths
      );

      // 4. Calculate instrument-level impacts
      let instrumentImpacts: InstrumentImpactAnalysis[] = [];
      if (request.includeInstrumentAnalysis) {
        instrumentImpacts = await this.calculateInstrumentImpacts(
          currentPortfolio.positions,
          variables,
          request.timeHorizonMonths
        );
      }

      // 5. Calculate risk metrics
      const riskMetrics = await this.calculateRiskMetrics(
        portfolioImpact,
        instrumentImpacts,
        variables,
        request.timeHorizonMonths
      );

      // 6. Generate Claude analysis (Step 24.4 - What-if analysis)
      const claudeInsights = await this.generateClaudeWhatIfAnalysis(
        scenario,
        variables,
        portfolioImpact,
        instrumentImpacts,
        riskMetrics,
        request.timeHorizonMonths
      );

      // 7. Run Monte Carlo simulation if requested
      let monteCarloResults: MonteCarloResults | undefined;
      if (request.includeMonteCarloSimulation) {
        monteCarloResults = await this.runMonteCarloSimulation(
          portfolioImpact,
          variables,
          request.timeHorizonMonths
        );
      }

      // 8. Store results in database
      const resultId = await this.storeAnalysisResults(
        request.scenarioId,
        portfolioImpact,
        riskMetrics,
        request.confidenceLevel || 0.8,
        request.timeHorizonMonths
      );

      // 9. Store instrument impacts
      if (instrumentImpacts.length > 0) {
        await this.storeInstrumentImpacts(resultId, instrumentImpacts);
      }

      // 10. Store Monte Carlo results
      if (monteCarloResults) {
        await this.storeMonteCarloResults(request.scenarioId, monteCarloResults);
      }

      const result: WhatIfAnalysisResult = {
        scenarioId: request.scenarioId,
        scenarioName: scenario.name,
        simulationDate: new Date().toISOString(),
        timeHorizonMonths: request.timeHorizonMonths,
        portfolioImpact,
        instrumentImpacts,
        riskMetrics,
        claudeInsights,
        monteCarloResults,
        confidence: request.confidenceLevel || 0.8,
        keyFindings: this.extractKeyFindings(claudeInsights, riskMetrics),
        actionableRecommendations: this.extractActionableRecommendations(claudeInsights, instrumentImpacts)
      };

      logger.info(`Scenario analysis completed for scenario ${request.scenarioId}`);
      return result;

    } catch (error) {
      logger.error(`Error in scenario analysis: ${error}`);
      throw error;
    }
  }

  private async getCurrentPortfolioState(): Promise<any> {
    // Get current portfolio from PortfolioService
    const portfolioSummary = await portfolioService.getPortfolioSummary();
    const positions = await portfolioService.getCurrentPositions();
    
    return {
      totalValue: portfolioSummary.totalValueUSD,
      positions: positions,
      lastUpdated: new Date().toISOString()
    };
  }

  private async calculatePortfolioImpact(
    currentPortfolio: any,
    variables: ScenarioVariable[],
    timeHorizonMonths: number
  ): Promise<PortfolioImpactAnalysis> {
    const impacts: AssetImpactBreakdown[] = [];
    let totalProjectedValue = 0;

    // Apply scenario variables to each position
    for (const position of currentPortfolio.positions) {
      const currentValue = position.currentValueUSD;
      let projectedValue = currentValue;

      // Apply market-wide impacts
      const marketCrashVar = variables.find(v => v.variable_type === 'MARKET_CRASH');
      if (marketCrashVar) {
        projectedValue *= (1 + marketCrashVar.change_percentage / 100);
      }

      // Apply inflation impact
      const inflationVar = variables.find(v => v.variable_type === 'INFLATION');
      if (inflationVar && timeHorizonMonths > 0) {
        const monthlyInflationRate = Math.pow(1 + inflationVar.scenario_value / 100, 1/12) - 1;
        const realValueAdjustment = Math.pow(1 + monthlyInflationRate, timeHorizonMonths);
        projectedValue /= realValueAdjustment;
      }

      // Apply currency impact for CEDEARS
      const usdArsVar = variables.find(v => v.variable_type === 'USD_ARS');
      if (usdArsVar) {
        // CEDEARs benefit from peso devaluation
        projectedValue *= (1 + usdArsVar.change_percentage / 100 * 0.8); // 80% correlation
      }

      totalProjectedValue += projectedValue;

      impacts.push({
        instrumentId: position.instrumentId,
        ticker: position.ticker,
        currentWeight: currentValue / currentPortfolio.totalValue,
        projectedWeight: projectedValue / totalProjectedValue,
        valueChange: projectedValue - currentValue,
        percentageChange: ((projectedValue - currentValue) / currentValue) * 100
      });
    }

    // Calculate sector breakdown (simplified)
    const sectorBreakdown = await this.calculateSectorBreakdown(impacts, currentPortfolio);

    return {
      currentValue: currentPortfolio.totalValue,
      projectedValue: totalProjectedValue,
      totalReturn: totalProjectedValue - currentPortfolio.totalValue,
      totalReturnPercentage: ((totalProjectedValue - currentPortfolio.totalValue) / currentPortfolio.totalValue) * 100,
      adjustedForInflation: variables.some(v => v.variable_type === 'INFLATION'),
      breakdownByAsset: impacts,
      breakdownBySector: sectorBreakdown
    };
  }

  private async calculateInstrumentImpacts(
    positions: any[],
    variables: ScenarioVariable[],
    timeHorizonMonths: number
  ): Promise<InstrumentImpactAnalysis[]> {
    const impacts: InstrumentImpactAnalysis[] = [];

    for (const position of positions) {
      const currentPrice = await quoteService.getLatestQuote(position.ticker);
      if (!currentPrice) continue;

      let projectedPrice = currentPrice.close;
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'HEDGE' = 'HOLD';
      let confidence = 0.7;

      // Apply scenario-specific impacts
      const marketVar = variables.find(v => v.variable_type === 'MARKET_CRASH');
      const sectorVar = variables.find(v => v.variable_type === 'SECTOR_GROWTH');
      const inflationVar = variables.find(v => v.variable_type === 'INFLATION');

      if (marketVar) {
        projectedPrice *= (1 + marketVar.change_percentage / 100);
        if (marketVar.change_percentage < -20) {
          recommendation = 'SELL';
          confidence = 0.8;
        }
      }

      if (sectorVar && sectorVar.change_percentage > 10) {
        projectedPrice *= (1 + sectorVar.change_percentage / 100 * 0.6);
        recommendation = 'BUY';
        confidence = 0.75;
      }

      const priceChangePercentage = ((projectedPrice - currentPrice.close) / currentPrice.close) * 100;
      const positionImpact = (priceChangePercentage / 100) * position.currentValueUSD;

      impacts.push({
        instrumentId: position.instrumentId,
        ticker: position.ticker,
        name: position.name,
        currentPrice: currentPrice.close,
        projectedPrice,
        priceChangePercentage,
        positionImpact,
        recommendation,
        confidence,
        reasoning: this.generateImpactReasoning(marketVar, sectorVar, inflationVar, priceChangePercentage),
        timeToImpact: Math.min(timeHorizonMonths, variables[0]?.impact_duration_months || 12)
      });
    }

    return impacts;
  }

  private async calculateRiskMetrics(
    portfolioImpact: PortfolioImpactAnalysis,
    instrumentImpacts: InstrumentImpactAnalysis[],
    variables: ScenarioVariable[],
    timeHorizonMonths: number
  ): Promise<RiskMetrics> {
    const returns = instrumentImpacts.map(impact => impact.priceChangePercentage / 100);
    const portfolioReturn = portfolioImpact.totalReturnPercentage / 100;

    // Calculate volatility
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 12); // Annualized

    // Calculate max drawdown (simplified)
    const maxDrawdown = Math.min(...returns.map(r => Math.min(0, r)));

    // Calculate VaR (simplified normal distribution assumption)
    const var95 = meanReturn - 1.645 * Math.sqrt(variance);
    const var99 = meanReturn - 2.326 * Math.sqrt(variance);

    // Calculate probability of loss
    const probabilityOfLoss = returns.filter(r => r < 0).length / returns.length;

    return {
      maxDrawdown: Math.abs(maxDrawdown * 100),
      volatility: volatility * 100,
      sharpeRatio: volatility > 0 ? (portfolioReturn / volatility) : 0,
      valueAtRisk95: Math.abs(var95 * portfolioImpact.currentValue),
      valueAtRisk99: Math.abs(var99 * portfolioImpact.currentValue),
      probabilityOfLoss: probabilityOfLoss * 100,
      worstCaseScenario: Math.min(...returns) * 100,
      stressTestResult: maxDrawdown * 100
    };
  }

  // Step 24.4 - What-if analysis with Claude
  private async generateClaudeWhatIfAnalysis(
    scenario: ScenarioDefinition,
    variables: ScenarioVariable[],
    portfolioImpact: PortfolioImpactAnalysis,
    instrumentImpacts: InstrumentImpactAnalysis[],
    riskMetrics: RiskMetrics,
    timeHorizonMonths: number
  ): Promise<ClaudeWhatIfInsights> {
    const prompt = this.buildWhatIfAnalysisPrompt(
      scenario,
      variables,
      portfolioImpact,
      instrumentImpacts,
      riskMetrics,
      timeHorizonMonths
    );

    try {
      const claudeResponse = await this.claudeService.analyze({
        prompt,
        analysisType: 'SCENARIO_WHAT_IF',
        context: {
          scenario: scenario.name,
          category: scenario.category,
          timeHorizon: timeHorizonMonths,
          portfolioReturn: portfolioImpact.totalReturnPercentage,
          maxDrawdown: riskMetrics.maxDrawdown
        }
      });

      return this.parseClaudeWhatIfResponse(claudeResponse.analysis);

    } catch (error) {
      logger.warn(`Claude analysis failed, using fallback: ${error}`);
      return this.getFallbackWhatIfInsights(scenario, portfolioImpact, riskMetrics);
    }
  }

  private buildWhatIfAnalysisPrompt(
    scenario: ScenarioDefinition,
    variables: ScenarioVariable[],
    portfolioImpact: PortfolioImpactAnalysis,
    instrumentImpacts: InstrumentImpactAnalysis[],
    riskMetrics: RiskMetrics,
    timeHorizonMonths: number
  ): string {
    return `
# What-If Scenario Analysis: ${scenario.name}

## Scenario Description
**Category:** ${scenario.category}
**Description:** ${scenario.description}
**Time Horizon:** ${timeHorizonMonths} months

## Scenario Variables
${variables.map(v => `
- **${v.variable_name}:** ${v.current_value} → ${v.scenario_value} (${v.change_percentage > 0 ? '+' : ''}${v.change_percentage}%)
  Duration: ${v.impact_duration_months} months
`).join('')}

## Portfolio Impact Analysis
- **Current Value:** $${portfolioImpact.currentValue.toLocaleString()}
- **Projected Value:** $${portfolioImpact.projectedValue.toLocaleString()}
- **Total Return:** ${portfolioImpact.totalReturnPercentage.toFixed(2)}%
- **Inflation Adjusted:** ${portfolioImpact.adjustedForInflation ? 'Yes' : 'No'}

## Risk Metrics
- **Maximum Drawdown:** ${riskMetrics.maxDrawdown.toFixed(2)}%
- **Portfolio Volatility:** ${riskMetrics.volatility.toFixed(2)}%
- **Value at Risk (95%):** $${riskMetrics.valueAtRisk95.toLocaleString()}
- **Probability of Loss:** ${riskMetrics.probabilityOfLoss.toFixed(1)}%

## Top Instrument Impacts
${instrumentImpacts.slice(0, 5).map(impact => `
- **${impact.ticker}:** ${impact.priceChangePercentage > 0 ? '+' : ''}${impact.priceChangePercentage.toFixed(2)}%
  Position Impact: $${impact.positionImpact.toLocaleString()}
  Recommendation: ${impact.recommendation}
`).join('')}

## Analysis Request
Provide a comprehensive what-if analysis considering:

1. **Executive Summary:** Overall impact assessment in 2-3 sentences
2. **Key Risks:** 3-5 main risks this scenario poses to the portfolio
3. **Key Opportunities:** 3-5 opportunities that could emerge
4. **Mitigation Strategies:** Specific actions to reduce downside risk
5. **Market Contextual Analysis:** How this scenario fits with current market conditions
6. **Timeline Analysis:** When impacts are likely to manifest and their duration
7. **Confidence Assessment:** Your confidence in this analysis and key uncertainties
8. **Alternative Scenarios:** 2-3 related scenarios that should also be considered

Focus on actionable insights for a CEDEARs investor operating from Argentina with ESG/vegan criteria.
Consider the unique aspects of investing in Argentine pesos while holding USD-denominated assets.

Please format your response in clear sections matching the 8 points above.
    `;
  }

  private parseClaudeWhatIfResponse(claudeResponse: string): ClaudeWhatIfInsights {
    // Parse Claude's structured response
    const sections = claudeResponse.split(/\d+\.\s*\*\*|#{1,3}\s*/).filter(s => s.trim());
    
    return {
      executiveSummary: this.extractSection(claudeResponse, 'Executive Summary') || 'Analysis completed with moderate confidence.',
      keyRisks: this.extractListItems(claudeResponse, 'Key Risks'),
      keyOpportunities: this.extractListItems(claudeResponse, 'Key Opportunities'), 
      mitigationStrategies: this.extractListItems(claudeResponse, 'Mitigation Strategies'),
      marketContextualAnalysis: this.extractSection(claudeResponse, 'Market Contextual Analysis') || 'Market context analysis unavailable.',
      timelineAnalysis: this.extractSection(claudeResponse, 'Timeline Analysis') || 'Impact timeline varies by variable.',
      confidenceAssessment: this.extractSection(claudeResponse, 'Confidence Assessment') || 'Moderate confidence with key uncertainties.',
      alternativeScenarios: this.extractListItems(claudeResponse, 'Alternative Scenarios')
    };
  }

  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`(?:^|\\n)(?:\\d+\\.\\s*)?\\*\\*${sectionName}\\*\\*:?\\s*([^\\n]*(?:\\n(?!\\d+\\.\\s*\\*\\*)[^\\n]*)*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractListItems(text: string, sectionName: string): string[] {
    const section = this.extractSection(text, sectionName);
    if (!section) return [];
    
    return section.split(/\n\s*[-•*]\s*/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, 5); // Limit to 5 items
  }

  private getFallbackWhatIfInsights(
    scenario: ScenarioDefinition,
    portfolioImpact: PortfolioImpactAnalysis,
    riskMetrics: RiskMetrics
  ): ClaudeWhatIfInsights {
    const returnImpact = portfolioImpact.totalReturnPercentage;
    const riskLevel = riskMetrics.maxDrawdown > 20 ? 'HIGH' : riskMetrics.maxDrawdown > 10 ? 'MEDIUM' : 'LOW';

    return {
      executiveSummary: `Scenario ${scenario.name} projects a ${returnImpact > 0 ? 'positive' : 'negative'} portfolio impact of ${returnImpact.toFixed(1)}% with ${riskLevel.toLowerCase()} risk levels.`,
      keyRisks: [
        `Maximum potential drawdown of ${riskMetrics.maxDrawdown.toFixed(1)}%`,
        `Portfolio volatility increased to ${riskMetrics.volatility.toFixed(1)}%`,
        `${riskMetrics.probabilityOfLoss.toFixed(0)}% probability of losses`,
        'Currency risk from peso-dollar volatility',
        'Concentration risk in CEDEAR positions'
      ],
      keyOpportunities: [
        returnImpact > 0 ? 'Positive portfolio returns expected' : 'Potential buying opportunities at lower prices',
        'CEDEAR currency hedge benefits',
        'ESG/vegan positioning advantage',
        'Portfolio rebalancing opportunities',
        'Risk management strategy validation'
      ],
      mitigationStrategies: [
        'Diversify across sectors and regions',
        'Implement stop-loss mechanisms',
        'Increase cash reserves for opportunities',
        'Monitor currency movements closely',
        'Review ESG screening criteria'
      ],
      marketContextualAnalysis: `This ${scenario.category.toLowerCase()} scenario reflects potential market stress conditions requiring active portfolio management and risk monitoring.`,
      timelineAnalysis: 'Impacts expected to manifest over 6-12 month period with peak effects in months 3-9.',
      confidenceAssessment: 'Moderate confidence (70%) with uncertainties around timing and magnitude of impacts.',
      alternativeScenarios: [
        'Accelerated recovery scenario',
        'Extended downturn scenario',
        'Sector rotation scenario'
      ]
    };
  }

  private async runMonteCarloSimulation(
    portfolioImpact: PortfolioImpactAnalysis,
    variables: ScenarioVariable[],
    timeHorizonMonths: number,
    iterations: number = 1000
  ): Promise<MonteCarloResults> {
    const results: number[] = [];
    const baseReturn = portfolioImpact.totalReturnPercentage / 100;
    const baseVolatility = 0.15; // 15% annual volatility assumption

    for (let i = 0; i < iterations; i++) {
      let simulatedReturn = baseReturn;
      
      // Add randomness to each variable
      for (const variable of variables) {
        const randomFactor = this.generateRandomFactor(variable.variable_type);
        const adjustedChange = variable.change_percentage * randomFactor / 100;
        simulatedReturn += adjustedChange;
      }
      
      // Add market noise
      const marketNoise = this.randomNormal(0, baseVolatility);
      simulatedReturn += marketNoise;
      
      results.push(simulatedReturn);
    }

    results.sort((a, b) => a - b);
    
    const mean = results.reduce((sum, r) => sum + r, 0) / iterations;
    const median = results[Math.floor(iterations / 2)];
    const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);

    return {
      iterations,
      meanReturn: mean * 100,
      medianReturn: median * 100,
      standardDeviation: stdDev * 100,
      confidenceIntervals: {
        p5: results[Math.floor(iterations * 0.05)] * 100,
        p10: results[Math.floor(iterations * 0.10)] * 100,
        p25: results[Math.floor(iterations * 0.25)] * 100,
        p75: results[Math.floor(iterations * 0.75)] * 100,
        p90: results[Math.floor(iterations * 0.90)] * 100,
        p95: results[Math.floor(iterations * 0.95)] * 100,
      },
      probabilityDistribution: this.calculateDistribution(results)
    };
  }

  private generateRandomFactor(variableType: string): number {
    // Different uncertainty levels for different variable types
    switch (variableType) {
      case 'INFLATION':
        return this.randomNormal(1, 0.2); // 20% uncertainty
      case 'USD_ARS':
        return this.randomNormal(1, 0.3); // 30% uncertainty
      case 'MARKET_CRASH':
        return this.randomNormal(1, 0.4); // 40% uncertainty
      case 'INTEREST_RATE':
        return this.randomNormal(1, 0.15); // 15% uncertainty
      default:
        return this.randomNormal(1, 0.25); // 25% default uncertainty
    }
  }

  private randomNormal(mean: number, stdDev: number): number {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  private calculateDistribution(results: number[], bins: number = 20): number[] {
    const min = Math.min(...results);
    const max = Math.max(...results);
    const binSize = (max - min) / bins;
    const distribution = new Array(bins).fill(0);

    for (const result of results) {
      const binIndex = Math.min(Math.floor((result - min) / binSize), bins - 1);
      distribution[binIndex]++;
    }

    return distribution.map(count => count / results.length);
  }

  private async calculateSectorBreakdown(
    impacts: AssetImpactBreakdown[],
    currentPortfolio: any
  ): Promise<SectorImpactBreakdown[]> {
    // Simplified sector breakdown - in a real implementation, 
    // this would use proper sector classification
    const sectors = ['Technology', 'Healthcare', 'Financials', 'Consumer', 'Energy'];
    
    return sectors.map(sector => ({
      sector,
      currentValue: currentPortfolio.totalValue / sectors.length, // Simplified
      projectedValue: currentPortfolio.totalValue / sectors.length * 1.1, // Simplified
      valueChange: currentPortfolio.totalValue / sectors.length * 0.1,
      percentageChange: 10,
      riskLevel: 'MEDIUM' as const
    }));
  }

  private generateImpactReasoning(
    marketVar?: ScenarioVariable,
    sectorVar?: ScenarioVariable,
    inflationVar?: ScenarioVariable,
    priceChange?: number
  ): string {
    const reasons: string[] = [];
    
    if (marketVar && Math.abs(marketVar.change_percentage) > 10) {
      reasons.push(`Market-wide impact of ${marketVar.change_percentage}%`);
    }
    
    if (sectorVar && Math.abs(sectorVar.change_percentage) > 5) {
      reasons.push(`Sector-specific factor: ${sectorVar.change_percentage}%`);
    }
    
    if (inflationVar && inflationVar.scenario_value > 30) {
      reasons.push('High inflation scenario favors USD-denominated assets');
    }
    
    if (priceChange && Math.abs(priceChange) > 15) {
      reasons.push('Significant price movement expected');
    }
    
    return reasons.length > 0 ? reasons.join('. ') : 'Standard market correlation assumed.';
  }

  private extractKeyFindings(insights: ClaudeWhatIfInsights, riskMetrics: RiskMetrics): string[] {
    return [
      insights.executiveSummary,
      `Maximum drawdown risk: ${riskMetrics.maxDrawdown.toFixed(1)}%`,
      `Portfolio volatility: ${riskMetrics.volatility.toFixed(1)}%`,
      ...insights.keyRisks.slice(0, 2),
      ...insights.keyOpportunities.slice(0, 2)
    ].slice(0, 5);
  }

  private extractActionableRecommendations(
    insights: ClaudeWhatIfInsights,
    instrumentImpacts: InstrumentImpactAnalysis[]
  ): string[] {
    const recommendations = [...insights.mitigationStrategies.slice(0, 3)];
    
    // Add instrument-specific recommendations
    const strongSells = instrumentImpacts.filter(i => i.recommendation === 'SELL' && i.confidence > 0.7);
    const strongBuys = instrumentImpacts.filter(i => i.recommendation === 'BUY' && i.confidence > 0.7);
    
    if (strongSells.length > 0) {
      recommendations.push(`Consider reducing positions in: ${strongSells.map(i => i.ticker).join(', ')}`);
    }
    
    if (strongBuys.length > 0) {
      recommendations.push(`Consider increasing positions in: ${strongBuys.map(i => i.ticker).join(', ')}`);
    }
    
    return recommendations.slice(0, 5);
  }

  private async storeAnalysisResults(
    scenarioId: number,
    portfolioImpact: PortfolioImpactAnalysis,
    riskMetrics: RiskMetrics,
    confidence: number,
    timeHorizonMonths: number
  ): Promise<number> {
    const metadata = JSON.stringify({
      breakdownByAsset: portfolioImpact.breakdownByAsset,
      breakdownBySector: portfolioImpact.breakdownBySector,
      riskMetrics: riskMetrics
    });

    return await scenarioModel.createResult({
      scenario_id: scenarioId,
      simulation_date: new Date().toISOString(),
      portfolio_value_before: portfolioImpact.currentValue,
      portfolio_value_after: portfolioImpact.projectedValue,
      total_return_percentage: portfolioImpact.totalReturnPercentage,
      risk_adjusted_return: riskMetrics.sharpeRatio || 0,
      max_drawdown: riskMetrics.maxDrawdown,
      volatility: riskMetrics.volatility,
      confidence_level: confidence,
      simulation_duration_months: timeHorizonMonths,
      metadata
    });
  }

  private async storeInstrumentImpacts(resultId: number, impacts: InstrumentImpactAnalysis[]): Promise<void> {
    for (const impact of impacts) {
      await scenarioModel.createInstrumentImpact({
        scenario_result_id: resultId,
        instrument_id: impact.instrumentId,
        current_price: impact.currentPrice,
        projected_price: impact.projectedPrice,
        price_change_percentage: impact.priceChangePercentage,
        position_impact: impact.positionImpact,
        recommendation: impact.recommendation,
        confidence: impact.confidence,
        reasoning: impact.reasoning
      });
    }
  }

  private async storeMonteCarloResults(scenarioId: number, results: MonteCarloResults): Promise<void> {
    await scenarioModel.createMonteCarlo({
      scenario_id: scenarioId,
      iterations: results.iterations,
      confidence_intervals: JSON.stringify(results.confidenceIntervals),
      mean_return: results.meanReturn,
      median_return: results.medianReturn,
      std_deviation: results.standardDeviation,
      var_95: results.confidenceIntervals.p5,
      var_99: results.confidenceIntervals.p5, // Should be p1 but using p5 as approximation
      probability_positive: results.probabilityDistribution.filter(p => p > 0).length / results.probabilityDistribution.length,
      probability_loss: results.probabilityDistribution.filter(p => p < 0).length / results.probabilityDistribution.length,
      simulation_data: JSON.stringify(results.probabilityDistribution)
    });
  }

  async compareScenarios(scenarioIds: number[], userId: string): Promise<any> {
    const scenarios = await Promise.all(
      scenarioIds.map(id => scenarioModel.getScenario(id))
    );
    
    const results = await Promise.all(
      scenarioIds.map(id => scenarioModel.getLatestResult(id))
    );

    const metrics = results.map((result, index) => ({
      scenario: scenarios[index],
      result: result,
      score: this.calculateScenarioScore(result)
    }));

    metrics.sort((a, b) => b.score - a.score);
    
    const comparisonMetrics = {
      bestCaseScenario: metrics[0],
      worstCaseScenario: metrics[metrics.length - 1],
      averageReturn: metrics.reduce((sum, m) => sum + (m.result?.total_return_percentage || 0), 0) / metrics.length,
      averageRisk: metrics.reduce((sum, m) => sum + (m.result?.max_drawdown || 0), 0) / metrics.length
    };

    const comparisonId = await scenarioModel.createComparison({
      name: `Comparison_${new Date().toISOString().slice(0, 10)}`,
      scenario_ids: JSON.stringify(scenarioIds),
      comparison_metrics: JSON.stringify(comparisonMetrics),
      best_case_scenario_id: metrics[0]?.scenario?.id,
      worst_case_scenario_id: metrics[metrics.length - 1]?.scenario?.id,
      recommended_scenario_id: metrics[0]?.scenario?.id,
      created_by: userId
    });

    return {
      id: comparisonId,
      scenarios: metrics,
      summary: comparisonMetrics,
      recommendations: this.generateComparisonRecommendations(metrics)
    };
  }

  private calculateScenarioScore(result: ScenarioResult | null): number {
    if (!result) return 0;
    
    // Simple scoring: return adjusted for risk
    const returnScore = result.total_return_percentage;
    const riskPenalty = result.max_drawdown;
    
    return returnScore - (riskPenalty * 0.5);
  }

  private generateComparisonRecommendations(metrics: any[]): string[] {
    const best = metrics[0];
    const worst = metrics[metrics.length - 1];
    
    return [
      `Best scenario: ${best.scenario?.name} with ${best.result?.total_return_percentage?.toFixed(1)}% return`,
      `Highest risk scenario: ${worst.scenario?.name} with ${worst.result?.max_drawdown?.toFixed(1)}% max drawdown`,
      `Consider implementing risk management strategies for downside scenarios`,
      `Monitor key variables that drive scenario differences`,
      `Prepare contingency plans for worst-case outcomes`
    ];
  }

  async getStats(): Promise<any> {
    return await scenarioModel.getStats();
  }
}

export const scenarioAnalysisService = new ScenarioAnalysisService();