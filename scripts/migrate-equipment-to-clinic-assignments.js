import { prisma, Prisma } from '@/lib/db';
// const prisma = new PrismaClient(); // MIGRADO: usar singleton desde @/lib/db

// Función para generar deviceId basado en nombre del equipamiento y clínica
function generateDeviceId(equipmentName, clinicPrefix, counter = 1) {
  const cleanName = equipmentName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 6)
  
  return `${cleanName}-${clinicPrefix}-${counter.toString().padStart(3, '0')}`
}

async function migrateEquipmentData() {
  console.log('🔄 Verificando migración de datos de equipamiento...')

  try {
    // 1. Verificar equipamientos existentes
    const equipmentCount = await prisma.equipment.count()
    console.log(`📋 Total de equipamientos: ${equipmentCount}`)

    // 2. Verificar asignaciones existentes
    const assignmentCount = await prisma.equipmentClinicAssignment.count()
    console.log(`📋 Total de asignaciones existentes: ${assignmentCount}`)

    // 3. Si no hay asignaciones pero hay equipamientos, crear asignaciones básicas
    if (equipmentCount > 0 && assignmentCount === 0) {
      console.log('📝 Creando asignaciones básicas para equipamientos existentes...')

      const equipment = await prisma.equipment.findMany({
        include: { system: true }
      })

      const clinics = await prisma.clinic.findMany()

      if (clinics.length === 0) {
        console.warn('⚠️ No hay clínicas disponibles. No se pueden crear asignaciones.')
        return
      }

      const assignments = []
      let counter = 1

      for (const eq of equipment) {
        // Asignar al primer clínica disponible del mismo sistema
        const clinic = clinics.find(c => c.systemId === eq.systemId) || clinics[0]
        const clinicPrefix = clinic.prefix || 'CLI'
        
        assignments.push({
          equipmentId: eq.id,
          clinicId: clinic.id,
          serialNumber: `${eq.name.replace(/\s+/g, '').substring(0, 6).toUpperCase()}-${clinicPrefix}-${counter.toString().padStart(3, '0')}`,
          deviceId: generateDeviceId(eq.name, clinicPrefix, counter),
          systemId: eq.systemId,
          assignedAt: new Date(),
          isActive: true,
          notes: `Asignación automática creada durante migración`
        })

        counter++
      }

      if (assignments.length > 0) {
        await prisma.equipmentClinicAssignment.createMany({
          data: assignments,
          skipDuplicates: true
        })
        console.log(`✅ Creadas ${assignments.length} asignaciones automáticas`)
      }
    }

    // 4. Verificar estructura final
    const finalCount = await prisma.equipmentClinicAssignment.count()
    const equipmentWithAssignments = await prisma.equipment.findMany({
      include: {
        clinicAssignments: true
      }
    })

    console.log('🎉 Verificación completada!')
    console.log('\n📊 RESUMEN FINAL:')
    console.log(`• Total de equipamientos: ${equipmentCount}`)
    console.log(`• Total de asignaciones: ${finalCount}`)
    console.log(`• Equipamientos con asignaciones: ${equipmentWithAssignments.filter(e => e.clinicAssignments.length > 0).length}`)

  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar migración
migrateEquipmentData()
  .then(() => {
    console.log('✅ Verificación completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Verificación fallida:', error)
    process.exit(1)
  })
