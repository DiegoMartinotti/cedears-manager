/* eslint-disable max-lines-per-function, max-params, no-unused-vars */
import { scenarioModel, ScenarioDefinition } from '../models/ScenarioModel';
import { ClaudeService } from './claudeService';
import { WhatIfAnalysisResult, InstrumentImpactAnalysis, RiskMetrics } from './ScenarioAnalysisService';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scenario-recommendations.log' })
  ]
});

// Step 24.5 - Recommendation types and interfaces
export interface ScenarioRecommendationRequest {
  scenarioId: number;
  analysisResult: WhatIfAnalysisResult;
  riskTolerance?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  timeHorizon?: number;
  priorityFocus?: 'RETURN' | 'RISK' | 'BALANCED';
}

export interface ScenarioRecommendations {
  scenarioId: number;
  scenarioName: string;
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'POOR' | 'DANGEROUS';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceLevel: number;
  
  strategicRecommendations: StrategicRecommendation[];
  tacticalActions: TacticalAction[];
  riskMitigationStrategies: RiskMitigationStrategy[];
  opportunityCapture: OpportunityStrategy[];
  portfolioAdjustments: PortfolioAdjustment[];
  
  timelineRecommendations: TimelineRecommendation[];
  contingencyPlans: ContingencyPlan[];
  monitoringKPIs: MonitoringKPI[];
  
  claudeInsights: ScenarioClaudeRecommendations;
  implementationGuide: ImplementationStep[];
}

export interface StrategicRecommendation {
  id: string;
  category: 'POSITIONING' | 'DIVERSIFICATION' | 'HEDGING' | 'LIQUIDITY';
  title: string;
  description: string;
  rationale: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  timeHorizon: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  expectedImpact: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TacticalAction {
  id: string;
  action: 'BUY' | 'SELL' | 'HOLD' | 'REDUCE' | 'INCREASE' | 'HEDGE';
  instrumentTicker: string;
  instrumentName: string;
  currentPosition?: number;
  recommendedPosition: number;
  positionChange: number;
  changePercentage: number;
  reasoning: string;
  confidence: number;
  urgency: 'IMMEDIATE' | 'THIS_WEEK' | 'THIS_MONTH' | 'NEXT_QUARTER';
  estimatedCost?: number;
  expectedReturn: number;
}

export interface RiskMitigationStrategy {
  id: string;
  riskCategory: 'MARKET' | 'CURRENCY' | 'INFLATION' | 'LIQUIDITY' | 'CONCENTRATION';
  title: string;
  description: string;
  implementation: string[];
  effectiveness: number; // 0-100%
  cost: 'LOW' | 'MEDIUM' | 'HIGH';
  timeToImplement: string;
}

export interface OpportunityStrategy {
  id: string;
  opportunityType: 'GROWTH' | 'VALUE' | 'INCOME' | 'DEFENSIVE' | 'SPECULATIVE';
  title: string;
  description: string;
  instruments: string[];
  potentialReturn: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timeframe: string;
  prerequisites: string[];
}

export interface PortfolioAdjustment {
  id: string;
  adjustmentType: 'REBALANCING' | 'SECTOR_ROTATION' | 'GEOGRAPHIC_SHIFT' | 'SIZE_ALLOCATION';
  currentAllocation: Record<string, number>;
  recommendedAllocation: Record<string, number>;
  adjustmentMagnitude: number;
  rationale: string;
  implementationSteps: string[];
  estimatedCosts: number;
  expectedBenefit: string;
}

export interface TimelineRecommendation {
  phase: 'IMMEDIATE' | 'WEEK_1' | 'MONTH_1' | 'QUARTER_1' | 'ONGOING';
  timeframe: string;
  actions: string[];
  priorities: string[];
  keyMilestones: string[];
  successMetrics: string[];
}

export interface ContingencyPlan {
  scenarioName: string;
  triggerConditions: string[];
  immediateActions: string[];
  escalationPath: string[];
  resourcesRequired: string[];
  communicationPlan: string;
}

export interface MonitoringKPI {
  kpiName: string;
  description: string;
  currentValue?: number;
  targetValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dataSource: string;
}

export interface ScenarioClaudeRecommendations {
  strategicAssessment: string;
  topPriorities: string[];
  riskWarnings: string[];
  opportunityHighlights: string[];
  implementationAdvice: string;
  marketTimingGuidance: string;
  esgConsiderations: string[];
  argentineContextFactors: string[];
}

export interface ImplementationStep {
  stepNumber: number;
  title: string;
  description: string;
  dependencies: string[];
  estimatedTime: string;
  resources: string[];
  successCriteria: string[];
  rollbackPlan?: string;
}

type SectionName =
  | 'Strategic Assessment'
  | 'Top Priorities'
  | 'Risk Warnings'
  | 'Opportunity Highlights'
  | 'Implementation Advice'
  | 'Market Timing Guidance'
  | 'ESG Considerations'
  | 'Argentine Context Factors';

export class ScenarioRecommendationService {
  private claudeService: ClaudeService;

  constructor() {
    this.claudeService = new ClaudeService();
  }

