/**
 * API para gestionar mapeos de gastos a cuentas contables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET /api/accounting/expense-mappings
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

    // Obtener todos los mapeos de gastos para la entidad legal
    const mappings = await prisma.expenseTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId
      },
      include: {
        expenseType: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            isActive: true
          }
        },
        account: {
          select: {
            id: true,
            accountNumber: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error al obtener mapeos de gastos:', error);
    return NextResponse.json(
      { error: 'Error al obtener mapeos' },
      { status: 500 }
    );
  }
}

// Schema de validación para el body
const ExpenseMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.array(z.object({
    expenseTypeId: z.string(),
    accountId: z.string()
  }))
});

// POST /api/accounting/expense-mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = ExpenseMappingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { legalEntityId, systemId, mappings } = validation.data;

    // Verificar que el usuario pertenece al sistema
    if (systemId !== session.user.systemId) {
      return NextResponse.json({ error: "No autorizado para este sistema" }, { status: 403 });
    }

    // Iniciar transacción para guardar los mapeos
    const result = await prisma.$transaction(async (tx) => {
      const createdOrUpdatedMappings = [];

      for (const mapping of mappings) {
        const { expenseTypeId, accountId } = mapping;

        // Verificar que el tipo de gasto existe
        const expenseType = await tx.expenseType.findFirst({
          where: {
            id: expenseTypeId,
            systemId,
            isActive: true
          }
        });

        if (!expenseType) {
          throw new Error(`Tipo de gasto ${expenseTypeId} no encontrado o inactivo`);
        }

        // Verificar que la cuenta existe
        const account = await tx.chartOfAccountEntry.findFirst({
          where: {
            id: accountId,
            legalEntityId,
            systemId,
            isActive: true,
            allowsDirectEntry: true
          }
        });

        if (!account) {
          throw new Error(`Cuenta ${accountId} no encontrada o no permite asientos directos`);
        }

        // Crear o actualizar el mapeo
        const savedMapping = await tx.expenseTypeAccountMapping.upsert({
          where: {
            expenseTypeId_legalEntityId: {
              expenseTypeId,
              legalEntityId
            }
          },
          update: {
            accountId
          },
          create: {
            expenseTypeId,
            accountId,
            legalEntityId,
            systemId
          }
        });

        createdOrUpdatedMappings.push(savedMapping);
      }

      return createdOrUpdatedMappings;
    });

    return NextResponse.json({
      message: "Mapeos de gastos guardados correctamente",
      mappingsCreated: result.length
    });

  } catch (error) {
    console.error('Error saving expense mappings:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al guardar mapeos de gastos" },
      { status: 500 }
    );
  }
} 