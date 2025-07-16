/**
 * 🔄 SCRIPT: RECÁLCULO MANUAL DE SCORES DE ANOMALÍAS
 * =================================================
 * 
 * Script para recalcular manualmente los scores de anomalías de clientes y empleados
 * basándose en datos reales de appointment_device_usage completados.
 * 
 * 🎯 FUNCIÓN:
 * - Simula el recálculo que hace el botón "Recalcular" en Energy Insights
 * - Útil para pruebas y para poblar datos iniciales
 * - Procesa solo servicios VALIDATED
 * - Actualiza scores incrementalmente
 * 
 * 🚀 USO:
 * node scripts/recalculate-anomaly-scores.cjs [systemId] [clinicId]
 * 
 * Ejemplos:
 * node scripts/recalculate-anomaly-scores.cjs                    # Todos los sistemas
 * node scripts/recalculate-anomaly-scores.cjs cm123abc           # Sistema específico
 * node scripts/recalculate-anomaly-scores.cjs cm123abc clinic1   # Sistema y clínica específica
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error']
})

async function main() {
  const args = process.argv.slice(2)
  const targetSystemId = args[0]
  const targetClinicId = args[1]

  console.log('🔄 Iniciando recálculo manual de scores de anomalías...')
  
  if (targetSystemId) {
    console.log(`🎯 Sistema objetivo: ${targetSystemId}`)
  } else {
    console.log(`🌐 Procesando TODOS los sistemas`)
  }
  
  if (targetClinicId) {
    console.log(`🏥 Clínica objetivo: ${targetClinicId}`)
  }

  try {
    // 1. Obtener sistemas a procesar
    const systems = targetSystemId 
      ? [{ id: targetSystemId }]
      : await prisma.system.findMany({ select: { id: true } })

    console.log(`📊 Sistemas a procesar: ${systems.length}`)

    let totalClientScores = 0
    let totalEmployeeScores = 0

    for (const system of systems) {
      const systemId = system.id
      console.log(`\n🏢 Procesando sistema: ${systemId}`)

      // 2. Obtener device usages completados del sistema
      const deviceUsages = await prisma.appointmentDeviceUsage.findMany({
        where: {
          systemId,
          currentStatus: 'COMPLETED',
          actualMinutes: { gt: 0 },
          energyConsumption: { gt: 0 },
          ...(targetClinicId ? { appointment: { clinicId: targetClinicId } } : {})
        },
        include: {
          appointment: {
            include: {
              person: true,
              professionalUser: true,
              services: {
                where: { status: 'VALIDATED' },
                include: { service: true }
              }
            }
          }
        }
      })

      console.log(`📈 Device usages encontrados: ${deviceUsages.length}`)

      if (deviceUsages.length === 0) {
        console.log(`⚠️ No hay datos para procesar en sistema ${systemId}`)
        continue
      }

      // 3. Agrupar por cliente y empleado
      const clientUsages = new Map()
      const employeeUsages = new Map()

      for (const usage of deviceUsages) {
        if (!usage.appointment?.person || !usage.appointment?.professionalUser) continue

        const clientId = usage.appointment.person.id
        const employeeId = usage.appointment.professionalUser.id

        // Agrupar por cliente
        if (!clientUsages.has(clientId)) {
          clientUsages.set(clientId, {
            systemId,
            clinicId: usage.appointment.clinicId,
            clientId,
            client: usage.appointment.person,
            usages: []
          })
        }
        clientUsages.get(clientId).usages.push(usage)

        // Agrupar por empleado
        if (!employeeUsages.has(employeeId)) {
          employeeUsages.set(employeeId, {
            systemId,
            clinicId: usage.appointment.clinicId,
            employeeId,
            employee: usage.appointment.professionalUser,
            usages: []
          })
        }
        employeeUsages.get(employeeId).usages.push(usage)
      }

      console.log(`👥 Clientes únicos: ${clientUsages.size}`)
      console.log(`👨‍⚕️ Empleados únicos: ${employeeUsages.size}`)

      // 4. Procesar scores de clientes
      let systemClientScores = 0
      for (const [clientId, data] of clientUsages) {
        try {
          // Calcular estadísticas del cliente
          let totalServices = data.usages.length
          let totalAnomalies = 0
          let totalDeviations = 0
          let maxDeviation = 0
          const employeeInteractions = new Set()
          const suspiciousPatterns = {}

          for (const usage of data.usages) {
            const expectedMinutes = usage.appointment.services[0]?.service?.treatmentDurationMinutes || 
                                  usage.appointment.estimatedDurationMinutes || 0
            
            if (expectedMinutes > 0 && usage.actualMinutes) {
              const deviationPct = ((usage.actualMinutes - expectedMinutes) / expectedMinutes) * 100
              totalDeviations += Math.abs(deviationPct)
              maxDeviation = Math.max(maxDeviation, Math.abs(deviationPct))
              
              if (Math.abs(deviationPct) > 20) {
                totalAnomalies++
                const patternType = deviationPct > 0 ? 'OVER_DURATION' : 'UNDER_DURATION'
                suspiciousPatterns[patternType] = (suspiciousPatterns[patternType] || 0) + 1
              }
              
              employeeInteractions.add(usage.appointment.professionalUser.id)
            }
          }

          const anomalyRate = totalServices > 0 ? (totalAnomalies / totalServices) * 100 : 0
          const avgDeviation = totalServices > 0 ? totalDeviations / totalServices : 0

          // Calcular risk score
          let riskScore = 0
          riskScore += Math.min(40, anomalyRate * 0.4)
          riskScore += Object.keys(suspiciousPatterns).length * 8
          if (employeeInteractions.size === 1) riskScore += 20
          else if (employeeInteractions.size === 2) riskScore += 10
          riskScore += Math.min(10, maxDeviation / 10)
          riskScore = Math.min(100, Math.round(riskScore))

          let riskLevel = 'low'
          if (riskScore >= 80) riskLevel = 'critical'
          else if (riskScore >= 60) riskLevel = 'high'
          else if (riskScore >= 40) riskLevel = 'medium'

          // Upsert score del cliente
          await prisma.clientAnomalyScore.upsert({
            where: {
              systemId_clinicId_clientId: {
                systemId: data.systemId,
                clinicId: data.clinicId,
                clientId: data.clientId
              }
            },
            update: {
              totalServices,
              totalAnomalies,
              anomalyRate,
              avgDeviationPercent: avgDeviation,
              maxDeviationPercent: maxDeviation,
              suspiciousPatterns,
              favoredByEmployees: Array.from(employeeInteractions),
              riskScore,
              riskLevel,
              lastCalculated: new Date(),
              updatedAt: new Date()
            },
            create: {
              systemId: data.systemId,
              clinicId: data.clinicId,
              clientId: data.clientId,
              totalServices,
              totalAnomalies,
              anomalyRate,
              avgDeviationPercent: avgDeviation,
              maxDeviationPercent: maxDeviation,
              suspiciousPatterns,
              favoredByEmployees: Array.from(employeeInteractions),
              riskScore,
              riskLevel,
              lastCalculated: new Date()
            }
          })

          systemClientScores++
          
          if (systemClientScores % 10 === 0) {
            console.log(`   📊 Clientes procesados: ${systemClientScores}`)
          }

        } catch (error) {
          console.error(`❌ Error procesando cliente ${data.client.firstName} ${data.client.lastName}:`, error.message)
        }
      }

      // 5. Procesar scores de empleados
      let systemEmployeeScores = 0
      for (const [employeeId, data] of employeeUsages) {
        try {
          // Calcular estadísticas del empleado
          let totalServices = data.usages.length
          let totalAnomalies = 0
          let totalEfficiency = 0
          let efficiencyCount = 0
          const clientInteractions = new Set()
          const fraudIndicators = {}
          const timePatterns = {}

          for (const usage of data.usages) {
            const expectedMinutes = usage.appointment.services[0]?.service?.treatmentDurationMinutes || 
                                  usage.appointment.estimatedDurationMinutes || 0
            
            if (expectedMinutes > 0 && usage.actualMinutes) {
              const deviationPct = ((usage.actualMinutes - expectedMinutes) / expectedMinutes) * 100
              const efficiency = (expectedMinutes / usage.actualMinutes) * 100
              totalEfficiency += Math.min(100, Math.max(0, efficiency))
              efficiencyCount++
              
              if (Math.abs(deviationPct) > 20) {
                totalAnomalies++
                
                if (deviationPct > 25) fraudIndicators.alwaysExtended = true
                if (deviationPct < -20) fraudIndicators.alwaysShort = true
              }
              
              clientInteractions.add(usage.appointment.person.id)
              
              // Patrones temporales
              const hour = new Date(usage.appointment.startTime).getHours()
              let period = 'morning'
              if (hour >= 12 && hour < 18) period = 'afternoon'
              else if (hour >= 18) period = 'evening'
              timePatterns[period] = (timePatterns[period] || 0) + 1
            }
          }

          const anomalyRate = totalServices > 0 ? (totalAnomalies / totalServices) * 100 : 0
          const avgEfficiency = efficiencyCount > 0 ? totalEfficiency / efficiencyCount : 100
          const consistencyScore = Math.max(0, 100 - (anomalyRate * 2))

          // Calcular risk score
          let riskScore = 0
          riskScore += Math.min(30, anomalyRate * 0.3)
          if (avgEfficiency < 70) riskScore += (70 - avgEfficiency) * 0.5
          if (consistencyScore < 80) riskScore += (80 - consistencyScore) * 0.25
          if (clientInteractions.size <= 3 && anomalyRate > 20) riskScore += 15
          riskScore += Object.keys(fraudIndicators).length * 3
          riskScore = Math.min(100, Math.round(riskScore))

          let riskLevel = 'low'
          if (riskScore >= 80) riskLevel = 'critical'
          else if (riskScore >= 60) riskLevel = 'high'
          else if (riskScore >= 40) riskLevel = 'medium'

          // Upsert score del empleado
          await prisma.employeeAnomalyScore.upsert({
            where: {
              systemId_employeeId: {
                systemId: data.systemId,
                employeeId: data.employeeId
              }
            },
            update: {
              totalServices,
              totalAnomalies,
              anomalyRate,
              avgEfficiency,
              consistencyScore,
              favoredClients: Array.from(clientInteractions),
              fraudIndicators,
              timePatterns,
              riskScore,
              riskLevel,
              lastCalculated: new Date(),
              updatedAt: new Date()
            },
            create: {
              systemId: data.systemId,
              clinicId: data.clinicId,
              employeeId: data.employeeId,
              totalServices,
              totalAnomalies,
              anomalyRate,
              avgEfficiency,
              consistencyScore,
              favoredClients: Array.from(clientInteractions),
              fraudIndicators,
              timePatterns,
              riskScore,
              riskLevel,
              lastCalculated: new Date()
            }
          })

          systemEmployeeScores++
          
          if (systemEmployeeScores % 10 === 0) {
            console.log(`   👨‍⚕️ Empleados procesados: ${systemEmployeeScores}`)
          }

        } catch (error) {
          console.error(`❌ Error procesando empleado ${data.employee.firstName} ${data.employee.lastName}:`, error.message)
        }
      }

      console.log(`✅ Sistema ${systemId} completado:`)
      console.log(`   📊 Scores de clientes: ${systemClientScores}`)
      console.log(`   👨‍⚕️ Scores de empleados: ${systemEmployeeScores}`)

      totalClientScores += systemClientScores
      totalEmployeeScores += systemEmployeeScores
    }

    console.log('\n🎉 RECÁLCULO COMPLETADO:')
    console.log(`📊 Total scores de clientes actualizados: ${totalClientScores}`)
    console.log(`👨‍⚕️ Total scores de empleados actualizados: ${totalEmployeeScores}`)

  } catch (error) {
    console.error('❌ Error durante el recálculo:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
} 