  // Step 24.5 - Main recommendation generation method
  async generateRecommendations(request: ScenarioRecommendationRequest): Promise<ScenarioRecommendations> {
    try {
      logger.info(`Generating recommendations for scenario ${request.scenarioId}`);

      const scenario = await scenarioModel.getScenario(request.scenarioId);
      if (!scenario) {
        throw new Error(`Scenario ${request.scenarioId} not found`);
      }

      const analysisResult = request.analysisResult;
      
      // 1. Generate strategic recommendations
      const strategicRecommendations = await this.generateStrategicRecommendations(
        scenario, 
        analysisResult, 
        request.riskTolerance || 'MODERATE'
      );

      // 2. Generate tactical actions
      const tacticalActions = await this.generateTacticalActions(
        analysisResult.instrumentImpacts,
        request.priorityFocus || 'BALANCED'
      );

      // 3. Generate risk mitigation strategies
      const riskMitigationStrategies = await this.generateRiskMitigationStrategies(
        analysisResult.riskMetrics,
        scenario.category
      );

      // 4. Identify opportunities
      const opportunityCapture = await this.generateOpportunityStrategies(
        analysisResult,
        scenario.category
      );

      // 5. Portfolio adjustment recommendations
      const portfolioAdjustments = await this.generatePortfolioAdjustments(
        analysisResult.portfolioImpact,
        request.riskTolerance || 'MODERATE'
      );

      // 6. Timeline recommendations
      const timelineRecommendations = this.generateTimelineRecommendations(
        strategicRecommendations,
        tacticalActions,
        request.timeHorizon || 12
      );

      // 7. Contingency plans
      const contingencyPlans = this.generateContingencyPlans(
        scenario,
        analysisResult.riskMetrics
      );

      // 8. Monitoring KPIs
      const monitoringKPIs = this.generateMonitoringKPIs(
        analysisResult,
        scenario.category
      );

      // 9. Claude-powered insights (Step 24.5 core feature)
      const claudeInsights = await this.generateClaudeRecommendations(
        scenario,
        analysisResult,
        strategicRecommendations,
        tacticalActions,
        request
      );

      // 10. Implementation guide
      const implementationGuide = this.generateImplementationGuide(
        strategicRecommendations,
        tacticalActions,
        portfolioAdjustments
      );

      const recommendations: ScenarioRecommendations = {
        scenarioId: request.scenarioId,
        scenarioName: scenario.name,
        overallRating: this.calculateOverallRating(analysisResult),
        riskLevel: this.assessRiskLevel(analysisResult.riskMetrics),
        confidenceLevel: analysisResult.confidence,
        
        strategicRecommendations,
        tacticalActions,
        riskMitigationStrategies,
        opportunityCapture,
        portfolioAdjustments,
        
        timelineRecommendations,
        contingencyPlans,
        monitoringKPIs,
        
        claudeInsights,
        implementationGuide
      };

      logger.info(`Recommendations generated successfully for scenario ${request.scenarioId}`);
      return recommendations;

    } catch (error) {
      logger.error(`Error generating recommendations: ${error}`);
      throw error;
    }
  }

  private async generateStrategicRecommendations(
    scenario: ScenarioDefinition,
    analysisResult: WhatIfAnalysisResult,
    riskTolerance: string
  ): Promise<StrategicRecommendation[]> {
    const recommendations: StrategicRecommendation[] = [];
    const portfolioReturn = analysisResult.portfolioImpact.totalReturnPercentage;
    const maxDrawdown = analysisResult.riskMetrics.maxDrawdown;

    // Positioning recommendation based on scenario outcome
    if (portfolioReturn > 10) {
      recommendations.push({
        id: 'strategic-positioning-positive',
        category: 'POSITIONING',
        title: 'Capitalize on Positive Scenario',
        description: 'This scenario presents favorable conditions for portfolio growth',
        rationale: `Expected portfolio return of ${portfolioReturn.toFixed(1)}% suggests strong upside potential`,
        priority: 'HIGH',
        timeHorizon: 'MEDIUM_TERM',
        expectedImpact: `Potential ${portfolioReturn.toFixed(1)}% portfolio appreciation`,
        riskLevel: maxDrawdown > 15 ? 'HIGH' : 'MEDIUM'
      });
    } else if (portfolioReturn < -10) {
      recommendations.push({
        id: 'strategic-positioning-defensive',
        category: 'POSITIONING',
        title: 'Implement Defensive Strategy',
        description: 'This scenario suggests adopting defensive positioning',
        rationale: `Expected portfolio decline of ${Math.abs(portfolioReturn).toFixed(1)}% requires protective measures`,
        priority: 'HIGH',
        timeHorizon: 'IMMEDIATE',
        expectedImpact: 'Limit downside risk and preserve capital',
        riskLevel: 'HIGH'
      });
    }

    // Diversification recommendation
    if (maxDrawdown > 20) {
      recommendations.push({
        id: 'strategic-diversification',
        category: 'DIVERSIFICATION',
        title: 'Enhance Portfolio Diversification',
        description: 'Reduce concentration risk through broader diversification',
        rationale: `Maximum drawdown of ${maxDrawdown.toFixed(1)}% indicates high concentration risk`,
        priority: 'HIGH',
        timeHorizon: 'SHORT_TERM',
        expectedImpact: 'Reduce portfolio volatility by 15-25%',
        riskLevel: 'MEDIUM'
      });
    }

    // Currency hedging for Argentina-specific scenarios
    if (scenario.category === 'MACRO' || scenario.name.toLowerCase().includes('devaluacion')) {
      recommendations.push({
        id: 'strategic-hedging-currency',
        category: 'HEDGING',
        title: 'Implement Currency Hedging Strategy',
        description: 'Protect against peso devaluation risk',
        rationale: 'Macro scenario suggests significant currency volatility',
        priority: 'MEDIUM',
        timeHorizon: 'SHORT_TERM',
        expectedImpact: 'Reduce currency risk exposure by 50%',
        riskLevel: 'LOW'
      });
    }

    // Liquidity recommendation based on risk tolerance
    if (riskTolerance === 'CONSERVATIVE' || maxDrawdown > 25) {
      recommendations.push({
        id: 'strategic-liquidity',
        category: 'LIQUIDITY',
        title: 'Increase Liquidity Buffer',
        description: 'Build cash reserves for opportunities and emergency',
        rationale: 'High volatility scenario requires adequate liquidity management',
        priority: 'MEDIUM',
        timeHorizon: 'IMMEDIATE',
        expectedImpact: 'Provide 10-15% cash buffer for opportunities',
        riskLevel: 'LOW'
      });
    }

    return recommendations;
  }

