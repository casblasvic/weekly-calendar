import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { WeekSchedule } from '@/types/schedule'; // Importar tipo WeekSchedule

// Esquema para validar los parámetros de la ruta y query
const ParamsSchema = z.object({
  id: z.string().cuid('ID de usuario inválido.')
});

const QuerySchema = z.object({
    clinicId: z.string().cuid('ID de clínica inválido en query params.')
});

// Esquema Zod para validar el cuerpo de la solicitud PUT (el horario)
// Se asegura que el objeto recibido tenga la estructura de WeekSchedule
const ScheduleBodySchema = z.object({
  monday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
  tuesday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
  wednesday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
  thursday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
  friday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
  saturday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
  sunday: z.object({ isOpen: z.boolean(), ranges: z.array(z.object({ start: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido"), end: z.string().regex(/^([01]\\d|2[0-3]):([0-5]\\d)$/, "Formato HH:MM inválido") })) }),
}).strict(); // .strict() para no permitir propiedades extra

/**
 * GET handler para obtener el horario personalizado de un usuario para una clínica.
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  // Validar ID de usuario de la ruta
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de usuario inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = paramsValidation.data;

  // Validar ID de clínica de los query params
  const queryValidation = QuerySchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'ID de clínica inválido o faltante en query params.', details: queryValidation.error.errors }, { status: 400 });
  }
  const { clinicId } = queryValidation.data;

  console.log(`[API GET /users/${userId}/schedule] Request for clinicId: ${clinicId}`);

  try {
    const userSchedule = await prisma.userClinicSchedule.findUnique({
      where: {
        userId_clinicId: { // Usar el índice único
          userId: userId,
          clinicId: clinicId,
        }
      },
      select: {
        scheduleJson: true,
        // Podemos incluir updatedAt si es útil para el cliente
        // updatedAt: true
      }
    });

    if (!userSchedule) {
      console.log(`[API GET /users/${userId}/schedule] No custom schedule found for clinic ${clinicId}.`);
      // Devolver null o un objeto vacío si no se encuentra horario personalizado
      // Devolver null es generalmente preferible para indicar ausencia de recurso
      return NextResponse.json(null, { status: 200 });
    }

    console.log(`[API GET /users/${userId}/schedule] Custom schedule found for clinic ${clinicId}.`);
    // Devolver solo el objeto scheduleJson
    // Asegurarse que el JSON parseado es del tipo correcto si es necesario, aunque Prisma lo devuelve como JsonValue
    return NextResponse.json(userSchedule.scheduleJson, { status: 200 });

  } catch (error) {
    console.error(`[API GET /users/${userId}/schedule] Error fetching schedule for clinic ${clinicId}:`, error);
    return NextResponse.json({ error: 'Error interno del servidor al obtener el horario.' }, { status: 500 });
  }
}

/**
 * PUT handler para crear o actualizar (upsert) el horario personalizado
 * de un usuario para una clínica específica.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());

  // Validar ID de usuario de la ruta
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de usuario inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = paramsValidation.data;

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
    // Usar el esquema Zod para validar la estructura del horario
    const bodyValidation = ScheduleBodySchema.safeParse(rawBody);
    if (!bodyValidation.success) {
      console.error(`[API PUT /users/${userId}/schedule] Zod validation failed for schedule body:`, bodyValidation.error.format());
      // Devolver detalles del error de validación Zod
      return NextResponse.json({ error: 'Datos de horario inválidos en el cuerpo.', details: bodyValidation.error.format() }, { status: 400 });
    }
    scheduleData = bodyValidation.data;
    console.log(`[API PUT /users/${userId}/schedule] Schedule body validation successful for clinic ${clinicId}.`);
  } catch (error) {
    console.error(`[API PUT /users/${userId}/schedule] Error parsing request body for clinic ${clinicId}:`, error);
    return NextResponse.json({ error: 'Error al parsear los datos del horario.' }, { status: 400 });
  }

  try {
    // Verificar que la asignación UserClinicAssignment existe antes del upsert
    // Esto previene crear horarios huérfanos si la asignación se elimina concurrentemente.
    const assignmentExists = await prisma.userClinicAssignment.findUnique({
       where: { userId_clinicId: { userId, clinicId } }
    });

    if (!assignmentExists) {
       console.warn(`[API PUT /users/${userId}/schedule] Attempted to upsert schedule for non-existent assignment (Clinic: ${clinicId}).`);
       return NextResponse.json({ error: `El usuario ${userId} no está asignado a la clínica ${clinicId}. No se puede guardar el horario.` }, { status: 404 }); // Not Found o Bad Request (400)
    }

    // Realizar un upsert: crea si no existe, actualiza si existe
    const upsertedSchedule = await prisma.userClinicSchedule.upsert({
      where: {
        userId_clinicId: { // Usar el índice único
          userId: userId,
          clinicId: clinicId,
        }
      },
      update: {
        scheduleJson: scheduleData as any, // Prisma espera Json, hacemos cast
      },
      create: {
        userId: userId,
        clinicId: clinicId,
        scheduleJson: scheduleData as any, // Prisma espera Json
        // El campo 'assignment' se relaciona automáticamente por los campos userId/clinicId
      },
      select: { // Devolver el horario guardado
          userId: true,
          clinicId: true,
          scheduleJson: true,
          updatedAt: true
      }
    });

    console.log(`[API PUT /users/${userId}/schedule] Schedule upserted successfully for clinic ${clinicId}.`);
    return NextResponse.json(upsertedSchedule, { status: 200 }); // 200 OK para upsert exitoso

  } catch (error) {
    console.error(`[API PUT /users/${userId}/schedule] Error upserting schedule for clinic ${clinicId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Manejar errores específicos de Prisma si es necesario (ej: P2003 FK constraint)
       console.error(`[API PUT /users/${userId}/schedule] Prisma Error Code: ${error.code}`);
       // Código P2003 indica violación de FK, podría ser que User o Clinic no existan
       if (error.code === 'P2003') {
           return NextResponse.json({ error: 'Error de referencia: El usuario o la clínica especificados no existen.'}, { status: 400 });
       }
       return NextResponse.json({ error: 'Error de base de datos al guardar el horario.', code: error.code }, { status: 400 });
    }
    // Capturar otros posibles errores
    if (error instanceof Error) {
        return NextResponse.json({ error: `Error interno del servidor: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al guardar el horario.' }, { status: 500 });
  }
}

// TODO: Implementar DELETE handler si se necesita la funcionalidad
// Eliminaría el registro UserClinicSchedule para revertir al horario heredado.
// export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) { ... }
