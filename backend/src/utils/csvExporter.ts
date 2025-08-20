import { logger } from './logger';

export interface CSVOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  header?: boolean;
  encoding?: string;
  includeByteOrderMark?: boolean;
}

export interface CSVColumn {
  key: string;
  header: string;
  format?: (value: any) => string;
  width?: number;
}

export class CSVExporter {
  private options: CSVOptions;
  private data: any[] = [];
  private columns: CSVColumn[] = [];

  constructor(options: CSVOptions = {}) {
    this.options = {
      delimiter: ',',
      quote: '"',
      escape: '"',
      header: true,
      encoding: 'utf8',
      includeByteOrderMark: false,
      ...options
    };
  }

  setColumns(columns: CSVColumn[]): void {
    this.columns = columns;
  }

  setData(data: any[]): void {
    this.data = data;
  }

  addRow(row: any): void {
    this.data.push(row);
  }

  addRows(rows: any[]): void {
    this.data.push(...rows);
  }

  private escapeValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    let str = String(value);
    const quote = this.options.quote!;
    const delimiter = this.options.delimiter!;

    // Check if we need to quote the value
    const needsQuoting = str.includes(delimiter) || 
                        str.includes(quote) || 
                        str.includes('\n') || 
                        str.includes('\r');

    if (needsQuoting) {
      // Escape existing quotes
      str = str.replace(new RegExp(quote, 'g'), this.options.escape + quote);
      // Wrap in quotes
      str = quote + str + quote;
    }

