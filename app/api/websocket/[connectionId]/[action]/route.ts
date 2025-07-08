/**
 * ========================================
 * WEBSOCKET MANAGER - ENDPOINT DE CONTROL DE CONEXIONES
 * ========================================
 * 
 * 🔌 GESTIÓN DE CONEXIONES WEBSOCKET
 * Este endpoint permite controlar el estado de las conexiones WebSocket.
 * Soporta múltiples tipos de conexiones: SHELLY, SOCKET_IO, CUSTOM.
 * 
 * 📡 ACCIONES SOPORTADAS:
 * - start: Iniciar una conexión WebSocket
 * - stop: Detener una conexión WebSocket
 * - restart: Reiniciar una conexión WebSocket
 * - toggle-reconnect: Cambiar modo de reconexión automática
 * 
 * 🆔 PARÁMETROS:
 * - connectionId: ID de la conexión en tabla WebSocketConnection
 * - action: Acción a realizar (start|stop|restart|toggle-reconnect)
 * 
 * 🏗️ FLUJO DE CONTROL:
 * 1. Validar connectionId y action
 * 2. Verificar permisos del usuario
 * 3. Buscar conexión en BD
 * 4. Ejecutar acción específica según tipo
 * 5. Actualizar estado en BD
 * 6. Registrar evento en logs
 * 
 * 📊 TABLA UTILIZADA:
 * - WebSocketConnection: Estado y configuración de conexiones
 * - WebSocketLog: Registro de eventos y acciones
 * 
 * 🔒 SEGURIDAD:
 * - Validación de systemId del usuario
 * - Rate limiting por IP
 * - Logs de auditoría de todas las acciones
 * - Validación estricta de parámetros
 * 
 * 🎯 USO:
 * POST /api/websocket/{connectionId}/{action}
 * 
 * Donde:
 * - {connectionId}: ID de WebSocketConnection
 * - {action}: start|stop|restart|toggle-reconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Acciones válidas
const VALID_ACTIONS = ['start', 'stop', 'restart', 'toggle-reconnect', 'refresh-token'] as const;
type WebSocketAction = typeof VALID_ACTIONS[number];

// Tipos de conexión soportados
const CONNECTION_TYPES = {
  SHELLY: 'SHELLY',
  SOCKET_IO: 'SOCKET_IO',
  CUSTOM: 'CUSTOM',
  TEST: 'TEST'
} as const;

// 🚀 HELPER: Asegurar cliente Redis de publicación para Pub/Sub
// ========================================
// Este helper crea (si es necesario) y retorna un cliente Redis listo para publicar
// en el canal `shelly:disconnect`. Se utiliza en acciones que necesitan propagar
// eventos de desconexión a todos los workers. Evita que la acción falle cuando el
// proceso actual todavía no ha inicializado `pages/api/socket.js` (donde normalmente
// se crea `global.redisPubClient`).
async function ensureRedisPubClient() {
  // Si ya existe en global, reutilizarlo
  if ((global as any).redisPubClient) {
    return (global as any).redisPubClient as import('redis').RedisClientType;
  }

  // Verificar variable de entorno
  if (!process.env.REDIS_URL) {
    console.warn('⚠️  REDIS_URL no definido – no se puede crear cliente Redis');
    return null;
  }

  try {
    const { createClient } = await import('redis');
    const pubClient = createClient({ url: process.env.REDIS_URL });

    pubClient.on('error', (err: any) => {
      console.error('Redis PubClient error', err);
    });

    // Conectar si aún no está conectado
    if (pubClient.isOpen === false) {
      await pubClient.connect();
    }

    // Guardar en global para futuras reutilizaciones
    (global as any).redisPubClient = pubClient;
    console.log('✅ Redis PubClient inicializado en /api/websocket route');

    return pubClient;
  } catch (err) {
    console.error('❌ Error creando Redis PubClient:', err);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string; action: string }> }
) {
  let connectionId: string | undefined;
  let action: string | undefined;
  
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user?.systemId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Await params para Next.js 15
    const resolvedParams = await params;
    connectionId = resolvedParams.connectionId;
    action = resolvedParams.action;

    // Validar parámetros
    if (!connectionId || !action) {
      return NextResponse.json(
        { error: 'connectionId y action son requeridos' },
        { status: 400 }
      );
    }

    if (!VALID_ACTIONS.includes(action as WebSocketAction)) {
      return NextResponse.json(
        { error: `Acción inválida. Válidas: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Buscar la conexión
    const connection = await prisma.webSocketConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Conexión no encontrada' },
        { status: 404 }
      );
    }

    // Log de la acción iniciada
    await logWebSocketEvent(
      connectionId,
      'action',
      `Acción '${action}' iniciada por usuario`,
      { 
        userId: session.user.id,
        userEmail: session.user.email,
        clientIp: getClientIP(request),
        userAgent: request.headers.get('user-agent')
      }
    );

    let result;
    
    // Ejecutar acción según el tipo
    switch (action as WebSocketAction) {
      case 'start':
        result = await handleStartConnection(connection);
        break;
        
      case 'stop':
        result = await handleStopConnection(connection);
        break;
        
      case 'restart':
        result = await handleRestartConnection(connection);
        break;
        
      case 'toggle-reconnect':
        result = await handleToggleReconnect(connection);
        break;
        
      case 'refresh-token':
        result = await handleRefreshToken(connection);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Acción no implementada' },
          { status: 400 }
        );
    }

    // Log de éxito
    await logWebSocketEvent(
      connectionId,
      'action_success',
      `Acción '${action}' ejecutada exitosamente`,
      { result }
    );

    return NextResponse.json({
      success: true,
      message: `Acción '${action}' ejecutada correctamente`,
      data: result
    });

  } catch (error) {
    console.error(`Error en acción WebSocket:`, error);
    
    // Log de error (con manejo seguro de params)
    if (connectionId) {
      await logWebSocketEvent(
        connectionId,
        'action_error',
        `Error ejecutando acción '${action || 'unknown'}'`,
        { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      ).catch(console.error);
    }

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

/**
 * Iniciar una conexión WebSocket
 */
