import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de servicio inválido." }),
});

// Esquema para validar la actualización de Service
const UpdateServiceSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    durationMinutes: z.number().int().positive().optional(),
    price: z.number().positive().optional().nullable(), // Permitir null para precio base
    code: z.string().optional().nullable(),
    colorCode: z.string().optional().nullable(),
    requiresMedicalSignOff: z.boolean().optional(),
    pointsAwarded: z.number().int().optional(),
    isActive: z.boolean().optional(),
    categoryId: z.string().cuid().optional().nullable(), // Permitir null para desasignar categoría
    vatTypeId: z.string().cuid().optional().nullable(), // Permitir null para desasignar IVA base
}).strict();

// Función auxiliar para extraer ID de la URL
function extractIdFromUrl(url: string): string | null {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean); // Eliminar vacíos
        // Asumiendo /api/services/[id]
        if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'services') {
            return segments[2];
        }
        return null;
    } catch (error) {
        console.error("Error extracting ID from URL:", error);
        return null;
    }
}

/**
 * Handler para obtener un servicio específico por ID.
 */
export async function GET(request: Request /*, { params }: { params: { id: string } } - No usaremos params */) {
  const id = extractIdFromUrl(request.url);
  if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
  }
  console.log(`[API GET /api/services/[id]] Extracted ID from URL: ${id}`);

  // Validar el ID extraído
  const paramsValidation = ParamsSchema.safeParse({ id }); 

  if (!paramsValidation.success) {
    console.error("[API GET /api/services/[id]] Zod validation failed for extracted ID:", paramsValidation.error.flatten()); 
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }

  const { id: serviceId } = paramsValidation.data; 
  console.log(`[API GET /api/services/[id]] Validated serviceId: ${serviceId}`);

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        category: true, // Incluir datos relacionados
        vatType: true,
        // tariffPrices: { include: { tariff: true, vatType: true }} // Opcional
      },
    });

    if (!service) {
      return NextResponse.json({ message: `Servicio ${serviceId} no encontrado.` }, { status: 404 });
    }
    return NextResponse.json(service);

  } catch (error) {
    console.error(`Error fetching service ${serviceId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Handler para actualizar un servicio existente.
 */
export async function PUT(request: Request /*, { params }: { params: { id: string } } */) {
  const id = extractIdFromUrl(request.url);
  if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
  }
  console.log(`[API PUT /api/services/[id]] Extracted ID from URL: ${id}`);

  const paramsValidation = ParamsSchema.safeParse({ id }); 
  if (!paramsValidation.success) {
    console.error("[API PUT /api/services/[id]] Zod validation failed for extracted ID:", paramsValidation.error.flatten()); 
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: serviceId } = paramsValidation.data;
  console.log(`[API PUT /api/services/[id]] Validated serviceId: ${serviceId}`);

  try {
    const body = await request.json();
    const validation = UpdateServiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
    }
    const { categoryId, vatTypeId, ...updateData } = validation.data;

    if (Object.keys(validation.data).length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
    }

    // Preparar datos para Prisma
    const dataToUpdate: Prisma.ServiceUpdateInput = {
      ...updateData,
      ...(categoryId !== undefined && { 
          category: categoryId ? { connect: { id: categoryId } } : { disconnect: true }
      }),
      ...(vatTypeId !== undefined && { 
          vatType: vatTypeId ? { connect: { id: vatTypeId } } : { disconnect: true }
      }),
    };

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: dataToUpdate,
      include: { 
        category: true,
        vatType: true,
      },
    });

    return NextResponse.json(updatedService);

  } catch (error) {
    console.error(`Error updating service ${serviceId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: `Servicio ${serviceId} no encontrado.` }, { status: 404 });
      }
      if (error.code === 'P2002') { // Unicidad (name + systemId?)
        return NextResponse.json({ message: 'Conflicto de datos (ej: nombre duplicado).' }, { status: 409 });
      }
       if (error.code === 'P2003') { // FK constraint failed
           return NextResponse.json({ message: 'Referencia inválida (ej: categoría o tipo de IVA no existe)' }, { status: 400 });
      }
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al actualizar.' }, { status: 500 });
  }
}

/**
 * Handler para eliminar un servicio.
 */
export async function DELETE(request: Request /*, { params }: { params: { id: string } } */) {
  const id = extractIdFromUrl(request.url);
  if (!id) {
      return NextResponse.json({ error: 'No se pudo extraer el ID de la URL.' }, { status: 400 });
  }
  console.log(`[API DELETE /api/services/[id]] Extracted ID from URL: ${id}`);
   
  const paramsValidation = ParamsSchema.safeParse({ id }); 
  if (!paramsValidation.success) {
    console.error("[API DELETE /api/services/[id]] Zod validation failed for extracted ID:", paramsValidation.error.flatten()); 
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: serviceId } = paramsValidation.data;
  console.log(`[API DELETE /api/services/[id]] Validated serviceId: ${serviceId}`);

  try {
    // TODO: Considerar qué pasa con las relaciones
    // - TariffServicePrice: Se borrarán por onDelete: Cascade
    // - TicketItem: ¿Borrar tickets? ¿Desvincular? (Actualmente sin relación directa o con onDelete indefinido)
    // - BonoDefinition: ¿Borrar bonos? (Actualmente sin onDelete)
    // - PackageItem: ¿Borrar paquetes? (Actualmente onDelete: Cascade)
    // ¡CUIDADO con borrados en cascada no deseados!
    // Quizás sea mejor desactivar (isActive=false) que borrar.

    await prisma.service.delete({ where: { id: serviceId } });
    return NextResponse.json({ message: `Servicio ${serviceId} eliminado.` }, { status: 200 });

  } catch (error) {
     console.error(`Error deleting service ${serviceId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: `Servicio ${serviceId} no encontrado.` }, { status: 404 });
      }
      // P2003 podría ocurrir si alguna relación impidiera el borrado
    }
    return NextResponse.json({ message: 'Error interno del servidor al eliminar.' }, { status: 500 });
  }
} 