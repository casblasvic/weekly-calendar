import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, DayOfWeek as PrismaDayOfWeek } from '@prisma/client'; // Importar Prisma namespace y Enum
import { z } from 'zod'; // Importar Zod
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión

/**
 * Handler GET para obtener todas las plantillas de horario DEL SISTEMA ACTUAL.
 * Incluye los bloques asociados a cada plantilla.
 */
export async function GET(request: Request) {
  console.log("[API GET /api/templates] Received request");
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      console.error("[API GET /api/templates] Unauthorized access attempt.");
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;
  console.log(`[API GET /api/templates] Authorized for systemId: ${systemId}`);

  try {
    console.log(`[API GET /api/templates] Fetching schedule templates for system ${systemId}...`);
    const templates = await prisma.scheduleTemplate.findMany({
      where: { systemId: systemId }, // <<< Filtrar por systemId de la sesión
      include: {
        blocks: true, // Asegurarse de incluir los bloques relacionados
      },
      orderBy: {
        name: 'asc',
      }
    });

    console.log(`[API GET /api/templates] Found ${templates.length} templates for system ${systemId}.`);

    return NextResponse.json(templates);

  } catch (error: any) {
    console.error("[API GET /api/templates] Error fetching schedule templates:", error);
    
    // Manejo específico de errores de Prisma si es necesario
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`[API GET /api/templates] Prisma Known Error Code: ${error.code}`);
      return NextResponse.json({ error: 'Database error occurred while fetching templates.', code: error.code }, { status: 500 });
    } else if (error instanceof Prisma.PrismaClientValidationError) {
       console.error(`[API GET /api/templates] Prisma Validation Error:`, error.message);
       return NextResponse.json({ error: 'Database validation error.', message: error.message }, { status: 500 });
    }
    
    // Error genérico
    return NextResponse.json({ error: 'Failed to fetch schedule templates.', message: error.message || 'Unknown error' }, { status: 500 });
  }
}

// --- Esquema de validación para WeekSchedule (si no está importado) ---
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

// --- Esquema Zod para la creación de plantillas (POST) - SIN systemId ---
const CreateTemplateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  description: z.string().optional().nullable(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido para openTime").optional().nullable(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido para closeTime").optional().nullable(),
  slotDuration: z.number().int()
      .min(5, "La duración mínima es 5 min")
      .max(60, "La duración máxima es 60 min")
      .refine(val => val % 5 === 0, { message: "La duración debe ser múltiplo de 5" })
      .optional().nullable(),
  schedule: WeekScheduleSchema,
}).strict();
// --- Fin Esquema POST ---

