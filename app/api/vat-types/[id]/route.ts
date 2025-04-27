import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Esquema para validar el ID en los parámetros
const ParamsSchema = z.object({
  id: z.string().cuid({ message: "ID de tipo de IVA inválido." }),
});

// Esquema para validar la actualización (permite actualizar name, rate, isDefault)
const UpdateVATTypeSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }).optional(),
  rate: z.number().positive({ message: "La tasa debe ser positiva." }).optional(),
  isDefault: z.boolean().optional(),
}).strict(); // No permitir campos extra

/**
 * Handler para obtener un tipo de IVA específico por ID.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: vatTypeId } = paramsValidation.data;

  try {
    const vatType = await prisma.vATType.findUnique({
      where: { id: vatTypeId },
    });

    if (!vatType) {
      return NextResponse.json({ message: `Tipo de IVA ${vatTypeId} no encontrado.` }, { status: 404 });
    }
    return NextResponse.json(vatType);

  } catch (error) {
    console.error(`Error fetching VAT type ${vatTypeId}:`, error);
    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * Handler para actualizar un tipo de IVA existente.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: vatTypeId } = paramsValidation.data;

  try {
    const body = await request.json();
    const validation = UpdateVATTypeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', details: validation.error.format() }, { status: 400 });
    }
    const updateData = validation.data;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No se proporcionaron datos para actualizar.' }, { status: 400 });
    }

    // Obtener el systemId del VATType existente para la lógica de isDefault
    const currentVATType = await prisma.vATType.findUnique({ where: { id: vatTypeId }, select: { systemId: true }});
    if (!currentVATType) {
        return NextResponse.json({ message: `Tipo de IVA ${vatTypeId} no encontrado.` }, { status: 404 });
    }
    const systemId = currentVATType.systemId;

    // Lógica para asegurar un solo default por sistema
    if (updateData.isDefault === true) {
        await prisma.vATType.updateMany({
            where: { systemId: systemId, isDefault: true, id: { not: vatTypeId } }, // Excluir el actual
            data: { isDefault: false },
        });
    } else if (updateData.isDefault === false) {
        // Opcional: Prevenir que se desmarque el último default?
        // Por ahora, permitimos que no haya ninguno por defecto.
    }

    const updatedVATType = await prisma.vATType.update({
      where: { id: vatTypeId },
      data: updateData,
    });

    return NextResponse.json(updatedVATType);

  } catch (error) {
    console.error(`Error updating VAT type ${vatTypeId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: `Tipo de IVA ${vatTypeId} no encontrado.` }, { status: 404 });
      }
      if (error.code === 'P2002') { // Unicidad (name + systemId)
        return NextResponse.json({ message: 'Ya existe otro tipo de IVA con ese nombre.' }, { status: 409 });
      }
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al actualizar.' }, { status: 500 });
  }
}

/**
 * Handler para eliminar un tipo de IVA.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const paramsValidation = ParamsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'ID inválido.', details: paramsValidation.error.errors }, { status: 400 });
  }
  const { id: vatTypeId } = paramsValidation.data;

  try {
    // Antes de eliminar, verificar si es el default de alguna tarifa
    // y si hay asociaciones en TariffServicePrice/TariffProductPrice?
    // Por ahora, usamos onDelete: SetNull en las relaciones, así que el borrado es "seguro"
    // en el sentido de que no fallará por FK, pero dejará nulls.
    // Podríamos añadir lógica para prevenir el borrado si está en uso activo.
    
    await prisma.vATType.delete({ where: { id: vatTypeId } });
    return NextResponse.json({ message: `Tipo de IVA ${vatTypeId} eliminado.` }, { status: 200 });

  } catch (error) {
     console.error(`Error deleting VAT type ${vatTypeId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json({ message: `Tipo de IVA ${vatTypeId} no encontrado.` }, { status: 404 });
      }
      // P2003 podría ocurrir si alguna relación no tuviera onDelete: SetNull
    }
    return NextResponse.json({ message: 'Error interno del servidor al eliminar.' }, { status: 500 });
  }
} 