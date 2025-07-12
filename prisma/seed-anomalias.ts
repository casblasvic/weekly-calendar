/**
 * 🔬 SEED ANOMALÍAS REALISTAS - Energy Insights Test Data
 * ========================================================
 * 
 * Genera casos de prueba realistas para el dashboard de Energy Insights:
 * - SOLO servicios de depilación láser (realista para clínicas)
 * - Múltiples citas con diferentes combinaciones de servicios
 * - Perfiles estadísticos correctos usando finalizeDeviceUsage()
 * - Empleados y clientes variados para análisis de comportamiento
 * - Anomalías controladas y casos normales para entrenar algoritmos
 * 
 * SERVICIOS DE DEPILACIÓN INCLUIDOS:
 * - Depilación Axilas (5min, 180W)
 * - Depilación Medias Piernas (25min, 220W) 
 * - Depilación Piernas Completas (45min, 240W)
 * - Depilación Medios Brazos (20min, 200W)
 * - Depilación Brazos Enteros (35min, 210W)
 * - Depilación Facial (10min, 160W)
 * - Depilación Bigote (8min, 150W)
 * - Depilación Espalda (50min, 250W)
 * - Depilación Manos (12min, 170W)
 * - Depilación Bikini (15min, 190W)
 * 
 * Uso: Se llama desde seed.ts al final para poblar datos de prueba
 */

import { PrismaClient, AppointmentServiceStatus, UsageInsightType } from '@prisma/client'
import { finalizeDeviceUsage } from '@/lib/energy/usage-finalizer'

// Configuración del dispositivo Shelly de prueba
const SHELLY_DEVICE_CONFIG = {
  id: 'cmcs60vu70001y2h6i6w95tt5',
  deviceId: 'e465b84533f0',
  deviceIp: '192.168.1.33',
  equipmentClinicAssignmentId: 'cmcw9sei30001y2z3tftwcq83'
}

// Patrones de consumo REALISTAS por servicio de depilación (basado en láser diodo real)
const DEPILATION_POWER_PATTERNS = {
  'Depilación Axilas': {
    basePower: 180,
    variation: 25,
    duration: 5,
    expectedKwh: 0.015 // 180W * 5min / 60
  },
  'Depilación Medias Piernas': {
    basePower: 220,
    variation: 35,
    duration: 25,
    expectedKwh: 0.092 // 220W * 25min / 60
  },
  'Depilación Piernas Completas': {
    basePower: 240,
    variation: 40,
    duration: 45,
    expectedKwh: 0.180 // 240W * 45min / 60
  },
  'Depilación Medios Brazos': {
    basePower: 200,
    variation: 30,
    duration: 20,
    expectedKwh: 0.067 // 200W * 20min / 60
  },
  'Depilación Brazos Enteros': {
    basePower: 210,
    variation: 35,
    duration: 35,
    expectedKwh: 0.123 // 210W * 35min / 60
  },
  'Depilación Facial': {
    basePower: 160,
    variation: 20,
    duration: 10,
    expectedKwh: 0.027 // 160W * 10min / 60
  },
  'Depilación Bigote': {
    basePower: 150,
    variation: 15,
    duration: 8,
    expectedKwh: 0.020 // 150W * 8min / 60
  },
  'Depilación Espalda': {
    basePower: 250,
    variation: 45,
    duration: 50,
    expectedKwh: 0.208 // 250W * 50min / 60
  },
  'Depilación Manos': {
    basePower: 170,
    variation: 25,
    duration: 12,
    expectedKwh: 0.034 // 170W * 12min / 60
  },
  'Depilación Bikini': {
    basePower: 190,
    variation: 30,
    duration: 15,
    expectedKwh: 0.048 // 190W * 15min / 60
  }
}

// Tipos de anomalías a generar
const ANOMALY_SCENARIOS = {
  NORMAL: 'Comportamiento normal',
  OVER_CONSUMPTION: 'Sobre-consumo energético',
  UNDER_CONSUMPTION: 'Sub-consumo energético', 
  OVER_DURATION: 'Duración excesiva',
  UNDER_DURATION: 'Duración insuficiente',
  EMPLOYEE_FRAUD: 'Posible fraude empleado',
  CLIENT_FRAUD: 'Posible fraude cliente',
  EQUIPMENT_ISSUE: 'Problema de equipo',
  EFFICIENT_EMPLOYEE: 'Empleado muy eficiente'
}

