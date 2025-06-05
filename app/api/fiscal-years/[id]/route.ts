/**
 * API para gestionar ejercicios fiscales individuales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FiscalYearStatus } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// PUT /api/fiscal-years/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      name,
      startDate,
      endDate
    } = body;

    // Verificar que el ejercicio existe y pertenece al sistema
    const existing = await prisma.fiscalYear.findFirst({
      where: {
        id,
        systemId: session.user.systemId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Ejercicio fiscal no encontrado' },
        { status: 404 }
      );
    }

    // Solo se pueden editar ejercicios abiertos
    if (existing.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Solo se pueden editar ejercicios fiscales abiertos' },
        { status: 400 }
      );
    }

    const start = startDate ? new Date(startDate) : existing.startDate;
    const end = endDate ? new Date(endDate) : existing.endDate;

    if (start >= end) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    // Si se está cambiando el nombre, verificar que sea único
    if (name && name !== existing.name) {
      const duplicate = await prisma.fiscalYear.findUnique({
        where: {
          legalEntityId_name: {
            legalEntityId: existing.legalEntityId,
            name
          }
        }
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'Ya existe un ejercicio fiscal con ese nombre' },
          { status: 400 }
        );
      }
    }

    // Verificar solapamiento con otros ejercicios (excluyendo el actual)
    const overlapping = await prisma.fiscalYear.findFirst({
      where: {
        id: { not: id },
        legalEntityId: existing.legalEntityId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Las fechas se solapan con otro ejercicio fiscal' },
        { status: 400 }
      );
    }

    // Actualizar el ejercicio fiscal
    const updated = await prisma.fiscalYear.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: start }),
        ...(endDate && { endDate: end })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al actualizar ejercicio fiscal:', error);
    return NextResponse.json(
      { error: 'Error al actualizar ejercicio fiscal' },
      { status: 500 }
    );
  }
}

// DELETE /api/fiscal-years/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { legalEntityId } = body;

    // Verificar que el ejercicio existe y pertenece al sistema
    const existing = await prisma.fiscalYear.findFirst({
      where: {
        id,
        systemId: session.user.systemId,
        legalEntityId
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Ejercicio fiscal no encontrado' },
        { status: 404 }
      );
    }

    // Solo se pueden eliminar ejercicios abiertos
    if (existing.status !== 'OPEN') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar ejercicios fiscales abiertos' },
        { status: 400 }
      );
    }

    // Verificar que no tenga movimientos contables
    const hasMovements = await prisma.journalEntry.count({
      where: {
        date: {
          gte: existing.startDate,
          lte: existing.endDate
        },
        legalEntityId
      }
    });

    if (hasMovements > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un ejercicio fiscal con movimientos contables' },
        { status: 400 }
      );
    }

    // Eliminar el ejercicio fiscal
    await prisma.fiscalYear.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Ejercicio fiscal eliminado correctamente' 
    });

  } catch (error: any) {
    console.error('Error eliminando ejercicio fiscal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}