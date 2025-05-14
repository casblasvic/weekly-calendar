import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma, Service as PrismaService, ServiceSetting } from '@prisma/client';
import { z } from 'zod';
import { getServerAuthSession } from "@/lib/auth";
import { ApiServicePayloadSchema, ServiceFormValues } from '@/lib/schemas/service';

// Interfaz ajustada para incluir settings y sus relaciones
interface ServiceWithDetails extends PrismaService {
    settings: (ServiceSetting & {
        equipmentRequirements: Prisma.ServiceEquipmentRequirementGetPayload<{ include: { equipment: true } }> [];
        skillRequirements: Prisma.ServiceSkillRequirementGetPayload<{ include: { skill: true } }> [];
    }) | null;
    category: Prisma.CategoryGetPayload<{}> | null;
    vatType: Prisma.VATTypeGetPayload<{}> | null;
}

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de servicio inválido." }),
});

// Función auxiliar para extraer ID de la URL
function extractIdFromUrl(url: string): string | null {
    try {
        const pathname = new URL(url).pathname;
        const segments = pathname.split('/').filter(Boolean); // Eliminar vacíos
        // Asumiendo /api/services/[id]
        if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'services') {
            return segments[2];
        }
        return null;
    } catch (error) {
        console.error("Error extracting ID from URL:", error);
        return null;
    }
}