  private async generateTacticalActions(
    instrumentImpacts: InstrumentImpactAnalysis[],
    priorityFocus: string
  ): Promise<TacticalAction[]> {
    const actions: TacticalAction[] = [];

    // Sort by impact magnitude and confidence
    const sortedImpacts = [...instrumentImpacts].sort((a, b) => {
      const scoreA = Math.abs(a.priceChangePercentage) * a.confidence;
      const scoreB = Math.abs(b.priceChangePercentage) * b.confidence;
      return scoreB - scoreA;
    });

    // Generate top 10 tactical actions
    for (const impact of sortedImpacts.slice(0, 10)) {
      if (impact.confidence < 0.6) continue; // Skip low-confidence recommendations

      const action = this.determineAction(impact, priorityFocus);
      const urgency = this.determineUrgency(impact);

      actions.push({
        id: `tactical-${impact.ticker.toLowerCase()}`,
        action,
        instrumentTicker: impact.ticker,
        instrumentName: impact.name,
        currentPosition: 100, // Simplified - would get from portfolio
        recommendedPosition: this.calculateRecommendedPosition(impact, action),
        positionChange: this.calculatePositionChange(impact, action),
        changePercentage: Math.abs(impact.priceChangePercentage),
        reasoning: impact.reasoning,
        confidence: impact.confidence,
        urgency,
        estimatedCost: this.estimateTransactionCost(impact),
        expectedReturn: impact.priceChangePercentage
      });
    }

    return actions;
  }

  private determineAction(impact: InstrumentImpactAnalysis, priorityFocus: string): TacticalAction['action'] {
    if (impact.recommendation === 'SELL' && impact.priceChangePercentage < -15) {
      return 'SELL';
    } else if (impact.recommendation === 'BUY' && impact.priceChangePercentage > 15) {
      return 'BUY';
    } else if (impact.recommendation === 'SELL' && impact.priceChangePercentage < -5) {
      return 'REDUCE';
    } else if (impact.recommendation === 'BUY' && impact.priceChangePercentage > 5) {
      return 'INCREASE';
    } else if (Math.abs(impact.priceChangePercentage) > 20) {
      return 'HEDGE';
    }
    return 'HOLD';
  }

  private determineUrgency(impact: InstrumentImpactAnalysis): TacticalAction['urgency'] {
    if (Math.abs(impact.priceChangePercentage) > 25 && impact.confidence > 0.8) {
      return 'IMMEDIATE';
    } else if (Math.abs(impact.priceChangePercentage) > 15 && impact.confidence > 0.7) {
      return 'THIS_WEEK';
    } else if (Math.abs(impact.priceChangePercentage) > 10) {
      return 'THIS_MONTH';
    }
    return 'NEXT_QUARTER';
  }

  private calculateRecommendedPosition(impact: InstrumentImpactAnalysis, action: TacticalAction['action']): number {
    const basePosition = 100; // Simplified
    
    switch (action) {
      case 'SELL': return 0;
      case 'REDUCE': return basePosition * 0.5;
      case 'INCREASE': return basePosition * 1.5;
      case 'BUY': return basePosition * 2;
      default: return basePosition;
    }
  }

  private calculatePositionChange(impact: InstrumentImpactAnalysis, action: TacticalAction['action']): number {
    const basePosition = 100;
    const recommended = this.calculateRecommendedPosition(impact, action);
    return recommended - basePosition;
  }

  private estimateTransactionCost(impact: InstrumentImpactAnalysis): number {
    // Simplified transaction cost estimation
    const baseValue = impact.currentPrice * 100; // Assume 100 shares
    return baseValue * 0.005; // 0.5% transaction cost
  }

