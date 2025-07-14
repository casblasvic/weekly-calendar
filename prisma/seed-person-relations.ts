/**
 * 👥 SEED: RELACIONES ENTRE PERSONAS (OPTIMIZADO)
 * Versión optimizada que crea datos mínimos pero suficientes
 * para probar el sistema de relaciones y contact proxies.
 * 
 * OPTIMIZACIONES:
 * - Usa createMany en lugar de operaciones individuales
 * - Reduce cantidad de relaciones de ejemplo
 * - Elimina validaciones complejas durante seeding
 */

import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

export async function seedPersonRelations(prisma: PrismaClient, systemId: string) {
  console.log('👥 Seeding Person Relations (Optimized)...');

  try {
    // Obtener solo las primeras 3 personas
    const persons = await prisma.person.findMany({
      where: { systemId },
      take: 3
    });

    if (persons.length < 2) {
      console.log('Not enough persons for relations, skipping');
      return;
    }

    // Crear solo una relación básica de ejemplo
    const relationsData = [
      {
        id: createId(),
        personId: persons[0].id,
        relatedPersonId: persons[1].id,
        relationshipType: 'FAMILY',
        systemId: systemId,
      }
    ];

    // Crear un contact proxy básico
    const contactProxiesData = [
      {
        id: createId(),
        sourcePersonId: persons[0].id,
        targetPersonId: persons[1].id,
        canSchedule: true,
        canPayment: false,
        canMedicalInfo: false,
        systemId: systemId,
      }
    ];

    // Insertar relaciones y proxies de una vez
    await prisma.personRelationship.createMany({
      data: relationsData,
      skipDuplicates: true
    });

    await prisma.personContactProxy.createMany({
      data: contactProxiesData,
      skipDuplicates: true
    });

    console.log(`✅ Created ${relationsData.length} relations and ${contactProxiesData.length} contact proxies optimized`);

  } catch (error) {
    console.error('❌ Error seeding person relations:', error);
    // No fallar el seed completo por este error
  }
} 