/**
 * Handler para obtener un servicio específico por ID.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const { id } = params;
  if (!id || typeof id !== 'string') {
      return NextResponse.json({ message: 'ID de servicio inválido' }, { status: 400 });
  }
  console.log(`API GET /api/services/${id}: Solicitud recibida`);

  try {
    const service = await prisma.service.findUnique({
      where: {
        id: id,
        systemId: systemId,
      },
      include: {
        settings: {
          include: {
            equipmentRequirements: { include: { equipment: true } },
            skillRequirements: { include: { skill: true } },
          }
        },
        category: true,
        vatType: true,
      },
    });

    if (!service) {
      console.log(`API GET /api/services/${id}: Servicio no encontrado para systemId ${systemId}`);
      return NextResponse.json({ message: 'Servicio no encontrado' }, { status: 404 });
    }

    console.log(`API GET /api/services/${id}: Servicio encontrado`);
    return NextResponse.json(service as ServiceWithDetails);

  } catch (error) {
    console.error(`Error al obtener servicio ${id}:`, error);
    return NextResponse.json({ message: `Error interno del servidor al obtener el servicio ${id}` }, { status: 500 });
  }
}

/**
 * Handler para actualizar un servicio existente.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const { id } = params;
  if (!id || typeof id !== 'string') {
      return NextResponse.json({ message: 'ID de servicio inválido' }, { status: 400 });
  }
  console.log(`API PUT /api/services/${id}: Solicitud recibida`);

  try {
    const body = await request.json();
    
    // Validar body con Zod
    const validatedData = ApiServicePayloadSchema.parse(body);
    console.log(`API PUT /api/services/${id}: Datos validados`, validatedData);
    
    const { categoryId, vatTypeId, settings, equipmentIds, skillIds, ...serviceBaseData } = validatedData;

    // Usar transacción para asegurar atomicidad
    const updatedServiceId = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el servicio existe y pertenece al sistema
      const existingService = await tx.service.findUnique({
        where: { id: id, systemId: systemId },
        select: { id: true } // Solo necesitamos saber si existe
      });
      if (!existingService) {
        throw new Error('Servicio no encontrado o no pertenece al sistema.'); // Lanzará error 404 abajo
    }

      // 2. Actualizar el Servicio base
      const updatedService = await tx.service.update({
        where: { id: id },
        data: {
          // Campos base actualizables
          name: serviceBaseData.name, 
          durationMinutes: serviceBaseData.durationMinutes,
          code: serviceBaseData.code,
          description: serviceBaseData.description,
          price: serviceBaseData.price,
          colorCode: serviceBaseData.colorCode,
          // Conexiones actualizables (conectar si hay ID, desconectar si no)
          ...(categoryId ? { category: { connect: { id: categoryId } } } : { category: { disconnect: true } }),
          ...(vatTypeId ? { vatType: { connect: { id: vatTypeId } } } : { vatType: { disconnect: true } }),
        },
      });

      // 3. Actualizar o Crear los Settings asociados
      const updatedSettings = await tx.serviceSetting.upsert({
        where: { serviceId: id },
        update: { ...settings },
        create: {
          ...settings,
          service: { connect: { id: id } }
        }
      });

      // 4. Actualizar relaciones M-M para Equipos
      await tx.serviceEquipmentRequirement.deleteMany({ where: { serviceId: id } });
      if (equipmentIds && equipmentIds.length > 0) {
        await tx.serviceEquipmentRequirement.createMany({
          data: equipmentIds.map(eqId => ({ serviceId: id, equipmentId: eqId }))
        });
      }

      // 5. Actualizar relaciones M-M para Habilidades
      await tx.serviceSkillRequirement.deleteMany({ where: { serviceId: id } });
      if (skillIds && skillIds.length > 0) {
        await tx.serviceSkillRequirement.createMany({
          data: skillIds.map(skId => ({ serviceId: id, skillId: skId }))
        });
      }

      // 6. Devolver ID para buscar fuera de la transacción
      return id;
    });

    // Recuperar datos completos actualizados fuera de la transacción
    const finalServiceResponse = await prisma.service.findUnique({
      where: { id: updatedServiceId },
      include: {
        settings: {
      include: { 
            equipmentRequirements: { include: { equipment: true } },
            skillRequirements: { include: { skill: true } },
          }
        },
        category: true,
        vatType: true,
      }
    });

    console.log(`API PUT /api/services/${id}: Servicio actualizado con éxito`);
    return NextResponse.json(finalServiceResponse as ServiceWithDetails);

  } catch (error: any) {
    console.error(`Error al actualizar servicio ${id}:`, error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[])?.join(', ') || 'desconocido';
        return NextResponse.json({ message: `Conflicto: El valor proporcionado para '${target}' ya existe.` }, { status: 409 });
      }
       if (error.code === 'P2003') {
           const fieldName = (error.meta?.field_name as string) || 'desconocido';
           return NextResponse.json({ message: `Referencia inválida al actualizar (campo: ${fieldName}).` }, { status: 400 });
       }
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
      }
     if (error.message === 'Servicio no encontrado o no pertenece al sistema.') {
         return NextResponse.json({ message: 'Servicio no encontrado' }, { status: 404 });
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }

    return NextResponse.json({ message: `Error interno del servidor al actualizar el servicio ${id}` }, { status: 500 });
  }
}

/**
 * Handler para eliminar un servicio.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado o falta configuración del sistema.' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const { id } = params;
  if (!id || typeof id !== 'string') {
      return NextResponse.json({ message: 'ID de servicio inválido' }, { status: 400 });
  }
  console.log(`API DELETE /api/services/${id}: Solicitud recibida`);

  try {
    // Verificar si el servicio existe y pertenece al sistema ANTES de borrar
    const existingService = await prisma.service.findUnique({
      where: { id: id, systemId: systemId },
      select: { id: true }
    });

    if (!existingService) {
      console.log(`API DELETE /api/services/${id}: Servicio no encontrado o no pertenece al sistema ${systemId}`);
      return NextResponse.json({ message: 'Servicio no encontrado o no pertenece al sistema' }, { status: 404 });
  }
    
    // Usar transacción para asegurar que se borre el servicio y sus settings
    await prisma.$transaction(async (tx) => {
      // Borrar settings primero debido a la relación onDelete: Cascade en Service
      // aunque cascade debería manejarlo, ser explícito puede ser más seguro
      // await tx.serviceSetting.deleteMany({ where: { serviceId: id } }); // No necesario si Cascade está bien
      // Borrar relaciones M-M
      await tx.serviceEquipmentRequirement.deleteMany({ where: { serviceId: id } });
      await tx.serviceSkillRequirement.deleteMany({ where: { serviceId: id } });
      // Borrar el servicio (esto debería borrar settings por cascade)
      await tx.service.delete({ where: { id: id } });
    });

    console.log(`API DELETE /api/services/${id}: Servicio eliminado con éxito`);
    return NextResponse.json({ message: `Servicio ${id} eliminado con éxito` }, { status: 200 }); // O 204 No Content

  } catch (error) {
    console.error(`Error al eliminar servicio ${id}:`, error);
    // Manejar errores específicos como P2025 si el delete falla inesperadamente
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      // Esto podría pasar si el servicio se borró entre la verificación y el delete (muy raro)
       return NextResponse.json({ message: 'Error: El servicio ya no existe.' }, { status: 404 });
      }
     // Manejar P2014: Violación de relación (si algo más depende del servicio y no tiene onDelete: Cascade/SetNull)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2014') {
       console.error(`Error P2014 al eliminar servicio ${id}: Todavía hay relaciones dependientes.`, error.meta);
       return NextResponse.json({ message: 'No se puede eliminar el servicio porque todavía está en uso (ej: en paquetes, bonos, citas). Elimine primero esas asociaciones.' }, { status: 409 }); // 409 Conflict
    }
    return NextResponse.json({ message: `Error interno del servidor al eliminar el servicio ${id}` }, { status: 500 });
  }
} 