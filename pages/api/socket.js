import { Server } from 'socket.io';
import { prisma } from '../../lib/db';
import { decrypt, encrypt } from '../../lib/shelly/crypto.ts';
import { refreshShellyToken } from '../../lib/shelly/client.ts';
import { shellyWebSocketManager } from '../../lib/shelly/websocket-manager.ts';
import { wsLogger } from '../../lib/utils/websocket-logger.js';
import { deviceOfflineManager } from '../../lib/shelly/device-offline-manager.ts';

// Almacenar conexiones por systemId
const systemConnections = new Map();

// Helper para delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('🔌 Configurando servidor Socket.io...');
    
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`🔗 Cliente conectado: ${socket.id}`);

      // Unirse a room por systemId
      socket.on('join-system', async (systemId) => {
        if (!systemId) {
          console.log(`❌ join-system sin systemId desde ${socket.id}`);
          return;
        }
        
        socket.join(systemId);
        
        // Almacenar conexión
        if (!systemConnections.has(systemId)) {
          systemConnections.set(systemId, new Set());
        }
        systemConnections.get(systemId).add(socket.id);
        
        console.log(`📡 Cliente ${socket.id} se unió al sistema ${systemId}. Total en sistema: ${systemConnections.get(systemId).size}`);
        
        // Registrar conexión en WebSocketConnection
        await registerWebSocketConnection(systemId, socket.id, 'connected');
        
        // Enviar estado de conexión
        socket.emit('connection-status', {
          connected: true,
          systemId,
          timestamp: new Date().toISOString(),
          socketId: socket.id
        });
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
        io.to(systemId).emit('device-update', deviceUpdate);
        console.log(`📤 Enviado update del dispositivo ${deviceUpdate.deviceId} al sistema ${systemId}`);
      }
    };

    // 🚀 CAMBIO PRINCIPAL: Inicializar WebSocket Manager en lugar de polling
    console.log('🚀 Iniciando WebSocket Manager para tiempo real...');
    
    // Ejecutar con un pequeño delay para asegurar que Socket.io esté listo
    setTimeout(async () => {
      try {
        await initializeWebSocketConnections(io);
      } catch (error) {
        console.error('❌ Error crítico en initializeWebSocketConnections:', error);
      }
    }, 1000);
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
    
    // Filtrar solo las conectadas
    const credentials = allCredentials.filter(cred => cred.status === 'connected');
    console.log(`📋 Credenciales conectadas para WebSocket: ${credentials.length}`);

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

    const existing = await prisma.webSocketConnection.findFirst({
      where: {
        type: 'SHELLY',
        referenceId: credentialId
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
      where: { type: 'SHELLY', referenceId: credentialId }
    }))?.id;
    
    await createWebSocketLog(connectionId, status === 'connected' ? 'connect' : 'error', 
      `WebSocket Shelly ${status} para credencial ${credential?.name || credentialId}`, errorMessage);
    
  } catch (error) {
    console.error('Error registrando conexión WebSocket Shelly:', error);
  }
}

