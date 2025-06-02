/**
 * API para cambiar el estado de un ejercicio fiscal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FiscalYearStatus } from '@prisma/client';

interface RouteParams {
  params: { id: string };
}

// PATCH /api/fiscal-years/[id]/status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(FiscalYearStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      );
    }

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

    // Validar transiciones de estado
    const validTransitions: Record<FiscalYearStatus, FiscalYearStatus[]> = {
      OPEN: ['CLOSING_PROCESS'],
      CLOSING_PROCESS: ['OPEN', 'CLOSED'],
      CLOSED: [] // No se puede cambiar desde cerrado
    };

    if (!validTransitions[existing.status].includes(status)) {
      return NextResponse.json(
        { error: `No se puede cambiar de ${existing.status} a ${status}` },
        { status: 400 }
      );
    }

    // Si se está cerrando, verificar que no haya documentos pendientes
    if (status === 'CLOSED') {
      // TODO: Verificar que no haya asientos sin cuadrar, documentos sin contabilizar, etc.
      // Por ahora solo actualizamos el estado
    }

    // Actualizar el estado
    const updated = await prisma.fiscalYear.update({
      where: { id },
      data: { status }
    });

    // Registrar el cambio en el log
    await prisma.entityChangeLog.create({
      data: {
        entityId: id,
        entityType: 'FISCAL_YEAR',
        action: `STATUS_CHANGE_${status}`,
        userId: session.user.id,
        systemId: session.user.systemId,
        details: {
          oldStatus: existing.status,
          newStatus: status
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error al cambiar estado del ejercicio fiscal:', error);
    return NextResponse.json(
      { error: 'Error al cambiar estado' },
      { status: 500 }
    );
  }
} 