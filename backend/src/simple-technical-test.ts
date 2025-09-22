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
    if (!stats) {
      throw new Error('El servicio de análisis técnico no devolvió estadísticas')
    }

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
      if (deleteResult < 0) {
        throw new Error('No se pudo limpiar el indicador de prueba')
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Error creando indicador de prueba: ${message}`)
    }

    // Test 4: Verificar señales activas
    const activeSignals = await technicalAnalysisService.getActiveSignals()
    if (activeSignals.length === 0) {
      throw new Error('No se encontraron señales activas para evaluar')
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Fallo en test básico de análisis técnico: ${errorMessage}`)
  }
}

// Ejecutar tests
testTechnicalAnalysisBasic()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    process.stderr.write(`Technical analysis smoke test failed: ${errorMessage}\n`)
    process.exit(1)
  })

