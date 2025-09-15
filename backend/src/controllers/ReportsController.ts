import { Request, Response } from 'express';
import { z } from 'zod';
import { CostReportService } from '../services/reports/CostReportService';
import { TaxReportService } from '../services/reports/TaxReportService';
import { ExportService } from '../services/reports/ExportService';
import type { ExportOptions } from '../types/reports';
import { logger } from '../utils/logger';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
});

const reportRequestSchema = z.object({
  type: z.enum(['dashboard', 'impact_analysis', 'commission_comparison', 'annual_report']),
  dateRange: dateRangeSchema,
  filters: z.object({
    symbols: z.array(z.string()).optional(),
    brokers: z.array(z.string()).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional()
  }).optional(),
  options: z.object({
    includeProjections: z.boolean().optional(),
    includeBenchmarks: z.boolean().optional(),
    groupBy: z.string().optional(),
    aggregationLevel: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional()
  }).optional()
});

const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'pdf', 'json', 'xlsx']),
  dateRange: dateRangeSchema,
  includeFields: z.object({
    commissions: z.boolean().default(true),
    custodyFees: z.boolean().default(true),
    tradeDetails: z.boolean().default(true),
    taxInformation: z.boolean().default(false),
    charts: z.boolean().default(false),
    summaries: z.boolean().default(true)
  }),
  filters: z.object({
    symbols: z.array(z.string()).optional(),
    brokers: z.array(z.string()).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional()
  }).optional(),
  groupBy: z.enum(['month', 'quarter', 'year', 'instrument', 'none']).default('none'),
  sortBy: z.enum(['date', 'amount', 'symbol', 'commission']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export class ReportsController {
  private costReportService: CostReportService;
  private taxReportService: TaxReportService;
  private exportService: ExportService;

  constructor() {
    this.costReportService = new CostReportService();
    this.taxReportService = new TaxReportService();
    this.exportService = new ExportService();
  }

  // GET /api/v1/reports/dashboard
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'startDate and endDate query parameters are required'
        });
        return;
      }

      const dateRange = { 
        startDate: startDate as string, 
        endDate: endDate as string 
      };

      // Validate date range
      const validation = dateRangeSchema.safeParse(dateRange);
      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid date range format',
          details: validation.error.errors
        });
        return;
      }

      logger.info('Generating cost dashboard', { dateRange });
      const dashboard = await this.costReportService.generateCostDashboard(dateRange);

      res.status(200).json({
        success: true,
        data: dashboard,
        meta: {
          dateRange,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getDashboard', { error });
      res.status(500).json({
        error: 'Failed to generate cost dashboard',
        message
      });
    }
  }

  // GET /api/v1/reports/impact-analysis
  async getImpactAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'startDate and endDate query parameters are required'
        });
        return;
      }

      const dateRange = { 
        startDate: startDate as string, 
        endDate: endDate as string 
      };

      const validation = dateRangeSchema.safeParse(dateRange);
      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid date range format',
          details: validation.error.errors
        });
        return;
      }

      logger.info('Generating impact analysis', { dateRange });
      const analysis = await this.costReportService.generateImpactAnalysis(dateRange);

      res.status(200).json({
        success: true,
        data: analysis,
        meta: {
          dateRange,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getImpactAnalysis', { error });
      res.status(500).json({
        error: 'Failed to generate impact analysis',
        message
      });
    }
  }

  // GET /api/v1/reports/commission-comparison
  async getCommissionComparison(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          error: 'startDate and endDate query parameters are required'
        });
        return;
      }

      const dateRange = { 
        startDate: startDate as string, 
        endDate: endDate as string 
      };

      const validation = dateRangeSchema.safeParse(dateRange);
      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid date range format',
          details: validation.error.errors
        });
        return;
      }

      logger.info('Generating commission comparison', { dateRange });
      const comparison = await this.costReportService.generateCommissionVsGainComparison(dateRange);

      res.status(200).json({
        success: true,
        data: comparison,
        meta: {
          dateRange,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getCommissionComparison', { error });
      res.status(500).json({
        error: 'Failed to generate commission comparison',
        message
      });
    }
  }

  // GET /api/v1/reports/annual/:year
  async getAnnualReport(req: Request, res: Response): Promise<void> {
    try {
      const year = req.params.year;

      if (!year) {
        res.status(400).json({
          error: 'Year parameter is required'
        });
        return;
      }

      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2020 || yearNum > new Date().getFullYear()) {
        res.status(400).json({
          error: 'Invalid year parameter'
        });
        return;
      }

      logger.info('Generating annual report', { year: yearNum });
      const report = await this.taxReportService.generateAnnualReport(yearNum);

      res.status(200).json({
        success: true,
        data: report,
        meta: {
          year: yearNum,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getAnnualReport', { error });
      res.status(500).json({
        error: 'Failed to generate annual report',
        message
      });
    }
  }

  // POST /api/v1/reports/export
  async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportType, exportOptions } = req.body;

      if (!reportType || !exportOptions) {
        res.status(400).json({
          error: 'reportType and exportOptions are required'
        });
        return;
      }

      // Validate export options
      const validation = exportOptionsSchema.safeParse(exportOptions);
      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid export options',
          details: validation.error.errors
        });
        return;
      }

      logger.info('Starting report export', { reportType, options: exportOptions });
      const exportResult = await this.exportService.exportReport(
        validation.data as ExportOptions,
        reportType
      );

      res.status(202).json({
        success: true,
        data: exportResult,
        message: 'Export started successfully'
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in exportReport', { error });
      res.status(500).json({
        error: 'Failed to start export',
        message
      });
    }
  }

  // GET /api/v1/reports/export/history
  async getExportHistory(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 50;

      logger.info('Getting export history', { limit: limitNum });
      const history = await this.exportService.getExportHistory(limitNum);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getExportHistory', { error });
      res.status(500).json({
        error: 'Failed to get export history',
        message
      });
    }
  }

  // GET /api/v1/reports/export/:id/download
  async downloadExport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'Export ID is required'
        });
        return;
      }

      logger.info('Starting export download', { exportId: id });
      const downloadInfo = await this.exportService.downloadExport(id);

      res.setHeader('Content-Type', downloadInfo.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.filename}"`);
      res.sendFile(downloadInfo.filepath);

    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in downloadExport', { error, exportId: req.params.id });

      if (message.includes('not found')) {
        res.status(404).json({
          error: 'Export not found',
          message
        });
      } else if (message.includes('not ready')) {
        res.status(409).json({
          error: 'Export not ready',
          message
        });
      } else {
        res.status(500).json({
          error: 'Failed to download export',
          message
        });
      }
    }
  }

  // GET /api/v1/reports/export/statistics
  async getExportStatistics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Getting export statistics');
      const stats = await this.exportService.getExportStatistics();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getExportStatistics', { error });
      res.status(500).json({
        error: 'Failed to get export statistics',
        message
      });
    }
  }

  // DELETE /api/v1/reports/export/cleanup
  async cleanupExpiredExports(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting export cleanup');
      const deletedCount = await this.exportService.cleanupExpiredExports();

      res.status(200).json({
        success: true,
        data: {
          deletedExports: deletedCount,
          cleanupDate: new Date().toISOString()
        },
        message: `Cleaned up ${deletedCount} expired exports`
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in cleanupExpiredExports', { error });
      res.status(500).json({
        error: 'Failed to cleanup expired exports',
        message
      });
    }
  }

  // POST /api/v1/reports/generate
  // eslint-disable-next-line max-lines-per-function
  async generateCustomReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = reportRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid report request',
          details: validation.error.errors
        });
        return;
      }

      const reportRequest = validation.data;
      logger.info('Generating custom report', { reportRequest });

      let reportData;
      switch (reportRequest.type) {
        case 'dashboard':
          reportData = await this.costReportService.generateCostDashboard(reportRequest.dateRange);
          break;
        case 'impact_analysis':
          reportData = await this.costReportService.generateImpactAnalysis(reportRequest.dateRange);
          break;
        case 'commission_comparison':
          reportData = await this.costReportService.generateCommissionVsGainComparison(reportRequest.dateRange);
          break;
        case 'annual_report': {
          const year = new Date(reportRequest.dateRange.startDate).getFullYear();
          reportData = await this.taxReportService.generateAnnualReport(year);
          break;
        }
        default:
          res.status(400).json({
            error: 'Unsupported report type'
          });
          return;
      }

      res.status(200).json({
        success: true,
        data: reportData,
        meta: {
          reportType: reportRequest.type,
          dateRange: reportRequest.dateRange,
          filters: reportRequest.filters,
          options: reportRequest.options,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in generateCustomReport', { error });
      res.status(500).json({
        error: 'Failed to generate custom report',
        message
      });
    }
  }

  // GET /api/v1/reports/tax-export/:year
  async getTaxExportData(req: Request, res: Response): Promise<void> {
    try {
      const { year } = req.params;

      const yearNum = parseInt(year ?? '', 10);
      if (isNaN(yearNum) || yearNum < 2020 || yearNum > new Date().getFullYear()) {
        res.status(400).json({
          error: 'Invalid year parameter'
        });
        return;
      }

      logger.info('Generating tax export data', { year: yearNum });
      const taxData = await this.taxReportService.generateTaxExportData(yearNum);

      res.status(200).json({
        success: true,
        data: taxData,
        meta: {
          year: yearNum,
          generatedAt: new Date().toISOString(),
          recordCounts: {
            transactions: taxData.transactions.length,
            commissions: taxData.commissions.length,
            custodyFees: taxData.custodyFees.length
          }
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getTaxExportData', { error, year: req.params.year });
      res.status(500).json({
        error: 'Failed to generate tax export data',
        message
      });
    }
  }

  // GET /api/v1/reports/health
  async getReportsHealth(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.exportService.getExportStatistics();
      
      res.status(200).json({
        success: true,
        data: {
          serviceStatus: 'healthy',
          lastCheck: new Date().toISOString(),
          statistics: stats,
          systemInfo: {
            nodeVersion: process.version,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage()
          }
        }
      });
    } catch (error) {
      const message = getErrorMessage(error);
      logger.error('Error in getReportsHealth', { error });
      res.status(500).json({
        error: 'Reports service unhealthy',
        message
      });
    }
  }
}