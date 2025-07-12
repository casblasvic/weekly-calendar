import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import type { WeekSchedule } from '@/types/schedule'; // Asumiendo que WeekSchedule está aquí
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { getServerAuthSession } from "@/lib/auth";

// --- Esquemas Zod para Validación ---
const RouteParamsSchema = z.object({
  id: z.string().cuid('ID de usuario inválido.'),
});

const GetQueryParamsSchema = z.object({
  clinicId: z.string().cuid('ID de clínica inválido en query params.'),
});

// Esquema para validar el horario (WeekSchedule) - Igual que en schedule/route.ts
const DayScheduleSchema = z.object({
  isOpen: z.boolean(),
  ranges: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido en start"),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM inválido en end")
  }))
});

const WeekScheduleSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema
});

// Esquema para validar el cuerpo de POST/PUT (datos de la excepción)
const ExceptionBodySchema = z.object({
  name: z.string().optional().nullable(),
  startDate: z.coerce.date(), // Coercionar string a Date
  endDate: z.coerce.date(),   // Coercionar string a Date
  scheduleJson: WeekScheduleSchema // Validar la estructura del horario
});

// Esquema para parámetros query en PUT/DELETE
const ModifyQueryParamsSchema = z.object({
  clinicId: z.string().cuid('ID de clínica inválido en query params.'),
  exceptionId: z.string().cuid('ID de excepción inválido en query params.'),
});

// --- FIN Esquemas Zod ---