// --- POST Handler - Corregido --- 
export async function POST(request: Request) {
  console.log("[API POST /api/templates] Received request");
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      console.error("[API POST /api/templates] Unauthorized access attempt.");
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId; // <<< OBTENER systemId DE LA SESIÓN
  console.log(`[API POST /api/templates] Authorized for systemId: ${systemId}`);

  let validatedData;
  try {
    const body = await request.json();
    console.log("[API POST /api/templates] Raw body:", body);
    // --- TEMPORAL: Log para ver si falta systemId --- 
    // console.log("[API POST /api/templates] Checking for systemId in body:", body.systemId); // Ya no es relevante
    // --- FIN TEMPORAL --- 
    const validation = CreateTemplateSchema.safeParse(body); // Usar schema sin systemId
    if (!validation.success) {
      console.error("[API POST /api/templates] Zod validation failed:", validation.error.format());
      return NextResponse.json({ error: 'Datos de plantilla inválidos.', details: validation.error.format() }, { status: 400 });
    }
    validatedData = validation.data;
    console.log("[API POST /api/templates] Zod validation successful.");
  } catch (error) {
    console.error("[API POST /api/templates] Error parsing request body:", error);
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // // --- Asegurarse de que systemId está presente --- // <<< ELIMINADO, se usa el de la sesión
  // if (!validatedData.systemId) {
  //     console.error("[API POST /api/templates] Critical: systemId is missing after validation.");
  //     return NextResponse.json({ error: 'Falta el ID del sistema en la solicitud.' }, { status: 400 });
  // }
  // // --- Fin chequeo systemId --- 

  const { schedule, ...templateBaseData } = validatedData; // Ya no contiene systemId

  // Convertir WeekSchedule a bloques de Prisma
  const blocksToCreate: Omit<Prisma.ScheduleTemplateBlockCreateManyInput, 'templateId'>[] = [];
  const dayMap: Record<keyof z.infer<typeof WeekScheduleSchema>, PrismaDayOfWeek> = {
      monday: PrismaDayOfWeek.MONDAY,
      tuesday: PrismaDayOfWeek.TUESDAY,
      wednesday: PrismaDayOfWeek.WEDNESDAY,
      thursday: PrismaDayOfWeek.THURSDAY,
      friday: PrismaDayOfWeek.FRIDAY,
      saturday: PrismaDayOfWeek.SATURDAY,
      sunday: PrismaDayOfWeek.SUNDAY,
  };

  for (const dayKey in schedule) {
      const dayData = schedule[dayKey as keyof typeof schedule];
      const prismaDay = dayMap[dayKey as keyof typeof schedule];
      if (dayData.isOpen && prismaDay) {
          dayData.ranges.forEach(range => {
              if (range.start && range.end && range.start < range.end) { 
                  blocksToCreate.push({
                      dayOfWeek: prismaDay,
                      startTime: range.start,
                      endTime: range.end,
                      isWorking: true,
                  });
              } else {
                  console.warn(`[API POST /api/templates] Skipping invalid or non-chronological range for ${dayKey}:`, range);
              }
          });
      }
  }

  console.log(`[API POST /api/templates] Prepared ${blocksToCreate.length} blocks for creation.`);

  // Crear plantilla y bloques en una transacción
  try {
    console.log("[API POST /api/templates] Starting transaction...");
    const newTemplate = await prisma.$transaction(async (tx) => {
      console.log("[API POST /api/templates] Creating ScheduleTemplate entry...");
      const createdTemplate = await tx.scheduleTemplate.create({
        data: {
          ...templateBaseData,
          systemId: systemId, // <<< Usar el systemId de la SESIÓN
        },
      });
      console.log(`[API POST /api/templates] Template created with ID: ${createdTemplate.id}`);

      if (blocksToCreate.length > 0) {
        console.log("[API POST /api/templates] Creating ScheduleTemplateBlock entries...");
        const blocksWithTemplateId = blocksToCreate.map(block => ({ ...block, templateId: createdTemplate.id }));
        await tx.scheduleTemplateBlock.createMany({
          data: blocksWithTemplateId,
        });
        console.log("[API POST /api/templates] Blocks created.");
      }

      return await tx.scheduleTemplate.findUniqueOrThrow({ 
          where: { id: createdTemplate.id },
          include: { blocks: true }
      });
    });

    console.log("[API POST /api/templates] Transaction successful.");
    return NextResponse.json(newTemplate, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error("[API POST /api/templates] Error during transaction:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
         const target = (error.meta as any)?.target;
         const message = target 
           ? `Ya existe una plantilla con ${Array.isArray(target) ? target.join(' y ') : target} similar.`
           : 'Ya existe una plantilla con ese nombre o identificador.';
        return NextResponse.json({ error: message, code: error.code }, { status: 409 }); // 409 Conflict
      }
      return NextResponse.json({ error: 'Error de base de datos conocido al crear la plantilla.', code: error.code, meta: error.meta }, { status: 400 });
    } else if (error instanceof Prisma.PrismaClientValidationError) {
       return NextResponse.json({ error: 'Error de validación de datos de Prisma.', message: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) { // Añadir manejo Zod Error
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) { // Añadir manejo SyntaxError
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear la plantilla.', message: error.message || 'Unknown error' }, { status: 500 });
  }
}
// --- Fin POST Handler ---

// TODO: Implementar POST, PUT, DELETE si es necesario para gestionar plantillas desde la UI. 