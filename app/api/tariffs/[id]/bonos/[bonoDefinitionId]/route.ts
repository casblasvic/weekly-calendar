import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Esquema para validar los IDs en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }), // tariffId
  bonoDefinitionId: z.string().cuid({ message: "ID de definición de bono inválido." }),
});

// Esquema para validar el cuerpo de la petición PATCH
const updateBonoPriceSchema = z.object({
  price: z.number().min(0, "El precio no puede ser negativo.").optional(),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Handler para ACTUALIZAR los detalles de un bono DENTRO de una tarifa.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; bonoDefinitionId: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    const paramsValidation = ParamsSchema.safeParse(params);
    if (!paramsValidation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const { id: tariffId, bonoDefinitionId } = paramsValidation.data;

    const json = await request.json();
    const validatedBody = updateBonoPriceSchema.safeParse(json);
    if (!validatedBody.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid input.", details: validatedBody.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const dataToUpdate = validatedBody.data;

    const existingRelation = await prisma.tariffBonoPrice.findUnique({
      where: {
        tariffId_bonoDefinitionId: {
          tariffId: tariffId,
          bonoDefinitionId: bonoDefinitionId,
        },
        tariff: { systemId: systemId }
      },
    });

    if (!existingRelation) {
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación tarifa-bono no existe." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedRelation = await prisma.tariffBonoPrice.update({
      where: {
        tariffId_bonoDefinitionId: {
          tariffId: tariffId,
          bonoDefinitionId: bonoDefinitionId,
        },
      },
      data: dataToUpdate,
    });

    console.log(`[API TARIFFS] Updated Bono ${bonoDefinitionId} in Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(JSON.stringify(updatedRelation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[API TARIFFS/${params.id}/BONOS/${params.bonoDefinitionId} PATCH]`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handler para ELIMINAR (desasociar) un bono específico de una tarifa.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; bonoDefinitionId: string } }
) {
  // <<< Mover await getServerAuthSession() ANTES de acceder a params >>>
  const session = await getServerAuthSession(); 
  await Promise.resolve(); // Mantener por si acaso

  console.log('[API DELETE /tariffs/.../bonos/...] Received request.');
  // <<< Aplicar await params >>>
  const { id: tariffId, bonoDefinitionId } = await params; 
  console.log(`[API DELETE /tariffs/.../bonos/...] Extracted params: tariffId=${tariffId}, bonoDefinitionId=${bonoDefinitionId}`);
  
  try {
    // <<< Usar la sesión ya obtenida >>>
    if (!session?.user.systemId) {
      console.warn(`[API DELETE /tariffs/.../bonos/...] Unauthorized access attempt.`);
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API DELETE /tariffs/${tariffId}/bonos/${bonoDefinitionId}] Authorized for systemId: ${systemId}`);

    const paramsValidation = ParamsSchema.safeParse({ id: tariffId, bonoDefinitionId: bonoDefinitionId });
    
    console.log(`[API DELETE /tariffs/${tariffId}/bonos/${bonoDefinitionId}] Zod Params Validation Result:`, { success: paramsValidation.success });
    if (!paramsValidation.success) {
      console.error(`[API DELETE /tariffs/${tariffId}/bonos/${bonoDefinitionId}] Zod Params Validation Failed:`, paramsValidation.error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log(`[API DELETE /tariffs/${tariffId}/bonos/${bonoDefinitionId}] Params validated successfully.`);

    const existingRelation = await prisma.tariffBonoPrice.findUnique({
       where: {
        tariffId_bonoDefinitionId: {
          tariffId: tariffId,
          bonoDefinitionId: bonoDefinitionId,
        },
        tariff: { systemId: systemId }
      },
       select: { tariffId: true }
    });

    if (!existingRelation) {
       console.warn(`[API DELETE /tariffs/${tariffId}/bonos/${bonoDefinitionId}] Relation not found.`);
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación tarifa-bono no existe." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log(`[API DELETE /tariffs/${tariffId}/bonos/${bonoDefinitionId}] Existing relation found. Proceeding to delete.`);

    await prisma.tariffBonoPrice.delete({
      where: {
        tariffId_bonoDefinitionId: {
          tariffId: tariffId,
          bonoDefinitionId: bonoDefinitionId,
        },
      },
    });

    console.log(`[API TARIFFS] Deleted Bono ${bonoDefinitionId} from Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
     console.error(`[API TARIFFS/${tariffId}/BONOS/${bonoDefinitionId} DELETE]`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 