/**
 * 🔬 SEED ANOMALÍAS BASADO EN DATOS REALES - Energy Insights Data
 * =============================================================
 * 
 * Genera datos de anomalías basados en AppointmentDeviceUsage REALES
 * enfocándose en servicios de depilación que usan equipmentClinicAssignmentId.
 * 
 * 🎯 ENFOQUE: Solo servicios de depilación con equipo láser
 * 📊 DATOS: Basados en registros reales de AppointmentDeviceUsage
 */

import { PrismaClient } from '@prisma/client'
import { createId } from '@paralleldrive/cuid2'

export async function seedAnomalias(prisma: PrismaClient, systemId: string) {
  console.log('🔬 Seeding Anomalies (Real Data Version)...')

  try {
    // 1. Obtener datos reales de AppointmentDeviceUsage con equipmentClinicAssignmentId
    const deviceUsages = await prisma.appointmentDeviceUsage.findMany({
      where: {
        systemId,
        equipmentClinicAssignmentId: { not: null }, // Solo registros con equipo asignado
        currentStatus: 'COMPLETED'
      },
      include: {
        appointment: {
          include: {
            person: { select: { id: true, firstName: true, lastName: true } },
            professionalUser: { select: { id: true, firstName: true, lastName: true } },
            services: {
              include: {
                service: { select: { id: true, name: true } }
              }
            }
          }
        },
        equipmentClinicAssignment: {
          include: {
            equipment: { select: { id: true, name: true } }
          }
        }
      }
    })

    console.log(`📊 Registros de AppointmentDeviceUsage encontrados: ${deviceUsages.length}`)

    // 2. Filtrar solo servicios de depilación (que usan láser)
    const depilationUsages = deviceUsages.filter(usage => {
      return usage.appointment.services.some(service => 
        service.service.name.includes('Depilación') || 
        service.service.name.includes('Láser')
      )
    })

    console.log(`🎯 Registros de depilación encontrados: ${depilationUsages.length}`)

    if (depilationUsages.length === 0) {
      console.log('❌ No hay datos de depilación para generar anomalías')
      return
    }

    // 3. Limpiar datos existentes
    await prisma.clientAnomalyScore.deleteMany({ where: { systemId } })
    await prisma.employeeAnomalyScore.deleteMany({ where: { systemId } })
    await prisma.deviceUsageInsight.deleteMany({ where: { systemId } })

    // 4. Generar insights basados en datos reales
    const insights = []
    const clientScores = new Map()
    const employeeScores = new Map()

    for (const usage of depilationUsages) {
      const { appointment, equipmentClinicAssignment } = usage
      const client = appointment.person
      const employee = appointment.professionalUser
      
      // Solo procesar si tenemos datos completos
      if (!client || !employee || !equipmentClinicAssignment) continue

      // Simular detección de anomalías basada en datos reales
      const actualMinutes = usage.actualMinutes || usage.estimatedMinutes
      const estimatedMinutes = usage.estimatedMinutes
      const deviationPct = Math.abs(((actualMinutes - estimatedMinutes) / estimatedMinutes) * 100)
      
      // Solo crear insights si hay desviación significativa (>15%)
      if (deviationPct > 15) {
        const actualKwh = usage.energyConsumption || (actualMinutes * 0.02) // Estimación
        const expectedKwh = estimatedMinutes * 0.02 // Estimación estándar
        
        const insightType = actualMinutes > estimatedMinutes ? 'OVER_DURATION' : 'UNDER_DURATION'
        
        insights.push({
          id: createId(),
          systemId,
          clinicId: appointment.clinicId,
          appointmentId: appointment.id,
          deviceUsageId: usage.id,
          equipmentClinicAssignmentId: usage.equipmentClinicAssignmentId,
          clientId: client.id,
          detectedAt: usage.endedAt || new Date(),
          insightType,
          actualKwh,
          expectedKwh,
          deviationPct,
          detailJson: {
            serviceName: appointment.services[0]?.service?.name || 'Servicio de Depilación',
            equipmentName: equipmentClinicAssignment.equipment?.name || 'Equipo Láser',
            actualMinutes,
            estimatedMinutes,
            energyConsumption: usage.energyConsumption
          },
          resolved: Math.random() > 0.8, // 20% resueltos
          resolvedByUserId: null,
          resolvedAt: null
        })

        // Actualizar scores de cliente
        const clientKey = client.id
        if (!clientScores.has(clientKey)) {
          clientScores.set(clientKey, {
            id: createId(),
            systemId,
            clinicId: appointment.clinicId,
            clientId: client.id,
            totalServices: 1,
            totalAnomalies: 1,
            anomalyRate: Math.min(99.99, 100), // Limitar a 99.99
            avgDeviationPercent: Math.min(99.99, deviationPct), // Limitar a 99.99
            maxDeviationPercent: Math.min(99.99, deviationPct), // Limitar a 99.99
            suspiciousPatterns: { [insightType]: 1 },
            favoredByEmployees: { [`${employee.firstName} ${employee.lastName}`.trim()]: 1 },
            riskScore: Math.min(99.99, Math.max(20, deviationPct + 20)), // Limitar a 99.99
            riskLevel: deviationPct > 50 ? 'high' : deviationPct > 30 ? 'medium' : 'low',
            lastAnomalyDate: usage.endedAt || new Date(),
            lastCalculated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
        } else {
          const score = clientScores.get(clientKey)
          score.totalAnomalies += 1
          score.anomalyRate = Math.min(99.99, (score.totalAnomalies / score.totalServices) * 100) // Limitar a 99.99
          score.avgDeviationPercent = Math.min(99.99, (score.avgDeviationPercent + deviationPct) / 2) // Limitar a 99.99
          score.maxDeviationPercent = Math.min(99.99, Math.max(score.maxDeviationPercent, deviationPct)) // Limitar a 99.99
          score.suspiciousPatterns[insightType] = (score.suspiciousPatterns[insightType] || 0) + 1
          score.favoredByEmployees[`${employee.firstName} ${employee.lastName}`.trim()] = 
            (score.favoredByEmployees[`${employee.firstName} ${employee.lastName}`.trim()] || 0) + 1
        }

        // Actualizar scores de empleado
        const employeeKey = employee.id
        if (!employeeScores.has(employeeKey)) {
          const favoredClients = { [`${client.firstName} ${client.lastName}`.trim()]: 1 }
          employeeScores.set(employeeKey, {
            id: createId(),
            systemId,
            clinicId: appointment.clinicId,
            employeeId: employee.id,
            totalServices: 1,
            totalAnomalies: 1,
            anomalyRate: Math.min(99.99, 100), // Limitar a 99.99
            avgEfficiency: Math.min(99.99, actualMinutes > estimatedMinutes ? 80 : 95), // Limitar a 99.99
            consistencyScore: Math.min(99.99, Math.max(50, 100 - deviationPct)), // Limitar a 99.99
            favoredClients,
            fraudIndicators: {
              'EXCESSIVE_DURATION': actualMinutes > estimatedMinutes * 1.5,
              'UNUSUAL_CONSUMPTION': deviationPct > 40,
              'PATTERN_DEVIATION': deviationPct > 25
            },
            timePatterns: {
              'MORNING': Math.random() > 0.5 ? 1 : 0,
              'AFTERNOON': Math.random() > 0.5 ? 1 : 0,
              'EVENING': Math.random() > 0.5 ? 1 : 0
            },
            riskScore: Math.min(99.99, Math.max(15, deviationPct + 15)), // Limitar a 99.99
            riskLevel: deviationPct > 45 ? 'high' : deviationPct > 25 ? 'medium' : 'low',
            lastCalculated: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
        } else {
          const score = employeeScores.get(employeeKey)
          score.totalAnomalies += 1
          score.anomalyRate = Math.min(99.99, (score.totalAnomalies / score.totalServices) * 100) // Limitar a 99.99
          score.favoredClients[`${client.firstName} ${client.lastName}`.trim()] = 
            (score.favoredClients[`${client.firstName} ${client.lastName}`.trim()] || 0) + 1
        }
      }
    }

    // 5. Insertar datos en la base de datos
    if (insights.length > 0) {
      await prisma.deviceUsageInsight.createMany({
        data: insights
      })
    }

    if (clientScores.size > 0) {
      await prisma.clientAnomalyScore.createMany({
        data: Array.from(clientScores.values())
      })
    }

    if (employeeScores.size > 0) {
      await prisma.employeeAnomalyScore.createMany({
        data: Array.from(employeeScores.values())
      })
    }

    console.log(`✅ Anomalías generadas (datos reales):`)
    console.log(`   • ${insights.length} device usage insights`)
    console.log(`   • ${clientScores.size} client anomaly scores`)
    console.log(`   • ${employeeScores.size} employee anomaly scores`)
    console.log(`   • Basado en ${depilationUsages.length} registros de depilación`)

  } catch (error) {
    console.error('❌ Error seeding anomalies:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const prisma = new PrismaClient()
  
  async function main() {
    // Obtener systemId del primer sistema
    const firstSystem = await prisma.system.findFirst()
    if (!firstSystem) {
      console.error('❌ No hay sistemas en la base de datos')
      process.exit(1)
    }
    
    await seedAnomalias(prisma, firstSystem.id)
    await prisma.$disconnect()
  }
  
  main().catch(console.error)
}