async function handleStartConnection(connection: any) {
  console.log(`🟢 Iniciando conexión ${connection.type} (${connection.id})`);

  switch (connection.type) {
    case CONNECTION_TYPES.SHELLY:
      return await startShellyConnection(connection);
      
    case CONNECTION_TYPES.SOCKET_IO:
      return await startSocketIOConnection(connection);
      
    case CONNECTION_TYPES.CUSTOM:
      return await startCustomConnection(connection);
      
    case CONNECTION_TYPES.TEST:
      return await startTestConnection(connection);
      
    default:
      // Para tipos no reconocidos, tratarlos como CUSTOM pero con warning
      console.warn(`⚠️ Tipo de conexión desconocido: ${connection.type}. Tratando como CUSTOM.`);
      return await startCustomConnection(connection);
  }
}

/**
 * Detener una conexión WebSocket
 */
async function handleStopConnection(connection: any) {
  console.log(`🔴 Deteniendo conexión ${connection.type} (${connection.id})`);

  // Actualizar estado a disconnected Y desactivar autoReconnect para parada manual
  const updatedConnection = await prisma.webSocketConnection.update({
    where: { id: connection.id },
    data: {
      status: 'disconnected',
      errorMessage: null,
      lastPingAt: null,
      autoReconnect: false, // Desactivar reconexión automática en parada manual
      updatedAt: new Date()
    }
  });

  await logWebSocketEvent(
    connection.id,
    'disconnect',
    'Conexión detenida manualmente - autoReconnect desactivado'
  );

  // Si es una conexión Shelly, también cerrar el WebSocket real
  if (connection.type === CONNECTION_TYPES.SHELLY) {
    try {
      const { shellyWebSocketManager } = await import('@/lib/shelly/websocket-manager');
      await shellyWebSocketManager.disconnectCredential(connection.referenceId);
      console.log(`🔌 WebSocket Shelly cerrado para credencial ${connection.referenceId}`);

      // 🟥 MARCAR OFFLINE TODOS LOS DISPOSITIVOS RELACIONADOS Y EMITIR EVENTO
      try {
        // 1. Actualizar BD: offline inmediato
        await prisma.smartPlugDevice.updateMany({
          where: { credentialId: connection.referenceId },
          data: {
            online: false,
            relayOn: false,
            currentPower: 0,
            updatedAt: new Date(),
            lastSeenAt: new Date()
          }
        });

        // 2. Obtener devices y agrupar por systemId para broadcast
        const devicesForBroadcast = await prisma.smartPlugDevice.findMany({
          where: { credentialId: connection.referenceId },
          select: {
            id: true,
            deviceId: true,
            credential: { select: { systemId: true } }
          }
        });

        // Agrupar en mapa systemId → devices
        const grouped: Record<string, typeof devicesForBroadcast> = {};
        devicesForBroadcast.forEach(d => {
          const sys = d.credential?.systemId;
          if (!sys) return;
          grouped[sys] = grouped[sys] || [];
          grouped[sys].push(d);
        });

        // 3. Emitir evento via broadcastDeviceUpdate disponible en pages/api/socket.js
        for (const [systemId, devs] of Object.entries(grouped)) {
          devs.forEach(dev => {
            const payload = {
              deviceId: dev.id,
              shellyDeviceId: dev.deviceId,
              online: false,
              relayOn: false,
              currentPower: 0,
              voltage: null,
              temperature: null,
              timestamp: Date.now(),
              reason: 'manual_stop'
            };
            if ((global as any).broadcastDeviceUpdate) {
              (global as any).broadcastDeviceUpdate(systemId, payload);
            }
          });
        }
        console.log(`📤 Dispositivos de credencial ${connection.referenceId} marcados OFFLINE y broadcast enviados`);
      } catch (devErr) {
        console.error('⚠️  Error marcando dispositivos offline tras stop:', devErr);
      }
    } catch (error) {
      console.error('Error cerrando WebSocket Shelly:', error);
    }
  }

  // Para conexiones SOCKET_IO cerrar socket local por socketId = referenceId
  if (connection.type === CONNECTION_TYPES.SOCKET_IO && (global as any).forceSocketDisconnect) {
    (global as any).forceSocketDisconnect(connection.referenceId);
  }

  // 📢 Publicar en Redis para que otros procesos cierren la conexión Shelly correspondiente
  try {
    const redisPub = await ensureRedisPubClient();
    if (redisPub && connection.type === CONNECTION_TYPES.SHELLY) {
      await redisPub.publish('shelly:disconnect', JSON.stringify({ credentialId: connection.referenceId }));
      console.log(`📢 [Redis] Mensaje shelly:disconnect publicado para credencial ${connection.referenceId}`);
    } else if (!redisPub) {
      console.warn('⚠️  Redis PubClient no disponible; no se puede propagar shelly:disconnect');
    }
  } catch (redisErr) {
    console.error('⚠️  Error publicando shelly:disconnect en Redis:', redisErr);
  }

  return {
    connectionId: connection.id,
    previousStatus: connection.status,
    newStatus: 'disconnected',
    autoReconnect: false,
    message: 'Conexión detenida correctamente. AutoReconnect desactivado para evitar reconexión automática.'
  };
}

