/**
 * 🔄 SCRIPT DE MIGRACIÓN: POBLAR PERFILES ENERGÉTICOS
 * ===================================================
 * 
 * Este script procesa los datos existentes de appointment_service_energy_usage
 * para poblar las tablas de perfiles energéticos de clientes y empleados.
 * 
 * 🎯 FUNCIONALIDADES:
 * 1. Lee datos de appointment_service_energy_usage
 * 2. Calcula perfiles energéticos usando algoritmo de Welford
 * 3. Puebla smart_plug_client_service_energy_profile
 * 4. Puebla smart_plug_user_service_energy_profile
 * 
 * 📊 ALGORITMO WELFORD IMPLEMENTADO:
 * - Cálculo incremental de media y desviación estándar
 * - Agrupación por systemId, clinicId, clientId/userId, serviceId, hourBucket
 * - Procesamiento eficiente de grandes volúmenes de datos
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation
 * - clinicId: Clínica específica
 * - clientId/userId: Cliente o empleado
 * - serviceId: Servicio específico
 * - hourBucket: Hora del día (0-23)
 * - allocatedKwh: Energía asignada al servicio
 * - realMinutes: Duración real del servicio
 * 
 * @see docs/ENERGY_INSIGHTS_MIGRATION.md
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 [MIGRATION] Iniciando migración de perfiles energéticos...')
  
  try {
    // 1️⃣ OBTENER DATOS EXISTENTES DE LA TABLA DESAGREGADA
    console.log('📊 [MIGRATION] Obteniendo datos de appointment_service_energy_usage...')
    
    const energyUsageData = await prisma.appointmentServiceEnergyUsage.findMany({
      select: {
        systemId: true,
        clinicId: true,
        clientId: true,
        userId: true,
        serviceId: true,
        allocatedKwh: true,
        realMinutes: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    console.log(`📈 [MIGRATION] Encontrados ${energyUsageData.length} registros para procesar`)
    
    if (energyUsageData.length === 0) {
      console.log('⚠️ [MIGRATION] No hay datos para procesar. Ejecuta primero algunas citas con equipos IoT.')
      return
    }
    
    // 2️⃣ PROCESAR PERFILES DE CLIENTES
    console.log('👤 [MIGRATION] Procesando perfiles de clientes...')
    await processClientProfiles(energyUsageData)
    
    // 3️⃣ PROCESAR PERFILES DE EMPLEADOS
    console.log('👨‍⚕️ [MIGRATION] Procesando perfiles de empleados...')
    await processUserProfiles(energyUsageData)
    
    console.log('✅ [MIGRATION] Migración completada exitosamente!')
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error durante la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 👤 PROCESAR PERFILES ENERGÉTICOS DE CLIENTES
 */
async function processClientProfiles(energyUsageData) {
  // Filtrar solo registros con clientId
  const clientData = energyUsageData.filter(record => record.clientId)
  
  if (clientData.length === 0) {
    console.log('⚠️ [CLIENT_PROFILES] No hay datos de clientes para procesar')
    return
  }
  
  console.log(`📊 [CLIENT_PROFILES] Procesando ${clientData.length} registros de clientes...`)
  
  // Agrupar por systemId, clinicId, clientId, serviceId, hourBucket
  const clientGroups = new Map()
  
  for (const record of clientData) {
    const hourBucket = new Date(record.createdAt).getHours()
    const key = `${record.systemId}-${record.clinicId}-${record.clientId}-${record.serviceId}-${hourBucket}`
    
    if (!clientGroups.has(key)) {
      clientGroups.set(key, {
        systemId: record.systemId,
        clinicId: record.clinicId,
        clientId: record.clientId,
        serviceId: record.serviceId,
        hourBucket: hourBucket,
        samples: []
      })
    }
    
    clientGroups.get(key).samples.push({
      kwh: record.allocatedKwh,
      minutes: record.realMinutes
    })
  }
  
  console.log(`🔄 [CLIENT_PROFILES] Calculando ${clientGroups.size} perfiles únicos de clientes...`)
  
  let processedCount = 0
  
  for (const [key, group] of clientGroups) {
    const stats = calculateWelfordStats(group.samples)
    
    try {
      await prisma.clientServiceEnergyProfile.upsert({
        where: {
          clinicId_clientId_serviceId_hourBucket: {
            clinicId: group.clinicId,
            clientId: group.clientId,
            serviceId: group.serviceId,
            hourBucket: group.hourBucket
          }
        },
        update: {
          meanKwh: stats.meanKwh,
          stdDevKwh: stats.stdDevKwh,
          meanMinutes: stats.meanMinutes,
          stdDevMinutes: stats.stdDevMinutes,
          samples: stats.samples,
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          systemId: group.systemId,
          clinicId: group.clinicId,
          clientId: group.clientId,
          serviceId: group.serviceId,
          hourBucket: group.hourBucket,
          meanKwh: stats.meanKwh,
          stdDevKwh: stats.stdDevKwh,
          meanMinutes: stats.meanMinutes,
          stdDevMinutes: stats.stdDevMinutes,
          samples: stats.samples,
          m2: 0,
          updatedAt: new Date()
        }
      })
      
      processedCount++
      
      if (processedCount % 10 === 0) {
        console.log(`📈 [CLIENT_PROFILES] Procesados ${processedCount}/${clientGroups.size} perfiles...`)
      }
      
    } catch (error) {
      console.error(`❌ [CLIENT_PROFILES] Error procesando perfil ${key}:`, error)
    }
  }
  
  console.log(`✅ [CLIENT_PROFILES] Completado: ${processedCount} perfiles de clientes procesados`)
}

