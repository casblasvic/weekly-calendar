/**
 * API para gestionar series documentales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/document-series
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    const series = await prisma.documentSeries.findMany({
      where: {
        legalEntityId,
        organizationId: session.user.systemId
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        },
        fiscalYear: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { documentType: 'asc' },
        { code: 'asc' }
      ]
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error('Error al obtener series documentales:', error);
    return NextResponse.json(
      { error: 'Error al obtener series documentales' },
      { status: 500 }
    );
  }
}

// POST /api/document-series
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      documentType,
      prefix,
      padding,
      nextNumber,
      resetPolicy,
      clinicId,
      legalEntityId,
      organizationId
    } = body;

    // Validaciones
    if (!code || !documentType || !legalEntityId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el código sea único para la entidad legal
    const existing = await prisma.documentSeries.findUnique({
      where: {
        legalEntityId_code: {
          legalEntityId,
          code
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una serie con ese código para esta entidad legal' },
        { status: 400 }
      );
    }

    // Crear la nueva serie
    const newSeries = await prisma.documentSeries.create({
      data: {
        code,
        documentType,
        prefix,
        padding: padding || 8,
        nextNumber: nextNumber || 1,
        resetPolicy,
        organizationId: organizationId || session.user.systemId,
        legalEntityId,
        clinicId,
        isActive: true
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

    return NextResponse.json(newSeries);
  } catch (error) {
    console.error('Error al crear serie documental:', error);
    return NextResponse.json(
      { error: 'Error al crear serie documental' },
      { status: 500 }
    );
  }
} 