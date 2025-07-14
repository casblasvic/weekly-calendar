/**
 * 🔍 VERIFICACIÓN DEL SISTEMA DE SCORING DE ANOMALÍAS
 * ===================================================
 * 
 * Script para verificar que la migración al sistema de scoring
 * se completó correctamente y el sistema funciona como esperado.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 [VERIFY] Verificando sistema de scoring de anomalías...')
  
  try {
    // 1️⃣ VERIFICAR ESTRUCTURA DE TABLAS
    console.log('\n📊 [VERIFY] Verificando estructura de base de datos...')
    
    const clientScores = await prisma.clientAnomalyScore.count()
    const employeeScores = await prisma.employeeAnomalyScore.count()
    const serviceProfiles = await prisma.serviceEnergyProfile.count()
    
    // Verificar que las tablas obsoletas fueron eliminadas
    let clientProfiles = 0
    let userProfiles = 0
    
    try {
      clientProfiles = await prisma.clientServiceEnergyProfile.count()
      userProfiles = await prisma.userServiceEnergyProfile.count()
    } catch (error) {
      // Esperado si las tablas fueron eliminadas
      console.log('✅ [VERIFY] Tablas de perfiles energéticos eliminadas correctamente')
    }
    
    console.log(`📈 [VERIFY] Estado actual:`)
    console.log(`   - Scores de clientes: ${clientScores}`)
    console.log(`   - Scores de empleados: ${employeeScores}`)
    console.log(`   - Perfiles de servicios: ${serviceProfiles} (mantenidos)`)
    console.log(`   - Perfiles de clientes: ${clientProfiles} (eliminados)`)
    console.log(`   - Perfiles de empleados: ${userProfiles} (eliminados)`)
    
    // 2️⃣ VERIFICAR DATOS DE ENERGY INSIGHTS
    console.log('\n🎯 [VERIFY] Verificando datos disponibles...')
    
    const energyUsage = await prisma.appointmentServiceEnergyUsage.count()
    const deviceInsights = await prisma.deviceUsageInsight.count()
    const systems = await prisma.system.count()
    const clinics = await prisma.clinic.count()
    
    console.log(`📊 [VERIFY] Datos del sistema:`)
    console.log(`   - Registros de uso energético: ${energyUsage}`)
    console.log(`   - Insights de dispositivos: ${deviceInsights}`)
    console.log(`   - Sistemas activos: ${systems}`)
    console.log(`   - Clínicas: ${clinics}`)
    
    // 3️⃣ VERIFICAR FUNCIONALIDAD BÁSICA
    console.log('\n🧪 [VERIFY] Probando funcionalidad básica...')
    
    if (clientScores > 0) {
      const sampleClient = await prisma.clientAnomalyScore.findFirst({
        include: {
          client: {
            select: { firstName: true, lastName: true }
          }
        }
      })
      
      if (sampleClient) {
        console.log(`👤 [VERIFY] Score de cliente ejemplo:`)
        console.log(`   - Cliente: ${sampleClient.client.firstName} ${sampleClient.client.lastName}`)
        console.log(`   - Risk Score: ${sampleClient.riskScore}/100`)
        console.log(`   - Risk Level: ${sampleClient.riskLevel}`)
        console.log(`   - Anomalías: ${sampleClient.totalAnomalies}/${sampleClient.totalServices}`)
        console.log(`   - Tasa: ${sampleClient.anomalyRate}%`)
      }
    }
    
    if (employeeScores > 0) {
      const sampleEmployee = await prisma.employeeAnomalyScore.findFirst({
        include: {
          employee: {
            select: { firstName: true, lastName: true }
          }
        }
      })
      
      if (sampleEmployee) {
        console.log(`👨‍⚕️ [VERIFY] Score de empleado ejemplo:`)
        console.log(`   - Empleado: ${sampleEmployee.employee.firstName} ${sampleEmployee.employee.lastName}`)
        console.log(`   - Risk Score: ${sampleEmployee.riskScore}/100`)
        console.log(`   - Risk Level: ${sampleEmployee.riskLevel}`)
        console.log(`   - Eficiencia: ${sampleEmployee.avgEfficiency}%`)
        console.log(`   - Consistencia: ${sampleEmployee.consistencyScore}%`)
      }
    }
    
    // 4️⃣ CALCULAR OPTIMIZACIÓN LOGRADA
    console.log('\n🚀 [VERIFY] Cálculo de optimización...')
    
    const oldSystemRecords = clientProfiles + userProfiles
    const newSystemRecords = clientScores + employeeScores
    const memoryBefore = oldSystemRecords * 200 // bytes estimados
    const memoryAfter = newSystemRecords * 200
    const reduction = oldSystemRecords > 0 ? 
      ((oldSystemRecords - newSystemRecords) / oldSystemRecords * 100).toFixed(1) : 0
    
    console.log(`📊 [VERIFY] Optimización lograda:`)
    console.log(`   - Registros antes: ${oldSystemRecords}`)
    console.log(`   - Registros después: ${newSystemRecords}`)
    console.log(`   - Reducción: ${reduction}%`)
    console.log(`   - Memoria antes: ${(memoryBefore / 1024).toFixed(1)} KB`)
    console.log(`   - Memoria después: ${(memoryAfter / 1024).toFixed(1)} KB`)
    console.log(`   - Memoria liberada: ${((memoryBefore - memoryAfter) / 1024).toFixed(1)} KB`)
    
    // 5️⃣ VERIFICAR ÍNDICES Y RENDIMIENTO
    console.log('\n⚡ [VERIFY] Verificando rendimiento...')
    
    const startTime = Date.now()
    
    // Consulta típica del dashboard
    const highRiskClients = await prisma.clientAnomalyScore.findMany({
      where: {
        riskLevel: {
          in: ['high', 'critical']
        }
      },
      take: 10,
      orderBy: {
        riskScore: 'desc'
      }
    })
    
    const highRiskEmployees = await prisma.employeeAnomalyScore.findMany({
      where: {
        riskLevel: {
          in: ['high', 'critical']
        }
      },
      take: 10,
      orderBy: {
        riskScore: 'desc'
      }
    })
    
    const queryTime = Date.now() - startTime
    
    console.log(`🔍 [VERIFY] Consultas de dashboard:`)
    console.log(`   - Clientes de alto riesgo: ${highRiskClients.length}`)
    console.log(`   - Empleados de alto riesgo: ${highRiskEmployees.length}`)
    console.log(`   - Tiempo de consulta: ${queryTime}ms`)
    
    // 6️⃣ RESUMEN FINAL
    console.log('\n🎉 [VERIFY] Resumen de verificación:')
    
    const checks = [
      { name: 'Tablas de scoring creadas', status: clientScores >= 0 && employeeScores >= 0 },
      { name: 'Perfiles energéticos eliminados', status: clientProfiles === 0 && userProfiles === 0 },
      { name: 'Perfiles de servicios mantenidos', status: serviceProfiles > 0 },
      { name: 'Datos de energy usage disponibles', status: energyUsage > 0 },
      { name: 'Insights de dispositivos disponibles', status: deviceInsights > 0 },
      { name: 'Consultas rápidas funcionando', status: queryTime < 1000 },
      { name: 'Optimización significativa lograda', status: reduction > 50 }
    ]
    
    let passedChecks = 0
    checks.forEach(check => {
      const icon = check.status ? '✅' : '❌'
      console.log(`   ${icon} ${check.name}`)
      if (check.status) passedChecks++
    })
    
    const successRate = (passedChecks / checks.length * 100).toFixed(1)
    console.log(`\n📈 [VERIFY] Tasa de éxito: ${successRate}% (${passedChecks}/${checks.length})`)
    
    if (successRate >= 85) {
      console.log('\n🎉 [VERIFY] ¡MIGRACIÓN EXITOSA! El sistema de scoring está funcionando correctamente.')
    } else {
      console.log('\n⚠️ [VERIFY] La migración necesita revisión. Algunos checks fallaron.')
    }
    
  } catch (error) {
    console.error('❌ [VERIFY] Error durante la verificación:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar verificación
main()
  .catch((error) => {
    console.error('💥 [VERIFY] Verificación falló:', error)
    process.exit(1)
  }) 