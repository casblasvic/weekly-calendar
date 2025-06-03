/**
 * API para actualizar y eliminar tipos de gastos individuales
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación para actualización
const UpdateExpenseTypeSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

// GET /api/expense-types/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const expenseType = await prisma.expenseType.findFirst({
      where: {
        id: params.id,
        systemId: session.user.systemId
      },
      include: {
        accountMappings: {
          include: {
            account: true,
            legalEntity: true
          }
        }
      }
    });

    if (!expenseType) {
      return NextResponse.json(
        { error: 'Tipo de gasto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(expenseType);
  } catch (error) {
    console.error('Error al obtener tipo de gasto:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipo de gasto' },
      { status: 500 }
    );
  }
}

// PUT /api/expense-types/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = UpdateExpenseTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Verificar que el tipo de gasto existe y pertenece al sistema
    const existingType = await prisma.expenseType.findFirst({
      where: {
        id: params.id,
        systemId: session.user.systemId
      }
    });

    if (!existingType) {
      return NextResponse.json(
        { error: 'Tipo de gasto no encontrado' },
        { status: 404 }
      );
    }

    // Si se está cambiando el código, verificar que no exista otro con el mismo código
    if (validation.data.code && validation.data.code !== existingType.code) {
      const duplicateCode = await prisma.expenseType.findFirst({
        where: {
          code: validation.data.code,
          systemId: session.user.systemId,
          id: { not: params.id }
        }
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: `Ya existe un tipo de gasto con el código: ${validation.data.code}` },
          { status: 400 }
        );
      }
    }

    // Actualizar el tipo de gasto
    const updatedType = await prisma.expenseType.update({
      where: { id: params.id },
      data: validation.data
    });

    return NextResponse.json(updatedType);
  } catch (error) {
    console.error('Error al actualizar tipo de gasto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar tipo de gasto' },
      { status: 500 }
    );
  }
}

// DELETE /api/expense-types/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el tipo de gasto existe y pertenece al sistema
    const existingType = await prisma.expenseType.findFirst({
      where: {
        id: params.id,
        systemId: session.user.systemId
      },
      include: {
        accountMappings: true
      }
    });

    if (!existingType) {
      return NextResponse.json(
        { error: 'Tipo de gasto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene mapeos asociados
    if (existingType.accountMappings.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un tipo de gasto con mapeos contables asociados' },
        { status: 400 }
      );
    }

    // Eliminar el tipo de gasto
    await prisma.expenseType.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Tipo de gasto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar tipo de gasto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar tipo de gasto' },
      { status: 500 }
    );
  }
} 