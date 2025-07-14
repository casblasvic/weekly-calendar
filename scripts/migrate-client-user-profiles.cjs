/**
 * 🔄 MIGRACIÓN DE PERFILES DE CLIENTES Y EMPLEADOS
 * ================================================
 * 
 * Script para poblar las tablas ClientServiceEnergyProfile y UserServiceEnergyProfile
 * usando los datos existentes de AppointmentServiceEnergyUsage.
 * 
 * Aplica la misma lógica que usage-finalizer.ts pero en modo batch para datos históricos.
 * 
 * 🎯 OBJETIVO:
 * - Procesar todos los registros existentes de AppointmentServiceEnergyUsage
 * - Crear/actualizar perfiles de clientes (ClientServiceEnergyProfile)
 * - Crear/actualizar perfiles de empleados (UserServiceEnergyProfile)
 * - Usar algoritmo de Welford para estadísticas incrementales
 * 
 * Variables críticas:
 * - systemId: Multi-tenant isolation
 * - clientId/userId: IDs de cliente y empleado
 * - serviceId: ID del servicio
 * - hourBucket: Hora del día (0-23)
 * - meanKwh/meanMinutes: Medias calculadas con Welford
 * - samples: Número de muestras procesadas
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migración de perfiles de clientes y empleados...')
  
  try {
    // 1️⃣ OBTENER TODOS LOS REGISTROS DE ENERGÍA DESAGREGADA
    console.log('📊 Obteniendo registros de AppointmentServiceEnergyUsage...')
    
    const energyUsages = await prisma.appointmentServiceEnergyUsage.findMany({
      where: {
        allocatedKwh: { gt: 0 },
        realMinutes: { gt: 0 }
      },
      include: {
        service: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Procesar en orden cronológico para Welford
      }
    })

    console.log(`📈 Encontrados ${energyUsages.length} registros para procesar`)

    if (energyUsages.length === 0) {
      console.log('⚠️ No hay registros para procesar. Ejecuta primero npm run db:seed')
      return
    }

    // 2️⃣ AGRUPAR DATOS POR CLIENTE Y EMPLEADO
    const clientData = new Map() // key: systemId-clinicId-clientId-serviceId-hourBucket
    const userData = new Map()   // key: systemId-clinicId-userId-serviceId-hourBucket

    console.log('🔄 Agrupando datos por cliente y empleado...')

    for (const usage of energyUsages) {
      const hourBucket = new Date(usage.createdAt).getHours()
      
      // 👤 PROCESAR DATOS DE CLIENTE
      if (usage.clientId) {
        const clientKey = `${usage.systemId}-${usage.clinicId}-${usage.clientId}-${usage.serviceId}-${hourBucket}`
        
        if (!clientData.has(clientKey)) {
          clientData.set(clientKey, {
            systemId: usage.systemId,
            clinicId: usage.clinicId,
            clientId: usage.clientId,
            serviceId: usage.serviceId,
            hourBucket: hourBucket,
            samples: [],
            serviceName: usage.service?.name || 'Desconocido'
          })
        }
        
        clientData.get(clientKey).samples.push({
          kwh: usage.allocatedKwh,
          minutes: usage.realMinutes
        })
      }

      // 👨‍⚕️ PROCESAR DATOS DE EMPLEADO
      if (usage.userId) {
        const userKey = `${usage.systemId}-${usage.clinicId}-${usage.userId}-${usage.serviceId}-${hourBucket}`
        
        if (!userData.has(userKey)) {
          userData.set(userKey, {
            systemId: usage.systemId,
            clinicId: usage.clinicId,
            userId: usage.userId,
            serviceId: usage.serviceId,
            hourBucket: hourBucket,
            samples: [],
            serviceName: usage.service?.name || 'Desconocido'
          })
        }
        
        userData.get(userKey).samples.push({
          kwh: usage.allocatedKwh,
          minutes: usage.realMinutes
        })
      }
    }

    console.log(`📊 Agrupados: ${clientData.size} perfiles de cliente, ${userData.size} perfiles de empleado`)

    // 3️⃣ PROCESAR PERFILES DE CLIENTES
    console.log('👤 Procesando perfiles de clientes...')
    let clientProfilesCreated = 0
    
    for (const [key, data] of clientData) {
      try {
        // 🧮 APLICAR ALGORITMO DE WELFORD
        const stats = calculateWelfordStats(data.samples)
        
        // 💾 CREAR/ACTUALIZAR PERFIL DE CLIENTE
        await prisma.clientServiceEnergyProfile.upsert({
          where: {
            systemId_clinicId_clientId_serviceId_hourBucket: {
              systemId: data.systemId,
              clinicId: data.clinicId,
              clientId: data.clientId,
              serviceId: data.serviceId,
              hourBucket: data.hourBucket
            }
          },
          update: {
            meanKwh: stats.meanKwh,
            stdDevKwh: stats.stdDevKwh,
            meanMinutes: stats.meanMinutes,
            stdDevMinutes: stats.stdDevMinutes,
            samples: stats.sampleCount
          },
          create: {
            id: crypto.randomUUID(),
            systemId: data.systemId,
            clinicId: data.clinicId,
            clientId: data.clientId,
            serviceId: data.serviceId,
            hourBucket: data.hourBucket,
            meanKwh: stats.meanKwh,
            stdDevKwh: stats.stdDevKwh,
            meanMinutes: stats.meanMinutes,
            stdDevMinutes: stats.stdDevMinutes,
            samples: stats.sampleCount
          }
        })
        
        clientProfilesCreated++
        
        if (clientProfilesCreated % 10 === 0) {
          console.log(`   ✅ ${clientProfilesCreated} perfiles de cliente procesados...`)
        }
        
      } catch (error) {
        console.error(`❌ Error procesando perfil de cliente ${key}:`, error)
      }
    }

    // 4️⃣ PROCESAR PERFILES DE EMPLEADOS
    console.log('👨‍⚕️ Procesando perfiles de empleados...')
    let userProfilesCreated = 0
    
    for (const [key, data] of userData) {
      try {
        // 🧮 APLICAR ALGORITMO DE WELFORD
        const stats = calculateWelfordStats(data.samples)
        
        // 💾 CREAR/ACTUALIZAR PERFIL DE EMPLEADO
        await prisma.userServiceEnergyProfile.upsert({
          where: {
            systemId_clinicId_userId_serviceId_hourBucket: {
              systemId: data.systemId,
              clinicId: data.clinicId,
              userId: data.userId,
              serviceId: data.serviceId,
              hourBucket: data.hourBucket
            }
          },
          update: {
            meanKwh: stats.meanKwh,
            stdDevKwh: stats.stdDevKwh,
            meanMinutes: stats.meanMinutes,
            stdDevMinutes: stats.stdDevMinutes,
            samples: stats.sampleCount
          },
          create: {
            id: crypto.randomUUID(),
            systemId: data.systemId,
            clinicId: data.clinicId,
            userId: data.userId,
            serviceId: data.serviceId,
            hourBucket: data.hourBucket,
            meanKwh: stats.meanKwh,
            stdDevKwh: stats.stdDevKwh,
            meanMinutes: stats.meanMinutes,
            stdDevMinutes: stats.stdDevMinutes,
            samples: stats.sampleCount
          }
        })
        
        userProfilesCreated++
        
        if (userProfilesCreated % 10 === 0) {
          console.log(`   ✅ ${userProfilesCreated} perfiles de empleado procesados...`)
        }
        
      } catch (error) {
        console.error(`❌ Error procesando perfil de empleado ${key}:`, error)
      }
    }

    // 5️⃣ RESUMEN FINAL
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE')
    console.log('=====================================')
    console.log(`📊 Registros procesados: ${energyUsages.length}`)
    console.log(`👤 Perfiles de cliente creados/actualizados: ${clientProfilesCreated}`)
    console.log(`👨‍⚕️ Perfiles de empleado creados/actualizados: ${userProfilesCreated}`)
    console.log(`⚡ Total perfiles: ${clientProfilesCreated + userProfilesCreated}`)
    
    // 6️⃣ VERIFICACIÓN FINAL
    const clientCount = await prisma.clientServiceEnergyProfile.count()
    const userCount = await prisma.userServiceEnergyProfile.count()
    
    console.log('\n📈 VERIFICACIÓN DE TABLAS:')
    console.log(`👤 ClientServiceEnergyProfile: ${clientCount} registros`)
    console.log(`👨‍⚕️ UserServiceEnergyProfile: ${userCount} registros`)
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * 🧮 FUNCIÓN AUXILIAR: Calcular estadísticas con algoritmo de Welford
 * 
 * Implementa el algoritmo de Welford para calcular media y desviación estándar
 * de manera incremental y matemáticamente precisa.
 */
