/**
 * API para obtener TODOS los tipos de gastos con sus mapeos actuales
 * Incluye todos los tipos de gastos del sistema
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

    const systemId = session.user.systemId;
    const { searchParams } = new URL(request.url);
    const legalEntityId = searchParams.get('legalEntityId');
    
    if (!legalEntityId) {
      return NextResponse.json({ error: 'legalEntityId es requerido' }, { status: 400 });
    }

    // Verificar que la entidad legal pertenece al sistema
    const legalEntity = await prisma.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId
      }
    });

    if (!legalEntity) {
      return NextResponse.json({ error: 'Entidad legal no encontrada' }, { status: 404 });
    }

    // Obtener todos los tipos de gastos del sistema
    const expenseTypes = await prisma.expenseType.findMany({
      where: {
        systemId,
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Obtener todos los mapeos existentes
    const expenseMappings = await prisma.expenseTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId
      },
      include: {
        account: true,
        expenseType: true
      }
    });

    // Crear un mapa de mapeos por tipo de gasto
    const mappingsByTypeId = expenseMappings.reduce((acc, mapping) => {
      acc[mapping.expenseTypeId] = mapping;
      return acc;
    }, {} as Record<string, any>);

    // Combinar tipos de gastos con sus mapeos
    const allExpenseTypes = expenseTypes.map(type => {
      const mapping = mappingsByTypeId[type.id];
      
      return {
        expenseTypeId: type.id,
        expenseTypeName: type.name,
        expenseTypeCode: type.code,
        currentAccountId: mapping?.accountId || null,
        currentAccountCode: mapping?.account?.accountNumber || null,
        currentAccountName: mapping?.account?.name || null
      };
    });

    return NextResponse.json({
      hasData: true,
      items: allExpenseTypes,
      totalCount: allExpenseTypes.length,
      mappedCount: allExpenseTypes.filter(e => e.currentAccountId).length,
      unmappedCount: allExpenseTypes.filter(e => !e.currentAccountId).length
    });

  } catch (error) {
    console.error('Error fetching all expense types:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de gastos' },
      { status: 500 }
    );
  }
}
