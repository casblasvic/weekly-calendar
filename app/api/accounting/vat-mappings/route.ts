/**
 * API para gestionar mapeos de tipos de IVA a cuentas contables
 * 
 * Permite configurar las cuentas para:
 * - IVA Repercutido (OUTPUT) - ventas
 * - IVA Soportado (INPUT) - compras
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET /api/accounting/vat-mappings
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

    // Obtener todos los mapeos de IVA para la entidad legal
    const mappings = await prisma.vATTypeAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId
      },
      include: {
        vatType: {
          select: {
            id: true,
            name: true,
            rate: true,
            code: true
          }
        },
        inputAccount: {
          select: {
            id: true,
            accountNumber: true,
            name: true
          }
        },
        outputAccount: {
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
    console.error('Error al obtener mapeos de IVA:', error);
    return NextResponse.json(
      { error: 'Error al obtener mapeos' },
      { status: 500 }
    );
  }
}

// Schema de validación para el body
const VATMappingSchema = z.object({
  legalEntityId: z.string(),
  systemId: z.string(),
  mappings: z.record(z.object({
    input: z.string().optional(),
    output: z.string().optional()
  })) // { vatTypeId: { input: accountId, output: accountId } }
});

// POST /api/accounting/vat-mappings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = VATMappingSchema.safeParse(body);

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

      for (const [vatTypeId, accounts] of Object.entries(mappings)) {
        // Verificar que el tipo de IVA existe
        const vatType = await tx.vATType.findFirst({
          where: {
            id: vatTypeId,
            OR: [
              { systemId }, // IVA global del sistema
              { legalEntityId } // IVA específico de la entidad
            ]
          }
        });

        if (!vatType) {
          throw new Error(`Tipo de IVA ${vatTypeId} no encontrado`);
        }

        // Verificar cuentas si se proporcionan
        if (accounts.input) {
          const inputAccount = await tx.chartOfAccountEntry.findFirst({
            where: {
              id: accounts.input,
              legalEntityId,
              systemId,
              isActive: true
            }
          });

          if (!inputAccount) {
            throw new Error(`Cuenta de IVA soportado ${accounts.input} no encontrada o inactiva`);
          }
        }

        if (accounts.output) {
          const outputAccount = await tx.chartOfAccountEntry.findFirst({
            where: {
              id: accounts.output,
              legalEntityId,
              systemId,
              isActive: true
            }
          });

          if (!outputAccount) {
            throw new Error(`Cuenta de IVA repercutido ${accounts.output} no encontrada o inactiva`);
          }
        }

        // Crear o actualizar el mapeo
        const mapping = await tx.vATTypeAccountMapping.upsert({
          where: {
            vatTypeId_legalEntityId: {
              vatTypeId,
              legalEntityId
            }
          },
          update: {
            inputAccountId: accounts.input || null,
            outputAccountId: accounts.output || null
          },
          create: {
            vatTypeId,
            legalEntityId,
            systemId,
            inputAccountId: accounts.input || null,
            outputAccountId: accounts.output || null
          }
        });

        createdOrUpdatedMappings.push(mapping);
      }

      return createdOrUpdatedMappings;
    });

    return NextResponse.json({
      message: "Mapeos de IVA guardados correctamente",
      mappingsCreated: result.length
    });

  } catch (error) {
    console.error('Error saving VAT mappings:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al guardar mapeos de IVA" },
      { status: 500 }
    );
  }
} 