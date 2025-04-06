import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Handler para obtener un cliente específico por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del cliente.
 * @returns NextResponse con el cliente encontrado o un error.
 */
export async function GET(
  request: Request, 
  { params }: { params: { id: string } }
) {
  const clientId = params.id;
  try {
    // TODO: Añadir lógica de autorización - ¿Puede este usuario ver este cliente?
    // TODO: Filtrar también por systemId?
    const client = await prisma.client.findUniqueOrThrow({
      where: { id: clientId },
      // TODO: Incluir relaciones necesarias (ej: citas, clínica principal?)
    });
    return NextResponse.json(client);
  } catch (error) {
    console.error(`Error fetching client ${clientId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Cliente ${clientId} no encontrado` }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para actualizar un cliente existente por su ID.
 * @param request La solicitud con los datos de actualización.
 * @param params Objeto con el ID del cliente.
 * @returns NextResponse con el cliente actualizado o un error.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const clientId = params.id;
  try {
    const body = await request.json();

    // Excluir campos no modificables como systemId
    const { systemId, ...updateData } = body;
    
    // TODO: Lógica de autorización

    // Convertir fecha si viene
    if (updateData.birthDate) {
        updateData.birthDate = new Date(updateData.birthDate);
    }

    const updatedClient = await prisma.client.update({
      where: { 
          id: clientId 
          // TODO: Añadir filtro por systemId para seguridad?
      },
      data: updateData,
    });
    return NextResponse.json(updatedClient);

  } catch (error) {
    console.error(`Error updating client ${clientId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Cliente ${clientId} no encontrado` }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { 
        return NextResponse.json({ message: 'Conflicto de datos (ej: email duplicado)' }, { status: 409 });
    }
     if (error instanceof SyntaxError) {
       return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

/**
 * Handler para eliminar un cliente existente por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del cliente.
 * @returns NextResponse con mensaje de éxito o error.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const clientId = params.id;
  try {
    // TODO: Lógica de autorización
    // TODO: Borrado lógico (isActive = false) vs físico?

    await prisma.client.delete({ 
        where: { 
            id: clientId 
            // TODO: Añadir filtro por systemId?
        }
    });
    return NextResponse.json({ message: `Cliente ${clientId} eliminado` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting client ${clientId}:`, error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ message: `Cliente ${clientId} no encontrado` }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return NextResponse.json(
          { message: `No se puede eliminar el cliente ${clientId} porque tiene datos relacionados (ej: citas).` },
          { status: 409 } // Conflict
        );
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
} 