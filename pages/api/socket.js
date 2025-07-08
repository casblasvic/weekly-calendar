import { Server } from 'socket.io';
// 🆕 Redis Adapter para Socket.IO
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { prisma } from '../../lib/db';
import { decrypt, encrypt } from '../../lib/shelly/crypto.ts';
import { refreshShellyToken } from '../../lib/shelly/client.ts';
import { shellyWebSocketManager } from '@/lib/shelly/websocket-manager';
import { wsLogger } from '../../lib/utils/websocket-logger.js';
import { deviceOfflineManager } from '../../lib/shelly/device-offline-manager.ts';
import { isShellyModuleActive } from '../../lib/services/shelly-module-service.ts';
import { io as ioClient } from 'socket.io-client';

// Almacenar conexiones por systemId
let io;
let remoteClient;
const systemConnections = new Map();

/**
 * 🌐 initializeRemoteClient (stub)
 * --------------------------------------------------
 * En algunos entornos (p.e. desarrollo sin servidor WS
 * remoto o sin definir la función original) puede faltar
 * la definición.  Creamos un stub no-operativo para evitar
 * ReferenceError y permitir que la ruta /api/socket siga
 * inicializando el servidor local.
 */
function initializeRemoteClient() {
  const REMOTE_WS_URL = process.env.NEXT_PUBLIC_WS_URL;
  if (!REMOTE_WS_URL) {
    console.warn('⚠️ [REMOTE CLIENT] NEXT_PUBLIC_WS_URL no definido – cliente remoto omitido');
    return null;
  }
  try {
    console.log(`🌐 [REMOTE CLIENT] (stub) Conectando a ${REMOTE_WS_URL}…`);
    remoteClient = ioClient(REMOTE_WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    remoteClient.on('connect', () => console.log('✅ [REMOTE CLIENT] Conectado'));
    remoteClient.on('error', err => console.error('❌ [REMOTE CLIENT] Error:', err));
    return remoteClient;
  } catch (err) {
    console.error('❌ [REMOTE CLIENT] Error inicializando cliente remoto (stub):', err);
    return null;
  }
}

/**
 * 🚀 initializeWebSocketManager (stub mínimo)
 * Llama a initializeWebSocketConnections una vez que el server Socket.io
 * está listo.  Garantiza que la función exista para evitar ReferenceError.
 */
function initializeWebSocketManager() {
  try {
    if (!io) {
      console.warn('⚠️ [WS-MANAGER] io aún no está disponible, se omitirá la inicialización');
      return;
    }
    // Diferir al próximo tick para asegurar que emitToSystem & process* ya existen
    setTimeout(() => {
      try {
        initializeWebSocketConnections(io);
      } catch (err2) {
        console.error('❌ [WS-MANAGER] Error interno en init connections:', err2);
      }
    }, 0);
  } catch (err) {
    console.error('❌ [WS-MANAGER] Error inicializando WebSocket Manager:', err);
  }
}

/** ------------------------------------------------------------
 * emitToSystem
 * Envía un evento tanto al room local del systemId como al
 * cliente remoto (si existe).  Se declara antes de uso para
 * evitar ReferenceError en callbacks definidos más abajo.
 * ------------------------------------------------------------ */
function emitToSystem(systemId, eventName, data) {
  try {
    // Local broadcast
    if (io) {
      io.to(systemId).emit(eventName, data);
    }
    // Remoto
    if (remoteClient && remoteClient.connected) {
      remoteClient.emit('broadcast-to-system', { systemId, eventName, data });
    }
  } catch (err) {
    console.error('❌ emitToSystem error:', err);
  }
}

/** ------------------------------------------------------------
 * processAppointmentDeviceUsageUpdate (stub)
 * Si la lógica completa no está cargada en este runtime, evitamos
 * ReferenceError.  Se puede reemplazar por la versión completa
 * en otros módulos.
 * ------------------------------------------------------------ */
async function processAppointmentDeviceUsageUpdate() {
  // Stub: no-op en este proceso
  return;
}

// 🆕 Clientes Redis (publicador / suscriptor) para adapter y PubSub interno
let redisPubClient;
let redisSubClient;

// Helper para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('🔌 Configurando servidor Socket.io...');
    
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // ------------------------------------------------------------
    // ⛓️  Conectar Redis Adapter para propagar eventos entre workers
    // ------------------------------------------------------------
    (async function setupRedisAdapter(instance) {
      try {
        if (!process.env.REDIS_URL) {
          console.warn('⚠️  REDIS_URL no definido; el adapter Redis no se inicializará');
          return;
        }

        if (!redisPubClient || !redisSubClient) {
          redisPubClient = createClient({ url: process.env.REDIS_URL });
          redisSubClient = redisPubClient.duplicate();

          redisPubClient.on('error', (err) => console.error('Redis PubClient error', err));
          redisSubClient.on('error', (err) => console.error('Redis SubClient error', err));

          await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);

          // Exponer en global para reutilizar en endpoints API
          global.redisPubClient = redisPubClient;
        }

        instance.adapter(createAdapter(redisPubClient, redisSubClient));

        // Suscribirse a canal de desconexión Shelly para cerrar WebSockets en todos los workers
        await redisSubClient.subscribe('shelly:disconnect', async (raw) => {
          try {
            const { credentialId } = JSON.parse(raw);
            if (credentialId) {
              console.log(`[Redis] ▶ shelly:disconnect ${credentialId}`);
              await shellyWebSocketManager.disconnectCredential(credentialId);
            }
          } catch (subErr) {
            console.error('Error procesando mensaje shelly:disconnect:', subErr);
          }
        });

        console.log('✅ Redis adapter para Socket.IO inicializado');

      } catch (adapterErr) {
        console.error('❌ Error inicializando Redis adapter:', adapterErr);
      }
    })(io);

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`🔗 Cliente conectado: ${socket.id}`);

      // Unirse a room por systemId
      socket.on('join-system', async (systemId) => {
        console.log(`🎯 [JOIN-SYSTEM] Petición recibida desde ${socket.id} para systemId: ${systemId}`);
        
        if (!systemId) {
          console.log(`❌ [JOIN-SYSTEM] Sin systemId desde ${socket.id}`);
          return;
        }
        
        console.log(`🎯 [JOIN-SYSTEM] Uniendo socket ${socket.id} al room ${systemId}...`);
        socket.join(systemId);
        
        // Almacenar conexión
        if (!systemConnections.has(systemId)) {
          console.log(`🎯 [JOIN-SYSTEM] Creando nuevo Set para systemId ${systemId}`);
          systemConnections.set(systemId, new Set());
        }
        systemConnections.get(systemId).add(socket.id);
        
        const totalClients = systemConnections.get(systemId).size;
        console.log(`✅ [JOIN-SYSTEM] Cliente ${socket.id} se unió al sistema ${systemId}. Total en sistema: ${totalClients}`);
        
        // Debug: Mostrar todos los systemConnections activos
        console.log(`🔍 [JOIN-SYSTEM] Estado actual de systemConnections:`);
        for (const [sysId, connections] of systemConnections.entries()) {
          console.log(`  - Sistema ${sysId}: ${connections.size} clientes`);
        }
        
        // Registrar conexión en WebSocketConnection
        try {
        await registerWebSocketConnection(systemId, socket.id, 'connected');
          console.log(`✅ [JOIN-SYSTEM] Conexión registrada en BD para ${socket.id}`);
        } catch (error) {
          console.error(`❌ [JOIN-SYSTEM] Error registrando en BD:`, error);
        }
        
        // Enviar estado de conexión
        socket.emit('connection-status', {
          connected: true,
          systemId,
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
        
        console.log(`✅ [JOIN-SYSTEM] Proceso completado para ${socket.id} en sistema ${systemId}`);
      });

      // 🆕 HANDLER CRÍTICO: Redistribuir eventos desde backend local a clientes frontend
      socket.on('broadcast-to-system', (data) => {
        const { systemId, eventName, data: eventData } = data;
        
        console.log(`🔍 [BROADCAST] Handler recibido:`, {
          systemId,
          eventName,
          eventData,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        
        if (!systemId || !eventName || !eventData) {
          console.warn(`❌ [BROADCAST] Datos incompletos recibidos:`, data);
          return;
        }
        
        const clientsCount = systemConnections.get(systemId)?.size || 0;
        console.log(`📡 [BROADCAST] Redistribuyendo '${eventName}' a ${clientsCount} clientes del sistema ${systemId}`);
        console.log(`📡 [BROADCAST] Datos completos a redistribuir:`, eventData);
        
        // Redistribuir evento a todos los clientes del sistema
        io.to(systemId).emit(eventName, eventData);
        
        console.log(`✅ [BROADCAST] Evento '${eventName}' redistribuido exitosamente a room '${systemId}'`);
        console.log(`✅ [BROADCAST] Clientes en room '${systemId}':`, Array.from(systemConnections.get(systemId) || []));
      });

      // Manejo de mensaje de test
      socket.on('test-message', (data) => {
        console.log(`🧪 Test message recibido de ${socket.id}:`, data);
        socket.emit('test-response', { 
          received: true, 
          timestamp: Date.now(),
          originalData: data 
        });
      });

      // Solicitar actualización de dispositivo específico
      socket.on('request-device-update', async (deviceId) => {
        try {
          const device = await prisma.smartPlugDevice.findUnique({
            where: { id: deviceId },
            include: { credential: true }
          });

          if (device && device.credential) {
            await updateSingleDevice(device, socket);
          }
        } catch (error) {
          console.error(`Error actualizando dispositivo ${deviceId}:`, error);
          socket.emit('device-error', { deviceId, error: error.message });
        }
      });

      socket.on('disconnect', async () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
        
        // Actualizar estado en WebSocketConnection
        await updateWebSocketConnection(socket.id, 'disconnected');
        
        // Limpiar de todas las conexiones
        for (const [systemId, connections] of systemConnections.entries()) {
          connections.delete(socket.id);
          if (connections.size === 0) {
            systemConnections.delete(systemId);
          }
        }
      });
    });

    // Función para broadcast de actualizaciones
    global.broadcastDeviceUpdate = (systemId, deviceUpdate) => {
      if (io && systemConnections.has(systemId)) {
        emitToSystem(systemId, 'device-update', deviceUpdate);
        console.log(`📤 Enviado update del dispositivo ${deviceUpdate.deviceId} al sistema ${systemId}`);
      }
    };

    /**
     * 🌐 FORCE SOCKET DISCONNECT (solo para conexiones locales SOCKET_IO)
     * --------------------------------------------------------------
     * Permite a otros endpoints (p.ej. /api/websocket/[id]/stop) forzar
     * el cierre de un socket concreto usando su socket.id.
     */
    global.forceSocketDisconnect = (socketId) => {
      try {
        // Con adapter Redis, esto desconecta en TODOS los procesos
        io.in(socketId).disconnectSockets(true);
        return true;
      } catch (err) {
        console.error('❌ [FORCE_DISCONNECT] Error desconectando socket (adapter):', err);
        return false;
      }
    };

    // 🆕 Función para broadcast de cambios de asignación
    global.broadcastAssignmentUpdate = (systemId, assignmentUpdate) => {
      if (io && systemConnections.has(systemId)) {
        emitToSystem(systemId, 'smart-plug-assignment-updated', assignmentUpdate);
        console.log(`📤 [Assignment] Enviado cambio de asignación al sistema ${systemId}:`, assignmentUpdate);
      }
    };

    // 🌐 Inicializar cliente remoto
    console.log('🌐 Inicializando cliente remoto...');
    initializeRemoteClient();
    
    // Inicializar WebSocket Manager
    console.log('🚀 Iniciando WebSocket Manager para tiempo real...');
    initializeWebSocketManager();
  }
  
  res.end();
}

