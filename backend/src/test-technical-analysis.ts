/**
 * Test script para validar el sistema de análisis técnico (Paso 15)
 */

import { technicalAnalysisService } from './services/TechnicalAnalysisService'
import { technicalIndicatorModel } from './models/TechnicalIndicator'
import { technicalAnalysisJob } from './jobs/technicalAnalysisJob'
import { instrumentModel } from './models/Instrument'
import { logger } from './utils/logger'

async function testTechnicalAnalysisSystem() {

  try {
    // Test 1: Verificar que el modelo funciona
    const stats = await technicalAnalysisService.getServiceStats()

    // Test 2: Verificar que hay instrumentos para analizar
    const instruments = await instrumentModel.findAll({ status: 'ACTIVE' })
    
    if (instruments.length === 0) {
      return
    }

    // Test 3: Calcular indicadores para un instrumento específico
    const sampleInstrument = instruments[0]
    
    const indicators = await technicalAnalysisService.calculateIndicators(sampleInstrument.ticker)
    
    if (indicators) {
      
      // Test 4: Guardar indicadores en DB
      await technicalAnalysisService.saveIndicators(indicators)
      
    } else {
    }

    // Test 5: Obtener señales activas
    const activeSignals = await technicalAnalysisService.getActiveSignals()
    
    if (activeSignals.length > 0) {
      const buySignals = activeSignals.filter(s => s.signal === 'BUY')
      const sellSignals = activeSignals.filter(s => s.signal === 'SELL')
      
      // Mostrar las mejores señales
      const topSignals = activeSignals
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 3)
      topSignals.forEach((signal, i) => {
      })
    }

    // Test 6: Estado del job automatizado
    const jobStatus = technicalAnalysisJob.getJobStatus()

    // Test 7: Estadísticas finales
    const finalStats = await technicalAnalysisService.getServiceStats()

  } catch (error) {
    logger.error('Test failed:', error)
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  testTechnicalAnalysisSystem()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      process.exit(1)
    })
}