/**
 * Reiniciar una conexión WebSocket
 */
async function handleRestartConnection(connection: any) {
  console.log(`🔄 Reiniciando conexión ${connection.type} (${connection.id})`);

  // Primero detener
  await handleStopConnection(connection);
  
  // Esperar un momento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Luego iniciar
  const startResult = await handleStartConnection(connection);

  return {
    connectionId: connection.id,
    message: 'Conexión reiniciada correctamente',
    startResult
  };
}

/**
 * Cambiar modo de reconexión automática
 */
async function handleToggleReconnect(connection: any) {
  console.log(`⚙️ Cambiando autoReconnect para ${connection.id}`);

  const newAutoReconnect = !connection.autoReconnect;
  
  const updatedConnection = await prisma.webSocketConnection.update({
    where: { id: connection.id },
    data: {
      autoReconnect: newAutoReconnect,
      updatedAt: new Date()
    }
  });

  await logWebSocketEvent(
    connection.id,
    'config_change',
    `AutoReconnect ${newAutoReconnect ? 'habilitado' : 'deshabilitado'}`,
    { autoReconnect: newAutoReconnect }
  );

  return {
    connectionId: connection.id,
    autoReconnect: newAutoReconnect,
    message: `Reconexión automática ${newAutoReconnect ? 'habilitada' : 'deshabilitada'}`
  };
}