/**
 * 👨‍⚕️ PROCESAR PERFILES ENERGÉTICOS DE EMPLEADOS
 */
async function processUserProfiles(energyUsageData) {
  // Filtrar solo registros con userId
  const userData = energyUsageData.filter(record => record.userId)
  
  if (userData.length === 0) {
    console.log('⚠️ [USER_PROFILES] No hay datos de empleados para procesar')
    return
  }
  
  console.log(`📊 [USER_PROFILES] Procesando ${userData.length} registros de empleados...`)
  
  // Agrupar por systemId, clinicId, userId, serviceId, hourBucket
  const userGroups = new Map()
  
  for (const record of userData) {
    const hourBucket = new Date(record.createdAt).getHours()
    const key = `${record.systemId}-${record.clinicId}-${record.userId}-${record.serviceId}-${hourBucket}`
    
    if (!userGroups.has(key)) {
      userGroups.set(key, {
        systemId: record.systemId,
        clinicId: record.clinicId,
        userId: record.userId,
        serviceId: record.serviceId,
        hourBucket: hourBucket,
        samples: []
      })
    }
    
    userGroups.get(key).samples.push({
      kwh: record.allocatedKwh,
      minutes: record.realMinutes
    })
  }
  
  console.log(`🔄 [USER_PROFILES] Calculando ${userGroups.size} perfiles únicos de empleados...`)
  
  let processedCount = 0
  
  for (const [key, group] of userGroups) {
    const stats = calculateWelfordStats(group.samples)
    
    try {
      await prisma.userServiceEnergyProfile.upsert({
        where: {
          clinicId_userId_serviceId_hourBucket: {
            clinicId: group.clinicId,
            userId: group.userId,
            serviceId: group.serviceId,
            hourBucket: group.hourBucket
          }
        },
        update: {
          meanKwh: stats.meanKwh,
          stdDevKwh: stats.stdDevKwh,
          meanMinutes: stats.meanMinutes,
          stdDevMinutes: stats.stdDevMinutes,
          samples: stats.samples,
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          systemId: group.systemId,
          clinicId: group.clinicId,
          userId: group.userId,
          serviceId: group.serviceId,
          hourBucket: group.hourBucket,
          meanKwh: stats.meanKwh,
          stdDevKwh: stats.stdDevKwh,
          meanMinutes: stats.meanMinutes,
          stdDevMinutes: stats.stdDevMinutes,
          samples: stats.samples,
          m2: 0,
          updatedAt: new Date()
        }
      })
      
      processedCount++
      
      if (processedCount % 10 === 0) {
        console.log(`📈 [USER_PROFILES] Procesados ${processedCount}/${userGroups.size} perfiles...`)
      }
      
    } catch (error) {
      console.error(`❌ [USER_PROFILES] Error procesando perfil ${key}:`, error)
    }
  }
  
  console.log(`✅ [USER_PROFILES] Completado: ${processedCount} perfiles de empleados procesados`)
}

/**
 * 📊 CALCULAR ESTADÍSTICAS CON ALGORITMO WELFORD
 */
function calculateWelfordStats(samples) {
  if (samples.length === 0) {
    return {
      meanKwh: 0,
      stdDevKwh: 0,
      meanMinutes: 0,
      stdDevMinutes: 0,
      samples: 0
    }
  }
  
  let sampleCount = 0
  let meanKwh = 0
  let m2Kwh = 0
  let meanMinutes = 0
  let m2Minutes = 0
  
  // Algoritmo de Welford para kWh y minutos
  for (const sample of samples) {
    sampleCount++
    
    // Welford para kWh
    const deltaKwh = sample.kwh - meanKwh
    meanKwh = meanKwh + deltaKwh / sampleCount
    const delta2Kwh = sample.kwh - meanKwh
    m2Kwh = m2Kwh + deltaKwh * delta2Kwh
    
    // Welford para minutos
    const deltaMin = sample.minutes - meanMinutes
    meanMinutes = meanMinutes + deltaMin / sampleCount
    const delta2Min = sample.minutes - meanMinutes
    m2Minutes = m2Minutes + deltaMin * delta2Min
  }
  
  const stdDevKwh = sampleCount > 1 ? Math.sqrt(m2Kwh / (sampleCount - 1)) : 0
  const stdDevMinutes = sampleCount > 1 ? Math.sqrt(m2Minutes / (sampleCount - 1)) : 0
  
  return {
    meanKwh: meanKwh,
    stdDevKwh: stdDevKwh,
    meanMinutes: meanMinutes,
    stdDevMinutes: stdDevMinutes,
    samples: sampleCount
  }
}

// Ejecutar el script
main()
  .catch((error) => {
    console.error('💥 [MIGRATION] Error fatal:', error)
    process.exit(1)
  }) 