// 🆕 Nueva función para inicializar WebSocket real con Shelly
async function initializeWebSocketConnections(io) {
  try {
    console.log('🔌 Inicializando conexiones WebSocket con Shelly...');
    
    // Obtener todas las credenciales (primero todas, luego filtrar)
    const allCredentials = await prisma.shellyCredential.findMany({
      include: {
        smartPlugs: {
          where: { excludeFromSync: false }
        }
      }
    });
    
    console.log(`📊 Total credenciales en BD: ${allCredentials.length}`);
    allCredentials.forEach(cred => {
      console.log(`  - ${cred.name}: status=${cred.status}, dispositivos=${cred.smartPlugs.length}`);
    });
    
    // Filtrar credenciales ACTIVAS y con autoReconnect habilitado (o sin registro previo)
    const credentials = [];
    const skippedCreds = [];
    for (const cred of allCredentials) {
      if (cred.status !== 'connected') { skippedCreds.push(cred); continue; }

      // Buscar registro WebSocketConnection para esta credencial
      const existingConn = await prisma.webSocketConnection.findFirst({
        where: {
          type: 'SHELLY',
          referenceId: cred.id
        },
        select: { autoReconnect: true, status: true }
      });

      // Si existe y autoReconnect === false ⇒ NO reconectar
      if (existingConn && existingConn.autoReconnect === false) {
        console.log(`⏸️  Omitiendo reconexión de ${cred.name} (autoReconnect deshabilitado)`);
        skippedCreds.push(cred);
        continue;
      }

      credentials.push(cred);
    }

    console.log(`📋 Credenciales a conectar (respeta autoReconnect): ${credentials.length}`);

    // ---- MARCAR OFFLINE DISPOSITIVOS DE CREDENCIALES OMITIDAS ----
    if (skippedCreds.length > 0) {
      console.log(`🟥 Marcando offline dispositivos de ${skippedCreds.length} credenciales omitidas`);
      for (const cred of skippedCreds) {
        try {
          await prisma.smartPlugDevice.updateMany({
            where: { credentialId: cred.id },
            data: {
              online: false,
              relayOn: false,
              currentPower: 0,
              updatedAt: new Date(),
              lastSeenAt: new Date()
            }
          });

          // Obtener IDs para broadcast
          const devices = await prisma.smartPlugDevice.findMany({
            where: { credentialId: cred.id },
            select: { id: true, deviceId: true }
          });

          devices.forEach(dev => {
            const payload = {
              deviceId: dev.id,
              shellyDeviceId: dev.deviceId,
              online: false,
              relayOn: false,
              currentPower: 0,
              voltage: null,
              temperature: null,
              timestamp: Date.now(),
              reason: 'startup_ws_inactive'
            };
            if (global.broadcastDeviceUpdate) {
              global.broadcastDeviceUpdate(cred.systemId, payload);
            }
          });

        } catch (skipErr) {
          console.error(`⚠️  Error marcando offline dispositivos de ${cred.name}:`, skipErr);
        }
      }
    }

    // Verificar que el WebSocket Manager esté disponible
    if (!shellyWebSocketManager) {
      console.error('❌ shellyWebSocketManager no está disponible');
      throw new Error('WebSocket Manager no disponible');
    }
    
    console.log('✅ WebSocket Manager disponible, iniciando conexiones...');
    
    // Conectar cada credencial al WebSocket Manager
    for (const credential of credentials) {
      try {
        console.log(`🔗 Conectando WebSocket para credencial: ${credential.name}`);
        await shellyWebSocketManager.connectCredential(credential.id);
        
        // Registrar en tabla WebSocketConnection
        await registerShellyWebSocketConnection(credential.id, 'connected');
        
      } catch (error) {
        console.error(`❌ Error conectando WebSocket para ${credential.name}:`, error);
        await registerShellyWebSocketConnection(credential.id, 'error', error.message);
      }
    }

    // Configurar interceptor para actualizaciones de dispositivos
    setupDeviceUpdateInterceptor(io);
    
    console.log('✅ WebSocket Manager inicializado correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando WebSocket Manager:', error);
    
    // Fallback a polling si WebSocket falla
    console.log('🔄 Fallback: Iniciando polling como respaldo...');
    startDeviceMonitoring(io);
  }
}

