/**
 * 👥 SEED: PERSONAS DE EJEMPLO (CORREGIDO ANTI-DUPLICADOS)
 * Versión corregida que usa upserts individuales en lugar de createMany
 * para prevenir duplicados efectivamente con los nuevos constraints únicos.
 * 
 * CORRECCIONES:
 * - Usa upsert individual en lugar de createMany
 * - Respeta constraints únicos del schema
 * - Previene duplicados por email, phone, nationalId
 * - Mantiene datos consistentes entre ejecuciones
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

export async function seedPersons(prisma: PrismaClient, systemId: string) {
  console.log('👥 Seeding Persons (Anti-Duplicates Fixed)...');

  try {
    // Datos de personas con upsert individual
    const personsData = [
      {
        firstName: 'María',
        lastName: 'García López',
        email: 'maria.garcia@example.com',
        phone: '+34666777888',
        birthDate: new Date('1985-03-15'),
        gender: 'FEMALE',
        nationalId: '12345678A',
        systemId: systemId,
      },
      {
        firstName: 'Carlos',
        lastName: 'Rodríguez Martín', 
        email: 'carlos.rodriguez@techcorp.com',
        phone: '+34677888999',
        birthDate: new Date('1990-07-22'),
        gender: 'MALE',
        nationalId: '87654321B',
        systemId: systemId,
      },
      {
        firstName: 'Ana',
        lastName: 'Fernández Ruiz',
        email: 'ana.fernandez@clinic.com',
        phone: '+34688999000',
        birthDate: new Date('1988-11-10'),
        gender: 'FEMALE',
        nationalId: '11223344C',
        systemId: systemId,
      },
      {
        firstName: 'Cliente Test',
        lastName: 'Sin Email',
        phone: '+34699000111',
        birthDate: new Date('1992-05-30'),
        gender: 'MALE',
        nationalId: '99887766D',
        systemId: systemId,
      }
    ];

    // 🔒 UPSERT INDIVIDUAL para respetar constraints únicos
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const personData of personsData) {
      // Buscar persona existente por email, phone o nationalId
      const existingPerson = await prisma.person.findFirst({
        where: {
          systemId,
          OR: [
            { email: personData.email },
            { phone: personData.phone },
            { nationalId: personData.nationalId }
          ]
        }
      });

      if (existingPerson) {
        // Actualizar persona existente
        await prisma.person.update({
          where: { id: existingPerson.id },
          data: personData
        });
        updatedCount++;
        console.log(`  ✅ Updated person: ${personData.firstName} ${personData.lastName}`);
      } else {
        // Crear nueva persona
        await prisma.person.create({
          data: {
            id: createId(),
            ...personData
          }
        });
        createdCount++;
        console.log(`  ✅ Created person: ${personData.firstName} ${personData.lastName}`);
      }
    }

    console.log(`✅ Persons seeding completed: ${createdCount} created, ${updatedCount} updated`);

  } catch (error) {
    console.error('❌ Error seeding persons:', error);
    // No fallar el seed completo por este error
  }
}

// Función simplificada para clientes
export async function seedClientPersons(prisma: PrismaClient, systemId: string) {
  console.log('👥 Seeding Client Persons (Optimized)...');
  
  try {
    // Solo crear roles funcionales para las personas existentes
    const persons = await prisma.person.findMany({
      where: { systemId },
      take: 3 // Solo los primeros 3
    });

    if (persons.length === 0) return;

    const clientRolesData = persons.map(person => ({
      id: createId(),
      personId: person.id,
      roleType: 'CLIENT' as const,
      systemId: systemId,
    }));

    await prisma.personFunctionalRole.createMany({
      data: clientRolesData,
      skipDuplicates: true
    });

    console.log(`✅ Created ${clientRolesData.length} client roles optimized`);

  } catch (error) {
    console.error('❌ Error seeding client persons:', error);
  }
}
