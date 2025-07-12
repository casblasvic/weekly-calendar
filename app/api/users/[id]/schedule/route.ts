import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import type { WeekSchedule } from '@/types/schedule'; // Importar tipo WeekSchedule
import { getServerAuthSession } from "@/lib/auth";

// <<< INICIO: Definiciones de tipos locales >>>
// (Basadas en la estructura usada y devuelta por la API)
type FranjaHoraria = {
  id: string; // Opcional, o generar en conversión
  inicio: string;
  fin: string;
};

type HorarioDia = {
  dia: 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  activo: boolean;
  franjas: FranjaHoraria[];
};

type HorarioSemanal = {
  clinicaId: string;
  dias: HorarioDia[];
};
// <<< FIN: Definiciones de tipos locales >>>

// Esquema para validar los parámetros de la ruta y query
const ParamsSchema = z.object({
  id: z.string().cuid('ID de usuario inválido.')
});

const QuerySchema = z.object({
    clinicId: z.string().cuid('ID de clínica inválido en query params.')
});

// Esquema Zod para validar el cuerpo de la solicitud PUT (el horario)
// Se asegura que el objeto recibido tenga la estructura de WeekSchedule
// CORREGIDO: Hacer que el esquema coincida exactamente con WeekSchedule (campos no opcionales)
const DayScheduleSchema = z.object({
  isOpen: z.boolean(),
  ranges: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido en start"),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido en end")
  }))
});

const ScheduleBodySchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema
});

// --- NUEVA FUNCIÓN DE CONVERSIÓN ---
const convertWeekScheduleToHorarioSemanal = (
  schedule: WeekSchedule | null,
  clinicId: string,
  userId: string // Opcional: para generar IDs únicos si es necesario
): HorarioSemanal | null => {
  if (!schedule) {
    console.log(`[convertWeekScheduleToHorarioSemanal] Input schedule is null for clinic ${clinicId}. Returning null.`);
    return null;
  }

  const weekDaysMap: { [key in keyof WeekSchedule]: HorarioDia['dia'] } = {
    monday: 'lunes',
    tuesday: 'martes',
    wednesday: 'miercoles',
    thursday: 'jueves',
    friday: 'viernes',
    saturday: 'sabado',
    sunday: 'domingo',
  };

  const dias: HorarioDia[] = Object.entries(schedule)
    .map(([dayKey, daySchedule]) => {
      const diaNombre = weekDaysMap[dayKey as keyof WeekSchedule];
      if (!diaNombre) {
        console.warn(`[convertWeekScheduleToHorarioSemanal] Invalid day key encountered: ${dayKey}`);
        return null; // O manejar de otra forma
      }

      // Crear franjas con IDs únicos (simples por ahora)
      const franjas: FranjaHoraria[] = daySchedule.ranges.map((range, index) => ({
        // Generar un ID simple. Podría ser más robusto si se necesita.
        id: `${userId}-${clinicId}-${diaNombre}-${index}-${range.start}-${range.end}`,
        inicio: range.start,
        fin: range.end,
      }));

      return {
        dia: diaNombre,
        activo: daySchedule.isOpen,
        franjas: franjas,
      };
    })
    .filter((dia): dia is HorarioDia => dia !== null); // Filtrar posibles nulos

  // Ordenar los días si es necesario (opcional)
  const ordenDias: HorarioDia['dia'][] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  dias.sort((a, b) => ordenDias.indexOf(a.dia) - ordenDias.indexOf(b.dia));

  const resultado: HorarioSemanal = { clinicaId: clinicId, dias };
  console.log(`[convertWeekScheduleToHorarioSemanal] Conversion successful for clinic ${clinicId}. Result:`, JSON.stringify(resultado, null, 2));
  return resultado;
};
// --- FIN NUEVA FUNCIÓN ---

