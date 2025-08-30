/**
 * Funciones de utilidad para las estrategias de aceleración
 */

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const getTypeIcon = (type: string): string => {
  const icons = {
    'MARKET_TIMING': '📈',
    'SECTOR_ROTATION': '🔄',
    'VOLATILITY_HARVEST': '⚖️',
    'DIVIDEND_CAPTURE': '💰',
    'TAX_OPTIMIZATION': '📊',
    'COST_REDUCTION': '✂️',
    'LEVERAGE_PRUDENT': '⚡'
  };
  return icons[type as keyof typeof icons] || '🎯';
};

export const getTypeText = (type: string): string => {
  const texts = {
    'MARKET_TIMING': 'Market Timing',
    'SECTOR_ROTATION': 'Rotación Sectorial',
    'VOLATILITY_HARVEST': 'Cosecha de Volatilidad',
    'DIVIDEND_CAPTURE': 'Captura de Dividendos',
    'TAX_OPTIMIZATION': 'Optimización Fiscal',
    'COST_REDUCTION': 'Reducción de Costos',
    'LEVERAGE_PRUDENT': 'Apalancamiento Prudente'
  };
  return texts[type as keyof typeof texts] || type;
};

export const getRiskColor = (factor: number): string => {
  if (factor <= 1.0) return 'text-green-600';
  if (factor <= 1.2) return 'text-yellow-600';
  return 'text-red-600';
};

export const getComplexityColor = (score: number): string => {
  if (score <= 4) return 'text-green-600';
  if (score <= 7) return 'text-yellow-600';
  return 'text-red-600';
};

export const getConfidenceColor = (confidence?: number): string => {
  if (!confidence) return 'text-gray-500';
  if (confidence >= 80) return 'text-green-600';
  if (confidence >= 60) return 'text-yellow-600';
  return 'text-red-600';
};