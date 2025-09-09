import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { GoalProjectionSummary } from './GoalProjectionService';
import { FinancialGoal } from '../models/FinancialGoal';
import { SensitivityAnalysis } from './SensitivityAnalysisService';
import { GoalRecommendation } from './ClaudeGoalAdvisorService';

/* eslint-disable max-lines-per-function */

/**
 * Servicio de exportación de planes de inversión
 * Step 27.5: Exportación de planes de inversión
 */

export interface InvestmentPlan {
  id?: number;
  goal_id: number;
  plan_name: string;
  plan_type: 'STANDARD' | 'OPTIMIZED' | 'CUSTOM';
  generated_date: string;
  goal_details: FinancialGoal;
  projection_summary: GoalProjectionSummary;
  sensitivity_analysis?: SensitivityAnalysis;
  recommendations?: GoalRecommendation[];
  contribution_schedule: ContributionSchedule[];
  milestones: InvestmentMilestone[];
  executive_summary: {
    success_probability: number;
    estimated_completion: string;
    total_investment_needed: number;
    expected_final_value: number;
    key_risks: string[];
    key_opportunities: string[];
  };
  disclaimer: string;
}

export interface ContributionSchedule {
  month: number;
  date: string;
  recommended_amount: number;
  cumulative_amount: number;
  projected_value: number;
  notes?: string;
}

export interface InvestmentMilestone {
  milestone_name: string;
  target_date: string;
  target_value: number;
  progress_percentage: number;
  description: string;
  celebration_note?: string;
}

export interface ExportOptions {
  format: 'PDF' | 'EXCEL' | 'JSON';
  include_charts: boolean;
  include_sensitivity: boolean;
  include_recommendations: boolean;
  include_detailed_schedule: boolean;
  language: 'ES' | 'EN';
  template_style: 'PROFESSIONAL' | 'SIMPLE' | 'DETAILED';
}

