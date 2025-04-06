import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Esquema para validar la creación de ClinicSchedule
// startDate debe ser una fecha válida en formato YYYY-MM-DD
const CreateClinicScheduleSchema = z.object({
  clinicId: z.string().cuid({ message: "ID de clínica inválido." }),
  templateId: z.string().cuid({ message: "ID de plantilla inválido." }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de inicio debe ser YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha de fin debe ser YYYY-MM-DD").nullable().optional(),
  systemId: z.string().cuid({ message: "ID de sistema inválido." }), 
});

export async function POST(request: Request) {
  // 1. Validar Body
  let validatedData;
  try {
    const body = await request.json();
    // Convertir fechas a objetos Date antes de validar si es necesario por Prisma
    // O asegurar que el schema espera strings y Prisma los convierte
    const validation = CreateClinicScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de asignación de horario inválidos.', details: validation.error.errors }, { status: 400 });
    }
    validatedData = validation.data;
  } catch (error) {
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // 2. Crear en DB
  try {
    // Opcional: Verificar existencia de clinic y template?
    
    // Convertir strings de fecha a objetos Date para Prisma
    const dataToCreate = {
        ...validatedData,
        startDate: new Date(validatedData.startDate + 'T00:00:00Z'), // Asegurar UTC o zona correcta
        endDate: validatedData.endDate ? new Date(validatedData.endDate + 'T00:00:00Z') : null,
    };

    // Lógica importante: Antes de crear una nueva asignación activa (sin endDate),
    // deberíamos asegurarnos de que no haya otra ya activa para la misma clínica.
    // Si la hay, deberíamos ponerle una fecha fin (endDate = hoy - 1 día) a la antigua.
    if (dataToCreate.endDate === null) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        await prisma.clinicSchedule.updateMany({
            where: {
                clinicId: dataToCreate.clinicId,
                endDate: null, // Buscar activas
            },
            data: {
                endDate: yesterday, // Poner fecha fin a las antiguas activas
            },
        });
    }

    // Crear la nueva asignación
    const newClinicSchedule = await prisma.clinicSchedule.create({
      data: dataToCreate,
      include: { // Incluir template y bloques para devolver info completa
          template: { include: { blocks: true } }
      }
    });

    return NextResponse.json(newClinicSchedule, { status: 201 });

  } catch (error: any) {
    console.error("Error creating clinic schedule:", error);
    // Manejar posibles errores (ej: foreign key constraint si clinicId o templateId no existen)
    if (error.code === 'P2003') { // Foreign key constraint failed
         return NextResponse.json({ error: 'La clínica o plantilla especificada no existe.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear la asignación de horario.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 