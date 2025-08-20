import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import reportsService from '../services/reportsService';
import {
  CostDashboard,
  ImpactAnalysis,
  CommissionVsGainComparison,
  AnnualCostReport,
  ExportOptions,
  ExportResult,
  ExportHistory,
  DateRange,
  ReportType
} from '../types/reports';

// Query keys
export const REPORTS_QUERY_KEYS = {
  all: ['reports'] as const,
  dashboard: (dateRange: DateRange) => [...REPORTS_QUERY_KEYS.all, 'dashboard', dateRange] as const,
  impactAnalysis: (dateRange: DateRange) => [...REPORTS_QUERY_KEYS.all, 'impact-analysis', dateRange] as const,
  commissionComparison: (dateRange: DateRange) => [...REPORTS_QUERY_KEYS.all, 'commission-comparison', dateRange] as const,
  annualReport: (year: number) => [...REPORTS_QUERY_KEYS.all, 'annual-report', year] as const,
  exportHistory: (limit?: number) => [...REPORTS_QUERY_KEYS.all, 'export-history', limit] as const,
  exportStatistics: () => [...REPORTS_QUERY_KEYS.all, 'export-statistics'] as const,
  taxExport: (year: number) => [...REPORTS_QUERY_KEYS.all, 'tax-export', year] as const,
  health: () => [...REPORTS_QUERY_KEYS.all, 'health'] as const,
};

// Cost Dashboard Hook
export function useCostDashboard(dateRange: DateRange) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.dashboard(dateRange),
    queryFn: () => reportsService.getDashboard(dateRange),
    enabled: !!(dateRange.startDate && dateRange.endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
}

// Impact Analysis Hook
export function useImpactAnalysis(dateRange: DateRange) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.impactAnalysis(dateRange),
    queryFn: () => reportsService.getImpactAnalysis(dateRange),
    enabled: !!(dateRange.startDate && dateRange.endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
}

// Commission Comparison Hook
export function useCommissionComparison(dateRange: DateRange) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.commissionComparison(dateRange),
    queryFn: () => reportsService.getCommissionComparison(dateRange),
    enabled: !!(dateRange.startDate && dateRange.endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
}

// Annual Report Hook
export function useAnnualReport(year: number) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.annualReport(year),
    queryFn: () => reportsService.getAnnualReport(year),
    enabled: !!year && year >= 2020 && year <= new Date().getFullYear(),
    staleTime: 30 * 60 * 1000, // 30 minutes (annual reports change less frequently)
    retry: 2,
    refetchOnWindowFocus: false
  });
}

// Export History Hook
export function useExportHistory(limit: number = 50) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.exportHistory(limit),
    queryFn: () => reportsService.getExportHistory(limit),
    staleTime: 30 * 1000, // 30 seconds (exports change frequently)
    retry: 2,
    refetchOnWindowFocus: true
  });
}

// Export Statistics Hook
export function useExportStatistics() {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.exportStatistics(),
    queryFn: () => reportsService.getExportStatistics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
}

// Tax Export Data Hook
export function useTaxExportData(year: number) {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.taxExport(year),
    queryFn: () => reportsService.getTaxExportData(year),
    enabled: !!year && year >= 2020 && year <= new Date().getFullYear(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    refetchOnWindowFocus: false
  });
}

// Reports Health Hook
export function useReportsHealth() {
  return useQuery({
    queryKey: REPORTS_QUERY_KEYS.health(),
    queryFn: () => reportsService.checkReportsHealth(),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 3,
    refetchOnWindowFocus: true
  });
}

// Export Report Mutation
export function useExportReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ options, reportType }: { options: ExportOptions; reportType: ReportType }) =>
      reportsService.exportReport(options, reportType),
    onSuccess: () => {
      // Invalidate export history to show the new export
      queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEYS.exportHistory() });
      queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEYS.exportStatistics() });
    },
    onError: (error) => {
      console.error('Export failed:', error);
    }
  });
}

// Download Export Mutation
export function useDownloadExport() {
  return useMutation({
    mutationFn: (exportId: string) => reportsService.downloadExport(exportId),
    onSuccess: (blob, exportId) => {
      // Auto-download the file
      const filename = `export_${exportId}.csv`; // Default filename
      reportsService.downloadBlob(blob, filename);
    },
    onError: (error) => {
      console.error('Download failed:', error);
    }
  });
}

// Cleanup Expired Exports Mutation
export function useCleanupExpiredExports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => reportsService.cleanupExpiredExports(),
    onSuccess: () => {
      // Refresh export-related queries
      queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEYS.exportHistory() });
      queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEYS.exportStatistics() });
    },
    onError: (error) => {
      console.error('Cleanup failed:', error);
    }
  });
}

// Combined Reports Hook for Dashboard
export function useReportsDashboard(dateRange: DateRange) {
  const costDashboard = useCostDashboard(dateRange);
  const impactAnalysis = useImpactAnalysis(dateRange);
  const commissionComparison = useCommissionComparison(dateRange);
  const exportHistory = useExportHistory(10); // Last 10 exports
  
  return {
    costDashboard,
    impactAnalysis,
    commissionComparison,
    exportHistory,
    isLoading: costDashboard.isLoading || impactAnalysis.isLoading || commissionComparison.isLoading,
    hasError: costDashboard.isError || impactAnalysis.isError || commissionComparison.isError,
    errors: {
      costDashboard: costDashboard.error,
      impactAnalysis: impactAnalysis.error,
      commissionComparison: commissionComparison.error
    }
  };
}

