import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Esquema para validar los IDs en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }), // tariffId
  packageDefinitionId: z.string().cuid({ message: "ID de definición de paquete inválido." }),
});

// Esquema para validar el cuerpo de la petición PATCH
const updatePackagePriceSchema = z.object({
  price: z.number().min(0, "El precio no puede ser negativo.").optional(),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * Handler para ACTUALIZAR los detalles de un paquete DENTRO de una tarifa.
 */
export async function PATCH(
  request: Request,
  context: { params: { id: string; packageDefinitionId: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    const awaitedParams = await context.params;

    const paramsValidation = ParamsSchema.safeParse(awaitedParams);
    if (!paramsValidation.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const { id: tariffId, packageDefinitionId } = paramsValidation.data;

    const json = await request.json();
    const validatedBody = updatePackagePriceSchema.safeParse(json);
    if (!validatedBody.success) {
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid input.", details: validatedBody.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const dataToUpdate = validatedBody.data;

    const existingRelation = await prisma.tariffPackagePrice.findUnique({
      where: {
        tariffId_packageDefinitionId: {
          tariffId: tariffId,
          packageDefinitionId: packageDefinitionId,
        },
        tariff: { systemId: systemId }
      },
    });

    if (!existingRelation) {
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación tarifa-paquete no existe." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedRelation = await prisma.tariffPackagePrice.update({
      where: {
        tariffId_packageDefinitionId: {
          tariffId: tariffId,
          packageDefinitionId: packageDefinitionId,
        },
      },
      data: dataToUpdate,
    });

    console.log(`[API TARIFFS] Updated Package ${packageDefinitionId} in Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(JSON.stringify(updatedRelation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[API TARIFFS/.../PACKAGES/... PATCH] Error en la ruta. Detalle:`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handler para ELIMINAR (desasociar) un paquete específico de una tarifa.
 */
export async function DELETE(
  request: Request,
  context: { params: { id: string; packageDefinitionId: string } }
) {
  let tariffIdForLog: string | undefined = undefined;
  let packageDefinitionIdForLog: string | undefined = undefined;

  try {
    const awaitedParams = await context.params;
    tariffIdForLog = awaitedParams?.id;
    packageDefinitionIdForLog = awaitedParams?.packageDefinitionId;

    console.log(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Received request.`);
    
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
       console.warn(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Unauthorized access attempt.`);
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;
    console.log(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Authorized for systemId: ${systemId}`);

    const paramsValidation = ParamsSchema.safeParse(awaitedParams);

    console.log(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Zod Params Validation Result:`, { success: paramsValidation.success });
    if (!paramsValidation.success) {
      console.error(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Zod Params Validation Failed:`, paramsValidation.error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid IDs.", details: paramsValidation.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Params validated successfully.`);
    
    const { id: tariffId, packageDefinitionId } = paramsValidation.data;
    tariffIdForLog = tariffId;
    packageDefinitionIdForLog = packageDefinitionId;

    const existingRelation = await prisma.tariffPackagePrice.findUnique({
       where: {
        tariffId_packageDefinitionId: {
          tariffId: tariffId,
          packageDefinitionId: packageDefinitionId,
        },
        tariff: { systemId: systemId }
      },
       select: { tariffId: true }
    });

    if (!existingRelation) {
      console.warn(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Relation not found.`);
      return new NextResponse(
        JSON.stringify({ error: "Not Found: La relación tarifa-paquete no existe." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    console.log(`[API DELETE /tariffs/${tariffIdForLog}/packages/${packageDefinitionIdForLog}] Existing relation found. Proceeding to delete.`);

    await prisma.tariffPackagePrice.delete({
      where: {
        tariffId_packageDefinitionId: {
          tariffId: tariffId,
          packageDefinitionId: packageDefinitionId,
        },
      },
    });

    console.log(`[API TARIFFS] Deleted Package ${packageDefinitionId} from Tariff ${tariffId} for System ${systemId}`);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
     console.error(`[API TARIFFS/${tariffIdForLog ?? 'UNKNOWN_TID'}/PACKAGES/${packageDefinitionIdForLog ?? 'UNKNOWN_PID'} DELETE]`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 