// 🆕 Función para registrar conexiones WebSocket de Shelly
async function registerShellyWebSocketConnection(credentialId, status, errorMessage = null) {
  try {
    // Obtener información de la credencial para nombres descriptivos
    const credential = await prisma.shellyCredential.findUnique({
      where: { id: credentialId }
    });

    if (!credential) {
      console.error(`❌ No se encontró credencial ${credentialId}`);
      return;
    }

    const existing = await prisma.webSocketConnection.findFirst({
      where: {
        type: 'SHELLY',
        referenceId: credentialId,
        systemId: credential.systemId
      }
    });

    if (existing) {
      await prisma.webSocketConnection.update({
        where: { id: existing.id },
        data: {
          status,
          errorMessage,
          lastPingAt: status === 'connected' ? new Date() : undefined,
          updatedAt: new Date(),
          metadata: {
            ...existing.metadata,
            lastStatusUpdate: new Date().toISOString()
          }
        }
      });
    } else {
      const connection = await prisma.webSocketConnection.create({
        data: {
          type: 'SHELLY',
          referenceId: credentialId,
          systemId: credential.systemId, // 🆔 AÑADIR systemId obligatorio
          status,
          errorMessage,
          lastPingAt: status === 'connected' ? new Date() : undefined,
          metadata: {
            credentialId,
            credentialName: credential?.name || 'Credencial desconocida',
            connectionType: 'websocket_native',
            purpose: 'real_time_monitoring',
            alias: `Shelly ${credential?.name || credentialId.substring(0, 8)}`,
            description: `WebSocket nativo para monitoreo en tiempo real de dispositivos Shelly (${credential?.email || 'email desconocido'})`
          }
        }
      });
    }
    
    // Crear log del evento
    const connectionId = existing?.id || (await prisma.webSocketConnection.findFirst({
      where: { type: 'SHELLY', referenceId: credentialId, systemId: credential.systemId }
    }))?.id;
    
    await createWebSocketLog(connectionId, status === 'connected' ? 'connect' : 'error', 
      `WebSocket Shelly ${status} para credencial ${credential?.name || credentialId}`, errorMessage, null, credential.systemId);
    
  } catch (error) {
    console.error('Error registrando conexión WebSocket Shelly:', error);
  }
}

