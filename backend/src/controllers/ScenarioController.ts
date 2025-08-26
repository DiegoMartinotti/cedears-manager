/* eslint-disable max-lines-per-function, no-unused-vars */
import { Request, Response } from 'express';
import { z } from 'zod';
import { scenarioModel } from '../models/ScenarioModel';
import { scenarioAnalysisService, WhatIfAnalysisRequest } from '../services/ScenarioAnalysisService';
import { scenarioRecommendationService, ScenarioRecommendationRequest } from '../services/ScenarioRecommendationService';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/scenario-controller.log' })
  ]
});

// Validation schemas
const createScenarioSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  category: z.enum(['MACRO', 'MARKET', 'SECTOR', 'CUSTOM']),
  is_active: z.boolean().default(true),
  is_predefined: z.boolean().default(false),
  created_by: z.string().min(1).max(100)
});

const updateScenarioSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(1000).optional(),
  category: z.enum(['MACRO', 'MARKET', 'SECTOR', 'CUSTOM']).optional(),
  is_active: z.boolean().optional()
});

const createVariableSchema = z.object({
  scenario_id: z.number().int().positive(),
  variable_type: z.enum(['INFLATION', 'USD_ARS', 'INTEREST_RATE', 'MARKET_CRASH', 'SECTOR_GROWTH', 'COMMODITY_PRICE']),
  variable_name: z.string().min(1).max(100),
  current_value: z.number(),
  scenario_value: z.number(),
  change_percentage: z.number(),
  impact_duration_months: z.number().int().min(1).max(120)
});

const whatIfAnalysisSchema = z.object({
  scenarioId: z.number().int().positive(),
  timeHorizonMonths: z.number().int().min(1).max(120),
  confidenceLevel: z.number().min(0).max(1).optional(),
  includeMonteCarloSimulation: z.boolean().optional(),
  includeInstrumentAnalysis: z.boolean().optional()
});

const recommendationRequestSchema = z.object({
  scenarioId: z.number().int().positive(),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
  timeHorizon: z.number().int().min(1).max(120).optional(),
  priorityFocus: z.enum(['RETURN', 'RISK', 'BALANCED']).optional()
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  category: z.string().min(1).max(50),
  template_data: z.string(), // JSON string
  is_public: z.boolean().default(false),
  created_by: z.string().min(1).max(100)
});

const compareScenariasSchema = z.object({
  scenario_ids: z.array(z.number().int().positive()).min(2).max(10),
  user_id: z.string().min(1).max(100)
});

export class ScenarioController {
  
  // ==================== SCENARIO MANAGEMENT ====================
  
