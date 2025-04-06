import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de asignación de horario inválido." }),
});

// Esquema para validar el body de la solicitud PUT
// Permitir actualizar templateId, startDate, endDate
const UpdateClinicScheduleSchema = z.object({
  templateId: z.string().cuid({ message: "ID de plantilla inválido." }).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de inicio debe ser YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de fin debe ser YYYY-MM-DD").nullable().optional(),
  // No permitir cambiar clinicId o systemId
}).refine(data => Object.keys(data).length > 0, {
    message: "Se requiere al menos un campo para actualizar."
});


export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Validar ID de ruta
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de asignación inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: scheduleId } = paramsValidation.data;

  // 2. Validar Body
  let validatedData;
  try {
    const body = await request.json();
    const validation = UpdateClinicScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de asignación inválidos.', details: validation.error.errors }, { status: 400 });
    }
    validatedData = validation.data;
  } catch (error) {
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }
  
  // Convertir strings de fecha a objetos Date si existen
  const dataToUpdate: any = { ...validatedData };
  if (validatedData.startDate) {
      dataToUpdate.startDate = new Date(validatedData.startDate + 'T00:00:00Z');
  }
  if (validatedData.hasOwnProperty('endDate')) { // Permitir poner endDate a null
      dataToUpdate.endDate = validatedData.endDate ? new Date(validatedData.endDate + 'T00:00:00Z') : null;
  }

  // 3. Actualizar en DB
  try {
    // Lógica adicional si se está activando esta asignación (endDate pasa a ser null)
    // Si vamos a activar esta (endDate=null), hay que desactivar las otras activas para la misma clínica
    if (dataToUpdate.endDate === null) {
        const scheduleToActivate = await prisma.clinicSchedule.findUnique({ where: { id: scheduleId }});
        if (!scheduleToActivate) {
             return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 });
        }
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await prisma.clinicSchedule.updateMany({
            where: {
                clinicId: scheduleToActivate.clinicId, // Usar clinicId de la asignación encontrada
                endDate: null, // Buscar activas
                id: { not: scheduleId } // Excluir la que estamos activando
            },
            data: {
                endDate: yesterday, // Poner fecha fin a las otras activas
            },
        });
    }
    
    const updatedSchedule = await prisma.clinicSchedule.update({
      where: { id: scheduleId },
      data: dataToUpdate,
       include: { // Incluir template y bloques para devolver info completa
          template: { include: { blocks: true } }
      }
    });
    return NextResponse.json(updatedSchedule);
    
  } catch (error: any) {
    console.error("Error updating clinic schedule:", error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Asignación de horario no encontrada.' }, { status: 404 });
    }
     if (error.code === 'P2003') { // Foreign key constraint failed
         return NextResponse.json({ error: 'La plantilla especificada no existe.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la asignación.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE podría añadirse si se necesita eliminar asignaciones históricas 