import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';

/**
 * GET /api/accounting/entity-dimensions
 * Obtiene la configuración de dimensiones analíticas para entidades relacionadas
 * (empleados/usuarios, clientes, proveedores)
 */
export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const legalEntityId = searchParams.get('legalEntityId');
  const systemId = session.user.systemId;

  if (!legalEntityId) {
    return NextResponse.json(
      { error: 'Se requiere legalEntityId' },
      { status: 400 }
    );
  }

  try {
    // Obtener configuración de dimensiones analíticas para el sistema
    const analyticalDimensions = await prisma.analyticalDimension.findMany({
      where: {
        systemId,
        code: {
          in: ['client', 'supplier', 'employee', 'professional']
        }
      }
    });

    // Obtener estadísticas de entidades
    const [
      clientCount,
      activeUsersCount
    ] = await Promise.all([
      prisma.client.count({ where: { systemId } }),
      prisma.user.count({ where: { systemId, isActive: true } })
    ]);

    // Obtener segmentos configurados
    const segmentConfigs = await prisma.entitySegmentConfig.findMany({
      where: { systemId }
    });

    return NextResponse.json({
      dimensions: analyticalDimensions,
      entityCounts: {
        clients: clientCount,
        suppliers: 0, // No existe modelo Supplier en el sistema actual
        employees: activeUsersCount, // Usuarios activos como empleados
        professionals: activeUsersCount // Los profesionales son usuarios con ciertos roles
      },
      segmentConfigs,
      recommendedAccounts: {
        clients: {
          base: '430',
          name: 'Clientes',
          pattern: '{base}.{segment}',
          segments: [
            { code: 'VIP', name: 'Clientes VIP', criteria: 'Más de 1000€ en últimos 6 meses' },
            { code: 'REG', name: 'Clientes regulares', criteria: 'Entre 100€ y 1000€' },
            { code: 'OCA', name: 'Clientes ocasionales', criteria: 'Menos de 100€' }
          ]
        },
        suppliers: {
          base: '400',
          name: 'Proveedores',
          pattern: '{base}.{category}',
          segments: [
            { code: 'PRO', name: 'Productos', criteria: 'Proveedores de productos' },
            { code: 'SER', name: 'Servicios', criteria: 'Proveedores de servicios' },
            { code: 'OTR', name: 'Otros', criteria: 'Otros proveedores' }
          ]
        },
        employees: {
          base: '640',
          name: 'Gastos de personal',
          pattern: '{base}.{role}',
          segments: [
            { code: 'DOC', name: 'Médicos', criteria: 'Personal médico' },
            { code: 'AUX', name: 'Auxiliares', criteria: 'Personal auxiliar' },
            { code: 'ADM', name: 'Administrativos', criteria: 'Personal administrativo' },
            { code: 'OTR', name: 'Otros', criteria: 'Otro personal' }
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error fetching entity dimensions:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración de dimensiones' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/entity-dimensions
 * Configura las dimensiones analíticas para entidades relacionadas
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const systemId = session.user.systemId;

  try {
    const body = await req.json();
    const { entityType, segments } = body;

    if (!entityType || !segments) {
      return NextResponse.json(
        { error: 'Tipo de entidad y segmentos son requeridos' },
        { status: 400 }
      );
    }

    // Crear o actualizar configuración de segmentos
    const segmentConfig = await prisma.entitySegmentConfig.upsert({
      where: {
        systemId_entityType: {
          systemId,
          entityType
        }
      },
      update: {
        segments,
        updatedAt: new Date()
      },
      create: {
        systemId,
        entityType,
        segments
      }
    });

    // Asegurar que existe la dimensión analítica correspondiente
    await prisma.analyticalDimension.upsert({
      where: {
        systemId_code: {
          systemId,
          code: entityType
        }
      },
      update: {
        name: getEntityTypeName(entityType)
      },
      create: {
        systemId,
        code: entityType,
        name: getEntityTypeName(entityType),
        isRequired: false,
        dataType: 'STRING'
      }
    });

    return NextResponse.json({
      success: true,
      segmentConfig
    });
  } catch (error) {
    console.error('Error configuring entity dimensions:', error);
    return NextResponse.json(
      { error: 'Error al configurar dimensiones' },
      { status: 500 }
    );
  }
}

function getEntityTypeName(entityType: string): string {
  const names: Record<string, string> = {
    client: 'Cliente',
    supplier: 'Proveedor',
    employee: 'Empleado',
    professional: 'Profesional'
  };
  return names[entityType] || entityType;
}
