/**
 * 🔗 SEED: CONTACTOS MÚLTIPLES DE PERSONAS (OPTIMIZADO)
 * Versión optimizada que crea datos mínimos pero suficientes
 * para probar el sistema de contactos múltiples.
 * 
 * OPTIMIZACIONES:
 * - Usa createMany en lugar de operaciones individuales
 * - Reduce cantidad de contactos de ejemplo
 * - Elimina validaciones complejas durante seeding
 */

import { PrismaClient, ContactType, ContactContext } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

export async function seedPersonContacts(prisma: PrismaClient, systemId: string) {
  console.log('🔗 Seeding Person Contacts (Optimized)...');

  try {
    // Obtener solo las primeras 3 personas
    const persons = await prisma.person.findMany({
      where: { systemId },
      take: 3
    });

    if (persons.length === 0) {
      console.log('No persons found, skipping contact seeding');
      return;
    }

    // Crear contactos básicos para cada persona
    const contactsData = [];

    persons.forEach((person, index) => {
      // Email principal
      contactsData.push({
        id: createId(),
        personId: person.id,
        contactType: ContactType.EMAIL,
        contactValue: `${person.firstName.toLowerCase()}.${index}@example.com`,
        contactContext: ContactContext.PERSONAL,
        isPreferred: true,
        isPrimary: true,
        systemId: systemId,
      });

      // Teléfono alternativo
      contactsData.push({
        id: createId(),
        personId: person.id,
        contactType: ContactType.PHONE,
        contactValue: `+3469900${index.toString().padStart(4, '0')}`,
        contactContext: ContactContext.WORK,
        isPreferred: false,
        isPrimary: false,
        systemId: systemId,
      });
    });

    // Insertar todos los contactos de una vez
    await prisma.personContact.createMany({
      data: contactsData,
      skipDuplicates: true
    });

    console.log(`✅ Created ${contactsData.length} person contacts optimized`);

  } catch (error) {
    console.error('❌ Error seeding person contacts:', error);
    // No fallar el seed completo por este error
  }
} 