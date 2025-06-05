import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación
const ProductMappingSchema = z.object({
  mappings: z.array(z.object({
    productId: z.string(),
    accountId: z.string(),
  })),
  legalEntityId: z.string(),
  systemId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validar los datos
    const validationResult = ProductMappingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error },
        { status: 400 }
      );
    }

    const { mappings, legalEntityId, systemId } = validationResult.data;

    // Verificar que el usuario tiene acceso a la entidad legal
    const hasAccess = await prisma.legalEntity.findFirst({
      where: {
        id: legalEntityId,
        systemId: session.user.systemId
      },
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta entidad legal' },
        { status: 403 }
      );
    }

    // Procesar los mapeos en una transacción
    const results = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const mapping of mappings) {
        try {
          // Eliminar mapeo existente si existe
          await tx.productAccountMapping.deleteMany({
            where: {
              productId: mapping.productId,
              legalEntityId: legalEntityId,
              systemId: systemId || null,
            },
          });

          // Crear nuevo mapeo si se proporciona una cuenta
          if (mapping.accountId) {
            const newMapping = await tx.productAccountMapping.create({
              data: {
                productId: mapping.productId,
                accountId: mapping.accountId,
                legalEntityId: legalEntityId,
                systemId: systemId || null,
              },
              include: {
                product: true,
                account: true,
              },
            });

            results.push({
              success: true,
              productId: mapping.productId,
              mapping: newMapping,
            });
          } else {
            results.push({
              success: true,
              productId: mapping.productId,
              mapping: null,
              message: 'Mapeo eliminado',
            });
          }
        } catch (error) {
          console.error(`Error mapeando producto ${mapping.productId}:`, error);
          results.push({
            success: false,
            productId: mapping.productId,
            error: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }

      return results;
    });

    // Contar los resultados
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} mapeos guardados correctamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
      results,
      summary: {
        total: mappings.length,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error('Error en save-product-mappings:', error);
    return NextResponse.json(
      { 
        error: 'Error al guardar los mapeos de productos',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
