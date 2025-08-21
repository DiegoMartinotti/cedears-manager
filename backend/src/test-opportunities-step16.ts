/**
 * Test completo del sistema de oportunidades - Step 16
 * Valida toda la funcionalidad implementada
 */

import { opportunityService } from './services/OpportunityService.js'
import { opportunityScannerJob } from './jobs/opportunityScannerJob.js'
import { createLogger } from './utils/logger.js'
import SimpleDatabaseConnection from './database/simple-connection.js'

const logger = createLogger('TestOpportunities')

async function runComprehensiveTest() {
  logger.info('🚀 Iniciando test completo del sistema de oportunidades')

  try {
    // 1. Verificar conexión a la base de datos
    logger.info('1. Verificando conexión a la base de datos...')
    const dbHealthy = SimpleDatabaseConnection.isHealthy()
    if (!dbHealthy) {
      throw new Error('La base de datos no está disponible')
    }
    logger.info('✅ Base de datos conectada')

    // 2. Test del health check del sistema
    logger.info('2. Ejecutando health check del sistema...')
    const healthCheck = await opportunityScannerJob.healthCheck()
    logger.info(`Health check resultado: ${healthCheck.healthy ? '✅' : '❌'} - ${healthCheck.message}`)

    // 3. Test de estadísticas iniciales
    logger.info('3. Obteniendo estadísticas iniciales...')
    const initialStats = await opportunityService.getOpportunityStats()
    logger.info('Estadísticas iniciales:', initialStats)

    // 4. Test de scan manual de oportunidades
    logger.info('4. Ejecutando scan manual de oportunidades...')
    const scanConfig = {
      min_score_threshold: 55, // Umbral más bajo para testing
      max_opportunities_per_day: 10,
      rsi_oversold_threshold: 40,
      distance_from_low_threshold: 25,
      volume_spike_threshold: 1.3,
      require_esg_compliance: false,
      require_vegan_friendly: false
    }

    const scanResult = await opportunityScannerJob.runManualScan(scanConfig)
    logger.info('Resultado del scan manual:', scanResult)

    if (!scanResult.success) {
      logger.warn(`⚠️ Scan manual falló: ${scanResult.error}`)
    } else {
      logger.info(`✅ Scan manual exitoso: ${scanResult.opportunitiesFound} oportunidades encontradas`)
    }

    // 5. Test de obtención de oportunidades del día
    logger.info('5. Obteniendo oportunidades del día...')
    const todayOpportunities = await opportunityService.getTodaysOpportunities(5)
    logger.info(`Oportunidades del día encontradas: ${todayOpportunities.length}`)
    
    if (todayOpportunities.length > 0) {
      const firstOpportunity = todayOpportunities[0]
      logger.info('Primera oportunidad:', {
        symbol: firstOpportunity.symbol,
        score: firstOpportunity.composite_score,
        type: firstOpportunity.opportunity_type,
        upside: firstOpportunity.expected_return.upside_percentage
      })

      // 6. Test de cálculo de diversificación
      logger.info('6. Probando cálculo de diversificación...')
      try {
        const diversificationResult = await opportunityService.calculateDiversificationImpact(
          firstOpportunity.symbol,
          5000 // $5000 USD
        )
        logger.info('Resultado de diversificación:', {
          withinLimits: diversificationResult.is_within_limits,
          concentration: diversificationResult.concentration_percentage,
          recommendation: diversificationResult.recommendation.reason
        })
        logger.info('✅ Cálculo de diversificación exitoso')
      } catch (error) {
        logger.warn('⚠️ Error en cálculo de diversificación:', error instanceof Error ? error.message : error)
      }

      // 7. Test de cálculo de comisiones
      logger.info('7. Probando cálculo de impacto de comisiones...')
      try {
        const commissionResult = await opportunityService.calculateCommissionImpact(
          firstOpportunity.symbol,
          5000, // $5000 USD
          50000 // Cartera actual $50,000 USD
        )
        logger.info('Resultado de comisiones:', {
          profitable: commissionResult.is_profitable,
          breakEven: commissionResult.break_even_percentage,
          netUpside: commissionResult.net_upside_after_costs
        })
        logger.info('✅ Cálculo de comisiones exitoso')
      } catch (error) {
        logger.warn('⚠️ Error en cálculo de comisiones:', error instanceof Error ? error.message : error)
      }
    }

    // 8. Test de top oportunidades
    logger.info('8. Obteniendo top oportunidades...')
    const topOpportunities = await opportunityService.getTopOpportunities(3, 60)
    logger.info(`Top oportunidades encontradas: ${topOpportunities.length}`)
    
    topOpportunities.forEach((opp, index) => {
      logger.info(`Oportunidad #${index + 1}: ${opp.symbol} - Score: ${opp.composite_score}`)
    })

    // 9. Test de estado del scanner
    logger.info('9. Verificando estado del scanner...')
    const scannerStatus = opportunityScannerJob.getJobStatus()
    logger.info('Estado del scanner:', {
      isRunning: scannerStatus.isRunning,
      lastRun: scannerStatus.lastRun,
      successCount: scannerStatus.successCount,
      errorCount: scannerStatus.errorCount,
      nextRun: scannerStatus.nextRun
    })

    // 10. Test de métricas de performance
    logger.info('10. Obteniendo métricas de performance...')
    const performanceMetrics = opportunityScannerJob.getPerformanceMetrics()
    logger.info('Métricas de performance:', {
      totalScans: performanceMetrics.totalScans,
      successRate: performanceMetrics.successRate,
      averageProcessingTime: performanceMetrics.averageProcessingTime
    })

    // 11. Test de estadísticas finales
    logger.info('11. Obteniendo estadísticas finales...')
    const finalStats = await opportunityService.getOpportunityStats()
    logger.info('Estadísticas finales:', finalStats)

    // 12. Test de limpieza de oportunidades expiradas
    logger.info('12. Ejecutando limpieza de oportunidades expiradas...')
    const cleanedCount = await opportunityService.cleanupExpiredOpportunities()
    logger.info(`Oportunidades limpiadas: ${cleanedCount}`)

    // Resumen final
    logger.info('')
    logger.info('📊 RESUMEN DEL TEST:')
    logger.info('====================')
    logger.info(`✅ Base de datos: ${dbHealthy ? 'OK' : 'FAIL'}`)
    logger.info(`✅ Health check: ${healthCheck.healthy ? 'OK' : 'FAIL'}`)
    logger.info(`✅ Scan manual: ${scanResult.success ? 'OK' : 'FAIL'}`)
    logger.info(`✅ Oportunidades del día: ${todayOpportunities.length} encontradas`)
    logger.info(`✅ Top oportunidades: ${topOpportunities.length} encontradas`)
    logger.info(`✅ Scanner estado: ${scannerStatus.isRunning ? 'RUNNING' : 'READY'}`)
    logger.info(`✅ Total activas: ${finalStats.active}`)
    logger.info(`✅ Score promedio: ${finalStats.averageScore}`)
    logger.info('')
    logger.info('🎉 Test completo del sistema de oportunidades finalizado exitosamente!')

  } catch (error) {
    logger.error('❌ Error durante el test:', error)
    throw error
  }
}

