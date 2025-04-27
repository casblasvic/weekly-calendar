import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma-old'; // Usar la ruta corregida
import { parseISO, startOfDay, isValid } from 'date-fns';

// Esquema para validar el ID de la ruta
const routeContextSchema = z.object({
  params: z.object({
    id: z.string().cuid({ message: "ID de bloqueo inválido." }),
  }),
});

// Esquema de validación para el cuerpo de la solicitud PUT (similar a POST, pero todo opcional para patch)
// y aseguramos que al menos un campo modificable esté presente.
const putBodySchema = z.object({
  // clinicId no debería cambiarse, se infiere del bloqueo existente
  cabinIds: z.array(z.string()).min(1, { message: "Debe seleccionar al menos una cabina." }).optional(),
  startDate: z.string().refine((date) => isValid(parseISO(date)), {
    message: "Formato de fecha de inicio inválido (yyyy-MM-dd).",
  }).optional(),
  endDate: z.string().optional().nullable().refine((date) => !date || isValid(parseISO(date)), {
      message: "Formato de fecha de fin inválido (yyyy-MM-dd).",
  }), // Permitir null explícitamente
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora de inicio inválido (HH:mm).",
  }).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Formato de hora de fin inválido (HH:mm).",
  }).optional(),
  description: z.string().nullable().optional(), // Permitir null
  isRecurring: z.boolean().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // Permitir array vacío si se desactiva recurrencia
  recurrenceEndDate: z.string().optional().nullable().refine((date) => !date || isValid(parseISO(date)), {
      message: "Formato de fecha de fin de recurrencia inválido (yyyy-MM-dd).",
  }), // Permitir null
}).refine(data => {
    // Si se actualiza a recurrente, validar campos necesarios
    if (data.isRecurring === true && (!data.daysOfWeek || data.daysOfWeek.length === 0)) return false;
    if (data.isRecurring === true && !data.recurrenceEndDate) return false;
    // Si se actualiza a no recurrente, no validar campos de recurrencia
    return true;
}, { message: "Bloqueos recurrentes actualizados deben incluir días y fecha fin." })
 .refine(data => { // Validación hora fin > hora inicio si ambas presentes
    if (data.startTime && data.endTime) return data.endTime > data.startTime;
    return true;
 }, { message: "La hora de fin debe ser posterior a la hora de inicio." })
 .refine(data => { // Validación fecha fin >= fecha inicio si ambas presentes
    if (data.startDate && data.endDate) return parseISO(data.endDate) >= parseISO(data.startDate);
    return true;
 }, { message: "La fecha de fin debe ser igual o posterior a la fecha de inicio." })
 .refine(data => { // Validación fecha fin recurrencia >= fecha inicio si ambas presentes
    if (data.isRecurring === true && data.recurrenceEndDate && data.startDate) {
        return parseISO(data.recurrenceEndDate) >= parseISO(data.startDate);
    }
    return true;
 }, { message: "La fecha de fin de recurrencia debe ser igual o posterior a la fecha de inicio." })
 .refine(data => Object.keys(data).length > 0, { // Asegurar que al menos un campo se envía
     message: "Debe proporcionar al menos un campo para actualizar."
 });


// --- GET (Obtener un bloqueo por ID) ---
export async function GET(
  request: NextRequest,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context);
    const override = await prisma.cabinScheduleOverride.findUnique({
      where: { id: params.id },
    });

    if (!override) {
      return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 });
    }

    return NextResponse.json(override);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "ID de bloqueo inválido.", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    console.error("Error fetching cabin schedule override by ID:", error);
    return NextResponse.json({ message: "Error interno del servidor." }, { status: 500 });
  }
}