  private async generateRiskMitigationStrategies(
    riskMetrics: RiskMetrics,
    scenarioCategory: string
  ): Promise<RiskMitigationStrategy[]> {
    const strategies: RiskMitigationStrategy[] = [];

    // Market risk mitigation
    if (riskMetrics.maxDrawdown > 20) {
      strategies.push({
        id: 'risk-market-diversification',
        riskCategory: 'MARKET',
        title: 'Market Risk Diversification',
        description: 'Reduce market exposure through broader diversification',
        implementation: [
          'Increase position limits per instrument to max 5%',
          'Add international ETFs for geographic diversification',
          'Include defensive sectors (utilities, healthcare)',
          'Consider market-neutral strategies'
        ],
        effectiveness: 75,
        cost: 'MEDIUM',
        timeToImplement: '2-4 weeks'
      });
    }

    // Currency risk for Argentine context
    if (scenarioCategory === 'MACRO') {
      strategies.push({
        id: 'risk-currency-hedge',
        riskCategory: 'CURRENCY',
        title: 'Currency Risk Hedging',
        description: 'Protect against peso devaluation',
        implementation: [
          'Maintain 70-80% USD exposure through CEDEARs',
          'Consider USD-denominated bonds',
          'Limit peso cash holdings to operational needs',
          'Monitor central bank policy changes'
        ],
        effectiveness: 85,
        cost: 'LOW',
        timeToImplement: '1-2 weeks'
      });
    }

    // Concentration risk
    strategies.push({
      id: 'risk-concentration-limits',
      riskCategory: 'CONCENTRATION',
      title: 'Position Size Limits',
      description: 'Implement strict position sizing rules',
      implementation: [
        'Maximum 15% allocation per single position',
        'Maximum 25% allocation per sector',
        'Regular rebalancing (monthly/quarterly)',
        'Automatic alerts for limit breaches'
      ],
      effectiveness: 80,
      cost: 'LOW',
      timeToImplement: '1 week'
    });

    // Liquidity risk
    if (riskMetrics.probabilityOfLoss > 40) {
      strategies.push({
        id: 'risk-liquidity-buffer',
        riskCategory: 'LIQUIDITY',
        title: 'Emergency Liquidity Buffer',
        description: 'Maintain adequate cash reserves',
        implementation: [
          'Keep 10-15% in cash/money market funds',
          'Focus on highly liquid CEDEARs',
          'Establish credit lines for opportunities',
          'Monitor daily trading volumes'
        ],
        effectiveness: 70,
        cost: 'MEDIUM',
        timeToImplement: '1 week'
      });
    }

    return strategies;
  }

  private async generateOpportunityStrategies(
    analysisResult: WhatIfAnalysisResult,
    scenarioCategory: string
  ): Promise<OpportunityStrategy[]> {
    const strategies: OpportunityStrategy[] = [];
    const strongBuys = analysisResult.instrumentImpacts.filter(
      i => i.recommendation === 'BUY' && i.confidence > 0.75
    );

    // Growth opportunities
    if (strongBuys.length > 0) {
      strategies.push({
        id: 'opportunity-growth',
        opportunityType: 'GROWTH',
        title: 'High-Conviction Growth Positions',
        description: 'Capitalize on instruments with strong upside potential',
        instruments: strongBuys.slice(0, 5).map(i => i.ticker),
        potentialReturn: Math.max(...strongBuys.map(i => i.priceChangePercentage)),
        riskLevel: 'MEDIUM',
        timeframe: '6-12 months',
        prerequisites: [
          'Confirm technical analysis signals',
          'Verify ESG compliance',
          'Check position size limits'
        ]
      });
    }

    // Value opportunities from market stress
    if (analysisResult.portfolioImpact.totalReturnPercentage < -10) {
      strategies.push({
        id: 'opportunity-value',
        opportunityType: 'VALUE',
        title: 'Contrarian Value Plays',
        description: 'Identify oversold quality companies',
        instruments: ['Quality CEDEARs trading below intrinsic value'],
        potentialReturn: 25,
        riskLevel: 'MEDIUM',
        timeframe: '12-24 months',
        prerequisites: [
          'Fundamental analysis confirmation',
          'Strong balance sheet verification',
          'Management quality assessment'
        ]
      });
    }

    // Defensive income strategies
    strategies.push({
      id: 'opportunity-defensive',
      opportunityType: 'DEFENSIVE',
      title: 'Defensive Income Generation',
      description: 'Focus on dividend-paying defensive stocks',
      instruments: ['Utilities', 'Healthcare', 'Consumer Staples'],
      potentialReturn: 8,
      riskLevel: 'LOW',
      timeframe: '12+ months',
      prerequisites: [
        'Dividend sustainability analysis',
        'Sector rotation timing',
        'Interest rate environment assessment'
      ]
    });

    return strategies;
  }

  private async generatePortfolioAdjustments(
    portfolioImpact: any,
    riskTolerance: string
  ): Promise<PortfolioAdjustment[]> {
    const adjustments: PortfolioAdjustment[] = [];

    // Sector rebalancing based on impact analysis
    adjustments.push({
      id: 'adjustment-sector-rebalance',
      adjustmentType: 'SECTOR_ROTATION',
      currentAllocation: {
        'Technology': 35,
        'Healthcare': 20,
        'Financials': 25,
        'Consumer': 15,
        'Other': 5
      },
      recommendedAllocation: this.calculateOptimalSectorAllocation(riskTolerance),
      adjustmentMagnitude: 15,
      rationale: 'Optimize sector exposure based on scenario analysis',
      implementationSteps: [
        'Analyze current sector weights',
        'Identify over/under-allocated sectors',
        'Execute rebalancing trades',
        'Monitor implementation progress'
      ],
      estimatedCosts: 5000,
      expectedBenefit: 'Improved risk-adjusted returns'
    });

    return adjustments;
  }

