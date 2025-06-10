import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugServiceMappings() {
  try {
    // Buscar entidad legal con clínicas marroquíes
    const legalEntities = await prisma.legalEntity.findMany({
      include: {
        clinics: true,
        country: true
      }
    });

    console.log('\n=== Entidades Legales Disponibles ===\n');
    for (const le of legalEntities) {
      console.log(`- ${le.name} (${le.country?.isoCode || 'Sin país'}) - ${le.clinics.length} clínicas`);
    }

    // Buscar específicamente la entidad con código MA (Marruecos)
    const legalEntity = legalEntities.find(le => le.country?.isoCode === 'MA' && le.clinics.length > 0);
    
    if (!legalEntity) {
      console.log('\nNo se encontró ninguna entidad legal marroquí con clínicas');
      // Buscar cualquier entidad con múltiples clínicas para depurar
      const multiClinicEntity = legalEntities.find(le => le.clinics.length > 1);
      if (multiClinicEntity) {
        console.log(`\nUsando entidad con múltiples clínicas para depuración: ${multiClinicEntity.name}`);
        await debugEntity(multiClinicEntity);
      }
      return;
    }

    await debugEntity(legalEntity);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function debugEntity(legalEntity: any) {
  console.log(`\n=== Depuración de Mapeos de Servicios para Entidad Legal: ${legalEntity.name} ===\n`);

  // Obtener todas las clínicas de esta entidad
  const clinics = legalEntity.clinics;

  console.log(`Clínicas encontradas: ${clinics.length}`);
  clinics.forEach(clinic => {
    console.log(`- ${clinic.name} (ID: ${clinic.id})`);
  });

  // Obtener todos los servicios del sistema
  const services = await prisma.service.findMany({
    where: { systemId: clinics[0]?.systemId },
    include: { category: true }
  });

  console.log(`\nServicios encontrados: ${services.length}`);

  // Obtener todos los mapeos de servicios
  const mappings = await prisma.serviceAccountMapping.findMany({
    where: { legalEntityId: legalEntity.id },
    include: {
      service: { include: { category: true } },
      account: true,
      clinic: true
    }
  });

  console.log(`\nMapeos encontrados: ${mappings.length}`);

  // Analizar mapeos por servicio
  const mappingsByService = mappings.reduce((acc, mapping) => {
    const serviceId = mapping.serviceId;
    if (!acc[serviceId]) {
      acc[serviceId] = {
        serviceName: mapping.service.name,
        categoryName: mapping.service.category?.name || 'Sin categoría',
        mappings: []
      };
    }
    acc[serviceId].mappings.push({
      clinicName: mapping.clinic?.name || 'Global',
      clinicId: mapping.clinicId,
      accountNumber: mapping.account.accountNumber,
      accountName: mapping.account.name
    });
    return acc;
  }, {} as Record<string, any>);

  console.log('\n=== Análisis de Mapeos por Servicio ===\n');
  
  Object.entries(mappingsByService).forEach(([serviceId, data]: [string, any]) => {
    console.log(`\nServicio: ${data.serviceName} (${data.categoryName})`);
    console.log('Mapeos:');
    data.mappings.forEach((mapping: any) => {
      console.log(`  - Clínica: ${mapping.clinicName} (${mapping.clinicId || 'null'})`);
      console.log(`    Cuenta: ${mapping.accountNumber} - ${mapping.accountName}`);
    });
    
    // Verificar si hay mapeos duplicados o faltantes
    if (data.mappings.length === 1 && clinics.length > 1) {
      console.log('  PROBLEMA: Solo hay 1 mapeo pero hay múltiples clínicas');
    }
    
    // Verificar si todos los mapeos tienen la misma cuenta
    const uniqueAccounts = new Set(data.mappings.map((m: any) => m.accountNumber));
    if (uniqueAccounts.size === 1 && data.mappings.length > 1) {
      console.log('  PROBLEMA: Todos los mapeos usan la misma cuenta');
    }
  });

  // Verificar servicios sin mapear
  const mappedServiceIds = new Set(Object.keys(mappingsByService));
  const unmappedServices = services.filter(s => !mappedServiceIds.has(s.id));
  
  if (unmappedServices.length > 0) {
    console.log('\n=== Servicios Sin Mapear ===\n');
    unmappedServices.forEach(service => {
      console.log(`- ${service.name} (${service.category?.name || 'Sin categoría'})`);
    });
  }

  // Verificar subcuentas creadas
  console.log('\n=== Subcuentas de Servicios ===\n');
  const serviceSubaccounts = await prisma.chartOfAccountEntry.findMany({
    where: {
      legalEntityId: legalEntity.id,
      accountNumber: {
        contains: '.SER.'
      }
    },
    orderBy: { accountNumber: 'asc' }
  });

  serviceSubaccounts.forEach(account => {
    console.log(`${account.accountNumber} - ${account.name}`);
  });
}

debugServiceMappings();