// 🆕 Interceptor para actualizaciones de dispositivos desde WebSocket
function setupDeviceUpdateInterceptor(io) {
  // Configurar callback para actualizaciones de dispositivos
  shellyWebSocketManager.onDeviceUpdate = async (credentialId, deviceId, status) => {
    try {
      wsLogger.verbose(`📡 Recibido update de dispositivo ${deviceId}:`, status);
      
      // Obtener información del dispositivo y sistema
      const device = await prisma.smartPlugDevice.findFirst({
        where: {
          deviceId,
          credentialId
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
      
      if (device && device.credential) {
        // Extraer datos del status
        const currentPower = status['switch:0']?.apower !== undefined ? status['switch:0'].apower : device.currentPower;
        const relayOn = status['switch:0']?.output !== undefined ? status['switch:0'].output : device.relayOn;
        const voltage = status['switch:0']?.voltage !== undefined ? status['switch:0'].voltage : device.voltage;
        const temperature = status.temperature !== undefined ? status.temperature : device.temperature;
        const isOnline = status.online;
        
        // 🎯 PROCESAR ACTUALIZACIONES DE APPOINTMENT_DEVICE_USAGE EN TIEMPO REAL
        await processAppointmentDeviceUsageUpdate(device, {
          currentPower,
          relayOn,
          voltage,
          temperature,
          isOnline,
          timestamp: new Date()
        });
        
        // Crear update para Socket.io
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
        
        // Broadcast a clientes conectados
        const connectionsCount = systemConnections.get(device.credential.systemId)?.size || 0;
        wsLogger.verbose(`📤 Enviando WebSocket update para ${device.name}:`, {
          deviceId: update.deviceId,
          online: update.online,
          relayOn: update.relayOn,
          currentPower: update.currentPower,
          voltage: update.voltage,
          temperature: update.temperature,
          clientesConectados: connectionsCount,
          systemId: device.credential.systemId
        });
        
        io.to(device.credential.systemId).emit('device-update', update);
        wsLogger.verbose(`📤 Update enviado a ${connectionsCount} clientes del sistema ${device.credential.systemId}`);
        
        // Crear log del evento (MEJORADO)
        const shellyConnection = await prisma.webSocketConnection.findFirst({
          where: {
            type: 'SHELLY',
            referenceId: credentialId
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
            }
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
              
              io.to(systemId).emit('device-offline-status', socketUpdate);
            });
            
            wsLogger.verbose(`📤 [OfflineManager] Enviado update masivo a ${devices.length} dispositivos del sistema ${systemId}`);
          });
          
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
            
            io.to(device.credential.systemId).emit('device-offline-status', socketUpdate);
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
        unique_websocket_per_reference: {
          type: 'SOCKET_IO',
          referenceId: systemId
        }
      },
      update: {
        status,
        lastPingAt: new Date(),
        errorMessage: null,
        metadata: connectionData.metadata,
        updatedAt: new Date()
      },
      create: connectionData
    });
    
    // Crear log de conexión
    await createWebSocketLog(connection.id, 'connect', `Cliente ${socketId} conectado al sistema ${systemId}`);
    
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
      
      await createWebSocketLog(connection.id, eventType, message, errorMessage);
    }
    
  } catch (error) {
    console.error('Error actualizando conexión WebSocket:', error);
  }
}

// Función para crear logs de WebSocket
async function createWebSocketLog(connectionId, eventType, message, errorDetails = null, metadata = null) {
  try {
    // Verificar que connectionId sea válido
    if (!connectionId) {
      console.warn('⚠️ createWebSocketLog: connectionId es null o undefined');
      return;
    }

    await prisma.webSocketLog.create({
      data: {
        connectionId,
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

          // Si hay error 429, implementar exponential backoff
          if (response.status === 429) {
            console.log(`⏳ Rate limit detectado para ${device.name}, esperando...`);
            await delay(2000 + (i * 500)); // Delay incremental
            continue; // Saltar este dispositivo en este ciclo
          }

          // Si hay error 401, intentar refrescar token
          if (response.status === 401) {
            console.log(`🔄 Token expirado para credencial ${credential.name}, intentando refrescar...`);
            
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
              console.error(`❌ Error refrescando token para credencial ${credential.name}:`, refreshError);
              // Marcar credencial como expirada
              await prisma.shellyCredential.update({
                where: { id: credential.id },
                data: { status: 'expired' }
              });
              break; // Salir del loop de dispositivos para esta credencial
            }
          }

          if (response.ok) {
            const status = await response.json();
            console.log(`📊 Estado recibido para ${device.name}:`, {
              online: status.data?.online,
              switch0: status.data?.device_status?.['switch:0']?.output,
              relays: status.data?.device_status?.relays?.[0]?.ison,
              power: status.data?.device_status?.['switch:0']?.apower,
              voltage: status.data?.device_status?.['switch:0']?.voltage
            });
            
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

            // Verificar si hay cambios antes de actualizar
            const hasChanges = 
              device.online !== update.online ||
              device.relayOn !== update.relayOn ||
              Math.abs((device.currentPower || 0) - (update.currentPower || 0)) > 0.1 ||
              Math.abs((device.voltage || 0) - (update.voltage || 0)) > 1.0;

            console.log(`🔄 Dispositivo ${device.name} - Cambios detectados: ${hasChanges}`, {
              oldOnline: device.online,
              newOnline: update.online,
              oldRelayOn: device.relayOn,
              newRelayOn: update.relayOn,
              oldPower: device.currentPower,
              newPower: update.currentPower,
              oldVoltage: device.voltage,
              newVoltage: update.voltage
            });

            if (hasChanges) {
              console.log(`💾 Actualizando BD para ${device.name}`);
              
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

              // Broadcast a clientes conectados
              const connectionsCount = systemConnections.get(credential.systemId)?.size || 0;
              console.log(`📤 Enviando update a ${connectionsCount} clientes del sistema ${credential.systemId}`);
              
              io.to(credential.systemId).emit('device-update', update);
            }
          } else {
            console.log(`❌ Error HTTP ${response.status} para dispositivo ${device.name}`);
          }
        } catch (error) {
          // Solo log de errores importantes, no spam
          if (error.code !== 'ECONNREFUSED') {
            console.log(`⚠️ Error actualizando ${device.name}:`, error instanceof Error ? error.message : 'Error desconocido');
          }
        }

        // Delay entre dispositivos para evitar rate limiting (500ms)
        if (i < credential.smartPlugs.length - 1) {
          await delay(500);
        }
      }
      
      // Delay entre credenciales (1 segundo)
      if (credentials.indexOf(credential) < credentials.length - 1) {
        await delay(1000);
      }
    }
    
    console.log('✅ Ciclo de monitoreo completado');
  } catch (error) {
    console.error('❌ Error en monitoreo automático:', error);
  }
}

