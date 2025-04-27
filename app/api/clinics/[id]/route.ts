import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // Importar tipos de Prisma si son necesarios para errores
import { z } from 'zod';
import { DayOfWeek as PrismaDayOfWeek } from '@prisma/client';
import { getServerAuthSession } from "@/lib/auth"; // Corrected import path

/**
 * Esquema para validar el ID de la clínica en los parámetros
 */
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de clínica inválido." }),
});

/**
 * Esquema para validar el body de la solicitud PUT
 * Incluir TODOS los campos editables desde el formulario de configuración
 */
const UpdateClinicSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(), // Código ISO
  countryIsoCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email({ message: "Email inválido." }).optional().nullable(),
  currency: z.string().optional().nullable(), // Código ISO
  timezone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // --- AÑADIR CAMPOS FALTANTES --- 
  prefix: z.string().optional().nullable(),
  commercialName: z.string().optional().nullable(), 
  businessName: z.string().optional().nullable(), 
  cif: z.string().optional().nullable(), 
  country: z.string().optional().nullable(), // Nombre país?
  phone2: z.string().optional().nullable(), 
  initialCash: z.number().optional().nullable(), // Prisma usa Float, Zod usa number
  ticketSize: z.string().optional().nullable(), 
  ip: z.string().ip({ version: 'v4' }).optional().nullable(), // Validar IP v4 si aplica
  blockSignArea: z.boolean().optional().nullable(),
  blockPersonalData: z.boolean().optional().nullable(), 
  delayedPayments: z.boolean().optional().nullable(), 
  affectsStats: z.boolean().optional().nullable(),  
  appearsInApp: z.boolean().optional().nullable(),  
  scheduleControl: z.boolean().optional().nullable(), 
  professionalSkills: z.boolean().optional().nullable(), 
  notes: z.string().optional().nullable(), 
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(), // Validar formato HH:MM
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  slotDuration: z.number().int().positive("Debe ser positivo").optional().nullable(), // Prisma usa Int
  scheduleJson: z.any().optional().nullable(), // z.any() o un esquema más específico si es posible
  tariffId: z.string().optional().nullable(), // Asumiendo CUID para IDs <-- CAMBIADO: Quitado .cuid()
  linkedScheduleTemplateId: z.string().cuid({ message: "ID de plantilla inválido"}).optional().nullable(), // <<< AÑADIDO
  deleteIndependentBlocks: z.boolean().optional(),
}).strict(); // Usar .strict() para asegurar que NO se permitan campos extra (opcional pero recomendado)

// Añadir esquema Zod para WeekSchedule (o importarlo si existe)
// Asegúrate de que coincida con la estructura enviada por el frontend
const TimeRangeSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), 
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
});

const DayScheduleSchema = z.object({
  isOpen: z.boolean(),
  ranges: z.array(TimeRangeSchema)
});

const WeekScheduleSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema,
});

// Modificar el esquema principal para aceptar el horario independiente Y el orden de cabinas
const UpdateClinicAndScheduleSchema = z.object({
  // Copiar campos de UpdateClinicSchema (excepto scheduleJson)
  name: z.string().min(1, "El nombre es obligatorio."),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  countryIsoCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone1CountryIsoCode: z.string().optional().nullable(),
  phone2CountryIsoCode: z.string().optional().nullable(),
  email: z.string().email({ message: "Email inválido." }).optional().nullable(),
  currency: z.string().optional().nullable(),
  timezone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // --- AÑADIR CAMPOS FALTANTES --- 
  prefix: z.string().optional().nullable(),
  commercialName: z.string().optional().nullable(), 
  businessName: z.string().optional().nullable(), 
  cif: z.string().optional().nullable(), 
  country: z.string().optional().nullable(), // Nombre país?
  phone2: z.string().optional().nullable(), 
  initialCash: z.number().optional().nullable(), // Prisma usa Float, Zod usa number
  ticketSize: z.string().optional().nullable(), 
  ip: z.string().ip({ version: 'v4' }).optional().nullable(), // Validar IP v4 si aplica
  blockSignArea: z.boolean().optional().nullable(),
  blockPersonalData: z.boolean().optional().nullable(), 
  delayedPayments: z.boolean().optional().nullable(), 
  affectsStats: z.boolean().optional().nullable(),  
  appearsInApp: z.boolean().optional().nullable(),  
  scheduleControl: z.boolean().optional().nullable(), 
  professionalSkills: z.boolean().optional().nullable(), 
  notes: z.string().optional().nullable(), 
  slotDuration: z.number().int().positive("Debe ser positivo").optional().nullable(),
  tariffId: z.string().optional().nullable(),
  linkedScheduleTemplateId: z.string().cuid({ message: "ID de plantilla inválido"}).optional().nullable(),
  // Añadir el campo opcional para el horario independiente
  independentScheduleData: WeekScheduleSchema.optional(),
  deleteIndependentBlocks: z.boolean().optional(),
  // --- NUEVO CAMPO PARA ORDEN DE CABINAS ---
  cabinsOrder: z.array(z.object({
    id: z.string().cuid({ message: "ID de cabina inválido en ordenación." }),
    order: z.number().int({ message: "El orden debe ser un número entero." }).min(0, "El orden no puede ser negativo.")
  })).optional(), // Hacerlo opcional por si no se envía siempre
  // --- FIN NUEVO CAMPO ---
}).strict();