    return str;
  }

  private formatValue(value: any, column?: CSVColumn): string {
    if (column?.format) {
      return column.format(value);
    }

    // Default formatting
    if (typeof value === 'number') {
      // Check if it's a currency-like number (more than 2 decimal places suggests it's not currency)
      if (value % 1 !== 0 && value.toString().split('.')[1]?.length <= 2) {
        return value.toLocaleString('es-AR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
      }
      return value.toLocaleString('es-AR');
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    return String(value);
  }

  generate(): string {
    try {
      logger.info('Generating CSV', { 
        rows: this.data.length, 
        columns: this.columns.length 
      });

      const lines: string[] = [];

      // Add header if enabled
      if (this.options.header && this.columns.length > 0) {
        const headerRow = this.columns
          .map(col => this.escapeValue(col.header))
          .join(this.options.delimiter);
        lines.push(headerRow);
      }

      // Add data rows
      for (const row of this.data) {
        let rowValues: string[];

        if (this.columns.length > 0) {
          // Use defined columns
          rowValues = this.columns.map(col => {
            const value = row[col.key];
            const formatted = this.formatValue(value, col);
            return this.escapeValue(formatted);
          });
        } else {
          // Use object keys as columns (for simple objects)
          rowValues = Object.values(row).map(value => {
            const formatted = this.formatValue(value);
            return this.escapeValue(formatted);
          });
        }

        lines.push(rowValues.join(this.options.delimiter));
      }

      let csv = lines.join('\n');

      // Add BOM for Excel compatibility if requested
      if (this.options.includeByteOrderMark) {
        csv = '\ufeff' + csv;
      }

      return csv;

    } catch (error) {
      logger.error('Error generating CSV', { error });
      throw new Error(`Failed to generate CSV: ${error.message}`);
    }
  }

  generateBuffer(): Buffer {
    const csv = this.generate();
    return Buffer.from(csv, this.options.encoding as BufferEncoding);
  }

  // Static utility methods for specific report types
  static exportCostDashboard(dashboardData: any): string {
    const exporter = new CSVExporter({ includeByteOrderMark: true });

    // Create multiple sections in one CSV
    const sections: string[] = [];

    // Summary section
    sections.push('# RESUMEN DASHBOARD DE COSTOS');
    sections.push('Métrica,Valor,Moneda');
    sections.push(`Total Comisiones,${dashboardData.totalCommissions || 0},ARS`);
    sections.push(`Total Custodia,${dashboardData.totalCustodyFees || 0},ARS`);
    sections.push(`Total Costos,${dashboardData.totalCosts || 0},ARS`);
    sections.push(`Promedio por Operación,${dashboardData.averageCommissionPerTrade || 0},ARS`);
    sections.push(`Porcentaje de Cartera,${dashboardData.costPercentageOfPortfolio || 0},%`);
    sections.push('');

    // Monthly trend
    if (dashboardData.monthlyTrend?.length > 0) {
      sections.push('# TENDENCIA MENSUAL');
      sections.push('Año,Mes,Comisiones,Custodia,Total Costos,Número Operaciones,Promedio por Operación');
      dashboardData.monthlyTrend.forEach((month: any) => {
        sections.push(`${month.year},${month.month},${month.commissions},${month.custodyFees},${month.totalCosts},${month.numberOfTrades},${month.averageCostPerTrade}`);
      });
      sections.push('');
    }

    // Top costly instruments
    if (dashboardData.topCostlyInstruments?.length > 0) {
      sections.push('# INSTRUMENTOS MÁS COSTOSOS');
      sections.push('Símbolo,Nombre,Total Comisiones,Número Operaciones,Promedio por Operación,Es No Rentable');
      dashboardData.topCostlyInstruments.forEach((instrument: any) => {
        sections.push(`${instrument.symbol},"${instrument.name}",${instrument.totalCommissions},${instrument.numberOfTrades},${instrument.averageCommissionPerTrade},${instrument.isUnprofitable ? 'Sí' : 'No'}`);
      });
      sections.push('');
    }

    // Alerts
    if (dashboardData.costAlerts?.length > 0) {
      sections.push('# ALERTAS');
      sections.push('Tipo,Severidad,Mensaje,Símbolo,Acción Recomendada,Ahorro Potencial');
      dashboardData.costAlerts.forEach((alert: any) => {
        sections.push(`${alert.type},${alert.severity},"${alert.message}",${alert.instrumentSymbol || ''},"${alert.recommendedAction}",${alert.potentialSavings || ''}`);
      });
    }

    return sections.join('\n');
  }

  static exportTradeComparisons(comparisons: any[]): string {
    const exporter = new CSVExporter({ includeByteOrderMark: true });

    exporter.setColumns([
      { key: 'tradeId', header: 'ID Operación' },
      { key: 'symbol', header: 'Símbolo' },
      { key: 'tradeType', header: 'Tipo' },
      { key: 'executionDate', header: 'Fecha' },
      { key: 'quantity', header: 'Cantidad' },
      { key: 'price', header: 'Precio', format: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2 }) },
      { key: 'grossAmount', header: 'Monto Bruto', format: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2 }) },
      { key: 'commissionAmount', header: 'Comisión', format: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2 }) },
      { key: 'commissionPercentage', header: '% Comisión', format: (v) => v.toFixed(2) + '%' },
      { key: 'netAmount', header: 'Monto Neto', format: (v) => v.toLocaleString('es-AR', { minimumFractionDigits: 2 }) },
      { key: 'realizedGainLoss', header: 'Ganancia/Pérdida', format: (v) => v ? v.toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '' },
      { key: 'status', header: 'Estado' },
      { key: 'warningLevel', header: 'Nivel Alerta' }
    ]);

    exporter.setData(comparisons);
    return exporter.generate();
  }

  static exportAnnualReport(reportData: any): string {
    const sections: string[] = [];

    // Executive summary
    sections.push(`# REPORTE ANUAL ${reportData.year}`);
    sections.push('Métrica,Valor,Moneda');
    sections.push(`Volumen Total Inversiones,${reportData.executiveSummary.totalInvestmentVolume},ARS`);
    sections.push(`Total Comisiones,${reportData.executiveSummary.totalCommissions},ARS`);
    sections.push(`Total Custodia,${reportData.executiveSummary.totalCustodyFees},ARS`);
    sections.push(`Total Costos,${reportData.executiveSummary.totalCosts},ARS`);
    sections.push(`Número de Operaciones,${reportData.executiveSummary.numberOfTrades},`);
    sections.push(`Costo Promedio por Operación,${reportData.executiveSummary.averageCostPerTrade},ARS`);
    sections.push(`Retorno Neto de Cartera,${reportData.executiveSummary.netPortfolioReturn},ARS`);
    sections.push(`Calificación General,${reportData.executiveSummary.overallPerformanceRating},`);
    sections.push('');

    // Monthly breakdown
    if (reportData.monthlyBreakdown?.length > 0) {
      sections.push('# DESGLOSE MENSUAL');
      sections.push('Mes,Nombre Mes,Volumen,Comisiones,Custodia,Total Costos,Número Operaciones,Promedio por Operación,Score Eficiencia');
      reportData.monthlyBreakdown.forEach((month: any) => {
        sections.push(`${month.month},"${month.monthName}",${month.tradingVolume},${month.commissions},${month.custodyFees},${month.totalCosts},${month.numberOfTrades},${month.averageCostPerTrade},${month.costEfficiencyScore}`);
      });
      sections.push('');
    }

    // Cost categories for taxes
    sections.push('# CATEGORÍAS DE COSTOS DEDUCIBLES');
    sections.push('Categoría,Monto,Moneda');
    sections.push(`Comisiones de Transacción,${reportData.costCategories.transactionCommissions},ARS`);
    sections.push(`Comisiones de Custodia,${reportData.costCategories.custodyFees},ARS`);
    sections.push(`IVA sobre Comisiones,${reportData.costCategories.ivaOnCommissions},ARS`);
    sections.push(`IVA sobre Custodia,${reportData.costCategories.ivaOnCustody},ARS`);
    sections.push(`Otros Gastos,${reportData.costCategories.otherFees},ARS`);
    sections.push(`Total Gastos Deducibles,${reportData.costCategories.totalDeductibleExpenses},ARS`);
    sections.push('');

    // Tax information
    sections.push('# INFORMACIÓN FISCAL');
    sections.push('Campo,Valor');
    sections.push(`Total Gastos Deducibles,${reportData.taxInformation.totalDeductibleAmount}`);
    sections.push(`Estado AFIP,${reportData.taxInformation.afipComplianceStatus}`);
    sections.push(`Estrategia Fiscal,"${reportData.taxInformation.suggestedTaxStrategy}"`);
    sections.push('');

    // Recommendations
    if (reportData.recommendations?.length > 0) {
      sections.push('# RECOMENDACIONES');
      sections.push('Categoría,Prioridad,Título,Descripción,Beneficio Estimado,Esfuerzo,Timeline');
      reportData.recommendations.forEach((rec: any) => {
        sections.push(`${rec.category},${rec.priority},"${rec.title}","${rec.description}",${rec.estimatedBenefit},${rec.implementationEffort},"${rec.timeline}"`);
      });
    }

    return sections.join('\n');
  }

  static exportTaxData(taxData: any): string {
    const sections: string[] = [];

    // Transactions
    if (taxData.transactions?.length > 0) {
      sections.push('# TRANSACCIONES');
      sections.push('Fecha,Tipo,Símbolo,Cantidad,Precio,Monto Bruto,Comisión,IVA Comisión,Monto Neto,Ganancia/Pérdida Realizada');
      taxData.transactions.forEach((transaction: any) => {
        sections.push(`${transaction.fecha},${transaction.tipo},${transaction.simbolo},${transaction.cantidad},${transaction.precio},${transaction.monto_bruto},${transaction.comision},${transaction.iva_comision},${transaction.monto_neto},${transaction.ganancia_perdida_realizada || ''}`);
      });
      sections.push('');
    }

    // Commissions detail
    if (taxData.commissions?.length > 0) {
      sections.push('# DETALLE DE COMISIONES');
      sections.push('Fecha,Símbolo,Tipo Operación,Monto Operación,Comisión Base,IVA 21%,Total Comisión');
      taxData.commissions.forEach((commission: any) => {
        sections.push(`${commission.fecha},${commission.simbolo},${commission.tipo_operacion},${commission.monto_operacion},${commission.comision_base},${commission.iva_21},${commission.total_comision}`);
      });
      sections.push('');
    }

    // Custody fees
    if (taxData.custodyFees?.length > 0) {
      sections.push('# COMISIONES DE CUSTODIA');
      sections.push('Mes,Valor Cartera,Porcentaje Custodia,Comisión Custodia,IVA Custodia,Total Custodia');
      taxData.custodyFees.forEach((fee: any) => {
        sections.push(`${fee.mes},${fee.valor_cartera},${fee.porcentaje_custodia},${fee.comision_custodia},${fee.iva_custodia},${fee.total_custodia}`);
      });
      sections.push('');
    }

    // Summary
    sections.push('# RESUMEN ANUAL');
    sections.push('Métrica,Valor');
    sections.push(`Año,${taxData.summary.año}`);
    sections.push(`Volumen Total Inversiones,${taxData.summary.volumen_total_inversiones}`);
    sections.push(`Total Comisiones,${taxData.summary.total_comisiones}`);
    sections.push(`Total Custodia,${taxData.summary.total_custodia}`);
    sections.push(`Total Costos,${taxData.summary.total_costos}`);
    sections.push(`Número Operaciones,${taxData.summary.numero_operaciones}`);
    sections.push(`Costo Promedio Operación,${taxData.summary.costo_promedio_operacion}`);
    sections.push(`Porcentaje Costos sobre Volumen,${taxData.summary.porcentaje_costos_sobre_volumen}`);

    return sections.join('\n');
  }
}

// Export utility functions
export function exportToCSV(data: any[], columns?: CSVColumn[], options?: CSVOptions): string {
  const exporter = new CSVExporter(options);
  if (columns) {
    exporter.setColumns(columns);
  }
  exporter.setData(data);
  return exporter.generate();
}

export function exportToCSVBuffer(data: any[], columns?: CSVColumn[], options?: CSVOptions): Buffer {
  const exporter = new CSVExporter(options);
  if (columns) {
    exporter.setColumns(columns);
  }
  exporter.setData(data);
  return exporter.generateBuffer();
}

export { CSVExporter };