// 🎯 FUNCIÓN PRINCIPAL: Procesar actualizaciones de AppointmentDeviceUsage en tiempo real
async function processAppointmentDeviceUsageUpdate(device, data) {
  try {
    const { currentPower, relayOn, voltage, temperature, isOnline, timestamp } = data;
    
    // Buscar registros activos para este dispositivo
    const activeUsage = await prisma.appointmentDeviceUsage.findFirst({
      where: {
        deviceId: device.deviceId, // Usar deviceId de Shelly
        currentStatus: { in: ['ACTIVE', 'PAUSED'] },
        endedAt: null
      },
      include: {
        appointment: {
          include: {
            services: {
              include: {
                service: true
              }
            }
          }
        },
        equipmentClinicAssignment: {
          include: {
            equipment: true,
            smartPlugDevice: true
          }
        }
      }
    });

    if (!activeUsage) {
      // No hay uso activo, solo actualizar dispositivo en BD
      await updateDeviceInDatabase(device, data);
      return;
    }

    console.log(`🔄 [REAL_TIME_UPDATE] Procesando ${device.name}:`, {
      usageId: activeUsage.id,
      currentPower,
      relayOn,
      isOnline,
      appointmentId: activeUsage.appointmentId
    });

    // 🔍 VERIFICAR ESTADO OFFLINE
    if (!isOnline) {
      console.log(`📴 [REAL_TIME_UPDATE] Dispositivo offline: ${device.name}`);
      await handleDeviceOffline(activeUsage, timestamp);
      await updateDeviceInDatabase(device, data);
      return;
    }

    // 🔍 VERIFICAR CONSUMO REAL
    const hasRealConsumption = currentPower && currentPower > 0.1;

    if (hasRealConsumption && relayOn) {
      // ✅ HAY CONSUMO REAL - Procesar tiempo de uso
      await processActiveConsumption(activeUsage, data, device);
    } else if (relayOn) {
      // 🟡 ENCENDIDO PERO SIN CONSUMO - Standby
      await processStandbyState(activeUsage, data, device);
    } else {
      // 🔴 APAGADO - Verificar si fue manual o automático
      await processDeviceTurnedOff(activeUsage, data, device);
    }

    // Actualizar siempre el dispositivo en BD
    await updateDeviceInDatabase(device, data);

  } catch (error) {
    console.error(`❌ [REAL_TIME_UPDATE] Error procesando ${device.name}:`, error);
  }
}