/**
 * GET handler para obtener las excepciones horarias de un usuario para una clínica.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const paramsValidation = RouteParamsSchema.safeParse(await params);
  if (!paramsValidation.success) {
    console.error("[API GET /users/exceptions] Error validando params:", paramsValidation.error.format());
    return NextResponse.json({ error: 'ID de usuario inválido en la ruta.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = paramsValidation.data;

  // Validar ID de clínica de los query params
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryValidation = GetQueryParamsSchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'ID de clínica inválido o faltante en query params.', details: queryValidation.error.errors }, { status: 400 });
  }
  const { clinicId } = queryValidation.data;

  console.log(`[API_USER_EXCEPTIONS_GET] Buscando excepciones para Usuario: ${userId}, Clínica: ${clinicId}`);

  try {
    const exceptions = await prisma.userClinicScheduleException.findMany({
      where: {
        assignment: {
          userId: userId,
          clinicId: clinicId,
        }
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    if (exceptions.length === 0) {
        console.log(`[API_USER_EXCEPTIONS_GET] No se encontraron excepciones para Usuario: ${userId}, Clínica: ${clinicId}`);
        return NextResponse.json([], { status: 200 }); // Devolver array vacío con status 200 en lugar de 404
    }

    // Formatear fechas a string YYYY-MM-DD para el frontend
    const formattedExceptions = exceptions.map(exc => ({
      ...exc,
      startDate: exc.startDate.toISOString().split('T')[0],
      endDate: exc.endDate.toISOString().split('T')[0],
      scheduleJson: exc.scheduleJson ?? {}
    }));

    return NextResponse.json(formattedExceptions);

  } catch (error) {
    console.error(`[API_USER_EXCEPTIONS_GET] Error fetching exceptions for user ${userId}, clinic ${clinicId}:`, error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener las excepciones' },
      { status: 500 }
    );
  }
} 

// --- INICIO: Handler POST para crear excepciones --- 
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 🔐 AUTENTICACIÓN: Obtener systemId de la sesión
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  try {
    // 1. Validar parámetros de ruta (userId)
    const routeParamsValidation = RouteParamsSchema.safeParse(params);
    if (!routeParamsValidation.success) {
      console.error(
        "[API Users Exceptions POST] Error de validación de parámetros de ruta:",
        routeParamsValidation.error.format()
      );
      return NextResponse.json(
        { message: "ID de usuario inválido", errors: routeParamsValidation.error.format() },
        { status: 400 }
      );
    }
    const userId = routeParamsValidation.data.id;

    // 2. Validar Query Params (clinicId)
    const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const queryValidation = GetQueryParamsSchema.safeParse(queryParams);
    if (!queryValidation.success) {
        console.error(
          "[API Users Exceptions POST] Error de validación de query params (clinicId):",
          queryValidation.error.format()
        );
      return NextResponse.json(
          { message: 'ID de clínica inválido o faltante en query params.', errors: queryValidation.error.errors },
          { status: 400 }
      );
    }
    const { clinicId } = queryValidation.data;

    // 3. Validar cuerpo de la petición (datos de la excepción)
    const body = await request.json();
    const bodyValidation = ExceptionBodySchema.safeParse(body);

    if (!bodyValidation.success) {
      console.error(
        "[API Users Exceptions POST] Error de validación del cuerpo:",
        bodyValidation.error.format()
      );
      return NextResponse.json(
        { message: "Datos de excepción inválidos", errors: bodyValidation.error.format() },
        { status: 400 }
      );
    }
    // Extraer solo los datos de la excepción del cuerpo validado
    const { name, startDate, endDate, scheduleJson } = bodyValidation.data;

    console.log(
      `[API Users Exceptions POST] Recibido para userId: ${userId}, clinicId: ${clinicId}, fecha inicio: ${startDate}`
    );

    // 4. Buscar la asignación específica del usuario a la clínica
    const assignment = await prisma.userClinicAssignment.findUnique({
      where: {
        userId_clinicId: {
          userId: userId,
          clinicId: clinicId,
        },
      },
    });

    if (!assignment) {
      console.warn(
        `[API Users Exceptions POST] No se encontró asignación para userId: ${userId} y clinicId: ${clinicId}`
      );
      return NextResponse.json(
        { message: "El usuario no está asignado a esta clínica." },
        { status: 404 } 
      );
    }

    console.log(
      `[API Users Exceptions POST] Asignación encontrada para User: ${assignment.userId}, Clinic: ${assignment.clinicId}`
    );

    // 5. Crear la excepción usando el ID de la asignación y los datos del cuerpo
    const newException = await prisma.userClinicScheduleException.create({
      data: {
        // Listar campos explícitamente desde bodyValidation.data
        name: bodyValidation.data.name, 
        startDate: bodyValidation.data.startDate,
        endDate: bodyValidation.data.endDate,
        scheduleJson: bodyValidation.data.scheduleJson,
        systemId: systemId, // 🏢 NUEVO: Añadir systemId para operaciones a nivel sistema
        // Conectar DIRECTAMENTE a user y clinic además de la asignación
        user: {
          connect: { id: userId }
        },
        clinic: {
          connect: { id: clinicId }
        },
        // Conectar a la asignación específica
        assignment: {
          connect: { 
            userId_clinicId: { 
              userId: userId, 
              clinicId: clinicId 
            }
          },
        },
      },
    });

    console.log(
      "[API Users Exceptions POST] Excepción creada con éxito:",
      newException.id
    );
    // Formatear la respuesta para devolver fechas como string YYYY-MM-DD
     const formattedException = {
      ...newException,
      startDate: newException.startDate.toISOString().split('T')[0],
      endDate: newException.endDate.toISOString().split('T')[0],
      scheduleJson: newException.scheduleJson ?? {} // Asegurar que no sea null
    };

    return NextResponse.json(formattedException, { status: 201 });

  } catch (error) {
    console.error("[API Users Exceptions POST] Error:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
          // Podría ser por fechas solapadas si hubiera un índice único complejo,
          // pero más probablemente por el índice `assignmentId_startDate_endDate_unique` (si existe)
          // O si intentamos crear una excepción con el mismo nombre y rango para la misma asignación.
        return NextResponse.json(
          { message: "Conflicto al crear la excepción. Verifique que no exista una excepción similar o solapada." },
          { status: 409 } // Conflict
        );
      }
      // Puedes añadir más códigos de error de Prisma aquí si es necesario
      console.error(`[API Users Exceptions POST] Prisma Error Code: ${error.code}`, error.message);
    } else if (error instanceof z.ZodError) {
        // Este bloque podría no alcanzarse si las validaciones de Zod se manejan antes,
        // pero es bueno tenerlo por si acaso.
        console.error("[API Users Exceptions POST] Zod Error:", error.format());
        return NextResponse.json(
          { message: "Error de validación Zod.", errors: error.format() },
          { status: 400 }
        );
    }

    // Otros errores
    return NextResponse.json(
      { message: "Error interno del servidor al crear la excepción" },
      { status: 500 }
    );
  }
}
// --- FIN: Handler POST ---

// --- INICIO: Handler PUT para actualizar excepciones ---
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // 🔐 AUTENTICACIÓN: Obtener systemId de la sesión
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  // Validar ID de usuario de la ruta
  const routeParamsValidation = RouteParamsSchema.safeParse(params);
  if (!routeParamsValidation.success) {
    return NextResponse.json({ error: 'ID de usuario inválido en la ruta.', details: routeParamsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = routeParamsValidation.data;

  // Validar IDs de clínica y excepción de los query params
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryValidation = ModifyQueryParamsSchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'IDs de clínica y/o excepción inválidos o faltantes en query params.', details: queryValidation.error.errors }, { status: 400 });
  }
  const { clinicId, exceptionId } = queryValidation.data;

  console.log(`[API_USER_EXCEPTIONS_PUT] Actualizando excepción ID: ${exceptionId} para Usuario: ${userId}, Clínica: ${clinicId}`);

  // Validar el cuerpo de la solicitud
  let exceptionData: z.infer<typeof ExceptionBodySchema>;
  try {
    const rawBody = await request.json();
    const bodyValidation = ExceptionBodySchema.safeParse(rawBody);
    if (!bodyValidation.success) {
      console.error(`[API_USER_EXCEPTIONS_PUT] Zod validation failed for exception body:`, bodyValidation.error.format());
      return NextResponse.json({ error: 'Datos de excepción inválidos en el cuerpo.', details: bodyValidation.error.format() }, { status: 400 });
    }
    exceptionData = bodyValidation.data;
    console.log(`[API_USER_EXCEPTIONS_PUT] Body validation successful.`);

    // Validación adicional de fechas
    if (exceptionData.startDate > exceptionData.endDate) {
      return NextResponse.json({ error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' }, { status: 400 });
    }

  } catch (error) {
    console.error(`[API_USER_EXCEPTIONS_PUT] Error parsing request body:`, error);
    return NextResponse.json({ error: 'Error al parsear los datos de la excepción.' }, { status: 400 });
  }

  try {
    const updatedException = await prisma.userClinicScheduleException.update({
      where: {
        id: exceptionId,
      },
      data: {
        name: exceptionData.name,
        startDate: exceptionData.startDate,
        endDate: exceptionData.endDate,
        scheduleJson: exceptionData.scheduleJson as any,
        systemId: systemId, // 🏢 NUEVO: Actualizar systemId en caso de que no existiera
      },
    });

    console.log(`[API_USER_EXCEPTIONS_PUT] Excepción ID: ${updatedException.id} actualizada.`);

    // Formatear fechas antes de devolver
    const formattedException = {
        ...updatedException,
        startDate: updatedException.startDate.toISOString().split('T')[0],
        endDate: updatedException.endDate.toISOString().split('T')[0],
    };

    return NextResponse.json(formattedException, { status: 200 });

  } catch (error) {
    console.error(`[API_USER_EXCEPTIONS_PUT] Error updating exception ${exceptionId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Si el error es 'Record to update not found', devolver 404
       if (error.code === 'P2025') {
           return NextResponse.json({ error: `No se encontró la excepción con ID ${exceptionId} para este usuario/clínica.` }, { status: 404 });
       }
       console.error(`[API_USER_EXCEPTIONS_PUT] Prisma Error Code: ${error.code}`);
       return NextResponse.json({ error: 'Error de base de datos al actualizar la excepción.', code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la excepción.' }, { status: 500 });
  }
}
// --- FIN: Handler PUT ---

// --- INICIO: Handler DELETE para eliminar excepciones ---
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
   // Validar ID de usuario de la ruta
  const routeParamsValidation = RouteParamsSchema.safeParse(params);
  if (!routeParamsValidation.success) {
    return NextResponse.json({ error: 'ID de usuario inválido en la ruta.', details: routeParamsValidation.error.errors }, { status: 400 });
  }
  const { id: userId } = routeParamsValidation.data;

  // Validar IDs de clínica y excepción de los query params
  const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const queryValidation = ModifyQueryParamsSchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'IDs de clínica y/o excepción inválidos o faltantes en query params.', details: queryValidation.error.errors }, { status: 400 });
  }
  const { clinicId, exceptionId } = queryValidation.data;

  console.log(`[API_USER_EXCEPTIONS_DELETE] Eliminando excepción ID: ${exceptionId} para Usuario: ${userId}, Clínica: ${clinicId}`);

  try {
    await prisma.userClinicScheduleException.delete({
      where: {
        id: exceptionId,
      },
    });

    console.log(`[API_USER_EXCEPTIONS_DELETE] Excepción ID: ${exceptionId} eliminada.`);
    return NextResponse.json({ message: 'Excepción eliminada correctamente.' }, { status: 200 }); // O 204 No Content

  } catch (error) {
    console.error(`[API_USER_EXCEPTIONS_DELETE] Error deleting exception ${exceptionId}:`, error);
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
       // Si el error es 'Record to delete not found', devolver 404
       if (error.code === 'P2025') {
           return NextResponse.json({ error: `No se encontró la excepción con ID ${exceptionId} para este usuario/clínica.` }, { status: 404 });
       }
       console.error(`[API_USER_EXCEPTIONS_DELETE] Prisma Error Code: ${error.code}`);
       return NextResponse.json({ error: 'Error de base de datos al eliminar la excepción.', code: error.code }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar la excepción.' }, { status: 500 });
  }
}
// --- FIN: Handler DELETE ---