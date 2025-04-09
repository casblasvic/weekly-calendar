import { NextResponse } from 'next/server';
// Eliminar importación directa
// import { PrismaClient } from '@prisma/client';
// Importar instancia singleton
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { subDays, parseISO } from 'date-fns'; // Importar para manejo de fechas

// Eliminar instanciación directa
// const prisma = new PrismaClient();

// Esquema para validar el body de la solicitud POST (usando el nuevo modelo)
const clinicTemplateAssignmentCreateSchema = z.object({
  clinicId: z.string().cuid(),
  templateId: z.string().cuid(),
  startDate: z.string().refine((date) => !isNaN(parseISO(date).getTime()), { // Validar que sea una fecha ISO válida
      message: "La fecha de inicio debe ser una fecha válida en formato ISO (YYYY-MM-DD)",
  }).transform(date => parseISO(date)), // Convertir a objeto Date
  endDate: z.string().refine((date) => !isNaN(parseISO(date).getTime()), {
      message: "La fecha de fin debe ser una fecha válida en formato ISO (YYYY-MM-DD)",
  }).transform(date => parseISO(date)).nullable(), // Permitir null y convertir a Date si no es null
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = clinicTemplateAssignmentCreateSchema.parse(body);

    // 1. Obtener systemId de la clínica
    const clinic = await prisma.clinic.findUnique({
      where: { id: validatedData.clinicId },
      select: { systemId: true }
    });

    if (!clinic) {
        return NextResponse.json({ error: 'Clínica no encontrada.' }, { status: 404 });
    }
    const systemId = clinic.systemId;

    // 2. Iniciar transacción para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {

        // 3. Si la nueva asignación es la activa (endDate es null),
        //    buscar la asignación activa anterior y ponerle fecha de fin.
        if (validatedData.endDate === null) {
            const previousActiveAssignment = await tx.clinicTemplateAssignment.findFirst({
                where: {
                    clinicId: validatedData.clinicId,
                    endDate: null, // Buscar la que está activa actualmente
                }
            });

            if (previousActiveAssignment) {
                // Calcular el día anterior a la nueva fecha de inicio
                const newEndDateForPrevious = subDays(validatedData.startDate, 1);
                console.log(`[API ClinicSchedules POST] Desactivando asignación anterior ${previousActiveAssignment.id} con fecha ${newEndDateForPrevious.toISOString().split('T')[0]}`);
                await tx.clinicTemplateAssignment.update({
                    where: { id: previousActiveAssignment.id },
                    data: { endDate: newEndDateForPrevious }
                });
            }
        }

        // 4. Crear la nueva asignación en ClinicTemplateAssignment
        console.log(`[API ClinicSchedules POST] Creando nueva asignación para clínica ${validatedData.clinicId}, plantilla ${validatedData.templateId}`);
        const newAssignment = await tx.clinicTemplateAssignment.create({
            data: {
                clinicId: validatedData.clinicId,
                templateId: validatedData.templateId,
                startDate: validatedData.startDate,
                endDate: validatedData.endDate,
                systemId: systemId, // Añadir systemId
            },
             include: { template: true } // Incluir datos de la plantilla para la respuesta
        });

        // 5. Si la nueva asignación es la activa, actualizar linkedScheduleTemplateId en Clinic
        if (newAssignment.endDate === null) {
             console.log(`[API ClinicSchedules POST] Actualizando linkedScheduleTemplateId en clínica ${validatedData.clinicId} a ${newAssignment.templateId}`);
             await tx.clinic.update({
                 where: { id: validatedData.clinicId },
                 data: { linkedScheduleTemplateId: newAssignment.templateId }
             });
         } else {
             // Si la asignación creada NO es la activa, ¿deberíamos poner a null
             // linkedScheduleTemplateId en Clinic si coincide con la plantilla de esta asignación?
             // Esto podría ser complejo si hay otras asignaciones futuras. Por ahora no lo hacemos.
             // Podría ser necesario un job o lógica que actualice Clinic.linkedScheduleTemplateId
             // basándose en la asignación activa en la fecha actual.
         }

        return newAssignment;
    }); // Fin de la transacción

    // Respuesta exitosa con los datos de la nueva asignación creada
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("[API ClinicSchedules POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos.', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Manejar errores específicos de Prisma si es necesario (ej: foreign key constraint)
      if (error.code === 'P2003') { // Foreign key constraint failed
           return NextResponse.json({ error: 'ID de clínica o plantilla no válido.' }, { status: 400 });
      }
      // Podría haber otros errores...
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear la asignación.' }, { status: 500 });
  }
}

// --- Mantener GET (si existía) o eliminar si no es necesaria --- 
// Si GET era para buscar bloques, ya no aplica aquí.
// Podría ser para buscar asignaciones por clínica?
/*
export async function GET(request: Request) {
  // Implementar lógica para buscar ClinicTemplateAssignment si es necesario
  // Por ejemplo, obtener el historial de asignaciones de una clínica:
  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('clinicId');

  if (!clinicId) {
      return NextResponse.json({ error: 'Falta el parámetro clinicId' }, { status: 400 });
  }

  try {
       const assignments = await prisma.clinicTemplateAssignment.findMany({
           where: { clinicId: clinicId },
           orderBy: { startDate: 'desc' }, // Ordenar por fecha de inicio descendente
           include: { template: true } // Incluir datos de la plantilla
       });
       return NextResponse.json(assignments);
  } catch (error) {
       console.error("[API ClinicSchedules GET] Error:", error);
       return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
*/ 