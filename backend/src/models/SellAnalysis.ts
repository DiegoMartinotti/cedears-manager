import SimpleDatabaseConnection from '../database/simple-connection.js';

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
  take_profit_1: number; // 15%
  take_profit_2: number; // 20%
  stop_loss: number; // -8%
  trailing_stop_trigger: number; // 10%
  trailing_stop_distance: number; // 5%
  time_based_days: number; // 90 days
}

export interface SellScoreComponents {
  technicalScore: number;    // 0-100 based on RSI, MACD, SMA
  fundamentalScore: number;  // 0-100 based on news sentiment
  profitScore: number;       // 0-100 based on current profit
  timeScore: number;         // 0-100 based on holding period
  marketScore: number;       // 0-100 based on market conditions
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
    score_components: SellScoreComponents;
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

export class SellAnalysis {
  async create(data: Omit<SellAnalysisData, 'id' | 'created_at' | 'updated_at'>): Promise<SellAnalysisData> {
    const now = new Date().toISOString();
    const analysis: SellAnalysisData = {
      ...data,
      created_at: now,
      updated_at: now
    };

    const result = SimpleDatabaseConnection.insert('sell_analysis', analysis);
    return result as SellAnalysisData;
  }

  async findById(id: number): Promise<SellAnalysisData | null> {
    const result = SimpleDatabaseConnection.findById('sell_analysis', id);
    return (result as SellAnalysisData | null) ?? null;
  }

  async findByPositionId(positionId: number): Promise<SellAnalysisData[]> {
    const results = SimpleDatabaseConnection.findAll('sell_analysis', { position_id: positionId });
    return results.map(record => record as SellAnalysisData);
  }

  async findLatestByPositionId(positionId: number): Promise<SellAnalysisData | null> {
    const results = SimpleDatabaseConnection.findAll('sell_analysis', { position_id: positionId }) as SellAnalysisData[];

    if (results.length === 0) return null;

    const sorted = [...results].sort((a, b) =>
      new Date(b.analysis_date).getTime() - new Date(a.analysis_date).getTime()
    );

    return sorted[0] ?? null;
  }

  async findRecentAnalysis(hours: number = 24): Promise<SellAnalysisData[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const allAnalysis = SimpleDatabaseConnection.findAll('sell_analysis') as SellAnalysisData[];

    return allAnalysis.filter(analysis => {
      const analysisDate = analysis.analysis_date ? new Date(analysis.analysis_date) : null;
      return analysisDate !== null && analysisDate >= cutoffDate;
    });
  }

  async update(id: number, data: Partial<SellAnalysisData>): Promise<SellAnalysisData | null> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const result = SimpleDatabaseConnection.update('sell_analysis', id, updateData);
    return (result as SellAnalysisData | null) ?? null;
  }

  async delete(id: number): Promise<boolean> {
    return SimpleDatabaseConnection.delete('sell_analysis', id);
  }

  async findAll(): Promise<SellAnalysisData[]> {
    const results = SimpleDatabaseConnection.findAll('sell_analysis');
    return results.map(record => record as SellAnalysisData);
  }

