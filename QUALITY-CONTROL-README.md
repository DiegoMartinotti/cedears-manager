# 🛡️ Sistema de Control de Calidad de Código

Sistema completo de control de calidad configurado para el proyecto CEDEARs Manager, diseñado para prevenir código complejo y duplicado mediante hooks pre-commit y análisis local.

## 📋 Características Principales

### ✅ Pre-commit Hook Automático
- **Husky + lint-staged**: Análisis automático antes de cada commit
- **Bloqueo de commits**: Si hay errores de calidad, el commit se cancela
- **Análisis incremental**: Solo revisa archivos modificados

### 📊 Reglas de Calidad Configuradas
- **Complejidad cognitiva máxima**: 15 (sonarjs/cognitive-complexity)
- **No funciones idénticas**: Detecta funciones duplicadas (sonarjs/no-identical-functions)
- **No literales duplicados**: Evita strings repetidos (sonarjs/no-duplicate-string)
- **Límites adicionales**: max-params (4), max-depth (4), max-lines-per-function (50/100)

### 🔍 Detección de Código Duplicado
- **JSCPD**: Análisis avanzado de duplicación
- **Umbral**: 5 líneas mínimo para detectar duplicación
- **Reportes HTML**: Visualización clara de código duplicado
- **Blame integration**: Muestra quién introdujo el código duplicado

## 🚀 Instalación y Configuración

### Dependencias Instaladas
```bash
# Ya instaladas automáticamente
husky                  # Git hooks
lint-staged           # Lint solo archivos modificados  
eslint-plugin-sonarjs # Reglas de complejidad y duplicación
jscpd                 # Detector de código duplicado
eslint-html-reporter  # Reportes HTML de ESLint
```

### Archivos de Configuración Creados
- `.eslintrc.js` (backend) - Reglas ESLint + SonarJS para Node.js/TypeScript
- `.eslintrc.js` (frontend) - Reglas ESLint + SonarJS para React/TypeScript
- `.lintstagedrc.json` - Configuración de lint-staged
- `.jscpdrc.json` - Configuración del detector de duplicados
- `.husky/pre-commit` - Hook de pre-commit personalizado

## 🔧 Comandos Disponibles

### Verificación de Calidad
```bash
# Análisis completo (complejidad + duplicación)
npm run quality:check

# Solo análisis de complejidad
npm run lint:complexity

# Solo detección de duplicados
npm run lint:duplicates
```

### Generación de Reportes
```bash
# Generar reporte completo con dashboard HTML
npm run quality:report

# Generar solo reportes HTML de ESLint
npm run quality:eslint-html

# Generar dashboard de calidad
npm run quality:dashboard
```

### Pruebas del Sistema
```bash
# Probar que el sistema funciona correctamente
npm run quality:test
```

## 📊 Dashboard de Calidad

Después de ejecutar `npm run quality:report`, se genera un dashboard en:
```
quality-reports/index.html
```

### Contenido del Dashboard
- **Métricas generales** del proyecto
- **Enlaces a reportes** de ESLint (frontend/backend)
- **Reporte de código duplicado** con visualización HTML
- **Lista de comandos** disponibles
- **Estado del sistema** de control de calidad

## 🎯 Estructura de Reportes

```
quality-reports/
├── index.html              # Dashboard principal
├── eslint/
│   ├── frontend.html       # Reporte ESLint del frontend
│   └── backend.html        # Reporte ESLint del backend
└── duplicates/
    ├── jscpd-report.html   # Reporte visual de duplicados
    └── jscpd-report.json   # Datos JSON de duplicados
```

## 🚨 Pre-commit Hook

### Funcionamiento
1. Al hacer `git commit`, se ejecuta automáticamente el hook
2. **lint-staged** analiza solo los archivos modificados
3. Se ejecutan las verificaciones de:
   - Complejidad cognitiva (ESLint + SonarJS)
   - Duplicación de código (JSCPD)
   - Type checking (TypeScript)
4. Si hay errores, **el commit se bloquea**
5. El desarrollador debe corregir los errores antes de poder hacer commit

### Ejemplo de Salida del Hook
```bash
🔍 Ejecutando controles de calidad de código...
📝 Analizando archivos modificados...

❌ Falló el control de calidad. Corrige los errores antes del commit.
💡 Usa 'npm run quality:report' para ver un reporte completo.
```