/**
 * GET handler para obtener el horario personalizado de un usuario para una clínica.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const paramsValidation = ParamsSchema.safeParse(await props.params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de usuario inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = paramsValidation.data;
  
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  // Validar ID de clínica de los query params
  const queryValidation = QuerySchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'ID de clínica inválido o faltante en query params.', details: queryValidation.error.errors }, { status: 400 });
  }
  const { clinicId } = queryValidation.data;

  console.log(`[API GET /users/${userId}/schedule] Request for clinicId: ${clinicId}`);

  try {
    const userScheduleData = await prisma.userClinicSchedule.findUnique({ // Renombrado para claridad
      where: {
        userId_clinicId: {
          userId: userId,
          clinicId: clinicId,
        }
      },
      select: {
        scheduleJson: true, // Obtener el JSON directamente
      }
    });

    if (!userScheduleData || !userScheduleData.scheduleJson) {
      console.log(`[API GET /users/${userId}/schedule] No custom schedule found or scheduleJson is empty for clinic ${clinicId}. Returning 200 OK with null body.`);
      // Devolver 200 OK con null como cuerpo para indicar que no se encontró horario
      return NextResponse.json(null, { status: 200 }); 
    }

    console.log(`[API GET /users/${userId}/schedule] Custom schedule found (raw JSON) for clinic ${clinicId}. Validating and converting...`);

    // --- Validar el JSON recuperado con Zod ---
    const scheduleValidation = ScheduleBodySchema.safeParse(userScheduleData.scheduleJson);

    if (!scheduleValidation.success) {
      console.error(`[API GET /users/${userId}/schedule] Validation failed for stored scheduleJson (does not match WeekSchedule format):`, scheduleValidation.error.format(), "Raw Data:", userScheduleData.scheduleJson);
      // Si la validación falla, significa que los datos en la BD están corruptos o en un formato inesperado.
      return NextResponse.json({ error: 'El formato del horario almacenado es inválido.' }, { status: 500 });
    }

    // --- Si la validación pasa, sabemos que es WeekSchedule ---
    const validWeekSchedule = scheduleValidation.data;
    console.log(`[API GET /users/${userId}/schedule] Stored scheduleJson validated successfully as WeekSchedule.`);


    // --- Realizar la conversión a HorarioSemanal ---
    const horarioSemanal = convertWeekScheduleToHorarioSemanal(
      validWeekSchedule as WeekSchedule,
      clinicId,
      userId
    );

    if (!horarioSemanal) {
       console.error(`[API GET /users/${userId}/schedule] Failed to convert validated WeekSchedule to HorarioSemanal for clinic ${clinicId}.`);
       return NextResponse.json({ error: 'Error interno al convertir el formato del horario.' }, { status: 500 });
    }

    // --- Devolver el formato HorarioSemanal convertido ---
    console.log(`[API GET /users/${userId}/schedule] Returning converted schedule (HorarioSemanal format) for clinic ${clinicId}.`);
    return NextResponse.json(horarioSemanal, { status: 200 });

  } catch (error) {
    console.error(`[API GET /users/${userId}/schedule] Error fetching or processing schedule for clinic ${clinicId}:`, error);
    if (error instanceof Error) {
       return NextResponse.json({ error: `Error interno del servidor al obtener el horario: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al obtener el horario.' }, { status: 500 });
  }
}

/**
 * PUT handler para crear o actualizar (upsert) el horario personalizado
 * de un usuario para una clínica específica.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  // 🔐 AUTENTICACIÓN: Obtener systemId de la sesión
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const paramsValidation = ParamsSchema.safeParse(await props.params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de usuario inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = paramsValidation.data;

  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  // Validar ID de clínica de los query params
  const queryValidation = QuerySchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'ID de clínica inválido o faltante en query params.', details: queryValidation.error.errors }, { status: 400 });
  }
  const { clinicId } = queryValidation.data;

  console.log(`[API PUT /users/${userId}/schedule] Request for clinicId: ${clinicId}`);

  // Validar el cuerpo de la solicitud (scheduleJson)
  let scheduleData: WeekSchedule;
  try {
    const rawBody = await request.json();
    console.log(`[API PUT /users/${userId}/schedule] Received raw body for clinic ${clinicId}:`, JSON.stringify(rawBody));
    const bodyValidation = ScheduleBodySchema.safeParse(rawBody);
    if (!bodyValidation.success) {
      console.error(`[API PUT /users/${userId}/schedule] Zod validation failed for schedule body:`, bodyValidation.error.format());
      return NextResponse.json({ error: 'Datos de horario inválidos en el cuerpo.', details: bodyValidation.error.format() }, { status: 400 });
    }
    scheduleData = bodyValidation.data as WeekSchedule;
    console.log(`[API PUT /users/${userId}/schedule] Schedule body validation successful for clinic ${clinicId}.`);
  } catch (error) {
    console.error(`[API PUT /users/${userId}/schedule] Error parsing request body for clinic ${clinicId}:`, error);
    return NextResponse.json({ error: 'Error al parsear los datos del horario.' }, { status: 400 });
  }

  try {
    const assignmentExists = await prisma.userClinicAssignment.findUnique({
       where: { 
           userId_clinicId: { 
               userId: userId, 
               clinicId: clinicId 
            } 
        }
    });

    if (!assignmentExists) {
       console.warn(`[API PUT /users/${userId}/schedule] Attempted to upsert schedule for non-existent assignment (Clinic: ${clinicId}).`);
       return NextResponse.json({ error: `El usuario ${userId} no está asignado a la clínica ${clinicId}. No se puede guardar el horario.` }, { status: 404 });
    }

    const upsertedSchedule = await prisma.userClinicSchedule.upsert({
      where: {
        userId_clinicId: { 
          userId: userId,
          clinicId: clinicId,
        }
      },
      update: {
        scheduleJson: scheduleData as any,
        systemId: systemId, // 🏢 NUEVO: Actualizar systemId en caso de que no existiera
      },
      create: {
        userId: userId,
        clinicId: clinicId,
        systemId: systemId, // 🏢 NUEVO: Añadir systemId para operaciones a nivel sistema
        scheduleJson: scheduleData as any,
      },
      select: { 
        userId: true,
        clinicId: true,
        scheduleJson: true,
        updatedAt: true
      }
    });

    console.log(`[API PUT /users/${userId}/schedule] Schedule upserted successfully for clinic ${clinicId}.`);
    return NextResponse.json(upsertedSchedule, { status: 200 });

  } catch (error) {
    console.error(`[API PUT /users/${userId}/schedule] Error upserting schedule for clinic ${clinicId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       console.error(`[API PUT /users/${userId}/schedule] Prisma Error Code: ${error.code}`);
       if (error.code === 'P2003') {
           return NextResponse.json({ error: 'Error de referencia: El usuario o la clínica especificados no existen.'}, { status: 400 });
       }
       return NextResponse.json({ error: 'Error de base de datos al guardar el horario.', code: error.code }, { status: 400 });
    }
    if (error instanceof Error) {
        return NextResponse.json({ error: `Error interno del servidor: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al guardar el horario.' }, { status: 500 });
  }
}

// TODO: Implementar DELETE handler si se necesita la funcionalidad
// Eliminaría el registro UserClinicSchedule para revertir al horario heredado.
// export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) { ... }
