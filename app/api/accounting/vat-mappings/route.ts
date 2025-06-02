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

interface VATMapping {
  vatTypeId: string;
  accountId: string;
  direction: 'INPUT' | 'OUTPUT';
}

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

    // Por ahora, dado que no tenemos una tabla específica para VAT mappings,
    // devolvemos un array vacío. En producción, esto leería de una tabla VATAccountMapping
    const mockMappings: VATMapping[] = [];

    // TODO: Cuando se cree la tabla VATAccountMapping:
    /*
    const mappings = await prisma.vatAccountMapping.findMany({
      where: {
        legalEntityId,
        systemId: session.user.systemId
      },
      include: {
        vatType: true,
        account: {
          select: {
            id: true,
            accountNumber: true,
            name: true
          }
        }
      }
    });
    */

    return NextResponse.json(mockMappings);
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

    // TODO: Implementar modelo VATTypeAccountMapping en el schema
    // Por ahora, almacenar en un campo JSON en la configuración del sistema o legal entity
    
    // Simulación temporal de guardado exitoso
    console.log('VAT Mappings recibidos:', mappings);

    // En el futuro, esto debería:
    // 1. Crear un modelo VATTypeAccountMapping similar a CategoryAccountMapping
    // 2. Guardar los mapeos de cuentas de entrada (IVA soportado) y salida (IVA repercutido)
    // 3. Permitir diferentes cuentas de IVA por entidad legal

    return NextResponse.json({
      message: "Mapeos de IVA guardados correctamente (temporal)",
      mappingsCreated: Object.keys(mappings).length,
      note: "Implementación temporal - requiere migración de base de datos"
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