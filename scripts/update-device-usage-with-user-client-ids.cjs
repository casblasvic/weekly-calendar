/**
 * 🔧 SCRIPT: ACTUALIZACIÓN DE CAMPOS userId y clientId EN DEVICE USAGE
 * ====================================================================
 * 
 * Este script actualiza los registros existentes de appointment_device_usage
 * para poblar los campos userId y clientId desde las relaciones de appointment.
 * 
 * 🎯 OBJETIVO: Optimizar consultas futuras evitando joins innecesarios
 * 
 * 🚨 IMPORTANTE: Solo actualizar con CUIDs reales de la BD
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error']
})

async function main() {
  console.log('🔧 Iniciando actualización de campos userId y clientId en device usage...')

  try {
    // 1. Obtener todos los registros de device usage que necesitan actualización
    console.log('📊 Obteniendo registros de device usage...')
    
    const deviceUsageRecords = await prisma.appointmentDeviceUsage.findMany({
      where: {
        OR: [
          { userId: null },
          { clientId: null }
        ]
      },
      include: {
        appointment: {
          select: {
            id: true,
            personId: true,
            professionalUserId: true,
            clinicId: true
          }
        }
      }
    })

    console.log(`✅ Encontrados ${deviceUsageRecords.length} registros para actualizar`)

    if (deviceUsageRecords.length === 0) {
      console.log('✅ Todos los registros ya están actualizados')
      return
    }

    // 2. Actualizar registros en lotes
    let updated = 0
    let errors = 0

    console.log('💾 Actualizando registros...')

    for (const record of deviceUsageRecords) {
      try {
        const updateData = {}

        // Solo actualizar campos que están null
        if (!record.userId && record.appointment?.professionalUserId) {
          updateData.userId = record.appointment.professionalUserId
        }

        if (!record.clientId && record.appointment?.personId) {
          updateData.clientId = record.appointment.personId
        }

        if (!record.clinicId && record.appointment?.clinicId) {
          updateData.clinicId = record.appointment.clinicId
        }

        // Solo actualizar si hay cambios
        if (Object.keys(updateData).length > 0) {
          await prisma.appointmentDeviceUsage.update({
            where: { id: record.id },
            data: updateData
          })
          updated++
        }

      } catch (error) {
        console.error(`❌ Error actualizando registro ${record.id}:`, error.message)
        errors++
      }
    }

    console.log('✅ Actualización completada:')
    console.log(`   📊 Registros actualizados: ${updated}`)
    console.log(`   ❌ Errores: ${errors}`)

    // 3. Verificar resultados
    console.log('🔍 Verificando resultados...')
    
    const remainingNulls = await prisma.appointmentDeviceUsage.count({
      where: {
        OR: [
          { userId: null },
          { clientId: null }
        ]
      }
    })

    console.log(`📊 Registros con campos null restantes: ${remainingNulls}`)

    if (remainingNulls === 0) {
      console.log('🎉 ¡Todos los registros han sido actualizados correctamente!')
    }

  } catch (error) {
    console.error('❌ Error durante la actualización:', error)
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