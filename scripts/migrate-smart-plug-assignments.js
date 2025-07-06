import { prisma, Prisma } from '@/lib/db';
// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

async function migrateSmartPlugAssignments() {
  console.log('🔄 Iniciando migración de SmartPlugDevice a asignaciones...')
  
  try {
    // 1. Buscar SmartPlugDevices que no tienen equipmentClinicAssignmentId pero sí tienen clinicId
    const orphanedDevices = await prisma.smartPlugDevice.findMany({
      where: {
        equipmentClinicAssignmentId: null,
        clinicId: {
          not: null
        }
      },
      include: {
        clinic: true
      }
    })

    console.log(`📊 Encontrados ${orphanedDevices.length} dispositivos que necesitan migración`)

    for (const device of orphanedDevices) {
      console.log(`\n🔍 Procesando dispositivo: ${device.name} (ID: ${device.id})`)
      console.log(`   Clínica: ${device.clinic?.name || 'Sin nombre'} (${device.clinicId})`)

      // 2. Buscar si existe una asignación de equipo para esta clínica
      // Buscamos por nombre del dispositivo o por algún criterio similar
      const possibleAssignments = await prisma.equipmentClinicAssignment.findMany({
        where: {
          clinicId: device.clinicId,
          isActive: true,
          // Buscar por nombre similar o por deviceName
          OR: [
            {
              deviceName: {
                contains: device.name,
                mode: 'insensitive'
              }
            },
            {
              equipment: {
                name: {
                  contains: device.name,
                  mode: 'insensitive'
                }
              }
            }
          ]
        },
        include: {
          equipment: true,
          smartPlugDevice: true
        }
      })

      console.log(`   Asignaciones posibles encontradas: ${possibleAssignments.length}`)

      if (possibleAssignments.length === 1) {
        const assignment = possibleAssignments[0]
        
        // Verificar que la asignación no tenga ya un SmartPlugDevice
        if (!assignment.smartPlugDevice) {
          console.log(`   ✅ Asociando con asignación: ${assignment.deviceName || assignment.equipment.name} (${assignment.id})`)
          
          await prisma.smartPlugDevice.update({
            where: { id: device.id },
            data: {
              equipmentClinicAssignmentId: assignment.id
            }
          })
          
          console.log(`   ✅ Migración completada para ${device.name}`)
        } else {
          console.log(`   ⚠️  La asignación ya tiene un SmartPlugDevice asociado`)
        }
      } else if (possibleAssignments.length === 0) {
        console.log(`   ⚠️  No se encontraron asignaciones compatibles para ${device.name}`)
        console.log(`   💡 Sugerencia: Crear manualmente una asignación para este dispositivo`)
      } else {
        console.log(`   ⚠️  Múltiples asignaciones posibles encontradas para ${device.name}:`)
        possibleAssignments.forEach((assignment, index) => {
          console.log(`      ${index + 1}. ${assignment.deviceName || assignment.equipment.name} (${assignment.id})`)
        })
        console.log(`   💡 Sugerencia: Revisar manualmente cuál es la asignación correcta`)
      }
    }

    // 3. Mostrar resumen final
    const migratedCount = await prisma.smartPlugDevice.count({
      where: {
        equipmentClinicAssignmentId: {
          not: null
        }
      }
    })

    const remainingOrphaned = await prisma.smartPlugDevice.count({
      where: {
        equipmentClinicAssignmentId: null,
        clinicId: {
          not: null
        }
      }
    })

    console.log(`\n📊 Resumen de migración:`)
    console.log(`   ✅ Dispositivos migrados exitosamente: ${migratedCount}`)
    console.log(`   ⚠️  Dispositivos pendientes de migración manual: ${remainingOrphaned}`)
    
    if (remainingOrphaned > 0) {
      console.log(`\n💡 Para los dispositivos pendientes, puedes:`)
      console.log(`   1. Crear asignaciones manualmente en la interfaz`)
      console.log(`   2. Asociar desde el modal de edición del dispositivo`)
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
migrateSmartPlugAssignments()

export { migrateSmartPlugAssignments } 