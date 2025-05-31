import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // Importar tipos de Prisma si son necesarios para errores
import { z } from 'zod';
import { DayOfWeek as PrismaDayOfWeek, PaymentMethodDefinition, PaymentMethodType } from '@prisma/client';
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
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  slotDuration: z.number().int().positive("Debe ser positivo").optional().nullable(),
  scheduleJson: z.any().optional().nullable(), // z.any() o un esquema más específico si es posible
  tariffId: z.string().optional().nullable(), // Asumiendo CUID para IDs <-- CAMBIADO: Quitado .cuid()
  linkedScheduleTemplateId: z.string().cuid({ message: "ID de plantilla inválido"}).optional().nullable(), // <<< AÑADIDO
  deleteIndependentBlocks: z.boolean().optional(),
  legalEntityId: z.string().cuid("ID de Sociedad Mercantil inválido").nullable().optional(),
}).strict(); // Usar .strict() para asegurar que NO se permitan campos extra (opcional pero recomendado)

/**
 * Esquema para validar el body de la solicitud PUT
 * Incluir TODOS los campos editables desde el formulario de configuración
 */
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
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  slotDuration: z.number().int().positive("Debe ser positivo").optional().nullable(),
  tariffId: z.string().optional().nullable(),
  linkedScheduleTemplateId: z.string().cuid({ message: "ID de plantilla inválido"}).optional().nullable(),
  // Añadir el campo opcional para el horario independiente
  independentScheduleData: WeekScheduleSchema.optional(),
  deleteIndependentBlocks: z.boolean().optional(),
  legalEntityId: z.string().cuid("ID de Sociedad Mercantil inválido").nullable().optional(),
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
          // CONSOLE LOG MANTENIDO COMO WARN: console.warn(`[API PUT Convert] Invalid day key: ${dayKey}. Skipping.`);
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

// --- INICIO: Helper para asegurar PaymentMethodDefinition de Pago Aplazado ---
const DEFERRED_PAYMENT_METHOD_CODE = "SYS_DEFERRED_PAYMENT"; 
const DEFERRED_PAYMENT_METHOD_NAME = "Pago Aplazado"; // Considerar i18n para el nombre si se muestra en UI no controlada por el frontend

async function ensureDeferredPaymentMethodExists(
  tx: Prisma.TransactionClient, 
  systemId: string
): Promise<PaymentMethodDefinition> {
  console.log(`[ensureDeferredPM] Buscando método para systemId: ${systemId}, code: ${DEFERRED_PAYMENT_METHOD_CODE}`);
  let deferredMethod = await tx.paymentMethodDefinition.findFirst({
    where: { 
      code: DEFERRED_PAYMENT_METHOD_CODE, 
      systemId: systemId 
    },
  });

  if (!deferredMethod) {
    console.log(`[ensureDeferredPM] No encontrado. Creando método ${DEFERRED_PAYMENT_METHOD_NAME} para systemId: ${systemId}`);
    deferredMethod = await tx.paymentMethodDefinition.create({
      data: {
        systemId: systemId,
        name: DEFERRED_PAYMENT_METHOD_NAME,
        code: DEFERRED_PAYMENT_METHOD_CODE,
        type: PaymentMethodType.DEFERRED_PAYMENT, 
        isActive: true, 
      },
    });
    console.log(`[ensureDeferredPM] PaymentMethodDefinition para '${DEFERRED_PAYMENT_METHOD_NAME}' creado con ID: ${deferredMethod.id} para systemId: ${systemId}`);
  } else {
    console.log(`[ensureDeferredPM] Encontrado método existente con ID: ${deferredMethod.id}`);
  }
  return deferredMethod;
}
// --- FIN: Helper ---

