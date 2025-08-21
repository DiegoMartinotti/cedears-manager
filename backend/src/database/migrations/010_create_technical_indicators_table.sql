-- Migration 010: Create technical_indicators table
-- Date: 2025-08-20
-- Description: Tabla para almacenar indicadores técnicos (RSI, MACD, SMA, EMA, etc.)

CREATE TABLE IF NOT EXISTS technical_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    indicator TEXT NOT NULL CHECK(indicator IN ('RSI', 'MACD', 'SMA', 'EMA', 'BB', 'STOCH')),
    period INTEGER, -- Para indicadores que requieren período (ej: SMA20, EMA12)
    value REAL NOT NULL, -- Valor principal del indicador
    signal TEXT NOT NULL CHECK(signal IN ('BUY', 'SELL', 'HOLD')),
    strength INTEGER NOT NULL CHECK(strength >= 0 AND strength <= 100), -- Fuerza de la señal 0-100
    metadata TEXT, -- JSON con datos adicionales (ej: líneas MACD, niveles RSI, etc.)
    timestamp DATETIME NOT NULL, -- Fecha y hora del cálculo
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol ON technical_indicators(symbol);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_indicator ON technical_indicators(symbol, indicator);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_timestamp ON technical_indicators(timestamp);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_signal ON technical_indicators(signal);
CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_timestamp ON technical_indicators(symbol, timestamp DESC);

-- Índice compuesto para consultas de últimos indicadores por símbolo
CREATE INDEX IF NOT EXISTS idx_technical_indicators_latest ON technical_indicators(symbol, indicator, timestamp DESC);

-- Índice para consultas de señales activas
CREATE INDEX IF NOT EXISTS idx_technical_indicators_active_signals ON technical_indicators(signal, timestamp DESC) 
WHERE signal IN ('BUY', 'SELL');

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_technical_indicators_updated_at
    AFTER UPDATE ON technical_indicators
    FOR EACH ROW
BEGIN
    UPDATE technical_indicators 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;