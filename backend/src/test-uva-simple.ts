#!/usr/bin/env tsx

import { MigrationRunner } from './database/migrations.js'
import { UVA } from './models/UVA.js'
import { UVAService } from './services/UVAService.js'

async function testUVASystem() {
  try {
    const migrationRunner = new MigrationRunner()
    await migrationRunner.runMigrations()

    const uva = new UVA()
    const testData = [
      { date: '2024-01-01', value: 100.00, source: 'bcra' },
      { date: '2024-01-15', value: 102.50, source: 'bcra' },
      { date: '2024-02-01', value: 105.00, source: 'bcra' },
      { date: '2024-03-01', value: 110.25, source: 'estadisticas' }
    ]

    for (const data of testData) {
      await uva.create(data)
    }

    await uva.getUVACount()
    await uva.findLatest()
    await uva.calculateInflationAdjustment(1000, '2024-01-01', '2024-03-01')

    const uvaService = new UVAService()
    await uvaService.getUVAStatistics()

    await uva.search({
      fromDate: '2024-01-01',
      toDate: '2024-02-28',
      orderBy: 'date',
      orderDirection: 'ASC',
      limit: 10
    })

    await uva.upsertUVA({
      date: '2024-03-01',
      value: 111.00, // Actualizar valor existente
      source: 'bcra'
    })

    await uva.getUVACount()
  } catch {
    process.exit(1)
  }
}

testUVASystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
