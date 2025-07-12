import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db'; // Usar cliente Prisma correcto
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión
import { parseISO, startOfDay, endOfDay, isValid } from 'date-fns';

// Esquema de validación para los parámetros de consulta GET
const getQuerySchema = z.object({
  clinicId: z.string().cuid({ message: "Clinic ID inválido." }),
  startDate: z.string().refine((date) => isValid(parseISO(date)), {
    message: "Formato de fecha de inicio inválido (yyyy-MM-dd).",
  }),
  endDate: z.string().refine((date) => isValid(parseISO(date)), {
    message: "Formato de fecha de fin inválido (yyyy-MM-dd).",
  }),
});

// Esquema de validación para el cuerpo de la solicitud POST
const postBodySchema = z.object({
  clinicId: z.string().cuid({ message: "Clinic ID inválido." }),
  cabinIds: z.array(z.string()).min(1, { message: "Debe seleccionar al menos una cabina." }),
  startDate: z.string().refine((date) => isValid(parseISO(date)), {
    message: "Formato de fecha de inicio inválido (yyyy-MM-dd).",
  }),
  endDate: z.string().optional().refine((date) => !date || isValid(parseISO(date)), {
    message: "Formato de fecha de fin inválido (yyyy-MM-dd).",
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora de inicio inválido (HH:mm).",
  }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora de fin inválido (HH:mm).",
  }),
  description: z.string().optional(),
  isRecurring: z.boolean().default(false),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  recurrenceEndDate: z.string().optional().refine((date) => !date || isValid(parseISO(date)), {
    message: "Formato de fecha de fin de recurrencia inválido (yyyy-MM-dd).",
  }),
}).refine(data => { // Validación adicional para recurrencia
    if (data.isRecurring && (!data.daysOfWeek || data.daysOfWeek.length === 0)) {
        return false; // Si es recurrente, debe tener días de semana
    }
    if (data.isRecurring && !data.recurrenceEndDate) {
        return false; // Si es recurrente, debe tener fecha fin de recurrencia
    }
    return true;
}, { message: "Los bloqueos recurrentes deben incluir días de la semana y fecha de fin de recurrencia." })
 .refine(data => { // Validación hora fin > hora inicio
    return data.endTime > data.startTime;
 }, { message: "La hora de fin debe ser posterior a la hora de inicio." })
 .refine(data => { // Validación fecha fin >= fecha inicio si existen ambas
    if (data.startDate && data.endDate) {
        return parseISO(data.endDate) >= parseISO(data.startDate);
    }
    return true;
 }, { message: "La fecha de fin debe ser igual o posterior a la fecha de inicio." })
 .refine(data => { // Validación fecha fin recurrencia >= fecha inicio
    if (data.isRecurring && data.recurrenceEndDate && data.startDate) {
        return parseISO(data.recurrenceEndDate) >= parseISO(data.startDate);
    }
    return true;
 }, { message: "La fecha de fin de recurrencia debe ser igual o posterior a la fecha de inicio." });


export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      clinicId: searchParams.get('clinicId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    };

    const validationResult = getQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Parámetros de consulta inválidos", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { clinicId, startDate, endDate } = validationResult.data;

    // Verificar que la clínica pertenece al sistema del usuario
    const clinic = await prisma.clinic.findFirst({
        where: { id: clinicId, systemId: systemId },
        select: { id: true } // Solo necesitamos confirmar que existe
    });
    if (!clinic) {
        return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a este sistema.' }, { status: 404 });
    }

    // Convertir fechas a objetos Date de solo fecha (UTC 00:00:00)
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate)); // Usar endOfDay para incluir todo el último día

    console.log(`[API Overrides GET] Querying for clinic ${clinicId} (System: ${systemId}) between ${start.toISOString()} and ${end.toISOString()}`);

    const overrides = await prisma.cabinScheduleOverride.findMany({
      where: {
        clinicId: clinicId, // Ya hemos verificado que esta clínica es del systemId correcto
        // <<< NUEVA LÓGICA PARA NON-RECURRING >>>
        isRecurring: false, // Por ahora, solo obtener no recurrentes
        OR: [
          // Caso 1: Bloqueo de un solo día (endDate es NULL) DENTRO del rango consultado
          {
            endDate: null,
            startDate: { 
              gte: start, // Empieza en o después del inicio del rango
              lte: end    // Empieza en o antes del final del rango
            }
          },
          // Caso 2: Bloqueo de varios días (endDate NO es NULL) que SOLAPA con el rango consultado
          {
            endDate: { not: null },
            // Solapa si NO (termina antes de empezar O empieza después de terminar)
            NOT: [
              { endDate: { lt: start } }, 
              { startDate: { gt: end } }
            ]
          }
        ]
        // <<< FIN NUEVA LÓGICA >>>
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    return NextResponse.json(overrides);

  } catch (error) {
    console.error("Error fetching cabin schedule overrides:", error);
    return NextResponse.json({ message: "Error interno del servidor al obtener bloqueos." }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    const body = await request.json();
    const validationResult = postBodySchema.safeParse(body);

    if (!validationResult.success) {
      console.error("Validation Errors:", validationResult.error.flatten());
      return NextResponse.json(
        { message: "Datos del bloqueo inválidos", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

     // Verificar que la clínica pertenece al sistema del usuario
    const clinic = await prisma.clinic.findFirst({
        where: { id: data.clinicId, systemId: systemId },
        select: { id: true } // Solo necesitamos confirmar que existe
    });
    if (!clinic) {
        return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a este sistema.' }, { status: 404 });
    }
    
    // Verificar que TODAS las cabinas pertenecen a la clínica especificada
    const cabins = await prisma.cabin.findMany({
        where: {
            id: { in: data.cabinIds },
            clinicId: data.clinicId // Asegurar que son de la clínica validada
        },
        select: { id: true }
    });
    if (cabins.length !== data.cabinIds.length) {
        return NextResponse.json({ message: 'Una o más cabinas no pertenecen a la clínica especificada.' }, { status: 400 });
    }


    // Convertir fechas a objetos Date (UTC)
    const startDate = startOfDay(parseISO(data.startDate));
    // Si no hay endDate (bloqueo de un solo día), guardarlo como null.
    const endDate = data.endDate ? startOfDay(parseISO(data.endDate)) : null;
    const recurrenceEndDate = data.recurrenceEndDate ? startOfDay(parseISO(data.recurrenceEndDate)) : null;


    const newOverride = await prisma.cabinScheduleOverride.create({
      data: {
        clinicId: data.clinicId, // Clínica ya validada
        systemId: systemId, // 🏢 NUEVO: Añadir systemId para operaciones a nivel sistema
        cabinIds: data.cabinIds, // Cabinas ya validadas
        startDate: startDate,
        endDate: endDate, // Guardar null si no se proporciona
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
        isRecurring: data.isRecurring,
        daysOfWeek: data.isRecurring ? data.daysOfWeek : [], // Guardar array vacío si no es recurrente
        recurrenceEndDate: data.isRecurring ? recurrenceEndDate : null, // Guardar null si no es recurrente
      },
    });

    return NextResponse.json(newOverride, { status: 201 });

  } catch (error: any) {
    console.error("Error creating cabin schedule override:", error);
     if (error.code === 'P2002') { // Error de constraint único (si lo hubiera)
        return NextResponse.json({ message: "Ya existe un bloqueo con estas características." }, { status: 409 }); // Conflict
    }
    if (error instanceof z.ZodError) { // Añadir manejo Zod Error
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) { // Añadir manejo SyntaxError
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: "Error interno del servidor al crear el bloqueo." }, { status: 500 });
  }
}
