/**
 * API CRUD para gestionar tipos de gastos
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET /api/expense-types
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: any = {
      systemId: session.user.systemId
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    const expenseTypes = await prisma.expenseType.findMany({
      where,
      include: {
        accountMappings: {
          include: {
            account: {
              select: {
                id: true,
                accountNumber: true,
                name: true
              }
            },
            legalEntity: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(expenseTypes);
  } catch (error) {
    console.error('Error al obtener tipos de gastos:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de gastos' },
      { status: 500 }
    );
  }
}

// Schema de validación para crear/actualizar
const ExpenseTypeSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

// POST /api/expense-types
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = ExpenseTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { code, name, description, isActive } = validation.data;

    // Verificar que el código no exista
    const existingType = await prisma.expenseType.findFirst({
      where: {
        code,
        systemId: session.user.systemId
      }
    });

    if (existingType) {
      return NextResponse.json(
        { error: `Ya existe un tipo de gasto con el código: ${code}` },
        { status: 400 }
      );
    }

    // Crear el tipo de gasto
    const expenseType = await prisma.expenseType.create({
      data: {
        code,
        name,
        description,
        isActive,
        systemId: session.user.systemId
      }
    });

    return NextResponse.json(expenseType, { status: 201 });
  } catch (error) {
    console.error('Error al crear tipo de gasto:', error);
    return NextResponse.json(
      { error: 'Error al crear tipo de gasto' },
      { status: 500 }
    );
  }
} 