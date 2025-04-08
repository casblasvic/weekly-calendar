// Importamos TODO el paquete como 'pkg'
import pkg from '@prisma/client';
const { PrismaClient, Prisma } = pkg; // Obtener constructor y namespace Prisma

// --- Importación de Tipos Específicos ---
import type { ScheduleTemplate as PrismaScheduleTemplateType, ScheduleTemplateBlock as PrismaScheduleTemplateBlockType, DayOfWeek, ScheduleTemplate } from '@prisma/client'; // Renombrar para evitar conflicto
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Importar error específico
// --- FIN Importación de Tipos ---

// --- IMPORTACIÓN EXPLÍCITA (Eliminada) ---
// import {
//   PrismaClient,
//   Prisma,
//   ScheduleTemplate,
//   DayOfWeek
// } from '@prisma/client';
// --- FIN IMPORTACIÓN EXPLÍCITA ---

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
    { action: 'gestionar', module: 'plantillas_horarias' },
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

  // --- Crear Plantillas de Horario y Bloques --- 
  console.log('Creating schedule templates and blocks...');

  // >>> Declarar variables de plantilla en scope superior <<<
  let template1: (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] }) | null = null;
  let template2: (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] }) | null = null;

  try {
    // Plantilla 1: Lunes a Viernes (9-17)
    // >>> Asignar a la variable declarada arriba <<<
    const template1Result = await prisma.scheduleTemplate.upsert({
      where: { name_systemId: { name: 'Lunes a Viernes (9h-17h)', systemId: system.id } },
      update: {},
      create: {
        name: 'Lunes a Viernes (9h-17h)',
        description: 'Horario estándar de oficina L-V de 9:00 a 17:00',
        systemId: system.id,
        openTime: '09:00',
        closeTime: '17:00',
        blocks: {
          create: [
            { dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
            { dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
            { dayOfWeek: 'WEDNESDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
            { dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
            { dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '17:00', isWorking: true },
          ],
        },
      },
      include: { blocks: true } // Incluir bloques para log
    });
    // Usar una aserción de tipo más segura o validación si es posible
    template1 = template1Result as (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] });
    console.log(`Ensured template "${template1.name}" with ${template1.blocks.length} blocks.`);

    // Plantilla 2: Fines de Semana (Mañana)
    // >>> Asignar a la variable declarada arriba <<<
    const template2Result = await prisma.scheduleTemplate.upsert({
      where: { name_systemId: { name: 'Fines de Semana (Mañana)', systemId: system.id } },
      update: {},
      create: {
        name: 'Fines de Semana (Mañana)',
        description: 'Horario solo mañanas de Sábado y Domingo (10h-14h)',
        systemId: system.id,
        openTime: '10:00',
        closeTime: '14:00',
        blocks: {
          create: [
            { dayOfWeek: 'SATURDAY', startTime: '10:00', endTime: '14:00', isWorking: true },
            { dayOfWeek: 'SUNDAY', startTime: '10:00', endTime: '14:00', isWorking: true },
          ],
        },
      },
      include: { blocks: true }
    });
    // Usar una aserción de tipo más segura o validación si es posible
    template2 = template2Result as (pkg.ScheduleTemplate & { blocks: pkg.ScheduleTemplateBlock[] });
    console.log(`Ensured template "${template2.name}" with ${template2.blocks.length} blocks.`);

  } catch (error) {
    console.error("Error creating schedule templates:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
  // --- FIN Crear Plantillas --- 

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
             prefix: clinicData.prefix,
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
                if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
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

  // --- PRIMERO: Eliminar plantillas auto-generadas antiguas/previas ---
  try {
    console.log('[Seed Cleanup] Deleting previously auto-generated schedule templates...');
    const deleteResult = await prisma.scheduleTemplate.deleteMany({
      where: {
        systemId: system.id,
        OR: [
          { name: { contains: ':' } }, // Eliminar las que tienen el formato antiguo
          { name: { startsWith: 'Horario Detallado (' } } // Eliminar las que tienen el formato nuevo (para recrearlas)
        ]
      }
    });
    console.log(`[Seed Cleanup] Deleted ${deleteResult.count} old auto-generated templates.`);
  } catch (error) {
      console.error("[Seed Cleanup] Error deleting old templates:", error);
      // Considerar si fallar aquí o continuar
  }
  // --- FIN Limpieza ---

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
        const templateBlocksDataTemp: Omit<pkg.Prisma.ScheduleTemplateBlockCreateManyInput, 'templateId'>[] = [];
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
        let templateName = `Horario Detallado (${realClinic.name})`;
        let templateDescription = `Plantilla detallada generada para ${realClinic.name} desde mockData`;
        // Usar la descripción del mock si existe y es más útil?
        // if (clinicData?.description) templateDescription = clinicData.description;
        // --- FIN NUEVO NOMBRE ---

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
                         description: templateDescription + " (actualizada)", // Actualizar descripción
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
                        name: templateName, // Usar nuevo nombre
                        description: templateDescription, // Usar nueva descripción
                        systemId: system.id,
                        openTime: templateOpenTime,
                        closeTime: templateCloseTime,
                        // Blocks are created separately below
                    },
                 });
            }

            // 3. Create blocks (common step for new or existing templates)
            if (scheduleTemplate && templateBlocksDataTemp.length > 0) {
                 const blocksToCreate: pkg.Prisma.ScheduleTemplateBlockCreateManyInput[] = templateBlocksDataTemp.map(block => ({
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
        const independentBlocksDataTemp: Omit<pkg.Prisma.ClinicScheduleBlockCreateManyInput, 'clinicId'>[] = [];

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
                const blocksToCreate: pkg.Prisma.ClinicScheduleBlockCreateManyInput[] = independentBlocksDataTemp.map(block => ({
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

  // --- Crear VATTypes --- 
  console.log('Creating VAT types...');
  const vatTypesData = initialMockData.tiposIVA || [];
  const createdVatTypesMap = new Map<string, any>();

    for (const vatData of vatTypesData) {
    try {
      const vatType = await prisma.vATType.upsert({
        where: { name_systemId: { name: vatData.descripcion, systemId: system.id } }, // Usar 'descripcion' como nombre unico?
        update: { rate: vatData.porcentaje },
        create: {
          name: vatData.descripcion, // Asumiendo que 'descripcion' es el nombre
          rate: vatData.porcentaje,
          // isDefault: vatData.isDefault, // Campo isDefault no existe en PrismaVATType
          systemId: system.id,
        },
      });
      // Usar vatData.id original como key en el map si existe y es string
      if (typeof vatData.id === 'string') {
          createdVatTypesMap.set(vatData.id, vatType);
      }
      console.log(`Ensured VAT type "${vatType.name}".`);
  } catch (error) {
      console.error(`Error creating VAT type "${vatData.descripcion}":`, error);
      // No salir, intentar crear los siguientes
    }
  }

  // --- Crear Categorías de Servicios/Productos ---
  console.log('Creating Categories...');
  const categoriesData = initialMockData.familias || [];
  const createdCategoriesMap = new Map<string, any>();

  for (const categoryData of categoriesData) {
    try {
      const category = await prisma.category.upsert({
        where: { name_systemId: { name: categoryData.nombre, systemId: system.id } },
        update: { description: categoryData.descripcion },
        create: {
          name: categoryData.nombre,
          description: categoryData.descripcion,
          // No hay parentId directo en Category de Prisma
          // No hay tarifaId directo en Category de Prisma
          systemId: system.id,
        },
      });
      // Usar categoryData.id original como key en el map
      if (typeof categoryData.id === 'string') {
          createdCategoriesMap.set(categoryData.id, category);
      }
      console.log(`Ensured category "${category.name}".`);
    } catch (error) {
      console.error(`Error creating category "${categoryData.nombre}":`, error);
    }
  }

  // --- Crear Servicios ---
  console.log('Creating Services...');
  const servicesData = initialMockData.servicios || [];

  for (const serviceData of servicesData) {
    const category = createdCategoriesMap.get(serviceData.familiaId);
    const vatType = createdVatTypesMap.get(serviceData.tipoIvaId);

    try {
      await prisma.service.upsert({
        where: { name_systemId: { name: serviceData.nombre, systemId: system.id } },
        update: {
          code: serviceData.codigo,
          description: serviceData.descripcion,
          durationMinutes: serviceData.duracion,
          price: serviceData.precio != null ? Number(serviceData.precio) : null,
          categoryId: category?.id,
          vatTypeId: vatType?.id,
          isActive: serviceData.activo !== false,
        },
      create: {
          name: serviceData.nombre,
          code: serviceData.codigo,
          description: serviceData.descripcion,
          durationMinutes: serviceData.duracion,
          price: serviceData.precio != null ? Number(serviceData.precio) : null,
          categoryId: category?.id,
          vatTypeId: vatType?.id,
          isActive: serviceData.activo !== false,
          systemId: system.id,
        },
      });
      console.log(`Ensured service "${serviceData.nombre}".`);
  } catch (error) {
      console.error(`Error creating service "${serviceData.nombre}":`, error);
      if (error instanceof PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        if (error.code === 'P2002') {
          console.log(
            'There is a unique constraint violation, a new service cannot be created with this code/name'
          )
        }
      }
      // No salir, intentar los siguientes
    }
  }

  // --- Crear Equipos ---
  console.log('Creating Equipment...');
  const equipmentData = initialMockData.equipos || [];

  for (const equipData of equipmentData) {
    const clinic = createdClinicsMap.get(equipData.clinicId); // Obtener la clínica por el ID original del mock
    if (!clinic) {
      console.warn(`Skipping equipment "${equipData.name}" because clinic ID ${equipData.clinicId} was not found or created.`);
      continue; // Saltar este equipo si la clínica no existe
    }

    try {
      await prisma.equipment.upsert({
        where: { name_systemId: { name: equipData.name, systemId: system.id } },
        update: {
          serialNumber: equipData.serialNumber,
          description: equipData.description,
          modelNumber: equipData.modelNumber,
          purchaseDate: equipData.purchaseDate ? new Date(equipData.purchaseDate) : null,
          warrantyEndDate: equipData.warrantyDate ? new Date(equipData.warrantyDate) : null,
          location: equipData.location,
          notes: equipData.notes,
          clinicId: clinic.id,
          isActive: equipData.isActive !== false,
        },
      create: {
          name: equipData.name,
          serialNumber: equipData.serialNumber,
          description: equipData.description,
          modelNumber: equipData.modelNumber,
          purchaseDate: equipData.purchaseDate ? new Date(equipData.purchaseDate) : null,
          warrantyEndDate: equipData.warrantyDate ? new Date(equipData.warrantyDate) : null,
          location: equipData.location,
          notes: equipData.notes,
          clinicId: clinic.id,
          isActive: equipData.isActive !== false,
          systemId: system.id,
        },
      });
      console.log(`Ensured equipment "${equipData.name}" for clinic "${clinic.name}".`);
  } catch (error) {
      console.error(`Error creating equipment "${equipData.name}":`, error);
      if (error instanceof PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        if (error.code === 'P2002') {
          console.log(
            'There is a unique constraint violation, a new equipment cannot be created with this name/serial'
          )
        }
      }
    }
  }

  // --- Crear Productos ---
  console.log('Creating Products...');
  const productsData = initialMockData.productos || [];

  for (const productData of productsData) {
    const category = createdCategoriesMap.get(productData.categoryId); // Mapear por ID original de familia/categoría
    const vatType = createdVatTypesMap.get(productData.vatTypeId); // Mapear por ID original de tipo IVA

    try {
      await prisma.product.upsert({
        where: { name_systemId: { name: productData.name, systemId: system.id } },
              update: {
          sku: productData.sku,
          description: productData.description,
          currentStock: productData.currentStock ?? 0,
          minStockThreshold: productData.minStockThreshold,
          costPrice: productData.costPrice != null ? Number(productData.costPrice) : null,
          price: productData.price != null ? Number(productData.price) : null,
          barcode: productData.barcode,
          isForSale: productData.isForSale !== false,
          isInternalUse: productData.isInternalUse || false,
          categoryId: category?.id,
          vatTypeId: vatType?.id,
          isActive: productData.activo !== false,
              },
      create: {
          name: productData.name,
          sku: productData.sku,
          description: productData.description,
          currentStock: productData.currentStock ?? 0,
          minStockThreshold: productData.minStockThreshold,
          costPrice: productData.costPrice != null ? Number(productData.costPrice) : null,
          price: productData.price != null ? Number(productData.price) : null,
          barcode: productData.barcode,
          isForSale: productData.isForSale !== false,
          isInternalUse: productData.isInternalUse || false,
          categoryId: category?.id,
          vatTypeId: vatType?.id,
          isActive: productData.activo !== false,
                  systemId: system.id,
              },
          });
      console.log(`Ensured product "${productData.name}".`);
              } catch (error) {
      console.error(`Error creating product "${productData.name}":`, error);
       if (error instanceof PrismaClientKnownRequestError) {
        // The .code property can be accessed in a type-safe manner
        if (error.code === 'P2002') {
          console.log(
            'There is a unique constraint violation, a new product cannot be created with this name/SKU'
          )
        }
      }
    }
  }

  // --- Crear Tipos de IVA --- 
  console.log('Creating VAT types...');
  const vatGeneral = await prisma.vATType.upsert({
    where: { name_systemId: { name: 'IVA General (21%)', systemId: system.id } },
    update: { rate: 21.0, isDefault: true },
      create: {
      name: 'IVA General (21%)',
      rate: 21.0,
      isDefault: true,
      systemId: system.id,
    },
  });
  // ... (creación de otros VATTypes: Reducido, Superreducido, Exento) ...
  console.log('VAT types ensured.');

  // --- Crear Categorías Globales --- 
  console.log('Creating global categories...');
  // ... (lógica de creación de Category) ...
  console.log('Global categories ensured.');

  // >>> AÑADIR CREACIÓN DE TARIFAS AQUÍ <<<
  console.log('Creating default tariffs...');
  const defaultVatTypeId = vatGeneral.id; // Usar el ID del IVA General 21%

  const tarifaGeneral = await prisma.tariff.upsert({
    where: { name_systemId: { name: 'Tarifa General', systemId: system.id } },
    update: { defaultVatTypeId: defaultVatTypeId }, // Asegurar VAT por defecto
      create: {
      name: 'Tarifa General',
      description: 'Tarifa estándar para la mayoría de clínicas y servicios.',
      isDefault: true,
      isActive: true,
      systemId: system.id,
      defaultVatTypeId: defaultVatTypeId, // Asignar VAT por defecto
    },
  });
  console.log(`Ensured tariff "${tarifaGeneral.name}" with id: ${tarifaGeneral.id}`);

  const tarifaVIP = await prisma.tariff.upsert({
    where: { name_systemId: { name: 'Tarifa VIP', systemId: system.id } },
    update: { defaultVatTypeId: defaultVatTypeId },
    create: {
      name: 'Tarifa VIP',
      description: 'Tarifa especial para clientes VIP con posibles descuentos.',
      isDefault: false,
      isActive: true,
      systemId: system.id,
      defaultVatTypeId: defaultVatTypeId,
    },
  });
  console.log(`Ensured tariff "${tarifaVIP.name}" with id: ${tarifaVIP.id}`);
  // --- FIN CREACIÓN DE TARIFAS ---

  // --- Crear Servicios de Ejemplo --- 
  console.log('Creating example services...');
  // ... (lógica de creación de Service - SIN tariffId explícito) ...
  console.log('Example services ensured.');

  // --- Crear Clínicas de Ejemplo --- 
  console.log('Creating example clinics...');
  
  const generalTariffId = tarifaGeneral.id; // Asumiendo que tarifaGeneral se creó correctamente antes

  if (!generalTariffId) {
    console.warn('Could not find General Tariff ID for clinics. Skipping tariff assignment.');
  }
  
  if (!template1) {
      console.error("CRITICAL: template1 (L-V 9-17) was not created successfully. Cannot assign to clinics.");
      await prisma.$disconnect();
      process.exit(1); 
  }
  const template1Id = template1.id; 

  // --- Crear/Actualizar Clínica 1 ---
  const clinic1Name = 'Californie Multilaser - Organicare'; 
  try {
    const clinic1 = await prisma.clinic.upsert({
      where: { Clinic_name_systemId_key: { name: clinic1Name, systemId: system.id } }, 
              update: {
        city: 'Casablanca',
        tariffId: generalTariffId,
        linkedScheduleTemplateId: template1Id 
              },
              create: {
        prefix: '000001',
        name: clinic1Name, 
        address: '123 Rue Exemple',
        city: 'Casablanca',
        postalCode: '20000',
        province: 'Casablanca-Settat',
        countryCode: 'MA',
        phone: '0522000001',
        email: 'contact@organicare.ma',
        currency: 'MAD',
        timezone: 'Africa/Casablanca',
        isActive: true,
        system: {
          connect: { id: system.id }
        }
              },
          });
    console.log(`Ensured clinic "${clinic1.name}" with id: ${clinic1.id}`);
  } catch(error) {
      console.error("Error upserting Clinic 1:", error);
  }

  // --- Crear/Actualizar Clínica 2 ---
  const clinic2Name = 'Cafc Multilaser';
  try {
    const clinic2 = await prisma.clinic.upsert({
        where: { Clinic_name_systemId_key: { name: clinic2Name, systemId: system.id } }, 
        update: { 
          city: 'Casablanca', 
          tariffId: generalTariffId 
        }, 
        create: {
          prefix: 'Cafc',
          name: clinic2Name,
          city: 'Casablanca',
          isActive: true,
          currency: 'MAD',
          system: {
            connect: { id: system.id }
          }
        },
    });
    console.log(`Ensured clinic "${clinic2.name}" with id: ${clinic2.id}`);
  } catch(error) {
      console.error("Error upserting Clinic 2:", error);
  }

  // --- Crear/Actualizar Clínica 3 ---
  const clinic3Name = 'CENTRO TEST';
  try {
    const clinic3 = await prisma.clinic.upsert({
        where: { Clinic_name_systemId_key: { name: clinic3Name, systemId: system.id } }, 
        update: { 
          city: 'Casablanca', 
          isActive: false, 
          tariffId: generalTariffId 
        }, 
        create: {
          prefix: 'TEST',
          name: clinic3Name,
          city: 'Casablanca',
          isActive: false,
          currency: 'MAD',
          system: {
            connect: { id: system.id }
          }
        },
    });
    console.log(`Ensured clinic "${clinic3.name}" with id: ${clinic3.id}`);
  } catch(error) {
      console.error("Error upserting Clinic 3:", error);
  }

  // --- Crear Cabinas de Ejemplo --- 
  // ... (lógica de creación de Cabin) ...

  // --- Crear Usuarios de Ejemplo --- 
  // --- BLOQUE RESTAURADO ---
  console.log('Creating example users...');
  const usersDataFromMock = initialMockData.usuarios || []; // Renombrar para claridad

  // Corregir el bucle y definir userRole dentro
  for (const userData of usersDataFromMock) { 
    // CORREGIDO: Determinar rol usando 'perfil'
    const userRole = userData.perfil === 'Administrador' || userData.perfil === 'Central' ? adminRole : staffRole;
    if (!userRole) { // Añadir verificación por si adminRole o staffRole no se encontraron antes
        console.warn(`Skipping user ${userData.email}: Could not determine role based on perfil="${userData.perfil}". (adminRole or staffRole might be undefined).`);
        continue;
    }

    // Verificar si el usuario ya existe por email GLOBALMENTE (Corregido previamente)
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    let userToProcess: { id: string, email: string }; // Variable para guardar el ID del usuario a procesar

    if (existingUser) {
      console.log(`User with email ${userData.email} already exists. Proceeding to assign roles/clinics.`);
      userToProcess = existingUser; // Usar el usuario existente
      // NO usar continue aquí
    } else {
      // Si no existe, crear el usuario básico
      try {
        const createdUserBasic = await prisma.user.create({
          data: {
            firstName: userData.nombre,
            lastName: "",
            email: userData.email,
            passwordHash: hashedPassword,
            isActive: userData.isActive !== false,
            systemId: system.id,
          },
        });
        console.log(`Created basic user: ${createdUserBasic.email} (ID: ${createdUserBasic.id})`);
        userToProcess = createdUserBasic; // Usar el usuario recién creado
      } catch (error) {
        // Capturar errores de la creación básica del usuario
        console.error(`Error creating base user data for "${userData.email}":`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          console.log(`Skipping processing for user due to unique constraint violation: ${userData.email}`);
        }
        continue; // Saltar al siguiente usuario si la creación básica falla
      }
    }

    // --- AHORA, asignar roles y clínicas usando userToProcess.id ---

    // --- PASO 2: Crear UserRole por separado ---
    if (userToProcess) { // Asegurarse de que tenemos un usuario válido
      try {
        // Usar upsert para evitar error si la relación ya existe
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: userToProcess.id, roleId: userRole.id } },
          update: {}, // No hay nada que actualizar si ya existe
          create: {
            userId: userToProcess.id,
            roleId: userRole.id,
            // assignedAt se establecerá por defecto (@default(now()))
          }
        });
        console.log(` -> Ensured role assignment: ${userRole.name} for ${userToProcess.email}`);
      } catch (roleError) {
        console.error(`  -> Error ensuring role ${userRole.name} for ${userToProcess.email}:`, roleError);
      }

      // --- PASO 3: Crear UserClinicAssignments por separado (usando bucle y upsert) ---
      const clinicAssignmentsData = userData.clinicasIds
        .map((mockClinicId: string) => createdClinicsMap.get(mockClinicId))
        .filter((clinic: any) => clinic)
        .map((clinic: any) => ({
          userId: userToProcess.id, // Usar el ID del usuario procesado
          clinicId: clinic.id,
          roleId: userRole.id, // Usar el mismo rol que se asignó en UserRole
          // assignedAt se establecerá por defecto (@default(now()))
        }));

      if (clinicAssignmentsData.length > 0) {
        console.log(` -> Attempting to ensure ${clinicAssignmentsData.length} clinic assignments for ${userToProcess.email}...`);
        let successfulAssignments = 0;
        for (const assignmentData of clinicAssignmentsData) {
          try {
            await prisma.userClinicAssignment.upsert({
              where: { 
                userId_clinicId: { 
                  userId: assignmentData.userId,
                  clinicId: assignmentData.clinicId
                }
              },
              update: { 
                // Asegurarse de que el rol está correcto si ya existe la asignación
                roleId: assignmentData.roleId 
              },
              create: {
                userId: assignmentData.userId,
                clinicId: assignmentData.clinicId,
                roleId: assignmentData.roleId,
                // assignedAt se establecerá por defecto (@default(now()))
              }
            });
            successfulAssignments++;
          } catch (assignmentError) {
            console.error(`  -> Error upserting clinic assignment (User: ${assignmentData.userId}, Clinic: ${assignmentData.clinicId}):`, assignmentError);
            // No detener el bucle si una falla, intentar las demás
          }
        }
        const assignedClinicNames = clinicAssignmentsData.map(d => createdClinicsMap.get(Object.keys(createdClinicsMap).find(key => createdClinicsMap.get(key)?.id === d.clinicId) || '')?.name).filter(Boolean).join(', ');
        console.log(` -> Ensured ${successfulAssignments}/${clinicAssignmentsData.length} clinic assignments for ${userToProcess.email}: ${assignedClinicNames || 'None'}`);
      }
    } // Fin if(userToProcess)
  } // Fin del bucle for
  console.log('Example users ensured.');
  // --- FIN BLOQUE RESTAURADO ---
  // console.log('SKIPPING Example users creation due to potential 'assignedAt' issue.'); // Mensaje indicativo
  
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
    console.error("[Seed Script] Error in main:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 