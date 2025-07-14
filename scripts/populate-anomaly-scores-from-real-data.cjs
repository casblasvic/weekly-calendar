/**
 * 📊 SCRIPT: POBLACIÓN DE SCORES DE ANOMALÍAS DESDE DATOS REALES
 * =============================================================
 * 
 * Este script calcula y puebla las tablas de anomalías basándose en datos reales:
 * - appointment_device_usage (datos de uso real de dispositivos)
 * - appointment_service_energy_usage (datos de energía por servicio)
 * - appointments (datos de citas completadas)
 * 
 * 🎯 OBJETIVO: Simular el cálculo de anomalías que normalmente se ejecuta
 * cuando las citas cambian a estado COMPLETED
 * 
 * 🚨 IMPORTANTE: Solo usar CUIDs reales de la BD, NO datos hardcodeados
 * 
 * Tablas que puebla:
 * - smart_plug_client_anomaly_scores
 * - smart_plug_employee_anomaly_scores
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error']
})

async function main() {
  console.log('🔍 Iniciando población de scores de anomalías desde datos reales...')

  try {
    // 1. Obtener datos reales de uso de dispositivos con relaciones
    console.log('📊 Obteniendo datos de uso de dispositivos...')
    const deviceUsageData = await prisma.appointmentDeviceUsage.findMany({
      where: {
        actualMinutes: { not: null },
        energyConsumption: { not: null }
      },
      include: {
        appointment: {
          include: {
            person: true,
            professionalUser: true,
            clinic: true,
            services: {
              include: {
                service: true
              }
            }
          }
        },
        appointmentService: {
          include: {
            service: true
          }
        }
      }
    })

    console.log(`✅ Encontrados ${deviceUsageData.length} registros de uso de dispositivos`)

    if (deviceUsageData.length === 0) {
      console.log('⚠️ No hay datos de uso de dispositivos para procesar')
      return
    }

    // 2. Agrupar datos por cliente para calcular anomalías
    console.log('📈 Calculando anomalías por cliente...')
    const clientStats = new Map()

    for (const usage of deviceUsageData) {
      const appointment = usage.appointment
      if (!appointment?.person || !appointment?.clinic || !appointment?.professionalUser) {
        continue
      }

      const clientId = appointment.person.id
      const systemId = appointment.systemId
      const clinicId = appointment.clinic.id

      if (!clientStats.has(clientId)) {
        clientStats.set(clientId, {
          systemId,
          clinicId,
          clientId,
          client: appointment.person,
          clinic: appointment.clinic,
          totalServices: 0,
          totalAnomalies: 0,
          deviations: [],
          employeeInteractions: new Set(),
          suspiciousPatterns: [],
          lastAnomalyDate: null
        })
      }

      const stats = clientStats.get(clientId)
      stats.totalServices++

      // Calcular desviación si hay datos de servicio
      if (usage.appointmentService?.service?.treatmentDurationMinutes) {
        const expectedMinutes = usage.appointmentService.service.treatmentDurationMinutes
        const actualMinutes = usage.actualMinutes
        const deviation = ((actualMinutes - expectedMinutes) / expectedMinutes) * 100

        stats.deviations.push(Math.abs(deviation))

        // Considerar anomalía si desviación > 20%
        if (Math.abs(deviation) > 20) {
          stats.totalAnomalies++
          stats.lastAnomalyDate = usage.createdAt
          
          if (Math.abs(deviation) > 50) {
            stats.suspiciousPatterns.push({
              type: 'extreme_deviation',
              value: deviation,
              date: usage.createdAt
            })
          }
        }
      }

      stats.employeeInteractions.add(appointment.professionalUser.id)
    }

    // 3. Crear registros de anomalías para clientes
    console.log('💾 Guardando scores de anomalías de clientes...')
    let clientScoresCreated = 0

    for (const [clientId, stats] of clientStats) {
      const anomalyRate = stats.totalServices > 0 ? (stats.totalAnomalies / stats.totalServices) * 100 : 0
      const avgDeviation = stats.deviations.length > 0 
        ? stats.deviations.reduce((a, b) => a + b, 0) / stats.deviations.length 
        : 0
      const maxDeviation = stats.deviations.length > 0 ? Math.max(...stats.deviations) : 0

      // Calcular riesgo
      let riskLevel = 'low'
      let riskScore = 0

      if (anomalyRate > 30) {
        riskLevel = 'critical'
        riskScore = 90 + Math.min(10, anomalyRate - 30)
      } else if (anomalyRate > 20) {
        riskLevel = 'high'
        riskScore = 70 + (anomalyRate - 20)
      } else if (anomalyRate > 10) {
        riskLevel = 'medium'
        riskScore = 40 + (anomalyRate - 10) * 3
      } else {
        riskScore = Math.min(40, anomalyRate * 4)
      }

      try {
        await prisma.clientAnomalyScore.upsert({
          where: {
            systemId_clinicId_clientId: {
              systemId: stats.systemId,
              clinicId: stats.clinicId,
              clientId: stats.clientId
            }
          },
          update: {
            totalServices: stats.totalServices,
            totalAnomalies: stats.totalAnomalies,
            anomalyRate: anomalyRate,
            avgDeviationPercent: avgDeviation,
            maxDeviationPercent: maxDeviation,
            suspiciousPatterns: stats.suspiciousPatterns,
            favoredByEmployees: Array.from(stats.employeeInteractions),
            riskScore: riskScore,
            riskLevel: riskLevel,
            lastAnomalyDate: stats.lastAnomalyDate,
            lastCalculated: new Date(),
            updatedAt: new Date()
          },
          create: {
            systemId: stats.systemId,
            clinicId: stats.clinicId,
            clientId: stats.clientId,
            totalServices: stats.totalServices,
            totalAnomalies: stats.totalAnomalies,
            anomalyRate: anomalyRate,
            avgDeviationPercent: avgDeviation,
            maxDeviationPercent: maxDeviation,
            suspiciousPatterns: stats.suspiciousPatterns,
            favoredByEmployees: Array.from(stats.employeeInteractions),
            riskScore: riskScore,
            riskLevel: riskLevel,
            lastAnomalyDate: stats.lastAnomalyDate,
            lastCalculated: new Date()
          }
        })
        clientScoresCreated++
      } catch (error) {
        console.error(`❌ Error creando score para cliente ${stats.client.firstName} ${stats.client.lastName}:`, error.message)
      }
    }

    // 4. Agrupar datos por empleado para calcular anomalías
    console.log('👥 Calculando anomalías por empleado...')
    const employeeStats = new Map()

    for (const usage of deviceUsageData) {
      const appointment = usage.appointment
      if (!appointment?.person || !appointment?.clinic || !appointment?.professionalUser) {
        continue
      }

      const employeeId = appointment.professionalUser.id
      const systemId = appointment.systemId
      const clinicId = appointment.clinic.id

      if (!employeeStats.has(employeeId)) {
        employeeStats.set(employeeId, {
          systemId,
          clinicId,
          employeeId,
          employee: appointment.professionalUser,
          clinic: appointment.clinic,
          totalServices: 0,
          totalAnomalies: 0,
          efficiencyScores: [],
          clientInteractions: new Set(),
          timePatterns: [],
          fraudIndicators: [],
          lastCalculated: new Date()
        })
      }

      const stats = employeeStats.get(employeeId)
      stats.totalServices++

      // Calcular eficiencia
      if (usage.appointmentService?.service?.treatmentDurationMinutes) {
        const expectedMinutes = usage.appointmentService.service.treatmentDurationMinutes
        const actualMinutes = usage.actualMinutes
        const efficiency = (expectedMinutes / actualMinutes) * 100

        stats.efficiencyScores.push(Math.min(100, Math.max(0, efficiency)))

        // Detectar anomalías
        const deviation = Math.abs(((actualMinutes - expectedMinutes) / expectedMinutes) * 100)
        if (deviation > 20) {
          stats.totalAnomalies++
          
          if (deviation > 50) {
            stats.fraudIndicators.push({
              type: 'time_manipulation',
              severity: deviation > 100 ? 'high' : 'medium',
              date: usage.createdAt
            })
          }
        }
      }

      stats.clientInteractions.add(appointment.person.id)
    }

    // 5. Crear registros de anomalías para empleados
    console.log('💾 Guardando scores de anomalías de empleados...')
    let employeeScoresCreated = 0

    for (const [employeeId, stats] of employeeStats) {
      const anomalyRate = stats.totalServices > 0 ? (stats.totalAnomalies / stats.totalServices) * 100 : 0
      const avgEfficiency = stats.efficiencyScores.length > 0 
        ? stats.efficiencyScores.reduce((a, b) => a + b, 0) / stats.efficiencyScores.length 
        : 100
      
      // Calcular consistencia (inversa de la desviación estándar)
      const efficiencyVariance = stats.efficiencyScores.length > 1 
        ? stats.efficiencyScores.reduce((acc, score) => acc + Math.pow(score - avgEfficiency, 2), 0) / stats.efficiencyScores.length
        : 0
      const consistencyScore = Math.max(0, 100 - Math.sqrt(efficiencyVariance))

      // Calcular riesgo
      let riskLevel = 'low'
      let riskScore = 0

      if (anomalyRate > 25 || avgEfficiency < 70) {
        riskLevel = 'critical'
        riskScore = 85 + Math.min(15, anomalyRate)
      } else if (anomalyRate > 15 || avgEfficiency < 85) {
        riskLevel = 'high'
        riskScore = 60 + anomalyRate
      } else if (anomalyRate > 8 || avgEfficiency < 95) {
        riskLevel = 'medium'
        riskScore = 30 + anomalyRate * 2
      } else {
        riskScore = Math.min(30, anomalyRate * 3)
      }

      try {
        await prisma.employeeAnomalyScore.upsert({
          where: {
            systemId_clinicId_employeeId: {
              systemId: stats.systemId,
              clinicId: stats.clinicId,
              employeeId: stats.employeeId
            }
          },
          update: {
            totalServices: stats.totalServices,
            totalAnomalies: stats.totalAnomalies,
            anomalyRate: anomalyRate,
            avgEfficiency: avgEfficiency,
            consistencyScore: consistencyScore,
            favoredClients: Array.from(stats.clientInteractions),
            fraudIndicators: stats.fraudIndicators,
            timePatterns: stats.timePatterns,
            riskScore: riskScore,
            riskLevel: riskLevel,
            lastCalculated: new Date(),
            updatedAt: new Date()
          },
          create: {
            systemId: stats.systemId,
            clinicId: stats.clinicId,
            employeeId: stats.employeeId,
            totalServices: stats.totalServices,
            totalAnomalies: stats.totalAnomalies,
            anomalyRate: anomalyRate,
            avgEfficiency: avgEfficiency,
            consistencyScore: consistencyScore,
            favoredClients: Array.from(stats.clientInteractions),
            fraudIndicators: stats.fraudIndicators,
            timePatterns: stats.timePatterns,
            riskScore: riskScore,
            riskLevel: riskLevel,
            lastCalculated: new Date()
          }
        })
        employeeScoresCreated++
      } catch (error) {
        console.error(`❌ Error creando score para empleado ${stats.employee.firstName} ${stats.employee.lastName}:`, error.message)
      }
    }

    console.log('✅ Población completada:')
    console.log(`   📊 Scores de clientes creados/actualizados: ${clientScoresCreated}`)
    console.log(`   👥 Scores de empleados creados/actualizados: ${employeeScoresCreated}`)

  } catch (error) {
    console.error('❌ Error durante la población:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error('💥 Error fatal:', e)
    process.exit(1)
  }) 