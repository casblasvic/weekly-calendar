import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Esquema de validación para el cuerpo de la solicitud
const ReorderSchema = z.object({
  clinicId: z.string().cuid({
    message: "El ID de la clínica proporcionado no es válido.",
  }),
  orderedCabinIds: z.array(z.string().cuid({ 
    message: "Uno o más IDs de cabina proporcionados no son válidos."
  })).min(1, { message: "Se requiere al menos un ID de cabina."}),
});

export async function POST(request: Request) {
  console.log("[API POST /api/cabins/reorder] Received request");
  try {
    const body = await request.json();
    console.log("[API POST /api/cabins/reorder] Request body:", body);

    // 1. Validar el cuerpo de la solicitud
    const validation = ReorderSchema.safeParse(body);
    if (!validation.success) {
      console.warn("[API POST /api/cabins/reorder] Validation failed:", validation.error.errors);
      return NextResponse.json({ error: 'Datos de reordenación inválidos.', details: validation.error.flatten() }, { status: 400 });
    }

    const { clinicId, orderedCabinIds } = validation.data;
    
    // TODO: Añadir verificación de autorización (¿el usuario puede modificar esta clínica?)

    console.log(`[API POST /api/cabins/reorder] Attempting to reorder ${orderedCabinIds.length} cabins for clinic ${clinicId}`);

    // 2. Crear operaciones de actualización dentro de una transacción
    const updateOperations = orderedCabinIds.map((cabinId, index) => 
      prisma.cabin.update({ // importante usar updateMany si filtramos por clinicId
        where: { 
          id: cabinId,
          clinicId: clinicId, // Asegurar que la cabina pertenece a la clínica esperada
        },
        data: { order: index }, // Usar el índice del array como nuevo orden (0-based)
      })
    );

    // 3. Ejecutar la transacción
    await prisma.$transaction(updateOperations);
    
    console.log(`[API POST /api/cabins/reorder] Successfully reordered cabins for clinic ${clinicId}`);

    // 4. Opcional: Devolver las cabinas actualizadas (puede ser útil)
    const updatedCabins = await prisma.cabin.findMany({
      where: { clinicId: clinicId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ message: 'Cabins reordered successfully', cabins: updatedCabins }, { status: 200 });

  } catch (error) {
    console.error("[API POST /api/cabins/reorder] Error processing request:", error);
    // Manejar errores específicos de Prisma si es necesario (ej. P2025 si un ID no existe)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
       return NextResponse.json({ error: 'Error en la transacción: Una o más cabinas no fueron encontradas o no pertenecen a la clínica.' }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to reorder cabins' }, { status: 500 });
  } finally {
    // await prisma.$disconnect(); // Considerar gestión de conexión
  }
} 