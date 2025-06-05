import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { getAutoServiceMapping } from '@/app/(main)/configuracion/contabilidad/lib/auto-account-mapping';

// Schema de validación
const AutoMapSchema = z.object({
  serviceIds: z.array(z.string()).min(1),
  legalEntityId: z.string(),
});

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

    const { serviceIds, legalEntityId } = validation.data;

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

    // Obtener los servicios a mapear
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        systemId: session.user.systemId
      },
      include: {
        category: true
      }
    });

    const results = [];
    const errors = [];

    // Aplicar mapeo automático a cada servicio
    for (const service of services) {
      try {
        // Obtener cuenta sugerida
        const accountId = getAutoServiceMapping(service as any, chartOfAccounts);

        if (!accountId) {
          errors.push({
            serviceId: service.id,
            serviceName: service.name,
            error: 'No se encontró cuenta apropiada'
          });
          continue;
        }

        // Verificar si ya existe un mapeo
        const existingMapping = await prisma.serviceAccountMapping.findUnique({
          where: {
            serviceId_legalEntityId: {
              serviceId: service.id,
              legalEntityId
            }
          }
        });

        let mapping;
        if (existingMapping) {
          // Actualizar mapeo existente
          mapping = await prisma.serviceAccountMapping.update({
            where: {
              id: existingMapping.id
            },
            data: {
              accountId
            }
          });
        } else {
          // Crear nuevo mapeo
          mapping = await prisma.serviceAccountMapping.create({
            data: {
              serviceId: service.id,
              accountId,
              legalEntityId,
              systemId: session.user.systemId
            }
          });
        }

        const account = chartOfAccounts.find(a => a.id === accountId);
        results.push({
          serviceId: service.id,
          serviceName: service.name,
          accountNumber: account?.accountNumber,
          accountName: account?.name
        });

      } catch (error) {
        errors.push({
          serviceId: service.id,
          serviceName: service.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se mapearon ${results.length} de ${services.length} servicios`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in auto-map services:', error);
    return NextResponse.json(
      { error: 'Error al aplicar mapeo automático' },
      { status: 500 }
    );
  }
}
