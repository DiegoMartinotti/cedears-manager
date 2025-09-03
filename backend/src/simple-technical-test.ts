/**
 * Simple test script para validar el sistema de análisis técnico
 */

import { technicalAnalysisService } from './services/TechnicalAnalysisService'
import { technicalIndicatorModel } from './models/TechnicalIndicator'

/* eslint-disable max-lines-per-function */

async function testTechnicalAnalysisBasic() {

  try {
    // Test 1: Verificar que el modelo funciona
    const stats = await technicalAnalysisService.getServiceStats()

    // Test 2: Verificar que se puede obtener estadísticas

    // Test 3: Verificar que la tabla existe
    try {
      const testIndicator = {
        symbol: 'TEST',
        indicator: 'RSI' as const,
        value: 50,
        signal: 'HOLD' as const,
        strength: 50,
        timestamp: new Date()
      }
      
      await technicalIndicatorModel.create(testIndicator)
      
      // Limpiar el test
      const deleteResult = technicalIndicatorModel.deleteOldIndicators(0)
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
    }

    // Test 4: Verificar señales activas
    const activeSignals = await technicalAnalysisService.getActiveSignals()

  } catch (error) {
  }
}

// Ejecutar tests
testTechnicalAnalysisBasic()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    process.exit(1)
  })

