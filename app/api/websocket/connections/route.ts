import { NextResponse } from 'next/server';
import { webSocketConnectionService } from '@/lib/websocket/connection-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const type = searchParams.get('type');
    const referenceId = searchParams.get('referenceId');

    switch (action) {
      case 'stats':
        const stats = await webSocketConnectionService.getConnectionStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'by-type':
        if (!type) {
          return NextResponse.json({
            success: false,
            error: 'Parámetro type requerido'
          }, { status: 400 });
        }
        
        const connections = await webSocketConnectionService.getConnectionsByType(type);
        return NextResponse.json({
          success: true,
          data: connections
        });

      case 'get-connection':
        if (!type || !referenceId) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type y referenceId requeridos'
          }, { status: 400 });
        }
        
        const connection = await webSocketConnectionService.getConnection(type, referenceId);
        return NextResponse.json({
          success: true,
          data: connection
        });

      case 'cleanup':
        const olderThanDays = parseInt(searchParams.get('days') || '7');
        const cleanedCount = await webSocketConnectionService.cleanupOldConnections(olderThanDays);
        return NextResponse.json({
          success: true,
          data: {
            message: `${cleanedCount} conexiones antiguas eliminadas`,
            cleanedCount,
            olderThanDays
          }
        });

      default:
        // Listar todas las conexiones con paginación
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const allConnections = await webSocketConnectionService.getConnectionsByType('');

        return NextResponse.json({
          success: true,
          data: {
            connections: allConnections.slice(offset, offset + limit),
            pagination: {
              page,
              limit,
              total: allConnections.length,
              pages: Math.ceil(allConnections.length / limit)
            }
          }
        });
    }

  } catch (error) {
    console.error('❌ Error en WebSocket Connections API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, type, referenceId, status, errorMessage, metadata } = body;

    switch (action) {
      case 'create-or-update':
        if (!type || !referenceId || !status) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type, referenceId y status requeridos'
          }, { status: 400 });
        }

        const result = await webSocketConnectionService.findOrCreateConnection({
          type,
          referenceId,
          status,
          errorMessage,
          metadata
        });

        return NextResponse.json({
          success: true,
          data: result
        });

      case 'update-status':
        if (!type || !referenceId || !status) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type, referenceId y status requeridos'
          }, { status: 400 });
        }

        await webSocketConnectionService.updateConnectionStatus(
          type, 
          referenceId, 
          status, 
          errorMessage, 
          metadata
        );

        return NextResponse.json({
          success: true,
          data: { message: 'Estado actualizado' }
        });

      case 'log-event':
        const { connectionId, eventType, message, errorDetails, responseTime, dataSize } = body;
        
        if (!connectionId || !eventType) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros connectionId y eventType requeridos'
          }, { status: 400 });
        }

        await webSocketConnectionService.logEvent({
          connectionId,
          eventType,
          message,
          errorDetails,
          metadata,
          responseTime,
          dataSize
        });

        return NextResponse.json({
          success: true,
          data: { message: 'Evento registrado' }
        });

      case 'mark-connected':
        if (!type || !referenceId) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type y referenceId requeridos'
          }, { status: 400 });
        }

        await webSocketConnectionService.markAsConnected(type, referenceId, metadata);
        return NextResponse.json({
          success: true,
          data: { message: 'Marcado como conectado' }
        });

      case 'mark-disconnected':
        if (!type || !referenceId) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type y referenceId requeridos'
          }, { status: 400 });
        }

        await webSocketConnectionService.markAsDisconnected(type, referenceId, errorMessage);
        return NextResponse.json({
          success: true,
          data: { message: 'Marcado como desconectado' }
        });

      case 'mark-error':
        if (!type || !referenceId || !errorMessage) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type, referenceId y errorMessage requeridos'
          }, { status: 400 });
        }

        await webSocketConnectionService.markAsError(type, referenceId, errorMessage);
        return NextResponse.json({
          success: true,
          data: { message: 'Marcado como error' }
        });

      case 'mark-reconnecting':
        if (!type || !referenceId) {
          return NextResponse.json({
            success: false,
            error: 'Parámetros type y referenceId requeridos'
          }, { status: 400 });
        }

        await webSocketConnectionService.markAsReconnecting(type, referenceId);
        return NextResponse.json({
          success: true,
          data: { message: 'Marcado como reconectando' }
        });

      default:
        return NextResponse.json({
          success: false,
          error: `Acción '${action}' no reconocida`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error en WebSocket Connections POST:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const cleanedCount = await webSocketConnectionService.cleanupOldConnections(days);
    
    return NextResponse.json({
      success: true,
      data: {
        message: `${cleanedCount} conexiones antiguas eliminadas`,
        cleanedCount,
        olderThanDays: days
      }
    });

  } catch (error) {
    console.error('❌ Error en WebSocket Connections DELETE:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 