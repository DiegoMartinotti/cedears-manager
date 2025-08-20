import { api } from './api';
import {
  CostDashboard,
  ImpactAnalysis,
  CommissionVsGainComparison,
  AnnualCostReport,
  ExportOptions,
  ExportResult,
  ExportHistory,
  DateRange,
  ReportType,
  ApiResponse
} from '../types/reports';

class ReportsService {
  private baseUrl = '/api/v1/reports';

  async getDashboard(dateRange: DateRange): Promise<CostDashboard> {
    try {
      const response = await api.get<ApiResponse<CostDashboard>>(`${this.baseUrl}/dashboard`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch dashboard');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching cost dashboard:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch cost dashboard');
    }
  }

  async getImpactAnalysis(dateRange: DateRange): Promise<ImpactAnalysis> {
    try {
      const response = await api.get<ApiResponse<ImpactAnalysis>>(`${this.baseUrl}/impact-analysis`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch impact analysis');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching impact analysis:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch impact analysis');
    }
  }

  async getCommissionComparison(dateRange: DateRange): Promise<CommissionVsGainComparison> {
    try {
      const response = await api.get<ApiResponse<CommissionVsGainComparison>>(`${this.baseUrl}/commission-comparison`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch commission comparison');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching commission comparison:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch commission comparison');
    }
  }

  async getAnnualReport(year: number): Promise<AnnualCostReport> {
    try {
      const response = await api.get<ApiResponse<AnnualCostReport>>(`${this.baseUrl}/annual/${year}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch annual report');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching annual report:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch annual report');
    }
  }

  async exportReport(options: ExportOptions, reportType: ReportType): Promise<ExportResult> {
    try {
      const response = await api.post<ApiResponse<ExportResult>>(`${this.baseUrl}/export`, {
        reportType,
        exportOptions: options
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to start export');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error starting export:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to start export');
    }
  }

  async getExportHistory(limit: number = 50): Promise<ExportHistory> {
    try {
      const response = await api.get<ApiResponse<ExportHistory>>(`${this.baseUrl}/export/history`, {
        params: { limit }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch export history');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching export history:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch export history');
    }
  }

  async downloadExport(exportId: string): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseUrl}/export/${exportId}/download`, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error: any) {
      console.error('Error downloading export:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to download export');
    }
  }

  async getTaxExportData(year: number): Promise<any> {
    try {
      const response = await api.get<ApiResponse<any>>(`${this.baseUrl}/tax-export/${year}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch tax export data');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching tax export data:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch tax export data');
    }
  }

  async getExportStatistics(): Promise<any> {
    try {
      const response = await api.get<ApiResponse<any>>(`${this.baseUrl}/export/statistics`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch export statistics');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching export statistics:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch export statistics');
    }
  }

  async cleanupExpiredExports(): Promise<{ deletedExports: number; cleanupDate: string }> {
    try {
      const response = await api.delete<ApiResponse<{ deletedExports: number; cleanupDate: string }>>(`${this.baseUrl}/export/cleanup`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to cleanup exports');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error cleaning up exports:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to cleanup exports');
    }
  }

  async checkReportsHealth(): Promise<any> {
    try {
      const response = await api.get<ApiResponse<any>>(`${this.baseUrl}/health`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Reports service unhealthy');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Error checking reports health:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to check reports health');
    }
  }

  // Utility methods
  formatCurrency(amount: number, currency: string = 'ARS'): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatNumber(value: number, decimals: number = 0): string {
    return new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  getAlertColor(severity: 'low' | 'medium' | 'high'): string {
    const colors = {
      low: 'text-blue-600 bg-blue-100',
      medium: 'text-yellow-600 bg-yellow-100',
      high: 'text-red-600 bg-red-100'
    };
    return colors[severity];
  }

  getPriorityColor(priority: 'low' | 'medium' | 'high'): string {
    const colors = {
      low: 'text-gray-600 bg-gray-100',
      medium: 'text-orange-600 bg-orange-100',
      high: 'text-red-600 bg-red-100'
    };
    return colors[priority];
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'generating': 'text-blue-600 bg-blue-100',
      'ready': 'text-green-600 bg-green-100',
      'expired': 'text-gray-600 bg-gray-100',
      'error': 'text-red-600 bg-red-100',
      'profitable': 'text-green-600 bg-green-100',
      'unprofitable': 'text-red-600 bg-red-100',
      'break_even': 'text-yellow-600 bg-yellow-100',
      'open': 'text-blue-600 bg-blue-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  }

  getTrendIcon(trend: 'improving' | 'declining' | 'stable' | 'increasing' | 'decreasing'): string {
    const icons = {
      improving: '📈',
      increasing: '📈',
      declining: '📉',
      decreasing: '📉',
      stable: '➡️'
    };
    return icons[trend] || '➡️';
  }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async pollExportStatus(exportId: string, maxAttempts: number = 30, intervalMs: number = 2000): Promise<ExportResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const history = await this.getExportHistory(50);
      const exportResult = history.exports.find(exp => exp.exportId === exportId);
      
      if (!exportResult) {
        throw new Error('Export not found');
      }

      if (exportResult.status === 'ready') {
        return exportResult;
      }

      if (exportResult.status === 'error') {
        throw new Error(exportResult.error || 'Export failed');
      }

      if (exportResult.status === 'expired') {
        throw new Error('Export expired');
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error('Export timeout - taking longer than expected');
  }

  // Default date ranges
  getDefaultDateRanges(): { [key: string]: DateRange } {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    const lastMonth = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0);
    
    const last3Months = new Date(currentYear, currentMonth - 3, 1);
    const last6Months = new Date(currentYear, currentMonth - 6, 1);
    const yearStart = new Date(currentYear, 0, 1);
    const lastYear = new Date(currentYear - 1, 0, 1);
    const lastYearEnd = new Date(currentYear - 1, 11, 31);

    return {
      'last_month': {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0]
      },
      'last_3_months': {
        startDate: last3Months.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'last_6_months': {
        startDate: last6Months.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'current_year': {
        startDate: yearStart.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      'last_year': {
        startDate: lastYear.toISOString().split('T')[0],
        endDate: lastYearEnd.toISOString().split('T')[0]
      }
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;