## 🧪 Archivo de Prueba

Incluye un archivo de ejemplo con problemas deliberados:
```
backend/src/test-quality-example.ts
```

Este archivo contiene:
- ❌ Función con alta complejidad cognitiva (>15)
- ❌ Funciones idénticas
- ❌ Literales de string duplicados
- ❌ Demasiados parámetros
- ❌ Excesivo anidamiento

Úsalo para verificar que el sistema detecta problemas correctamente.

## 📈 Reglas Específicas Configuradas

### Backend (.eslintrc.js)
```javascript
'sonarjs/cognitive-complexity': ['error', 15]
'sonarjs/no-identical-functions': 'error'
'sonarjs/no-duplicate-string': 'error'
'complexity': ['error', 10]
'max-depth': ['error', 4]
'max-lines-per-function': ['error', 50]
'max-params': ['error', 4]
```

### Frontend (.eslintrc.js)
```javascript
'sonarjs/cognitive-complexity': ['error', 15]
'sonarjs/no-identical-functions': 'error'
'sonarjs/no-duplicate-string': 'error'
'complexity': ['error', 10]
'max-depth': ['error', 4]
'max-lines-per-function': ['error', 100]  // Más permisivo para React
'max-params': ['error', 4]
```

### JSCPD (.jscpdrc.json)
```json
{
  "threshold": 5,           // Mínimo 5 líneas para detectar duplicación
  "minLines": 5,           // Mínimo 5 líneas de código
  "minTokens": 70,         // Mínimo 70 tokens
  "reporters": ["html", "console", "json"]
}
```

## 🔧 Personalización

### Cambiar Límite de Complejidad
Edita los archivos `.eslintrc.js`:
```javascript
'sonarjs/cognitive-complexity': ['error', 20] // Cambiar de 15 a 20
```

### Cambiar Umbral de Duplicación
Edita `.jscpdrc.json`:
```json
{
  "threshold": 10,  // Cambiar de 5 a 10 líneas
  "minLines": 10
}
```

### Agregar Carpetas/Archivos a Ignorar
Edita `.jscpdrc.json`:
```json
{
  "ignore": [
    "**/*.test.ts",
    "custom-folder/**"
  ]
}
```

## 🚫 Desactivar Temporalmente

### Desactivar Pre-commit Hook
```bash
# Solo para un commit específico
git commit --no-verify -m "mensaje"

# ⚠️ NO recomendado - solo para emergencias
```

### Ignorar Regla Específica en Código
```typescript
// eslint-disable-next-line sonarjs/cognitive-complexity
function complexFunction() {
  // función compleja aquí
}
```

## 📋 Solución de Problemas Comunes

### Error: "Command failed with exit code 1"
- El sistema detectó problemas de calidad
- Ejecuta `npm run quality:report` para ver detalles
- Corrige los errores reportados

### Hook no se ejecuta
```bash
# Reinstalar hooks
npm run prepare
npx husky install
```

### Reportes no se generan
```bash
# Verificar permisos y limpiar
npm run quality:setup
npm run quality:report
```

## 🎯 Beneficios del Sistema

### Para Desarrolladores
- ✅ **Código más limpio** automáticamente
- ✅ **Detección temprana** de problemas
- ✅ **Menos bugs** en producción
- ✅ **Mejor mantenibilidad** del código

### Para el Proyecto
- ✅ **Estándares consistentes** de calidad
- ✅ **Reducción de deuda técnica**
- ✅ **Código más legible** y comprensible
- ✅ **Facilita onboarding** de nuevos desarrolladores

## 🏆 Mejores Prácticas

1. **No evitar el hook**: Corrige los errores en lugar de usar `--no-verify`
2. **Revisar reportes**: Usa `npm run quality:report` regularmente
3. **Refactoring proactivo**: Divide funciones complejas en funciones más pequeñas
4. **Evitar duplicación**: Extrae código común a utilidades/helpers
5. **Configuración del IDE**: Configura ESLint en tu editor para ver errores en tiempo real

---

✨ **¡Sistema listo para usar!** El control de calidad se activará automáticamente en cada commit.