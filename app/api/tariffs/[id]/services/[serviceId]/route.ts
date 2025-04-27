import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

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
 * Handler para eliminar la asociación entre un servicio y una tarifa.
 */
export async function DELETE(request: Request, { params }: { params: { id: string; serviceId: string } }) {
  // 1. Validar IDs
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'IDs inválidos.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: tariffId, serviceId } = paramsValidation.data;

  try {
    // 2. Eliminar la entrada de TariffServicePrice
    await prisma.tariffServicePrice.delete({
      where: {
        tariffId_serviceId: { tariffId: tariffId, serviceId: serviceId }
      }
    });

    return NextResponse.json({ message: `Servicio ${serviceId} desvinculado de la tarifa ${tariffId}.` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting service ${serviceId} association for tariff ${tariffId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // No encontrado
        return NextResponse.json({ message: 'El servicio no estaba asociado a esta tarifa.' }, { status: 404 });
      }
    }
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 