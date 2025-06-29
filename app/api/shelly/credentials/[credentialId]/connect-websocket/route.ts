import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * ========================================
 * ENDPOINT: Conectar WebSocket de Credencial Shelly
 * ========================================
 * 
 * 🔌 CONECTAR WEBSOCKET TRANSPARENTE
 * Este endpoint permite al usuario conectar el WebSocket de tiempo real
 * para una credencial Shelly específica. Es transparente - el usuario
 * no necesita saber que es un WebSocket, solo ve "conectar" la cuenta.
 * 
 * 🎯 FUNCIONALIDAD:
 * - Verifica que la credencial existe y pertenece al usuario
 * - Busca/crea la conexión WebSocket en la tabla WebSocketConnection
 * - Activa autoReconnect para reconexión automática
 * - Inicia la conexión WebSocket real usando ShellyWebSocketManager
 * - Transparente para el usuario - solo ve "conectar cuenta"
 * 
 * 📊 TABLAS UTILIZADAS:
 * - `ShellyCredential`: Verificar permisos y estado
 * - `WebSocketConnection`: Crear/actualizar conexión WebSocket
 * - `WebSocketLog`: Registrar eventos de conexión
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * IMPORTANTE: Usar: import { prisma } from '@/lib/db';
 * 
 * 🎯 USO:
 * POST /api/shelly/credentials/{credentialId}/connect-websocket
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { credentialId } = await params;

    // Verificar que la credencial existe y pertenece al usuario
    const credential = await prisma.shellyCredential.findFirst({
      where: {
        id: credentialId,
        systemId: session.user.systemId
      }
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credencial no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la credencial está en estado válido
    if (credential.status !== 'connected') {
      return NextResponse.json(
        { error: 'La cuenta debe estar conectada antes de activar tiempo real' },
        { status: 400 }
      );
    }

    // Buscar o crear conexión WebSocket
    const existingConnection = await prisma.webSocketConnection.findFirst({
      where: {
        type: 'SHELLY',
        referenceId: credentialId
      }
    });

    let connectionId: string;

    if (existingConnection) {
      // Actualizar conexión existente
      await prisma.webSocketConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'connecting',
          autoReconnect: true,
          errorMessage: null,
          updatedAt: new Date()
        }
      });
      connectionId = existingConnection.id;
    } else {
      // Crear nueva conexión WebSocket
      const newConnection = await prisma.webSocketConnection.create({
        data: {
          type: 'SHELLY',
          referenceId: credentialId,
          status: 'connecting',
          autoReconnect: true,
          metadata: {
            alias: `WebSocket ${credential.name}`,
            description: `Conexión tiempo real para ${credential.name}`
          }
        }
      });
      connectionId = newConnection.id;
    }

    // Conectar WebSocket real usando el manager
    try {
      const { shellyWebSocketManager } = await import('@/lib/shelly/websocket-manager');
      
      // 🔍 LOGGING DETALLADO PARA SOPORTE
      console.log(`🔌 [MANUAL RECONNECT] Usuario ${session.user.email} (ID: ${session.user.id}) está conectando manualmente el WebSocket para la credencial ${credential.name} (ID: ${credentialId})`);
      console.log(`🔍 [MANUAL RECONNECT] Timestamp: ${new Date().toISOString()}`);
      console.log(`🔍 [MANUAL RECONNECT] Sistema: ${session.user.systemId}`);
      console.log(`🔍 [MANUAL RECONNECT] IP del usuario: ${request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'No disponible'}`);
      console.log(`🔍 [MANUAL RECONNECT] User-Agent: ${request.headers.get('user-agent') || 'No disponible'}`);
      
      await shellyWebSocketManager.connectCredential(credentialId);
      
      console.log(`✅ [MANUAL RECONNECT SUCCESS] WebSocket conectado exitosamente para credencial ${credential.name} por usuario ${session.user.email}`);
      
      // Registrar en WebSocketLog para trazabilidad
      await prisma.webSocketLog.create({
        data: {
          connectionId,
          eventType: 'manual_reconnect',
          message: `Manual reconnect by user ${session.user.email} (${session.user.id})`,
          metadata: {
            action: 'manual_reconnect',
            userId: session.user.id,
            userEmail: session.user.email,
            credentialName: credential.name,
            timestamp: new Date().toISOString(),
            userIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          },
          clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
          userAgent: request.headers.get('user-agent') || null
        }
      });
      
      // Actualizar estado a conectado
      await prisma.webSocketConnection.update({
        where: { id: connectionId },
        data: {
          status: 'connected',
          lastPingAt: new Date(),
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Conexión en tiempo real activada exitosamente',
        data: {
          credentialId,
          credentialName: credential.name,
          connectionId,
          status: 'connected'
        }
      });

    } catch (connectionError) {
      console.error(`❌ Error conectando WebSocket para ${credential.name}:`, connectionError);
      
      // Marcar como error
      await prisma.webSocketConnection.update({
        where: { id: connectionId },
        data: {
          status: 'error',
          errorMessage: connectionError instanceof Error ? connectionError.message : 'Error de conexión',
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Error al activar conexión en tiempo real',
        details: connectionError instanceof Error ? connectionError.message : 'Error desconocido'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error en connect-websocket:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 