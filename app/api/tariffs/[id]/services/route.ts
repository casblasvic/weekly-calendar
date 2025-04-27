import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Esquema para validar el ID de la tarifa en los parámetros
const TariffParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tarifa inválido." }),
});

// Esquema para validar el body al asociar un servicio
const AssociateServiceSchema = z.object({
  serviceId: z.string().cuid({ message: "ID de servicio inválido." }),
  price: z.number().positive({ message: "El precio debe ser positivo." }),
  vatTypeId: z.string().cuid({ message: "ID de tipo de IVA inválido." }).optional().nullable(), // IVA es opcional al asociar? O requerido?
  isActive: z.boolean().optional().default(true),
});

/**
 * Handler para asociar un servicio existente a una tarifa específica,
 * definiendo su precio y IVA para esa tarifa.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // 1. Validar ID de Tarifa
  const tariffParamsValidation = TariffParamsSchema.safeParse(params);
  if (!tariffParamsValidation.success) {
    return NextResponse.json({ error: 'ID de tarifa inválido.', details: tariffParamsValidation.error.errors }, { status: 400 });
  }
  const { id: tariffId } = tariffParamsValidation.data;

  try {
    const body = await request.json();

    // 2. Validar Body
    const validation = AssociateServiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
    }
    const { serviceId, price, vatTypeId, isActive } = validation.data;

    // 3. Verificar que la tarifa y el servicio existen (opcional pero recomendado)
    const [tariffExists, serviceExists] = await Promise.all([
        prisma.tariff.findUnique({ where: { id: tariffId }, select: { id: true } }),
        prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } })
    ]);
    if (!tariffExists) {
        return NextResponse.json({ message: `Tarifa ${tariffId} no encontrada.` }, { status: 404 });
    }
    if (!serviceExists) {
        return NextResponse.json({ message: `Servicio ${serviceId} no encontrado.` }, { status: 404 });
    }
    // TODO: Verificar que pertenezcan al mismo systemId?

    // 4. Crear la asociación en TariffServicePrice
    // Usamos upsert para manejar el caso de que ya existiera la relación pero estuviera inactiva
    const tariffServicePrice = await prisma.tariffServicePrice.upsert({
        where: { tariffId_serviceId: { tariffId: tariffId, serviceId: serviceId } },
        update: { // Si ya existe, actualizar precio, IVA y activar
            price: price,
            vatTypeId: vatTypeId,
            isActive: true, // Asegurar que esté activa al (re)asociar
        },
        create: { // Si no existe, crearla
            tariffId: tariffId,
            serviceId: serviceId,
            price: price,
            vatTypeId: vatTypeId,
            isActive: isActive, // Usar el valor proporcionado o default(true)
        },
        include: { // Devolver datos completos
            service: true,
            vatType: true
        }
    });

    return NextResponse.json(tariffServicePrice, { status: 201 }); // 201 si se creó, 200 si se actualizó (upsert)

  } catch (error) {
    const serviceIdFromData = (error instanceof SyntaxError || !validation.data) ? 'desconocido' : validation.data?.serviceId || 'desconocido';
    console.error(`Error associating service ${serviceIdFromData} to tariff ${tariffId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') { // Violación de unicidad (ya existe)
        // Esto no debería pasar con upsert, pero por si acaso
        return NextResponse.json({ message: 'El servicio ya está asociado a esta tarifa.' }, { status: 409 });
      }
       if (error.code === 'P2003') { // FK constraint failed
           return NextResponse.json({ message: 'Referencia inválida (servicio, tarifa o tipo de IVA no existe).' }, { status: 400 });
      }
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 