// --- Función Auxiliar para convertir WeekSchedule a formato Prisma --- 
function convertWeekScheduleToBlockInput(schedule: z.infer<typeof WeekScheduleSchema>, clinicId: string): Prisma.ClinicScheduleBlockCreateManyInput[] {
  const blocks: Prisma.ClinicScheduleBlockCreateManyInput[] = [];
  for (const [dayKey, daySchedule] of Object.entries(schedule)) {
    if (daySchedule.isOpen && daySchedule.ranges.length > 0) {
      const prismaDay = dayKey.toUpperCase() as PrismaDayOfWeek;
      // Validar que prismaDay sea un valor válido del enum DayOfWeek
      if (!Object.values(PrismaDayOfWeek).includes(prismaDay)) {
          console.warn(`[API PUT Convert] Invalid day key: ${dayKey}. Skipping.`);
          continue; // Saltar día inválido
      }
      daySchedule.ranges.forEach(range => {
        blocks.push({
          clinicId: clinicId,
          dayOfWeek: prismaDay,
          startTime: range.start,
          endTime: range.end,
          isWorking: true, // Asumimos que si hay rango, es día laborable
        });
      });
    }
  }
  return blocks;
}
// --- FIN Función Auxiliar ---

/**
 * Handler para obtener una clínica específica por su ID.
 * @param request La solicitud entrante (no se usa directamente aquí).
 * @param context Objeto que contiene los parámetros de la ruta dinámica (ej: { id: '...' }).
 * @returns NextResponse con la clínica encontrada (JSON) o un mensaje de error.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  // >> ADDED: SESSION VALIDATION <<
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  const systemId = session.user.systemId; // Use systemId for potential filtering later if needed
  console.log(`[API GET /api/clinics/{id}] Session validated for systemId: ${systemId}`);
  // << END SESSION VALIDATION >>

  const params = await props.params;
  // 1. Validar ID de la ruta
  console.log("[API GET /api/clinics/[id]] Received params:", params);

  // --- Acceder al ID directamente ---
  const clinicIdFromParams = params.id;
  console.log(`[API GET /api/clinics/[id]] Extracted clinicId: ${clinicIdFromParams}`);

  // --- Validar el ID extraído con Zod --- 
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API GET /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten()); 
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  // Usar el ID validado
  const { id: clinicId } = paramsValidation.data;
  console.log(`[API GET /api/clinics/[id]] Zod validation successful for ID: ${clinicId}`);

  if (!clinicId) { // Doble chequeo por si acaso
      console.error("[API GET /api/clinics/[id]] clinicId is null/undefined after validation.");
      return NextResponse.json({ error: 'No se pudo obtener el ID de la clínica validado.' }, { status: 400 });
  }

  try {
    console.log(`[API GET /api/clinics/[id]] Fetching clinic details for ID: ${clinicId}`);
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        linkedScheduleTemplate: {
          include: {
            blocks: true
          }
        },
        independentScheduleBlocks: true,
        independentSchedule: true,
        tariff: true,
        cabins: true,
      }
    });

    if (!clinic) {
      console.warn(`[API GET /api/clinics/[id]] Clinic not found: ${clinicId}`);
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
    
    // El console.log que añadimos antes ya muestra los datos leídos
    console.log(`[API GET /api/clinics/[id]] Data fetched from DB:`, JSON.stringify(clinic, null, 2));

    // Simplemente devolver el objeto clinic, que ahora contiene los campos correctos
    return NextResponse.json(clinic); 

  } catch (error) {
    console.error(`[API GET /api/clinics/[id]] Error fetching clinic ${clinicId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch clinic data' }, { status: 500 });
  }
}

/**
 * Handler para actualizar una clínica existente por su ID.
 * Espera los datos a actualizar en el cuerpo de la solicitud (JSON).
 * @param request La solicitud entrante con los datos de actualización.
 * @param params Objeto que contiene el ID de la clínica a actualizar.
 * @returns NextResponse con la clínica actualizada (JSON) o un mensaje de error.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  // >> ADDED: SESSION VALIDATION <<
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  console.log(`[API PUT /api/clinics/{id}] Session validated for systemId: ${systemId}`);
  // << END SESSION VALIDATION >>

  const params = await props.params;
  // 1. Validar ID de la ruta
  console.log("[API PUT /api/clinics/[id]] Received params:", params);
  const clinicIdFromParams = params.id;
  console.log(`[API PUT /api/clinics/[id]] Extracted clinicId: ${clinicIdFromParams}`);
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API PUT /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten());
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;
  console.log(`[API PUT /api/clinics/[id]] Zod validation successful for ID: ${clinicId}`);

  // 2. Validar Body usando el NUEVO esquema
  let validatedData;
  let rawBody; // Guardar el body original
  try {
    rawBody = await request.json();
    console.log("[API PUT /api/clinics/[id]] Received raw body:", JSON.stringify(rawBody, null, 2));
    // Usar el nuevo esquema combinado
    const validation = UpdateClinicAndScheduleSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error("Zod validation failed for PUT /api/clinics/[id] body:", validation.error.format());
      return NextResponse.json({ error: 'Datos de clínica o horario inválidos.', details: validation.error.format() }, { status: 400 });
    }
    validatedData = validation.data;
    console.log("[API PUT /api/clinics/[id]] Zod validation successful for combined data.");
  } catch (error) {
    console.error("Error parsing PUT request body:", error);
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // Separar datos base, horario y ORDEN DE CABINAS
  const { independentScheduleData, slotDuration, deleteIndependentBlocks, cabinsOrder, ...clinicBaseUpdateData } = validatedData;

  // 3. Actualizar en la base de datos usando transacción
  try {
    console.log(`[API PUT /api/clinics/${clinicId}] Attempting update within transaction...`);

    const result = await prisma.$transaction(async (tx) => {
      // 3.1 Actualizar los datos base de la clínica (incluyendo linkedScheduleTemplateId)
      console.log(`[API PUT /api/clinics/${clinicId}] Updating clinic base data:`, JSON.stringify(clinicBaseUpdateData, null, 2));
      const updatedClinicBase = await tx.clinic.update({
        where: { id: clinicId },
        data: clinicBaseUpdateData, // Esto ya incluye linkedScheduleTemplateId
      });
      console.log(`[API PUT /api/clinics/${clinicId}] Clinic base data updated.`);

      // 3.2 Manejar horario: independiente O vinculado
      // *** LÓGICA REVISADA ***
      const isLinkingTemplate = !!clinicBaseUpdateData.linkedScheduleTemplateId;
      const isExplicitlyUnlinking = clinicBaseUpdateData.hasOwnProperty('linkedScheduleTemplateId') && clinicBaseUpdateData.linkedScheduleTemplateId === null;
      const isUpdatingIndependent = !!independentScheduleData;
      const shouldDeleteIndependent = deleteIndependentBlocks === true; // Verificar bandera explícita

      if (isLinkingTemplate) {
        // CASO: Se está vinculando a una plantilla
        console.log(`[API PUT /api/clinics/${clinicId}] Linking to template ${clinicBaseUpdateData.linkedScheduleTemplateId}. Flag deleteIndependentBlocks: ${deleteIndependentBlocks}. Ensuring independent data cleanup...`);
        // Siempre limpiar al vincular
        await tx.clinicScheduleBlock.deleteMany({ where: { clinicId: clinicId } });
        await tx.clinicSchedule.deleteMany({ where: { clinicId: clinicId } });
        console.log(`[API PUT /api/clinics/${clinicId}] Independent blocks and schedule config deleted due to template link.`);

      } else if (isUpdatingIndependent) {
        // CASO: Se está enviando horario independiente (y no se vincula plantilla)
        console.log(`[API PUT /api/clinics/${clinicId}] Processing independent schedule update. Ensuring cleanup...`);
        // Asegurar que linkedScheduleTemplateId sea null
        if (updatedClinicBase.linkedScheduleTemplateId !== null) {
            await tx.clinic.update({ where: { id: clinicId }, data: { linkedScheduleTemplateId: null } });
            console.log(`[API PUT /api/clinics/${clinicId}] Ensured linkedScheduleTemplateId is null for independent update.`);
        }
        // Limpiar datos anteriores
        await tx.clinicScheduleBlock.deleteMany({ where: { clinicId: clinicId } });
        await tx.clinicSchedule.deleteMany({ where: { clinicId: clinicId } });
        console.log(`[API PUT /api/clinics/${clinicId}] Existing independent blocks and schedule config deleted for update.`);

        // Convertir y crear nuevos bloques
        const blocksToCreate = convertWeekScheduleToBlockInput(independentScheduleData, clinicId);
        if (blocksToCreate.length > 0) {
          await tx.clinicScheduleBlock.createMany({ data: blocksToCreate });
          console.log(`[API PUT /api/clinics/${clinicId}] Created ${blocksToCreate.length} new independent blocks.`);

          // Crear/Actualizar ClinicSchedule con datos derivados
          let minStartTime = "23:59";
          let maxEndTime = "00:00";
          blocksToCreate.forEach(block => {
            if (block.startTime < minStartTime) minStartTime = block.startTime;
            if (block.endTime > maxEndTime) maxEndTime = block.endTime;
          });
          const scheduleSlotDuration = slotDuration ?? 15; // Usar slotDuration del request o default
          console.log(`[API PUT /api/clinics/${clinicId}] Creating ClinicSchedule entry with Open: ${minStartTime}, Close: ${maxEndTime}, Slot: ${scheduleSlotDuration}`);
          await tx.clinicSchedule.create({
            data: {
              clinicId: clinicId,
              openTime: minStartTime,
              closeTime: maxEndTime,
              slotDuration: scheduleSlotDuration,
            }
          });
        } else {
          console.log(`[API PUT /api/clinics/${clinicId}] No independent blocks to create. ClinicSchedule entry NOT created.`);
        }

      } else if (isExplicitlyUnlinking) {
        // CASO: Se está desvinculando explícitamente Y NO se envía nuevo horario independiente
        console.log(`[API PUT /api/clinics/${clinicId}] Explicitly unlinking template. Ensuring independent data cleanup...`);
        await tx.clinicScheduleBlock.deleteMany({ where: { clinicId: clinicId } });
        await tx.clinicSchedule.deleteMany({ where: { clinicId: clinicId } });
        console.log(`[API PUT /api/clinics/${clinicId}] Independent blocks and schedule config deleted due to explicit unlink.`);

      } else {
        // CASO: Ni se vincula/desvincula, ni se envía horario independiente nuevo.
        // Actualizar solo slotDuration si se proporcionó y existe una config independiente
        if (slotDuration !== undefined && slotDuration !== null) {
          console.log(`[API PUT /api/clinics/${clinicId}] Attempting to update existing ClinicSchedule slotDuration to: ${slotDuration}`);
          const updateResult = await tx.clinicSchedule.updateMany({
            where: { clinicId: clinicId }, // Solo actualiza si existe
            data: { slotDuration: slotDuration },
          });
          if (updateResult.count > 0) {
             console.log(`[API PUT /api/clinics/${clinicId}] Successfully updated slotDuration for existing independent schedule.`);
          } else {
             console.log(`[API PUT /api/clinics/${clinicId}] slotDuration provided, but no existing independent schedule config found to update.`);
          }
        } else {
          console.log(`[API PUT /api/clinics/${clinicId}] No schedule link change, no independent data, and no slotDuration update. Schedule config remains unchanged.`);
        }
      }
      console.log(`[API PUT /api/clinics/${clinicId}] Schedule logic processed.`); // Log para confirmar que pasó el horario

      // <<< INICIO: NUEVA LÓGICA PARA ACTUALIZAR ORDEN DE CABINAS >>>
      if (cabinsOrder && Array.isArray(cabinsOrder) && cabinsOrder.length > 0) {
        console.log(`[API PUT /api/clinics/${clinicId}] Updating cabin order for ${cabinsOrder.length} cabins...`);
        const updatePromises = cabinsOrder.map(cabinInfo => {
          console.log(`  -> Updating cabin ${cabinInfo.id} to order ${cabinInfo.order}`);
          return tx.cabin.updateMany({ // Usamos updateMany para seguridad, aunque update también valdría si la cabina siempre existe
            where: { 
              id: cabinInfo.id,
              clinicId: clinicId // Asegurar que solo actualizamos cabinas de ESTA clínica
            }, 
            data: { 
              order: cabinInfo.order 
            }
          });
        });
        // Ejecutar todas las actualizaciones en paralelo dentro de la transacción
        await Promise.all(updatePromises);
        console.log(`[API PUT /api/clinics/${clinicId}] Cabin order update complete.`);
      } else {
         console.log(`[API PUT /api/clinics/${clinicId}] No valid 'cabinsOrder' data received. Skipping cabin order update.`);
      }
      // <<< FIN: NUEVA LÓGICA >>>

      // Devolver la clínica actualizada (recargada para incluir los cambios en relaciones)
      console.log(`[API PUT /api/clinics/${clinicId}] Reloading clinic data with relations...`);
      return await tx.clinic.findUnique({ 
          where: { id: clinicId }, 
          include: { 
              independentScheduleBlocks: true, 
              independentSchedule: true, // << Incluir nueva relación
              linkedScheduleTemplate: { include: { blocks: true }},
              tariff: true, // Incluir tarifa para que esté disponible
              cabins: true, // Incluir cabinas
          }
      }); 
    });

    console.log(`[API PUT /api/clinics/${clinicId}] Transaction successful.`);
    return NextResponse.json(result); // Devuelve la clínica con los bloques actualizados

  } catch (error: any) {
    // ... (Manejo de errores sin cambios, revisará errores de transacción también) ...
     console.error(`[API PUT /api/clinics/${clinicId}] Error during transaction:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
         console.error(`[API PUT /api/clinics/${clinicId}] Prisma Known Error Code: ${error.code}`);
         if (error.code === 'P2025') {
             return NextResponse.json({ error: 'Clínica no encontrada para actualizar.', code: error.code }, { status: 404 });
         }
         return NextResponse.json({ error: 'Error de base de datos conocido al actualizar.', code: error.code, meta: error.meta }, { status: 400 });
     } else if (error instanceof Prisma.PrismaClientValidationError) {
         console.error(`[API PUT /api/clinics/${clinicId}] Prisma Validation Error:`, error.message);
         return NextResponse.json({ error: 'Error de validación de datos de Prisma.', message: error.message }, { status: 400 });
     } else {
         return NextResponse.json({ error: 'Error interno del servidor al actualizar la clínica.', message: error.message || 'Unknown error' }, { status: 500 });
     }
  }
}

/**
 * Esquema Zod para validación de PATCH (solo campos permitidos para update parcial)
 */