// --- PUT (Actualizar un bloqueo por ID) ---
export async function PUT(
  request: NextRequest,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    // >>> MODIFICACIÓN: Esperar a que los parámetros se resuelvan
    const resolvedParams = await context.params;
    
    // Validar los parámetros resueltos
    const { params } = routeContextSchema.parse({ params: resolvedParams });
    
    const body = await request.json();

    const validationResult = putBodySchema.safeParse(body);

    if (!validationResult.success) {
      console.error("Validation Errors:", validationResult.error.flatten());
      return NextResponse.json(
        { message: "Datos de actualización inválidos", errors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verificar que el bloqueo exista antes de intentar actualizar
    const existingOverride = await prisma.cabinScheduleOverride.findUnique({
      where: { id: params.id },
    });
    if (!existingOverride) {
      return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 });
    }

    const dataToUpdate: Partial<any> = {}; // Objeto para almacenar solo los campos validados

     // Mapear explícitamente los campos validados y convertir fechas
    if (validationResult.data.cabinIds !== undefined) dataToUpdate.cabinIds = validationResult.data.cabinIds;
    if (validationResult.data.startDate) dataToUpdate.startDate = startOfDay(parseISO(validationResult.data.startDate));
    if (validationResult.data.startTime) dataToUpdate.startTime = validationResult.data.startTime;
    if (validationResult.data.endTime) dataToUpdate.endTime = validationResult.data.endTime;
    if (validationResult.data.description !== undefined) dataToUpdate.description = validationResult.data.description; // Manejar null
    
    // <<< Lógica de recurrencia explícita >>>
    if (validationResult.data.isRecurring !== undefined) {
        dataToUpdate.isRecurring = validationResult.data.isRecurring;
    }
    
    // Determinar el estado final de isRecurring (el enviado o el existente si no se envió)
    const finalIsRecurring = validationResult.data.isRecurring !== undefined 
                             ? validationResult.data.isRecurring 
                             : existingOverride.isRecurring;

    if (finalIsRecurring === true) {
        // Si es recurrente, ASEGURAR que se usan los días y fecha fin del payload (si existen)
        if (validationResult.data.daysOfWeek !== undefined) {
            dataToUpdate.daysOfWeek = validationResult.data.daysOfWeek;
        } else if (dataToUpdate.isRecurring === true) { // Si se acaba de marcar como recurrente, usar los días existentes o vacío
             dataToUpdate.daysOfWeek = existingOverride.daysOfWeek || [];
        }
        
        if (validationResult.data.recurrenceEndDate !== undefined) {
            dataToUpdate.recurrenceEndDate = validationResult.data.recurrenceEndDate
                ? startOfDay(parseISO(validationResult.data.recurrenceEndDate))
                : null;
        } else if (dataToUpdate.isRecurring === true) { // Si se acaba de marcar como recurrente, usar fecha existente o null
            dataToUpdate.recurrenceEndDate = existingOverride.recurrenceEndDate || null;
        }
        
        // Asegurarse de que endDate sea null para recurrencias
        dataToUpdate.endDate = null;

    } else { // Si finalIsRecurring es false (o undefined y el existente era false)
        // Si NO es recurrente, limpiar campos de recurrencia y usar endDate
        dataToUpdate.daysOfWeek = [];
        dataToUpdate.recurrenceEndDate = null;
        // Mantener el endDate enviado si existe, o el actual si no se envió
        if (validationResult.data.endDate !== undefined) {
             dataToUpdate.endDate = validationResult.data.endDate
                ? startOfDay(parseISO(validationResult.data.endDate))
                : null;
        } else {
             // Si no se envió endDate y no es recurrente, mantener el existente
             dataToUpdate.endDate = existingOverride.endDate;
        }
    }
    // <<< Fin lógica de recurrencia explícita >>>
    
    // Eliminar asignaciones originales redundantes
    // if (validationResult.data.daysOfWeek !== undefined) dataToUpdate.daysOfWeek = dataToUpdate.isRecurring === false ? [] : validationResult.data.daysOfWeek;
    // if (validationResult.data.recurrenceEndDate !== undefined) dataToUpdate.recurrenceEndDate = dataToUpdate.isRecurring === false ? null : (validationResult.data.recurrenceEndDate ? startOfDay(parseISO(validationResult.data.recurrenceEndDate)) : null); // Manejar null


    const updatedOverride = await prisma.cabinScheduleOverride.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedOverride);

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "ID o datos inválidos.", errors: error.flatten().fieldErrors }, { status: 400 });
    }
     if (error.code === 'P2025') { // Error si el registro a actualizar no se encuentra (doble check)
      return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 });
    }
    console.error("Error updating cabin schedule override:", error);
    return NextResponse.json({ message: "Error interno del servidor al actualizar el bloqueo." }, { status: 500 });
  }
}

// --- DELETE (Eliminar un bloqueo por ID) ---
export async function DELETE(
  request: NextRequest,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    // >>> MODIFICACIÓN: Esperar a que los parámetros se resuelvan
    const resolvedParams = await context.params;
    const { params } = routeContextSchema.parse({ params: resolvedParams });

    // Verificar si existe antes de borrar para devolver 404 apropiado
    const existingOverride = await prisma.cabinScheduleOverride.findUnique({ where: { id: params.id } });
    if (!existingOverride) {
        return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 });
    }

    await prisma.cabinScheduleOverride.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 }); // No Content

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "ID de bloqueo inválido.", errors: error.flatten().fieldErrors }, { status: 400 });
    }
     if (error.code === 'P2025') { // Error si el registro a borrar no se encuentra
      // Aunque ya verificamos antes, es una salvaguarda
      return NextResponse.json({ message: "Bloqueo no encontrado." }, { status: 404 });
    }
    console.error("Error deleting cabin schedule override:", error);
    return NextResponse.json({ message: "Error interno del servidor al eliminar el bloqueo." }, { status: 500 });
  }
}