// Combinaciones de servicios típicas en clínicas de depilación
const TYPICAL_SERVICE_COMBINATIONS = [
  // Servicios individuales
  ['Depilación Axilas'],
  ['Depilación Bigote'],
  ['Depilación Facial'],
  ['Depilación Manos'],
  ['Depilación Bikini'],
  
  // Combinaciones comunes
  ['Depilación Axilas', 'Depilación Bigote'],
  ['Depilación Medias Piernas', 'Depilación Axilas'],
  ['Depilación Piernas Completas', 'Depilación Axilas', 'Depilación Bikini'],
  ['Depilación Medios Brazos', 'Depilación Axilas'],
  ['Depilación Brazos Enteros', 'Depilación Axilas'],
  ['Depilación Facial', 'Depilación Bigote'],
  
  // Paquetes completos
  ['Depilación Piernas Completas', 'Depilación Brazos Enteros', 'Depilación Axilas'],
  ['Depilación Espalda', 'Depilación Piernas Completas'],
  ['Depilación Medias Piernas', 'Depilación Medios Brazos', 'Depilación Axilas', 'Depilación Facial'],
]

export async function seedAnomalias(prisma: PrismaClient, systemId: string) {
  console.log('🔬 Generando datos de prueba realistas para Energy Insights...')
  
  try {
    // 1. Obtener datos base existentes
    const baseData = await getBaseData(prisma, systemId)
    
    // 2. Crear servicios de depilación adicionales si no existen
    await ensureDepilationServices(prisma, systemId, baseData)
    
    // 3. Actualizar datos base con nuevos servicios
    const updatedBaseData = await getBaseData(prisma, systemId)
    
    // 4. Generar múltiples escenarios de citas
    await generateRealisticAppointments(prisma, updatedBaseData, systemId)
    
    console.log('✅ Datos de prueba generados exitosamente')
    
  } catch (error) {
    console.error('❌ Error generando datos de prueba:', error)
    throw error
  }
}

async function getBaseData(prisma: PrismaClient, systemId: string) {
  console.log('📋 Obteniendo datos base...')
  
  const [clients, employees, services, clinics, equipment] = await Promise.all([
    // Clientes existentes
    prisma.person.findMany({
      where: { 
        systemId,
        functionalRoles: { some: { roleType: 'CLIENT' } }
      },
      take: 10,
      orderBy: { createdAt: 'asc' }
    }),
    
    // Empleados existentes  
    prisma.user.findMany({
      where: { systemId, isActive: true },
      take: 8,
      orderBy: { createdAt: 'asc' }
    }),
    
    // Servicios de depilación
    prisma.service.findMany({
      where: { 
        systemId,
        name: { contains: 'Depilación' }
      }
    }),
    
    // Clínicas activas
    prisma.clinic.findMany({
      where: { systemId, isActive: true },
      take: 2
    }),
    
    // Equipos láser
    prisma.equipment.findMany({
      where: { 
        systemId,
        name: { contains: 'Láser' }
      },
      take: 1
    })
  ])
  
  console.log(`📊 Datos encontrados: ${clients.length} clientes, ${employees.length} empleados, ${services.length} servicios, ${clinics.length} clínicas, ${equipment.length} equipos`)
  
  return { clients, employees, services, clinics, equipment }
}

