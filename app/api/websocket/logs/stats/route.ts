import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * 📊 ENDPOINT: Estadísticas de Logs WebSocket
 * 
 * CONTEXTO:
 * - Proporciona estadísticas resumidas de los logs WebSocket
 * - Útil para dashboards y monitoreo
 * - Incluye conteos por tipo de evento, conexión, etc.
 * 
 * RESPUESTA:
 * - totalLogs: Total de logs en el sistema
 * - logsByEventType: Conteo por tipo de evento
 * - logsByConnectionType: Conteo por tipo de conexión
 * - recentActivity: Actividad de las últimas 24 horas
 * - oldestLog: Fecha del log más antiguo
 * - newestLog: Fecha del log más reciente
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si las tablas existen
    try {
      await prisma.webSocketLog.findFirst();
    } catch (tableError) {
      return NextResponse.json({
        success: true,
        data: {
          totalLogs: 0,
          logsByEventType: {},
          logsByConnectionType: {},
          recentActivity: 0,
          oldestLog: null,
          newestLog: null
        }
      });
    }

    // Obtener estadísticas básicas
    const [
      totalLogs,
      logsByEventType,
      logsByConnectionType,
      recentActivity,
      oldestLog,
      newestLog
    ] = await Promise.all([
      // Total de logs
      prisma.webSocketLog.count(),
      
      // Logs por tipo de evento
      prisma.webSocketLog.groupBy({
        by: ['eventType'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      // Logs por tipo de conexión (usando Prisma ORM con include)
      prisma.webSocketLog.groupBy({
        by: ['connectionId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }).then(async (connectionStats) => {
        const connections = await prisma.webSocketConnection.findMany({
          where: {
            id: { in: connectionStats.map(stat => stat.connectionId) }
          },
          select: {
            id: true,
            type: true
          }
        })
        
        const typeStats = connections.reduce((acc, conn) => {
          const stat = connectionStats.find(s => s.connectionId === conn.id)
          if (stat) {
            acc[conn.type] = (acc[conn.type] || 0) + stat._count.id
          }
          return acc
        }, {} as Record<string, number>)
        
        return Object.entries(typeStats).map(([type, count]) => ({
          type,
          count
        })).sort((a, b) => b.count - a.count)
      }),
      
      // Actividad reciente (últimas 24 horas)
      prisma.webSocketLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Log más antiguo
      prisma.webSocketLog.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      }),
      
      // Log más reciente
      prisma.webSocketLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);

    // Formatear resultados
    const eventTypeStats = logsByEventType.reduce((acc, item) => {
      acc[item.eventType] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const connectionTypeStats = (logsByConnectionType as any[]).reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        totalLogs,
        logsByEventType: eventTypeStats,
        logsByConnectionType: connectionTypeStats,
        recentActivity,
        oldestLog: oldestLog?.createdAt || null,
        newestLog: newestLog?.createdAt || null,
        summary: {
          hasLogs: totalLogs > 0,
          activeInLast24h: recentActivity > 0,
          mostCommonEvent: Object.keys(eventTypeStats)[0] || null,
          mostActiveConnectionType: Object.keys(connectionTypeStats)[0] || null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching WebSocket logs stats:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener estadísticas de logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 