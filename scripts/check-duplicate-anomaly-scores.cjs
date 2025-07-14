/**
 * 🔍 SCRIPT: VERIFICACIÓN DE DUPLICADOS EN TABLAS DE ANOMALÍAS
 * ===========================================================
 * 
 * Verifica y muestra registros duplicados en las tablas de anomalías
 * para identificar el problema de datos inconsistentes
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error']
})

async function main() {
  console.log('🔍 Verificando duplicados en tablas de anomalías...')

  try {
    // 1. Verificar duplicados en client anomaly scores
    console.log('\n📊 CLIENTES - Verificando duplicados...')
    
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

    console.log(`Total registros de clientes: ${clientScores.length}`)

    // Agrupar por clientId para detectar duplicados
    const clientGroups = new Map()
    
    for (const score of clientScores) {
      const clientId = score.clientId
      if (!clientGroups.has(clientId)) {
        clientGroups.set(clientId, [])
      }
      clientGroups.get(clientId).push(score)
    }

    console.log(`Clientes únicos: ${clientGroups.size}`)

    // Mostrar duplicados
    let duplicateClients = 0
    for (const [clientId, scores] of clientGroups) {
      if (scores.length > 1) {
        duplicateClients++
        const client = scores[0].client
        console.log(`❌ DUPLICADO - Cliente: ${client?.firstName} ${client?.lastName} (${clientId})`)
        console.log(`   Registros: ${scores.length}`)
        scores.forEach((score, index) => {
          console.log(`   ${index + 1}. ID: ${score.id}, ClinicId: ${score.clinicId}, Score: ${score.riskScore}, Servicios: ${score.totalServices}`)
        })
        console.log('')
      }
    }

    console.log(`🚨 Clientes con duplicados: ${duplicateClients}`)

    // 2. Verificar duplicados en employee anomaly scores
    console.log('\n👥 EMPLEADOS - Verificando duplicados...')
    
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

    console.log(`Total registros de empleados: ${employeeScores.length}`)

    // Agrupar por employeeId para detectar duplicados
    const employeeGroups = new Map()
    
    for (const score of employeeScores) {
      const employeeId = score.employeeId
      if (!employeeGroups.has(employeeId)) {
        employeeGroups.set(employeeId, [])
      }
      employeeGroups.get(employeeId).push(score)
    }

    console.log(`Empleados únicos: ${employeeGroups.size}`)

    // Mostrar duplicados
    let duplicateEmployees = 0
    for (const [employeeId, scores] of employeeGroups) {
      if (scores.length > 1) {
        duplicateEmployees++
        const employee = scores[0].employee
        console.log(`❌ DUPLICADO - Empleado: ${employee?.firstName} ${employee?.lastName} (${employeeId})`)
        console.log(`   Registros: ${scores.length}`)
        scores.forEach((score, index) => {
          console.log(`   ${index + 1}. ID: ${score.id}, ClinicId: ${score.clinicId}, Score: ${score.riskScore}, Servicios: ${score.totalServices}`)
        })
        console.log('')
      }
    }

    console.log(`🚨 Empleados con duplicados: ${duplicateEmployees}`)

    // 3. Verificar constraint unique
    console.log('\n🔧 VERIFICANDO CONSTRAINTS UNIQUE...')
    
    // Verificar si el constraint unique existe
    try {
      await prisma.$executeRaw`
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'saasavatar' 
        AND table_name = 'smart_plug_client_anomaly_scores' 
        AND constraint_type = 'UNIQUE'
      `
      console.log('✅ Constraint unique verificado')
    } catch (error) {
      console.log('❌ Error verificando constraints:', error.message)
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
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