// 🟢 Procesar consumo activo real
async function processActiveConsumption(activeUsage, data, device) {
  const { currentPower, voltage, temperature, timestamp } = data;

  try {
    // Obtener datos actuales del uso
    const currentDeviceData = activeUsage.deviceData || {};
    const previousPower = currentDeviceData.lastPower || 0;
    const lastConsumptionTimestamp = currentDeviceData.lastConsumptionAt ? 
      new Date(currentDeviceData.lastConsumptionAt) : activeUsage.startedAt;

    // 📅 CALCULAR TIEMPO REAL DE CONSUMO
    let realStartTime = activeUsage.startedAt;
    
    // Si es la primera vez que hay consumo real, actualizar startedAt
    if (!currentDeviceData.realConsumptionStarted) {
      console.log(`🎯 [ACTIVE_CONSUMPTION] Primera vez con consumo real: ${device.name}`);
      realStartTime = timestamp;
      
      await prisma.appointmentDeviceUsage.update({
        where: { id: activeUsage.id },
        data: {
          startedAt: timestamp, // ✅ ACTUALIZAR startedAt al momento real de consumo
          deviceData: {
            ...currentDeviceData,
            realConsumptionStarted: true,
            realStartedAt: timestamp.toISOString(),
            firstConsumptionPower: currentPower
          }
        }
      });
    }

    // ⚡ ACUMULAR ENERGÍA
    const timeDiffSeconds = (timestamp.getTime() - lastConsumptionTimestamp.getTime()) / 1000;
    const energyIncrement = (currentPower * timeDiffSeconds) / 3600; // Wh
    const currentEnergyConsumption = (activeUsage.energyConsumption || 0) + energyIncrement;

    // ⏱️ CALCULAR TIEMPO REAL DE USO (solo tiempo con consumo)
    const totalActiveMinutes = currentDeviceData.totalActiveMinutes || 0;
    const newActiveMinutes = timeDiffSeconds / 60;
    const updatedActiveMinutes = totalActiveMinutes + newActiveMinutes;

    // 📊 ACTUALIZAR REGISTRO
    const updatedDeviceData = {
      ...currentDeviceData,
      lastPower: currentPower,
      lastVoltage: voltage,
      lastTemperature: temperature,
      lastConsumptionAt: timestamp.toISOString(),
      totalActiveMinutes: updatedActiveMinutes,
      energyAccumulated: currentEnergyConsumption,
      powerHistory: [
        ...(currentDeviceData.powerHistory || []).slice(-10), // Mantener últimos 10
        { timestamp: timestamp.toISOString(), power: currentPower }
      ]
    };

    await prisma.appointmentDeviceUsage.update({
      where: { id: activeUsage.id },
      data: {
        actualMinutes: Math.round(updatedActiveMinutes),
        energyConsumption: currentEnergyConsumption,
        deviceData: updatedDeviceData,
        updatedAt: timestamp
      }
    });

    console.log(`✅ [ACTIVE_CONSUMPTION] Actualizado ${device.name}:`, {
      actualMinutes: Math.round(updatedActiveMinutes),
      estimatedMinutes: activeUsage.estimatedMinutes,
      energyWh: Math.round(currentEnergyConsumption * 100) / 100,
      currentPower
    });

    // 🚨 VERIFICAR APAGADO AUTOMÁTICO
    await checkAutoShutdown(activeUsage, updatedActiveMinutes, device);

  } catch (error) {
    console.error(`❌ [ACTIVE_CONSUMPTION] Error en ${device.name}:`, error);
  }
}

// 🟡 Procesar estado standby (encendido sin consumo)
async function processStandbyState(activeUsage, data, device) {
  const { timestamp } = data;

  try {
    const currentDeviceData = activeUsage.deviceData || {};
    
    console.log(`🟡 [STANDBY] ${device.name} encendido sin consumo`);

    await prisma.appointmentDeviceUsage.update({
      where: { id: activeUsage.id },
      data: {
        deviceData: {
          ...currentDeviceData,
          lastStandbyAt: timestamp.toISOString(),
          inStandbyMode: true
        },
        updatedAt: timestamp
      }
    });

  } catch (error) {
    console.error(`❌ [STANDBY] Error en ${device.name}:`, error);
  }
}

// 🔴 Procesar dispositivo apagado
async function processDeviceTurnedOff(activeUsage, data, device) {
  const { timestamp } = data;

  try {
    console.log(`🔴 [DEVICE_OFF] ${device.name} apagado - finalizando uso`);

    // Calcular tiempo total si no está calculado
    const currentActiveMinutes = activeUsage.actualMinutes || 0;
    
    // Agregar evento a la traza JSON
    const currentDeviceData = activeUsage.deviceData || {};
    const events = currentDeviceData.events || [];
    
    events.push({
      timestamp: timestamp.toISOString(),
      event: 'device_turned_off',
      details: 'Dispositivo apagado - finalizando uso',
      data: {
        actualMinutes: currentActiveMinutes,
        estimatedMinutes: activeUsage.estimatedMinutes,
        reason: 'manual_or_external'
      }
    });
    
    await prisma.appointmentDeviceUsage.update({
      where: { id: activeUsage.id },
      data: {
        currentStatus: 'COMPLETED',
        endedAt: timestamp,
        actualMinutes: currentActiveMinutes,
        deviceData: {
          ...currentDeviceData,
          events,
          manuallyTurnedOff: true,
          turnedOffAt: timestamp.toISOString()
        },
        updatedAt: timestamp
      }
    });

    console.log(`✅ [DEVICE_OFF] ${device.name} uso finalizado:`, {
      actualMinutes: currentActiveMinutes,
      estimatedMinutes: activeUsage.estimatedMinutes
    });

  } catch (error) {
    console.error(`❌ [DEVICE_OFF] Error en ${device.name}:`, error);
  }
}

