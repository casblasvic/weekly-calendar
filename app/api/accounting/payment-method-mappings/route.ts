/**
 * API para gestionar mapeos de métodos de pago a cuentas contables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET /api/accounting/payment-method-mappings
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

    // Obtener mapeos existentes
    const mappings = await prisma.paymentMethodAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId
      },
      include: {
        account: {
          select: {
            id: true,
            accountNumber: true,
            name: true
          }
        },
        paymentMethodDefinition: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error al obtener mapeos de métodos de pago:', error);
    return NextResponse.json(
      { error: 'Error al obtener mapeos' },
      { status: 500 }
    );
  }
}

// Schema de validación para el body
const PaymentMethodMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.record(z.string()) // { paymentMethodId: accountId }
});

// POST /api/accounting/payment-method-mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = PaymentMethodMappingSchema.safeParse(body);

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

    // Iniciar transacción
    const result = await prisma.$transaction(async (tx) => {
      const createdMappings = [];

      for (const [paymentMethodId, accountId] of Object.entries(mappings)) {
        // Verificar que el método de pago existe y pertenece al sistema
        const paymentMethod = await tx.paymentMethodDefinition.findFirst({
          where: {
            id: paymentMethodId,
            systemId
          }
        });

        if (!paymentMethod) {
          throw new Error(`Método de pago ${paymentMethodId} no encontrado`);
        }

        // Verificar que la cuenta existe
        const account = await tx.chartOfAccountEntry.findFirst({
          where: {
            id: accountId,
            legalEntityId,
            systemId,
            isActive: true
          }
        });

        if (!account) {
          throw new Error(`Cuenta ${accountId} no encontrada o inactiva`);
        }

        // Crear o actualizar el mapeo
        const mapping = await tx.paymentMethodAccountMapping.upsert({
          where: {
            paymentMethodDefinitionId_legalEntityId: {
              paymentMethodDefinitionId: paymentMethodId,
              legalEntityId
            }
          },
          update: {
            accountId
          },
          create: {
            paymentMethodDefinitionId: paymentMethodId,
            legalEntityId,
            accountId,
            systemId
          }
        });

        createdMappings.push(mapping);
      }

      return createdMappings;
    });

    return NextResponse.json({
      message: "Mapeos de métodos de pago guardados correctamente",
      mappingsCreated: result.length
    });

  } catch (error) {
    console.error('Error saving payment method mappings:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al guardar mapeos de métodos de pago" },
      { status: 500 }
    );
  }
} 