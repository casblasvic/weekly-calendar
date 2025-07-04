import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isShellyModuleActive } from '@/lib/services/shelly-module-service';

/**
 * ========================================
 * ENDPOINT: Desconectar WebSocket de Credencial Shelly
 * ========================================
 * 
 * 🔌 DESCONECTAR WEBSOCKET TRANSPARENTE
 * Este endpoint permite al usuario desconectar el WebSocket de tiempo real
 * para una credencial Shelly específica. Es transparente - el usuario
 * solo ve "desconectar" la cuenta.
 * 
 * 🎯 FUNCIONALIDAD:
 * - Verifica que la credencial existe y pertenece al usuario
 * - Busca la conexión WebSocket existente
 * - Desactiva autoReconnect para evitar reconexión automática
 * - Desconecta la conexión WebSocket real usando ShellyWebSocketManager
 * - Marca el estado como desconectado
 * 
 * 📊 TABLAS UTILIZADAS:
 * - `ShellyCredential`: Verificar permisos
 * - `WebSocketConnection`: Actualizar estado de conexión
 * - `WebSocketLog`: Registrar eventos de desconexión
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * IMPORTANTE: Usar: import { prisma } from '@/lib/db';
 * 
 * 🎯 USO:
 * POST /api/shelly/credentials/{credentialId}/disconnect-websocket
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

    // 🛡️ PASO 3B: Verificar módulo Shelly activo
    const isModuleActive = await isShellyModuleActive(session.user.systemId);
    if (!isModuleActive) {
      console.log(`🔒 [DISCONNECT-WS] Módulo Shelly INACTIVO para sistema ${session.user.systemId} - Desconexión WebSocket bloqueada`);
      return NextResponse.json({ 
        error: "Módulo de control de enchufes inteligentes inactivo",
        details: "El módulo de control de enchufes inteligentes Shelly está desactivado. Active el módulo desde el marketplace para usar esta funcionalidad."
      }, { status: 403 });
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

    // Buscar conexión WebSocket existente (con filtro multi-tenant)
    const existingConnection = await prisma.webSocketConnection.findFirst({
      where: {
        type: 'SHELLY',
        referenceId: credentialId,
        systemId: session.user.systemId // 🛡️ FILTRO MULTI-TENANT
      }
    });

    if (!existingConnection) {
      return NextResponse.json(
        { error: 'No hay conexión WebSocket activa para esta credencial' },
        { status: 404 }
      );
    }

    // Desconectar WebSocket real usando el manager
    try {
      const { shellyWebSocketManager } = await import('@/lib/shelly/websocket-manager');
      await shellyWebSocketManager.disconnectCredential(credentialId);
      
      console.log(`✅ [USER ACTION] WebSocket desconectado para credencial ${credential.name} por usuario ${session.user.email}`);
      
      // Actualizar estado a desconectado y desactivar autoReconnect
      await prisma.webSocketConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'disconnected',
          autoReconnect: false,
          errorMessage: null,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Conexión en tiempo real desactivada exitosamente',
        data: {
          credentialId,
          credentialName: credential.name,
          connectionId: existingConnection.id,
          status: 'disconnected'
        }
      });

    } catch (disconnectionError) {
      console.error(`❌ Error desconectando WebSocket para ${credential.name}:`, disconnectionError);
      
      // Marcar como error
      await prisma.webSocketConnection.update({
        where: { id: existingConnection.id },
        data: {
          status: 'error',
          errorMessage: disconnectionError instanceof Error ? disconnectionError.message : 'Error de desconexión',
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        error: 'Error al desactivar conexión en tiempo real',
        details: disconnectionError instanceof Error ? disconnectionError.message : 'Error desconocido'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error en disconnect-websocket:', error);
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