  async cleanup(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const allAnalysis = SimpleDatabaseConnection.findAll('sell_analysis') as SellAnalysisData[];
    let deletedCount = 0;

    for (const analysis of allAnalysis) {
      const analysisDate = analysis.analysis_date ? new Date(analysis.analysis_date) : null;
      if (analysisDate && analysisDate < cutoffDate && analysis.id) {
        if (SimpleDatabaseConnection.delete('sell_analysis', analysis.id)) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  // Statistics methods
  async getStatistics(): Promise<{
    total_analysis: number;
    today_analysis: number;
    avg_sell_score: number;
    recommendations_breakdown: Record<string, number>;
    risk_levels_breakdown: Record<string, number>;
  }> {
    const all = await this.findAll();
    const today = new Date().toISOString().split('T')[0];
    const todayAnalysis = all.filter(a => a.analysis_date.startsWith(today));

    const recommendations = all.reduce((acc, analysis) => {
      acc[analysis.recommendation] = (acc[analysis.recommendation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const riskLevels = all.reduce((acc, analysis) => {
      acc[analysis.risk_level] = (acc[analysis.risk_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgScore = all.length > 0 
      ? all.reduce((sum, a) => sum + a.sell_score, 0) / all.length 
      : 0;

    return {
      total_analysis: all.length,
      today_analysis: todayAnalysis.length,
      avg_sell_score: Math.round(avgScore * 100) / 100,
      recommendations_breakdown: recommendations,
      risk_levels_breakdown: riskLevels
    };
  }
}

export class SellAlert {
  async create(data: Omit<SellAlertData, 'id' | 'created_at'>): Promise<SellAlertData> {
    const alert: SellAlertData = {
      ...data,
      created_at: new Date().toISOString()
    };

    const result = SimpleDatabaseConnection.insert('sell_alerts', alert);
    return result as SellAlertData;
  }

  async findById(id: number): Promise<SellAlertData | null> {
    const result = SimpleDatabaseConnection.findById('sell_alerts', id);
    return (result as SellAlertData | null) ?? null;
  }

  async findActiveAlerts(): Promise<SellAlertData[]> {
    const all = SimpleDatabaseConnection.findAll('sell_alerts') as SellAlertData[];
    return all.filter(alert => alert.is_active);
  }

  async findByPositionId(positionId: number): Promise<SellAlertData[]> {
    const results = SimpleDatabaseConnection.findAll('sell_alerts', { position_id: positionId });
    return results.map(record => record as SellAlertData);
  }

  async findActiveByPositionId(positionId: number): Promise<SellAlertData[]> {
    const all = await this.findByPositionId(positionId);
    return all.filter(alert => alert.is_active);
  }

  async acknowledgeAlert(id: number): Promise<SellAlertData | null> {
    const result = SimpleDatabaseConnection.update('sell_alerts', id, {
      acknowledged_at: new Date().toISOString()
    });
    return (result as SellAlertData | null) ?? null;
  }

  async deactivateAlert(id: number): Promise<SellAlertData | null> {
    const result = SimpleDatabaseConnection.update('sell_alerts', id, {
      is_active: false
    });
    return (result as SellAlertData | null) ?? null;
  }

  async deactivateByPositionAndType(positionId: number, alertType: SellAlertData['alert_type']): Promise<number> {
    const alerts = await this.findByPositionId(positionId);
    const matching = alerts.filter(alert => alert.alert_type === alertType && alert.is_active);

    let deactivatedCount = 0;
    for (const alert of matching) {
      if (alert.id) {
        await this.deactivateAlert(alert.id);
        deactivatedCount++;
      }
    }

    return deactivatedCount;
  }

  async update(id: number, data: Partial<SellAlertData>): Promise<SellAlertData | null> {
    const result = SimpleDatabaseConnection.update('sell_alerts', id, data);
    return (result as SellAlertData | null) ?? null;
  }

  async delete(id: number): Promise<boolean> {
    return SimpleDatabaseConnection.delete('sell_alerts', id);
  }

  async findAll(): Promise<SellAlertData[]> {
    const results = SimpleDatabaseConnection.findAll('sell_alerts');
    return results.map(record => record as SellAlertData);
  }

  async cleanup(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const allAlerts = SimpleDatabaseConnection.findAll('sell_alerts') as SellAlertData[];
    let deletedCount = 0;

    for (const alert of allAlerts) {
      const createdAt = alert.created_at ? new Date(alert.created_at) : null;
      if (!alert.is_active && createdAt && createdAt < cutoffDate && alert.id) {
        if (SimpleDatabaseConnection.delete('sell_alerts', alert.id)) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  async getStatistics(): Promise<{
    total_alerts: number;
    active_alerts: number;
    alerts_by_type: Record<string, number>;
    alerts_by_priority: Record<string, number>;
  }> {
    const all = await this.findAll();
    const active = all.filter(alert => alert.is_active);

    const byType = all.reduce((acc, alert) => {
      acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = all.reduce((acc, alert) => {
      acc[alert.priority] = (acc[alert.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total_alerts: all.length,
      active_alerts: active.length,
      alerts_by_type: byType,
      alerts_by_priority: byPriority
    };
  }
}