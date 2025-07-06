import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db'; 
import { getServerAuthSession } from '@/lib/auth'; 
import { ApiBonoDefinitionPayloadSchema } from '@/lib/schemas/bono-definition'; // <<< Importar nuevo schema

// Eliminar schema Zod local
// const BonoDefinitionUpdateSchema = z.object({ ... });

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
      where: { id, systemId }, 
      include: {
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
        settings: true, // <<< Incluir settings
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ message: "Definición de bono no encontrada" }, { status: 404 });
    }
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

    // Validar los datos con el schema importado
    const validatedData = ApiBonoDefinitionPayloadSchema.parse(rawData);
    console.log(`[API BONO_DEFINITIONS ID PUT] Zod validation successful for ID ${id}:`, validatedData);

    const { serviceId, productId, vatTypeId, settings, ...bonoBaseData } = validatedData;

    // Verificar existencia y pertenencia ANTES de la transacción
    const existingBonoDefCheck = await prisma.bonoDefinition.findUnique({ 
        where: { id: id, systemId: systemId } 
    });
    if (!existingBonoDefCheck) {
        return NextResponse.json({ message: `Definición de bono ${id} no encontrada en este sistema` }, { status: 404 });
    }

    // Transacción para actualizar
    const updatedBonoDefWithSettings = await prisma.$transaction(async (tx) => {
        // 1. Actualizar BonoDefinition base
        await tx.bonoDefinition.update({
            where: { id: id, systemId: systemId }, // Doble check
            data: {
                name: bonoBaseData.name,
                quantity: bonoBaseData.quantity,
                price: bonoBaseData.price,
                description: bonoBaseData.description,
                // Manejar relaciones
                service: serviceId === null ? { disconnect: true } 
                       : serviceId ? { connect: { id: serviceId } } 
                       : undefined, 
                product: productId === null ? { disconnect: true } 
                       : productId ? { connect: { id: productId } } 
                       : undefined, 
                vatType: vatTypeId === null ? { disconnect: true } 
                       : vatTypeId ? { connect: { id: vatTypeId } } 
                       : undefined, 
            }
        });

        // 2. Upsert de BonoDefinitionSetting
        await tx.bonoDefinitionSetting.upsert({
            where: { bonoDefinitionId: id },
            create: { 
                ...settings,
                bonoDefinition: { connect: { id: id } } 
            },
            update: settings,
        });

        // 3. Devolver el bono actualizado con settings
        return await tx.bonoDefinition.findUniqueOrThrow({
            where: { id: id },
            include: { 
                settings: true, 
        service: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        vatType: { select: { id: true, name: true, rate: true } },
            }
        });
    });

    console.log(`[API BONO_DEFINITIONS ID PUT] Successfully updated bono definition: ${updatedBonoDefWithSettings.id}`);
    return NextResponse.json(updatedBonoDefWithSettings);

  } catch (error: any) {
    console.error(`[API BONO_DEFINITIONS ID PUT] Error updating bono ${id}:`, error);
    if (error instanceof z.ZodError) {
      console.error("[API BONO_DEFINITIONS ID PUT] Zod Validation Error:", error.errors);
      return NextResponse.json({ message: "Error de validación", errors: error.errors }, { status: 400 });
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: "Definición de bono no encontrada" }, { status: 404 });
      }
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'nombre';
        return NextResponse.json({ message: `Conflicto, ya existe una definición con ese ${target}` }, { status: 409 });
      }
      if (error.code === 'P2003') {
           const fieldName = (error.meta?.field_name as string) || 'relacionado';
           return NextResponse.json({ message: `Referencia inválida: El servicio, producto o tipo de IVA no existe (campo: ${fieldName}).` }, { status: 400 });
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

    // TODO: Verificar si existen instancias de Bono asociadas a esta definición antes de borrar
    // const activeInstances = await prisma.bono.count({ where: { definitionId: id, status: 'ACTIVE' } });
    // if (activeInstances > 0) {
    //    return NextResponse.json({ message: `No se puede eliminar: Existen ${activeInstances} bonos activos basados en esta definición.` }, { status: 409 });
    // }

    // Usar transacción para asegurar la verificación del sistema
    await prisma.$transaction(async (tx) => {
      // 1. Verificar existencia y pertenencia
      const existingBonoDef = await tx.bonoDefinition.findUnique({ 
          where: { id: id, systemId: systemId } 
      });
      if (!existingBonoDef) {
          throw new Prisma.PrismaClientKnownRequestError(
              `Definición de bono ${id} no encontrada en este sistema`, 
              { code: 'P2025', clientVersion: 'tx' }
          );
      }
      
      // 2. Eliminar (la cascada maneja BonoDefinitionSetting)
      await tx.bonoDefinition.delete({
        where: { id: id, systemId: systemId }, // Doble check
      });
    });

    console.log(`[API BONO_DEFINITIONS ID DELETE] Successfully deleted bono definition: ${id}`);
    return NextResponse.json({ message: "Definición de bono eliminada correctamente" }, { status: 200 }); 

  } catch (error: any) {
    console.error(`[API BONO_DEFINITIONS ID DELETE] Error deleting bono ${id}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: "Definición de bono no encontrada" }, { status: 404 });
      }
      if (error.code === 'P2003'){ // Si hay instancias de Bono que bloquean
         return NextResponse.json({ message: "No se puede eliminar: La definición está en uso por bonos existentes." }, { status: 409 });
      }
      return NextResponse.json({ message: "Error de base de datos al eliminar", error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al eliminar la definición de bono", error: error.message }, { status: 500 });
  }
} 