/**
 * API para gestionar series documentales individuales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: { id: string };
}

// PUT /api/document-series/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      code,
      documentType,
      prefix,
      padding,
      resetPolicy,
      clinicId,
      isActive
    } = body;

    // Verificar que la serie existe y pertenece al sistema
    const existing = await prisma.documentSeries.findFirst({
      where: {
        id,
        organizationId: session.user.systemId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Serie no encontrada' },
        { status: 404 }
      );
    }

    // Si se está cambiando el código, verificar que sea único
    if (code && code !== existing.code) {
      const duplicate = await prisma.documentSeries.findUnique({
        where: {
          legalEntityId_code: {
            legalEntityId: existing.legalEntityId,
            code
          }
        }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe una serie con ese código' },
          { status: 400 }
        );
      }
    }

    // Actualizar la serie
    const updated = await prisma.documentSeries.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(documentType && { documentType }),
        ...(prefix !== undefined && { prefix }),
        ...(padding !== undefined && { padding }),
        ...(resetPolicy !== undefined && { resetPolicy }),
        ...(clinicId !== undefined && { clinicId }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar serie documental:', error);
    return NextResponse.json(
      { error: 'Error al actualizar serie documental' },
      { status: 500 }
    );
  }
}

// DELETE /api/document-series/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;

    // Verificar que la serie existe y pertenece al sistema
    const existing = await prisma.documentSeries.findFirst({
      where: {
        id,
        organizationId: session.user.systemId
      },
      include: {
        tickets: {
          take: 1
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Serie no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no esté siendo usada
    if (existing.tickets.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una serie que está siendo usada' },
        { status: 400 }
      );
    }

    // Eliminar la serie
    await prisma.documentSeries.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar serie documental:', error);
    return NextResponse.json(
      { error: 'Error al eliminar serie documental' },
      { status: 500 }
    );
  }
} 