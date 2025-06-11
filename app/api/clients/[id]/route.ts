import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getServerAuthSession } from '@/lib/auth';
import { z } from 'zod';

const ParamsSchema = z.object({
  id: z.string().cuid({ message: "El ID del cliente debe ser un CUID válido." }),
});

/**
 * Handler para obtener un cliente específico por su ID.
 * @param request La solicitud entrante.
 * @param params Objeto con el ID del cliente.
 * @returns NextResponse con el cliente encontrado o un error.
 */
export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  try {
    const params = await paramsPromise;
    const { id: clientId } = params;

    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json(
        { error: "Usuario no autenticado o falta systemId." },
        { status: 401 }
      );
    }
    const systemId = session.user.systemId;

    const paramsValidation = ParamsSchema.safeParse({ id: clientId });
    if (!paramsValidation.success) {
      return NextResponse.json(
        { error: "Parámetro ID inválido", details: paramsValidation.error.flatten() },
        { status: 400 }
      );
    }

    const validatedClientId = paramsValidation.data.id;

    const client = await prisma.client.findUnique({
      where: {
        id: validatedClientId,
        systemId: systemId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        phoneCountryIsoCode: true,
        taxId: true,
        fiscalName: true,
        address: true,
        city: true,
        postalCode: true,
        country: {
          select: {
            name: true,
            isoCode: true,
          },
        },
        company: {
          select: {
            id: true,
            fiscalName: true,
          },
        },
        appointments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            durationMinutes: true,
            status: true,
            notes: true,
            clientNotes: true,
            createdAt: true,
            updatedAt: true,
            professionalUser: {
              select: {
                firstName: true,
                lastName: true,
              }
            },
            clinic: {
              select: {
                name: true,
              }
            }
          },
          orderBy: {
            startTime: 'desc'
          }
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Cliente no encontrado o no pertenece al sistema." }, { status: 404 });
    }

    return NextResponse.json(client);

  } catch (error) {
    let routeId = 'unknown';
    try {
      const resolvedParams = await paramsPromise;
      routeId = resolvedParams.id;
    } catch (e) {
      // No hacer nada si paramsPromise también falla, ya tenemos el error original.
    }
    console.error(`[API_CLIENTS_ID_GET] Error fetching client by ID (clientId: ${routeId}):`, error);
    let errorMessage = "Error interno del servidor al obtener el cliente.";
    if (error instanceof z.ZodError) {
      errorMessage = "Error de validación.";
    }
    return NextResponse.json({ error: errorMessage, details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

/**
 * Handler para actualizar un cliente existente por su ID.
 * @param request La solicitud con los datos de actualización.
 * @param params Objeto con el ID del cliente.
 * @returns NextResponse con el cliente actualizado o un error.
 */
export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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