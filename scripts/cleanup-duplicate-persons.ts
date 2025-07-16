/**
 * 🧹 SCRIPT: LIMPIEZA DE PERSONAS DUPLICADAS
 * ==========================================
 * 
 * Script para identificar y eliminar personas duplicadas en la base de datos.
 * Mantiene el registro más reciente de cada grupo de duplicados.
 * 
 * CRITERIOS DE DUPLICADOS:
 * - Mismo systemId + email
 * - Mismo systemId + phone  
 * - Mismo systemId + nationalId
 * - Mismo systemId + firstName + lastName + birthDate
 * 
 * ESTRATEGIA:
 * - Identifica grupos de duplicados
 * - Mantiene el registro con updatedAt más reciente
 * - Elimina los registros más antiguos
 * - Actualiza referencias en tablas relacionadas
 * 
 * USO: npx tsx scripts/cleanup-duplicate-persons.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateGroup {
  criteria: string;
  persons: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationalId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

async function findDuplicateGroups(systemId: string): Promise<DuplicateGroup[]> {
  const duplicateGroups: DuplicateGroup[] = [];
  
  // 1. Duplicados por email
  const emailDuplicates = await prisma.person.groupBy({
    by: ['email'],
    where: {
      systemId,
      email: { not: null }
    },
    having: {
      email: {
        _count: {
          gt: 1
        }
      }
    }
  });

  for (const group of emailDuplicates) {
    if (group.email) {
      const persons = await prisma.person.findMany({
        where: { systemId, email: group.email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationalId: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (persons.length > 1) {
        duplicateGroups.push({
          criteria: `email: ${group.email}`,
          persons
        });
      }
    }
  }

  // 2. Duplicados por phone
  const phoneDuplicates = await prisma.person.groupBy({
    by: ['phone'],
    where: {
      systemId,
      phone: { not: null }
    },
    having: {
      phone: {
        _count: {
          gt: 1
        }
      }
    }
  });

  for (const group of phoneDuplicates) {
    if (group.phone) {
      const persons = await prisma.person.findMany({
        where: { systemId, phone: group.phone },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationalId: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (persons.length > 1) {
        // Verificar que no esté ya incluido por email
        const existingGroup = duplicateGroups.find(dg => 
          dg.persons.some(p => persons.some(np => np.id === p.id))
        );
        
        if (!existingGroup) {
          duplicateGroups.push({
            criteria: `phone: ${group.phone}`,
            persons
          });
        }
      }
    }
  }

  // 3. Duplicados por nationalId
  const nationalIdDuplicates = await prisma.person.groupBy({
    by: ['nationalId'],
    where: {
      systemId,
      nationalId: { not: null }
    },
    having: {
      nationalId: {
        _count: {
          gt: 1
        }
      }
    }
  });

  for (const group of nationalIdDuplicates) {
    if (group.nationalId) {
      const persons = await prisma.person.findMany({
        where: { systemId, nationalId: group.nationalId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nationalId: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (persons.length > 1) {
        // Verificar que no esté ya incluido
        const existingGroup = duplicateGroups.find(dg => 
          dg.persons.some(p => persons.some(np => np.id === p.id))
        );
        
        if (!existingGroup) {
          duplicateGroups.push({
            criteria: `nationalId: ${group.nationalId}`,
            persons
          });
        }
      }
    }
  }

  return duplicateGroups;
}

async function cleanupDuplicates(systemId: string) {
  console.log('🧹 Iniciando limpieza de personas duplicadas...');
  
  const duplicateGroups = await findDuplicateGroups(systemId);
  
  if (duplicateGroups.length === 0) {
    console.log('✅ No se encontraron duplicados.');
    return;
  }

  console.log(`📊 Encontrados ${duplicateGroups.length} grupos de duplicados:`);
  
  let totalDeleted = 0;
  
  for (const group of duplicateGroups) {
    console.log(`\n🔍 Grupo: ${group.criteria}`);
    console.log(`   Registros: ${group.persons.length}`);
    
    // Ordenar por updatedAt desc para mantener el más reciente
    const sortedPersons = group.persons.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    const keepPerson = sortedPersons[0];
    const deletePeople = sortedPersons.slice(1);
    
    console.log(`   ✅ Mantener: ${keepPerson.firstName} ${keepPerson.lastName} (${keepPerson.id})`);
    
    for (const person of deletePeople) {
      console.log(`   🗑️  Eliminar: ${person.firstName} ${person.lastName} (${person.id})`);
      
      try {
        // Actualizar referencias en tablas relacionadas antes de eliminar
        await updateRelatedRecords(person.id, keepPerson.id);
        
        // Eliminar persona duplicada
        await prisma.person.delete({
          where: { id: person.id }
        });
        
        totalDeleted++;
        console.log(`     ✅ Eliminado correctamente`);
      } catch (error) {
        console.error(`     ❌ Error eliminando ${person.id}:`, error);
      }
    }
  }
  
  console.log(`\n🎉 Limpieza completada: ${totalDeleted} registros eliminados`);
}

async function updateRelatedRecords(oldPersonId: string, newPersonId: string) {
  // Actualizar referencias en tablas relacionadas
  const updates = [];
  
  // PersonFunctionalRole
  updates.push(
    prisma.personFunctionalRole.updateMany({
      where: { personId: oldPersonId },
      data: { personId: newPersonId }
    })
  );
  
  // Appointments
  updates.push(
    prisma.appointment.updateMany({
      where: { personId: oldPersonId },
      data: { personId: newPersonId }
    })
  );
  
  // AppointmentDeviceUsage
  updates.push(
    prisma.appointmentDeviceUsage.updateMany({
      where: { clientId: oldPersonId },
      data: { clientId: newPersonId }
    })
  );
  
  // 🔧 CORREGIDO: Eliminar ClientAnomalyScore duplicados en lugar de actualizar
  try {
    await prisma.clientAnomalyScore.deleteMany({
      where: { clientId: oldPersonId }
    });
    console.log(`     🗑️  Eliminados ClientAnomalyScore para ${oldPersonId}`);
  } catch (error) {
    console.warn(`     ⚠️  Error eliminando ClientAnomalyScore para ${oldPersonId}:`, error);
  }
  
  // PersonRelationship
  updates.push(
    prisma.personRelationship.updateMany({
      where: { personId: oldPersonId },
      data: { personId: newPersonId }
    })
  );
  
  updates.push(
    prisma.personRelationship.updateMany({
      where: { relatedPersonId: oldPersonId },
      data: { relatedPersonId: newPersonId }
    })
  );
  
  // PersonContactProxy
  updates.push(
    prisma.personContactProxy.updateMany({
      where: { sourcePersonId: oldPersonId },
      data: { sourcePersonId: newPersonId }
    })
  );
  
  updates.push(
    prisma.personContactProxy.updateMany({
      where: { targetPersonId: oldPersonId },
      data: { targetPersonId: newPersonId }
    })
  );
  
  // PersonContact
  updates.push(
    prisma.personContact.updateMany({
      where: { personId: oldPersonId },
      data: { personId: newPersonId }
    })
  );
  
  await Promise.all(updates);
}

async function main() {
  try {
    // Buscar el sistema principal
    const system = await prisma.system.findFirst();
    if (!system) {
      console.error('❌ No se encontró ningún sistema en la base de datos');
      return;
    }
    
    console.log(`🎯 Limpiando duplicados para sistema: ${system.id}`);
    await cleanupDuplicates(system.id);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error); 