import React, { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Info, Target, Calendar, Percent } from 'lucide-react';
import { PositionSellAnalysis } from '../../services/sellAnalysisService';

interface PositionAnalysisListProps {
  positions: PositionSellAnalysis[];
  showLimit?: number;
}

const PositionAnalysisList: React.FC<PositionAnalysisListProps> = ({ 
  positions, 
  showLimit 
}) => {
  const [expandedPositions, setExpandedPositions] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'score' | 'profit' | 'risk' | 'ticker'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const displayPositions = showLimit ? positions.slice(0, showLimit) : positions;

  const sortedPositions = [...displayPositions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'score':
        comparison = a.analysis.sell_score - b.analysis.sell_score;
        break;
      case 'profit':
        comparison = a.adjusted.net_profit_pct - b.adjusted.net_profit_pct;
        break;
      case 'risk':
        const riskOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
        comparison = riskOrder[a.analysis.risk_level] - riskOrder[b.analysis.risk_level];
        break;
      case 'ticker':
        comparison = a.position.ticker.localeCompare(b.position.ticker);
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const toggleExpanded = (positionId: number) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
    } else {
      newExpanded.add(positionId);
    }
    setExpandedPositions(newExpanded);
  };

  const getRecommendationBadge = (recommendation: PositionSellAnalysis['analysis']['recommendation']) => {
    const styles = {
      HOLD: 'bg-blue-100 text-blue-800 border-blue-200',
      TAKE_PROFIT_1: 'bg-green-100 text-green-800 border-green-200',
      TAKE_PROFIT_2: 'bg-green-200 text-green-900 border-green-300',
      STOP_LOSS: 'bg-red-100 text-red-800 border-red-200',
      TRAILING_STOP: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    const labels = {
      HOLD: 'Mantener',
      TAKE_PROFIT_1: 'Take Profit 1',
      TAKE_PROFIT_2: 'Take Profit 2',
      STOP_LOSS: 'Stop Loss',
      TRAILING_STOP: 'Trailing Stop',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[recommendation]}`}>
        {labels[recommendation]}
      </span>
    );
  };

  const getRiskBadge = (riskLevel: PositionSellAnalysis['analysis']['risk_level']) => {
    const styles = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[riskLevel]}`}>
        {riskLevel}
      </span>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay posiciones para mostrar
        </h3>
        <p className="text-gray-600">
          No se encontraron posiciones con los criterios actuales.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600">Ordenar por:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border border-gray-300 rounded px-2 py-1"
        >
          <option value="score">Score de Venta</option>
          <option value="profit">Ganancia %</option>
          <option value="risk">Nivel de Riesgo</option>
          <option value="ticker">Símbolo</option>
        </select>
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          {sortOrder === 'desc' ? '↓' : '↑'}
        </button>
        <span className="text-gray-500">
          Mostrando {sortedPositions.length} posiciones
        </span>
      </div>

      {/* Positions List */}
      <div className="space-y-3">
        {sortedPositions.map((position) => (
          <div
            key={position.position.id}
            className={`border rounded-lg transition-all ${
              position.analysis.risk_level === 'CRITICAL'
                ? 'border-red-300 bg-red-50'
                : position.analysis.recommendation !== 'HOLD'
                ? 'border-orange-300 bg-orange-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Main Row */}
            <div 
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpanded(position.position.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-medium text-gray-900">
                      {position.position.ticker}
                    </h4>
                    {getRecommendationBadge(position.analysis.recommendation)}
                    {getRiskBadge(position.analysis.risk_level)}
                  </div>

                  <div className="hidden sm:flex items-center space-x-4 text-sm">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getScoreColor(position.analysis.sell_score)}`}>
                        {position.analysis.sell_score}
                      </div>
                      <div className="text-gray-600">Score</div>
                    </div>

                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        position.adjusted.net_profit_pct >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {position.adjusted.net_profit_pct.toFixed(1)}%
                      </div>
                      <div className="text-gray-600">Ganancia</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {position.position.days_held}
                      </div>
                      <div className="text-gray-600">Días</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {position.alerts.length > 0 && (
                    <div className="flex items-center text-orange-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">{position.alerts.length}</span>
                    </div>
                  )}
                  
                  <div className={`p-1 rounded ${
                    position.adjusted.net_profit >= 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {position.adjusted.net_profit >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>

                  <Info className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Mobile Summary */}
              <div className="sm:hidden mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="text-center">
                  <div className={`font-bold ${getScoreColor(position.analysis.sell_score)}`}>
                    {position.analysis.sell_score}
                  </div>
                  <div className="text-gray-600">Score</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${
                    position.adjusted.net_profit_pct >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.adjusted.net_profit_pct.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">Ganancia</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900">
                    {position.position.days_held}
                  </div>
                  <div className="text-gray-600">Días</div>
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedPositions.has(position.position.id) && (
              <div className="border-t bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Position Details */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Posición</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cantidad:</span>
                        <span>{position.position.quantity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Precio Promedio:</span>
                        <span>${position.position.avg_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Inversión Total:</span>
                        <span>${position.position.total_invested.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Precio Actual:</span>
                        <span>${position.current.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Análisis Financiero</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ganancia Bruta:</span>
                        <span className={position.current.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${position.current.gross_profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ajuste Inflación:</span>
                        <span>{(position.adjusted.inflation_factor * 100 - 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Comisión Venta:</span>
                        <span>${position.adjusted.commission_to_sell.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ganancia Neta:</span>
                        <span className={position.adjusted.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${position.adjusted.net_profit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Analysis */}
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Análisis Técnico</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score Técnico:</span>
                        <span>{position.analysis.score_components.technicalScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score Ganancias:</span>
                        <span>{position.analysis.score_components.profitScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Score Tiempo:</span>
                        <span>{position.analysis.score_components.timeScore}</span>
                      </div>
                      {position.technical_indicators && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">RSI:</span>
                            <span>{position.technical_indicators.rsi.toFixed(1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">MACD:</span>
                            <span>{position.technical_indicators.macd_signal}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recommendation Reason */}
                <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <h6 className="font-medium text-blue-900 mb-1">Recomendación</h6>
                  <p className="text-sm text-blue-800">{position.analysis.reason}</p>
                </div>

                {/* Active Alerts */}
                {position.alerts.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 rounded border border-orange-200">
                    <h6 className="font-medium text-orange-900 mb-2">
                      Alertas Activas ({position.alerts.length})
                    </h6>
                    <div className="space-y-1">
                      {position.alerts.slice(0, 3).map((alert, index) => (
                        <div key={index} className="text-sm text-orange-800">
                          • {alert.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show More Link */}
      {showLimit && positions.length > showLimit && (
        <div className="text-center pt-4">
          <p className="text-gray-600 text-sm">
            Mostrando {showLimit} de {positions.length} posiciones
          </p>
        </div>
      )}
    </div>
  );
};

export default PositionAnalysisList;