export class GoalExportService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Genera un plan de inversión completo para exportar
   */
  async generateInvestmentPlan(
    goalId: number,
    projectionSummary: GoalProjectionSummary,
    planType: 'STANDARD' | 'OPTIMIZED' | 'CUSTOM' = 'STANDARD'
  ): Promise<InvestmentPlan> {
    const goal = projectionSummary.goal;
    const currentProjection = projectionSummary.current_projection;
    
    // Generar calendario de contribuciones
    const contributionSchedule = this.generateContributionSchedule(
      goal,
      currentProjection.result.monthlyProjections
    );

    // Generar hitos del plan
    const milestones = this.generateInvestmentMilestones(goal, contributionSchedule);

    // Resumen ejecutivo
    const executiveSummary = {
      success_probability: projectionSummary.current_projection.confidence_level,
      estimated_completion: goal.target_date || 'Por determinar',
      total_investment_needed: contributionSchedule.reduce((sum, c) => sum + c.recommended_amount, 0),
      expected_final_value: currentProjection.result.futureValue,
      key_risks: this.identifyKeyRisks(projectionSummary),
      key_opportunities: this.identifyKeyOpportunities(projectionSummary)
    };

    const plan: InvestmentPlan = {
      goal_id: goalId,
      plan_name: `Plan de Inversión - ${goal.name}`,
      plan_type: planType,
      generated_date: new Date().toISOString().split('T')[0],
      goal_details: goal,
      projection_summary: projectionSummary,
      contribution_schedule: contributionSchedule,
      milestones,
      executive_summary: executiveSummary,
      disclaimer: this.generateDisclaimer()
    };

    return plan;
  }

  /**
   * Exporta plan a PDF
   */
  async exportToPDF(
    plan: InvestmentPlan,
    options: ExportOptions = this.getDefaultExportOptions()
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `plan_inversion_${plan.goal_id}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Asegurar que existe el directorio exports
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Generar contenido HTML para convertir a PDF
    const htmlContent = this.generatePDFContent(plan, options);
    
    // Por ahora, guardar como HTML (en producción se usaría puppeteer o similar)
    const htmlPath = filePath.replace('.pdf', '.html');
    await fs.writeFile(htmlPath, htmlContent, 'utf8');

    // Simular generación de PDF
    const pdfContent = this.generatePDFPlaceholder(plan);
    await fs.writeFile(filePath, pdfContent);

    // Guardar registro en base de datos
    await this.saveExportRecord(plan.goal_id, fileName, 'PDF');

    return {
      filePath,
      fileName
    };
  }

  /**
   * Exporta plan a Excel
   */
  async exportToExcel(
    plan: InvestmentPlan,
    options: ExportOptions = this.getDefaultExportOptions()
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `plan_inversion_${plan.goal_id}_${Date.now()}.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Generar contenido Excel (CSV simplificado por ahora)
    const excelContent = this.generateExcelContent(plan, options);
    
    // Guardar como CSV por simplicidad (en producción se usaría xlsx library)
    const csvPath = filePath.replace('.xlsx', '.csv');
    await fs.writeFile(csvPath, excelContent, 'utf8');

    // Simular archivo Excel
    await fs.writeFile(filePath, 'Excel content placeholder');

    await this.saveExportRecord(plan.goal_id, fileName, 'EXCEL');

    return {
      filePath,
      fileName
    };
  }

  /**
   * Exporta plan a JSON
   */
  async exportToJSON(
    plan: InvestmentPlan,
    options: ExportOptions = this.getDefaultExportOptions()
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `plan_inversion_${plan.goal_id}_${Date.now()}.json`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Limpiar datos para export JSON
    const exportData = {
      ...plan,
      exported_at: new Date().toISOString(),
      export_options: options,
      version: '1.0'
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    await this.saveExportRecord(plan.goal_id, fileName, 'JSON');

    return {
      filePath,
      fileName
    };
  }

  /**
   * Genera calendario de contribuciones
   */
  private generateContributionSchedule(
    goal: FinancialGoal,
    monthlyProjections: any[]
  ): ContributionSchedule[] {
    const schedule: ContributionSchedule[] = [];
    const startDate = new Date();
    
    monthlyProjections.slice(0, 60).forEach((projection, index) => { // Máximo 5 años
      const contributionDate = new Date(startDate);
      contributionDate.setMonth(contributionDate.getMonth() + index + 1);
      
      schedule.push({
        month: index + 1,
        date: contributionDate.toISOString().split('T')[0],
        recommended_amount: projection.contribution,
        cumulative_amount: projection.cumulativeContributions,
        projected_value: projection.capitalEnding,
        notes: index === 0 ? 'Primer aporte del plan' : undefined
      });
    });

    return schedule;
  }

  /**
   * Genera hitos de inversión
   */
  private generateInvestmentMilestones(
    goal: FinancialGoal,
    schedule: ContributionSchedule[]
  ): InvestmentMilestone[] {
    const milestones: InvestmentMilestone[] = [];
    const targetValue = goal.target_amount || 100000;
    
    // Hitos en 25%, 50%, 75%, 100%
    [25, 50, 75, 100].forEach(percentage => {
      const milestoneValue = (targetValue * percentage) / 100;
      const milestoneSchedule = schedule.find(s => s.projected_value >= milestoneValue);
      
      if (milestoneSchedule) {
        milestones.push({
          milestone_name: `${percentage}% del Objetivo`,
          target_date: milestoneSchedule.date,
          target_value: milestoneValue,
          progress_percentage: percentage,
          description: `Alcanzar ${percentage}% del objetivo financiero`,
          celebration_note: percentage === 100 ? '¡Objetivo completado!' : `¡${percentage}% completado!`
        });
      }
    });

    return milestones;
  }

  /**
   * Genera contenido HTML para PDF
   */
  // eslint-disable-next-line max-lines-per-function
  private generatePDFContent(plan: InvestmentPlan, options: ExportOptions): string {
    const { goal_details, executive_summary, contribution_schedule, milestones } = plan;
    
    return `
<!DOCTYPE html>
<html lang="${options.language.toLowerCase()}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${plan.plan_name}</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
        }
        .header { 
            text-align: center; 
            border-bottom: 2px solid #2c3e50; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
        }
        .section h2 { 
            color: #2c3e50; 
            border-left: 4px solid #3498db; 
            padding-left: 15px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .summary-card h3 {
            margin-top: 0;
            color: #2c3e50;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left;
        }
        th { 
            background-color: #3498db; 
            color: white;
        }
        .milestone {
            background: #e8f6f3;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #27ae60;
        }
        .disclaimer {
            background: #fdf2e9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f39c12;
            font-size: 0.9em;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${plan.plan_name}</h1>
        <p><strong>Generado el:</strong> ${plan.generated_date}</p>
        <p><strong>Tipo de Plan:</strong> ${plan.plan_type}</p>
    </div>

    <div class="section">
        <h2>📊 Resumen Ejecutivo</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <h3>Probabilidad de Éxito</h3>
                <p style="font-size: 1.5em; color: #27ae60;">${executive_summary.success_probability}%</p>
            </div>
            <div class="summary-card">
                <h3>Valor Final Esperado</h3>
                <p style="font-size: 1.5em; color: #2c3e50;">$${executive_summary.expected_final_value.toLocaleString()}</p>
            </div>
            <div class="summary-card">
                <h3>Inversión Total Requerida</h3>
                <p style="font-size: 1.5em; color: #3498db;">$${executive_summary.total_investment_needed.toLocaleString()}</p>
            </div>
            <div class="summary-card">
                <h3>Fecha Estimada de Completación</h3>
                <p style="font-size: 1.2em; color: #8e44ad;">${executive_summary.estimated_completion}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🎯 Detalles del Objetivo</h2>
        <table>
            <tr><th>Aspecto</th><th>Detalle</th></tr>
            <tr><td><strong>Objetivo</strong></td><td>${goal_details.name}</td></tr>
            <tr><td><strong>Tipo</strong></td><td>${goal_details.type}</td></tr>
            <tr><td><strong>Monto Objetivo</strong></td><td>$${goal_details.target_amount?.toLocaleString()}</td></tr>
            <tr><td><strong>Contribución Mensual</strong></td><td>$${goal_details.monthly_contribution}</td></tr>
            <tr><td><strong>Retorno Esperado</strong></td><td>${goal_details.expected_return_rate}% anual</td></tr>
            <tr><td><strong>Fecha Objetivo</strong></td><td>${goal_details.target_date}</td></tr>
        </table>
    </div>

    ${options.include_detailed_schedule ? `
    <div class="section">
        <h2>📅 Calendario de Contribuciones (Primeros 12 Meses)</h2>
        <table>
            <thead>
                <tr>
                    <th>Mes</th>
                    <th>Fecha</th>
                    <th>Aporte Recomendado</th>
                    <th>Acumulado</th>
                    <th>Valor Proyectado</th>
                </tr>
            </thead>
            <tbody>
                ${contribution_schedule.slice(0, 12).map(contribution => `
                    <tr>
                        <td>${contribution.month}</td>
                        <td>${contribution.date}</td>
                        <td>$${contribution.recommended_amount.toLocaleString()}</td>
                        <td>$${contribution.cumulative_amount.toLocaleString()}</td>
                        <td>$${contribution.projected_value.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="section">
        <h2>🏆 Hitos del Plan</h2>
        ${milestones.map(milestone => `
            <div class="milestone">
                <h3>${milestone.milestone_name}</h3>
                <p><strong>Fecha objetivo:</strong> ${milestone.target_date}</p>
                <p><strong>Valor objetivo:</strong> $${milestone.target_value.toLocaleString()}</p>
                <p>${milestone.description}</p>
                ${milestone.celebration_note ? `<p style="color: #27ae60;"><em>${milestone.celebration_note}</em></p>` : ''}
            </div>
        `).join('')}
    </div>

    <div class="disclaimer">
        <h3>⚠️ Advertencia Legal</h3>
        <p>${plan.disclaimer}</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Genera contenido para Excel (CSV)
   */
  private generateExcelContent(plan: InvestmentPlan): string {
    let csv = 'Plan de Inversión\n';
    csv += `Objetivo,${plan.goal_details.name}\n`;
    csv += `Monto Objetivo,$${plan.goal_details.target_amount}\n`;
    csv += `Fecha Objetivo,${plan.goal_details.target_date}\n\n`;
    
    csv += 'Calendario de Contribuciones\n';
    csv += 'Mes,Fecha,Aporte,Acumulado,Valor Proyectado\n';
    
    plan.contribution_schedule.slice(0, 24).forEach(contribution => {
      csv += `${contribution.month},${contribution.date},$${contribution.recommended_amount},$${contribution.cumulative_amount},$${contribution.projected_value}\n`;
    });

    return csv;
  }

  /**
   * Métodos auxiliares
   */
  private identifyKeyRisks(summary: GoalProjectionSummary): string[] {
    const risks: string[] = [];
    
    if (summary.dynamic_adjustments.volatility_factor > 25) {
      risks.push('Alta volatilidad del mercado');
    }
    
    if (summary.performance_metrics.actual_vs_projected < -5) {
      risks.push('Rendimiento por debajo de las expectativas');
    }
    
    if (summary.current_projection.confidence_level < 70) {
      risks.push('Baja confianza en las proyecciones actuales');
    }
    
    return risks.length > 0 ? risks : ['Riesgos moderados identificados'];
  }

  private identifyKeyOpportunities(summary: GoalProjectionSummary): string[] {
    const opportunities: string[] = [];
    
    if (summary.performance_metrics.actual_vs_projected > 5) {
      opportunities.push('Rendimiento superior a las expectativas');
    }
    
    if (summary.current_projection.confidence_level > 80) {
      opportunities.push('Alta confianza en alcanzar el objetivo');
    }
    
    opportunities.push('Posibilidad de adelantar la fecha objetivo con aportes adicionales');
    
    return opportunities;
  }

  private generateDisclaimer(): string {
    return `Este plan de inversión es una proyección basada en supuestos y datos históricos. Los rendimientos pasados no garantizan resultados futuros. Las inversiones conllevan riesgos y pueden resultar en pérdidas. Se recomienda consultar con un asesor financiero calificado antes de tomar decisiones de inversión. Las proyecciones pueden variar según las condiciones del mercado, la inflación y otros factores económicos.`;
  }

  private getDefaultExportOptions(): ExportOptions {
    return {
      format: 'PDF',
      include_charts: true,
      include_sensitivity: true,
      include_recommendations: true,
      include_detailed_schedule: true,
      language: 'ES',
      template_style: 'PROFESSIONAL'
    };
  }

  private generatePDFPlaceholder(plan: InvestmentPlan): string {
    return `PDF Plan de Inversión - ${plan.goal_details.name}
Generado: ${plan.generated_date}
Objetivo: $${plan.goal_details.target_amount}
Probabilidad de éxito: ${plan.executive_summary.success_probability}%

[Contenido PDF completo sería generado aquí con puppeteer o similar]`;
  }

  private async saveExportRecord(goalId: number, fileName: string, format: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO investment_plans (
        goal_id, plan_name, plan_type, parameters, projection_data,
        contribution_schedule, export_format, last_exported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run([
      goalId,
      `Plan exportado - ${fileName}`,
      'STANDARD',
      '{}',
      '{}',
      '[]',
      format
    ]);
  }
}