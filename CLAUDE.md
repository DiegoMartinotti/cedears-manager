# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto Sistema de Gestión de CEDEARs ESG

Este es un proyecto de **Desktop App para gestión inteligente de cartera de CEDEARs con criterios ESG/veganos**. La aplicación está diseñada para inversores individuales que operan desde Banco Galicia y buscan maximizar su rentabilidad real (ajustada por inflación) mediante análisis técnico avanzado.

## Estado Actual del Proyecto

### 📁 Estructura de Archivos
```
C:\proyectos\cedears-manager\
├── inversiones-prd-completo.md    # Documento de especificación completo (PRD)
├── plan-de-desarrollo.md          # Plan detallado de desarrollo con 37 pasos
├── CLAUDE.md                      # Este archivo
└── .claude/
    └── settings.local.json        # Configuración local de permisos
```

### 🚨 Estado: PRE-DESARROLLO
- **No hay código fuente implementado aún**
- Solo existe el documento de especificación (PRD) y plan de desarrollo
- El proyecto está en fase de planificación
- **IMPORTANTE**: Consultar `plan-de-desarrollo.md` para ver el plan detallado de implementación en 6 fases

## Stack Tecnológico Planeado

### Frontend
- **Framework**: React 18+ con TypeScript
- **Desktop**: Electron
- **State Management**: Zustand
- **UI**: Tailwind CSS + Radix UI
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js 20+
- **API**: Express/Fastify
- **Database**: SQLite (local)
- **Jobs**: Node-cron
- **WebSocket**: Socket.io

### Integraciones
- **IA**: Claude API para análisis técnico
- **Market Data**: Yahoo Finance API
- **UVA**: BCRA scraping
- **News**: NewsAPI

## Funcionalidades Principales

1. **Watchlist Dinámica** (máx. 100 instrumentos ESG/veganos)
2. **Análisis Técnico Automatizado** con Claude
3. **Sistema de Comisiones** configurable
4. **Goal Tracker** para objetivos financieros
5. **Notificaciones In-App** de oportunidades
6. **Benchmarking** contra índices populares
7. **Ajuste por Inflación** usando UVA

## Estructura de Proyecto Propuesta

```
cedears-manager/
├── electron/           # Main process de Electron
├── frontend/          # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── utils/
│   └── public/
├── backend/           # API Node.js
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   └── jobs/
│   └── database/
├── claude-cli/        # Integración con Claude
│   ├── prompts/
│   └── analysis/
├── shared/            # Tipos y utilidades compartidas
└── tests/            # Tests unitarios y E2E
```

## Comandos de Desarrollo (Futuros)

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev          # Inicia electron + frontend + backend

# Build
npm run build        # Build de producción
npm run dist         # Crear instalador

# Tests
npm test            # Tests unitarios
npm run test:e2e    # Tests E2E
```

## Modelo de Datos Principal

La aplicación utilizará SQLite con las siguientes tablas principales:
- `instruments` - CEDEARs en watchlist
- `trades` - Operaciones de compra/venta
- `quotes` - Cotizaciones históricas
- `commission_config` - Configuración de comisiones
- `financial_goals` - Objetivos financieros
- `notifications` - Centro de notificaciones

## Configuración Requerida

### Variables de Entorno (.env)
```
# APIs
YAHOO_FINANCE_API_KEY=
NEWS_API_KEY=

# Database
DB_PATH=./data/cedears.db

# App
NODE_ENV=development
PORT=3001
```

## Plan de Desarrollo

El proyecto tiene un **plan de desarrollo detallado en 6 fases** con 37 módulos específicos. 

### 📋 Fases del Proyecto:
1. **FASE 1**: Setup y Arquitectura Base (Semana 1-2) - 6 módulos
2. **FASE 2**: Funcionalidades Core (Semana 3-5) - 8 módulos
3. **FASE 3**: Inteligencia con Claude (Semana 6-8) - 5 módulos
4. **FASE 4**: Características Avanzadas (Semana 9-11) - 9 módulos
5. **FASE 5**: UX/UI y Optimización (Semana 12-13) - 4 módulos
6. **FASE 6**: Testing y Deployment (Semana 14) - 5 módulos

### 🎯 Para ver el plan completo:
**Consultar el archivo `plan-de-desarrollo.md`** que contiene:
- Checklist detallado de cada tarea
- Dependencias técnicas específicas
- Estructura de carpetas exacta
- Algoritmos de cálculo financiero
- Mockups de interfaces
- Sistema de comisiones detallado
- Goal Tracker completo

## Consideraciones Importantes

### Seguridad
- No se almacenan credenciales bancarias
- Datos encriptados localmente
- Validación estricta de inputs

### Performance
- Cache agresivo de cotizaciones
- Paginación en listas largas
- Lazy loading de componentes

### UX
- Sin notificaciones de escritorio (solo in-app)
- Feedback inmediato en acciones
- Estados de carga claros

## Métricas de Éxito

- Detección de 80%+ de oportunidades válidas
- Performance anual > inflación + 10%
- Tiempo de análisis < 5 min/día
- Proyecciones con <10% desviación

## Duración Estimada

**14 semanas** desde el inicio del desarrollo hasta la primera versión productiva.

## Subagentes OODA Configurados

### 🤖 Metodología de Trabajo Proactiva
**IMPORTANTE**: Para TODAS las tareas asignadas, utilizar proactivamente los subagentes OODA en secuencia:

1. **🔍 /observe** - Recopilar información sobre el problema/tarea
2. **🧭 /orient** - Analizar y sintetizar los datos obtenidos  
3. **🎯 /decide** - Evaluar opciones y generar recomendaciones
4. **⚡ /act** - Implementar la solución decidida

### Subagentes Disponibles
```bash
# Subagentes especializados en .claude/agents/
/observe    # Fase de observación y recolección de datos
/orient     # Fase de análisis y síntesis de información  
/decide     # Fase de evaluación y recomendaciones
/act        # Fase de implementación y ejecución
```

### Uso Proactivo Obligatorio
- **Usar siempre los 4 subagentes** para tareas complejas (3+ pasos)
- **Seguir la secuencia OODA** para resolver problemas sistemáticamente
- **Cada subagente se especializa** en su fase específica del proceso
- **Documentar el flujo** de decisiones entre fases

## Comandos Importantes para el Desarrollo

### Cuando empieces a desarrollar:
```bash
# Primer paso - Revisar el plan de desarrollo
# Consultar plan-de-desarrollo.md para la fase actual

# Los comandos específicos se definirán según avance el desarrollo
```

---

*Última actualización: 2025-07-24*
*Versión: 1.1.0*