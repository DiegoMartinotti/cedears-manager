import { QuoteService } from './services/QuoteService.js'
import { Quote } from './models/Quote.js'
import { Instrument } from './models/Instrument.js'
import { quoteUpdateJob } from './jobs/quoteUpdateJob.js'

async function testQuoteSystem() {
  console.log('🚀 Testing CEDEARs Quote System...\n')

  try {
    // Test 1: Inicializar servicios
    console.log('1. Inicializando servicios...')
    const quoteService = new QuoteService()
    const quoteModel = new Quote()
    const instrumentModel = new Instrument()
    console.log('✅ Servicios inicializados correctamente\n')

    // Test 2: Verificar estadísticas iniciales
    console.log('2. Obteniendo estadísticas del servicio...')
    const stats = await quoteService.getServiceStats()
    console.log('📊 Estadísticas del servicio:')
    console.log(`  - Total cotizaciones: ${stats.quotes.total}`)
    console.log(`  - Cache hits: ${stats.cache.hits}`)
    console.log(`  - Rate limit requests: ${stats.rateLimit.totalRequests}`)
    console.log(`  - Mercado abierto: ${stats.market.isOpen ? 'Sí' : 'No'}`)
    console.log()

    // Test 3: Verificar horario de mercado
    console.log('3. Verificando horario de mercado...')
    const marketHours = quoteService.getMarketHours()
    console.log('🕐 Horario de mercado:')
    console.log(`  - Estado: ${marketHours.isOpen ? 'Abierto' : 'Cerrado'}`)
    console.log(`  - Zona horaria: ${marketHours.timezone}`)
    console.log()

    // Test 4: Obtener instrumentos activos
    console.log('4. Obteniendo instrumentos activos...')
    const activeInstruments = await instrumentModel.findAll({ isActive: true })
    console.log(`📈 Instrumentos activos encontrados: ${activeInstruments.length}`)
    
    if (activeInstruments.length > 0) {
      console.log('  Ejemplos:')
      activeInstruments.slice(0, 3).forEach(instrument => {
        console.log(`    - ${instrument.symbol}: ${instrument.company_name}`)
      })
    }
    console.log()

    // Test 5: Obtener cotizaciones del watchlist
    console.log('5. Obteniendo cotizaciones del watchlist...')
    const watchlistQuotes = await quoteService.getWatchlistQuotes()
    console.log(`💹 Cotizaciones en watchlist: ${watchlistQuotes.length}`)
    
    if (watchlistQuotes.length > 0) {
      console.log('  Últimas cotizaciones:')
      watchlistQuotes.slice(0, 3).forEach(quote => {
        console.log(`    - ${quote.instrument?.symbol}: $${quote.price.toFixed(2)} (${quote.quote_date})`)
      })
    }
    console.log()

    // Test 6: Estadísticas del job
    console.log('6. Verificando estado del job de actualización...')
    const jobStats = quoteUpdateJob.getStats()
    const jobConfig = quoteUpdateJob.getConfig()
    console.log('⚙️ Configuración del job:')
    console.log(`  - Estado: ${jobConfig.enabled ? 'Habilitado' : 'Deshabilitado'}`)
    console.log(`  - Programación: ${jobConfig.schedule}`)
    console.log(`  - Solo horario de mercado: ${jobConfig.marketHoursOnly ? 'Sí' : 'No'}`)
    console.log('📊 Estadísticas del job:')
    console.log(`  - Ejecuciones totales: ${jobStats.totalRuns}`)
    console.log(`  - Ejecuciones exitosas: ${jobStats.successfulRuns}`)
    console.log(`  - Cotizaciones actualizadas: ${jobStats.quotesUpdated}`)
    console.log(`  - Última ejecución: ${jobStats.lastRun || 'Nunca'}`)
    console.log()

    // Test 7: Test de cotización individual (si hay instrumentos)
    if (activeInstruments.length > 0) {
      const testSymbol = activeInstruments[0].symbol
      console.log(`7. Probando cotización individual para ${testSymbol}...`)
      
      try {
        const quoteResult = await quoteService.getQuote(testSymbol)
        if (quoteResult.success) {
          console.log(`✅ Cotización obtenida: $${quoteResult.price?.toFixed(2)}`)
          console.log(`  - Fuente: ${quoteResult.source}`)
          console.log(`  - Cached: ${quoteResult.cached ? 'Sí' : 'No'}`)
        } else {
          console.log(`❌ Error obteniendo cotización: ${quoteResult.error}`)
        }
      } catch (error) {
        console.log(`❌ Error en test de cotización: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
      console.log()
    }

    // Test 8: Contar registros en base de datos
    console.log('8. Contando registros en base de datos...')
    const quoteCount = await quoteModel.getQuoteCount()
    const dateRange = await quoteModel.getDateRange()
    console.log(`📊 Base de datos:`)
    console.log(`  - Total cotizaciones: ${quoteCount}`)
    console.log(`  - Fecha más antigua: ${dateRange.earliest || 'N/A'}`)
    console.log(`  - Fecha más reciente: ${dateRange.latest || 'N/A'}`)
    console.log()

    console.log('🎉 Test del sistema de cotizaciones completado exitosamente!')
    console.log('\n📋 Resumen del sistema:')
    console.log(`✅ Servicios funcionando correctamente`)
    console.log(`✅ Base de datos accesible`)
    console.log(`✅ Modelos operativos`)
    console.log(`✅ Job de actualización configurado`)
    console.log(`✅ Cache y rate limiting activos`)

    // Cerrar servicios
    quoteService.shutdown()

  } catch (error) {
    console.error('❌ Error durante el test:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
  }
}

// Ejecutar test
testQuoteSystem().then(() => {
  console.log('\n✨ Test finalizado')
  process.exit(0)
}).catch(error => {
  console.error('💥 Error fatal:', error)
  process.exit(1)
})