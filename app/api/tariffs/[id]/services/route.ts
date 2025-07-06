import { NextResponse } from 'next/server';
// import { getServerAuthSession } from '@/lib/auth'; // No necesario si usamos auth directo
import { prisma } from '@/lib/db';
import { z } from 'zod';
// import { getServerSession } from 'next-auth/next'; // <<< INCORRECTO para v5
// import { authOptions } from '@/lib/auth'; // No necesario si usamos auth directo
import { auth } from '@/lib/auth'; // <<< CORRECTO para v5

// Esquema para validar el ID de la tarifa en los parámetros
const TariffParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }),
});

// Esquema Zod para añadir múltiples servicios (ÚNICO ESQUEMA PARA POST)
const addMultipleServicesSchema = z.object({
  serviceIds: z.array(z.string().cuid({ message: "ID de servicio inválido." }))
                 .min(1, "Debe proporcionar al menos un ID de servicio.")
                 .max(100, "No se pueden añadir más de 100 servicios a la vez."), // Limitar por seguridad/rendimiento
});

/**
 * Handler para AÑADIR uno o más servicios existentes a una tarifa específica,
 * creando o reactivando la relación TariffServicePrice con valores por defecto.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } } // El 'id' aquí es tariffId
) {
  try {
    // const session = await getServerAuthSession(); // <<< Obsoleto
    const session = await auth(); // <<< Usar auth() directamente
    if (!session?.user.systemId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const systemId = session.user.systemId;

    // Validar ID de tarifa
    const tariffParamsValidation = TariffParamsSchema.safeParse({ id: params.id });
  if (!tariffParamsValidation.success) {
        console.error(`[API TARIFFS/${params.id}/SERVICES POST] Invalid Tariff ID:`, tariffParamsValidation.error.format());
        return NextResponse.json({ error: "Bad Request: Invalid Tariff ID format.", details: tariffParamsValidation.error.format() }, { status: 400 });
  }
    const tariffId = tariffParamsValidation.data.id;

    // Validar el cuerpo de la petición
    const json = await request.json();
    const validatedBody = addMultipleServicesSchema.safeParse(json);
    if (!validatedBody.success) {
      console.error(`[API TARIFFS/${tariffId}/SERVICES POST] Invalid Body:`, validatedBody.error.format());
      return NextResponse.json(
        { error: "Bad Request: Invalid input.", details: validatedBody.error.format() },
        { status: 400 }
      );
    }
    const { serviceIds } = validatedBody.data;

    // Verificar que la tarifa pertenece al sistema (opcional pero recomendado)
    const tariff = await prisma.tariff.findUnique({
      where: { id: tariffId, systemId: systemId },
      select: { id: true } // Solo necesitamos saber si existe
    });
    if (!tariff) {
      return NextResponse.json({ error: "Not Found: Tarifa no encontrada." }, { status: 404 });
    }

    // Procesar IDs en una transacción
    const results = await prisma.$transaction(async (tx) => {
      const added: string[] = [];
      const reactivated: string[] = [];
      const alreadyActive: string[] = [];
      const notFound: string[] = [];

      // Obtener datos de TODOS los servicios solicitados en una sola query
      const servicesData = await tx.service.findMany({
        where: {
          id: { in: serviceIds },
          systemId: systemId, // Asegurar pertenencia al sistema
        },
        select: { id: true, price: true, vatTypeId: true }
      });
      const serviceDataMap = new Map(servicesData.map(s => [s.id, s]));

      // Obtener relaciones existentes para TODOS los servicios en una sola query
      const existingRelations = await tx.tariffServicePrice.findMany({
        where: {
          tariffId: tariffId,
          serviceId: { in: serviceIds }
        },
        select: { serviceId: true, isActive: true }
      });
      const existingRelationMap = new Map(existingRelations.map(r => [r.serviceId, r]));

      // Preparar datos para creación y actualización
      const relationsToCreate: Prisma.TariffServicePriceCreateManyInput[] = [];
      const relationsToReactivate: string[] = []; // IDs de servicio a reactivar

      for (const serviceId of serviceIds) {
        const service = serviceDataMap.get(serviceId);

        if (!service) {
          notFound.push(serviceId);
          continue;
        }

        const existingRelation = existingRelationMap.get(serviceId);

        if (existingRelation) {
          if (!existingRelation.isActive) {
            relationsToReactivate.push(serviceId);
          } else {
            alreadyActive.push(serviceId);
          }
        } else {
          relationsToCreate.push({
            tariffId: tariffId,
            serviceId: serviceId,
            price: service.price ?? 0, // Usar precio base del servicio
            vatTypeId: service.vatTypeId, // Usar IVA base del servicio
            isActive: true,
          });
        }
      } // Fin for

      // Ejecutar operaciones masivas
      if (relationsToCreate.length > 0) {
        await tx.tariffServicePrice.createMany({ data: relationsToCreate });
        added.push(...relationsToCreate.map(r => r.serviceId));
      }
      if (relationsToReactivate.length > 0) {
        await tx.tariffServicePrice.updateMany({
          where: { tariffId: tariffId, serviceId: { in: relationsToReactivate } },
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
    if (results.notFound.length > 0) messageParts.push(`${results.notFound.length} servicios no encontrados o no pertenecen a tu sistema`);
    const finalMessage = messageParts.length > 0 ? messageParts.join(', ') + '.' : 'No se realizaron cambios.';

    console.log(`[API TARIFFS/${tariffId}/SERVICES POST] Bulk association result:`, results);

    const status = results.added.length > 0 ? 201 : 200;
    return NextResponse.json({ message: finalMessage, details: results }, {
      status: status,
    });

  } catch (error) {
    // Captura general de errores
    let tariffIdForLog = 'unknown';
    try { 
        const validatedParams = TariffParamsSchema.safeParse({ id: params.id });
        if (validatedParams.success) tariffIdForLog = validatedParams.data.id;
    } catch (_) { /* Ignorar */ }

    console.error(`[API TARIFFS/${tariffIdForLog}/SERVICES POST] Error:`, error);
    if (error instanceof z.ZodError) {
        // Error de validación Zod que se nos escapó?
        return NextResponse.json({ error: "Bad Request: Invalid Data", details: error.format() }, { status: 400 });
    }
    // Añadir más manejos de errores específicos si es necesario
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Handler para OBTENER la lista de servicios asociados a una tarifa específica,
 * junto con sus precios y configuraciones particulares para esa tarifa.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let systemId: string | undefined;
  let tariffIdForLog = 'unknown';

  try {
    const session = await auth();
    systemId = session?.user?.systemId;
    if (!systemId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized: Missing systemId" }), { status: 401 });
    }

    // Await params antes de usarlo
    const resolvedParams = await params;
    const tariffId = resolvedParams.id;
    tariffIdForLog = tariffId;

    // Validar ID de tarifa
    const tariffParamsValidation = TariffParamsSchema.safeParse({ id: tariffId });
    if (!tariffParamsValidation.success) {
      console.error(`[API tariffs/${tariffIdForLog}/services GET] Validation Error:`, tariffParamsValidation.error.flatten());
      return new NextResponse(
        JSON.stringify({ 
          error: "Validation Error", 
          details: tariffParamsValidation.error.flatten() 
        }), 
        { status: 400 }
      );
    }

    console.log(`[API tariffs/${tariffId}/services GET] System ${systemId} fetching services for tariff ${tariffId}`);

    // Obtener los servicios asociados a esta tarifa
    const tariffServices = await prisma.tariffServicePrice.findMany({
      where: {
        tariffId: tariffId,
        isActive: true,
        tariff: {
          systemId: systemId
        }
      },
      include: {
        service: {
          include: {
            category: true
          }
        }
      }
    });

    console.log(`[API tariffs/${tariffId}/services GET] Found ${tariffServices.length} services for tariff`);

    // Formatear la respuesta
    const formattedServices = tariffServices.map(ts => ({
      id: ts.service.id,
      serviceId: ts.serviceId,
      name: ts.service.name,
      description: ts.service.description,
      price: ts.price,
      durationMinutes: ts.service.durationMinutes,
      duration: Math.ceil(ts.service.durationMinutes / 15), // Convertir a slots de 15 minutos
      category: ts.service.category ? {
        id: ts.service.category.id,
        name: ts.service.category.name
      } : null,
      // Campos específicos de la tarifa
      tariffPrice: ts.price
    }));

    return NextResponse.json(formattedServices);

  } catch (error) {
    console.error(`[API tariffs/${tariffIdForLog}/services GET] System ${systemId || 'unknown'} - Error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}