import { NextResponse } from 'next/server';
// Eliminar importación directa
// import { PrismaClient, Prisma } from '@prisma/client';
// Importar instancia singleton y Prisma
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // <-- Asegurarse que Prisma está importado
import { z } from 'zod';

// Eliminar instanciación directa
// const prisma = new PrismaClient();

// Esquema para validar el body de la solicitud POST
// clinicId y systemId son obligatorios
const CreateCabinSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  code: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  clinicId: z.string().cuid({ message: "ID de clínica inválido." }),
  systemId: z.string().cuid({ message: "ID de sistema inválido." }), 
});

export async function POST(request: Request) {
  // 1. Validar Body
  let validatedData;
  try {
    const body = await request.json();
    const validation = CreateCabinSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de cabina inválidos.', details: validation.error.errors }, { status: 400 });
    }
    validatedData = validation.data;
  } catch (error) {
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // 2. Crear en la base de datos
  try {
    // Verificar que la clínica y el sistema existen (opcional, pero buena práctica)
    const clinicExists = await prisma.clinic.findUnique({ where: { id: validatedData.clinicId } });
    if (!clinicExists || clinicExists.systemId !== validatedData.systemId) {
        return NextResponse.json({ error: 'Clínica o Sistema asociado inválido.' }, { status: 400 });
    }
    
    const newCabin = await prisma.cabin.create({
      data: validatedData,
    });

    return NextResponse.json(newCabin, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error("Error creating cabin:", error);
    // Manejar error de constraint único (ej: nombre o código duplicado en la misma clínica)
    if (error.code === 'P2002') {
       return NextResponse.json({ error: 'Ya existe una cabina con ese nombre o código en esta clínica.', details: error.meta?.target }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear la cabina.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 