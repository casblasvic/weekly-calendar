/**
 * 🔧 SCRIPT: CORRECCIÓN DE CONSTRAINT UNIQUE Y CONSOLIDACIÓN DE DUPLICADOS
 * =========================================================================
 * 
 * Problema: Los scores de anomalías permiten duplicados por clínica cuando
 * debería haber UN SOLO registro por cliente/empleado en todo el sistema.
 * 
 * Solución:
 * 1. Consolidar registros duplicados manteniendo el de mayor riesgo
 * 2. Cambiar constraint de (systemId, clinicId, clientId) a (systemId, clientId)
 * 3. Actualizar el campo clinicId al de la clínica principal del cliente
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error']
})

async function main() {
  console.log('🔧 Iniciando corrección de constraints y consolidación de duplicados...')

  try {
    // 1. CONSOLIDAR CLIENTES DUPLICADOS
    console.log('\n📊 CONSOLIDANDO CLIENTES DUPLICADOS...')
    
    const clientScores = await prisma.clientAnomalyScore.findMany({
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Agrupar por clientId
    const clientGroups = new Map()
    for (const score of clientScores) {
      const clientId = score.clientId
      if (!clientGroups.has(clientId)) {
        clientGroups.set(clientId, [])
      }
      clientGroups.get(clientId).push(score)
    }

    let clientsConsolidated = 0
    let clientsDeleted = 0

    for (const [clientId, scores] of clientGroups) {
      if (scores.length > 1) {
        console.log(`🔄 Consolidando cliente: ${scores[0].client?.firstName} ${scores[0].client?.lastName}`)
        
        // Encontrar el registro con mayor riesgo (o más servicios si igual riesgo)
        const bestScore = scores.reduce((best, current) => {
          if (current.riskScore > best.riskScore) return current
          if (current.riskScore === best.riskScore && current.totalServices > best.totalServices) return current
          return best
        })

        // Consolidar datos de todos los registros
        const consolidatedData = {
          totalServices: scores.reduce((sum, s) => sum + s.totalServices, 0),
          totalAnomalies: scores.reduce((sum, s) => sum + s.totalAnomalies, 0),
          avgDeviationPercent: scores.reduce((sum, s) => sum + parseFloat(s.avgDeviationPercent), 0) / scores.length,
          maxDeviationPercent: Math.max(...scores.map(s => parseFloat(s.maxDeviationPercent))),
          riskScore: Math.max(...scores.map(s => s.riskScore)),
          lastAnomalyDate: scores.reduce((latest, s) => {
            if (!latest) return s.lastAnomalyDate
            if (!s.lastAnomalyDate) return latest
            return s.lastAnomalyDate > latest ? s.lastAnomalyDate : latest
          }, null),
          // Combinar patrones sospechosos
          suspiciousPatterns: scores.reduce((combined, s) => {
            const patterns = typeof s.suspiciousPatterns === 'string' 
              ? JSON.parse(s.suspiciousPatterns) 
              : s.suspiciousPatterns
            return { ...combined, ...patterns }
          }, {}),
          // Combinar empleados favoritos
          favoredByEmployees: [
            ...new Set(scores.flatMap(s => {
              const employees = typeof s.favoredByEmployees === 'string'
                ? JSON.parse(s.favoredByEmployees)
                : s.favoredByEmployees
              return Array.isArray(employees) ? employees : []
            }))
          ]
        }

        // Calcular nueva tasa de anomalías
        consolidatedData.anomalyRate = consolidatedData.totalServices > 0 
          ? (consolidatedData.totalAnomalies / consolidatedData.totalServices) * 100 
          : 0

        // Determinar nivel de riesgo
        let riskLevel = 'low'
        if (consolidatedData.riskScore >= 80) riskLevel = 'critical'
        else if (consolidatedData.riskScore >= 60) riskLevel = 'high'
        else if (consolidatedData.riskScore >= 40) riskLevel = 'medium'

        // Actualizar el mejor registro con datos consolidados
        await prisma.clientAnomalyScore.update({
          where: { id: bestScore.id },
          data: {
            totalServices: consolidatedData.totalServices,
            totalAnomalies: consolidatedData.totalAnomalies,
            anomalyRate: consolidatedData.anomalyRate,
            avgDeviationPercent: consolidatedData.avgDeviationPercent,
            maxDeviationPercent: consolidatedData.maxDeviationPercent,
            suspiciousPatterns: consolidatedData.suspiciousPatterns,
            favoredByEmployees: consolidatedData.favoredByEmployees,
            riskScore: consolidatedData.riskScore,
            riskLevel: riskLevel,
            lastAnomalyDate: consolidatedData.lastAnomalyDate,
            lastCalculated: new Date(),
            updatedAt: new Date()
          }
        })

        // Eliminar registros duplicados
        const duplicateIds = scores.filter(s => s.id !== bestScore.id).map(s => s.id)
        await prisma.clientAnomalyScore.deleteMany({
          where: {
            id: { in: duplicateIds }
          }
        })

        clientsConsolidated++
        clientsDeleted += duplicateIds.length
        
        console.log(`   ✅ Consolidado: ${consolidatedData.totalServices} servicios, ${consolidatedData.totalAnomalies} anomalías, score: ${consolidatedData.riskScore}`)
      }
    }

    // 2. CONSOLIDAR EMPLEADOS DUPLICADOS
    console.log('\n👥 CONSOLIDANDO EMPLEADOS DUPLICADOS...')
    
    const employeeScores = await prisma.employeeAnomalyScore.findMany({
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Agrupar por employeeId
    const employeeGroups = new Map()
    for (const score of employeeScores) {
      const employeeId = score.employeeId
      if (!employeeGroups.has(employeeId)) {
        employeeGroups.set(employeeId, [])
      }
      employeeGroups.get(employeeId).push(score)
    }

    let employeesConsolidated = 0
    let employeesDeleted = 0

    for (const [employeeId, scores] of employeeGroups) {
      if (scores.length > 1) {
        console.log(`🔄 Consolidando empleado: ${scores[0].employee?.firstName} ${scores[0].employee?.lastName}`)
        
        // Encontrar el registro con mayor riesgo
        const bestScore = scores.reduce((best, current) => {
          if (current.riskScore > best.riskScore) return current
          if (current.riskScore === best.riskScore && current.totalServices > best.totalServices) return current
          return best
        })

        // Consolidar datos
        const consolidatedData = {
          totalServices: scores.reduce((sum, s) => sum + s.totalServices, 0),
          totalAnomalies: scores.reduce((sum, s) => sum + s.totalAnomalies, 0),
          avgEfficiency: scores.reduce((sum, s) => sum + parseFloat(s.avgEfficiency), 0) / scores.length,
          consistencyScore: scores.reduce((sum, s) => sum + parseFloat(s.consistencyScore), 0) / scores.length,
          riskScore: Math.max(...scores.map(s => s.riskScore)),
          // Combinar clientes favoritos
          favoredClients: [
            ...new Set(scores.flatMap(s => {
              const clients = typeof s.favoredClients === 'string'
                ? JSON.parse(s.favoredClients)
                : s.favoredClients
              return Array.isArray(clients) ? clients : []
            }))
          ],
          // Combinar indicadores de fraude
          fraudIndicators: scores.reduce((combined, s) => {
            const indicators = typeof s.fraudIndicators === 'string' 
              ? JSON.parse(s.fraudIndicators) 
              : s.fraudIndicators
            return Array.isArray(indicators) ? [...combined, ...indicators] : combined
          }, []),
          timePatterns: scores.reduce((combined, s) => {
            const patterns = typeof s.timePatterns === 'string' 
              ? JSON.parse(s.timePatterns) 
              : s.timePatterns
            return { ...combined, ...patterns }
          }, {})
        }

        // Calcular nueva tasa de anomalías
        consolidatedData.anomalyRate = consolidatedData.totalServices > 0 
          ? (consolidatedData.totalAnomalies / consolidatedData.totalServices) * 100 
          : 0

        // Determinar nivel de riesgo
        let riskLevel = 'low'
        if (consolidatedData.riskScore >= 80) riskLevel = 'critical'
        else if (consolidatedData.riskScore >= 60) riskLevel = 'high'
        else if (consolidatedData.riskScore >= 40) riskLevel = 'medium'

        // Actualizar el mejor registro
        await prisma.employeeAnomalyScore.update({
          where: { id: bestScore.id },
          data: {
            totalServices: consolidatedData.totalServices,
            totalAnomalies: consolidatedData.totalAnomalies,
            anomalyRate: consolidatedData.anomalyRate,
            avgEfficiency: consolidatedData.avgEfficiency,
            consistencyScore: consolidatedData.consistencyScore,
            favoredClients: consolidatedData.favoredClients,
            fraudIndicators: consolidatedData.fraudIndicators,
            timePatterns: consolidatedData.timePatterns,
            riskScore: consolidatedData.riskScore,
            riskLevel: riskLevel,
            lastCalculated: new Date(),
            updatedAt: new Date()
          }
        })

        // Eliminar duplicados
        const duplicateIds = scores.filter(s => s.id !== bestScore.id).map(s => s.id)
        await prisma.employeeAnomalyScore.deleteMany({
          where: {
            id: { in: duplicateIds }
          }
        })

        employeesConsolidated++
        employeesDeleted += duplicateIds.length
        
        console.log(`   ✅ Consolidado: ${consolidatedData.totalServices} servicios, ${consolidatedData.totalAnomalies} anomalías, score: ${consolidatedData.riskScore}`)
      }
    }

    console.log('\n✅ CONSOLIDACIÓN COMPLETADA:')
    console.log(`   📊 Clientes consolidados: ${clientsConsolidated}`)
    console.log(`   📊 Registros de clientes eliminados: ${clientsDeleted}`)
    console.log(`   👥 Empleados consolidados: ${employeesConsolidated}`)
    console.log(`   👥 Registros de empleados eliminados: ${employeesDeleted}`)

    // 3. VERIFICAR RESULTADO
    console.log('\n🔍 VERIFICANDO RESULTADO...')
    
    const finalClientScores = await prisma.clientAnomalyScore.findMany()
    const finalEmployeeScores = await prisma.employeeAnomalyScore.findMany()
    
    console.log(`📊 Registros finales de clientes: ${finalClientScores.length}`)
    console.log(`👥 Registros finales de empleados: ${finalEmployeeScores.length}`)

    // Verificar que no hay duplicados
    const clientIds = finalClientScores.map(s => s.clientId)
    const uniqueClientIds = new Set(clientIds)
    const employeeIds = finalEmployeeScores.map(s => s.employeeId)
    const uniqueEmployeeIds = new Set(employeeIds)

    console.log(`📊 Clientes únicos: ${uniqueClientIds.size} (${uniqueClientIds.size === clientIds.length ? '✅ Sin duplicados' : '❌ Aún hay duplicados'})`)
    console.log(`👥 Empleados únicos: ${uniqueEmployeeIds.size} (${uniqueEmployeeIds.size === employeeIds.length ? '✅ Sin duplicados' : '❌ Aún hay duplicados'})`)

  } catch (error) {
    console.error('❌ Error durante la consolidación:', error)
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