async function ensureDepilationServices(prisma: PrismaClient, systemId: string, baseData: any) {
  console.log('🔧 Creando servicios de depilación adicionales...')
  
  // Obtener categoría de depilación
  const depilationCategory = await prisma.category.findFirst({
    where: { 
      systemId,
      name: { contains: 'Depilación' }
    }
  })
  
  if (!depilationCategory) {
    console.warn('⚠️ No se encontró categoría de depilación, creando servicios sin categoría')
  }
  
  // Obtener IVA por defecto
  const defaultVat = await prisma.vATType.findFirst({
    where: { systemId, isDefault: true }
  })
  
  const servicesToCreate = [
    { name: 'Depilación Medias Piernas', duration: 25, price: 85 },
    { name: 'Depilación Piernas Completas', duration: 45, price: 140 },
    { name: 'Depilación Medios Brazos', duration: 20, price: 65 },
    { name: 'Depilación Brazos Enteros', duration: 35, price: 95 },
    { name: 'Depilación Facial', duration: 10, price: 35 },
    { name: 'Depilación Bigote', duration: 8, price: 25 },
    { name: 'Depilación Espalda', duration: 50, price: 160 },
    { name: 'Depilación Manos', duration: 12, price: 40 },
    { name: 'Depilación Bikini', duration: 15, price: 55 }
  ]
  
  for (const serviceData of servicesToCreate) {
    try {
      await prisma.service.upsert({
        where: {
          name_systemId: {
            name: serviceData.name,
            systemId
          }
        },
        update: {
          durationMinutes: serviceData.duration,
          treatmentDurationMinutes: serviceData.duration,
          price: serviceData.price
        },
        create: {
          name: serviceData.name,
          description: `Servicio de ${serviceData.name.toLowerCase()} con láser diodo`,
          durationMinutes: serviceData.duration,
          treatmentDurationMinutes: serviceData.duration,
          price: serviceData.price,
          systemId,
          categoryId: depilationCategory?.id,
          vatTypeId: defaultVat?.id,
          colorCode: '#ec4899' // Rosa para depilación
        }
      })
      
      console.log(`  ✅ Servicio creado/actualizado: ${serviceData.name}`)
    } catch (error) {
      console.log(`  ⚠️ Error con servicio ${serviceData.name}:`, error instanceof Error ? error.message : 'Error desconocido')
    }
  }
}

async function generateRealisticAppointments(prisma: PrismaClient, baseData: any, systemId: string) {
  console.log('📅 Generando citas realistas...')
  
  const { clients, employees, services, clinics, equipment } = baseData
  
  if (clients.length === 0 || employees.length === 0 || services.length === 0 || clinics.length === 0) {
    console.warn('⚠️ Datos insuficientes para generar citas')
    return
  }
  
  // Generar 50 citas variadas en los últimos 30 días
  const appointmentsToGenerate = 50
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  for (let i = 0; i < appointmentsToGenerate; i++) {
    try {
      // Fecha aleatoria en los últimos 30 días
      const appointmentDate = new Date(
        thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
      )
      
      // Hora de trabajo (9:00 - 18:00)
      appointmentDate.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60))
      
      // Seleccionar datos aleatorios
      const client = clients[Math.floor(Math.random() * clients.length)]
      const employee = employees[Math.floor(Math.random() * employees.length)]
      const clinic = clinics[Math.floor(Math.random() * clinics.length)]
      const selectedEquipment = equipment[0] || null // Usar primer equipo disponible
      
      // Seleccionar combinación de servicios
      const servicesCombination = TYPICAL_SERVICE_COMBINATIONS[
        Math.floor(Math.random() * TYPICAL_SERVICE_COMBINATIONS.length)
      ]
      
      // Filtrar servicios que existen en la BD
      const availableServices = servicesCombination
        .map(serviceName => services.find(s => s.name === serviceName))
        .filter(Boolean)
      
      if (availableServices.length === 0) {
        console.log(`  ⚠️ No se encontraron servicios para la combinación: ${servicesCombination.join(', ')}`)
        continue
      }
      
      // Calcular duración total
      const totalDuration = availableServices.reduce((sum, service) => sum + service.durationMinutes, 0)
      
      // Determinar tipo de escenario (80% normal, 20% anomalías)
      const scenarioType = Math.random() < 0.8 ? 'NORMAL' : getRandomAnomalyType()
      
      await generateSingleAppointment(
        prisma, 
        systemId,
        {
          client,
          employee,
          clinic,
          equipment: selectedEquipment,
          services: availableServices,
          appointmentDate,
          totalDuration,
          scenarioType
        }
      )
      
      console.log(`  📅 Cita ${i + 1}/${appointmentsToGenerate}: ${client.firstName} ${client.lastName} - ${availableServices.map(s => s.name).join(', ')} (${scenarioType})`)
      
    } catch (error) {
      console.log(`  ❌ Error generando cita ${i + 1}:`, error instanceof Error ? error.message : 'Error desconocido')
    }
  }
}

function getRandomAnomalyType(): string {
  const anomalyTypes = [
    'OVER_CONSUMPTION',
    'UNDER_CONSUMPTION', 
    'OVER_DURATION',
    'UNDER_DURATION',
    'EMPLOYEE_FRAUD',
    'CLIENT_FRAUD',
    'EQUIPMENT_ISSUE',
    'EFFICIENT_EMPLOYEE'
  ]
  
  return anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)]
}