  private calculateOptimalSectorAllocation(riskTolerance: string): Record<string, number> {
    switch (riskTolerance) {
      case 'AGGRESSIVE':
        return {
          'Technology': 40,
          'Healthcare': 15,
          'Financials': 20,
          'Consumer': 20,
          'Other': 5
        };
      case 'CONSERVATIVE':
        return {
          'Technology': 25,
          'Healthcare': 30,
          'Financials': 20,
          'Consumer': 20,
          'Other': 5
        };
      default: // MODERATE
        return {
          'Technology': 30,
          'Healthcare': 25,
          'Financials': 25,
          'Consumer': 15,
          'Other': 5
        };
    }
  }

  private generateTimelineRecommendations(
    strategicRecs: StrategicRecommendation[],
    tacticalActions: TacticalAction[],
    timeHorizon: number
  ): TimelineRecommendation[] {
    return [
      {
        phase: 'IMMEDIATE',
        timeframe: '24-48 hours',
        actions: [
          ...tacticalActions.filter(a => a.urgency === 'IMMEDIATE').map(a => `${a.action} ${a.instrumentTicker}`),
          ...strategicRecs.filter(r => r.timeHorizon === 'IMMEDIATE').map(r => r.title)
        ],
        priorities: ['Risk mitigation', 'Capital preservation'],
        keyMilestones: ['Emergency actions completed', 'Risk exposure reduced'],
        successMetrics: ['Portfolio volatility < target', 'Liquidity maintained']
      },
      {
        phase: 'WEEK_1',
        timeframe: '1 week',
        actions: [
          ...tacticalActions.filter(a => a.urgency === 'THIS_WEEK').map(a => `${a.action} ${a.instrumentTicker}`),
          'Complete portfolio rebalancing',
          'Implement hedging strategies'
        ],
        priorities: ['Tactical positioning', 'Risk management'],
        keyMilestones: ['Key positions adjusted', 'Hedges in place'],
        successMetrics: ['Target allocations achieved', 'Risk metrics improved']
      },
      {
        phase: 'MONTH_1',
        timeframe: '1 month',
        actions: [
          'Monitor scenario developments',
          'Evaluate early results',
          'Adjust strategies as needed'
        ],
        priorities: ['Performance monitoring', 'Strategy refinement'],
        keyMilestones: ['First month review completed', 'Strategy adjustments made'],
        successMetrics: ['Performance vs benchmark', 'Risk budget utilization']
      },
      {
        phase: 'QUARTER_1',
        timeframe: '3 months',
        actions: [
          'Comprehensive portfolio review',
          'Scenario model validation',
          'Strategy optimization'
        ],
        priorities: ['Strategic review', 'Long-term positioning'],
        keyMilestones: ['Quarterly review completed', 'Strategy validated'],
        successMetrics: ['Quarterly performance review', 'Model accuracy assessment']
      },
      {
        phase: 'ONGOING',
        timeframe: 'Continuous',
        actions: [
          'Monitor key indicators',
          'Regular rebalancing',
          'Scenario updates'
        ],
        priorities: ['Ongoing monitoring', 'Continuous improvement'],
        keyMilestones: ['Regular monitoring established', 'Process optimization'],
        successMetrics: ['Consistent outperformance', 'Risk management effectiveness']
      }
    ];
  }

  private generateContingencyPlans(
    scenario: ScenarioDefinition,
    riskMetrics: RiskMetrics
  ): ContingencyPlan[] {
    return [
      {
        scenarioName: 'Scenario Deterioration',
        triggerConditions: [
          'Portfolio losses exceed 15%',
          'Maximum drawdown exceeds 25%',
          'Correlation increases above 0.8'
        ],
        immediateActions: [
          'Reduce position sizes by 50%',
          'Increase cash allocation to 25%',
          'Implement additional hedging'
        ],
        escalationPath: [
          'Notify risk management team',
          'Conduct emergency portfolio review',
          'Consider full defensive positioning'
        ],
        resourcesRequired: ['Emergency liquidity', 'Risk management team', 'Trading authorization'],
        communicationPlan: 'Immediate notification to stakeholders with action plan'
      },
      {
        scenarioName: 'Opportunity Acceleration',
        triggerConditions: [
          'Key positions outperforming by 20%+',
          'Market dislocation creates value',
          'Scenario playing out faster than expected'
        ],
        immediateActions: [
          'Scale up high-conviction positions',
          'Deploy reserve capital',
          'Accelerate rebalancing timeline'
        ],
        escalationPath: [
          'Increase position limits temporarily',
          'Access additional capital if available',
          'Coordinate with investment committee'
        ],
        resourcesRequired: ['Additional capital', 'Expanded position limits', 'Faster execution'],
        communicationPlan: 'Regular updates on opportunity capture progress'
      }
    ];
  }

