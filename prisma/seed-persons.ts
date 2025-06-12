import { PrismaClient } from '@prisma/client';

export async function seedPersons(prisma: PrismaClient) {
  console.log('Creating example Persons and Opportunities...');
  
  try {
    const system = await prisma.system.findFirst();
    if (!system) {
      throw new Error('No hay sistema disponible. Ejecuta el seed principal primero.');
    }
    
    // Obtener usuarios y clínicas disponibles para asociaciones
    const users = await prisma.user.findMany();
    const clinics = await prisma.clinic.findMany();
    const firstUser = users[0];
    const firstClinic = clinics[0];
    
    // Buscar o crear una empresa de ejemplo
    const exampleCompany = await prisma.company.upsert({
      where: { id: 'cuid-company-1' },
      update: {},
      create: {
        id: 'cuid-company-1',
        fiscalName: 'Innovate Solutions S.L.',
        taxId: 'B87654321',
        address: 'Calle Innovación 123',
        city: 'Valencia',
        postalCode: '46001',
        countryIsoCode: 'ES',
        phone: '+34961234567',
        email: 'info@innovate.com',
        systemId: system.id,
      }
    });
    
    // Crear personas de ejemplo
    const person1 = await prisma.person.upsert({
      where: { id: 'cuid-person-1' },
      update: {},
      create: {
        id: 'cuid-person-1',
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

    const person2 = await prisma.person.upsert({
      where: { id: 'cuid-person-2' },
      update: {},
      create: {
        id: 'cuid-person-2',
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

    const person3 = await prisma.person.upsert({
      where: { id: 'cuid-person-3' },
      update: {},
      create: {
        id: 'cuid-person-3',
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

    // Crear roles funcionales
    // María es CLIENTE (ya ha comprado servicios)
    const mariaClientRole = await prisma.personFunctionalRole.upsert({
      where: { id: 'cuid-role-1' },
      update: {},
      create: {
        id: 'cuid-role-1',
        personId: person1.id,
        roleType: 'CLIENT',
        isActive: true,
        startDate: new Date('2024-01-15'),
        systemId: system.id,
      }
    });

    // Carlos es LEAD (prospecto con oportunidad)
    const carlosLeadRole = await prisma.personFunctionalRole.upsert({
      where: { id: 'cuid-role-2' },
      update: {},
      create: {
        id: 'cuid-role-2',
        personId: person2.id,
        roleType: 'LEAD',
        isActive: true,
        startDate: new Date('2024-12-01'),
        systemId: system.id,
      }
    });

    // Ana es CONTACT de empresa
    const anaContactRole = await prisma.personFunctionalRole.upsert({
      where: { id: 'cuid-role-3' },
      update: {},
      create: {
        id: 'cuid-role-3',
        personId: person3.id,
        roleType: 'CONTACT',
        isActive: true,
        startDate: new Date('2024-11-01'),
        systemId: system.id,
      }
    });

    // Crear datos específicos de Lead para Carlos
    const carlosLeadData = await prisma.personLeadData.upsert({
      where: { id: 'cuid-leaddata-1' },
      update: {},
      create: {
        id: 'cuid-leaddata-1',
        functionalRoleId: carlosLeadRole.id,
        source: 'WEB',
        status: 'QUALIFIED',
        estimatedValue: 2500.00,
        interests: 'Interesado en paquete anual de tratamientos láser',
        assignedToUserId: firstUser?.id, // Asignar al primer usuario disponible
      }
    });

    // Crear oportunidad para Carlos
    const opportunity1 = await prisma.opportunity.upsert({
      where: { id: 'cuid-opportunity-1' },
      update: {},
      create: {
        id: 'cuid-opportunity-1',
        name: 'Paquete Anual Láser - Carlos Rodríguez',
        leadDataId: carlosLeadData.id,
        stage: 'NEGOTIATION',
        estimatedValue: 2500.00,
        probability: 75,
        estimatedCloseDate: new Date('2025-01-15'),
        notes: 'Cliente potencial muy interesado, esperando aprobación presupuesto',
        clinicId: firstClinic?.id,
        systemId: system.id,
      }
    });

    // Crear datos de contacto para Ana (con empresa asociada)
    const anaContactData = await prisma.personContactData.upsert({
      where: { id: 'cuid-contactdata-1' },
      update: {},
      create: {
        id: 'cuid-contactdata-1',
        functionalRoleId: anaContactRole.id,
        position: 'Directora de RRHH',
        department: 'Recursos Humanos',
        companyId: exampleCompany.id,
        isPrimary: true,
        preferredContactMethod: 'EMAIL',
      }
    });

    // María también puede ser LEAD para una nueva oportunidad
    const mariaLeadRole = await prisma.personFunctionalRole.upsert({
      where: { id: 'cuid-role-4' },
      update: {},
      create: {
        id: 'cuid-role-4',
        personId: person1.id,
        roleType: 'LEAD',
        isActive: true,
        startDate: new Date('2024-12-10'),
        systemId: system.id,
      }
    });

    const mariaLeadData = await prisma.personLeadData.upsert({
      where: { id: 'cuid-leaddata-2' },
      update: {},
      create: {
        id: 'cuid-leaddata-2',
        functionalRoleId: mariaLeadRole.id,
        source: 'REFERRAL',
        status: 'NEW',
        estimatedValue: 500.00,
        interests: 'Referida por cliente existente, interesada en tratamiento facial',
        assignedToUserId: firstUser?.id,
      }
    });

    const opportunity2 = await prisma.opportunity.upsert({
      where: { id: 'cuid-opportunity-2' },
      update: {},
      create: {
        id: 'cuid-opportunity-2',
        name: 'Tratamiento Facial Premium - María García',
        leadDataId: mariaLeadData.id,
        stage: 'PROSPECTING',
        estimatedValue: 500.00,
        probability: 40,
        estimatedCloseDate: new Date('2025-02-01'),
        clinicId: firstClinic?.id,
        systemId: system.id,
      }
    });

    console.log('Created example Persons:');
    console.log(`- ${person1.firstName} ${person1.lastName} (CLIENT + LEAD)`);
    console.log(`- ${person2.firstName} ${person2.lastName} (LEAD con oportunidad)`);
    console.log(`- ${person3.firstName} ${person3.lastName} (CONTACT de empresa)`);
    console.log(`Created ${await prisma.opportunity.count()} opportunities`);

    console.log('✅ Oportunidades creadas exitosamente');
    
    // --- Crear Clientes de Ejemplo (migrados de seed.ts) ---
    console.log('Creating example Client Persons...');
    
    // Cliente 1: Ana García (Madrid)
    const clientPerson1 = await prisma.person.upsert({
      where: { id: 'cuid-client-1' },
      update: {},
      create: {
        id: 'cuid-client-1',
        firstName: 'Ana',
        lastName: 'Garcia',
        email: 'cliente1@example.com',
        phone: '600111222',
        birthDate: new Date('1985-05-15'),
        gender: 'FEMALE',
        systemId: system.id,
        functionalRoles: {
          create: {
            roleType: 'CLIENT',
            systemId: system.id
          }
        }
      },
      include: {
        functionalRoles: true
      }
    });

    // Crear PersonClientData para el Cliente 1
    if (clientPerson1.functionalRoles.length > 0) {
      await prisma.personClientData.upsert({
        where: {
          functionalRoleId: clientPerson1.functionalRoles[0].id
        },
        update: {
          address: 'Calle Falsa 123',
          city: 'Madrid',
          countryIsoCode: 'ES',
          postalCode: '28001',
          marketingConsent: true,
          isActive: true
        },
        create: {
          functionalRoleId: clientPerson1.functionalRoles[0].id,
          address: 'Calle Falsa 123',
          city: 'Madrid',
          countryIsoCode: 'ES',
          postalCode: '28001',
          marketingConsent: true,
          isActive: true
        }
      });
    }

    // Cliente 2: Youssef Bennani (Casablanca)
    const clientPerson2 = await prisma.person.upsert({
      where: { id: 'cuid-client-2' },
      update: {},
      create: {
        id: 'cuid-client-2',
        firstName: 'Youssef',
        lastName: 'Bennani',
        email: 'cliente.marruecos@example.com',
        phone: '+212600111222',
        birthDate: new Date('1990-08-20'),
        gender: 'MALE',
        systemId: system.id,
        functionalRoles: {
          create: {
            roleType: 'CLIENT',
            systemId: system.id
          }
        }
      },
      include: {
        functionalRoles: true
      }
    });

    // Crear PersonClientData para el Cliente 2
    if (clientPerson2.functionalRoles.length > 0) {
      await prisma.personClientData.upsert({
        where: {
          functionalRoleId: clientPerson2.functionalRoles[0].id
        },
        update: {
          address: 'Bd Anfa 5',
          city: 'Casablanca',
          countryIsoCode: 'MA',
          postalCode: '20000',
          marketingConsent: false,
          isActive: true
        },
        create: {
          functionalRoleId: clientPerson2.functionalRoles[0].id,
          address: 'Bd Anfa 5',
          city: 'Casablanca',
          countryIsoCode: 'MA',
          postalCode: '20000',
          marketingConsent: false,
          isActive: true
        }
      });
    }

    // Cliente 3: Cliente sin email (prueba)
    const clientPerson3 = await prisma.person.upsert({
      where: { id: 'cuid-client-3' },
      update: {},
      create: {
        id: 'cuid-client-3',
        firstName: 'Cliente Test',
        lastName: 'Sin Email',
        phone: '666777888',
        birthDate: new Date('1988-12-01'),
        gender: 'OTHER',
        systemId: system.id,
        functionalRoles: {
          create: {
            roleType: 'CLIENT',
            systemId: system.id
          }
        }
      },
      include: {
        functionalRoles: true
      }
    });

    // Crear PersonClientData para el Cliente 3
    if (clientPerson3.functionalRoles.length > 0) {
      await prisma.personClientData.upsert({
        where: {
          functionalRoleId: clientPerson3.functionalRoles[0].id
        },
        update: {
          address: 'Plaza Mayor 1',
          city: 'Sevilla',
          countryIsoCode: 'ES',
          postalCode: '41001',
          isActive: true
        },
        create: {
          functionalRoleId: clientPerson3.functionalRoles[0].id,
          address: 'Plaza Mayor 1',
          city: 'Sevilla',
          countryIsoCode: 'ES',
          postalCode: '41001',
          isActive: true
        }
      });
    }
    
    console.log('✅ Client Persons creados:', {
      client1: `${clientPerson1.firstName} ${clientPerson1.lastName}`,
      client2: `${clientPerson2.firstName} ${clientPerson2.lastName}`,
      client3: `${clientPerson3.firstName} ${clientPerson3.lastName}`
    });
    
    // --- Crear instancias de Bonos y Paquetes para los nuevos clientes ---
    console.log('Creating Bono/Package Instances for client persons...');
    
    // TODO: Descomentar cuando se complete la migración y BonoInstance/PackageInstance
    // puedan usar personId sin requerir clientId
    /*
    if (bonoDefinitions.length > 0 && clientPerson1) {
      // Crear instancia de bono para el primer cliente
      await prisma.bonoInstance.create({
        data: {
          bonoDefinitionId: bonoDefinitions[0].id,
          personId: clientPerson1.id,
          remainingQuantity: 5,
          purchaseDate: new Date(),
          expiryDate: new Date(new Date().setDate(new Date().getDate() + 90)),
          systemId: system.id
        }
      });
      console.log(`✅ Bono instance created for ${clientPerson1.firstName}`);
    }
    
    // Buscar paquetes
    const packageDefinitions = await prisma.packageDefinition.findMany({
      where: { systemId: system.id },
      take: 1
    });
    
    if (packageDefinitions.length > 0 && clientPerson2) {
      // Crear instancia de paquete para el segundo cliente
      await prisma.packageInstance.create({
        data: {
          packageDefinitionId: packageDefinitions[0].id,
          personId: clientPerson2.id,
          remainingServiceIds: ['service1', 'service2'], // IDs de servicios incluidos
          purchaseDate: new Date(),
          expiryDate: new Date(new Date().setDate(new Date().getDate() + 180)),
          systemId: system.id
        }
      });
      console.log(`✅ Package instance created for ${clientPerson2.firstName}`);
    }
    */
    
    console.log('✅ Bono/Package instance creation skipped (pending migration completion)');
    
    console.log('✅ Persons, Opportunities, Clients and their instances seeded successfully!');
  } catch (error) {
    console.error("Error during Person and Opportunity seeding:", error);
    // No lanzar error para permitir que el resto del seed continúe
  }
  
  console.log('Person and Opportunity seeding completed.');
}
