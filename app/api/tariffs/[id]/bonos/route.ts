import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from '@prisma/client';
import * as z from "zod";

// Esquema para validar el ID de la tarifa en los parámetros
const TariffParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }),
});

// Esquema Zod para añadir múltiples definiciones de bonos
const addBonosSchema = z.object({
  bonoDefinitionIds: z.array(z.string().cuid({ message: "ID de definición de bono inválido." }))
                      .min(1, "Debe proporcionar al menos un ID de definición de bono.")
                      .max(100, "No se pueden añadir más de 100 bonos a la vez."), 
});

/**
 * Handler para OBTENER los IDs de las definiciones de bonos asociadas a una tarifa específica.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('[API TARIFFS/.../BONOS GET] Received request.');
  try {
    const session = await getServerAuthSession();
    await Promise.resolve();
    const { id: tariffId } = await params;

    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    const paramsValidation = TariffParamsSchema.safeParse({ id: tariffId });
    if (!paramsValidation.success) {
      return new NextResponse(JSON.stringify({ error: "Bad Request: Invalid Tariff ID format.", details: paramsValidation.error.errors }), { status: 400 });
    }

    const tariffExists = await prisma.tariff.count({
      where: { id: tariffId, systemId: systemId },
    });
    if (tariffExists === 0) {
      return new NextResponse(JSON.stringify({ error: "Not Found: Tarifa no encontrada." }), { status: 404 });
    }

    const tariffBonos = await prisma.tariffBonoPrice.findMany({
      where: { tariffId: tariffId },
      select: { bonoDefinitionId: true },
    });

    console.log(`[API TARIFFS/${tariffId}/BONOS GET] Retrieved ${tariffBonos.length} associated bono definition IDs for System ${systemId}`);

    const bonoDefinitionIds = tariffBonos.map(tb => tb.bonoDefinitionId);

    return new NextResponse(JSON.stringify(bonoDefinitionIds), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    let tariffIdForLog = 'unknown';
    try {
      const resolvedParams = await Promise.resolve(params);
      tariffIdForLog = resolvedParams.id;
    } catch (_) { /* Ignorar si params falla aquí */ }
    console.error(`[API TARIFFS/${tariffIdForLog}/BONOS GET] Error:`, error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
}

/**
 * Handler para AÑADIR una o más definiciones de bono a una tarifa específica,
 * creando o reactivando la relación TariffBonoPrice (OPTIMIZADO).
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } } // El 'id' aquí es tariffId
) {
  console.log('[API TARIFFS/.../BONOS POST] Received request.');
  try {
    const json = await request.json();

    const session = await getServerAuthSession();
    if (!session?.user.systemId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { id: tariffId } = await params;
    console.log(`[API TARIFFS/.../BONOS POST] Validating tariff ID: ${tariffId}`);
    
    const tariffParamsValidation = TariffParamsSchema.safeParse({ id: tariffId });
    if (!tariffParamsValidation.success) {
        console.error(`[API TARIFFS/${tariffId}/BONOS POST] Invalid Tariff ID:`, tariffParamsValidation.error.format());
        return NextResponse.json({ error: "Bad Request: Invalid Tariff ID format.", details: tariffParamsValidation.error.format() }, { status: 400 });
    }

    const tariff = await prisma.tariff.findUnique({
      where: { id: tariffId, systemId: systemId },
      select: { id: true } 
    });
    if (!tariff) {
      return NextResponse.json({ error: "Not Found: Tarifa no encontrada." }, { status: 404 });
    }

    const validatedBody = addBonosSchema.safeParse(json);
    if (!validatedBody.success) {
      console.error(`[API TARIFFS/${tariffId}/BONOS POST] Invalid Body:`, validatedBody.error.format());
      return NextResponse.json(
        { error: "Bad Request: Invalid input.", details: validatedBody.error.format() },
        { status: 400 }
      );
    }
    const { bonoDefinitionIds } = validatedBody.data;

    const results = await prisma.$transaction(async (tx) => {
      const added: string[] = [];
      const reactivated: string[] = [];
      const alreadyActive: string[] = [];
      const notFound: string[] = [];

      const bonoDefsData = await tx.bonoDefinition.findMany({
        where: {
          id: { in: bonoDefinitionIds },
          systemId: systemId,
        },
        select: { id: true, price: true, vatTypeId: true }
      });
      const bonoDefDataMap = new Map(bonoDefsData.map(b => [b.id, b]));

      const existingRelations = await tx.tariffBonoPrice.findMany({
        where: {
          tariffId: tariffId,
          bonoDefinitionId: { in: bonoDefinitionIds }
        },
        select: { bonoDefinitionId: true, isActive: true }
      });
      const existingRelationMap = new Map(existingRelations.map(r => [r.bonoDefinitionId, r]));

      const relationsToCreate: Prisma.TariffBonoPriceCreateManyInput[] = [];
      const relationsToReactivate: string[] = [];

      for (const bonoDefinitionId of bonoDefinitionIds) {
        const bonoDef = bonoDefDataMap.get(bonoDefinitionId);

        if (!bonoDef) {
          notFound.push(bonoDefinitionId);
          continue;
        }

        const existingRelation = existingRelationMap.get(bonoDefinitionId);

        if (existingRelation) {
          if (!existingRelation.isActive) {
            relationsToReactivate.push(bonoDefinitionId);
          } else {
            alreadyActive.push(bonoDefinitionId);
          }
        } else {
          relationsToCreate.push({
            tariffId: tariffId,
            bonoDefinitionId: bonoDefinitionId,
            price: bonoDef.price ?? 0,
            vatTypeId: bonoDef.vatTypeId,
            isActive: true,
          });
        }
      }

      if (relationsToCreate.length > 0) {
        await tx.tariffBonoPrice.createMany({ data: relationsToCreate });
        added.push(...relationsToCreate.map(r => r.bonoDefinitionId));
      }
      if (relationsToReactivate.length > 0) {
        await tx.tariffBonoPrice.updateMany({
          where: { tariffId: tariffId, bonoDefinitionId: { in: relationsToReactivate } },
          data: { isActive: true },
        });
        reactivated.push(...relationsToReactivate);
      }

      return { added, reactivated, alreadyActive, notFound };
    });

    const messageParts: string[] = [];
    if (results.added.length > 0) messageParts.push(`${results.added.length} añadidos`);
    if (results.reactivated.length > 0) messageParts.push(`${results.reactivated.length} reactivados`);
    if (results.alreadyActive.length > 0) messageParts.push(`${results.alreadyActive.length} ya estaban activos`);
    if (results.notFound.length > 0) messageParts.push(`${results.notFound.length} bonos no encontrados o no pertenecen a tu sistema`);
    const finalMessage = messageParts.length > 0 ? messageParts.join(', ') + '.' : 'No se realizaron cambios.';

    console.log(`[API TARIFFS/${tariffId}/BONOS POST] Bulk association result:`, results);

    const status = results.added.length > 0 ? 201 : 200;
    return NextResponse.json({ message: finalMessage, details: results }, {
      status: status,
    });

  } catch (error) {
    let tariffIdForLog = 'unknown';
    try { tariffIdForLog = params.id; } catch (_) { /* Ignorar */ }
    console.error(`[API TARIFFS/${tariffIdForLog}/BONOS POST] Error:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Bad Request: Invalid Data", details: error.format() }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 