// 🆕 Interceptor para actualizaciones de dispositivos desde WebSocket
function setupDeviceUpdateInterceptor(io) {
  // Configurar callback para actualizaciones de dispositivos
  shellyWebSocketManager.onDeviceUpdate = async (credentialId, deviceId, status) => {
    console.log(`🎯 [SOCKET.JS] onDeviceUpdate CALLBACK EJECUTADO para deviceId=${deviceId}, credentialId=${credentialId}`);
    try {
      console.log(`📡 [SOCKET.JS] Recibido update de dispositivo ${deviceId}:`, status);
      wsLogger.verbose(`📡 Recibido update de dispositivo ${deviceId}:`, status);
      
      // Obtener información del dispositivo y sistema
      let device = await prisma.smartPlugDevice.findFirst({
        where: {
          credentialId,
          OR: [
            { deviceId: deviceId },
            { cloudId: deviceId }
          ]
        },
        include: {
          credential: true,
          equipmentClinicAssignment: {
            include: {
              equipment: true
            }
          }
        }
      });

      // Fallback global si no se encontró
      if (!device) {
        device = await prisma.smartPlugDevice.findFirst({
          where: {
            OR: [
              { deviceId: deviceId },
              { cloudId: deviceId }
            ]
          },
          include: { credential: true }
        });
      }
      
      if (device && device.credential) {
        // Extraer datos del status
        const currentPower = status['switch:0']?.apower !== undefined ? status['switch:0'].apower : device.currentPower;
        const relayOn = status['switch:0']?.output !== undefined ? status['switch:0'].output : device.relayOn;
        const voltage = status['switch:0']?.voltage !== undefined ? status['switch:0'].voltage : device.voltage;
        const temperature = status.temperature !== undefined ? status.temperature : device.temperature;
        const isOnline = status.online;
        
        // 🎯 PROCESAR ACTUALIZACIONES DE APPOINTMENT_DEVICE_USAGE EN TIEMPO REAL
        console.log(`🎯 [SOCKET.JS] Procesando appointment device usage para ${device.name}...`);
        try {
        await processAppointmentDeviceUsageUpdate(device, {
          currentPower,
          relayOn,
          voltage,
          temperature,
          isOnline,
          timestamp: new Date()
        });
          console.log(`✅ [SOCKET.JS] processAppointmentDeviceUsageUpdate completado para ${device.name}`);
        } catch (appointmentError) {
          console.error(`❌ [SOCKET.JS] Error en processAppointmentDeviceUsageUpdate para ${device.name}:`, appointmentError);
          // Continuar con la emisión aunque falle el appointment processing
        }
        
        // Crear update para Socket.io
        console.log(`🎯 [SOCKET.JS] Creando update para Socket.io para ${device.name}...`);
        const update = {
          deviceId: device.id,  // ID interno para identificar en frontend
          shellyDeviceId: device.deviceId,  // deviceId de Shelly para comandos
          online: isOnline,
          relayOn: relayOn,
          currentPower: currentPower,
          voltage: voltage,
          temperature: temperature,
          timestamp: Date.now()
        };
        
        console.log(`🎯 [SOCKET.JS] Update creado:`, update);
        
        // Broadcast a clientes conectados (local + remoto)
        const connectionsCount = systemConnections.get(device.credential.systemId)?.size || 0;
        console.log(`📤 [SOCKET.JS] Enviando WebSocket update para ${device.name} a ${connectionsCount} clientes locales del sistema ${device.credential.systemId}`);
        
        emitToSystem(device.credential.systemId, 'device-update', update);
        console.log(`✅ [SOCKET.JS] device-update EMITIDO para ${device.name} al sistema ${device.credential.systemId}`);
        wsLogger.verbose(`📤 Update enviado a ${connectionsCount} clientes del sistema ${device.credential.systemId}`);
        
        // Crear log del evento (MEJORADO)
        const shellyConnection = await prisma.webSocketConnection.findFirst({
          where: {
            type: 'SHELLY',
            referenceId: credentialId,
            systemId: device.credential.systemId
          }
        });
        
        if (shellyConnection) {
          await createWebSocketLog(
            shellyConnection.id, 
            'message', 
            `Update recibido para dispositivo ${device.name}: ${update.relayOn ? 'ON' : 'OFF'} (${update.currentPower}W)`,
            null,
            { 
              deviceId, 
              deviceName: device.name,
              status: update,
              messageType: 'device_status_update'
            },
            device.credential.systemId // 🆔 AÑADIR systemId
          );
          wsLogger.verbose(`📝 Log creado para update de ${device.name}`);
        } else {
          console.warn(`⚠️ No se encontró conexión Shelly para credencial ${credentialId}`);
        }
      } else {
        console.warn(`⚠️ No se encontró dispositivo ${deviceId} para credencial ${credentialId}`);
      }
      
    } catch (error) {
      console.error('Error en interceptor de updates:', error);
    }
  };
  
  console.log('🎯 Interceptor de updates configurado correctamente');
  
  // 🆕 CONFIGURAR OFFLINE MANAGER PARA SOCKET.IO
  setupOfflineManagerIntegration(io);
}