// Export with Status Polling Hook
export function useExportWithPolling() {
  const [pollingExportId, setPollingExportId] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);
  const exportMutation = useExportReport();
  const downloadMutation = useDownloadExport();

  // Poll export status
  const pollQuery = useQuery({
    queryKey: ['export-poll', pollingExportId],
    queryFn: async () => {
      if (!pollingExportId) return null;
      
      const history = await reportsService.getExportHistory(50);
      const exportResult = history.exports.find(exp => exp.exportId === pollingExportId);
      
      if (!exportResult) {
        throw new Error('Export not found');
      }

      if (exportResult.status === 'ready') {
        // Auto-download when ready
        const blob = await reportsService.downloadExport(pollingExportId);
        reportsService.downloadBlob(blob, exportResult.filename);
        setPollingExportId(null);
        setPollAttempts(0);
        return exportResult;
      }

      if (exportResult.status === 'error') {
        setPollingExportId(null);
        setPollAttempts(0);
        throw new Error(exportResult.error || 'Export failed');
      }

      if (exportResult.status === 'expired') {
        setPollingExportId(null);
        setPollAttempts(0);
        throw new Error('Export expired');
      }

      // Increment poll attempts
      setPollAttempts(prev => prev + 1);
      
      // Stop polling after too many attempts
      if (pollAttempts >= 30) {
        setPollingExportId(null);
        setPollAttempts(0);
        throw new Error('Export timeout');
      }

      return exportResult;
    },
    enabled: !!pollingExportId,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: false
  });

  const exportAndDownload = async (options: ExportOptions, reportType: ReportType) => {
    try {
      const result = await exportMutation.mutateAsync({ options, reportType });
      setPollingExportId(result.exportId);
      setPollAttempts(0);
      return result;
    } catch (error) {
      setPollingExportId(null);
      setPollAttempts(0);
      throw error;
    }
  };

  return {
    exportAndDownload,
    isExporting: exportMutation.isPending || !!pollingExportId,
    exportProgress: pollingExportId ? `Procesando... (${Math.min(pollAttempts * 3, 99)}%)` : null,
    error: exportMutation.error || pollQuery.error,
    reset: () => {
      setPollingExportId(null);
      setPollAttempts(0);
      exportMutation.reset();
    }
  };
}

// Date Range Management Hook
export function useDateRangeManager(initialRange?: DateRange) {
  const [dateRange, setDateRange] = useState<DateRange>(
    initialRange || {
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
      endDate: new Date().toISOString().split('T')[0] // Today
    }
  );

  const presetRanges = reportsService.getDefaultDateRanges();

  const setPresetRange = (preset: keyof typeof presetRanges) => {
    setDateRange(presetRanges[preset]);
  };

  const setCustomRange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const isValidRange = () => {
    return dateRange.startDate && dateRange.endDate && dateRange.startDate <= dateRange.endDate;
  };

  return {
    dateRange,
    setDateRange,
    setPresetRange,
    setCustomRange,
    isValidRange,
    presetRanges
  };
}

// Reports Cache Management
export function useReportsCache() {
  const queryClient = useQueryClient();

  const clearAllReportsCache = () => {
    queryClient.removeQueries({ queryKey: REPORTS_QUERY_KEYS.all });
  };

  const clearReportCache = (reportType: ReportType, identifier?: DateRange | number) => {
    switch (reportType) {
      case 'dashboard':
        if (identifier && 'startDate' in identifier) {
          queryClient.removeQueries({ queryKey: REPORTS_QUERY_KEYS.dashboard(identifier) });
        }
        break;
      case 'impact_analysis':
        if (identifier && 'startDate' in identifier) {
          queryClient.removeQueries({ queryKey: REPORTS_QUERY_KEYS.impactAnalysis(identifier) });
        }
        break;
      case 'commission_comparison':
        if (identifier && 'startDate' in identifier) {
          queryClient.removeQueries({ queryKey: REPORTS_QUERY_KEYS.commissionComparison(identifier) });
        }
        break;
      case 'annual_report':
        if (identifier && typeof identifier === 'number') {
          queryClient.removeQueries({ queryKey: REPORTS_QUERY_KEYS.annualReport(identifier) });
        }
        break;
    }
  };

  const refreshAllReports = () => {
    queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEYS.all });
  };

  const getCacheStatus = () => {
    const cache = queryClient.getQueryCache();
    const reportQueries = cache.findAll({ queryKey: REPORTS_QUERY_KEYS.all });
    
    return {
      totalQueries: reportQueries.length,
      staleQueries: reportQueries.filter(query => query.isStale()).length,
      loadingQueries: reportQueries.filter(query => query.state.status === 'pending').length,
      errorQueries: reportQueries.filter(query => query.state.status === 'error').length
    };
  };

  return {
    clearAllReportsCache,
    clearReportCache,
    refreshAllReports,
    getCacheStatus
  };
}