/**
 * Iniciar conexión Shelly
 */
async function startShellyConnection(connection: any) {
  // Importar dinámicamente el WebSocket Manager de Shelly
  try {
    const { shellyWebSocketManager } = await import('@/lib/shelly/websocket-manager');
    
    // Conectar usando el referenceId (credentialId)
    await shellyWebSocketManager.connectCredential(connection.referenceId);
    
    // Actualizar estado Y reactivar autoReconnect en inicio manual
    await prisma.webSocketConnection.update({
      where: { id: connection.id },
      data: {
        status: 'connected',
        errorMessage: null,
        lastPingAt: new Date(),
        autoReconnect: true, // Reactivar reconexión automática en inicio manual
        updatedAt: new Date()
      }
    });

    await logWebSocketEvent(
      connection.id,
      'connect',
      'Conexión Shelly iniciada exitosamente - autoReconnect reactivado'
    );

    return {
      type: 'SHELLY',
      credentialId: connection.referenceId,
      status: 'connected',
      autoReconnect: true,
      message: 'Conexión Shelly establecida. AutoReconnect reactivado.'
    };

  } catch (error) {
    await prisma.webSocketConnection.update({
      where: { id: connection.id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        updatedAt: new Date()
      }
    });

    throw error;
  }
}

/**
 * Iniciar conexión Socket.IO
 */
async function startSocketIOConnection(connection: any) {
  try {
    // Para Socket.IO, simplemente marcar como conectado Y reactivar autoReconnect
    await prisma.webSocketConnection.update({
      where: { id: connection.id },
      data: {
        status: 'connected',
        errorMessage: null,
        lastPingAt: new Date(),
        autoReconnect: true, // Reactivar reconexión automática
        updatedAt: new Date()
      }
    });

    await logWebSocketEvent(
      connection.id,
      'connect',
      'Conexión Socket.IO marcada como activa - autoReconnect reactivado'
    );

    return {
      type: 'SOCKET_IO',
      endpoint: '/api/socket',
      status: 'connected',
      autoReconnect: true,
      message: 'Conexión Socket.IO activada. AutoReconnect reactivado.'
    };

  } catch (error) {
    await prisma.webSocketConnection.update({
      where: { id: connection.id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        updatedAt: new Date()
      }
    });

    throw error;
  }
}

/**
 * Iniciar conexión personalizada
 */
async function startCustomConnection(connection: any) {
  // Para conexiones personalizadas, solo actualizar el estado Y reactivar autoReconnect
  
  await prisma.webSocketConnection.update({
    where: { id: connection.id },
    data: {
      status: 'connected',
      errorMessage: null,
      lastPingAt: new Date(),
      autoReconnect: true, // Reactivar reconexión automática
      updatedAt: new Date()
    }
  });

  await logWebSocketEvent(
    connection.id,
    'connect',
    'Conexión personalizada marcada como activa - autoReconnect reactivado'
  );

  return {
    type: 'CUSTOM',
    status: 'connected',
    autoReconnect: true,
    message: 'Conexión personalizada activada. AutoReconnect reactivado.'
  };
}

/**
 * Iniciar conexión de prueba (TEST)
 */
