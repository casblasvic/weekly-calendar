import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";
import { ApiServicePayloadSchema, ServiceFormValues } from '@/lib/schemas/service';

/**
 * Handler para obtener todos los servicios.
 * @param request La solicitud entrante.
 * @returns NextResponse con la lista de servicios o un error.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();

  if (!session || !session.user?.systemId) {
    console.error("API GET /api/services: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  const systemId = session.user.systemId;
  console.log("API GET /api/services: Usando systemId de la sesión:", systemId);

  const { searchParams } = new URL(request.url);
  const clinicId = searchParams.get('clinicId');
  const isActiveParam = searchParams.get('isActive');

  let whereClause: Prisma.ServiceWhereInput = {
      systemId: systemId,
  };

  if (clinicId) {
    console.warn("[API Services GET] Filtrado por clinicId no implementado directamente en Service.");
    // TODO: Lógica de filtrado por clínica (si es necesario)
  }

  // --- Filtrar por isActive usando la tabla settings --- 
  if (isActiveParam !== null) {
    const isActiveValue = isActiveParam === 'true';
    whereClause.settings = {
        isActive: isActiveValue
    };
  }

  try {
    const services = await prisma.service.findMany({
      where: whereClause,
      include: {
        category: true,
        vatType: true,
        settings: true,
        tariffPrices: {
          where: { isActive: true },
          select: {
            tariff: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para crear un nuevo servicio.
 * @param request La solicitud entrante con los datos del nuevo servicio.
 * @returns NextResponse con el nuevo servicio y estado 201, o un error.
 */
export async function POST(request: Request) {
  const session = await getServerAuthSession();

  if (!session || !session.user?.systemId) {
    console.error("API POST /api/services: Sesión no válida o falta systemId", { session });
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: session ? 500 : 401 });
  }
  const sessionSystemId = session.user.systemId;
  console.log("API POST /api/services: Usando systemId de la sesión:", sessionSystemId);

  try {
    const body = await request.json();

    // Validar usando el schema específico de la API
    const validatedData = ApiServicePayloadSchema.parse(body);

    const { categoryId, vatTypeId, settings, equipmentIds, skillIds, ...serviceBaseData } = validatedData;

    // Usar transacción para asegurar atomicidad
    const newServiceWithSettings = await prisma.$transaction(async (tx) => {
      // 1. Crear el Servicio base
      const newService = await tx.service.create({
        data: {
          // Campos obligatorios explícitos
        name: validatedData.name, 
        durationMinutes: validatedData.durationMinutes, 
          // Resto de campos base (opcionales)
          code: validatedData.code,
          description: validatedData.description,
          price: validatedData.price,
          colorCode: validatedData.colorCode,
          // Conexiones de relaciones
        system: {
            connect: { id: sessionSystemId }
        },
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(vatTypeId && { vatType: { connect: { id: vatTypeId } } }),
        },
      });

      // 2. Crear los Settings asociados
      const newSettings = await tx.serviceSetting.create({
        data: {
          ...settings,
          service: {
            connect: { id: newService.id }
          }
        }
      });
      
      // 3. Crear relaciones M-M para Equipos (si existen)
      if (equipmentIds && equipmentIds.length > 0) {
          await tx.serviceEquipmentRequirement.createMany({
              data: equipmentIds.map(eqId => ({ serviceId: newService.id, equipmentId: eqId }))
          });
      }
      
      // 4. Crear relaciones M-M para Habilidades (si existen)
      if (skillIds && skillIds.length > 0) {
          await tx.serviceSkillRequirement.createMany({
              data: skillIds.map(skId => ({ serviceId: newService.id, skillId: skId }))
          });
      }

      // 5. Devolver el servicio completo con settings (y opcionalmente relaciones M-M si necesario)
      //    Para devolverlo necesitamos hacer un find final DENTRO de la transacción
      //    o construir el objeto manualmente (más simple si solo necesitamos settings)
      //    Vamos a construirlo manualmente para simplificar
      return { ...newService, settings: newSettings }; 
      // Alternativa (más costosa): 
      // return await tx.service.findUnique({ 
      //   where: { id: newService.id }, 
      //   include: { settings: true, category: true, vatType: true } 
      // });
    });

    // Recuperar relaciones asociadas fuera de la transacción si es necesario para la respuesta completa
    const finalServiceResponse = await prisma.service.findUnique({
        where: { id: newServiceWithSettings.id },
      include: {
            settings: true,
        category: true,
            vatType: true
            // Incluir equipmentRequirements y skillRequirements si el frontend los necesita inmediatamente
            // equipmentRequirements: { include: { equipment: true } }, 
            // skillRequirements: { include: { skill: true } },
        }
    });

    return NextResponse.json(finalServiceResponse, { status: 201 });

  } catch (error) {
    console.error("Error creating service:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { 
        // Detectar qué campo causó el error si es posible desde error.meta.target
        const target = (error.meta?.target as string[])?.join(', ') || 'desconocido';
        console.error(`Error de unicidad en campos: ${target}`);
        return NextResponse.json({ message: `Conflicto: El servicio ya existe o viola una restricción única (campo: ${target}).` }, { status: 409 });
      }
      if (error.code === 'P2003') { 
        const fieldName = (error.meta?.field_name as string) || 'desconocido';
        console.error(`Error de clave foránea en campo: ${fieldName}`);
        return NextResponse.json({ message: `Referencia inválida: La categoría, tipo de IVA, equipo o habilidad especificada no existe (campo: ${fieldName}).` }, { status: 400 });
      }
      // P2025: Registro relacionado no encontrado (podría ocurrir si se intenta conectar a algo que no existe)
      if (error.code === 'P2025') { 
         console.error("Error P2025: Registro relacionado no encontrado", error.meta);
         return NextResponse.json({ message: `Error al crear: ${error.message}` }, { status: 400 });
      }
    }
    if (error instanceof z.ZodError) {
      console.error("Error de validación Zod:", error.errors);
      return NextResponse.json({ error: 'Datos de entrada inválidos', details: error.errors }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
       console.error("Error de sintaxis JSON:", error.message);
       return NextResponse.json({ message: 'JSON inválido en la solicitud' }, { status: 400 });
    }

    // Error genérico
    return NextResponse.json(
      { message: 'Error interno del servidor al crear el servicio' },
      { status: 500 }
    );
  }
} 