  private generateMonitoringKPIs(
    analysisResult: WhatIfAnalysisResult,
    scenarioCategory: string
  ): MonitoringKPI[] {
    return [
      {
        kpiName: 'Portfolio Return vs Scenario',
        description: 'Track actual vs projected portfolio returns',
        currentValue: 0,
        targetValue: analysisResult.portfolioImpact.totalReturnPercentage,
        warningThreshold: analysisResult.portfolioImpact.totalReturnPercentage * 0.8,
        criticalThreshold: analysisResult.portfolioImpact.totalReturnPercentage * 0.6,
        frequency: 'DAILY',
        dataSource: 'Portfolio management system'
      },
      {
        kpiName: 'Maximum Drawdown',
        description: 'Monitor portfolio maximum drawdown',
        currentValue: 0,
        targetValue: analysisResult.riskMetrics.maxDrawdown,
        warningThreshold: analysisResult.riskMetrics.maxDrawdown * 1.2,
        criticalThreshold: analysisResult.riskMetrics.maxDrawdown * 1.5,
        frequency: 'DAILY',
        dataSource: 'Risk management system'
      },
      {
        kpiName: 'Position Concentration',
        description: 'Monitor portfolio concentration risk',
        currentValue: 15,
        targetValue: 15,
        warningThreshold: 18,
        criticalThreshold: 25,
        frequency: 'DAILY',
        dataSource: 'Portfolio analytics'
      },
      {
        kpiName: 'Currency Exposure',
        description: 'Track USD vs ARS exposure levels',
        currentValue: 75,
        targetValue: 80,
        warningThreshold: 70,
        criticalThreshold: 60,
        frequency: 'DAILY',
        dataSource: 'Currency risk system'
      },
      {
        kpiName: 'ESG Compliance Score',
        description: 'Monitor ESG criteria compliance',
        currentValue: 85,
        targetValue: 90,
        warningThreshold: 80,
        criticalThreshold: 75,
        frequency: 'WEEKLY',
        dataSource: 'ESG rating service'
      }
    ];
  }

  // Step 24.5 - Core Claude recommendation generation
  private async generateClaudeRecommendations(
    scenario: ScenarioDefinition,
    analysisResult: WhatIfAnalysisResult,
    strategicRecs: StrategicRecommendation[],
    tacticalActions: TacticalAction[],
    request: ScenarioRecommendationRequest
  ): Promise<ScenarioClaudeRecommendations> {
    const prompt = this.buildRecommendationPrompt(
      scenario,
      analysisResult,
      strategicRecs,
      tacticalActions,
      request
    );

    try {
      const contextData = {
        scenario: scenario.name,
        category: scenario.category,
        portfolioReturn:
          analysisResult.portfolioImpact.totalReturnPercentage,
        riskLevel: analysisResult.riskMetrics.maxDrawdown,
        riskTolerance: request.riskTolerance,
      } as const;

      const sortedContext = Object.keys(contextData)
        .sort((a, b) => a.localeCompare(b))
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = contextData[key as keyof typeof contextData];
          return acc;
        }, {});

      const claudeResponse = await this.claudeService.analyze({
        prompt,
        context: JSON.stringify(sortedContext),
      });

