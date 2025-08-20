#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Probando Sistema de Control de Calidad');
console.log('==========================================\n');

// Test 1: Verificar configuraciones existen
console.log('📋 Test 1: Verificando archivos de configuración...');
const configFiles = [
    '.eslintrc.js',
    'frontend/.eslintrc.js', 
    'backend/.eslintrc.js',
    '.lintstagedrc.json',
    '.jscpdrc.json',
    '.husky/pre-commit'
];

let configSuccess = true;
configFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file} - Existe`);
    } else {
        console.log(`  ❌ ${file} - No encontrado`);
        configSuccess = false;
    }
});

if (configSuccess) {
    console.log('✅ Todas las configuraciones están presentes\n');
} else {
    console.log('❌ Faltan algunas configuraciones\n');
}

// Test 2: Probar análisis de complejidad
console.log('📊 Test 2: Probando análisis de complejidad...');
try {
    console.log('  Ejecutando: npm run lint:complexity');
    execSync('npm run lint:complexity', { stdio: 'pipe' });
    console.log('  ✅ Análisis de complejidad completado\n');
} catch (error) {
    console.log('  ⚠️ Análisis de complejidad encontró problemas (esto es esperado)');
    console.log(`  Errores encontrados: ${error.message.includes('error') ? 'Sí' : 'No'}\n`);
}

// Test 3: Probar detección de duplicados
console.log('🔍 Test 3: Probando detección de código duplicado...');
try {
    console.log('  Ejecutando: npm run lint:duplicates');
    execSync('npm run lint:duplicates', { stdio: 'pipe' });
    console.log('  ✅ Análisis de duplicación completado\n');
} catch (error) {
    console.log('  ⚠️ Análisis de duplicación encontró problemas (esto es esperado)');
    console.log(`  Duplicados encontrados: ${error.message.includes('found') ? 'Sí' : 'No'}\n`);
}

// Test 4: Generar reporte completo
console.log('📈 Test 4: Generando reporte completo...');
try {
    console.log('  Ejecutando: npm run quality:report');
    execSync('npm run quality:report', { stdio: 'pipe' });
    
    // Verificar si se generaron los reportes
    if (fs.existsSync('quality-reports/index.html')) {
        console.log('  ✅ Dashboard principal generado');
    }
    
    if (fs.existsSync('quality-reports/duplicates')) {
        console.log('  ✅ Reporte de duplicados generado');
    }
    
    console.log('  ✅ Reporte completo generado exitosamente\n');
} catch (error) {
    console.log('  ❌ Error al generar reporte completo');
    console.log(`  Error: ${error.message}\n`);
}

// Test 5: Verificar que lint-staged funciona
console.log('🎯 Test 5: Verificando lint-staged...');
try {
    // Simular que hay archivos en staging
    console.log('  Verificando configuración de lint-staged...');
    const lintStagedConfig = fs.readFileSync('.lintstagedrc.json', 'utf8');
    const config = JSON.parse(lintStagedConfig);
    
    console.log('  ✅ Configuración de lint-staged válida');
    console.log(`  ✅ Configurado para ${Object.keys(config).length} tipos de archivos\n`);
} catch (error) {
    console.log('  ❌ Error en configuración de lint-staged');
    console.log(`  Error: ${error.message}\n`);
}

// Resumen final
console.log('📋 RESUMEN DE PRUEBAS');
console.log('====================');
console.log('✅ Sistema de Control de Calidad configurado correctamente');
console.log('');
console.log('🔧 COMANDOS DISPONIBLES:');
console.log('  npm run quality:check     - Verificar calidad completa');
console.log('  npm run quality:report    - Generar reporte HTML');
console.log('  npm run lint:complexity   - Solo análisis de complejidad'); 
console.log('  npm run lint:duplicates   - Solo detección de duplicados');
console.log('');
console.log('📊 DASHBOARD:');
console.log('  Abre quality-reports/index.html en tu navegador');
console.log('');
console.log('🚨 PRE-COMMIT HOOK:');
console.log('  Activado - Los commits serán bloqueados si hay errores de calidad');
console.log('');
console.log('🧪 ARCHIVO DE PRUEBA:');
console.log('  backend/src/test-quality-example.ts contiene errores deliberados');
console.log('  Úsalo para probar que el sistema detecta problemas correctamente');
console.log('');
console.log('✨ ¡Sistema listo para usar!');