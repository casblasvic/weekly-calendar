/**
 * API para gestionar ejercicios fiscales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { FiscalYearStatus } from '@prisma/client';

// GET /api/fiscal-years
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');
    const status = searchParams.get('status') as FiscalYearStatus | null;

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    const fiscalYears = await prisma.fiscalYear.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId,
        ...(status && { status })
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json(fiscalYears);
  } catch (error) {
    console.error('Error al obtener ejercicios fiscales:', error);
    return NextResponse.json(
      { error: 'Error al obtener ejercicios fiscales' },
      { status: 500 }
    );
  }
}

// POST /api/fiscal-years
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      startDate,
      endDate,
      legalEntityId,
      systemId
    } = body;

    // Validaciones
    if (!name || !startDate || !endDate || !legalEntityId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json(
        { error: 'La fecha de inicio debe ser anterior a la fecha de fin' },
        { status: 400 }
      );
    }

    // Verificar que el nombre sea único para la entidad legal
    const existing = await prisma.fiscalYear.findUnique({
      where: {
        legalEntityId_name: {
          legalEntityId,
          name
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un ejercicio fiscal con ese nombre' },
        { status: 400 }
      );
    }

    // Verificar solapamiento de fechas
    const overlapping = await prisma.fiscalYear.findFirst({
      where: {
        legalEntityId,
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
        { error: 'Las fechas se solapan con otro ejercicio fiscal existente' },
        { status: 400 }
      );
    }

    // Crear el nuevo ejercicio fiscal
    const newFiscalYear = await prisma.fiscalYear.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        status: 'OPEN',
        legalEntityId,
        systemId: systemId || session.user.systemId
      }
    });

    return NextResponse.json(newFiscalYear);
  } catch (error) {
    console.error('Error al crear ejercicio fiscal:', error);
    return NextResponse.json(
      { error: 'Error al crear ejercicio fiscal' },
      { status: 500 }
    );
  }
} 