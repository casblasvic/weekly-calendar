import { NextResponse } from 'next/server';
// Importar instancia singleton Y el namespace Prisma
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client'; // Añadir importación de Prisma
import { z } from 'zod';

// Eliminar instanciación directa
// const prisma = new PrismaClient();

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de cabina inválido." }),
});

// Esquema para validar el body de la solicitud PUT
// Similar a Create, pero todos los campos son opcionales excepto quizás el nombre?
// No permitir cambiar clinicId o systemId en una actualización
const UpdateCabinSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio.").optional(),
  code: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  order: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

// --- Función PUT --- 
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // TODO: Add authentication/authorization
  const { id: cabinId } = params;

  // *** LOG RECIBIDO ***
  console.log(`[API PUT /api/cabins/[id]] Received request for cabinId: ${cabinId}`);

  if (!cabinId) {
    console.warn("[API PUT /api/cabins/[id]] Cabin ID is missing in params.");
    return NextResponse.json({ error: 'Cabin ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, code, color, isActive, order } = body;
    
    // *** LOG BODY ***
    console.log(`[API PUT /api/cabins/[id]] Request body:`, body);

    if (name !== undefined && !name) {
      console.warn(`[API PUT /api/cabins/[id]] Validation failed: Name cannot be empty.`);
      return NextResponse.json({ error: 'Cabin name cannot be empty if provided' }, { status: 400 });
    }

    console.log(`[API PUT /api/cabins/[id]] Attempting to update cabin ${cabinId} in DB...`);
    const updatedCabin = await prisma.cabin.update({
      where: {
        id: cabinId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? (code || null) : undefined,
        color: color !== undefined ? (color || null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        order: order !== undefined ? (Number.isFinite(order) ? Number(order) : null) : undefined,
      },
    });
    console.log(`[API PUT /api/cabins/[id]] Cabin ${cabinId} updated successfully.`);

    return NextResponse.json(updatedCabin);

  } catch (error) {
    console.error("[API Cabins PUT] Error:", error);
    // Verificar si es un error conocido de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error de restricción única (ej: nombre/código duplicado en la misma clínica)
      if (error.code === 'P2002') {
        // Obtener los campos que causaron el error desde meta si está disponible
        const target = (error.meta?.target as string[])?.join(', ') || 'campos';
        return NextResponse.json({ error: `Conflicto: Ya existe una cabina con los mismos valores en ${target}.` }, { status: 409 });
      }
      // Error de registro no encontrado para actualizar
      if (error.code === 'P2025') {
           return NextResponse.json({ error: 'Cabina no encontrada para actualizar.' }, { status: 404 });
      }
    }
    // Otros errores
    return NextResponse.json({ error: 'Error interno del servidor al actualizar la cabina.' }, { status: 500 });
  } finally {
     // await prisma.$disconnect(); // Considerar gestión de conexión
  }
}

// --- Función DELETE --- 
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // 1. Validar ID de ruta
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID de cabina inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: cabinId } = paramsValidation.data;

  // 2. Eliminar de DB
  try {
    await prisma.cabin.delete({
      where: { id: cabinId },
    });
    // Devolver éxito sin contenido
    return new NextResponse(null, { status: 204 }); 

  } catch (error) {
    console.error("[API Cabins DELETE] Error:", error);
    // Verificar si es un error conocido de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Error de registro no encontrado para eliminar
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Cabina no encontrada para eliminar.' }, { status: 404 });
      }
    }
    // Otros errores
    return NextResponse.json({ error: 'Error interno del servidor al eliminar la cabina.' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 