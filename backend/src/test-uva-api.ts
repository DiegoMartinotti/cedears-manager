#!/usr/bin/env tsx

import axios from 'axios'

const API_BASE = 'http://localhost:3001/api/v1'

async function testUVAAPI() {
  try {

    // 1. Verificar health check
    const health = await axios.get(`${API_BASE}/health`)

    // 2. Obtener estadísticas UVA
    const stats = await axios.get(`${API_BASE}/uva/statistics`)

    // 3. Obtener último valor UVA
    const latest = await axios.get(`${API_BASE}/uva/latest`)

    // 4. Calcular ajuste por inflación
    const adjustment = await axios.post(`${API_BASE}/uva/inflation-adjustment`, {
      amount: 1000,
      fromDate: '2024-01-01',
      toDate: '2024-03-01'
    })

    // 5. Forzar actualización
    const update = await axios.post(`${API_BASE}/uva/update`)

    // 6. Estado del job
    const jobStatus = await axios.get(`${API_BASE}/uva/job/status`)

    // 7. Buscar valores UVA
    const search = await axios.get(`${API_BASE}/uva/search?fromDate=2024-01-01&toDate=2024-12-31&limit=5`)

  } catch (error) {
    process.exit(1)
  }
}

// Ejecutar el test
testUVAAPI().then(() => {
  process.exit(0)
}).catch(error => {
  process.exit(1)
})
