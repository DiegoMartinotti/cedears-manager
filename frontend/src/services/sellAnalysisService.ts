import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Types for API responses
export interface SellAnalysisData {
  id?: number;
  position_id: number;
  instrument_id: number;
  ticker: string;
  current_price: number;
  avg_buy_price: number;
  quantity: number;
  gross_profit_pct: number;
  net_profit_pct: number;
  gross_profit_ars: number;
  net_profit_ars: number;
  commission_impact: number;
  inflation_adjustment: number;
  sell_score: number;
  technical_score: number;
  fundamental_score: number;
  profit_score: number;
  time_score: number;
  market_score: number;
  recommendation: 'HOLD' | 'TAKE_PROFIT_1' | 'TAKE_PROFIT_2' | 'STOP_LOSS' | 'TRAILING_STOP';
  recommendation_reason: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  days_held: number;
  analysis_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface SellAlertData {
  id?: number;
  position_id: number;
  instrument_id: number;
  ticker: string;
  alert_type: 'TAKE_PROFIT_1' | 'TAKE_PROFIT_2' | 'STOP_LOSS' | 'TRAILING_STOP' | 'TIME_BASED' | 'TECHNICAL';
  threshold_value: number;
  current_value: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  is_active: boolean;
  created_at?: string;
  acknowledged_at?: string | null;
}

export interface SellThresholds {
  take_profit_1?: number;
  take_profit_2?: number;
  stop_loss?: number;
  trailing_stop_trigger?: number;
  trailing_stop_distance?: number;
  time_based_days?: number;
}

export interface PositionSellAnalysis {
  position: {
    id: number;
    instrument_id: number;
    ticker: string;
    quantity: number;
    avg_price: number;
    total_invested: number;
    days_held: number;
  };
  current: {
    price: number;
    total_value: number;
    gross_profit: number;
    gross_profit_pct: number;
  };
  adjusted: {
    inflation_factor: number;
    adjusted_cost: number;
    net_profit: number;
    net_profit_pct: number;
    commission_to_sell: number;
    final_net_amount: number;
  };
  analysis: {
    sell_score: number;
    score_components: {
      technicalScore: number;
      fundamentalScore: number;
      profitScore: number;
      timeScore: number;
      marketScore: number;
    };
    recommendation: SellAnalysisData['recommendation'];
    risk_level: SellAnalysisData['risk_level'];
    reason: string;
  };
  alerts: SellAlertData[];
  technical_indicators?: {
    rsi: number;
    macd_signal: 'BUY' | 'SELL' | 'NEUTRAL';
    sma_trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    volume_trend: 'HIGH' | 'NORMAL' | 'LOW';
  };
}

export interface SellSimulation {
  position_id: number;
  simulation_price: number | 'current_market';
  results: {
    gross_proceeds: number;
    commission_cost: number;
    net_proceeds: number;
    total_invested: number;
    inflation_adjusted_cost: number;
    gross_profit: number;
    net_profit: number;
    gross_profit_pct: number;
    net_profit_pct: number;
    break_even_price: number;
  };
  recommendations: {
    profitable: boolean;
    profit_margin: number;
    decision_suggestion: 'STRONG_SELL' | 'CONSIDER_SELL' | 'WEAK_SELL' | 'HOLD';
  };
}

export interface SellAnalysisOverview {
  overview: {
    total_positions: number;
    total_portfolio_value: number;
    total_net_profit: number;
    avg_sell_score: number;
    active_alerts: number;
  };
  recommendations: Record<string, PositionSellAnalysis[]>;
  critical_alerts: SellAlertData[];
  top_opportunities: PositionSellAnalysis[];
  statistics: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: any;
  error?: string;
  message?: string;
}

// API client configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[SellAnalysisService] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[SellAnalysisService] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[SellAnalysisService] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class SellAnalysisService {
  /**
   * Get all active sell alerts
   */
  static async getActiveAlerts(): Promise<SellAlertData[]> {
    try {
      const response = await apiClient.get<ApiResponse<SellAlertData[]>>('/sell-analysis/alerts');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      throw error;
    }
  }

  /**
   * Get detailed sell analysis for a specific position
   */
  static async getPositionAnalysis(
    positionId: number,
    thresholds?: SellThresholds
  ): Promise<PositionSellAnalysis> {
    try {
      const response = await apiClient.get<ApiResponse<PositionSellAnalysis>>(
        `/sell-analysis/positions/${positionId}`,
        { data: { thresholds } }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching position analysis for ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Trigger manual analysis of all positions
   */
  static async calculateAllPositions(thresholds?: SellThresholds): Promise<{
    analyses: PositionSellAnalysis[];
    summary: {
      positions_analyzed: number;
      recommendations_breakdown: Record<string, number>;
      total_alerts_generated: number;
      analysis_duration_ms: number;
    };
  }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/sell-analysis/calculate', {
        thresholds
      });
      return response.data.data;
    } catch (error) {
      console.error('Error calculating all positions:', error);
      throw error;
    }
  }

  /**
   * Get analysis history for a specific position
   */
  static async getPositionHistory(positionId: number): Promise<{
    position_id: number;
    analysis_history: SellAnalysisData[];
    alerts_history: SellAlertData[];
    summary: {
      total_analyses: number;
      total_alerts: number;
      active_alerts: number;
      date_range: {
        first_analysis: string | null;
        last_analysis: string | null;
      };
    };
  }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/sell-analysis/history/${positionId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching position history for ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Simulate sell scenario for a position
   */
  static async simulateSell(positionId: number, sellPrice?: number): Promise<SellSimulation> {
    try {
      const response = await apiClient.post<ApiResponse<SellSimulation>>('/sell-analysis/simulate', {
        position_id: positionId,
        sell_price: sellPrice
      });
      return response.data.data;
    } catch (error) {
      console.error(`Error simulating sell for position ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge a specific alert
   */
  static async acknowledgeAlert(alertId: number): Promise<SellAlertData> {
    try {
      const response = await apiClient.put<ApiResponse<SellAlertData>>(
        `/sell-analysis/alerts/${alertId}/acknowledge`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error acknowledging alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  static async getServiceStats(): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/sell-analysis/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching service stats:', error);
      throw error;
    }
  }

  /**
   * Trigger cleanup of old data
   */
  static async triggerCleanup(): Promise<{ analysis_deleted: number; alerts_deleted: number }> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/sell-analysis/cleanup');
      return response.data.data;
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      throw error;
    }
  }

  /**
   * Get all alerts for a specific position
   */
  static async getPositionAlerts(positionId: number): Promise<{
    position_id: number;
    alerts: SellAlertData[];
    summary: {
      total_alerts: number;
      active_alerts: number;
      by_type: Record<string, number>;
      by_priority: Record<string, number>;
    };
  }> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(
        `/sell-analysis/alerts/position/${positionId}`
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching position alerts for ${positionId}:`, error);
      throw error;
    }
  }

  /**
   * Get overview of all positions with sell recommendations
   */
  static async getOverview(): Promise<SellAnalysisOverview> {
    try {
      const response = await apiClient.get<ApiResponse<SellAnalysisOverview>>('/sell-analysis/overview');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching overview:', error);
      throw error;
    }
  }
}

export default SellAnalysisService;