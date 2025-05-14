import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from '@prisma/client';
import * as z from "zod";

// Esquema para validar el ID de la tarifa en los parámetros
const TariffParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }),
});

// Esquema Zod para añadir múltiples productos (ÚNICO ESQUEMA PARA POST)
const addMultipleProductsSchema = z.object({
  productIds: z.array(z.string().cuid({ message: "ID de producto inválido." }))
                 .min(1, "Debe proporcionar al menos un ID de producto.")
                 .max(100, "No se pueden añadir más de 100 productos a la vez."),
});

/**
 * Handler para AÑADIR uno o más productos existentes a una tarifa específica,
 * creando o reactivando la relación TariffProductPrice con valores por defecto.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } } // El 'id' aquí es tariffId
) {
  // Forzar la resolución de la promesa de params (necesario en App Router > 14)
  await Promise.resolve(); 
  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Validar ID de tarifa
    const tariffParamsValidation = TariffParamsSchema.safeParse({ id: params.id });
    if (!tariffParamsValidation.success) {
        console.error(`[API TARIFFS/${params.id}/PRODUCTS POST] Invalid Tariff ID:`, tariffParamsValidation.error.format());
        return NextResponse.json({ error: "Bad Request: Invalid Tariff ID format.", details: tariffParamsValidation.error.format() }, { status: 400 });
    }
    const tariffId = tariffParamsValidation.data.id;

    // Validar el cuerpo de la petición
    const json = await request.json();
    const validatedBody = addMultipleProductsSchema.safeParse(json);
    if (!validatedBody.success) {
      console.error(`[API TARIFFS/${tariffId}/PRODUCTS POST] Invalid Body:`, validatedBody.error.format());
      return NextResponse.json(
        { error: "Bad Request: Invalid input.", details: validatedBody.error.format() },
        { status: 400 }
      );
    }
    const { productIds } = validatedBody.data;

    // Verificar que la tarifa pertenece al sistema
    const tariff = await prisma.tariff.findUnique({
      where: { id: tariffId, systemId: systemId },
      select: { id: true }
    });
    if (!tariff) {
      return NextResponse.json({ error: "Not Found: Tarifa no encontrada." }, { status: 404 });
    }

    // Procesar IDs en una transacción (OPTIMIZADO)
    const results = await prisma.$transaction(async (tx) => {
      const added: string[] = [];
      const reactivated: string[] = [];
      const alreadyActive: string[] = [];
      const notFound: string[] = [];

      // Obtener datos de productos solicitados
      const productsData = await tx.product.findMany({
        where: { id: { in: productIds }, systemId: systemId },
        select: { id: true, price: true, vatTypeId: true }
      });
      const productDataMap = new Map(productsData.map(p => [p.id, p]));

      // Obtener relaciones existentes
      const existingRelations = await tx.tariffProductPrice.findMany({
        where: { tariffId: tariffId, productId: { in: productIds } },
        select: { productId: true, isActive: true }
      });
      const existingRelationMap = new Map(existingRelations.map(r => [r.productId, r]));

      // Preparar datos
      const relationsToCreate: Prisma.TariffProductPriceCreateManyInput[] = [];
      const relationsToReactivate: string[] = [];

      for (const productId of productIds) {
        const product = productDataMap.get(productId);
        if (!product) {
          notFound.push(productId);
          continue;
        }
        const existingRelation = existingRelationMap.get(productId);
        if (existingRelation) {
          if (!existingRelation.isActive) {
            relationsToReactivate.push(productId);
          } else {
            alreadyActive.push(productId);
          }
        } else {
          relationsToCreate.push({
            tariffId: tariffId,
            productId: productId,
            price: product.price ?? 0,
            vatTypeId: product.vatTypeId,
            isActive: true,
          });
        }
      } // Fin for

      // Ejecutar operaciones masivas
      if (relationsToCreate.length > 0) {
        await tx.tariffProductPrice.createMany({ data: relationsToCreate });
        added.push(...relationsToCreate.map(r => r.productId));
      }
      if (relationsToReactivate.length > 0) {
        await tx.tariffProductPrice.updateMany({
          where: { tariffId: tariffId, productId: { in: relationsToReactivate } },
          data: { isActive: true },
        });
        reactivated.push(...relationsToReactivate);
      }

      return { added, reactivated, alreadyActive, notFound };
    }); // Fin transaction

    // Construir mensaje de respuesta
    const messageParts: string[] = [];
    if (results.added.length > 0) messageParts.push(`${results.added.length} añadidos`);
    if (results.reactivated.length > 0) messageParts.push(`${results.reactivated.length} reactivados`);
    if (results.alreadyActive.length > 0) messageParts.push(`${results.alreadyActive.length} ya estaban activos`);
    if (results.notFound.length > 0) messageParts.push(`${results.notFound.length} productos no encontrados o no pertenecen a tu sistema`);
    const finalMessage = messageParts.length > 0 ? messageParts.join(', ') + '.' : 'No se realizaron cambios.';

    console.log(`[API TARIFFS/${tariffId}/PRODUCTS POST] Bulk association result:`, results);

    const status = results.added.length > 0 ? 201 : 200;
    return NextResponse.json({ message: finalMessage, details: results }, {
      status: status,
    });

  } catch (error) {
    let tariffIdForLog = 'unknown';
    try { 
        const validatedParams = TariffParamsSchema.safeParse({ id: params.id });
        if (validatedParams.success) tariffIdForLog = validatedParams.data.id;
    } catch (_) { /* Ignorar */ }

    console.error(`[API TARIFFS/${tariffIdForLog}/PRODUCTS POST] Error:`, error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Bad Request: Invalid Data", details: error.format() }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Handler para OBTENER los IDs de los productos asociados a una tarifa específica.
 * Utilizado principalmente para el modo de selección en la UI.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Forzar la resolución de la promesa de params explícitamente
  await Promise.resolve();
  try {
    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    // Validar ID de tarifa (volviendo a pasar explícitamente id)
    const paramsValidation = TariffParamsSchema.safeParse({ id: params.id });
    if (!paramsValidation.success) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Invalid Tariff ID format.", details: paramsValidation.error.errors }), { status: 400 });
    }
    const tariffId = paramsValidation.data.id;

    // 1. Verificar que la tarifa existe (opcional pero bueno)
    const tariffExists = await prisma.tariff.count({
      where: { id: tariffId, systemId: systemId },
    });
    if (tariffExists === 0) {
      return new NextResponse(JSON.stringify({ error: "Not Found: Tarifa no encontrada." }), { status: 404 });
    }

    // 2. Obtener solo los IDs de los productos asociados (activos o inactivos)
    const tariffProducts = await prisma.tariffProductPrice.findMany({
      where: {
        tariffId: tariffId,
        // No filtramos por systemId aquí, ya que la tarifa ya está validada
      },
      select: {
        productId: true, // Solo necesitamos el ID del producto
      },
    });

    console.log(`[API TARIFFS/${tariffId}/PRODUCTS GET] Retrieved ${tariffProducts.length} associated product IDs for System ${systemId}`);

    // Devolver solo el array de IDs
    const productIds = tariffProducts.map(tp => tp.productId);

    return new NextResponse(JSON.stringify(productIds), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    let tariffIdForLog = 'unknown';
    try { tariffIdForLog = params.id; } catch (_) { /* Ignorar */ }
    console.error(`[API TARIFFS/${tariffIdForLog}/PRODUCTS GET] Error:`, error);
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 