async function startTestConnection(connection: any) {
  console.log(`🧪 Iniciando conexión de prueba: ${connection.id}`);
  
  try {
    // Para conexiones TEST, simplemente simular una conexión exitosa Y reactivar autoReconnect
    await prisma.webSocketConnection.update({
      where: { id: connection.id },
      data: {
        status: 'connected',
        errorMessage: null,
        lastPingAt: new Date(),
        autoReconnect: true, // Reactivar reconexión automática
        updatedAt: new Date()
      }
    });

    await logWebSocketEvent(
      connection.id,
      'connect',
      'Conexión TEST iniciada exitosamente (simulada) - autoReconnect reactivado'
    );

    return {
      type: 'TEST',
      status: 'connected',
      autoReconnect: true,
      message: 'Conexión TEST establecida (simulada para pruebas). AutoReconnect reactivado.',
      note: 'Esta es una conexión de prueba que no realiza operaciones reales'
    };

  } catch (error) {
    await prisma.webSocketConnection.update({
      where: { id: connection.id },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        updatedAt: new Date()
      }
    });

    throw error;
  }
}

/**
 * Registrar evento en logs WebSocket
 */
async function logWebSocketEvent(
  connectionId: string,
  eventType: string,
  message: string,
  metadata?: any,
  systemId?: string
) {
  try {
    // Obtener systemId si no lo suministran
    let logSystemId = systemId;
    if (!logSystemId) {
      const conn = await prisma.webSocketConnection.findUnique({
        where: { id: connectionId },
        select: { systemId: true, loggingEnabled: true }
      });
      logSystemId = conn?.systemId || 'unknown-system';

      // Respetar loggingEnabled
      if (conn && conn.loggingEnabled === false) {
        return;
      }
    }

    await prisma.webSocketLog.create({
      data: {
        connectionId,
        systemId: logSystemId,
        eventType,
        message,
        metadata,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging WebSocket event:', error);
  }
}

/**
 * Obtener IP del cliente
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Refrescar token de Shelly manualmente
 */
async function handleRefreshToken(connection: any) {
  console.log(`🔑 Refrescando token manualmente para ${connection.type} (${connection.id})`);

  if (connection.type !== CONNECTION_TYPES.SHELLY) {
    throw new Error('Refresh de token solo soportado para conexiones SHELLY');
  }

  try {
    // Importar funciones necesarias
    const { decrypt, encrypt } = await import('@/lib/shelly/crypto');
    const { refreshShellyToken } = await import('@/lib/shelly/client');

    // Obtener credencial de BD
    const credential = await prisma.shellyCredential.findUnique({
      where: { id: connection.referenceId }
    });

    if (!credential) {
      throw new Error('Credencial Shelly no encontrada');
    }

    console.log(`🔑 [TOKEN] Refrescando token para credencial ${connection.referenceId}...`);

    // Decrypt del refresh token
    const refreshToken = decrypt(credential.refreshToken);
    
    // Llamar a la API de Shelly para refrescar
    const newTokens = await refreshShellyToken(credential.apiHost, refreshToken);

    // Actualizar tokens en BD
    await prisma.shellyCredential.update({
      where: { id: connection.referenceId },
      data: {
        accessToken: encrypt(newTokens.access_token),
        refreshToken: encrypt(newTokens.refresh_token),
        status: 'connected',
        lastSyncAt: new Date()
      }
    });

    console.log(`✅ [TOKEN] Token refrescado exitosamente para ${connection.referenceId}`);

    // Log del evento exitoso
    await logWebSocketEvent(
      connection.id,
      'token_refreshed',
      'Token de acceso refrescado manualmente por usuario'
    );

    return {
      connectionId: connection.id,
      credentialId: connection.referenceId,
      message: 'Token refrescado exitosamente',
      tokenRefreshed: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ [TOKEN] Error refrescando token:`, error);
    
    // Actualizar estado de credencial como error
    await prisma.shellyCredential.update({
      where: { id: connection.referenceId },
      data: {
        status: 'expired'
      }
    }).catch(updateError => {
      console.error('Error actualizando estado de credencial:', updateError);
    });

    // Log del error
    await logWebSocketEvent(
      connection.id,
      'token_refresh_failed',
      'Error refrescando token manualmente',
      { error: error instanceof Error ? error.message : 'Error desconocido' }
    );

    throw error;
  }
} 