function calculateWelfordStats(samples) {
  if (!samples || samples.length === 0) {
    return {
      meanKwh: 0,
      stdDevKwh: 0,
      meanMinutes: 0,
      stdDevMinutes: 0,
      sampleCount: 0
    }
  }

  let sampleCount = 0
  let meanKwh = 0
  let m2Kwh = 0
  let meanMinutes = 0
  let m2Minutes = 0

  // 🔄 ALGORITMO DE WELFORD PARA kWh Y MINUTOS
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

  // 📊 CALCULAR DESVIACIONES ESTÁNDAR
  const stdDevKwh = sampleCount > 1 ? Math.sqrt(m2Kwh / (sampleCount - 1)) : 0
  const stdDevMinutes = sampleCount > 1 ? Math.sqrt(m2Minutes / (sampleCount - 1)) : 0

  return {
    meanKwh: Number(meanKwh.toFixed(6)),
    stdDevKwh: Number(stdDevKwh.toFixed(6)),
    meanMinutes: Number(meanMinutes.toFixed(2)),
    stdDevMinutes: Number(stdDevMinutes.toFixed(2)),
    sampleCount
  }
}

// 🚀 EJECUTAR SCRIPT
main()
  .catch((e) => {
    console.error('💥 Error fatal:', e)
    process.exit(1)
  }) 