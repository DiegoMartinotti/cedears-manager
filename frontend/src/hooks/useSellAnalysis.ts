import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import SellAnalysisService, {
  SellThresholds
} from '../services/sellAnalysisService';

// Query keys
export const SELL_ANALYSIS_KEYS = {
  all: ['sell-analysis'] as const,
  overview: () => [...SELL_ANALYSIS_KEYS.all, 'overview'] as const,
  alerts: () => [...SELL_ANALYSIS_KEYS.all, 'alerts'] as const,
  position: (id: number) => [...SELL_ANALYSIS_KEYS.all, 'position', id] as const,
  positionHistory: (id: number) => [...SELL_ANALYSIS_KEYS.all, 'position-history', id] as const,
  positionAlerts: (id: number) => [...SELL_ANALYSIS_KEYS.all, 'position-alerts', id] as const,
  stats: () => [...SELL_ANALYSIS_KEYS.all, 'stats'] as const,
};

/**
 * Hook to fetch overview of all positions with sell recommendations
 */
export function useSellAnalysisOverview() {
  return useQuery({
    queryKey: SELL_ANALYSIS_KEYS.overview(),
    queryFn: SellAnalysisService.getOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to fetch active sell alerts
 */
export function useActiveAlerts() {
  return useQuery({
    queryKey: SELL_ANALYSIS_KEYS.alerts(),
    queryFn: SellAnalysisService.getActiveAlerts,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to fetch analysis for a specific position
 */
export function usePositionAnalysis(positionId: number, thresholds?: SellThresholds) {
  return useQuery({
    queryKey: [...SELL_ANALYSIS_KEYS.position(positionId), thresholds],
    queryFn: () => SellAnalysisService.getPositionAnalysis(positionId, thresholds),
    enabled: !!positionId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

/**
 * Hook to fetch analysis history for a specific position
 */
export function usePositionHistory(positionId: number) {
  return useQuery({
    queryKey: SELL_ANALYSIS_KEYS.positionHistory(positionId),
    queryFn: () => SellAnalysisService.getPositionHistory(positionId),
    enabled: !!positionId,
    staleTime: 10 * 60 * 1000, // 10 minutes (history doesn't change often)
  });
}

/**
 * Hook to fetch alerts for a specific position
 */
export function usePositionAlerts(positionId: number) {
  return useQuery({
    queryKey: SELL_ANALYSIS_KEYS.positionAlerts(positionId),
    queryFn: () => SellAnalysisService.getPositionAlerts(positionId),
    enabled: !!positionId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch service statistics
 */
export function useSellAnalysisStats() {
  return useQuery({
    queryKey: SELL_ANALYSIS_KEYS.stats(),
    queryFn: SellAnalysisService.getServiceStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to trigger manual analysis of all positions
 */
export function useCalculateAllPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (thresholds?: SellThresholds) => 
      SellAnalysisService.calculateAllPositions(thresholds),
    onSuccess: (data) => {
      // Invalidate and refetch overview and alerts
      queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.overview() });
      queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.alerts() });
      
      toast.success(
        `Análisis completado: ${data.summary.positions_analyzed} posiciones analizadas, ${data.summary.total_alerts_generated} alertas generadas`
      );
    },
    onError: (error: any) => {
      console.error('Error calculating positions:', error);
      toast.error('Error al calcular análisis de venta');
    },
  });
}

/**
 * Hook to simulate sell scenario
 */
export function useSimulateSell() {
  return useMutation({
    mutationFn: ({ positionId, sellPrice }: { positionId: number; sellPrice?: number }) =>
      SellAnalysisService.simulateSell(positionId, sellPrice),
    onError: (error: any) => {
      console.error('Error simulating sell:', error);
      toast.error('Error al simular venta');
    },
  });
}

/**
 * Hook to acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: number) => SellAnalysisService.acknowledgeAlert(alertId),
    onSuccess: (data) => {
      // Invalidate alerts queries
      queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.alerts() });
      queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.overview() });
      
      // Also invalidate position-specific alerts
      queryClient.invalidateQueries({ 
        queryKey: SELL_ANALYSIS_KEYS.positionAlerts(data.position_id) 
      });

      toast.success('Alerta confirmada');
    },
    onError: (error: any) => {
      console.error('Error acknowledging alert:', error);
      toast.error('Error al confirmar alerta');
    },
  });
}

/**
 * Hook to trigger data cleanup
 */
export function useCleanupData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: SellAnalysisService.triggerCleanup,
    onSuccess: (data) => {
      // Invalidate all queries after cleanup
      queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.all });
      
      toast.success(
        `Limpieza completada: ${data.analysis_deleted} análisis y ${data.alerts_deleted} alertas eliminadas`
      );
    },
    onError: (error: any) => {
      console.error('Error during cleanup:', error);
      toast.error('Error durante la limpieza');
    },
  });
}

/**
 * Utility hook to refresh all sell analysis data
 */
export function useRefreshSellAnalysis() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.all });
    toast.success('Datos de análisis actualizados');
  };

  const refreshOverview = () => {
    queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.overview() });
  };

  const refreshAlerts = () => {
    queryClient.invalidateQueries({ queryKey: SELL_ANALYSIS_KEYS.alerts() });
  };

  return {
    refreshAll,
    refreshOverview,
    refreshAlerts,
  };
}

/**
 * Combined hook for the main sell analysis dashboard
 */
export function useSellAnalysisDashboard() {
  const overview = useSellAnalysisOverview();
  const alerts = useActiveAlerts();
  const stats = useSellAnalysisStats();
  const calculateAll = useCalculateAllPositions();
  const acknowledgeAlert = useAcknowledgeAlert();
  const refresh = useRefreshSellAnalysis();

  return {
    overview,
    alerts,
    stats,
    calculateAll,
    acknowledgeAlert,
    refresh,
    isLoading: overview.isLoading || alerts.isLoading,
    error: overview.error || alerts.error,
  };
}

/**
 * Hook for position-specific sell analysis
 */
export function usePositionSellAnalysis(positionId: number, thresholds?: SellThresholds) {
  const analysis = usePositionAnalysis(positionId, thresholds);
  const history = usePositionHistory(positionId);
  const positionAlerts = usePositionAlerts(positionId);
  const simulate = useSimulateSell();
  const acknowledgeAlert = useAcknowledgeAlert();

  return {
    analysis,
    history,
    alerts: positionAlerts,
    simulate,
    acknowledgeAlert,
    isLoading: analysis.isLoading || history.isLoading || positionAlerts.isLoading,
    error: analysis.error || history.error || positionAlerts.error,
  };
}

export default {
  useSellAnalysisOverview,
  useActiveAlerts,
  usePositionAnalysis,
  usePositionHistory,
  usePositionAlerts,
  useSellAnalysisStats,
  useCalculateAllPositions,
  useSimulateSell,
  useAcknowledgeAlert,
  useCleanupData,
  useRefreshSellAnalysis,
  useSellAnalysisDashboard,
  usePositionSellAnalysis,
};