async function generateSingleAppointment(
  prisma: PrismaClient,
  systemId: string,
  config: {
    client: any
    employee: any
    clinic: any
    equipment: any
    services: any[]
    appointmentDate: Date
    totalDuration: number
    scenarioType: string
  }
) {
  const { client, employee, clinic, equipment, services, appointmentDate, totalDuration, scenarioType } = config
  
  // 🔧 OBTENER CABINA ACTIVA DE LA CLÍNICA
  const availableCabin = await prisma.cabin.findFirst({
    where: {
      clinicId: clinic.id,
      isActive: true
    },
    orderBy: { order: 'asc' }
  })
  
  if (!availableCabin) {
    console.warn(`⚠️ No se encontró cabina activa para la clínica ${clinic.name}`)
    return
  }
  
     // 1. Crear cita CON ROOMID
   const appointment = await prisma.appointment.create({
     data: {
       systemId,
       clinicId: clinic.id,
       personId: client.id,
       roomId: availableCabin.id, // 🔧 AÑADIR ROOMID OBLIGATORIO
       startTime: appointmentDate,
       endTime: new Date(appointmentDate.getTime() + totalDuration * 60 * 1000),
       durationMinutes: totalDuration,
       estimatedDurationMinutes: totalDuration,
       status: 'COMPLETED',
       notes: `Cita de prueba - Escenario: ${scenarioType}`,
       professionalUserId: employee.id
     }
   })
  
     // 2. Crear servicios de la cita
   for (const service of services) {
     await prisma.appointmentService.create({
       data: {
         systemId,
         appointmentId: appointment.id,
         serviceId: service.id,
         status: AppointmentServiceStatus.VALIDATED,
         estimatedDuration: service.durationMinutes
       }
     })
   }
  
  // 3. Crear uso del dispositivo si hay equipo
  if (equipment) {
    const deviceUsage = await createDeviceUsageWithScenario(
      prisma,
      systemId,
      appointment,
      equipment,
      services,
      employee,
      scenarioType
    )
    
    // 4. Simular finalización usando el finalizador real
    if (deviceUsage) {
      await finalizeDeviceUsage(deviceUsage.id)
    }
  }
}

async function createDeviceUsageWithScenario(
  prisma: PrismaClient,
  systemId: string,
  appointment: any,
  equipment: any,
  services: any[],
  employee: any,
  scenarioType: string
) {
  // Calcular métricas base
  const totalEstimatedMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0)
  const totalExpectedKwh = services.reduce((sum, service) => {
    const pattern = DEPILATION_POWER_PATTERNS[service.name]
    return sum + (pattern?.expectedKwh || 0.1)
  }, 0)
  
  // Aplicar modificadores según escenario
  const modifiers = getScenarioModifiers(scenarioType)
  const actualMinutes = totalEstimatedMinutes * modifiers.durationMultiplier
  const actualKwh = totalExpectedKwh * modifiers.powerMultiplier
  
  // Crear registro de uso
  const deviceUsage = await prisma.appointmentDeviceUsage.create({
    data: {
      systemId,
      appointmentId: appointment.id,
      deviceId: SHELLY_DEVICE_CONFIG.deviceId,
      equipmentId: equipment.id,
      equipmentClinicAssignmentId: SHELLY_DEVICE_CONFIG.equipmentClinicAssignmentId,
      startedAt: appointment.startTime,
      endedAt: new Date(appointment.startTime.getTime() + actualMinutes * 60 * 1000),
      estimatedMinutes: totalEstimatedMinutes,
      actualMinutes: actualMinutes,
      energyConsumption: actualKwh,
      currentStatus: 'COMPLETED',
      endedReason: 'MANUAL',
      usageOutcome: actualMinutes > totalEstimatedMinutes ? 'EXTENDED' : 
                   actualMinutes < totalEstimatedMinutes ? 'EARLY' : 'ON_TIME',
      startedByUserId: employee.id,
      deviceData: {
        servicesDetails: services.map(service => ({
          serviceId: service.id,
          durationMinutes: service.durationMinutes
        })),
        scenario: scenarioType,
        powerMultiplier: modifiers.powerMultiplier,
        durationMultiplier: modifiers.durationMultiplier
      }
    }
  })
  
  // Generar lecturas de potencia simuladas
  await generatePowerReadings(prisma, systemId, deviceUsage, services, modifiers, appointment)
  
  return deviceUsage
}

