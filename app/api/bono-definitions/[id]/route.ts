import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db'; 
import { getServerAuthSession } from '@/lib/auth'; 

// Esquema Zod para la validación de la ACTUALIZACIÓN de BonoDefinition
// Todos los campos son opcionales, pero si se incluye serviceId o productId, se valida la exclusividad
const BonoDefinitionUpdateSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio" }).optional(),
  description: z.string().optional().nullable(),
  serviceId: z.string().cuid().optional().nullable(),
  productId: z.string().cuid().optional().nullable(),
  quantity: z.number().int().min(1, { message: "La cantidad debe ser al menos 1" }).optional(),
  validityDays: z.number().int().optional().nullable(),
  price: z.number().min(0, { message: "El precio no puede ser negativo" }).optional(),
  costPrice: z.number().optional().nullable(),
  vatTypeId: z.string().cuid().optional().nullable(),
  commissionType: z.string().optional().nullable(),
  commissionValue: z.number().optional().nullable(),
  appearsInApp: z.boolean().optional(),
  autoAddToInvoice: z.boolean().optional(),
  isActive: z.boolean().optional(),
  pointsAwarded: z.number().int().optional(),
  // Nuevos campos opcionales
  code: z.string().optional().nullable(),
  formattedDescription: z.string().optional().nullable(),
  imageUrl: z.string().url({ message: "Debe ser una URL válida" }).optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  colorCode: z.string().startsWith("#", { message: "Debe ser un código hexadecimal"}).length(7, { message: "Debe tener 7 caracteres (# RRGGBB)"}).optional().nullable(),
})
// Validación refinada: si se envía serviceId o productId, deben ser exclusivos
.refine(data => {
    // Si no se envía ninguno de los dos, la validación pasa (no se está intentando cambiar la asociación)
    if (data.serviceId === undefined && data.productId === undefined) {
      return true;
    }
    // Si se envía alguno, verificar exclusividad (uno presente, el otro ausente/null)
    const hasService = data.serviceId !== undefined && data.serviceId !== null;
    const hasProduct = data.productId !== undefined && data.productId !== null;
    return (hasService && !hasProduct) || (!hasService && hasProduct);
  },
  {
    message: "Si se modifica la asociación, debe ser exactamente a un Servicio o a un Producto",
    path: ["serviceId", "productId"], 
  }
)
// Asegurar que no se envíen ambos IDs (incluso si uno es null explícito si el otro tiene valor)
.refine(data => !(data.serviceId && data.productId), {
    message: "No se pueden proporcionar serviceId y productId simultáneamente.",
    path: ["serviceId", "productId"],
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/bono-definitions/[id]
 * Obtiene los detalles de una definición de bono específica.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  console.log(`[API BONO_DEFINITIONS ID] GET request received for ID: ${id}`);
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { systemId } = session.user;
    console.log(`[API BONO_DEFINITIONS ID] Validated session for systemId: ${systemId}`);

    const bonoDefinition = await prisma.bonoDefinition.findUnique({
      where: { id, systemId }, // Asegurar que pertenece al sistema
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
      },
    });

    if (!bonoDefinition) {
      console.warn(`[API BONO_DEFINITIONS ID] Bono definition not found for ID: ${id}`);
      return NextResponse.json({ message: "Definición de bono no encontrada" }, { status: 404 });
    }

    console.log(`[API BONO_DEFINITIONS ID] Found bono definition: ${id}`);
    return NextResponse.json(bonoDefinition);

  } catch (error: any) {
    console.error(`[API BONO_DEFINITIONS ID GET] Error fetching bono ${id}:`, error);
    return NextResponse.json({ message: "Error al obtener la definición de bono", error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/bono-definitions/[id]
 * Actualiza una definición de bono existente.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  console.log(`[API BONO_DEFINITIONS ID] PUT request received for ID: ${id}`);
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { systemId } = session.user;
    console.log(`[API BONO_DEFINITIONS ID] Validated session for systemId: ${systemId}`);

    const rawData = await request.json();
    console.log(`[API BONO_DEFINITIONS ID PUT] Raw data received for ID ${id}:`, rawData);

    // Validar los datos con Zod
    const validatedData = BonoDefinitionUpdateSchema.parse(rawData);
    console.log(`[API BONO_DEFINITIONS ID PUT] Zod validation successful for ID ${id}:`, validatedData);

    // Preparar datos para Prisma (manejar relaciones y nulls)
    const dataToUpdate: Prisma.BonoDefinitionUpdateInput = {
      ...validatedData,
      // Desconectar relación si se pasa null explícitamente, conectar si se pasa ID
      service: validatedData.serviceId === null ? { disconnect: true } 
             : validatedData.serviceId ? { connect: { id: validatedData.serviceId } } 
             : undefined, // No hacer nada si serviceId no está en el payload
      product: validatedData.productId === null ? { disconnect: true } 
             : validatedData.productId ? { connect: { id: validatedData.productId } } 
             : undefined, // No hacer nada si productId no está en el payload
      vatType: validatedData.vatTypeId === null ? { disconnect: true } 
             : validatedData.vatTypeId ? { connect: { id: validatedData.vatTypeId } } 
             : undefined, // No hacer nada si vatTypeId no está en el payload
    };
    // Eliminar los IDs del objeto principal si están presentes, ya que se manejan vía relación
    delete (dataToUpdate as any).serviceId;
    delete (dataToUpdate as any).productId;
    delete (dataToUpdate as any).vatTypeId;

    // Actualizar en la base de datos
    const updatedBonoDefinition = await prisma.bonoDefinition.update({
      where: { id, systemId }, // Asegurar que pertenece al sistema
      data: dataToUpdate,
      include: { // Devolver con las relaciones actualizadas
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
      },
    });

    console.log(`[API BONO_DEFINITIONS ID PUT] Successfully updated bono definition: ${updatedBonoDefinition.id}`);
    return NextResponse.json(updatedBonoDefinition);

  } catch (error: any) {
    console.error(`[API BONO_DEFINITIONS ID PUT] Error updating bono ${id}:`, error);
    if (error instanceof z.ZodError) {
      console.error("[API BONO_DEFINITIONS ID PUT] Zod Validation Error:", error.errors);
      return NextResponse.json({ message: "Error de validación", errors: error.errors }, { status: 400 });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Error común si el registro a actualizar no existe
        return NextResponse.json({ message: "Definición de bono no encontrada" }, { status: 404 });
      }
      if (error.code === 'P2002') {
        return NextResponse.json({ message: "Conflicto, ya existe una definición con ese nombre/código?" }, { status: 409 });
      }
      return NextResponse.json({ message: "Error de base de datos", error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al actualizar la definición de bono", error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/bono-definitions/[id]
 * Elimina una definición de bono específica.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params;
  console.log(`[API BONO_DEFINITIONS ID] DELETE request received for ID: ${id}`);
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { systemId } = session.user;
    console.log(`[API BONO_DEFINITIONS ID] Validated session for systemId: ${systemId}`);

    // Eliminar de la base de datos
    await prisma.bonoDefinition.delete({
      where: { id, systemId }, // Asegurar que pertenece al sistema
    });

    console.log(`[API BONO_DEFINITIONS ID DELETE] Successfully deleted bono definition: ${id}`);
    // return new NextResponse(null, { status: 204 }); // Opción 1: No Content
    return NextResponse.json({ message: "Definición de bono eliminada correctamente" }, { status: 200 }); // Opción 2: Mensaje OK

  } catch (error: any) {
    console.error(`[API BONO_DEFINITIONS ID DELETE] Error deleting bono ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Error si el registro a eliminar no existe
        return NextResponse.json({ message: "Definición de bono no encontrada" }, { status: 404 });
      }
      // Podría haber otros errores si hay relaciones que impiden borrar (ej: instancias de bono activas?)
      // Por ahora, devolvemos un error genérico de DB.
      return NextResponse.json({ message: "Error de base de datos al eliminar", error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al eliminar la definición de bono", error: error.message }, { status: 500 });
  }
} 