/**
 * 🧪 TEST DE APIS OPTIMIZADAS
 * ============================
 * 
 * Script para probar las funciones optimizadas de análisis de patrones
 * que ahora usan las tablas de perfiles energéticos en lugar de consultas directas.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 [TEST] Probando APIs optimizadas...')
  
  try {
    // 1️⃣ OBTENER UN SISTEMA VÁLIDO
    const system = await prisma.system.findFirst({
      where: { isActive: true }
    })
    
    if (!system) {
      console.log('⚠️ [TEST] No hay sistemas activos para probar')
      return
    }
    
    console.log(`🏢 [TEST] Usando sistema: ${system.name} (${system.id})`)
    
    // 2️⃣ OBTENER UNA CLÍNICA VÁLIDA
    const clinic = await prisma.clinic.findFirst({
      where: { systemId: system.id, isActive: true }
    })
    
    if (!clinic) {
      console.log('⚠️ [TEST] No hay clínicas activas para probar')
      return
    }
    
    console.log(`🏥 [TEST] Usando clínica: ${clinic.name} (${clinic.id})`)
    
    // 3️⃣ PROBAR ANÁLISIS DE PATRÓN DE CLIENTE
    console.log('\n👤 [TEST] Probando análisis de patrón de cliente...')
    
    const clientProfile = await prisma.clientServiceEnergyProfile.findFirst({
      where: { systemId: system.id, clinicId: clinic.id }
    })
    
    if (clientProfile) {
      console.log(`📊 [CLIENT_TEST] Encontrado perfil para cliente: ${clientProfile.clientId}`)
      
      const clientAnalysis = await analyzeClientPattern(
        clientProfile.clientId, 
        system.id, 
        clinic.id
      )
      
      console.log('📈 [CLIENT_RESULT]:', JSON.stringify(clientAnalysis, null, 2))
    } else {
      console.log('⚠️ [CLIENT_TEST] No hay perfiles de cliente para probar')
    }
    
    // 4️⃣ PROBAR ANÁLISIS DE PATRÓN DE EMPLEADO
    console.log('\n👨‍⚕️ [TEST] Probando análisis de patrón de empleado...')
    
    const userProfile = await prisma.userServiceEnergyProfile.findFirst({
      where: { systemId: system.id, clinicId: clinic.id }
    })
    
    if (userProfile) {
      console.log(`📊 [USER_TEST] Encontrado perfil para empleado: ${userProfile.userId}`)
      
      const userAnalysis = await analyzeEmployeePattern(
        userProfile.userId, 
        system.id, 
        clinic.id
      )
      
      console.log('📈 [USER_RESULT]:', JSON.stringify(userAnalysis, null, 2))
    } else {
      console.log('⚠️ [USER_TEST] No hay perfiles de empleado para probar')
    }
    
    // 5️⃣ MOSTRAR ESTADÍSTICAS GENERALES
    console.log('\n📊 [STATS] Estadísticas generales:')
    
    const stats = await getGeneralStats(system.id, clinic.id)
    console.log(JSON.stringify(stats, null, 2))
    
    console.log('\n✅ [TEST] Pruebas completadas exitosamente!')
    
  } catch (error) {
    console.error('❌ [TEST] Error durante las pruebas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Función copiada de la API optimizada
async function analyzeClientPattern(clientId, systemId, clinicId) {
  try {
    const filter = { systemId, clientId }
    if (clinicId && clinicId !== 'all') {
      filter.clinicId = clinicId
    }

    // 🚀 CONSULTA OPTIMIZADA: Usar tabla de perfiles energéticos de clientes
    const clientProfiles = await prisma.clientServiceEnergyProfile.findMany({
      where: filter,
      select: {
        samples: true,
        meanKwh: true,
        stdDevKwh: true
      }
    })

    if (clientProfiles.length === 0) {
      return {
        totalAppointments: 0,
        anomalyCount: 0,
        anomalyRate: 0,
        mostCommonAnomalyType: 'unknown',
        riskLevel: 'low'
      }
    }

    // 📊 CALCULAR MÉTRICAS DESDE PERFILES OPTIMIZADOS
    const totalSamples = clientProfiles.reduce((sum, p) => sum + p.samples, 0)
    const avgVariability = clientProfiles.reduce((sum, p) => {
      const variability = p.meanKwh > 0 ? (p.stdDevKwh / p.meanKwh) * 100 : 0
      return sum + variability
    }, 0) / clientProfiles.length

    // 🎯 DETERMINAR NIVEL DE RIESGO BASADO EN VARIABILIDAD
    let riskLevel = 'low'
    if (avgVariability > 50) riskLevel = 'critical'
    else if (avgVariability > 30) riskLevel = 'high'
    else if (avgVariability > 15) riskLevel = 'medium'

    return {
      totalAppointments: totalSamples,
      anomalyCount: Math.round(totalSamples * (avgVariability / 100)),
      anomalyRate: avgVariability,
      mostCommonAnomalyType: 'energy_variability',
      riskLevel
    }
  } catch (error) {
    console.error(`❌ Error en analyzeClientPattern para cliente ${clientId}:`, error)
    return {
      totalAppointments: 0,
      anomalyCount: 0,
      anomalyRate: 0,
      mostCommonAnomalyType: 'unknown',
      riskLevel: 'low'
    }
  }
}

// Función copiada de la API optimizada
async function analyzeEmployeePattern(employeeId, systemId, clinicId) {
  try {
    const filter = { systemId, userId: employeeId }
    if (clinicId && clinicId !== 'all') {
      filter.clinicId = clinicId
    }

    // 🚀 CONSULTA OPTIMIZADA: Usar tabla de perfiles energéticos de empleados
    const userProfiles = await prisma.userServiceEnergyProfile.findMany({
      where: filter,
      select: {
        samples: true,
        meanKwh: true,
        stdDevKwh: true,
        meanMinutes: true
      }
    })

    if (userProfiles.length === 0) {
      return {
        totalAppointments: 0,
        anomalyCount: 0,
        anomalyRate: 0,
        avgEfficiency: 100,
        riskLevel: 'low'
      }
    }

    // 📊 CALCULAR MÉTRICAS DESDE PERFILES OPTIMIZADOS
    const totalSamples = userProfiles.reduce((sum, p) => sum + p.samples, 0)
    const avgEnergyVariability = userProfiles.reduce((sum, p) => {
      const variability = p.meanKwh > 0 ? (p.stdDevKwh / p.meanKwh) * 100 : 0
      return sum + variability
    }, 0) / userProfiles.length

    // 🎯 CALCULAR EFICIENCIA BASADA EN CONSISTENCIA ENERGÉTICA
    const avgEfficiency = Math.max(0, 100 - avgEnergyVariability)
    
    let riskLevel = 'low'
    if (avgEfficiency < 50) riskLevel = 'critical'
    else if (avgEfficiency < 70) riskLevel = 'high'
    else if (avgEfficiency < 85) riskLevel = 'medium'

    return {
      totalAppointments: totalSamples,
      anomalyCount: Math.round(totalSamples * (avgEnergyVariability / 100)),
      anomalyRate: avgEnergyVariability,
      avgEfficiency,
      riskLevel
    }
  } catch (error) {
    console.error(`❌ Error en analyzeEmployeePattern para empleado ${employeeId}:`, error)
    return {
      totalAppointments: 0,
      anomalyCount: 0,
      anomalyRate: 0,
      avgEfficiency: 100,
      riskLevel: 'low'
    }
  }
}

async function getGeneralStats(systemId, clinicId) {
  const serviceProfiles = await prisma.serviceEnergyProfile.count({
    where: { systemId }
  })
  
  const clientProfiles = await prisma.clientServiceEnergyProfile.count({
    where: { systemId, clinicId }
  })
  
  const userProfiles = await prisma.userServiceEnergyProfile.count({
    where: { systemId, clinicId }
  })
  
  const energyUsage = await prisma.appointmentServiceEnergyUsage.count({
    where: { systemId, clinicId }
  })
  
  return {
    serviceProfiles,
    clientProfiles,
    userProfiles,
    energyUsage,
    optimizationRatio: energyUsage > 0 ? ((clientProfiles + userProfiles) / energyUsage * 100).toFixed(1) + '%' : '0%'
  }
}

main() 