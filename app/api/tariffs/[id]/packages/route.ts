import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from '@prisma/client';
import * as z from "zod";

// Esquema para validar el ID de la tarifa en los parámetros
const TariffParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }),
});

// Esquema Zod para añadir múltiples definiciones de paquetes
const addPackagesSchema = z.object({
  packageDefinitionIds: z.array(z.string().cuid({ message: "ID de definición de paquete inválido." }))
                         .min(1, "Debe proporcionar al menos un ID de definición de paquete.")
                         .max(100, "No se pueden añadir más de 100 paquetes a la vez."),
});

/**
 * Handler para OBTENER los IDs de las definiciones de paquetes asociadas a una tarifa específica.
 */
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let tariffIdForLog: string | undefined = undefined;
  try {
    const awaitedParams = await context.params;
    tariffIdForLog = awaitedParams.id;

    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    const paramsValidation = TariffParamsSchema.safeParse(awaitedParams);
    if (!paramsValidation.success) {
      console.error(`[API TARIFFS/${tariffIdForLog ?? 'UNKNOWN_ID'}/PACKAGES GET] Tariff ID Validation Failed:`, paramsValidation.error.errors);
      return new NextResponse(JSON.stringify({ error: "Bad Request: Invalid Tariff ID format.", details: paramsValidation.error.errors }), { status: 400 });
    }
    const tariffId = paramsValidation.data.id;

    const tariffExists = await prisma.tariff.count({
      where: { id: tariffId, systemId: systemId },
    });
    if (tariffExists === 0) {
      return new NextResponse(JSON.stringify({ error: "Not Found: Tarifa no encontrada." }), { status: 404 });
    }

    const tariffPackages = await prisma.tariffPackagePrice.findMany({
      where: { tariffId: tariffId },
      select: { packageDefinitionId: true },
    });

    console.log(`[API TARIFFS/${tariffId}/PACKAGES GET] Retrieved ${tariffPackages.length} associated package definition IDs for System ${systemId}`);

    const packageDefinitionIds = tariffPackages.map(tp => tp.packageDefinitionId);

    return new NextResponse(JSON.stringify(packageDefinitionIds), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[API TARIFFS/${tariffIdForLog ?? 'UNKNOWN_ID'}/PACKAGES GET] Error:`, error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

/**
 * Handler para AÑADIR una o más definiciones de paquete a una tarifa específica,
 * creando o reactivando la relación TariffPackagePrice.
 */
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  let tariffIdForLog: string | undefined = undefined;
  try {
    const awaitedParams = await context.params;
    tariffIdForLog = awaitedParams.id;

    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    const tariffParamsValidation = TariffParamsSchema.safeParse(awaitedParams);
    if (!tariffParamsValidation.success) {
        console.error(`[API TARIFFS/${tariffIdForLog ?? 'UNKNOWN_ID'}/PACKAGES POST BULK] Tariff ID Validation Failed:`, tariffParamsValidation.error.errors);
        return new NextResponse(JSON.stringify({ error: "Bad Request: Invalid Tariff ID format.", details: tariffParamsValidation.error.errors }), { status: 400 });
    }
    const tariffId = tariffParamsValidation.data.id;

    const json = await request.json();
    console.log(`[API TARIFFS/${tariffId}/PACKAGES POST BULK] Received JSON body:`, JSON.stringify(json, null, 2)); 
    
    const validatedBody = addPackagesSchema.safeParse(json);
    if (!validatedBody.success) {
      console.error(`[API TARIFFS/${tariffId}/PACKAGES POST BULK] Zod Validation Failed:`, validatedBody.error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Bad Request: Invalid input.", details: validatedBody.error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const { packageDefinitionIds } = validatedBody.data;

    const tariff = await prisma.tariff.findUnique({
      where: { id: tariffId, systemId: systemId },
      select: { id: true, vatTypeId: true } 
    });
    if (!tariff) {
      return new NextResponse(JSON.stringify({ error: "Not Found: Tarifa no encontrada." }), { status: 404 });
    }

    const results = await prisma.$transaction(async (tx) => {
      const added: string[] = [];
      const reactivated: string[] = [];
      const alreadyActive: string[] = [];
      const notFound: string[] = [];

      for (const packageDefinitionId of packageDefinitionIds) {
        const packageDef = await tx.packageDefinition.findUnique({
          where: { id: packageDefinitionId, systemId: systemId },
          select: { id: true, price: true } // Campos necesarios (IVA vendrá de tarifa? o se calcula?) - Asumimos que no tiene IVA propio por ahora
        });

        if (!packageDef) {
          notFound.push(packageDefinitionId);
          continue;
        }

        const existingRelation = await tx.tariffPackagePrice.findUnique({
          where: { tariffId_packageDefinitionId: { tariffId, packageDefinitionId } },
        });

        if (existingRelation) {
          if (!existingRelation.isActive) {
            await tx.tariffPackagePrice.update({
              where: { tariffId_packageDefinitionId: { tariffId, packageDefinitionId } },
              data: { isActive: true },
            });
            reactivated.push(packageDefinitionId);
          } else {
            alreadyActive.push(packageDefinitionId); 
          }
        } else {
          await tx.tariffPackagePrice.create({
            data: {
              tariffId: tariffId,
              packageDefinitionId: packageDefinitionId,
              price: packageDef.price ?? 0, // Usar precio base de la definición
              // vatTypeId: null, // Paquetes no tienen IVA propio, usan el de la tarifa (o debería calcularse de los items?)
              // Por ahora dejamos null, podría requerir lógica más compleja
              isActive: true,
            },
          });
          added.push(packageDefinitionId);
        }
      } 

      return { added, reactivated, alreadyActive, notFound };
    });

    const messageParts: string[] = [];
    if (results.added.length > 0) messageParts.push(`${results.added.length} añadidos`);
    if (results.reactivated.length > 0) messageParts.push(`${results.reactivated.length} reactivados`);
    if (results.alreadyActive.length > 0) messageParts.push(`${results.alreadyActive.length} ya estaban activos`);
    if (results.notFound.length > 0) messageParts.push(`${results.notFound.length} no encontrados`);
    const finalMessage = messageParts.length > 0 ? messageParts.join(', ') + '.' : 'No se realizaron cambios.';

    console.log(`[API TARIFFS] Bulk Add Package Definitions to Tariff ${tariffId} for System ${systemId}. Results:`, results);

    const status = results.added.length > 0 || results.reactivated.length > 0 ? 201 : 200;
    return new NextResponse(JSON.stringify({ message: finalMessage, details: results }), {
      status: status,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`[API TARIFFS/${tariffIdForLog ?? 'UNKNOWN_ID'}/PACKAGES POST BULK] Error caught in handler:`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 