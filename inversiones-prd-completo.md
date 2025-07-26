# PRD y Plan de Desarrollo - Sistema de Gestión de CEDEARs ESG

## 📋 Tabla de Contenidos
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Especificación del Producto (PRD)](#especificación-del-producto-prd)
3. [Plan de Desarrollo Detallado](#plan-de-desarrollo-detallado)
4. [Sistema de Comisiones](#sistema-de-comisiones)
5. [Métricas y Criterios de Éxito](#métricas-y-criterios-de-éxito)

---

## Resumen Ejecutivo

**Producto**: Desktop App para gestión inteligente de cartera de CEDEARs con criterios ESG/veganos  
**Usuario**: Inversor individual operando desde Banco Galicia  
**Core Value**: Maximizar rentabilidad real (ajustada por inflación) mediante análisis técnico avanzado con Claude Code  
**Features Clave**: Goal Tracker para objetivos financieros, análisis técnico automático, gestión de comisiones  
**Stack Técnico**: Electron + React + Node.js + SQLite + Claude Code CLI  
**Duración estimada**: 14 semanas  

---

## Especificación del Producto (PRD)

### 1. Objetivos del Producto

1. **Automatizar el análisis técnico** de instrumentos ESG/veganos (máximo 100)
2. **Optimizar timing** de compra/venta mediante IA
3. **Garantizar diversificación** automática y balanceo sectorial
4. **Ajustar por inflación** todas las métricas usando UVA
5. **Alertar oportunidades** en tiempo real con notificaciones in-app
6. **Gestionar comisiones** de forma inteligente para maximizar rentabilidad
7. **Trackear objetivos financieros** con proyecciones dinámicas y simulaciones

### 2. Arquitectura Técnica

```
┌─────────────────────────────────────┐
│     Desktop App (Electron)          │
│   - UI: React + TypeScript          │
│   - Charts: Recharts                │
│   - State: Zustand                  │
│   - Notificaciones: In-App          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     Backend API (Node.js)           │
│   - Express/Fastify                 │
│   - WebSocket para real-time        │
│   - Cron jobs para análisis         │
│   - Winston para logging            │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     Claude Code CLI                 │
│   - Análisis técnico avanzado       │
│   - Scraping de noticias            │
│   - Evaluación ESG dinámica         │
│   - Predicciones y escenarios      │
│   - Balanceo sectorial             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│     Base de Datos (SQLite)         │
│   - Histórico de operaciones        │
│   - Watchlist dinámica (max 100)   │
│   - Cache de cotizaciones           │
│   - Configuración de comisiones    │
└─────────────────────────────────────┘

Fuentes de Datos:
- Yahoo Finance API
- BCRA (UVA)
- APIs de índices populares
- NewsAPI para análisis
```

### 3. Funcionalidades Principales

#### 3.1 Watchlist Dinámica e Inteligente
- **Gestión automática mensual** por Claude
- **Máximo 100 instrumentos** para mantener foco
- **Evaluación continua** de criterios ESG/veganos
- **Scoring compuesto** para priorización

#### 3.2 Sistema de Análisis de Compra
- **Scanner diario** a las 10:30 AM
- **Detección de mínimos** y análisis técnico
- **Calculadora de diversificación** con límites
- **Análisis de contexto** con Claude
- **Simulador de comisiones** pre-operación

#### 3.3 Sistema de Análisis de Venta
- **Monitoreo continuo** con alertas inteligentes
- **Cálculo de ganancia real** ajustada por inflación y comisiones
- **Break-even analysis** incluyendo todos los costos
- **Recomendaciones contextualizadas** de Claude

#### 3.4 Gestión de Comisiones
- **Configuración personalizable** por el usuario
- **Cálculo automático** en cada operación
- **Análisis de impacto** en rentabilidad
- **Optimización** de montos y frecuencia

#### 3.5 Centro de Notificaciones In-App
- **Sin notificaciones de escritorio**
- **Priorización inteligente** de alertas
- **Historial completo** con filtros
- **Badge contador** en interfaz principal

#### 3.6 Benchmarking y Performance
- **Comparación con índices populares** (S&P 500, NASDAQ, MERVAL)
- **Métricas ajustadas por riesgo**
- **Visualización temporal** de performance
- **Análisis vs inflación argentina**

#### 3.7 Balanceo Sectorial Automático
- **Análisis de concentración** por sector
- **Recomendaciones de diversificación**
- **Alertas de desbalance**
- **Sugerencias de rebalanceo**

#### 3.8 Goal Tracker - Seguimiento de Objetivos Financieros
- **Definición de metas** personalizadas (ej: $1000/mes de renta)
- **Proyecciones dinámicas** basadas en rendimiento real
- **Simulador de escenarios** con aportes variables
- **Alertas de progreso** y desvíos del plan
- **Recomendaciones** para acelerar objetivos

### 4. Modelo de Datos

```sql
-- Instrumentos dinámicos
CREATE TABLE instruments (
    id INTEGER PRIMARY KEY,
    ticker TEXT UNIQUE,
    name TEXT,
    sector TEXT,
    is_esg BOOLEAN,
    is_vegan BOOLEAN,
    esg_score REAL,
    market_cap REAL,
    avg_volume REAL,
    added_date DATE,
    last_review DATE,
    status TEXT CHECK(status IN ('ACTIVE', 'REMOVED', 'PENDING'))
);

-- Operaciones con comisiones
CREATE TABLE trades (
    id INTEGER PRIMARY KEY,
    instrument_id INTEGER,
    type TEXT CHECK(type IN ('BUY', 'SELL')),
    quantity INTEGER,
    price_ars REAL,
    price_usd REAL,
    uva_value REAL,
    commission_amount REAL,
    commission_iva REAL,
    net_amount REAL,
    trade_date DATETIME,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

-- Comisiones de custodia
CREATE TABLE custody_fees (
    id INTEGER PRIMARY KEY,
    month DATE,
    portfolio_value REAL,
    fee_percentage REAL,
    fee_amount REAL,
    iva_amount REAL,
    total_charged REAL,
    payment_date DATE
);

-- Configuración de comisiones
CREATE TABLE commission_config (
    id INTEGER PRIMARY KEY,
    type TEXT CHECK(type IN ('BUY', 'SELL', 'CUSTODY')),
    percentage REAL,
    minimum REAL,
    iva_rate REAL,
    threshold REAL,
    effective_date DATE,
    end_date DATE
);

-- Cotizaciones históricas
CREATE TABLE quotes (
    instrument_id INTEGER,
    date DATE,
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    PRIMARY KEY (instrument_id, date),
    FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

-- Notificaciones
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY,
    type TEXT,
    priority INTEGER,
    title TEXT,
    message TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME
);

-- Historial de cambios en watchlist
CREATE TABLE watchlist_changes (
    id INTEGER PRIMARY KEY,
    instrument_id INTEGER,
    action TEXT CHECK(action IN ('ADD', 'REMOVE', 'UPDATE')),
    reason TEXT,
    claude_confidence REAL,
    user_approved BOOLEAN,
    change_date DATETIME,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id)
);

-- Datos de benchmarks
CREATE TABLE benchmark_data (
    index_name TEXT,
    date DATE,
    value REAL,
    currency TEXT DEFAULT 'USD',
    PRIMARY KEY (index_name, date)
);

-- Valores UVA históricos
CREATE TABLE uva_history (
    date DATE PRIMARY KEY,
    value REAL,
    source TEXT DEFAULT 'BCRA'
);

-- Objetivos financieros
CREATE TABLE financial_goals (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('CAPITAL', 'MONTHLY_INCOME', 'RETURN_RATE')),
    target_amount REAL,
    target_date DATE,
    monthly_contribution REAL,
    expected_return_rate REAL,
    created_date DATE,
    status TEXT CHECK(status IN ('ACTIVE', 'ACHIEVED', 'PAUSED'))
);

-- Progreso de objetivos
CREATE TABLE goal_progress (
    id INTEGER PRIMARY KEY,
    goal_id INTEGER,
    date DATE,
    current_capital REAL,
    monthly_income REAL,
    actual_return_rate REAL,
    projected_completion_date DATE,
    progress_percentage REAL,
    FOREIGN KEY (goal_id) REFERENCES financial_goals(id)
);

-- Simulaciones de escenarios
CREATE TABLE goal_simulations (
    id INTEGER PRIMARY KEY,
    goal_id INTEGER,
    simulation_date DATE,
    scenario_name TEXT,
    extra_contribution REAL,
    new_return_rate REAL,
    impact_months REAL,
    new_completion_date DATE,
    FOREIGN KEY (goal_id) REFERENCES financial_goals(id)
);
```

---

