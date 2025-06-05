import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación
const AutoMapSchema = z.object({
  paymentMethodIds: z.array(z.string()).min(1),
  legalEntityId: z.string(),
});

// Mapeo de tipos de método de pago a cuentas contables por defecto
const PAYMENT_METHOD_ACCOUNT_MAPPING: Record<string, string> = {
  'CASH': '570',       // Caja
  'CARD': '572',       // Bancos e instituciones de crédito
  'BANK_TRANSFER': '572', // Bancos
  'DEFERRED_PAYMENT': '430', // Clientes
  'CHECK': '572',      // Bancos (se deposita)
  'VOUCHER': '438',    // Anticipos de clientes
  'FINANCING': '170',  // Deudas a largo plazo
  'GIFT_CARD': '438',  // Anticipos de clientes
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = AutoMapSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { paymentMethodIds, legalEntityId } = validation.data;

    // Obtener el plan contable
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId,
        isActive: true
      }
    });

    if (chartOfAccounts.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró plan contable para esta entidad legal' },
        { status: 404 }
      );
    }

    // Obtener los métodos de pago a mapear
    const paymentMethods = await prisma.paymentMethodDefinition.findMany({
      where: {
        id: { in: paymentMethodIds },
        systemId: session.user.systemId
      }
    });

    const results = [];
    const errors = [];

    // Aplicar mapeo automático a cada método de pago
    for (const paymentMethod of paymentMethods) {
      try {
        // Obtener el prefijo de cuenta según el tipo
        const accountPrefix = PAYMENT_METHOD_ACCOUNT_MAPPING[paymentMethod.type] || '572';
        
        // Buscar la cuenta más apropiada en el plan contable
        let account = chartOfAccounts.find(a => a.accountNumber === accountPrefix);
        
        // Si no existe exacta, buscar por prefijo
        if (!account) {
          account = chartOfAccounts.find(a => a.accountNumber.startsWith(accountPrefix));
        }

        if (!account) {
          errors.push({
            paymentMethodId: paymentMethod.id,
            paymentMethodName: paymentMethod.name,
            error: `No se encontró cuenta con prefijo ${accountPrefix}`
          });
          continue;
        }

        // Crear o actualizar el mapeo
        const mapping = await prisma.paymentMethodAccountMapping.upsert({
          where: {
            paymentMethodDefinitionId_legalEntityId: {
              paymentMethodDefinitionId: paymentMethod.id,
              legalEntityId
            }
          },
          update: {
            accountId: account.id,
            updatedAt: new Date()
          },
          create: {
            paymentMethodDefinitionId: paymentMethod.id,
            accountId: account.id,
            legalEntityId,
            systemId: session.user.systemId
          }
        });

        results.push({
          paymentMethodId: paymentMethod.id,
          paymentMethodName: paymentMethod.name,
          paymentMethodType: paymentMethod.type,
          accountNumber: account.accountNumber,
          accountName: account.name
        });

      } catch (error) {
        errors.push({
          paymentMethodId: paymentMethod.id,
          paymentMethodName: paymentMethod.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se mapearon ${results.length} de ${paymentMethods.length} métodos de pago`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in auto-map payment methods:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático' },
      { status: 500 }
    );
  }
}
