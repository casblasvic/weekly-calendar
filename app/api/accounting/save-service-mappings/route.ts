import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación
const ServiceMappingSchema = z.object({
  mappings: z.array(z.object({
    serviceId: z.string(),
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
    const validationResult = ServiceMappingSchema.safeParse(body);
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
          await tx.serviceAccountMapping.deleteMany({
            where: {
              serviceId: mapping.serviceId,
              legalEntityId: legalEntityId,
              systemId: systemId || null,
            },
          });

          // Crear nuevo mapeo si se proporciona una cuenta
          if (mapping.accountId) {
            const newMapping = await tx.serviceAccountMapping.create({
              data: {
                serviceId: mapping.serviceId,
                accountId: mapping.accountId,
                legalEntityId: legalEntityId,
                systemId: systemId || null,
              },
              include: {
                service: true,
                account: true,
              },
            });

            results.push({
              success: true,
              serviceId: mapping.serviceId,
              mapping: newMapping,
            });
          } else {
            results.push({
              success: true,
              serviceId: mapping.serviceId,
              mapping: null,
              message: 'Mapeo eliminado',
            });
          }
        } catch (error) {
          console.error(`Error mapeando servicio ${mapping.serviceId}:`, error);
          results.push({
            success: false,
            serviceId: mapping.serviceId,
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
    console.error('Error en save-service-mappings:', error);
    return NextResponse.json(
      { 
        error: 'Error al guardar los mapeos de servicios',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
