// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg; // Obtener constructor y namespace Prisma

// --- Importación de Tipos Específicos ---
import type { ScheduleTemplate, DayOfWeek } from '@prisma/client'; // Importar SOLO como tipos
// --- FIN Importación de Tipos ---

// --- IMPORTACIÓN EXPLÍCITA (Eliminada) ---
// import {
//   PrismaClient,
//   Prisma,
//   ScheduleTemplate,
//   DayOfWeek
// } from '@prisma/client';
// --- FIN IMPORTACIÓN EXPLÍCITA ---

// Importar explícitamente el tipo de error si es necesario (depende de la versión de Prisma)
// import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Puede no ser necesario importar explícitamente

// Ya no necesitamos importar Permission aquí
// import { Permission } from '@prisma/client'; // Comentar o eliminar si estaba duplicada

import bcrypt from 'bcrypt';
import path from 'path'; // Importar path
import { fileURLToPath } from 'url'; // Importar fileURLToPath

// Eliminar asignación a constante DayOfWeek, usar directamente el importado
// const DayOfWeek = pkg.DayOfWeek;

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
  console.log(`[Diagnostic Seed] Start seeding ...`);

  // --- DIAGNOSTIC STEP 1: Log available models ---
  try {
    console.log("[Diagnostic Seed] Attempting to check prisma instance keys:", Object.keys(prisma));
  } catch (e) {
    console.error("[Diagnostic Seed] Error logging prisma keys:", e);
  }

  // --- REMOVED OBSOLETE DIAGNOSTIC STEP 2 FOR clinicSchedule ---
  // try {
  //   console.log("[Diagnostic Seed] Attempting access via 'as any'...");
  //   // Usar 'as any' para saltar el error de compilación de TypeScript AQUÍ
  //   const prismaAny = prisma as any;
  //   const testAccess = prismaAny.clinicSchedule;
  //
  //   // Comprobar si la propiedad existe en runtime
  //   if (typeof testAccess !== 'undefined') {
  //     console.log("[Diagnostic Seed] SUCCESS: Property prisma.clinicSchedule exists at runtime.");
  //     // Ahora intentar una operación real
  //     try {
  //       // Usar 'as any' también aquí para saltar el error de TS en esta línea específica
  //       const count = await (prisma as any).clinicSchedule.count();
  //       console.log(`[Diagnostic Seed] SUCCESS: Found ${count} records in ClinicSchedule.`);
  //     } catch (queryError) {
  //         console.error("[Diagnostic Seed] ERROR: Property exists, but query failed:", queryError);
  //         throw queryError; // Lanzar para ver el error de query
  //     }
  //   } else {
  //     console.error("[Diagnostic Seed] FAILURE: Property prisma.clinicSchedule is UNDEFINED at runtime.");
  //     // Si esto ocurre, el cliente Prisma generado está incompleto o dañado
  //     throw new Error("prisma.clinicSchedule is undefined at runtime despite generation.");
  //   }
  //
  // } catch (error) {
  //   // Capturar errores generales del bloque try, incluyendo el posible throw del runtime check
  //   console.error("[Diagnostic Seed] OVERALL ERROR in Step 2:", error);
  //   throw error; // Re-lanzar para que el proceso falle
  // }
  // ---

  console.log("[Diagnostic Seed] Diagnostic checks finished (removed clinicSchedule check).");

  // --- CÓDIGO ORIGINAL RESTAURADO (Ajustar la carga de mockData si es necesario) ---
  // Recalcular rutas si es necesario (asegurarse que sigue funcionando)
  const currentFileURL = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileURL);
  const currentDir = path.dirname(currentFilePath);
  const mockDataPathResolved = path.resolve(currentDir, '../mockData.ts'); // Ajusta la ruta relativa si seed.ts se movió

  console.log(`Importing mock data from: ${mockDataPathResolved}`);
  let initialMockData;
  try {
    const mockDataModule = await import('file://' + mockDataPathResolved);
    initialMockData = mockDataModule.initialMockData;
    if (!initialMockData) {
      throw new Error("initialMockData not found in the imported module.");
    }
  } catch (importError) {
     console.error("Error importing mock data:", importError);
     process.exit(1);
  }

  console.log(`Start seeding real data...`);

  // --- Crear Entidades Base (System, Permissions, Roles) --- 
  console.log('Creating base entities...');

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

  console.log('Creating base permissions...');
  const permissionsToCreate = [
    // ... (lista de permisos) ...
    { action: 'ver', module: 'agenda_diaria' },
    { action: 'ver', module: 'agenda_semanal' },
    { action: 'crear', module: 'cita' },
    { action: 'editar', module: 'cita' },
    { action: 'eliminar', module: 'cita' },
    { action: 'marcar_asistida', module: 'cita' },
    { action: 'buscar', module: 'clientes' },
    { action: 'crear', module: 'clientes' },
    { action: 'editar', module: 'clientes' },
    { action: 'ver_datos_contacto', module: 'clientes' },
    { action: 'eliminar', module: 'clientes' },
    { action: 'gestionar', module: 'clinicas' },
    { action: 'gestionar', module: 'usuarios' },
    { action: 'gestionar', module: 'roles_permisos' },
    { action: 'gestionar', module: 'catalogo_servicios' },
    { action: 'gestionar', module: 'catalogo_productos' },
  ];

  try {
      await prisma.permission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true, 
      });
      console.log(`${permissionsToCreate.length} base permissions ensured.`);
  } catch (error) {
      console.error("Error creating permissions:", error);
      await prisma.$disconnect();
      process.exit(1);
  }

  const allPermissions = await prisma.permission.findMany();
  const allPermissionIds = allPermissions.map(p => ({ permissionId: p.id }));

  console.log('Creating base roles and assigning permissions...');

  const adminRole = await prisma.role.upsert({
    where: { name_systemId: { name: 'Administrador', systemId: system.id } },
    update: {
        permissions: {
            deleteMany: {},
            create: allPermissionIds,
        }
    },
    create: {
      name: 'Administrador',
      description: 'Acceso completo a todas las funcionalidades.',
      systemId: system.id,
      permissions: {
        create: allPermissionIds,
      },
    },
    include: { permissions: true },
  });
  console.log(`Ensured role "${adminRole.name}" with ${adminRole.permissions.length} permissions.`);

  const clinicStaffPermissions = allPermissions.filter(p =>
      p.module.includes('agenda') || p.module.includes('cita') ||
      (p.module === 'clientes' && (p.action === 'buscar' || p.action === 'ver_datos_contacto' || p.action === 'crear'))
  ).map(p => ({ permissionId: p.id }));

  const staffRole = await prisma.role.upsert({
      where: { name_systemId: { name: 'Personal Clinica', systemId: system.id } },
      update: { 
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

  const saltRounds = 10;
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
  console.log(`Hashed default password.`);

  console.log('Mapping and creating mock data...');

  console.log('Creating clinics...');
  const clinicsData = initialMockData.clinicas;
  const createdClinicsMap = new Map<string, any>();

  for (const clinicData of clinicsData) {
     try {
         const clinic = await prisma.clinic.upsert({
           where: { Clinic_name_systemId_key: { name: clinicData.name, systemId: system.id } },
           update: {
             address: clinicData.direccion,
             city: clinicData.city,
             phone: clinicData.telefono,
             email: clinicData.email,
             isActive: clinicData.isActive !== false,
             // --- Añadir campos de config al update --- 
             openTime: clinicData.config?.openTime,
             closeTime: clinicData.config?.closeTime,
             slotDuration: clinicData.config?.slotDuration,
             tariffId: clinicData.config?.rate, // Asegurarse que el nombre coincide (rate vs tariffId)
             // Otros campos de config... 
           },
           create: {
             name: clinicData.name,
             address: clinicData.direccion,
             city: clinicData.city,
             currency: 'EUR',
             phone: clinicData.telefono,
             email: clinicData.email,
             isActive: clinicData.isActive !== false,
             systemId: system.id,
             // --- Añadir campos de config a create --- 
             openTime: clinicData.config?.openTime,
             closeTime: clinicData.config?.closeTime,
             slotDuration: clinicData.config?.slotDuration,
             tariffId: clinicData.config?.rate, // Asegurarse que el nombre coincide
             // Otros campos de config...
           },
         });
         createdClinicsMap.set(clinicData.id, clinic);
         console.log(`Upserted clinic: ${clinic.name} (ID: ${clinic.id})`);
     } catch (error) {
         console.error(`Error upserting clinic ${clinicData.name}:`, error);
     }
  }
  console.log(`Processed ${clinicsData.length} clinics.`);

  console.log('Creating cabins...');
  for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
    const clinicData = clinicsData.find((c: any) => c.id === mockClinicId);
    if (clinicData && clinicData.config && clinicData.config.cabins && Array.isArray(clinicData.config.cabins)) {
        for (const cabinData of clinicData.config.cabins) {
            if (!cabinData.name) {
                console.warn(`Skipping cabin without name for clinic ${realClinic.name}:`, cabinData);
                continue;
            }
            try {
                await prisma.cabin.upsert({
                    where: { name_clinicId: { name: cabinData.name, clinicId: realClinic.id } }, 
                    update: { 
                        code: cabinData.code,
                        color: cabinData.color,
                        order: cabinData.order,
                        isActive: cabinData.isActive !== false,
                        systemId: realClinic.systemId, 
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
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
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

  console.log('Creating clinic schedules...');
  const dayOfWeekMap: { [key: string]: DayOfWeek } = {
    monday: pkg.DayOfWeek.MONDAY,
    tuesday: pkg.DayOfWeek.TUESDAY,
    wednesday: pkg.DayOfWeek.WEDNESDAY,
    thursday: pkg.DayOfWeek.THURSDAY,
    friday: pkg.DayOfWeek.FRIDAY,
    saturday: pkg.DayOfWeek.SATURDAY,
    sunday: pkg.DayOfWeek.SUNDAY,
  };
  const createdTemplatesMap = new Map<string, ScheduleTemplate>();

  // --- Rewriting schedule logic for hybrid model ---
  for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
    const clinicData = clinicsData.find((c:any) => c.id === mockClinicId);

    // --- Case 1: Detailed schedule exists in mockData -> Create Template and LINK clinic --- 
    if (clinicData?.config?.schedule) {
        console.log(`[Seed Hybrid] Clinic "${realClinic.name}" has detailed schedule in mockData. Creating/Linking Template...`);
        const scheduleConfig = clinicData.config.schedule;
        const templateOpenTime = clinicData.config.openTime || realClinic.openTime; // Template gets its own times
        const templateCloseTime = clinicData.config.closeTime || realClinic.closeTime;
        // Array para los datos de bloque SIN templateId todavía
        const templateBlocksDataTemp: Omit<Prisma.ScheduleTemplateBlockCreateManyInput, 'templateId'>[] = [];
        let nameParts: string[] = [];

        // Generate blocks data
        for (const dayKey in scheduleConfig) {
            const dayConfig = scheduleConfig[dayKey as keyof typeof scheduleConfig];
            const prismaDay = dayOfWeekMap[dayKey.toLowerCase()];
            if (prismaDay && dayConfig.isOpen && dayConfig.ranges && dayConfig.ranges.length > 0) {
                const rangesStr = dayConfig.ranges.map((r: { start: string; end: string; }) => `${r.start}-${r.end}`).join(',');
                nameParts.push(`${dayKey.substring(0,3)}:${rangesStr}`);
                dayConfig.ranges.forEach((range: { start: string; end: string; }) => {
                    if (range.start && range.end) {
                        templateBlocksDataTemp.push({
                            dayOfWeek: prismaDay,
                            startTime: range.start,
                            endTime: range.end,
                            isWorking: true,
                        });
                    } else {
                         console.warn(`[Seed Hybrid] Skipping invalid range for ${dayKey} in clinic "${realClinic.name}":`, range);
                    }
                });
            } else if (prismaDay && !dayConfig.isOpen) {
                 nameParts.push(`${dayKey.substring(0,3)}:Cerrado`);
            }
        }

        // Generate template name
        let templateName = `Plantilla Detallada ${realClinic.name}`;
        if (nameParts.length > 0) {
            templateName = nameParts.join(' ');
        }

        // Upsert/Update the ScheduleTemplate (WITHOUT blocks initially)
        try {
            let scheduleTemplate: ScheduleTemplate | null = null;

            // 1. Try to find an existing template by name and systemId
            const existingTemplate = await prisma.scheduleTemplate.findUnique({
                where: { name_systemId: { name: templateName, systemId: system.id } },
            });

            if (existingTemplate) {
                 // 2a. Template EXISTS: Update it and prepare for block replacement
                 console.log(`[Seed Hybrid] Found existing ScheduleTemplate: ${templateName}. Updating...`);
                 scheduleTemplate = await prisma.scheduleTemplate.update({
                    where: { id: existingTemplate.id },
                    data: {
                         openTime: templateOpenTime, // Update times
                         closeTime: templateCloseTime,
                         // Potentially update description if needed
                         description: `Plantilla detallada generada para ${realClinic.name} desde mockData (actualizada)`,
                    }
                 });
                 // Delete old blocks before creating new ones
                 await prisma.scheduleTemplateBlock.deleteMany({ where: { templateId: scheduleTemplate.id } });
                 console.log(`[Seed Hybrid] Deleted old blocks for existing template ${scheduleTemplate.name}`);

            } else {
                 // 2b. Template DOES NOT EXIST: Create it
                 console.log(`[Seed Hybrid] Creating new ScheduleTemplate: ${templateName}`);
                 scheduleTemplate = await prisma.scheduleTemplate.create({
                    data: {
                        name: templateName,
                        description: `Plantilla detallada generada para ${realClinic.name} desde mockData`,
                        systemId: system.id,
                        openTime: templateOpenTime,
                        closeTime: templateCloseTime,
                        // Blocks are created separately below
                    },
                 });
                 // No need to delete blocks for a new template
                 // We don't need createdTemplatesMap anymore if we query directly
                 // createdTemplatesMap.set(templateName, scheduleTemplate);
                 // console.log(`[Seed Hybrid] Created new ScheduleTemplate: ${scheduleTemplate.name}`); // Logged below anyway
            }

            // 3. Create blocks (common step for new or existing templates)
            if (scheduleTemplate && templateBlocksDataTemp.length > 0) {
                 const blocksToCreate: Prisma.ScheduleTemplateBlockCreateManyInput[] = templateBlocksDataTemp.map(block => ({
                      ...block,
                      templateId: scheduleTemplate!.id // Add the obtained templateId
                 }));
                 await prisma.scheduleTemplateBlock.createMany({
                     data: blocksToCreate,
                 });
                 console.log(`[Seed Hybrid] Created ${blocksToCreate.length} blocks for Template ${scheduleTemplate.name}`);
            }

            // 4. LINK the clinic (Moved outside the initial try/catch logic for creation/update, but still within the main try)
            // This block MUST execute if scheduleTemplate is not null (found or created)
            if (scheduleTemplate) {
                console.log(`[Seed Hybrid] Attempting to link Clinic "${realClinic.name}" to Template "${scheduleTemplate.name}" (ID: ${scheduleTemplate.id})`);
                await prisma.clinic.update({
                    where: { id: realClinic.id },
                    data: {
                        linkedScheduleTemplateId: scheduleTemplate.id,
                        independentScheduleBlocks: { deleteMany: {} }, // Clear independent blocks if linking
                        openTime: templateOpenTime, // Match clinic times to template
                        closeTime: templateCloseTime,
                    },
                });
                console.log(`[Seed Hybrid] SUCCESSFULLY Linked Clinic "${realClinic.name}" to Template "${scheduleTemplate.name}"`);
            } else {
                 // This case should ideally not happen with the find/create logic, but good to have a warning
                 console.error(`[Seed Hybrid] CRITICAL: scheduleTemplate object is null after attempting find/create for clinic "${realClinic.name}". Skipping link.`);
            }

        } catch (error) {
            // Catch errors specifically during template find/create/update/delete blocks/link
            console.error(`[Seed Hybrid] Error during template/block operations or linking for ${templateName} (Clinic: ${realClinic.name}):`, error);
            // No 'continue' here, let the script proceed or fail fully on critical errors
        }

    // --- Case 2: No detailed schedule, but base open/close times exist -> Create INDEPENDENT schedule --- 
    } else if (realClinic.openTime && realClinic.closeTime) {
        console.log(`[Seed Hybrid] Clinic "${realClinic.name}" lacks detailed schedule. Creating independent schedule based on ${realClinic.openTime}-${realClinic.closeTime}.`);

        const independentOpenTime = realClinic.openTime;
        const independentCloseTime = realClinic.closeTime;
        // Array para los datos de bloque SIN clinicId todavía
        const independentBlocksDataTemp: Omit<Prisma.ClinicScheduleBlockCreateManyInput, 'clinicId'>[] = [];

        const defaultWorkingDaysEnum: DayOfWeek[] = [
            pkg.DayOfWeek.MONDAY, pkg.DayOfWeek.TUESDAY, pkg.DayOfWeek.WEDNESDAY,
            pkg.DayOfWeek.THURSDAY, pkg.DayOfWeek.FRIDAY,
        ];

        // Generate default blocks (Mon-Fri)
        defaultWorkingDaysEnum.forEach(day => {
            independentBlocksDataTemp.push({
                dayOfWeek: day,
                startTime: independentOpenTime,
                endTime: independentCloseTime,
                isWorking: true,
            });
        });

        // Add Saturday if configured in mockData
        if (clinicData?.config?.saturdayOpen === true) {
          const saturdayOpen = clinicData.config.weekendOpenTime || independentOpenTime;
          const saturdayClose = clinicData.config.weekendCloseTime || independentCloseTime;
          if (saturdayOpen && saturdayClose) {
              independentBlocksDataTemp.push({
                  dayOfWeek: pkg.DayOfWeek.SATURDAY,
                  startTime: saturdayOpen,
                  endTime: saturdayClose,
                  isWorking: true,
              });
              console.log(`[Seed Hybrid Independent] Added Saturday ${saturdayOpen}-${saturdayClose} config for "${realClinic.name}"`);
          } else {
               console.log(`[Seed Hybrid Independent] Saturday configured open for "${realClinic.name}" but times missing.`);
          }
        }

        // Update the clinic: ensure it's NOT linked and clear existing blocks
        try {
            await prisma.clinic.update({
                where: { id: realClinic.id },
                data: {
                    linkedScheduleTemplateId: null, // Ensure NOT linked
                    openTime: independentOpenTime, // Ensure base times are set
                    closeTime: independentCloseTime,
                    independentScheduleBlocks: {
                         deleteMany: {} // Clear existing blocks first
                    }
                },
            });

            // Now, create the independent blocks using createMany, adding the clinicId
            if (independentBlocksDataTemp.length > 0) {
                const blocksToCreate: Prisma.ClinicScheduleBlockCreateManyInput[] = independentBlocksDataTemp.map(block => ({
                     ...block,
                     clinicId: realClinic.id // Add the clinicId
                }));
                await prisma.clinicScheduleBlock.createMany({
                    data: blocksToCreate,
                });
                 console.log(`[Seed Hybrid] Created ${blocksToCreate.length} independent schedule blocks for Clinic "${realClinic.name}"`);
            }

        } catch (error) {
            console.error(`[Seed Hybrid] Error creating independent schedule for clinic ${realClinic.name}:`, error);
        }

    // --- Case 3: No schedule information at all --- 
    } else {
        console.warn(`[Seed Hybrid] Skipping schedule creation for clinic ${realClinic.name}: No detailed or base times found.`);
        // Ensure clinic is not linked and has no independent blocks
         try {
            await prisma.clinic.update({
                where: { id: realClinic.id },
                data: {
                    linkedScheduleTemplateId: null,
                    independentScheduleBlocks: {
                        deleteMany: {},
                    }
                }
            });
         } catch (error) {
             console.error(`[Seed Hybrid] Error clearing schedule link/blocks for clinic ${realClinic.name}:`, error);
         }
    }
  }
  // --- End of Rewritten schedule logic ---

  console.log('Finished processing clinic schedules.');

  // --- Crear Tipos de IVA (VAT Types) ---
  console.log('Creating VAT types...');
  const vatTypesData = [
    { name: 'General', rate: 21.0, isDefault: true, systemId: system.id },
    { name: 'Reducido', rate: 10.0, isDefault: false, systemId: system.id },
    { name: 'Superreducido', rate: 4.0, isDefault: false, systemId: system.id },
    { name: 'Exento', rate: 0.0, isDefault: false, systemId: system.id },
  ];
  let defaultVatType: any = null;
  try {
    for (const vatData of vatTypesData) {
      const vatType = await prisma.vATType.upsert({
        where: { name_systemId: { name: vatData.name, systemId: vatData.systemId } },
        update: { rate: vatData.rate, isDefault: vatData.isDefault },
        create: vatData,
      });
      console.log(`Upserted VAT type: ${vatType.name} (${vatType.rate}%)`);
      if (vatType.isDefault) {
        defaultVatType = vatType;
      }
    }
    if (!defaultVatType) {
      // Si no se encontró un default, usar el primero creado o el general
      defaultVatType = await prisma.vATType.findFirst({ where: { systemId: system.id, name: 'General' } });
    }
    console.log('Finished creating VAT types.');
  } catch (error) {
    console.error('Error creating VAT types:', error);
    // Considerar salir o continuar dependiendo de la criticidad
  }

  // --- Crear Tarifas (Tariffs) --- 
  console.log('Creating tariffs...');
  const tariffsData = [
    // Usar los IDs definidos en mockData.ts (clinic.config.rate)
    { id: 'tarifa-1', name: 'Tarifa General', isDefault: true, systemId: system.id, defaultVatTypeId: defaultVatType?.id },
    { id: 'tarifa-2', name: 'Tarifa VIP', isDefault: false, systemId: system.id, defaultVatTypeId: defaultVatType?.id },
    // Añadir más tarifas si son referenciadas en mockData
  ];
  const createdTariffsMap = new Map<string, any>();
  try {
    for (const tariffData of tariffsData) {
       if (!tariffData.defaultVatTypeId) {
            console.warn(`Skipping tariff '${tariffData.name}' creation because default VAT type was not found.`);
            continue;
        }
      // Usar create directamente ya que especificamos el ID
      // Podríamos usar upsert si quisiéramos actualizar tarifas existentes por ID
      const tariff = await prisma.tariff.upsert({
         where: { id: tariffData.id }, // Buscar por el ID que proporcionamos
         update: { // Qué actualizar si ya existe
             name: tariffData.name,
             isDefault: tariffData.isDefault,
             defaultVatTypeId: tariffData.defaultVatTypeId, 
             systemId: tariffData.systemId // Asegurar que systemId esté en update también
         },
         create: { // Qué crear si no existe
             id: tariffData.id,
             name: tariffData.name,
             description: `Tarifa ${tariffData.name} generada por seed`,
             isDefault: tariffData.isDefault,
             isActive: true,
             systemId: tariffData.systemId,
             defaultVatTypeId: tariffData.defaultVatTypeId, // Asegurarse que el ID de VAT exista
         }
      });
      createdTariffsMap.set(tariff.id, tariff);
      console.log(`Upserted tariff: ${tariff.name} (ID: ${tariff.id})`);
    }
    console.log('Finished creating tariffs.');

    // Ahora, actualizar las clínicas con el tariffId REAL de la tarifa creada
    console.log('Assigning tariffs to clinics...');
    for (const [mockClinicId, realClinic] of createdClinicsMap.entries()) {
        const clinicData = clinicsData.find((c: any) => c.id === mockClinicId);
        const targetTariffId = clinicData?.config?.rate; // El ID 'tarifa-1', 'tarifa-2' de mockData
        const realTariff = createdTariffsMap.get(targetTariffId);

        if (realClinic && realTariff) {
            // Solo actualizar si la tarifa asignada actualmente es diferente o nula
            if(realClinic.tariffId !== realTariff.id) { 
                 await prisma.clinic.update({
                     where: { id: realClinic.id },
                     data: { tariffId: realTariff.id },
                 });
                 console.log(`Assigned tariff '${realTariff.name}' to clinic '${realClinic.name}'`);
            }
        } else if (realClinic && targetTariffId) {
            console.warn(`Tariff with ID '${targetTariffId}' needed by clinic '${realClinic.name}' was not found or created.`);
        }
    }
    console.log('Finished assigning tariffs to clinics.');

  } catch (error) {
    console.error('Error creating or assigning tariffs:', error);
  }

  // --- Crear Categorías (con Jerarquía) ---
  console.log('Creating categories...');
  let catFacial: any = null, catCorporal: any = null, catLaser: any = null, 
      catProductos: any = null, subcatLimpieza: any = null, subcatCremas: any = null;
  const createdCategoriesMap = new Map<string, any>();
  try {
    // Nivel Raíz
    catFacial = await prisma.category.upsert({
      where: { name_systemId: { name: 'Facial', systemId: system.id } },
      update: {}, create: { name: 'Facial', description: 'Tratamientos Faciales', systemId: system.id }
    });
    createdCategoriesMap.set(catFacial.id, catFacial);
    catCorporal = await prisma.category.upsert({
      where: { name_systemId: { name: 'Corporal', systemId: system.id } },
      update: {}, create: { name: 'Corporal', description: 'Tratamientos Corporales', systemId: system.id }
    });
    createdCategoriesMap.set(catCorporal.id, catCorporal);
    catLaser = await prisma.category.upsert({
      where: { name_systemId: { name: 'Depilación Láser', systemId: system.id } },
      update: {}, create: { name: 'Depilación Láser', description: 'Depilación Láser', systemId: system.id }
    });
     createdCategoriesMap.set(catLaser.id, catLaser);
     catProductos = await prisma.category.upsert({
      where: { name_systemId: { name: 'Productos', systemId: system.id } },
      update: {}, create: { name: 'Productos', description: 'Productos de Venta', systemId: system.id }
    });
     createdCategoriesMap.set(catProductos.id, catProductos);

    // Subcategorías (ejemplo)
    subcatLimpieza = await prisma.category.upsert({
      where: { name_systemId: { name: 'Limpieza Facial', systemId: system.id } },
      update: { parentId: catFacial.id }, 
      create: { name: 'Limpieza Facial', description: 'Limpiezas faciales', systemId: system.id, parentId: catFacial.id }
    });
     createdCategoriesMap.set(subcatLimpieza.id, subcatLimpieza);
     subcatCremas = await prisma.category.upsert({
      where: { name_systemId: { name: 'Cremas', systemId: system.id } },
      update: { parentId: catProductos.id },
      create: { name: 'Cremas', description: 'Cremas faciales y corporales', systemId: system.id, parentId: catProductos.id }
    });
     createdCategoriesMap.set(subcatCremas.id, subcatCremas);

    console.log(`Upserted ${createdCategoriesMap.size} categories.`);
  } catch (error) {
    console.error('Error creating categories:', error);
  }

  // --- Crear Servicios de Ejemplo ---
  console.log('Creating example services...');
  const createdServicesMap = new Map<string, any>();
  try {
    const servicioLimpieza = await prisma.service.upsert({
      where: { name_systemId: { name: 'Limpieza Facial Básica', systemId: system.id } },
      update: { durationMinutes: 50, price: 45.0, categoryId: subcatLimpieza?.id, vatTypeId: defaultVatType?.id },
      create: {
        name: 'Limpieza Facial Básica', description: 'Limpieza facial estándar', durationMinutes: 50,
        price: 45.0, isActive: true, systemId: system.id,
        categoryId: subcatLimpieza?.id, // Asignar subcategoría
        vatTypeId: defaultVatType?.id // Asignar IVA por defecto
      }
    });
    createdServicesMap.set(servicioLimpieza.id, servicioLimpieza);
    const servicioMasaje = await prisma.service.upsert({
       where: { name_systemId: { name: 'Masaje Relajante', systemId: system.id } },
      update: { durationMinutes: 60, price: 55.0, categoryId: catCorporal?.id, vatTypeId: defaultVatType?.id },
      create: {
        name: 'Masaje Relajante', description: 'Masaje corporal relajante', durationMinutes: 60,
        price: 55.0, isActive: true, systemId: system.id,
        categoryId: catCorporal?.id, // Asignar categoría raíz
        vatTypeId: defaultVatType?.id
      }
    });
    createdServicesMap.set(servicioMasaje.id, servicioMasaje);
     const servicioLaser = await prisma.service.upsert({
      where: { name_systemId: { name: 'Sesión Láser Piernas', systemId: system.id } },
      update: { durationMinutes: 45, price: 80.0, categoryId: catLaser?.id, vatTypeId: defaultVatType?.id },
      create: {
        name: 'Sesión Láser Piernas', description: 'Depilación láser piernas completas', durationMinutes: 45,
        price: 80.0, isActive: true, systemId: system.id,
        categoryId: catLaser?.id,
        vatTypeId: defaultVatType?.id
      }
    });
    createdServicesMap.set(servicioLaser.id, servicioLaser);
    console.log(`Upserted ${createdServicesMap.size} services.`);
  } catch (error) {
    console.error('Error creating services:', error);
  }

  // --- Crear Productos de Ejemplo ---
  console.log('Creating example products...');
  const createdProductsMap = new Map<string, any>();
  try {
    const productoCrema = await prisma.product.upsert({
       where: { name_systemId: { name: 'Crema Hidratante Facial SPF30', systemId: system.id } },
      update: { price: 25.0, costPrice: 10.0, categoryId: subcatCremas?.id, vatTypeId: defaultVatType?.id },
      create: {
        name: 'Crema Hidratante Facial SPF30', description: 'Crema hidratante con protección solar', sku: 'CREMAFAC01',
        price: 25.0, costPrice: 10.0, currentStock: 50, isForSale: true, isActive: true, systemId: system.id,
        categoryId: subcatCremas?.id, // Asignar subcategoría
        vatTypeId: defaultVatType?.id // Asignar IVA
      }
    });
    createdProductsMap.set(productoCrema.id, productoCrema);
     const productoSerum = await prisma.product.upsert({
      where: { name_systemId: { name: 'Serum Reparador Noche', systemId: system.id } },
      update: { price: 35.0, costPrice: 15.0, categoryId: catFacial?.id, vatTypeId: defaultVatType?.id }, // Categoría padre
      create: {
        name: 'Serum Reparador Noche', description: 'Serum facial reparador', sku: 'SERUMFAC01',
        price: 35.0, costPrice: 15.0, currentStock: 30, isForSale: true, isActive: true, systemId: system.id,
        categoryId: catFacial?.id, // Asignar categoría raíz
        vatTypeId: defaultVatType?.id
      }
    });
    createdProductsMap.set(productoSerum.id, productoSerum);
    console.log(`Upserted ${createdProductsMap.size} products.`);
  } catch (error) {
    console.error('Error creating products:', error);
  }

  // --- Crear Precios Específicos por Tarifa --- (COMMENTED OUT)
  /*
  console.log('Creating tariff-specific prices...');
  try {
    const tarifaGeneral = createdTariffsMap.get('tarifa-1');
    const tarifaVIP = createdTariffsMap.get('tarifa-2');

    const limpiezaReal = await prisma.service.findUnique({ where: { name_systemId: { name: 'Limpieza Facial Básica', systemId: system.id } } });
    const masajeReal = await prisma.service.findUnique({ where: { name_systemId: { name: 'Masaje Relajante', systemId: system.id } } });
    const laserReal = await prisma.service.findUnique({ where: { name_systemId: { name: 'Sesión Láser Piernas', systemId: system.id } } });
    const cremaReal = await prisma.product.findUnique({ where: { name_systemId: { name: 'Crema Hidratante Facial SPF30', systemId: system.id } } });

    if (tarifaGeneral && limpiezaReal) {
      await prisma.tariffServicePrice.upsert({
        where: { tariffId_serviceId: { tariffId: tarifaGeneral.id, serviceId: limpiezaReal.id } },
        update: { price: 45.0 }, // Mismo precio que el base en este caso
        create: { tariffId: tarifaGeneral.id, serviceId: limpiezaReal.id, price: 45.0 }
      });
    }
    if (tarifaGeneral && masajeReal) {
      await prisma.tariffServicePrice.upsert({
        where: { tariffId_serviceId: { tariffId: tarifaGeneral.id, serviceId: masajeReal.id } },
        update: { price: 55.0 }, // Mismo precio
        create: { tariffId: tarifaGeneral.id, serviceId: masajeReal.id, price: 55.0 }
      });
    }
     if (tarifaGeneral && laserReal) {
          await prisma.tariffServicePrice.upsert({
              where: { tariffId_serviceId: { tariffId: tarifaGeneral.id, serviceId: laserReal.id } },
              update: { price: 75.0 }, // Precio ligeramente rebajado en tarifa general
              create: { tariffId: tarifaGeneral.id, serviceId: laserReal.id, price: 75.0 }
          });
      }
    if (tarifaGeneral && cremaReal) {
      await prisma.tariffProductPrice.upsert({
        where: { tariffId_productId: { tariffId: tarifaGeneral.id, productId: cremaReal.id } },
        update: { price: 24.0 }, // Precio ligeramente rebajado
        create: { tariffId: tarifaGeneral.id, productId: cremaReal.id, price: 24.0 }
      });
    }

    // Precios para Tarifa VIP
    if (tarifaVIP && limpiezaReal) {
      await prisma.tariffServicePrice.upsert({
        where: { tariffId_serviceId: { tariffId: tarifaVIP.id, serviceId: limpiezaReal.id } },
        update: { price: 50.0 }, // Precio VIP más caro
        create: { tariffId: tarifaVIP.id, serviceId: limpiezaReal.id, price: 50.0 }
      });
    }
    // No definir precio específico para masaje en VIP, usará el precio base del servicio (55)
    if (tarifaVIP && laserReal) {
        await prisma.tariffServicePrice.upsert({
            where: { tariffId_serviceId: { tariffId: tarifaVIP.id, serviceId: laserReal.id } },
            update: { price: 90.0 }, // Precio VIP más caro
            create: { tariffId: tarifaVIP.id, serviceId: laserReal.id, price: 90.0 }
        });
    }
    if (tarifaVIP && cremaReal) {
        await prisma.tariffProductPrice.upsert({
            where: { tariffId_productId: { tariffId: tarifaVIP.id, productId: cremaReal.id } },
            update: { price: 28.0 }, // Precio VIP más caro
            create: { tariffId: tarifaVIP.id, productId: cremaReal.id, price: 28.0 }
        });
    }

    console.log('Finished creating tariff-specific prices.');
  } catch (error) {
    console.error('Error creating tariff-specific prices:', error);
  }
  */
  // --- FIN Precios Específicos --- (COMMENTED OUT)

  // ... (resto del código original para equipos, IVA, usuarios, etc.) ...
  
  // Ejemplo de creación de Usuarios (asegúrate que esté descomentado y adaptado)
  console.log('Creating users...');
  const usersData = initialMockData.usuarios;
  const createdUsersMap = new Map<string, any>();
  if (usersData && Array.isArray(usersData)) {
    for (const userData of usersData) {
      const nameParts = userData.nombre.split(' ');
      const firstName = nameParts[0] || 'Usuario';
      const lastName = nameParts.slice(1).join(' ') || 'Ejemplo';
  
      try {
          const user = await prisma.user.upsert({
              where: { email: userData.email }, 
              update: {
                  firstName: firstName,
                  lastName: lastName,
                  isActive: userData.isActive !== false, 
                  systemId: system.id,
              },
              create: {
                  email: userData.email,
                  firstName: firstName,
                  lastName: lastName,
                  passwordHash: hashedPassword,
                  profileImageUrl: null, 
                  isActive: userData.isActive !== false, 
                  systemId: system.id,
              },
          });
          createdUsersMap.set(userData.id, user);
          console.log(`Upserted user: ${user.email} (ID: ${user.id})`);
  
          // Asignar rol
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
          
          // Asignar clínicas
          if (userData.clinicasIds && Array.isArray(userData.clinicasIds)) {
            const assignmentsToCreate = userData.clinicasIds
              .map((mockClinicId: string) => createdClinicsMap.get(mockClinicId)) 
              .filter((clinic: any) => clinic) 
              .map((clinic: any) => ({ 
                  userId: user.id,
                  clinicId: clinic.id,
              }));
  
            if (assignmentsToCreate.length > 0) {
              try {
                  await prisma.userClinicAssignment.createMany({
                      data: assignmentsToCreate,
                      skipDuplicates: true,
                  });
                  console.log(`Assigned user ${user.email} to ${assignmentsToCreate.length} clinics.`);
              } catch (error) {
                  console.error(`Error assigning clinics to user ${user.email}:`, error);
              }
            }
          } 
      } catch (error) {
          console.error(`Error upserting user ${userData.email}:`, error);
      }
    }
    console.log(`Processed ${usersData.length} users.`);
  } else {
      console.log('No user data found to seed.');
  }
  
  // ... (Asegurarse que las secciones de categorías, equipos, IVA, servicios estén descomentadas y funcionen) ...

  console.log(`Seeding finished.`);
  // --- FIN CÓDIGO ORIGINAL RESTAURADO ---
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
    console.error("[Seed Script] Error in main:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 