const PatchClinicSchema = z.object({
  tariffId: z.string().nullable().optional(), // Permitir string (CUID), null o undefined
  // Añadir otros campos permitidos para PATCH si es necesario en el futuro
  // isActive: z.boolean().optional(), 
}).strict(); // Asegurar que solo se envíen campos definidos aquí

/**
 * Handler para actualizar parcialmente una clínica existente (PATCH).
 * Utilizado para operaciones específicas como desvincular tarifa.
 * @param request La solicitud con los datos parciales a actualizar.
 * @param params Objeto que contiene el ID de la clínica.
 * @returns NextResponse con la clínica actualizada o un error.
 */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  // >> ADDED: SESSION VALIDATION <<
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  console.log(`[API PATCH /api/clinics/{id}] Session validated for systemId: ${systemId}`);
  // << END SESSION VALIDATION >>

  const params = await props.params;
  // 1. Validar ID de la ruta
  const clinicIdFromParams = params.id;
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;

  // 2. Validar Body usando el esquema PATCH
  let validatedPatchData;
  try {
    const rawBody = await request.json();
    console.log(`[API PATCH /api/clinics/${clinicId}] Received raw body:`, JSON.stringify(rawBody, null, 2));
    const validation = PatchClinicSchema.safeParse(rawBody);
    if (!validation.success) {
      console.error(`[API PATCH /api/clinics/${clinicId}] Zod validation failed:`, validation.error.format());
      return NextResponse.json({ error: 'Datos inválidos para actualización parcial.', details: validation.error.format() }, { status: 400 });
    }
    validatedPatchData = validation.data;
    console.log(`[API PATCH /api/clinics/${clinicId}] Zod validation successful.`);

    // Verificar que al menos un campo se está actualizando
    if (Object.keys(validatedPatchData).length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
    }

  } catch (error) {
    console.error("Error parsing PATCH request body:", error);
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // 3. Actualizar en la base de datos
  try {
    console.log(`[API PATCH /api/clinics/${clinicId}] Updating clinic with partial data:`, JSON.stringify(validatedPatchData, null, 2));
    const updatedClinic = await prisma.clinic.update({
      where: { id: clinicId },
      data: validatedPatchData, // Usar los datos validados del PATCH
    });
    console.log(`[API PATCH /api/clinics/${clinicId}] Clinic updated successfully.`);
    return NextResponse.json(updatedClinic);

  } catch (error) {
    console.error(`[API PATCH /api/clinics/${clinicId}] Error updating clinic:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Clínica ${clinicId} no encontrada` }, { status: 404 });
    }
    // Podrían ocurrir otros errores de Prisma aquí
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la clínica' }, { status: 500 });
  }
}