// 🆕 Función para integrar Offline Manager con Socket.io
function setupOfflineManagerIntegration(io) {
  console.log('🎯 Configurando integración con Device Offline Manager...');
  
  // Suscribirse a cambios offline/online del manager centralizado
  deviceOfflineManager.subscribe(async (updates) => {
    try {
      wsLogger.verbose(`📡 [OfflineManager] Recibidos ${updates.length} cambios offline:`, updates);
      
      for (const update of updates) {
        if (update.deviceId === 'ALL') {
          // Cambio masivo - afecta a todos los dispositivos
          wsLogger.verbose(`🌐 [OfflineManager] Cambio masivo: todos ${update.online ? 'ONLINE' : 'OFFLINE'} (${update.reason})`);
          
          // Obtener todos los dispositivos para enviar updates masivos
          const allDevices = await prisma.smartPlugDevice.findMany({
            include: { credential: true }
          });
          
          // Si necesita actualizar BD (solo timeouts específicos)
          if (update.updateBD) {
            wsLogger.verbose(`💾 [OfflineManager] Actualizando BD masivamente: ${allDevices.length} dispositivos`);
            
            await prisma.smartPlugDevice.updateMany({
              data: {
                online: update.online,
                relayOn: update.online ? undefined : false, // Solo tocar relayOn si va offline
                currentPower: update.online ? undefined : 0,
                lastSeenAt: new Date()
              }
            });
          }
          
          // Enviar updates a clientes por systemId
          const systemGroups = new Map();
          allDevices.forEach(device => {
            if (device.credential?.systemId) {
              if (!systemGroups.has(device.credential.systemId)) {
                systemGroups.set(device.credential.systemId, []);
              }
              systemGroups.get(device.credential.systemId).push(device);
            }
          });
          
          systemGroups.forEach((devices, systemId) => {
            devices.forEach(device => {
              const socketUpdate = {
                deviceId: device.id,
                shellyDeviceId: device.deviceId,
                online: update.online,
                relayOn: update.online ? device.relayOn : false,
                currentPower: update.online ? device.currentPower : 0,
                voltage: update.online ? device.voltage : null,
                temperature: update.online ? device.temperature : null,
                timestamp: update.timestamp,
                reason: update.reason
              };
              
              emitToSystem(systemId, 'device-offline-status', socketUpdate);
            });
            
            wsLogger.verbose(`📤 [OfflineManager] Enviado update masivo a ${devices.length} dispositivos del sistema ${systemId}`);
          });

          // 🧹 Tras reconexión, verificar dispositivos que sigan marcados online pero sin mensajes
          if (update.reason === 'websocket_reconnected') {
            await checkAndMarkStaleDevices('reconnected_stale');
          }
          
        } else {
          // Cambio específico de dispositivo
          const device = await prisma.smartPlugDevice.findUnique({
            where: { id: update.deviceId },
            include: { credential: true }
          });
          
          if (device && device.credential) {
            wsLogger.verbose(`📱 [OfflineManager] Dispositivo específico ${update.online ? 'ONLINE' : 'OFFLINE'}: ${update.deviceName || device.name} (${update.reason})`);
            
            // Actualizar BD si es necesario
            if (update.updateBD) {
              wsLogger.verbose(`💾 [OfflineManager] Actualizando BD: ${device.name} → ${update.online ? 'online' : 'offline'}`);
              
              // Preparar datos para actualizar
              const updateData = {
                online: update.online,
                lastSeenAt: new Date()
              };
              
              // Si hay datos adicionales del dispositivo (desde WebSocket), usarlos
              if (update.deviceData && update.online) {
                if (update.deviceData.relayOn !== undefined) updateData.relayOn = update.deviceData.relayOn;
                if (update.deviceData.currentPower !== undefined) updateData.currentPower = update.deviceData.currentPower;
                if (update.deviceData.voltage !== undefined) updateData.voltage = update.deviceData.voltage;
                if (update.deviceData.temperature !== undefined) updateData.temperature = update.deviceData.temperature;
                if (update.deviceData.totalEnergy !== undefined) updateData.totalEnergy = update.deviceData.totalEnergy;
                if (update.deviceData.cloudId !== undefined) updateData.cloudId = update.deviceData.cloudId;
              } else if (!update.online) {
                // Si va offline, resetear valores
                updateData.relayOn = false;
                updateData.currentPower = 0;
              }
              
              await prisma.smartPlugDevice.update({
                where: { id: device.id },
                data: updateData
              });
            }
            
            // Enviar update específico con datos actualizados
            const socketUpdate = {
              deviceId: device.id,
              shellyDeviceId: device.deviceId,
              online: update.online,
              relayOn: update.online && update.deviceData?.relayOn !== undefined ? update.deviceData.relayOn : (update.online ? device.relayOn : false),
              currentPower: update.online && update.deviceData?.currentPower !== undefined ? update.deviceData.currentPower : (update.online ? device.currentPower : 0),
              voltage: update.online && update.deviceData?.voltage !== undefined ? update.deviceData.voltage : (update.online ? device.voltage : null),
              temperature: update.online && update.deviceData?.temperature !== undefined ? update.deviceData.temperature : (update.online ? device.temperature : null),
              timestamp: update.timestamp,
              reason: update.reason
            };
            
            // 🚨 DEBUG TEMPORAL: Ver exactamente qué se envía (SILENCIADO)
            // console.log('🚨 [DEBUG SOCKET.IO] Enviando device-offline-status:', {
            //   evento: 'device-offline-status',
            //   room: device.credential.systemId,
            //   deviceName: device.name,
            //   socketUpdate
            // });
            
            emitToSystem(device.credential.systemId, 'device-offline-status', socketUpdate);
            wsLogger.verbose(`📤 [OfflineManager] Update específico enviado para ${device.name}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ [OfflineManager] Error procesando cambios offline:', error);
    }
  });
  
  console.log('✅ Device Offline Manager integrado con Socket.io');
}

// Función para registrar conexión WebSocket
async function registerWebSocketConnection(systemId, socketId, status) {
  try {
    // 1. Marcar todas las conexiones anteriores del mismo sistema como obsoletas
    await prisma.webSocketConnection.updateMany({
      where: {
        type: 'SOCKET_IO',
        referenceId: systemId,
        systemId: systemId, // 🛡️ CRUCIAL: Filtrar por systemId para multi-tenancy
        status: 'connected'
      },
      data: {
        status: 'disconnected',
        errorMessage: 'Reemplazada por nueva conexión',
        updatedAt: new Date()
      }
    });

    // 2. Usar upsert en lugar de create para evitar duplicados
    const connectionData = {
      type: 'SOCKET_IO',
      referenceId: systemId,
      status,
      lastPingAt: new Date(),
      metadata: {
        socketId,
        clientType: 'frontend',
        purpose: 'device_monitoring',
        alias: `Cliente Web ${socketId.substring(0, 8)}`,
        description: `Conexión Socket.io desde cliente web para sistema ${systemId}`
      }
    };

    const connection = await prisma.webSocketConnection.upsert({
      where: {
        unique_websocket_per_reference_system: {
          type: 'SOCKET_IO',
          referenceId: systemId,
          systemId: systemId
        }
      },
      update: {
        status,
        lastPingAt: new Date(),
        errorMessage: null,
        metadata: connectionData.metadata,
        updatedAt: new Date()
      },
      create: {
        ...connectionData,
        systemId: systemId
      }
    });
    
    // Crear log de conexión
    await createWebSocketLog(connection.id, 'connect', `Cliente ${socketId} conectado al sistema ${systemId}`, null, null, systemId);
    
    console.log(`📝 Registrada conexión WebSocket: ${connection.id} para sistema ${systemId}`);
    return connection.id;
  } catch (error) {
    console.error('Error registrando conexión WebSocket:', error);
    return null;
  }
}

// Función para actualizar conexión WebSocket
async function updateWebSocketConnection(socketId, status, errorMessage = null) {
  try {
    // Buscar la conexión por socketId en metadata
    const connection = await prisma.webSocketConnection.findFirst({
      where: {
        type: 'SOCKET_IO',
        metadata: {
          path: ['socketId'],
          equals: socketId
        }
      }
    });

    if (connection) {
      await prisma.webSocketConnection.update({
        where: { id: connection.id },
        data: {
          status,
          errorMessage,
          lastPingAt: status === 'connected' ? new Date() : undefined,
          updatedAt: new Date()
        }
      });
      
      // Crear log del evento
      const eventType = status === 'disconnected' ? 'disconnect' : status === 'error' ? 'error' : 'ping';
      const message = status === 'disconnected' 
        ? `Cliente ${socketId} desconectado`
        : status === 'error' 
          ? `Error en cliente ${socketId}: ${errorMessage}`
          : `Ping de cliente ${socketId}`;
      
      await createWebSocketLog(connection.id, eventType, message, errorMessage, null, connection.systemId);
    }
    
  } catch (error) {
    console.error('Error actualizando conexión WebSocket:', error);
  }
}

// Función para crear logs de WebSocket
async function createWebSocketLog(connectionId, eventType, message, errorDetails = null, metadata = null, systemId = null) {
  try {
    // Verificar que connectionId sea válido
    if (!connectionId) {
      console.warn('⚠️ createWebSocketLog: connectionId es null o undefined');
      return;
    }

    // Si no se proporciona systemId, intentar obtenerlo de la conexión
    let logSystemId = systemId;
    if (!logSystemId) {
      try {
        const connection = await prisma.webSocketConnection.findUnique({
          where: { id: connectionId },
          select: { systemId: true }
        });
        logSystemId = connection?.systemId;
      } catch (connError) {
        console.warn('⚠️ No se pudo obtener systemId de la conexión:', connError);
      }
    }

    // Si aún no tenemos systemId, usar un valor por defecto
    if (!logSystemId) {
      logSystemId = 'cmcnvo5an0006y2hyyjx951fi'; // Default systemId para backward compatibility
      console.warn('⚠️ Usando systemId por defecto para WebSocketLog');
    }

    /**
     * 🔧 FILTRO DE LOGGING
     * ------------------------------------------------------------
     * Antes de registrar un log verificamos `loggingEnabled` en la
     * tabla `WebSocketConnection`. Si el usuario ha deshabilitado el
     * logging mediante el switch de UI, simplemente abortamos sin
     * insertar.  Se usa wsLogger.debug para evitar ruido en consola
     * en producción.  Si por algún motivo el campo no existe todavía
     * (migración pendiente) continuamos como fallback conservador.
     */
    try {
      const conn = await prisma.webSocketConnection.findUnique({
        where: { id: connectionId },
        select: { loggingEnabled: true }
      });
      if (conn && conn.loggingEnabled === false) {
        wsLogger.debug(`[LOGGING] omitido (disabled) conexión=${connectionId}, tipo=${eventType}`);
        return;
      }
    } catch (logCheckErr) {
      wsLogger.debug(`[LOGGING] verificación loggingEnabled falló, fallback ON:`, logCheckErr);
    }

    await prisma.webSocketLog.create({
      data: {
        connectionId,
        systemId: logSystemId,
        eventType,
        message,
        errorDetails,
        metadata,
        createdAt: new Date()
      }
    });
    
    wsLogger.verbose(`📝 Log creado: ${eventType} - ${message}`);
  } catch (error) {
    console.error('Error creando log WebSocket:', error);
    // No lanzar error para no romper el flujo principal
  }
}

// Función helper para actualizar un solo dispositivo (fallback HTTP)
async function updateSingleDevice(device, socket) {
  try {
    // Desencriptar el access token
    let accessToken;
    try {
      accessToken = decrypt(device.credential.accessToken);
    } catch (error) {
      console.error(`❌ Error desencriptando token para ${device.name}:`, error);
      return;
    }

    // Obtener estado actual del dispositivo
    let response = await fetch(`${device.credential.apiHost}/device/status?id=${device.deviceId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      signal: AbortSignal.timeout(5000)
    });

    // Si hay error 401, intentar refrescar token
    if (response.status === 401) {
      console.log(`🔄 Token expirado para ${device.name}, intentando refrescar...`);
      
      try {
        const refreshToken = decrypt(device.credential.refreshToken);
        const newTokens = await refreshShellyToken(device.credential.apiHost, refreshToken);
        
        // Actualizar tokens en la base de datos
        await prisma.shellyCredential.update({
          where: { id: device.credential.id },
          data: {
            accessToken: encrypt(newTokens.access_token),
            refreshToken: encrypt(newTokens.refresh_token),
            status: 'connected'
          }
        });
        
        // Reintentar con el nuevo token
        accessToken = newTokens.access_token;
        response = await fetch(`${device.credential.apiHost}/device/status?id=${device.deviceId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          signal: AbortSignal.timeout(5000)
        });
        
      } catch (refreshError) {
        console.error(`❌ Error refrescando token para ${device.name}:`, refreshError);
        // Marcar credencial como expirada
        await prisma.shellyCredential.update({
          where: { id: device.credential.id },
          data: { status: 'expired' }
        });
        return;
      }
    }

    if (response.ok) {
      const status = await response.json();
      
      const update = {
        deviceId: device.id,
        online: status.data?.online || false,
        relayOn: status.data?.device_status?.['switch:0']?.output || 
                status.data?.device_status?.relays?.[0]?.ison || null,
        currentPower: status.data?.device_status?.['switch:0']?.apower || 
                     status.data?.device_status?.meters?.[0]?.power || null,
        voltage: status.data?.device_status?.['switch:0']?.voltage || null,
        temperature: status.data?.device_status?.temperature || null,
        timestamp: Date.now()
      };

      // Actualizar base de datos
      await prisma.smartPlugDevice.update({
        where: { id: device.id },
        data: {
          online: update.online,
          relayOn: update.relayOn,
          currentPower: update.currentPower,
          voltage: update.voltage,
          temperature: update.temperature,
          lastSeenAt: new Date()
        }
      });

      // Enviar actualización al cliente
      socket.emit('device-update', update);
    } else {
      console.log(`❌ Error HTTP ${response.status} para dispositivo ${device.name}`);
    }
  } catch (error) {
    console.error(`⚠️ Error actualizando ${device.name}:`, error.message);
  }
}

// 🔄 FALLBACK: Función de monitoreo con polling (solo si WebSocket falla)
async function startDeviceMonitoring(io) {
  console.log('🔄 Iniciando monitoreo con polling (fallback)...');
  
  // Ejecutar inmediatamente el primer ciclo
  await executeMonitoringCycle(io);
  
  // Luego ejecutar cada 60 segundos (solo como fallback)
  setInterval(async () => {
    await executeMonitoringCycle(io);
  }, 60000); // 60 segundos
}

async function executeMonitoringCycle(io) {
  try {
    console.log('⏰ Ejecutando ciclo de monitoreo (fallback)...');
    
    const credentials = await prisma.shellyCredential.findMany({
      where: { status: 'connected' },
      include: {
        smartPlugs: {
          where: { excludeFromSync: false }
        }
      }
    });

    console.log(`📋 Encontradas ${credentials.length} credenciales conectadas`);

    for (const credential of credentials) {
      console.log(`🔑 Procesando credencial: ${credential.name} con ${credential.smartPlugs.length} dispositivos`);
      
      // Desencriptar el access token
      let accessToken;
      try {
        accessToken = decrypt(credential.accessToken);
      } catch (error) {
        console.error(`❌ Error desencriptando token para credencial ${credential.name}:`, error);
        // Marcar credencial como error
        await prisma.shellyCredential.update({
          where: { id: credential.id },
          data: { status: 'error' }
        });
        continue;
      }
      
      // Procesar dispositivos con delay para evitar rate limiting
      for (let i = 0; i < credential.smartPlugs.length; i++) {
        const device = credential.smartPlugs[i];
        
        try {
          console.log(`🔌 Verificando dispositivo: ${device.name} (${device.deviceId}) [${i + 1}/${credential.smartPlugs.length}]`);
          
          let response = await fetch(`${credential.apiHost}/device/status?id=${device.deviceId}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            signal: AbortSignal.timeout(5000)
          });

          if (response.status === 401) {
            console.log(`🔄 Token expirado para ${device.name}, intentando refrescar...`);
            
            try {
              const refreshToken = decrypt(credential.refreshToken);
              const newTokens = await refreshShellyToken(credential.apiHost, refreshToken);
              
              // Actualizar tokens en la base de datos
              await prisma.shellyCredential.update({
                where: { id: credential.id },
                data: {
                  accessToken: encrypt(newTokens.access_token),
                  refreshToken: encrypt(newTokens.refresh_token),
                  status: 'connected'
                }
              });
              
              // Reintentar con el nuevo token
              accessToken = newTokens.access_token;
              response = await fetch(`${credential.apiHost}/device/status?id=${device.deviceId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                },
                signal: AbortSignal.timeout(5000)
              });
              
            } catch (refreshError) {
              console.error(`❌ Error refrescando token para ${device.name}:`, refreshError);
              // Marcar credencial como expirada
              await prisma.shellyCredential.update({
                where: { id: credential.id },
                data: { status: 'expired' }
              });
              continue;
            }
          }

          if (response.ok) {
            const status = await response.json();
            
            const update = {
              deviceId: device.id,
              online: status.data?.online || false,
              relayOn: status.data?.device_status?.['switch:0']?.output || 
                      status.data?.device_status?.relays?.[0]?.ison || null,
              currentPower: status.data?.device_status?.['switch:0']?.apower || 
                           status.data?.device_status?.meters?.[0]?.power || null,
              voltage: status.data?.device_status?.['switch:0']?.voltage || null,
              temperature: status.data?.device_status?.temperature || null,
              timestamp: Date.now()
            };

            // Actualizar base de datos
            await prisma.smartPlugDevice.update({
              where: { id: device.id },
              data: {
                online: update.online,
                relayOn: update.relayOn,
                currentPower: update.currentPower,
                voltage: update.voltage,
                temperature: update.temperature,
                lastSeenAt: new Date()
              }
            });

            // Enviar actualización al cliente
            const socket = io.sockets.sockets.get(device.credential.systemId); // Encontrar el socket por systemId
            if (socket) {
              socket.emit('device-update', update);
            } else {
              console.warn(`⚠️ No se encontró socket para systemId ${device.credential.systemId}`);
            }
          } else {
            console.log(`❌ Error HTTP ${response.status} para dispositivo ${device.name}`);
          }
        } catch (error) {
          console.error(`⚠️ Error actualizando ${device.name}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en ciclo de monitoreo con polling:', error);
  }
}