/**
 * Handler para obtener una clínica específica por su ID.
 * @param request La solicitud entrante (no se usa directamente aquí).
 * @param context Objeto que contiene los parámetros de la ruta dinámica (ej: { id: '...' }).
 * @returns NextResponse con la clínica encontrada (JSON) o un mensaje de error.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  // const systemId = session.user.systemId; // No se usa systemId directamente en GET por ID

  const params = await props.params;
  const clinicIdFromParams = params.id;
  
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API GET /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten()); 
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;

  if (!clinicId) {
      console.error("[API GET /api/clinics/[id]] clinicId is null/undefined after validation.");
      return NextResponse.json({ error: 'No se pudo obtener el ID de la clínica validado.' }, { status: 400 });
  }

  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        linkedScheduleTemplate: {
          include: { blocks: true }
        },
        independentScheduleBlocks: true,
        independentSchedule: true,
        tariff: true,
        cabins: true,
        legalEntity: true // Incluir el objeto legalEntity completo
      }
    });

    if (!clinic) {
      // CONSOLE LOG MANTENIDO COMO WARN: console.warn(`[API GET /api/clinics/[id]] Clinic not found: ${clinicId}`);
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
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
  console.log('[API PUT /clinics/:id] Received request');
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const params = await props.params;
  const clinicIdFromParams = params.id;
  
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API PUT /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten());
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;

  try {
    const body = await request.json();
    console.log('[API PUT /clinics/:id] Request body:', JSON.stringify(body, null, 2));
    const validatedData = UpdateClinicAndScheduleSchema.parse(body);
    console.log('[API PUT /clinics/:id] Validated legalEntityId:', validatedData.legalEntityId);
    
    const { 
      independentScheduleData, 
      deleteIndependentBlocks,
      cabinsOrder,
      countryIsoCode: countryIsoCodeFromInput,
      tariffId: tariffIdFromInput,
      linkedScheduleTemplateId: linkedScheduleTemplateIdFromInput,
      ...clinicScalarData
    } = validatedData;

    const existingClinic = await prisma.clinic.findFirst({
      where: { id: clinicId, systemId: systemId },
    });

    if (!existingClinic) {
      // CONSOLE LOG MANTENIDO COMO WARN: console.warn(`[API PUT /clinics] Clinic ${clinicId} not found or not owned by system ${systemId}`);
      return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a este sistema.' }, { status: 404 });
    }

    const updatedClinic = await prisma.$transaction(async (tx) => {
      const clinicUpdatePayload: Prisma.ClinicUpdateInput = {
        ...clinicScalarData,
        ...(countryIsoCodeFromInput && { country: { connect: { isoCode: countryIsoCodeFromInput } } }),
        ...(tariffIdFromInput && { tariff: { connect: { id: tariffIdFromInput } } }),
        ...(linkedScheduleTemplateIdFromInput 
            ? { linkedScheduleTemplate: { connect: { id: linkedScheduleTemplateIdFromInput } } }
            : (validatedData.hasOwnProperty('linkedScheduleTemplateId') && linkedScheduleTemplateIdFromInput === null
                ? { linkedScheduleTemplate: { disconnect: true } } 
                : {})
        ),
      };
      
      const resultClinic = await tx.clinic.update({
        where: { id: clinicId },
        data: clinicUpdatePayload,
        include: {
            linkedScheduleTemplate: { include: { blocks: true } },
            independentScheduleBlocks: true,
            independentSchedule: true,
            tariff: true,
            cabins: true
        }
      });

      if (validatedData.hasOwnProperty('delayedPayments') && clinicScalarData.hasOwnProperty('delayedPayments')) {
        const deferredPaymentMethod = await ensureDeferredPaymentMethodExists(tx, systemId);

        if (clinicScalarData.delayedPayments === true) {
          await tx.clinicPaymentSetting.upsert({
            where: {
              systemId_clinicId_paymentMethodDefinitionId: {
                systemId: systemId,
                clinicId: clinicId,
                paymentMethodDefinitionId: deferredPaymentMethod.id
              }
            },
            update: { isActiveInClinic: true },
            create: {
              systemId: systemId,
              clinicId: clinicId,
              paymentMethodDefinitionId: deferredPaymentMethod.id,
              isActiveInClinic: true
            }
          });
        } else if (clinicScalarData.delayedPayments === false) {
          await tx.clinicPaymentSetting.updateMany({
            where: {
              systemId: systemId,
              clinicId: clinicId,
              paymentMethodDefinitionId: deferredPaymentMethod.id
            },
            data: { isActiveInClinic: false }
          });
        }
      }

      if (independentScheduleData) {
        if (deleteIndependentBlocks || independentScheduleData) {
          await tx.clinicScheduleBlock.deleteMany({ where: { clinicId: clinicId } });
        }
        if (independentScheduleData) {
          const blockInputs = convertWeekScheduleToBlockInput(independentScheduleData, clinicId);
          if (blockInputs.length > 0) {
            await tx.clinicScheduleBlock.createMany({ data: blockInputs });
          }
        }
        const clinicScheduleConfig = {
            openTime: clinicScalarData.openTime, 
            closeTime: clinicScalarData.closeTime,
            slotDuration: clinicScalarData.slotDuration,
        };
        await tx.clinicSchedule.upsert({
            where: { clinicId: clinicId },
            update: clinicScheduleConfig,
            create: {
                clinicId: clinicId,
                ...clinicScheduleConfig
            }
        });
      }
      
      if (cabinsOrder && cabinsOrder.length > 0) {
        for (const cabin of cabinsOrder) {
          await tx.cabin.update({
            where: { id: cabin.id, clinicId: clinicId },
            data: { order: cabin.order }
          });
        }
      }
      return resultClinic;
    });

    return NextResponse.json(updatedClinic);

  } catch (error) {
    console.error(`[API PUT /api/clinics/${clinicId}] Error updating clinic:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos.', details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Manejar errores específicos de Prisma si es necesario
    }
    return NextResponse.json({ message: 'Error interno del servidor al actualizar la clínica.' }, { status: 500 });
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
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const params = await props.params;
  const clinicIdFromParams = params.id;
  
  const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
  if (!paramsValidation.success) {
    console.error("[API PATCH /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten());
    return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: clinicId } = paramsValidation.data;

  try {
    const body = await request.json();
    const validatedData = UpdateClinicAndScheduleSchema.partial().parse(body);

    const { 
      independentScheduleData, 
      deleteIndependentBlocks, 
      cabinsOrder,
      countryIsoCode: countryIsoCodeFromInput,
      tariffId: tariffIdFromInput,
      linkedScheduleTemplateId: linkedScheduleTemplateIdFromInput,
      openTime: openTimeFromInput, 
      closeTime: closeTimeFromInput,
      slotDuration: slotDurationFromInput,
      ...clinicScalarData
    } = validatedData;

    const existingClinic = await prisma.clinic.findFirst({
      where: { id: clinicId, systemId: systemId },
    });

    if (!existingClinic) {
      // CONSOLE LOG MANTENIDO COMO WARN: console.warn(`[API PATCH /clinics] Clinic ${clinicId} not found or not owned by system ${systemId}`);
      return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a este sistema.' }, { status: 404 });
    }

    const updatedClinic = await prisma.$transaction(async (tx) => {
      if (Object.keys(clinicScalarData).length > 0) {
        const clinicPatchPayload: Prisma.ClinicUpdateInput = {
          ...clinicScalarData,
          ...(countryIsoCodeFromInput && { country: { connect: { isoCode: countryIsoCodeFromInput } } }),
          ...(tariffIdFromInput !== undefined && {
            tariff: tariffIdFromInput ? { connect: { id: tariffIdFromInput } } : { disconnect: true }
          }),
          ...(linkedScheduleTemplateIdFromInput !== undefined 
              ? (linkedScheduleTemplateIdFromInput 
                  ? { linkedScheduleTemplate: { connect: { id: linkedScheduleTemplateIdFromInput } } } 
                  : { linkedScheduleTemplate: { disconnect: true } })
              : {}
          ),
        };
        await tx.clinic.update({
          where: { id: clinicId },
          data: clinicPatchPayload,
        });
      }

      if (independentScheduleData) {
        if (deleteIndependentBlocks) {
          await tx.clinicScheduleBlock.deleteMany({ where: { clinicId: clinicId } });
        }
        const blockInputs = convertWeekScheduleToBlockInput(independentScheduleData, clinicId);
        if (blockInputs.length > 0) {
          await tx.clinicScheduleBlock.createMany({ data: blockInputs });
        }
        const clinicScheduleConfig: Prisma.ClinicScheduleUpdateInput = {};
        if (openTimeFromInput !== undefined) clinicScheduleConfig.openTime = openTimeFromInput;
        if (closeTimeFromInput !== undefined) clinicScheduleConfig.closeTime = closeTimeFromInput;
        if (slotDurationFromInput !== undefined) clinicScheduleConfig.slotDuration = slotDurationFromInput;

        if (Object.keys(clinicScheduleConfig).length > 0 || independentScheduleData) {
            await tx.clinicSchedule.upsert({
                where: { clinicId: clinicId },
                update: clinicScheduleConfig,
                create: {
                    clinic: { connect: { id: clinicId } },
                    openTime: openTimeFromInput !== undefined ? openTimeFromInput : null,
                    closeTime: closeTimeFromInput !== undefined ? closeTimeFromInput : null,
                    slotDuration: slotDurationFromInput !== undefined ? slotDurationFromInput : null,
                }
            });
        }
      } else if (deleteIndependentBlocks === true) {
          await tx.clinicScheduleBlock.deleteMany({ where: { clinicId: clinicId } });
          await tx.clinicSchedule.deleteMany({ where: { clinicId: clinicId } });
      }
      
      if (cabinsOrder && cabinsOrder.length > 0) {
        for (const cabin of cabinsOrder) {
          await tx.cabin.update({
            where: { id: cabin.id, clinicId: clinicId },
            data: { order: cabin.order }
          });
        }
      }
      
      // --- INICIO: Lógica para gestionar ClinicPaymentSetting de Pago Aplazado en PATCH ---
      if (validatedData.hasOwnProperty('delayedPayments') && clinicScalarData.hasOwnProperty('delayedPayments')) {
        const deferredPaymentMethod = await ensureDeferredPaymentMethodExists(tx, systemId);

        // No es necesario if (deferredPaymentMethod) porque la función asegura su existencia o falla la transacción.
        if (clinicScalarData.delayedPayments === true) {
          await tx.clinicPaymentSetting.upsert({
            where: {
              systemId_clinicId_paymentMethodDefinitionId: {
                systemId: systemId,
                clinicId: clinicId,
                paymentMethodDefinitionId: deferredPaymentMethod.id
              }
            },
            update: { isActiveInClinic: true },
            create: {
              systemId: systemId,
              clinicId: clinicId,
              paymentMethodDefinitionId: deferredPaymentMethod.id,
              isActiveInClinic: true
            }
          });
        } else if (clinicScalarData.delayedPayments === false) {
          await tx.clinicPaymentSetting.updateMany({
            where: {
              systemId: systemId,
              clinicId: clinicId,
              paymentMethodDefinitionId: deferredPaymentMethod.id
            },
            data: { isActiveInClinic: false }
          });
        }
      }
      // --- FIN: Lógica para gestionar ClinicPaymentSetting de Pago Aplazado en PATCH ---

      const finalUpdatedClinic = await tx.clinic.findUnique({
        where: { id: clinicId },
        include: {
          linkedScheduleTemplate: { include: { blocks: true } },
          independentScheduleBlocks: true,
          independentSchedule: true,
          tariff: true,
          cabins: true
        }
      });
      return finalUpdatedClinic;
    });

    return NextResponse.json(updatedClinic);

  } catch (error) {
    console.error(`[API PATCH /api/clinics/${clinicId}] Error patching clinic:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos de entrada inválidos.', details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Manejar errores específicos de Prisma si es necesario
    }
    return NextResponse.json({ message: 'Error interno del servidor al actualizar la clínica.' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
    }
    const systemId = session.user.systemId;
  
    const params = await props.params;
    const clinicIdFromParams = params.id;
    
    const paramsValidation = ParamsSchema.safeParse({ id: clinicIdFromParams });
    if (!paramsValidation.success) {
      console.error("[API DELETE /api/clinics/[id]] Zod validation failed for extracted ID:", { id: clinicIdFromParams }, "Error:", paramsValidation.error.flatten());
      return NextResponse.json({ error: 'ID de clínica inválido.', details: paramsValidation.error.errors }, { status: 400 });
    }
    const { id: clinicId } = paramsValidation.data;
  
    try {
      const existingClinic = await prisma.clinic.findFirst({
        where: { id: clinicId, systemId: systemId },
      });
  
      if (!existingClinic) {
        // CONSOLE LOG MANTENIDO COMO WARN: console.warn(`[API DELETE /clinics] Clinic ${clinicId} not found or not owned by system ${systemId}`);
        return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a este sistema.' }, { status: 404 });
      }
  
      await prisma.clinic.delete({
        where: { id: clinicId }, 
      });
  
      return NextResponse.json({ message: 'Clínica eliminada correctamente' }, { status: 200 });
  
    } catch (error) {
      console.error(`[API DELETE /api/clinics/${clinicId}] Error deleting clinic:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return NextResponse.json({ message: 'No se puede eliminar la clínica porque tiene datos asociados (citas, usuarios, etc.).' }, { status: 409 });
        }
      }
      return NextResponse.json({ message: 'Error interno del servidor al eliminar la clínica.' }, { status: 500 });
    }
  }

// TODO: Implementar handler DELETE para /api/clinics/[id] 