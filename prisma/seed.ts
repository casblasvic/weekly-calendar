// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
// Extraer PrismaClient y tipos de error necesarios
const { PrismaClient, Prisma } = pkg; 
// Importar explícitamente el tipo de error si es necesario (depende de la versión de Prisma)
// import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Puede no ser necesario importar explícitamente

// Ya no necesitamos importar Permission aquí
// import { Permission } from '@prisma/client'; // Comentar o eliminar si estaba duplicada

import bcrypt from 'bcrypt';
import path from 'path'; // Importar path
import { fileURLToPath } from 'url'; // Importar fileURLToPath

// --- Calcular ruta absoluta a mockData.ts ---
const __filename = fileURLToPath(import.meta.url); // Ruta al archivo actual (seed.ts)
const __dirname = path.dirname(__filename); // Directorio actual (prisma/)
// Resolvemos subiendo un nivel desde prisma/ y añadiendo mockData.ts
// Asegurarse de que el archivo real se llama mockData.ts
const mockDataPath = path.resolve(__dirname, '../mockData.ts');
// --- Fin cálculo ---

// Quitar la importación estática anterior
// import { initialMockData } from '../mockData'; 

const prisma = new PrismaClient();

async function main() {
  // --- Importación dinámica al inicio de main --- 
  console.log(`Importing mock data from: ${mockDataPath}`);
  // Añadir 'file://' para compatibilidad en algunos sistemas
  const mockDataModule = await import('file://' + mockDataPath);
  const initialMockData = mockDataModule.initialMockData; 
  if (!initialMockData) {
    console.error("Error: initialMockData not found in the imported module.");
    process.exit(1);
  }
  // --- Fin importación ---
  
  console.log(`Start seeding ...`);

  // --- 1. Limpieza Opcional (Descomentar con cuidado) ---
  // console.log('Deleting existing data...');
  // await prisma.userRole.deleteMany({});
  // await prisma.rolePermission.deleteMany({});
  // await prisma.permission.deleteMany({}); // Permissions might be static?
  // await prisma.role.deleteMany({});
  // // ... Añadir deleteMany para TODOS los modelos en orden inverso de dependencia ...
  // // Asegúrate de incluir TODOS los modelos que tengan relaciones
  // await prisma.bonoInstance.deleteMany({});
  // await prisma.packageItem.deleteMany({});
  // await prisma.packageDefinition.deleteMany({});
  // await prisma.bonoDefinition.deleteMany({});
  // // ... más deletes ...
  // await prisma.user.deleteMany({});
  // await prisma.clinic.deleteMany({});
  // await prisma.system.deleteMany({});
  // console.log('Existing data deleted.');

  // --- 2. Crear Entidades Base (System, Permissions, Roles) ---
  console.log('Creating base entities...');

  // Crear un System de ejemplo si no existe
  let system = await prisma.system.findFirst({
    where: { name: 'Sistema Ejemplo Avatar' },
  });
  if (!system) {
    system = await prisma.system.create({
      data: {
        name: 'Sistema Ejemplo Avatar',
        isActive: true,
      },
    });
    console.log(`Created system with id: ${system.id}`);
  } else {
    console.log(`Using existing system with id: ${system.id}`);
  }

  // --- 2b. Crear Permisos base ---
  console.log('Creating base permissions...');
  const permissionsToCreate = [
    // Muestra de Agenda
    { action: 'ver', module: 'agenda_diaria' },
    { action: 'ver', module: 'agenda_semanal' },
    { action: 'crear', module: 'cita' },
    { action: 'editar', module: 'cita' },
    { action: 'eliminar', module: 'cita' },
    { action: 'marcar_asistida', module: 'cita' },
    // Muestra de Clientes
    { action: 'buscar', module: 'clientes' },
    { action: 'crear', module: 'clientes' },
    { action: 'editar', module: 'clientes' },
    { action: 'ver_datos_contacto', module: 'clientes' },
    { action: 'eliminar', module: 'clientes' },
    // Muestra de Configuración
    { action: 'gestionar', module: 'clinicas' },
    { action: 'gestionar', module: 'usuarios' },
    { action: 'gestionar', module: 'roles_permisos' },
    { action: 'gestionar', module: 'catalogo_servicios' },
    { action: 'gestionar', module: 'catalogo_productos' },
    // Añade aquí MÁS permisos basados en tu lista completa
  ];

  try {
      await prisma.permission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true, // No falla si ya existen
      });
      console.log(`${permissionsToCreate.length} base permissions ensured.`);
  } catch (error) {
      console.error("Error creating permissions:", error);
      // Considerar si continuar o abortar si los permisos son esenciales
      await prisma.$disconnect();
      process.exit(1);
  }


  // Obtener todos los permisos creados/existentes para asignarlos
  const allPermissions = await prisma.permission.findMany();
  const allPermissionIds = allPermissions.map(p => ({ permissionId: p.id }));

  // --- 2c. Crear Roles base y asignar permisos ---
  console.log('Creating base roles and assigning permissions...');

  // Rol Administrador (con todos los permisos)
  const adminRole = await prisma.role.upsert({
    where: { name_systemId: { name: 'Administrador', systemId: system.id } },
    update: { // Asegura que tenga todos los permisos actuales al re-ejecutar
        permissions: {
            deleteMany: {}, // Borra asignaciones existentes
            create: allPermissionIds, // Crea las nuevas
        }
    },
    create: {
      name: 'Administrador',
      description: 'Acceso completo a todas las funcionalidades.',
      systemId: system.id,
      permissions: {
        create: allPermissionIds, // Asigna todos los permisos
      },
    },
    include: { permissions: true }, // Incluir para verificar
  });
  console.log(`Ensured role "${adminRole.name}" with ${adminRole.permissions.length} permissions.`);

  // Rol Personal Clínica (con permisos limitados de ejemplo)
  const clinicStaffPermissions = allPermissions.filter(p =>
      p.module.includes('agenda') || p.module.includes('cita') ||
      (p.module === 'clientes' && (p.action === 'buscar' || p.action === 'ver_datos_contacto' || p.action === 'crear'))
  ).map(p => ({ permissionId: p.id }));

  const staffRole = await prisma.role.upsert({
      where: { name_systemId: { name: 'Personal Clinica', systemId: system.id } },
      update: { // Actualizar permisos si el rol ya existe
          permissions: {
              deleteMany: {},
              create: clinicStaffPermissions,
          }
      },
      create: {
          name: 'Personal Clinica',
          description: 'Acceso a agenda, citas y gestión básica de clientes.',
          systemId: system.id,
          permissions: {
              create: clinicStaffPermissions,
          },
      },
      include: { permissions: true },
  });
  console.log(`Ensured role "${staffRole.name}" with ${staffRole.permissions.length} permissions.`);

  // --- 3. Hashear Contraseñas --- 
  // (Hacerlo aquí para tener el hash antes de crear usuarios)
  const saltRounds = 10; // Coste de hashing
  const defaultPassword = 'password123'; // Contraseña por defecto para usuarios mock
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
  console.log(`Hashed default password.`);

  // --- 4. Mapear y Crear Datos Mock --- 
  console.log('Mapping and creating mock data...');

  // --- 4a. Clínicas --- 
  console.log('Creating clinics...');
  const clinicsData = initialMockData.clinicas;
  const createdClinicsMap = new Map<string, any>(); // Para mapear ID mock a ID real

  for (const clinicData of clinicsData) {
     try {
         const clinic = await prisma.clinic.upsert({
           where: { Clinic_name_systemId_key: { name: clinicData.name, systemId: system.id } },
           update: {
             address: clinicData.direccion,
             city: clinicData.city,
             // postalCode: clinicData.cp, // No existe directamente
             // province: clinicData.provincia, // No existe directamente
             // countryCode: clinicData.pais || 'ES', // No existe directamente
             // timezone: clinicData.config?.timezone || 'Europe/Madrid', // Podría estar en config
             // currency: clinicData.config?.currency || 'EUR', // TAMPOCO existe en config
             phone: clinicData.telefono,
             email: clinicData.email,
             isActive: clinicData.isActive !== false,
           },
           create: {
             name: clinicData.name,
             address: clinicData.direccion,
             city: clinicData.city,
             // postalCode: clinicData.cp,
             // province: clinicData.provincia,
             // countryCode: clinicData.pais || 'ES',
             // timezone: clinicData.config?.timezone || 'Europe/Madrid',
             currency: 'EUR', // Asignar moneda EUR por defecto si no viene
             phone: clinicData.telefono,
             email: clinicData.email,
             isActive: clinicData.isActive !== false,
             systemId: system.id,
           },
         });
         createdClinicsMap.set(clinicData.id, clinic); // Guardar mapeo ID mock -> objeto real
         console.log(`Upserted clinic: ${clinic.name} (ID: ${clinic.id})`);
     } catch (error) {
         console.error(`Error upserting clinic ${clinicData.name}:`, error); // Usar clinicData.name para log
     }
  }
  console.log(`Processed ${clinicsData.length} clinics.`);

  // --- NUEVA SECCIÓN: Crear Cabinas --- 
  console.log('Creating cabins...');
  for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
    const clinicData = clinicsData.find(c => c.id === mockClinicId);
    if (clinicData && clinicData.config && clinicData.config.cabins && Array.isArray(clinicData.config.cabins)) {
        for (const cabinData of clinicData.config.cabins) {
            if (!cabinData.name) {
                console.warn(`Skipping cabin without name for clinic ${realClinic.name}:`, cabinData);
                continue;
            }
            try {
                await prisma.cabin.upsert({
                    // Usamos nombre y clinicId como clave única
                    where: { name_clinicId: { name: cabinData.name, clinicId: realClinic.id } }, 
                    update: { // Si ya existe, actualizamos por si cambió algo
                        code: cabinData.code,
                        color: cabinData.color,
                        order: cabinData.order,
                        isActive: cabinData.isActive !== false,
                        systemId: realClinic.systemId, // Asegurar systemId
                    },
                    create: {
                        name: cabinData.name,
                        code: cabinData.code,
                        color: cabinData.color,
                        order: cabinData.order,
                        isActive: cabinData.isActive !== false,
                        clinicId: realClinic.id,
                        systemId: realClinic.systemId,
                    },
                });
                console.log(`Upserted cabin "${cabinData.name}" for clinic "${realClinic.name}"`);
            } catch (error) {
                // Manejar error si la clave única de 'code' también falla (raro si el nombre es único)
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                    // Podría ser por el @@unique([code, clinicId]), comprobar si el código existe con otro nombre
                    console.warn(`Cabin upsert failed for "${cabinData.name}" in clinic "${realClinic.name}". Potential duplicate code "${cabinData.code}". Error:`, error.message);
                } else {
                    console.error(`Error upserting cabin "${cabinData.name}" for clinic ${realClinic.name}:`, error);
                }
            }
        }
    } else {
        console.warn(`No cabin data found for clinic ${realClinic.name}`);
    }
  }
  console.log('Finished creating cabins.');
  // --- FIN NUEVA SECCIÓN ---

  // --- NUEVA SECCIÓN: 4b. Horarios de Clínica (ScheduleTemplates y ClinicSchedules) ---
  console.log('Creating clinic schedules...');
  const dayOfWeekMap: { [key: string]: pkg.DayOfWeek } = { // Usar pkg.DayOfWeek
    monday: pkg.DayOfWeek.MONDAY,
    tuesday: pkg.DayOfWeek.TUESDAY,
    wednesday: pkg.DayOfWeek.WEDNESDAY,
    thursday: pkg.DayOfWeek.THURSDAY,
    friday: pkg.DayOfWeek.FRIDAY,
    saturday: pkg.DayOfWeek.SATURDAY,
    sunday: pkg.DayOfWeek.SUNDAY,
  };
  const createdTemplatesMap = new Map<string, any>(); // Cache para plantillas ya creadas

  for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
    const clinicData = clinicsData.find(c => c.id === mockClinicId);
    if (!clinicData || !clinicData.config || !clinicData.config.schedule) {
      console.warn(`Skipping schedule creation for clinic ${realClinic.name}: No schedule config found.`);
      continue;
    }

    const scheduleConfig = clinicData.config.schedule;
    let templateName = `Horario ${realClinic.name}`; // Nombre base
    const templateBlocksData: any[] = [];
    let nameParts: string[] = [];

    // Construir nombre descriptivo y datos de bloques
    for (const dayKey in scheduleConfig) {
        const dayConfig = scheduleConfig[dayKey as keyof typeof scheduleConfig];
        const prismaDay = dayOfWeekMap[dayKey.toLowerCase()];
        if (prismaDay && dayConfig.isOpen && dayConfig.ranges && dayConfig.ranges.length > 0) {
            const rangesStr = dayConfig.ranges.map((r: { start: string; end: string; }) => `${r.start}-${r.end}`).join(',');
            nameParts.push(`${dayKey.substring(0,3)}:${rangesStr}`);
            dayConfig.ranges.forEach((range: { start: string; end: string; }) => {
                templateBlocksData.push({
                    dayOfWeek: prismaDay,
                    startTime: range.start,
                    endTime: range.end,
                    isWorking: true,
                });
            });
        } else if (prismaDay && !dayConfig.isOpen) {
             nameParts.push(`${dayKey.substring(0,3)}:Cerrado`);
             // Opcionalmente, crear bloque isWorking=false si es necesario representar días cerrados explícitamente
             // templateBlocksData.push({ dayOfWeek: prismaDay, startTime: '00:00', endTime: '00:00', isWorking: false });
        }
    }
    if (nameParts.length > 0) {
        templateName = nameParts.join(' '); // Usar la descripción detallada como nombre
    }
    
    // Usar caché o crear plantilla
    let scheduleTemplate = createdTemplatesMap.get(templateName);

    if (!scheduleTemplate) {
        try {
            scheduleTemplate = await prisma.scheduleTemplate.upsert({
                where: { name_systemId: { name: templateName, systemId: system.id } },
                update: {}, // No actualizamos nada si ya existe
                create: {
                    name: templateName,
                    description: `Horario generado automáticamente para ${realClinic.name}`,
                    systemId: system.id,
                    blocks: {
                        create: templateBlocksData, // Crear bloques asociados
                    },
                },
                include: { blocks: true } // Incluir bloques para el log
            });
            createdTemplatesMap.set(templateName, scheduleTemplate); // Añadir a caché
            console.log(`Upserted ScheduleTemplate: ${scheduleTemplate.name} with ${scheduleTemplate.blocks.length} blocks.`);
        } catch (error) {
            console.error(`Error upserting ScheduleTemplate ${templateName}:`, error);
            continue; // Saltar a la siguiente clínica si falla la plantilla
        }
    } else {
        console.log(`Using cached ScheduleTemplate: ${templateName}`);
    }

    // Crear la asignación ClinicSchedule usando findFirst y create
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Establecer a medianoche

      // Buscar una asignación activa existente para esta clínica
      const existingAssignment = await prisma.clinicSchedule.findFirst({
        where: {
          clinicId: realClinic.id,
          endDate: null, // Buscar la que está activa actualmente
        },
      });

      if (existingAssignment) {
          // Si ya existe y usa la misma plantilla, no hacemos nada o actualizamos startDate
          if (existingAssignment.templateId === scheduleTemplate.id) {
              console.log(`ClinicSchedule assignment already exists and matches template for Clinic "${realClinic.name}". Skipping creation.`);
              // Opcional: actualizar startDate si se quiere reflejar la última ejecución
              // await prisma.clinicSchedule.update({
              //   where: { id: existingAssignment.id },
              //   data: { startDate: today },
              // });
          } else {
              // Si existe pero usa una plantilla DIFERENTE, podríamos marcar la antigua como finalizada
              // y crear la nueva. Por ahora, solo avisamos.
              console.warn(`Clinic "${realClinic.name}" already has an active schedule with a DIFFERENT template. Manual review needed or adjust seed logic.`);
          }
      } else {
          // Si no existe ninguna asignación activa, la creamos
          await prisma.clinicSchedule.create({
              data: {
                  clinicId: realClinic.id,
                  templateId: scheduleTemplate.id,
                  startDate: today, // Aplicar desde hoy
                  endDate: null, // Sin fecha de fin (activa)
                  systemId: system.id,
              },
          });
          console.log(`CREATED ClinicSchedule assignment for Clinic "${realClinic.name}" with Template "${scheduleTemplate.name}"`);
      }
    } catch (error) {
      // Captura errores generales durante la búsqueda o creación
      console.error(`Error assigning schedule to clinic ${realClinic.name}:`, error);
    }
  }
  console.log('Finished processing clinic schedules.');
  // --- FIN NUEVA SECCIÓN ---

  // --- 4c. Categorías/Familias ---
  console.log('Creating categories (families)...');
  // Usar el array renombrado 'familias'
  const familiesData = initialMockData.familias; 
  const createdCategoriesMap = new Map<string, any>();

  if (familiesData && Array.isArray(familiesData)) {
    for (const familyData of familiesData) {
      const categoryName = familyData.nombre;
      // Usar una descripción por defecto si no existe
      const categoryDescription = familyData.descripcion || null; 

      if (!categoryName) {
        console.warn("Skipping family data without a name:", familyData);
        continue;
      }

      try {
        const category = await prisma.category.upsert({
          where: { name_systemId: { name: categoryName, systemId: system.id } },
          update: {
            description: categoryDescription,
          },
          create: {
            name: categoryName,
            description: categoryDescription,
            systemId: system.id,
          },
        });
        if (familyData.id) {
            createdCategoriesMap.set(familyData.id, category);
        }
        console.log(`Upserted category: ${category.name} (ID: ${category.id})`);
      } catch (error) {
        console.error(`Error upserting category ${categoryName}:`, error);
      }
    }
    console.log(`Processed ${familiesData.length} categories.`);
  } else {
    console.log('No family data (initialMockData.familias) found to seed.');
  }

  // --- NUEVA SECCIÓN: 4d. Equipamiento ---
  console.log('Creating equipment...');
  const equipmentData = initialMockData.equipos;
  const createdEquipmentMap = new Map<string, any>();

  if (equipmentData && Array.isArray(equipmentData)) {
    for (const eqData of equipmentData) {
      const equipmentName = eqData.name;
      if (!equipmentName) {
        console.warn("Skipping equipment data without a name:", eqData);
        continue;
      }

      // Mapear clinicId mock a real
      // Usar el primer ID de clinicIds si eqData.clinicId no existe
      const mockClinicId = eqData.clinicId || (eqData.clinicIds && eqData.clinicIds[0]); 
      const realClinic = mockClinicId ? createdClinicsMap.get(mockClinicId) : null;
      const realClinicId = realClinic ? realClinic.id : null;
      
      // Validar fechas
      const purchaseDateObj = eqData.purchaseDate ? new Date(eqData.purchaseDate) : null;
      const warrantyDateObj = eqData.warrantyDate ? new Date(eqData.warrantyDate) : null;

      try {
        const equipment = await prisma.equipment.upsert({
          // Usar la clave única correcta
          where: { name_systemId: { name: equipmentName, systemId: system.id } }, 
          update: {
            description: eqData.description,
            serialNumber: eqData.serialNumber, 
            modelNumber: eqData.code, 
            purchaseDate: purchaseDateObj,
            warrantyEndDate: warrantyDateObj,
            location: null, 
            notes: eqData.supplier, 
            isActive: eqData.isActive !== false,
            clinicId: realClinicId,
          },
          create: {
            name: equipmentName,
            description: eqData.description,
            serialNumber: eqData.serialNumber,
            modelNumber: eqData.code, 
            purchaseDate: purchaseDateObj,
            warrantyEndDate: warrantyDateObj,
            location: null, 
            notes: eqData.supplier, 
            isActive: eqData.isActive !== false,
            systemId: system.id,
            clinicId: realClinicId,
          },
        });
        if (eqData.id) {
            createdEquipmentMap.set(eqData.id, equipment);
        }
        console.log(`Upserted equipment: ${equipment.name} (ID: ${equipment.id})`);
      } catch (error) {
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
             console.warn(`Equipment with name "${equipmentName}" likely already exists for this system. Skipping.`);
         } else {
             console.error(`Error upserting equipment ${equipmentName}:`, error);
         }
      }
    }
    console.log(`Processed ${equipmentData.length} equipment items.`);
  } else {
    console.log('No equipment data (initialMockData.equipos) found to seed.');
  }

  // --- NUEVA SECCIÓN: 4e. Tipos de IVA ---
  console.log('Creating VAT types...');
  const vatTypesData = initialMockData.tiposIVA; 
  const createdVatTypesMap = new Map<string, any>();

  if (vatTypesData && Array.isArray(vatTypesData)) {
    for (const vatData of vatTypesData) {
      const vatName = vatData.descripcion;
      const vatRate = vatData.porcentaje;

      if (!vatName || vatRate === undefined) {
        console.warn("Skipping VAT type data without name or rate:", vatData);
        continue;
      }

      try {
        const vatType = await prisma.vATType.upsert({
          where: { name_systemId: { name: vatName, systemId: system.id } },
          update: {
            rate: vatRate,
          },
          create: {
            name: vatName,
            rate: vatRate,
            isDefault: false,
            systemId: system.id,
          },
        });
        if (vatData.id) {
          createdVatTypesMap.set(vatData.id, vatType);
        }
        console.log(`Upserted VAT Type: ${vatType.name} (ID: ${vatType.id})`);
      } catch (error) {
        console.error(`Error upserting VAT Type ${vatName}:`, error);
      }
    }
    console.log(`Processed ${vatTypesData.length} VAT types.`);
  } else {
    console.log('No VAT type data (initialMockData.tiposIVA) found to seed.');
  }
  // --- FIN NUEVA SECCIÓN ---

  // --- Re-numerar secciones siguientes: Usuarios ahora es 4d, etc. ---
  // --- 4d. Usuarios --- 
  console.log('Creating users...');
  const usersData = initialMockData.usuarios;
  const createdUsersMap = new Map<string, any>();

  for (const userData of usersData) {
    const nameParts = userData.nombre.split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'Ejemplo';

    try {
        const user = await prisma.user.upsert({
            where: { email: userData.email }, // Email es único global
            update: {
                firstName: firstName,
                lastName: lastName,
                isActive: userData.isActive !== false, // CORREGIDO: Usar isActive
                systemId: system.id,
            },
            create: {
                email: userData.email,
                firstName: firstName,
                lastName: lastName,
                passwordHash: hashedPassword,
                profileImageUrl: null, // CORREGIDO: foto no existe, poner null
                isActive: userData.isActive !== false, // CORREGIDO: Usar isActive
                systemId: system.id,
            },
        });
        createdUsersMap.set(userData.id, user);
        console.log(`Upserted user: ${user.email} (ID: ${user.id})`);

        // Asignar rol "Personal Clinica" por defecto (ajustar lógica si es necesario)
        try {
            await prisma.userRole.upsert({
                where: { userId_roleId: { userId: user.id, roleId: staffRole.id } },
                update: {},
                create: { userId: user.id, roleId: staffRole.id },
            });
            console.log(`Assigned role "${staffRole.name}" to user ${user.email}`);
        } catch (roleError) {
            console.error(`Error assigning role to user ${user.email}:`, roleError);
        }

        // NUEVO: Asignar clínicas
        if (userData.clinicasIds && Array.isArray(userData.clinicasIds)) {
          const assignmentsToCreate = userData.clinicasIds
            .map((mockClinicId: string) => createdClinicsMap.get(mockClinicId)) // Obtener objeto clinic real
            .filter((clinic: any) => clinic) // Filtrar si alguna clínica mock no se encontró
            .map((clinic: any) => ({ // Crear objeto para la tabla de unión
                userId: user.id,
                clinicId: clinic.id,
            }));

          if (assignmentsToCreate.length > 0) {
            try {
                await prisma.userClinicAssignment.createMany({
                    data: assignmentsToCreate,
                    skipDuplicates: true, // Evitar errores si la asignación ya existe
                });
                console.log(`Assigned user ${user.email} to ${assignmentsToCreate.length} clinics.`);
            } catch (error) {
                console.error(`Error assigning clinics to user ${user.email}:`, error);
            }
          }
        }
        // FIN Asignar clínicas

        // TODO: Asignar Skills si existen en mockData.habilidadesProfesionales
        // TODO: Crear Horarios (UserSchedule) si existen en mockData.horarios

    } catch (error) {
        console.error(`Error upserting user ${userData.email}:`, error);
    }
  }
  console.log(`Processed ${usersData.length} users.`);

  // --- 4g. Servicios ---
  console.log('Creating services...');
  const servicesData = initialMockData.servicios;
  
  if (servicesData && Array.isArray(servicesData)) {
      for (const serviceData of servicesData) {
         const realCategoryId = serviceData.familiaId ? createdCategoriesMap.get(serviceData.familiaId)?.id : null;
         // Usar el ID del VATType mapeado
         const realVatTypeId = serviceData.tipoIvaId ? createdVatTypesMap.get(serviceData.tipoIvaId)?.id : null;

         try {
             const service = await prisma.service.upsert({
                 where: { name_systemId: { name: serviceData.nombre, systemId: system.id } },
                 update: {
                     code: serviceData.codigo,
                     description: serviceData.descripcion,
                     durationMinutes: serviceData.duracion,
                     price: typeof serviceData.precio === 'string' ? parseFloat(serviceData.precio) : serviceData.precio,
                     isActive: serviceData.activo !== false,
                     categoryId: realCategoryId, 
                     vatTypeId: realVatTypeId, // Usar 'vatTypeId'
                 },
                 create: {
                     code: serviceData.codigo, 
                     name: serviceData.nombre,
                     description: serviceData.descripcion,
                     durationMinutes: serviceData.duracion, 
                     price: typeof serviceData.precio === 'string' ? parseFloat(serviceData.precio) : serviceData.precio,
                     isActive: serviceData.activo !== false,
                     systemId: system.id,
                     categoryId: realCategoryId,
                     vatTypeId: realVatTypeId, // Usar 'vatTypeId'
                 },
             });
             console.log(`Upserted service: ${service.name} (ID: ${service.id})`);
         } catch (error) {
             if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                console.warn(`Service with name "${serviceData.nombre}" likely already exists for this system. Skipping.`);
             } else {
                console.error(`Error upserting service ${serviceData.nombre}:`, error);
             }
         }
      }
      console.log(`Processed ${servicesData.length} services.`);
  } else {
      console.log('No service data (initialMockData.servicios) found to seed.');
  }

  // TODO: Crear Productos, Clientes, etc.
  // Usar los Maps (createdClinicsMap, createdUsersMap, createdServicesMap)
  // para obtener los IDs reales y establecer las relaciones
  // Ejemplo para Clientes:
  // console.log('Creating clients...');
  // const clientsData = initialMockData.clientes;
  // for (const clientData of clientsData) {
  //    const originClinicId = createdClinicsMap.get(clientData.clinicaOrigenId)?.id; // Obtener ID real
  //    try {
  //       await prisma.client.create({ data: { ...mapClientData(clientData), systemId: system.id, originClinicId: originClinicId } });
  //    } catch (error) { ... }
  // }

  console.log(`Seeding finished.`);
}

// TODO: Implementar/Ajustar funciones de mapeo si es necesario
// function mapClientData(mockData: any) {
//   return {
//     firstName: mockData.nombre,
//     lastName: mockData.apellidos,
//     email: mockData.email, // Recordar que es opcional/no único
//     phone: mockData.telefono,
//     // ... mapear otros campos: birthDate, gender, address, consents...
//     isActive: mockData.activo !== false,
//   };
// }

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 