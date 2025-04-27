import { NextResponse, NextRequest } from 'next/server';
// Eliminar importación directa
// import { PrismaClient, Prisma } from '@prisma/client';
// Importar instancia singleton y Prisma
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // <-- Asegurarse que Prisma está importado
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión

// Eliminar instanciación directa
// const prisma = new PrismaClient();

// Esquema para validar el body de la solicitud POST (SIN systemId)
const CreateCabinSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  code: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  clinicId: z.string().cuid({ message: "ID de clínica inválido." }),
  // systemId: z.string().cuid({ message: "ID de sistema inválido." }), // <<< ELIMINADO de Zod
});

// NUEVO: Handler GET para obtener cabinas de una clínica específica
export async function GET(request: NextRequest) {
    const session = await getServerAuthSession();
    if (!session || !session.user?.systemId) {
        return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { searchParams } = request.nextUrl;
    const clinicId = searchParams.get('clinicId');

    if (!clinicId) {
        return NextResponse.json({ message: 'Falta el parámetro clinicId.' }, { status: 400 });
    }

    try {
        // Verificar que la clínica pertenece al sistema del usuario
        const clinic = await prisma.clinic.findFirst({
            where: { id: clinicId, systemId: systemId },
            select: { id: true }
        });

        if (!clinic) {
            return NextResponse.json({ message: 'Clínica no encontrada o no pertenece a este sistema.' }, { status: 404 });
        }

        // Obtener cabinas de esa clínica
        const cabins = await prisma.cabin.findMany({
            where: { clinicId: clinicId },
            orderBy: { order: 'asc' }, // Ordenar por el campo 'order' si existe
        });

        return NextResponse.json(cabins);

    } catch (error) {
        console.error("Error fetching cabins:", error);
        return NextResponse.json({ message: 'Error interno del servidor al obtener las cabinas.' }, { status: 500 });
    }
}

// Handler POST Corregido
export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado o falta systemId' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  // 1. Validar Body
  let validatedData;
  try {
    const body = await request.json();
    const validation = CreateCabinSchema.safeParse(body); // Usar schema sin systemId
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos de cabina inválidos.', details: validation.error.errors }, { status: 400 });
    }
    validatedData = validation.data;
  } catch (error) {
    return NextResponse.json({ error: 'Error al parsear los datos de la solicitud.' }, { status: 400 });
  }

  // 2. Crear en la base de datos
  try {
    // Verificar que la clínica existe Y pertenece al systemId del usuario de la sesión
    const clinicExists = await prisma.clinic.findFirst({
         where: { 
             id: validatedData.clinicId, 
             systemId: systemId // <<< Verificar contra el systemId de la SESIÓN
         } 
    });
    if (!clinicExists) {
        // Ahora el error es más preciso: o no existe o no pertenece al sistema del usuario
        return NextResponse.json({ error: 'Clínica inválida o no pertenece a tu sistema.' }, { status: 400 });
    }
    
    // Crear la cabina (ya no necesitamos pasar systemId explícitamente si el modelo Cabin no lo tiene)
    const newCabin = await prisma.cabin.create({
      data: validatedData, // Contiene clinicId, que implícitamente liga al systemId
    });

    return NextResponse.json(newCabin, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error("Error creating cabin:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
       return NextResponse.json({ error: 'Ya existe una cabina con ese nombre o código en esta clínica.', details: error.meta?.target }, { status: 409 }); // Conflict
    }
     if (error instanceof z.ZodError) { // Añadir manejo Zod Error
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) { // Añadir manejo SyntaxError
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear la cabina.' }, { status: 500 });
  } 
  // finally {
  //   await prisma.$disconnect(); // <<< ELIMINADO
  // }
} 