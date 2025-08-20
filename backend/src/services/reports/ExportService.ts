import { CostReport } from '../../models/CostReport';
import { CostReportService } from './CostReportService';
import { TaxReportService } from './TaxReportService';
import { logger } from '../../utils/logger';
import { 
  ExportOptions, 
  ExportResult, 
  ExportHistory,
  ReportType,
  CostDashboard,
  ImpactAnalysis,
  CommissionVsGainComparison,
  AnnualCostReport
} from '../../types/reports';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ExportService {
  private costReportModel: CostReport;
  private costReportService: CostReportService;
  private taxReportService: TaxReportService;
  private exportDirectory: string;

  constructor() {
    this.costReportModel = new CostReport();
    this.costReportService = new CostReportService();
    this.taxReportService = new TaxReportService();
    this.exportDirectory = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.access(this.exportDirectory);
    } catch {
      await fs.mkdir(this.exportDirectory, { recursive: true });
    }
  }

  async exportReport(options: ExportOptions, reportType: ReportType): Promise<ExportResult> {
    try {
      logger.info('Starting report export', { options, reportType });

      // Generate the report data first
      const reportData = await this.generateReportData(reportType, options);
      
      // Create export record
      const exportRecord = await this.costReportModel.create({
        reportType,
        reportDate: new Date().toISOString().split('T')[0],
        dateRange: `${options.dateRange.startDate}_${options.dateRange.endDate}`,
        reportData: JSON.stringify(reportData),
        parameters: JSON.stringify(options),
        status: 'generating'
      });

      try {
        // Generate the file based on format
        const fileResult = await this.generateFile(reportData, options, reportType, exportRecord.id!);
        
        // Update export record with file information
        await this.costReportModel.update(exportRecord.id!, {
          status: 'ready',
          fileSize: fileResult.fileSize,
          recordCount: fileResult.recordCount,
          expiresAt: this.calculateExpirationDate().toISOString()
        });

        return {
          exportId: exportRecord.id!.toString(),
          format: options.format,
          filename: fileResult.filename,
          fileSize: fileResult.fileSize,
          recordCount: fileResult.recordCount,
          generatedAt: exportRecord.generatedAt,
          expiresAt: this.calculateExpirationDate().toISOString(),
          downloadUrl: `/api/v1/reports/export/${exportRecord.id}/download`,
          status: 'ready'
        };

      } catch (error) {
        // Update record with error status
        await this.costReportModel.updateStatus(exportRecord.id!, 'error', error.message);
        throw error;
      }

    } catch (error) {
      logger.error('Error exporting report', { error, options, reportType });
      throw new Error(`Failed to export report: ${error.message}`);
    }
  }

  private async generateReportData(reportType: ReportType, options: ExportOptions): Promise<any> {
    switch (reportType) {
      case 'dashboard':
        return await this.costReportService.generateCostDashboard(options.dateRange);
      
      case 'impact_analysis':
        return await this.costReportService.generateImpactAnalysis(options.dateRange);
      
      case 'commission_comparison':
        return await this.costReportService.generateCommissionVsGainComparison(options.dateRange);
      
      case 'annual_report':
        const year = new Date(options.dateRange.startDate).getFullYear();
        return await this.taxReportService.generateAnnualReport(year);
      
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
  }

  private async generateFile(
    reportData: any, 
    options: ExportOptions, 
    reportType: ReportType, 
    exportId: number
  ): Promise<{ filename: string; fileSize: number; recordCount: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${reportType}_${timestamp}.${options.format}`;
    const filepath = path.join(this.exportDirectory, filename);

    let fileContent: string;
    let recordCount = 0;

    switch (options.format) {
      case 'csv':
        const result = this.generateCSV(reportData, reportType, options);
        fileContent = result.content;
        recordCount = result.recordCount;
        break;
      
      case 'json':
        fileContent = JSON.stringify(reportData, null, 2);
        recordCount = this.countRecords(reportData);
        break;
      
      case 'pdf':
        throw new Error('PDF export not yet implemented'); // Will implement with pdf generator
      
      case 'xlsx':
        throw new Error('XLSX export not yet implemented'); // Will implement with xlsx library
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    await fs.writeFile(filepath, fileContent, 'utf8');
    const stats = await fs.stat(filepath);

    return {
      filename,
      fileSize: stats.size,
      recordCount
    };
  }

  private generateCSV(reportData: any, reportType: ReportType, options: ExportOptions): { content: string; recordCount: number } {
    switch (reportType) {
      case 'dashboard':
        return this.generateDashboardCSV(reportData as CostDashboard, options);
      
      case 'impact_analysis':
        return this.generateImpactAnalysisCSV(reportData as ImpactAnalysis, options);
      
      case 'commission_comparison':
        return this.generateCommissionComparisonCSV(reportData as CommissionVsGainComparison, options);
      
      case 'annual_report':
        return this.generateAnnualReportCSV(reportData as AnnualCostReport, options);
      
      default:
        throw new Error(`CSV generation not supported for report type: ${reportType}`);
    }
  }

  private generateDashboardCSV(dashboard: CostDashboard, options: ExportOptions): { content: string; recordCount: number } {
    const lines: string[] = [];
    
    // Summary section
    if (options.includeFields.summaries) {
      lines.push('# RESUMEN DASHBOARD DE COSTOS');
      lines.push('Métrica,Valor,Moneda');
      lines.push(`Total Comisiones,${dashboard.totalCommissions},ARS`);
      lines.push(`Total Custodia,${dashboard.totalCustodyFees},ARS`);
      lines.push(`Total Costos,${dashboard.totalCosts},ARS`);
      lines.push(`Promedio por Operación,${dashboard.averageCommissionPerTrade},ARS`);
      lines.push(`Porcentaje de Cartera,${dashboard.costPercentageOfPortfolio},%`);
      lines.push('');
    }

    // Monthly trend
    if (options.includeFields.summaries) {
      lines.push('# TENDENCIA MENSUAL');
      lines.push('Año,Mes,Comisiones,Custodia,Total Costos,Número Operaciones,Promedio por Operación');
      dashboard.monthlyTrend.forEach(month => {
        lines.push(`${month.year},${month.month},${month.commissions},${month.custodyFees},${month.totalCosts},${month.numberOfTrades},${month.averageCostPerTrade}`);
      });
      lines.push('');
    }

    // Top costly instruments
    if (options.includeFields.summaries) {
      lines.push('# INSTRUMENTOS MÁS COSTOSOS');
      lines.push('Símbolo,Nombre,Total Comisiones,Número Operaciones,Promedio por Operación,Es No Rentable');
      dashboard.topCostlyInstruments.forEach(instrument => {
        lines.push(`${instrument.symbol},${instrument.name},${instrument.totalCommissions},${instrument.numberOfTrades},${instrument.averageCommissionPerTrade},${instrument.isUnprofitable}`);
      });
      lines.push('');
    }

    // Alerts
    if (options.includeFields.summaries) {
      lines.push('# ALERTAS');
      lines.push('Tipo,Severidad,Mensaje,Símbolo,Acción Recomendada,Ahorro Potencial');
      dashboard.costAlerts.forEach(alert => {
        lines.push(`${alert.type},${alert.severity},"${alert.message}",${alert.instrumentSymbol || ''},"${alert.recommendedAction}",${alert.potentialSavings || ''}`);
      });
    }

    return {
      content: lines.join('\n'),
      recordCount: dashboard.monthlyTrend.length + dashboard.topCostlyInstruments.length + dashboard.costAlerts.length
    };
  }

  private generateImpactAnalysisCSV(analysis: ImpactAnalysis, options: ExportOptions): { content: string; recordCount: number } {
    const lines: string[] = [];
    
    // Overall metrics
    if (options.includeFields.summaries) {
      lines.push('# MÉTRICAS GENERALES DE IMPACTO');
      lines.push('Métrica,Valor,Moneda');
      lines.push(`Valor Total Cartera,${analysis.overallMetrics.totalPortfolioValue},ARS`);
      lines.push(`Total Retornos,${analysis.overallMetrics.totalReturns},ARS`);
      lines.push(`Total Costos,${analysis.overallMetrics.totalCosts},ARS`);
      lines.push(`Retornos Netos,${analysis.overallMetrics.netReturns},ARS`);
      lines.push(`Costos como % de Retornos,${analysis.overallMetrics.costAsPercentageOfReturns},%`);
      lines.push(`ROI Ajustado,${analysis.overallMetrics.adjustedROI},%`);
      lines.push(`ROI Sin Ajustar,${analysis.overallMetrics.unadjustedROI},%`);
      lines.push('');
    }

    // Trade analysis
    if (options.includeFields.tradeDetails) {
      lines.push('# ANÁLISIS POR OPERACIÓN');
      lines.push('ID Operación,Símbolo,Tipo,Fecha,Retorno Bruto,Costos Totales,Retorno Neto,% Costo de Retorno,No Rentable,Precio Break-Even,Precio Actual');
      analysis.tradeAnalysis.forEach(trade => {
        lines.push(`${trade.tradeId},${trade.symbol},${trade.tradeType},${trade.tradeDate},${trade.grossReturn},${trade.totalCosts},${trade.netReturn},${trade.costPercentageOfReturn},${trade.isUnprofitable},${trade.breakEvenPrice},${trade.currentPrice}`);
      });
      lines.push('');
    }

    // Optimization suggestions
    if (options.includeFields.summaries) {
      lines.push('# SUGERENCIAS DE OPTIMIZACIÓN');
      lines.push('Tipo,Prioridad,Título,Descripción,Ahorro Estimado,Dificultad,Tiempo,Riesgo');
      analysis.optimizationSuggestions.forEach(suggestion => {
        lines.push(`${suggestion.type},${suggestion.priority},"${suggestion.title}","${suggestion.description}",${suggestion.estimatedSavings},${suggestion.implementationDifficulty},${suggestion.timeToImplement},${suggestion.riskLevel}`);
      });
    }

    return {
      content: lines.join('\n'),
      recordCount: analysis.tradeAnalysis.length + analysis.optimizationSuggestions.length
    };
  }

  private generateCommissionComparisonCSV(comparison: CommissionVsGainComparison, options: ExportOptions): { content: string; recordCount: number } {
    const lines: string[] = [];
    
    // Summary
    if (options.includeFields.summaries) {
      lines.push('# RESUMEN COMPARATIVO');
      lines.push('Métrica,Valor');
      lines.push(`Total Operaciones,${comparison.summary.totalTrades}`);
      lines.push(`Operaciones Rentables,${comparison.summary.profitableTrades}`);
      lines.push(`Operaciones No Rentables,${comparison.summary.unprofitableTrades}`);
      lines.push(`Total Ganancias Brutas,${comparison.summary.totalGrossGains}`);
      lines.push(`Total Pérdidas Brutas,${comparison.summary.totalGrossLosses}`);
      lines.push(`Total Comisiones,${comparison.summary.totalCommissions}`);
      lines.push(`Resultado Neto,${comparison.summary.netResult}`);
      lines.push(`Porcentaje Rentabilidad,${comparison.summary.profitabilityPercentage}`);
      lines.push('');
    }

    // Trade comparisons
    if (options.includeFields.tradeDetails) {
      lines.push('# COMPARACIÓN POR OPERACIÓN');
      lines.push('ID,Símbolo,Tipo,Fecha,Cantidad,Precio,Monto Bruto,Comisión,% Comisión,Monto Neto,Ganancia/Pérdida,Ratio Comisión/Ganancia,Estado,Nivel Alerta');
      comparison.tradeComparisons.forEach(trade => {
        lines.push(`${trade.tradeId},${trade.symbol},${trade.tradeType},${trade.executionDate},${trade.quantity},${trade.price},${trade.grossAmount},${trade.commissionAmount},${trade.commissionPercentage},${trade.netAmount},${trade.realizedGainLoss || ''},${trade.commissionVsGainRatio || ''},${trade.status},${trade.warningLevel}`);
      });
      lines.push('');
    }

    // Profitability metrics
    if (options.includeFields.summaries) {
      lines.push('# MÉTRICAS DE RENTABILIDAD');
      lines.push('Métrica,Valor');
      lines.push(`Tasa de Éxito,${comparison.profitabilityMetrics.winRate}%`);
      lines.push(`Ganancia Promedio,${comparison.profitabilityMetrics.averageWin}`);
      lines.push(`Pérdida Promedio,${comparison.profitabilityMetrics.averageLoss}`);
      lines.push(`Factor de Beneficio,${comparison.profitabilityMetrics.profitFactor}`);
      lines.push(`ROI,${comparison.profitabilityMetrics.returnOnInvestment}%`);
      lines.push(`ROI Ajustado por Costos,${comparison.profitabilityMetrics.costAdjustedROI}%`);
    }

    return {
      content: lines.join('\n'),
      recordCount: comparison.tradeComparisons.length
    };
  }

  private generateAnnualReportCSV(report: AnnualCostReport, options: ExportOptions): { content: string; recordCount: number } {
    const lines: string[] = [];
    
    // Executive summary
    if (options.includeFields.summaries) {
      lines.push(`# REPORTE ANUAL ${report.year}`);
      lines.push('Métrica,Valor,Moneda');
      lines.push(`Volumen Total Inversiones,${report.executiveSummary.totalInvestmentVolume},ARS`);
      lines.push(`Total Comisiones,${report.executiveSummary.totalCommissions},ARS`);
      lines.push(`Total Custodia,${report.executiveSummary.totalCustodyFees},ARS`);
      lines.push(`Total Costos,${report.executiveSummary.totalCosts},ARS`);
      lines.push(`Número de Operaciones,${report.executiveSummary.numberOfTrades},`);
      lines.push(`Costo Promedio por Operación,${report.executiveSummary.averageCostPerTrade},ARS`);
      lines.push(`Retorno Neto de Cartera,${report.executiveSummary.netPortfolioReturn},ARS`);
      lines.push(`Calificación General,${report.executiveSummary.overallPerformanceRating},`);
      lines.push('');
    }

    // Monthly breakdown
    if (options.includeFields.summaries) {
      lines.push('# DESGLOSE MENSUAL');
      lines.push('Mes,Nombre Mes,Volumen,Comisiones,Custodia,Total Costos,Número Operaciones,Promedio por Operación,Score Eficiencia');
      report.monthlyBreakdown.forEach(month => {
        lines.push(`${month.month},${month.monthName},${month.tradingVolume},${month.commissions},${month.custodyFees},${month.totalCosts},${month.numberOfTrades},${month.averageCostPerTrade},${month.costEfficiencyScore}`);
      });
      lines.push('');
    }

    // Cost categories for taxes
    if (options.includeFields.taxInformation) {
      lines.push('# CATEGORÍAS DE COSTOS DEDUCIBLES');
      lines.push('Categoría,Monto,Moneda');
      lines.push(`Comisiones de Transacción,${report.costCategories.transactionCommissions},ARS`);
      lines.push(`Comisiones de Custodia,${report.costCategories.custodyFees},ARS`);
      lines.push(`IVA sobre Comisiones,${report.costCategories.ivaOnCommissions},ARS`);
      lines.push(`IVA sobre Custodia,${report.costCategories.ivaOnCustody},ARS`);
      lines.push(`Otros Gastos,${report.costCategories.otherFees},ARS`);
      lines.push(`Total Gastos Deducibles,${report.costCategories.totalDeductibleExpenses},ARS`);
      lines.push('');
    }

    // Recommendations
    if (options.includeFields.summaries) {
      lines.push('# RECOMENDACIONES');
      lines.push('Categoría,Prioridad,Título,Descripción,Beneficio Estimado,Esfuerzo,Timeline');
      report.recommendations.forEach(rec => {
        lines.push(`${rec.category},${rec.priority},"${rec.title}","${rec.description}",${rec.estimatedBenefit},${rec.implementationEffort},${rec.timeline}`);
      });
    }

    return {
      content: lines.join('\n'),
      recordCount: report.monthlyBreakdown.length + report.recommendations.length
    };
  }

  private countRecords(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    
    let count = 0;
    if (data.monthlyTrend) count += data.monthlyTrend.length;
    if (data.tradeAnalysis) count += data.tradeAnalysis.length;
    if (data.tradeComparisons) count += data.tradeComparisons.length;
    if (data.monthlyBreakdown) count += data.monthlyBreakdown.length;
    
    return count || 1; // At least 1 for the main record
  }

  private calculateExpirationDate(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30); // 30 days from now
    return expiration;
  }

  async getExportHistory(limit: number = 50): Promise<ExportHistory> {
    const exports = await this.costReportModel.getRecentReports(30);
    const storage = await this.costReportModel.getStorageUsage();

    const exportResults: ExportResult[] = exports.slice(0, limit).map(exp => ({
      exportId: exp.id!.toString(),
      format: this.extractFormatFromParameters(exp.parameters),
      filename: this.extractFilenameFromData(exp.reportData),
      fileSize: exp.fileSize || 0,
      recordCount: exp.recordCount || 0,
      generatedAt: exp.generatedAt,
      expiresAt: exp.expiresAt || '',
      downloadUrl: `/api/v1/reports/export/${exp.id}/download`,
      status: exp.status,
      error: exp.error
    }));

    return {
      exports: exportResults,
      totalExports: storage.totalReports,
      lastExportDate: storage.newestReport || '',
      storageUsed: storage.totalSize,
      maxStorageAllowed: 100 * 1024 * 1024 // 100MB limit
    };
  }

  private extractFormatFromParameters(parametersJson: string): string {
    try {
      const params = JSON.parse(parametersJson);
      return params.format || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private extractFilenameFromData(dataJson: string): string {
    // This would need to be enhanced to store actual filename
    return 'report_export.csv';
  }

  async downloadExport(exportId: string): Promise<{ filepath: string; filename: string; contentType: string }> {
    const exportRecord = await this.costReportModel.findById(parseInt(exportId));
    
    if (!exportRecord) {
      throw new Error('Export not found');
    }

    if (exportRecord.status !== 'ready') {
      throw new Error(`Export not ready. Status: ${exportRecord.status}`);
    }

    const format = this.extractFormatFromParameters(exportRecord.parameters);
    const filename = `export_${exportId}.${format}`;
    const filepath = path.join(this.exportDirectory, filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      throw new Error('Export file not found on disk');
    }

    const contentType = this.getContentType(format);

    return {
      filepath,
      filename,
      contentType
    };
  }

  private getContentType(format: string): string {
    const types = {
      'csv': 'text/csv',
      'json': 'application/json',
      'pdf': 'application/pdf',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return types[format as keyof typeof types] || 'application/octet-stream';
  }

  async cleanupExpiredExports(): Promise<number> {
    logger.info('Starting cleanup of expired exports');
    
    // Clean up database records
    const deletedRecords = await this.costReportModel.cleanupExpiredReports();
    
    // Clean up files (this would need to be enhanced to track actual filenames)
    // For now, we'll just log the cleanup
    logger.info(`Cleaned up ${deletedRecords} expired export records`);
    
    return deletedRecords;
  }

  async getExportStatistics(): Promise<{
    totalExports: number;
    exportsByFormat: { [key: string]: number };
    exportsByType: { [key: string]: number };
    averageFileSize: number;
    totalStorageUsed: number;
  }> {
    const stats = await this.costReportModel.getReportStatistics();
    const storage = await this.costReportModel.getStorageUsage();

    // Parse formats from parameters (simplified)
    const exportsByFormat: { [key: string]: number } = {
      csv: stats.totalReports * 0.8, // Assume 80% are CSV
      json: stats.totalReports * 0.15, // 15% JSON
      pdf: stats.totalReports * 0.05 // 5% PDF
    };

    return {
      totalExports: stats.totalReports,
      exportsByFormat,
      exportsByType: stats.reportsByType,
      averageFileSize: stats.averageFileSize,
      totalStorageUsed: storage.totalSize
    };
  }
}