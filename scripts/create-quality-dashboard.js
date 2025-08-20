#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dashboardHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Calidad de Código - CEDEARs Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(45deg, #2196F3, #21CBF3);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .stat-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }
        
        .stat-title {
            font-size: 1.1rem;
            color: #666;
            margin-bottom: 10px;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
        }
        
        .reports {
            padding: 30px;
        }
        
        .reports h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8rem;
        }
        
        .report-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .report-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .report-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
        }
        
        .report-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .report-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .report-description {
            color: #666;
            font-size: 0.9rem;
        }
        
        .report-content {
            padding: 20px;
        }
        
        .report-link {
            display: inline-block;
            background: linear-gradient(45deg, #2196F3, #21CBF3);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .report-link:hover {
            background: linear-gradient(45deg, #1976D2, #0288D1);
        }
        
        .status {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-top: 10px;
        }
        
        .status.success {
            background: #e8f5e8;
            color: #2e7d32;
        }
        
        .status.warning {
            background: #fff3e0;
            color: #f57c00;
        }
        
        .status.error {
            background: #ffebee;
            color: #c62828;
        }
        
        .footer {
            background: #333;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .commands {
            background: #f8f9fa;
            padding: 30px;
            border-top: 1px solid #e0e0e0;
        }
        
        .commands h3 {
            color: #333;
            margin-bottom: 15px;
        }
        
        .command {
            background: #2d3748;
            color: #e2e8f0;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: 'Monaco', 'Consolas', monospace;
            margin: 5px 0;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Dashboard de Calidad de Código</h1>
            <p>CEDEARs Manager - Análisis de Calidad y Duplicación</p>
            <p><small>Generado el: ${new Date().toLocaleString('es-ES')}</small></p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-title">Complejidad Máxima</div>
                <div class="stat-value">15</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔍</div>
                <div class="stat-title">Líneas Mínimas Duplicación</div>
                <div class="stat-value">5</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-title">Pre-commit Hook</div>
                <div class="stat-value">Activo</div>
            </div>
        </div>
        
        <div class="reports">
            <h2>📋 Reportes de Calidad</h2>
            <div class="report-grid">
                <div class="report-card">
                    <div class="report-header">
                        <div class="report-title">🎯 Frontend - ESLint</div>
                        <div class="report-description">Análisis de complejidad y reglas de código React/TypeScript</div>
                    </div>
                    <div class="report-content">
                        <a href="./eslint/frontend.html" class="report-link">Ver Reporte</a>
                        <div class="status success">Configurado</div>
                    </div>
                </div>
                
                <div class="report-card">
                    <div class="report-header">
                        <div class="report-title">🚀 Backend - ESLint</div>
                        <div class="report-description">Análisis de complejidad y reglas de código Node.js/TypeScript</div>
                    </div>
                    <div class="report-content">
                        <a href="./eslint/backend.html" class="report-link">Ver Reporte</a>
                        <div class="status success">Configurado</div>
                    </div>
                </div>
                
                <div class="report-card">
                    <div class="report-header">
                        <div class="report-title">👥 Código Duplicado</div>
                        <div class="report-description">Detección de duplicación de código con JSCPD</div>
                    </div>
                    <div class="report-content">
                        <a href="./duplicates/jscpd-report.html" class="report-link">Ver Reporte</a>
                        <div class="status success">Configurado</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="commands">
            <h3>🔧 Comandos Disponibles</h3>
            <div class="command">npm run quality:check</div>
            <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">Verificar calidad completa (complejidad + duplicación)</p>
            
            <div class="command">npm run quality:report</div>
            <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">Generar reporte completo con dashboard HTML</p>
            
            <div class="command">npm run lint:complexity</div>
            <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">Análisis de complejidad cognitiva únicamente</p>
            
            <div class="command">npm run lint:duplicates</div>
            <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">Detección de código duplicado únicamente</p>
        </div>
        
        <div class="footer">
            <p>🔒 Sistema de Control de Calidad configurado con Husky + ESLint + SonarJS + JSCPD</p>
        </div>
    </div>
</body>
</html>
`;

// Crear el dashboard
const outputPath = path.join(process.cwd(), 'quality-reports', 'index.html');
const outputDir = path.dirname(outputPath);

// Crear directorio si no existe
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Escribir el archivo
fs.writeFileSync(outputPath, dashboardHTML);

console.log('✅ Dashboard de calidad creado en: quality-reports/index.html');
console.log('🌐 Abre el archivo en tu navegador para ver el dashboard completo');