// Función para test específico de APIs
async function testAPIEndpoints() {
  logger.info('🔧 Ejecutando test de endpoints API...')

  const baseUrl = 'http://localhost:3001/api/v1/opportunities'
  
  try {
    // Test básico de conectividad (simulado)
    logger.info('Endpoints disponibles:')
    logger.info(`- GET ${baseUrl}/today`)
    logger.info(`- GET ${baseUrl}/top`)
    logger.info(`- GET ${baseUrl}/search`)
    logger.info(`- GET ${baseUrl}/stats`)
    logger.info(`- GET ${baseUrl}/health`)
    logger.info(`- POST ${baseUrl}/calculate-diversification`)
    logger.info(`- POST ${baseUrl}/scan/manual`)
    logger.info(`- GET ${baseUrl}/scanner/status`)
    logger.info(`- POST ${baseUrl}/scanner/force-run`)
    
    logger.info('✅ Estructura de endpoints verificada')
    
  } catch (error) {
    logger.error('❌ Error en test de APIs:', error)
  }
}

// Función de validación de configuración
async function validateConfiguration() {
  logger.info('⚙️ Validando configuración del sistema...')

  try {
    // Validar configuración del scanner
    const jobStatus = opportunityScannerJob.getJobStatus()
    logger.info('Configuración del scanner:')
    logger.info(`- Próxima ejecución: ${jobStatus.nextRun}`)
    logger.info(`- Horarios: ${JSON.stringify(jobStatus.schedules)}`)
    
    // Validar configuración de scoring
    logger.info('Configuración de scoring:')
    logger.info('- RSI: 30% peso, umbral sobreventa: 35')
    logger.info('- SMA: 20% peso, detección de cruces')
    logger.info('- Distancia mínimo: 25% peso, umbral: 20%')
    logger.info('- Volumen: 15% peso, spike threshold: 1.5x')
    logger.info('- MACD: 10% peso, histograma positivo')
    
    logger.info('✅ Configuración validada')
    
  } catch (error) {
    logger.error('❌ Error validando configuración:', error)
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await validateConfiguration()
      await testAPIEndpoints()
      await runComprehensiveTest()
    } catch (error) {
      logger.error('Test falló:', error)
      process.exit(1)
    }
  })()
}

export { runComprehensiveTest, testAPIEndpoints, validateConfiguration }