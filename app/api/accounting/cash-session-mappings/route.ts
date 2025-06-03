/**
 * API para gestionar mapeos de cajas/terminales a cuentas contables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET /api/accounting/cash-session-mappings
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

    // Obtener todos los mapeos de cajas para la entidad legal
    const mappings = await prisma.cashSessionAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true
          }
        },
        posTerminal: {
          select: {
            id: true,
            name: true,
            provider: true
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
    console.error('Error al obtener mapeos de cajas:', error);
    return NextResponse.json(
      { error: 'Error al obtener mapeos' },
      { status: 500 }
    );
  }
}

// Schema de validación para el body
const CashSessionMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.array(z.object({
    clinicId: z.string().optional(),
    posTerminalId: z.string().optional(),
    accountId: z.string()
  }))
});

// POST /api/accounting/cash-session-mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = CashSessionMappingSchema.safeParse(body);

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
        const { clinicId, posTerminalId, accountId } = mapping;

        // Validar que se proporcione clinicId o posTerminalId
        if (!clinicId && !posTerminalId) {
          throw new Error('Se debe especificar al menos clinicId o posTerminalId');
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

        // Buscar mapeo existente
        const existingMapping = await tx.cashSessionAccountMapping.findFirst({
          where: {
            legalEntityId,
            clinicId: clinicId || null,
            posTerminalId: posTerminalId || null
          }
        });

        let savedMapping;
        if (existingMapping) {
          // Actualizar mapeo existente
          savedMapping = await tx.cashSessionAccountMapping.update({
            where: { id: existingMapping.id },
            data: { accountId }
          });
        } else {
          // Crear nuevo mapeo
          savedMapping = await tx.cashSessionAccountMapping.create({
            data: {
              clinicId,
              posTerminalId,
              accountId,
              legalEntityId,
              systemId
            }
          });
        }

        createdOrUpdatedMappings.push(savedMapping);
      }

      return createdOrUpdatedMappings;
    });

    return NextResponse.json({
      message: "Mapeos de cajas guardados correctamente",
      mappingsCreated: result.length
    });

  } catch (error) {
    console.error('Error saving cash session mappings:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al guardar mapeos de cajas" },
      { status: 500 }
    );
  }
} 