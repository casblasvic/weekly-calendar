/**
 * API para obtener todas las categorías del sistema con sus mapeos contables
 * (si existen) para una entidad legal específica
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get('legalEntityId');
    const systemId = session.user.systemId;

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Se requiere legalEntityId' },
        { status: 400 }
      );
    }

    // Obtener todas las categorías del sistema con sus mapeos
    const categories = await prisma.category.findMany({
      where: { systemId },
      include: {
        categoryAccountMappings: {
          where: { legalEntityId },
          include: {
            account: {
              select: {
                id: true,
                accountNumber: true,
                name: true,
              }
            }
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transformar los datos para incluir información de mapeo
    const categoriesWithMappings = categories.map(category => {
      const mapping = category.categoryAccountMappings[0]; // Solo debería haber uno por entidad legal
      
      return {
        categoryId: category.id,
        categoryName: category.name,
        parentId: category.parentId,
        parentName: category.parent?.name,
        currentAccountId: mapping?.accountId || null,
        currentAccount: mapping?.account || null,
        hasChildren: false, // Se puede calcular si es necesario
        level: 0, // Se puede calcular basado en la jerarquía si es necesario
      };
    });

    return NextResponse.json({
      success: true,
      items: categoriesWithMappings,
      total: categoriesWithMappings.length
    });

  } catch (error) {
    console.error('Error al obtener categorías con mapeos:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
