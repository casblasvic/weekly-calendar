import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handler para obtener una tarifa específica por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID de la tarifa.
 * @returns NextResponse con la tarifa encontrada o un error.
 */
export async function GET(
  request: Request, 
  { params }: { params: { id: string } }
) {
  const tariffId = params.id;
  try {
    // TODO: Autorización, filtro systemId?
    const tariff = await prisma.tariff.findUniqueOrThrow({
      where: { id: tariffId },
      // TODO: Incluir relaciones? Familias, servicios, clínicas...
    });
    return NextResponse.json(tariff);
  } catch (error) {
    console.error(`Error fetching tariff ${tariffId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Tarifa ${tariffId} no encontrada` }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para actualizar una tarifa existente por su ID.
 * @param request La solicitud con los datos de actualización.
 * @param params Objeto con el ID de la tarifa.
 * @returns NextResponse con la tarifa actualizada o un error.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tariffId = params.id;
  try {
    const body = await request.json();
    const { systemId, ...updateData } = body; // Excluir systemId
    
    // TODO: Autorización

    const updatedTariff = await prisma.tariff.update({
      where: { id: tariffId /* TODO: + systemId? */ },
      data: updateData,
    });
    return NextResponse.json(updatedTariff);

  } catch (error) {
    console.error(`Error updating tariff ${tariffId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Tarifa ${tariffId} no encontrada` }, { status: 404 });
    }
     if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { 
        return NextResponse.json({ message: 'Conflicto de datos (ej: nombre duplicado)' }, { status: 409 });
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para eliminar una tarifa existente por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID de la tarifa.
 * @returns NextResponse con mensaje de éxito o error.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const tariffId = params.id;
  try {
    // TODO: Autorización
    // TODO: ¿Borrado lógico o físico? ¿Qué pasa con familias/servicios asociados?
    // Por defecto, Prisma fallará si hay relaciones (P2003)
    await prisma.tariff.delete({ where: { id: tariffId /* TODO: + systemId? */ } });
    return NextResponse.json({ message: `Tarifa ${tariffId} eliminada` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting tariff ${tariffId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Tarifa ${tariffId} no encontrada` }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { message: `No se puede eliminar la tarifa ${tariffId} porque tiene datos relacionados (familias, servicios, etc.).` },
          { status: 409 } // Conflict
        );
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
} 