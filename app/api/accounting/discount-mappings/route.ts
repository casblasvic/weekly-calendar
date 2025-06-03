/**
 * API para gestionar mapeos de tipos de descuento a cuentas contables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET /api/accounting/discount-mappings
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

    // Obtener todos los mapeos de descuentos para la entidad legal
    const mappings = await prisma.discountTypeAccountMapping.findMany({
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
        }
      }
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error('Error al obtener mapeos de descuentos:', error);
    return NextResponse.json(
      { error: 'Error al obtener mapeos' },
      { status: 500 }
    );
  }
}

// Schema de validación para el body
const DiscountMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.array(z.object({
    discountTypeCode: z.string(),
    discountTypeName: z.string(),
    accountId: z.string()
  }))
});

// POST /api/accounting/discount-mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = DiscountMappingSchema.safeParse(body);

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
        const { discountTypeCode, discountTypeName, accountId } = mapping;

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
        const savedMapping = await tx.discountTypeAccountMapping.upsert({
          where: {
            discountTypeCode_legalEntityId: {
              discountTypeCode,
              legalEntityId
            }
          },
          update: {
            discountTypeName,
            accountId
          },
          create: {
            discountTypeCode,
            discountTypeName,
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
      message: "Mapeos de descuentos guardados correctamente",
      mappingsCreated: result.length
    });

  } catch (error) {
    console.error('Error saving discount mappings:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al guardar mapeos de descuentos" },
      { status: 500 }
    );
  }
} 