  async createScenario(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createScenarioSchema.parse(req.body);
      
      const scenarioId = await scenarioModel.createScenario(validatedData);
      const scenario = await scenarioModel.getScenario(scenarioId);
      
      logger.info(`Scenario created with ID: ${scenarioId}`);
      
      res.status(201).json({
        success: true,
        data: scenario,
        message: 'Scenario created successfully'
      });
    } catch (error) {
      logger.error(`Error creating scenario: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create scenario'
        });
      }
    }
  }
  
  async getScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.id);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      const scenario = await scenarioModel.getScenario(scenarioId);
      if (!scenario) {
        res.status(404).json({
          success: false,
          error: 'Scenario not found'
        });
        return;
      }
      
      // Get variables and latest results
      const variables = await scenarioModel.getScenarioVariables(scenarioId);
      const latestResult = await scenarioModel.getLatestResult(scenarioId);
      const results = await scenarioModel.getScenarioResults(scenarioId, 5);
      
      res.json({
        success: true,
        data: {
          scenario,
          variables,
          latestResult,
          recentResults: results
        }
      });
    } catch (error) {
      logger.error(`Error getting scenario: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get scenario'
      });
    }
  }
  
  async getAllScenarios(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        category: req.query.category as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        is_predefined: req.query.is_predefined ? req.query.is_predefined === 'true' : undefined
      };
      
      const scenarios = await scenarioModel.getAllScenarios(filters);
      
      res.json({
        success: true,
        data: scenarios,
        meta: {
          total: scenarios.length,
          filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== undefined))
        }
      });
    } catch (error) {
      logger.error(`Error getting scenarios: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get scenarios'
      });
    }
  }
  
  async updateScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.id);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      const validatedData = updateScenarioSchema.parse(req.body);
      
      const updated = await scenarioModel.updateScenario(scenarioId, validatedData);
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Scenario not found or no changes made'
        });
        return;
      }
      
      const scenario = await scenarioModel.getScenario(scenarioId);
      
      logger.info(`Scenario ${scenarioId} updated`);
      
      res.json({
        success: true,
        data: scenario,
        message: 'Scenario updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating scenario: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update scenario'
        });
      }
    }
  }
  
  async deleteScenario(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.id);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      const deleted = await scenarioModel.deleteScenario(scenarioId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Scenario not found'
        });
        return;
      }
      
      logger.info(`Scenario ${scenarioId} deleted`);
      
      res.json({
        success: true,
        message: 'Scenario deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting scenario: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to delete scenario'
      });
    }
  }
  
  // ==================== SCENARIO VARIABLES ====================
  
  async createVariable(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createVariableSchema.parse(req.body);
      
      const variableId = await scenarioModel.createVariable(validatedData);
      
      logger.info(`Variable created with ID: ${variableId}`);
      
      res.status(201).json({
        success: true,
        data: { id: variableId },
        message: 'Variable created successfully'
      });
    } catch (error) {
      logger.error(`Error creating variable: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create variable'
        });
      }
    }
  }
  
  async getScenarioVariables(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.scenarioId);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      const variables = await scenarioModel.getScenarioVariables(scenarioId);
      
      res.json({
        success: true,
        data: variables,
        meta: {
          scenarioId,
          count: variables.length
        }
      });
    } catch (error) {
      logger.error(`Error getting scenario variables: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get scenario variables'
      });
    }
  }
  
  async updateVariable(req: Request, res: Response): Promise<void> {
    try {
      const variableId = parseInt(req.params.id);
      if (isNaN(variableId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid variable ID'
        });
        return;
      }
      
      const updates = req.body;
      const updated = await scenarioModel.updateVariable(variableId, updates);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Variable not found or no changes made'
        });
        return;
      }
      
      logger.info(`Variable ${variableId} updated`);
      
      res.json({
        success: true,
        message: 'Variable updated successfully'
      });
    } catch (error) {
      logger.error(`Error updating variable: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to update variable'
      });
    }
  }
  
  async deleteVariable(req: Request, res: Response): Promise<void> {
    try {
      const variableId = parseInt(req.params.id);
      if (isNaN(variableId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid variable ID'
        });
        return;
      }
      
      const deleted = await scenarioModel.deleteVariable(variableId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Variable not found'
        });
        return;
      }
      
      logger.info(`Variable ${variableId} deleted`);
      
      res.json({
        success: true,
        message: 'Variable deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting variable: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to delete variable'
      });
    }
  }
  
  // ==================== WHAT-IF ANALYSIS (Step 24.4) ====================
  
  async runWhatIfAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = whatIfAnalysisSchema.parse(req.body);
      
      const analysisRequest: WhatIfAnalysisRequest = {
        scenarioId: validatedData.scenarioId,
        timeHorizonMonths: validatedData.timeHorizonMonths,
        confidenceLevel: validatedData.confidenceLevel || 0.8,
        includeMonteCarloSimulation: validatedData.includeMonteCarloSimulation || false,
        includeInstrumentAnalysis: validatedData.includeInstrumentAnalysis || true
      };
      
      logger.info(`Starting what-if analysis for scenario ${validatedData.scenarioId}`);
      
      const result = await scenarioAnalysisService.analyzeScenario(analysisRequest);
      
      logger.info(`What-if analysis completed for scenario ${validatedData.scenarioId}`);
      
      res.json({
        success: true,
        data: result,
        message: 'What-if analysis completed successfully'
      });
    } catch (error) {
      logger.error(`Error in what-if analysis: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to run what-if analysis'
        });
      }
    }
  }
  
  // ==================== RECOMMENDATIONS (Step 24.5) ====================
  
  async generateRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.scenarioId);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      // First, we need the analysis result for recommendations
      const latestResult = await scenarioModel.getLatestResult(scenarioId);
      if (!latestResult) {
        res.status(400).json({
          success: false,
          error: 'No analysis result found. Please run what-if analysis first.'
        });
        return;
      }
      
      // Get full analysis result (this would need to be stored/reconstructed)
      // For now, we'll create a minimal analysis result
      const scenario = await scenarioModel.getScenario(scenarioId);
      const variables = await scenarioModel.getScenarioVariables(scenarioId);
      
      // Create a simplified analysis result for recommendation generation
      const analysisResult = await this.reconstructAnalysisResult(scenarioId, latestResult);
      
      const validatedData = recommendationRequestSchema.parse(req.body);
      
      const recommendationRequest: ScenarioRecommendationRequest = {
        scenarioId,
        analysisResult,
        riskTolerance: validatedData.riskTolerance,
        timeHorizon: validatedData.timeHorizon,
        priorityFocus: validatedData.priorityFocus
      };
      
      logger.info(`Generating recommendations for scenario ${scenarioId}`);
      
      const recommendations = await scenarioRecommendationService.generateRecommendations(recommendationRequest);
      
      logger.info(`Recommendations generated for scenario ${scenarioId}`);
      
      res.json({
        success: true,
        data: recommendations,
        message: 'Recommendations generated successfully'
      });
    } catch (error) {
      logger.error(`Error generating recommendations: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate recommendations'
        });
      }
    }
  }
  
  // ==================== SCENARIO RESULTS ====================
  
  async getScenarioResults(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.scenarioId);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const results = await scenarioModel.getScenarioResults(scenarioId, limit);
      
      res.json({
        success: true,
        data: results,
        meta: {
          scenarioId,
          count: results.length,
          limit
        }
      });
    } catch (error) {
      logger.error(`Error getting scenario results: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get scenario results'
      });
    }
  }
  
  async getResultInstrumentImpacts(req: Request, res: Response): Promise<void> {
    try {
      const resultId = parseInt(req.params.resultId);
      if (isNaN(resultId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid result ID'
        });
        return;
      }
      
      const impacts = await scenarioModel.getResultInstrumentImpacts(resultId);
      
      res.json({
        success: true,
        data: impacts,
        meta: {
          resultId,
          count: impacts.length
        }
      });
    } catch (error) {
      logger.error(`Error getting instrument impacts: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get instrument impacts'
      });
    }
  }
  
  // ==================== TEMPLATES ====================
  
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = createTemplateSchema.parse(req.body);
      
      const templateId = await scenarioModel.createTemplate(validatedData);
      
      logger.info(`Template created with ID: ${templateId}`);
      
      res.status(201).json({
        success: true,
        data: { id: templateId },
        message: 'Template created successfully'
      });
    } catch (error) {
      logger.error(`Error creating template: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create template'
        });
      }
    }
  }
  
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const isPublic = req.query.is_public ? req.query.is_public === 'true' : undefined;
      const templates = await scenarioModel.getTemplates(isPublic);
      
      res.json({
        success: true,
        data: templates,
        meta: {
          count: templates.length,
          isPublic
        }
      });
    } catch (error) {
      logger.error(`Error getting templates: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get templates'
      });
    }
  }
  
  async createFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const templateId = parseInt(req.params.templateId);
      const { name, description, created_by } = req.body;
      
      if (isNaN(templateId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid template ID'
        });
        return;
      }
      
      // Get template and increment usage
      const templates = await scenarioModel.getTemplates();
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }
      
      await scenarioModel.incrementTemplateUsage(templateId);
      
      // Parse template data and create scenario
      const templateData = JSON.parse(template.template_data);
      
      const scenarioData = {
        name: name || `${template.name} - Copy`,
        description: description || template.description,
        category: templateData.category || 'CUSTOM',
        is_active: true,
        is_predefined: false,
        created_by
      };
      
      const scenarioId = await scenarioModel.createScenario(scenarioData);
      
      // Create variables from template
      if (templateData.variables) {
        for (const variable of templateData.variables) {
          await scenarioModel.createVariable({
            scenario_id: scenarioId,
            ...variable
          });
        }
      }
      
      const scenario = await scenarioModel.getScenario(scenarioId);
      const variables = await scenarioModel.getScenarioVariables(scenarioId);
      
      logger.info(`Scenario created from template ${templateId}: ${scenarioId}`);
      
      res.status(201).json({
        success: true,
        data: {
          scenario,
          variables,
          sourceTemplate: template
        },
        message: 'Scenario created from template successfully'
      });
    } catch (error) {
      logger.error(`Error creating from template: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to create scenario from template'
      });
    }
  }
  
  // ==================== SCENARIO COMPARISON ====================
  
  async compareScenarios(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = compareScenariasSchema.parse(req.body);
      
      logger.info(`Comparing scenarios: ${validatedData.scenario_ids.join(', ')}`);
      
      const comparison = await scenarioAnalysisService.compareScenarios(
        validatedData.scenario_ids,
        validatedData.user_id
      );
      
      logger.info(`Scenario comparison completed`);
      
      res.json({
        success: true,
        data: comparison,
        message: 'Scenario comparison completed successfully'
      });
    } catch (error) {
      logger.error(`Error comparing scenarios: ${error}`);
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to compare scenarios'
        });
      }
    }
  }
  
  async getComparisons(req: Request, res: Response): Promise<void> {
    try {
      const createdBy = req.query.created_by as string;
      const comparisons = await scenarioModel.getComparisons(createdBy);
      
      res.json({
        success: true,
        data: comparisons,
        meta: {
          count: comparisons.length,
          createdBy
        }
      });
    } catch (error) {
      logger.error(`Error getting comparisons: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get comparisons'
      });
    }
  }
  
  // ==================== MONTE CARLO ====================
  
  async getMonteCarloResults(req: Request, res: Response): Promise<void> {
    try {
      const scenarioId = parseInt(req.params.scenarioId);
      if (isNaN(scenarioId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scenario ID'
        });
        return;
      }
      
      const results = await scenarioModel.getMonteCarloResults(scenarioId);
      
      res.json({
        success: true,
        data: results,
        meta: {
          scenarioId,
          count: results.length
        }
      });
    } catch (error) {
      logger.error(`Error getting Monte Carlo results: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get Monte Carlo results'
      });
    }
  }
  
  // ==================== STATISTICS ====================
  
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [scenarioStats, analysisStats] = await Promise.all([
        scenarioModel.getStats(),
        scenarioAnalysisService.getStats()
      ]);
      
      res.json({
        success: true,
        data: {
          scenarios: scenarioStats,
          analysis: analysisStats
        }
      });
    } catch (error) {
      logger.error(`Error getting stats: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }
  
  async cleanup(req: Request, res: Response): Promise<void> {
    try {
      await scenarioModel.cleanup();
      
      logger.info('Scenario cleanup completed');
      
      res.json({
        success: true,
        message: 'Cleanup completed successfully'
      });
    } catch (error) {
      logger.error(`Error in cleanup: ${error}`);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup'
      });
    }
  }
  
  // ==================== HELPER METHODS ====================
  
  private async reconstructAnalysisResult(scenarioId: number, result: any): Promise<any> {
    // This is a simplified reconstruction - in a real implementation,
    // you might store the full analysis result or have a more sophisticated reconstruction
    const scenario = await scenarioModel.getScenario(scenarioId);
    const variables = await scenarioModel.getScenarioVariables(scenarioId);
    const instrumentImpacts = await scenarioModel.getResultInstrumentImpacts(result.id);
    
    const metadata = result.metadata ? JSON.parse(result.metadata) : {};
    
    return {
      scenarioId,
      scenarioName: scenario?.name || 'Unknown Scenario',
      simulationDate: result.simulation_date,
      timeHorizonMonths: result.simulation_duration_months,
      portfolioImpact: {
        currentValue: result.portfolio_value_before,
        projectedValue: result.portfolio_value_after,
        totalReturn: result.portfolio_value_after - result.portfolio_value_before,
        totalReturnPercentage: result.total_return_percentage,
        adjustedForInflation: variables.some((v: any) => v.variable_type === 'INFLATION'),
        breakdownByAsset: metadata.breakdownByAsset || [],
        breakdownBySector: metadata.breakdownBySector || []
      },
      instrumentImpacts: instrumentImpacts.map((impact: any) => ({
        instrumentId: impact.instrument_id,
        ticker: impact.ticker,
        name: impact.name,
        currentPrice: impact.current_price,
        projectedPrice: impact.projected_price,
        priceChangePercentage: impact.price_change_percentage,
        positionImpact: impact.position_impact,
        recommendation: impact.recommendation,
        confidence: impact.confidence,
        reasoning: impact.reasoning || 'Standard scenario impact'
      })),
      riskMetrics: metadata.riskMetrics || {
        maxDrawdown: result.max_drawdown,
        volatility: result.volatility,
        sharpeRatio: result.risk_adjusted_return,
        valueAtRisk95: result.portfolio_value_before * 0.05,
        valueAtRisk99: result.portfolio_value_before * 0.01,
        probabilityOfLoss: 30,
        worstCaseScenario: result.total_return_percentage * 1.5,
        stressTestResult: result.max_drawdown
      },
      claudeInsights: {
        executiveSummary: 'Scenario analysis completed with moderate confidence.',
        keyRisks: ['Market volatility', 'Currency risk', 'Concentration risk'],
        keyOpportunities: ['Value creation', 'Portfolio optimization', 'Risk hedging'],
        mitigationStrategies: ['Diversification', 'Hedging', 'Risk monitoring'],
        marketContextualAnalysis: 'Market conditions require careful monitoring.',
        timelineAnalysis: 'Impacts expected over medium term.',
        confidenceAssessment: 'Moderate confidence with key uncertainties.',
        alternativeScenarios: ['Base case', 'Optimistic case', 'Pessimistic case']
      },
      confidence: result.confidence_level,
      keyFindings: [
        `Portfolio return: ${result.total_return_percentage.toFixed(1)}%`,
        `Maximum drawdown: ${result.max_drawdown.toFixed(1)}%`,
        `Risk-adjusted return: ${result.risk_adjusted_return.toFixed(2)}`
      ],
      actionableRecommendations: [
        'Monitor key risk indicators',
        'Review portfolio diversification',
        'Consider hedging strategies'
      ]
    };
  }
}

export const scenarioController = new ScenarioController();