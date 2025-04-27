import { NextResponse, NextRequest } from 'next/server';
// Eliminar importación directa
// import { PrismaClient } from '@prisma/client';
// Importar instancia singleton
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { subDays, parseISO } from 'date-fns'; // Importar para manejo de fechas
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión

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

// Handler POST Corregido
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const sessionSystemId = session.user.systemId; // <<< Obtener systemId de la sesión

  try {
    const body = await request.json();
    const validatedData = clinicTemplateAssignmentCreateSchema.parse(body);

    // 1. Verificar que la clínica pertenece al sistema del usuario Y obtener systemId
    const clinic = await prisma.clinic.findFirst({
      where: {
           id: validatedData.clinicId,
           systemId: sessionSystemId // <<< Validar contra systemId de la sesión
      },
      select: { systemId: true }
    });

    if (!clinic) {
        // La clínica no existe o no pertenece al sistema del usuario
        return NextResponse.json({ error: 'Clínica no encontrada o no pertenece a tu sistema.' }, { status: 404 });
    }
    // const systemId = clinic.systemId; // Ya lo tenemos de la sesión (sessionSystemId)

    // 1.5 Verificar que la plantilla pertenece al mismo sistema (importante!)
    const template = await prisma.scheduleTemplate.findFirst({
        where: {
            id: validatedData.templateId,
            systemId: sessionSystemId
        },
        select: { id: true }
    });
    if (!template) {
        return NextResponse.json({ error: 'Plantilla no encontrada o no pertenece a tu sistema.' }, { status: 404 });
    }


    // 2. Iniciar transacción para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {

        // 3. Desactivar asignación activa anterior (si aplica)
        if (validatedData.endDate === null) {
            const previousActiveAssignment = await tx.clinicTemplateAssignment.findFirst({
                where: {
                    clinicId: validatedData.clinicId,
                    endDate: null,
                }
            });

            if (previousActiveAssignment) {
                const newEndDateForPrevious = subDays(validatedData.startDate, 1);
                console.log(`[API ClinicSchedules POST] Desactivando asignación anterior ${previousActiveAssignment.id} con fecha ${newEndDateForPrevious.toISOString().split('T')[0]}`);
                await tx.clinicTemplateAssignment.update({
                    where: { id: previousActiveAssignment.id },
                    data: { endDate: newEndDateForPrevious }
                });
            }
        }

        // 4. Crear la nueva asignación
        console.log(`[API ClinicSchedules POST] Creando nueva asignación para clínica ${validatedData.clinicId}, plantilla ${validatedData.templateId}`);
        const newAssignment = await tx.clinicTemplateAssignment.create({
            data: {
                clinicId: validatedData.clinicId,
                templateId: validatedData.templateId,
                startDate: validatedData.startDate,
                endDate: validatedData.endDate,
                systemId: sessionSystemId, // <<< Usar systemId de la sesión
            },
             include: { template: true } // Incluir datos de la plantilla para la respuesta
        });

        // 5. Actualizar Clinic.linkedScheduleTemplateId si la nueva asignación es activa
        if (newAssignment.endDate === null) {
             console.log(`[API ClinicSchedules POST] Actualizando linkedScheduleTemplateId en clínica ${validatedData.clinicId} a ${newAssignment.templateId}`);
             await tx.clinic.update({
                 where: { id: validatedData.clinicId },
                 data: { linkedScheduleTemplateId: newAssignment.templateId }
             });
         } 
         // else { ... (lógica opcional si la nueva NO es activa) ... }

        return newAssignment;
    }); // Fin de la transacción

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error("[API ClinicSchedules POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos.', details: error.errors }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
           return NextResponse.json({ error: 'ID de clínica o plantilla no válido.' }, { status: 400 });
      }
    }
    if (error instanceof SyntaxError) { // Añadir manejo SyntaxError
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear la asignación.' }, { status: 500 });
  }
}

// --- Handler GET Descomentado y Corregido ---
export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const sessionSystemId = session.user.systemId;

  const { searchParams } = request.nextUrl;
  const clinicId = searchParams.get('clinicId');

  if (!clinicId) {
      return NextResponse.json({ error: 'Falta el parámetro clinicId' }, { status: 400 });
  }

  try {
       // Verificar que la clínica pertenece al sistema del usuario
       const clinic = await prisma.clinic.findFirst({
            where: { id: clinicId, systemId: sessionSystemId },
            select: { id: true }
       });

       if (!clinic) {
           return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a tu sistema.' }, { status: 404 });
       }

       // Obtener asignaciones de esa clínica (implícitamente del sistema correcto)
       const assignments = await prisma.clinicTemplateAssignment.findMany({
           where: { clinicId: clinicId },
           orderBy: { startDate: 'desc' },
           include: { template: true }
       });
       return NextResponse.json(assignments);

  } catch (error) {
       console.error("[API ClinicSchedules GET] Error:", error);
       return NextResponse.json({ error: 'Error interno del servidor al obtener asignaciones' }, { status: 500 });
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