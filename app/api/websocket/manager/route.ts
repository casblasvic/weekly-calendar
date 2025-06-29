import { NextResponse } from 'next/server';
import { webSocketManager } from '@/lib/websocket';
import { shellyRobustManager } from '@/lib/shelly/robust-websocket-manager';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'metrics':
        const baseMetrics = webSocketManager.getMetrics();
        const shellyMetrics = shellyRobustManager.getMetrics();
        
        return NextResponse.json({
          success: true,
          data: {
            system: baseMetrics,
            shelly: shellyMetrics,
            timestamp: new Date().toISOString()
          }
        });

      case 'health':
        const healthResults = await webSocketManager.healthCheck();
        const shellyHealth = await shellyRobustManager.healthCheck();
        
        return NextResponse.json({
          success: true,
          data: {
            system: healthResults,
            shelly: shellyHealth,
            timestamp: new Date().toISOString()
          }
        });

      case 'connections':
        // Obtener todas las conexiones activas
        const connections = Array.from(webSocketManager['connections'].values());
        
        return NextResponse.json({
          success: true,
          data: {
            connections: connections.map(conn => ({
              id: conn.id,
              url: conn.url,
              status: conn.status,
              lastPing: conn.lastPing,
              lastPong: conn.lastPong,
              reconnectAttempts: conn.reconnectAttempts,
              tags: conn.tags,
              metadata: conn.metadata
            })),
            timestamp: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            message: 'WebSocket Manager API',
            endpoints: [
              'GET /api/websocket/manager?action=metrics',
              'GET /api/websocket/manager?action=health', 
              'GET /api/websocket/manager?action=connections',
              'POST /api/websocket/manager (connect/disconnect/send)'
            ]
          }
        });
    }

  } catch (error) {
    console.error('❌ Error en WebSocket Manager API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'connect':
        const { url, ...config } = params;
        const connectionId = await webSocketManager.connect({
          url,
          reconnectInterval: 5000,
          maxReconnectAttempts: 5,
          pingInterval: 30000,
          pongTimeout: 10000,
          messageQueueSize: 1000,
          rateLimitPerMinute: 60,
          ...config
        });

        return NextResponse.json({
          success: true,
          data: { connectionId }
        });

      case 'disconnect':
        const { connectionId: connId } = params;
        await webSocketManager.disconnect(connId);

        return NextResponse.json({
          success: true,
          data: { message: `Conexión ${connId} desconectada` }
        });

      case 'send':
        const { connectionId: sendConnId, message, priority } = params;
        await webSocketManager.send(sendConnId, message, priority);

        return NextResponse.json({
          success: true,
          data: { message: 'Mensaje enviado' }
        });

      case 'broadcast':
        const { message: broadcastMessage, tags } = params;
        await webSocketManager.broadcast(broadcastMessage, tags);

        return NextResponse.json({
          success: true,
          data: { message: 'Mensaje enviado a todas las conexiones' }
        });

      case 'shelly-connect':
        const { credentialId } = params;
        await shellyRobustManager.connectCredential(credentialId);

        return NextResponse.json({
          success: true,
          data: { message: `Shelly ${credentialId} conectado` }
        });

      case 'shelly-disconnect':
        const { credentialId: shellyCredId } = params;
        await shellyRobustManager.disconnectCredential(shellyCredId);

        return NextResponse.json({
          success: true,
          data: { message: `Shelly ${shellyCredId} desconectado` }
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Acción '${action}' no reconocida`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en WebSocket Manager POST:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 