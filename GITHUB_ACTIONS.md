# 🚀 GitHub Actions Configuration

Esta documentación explica la configuración de GitHub Actions para mantener la calidad del código y sincronizar con las reglas de Husky locales.

## 📋 Workflows Configurados

### 1. PR Validation (`.github/workflows/pr-validation.yml`)

**Trigger**: Se ejecuta en todos los Pull Requests a `main`, `master` o `develop`

**Jobs incluidos**:
- **🎯 Quality Check**: Validaciones de calidad de código
  - ESLint con reglas de complejidad 
  - Detección de código duplicado (jscpd)
  - Generación de reportes de calidad
- **🧪 Test Suite**: Ejecución de pruebas unitarias
- **🏗️ Build Verification**: Verificación de que el proyecto compila
- **📝 PR Summary**: Genera un resumen automático en el PR

### 2. Continuous Integration (`.github/workflows/ci.yml`)

**Trigger**: Se ejecuta en push a `main` o `master`

**Jobs incluidos**:
- Validación completa de calidad
- Suite completa de pruebas
- Build del proyecto
- Dashboard de calidad (artifacts por 30 días)

## 🔄 Sincronización con Husky

### Local (Husky + lint-staged)
```bash
# Pre-commit hook ejecuta:
npx lint-staged
```

### GitHub Actions
```yaml
# Equivalente en GitHub Actions:
npm run lint:complexity    # ESLint checks
npm run lint:duplicates    # jscpd checks  
npm run test              # Unit tests
npm run build            # Build verification
```

## ⚙️ Configuración de lint-staged

```json
{
  "backend/**/*.{ts,js}": [
    "cd backend && npx eslint --fix",
    "cd backend && npx eslint"
  ],
  "frontend/**/*.{ts,tsx,js,jsx}": [
    "cd frontend && npx eslint --fix", 
    "cd frontend && npx eslint"
  ],
  "**/*.{ts,tsx,js,jsx}": [
    "npm run lint:duplicates"
  ]
}
```

## 🎯 Reglas de Calidad Aplicadas

### ESLint Frontend
- Complejidad cognitiva máxima: 35
- Profundidad máxima: 4 niveles
- Máximo 500 líneas por función
- Máximo 4 parámetros por función

### ESLint Backend  
- Complejidad cognitiva máxima: 15
- Profundidad máxima: 4 niveles
- Máximo 50 líneas por función
- Máximo 4 parámetros por función

### Código Duplicado (jscpd)
- Umbral: 5% de duplicación
- Mínimo 5 líneas para detectar
- Mínimo 70 tokens
- Archivos incluidos: TypeScript, JavaScript, JSX

## 📊 Reportes Generados

### En PRs
- Comentario automático con estado de todos los checks
- Artifacts con reportes detallados (7 días de retención)

### En CI (main/master)  
- Dashboard completo de calidad
- Reportes HTML de ESLint
- Reportes de código duplicado
- Artifacts con retención extendida (30 días)

## 🔧 Configuración de Cache

Los workflows están optimizados con cache de:
- Dependencias npm de todos los workspaces
- `node_modules` para acelerar builds

## 🚨 Políticas de Branch Protection

Se recomienda configurar en GitHub:
- Requerir que pasen todos los status checks
- Requerir reviews antes del merge  
- Requerir que la rama esté actualizada

### Configuración recomendada:
```
Settings → Branches → Add rule para 'main':
☑️ Require status checks to pass before merging
☑️ Require branches to be up to date before merging  
☑️ Require pull request reviews before merging
```

## 🎉 Beneficios

1. **Consistencia**: Mismos checks locales y remotos
2. **Automatización**: No depende de configuración local del desarrollador
3. **Visibilidad**: Resultados claros en cada PR
4. **Prevención**: Evita código problemático en main/master
5. **Reportes**: Dashboards y métricas de calidad

## 🔍 Troubleshooting

### Si fallan los checks de ESLint:
```bash
npm run lint:complexity
# Revisar errores y corregir
```

### Si falla detección de duplicados:
```bash
npm run lint:duplicates  
# Revisar reporte en quality-reports/duplicates/
```

### Si fallan las pruebas:
```bash
npm test
# Revisar tests individuales por workspace
```

### Si falla el build:
```bash
npm run build
# Revisar errores de compilación por workspace
```

---

*Esta configuración asegura que todo el código que llegue a las ramas principales cumpla con los estándares de calidad establecidos.*