/**
 * 🎯 INSERTAR DATOS DEMO EN TABLAS SMART PLUG
 * ===========================================
 * 
 * Script final para insertar datos de demostración directamente
 * en las tablas smart_plug_*_anomaly_scores usando raw SQL.
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function insertSmartPlugDemoData() {
  try {
    console.log('🎯 Insertando datos demo en tablas Smart Plug...')
    
    const systemId = 'cmcrzqlis0006y23ao160z5rb'
    const clinicId = 'cmcrzqlis0007y23ao160z5rc'
    
    // Datos de ejemplo para clientes
    const clientData = [
      { id: 'demo-client-001', services: 15, anomalies: 3, riskScore: 45, riskLevel: 'medium' },
      { id: 'demo-client-002', services: 22, anomalies: 1, riskScore: 25, riskLevel: 'low' },
      { id: 'demo-client-003', services: 8, anomalies: 4, riskScore: 85, riskLevel: 'critical' },
      { id: 'demo-client-004', services: 30, anomalies: 2, riskScore: 30, riskLevel: 'low' },
      { id: 'demo-client-005', services: 12, anomalies: 6, riskScore: 78, riskLevel: 'high' }
    ]
    
    // Datos de ejemplo para empleados
    const employeeData = [
      { id: 'demo-emp-001', services: 45, anomalies: 2, efficiency: 95, riskScore: 20, riskLevel: 'low' },
      { id: 'demo-emp-002', services: 38, anomalies: 8, efficiency: 78, riskScore: 65, riskLevel: 'high' },
      { id: 'demo-emp-003', services: 52, anomalies: 1, efficiency: 98, riskScore: 15, riskLevel: 'low' },
      { id: 'demo-emp-004', services: 29, anomalies: 12, efficiency: 65, riskScore: 88, riskLevel: 'critical' },
      { id: 'demo-emp-005', services: 41, anomalies: 4, efficiency: 88, riskScore: 35, riskLevel: 'medium' }
    ]
    
    // Insertar clientes
    let clientCount = 0
    for (const client of clientData) {
      const anomalyRate = (client.anomalies / client.services) * 100
      
      try {
        await prisma.$executeRaw`
          INSERT INTO smart_plug_client_anomaly_scores (
            id, "systemId", "clinicId", "clientId", "totalServices", "totalAnomalies",
            "anomalyRate", "avgDeviationPercent", "maxDeviationPercent", 
            "suspiciousPatterns", "favoredByEmployees", "riskScore", "riskLevel",
            "lastCalculated", "createdAt", "updatedAt"
          ) VALUES (
            ${crypto.randomUUID()}, ${systemId}, ${clinicId}, ${client.id}, 
            ${client.services}, ${client.anomalies}, ${anomalyRate}, 
            ${15.5 + Math.random() * 10}, ${25.0 + Math.random() * 20},
            CAST(${'{"OVER_DURATION": 2, "OVER_CONSUMPTION": 1}'} AS JSONB), 
            CAST(${'{"emp-001": 2, "emp-002": 1}'} AS JSONB),
            ${client.riskScore}, ${client.riskLevel},
            NOW(), NOW(), NOW()
          ) ON CONFLICT ("systemId", "clinicId", "clientId") DO UPDATE SET
            "riskScore" = EXCLUDED."riskScore",
            "riskLevel" = EXCLUDED."riskLevel",
            "updatedAt" = NOW()
        `
        clientCount++
        console.log(`✅ Cliente ${client.id}: ${client.riskScore}/100 (${client.riskLevel})`)
      } catch (e) {
        console.log(`⚠️ Error con cliente ${client.id}:`, e.message)
      }
    }
    
    // Insertar empleados
    let employeeCount = 0
    for (const employee of employeeData) {
      const anomalyRate = (employee.anomalies / employee.services) * 100
      const consistency = Math.max(50, employee.efficiency - 10)
      
      try {
        await prisma.$executeRaw`
          INSERT INTO smart_plug_employee_anomaly_scores (
            id, "systemId", "clinicId", "employeeId", "totalServices", "totalAnomalies",
            "anomalyRate", "avgEfficiency", "consistencyScore", 
            "favoredClients", "fraudIndicators", "timePatterns", "riskScore", "riskLevel",
            "lastCalculated", "createdAt", "updatedAt"
          ) VALUES (
            ${crypto.randomUUID()}, ${systemId}, ${clinicId}, ${employee.id}, 
            ${employee.services}, ${employee.anomalies}, ${anomalyRate}, 
            ${employee.efficiency}, ${consistency},
            CAST(${'{"client-001": 3, "client-002": 2}'} AS JSONB),  
            CAST(${'{"alwaysShort": false, "inconsistent": true}'} AS JSONB),
            CAST(${'{"morning": 5, "afternoon": 8}'} AS JSONB),
            ${employee.riskScore}, ${employee.riskLevel},
            NOW(), NOW(), NOW()
          ) ON CONFLICT ("systemId", "clinicId", "employeeId") DO UPDATE SET
            "riskScore" = EXCLUDED."riskScore",
            "riskLevel" = EXCLUDED."riskLevel",
            "avgEfficiency" = EXCLUDED."avgEfficiency",
            "updatedAt" = NOW()
        `
        employeeCount++
        console.log(`✅ Empleado ${employee.id}: ${employee.riskScore}/100 (${employee.riskLevel}) - ${employee.efficiency}% eficiencia`)
      } catch (e) {
        console.log(`⚠️ Error con empleado ${employee.id}:`, e.message)
      }
    }
    
    console.log(`\n📊 Resumen de inserción:`)
    console.log(`   - Clientes insertados: ${clientCount}`)
    console.log(`   - Empleados insertados: ${employeeCount}`)
    
    // Verificar totales finales
    const totalClients = await prisma.$queryRaw`SELECT COUNT(*) as count FROM smart_plug_client_anomaly_scores`
    const totalEmployees = await prisma.$queryRaw`SELECT COUNT(*) as count FROM smart_plug_employee_anomaly_scores`
    
    console.log(`\n📈 Totales en BD:`)
    console.log(`   - smart_plug_client_anomaly_scores: ${totalClients[0]?.count || 0} registros`)
    console.log(`   - smart_plug_employee_anomaly_scores: ${totalEmployees[0]?.count || 0} registros`)
    
    // Mostrar distribución por nivel de riesgo
    const clientRiskDist = await prisma.$queryRaw`
      SELECT "riskLevel", COUNT(*) as count 
      FROM smart_plug_client_anomaly_scores 
      GROUP BY "riskLevel" 
      ORDER BY count DESC
    `
    
    const employeeRiskDist = await prisma.$queryRaw`
      SELECT "riskLevel", COUNT(*) as count 
      FROM smart_plug_employee_anomaly_scores 
      GROUP BY "riskLevel" 
      ORDER BY count DESC
    `
    
    console.log(`\n📊 Distribución de riesgo - Clientes:`)
    clientRiskDist.forEach(r => {
      console.log(`   ${r.riskLevel}: ${r.count} clientes`)
    })
    
    console.log(`\n📊 Distribución de riesgo - Empleados:`)
    employeeRiskDist.forEach(r => {
      console.log(`   ${r.riskLevel}: ${r.count} empleados`)
    })
    
    // Mostrar top de riesgo
    const topRiskClients = await prisma.$queryRaw`
      SELECT "clientId", "riskScore", "riskLevel", "anomalyRate" 
      FROM smart_plug_client_anomaly_scores 
      ORDER BY "riskScore" DESC 
      LIMIT 3
    `
    
    const topRiskEmployees = await prisma.$queryRaw`
      SELECT "employeeId", "riskScore", "riskLevel", "avgEfficiency" 
      FROM smart_plug_employee_anomaly_scores 
      ORDER BY "riskScore" DESC 
      LIMIT 3
    `
    
    console.log(`\n🚨 Top clientes de mayor riesgo:`)
    topRiskClients.forEach(c => {
      console.log(`   ${c.clientId}: ${c.riskScore}/100 (${c.riskLevel}) - ${Number(c.anomalyRate).toFixed(1)}% anomalías`)
    })
    
    console.log(`\n🚨 Top empleados de mayor riesgo:`)
    topRiskEmployees.forEach(e => {
      console.log(`   ${e.employeeId}: ${e.riskScore}/100 (${e.riskLevel}) - ${Number(e.avgEfficiency).toFixed(1)}% eficiencia`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  insertSmartPlugDemoData()
    .then(() => {
      console.log('\n🎉 ¡DATOS DEMO INSERTADOS EXITOSAMENTE!')
      console.log('📋 Las tablas de anomalías Smart Plug ahora tienen datos para mostrar en el dashboard.')
      console.log('🔗 Accede al dashboard en: /configuracion/integraciones/EquiposIot/EnchufesInteligentes/anomalies')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script falló:', error)
      process.exit(1)
    })
} 