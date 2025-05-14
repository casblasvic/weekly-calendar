import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";

// Esquema para validar IDs en parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }),        // Tarifa ID
  serviceId: z.string().cuid({ message: "ID de servicio inválido." }), // Servicio ID
});

// Esquema para validar el body de PUT (actualizar precio/IVA/activo)
const UpdateAssociationSchema = z.object({
  price: z.number().positive({ message: "El precio debe ser positivo." }).optional(),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).optional().nullable(),
  isActive: z.boolean().optional(),
}).strict();

// Esquema para validar el cuerpo de la petición PATCH
const updateServicePriceSchema = z.object({
  price: z.number().min(0, "El precio no puede ser negativo.").optional(),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).nullable().optional(), // Permitir null para quitar IVA específico
  isActive: z.boolean().optional(),
});

/**
 * Handler para actualizar los detalles (precio/IVA/activo) de un servicio
 * asociado a una tarifa específica.
 */
export async function PUT(request: Request, { params }: { params: { id: string; serviceId: string } }) {
  // 1. Validar IDs
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'IDs inválidos.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: tariffId, serviceId } = paramsValidation.data;

  try {
    const body = await request.json();

    // 2. Validar Body
    const validation = UpdateAssociationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
    }
    const updateData = validation.data;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
    }

    // 3. Actualizar la entrada en TariffServicePrice
    const updatedAssociation = await prisma.tariffServicePrice.update({
      where: {
        tariffId_serviceId: { tariffId: tariffId, serviceId: serviceId }
      },
      data: updateData,
      include: { // Devolver datos completos
        service: true,
        vatType: true
      }
    });

    return NextResponse.json(updatedAssociation);

  } catch (error) {
    console.error(`Error updating service ${serviceId} association for tariff ${tariffId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // No encontrado (la asociación no existía)
        return NextResponse.json({ message: 'El servicio no está asociado a esta tarifa.' }, { status: 404 });
      }
       if (error.code === 'P2003') { // FK constraint failed (vatTypeId no existe?)
           return NextResponse.json({ message: 'Referencia inválida (ej: tipo de IVA no existe).' }, { status: 400 });
      }
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Handler para ACTUALIZAR los detalles (precio, IVA, estado) de un servicio
 * específico DENTRO de una tarifa concreta.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; serviceId: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    // 1. Validar IDs de los parámetros
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
  }
  const { id: tariffId, serviceId } = paramsValidation.data;

    // 2. Validar cuerpo de la petición
    const json = await request.json();
    const validatedBody = updateServicePriceSchema.safeParse(json);
    if (!validatedBody.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid input.", details: validatedBody.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const dataToUpdate = validatedBody.data;

    // 3. Verificar que la relación TariffServicePrice existe y pertenece al sistema (implícito por tarifa)
    const existingRelation = await prisma.tariffServicePrice.findUnique({
      where: {
        tariffId_serviceId: {
          tariffId: tariffId,
          serviceId: serviceId,
        },
        tariff: {
          systemId: systemId, // Asegurarse que la tarifa pertenece al sistema
        }
      },
    });

    if (!existingRelation) {
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación entre esta tarifa y servicio no existe o no pertenece a tu sistema." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Actualizar la relación
    const updatedRelation = await prisma.tariffServicePrice.update({
      where: {
        tariffId_serviceId: {
          tariffId: tariffId,
          serviceId: serviceId,
        },
      },
      data: dataToUpdate, // Solo actualiza los campos proporcionados
    });

    console.log(`[API TARIFFS] Updated Service ${serviceId} in Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(JSON.stringify(updatedRelation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[API TARIFFS/${params.id}/SERVICES/${params.serviceId} PATCH]`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handler para ELIMINAR (desasociar) un servicio específico de una tarifa.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; serviceId: string } }
) {
  console.log(`[API DELETE /tariffs/${params?.id}/services/${params?.serviceId}] Received request.`);
  // <<< EXTRAER IDs ANTES de la validación >>>
  const { id: tariffId, serviceId } = params;
  console.log(`[API DELETE /tariffs/.../services/...] Extracted params: tariffId=${tariffId}, serviceId=${serviceId}`);

  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
       console.warn(`[API DELETE /tariffs/.../services/...] Unauthorized access attempt.`);
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;
     console.log(`[API DELETE /tariffs/${tariffId}/services/${serviceId}] Authorized for systemId: ${systemId}`);

    // <<< VALIDAR los IDs extraídos >>>
    const paramsValidation = ParamsSchema.safeParse({ id: tariffId, serviceId: serviceId });
    
    console.log(`[API DELETE /tariffs/${tariffId}/services/${serviceId}] Zod Params Validation Result:`, { success: paramsValidation.success });
    if (!paramsValidation.success) {
      console.error(`[API DELETE /tariffs/${tariffId}/services/${serviceId}] Zod Params Validation Failed:`, paramsValidation.error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    // Ya tenemos tariffId y serviceId validados y extraídos
    console.log(`[API DELETE /tariffs/${tariffId}/services/${serviceId}] Params validated successfully.`);

    // Verificar que la relación existe y pertenece al sistema antes de borrar (usar variables)
    const existingRelation = await prisma.tariffServicePrice.findUnique({
       where: {
        tariffId_serviceId: {
          tariffId: tariffId, // Usar variable
          serviceId: serviceId, // Usar variable
        },
        tariff: {
          systemId: systemId, 
        }
      },
       select: { tariffId: true } 
    });

    if (!existingRelation) {
      console.warn(`[API DELETE /tariffs/${tariffId}/services/${serviceId}] Relation not found.`);
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación entre esta tarifa y servicio no existe o no pertenece a tu sistema." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log(`[API DELETE /tariffs/${tariffId}/services/${serviceId}] Existing relation found. Proceeding to delete.`);

    // Eliminar la relación (usar variables)
    await prisma.tariffServicePrice.delete({
      where: {
        tariffId_serviceId: {
          tariffId: tariffId, // Usar variable
          serviceId: serviceId, // Usar variable
        },
      },
    });

    console.log(`[API TARIFFS] Deleted Service ${serviceId} from Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
     console.error(`[API TARIFFS/${tariffId}/SERVICES/${serviceId} DELETE]`, error); // Usar variables en log
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 