function getScenarioModifiers(scenarioType: string) {
  const modifiers = {
    powerMultiplier: 1.0,
    durationMultiplier: 1.0
  }
  
  switch (scenarioType) {
    case 'OVER_CONSUMPTION':
      modifiers.powerMultiplier = 1.6 + Math.random() * 0.4 // 160-200%
      break
    case 'UNDER_CONSUMPTION':
      modifiers.powerMultiplier = 0.3 + Math.random() * 0.3 // 30-60%
      break
    case 'OVER_DURATION':
      modifiers.durationMultiplier = 1.4 + Math.random() * 0.6 // 140-200%
      break
    case 'UNDER_DURATION':
      modifiers.durationMultiplier = 0.4 + Math.random() * 0.3 // 40-70%
      break
    case 'EMPLOYEE_FRAUD':
      modifiers.powerMultiplier = 0.05 + Math.random() * 0.1 // 5-15%
      modifiers.durationMultiplier = 0.9 + Math.random() * 0.2 // 90-110%
      break
    case 'CLIENT_FRAUD':
      modifiers.powerMultiplier = 0.2 + Math.random() * 0.2 // 20-40%
      modifiers.durationMultiplier = 0.5 + Math.random() * 0.3 // 50-80%
      break
    case 'EQUIPMENT_ISSUE':
      modifiers.powerMultiplier = 0.7 + Math.random() * 0.8 // 70-150% (errático)
      modifiers.durationMultiplier = 1.1 + Math.random() * 0.3 // 110-140%
      break
    case 'EFFICIENT_EMPLOYEE':
      modifiers.powerMultiplier = 0.85 + Math.random() * 0.1 // 85-95%
      modifiers.durationMultiplier = 0.8 + Math.random() * 0.15 // 80-95%
      break
    default: // NORMAL
      modifiers.powerMultiplier = 0.9 + Math.random() * 0.2 // 90-110%
      modifiers.durationMultiplier = 0.95 + Math.random() * 0.1 // 95-105%
  }
  
  return modifiers
}

async function generatePowerReadings(
  prisma: PrismaClient,
  systemId: string,
  deviceUsage: any,
  services: any[],
  modifiers: any,
  appointment: any
) {
  const startTime = new Date(deviceUsage.startedAt)
  const endTime = new Date(deviceUsage.endedAt)
  const durationMs = endTime.getTime() - startTime.getTime()
  
  // Generar una lectura cada 30 segundos (más realista que cada 8s para testing)
  const sampleInterval = 30 * 1000 // 30 segundos
  const totalSamples = Math.floor(durationMs / sampleInterval)
  
  for (let i = 0; i < totalSamples; i++) {
    const sampleTime = new Date(startTime.getTime() + i * sampleInterval)
    
    // Calcular potencia promedio ponderada por duración de servicios
    let weightedPower = 0
    let totalWeight = 0
    
    for (const service of services) {
      const pattern = DEPILATION_POWER_PATTERNS[service.name]
      if (pattern) {
        const weight = service.durationMinutes
        const basePower = pattern.basePower * modifiers.powerMultiplier
        const variation = pattern.variation * (Math.random() - 0.5) * 2 // ±variation
        
        weightedPower += (basePower + variation) * weight
        totalWeight += weight
      }
    }
    
    const finalPower = totalWeight > 0 ? weightedPower / totalWeight : 180
    
    // Crear muestra de potencia
    await prisma.smartPlugPowerSample.create({
      data: {
        systemId,
        clinicId: appointment.clinicId,
        clientId: appointment.personId,
        userId: deviceUsage.startedByUserId,
        deviceId: deviceUsage.deviceId,
        usageId: deviceUsage.id,
        timestamp: sampleTime,
        watts: Math.max(0, finalPower),
        totalEnergy: (deviceUsage.energyConsumption || 0) * (i / totalSamples), // Progresivo
        relayOn: true,
        servicesInfo: services.map(s => ({ id: s.id, estMin: s.durationMinutes }))
      }
    })
  }
  
  console.log(`    📊 Generadas ${totalSamples} lecturas de potencia`)
} 