import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, DayOfWeek as PrismaDayOfWeek } from '@prisma/client';
import { z } from 'zod';

// --- Esquema para validar ID en parámetros ---
const ParamsSchema = z.object({
  id: z.string().min(1, { message: "El ID de plantilla no puede estar vacío." })
});

// --- Esquema de validación para WeekSchedule (igual que en POST) ---
const TimeRangeSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido"),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido"),
});

const DayScheduleSchema = z.object({
  isOpen: z.boolean(),
  ranges: z.array(TimeRangeSchema),
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
// --- Fin Esquema WeekSchedule ---

// --- Esquema Zod para la actualización de plantillas (PUT) ---
const UpdateTemplateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio.").optional(),
  description: z.string().optional().nullable(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido").optional().nullable(),
  slotDuration: z.number().int()
      .min(5, "La duración mínima es 5 min")
      .max(60, "La duración máxima es 60 min")
      .refine(val => val % 5 === 0, { message: "La duración debe ser múltiplo de 5" })
      .optional().nullable(),
  createGranularity: z.number().int()
      .min(1, "La granularidad mínima es 1 minuto")
      .max(60, "La granularidad máxima es 60 minutos")
      .optional().nullable(),
  schedule: WeekScheduleSchema.optional(),
}).strict();
// --- Fin Esquema PUT ---

/**
 * Handler PUT para actualizar una plantilla de horario existente por su ID.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const resolvedParams = await props.params;
  console.log(`[API PUT /api/templates] Resolved params object:`, resolvedParams);
  console.log(`[API PUT /api/templates/${resolvedParams.id}] Received request`);

  const paramsValidation = ParamsSchema.safeParse(resolvedParams);
  if (!paramsValidation.success) {
    console.error(`[API PUT /api/templates/${resolvedParams.id}] Zod validation failed for ID:`, paramsValidation.error.flatten());
    console.error(`[API PUT /api/templates] Failing validation for params:`, resolvedParams);
    return NextResponse.json({ error: 'ID de plantilla inválido en la URL.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: templateId } = paramsValidation.data;

  let validatedData;
  try {
    const body = await request.json();
    console.log(`[API PUT /api/templates/${templateId}] Raw body:`, body);
    const validation = UpdateTemplateSchema.safeParse(body);
    if (!validation.success) {
      console.error(`[API PUT /api/templates/${templateId}] Zod validation failed for body:`, validation.error.format());
      return NextResponse.json({ error: 'Datos de plantilla inválidos.', details: validation.error.format() }, { status: 400 });
    }
    validatedData = validation.data;
    console.log(`[API PUT /api/templates/${templateId}] Validated body data:`, JSON.stringify(validatedData, null, 2));
  } catch (error) {
    console.error(`[API PUT /api/templates/${templateId}] Error parsing request body:`, error);
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  const { schedule, ...templateBaseUpdateData } = validatedData;

  try {
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      console.log(`[API PUT /api/templates/${templateId}] Updating base template data...`);
      const baseUpdate = await tx.scheduleTemplate.update({
        where: { id: templateId },
        data: templateBaseUpdateData,
      });
      console.log(`[API PUT /api/templates/${templateId}] Base template data updated.`);

      if (schedule) {
        console.log(`[API PUT /api/templates/${templateId}] Deleting existing blocks for template...`);
        try {
           await tx.scheduleTemplateBlock.deleteMany({ where: { templateId: templateId } });
           console.log(`[API PUT /api/templates/${templateId}] Existing blocks deleted successfully.`);
        } catch (deleteError) {
            console.error(`[API PUT /api/templates/${templateId}] Error deleting blocks:`, deleteError);
            throw new Error("Failed to delete existing schedule blocks.");
        }

        const blocksToCreate: Omit<Prisma.ScheduleTemplateBlockCreateManyInput, 'templateId'>[] = [];
        const dayMap: Record<keyof z.infer<typeof WeekScheduleSchema>, PrismaDayOfWeek> = { 
            monday: PrismaDayOfWeek.MONDAY, tuesday: PrismaDayOfWeek.TUESDAY, wednesday: PrismaDayOfWeek.WEDNESDAY, 
            thursday: PrismaDayOfWeek.THURSDAY, friday: PrismaDayOfWeek.FRIDAY, saturday: PrismaDayOfWeek.SATURDAY, 
            sunday: PrismaDayOfWeek.SUNDAY 
        };
        console.log(`[API PUT /api/templates/${templateId}] Converting schedule to blocks:`, JSON.stringify(schedule, null, 2));
        try {
            for (const dayKey in schedule) {
                const dayData = schedule[dayKey as keyof typeof schedule];
                const prismaDay = dayMap[dayKey as keyof typeof schedule];
                if (dayData.isOpen && prismaDay) {
                    dayData.ranges.forEach(range => {
                        if (range.start && range.end && range.start < range.end) {
                            blocksToCreate.push({
                                dayOfWeek: prismaDay, startTime: range.start, endTime: range.end, isWorking: true,
                            });
                        } else {
                             console.warn(`[API PUT /api/templates/${templateId}] Skipping invalid range in conversion for ${dayKey}:`, range);
                        }
                    });
                }
            }
        } catch (conversionError) {
             console.error(`[API PUT /api/templates/${templateId}] Error converting schedule to blocks:`, conversionError);
             throw new Error("Failed to process schedule data into blocks.");
        }
        
        console.log(`[API PUT /api/templates/${templateId}] Blocks prepared for creation:`, JSON.stringify(blocksToCreate, null, 2));

        if (blocksToCreate.length > 0) {
            console.log(`[API PUT /api/templates/${templateId}] Creating new blocks...`);
            try {
                const blocksWithTemplateId = blocksToCreate.map(block => ({ 
                  ...block, 
                  templateId: templateId,
                  systemId: systemId, // 🏢 NUEVO: Añadir systemId para operaciones a nivel sistema
                  clinicId: null, // 🏥 NUEVO: ScheduleTemplateBlock no está vinculado directamente a clínica específica
                }));
                await tx.scheduleTemplateBlock.createMany({ data: blocksWithTemplateId });
                console.log(`[API PUT /api/templates/${templateId}] New blocks created successfully.`);
            } catch (createError) {
                console.error(`[API PUT /api/templates/${templateId}] Error creating new blocks:`, createError);
                throw new Error("Failed to save new schedule blocks.");
            }
        }
      }

      console.log(`[API PUT /api/templates/${templateId}] Transaction part successful, fetching final template...`);
      return await tx.scheduleTemplate.findUniqueOrThrow({ 
          where: { id: templateId }, 
          include: { blocks: true }
      }); 
    });

    console.log(`[API PUT /api/templates/${templateId}] Transaction fully completed.`);
    return NextResponse.json(updatedTemplate);

  } catch (error: any) {
    console.error(`[API PUT /api/templates/${templateId}] Error caught in final catch block:`, error); 
    if (error.stack) {
      console.error("[API PUT Stack Trace]:", error.stack);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { 
          return NextResponse.json({ error: 'Plantilla no encontrada para actualizar.', code: error.code }, { status: 404 });
      }
      if (error.code === 'P2002') { 
         const target = (error.meta as any)?.target;
         const message = target ? `Ya existe otra plantilla con ${Array.isArray(target) ? target.join(' y ') : target} similar.` : 'Error de unicidad al actualizar.';
        return NextResponse.json({ error: message, code: error.code }, { status: 409 });
      }
      return NextResponse.json({ error: 'Error de base de datos conocido al actualizar.', code: error.code, meta: error.meta }, { status: 400 });
    } else if (error instanceof Prisma.PrismaClientValidationError) {
       return NextResponse.json({ error: 'Error de validación de datos de Prisma.', message: error.message }, { status: 400 });
    } else {
       return NextResponse.json({ 
           error: 'Error interno del servidor al actualizar la plantilla.', 
           message: error.message || 'Unknown error' 
       }, { status: 500 });
    }
  }
} 