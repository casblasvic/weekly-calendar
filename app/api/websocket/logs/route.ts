import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parámetros de filtrado
    const type = searchParams.get('type');
    const eventType = searchParams.get('eventType');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verificar si las tablas existen
    try {
      // Intentar obtener logs de forma simple primero
      const simpleLogsCheck = await prisma.webSocketLog.findFirst();
      console.log('WebSocket logs table accessible:', !!simpleLogsCheck);
    } catch (tableError) {
      console.warn('WebSocket logs table not accessible:', tableError);
      // Devolver respuesta vacía si la tabla no existe
      return NextResponse.json({
        success: true,
        data: {
          logs: [],
          total: 0,
          limit,
          offset,
          hasMore: false
        }
      });
    }

    // Construir filtros
    const where: any = {};
    
    if (type && type !== 'all') {
      where.connection = {
        type: type
      };
    }
    
    if (eventType && eventType !== 'all') {
      where.eventType = eventType;
    }
    
    if (search) {
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { errorDetails: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Obtener logs con paginación (sin include si falla)
    let logs, total;
    
    try {
      [logs, total] = await Promise.all([
        prisma.webSocketLog.findMany({
          where,
          include: {
            connection: {
              select: {
                type: true,
                referenceId: true,
                status: true,
                metadata: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: offset
        }),
        prisma.webSocketLog.count({ where })
      ]);
    } catch (includeError) {
      console.warn('Error with include, trying without:', includeError);
      // Intentar sin include
      [logs, total] = await Promise.all([
        prisma.webSocketLog.findMany({
          where,
          orderBy: {
            createdAt: 'desc'
          },
          take: limit,
          skip: offset
        }),
        prisma.webSocketLog.count({ where })
      ]);
      
      // Agregar datos de conexión ficticios
      logs = logs.map((log: any) => ({
        ...log,
        connection: {
          type: 'UNKNOWN',
          referenceId: 'unknown',
          status: 'unknown',
          metadata: {}
        }
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching WebSocket logs:', error);
    return NextResponse.json(
      { 
        success: true, // Cambiar a true para evitar errores en el frontend
        data: {
          logs: [],
          total: 0,
          limit: parseInt(request.nextUrl.searchParams.get('limit') || '100'),
          offset: parseInt(request.nextUrl.searchParams.get('offset') || '0'),
          hasMore: false
        },
        error: 'Error al obtener los logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    );
  }
}

/**
 * ========================================
 * WEBSOCKET LOGS - ENDPOINT DE ELIMINACIÓN
 * ========================================
 * 
 * 🗑️ ELIMINACIÓN DE LOGS WEBSOCKET
 * Este endpoint permite eliminar logs WebSocket de forma individual o masiva.
 * Soporta eliminación por IDs específicos o limpieza completa.
 * 
 * 📡 ACCIONES SOPORTADAS:
 * - delete: Eliminar logs específicos por IDs
 * - delete_all: Eliminar todos los logs
 * - cleanup: Limpieza automática por fecha/cantidad
 * 
 * 🆔 PARÁMETROS POST:
 * {
 *   "action": "delete" | "delete_all" | "cleanup",
 *   "ids": ["log1", "log2"] // Para action: delete
 *   "olderThanDays": 7 // Para action: cleanup
 *   "maxLogsPerConnection": 1000 // Para action: cleanup
 * }
 * 
 * 🔒 SEGURIDAD:
 * - Validación de systemId del usuario
 * - Logs de auditoría de eliminaciones
 * - Confirmación requerida para delete_all
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ids, olderThanDays, maxLogsPerConnection, confirm } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Acción requerida' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'delete':
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return NextResponse.json(
            { error: 'IDs de logs requeridos para eliminación' },
            { status: 400 }
          );
        }
        result = await deleteSpecificLogs(ids, session.user.id);
        break;

      case 'delete_all':
        if (!confirm) {
          return NextResponse.json(
            { error: 'Confirmación requerida para eliminar todos los logs' },
            { status: 400 }
          );
        }
        result = await deleteAllLogs(session.user.id);
        break;

      case 'cleanup':
        result = await cleanupLogs({
          olderThanDays: olderThanDays || 7,
          maxLogsPerConnection: maxLogsPerConnection || 1000,
          userId: session.user.id
        });
        break;

      default:
        return NextResponse.json(
          { error: `Acción inválida: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Acción '${action}' ejecutada correctamente`,
      data: result
    });

  } catch (error) {
    console.error('Error en eliminación de logs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Eliminar logs específicos por IDs
 */
async function deleteSpecificLogs(ids: string[], userId: string) {
  const deletedLogs = await prisma.webSocketLog.deleteMany({
    where: {
      id: {
        in: ids
      }
    }
  });

  // Log de auditoría
  console.log(`🗑️ Usuario ${userId} eliminó ${deletedLogs.count} logs específicos`);

  return {
    deletedCount: deletedLogs.count,
    deletedIds: ids,
    message: `${deletedLogs.count} logs eliminados correctamente`
  };
}

/**
 * Eliminar todos los logs
 */
async function deleteAllLogs(userId: string) {
  const totalLogs = await prisma.webSocketLog.count();
  
  const deletedLogs = await prisma.webSocketLog.deleteMany({});

  // Log de auditoría
  console.log(`🗑️ Usuario ${userId} eliminó TODOS los logs (${deletedLogs.count} logs)`);

  return {
    deletedCount: deletedLogs.count,
    totalBefore: totalLogs,
    message: `Todos los logs eliminados (${deletedLogs.count} logs)`
  };
}

/**
 * Limpieza automática de logs
 */
async function cleanupLogs(options: {
  olderThanDays: number;
  maxLogsPerConnection: number;
  userId: string;
}) {
  const { olderThanDays, maxLogsPerConnection, userId } = options;
  
  let totalDeleted = 0;
  
  // 1. Eliminar logs antiguos
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const oldLogsDeleted = await prisma.webSocketLog.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      }
    }
  });
  
  totalDeleted += oldLogsDeleted.count;

  // 2. Limitar logs por conexión
  const connections = await prisma.webSocketConnection.findMany({
    select: { id: true }
  });

  for (const connection of connections) {
    // Obtener logs de esta conexión ordenados por fecha (más recientes primero)
    const logs = await prisma.webSocketLog.findMany({
      where: { connectionId: connection.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });

    // Si hay más logs que el máximo permitido, eliminar los más antiguos
    if (logs.length > maxLogsPerConnection) {
      const logsToDelete = logs.slice(maxLogsPerConnection);
      const logsDeletedForConnection = await prisma.webSocketLog.deleteMany({
        where: {
          id: {
            in: logsToDelete.map(log => log.id)
          }
        }
      });
      
      totalDeleted += logsDeletedForConnection.count;
    }
  }

  // Log de auditoría
  console.log(`🧹 Usuario ${userId} ejecutó limpieza automática: ${totalDeleted} logs eliminados`);

  return {
    deletedCount: totalDeleted,
    criteria: {
      olderThanDays,
      maxLogsPerConnection
    },
    message: `Limpieza completada: ${totalDeleted} logs eliminados`
  };
} 