import { prisma, Prisma, PrismaClient } from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function seedPersons(prisma: PrismaClient, systemId: string) {
  console.log('Creating example Persons and Opportunities...');
  
  const createdPersonIds: string[] = [];
  
  try {
    // Buscar el sistema
    const system = await prisma.system.findUnique({
      where: { id: systemId }
    });
    
    if (!system) {
      throw new Error('System not found');
    }
    
    // Buscar compañía de ejemplo para asociar contactos
    let exampleCompany = await prisma.company.findFirst({
      where: { systemId: system.id }
    });
    
    if (!exampleCompany) {
      // Crear una compañía de ejemplo si no existe
      exampleCompany = await prisma.company.create({
        data: {
          fiscalName: 'Tech Innovate S.L.',
          taxId: 'B87654321',
          systemId: system.id,
        }
      });
    }
    
    // Crear personas de ejemplo con CUIDs válidos - NO especificar IDs manualmente
    const person1 = await prisma.person.create({
      data: {
        firstName: 'María',
        lastName: 'García López',
        email: 'maria.garcia@example.com',
        phone: '+34666777888',
        birthDate: new Date('1985-03-15'),
        gender: 'FEMALE',
        nationalId: '12345678A',
        taxId: '12345678A',
        address: 'Calle Mayor 123',
        city: 'Madrid',
        stateProvince: 'Madrid',
        postalCode: '28001',
        countryIsoCode: 'ES',
        notes: 'Persona de ejemplo con múltiples roles',
        systemId: system.id,
      }
    });

    const person2 = await prisma.person.create({
      data: {
        firstName: 'Carlos',
        lastName: 'Rodríguez Martín',
        email: 'carlos.rodriguez@techcorp.com',
        phone: '+34677888999',
        birthDate: new Date('1990-07-22'),
        gender: 'MALE',
        nationalId: '87654321B',
        address: 'Avenida Diagonal 456',
        city: 'Barcelona',
        stateProvince: 'Barcelona',
        postalCode: '08001',
        countryIsoCode: 'ES',
        systemId: system.id,
      }
    });

    const person3 = await prisma.person.create({
      data: {
        firstName: 'Ana',
        lastName: 'Fernández',
        email: 'ana.fernandez@innovate.com',
        phone: '+34699111222',
        gender: 'FEMALE',
        address: 'Plaza España 7',
        city: 'Valencia',
        stateProvince: 'Valencia',
        countryIsoCode: 'ES',
        systemId: system.id,
      }
    });
    
    createdPersonIds.push(person1.id, person2.id, person3.id);
    
    // Crear roles funcionales para las personas
    // Persona 1: Cliente y Lead
    const clientRole1 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: person1.id } },
        roleType: 'CLIENT',
        isActive: true,
        system: { connect: { id: system.id } }
      }
    });
    
    const leadRole1 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: person1.id } },
        roleType: 'LEAD',
        isActive: true,
        system: { connect: { id: system.id } }
      }
    });
    
    // Datos específicos del cliente
    await prisma.personClientData.create({
      data: {
        functionalRoleId: clientRole1.id,
        marketingConsent: true,
        dataProcessingConsent: true,
        address: person1.address,
        city: person1.city,
        postalCode: person1.postalCode,
        countryIsoCode: person1.countryIsoCode,
        systemId: systemId,
      }
    });
    
    // Datos específicos del lead
    await prisma.personLeadData.create({
      data: {
        functionalRoleId: leadRole1.id,
        status: 'QUALIFIED',
        source: 'WEB',
        interests: 'Tratamientos láser',
        systemId: systemId,
      }
    });
    
    // Persona 2: Solo Lead
    const leadRole2 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: person2.id } },
        roleType: 'LEAD',
        isActive: true,
        system: { connect: { id: system.id } }
      }
    });
    
    await prisma.personLeadData.create({
      data: {
        functionalRoleId: leadRole2.id,
        status: 'NEW',
        source: 'REFERRAL',
        interests: 'Paquetes empresariales',
        systemId: systemId,
      }
    });
    
    // Persona 3: Contacto de empresa
    const contactRole3 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: person3.id } },
        roleType: 'CONTACT',
        isActive: true,
        system: { connect: { id: system.id } }
      }
    });
    
    await prisma.personContactData.create({
      data: {
        functionalRoleId: contactRole3.id,
        position: 'Directora de Recursos Humanos',
        department: 'RRHH',
        companyId: exampleCompany.id,
        isPrimary: true,
        systemId: systemId,
      }
    });
    
    console.log('Created example Persons:');
    console.log(`- ${person1.firstName} ${person1.lastName} (CLIENT + LEAD)`);
    console.log(`- ${person2.firstName} ${person2.lastName} (LEAD con oportunidad)`);
    console.log(`- ${person3.firstName} ${person3.lastName} (CONTACT de empresa)`);
    
    // Buscar clínica para las oportunidades
    const clinic = await prisma.clinic.findFirst({
      where: { systemId: system.id }
    });
    
    if (leadRole2 && clinic) {
      // Primero obtenemos el leadData asociado al rol
      const leadData2 = await prisma.personLeadData.findUnique({
        where: { functionalRoleId: leadRole2.id }
      });
      
      if (leadData2) {
        const opportunity1 = await prisma.opportunity.create({
          data: {
            name: 'Bono Corporativo - Tech Corp',
            description: 'Interesados en bonos de bienestar para empleados',
            estimatedValue: 5000,
            stage: 'PROPOSAL',
            probability: 75,
            estimatedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
            leadData: { connect: { id: leadData2.id } },
            clinic: { connect: { id: clinic.id } },
            system: { connect: { id: system.id } },
          }
        });
        
        const opportunity2 = await prisma.opportunity.create({
          data: {
            name: 'Evento Corporativo - Día del Bienestar',
            description: 'Servicios de masaje y estética para evento empresarial',
            estimatedValue: 2500,
            stage: 'NEGOTIATION',
            probability: 90,
            estimatedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
            leadData: { connect: { id: leadData2.id } },
            clinic: { connect: { id: clinic.id } },
            system: { connect: { id: system.id } },
          }
        });
        
        console.log(`Created ${2} opportunities`);
      }
    }
    
    console.log('✅ Oportunidades creadas exitosamente');
    
    return createdPersonIds;
    
  } catch (error) {
    console.error('Error seeding persons:', error);
    throw error;
  }
}