      return this.parseClaudeRecommendationResponse(
        claudeResponse.analysis || ''
      );

    } catch (error) {
      logger.warn(`Claude recommendations failed, using fallback: ${error}`);
      return this.getFallbackClaudeRecommendations(scenario, analysisResult);
    }
  }

  private buildRecommendationPrompt(
    scenario: ScenarioDefinition,
    analysisResult: WhatIfAnalysisResult,
    strategicRecs: StrategicRecommendation[],
    tacticalActions: TacticalAction[],
    request: ScenarioRecommendationRequest
  ): string {
    return `
# Scenario Investment Recommendations: ${scenario.name}

## Executive Context
You are providing investment recommendations for a **CEDEAR portfolio investor** based in Argentina with **ESG/Vegan criteria**. The analysis covers scenario "${scenario.name}" (${scenario.category} category).

## Scenario Analysis Summary
- **Portfolio Impact:** ${analysisResult.portfolioImpact.totalReturnPercentage.toFixed(2)}% projected return
- **Risk Level:** Maximum drawdown of ${analysisResult.riskMetrics.maxDrawdown.toFixed(2)}%
- **Time Horizon:** ${request.timeHorizon || 12} months
- **Risk Tolerance:** ${request.riskTolerance || 'MODERATE'}
- **Priority Focus:** ${request.priorityFocus || 'BALANCED'}

## Current Strategic Recommendations
${strategicRecs.map((rec, i) => `
${i + 1}. **${rec.title}** (${rec.priority} Priority)
   - Category: ${rec.category}
   - Expected Impact: ${rec.expectedImpact}
   - Time Horizon: ${rec.timeHorizon}
   - Risk Level: ${rec.riskLevel}
`).join('')}

## Key Tactical Actions Identified
${tacticalActions.slice(0, 5).map((action, i) => `
${i + 1}. **${action.action} ${action.instrumentTicker}** (${action.confidence * 100}% confidence)
   - Expected Return: ${action.expectedReturn.toFixed(2)}%
   - Urgency: ${action.urgency}
   - Reasoning: ${action.reasoning}
`).join('')}

## Risk Metrics
- **Maximum Drawdown:** ${analysisResult.riskMetrics.maxDrawdown.toFixed(2)}%
- **Portfolio Volatility:** ${analysisResult.riskMetrics.volatility.toFixed(2)}%
- **Value at Risk (95%):** $${analysisResult.riskMetrics.valueAtRisk95.toLocaleString()}
- **Probability of Loss:** ${analysisResult.riskMetrics.probabilityOfLoss.toFixed(1)}%

## Previous Claude Insights
${analysisResult.claudeInsights.keyRisks.slice(0, 3).map(risk => `- Risk: ${risk}`).join('\n')}
${analysisResult.claudeInsights.keyOpportunities.slice(0, 3).map(opp => `- Opportunity: ${opp}`).join('\n')}

## Request for Enhanced Recommendations
Please provide **actionable investment recommendations** considering:

### 1. Strategic Assessment
Evaluate the overall strategic positioning and provide your assessment of the scenario's implications for a CEDEARs investor.

### 2. Top Priorities (5 items)
List the 5 most critical actions/priorities in order of importance.

### 3. Risk Warnings (3-5 items)
Identify the most significant risks that require immediate attention or monitoring.

### 4. Opportunity Highlights (3-5 items)
Highlight the best opportunities this scenario presents for value creation.

### 5. Implementation Advice
Provide specific guidance on HOW to implement the recommendations, including timing, sequencing, and execution considerations.

### 6. Market Timing Guidance
Advice on timing of entries/exits, market conditions to watch, and tactical timing considerations.

### 7. ESG Considerations (3-5 items)
Specific ESG/vegan criteria considerations relevant to this scenario.

### 8. Argentine Context Factors (3-5 items)
Unique factors for Argentine investors (currency, regulations, local market conditions).

## Important Context
- Focus on **actionable, specific recommendations**
- Consider **peso-dollar dynamics** and **inflation** impact
- Prioritize **ESG-compliant investment options**
- Account for **Argentine regulatory environment**
- Consider **transaction costs** and **liquidity** constraints
- Provide **risk management** specific to emerging market exposure

Format your response with clear section headers matching the 8 points above.
    `;
  }

  private parseClaudeRecommendationResponse(response: string): ScenarioClaudeRecommendations {
    return {
      strategicAssessment: this.extractSection(response, 'Strategic Assessment') || 'Strategic assessment completed.',
      topPriorities: this.extractListItems(response, 'Top Priorities'),
      riskWarnings: this.extractListItems(response, 'Risk Warnings'),
      opportunityHighlights: this.extractListItems(response, 'Opportunity Highlights'),
      implementationAdvice: this.extractSection(response, 'Implementation Advice') || 'Follow systematic implementation approach.',
      marketTimingGuidance: this.extractSection(response, 'Market Timing Guidance') || 'Monitor market conditions closely.',
      esgConsiderations: this.extractListItems(response, 'ESG Considerations'),
      argentineContextFactors: this.extractListItems(response, 'Argentine Context Factors')
    };
  }

  private extractSection(text: string, sectionName: SectionName): string {
    const header = `**${sectionName}**`;
    const start = text.indexOf(header);
    if (start === -1) return '';

    let sectionStart = start + header.length;
    if (text[sectionStart] === ':') sectionStart++;

    while (
      sectionStart < text.length &&
      (text[sectionStart] === ' ' ||
        text[sectionStart] === '\t' ||
        text[sectionStart] === '\n' ||
        text[sectionStart] === '\r')
    ) {
      sectionStart++;
    }

    const remainder = text.slice(sectionStart);
    const nextHeaderIndex = remainder.indexOf('\n**');
    const content =
      nextHeaderIndex === -1 ? remainder : remainder.slice(0, nextHeaderIndex);
    return content.trim();
  }

  private extractListItems(text: string, sectionName: SectionName): string[] {
    const section = this.extractSection(text, sectionName);
    if (!section) return [];
    
    return section.split(/\n\s*[-•*]\s*/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, 5);
  }

  private getFallbackClaudeRecommendations(
    scenario: ScenarioDefinition,
    analysisResult: WhatIfAnalysisResult
  ): ScenarioClaudeRecommendations {
    const returnImpact = analysisResult.portfolioImpact.totalReturnPercentage;
    const isPositive = returnImpact > 0;

    return {
      strategicAssessment: `Scenario ${scenario.name} suggests ${isPositive ? 'favorable' : 'challenging'} conditions requiring ${isPositive ? 'opportunistic' : 'defensive'} positioning.`,
      topPriorities: [
        isPositive ? 'Scale up high-conviction positions' : 'Implement defensive measures',
        'Monitor key risk indicators daily',
        'Maintain adequate liquidity buffer',
        'Review ESG compliance regularly',
        'Prepare contingency plans'
      ],
      riskWarnings: [
        `Maximum drawdown risk of ${analysisResult.riskMetrics.maxDrawdown.toFixed(1)}%`,
        'Currency volatility in Argentine context',
        'Concentration risk in CEDEAR positions',
        'Market correlation increases during stress',
        'Liquidity constraints during volatility'
      ],
      opportunityHighlights: [
        isPositive ? 'Strong upside potential identified' : 'Value creation opportunities in dislocation',
        'ESG positioning advantage in market trends',
        'Currency hedging benefits through CEDEARs',
        'Sector rotation opportunities',
        'Long-term compound growth potential'
      ],
      implementationAdvice: 'Execute changes gradually over 2-4 weeks, monitoring market conditions and adjusting position sizes based on volatility.',
      marketTimingGuidance: 'Consider market volatility patterns and implement changes during lower volatility periods to minimize execution costs.',
      esgConsiderations: [
        'Maintain ESG screening standards',
        'Monitor sustainability ratings changes',
        'Consider climate risk factors',
        'Verify vegan criteria compliance',
        'Assess social impact metrics'
      ],
      argentineContextFactors: [
        'Monitor BCRA policy changes',
        'Track peso-dollar evolution',
        'Consider inflation impact on real returns',
        'Watch regulatory changes for foreign assets',
        'Assess local market liquidity conditions'
      ]
    };
  }

  private generateImplementationGuide(
    strategicRecs: StrategicRecommendation[],
    tacticalActions: TacticalAction[],
    portfolioAdjustments: PortfolioAdjustment[]
  ): ImplementationStep[] {
    return [
      {
        stepNumber: 1,
        title: 'Risk Assessment and Preparation',
        description: 'Evaluate current risk exposure and prepare for changes',
        dependencies: ['Portfolio analysis', 'Risk metrics calculation'],
        estimatedTime: '1-2 days',
        resources: ['Risk management tools', 'Portfolio analytics'],
        successCriteria: ['Risk profile documented', 'Baseline metrics established'],
        rollbackPlan: 'Maintain current positions if analysis incomplete'
      },
      {
        stepNumber: 2,
        title: 'Immediate Risk Mitigation',
        description: 'Execute urgent tactical changes to reduce risk',
        dependencies: ['Step 1 completion', 'Trading authorization'],
        estimatedTime: '2-3 days',
        resources: ['Trading platform', 'Execution team'],
        successCriteria: ['High-risk positions adjusted', 'Stop losses implemented'],
        rollbackPlan: 'Reverse trades if market conditions deteriorate'
      },
      {
        stepNumber: 3,
        title: 'Strategic Positioning',
        description: 'Implement strategic recommendations',
        dependencies: ['Steps 1-2 completion', 'Liquidity confirmation'],
        estimatedTime: '1-2 weeks',
        resources: ['Strategic analysis', 'Portfolio management'],
        successCriteria: ['Target allocations achieved', 'Strategy documented'],
        rollbackPlan: 'Gradual reversal to previous allocation'
      },
      {
        stepNumber: 4,
        title: 'Monitoring and Adjustment',
        description: 'Establish monitoring framework and make refinements',
        dependencies: ['Step 3 completion', 'Monitoring tools setup'],
        estimatedTime: 'Ongoing',
        resources: ['Monitoring systems', 'Analytics tools'],
        successCriteria: ['KPIs tracking established', 'Alert systems active'],
        rollbackPlan: 'Return to manual monitoring if systems fail'
      }
    ];
  }

  private calculateOverallRating(analysisResult: WhatIfAnalysisResult): ScenarioRecommendations['overallRating'] {
    const returnScore = analysisResult.portfolioImpact.totalReturnPercentage;
    const riskScore = analysisResult.riskMetrics.maxDrawdown;
    const confidence = analysisResult.confidence;

    // Simple scoring logic
    const compositeScore = (returnScore / 10) - (riskScore / 20) + (confidence * 50);

    if (compositeScore > 40) return 'EXCELLENT';
    if (compositeScore > 20) return 'GOOD';
    if (compositeScore > -10) return 'NEUTRAL';
    if (compositeScore > -30) return 'POOR';
    return 'DANGEROUS';
  }

  private assessRiskLevel(riskMetrics: RiskMetrics): ScenarioRecommendations['riskLevel'] {
    const maxDrawdown = riskMetrics.maxDrawdown;
    const volatility = riskMetrics.volatility;
    const probabilityOfLoss = riskMetrics.probabilityOfLoss;

    if (maxDrawdown > 25 || volatility > 30 || probabilityOfLoss > 60) return 'CRITICAL';
    if (maxDrawdown > 15 || volatility > 20 || probabilityOfLoss > 40) return 'HIGH';
    if (maxDrawdown > 10 || volatility > 15 || probabilityOfLoss > 25) return 'MEDIUM';
    return 'LOW';
  }

  async getRecommendationHistory(scenarioId: number, limit: number = 10): Promise<any[]> {
    // This would query recommendation history from database
    // For now, return empty array as this requires additional schema
    return [];
  }

  async compareRecommendations(scenarioIds: number[]): Promise<any> {
    // Implementation for comparing recommendations across scenarios
    return {
      commonRecommendations: [],
      uniqueRecommendations: {},
      riskComparison: {},
      implementationComplexity: {}
    };
  }
}

export const scenarioRecommendationService = new ScenarioRecommendationService();