// 📴 Manejar dispositivo offline
async function handleDeviceOffline(activeUsage, timestamp) {
  try {
    console.log(`📴 [OFFLINE] Pausando uso por desconexión: ${activeUsage.id}`);

    // Agregar evento a la traza JSON
    const currentDeviceData = activeUsage.deviceData || {};
    const events = currentDeviceData.events || [];
    
    events.push({
      timestamp: timestamp.toISOString(),
      event: 'device_offline',
      details: 'Dispositivo desconectado - pausando uso',
      data: {
        reason: 'connection_lost',
        status: 'paused'
      }
    });

    await prisma.appointmentDeviceUsage.update({
      where: { id: activeUsage.id },
      data: {
        currentStatus: 'PAUSED',
        pausedAt: timestamp,
        deviceData: {
          ...currentDeviceData,
          events,
          pausedReason: 'device_offline',
          pausedAt: timestamp.toISOString()
        },
        updatedAt: timestamp
      }
    });

  } catch (error) {
    console.error(`❌ [OFFLINE] Error pausando uso:`, error);
  }
}

// 🚨 Verificar y ejecutar apagado automático
async function checkAutoShutdown(activeUsage, actualMinutes, device) {
  try {
    const autoShutdownEnabled = activeUsage.equipmentClinicAssignment?.smartPlugDevice?.autoShutdownEnabled;
    
    if (!autoShutdownEnabled) {
      return; // Apagado automático deshabilitado
    }

    if (actualMinutes >= activeUsage.estimatedMinutes) {
      console.log(`⏰ [AUTO_SHUTDOWN] Tiempo cumplido para ${device.name}:`, {
        actualMinutes: Math.round(actualMinutes),
        estimatedMinutes: activeUsage.estimatedMinutes
      });

      const now = new Date();
      let shutdownSuccessful = false;
      let errorMessage = null;

      // Intentar apagar dispositivo
      try {
        const controlResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/shelly/device/${device.deviceId}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'off',
            appointmentId: activeUsage.appointmentId,
            reason: 'auto_shutdown_time_reached'
          })
        });

        if (controlResponse.ok) {
          shutdownSuccessful = true;
          console.log(`✅ [AUTO_SHUTDOWN] Dispositivo apagado: ${device.name}`);
        } else {
          const errorData = await controlResponse.json();
          errorMessage = errorData.error || 'Error desconocido';
          console.error(`❌ [AUTO_SHUTDOWN] Error controlando:`, errorMessage);
        }
      } catch (controlError) {
        errorMessage = controlError.message;
        console.error(`❌ [AUTO_SHUTDOWN] Error de conexión:`, controlError);
      }

      // Actualizar con la traza en JSON
      const currentDeviceData = activeUsage.deviceData || {};
      const events = currentDeviceData.events || [];
      
      events.push({
        timestamp: now.toISOString(),
        event: 'auto_shutdown_executed',
        details: `Apagado automático ${shutdownSuccessful ? 'exitoso' : 'fallido'}`,
        data: {
          actualMinutes: Math.round(actualMinutes),
          estimatedMinutes: activeUsage.estimatedMinutes,
          shutdownSuccessful,
          errorMessage
        }
      });

      await prisma.appointmentDeviceUsage.update({
        where: { id: activeUsage.id },
        data: {
          currentStatus: 'AUTO_SHUTDOWN',
          endedAt: now,
          actualMinutes: Math.round(actualMinutes),
          deviceData: {
            ...currentDeviceData,
            events,
            autoShutdownExecuted: true,
            autoShutdownAt: now.toISOString()
          }
        }
      });

      // Emitir WebSocket de notificación
      if (global.broadcastDeviceUpdate) {
        global.broadcastDeviceUpdate(device.credential.systemId, {
          type: 'auto-shutdown-executed',
          appointmentId: activeUsage.appointmentId,
          deviceId: device.id,
          equipmentName: activeUsage.equipmentClinicAssignment?.equipment?.name,
          shutdownSuccessful,
          actualMinutes: Math.round(actualMinutes),
          errorMessage
        });
      }
    }

  } catch (error) {
    console.error(`❌ [AUTO_SHUTDOWN] Error verificando:`, error);
  }
}

// 💾 Actualizar dispositivo en base de datos
async function updateDeviceInDatabase(device, data) {
  try {
    await prisma.smartPlugDevice.update({
      where: { id: device.id },
      data: {
        online: data.isOnline,
        relayOn: data.relayOn,
        currentPower: data.currentPower,
        voltage: data.voltage,
        temperature: data.temperature,
        lastSeenAt: data.timestamp
      }
    });
  } catch (error) {
    console.error(`❌ Error actualizando dispositivo ${device.name}:`, error);
  }
} 