export async function seedClientPersons(prisma: PrismaClient, systemId: string) {
  console.log('Creating example Client Persons...');
  
  const createdPersonsMap = new Map<string, any>();
  
  try {
    // Crear personas con rol CLIENT - NO especificar IDs manualmente
    const persona1 = await prisma.person.create({
      data: {
        email: 'ana.garcia@test.com',
        firstName: 'Ana',
        lastName: 'Garcia',
        phone: '600111222',
        systemId: systemId,
        birthDate: new Date('1985-05-15'),
        gender: 'FEMALE',
        address: 'Calle Falsa 123',
        city: 'Madrid',
        postalCode: '28001',
        countryIsoCode: 'ES',
      }
    });
    
    // Crear rol funcional CLIENT
    const clientRole1 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: persona1.id } },
        roleType: 'CLIENT',
        isActive: true,
        system: { connect: { id: systemId } }
      }
    });
    
    // Crear datos de cliente
    await prisma.personClientData.create({
      data: {
        functionalRoleId: clientRole1.id,
        marketingConsent: true,
        dataProcessingConsent: true,
        address: persona1.address,
        city: persona1.city,
        postalCode: persona1.postalCode,
        countryIsoCode: persona1.countryIsoCode,
        systemId: systemId,
      }
    });
    
    createdPersonsMap.set('ana.garcia@test.com', persona1);
    
    // Segunda persona
    const persona2 = await prisma.person.create({
      data: {
        email: 'cliente2.casablanca@mail.ma',
        firstName: 'Youssef',
        lastName: 'Bennani',
        phone: '0600998877',
        systemId: systemId,
        birthDate: new Date('1990-11-20'),
        gender: 'MALE',
        address: 'Boulevard Hassan II 456',
        city: 'Casablanca',
        postalCode: '20250',
        countryIsoCode: 'MA',
      }
    });
    
    const clientRole2 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: persona2.id } },
        roleType: 'CLIENT',
        isActive: true,
        system: { connect: { id: systemId } }
      }
    });
    
    await prisma.personClientData.create({
      data: {
        functionalRoleId: clientRole2.id,
        marketingConsent: false,
        dataProcessingConsent: true,
        address: persona2.address,
        city: persona2.city,
        postalCode: persona2.postalCode,
        countryIsoCode: persona2.countryIsoCode,
        systemId: systemId,
      }
    });
    
    createdPersonsMap.set('cliente2.casablanca@mail.ma', persona2);
    
    // Tercera persona (sin email)
    const persona3 = await prisma.person.create({
      data: {
        firstName: 'Cliente Test',
        lastName: 'Sin Email',
        phone: '600333444',
        systemId: systemId,
        birthDate: new Date('1995-01-01'),
        gender: 'MALE',
        address: 'Plaza Mayor 1',
        city: 'Sevilla',
        postalCode: '41001',
        countryIsoCode: 'ES',
      }
    });
    
    const clientRole3 = await prisma.personFunctionalRole.create({
      data: {
        person: { connect: { id: persona3.id } },
        roleType: 'CLIENT',
        isActive: true,
        system: { connect: { id: systemId } }
      }
    });
    
    await prisma.personClientData.create({
      data: {
        functionalRoleId: clientRole3.id,
        marketingConsent: true,
        dataProcessingConsent: true,
        address: persona3.address,
        city: persona3.city,
        postalCode: persona3.postalCode,
        countryIsoCode: persona3.countryIsoCode,
        systemId: systemId,
      }
    });
    
    createdPersonsMap.set('sin-email', persona3);
    
    console.log('✅ Personas con rol CLIENT creadas:', {
      persona1: `${persona1.firstName} ${persona1.lastName}`,
      persona2: `${persona2.firstName} ${persona2.lastName}`,
      persona3: `${persona3.firstName} ${persona3.lastName}`,
    });
    
    return createdPersonsMap;
    
  } catch (error) {
    console.error('Error creating client persons:', error);
    throw error;
  }
}
