/**
 * 👥 SEED: PERSONAS DE EJEMPLO (OPTIMIZADO)
 * Versión optimizada que crea datos mínimos pero suficientes
 * para probar el sistema de gestión de identidades.
 * 
 * OPTIMIZACIONES:
 * - Usa createMany en lugar de upserts individuales
 * - Reduce cantidad de personas de ejemplo
 * - Elimina validaciones complejas durante seeding
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

export async function seedPersons(prisma: PrismaClient, systemId: string) {
  console.log('👥 Seeding Persons (Optimized)...');

  try {
    // Crear personas básicas con createMany (más rápido)
    const personsData = [
      {
        id: createId(),
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
        id: createId(),
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
        id: createId(),
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
        id: createId(),
        firstName: 'Cliente Test',
        lastName: 'Sin Email',
        phone: '+34699000111',
        birthDate: new Date('1992-05-30'),
        gender: 'MALE',
        nationalId: '99887766D',
        systemId: systemId,
      }
    ];

    // Insertar todas las personas de una vez
    await prisma.person.createMany({
      data: personsData,
      skipDuplicates: true
    });

    console.log(`✅ Created ${personsData.length} persons optimized`);

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