/**
 * Handler para eliminar una clínica existente por su ID.
 * @param request La solicitud entrante (no se usa directamente aquí).
 * @param params Objeto que contiene el ID de la clínica a eliminar.
 * @returns NextResponse con un mensaje de éxito y estado 200/204, o un mensaje de error.
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  // >> ADDED: SESSION VALIDATION <<
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  console.log(`[API DELETE /api/clinics/{id}] Session validated for systemId: ${systemId}`);
  // << END SESSION VALIDATION >>

  const params = await props.params;
  // <<< 1. VALIDAR ID DE RUTA >>>
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    console.warn("[API DELETE /api/clinics/[id]] Invalid route params:", paramsValidation.error.errors);
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;
  // const clinicId = params.id; // <<< Usar ID validado

  try {
    // TODO: Implementar lógica de autorización // <<< COMENTARIO OBSOLETO

    // <<< 2. VERIFICAR PERTENENCIA AL systemId ANTES DE ELIMINAR >>>
    console.log(`[API DELETE /api/clinics/${clinicId}] Verifying ownership for systemId: ${systemId}...`);
    const clinicToDelete = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { systemId: true }, // Solo necesitamos el systemId para verificar
    });

    if (!clinicToDelete) {
      console.warn(`[API DELETE /api/clinics/${clinicId}] Clinic not found.`);
      // Devolver 404 incluso si no existe, para no revelar información
      return NextResponse.json({ message: `Clínica con ID ${clinicId} no encontrada.` }, { status: 404 });
    }

    if (clinicToDelete.systemId !== systemId) {
      console.warn(`[API DELETE /api/clinics/${clinicId}] Clinic does not belong to system ${systemId}. Belongs to ${clinicToDelete.systemId}.`);
      // Devolver 404 para no revelar existencia a usuarios no autorizados
      return NextResponse.json({ message: `Clínica con ID ${clinicId} no encontrada.` }, { status: 404 });
    }
    console.log(`[API DELETE /api/clinics/${clinicId}] Ownership verified.`);

    // <<< 3. ELIMINAR LA CLÍNICA DE LA BASE DE DATOS >>>
    console.log(`[API DELETE /api/clinics/${clinicId}] Attempting deletion...`);
    await prisma.clinic.delete({
      where: {
         id: clinicId,
         // systemId: systemId, // Doble check opcional, pero ya verificado
        },
    });
    console.log(`[API DELETE /api/clinics/${clinicId}] Deletion successful.`);

    // Devolver respuesta de éxito (200 con mensaje o 204 sin contenido)
    // return new NextResponse(null, { status: 204 }); // Opción No Content
    return NextResponse.json(
      { message: `Clínica con ID ${clinicId} eliminada correctamente` },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error deleting clinic with ID ${clinicId}:`, error);

    // Manejar error específico de Prisma "Registro no encontrado"
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { message: `Clínica con ID ${clinicId} no encontrada para eliminar` },
        { status: 404 } // Not Found
      );
    }
    
    // Manejar error de restricción de clave externa (si la clínica tiene datos relacionados)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { message: `No se puede eliminar la clínica con ID ${clinicId} porque tiene datos relacionados (ej: citas, TPVs).` },
          { status: 409 } // Conflict
        );
    }

    // Devolver error genérico del servidor
    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar la clínica' },
      { status: 500 }
    );
  }
}

// TODO: Implementar handler DELETE para /api/clinics/[id] 