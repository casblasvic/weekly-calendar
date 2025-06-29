import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las conexiones WebSocket
    const connections = await prisma.webSocketConnection.findMany({
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 100 // Últimos 100 logs
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Found ${connections.length} WebSocket connections`);

    // Obtener logs recientes para estadísticas (con manejo de errores)
    let recentLogs: any[] = [];
    
    try {
      // Query simple sin filtros complicados
      recentLogs = await prisma.webSocketLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          connection: {
            select: {
              type: true,
              referenceId: true,
              status: true,
              metadata: true
            }
          }
        }
      });
      
      console.log(`Found ${recentLogs.length} WebSocket logs`);
    } catch (logsError) {
      console.warn('Error obteniendo logs WebSocket con include, intentando sin include:', logsError);
      
      // Intentar query más simple sin include
      try {
        recentLogs = await prisma.webSocketLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100
        });
        console.log(`Found ${recentLogs.length} WebSocket logs (sin include)`);
      } catch (simpleError) {
        console.warn('Error incluso con query simple, usando array vacío:', simpleError);
        recentLogs = [];
      }
    }

    // Calcular estadísticas de mensajes desde los logs incluidos en conexiones
    let totalMessagesSent = 0;
    let totalMessagesReceived = 0;
    
    connections.forEach(conn => {
      if (conn.logs && conn.logs.length > 0) {
        conn.logs.forEach(log => {
          if (log.eventType === 'message') {
            if (log.message?.includes('sent') || log.message?.includes('enviado') || log.message?.includes('Sending')) {
              totalMessagesSent++;
            } else {
              totalMessagesReceived++;
            }
          }
        });
      }
    });

    // También contar desde logs recientes si están disponibles
    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        if (log.eventType === 'message') {
          if (log.message?.includes('sent') || log.message?.includes('enviado') || log.message?.includes('Sending')) {
            totalMessagesSent++;
          } else {
            totalMessagesReceived++;
          }
        }
      });
    }

    console.log(`Calculated messages: ${totalMessagesSent} sent, ${totalMessagesReceived} received`);

    return NextResponse.json({
      connections,
      logs: recentLogs,
      messageStats: {
        sent: totalMessagesSent,
        received: totalMessagesReceived,
        total: totalMessagesSent + totalMessagesReceived
      }
    });

  } catch (error) {
    console.error('Error obteniendo conexiones WebSocket:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 