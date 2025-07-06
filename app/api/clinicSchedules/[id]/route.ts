import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { subDays, parseISO } from 'date-fns'; // Importar para manejo de fechas

// Esquema para validar el ID en los parámetros
const RouteParamsSchema = z.object({
  id: z.string().cuid(),
});

// Esquema para validar el body de la solicitud PUT (basado en ClinicTemplateAssignment)
const updateClinicTemplateAssignmentSchema = z.object({
  templateId: z.string().cuid().optional(), // Hacer opcionales los campos que se pueden actualizar
  startDate: z.string().refine((date) => !isNaN(parseISO(date).getTime()), {
      message: "La fecha de inicio debe ser una fecha válida en formato ISO (YYYY-MM-DD)",
  }).transform(date => parseISO(date)).optional(),
  endDate: z.string().refine((date) => !isNaN(parseISO(date).getTime()), {
      message: "La fecha de fin debe ser una fecha válida en formato ISO (YYYY-MM-DD)",
  }).transform(date => parseISO(date)).nullable().optional(), // Permitir null y opcional
});

// --- GET --- 
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = RouteParamsSchema.parse(params);

    // Usar el modelo correcto
    const assignment = await prisma.clinicTemplateAssignment.findUnique({
      where: { id },
      include: { template: true, clinic: true } // Incluir datos relacionados
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 });
    }
    return NextResponse.json(assignment);

  } catch (error) {
    console.error("[API ClinicSchedules GET /id] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'ID inválido.', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// --- PUT --- 
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: assignmentId } = RouteParamsSchema.parse(params);
    const body = await request.json();
    const validatedData = updateClinicTemplateAssignmentSchema.parse(body);

    // Verificar que hay datos para actualizar
    if (Object.keys(validatedData).length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
    }

    // Iniciar transacción
    const result = await prisma.$transaction(async (tx) => {
        // 1. Obtener la asignación actual para conocer su clinicId
        const currentAssignment = await tx.clinicTemplateAssignment.findUnique({
            where: { id: assignmentId },
            select: { clinicId: true, endDate: true } // Solo necesitamos el clinicId y el endDate actual
        });

        if (!currentAssignment) {
            throw new Error('P2025'); // Simular error "Registro no encontrado" para el catch
        }

        const clinicId = currentAssignment.clinicId;

        // 2. Si estamos estableciendo esta asignación como activa (endDate = null)
        //    y no lo estaba ya, desactivar la activa anterior.
        const isBecomingActive = validatedData.endDate === null && currentAssignment.endDate !== null;
        if (isBecomingActive) {
            // Necesitamos la nueva fecha de inicio para calcular la fecha fin de la anterior
            const newStartDate = validatedData.startDate || (await tx.clinicTemplateAssignment.findUnique({ where: { id: assignmentId }, select: { startDate: true } }))?.startDate;
            if (!newStartDate) throw new Error("No se pudo determinar la fecha de inicio para la actualización."); // Error interno

            const previousActiveAssignment = await tx.clinicTemplateAssignment.findFirst({
                where: {
                    clinicId: clinicId,
                    endDate: null,
                    id: { not: assignmentId } // Excluir la que estamos actualizando
                }
            });

            if (previousActiveAssignment) {
                const newEndDateForPrevious = subDays(newStartDate, 1);
                 console.log(`[API ClinicSchedules PUT] Desactivando asignación anterior ${previousActiveAssignment.id} con fecha ${newEndDateForPrevious.toISOString().split('T')[0]}`);
                await tx.clinicTemplateAssignment.update({
                    where: { id: previousActiveAssignment.id },
                    data: { endDate: newEndDateForPrevious }
                });
            }
        }

        // 3. Actualizar la asignación solicitada
         console.log(`[API ClinicSchedules PUT] Actualizando asignación ${assignmentId}`);
        const updatedAssignment = await tx.clinicTemplateAssignment.update({
            where: { id: assignmentId },
            data: validatedData, // Usar los datos validados directamente
            include: { template: true } // Devolver con la plantilla actualizada
        });

        // 4. Si la asignación actualizada es la activa, actualizar Clinic.linkedScheduleTemplateId
        if (updatedAssignment.endDate === null) {
             console.log(`[API ClinicSchedules PUT] Actualizando linkedScheduleTemplateId en clínica ${clinicId} a ${updatedAssignment.templateId}`);
             await tx.clinic.update({
                 where: { id: clinicId },
                 data: { linkedScheduleTemplateId: updatedAssignment.templateId }
             });
         } else {
             // Si la asignación actualizada YA NO es la activa, ¿qué hacemos con Clinic.linkedScheduleTemplateId?
             // Podríamos buscar la asignación que AHORA está activa (endDate=null) y poner su ID,
             // o ponerlo a null si no hay ninguna activa. Por simplicidad, lo dejamos como está.
             // Idealmente, la UI o un proceso separado debería determinar la plantilla activa actual.
         }

        return updatedAssignment;
    }); // Fin de la transacción

    return NextResponse.json(result);

  } catch (error) {
    console.error("[API ClinicSchedules PUT /id] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos.', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError || (error instanceof Error && error.message === 'P2025')) {
        const errorCode = (error instanceof Prisma.PrismaClientKnownRequestError) ? error.code : error.message;
        if (errorCode === 'P2025') {
           return NextResponse.json({ error: 'Asignación no encontrada para actualizar.' }, { status: 404 });
        }
        if (errorCode === 'P2003') { // Foreign key constraint failed
           return NextResponse.json({ error: 'ID de plantilla no válido.' }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la asignación.' }, { status: 500 });
  }
}

// --- DELETE --- 
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = RouteParamsSchema.parse(params);

    // Antes de eliminar, podríamos necesitar lógica adicional:
    // - ¿Qué pasa con Clinic.linkedScheduleTemplateId si eliminamos la asignación activa?
    // - ¿Deberíamos buscar la asignación anterior y ponerla como activa (endDate=null)?
    // Por ahora, simplemente eliminamos la asignación.
    // Considera añadir esta lógica si es necesario.

    console.log(`[API ClinicSchedules DELETE] Eliminando asignación ${id}`);
    await prisma.clinicTemplateAssignment.delete({
      where: { id },
    });
    
    // TODO: Considerar actualizar Clinic.linkedScheduleTemplateId aquí.
    // Se podría buscar la asignación activa más reciente (endDate=null o max(endDate))
    // y actualizar Clinic.linkedScheduleTemplateId con su templateId, o ponerlo a null.

    return new NextResponse(null, { status: 204 }); // No content

  } catch (error) {
     console.error("[API ClinicSchedules DELETE /id] Error:", error);
     if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'ID inválido.', details: error.errors }, { status: 400 });
     }
     if (error instanceof Prisma.PrismaClientKnownRequestError) {
         if (error.code === 'P2025') {
             return NextResponse.json({ error: 'Asignación no encontrada para eliminar.' }, { status: 404 });
         }
     }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar la asignación.' }, { status: 500 });
  }
} 