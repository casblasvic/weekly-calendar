/**
 * ========================================
 * PLUGIN SHELLY - WEBSOCKET MANAGER
 * ========================================
 * 
 * 🔌 INTEGRACIÓN SHELLY CLOUD
 * Este módulo maneja las conexiones WebSocket con Shelly Cloud API.
 * NO utiliza conexiones directas a las IPs locales de los dispositivos.
 * 
 * 📡 CONFIGURACIÓN DE CONEXIÓN:
 * - Host API: Se obtiene del campo `apiHost` en la tabla `ShellyCredential`
 * - URL WebSocket: wss://{apiHost}/device/relay (construida dinámicamente)
 * - Autenticación: Bearer token desde `ShellyCredential.accessToken`
 * 
 * 🆔 MAPEO AUTOMÁTICO DE DISPOSITIVOS:
 * - deviceId (BD): ID interno almacenado en `SmartPlugDevice.deviceId`
 * - cloudId: ID numérico de Shelly Cloud (NO almacenado en BD)
 * - El mapeo se construye automáticamente desde eventos WebSocket
 * - Map interno: deviceIdMapping.set(deviceId, cloudId)
 * - Ejemplo: "b0b21c12dd94" → "194279021665684"
 * 
 * 🏗️ FLUJO DE MAPEO AUTOMÁTICO:
 * 1. WebSocket recibe evento StatusOnChange
 * 2. Extrae deviceId y cloudId del evento
 * 3. Construye mapeo automático en memoria
 * 4. Usa cloudId para enviar comandos posteriores
 * 
 * 📊 TABLAS DE BASE DE DATOS:
 * - `ShellyCredential`: Credenciales OAuth2 y apiHost
 * - `SmartPlugDevice`: Dispositivos vinculados (deviceId, credentialId)
 * - `WebSocketConnection`: Estado de conexiones WebSocket
 * - `WebSocketLog`: Logs de eventos y comandos
 * 
 * ⚡ COMANDOS WEBSOCKET:
 * - Formato: {"method": "Shelly:CommandRequest", "params": {...}}
 * - Usa cloudId mapeado, NO deviceId de BD
 * - Respuestas automáticas via eventos WebSocket
 * 
 * 🔄 GESTIÓN DE CONEXIONES:
 * - Auto-reconexión en caso de desconexión
 * - Heartbeat para mantener conexión activa
 * - Logs detallados para debugging
 * 
 * 🎯 USO EN EL PLUGIN:
 * 1. Conectar credencial: connectCredential(credentialId)
 * 2. Enviar comando: controlDevice(credentialId, deviceId, action)
 * 3. El manager resuelve automáticamente deviceId → cloudId
 * 4. Envía comando usando cloudId correcto
 */

import { prisma } from '@/lib/db';
import { decrypt } from './crypto';
import { wsLogger } from '../utils/websocket-logger';
import { deviceOfflineManager } from './device-offline-manager';

interface ShellyWebSocketMessage {
    id: number;
    src: string;
    dst: string;
    method?: string;
    params?: any;
    result?: any;
    error?: any;
}

interface DeviceStatus {
    online: boolean;
    'switch:0'?: {
        output: boolean;
    };
}

class ShellyWebSocketManager {
    private connections: Map<string, WebSocket> = new Map();
    private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
    private messageQueues: Map<string, ShellyWebSocketMessage[]> = new Map();
    private messageIdCounter = 1;
    private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();
    private readonly MAX_MESSAGES_PER_MINUTE = 60;
    private readonly MAX_MESSAGE_SIZE = 10 * 1024; // 10KB
    
    // 🎯 NUEVO: Mapeo automático de IDs (deviceId BD → deviceId Cloud)
    private deviceIdMapping: Map<string, string> = new Map();

    // 🔢 Conteo de conexiones activas para notificar correctamente al OfflineManager
    private activeConnectionCount = 0;
    
    // Callback para interceptar actualizaciones de dispositivos
    public onDeviceUpdate?: (credentialId: string, deviceId: string, status: DeviceStatus) => Promise<void>;

    async connectCredential(credentialId: string): Promise<void> {
        try {
            // Obtener credenciales
            const credential = await prisma.shellyCredential.findUnique({
                where: { id: credentialId },
                include: {
                    smartPlugs: {
                        where: { excludeFromSync: false }
                    }
                }
            });

            if (!credential) {
                throw new Error('Credenciales no encontradas');
            }

            // 🛡️ VERIFICAR MÓDULO SHELLY ACTIVO ANTES DE CONECTAR
            const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
            const isModuleActive = await isShellyModuleActive(credential.systemId);
            
            if (!isModuleActive) {
                console.warn(`🔒 [CONNECT] Módulo Shelly INACTIVO para sistema ${credential.systemId} - Conexión bloqueada`);
                throw new Error('Módulo de control de enchufes inteligentes Shelly está desactivado');
            }

            // Descifrar token
            const accessToken = decrypt(credential.accessToken);
            
            // Crear URL WebSocket según documentación de Shelly Cloud
            // wss://<servidor>.shelly.cloud:6113/shelly/wss/hk_sock?t=<ACCESS_TOKEN>
            const baseUrl = credential.apiHost.replace('https://', '');
            const wsUrl = `wss://${baseUrl}:6113/shelly/wss/hk_sock?t=${accessToken}`;
            
            console.log(`🔗 Conectando a WebSocket Shelly: ${wsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);
            
            // Validar URL
            if (!wsUrl.startsWith('wss://')) {
                throw new Error('URL WebSocket debe usar WSS (WebSocket Secure)');
            }
            
            // Crear conexión con opciones de seguridad
            const ws = new WebSocket(wsUrl, {
                // Validar certificados SSL
                rejectUnauthorized: true,
                // Timeout de handshake
                handshakeTimeout: 10000,
                // Headers personalizados
                headers: {
                    'User-Agent': 'Qleven-SaaS/1.0',
                    'X-Client-Version': '1.0.0'
                }
            } as any);
            
            // Configurar eventos
            ws.onopen = () => this.handleOpen(credentialId);
            ws.onmessage = (event) => this.handleMessage(credentialId, event);
            ws.onerror = (error) => this.handleError(credentialId, error);
            ws.onclose = () => this.handleClose(credentialId);
            
            // Guardar conexión
            this.connections.set(credentialId, ws);
            
            // Actualizar estado en DB
            await this.updateConnectionStatus(credentialId, 'connected');
            
            // WebSocket es suficiente para tiempo real - no necesitamos polling HTTP
            
        } catch (error) {
            console.error(`Error conectando credential ${credentialId}:`, error);
            await this.updateConnectionStatus(credentialId, 'error', error instanceof Error ? error.message : 'Error desconocido');
        }
    }

    private async handleOpen(credentialId: string): Promise<void> {
        console.log(`✅ WebSocket Shelly conectado para credencial ${credentialId}`);
        
        // 🎯 NOTIFICAR AL OFFLINE MANAGER SOLO EN LA PRIMERA CONEXIÓN ACTIVA
        this.activeConnectionCount++;
        if (this.activeConnectionCount === 1) {
            deviceOfflineManager.setWebSocketConnected(true);
        }
        
        // Limpiar timer de reconexión si existe
        const timer = this.reconnectTimers.get(credentialId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(credentialId);
        }
        
        // No necesitamos autenticación manual - el token va en la URL
        // Según documentación: wss://server.shelly.cloud:6113/shelly/wss/hk_sock?t=ACCESS_TOKEN
        
        // Procesar cola de mensajes pendientes
        const queue = this.messageQueues.get(credentialId);
        if (queue && queue.length > 0) {
            queue.forEach(msg => this.sendMessage(credentialId, msg));
            this.messageQueues.set(credentialId, []);
        }
        
        console.log(`🎯 WebSocket Shelly listo para recibir eventos en tiempo real`);

        // -------------------------------------------------------------
        // 🔄 SINCRONIZACIÓN INICIAL DE ESTADOS
        // -------------------------------------------------------------
        try {
          this.refreshAllDeviceStatuses(credentialId).catch(err => {
            console.warn('⚠️  Error refrescando estados iniciales:', err);
          });
        } catch { /* noop */ }
    }

    /**
     * Sincroniza el estado de TODOS los dispositivos de la credencial
     * justo después de abrir el WebSocket. Así la UI muestra online/offline
     * correcto sin esperar al primer mensaje.
     */
    private async refreshAllDeviceStatuses(credentialId: string): Promise<void> {
        const credential = await prisma.shellyCredential.findUnique({
            where: { id: credentialId }
        });

        if (!credential) return;

        // Importación dinámica para evitar ciclos
        const { ShellyCloudAPI } = await import('./api/cloud-api');
        const api = new ShellyCloudAPI(credential as any);

        const devices = await prisma.smartPlugDevice.findMany({
            where: { credentialId },
            select: { id: true, deviceId: true, cloudId: true }
        });

        for (const dev of devices) {
            const cloudId = dev.cloudId || this.deviceIdMapping.get(dev.deviceId);
            if (!cloudId || !/^\d+$/.test(cloudId)) continue;

            try {
                const raw = await api.getDeviceStatus(cloudId);

                const switchStatus = raw['switch:0'] ?? raw['relay:0'] ?? {};
                const status = {
                    online: true,
                    'switch:0': {
                        output: switchStatus.output || switchStatus.ison || false,
                        apower: switchStatus.apower || switchStatus.power || 0,
                        voltage: switchStatus.voltage || null,
                        aenergy: switchStatus.aenergy || null
                    },
                    temperature: raw.temperature || raw.sys?.temperature || null
                } as any;

                await this.handleDeviceStatusUpdate(credentialId, dev.deviceId, status);
            } catch (err) {
                // Si falla la petición lo marcamos offline
                await this.handleDeviceStatusUpdate(credentialId, dev.deviceId, {
                    online: false,
                    'switch:0': { output: false }
                } as any);
            }
        }
    }

    private async handleMessage(credentialId: string, event: MessageEvent): Promise<void> {
        try {
            // Validar tamaño del mensaje
            if (event.data.length > this.MAX_MESSAGE_SIZE) {
                console.error(`Mensaje demasiado grande: ${event.data.length} bytes`);
                return;
            }

            // 🔍 LOG: Mensaje Shelly recibido (limpio)
            wsLogger.debug(`📡 [Shelly] Mensaje recibido de ${credentialId}:`, {
                timestamp: new Date().toISOString(),
                dataLength: event.data.length
            });

            // Parsear mensaje JSON
            const data = JSON.parse(event.data);
            
            // 🔍 LOGS DIRECTOS: Mostrar TODOS los mensajes que llegan (siempre visible)
            console.log(`🔍 [WebSocket RAW] Credencial ${credentialId} - Mensaje recibido:`, {
                event: data.event,
                method: data.method,
                deviceId: data.device?.id || data.deviceId,
                hasStatus: !!data.status,
                hasSwitch: !!data.status?.['switch:0'],
                hasRelay: !!data.status?.['relay:0'],
                timestamp: new Date().toISOString()
            });
            
            // 🔍 DEBUG ADICIONAL: Log completo si está habilitado
            wsLogger.debug(`🔍 [WebSocket DEBUG] Mensaje completo:`, data);
            
            // 🎯 MANEJAR RESPUESTAS DE COMANDOS
            if (data.event === 'Shelly:CommandResponse') {
                const { trid, deviceId, data: responseData } = data;
                wsLogger.verbose(`📝 [WebSocket CMD] Respuesta de comando para dispositivo ${deviceId}:`, {
                    trid,
                    success: responseData?.isok,
                    error: responseData?.errors,
                    response: responseData
                });
                
                if (responseData?.isok) {
                    console.log(`✅ [WebSocket CMD] Comando ejecutado exitosamente en ${deviceId}`);
                } else {
                    console.error(`❌ [WebSocket CMD] Error en comando para ${deviceId}:`, responseData?.errors);

                    // Si recibimos error, marcar dispositivo offline inmediatamente
                    try {
                        await this.handleDeviceStatusUpdate(credentialId, deviceId, {
                            online: false,
                            'switch:0': { output: false },
                            errorReason: 'command_failed'
                        });
                    } catch {}
                }
                return;
            }
            
            // 🎯 FORMATO CORRECTO: Manejar eventos de Shelly Cloud
            if (data.event === 'Shelly:StatusOnChange' && data.device && data.status) {
                // El deviceId real está en data.status.id, no en data.device.id
                const deviceId = data.status.id || data.device.id;
                const cloudDeviceId = data.device.id; // ID numérico de Cloud
                const deviceStatus = data.status;
                
                // 🎯 CONSTRUIR MAPEO AUTOMÁTICO
                if (deviceId && cloudDeviceId && deviceId !== cloudDeviceId) {
                    this.deviceIdMapping.set(deviceId, cloudDeviceId);
                    wsLogger.verbose(`🔄 [AUTO-MAPPING] Mapeado automáticamente: ${deviceId} → ${cloudDeviceId}`);
                }
                
                wsLogger.verbose(`📡 StatusOnChange recibido para dispositivo ${deviceId}:`, {
                    deviceCode: data.device.code,
                    generation: data.device.gen,
                    cloudId: cloudDeviceId,
                    online: true,
                    switchOutput: deviceStatus['switch:0']?.output,
                    apower: deviceStatus['switch:0']?.apower,
                    voltage: deviceStatus['switch:0']?.voltage,
                    temperature: deviceStatus.temperature || deviceStatus.sys?.temperature,
                    rawSwitchData: deviceStatus['switch:0']
                });
                
                // Extraer datos según generación del dispositivo
                const channel = deviceStatus['switch:0'] ?? deviceStatus['relay:0'];
                const status = {
                    online: true, // Si recibimos el mensaje, está online
                    'switch:0': {
                        output: channel?.output || deviceStatus.relays?.[0]?.ison || false,
                        apower: channel?.apower || deviceStatus.meters?.[0]?.power || 0,
                        voltage: channel?.voltage || deviceStatus.voltage || null,
                        aenergy: channel?.aenergy || deviceStatus.meters?.[0]?.total || null
                    },
                    temperature: deviceStatus.temperature || deviceStatus.sys?.temperature || null
                };
                
                await this.handleDeviceStatusUpdate(credentialId, deviceId, status);
            }
            // 🔍 DEBUG: Detectar otros tipos de mensajes que podrían ser eventos
            else if (data.method && data.method.includes('Status')) {
                wsLogger.debug(`🔍 [WebSocket DEBUG] Posible evento de estado no reconocido:`, {
                    method: data.method,
                    data: data.data,
                    params: data.params
                });
            }
            else if (data.params && (data.params.switch || data.params['switch:0'])) {
                wsLogger.debug(`🔍 [WebSocket DEBUG] Mensaje con datos de switch:`, {
                    method: data.method,
                    switchData: data.params.switch || data.params['switch:0'],
                    fullParams: data.params
                });
            }
            
            // Manejar respuestas a comandos
            if (data.result !== undefined || data.error !== undefined) {
                wsLogger.verbose(`📝 Respuesta comando WebSocket:`, data);
            }
            
        } catch (error) {
            console.error('❌ Error procesando mensaje WebSocket:', error);
        }
    }

    private validateMessage(data: any): ShellyWebSocketMessage {
        // Validación básica de estructura
        if (!data || typeof data !== 'object') {
            throw new Error('Mensaje inválido: no es un objeto');
        }

        // Validar campos requeridos
        if (typeof data.id !== 'number' || !data.src || !data.dst) {
            throw new Error('Mensaje inválido: faltan campos requeridos');
        }

        // Sanitizar strings para prevenir XSS
        const sanitize = (str: string): string => {
            return str.replace(/[<>]/g, '');
        };

        return {
            id: data.id,
            src: sanitize(data.src),
            dst: sanitize(data.dst),
            method: data.method ? sanitize(data.method) : undefined,
            params: data.params,
            result: data.result,
            error: data.error
        };
    }

    // Hacer público el método para permitir interceptores
    public async handleDeviceStatusUpdate(
        credentialId: string, 
        deviceId: string, 
        status: any
    ): Promise<void> {
        console.log(`🎯 [handleDeviceStatusUpdate] LLAMADO para deviceId=${deviceId}, credentialId=${credentialId}`);
        
        // 🎯 TIEMPO REAL PURO: SIEMPRE notificar actividad WebSocket, independientemente de si encontramos el dispositivo específico
        const channel = status['switch:0'] ?? status['relay:0'];
        const updatedData: any = {
            online: status.online,
            relayOn: channel?.output ?? false,
            currentPower: channel?.apower ?? 0,
            voltage: channel?.voltage ?? null,
            totalEnergy: channel?.aenergy?.total ?? null,
            temperature: status.temperature ?? null,
            lastSeenAt: new Date()
        };
        
        console.log(`📊 [handleDeviceStatusUpdate] Datos extraídos:`, {
            deviceId,
            online: updatedData.online,
            relayOn: updatedData.relayOn,
            currentPower: updatedData.currentPower
        });

        // 🔄 AUTO-MAPEO DE cloudId CUANDO EL STATUS INCLUYE ID NUMÉRICO
        const possibleNumericId = String(status.cloud_id || status.cloudId || status.numeric_id || "");
        if (/^\d+$/.test(possibleNumericId) && !this.deviceIdMapping.get(deviceId)) {
            this.deviceIdMapping.set(deviceId, possibleNumericId);
            console.info(`[AUTO-MAP] Registrado cloudId ${possibleNumericId} ⇐ deviceId ${deviceId}`);
        }

        // Buscar dispositivo en BD
        let device = await prisma.smartPlugDevice.findFirst({
            where: {
                credentialId,
                OR: [
                    { deviceId },
                    { cloudId: deviceId }
                ]
            },
            select: { id: true, deviceId: true, cloudId: true, name: true, credential: { select: { systemId: true } } }
        });
        
        if (device) {
            // 🆕 SI cloudId está vacío en BD y tenemos cloudId numérico válido, actualizar
            // Usar possibleNumericId (calculado arriba) como cloudId potencial
            if (!device.cloudId && /^\d+$/.test(possibleNumericId)) {
                try {
                    await prisma.smartPlugDevice.update({
                        where: { id: device.id },
                        data: { cloudId: possibleNumericId }
                    });
                    this.deviceIdMapping.set(device.deviceId, possibleNumericId);
                    console.log(`🔄 [AUTO-UPDATE] cloudId actualizado en BD: ${device.deviceId} → ${possibleNumericId}`);
                } catch (cloudErr) {
                    console.warn(`⚠️  Error actualizando cloudId para ${device.deviceId}:`, cloudErr);
                }
            }

            // 🎯 REGISTRAR ACTIVIDAD CON DATOS ESPECÍFICOS DEL DISPOSITIVO
            deviceOfflineManager.trackActivity(device.id, device.name, updatedData, status.online);

            wsLogger.verbose(`📡 [TIEMPO REAL] Dispositivo encontrado - ${device.name}:`, {
                deviceId: device.id,
                online: updatedData.online,
                relayOn: updatedData.relayOn,
                currentPower: updatedData.currentPower
            });

            // 🚀 BROADCAST DIRECTO (fallback) ---------------------------------
            try {
              const globalBroadcast = (globalThis as any).broadcastDeviceUpdate;
              if (globalBroadcast && device.credential?.systemId) {
                const payload = {
                  deviceId: device.id,
                  shellyDeviceId: device.deviceId,
                  online: status.online,
                  relayOn: updatedData.relayOn,
                  currentPower: updatedData.currentPower,
                  voltage: updatedData.voltage,
                  temperature: updatedData.temperature,
                  timestamp: Date.now(),
                  reason: 'websocket_status'
                };
                globalBroadcast(device.credential.systemId, payload);
              }
            } catch (brErr) {
              console.warn('⚠️  Broadcast fallback error:', brErr);
            }
        } else {
            // -------------------------------------------------------------
            // 🛠️ Fallback: intentar resolver deviceId numérico (cloudId)
            // -------------------------------------------------------------
            let fallbackDevice: typeof device | null = null;
            if (/^\d+$/.test(deviceId)) {
                const originalEntry = Array.from(this.deviceIdMapping.entries()).find(([, cloud]) => cloud === deviceId);
                const originalDeviceId = originalEntry?.[0];
                if (originalDeviceId) {
                    fallbackDevice = await prisma.smartPlugDevice.findFirst({
                        where: { deviceId: originalDeviceId, credentialId },
                        include: { credential: { select: { systemId: true } } }
                    });

                    if (fallbackDevice) {
                        console.info(`🔄 [FALLBACK] Encontrado dispositivo por mapeo inverso ${deviceId} → ${originalDeviceId}`);

                        // Actualizar cloudId en BD si aún está vacío
                        if (!fallbackDevice.cloudId) {
                            try {
                                await prisma.smartPlugDevice.update({
                                    where: { id: fallbackDevice.id },
                                    data: { cloudId: deviceId }
                                });
                            } catch (err) {
                                console.warn(`⚠️ Error actualizando cloudId fallback para ${fallbackDevice.deviceId}:`, err);
                            }
                        }
                        // Asignar para continuar procesamiento normal
                        device = fallbackDevice;
                    }
                }
            }

            // ➡️ Intento final: buscar por cloudId en toda la base (cualquier credencial)
            if (!device && /^\d+$/.test(deviceId)) {
                const byCloud = await prisma.smartPlugDevice.findFirst({
                    where: { cloudId: deviceId }
                });
                if (byCloud) {
                    console.info(`🔄 [FALLBACK-GLOBAL] Dispositivo encontrado por cloudId global: ${byCloud.deviceId}`);
                    device = byCloud as any;
                    // Asegurar mapeo para futuros mensajes
                    this.deviceIdMapping.set(byCloud.deviceId, deviceId);
                }
            }

            // Si AÚN no se encontró pero necesitamos reflejar offline, emitir payload mínimo
            if (!device && status.online === false) {
                const globalBroadcast = (globalThis as any).broadcastDeviceUpdate;
                const sysId = null; // no conocemos systemId
                if (globalBroadcast && sysId) {
                    globalBroadcast(sysId, {
                        deviceId: deviceId,
                        online: false,
                        relayOn: false,
                        currentPower: 0,
                        timestamp: Date.now(),
                        reason: 'command_failed_no_device'
                    });
                }
            }

            if (!device) {
                console.warn(`⚠️ [SKIP] Dispositivo ${deviceId} no encontrado - ignorando update`);
                console.log(`⚠️ No se encontró dispositivo ${deviceId} para credencial ${credentialId}`);
                console.warn(`⚠️ Dispositivo ${deviceId} no mapeado correctamente tras múltiples intentos.`);

                // DEBUG: Solo en desarrollo 
                if (process.env.NODE_ENV === 'development') {
                    const allDevicesForCredential = await prisma.smartPlugDevice.findMany({
                        where: { credentialId },
                        select: { id: true, deviceId: true, cloudId: true, name: true }
                    });
                    console.log(`🔍 [DEBUG] Dispositivos en BD para credencial ${credentialId}:`, allDevicesForCredential);
                }
                return; // Salir sin procesar si sigue sin encontrarse
            }
        }
        
        // Llamar callback si existe
        if (this.onDeviceUpdate) {
            console.log(`🔗 [onDeviceUpdate] EJECUTANDO callback para deviceId=${deviceId}`);
            try {
                await this.onDeviceUpdate(credentialId, deviceId, status);
                console.log(`✅ [onDeviceUpdate] Callback ejecutado exitosamente para deviceId=${deviceId}`);
            } catch (error) {
                console.error('❌ Error en callback onDeviceUpdate:', error);
            }
        } else {
            console.warn(`⚠️ [onDeviceUpdate] NO HAY CALLBACK configurado - los eventos no se propagarán a Socket.io`);
        }
    }

    private async handleError(credentialId: string, error: Event): Promise<void> {
        console.error(`WebSocket error para credential ${credentialId}:`, error);
        await this.updateConnectionStatus(credentialId, 'error', 'Error de conexión');
    }

    private async handleClose(credentialId: string): Promise<void> {
        console.log(`WebSocket cerrado para credential ${credentialId}`);
        
        // 🎯 NOTIFICAR AL OFFLINE MANAGER SOLO CUANDO NO QUEDEN CONEXIONES
        if (this.activeConnectionCount > 0) {
            this.activeConnectionCount--;
        }
        if (this.activeConnectionCount === 0) {
            deviceOfflineManager.setWebSocketConnected(false);
        }
        
        // Actualizar estado
        await this.updateConnectionStatus(credentialId, 'disconnected');
        
        // Limpiar conexión
        this.connections.delete(credentialId);
        
        // 🔒 VERIFICAR CAMPO autoReconnect EN BD ANTES DE RECONECTAR
        const webSocketConnection = await prisma.webSocketConnection.findFirst({
            where: {
                type: 'SHELLY',
                referenceId: credentialId
            }
        });
        
        // Solo reconectar si autoReconnect está habilitado
        if (webSocketConnection?.autoReconnect === true) {
            console.log(`🔄 AutoReconnect habilitado para ${credentialId}, verificando token y programando reconexión...`);
            
            // 🔑 NUEVO: Intentar refrescar token antes de reconectar
            try {
                await this.refreshTokenIfNeeded(credentialId);
                console.log(`✅ [TOKEN] Token verificado/refrescado para ${credentialId}`);
            } catch (tokenError) {
                console.error(`❌ [TOKEN] Error refrescando token para ${credentialId}:`, tokenError);
                
                // Si falla el refresh del token, marcar credencial como error
                await this.updateConnectionStatus(credentialId, 'error', `Token expirado: ${tokenError instanceof Error ? tokenError.message : 'Error desconocido'}`);
                
                // Log del evento
                await this.logWebSocketEvent(
                    credentialId,
                    'token_refresh_failed',
                    'Error refrescando token - reconexión cancelada',
                    { error: tokenError instanceof Error ? tokenError.message : 'Error desconocido' }
                );
                
                return; // No reconectar si no se puede refrescar el token
            }
            
            // Programar reconexión con delay
            const timer = setTimeout(() => {
                console.log(`🔄 Intentando reconectar credential ${credentialId}...`);
                this.connectCredential(credentialId);
            }, 5000); // Reconectar después de 5 segundos
            
            this.reconnectTimers.set(credentialId, timer);
        } else {
            console.log(`⏸️ AutoReconnect deshabilitado para ${credentialId}, NO se reconectará automáticamente`);
            
            // Log del evento para auditoría
            await this.logWebSocketEvent(
                credentialId,
                'reconnect_skipped',
                'Reconexión automática omitida - autoReconnect deshabilitado'
            );
        }
    }

    /**
     * 🔑 NUEVO: Refrescar token de Shelly si es necesario
     */
    private async refreshTokenIfNeeded(credentialId: string): Promise<void> {
        try {
            // Obtener credencial de BD
            const credential = await prisma.shellyCredential.findUnique({
                where: { id: credentialId }
            });

            if (!credential) {
                throw new Error('Credencial no encontrada');
            }

            // Importar funciones de crypto y refresh
            const { decrypt, encrypt } = await import('./crypto');
            const { refreshShellyToken } = await import('./client');

            console.log(`🔑 [TOKEN] Refrescando token para credencial ${credentialId}...`);

            // Decrypt del refresh token
            const refreshToken = decrypt(credential.refreshToken);
            
            // Llamar a la API de Shelly para refrescar
            const newTokens = await refreshShellyToken(credential.apiHost, refreshToken);

            // Actualizar tokens en BD
            await prisma.shellyCredential.update({
                where: { id: credentialId },
                data: {
                    accessToken: encrypt(newTokens.access_token),
                    refreshToken: encrypt(newTokens.refresh_token),
                    status: 'connected',
                    lastSyncAt: new Date()
                }
            });

            console.log(`✅ [TOKEN] Token refrescado exitosamente para ${credentialId}`);

            // Log del evento exitoso
            await this.logWebSocketEvent(
                credentialId,
                'token_refreshed',
                'Token de acceso refrescado exitosamente'
            );

        } catch (error) {
            console.error(`❌ [TOKEN] Error refrescando token para ${credentialId}:`, error);
            
            // Actualizar estado de credencial como error
            await prisma.shellyCredential.update({
                where: { id: credentialId },
                data: {
                    status: 'expired'
                }
            }).catch(updateError => {
                console.error('Error actualizando estado de credencial:', updateError);
            });

            throw error;
        }
    }

    private sendMessage(credentialId: string, message: ShellyWebSocketMessage): void {
        // Verificar rate limit
        if (!this.checkRateLimit(credentialId)) {
            console.warn(`Rate limit excedido para credential ${credentialId}`);
            return;
        }

        const ws = this.connections.get(credentialId);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            // Agregar a cola si no está conectado
            const queue = this.messageQueues.get(credentialId) || [];
            
            // Limitar tamaño de la cola
            if (queue.length >= 100) {
                console.warn(`Cola de mensajes llena para credential ${credentialId}`);
                return;
            }
            
            queue.push(message);
            this.messageQueues.set(credentialId, queue);
        }
    }

    private checkRateLimit(credentialId: string): boolean {
        const now = Date.now();
        const limiter = this.rateLimiters.get(credentialId) || { count: 0, resetTime: now + 60000 };

        // Resetear contador si ha pasado el tiempo
        if (now > limiter.resetTime) {
            limiter.count = 0;
            limiter.resetTime = now + 60000;
        }

        // Verificar límite
        if (limiter.count >= this.MAX_MESSAGES_PER_MINUTE) {
            return false;
        }

        // Incrementar contador
        limiter.count++;
        this.rateLimiters.set(credentialId, limiter);
        return true;
    }

    async sendCommand(
        credentialId: string, 
        deviceId: string, 
        method: string, 
        params: any = {}
    ): Promise<void> {
        const message: ShellyWebSocketMessage = {
            id: this.messageIdCounter++,
            src: 'user',
            dst: deviceId,
            method,
            params
        };
        
        this.sendMessage(credentialId, message);
    }

    async toggleDevice(credentialId: string, deviceId: string, on: boolean): Promise<void> {
        await this.sendCommand(credentialId, deviceId, 'Switch.Set', {
            id: 0,
            on
        });
    }

    // 🎯 NUEVO: Enviar comando de control usando WebSocket Cloud
    async controlDevice(credentialId: string, deviceId: string, action: 'on' | 'off'): Promise<void> {
        let ws = this.connections.get(credentialId);
        
        // Verificar si el WebSocket está conectado
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log(`🔄 [WebSocket CMD] WebSocket desconectado, refrescando token y reconectando para credencial ${credentialId}...`);
            
            // 🔑 NUEVO: Refrescar token antes de reconectar
            try {
                await this.refreshTokenIfNeeded(credentialId);
                console.log(`✅ [TOKEN] Token refrescado antes de control de dispositivo`);
            } catch (tokenError) {
                console.error(`❌ [TOKEN] Error refrescando token para control:`, tokenError);
                throw new Error(`Token expirado y no se pudo refrescar: ${tokenError instanceof Error ? tokenError.message : 'Error desconocido'}`);
            }
            
            // Intentar reconectar con el token refrescado
            await this.connectCredential(credentialId);
            
            // Esperar un momento para que se establezca la conexión
            await new Promise(resolve => setTimeout(resolve, 2000)); // Aumentado a 2 segundos
            
            // Obtener la nueva conexión
            ws = this.connections.get(credentialId);
            
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('No se pudo reconectar el WebSocket después de refrescar token');
            }
            
            console.log(`✅ [WebSocket CMD] WebSocket reconectado exitosamente con token refrescado`);
        }
        
        // 🔍 NUEVO: Detectar si deviceId es un cloudId y hacer conversión inversa
        let actualDeviceId = deviceId;
        
        // Si deviceId es numérico (cloudId), buscar el deviceId original
        if (/^\d+$/.test(deviceId)) {
            console.log(`🔍 [CONTROL] deviceId recibido parece ser cloudId: ${deviceId}`);
            
            // Buscar el deviceId original por cloudId
            for (const [originalDeviceId, mappedCloudId] of this.deviceIdMapping.entries()) {
                if (mappedCloudId === deviceId) {
                    actualDeviceId = originalDeviceId;
                    console.log(`🔄 [CONTROL] Conversión inversa: cloudId ${deviceId} → deviceId ${actualDeviceId}`);
                    break;
                }
            }
            
            // Si no encontramos en memoria, buscar en BD
            if (actualDeviceId === deviceId) {
                const deviceByCloudId = await prisma.smartPlugDevice.findFirst({
                    where: { cloudId: deviceId, credentialId: credentialId }
                });
                
                if (deviceByCloudId) {
                    actualDeviceId = deviceByCloudId.deviceId;
                    console.log(`🔄 [CONTROL] Conversión inversa desde BD: cloudId ${deviceId} → deviceId ${actualDeviceId}`);
                }
            }
        }
        
        // 🆔 BUSCAR DISPOSITIVO POR deviceId actualizado
        console.log(`🔍 [CONTROL] Buscando dispositivo en BD: deviceId=${actualDeviceId}, credentialId=${credentialId}`);
        
        let device = await prisma.smartPlugDevice.findFirst({
            where: { deviceId: actualDeviceId, credentialId: credentialId }
        });
        
        if (!device) {
            console.log(`❌ [CONTROL] Dispositivo NO encontrado en BD: deviceId=${actualDeviceId}, credentialId=${credentialId}`);
            
            // 🔍 BÚSQUEDA ALTERNATIVA: Si no encuentra el dispositivo, intentar con deviceId
            console.warn(`⚠️ Dispositivo ${deviceId} no encontrado por cloudId, intentando búsqueda alternativa...`);
            
            // Buscar por deviceId en la misma credencial
            const allDevicesForCredential = await prisma.smartPlugDevice.findMany({
                where: { credentialId }
            });
            
            console.info(`🔍 [FALLBACK] Dispositivos disponibles para credencial ${credentialId}:`, 
                allDevicesForCredential.map(d => ({ deviceId: d.deviceId, cloudId: d.cloudId, name: d.name }))
            );
            
            // Intentar encontrar por coincidencia parcial o pattern matching
            const possibleMatch = allDevicesForCredential.find(d => 
                d.deviceId === deviceId || 
                d.cloudId === deviceId ||
                deviceId.includes(d.deviceId) ||
                d.deviceId.includes(deviceId)
            );
            
            if (possibleMatch) {
                console.info(`🎯 [FALLBACK] Dispositivo encontrado por búsqueda alternativa: ${possibleMatch.deviceId} (${possibleMatch.name})`);
                device = possibleMatch;
                
                // Actualizar el mapeo para futuras referencias
                this.deviceIdMapping.set(deviceId, possibleMatch.cloudId || possibleMatch.deviceId);
                
                // Actualizar cloudId en BD si es necesario
                if (!possibleMatch.cloudId && /^\d+$/.test(deviceId)) {
                    await prisma.smartPlugDevice.update({
                        where: { id: possibleMatch.id },
                        data: { cloudId: deviceId }
                    });
                    console.info(`🔄 [AUTO-UPDATE] CloudId actualizado en BD: ${possibleMatch.deviceId} → ${deviceId}`);
                }
            }
        }
        
        if (device) {
            console.log(`✅ [CONTROL] Dispositivo encontrado: ${device.name} (cloudId: ${device.cloudId}, deviceId: ${device.deviceId})`);
            
            // 🛠️ 1) Validar si el cloudId almacenado es válido (solo números)
            let targetCloudId: string | null = null;
            if (device.cloudId && /^\d+$/.test(device.cloudId)) {
                targetCloudId = device.cloudId;
                console.log(`🔄 [CONTROL] Usando cloudId numérico desde BD: ${device.deviceId} → ${targetCloudId}`);
            } else {
                // 2) Buscar en mapeo de memoria
                const mappedCloudId = this.deviceIdMapping.get(deviceId);
                if (mappedCloudId && /^\d+$/.test(mappedCloudId)) {
                    targetCloudId = mappedCloudId;
                    console.log(`🔄 [CONTROL] Usando cloudId desde mapeo en memoria: ${deviceId} → ${targetCloudId}`);
                } else {
                    console.warn(`⚠️ [CONTROL] cloudId no válido para ${deviceId}. BD: ${device.cloudId}, Mapeo: ${mappedCloudId}`);
                    targetCloudId = deviceId; // Fallback
                }
            }
            
            // Persistir cloudId en BD si aún no está guardado o ha cambiado
            if (!device.cloudId && /^\d+$/.test(targetCloudId)) {
                try {
                    await prisma.smartPlugDevice.update({
                        where: { id: device.id },
                        data: { cloudId: targetCloudId }
                    });
                    // Actualizar mapping en memoria
                    this.deviceIdMapping.set(device.deviceId, targetCloudId);
                    console.log(`💾 [CONTROL] cloudId persistido en BD: ${device.deviceId} → ${targetCloudId}`);
                } catch (persistErr) {
                    console.warn(`⚠️ [CONTROL] No se pudo persistir cloudId para ${device.deviceId}:`, persistErr);
                }
            }

            // Usar formato de comando Cloud según la documentación
            const command = {
                event: 'Shelly:CommandRequest',
                trid: Date.now(), // ID único para tracking
                deviceId: targetCloudId, // Usar el cloudId correcto
                data: {
                    cmd: 'relay',
                    params: { 
                        id: 0, 
                        turn: action 
                    }
                }
            };
            
            console.log(`📡 [WebSocket CMD] Enviando comando ${action} a dispositivo ${device.name} (cloudId: ${targetCloudId}):`, command);
            
            try {
                ws.send(JSON.stringify(command));
                console.log(`✅ [WebSocket CMD] Comando enviado via WebSocket Cloud`);
                
                // Log del comando enviado
                await this.logWebSocketEvent(
                    credentialId,
                    'command_sent',
                    `Comando ${action} enviado a dispositivo ${device.name}`,
                    { deviceId: device.deviceId, cloudId: targetCloudId, action, command }
                );
                
            } catch (sendError) {
                console.error(`❌ [WebSocket CMD] Error enviando comando:`, sendError);
                
                // Log del error
                await this.logWebSocketEvent(
                    credentialId,
                    'command_error',
                    `Error enviando comando ${action} a dispositivo ${device.name}`,
                    { deviceId: device.deviceId, cloudId: targetCloudId, action, error: sendError instanceof Error ? sendError.message : 'Error desconocido' }
                );
                
                throw new Error(`Error enviando comando: ${sendError instanceof Error ? sendError.message : 'Error desconocido'}`);
            }
        }
    }

    // 🎯 NUEVO: Enviar comando de cambio de nombre usando WebSocket Cloud
    async sendNameCommand(credentialId: string, deviceId: string, newName: string): Promise<void> {
        let ws = this.connections.get(credentialId);
        
        // Verificar si el WebSocket está conectado
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log(`🔄 [WebSocket NAME] WebSocket desconectado, reconectando para credencial ${credentialId}...`);
            
            // Intentar reconectar
            await this.connectCredential(credentialId);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Obtener la nueva conexión
            ws = this.connections.get(credentialId);
            
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                throw new Error('No se pudo reconectar el WebSocket para comando name');
            }
            
            console.log(`✅ [WebSocket NAME] WebSocket reconectado exitosamente`);
        }
        
        // Buscar dispositivo para obtener cloudId
        const device = await prisma.smartPlugDevice.findFirst({
            where: { deviceId: deviceId, credentialId: credentialId }
        });
        
        if (!device) {
            throw new Error(`Dispositivo ${deviceId} no encontrado para credencial ${credentialId}`);
        }
        
        // Determinar el ID correcto para el comando
        let targetCloudId = device.cloudId || device.deviceId;
        
        // Si no hay cloudId almacenado, intentar obtenerlo del mapeo en memoria
        if (!device.cloudId) {
            const mappedCloudId = this.deviceIdMapping.get(deviceId);
            if (mappedCloudId && mappedCloudId !== deviceId) {
                targetCloudId = mappedCloudId;
                console.log(`🔄 [NAME] Usando cloudId desde mapeo en memoria: ${deviceId} → ${targetCloudId}`);
            }
        }
        
        // Usar formato específico de Shelly Cloud para comando name
        const command = {
            event: 'Shelly:CommandRequest',
            trid: Date.now(),
            deviceId: targetCloudId,
            data: {
                cmd: 'name',
                name: newName
            }
        };
        
        console.log(`📡 [WebSocket NAME] Enviando comando name a dispositivo ${device.name} (cloudId: ${targetCloudId}):`, command);
        
        try {
            ws.send(JSON.stringify(command));
            console.log(`✅ [WebSocket NAME] Comando name enviado via WebSocket Cloud`);
            
            // Log del comando enviado
            await this.logWebSocketEvent(
                credentialId,
                'name_command_sent',
                `Comando name enviado a dispositivo ${device.name}`,
                { deviceId: device.deviceId, cloudId: targetCloudId, newName, command }
            );
            
        } catch (sendError) {
            console.error(`❌ [WebSocket NAME] Error enviando comando name:`, sendError);
            
            // Log del error
            await this.logWebSocketEvent(
                credentialId,
                'name_command_error',
                `Error enviando comando name a dispositivo ${device.name}`,
                { deviceId: device.deviceId, cloudId: targetCloudId, newName, error: sendError instanceof Error ? sendError.message : 'Error desconocido' }
            );
            
            throw new Error(`Error enviando comando name: ${sendError instanceof Error ? sendError.message : 'Error desconocido'}`);
        }
    }

    /**
     * Registrar evento en logs WebSocket
     */
    private async logWebSocketEvent(
        credentialId: string,
        eventType: string,
        message: string,
        metadata?: any
    ): Promise<void> {
        try {
            // Buscar la conexión WebSocket para obtener su ID y systemId
            const webSocketConnection = await prisma.webSocketConnection.findFirst({
                where: {
                    type: 'SHELLY',
                    referenceId: credentialId
                }
            });

            if (webSocketConnection) {
                await prisma.webSocketLog.create({
                    data: {
                        connectionId: webSocketConnection.id,
                        systemId: webSocketConnection.systemId, // ✅ FIX: Campo requerido
                        eventType,
                        message,
                        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
                        createdAt: new Date()
                    }
                });
            }
        } catch (error) {
            console.error('Error logging WebSocket event:', error);
        }
    }

    private async updateConnectionStatus(
        credentialId: string, 
        status: string, 
        errorMessage?: string
    ): Promise<void> {
        // Buscar conexión existente
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
                    updatedAt: new Date()
                }
            });
        } else {
            // 🛡️ AL CREAR NUEVA CONEXIÓN: Verificar estado del módulo para configurar autoReconnect
            let autoReconnectValue = true; // Valor por defecto
            let systemIdValue = ''; // Valor requerido
            
            try {
                // Obtener systemId de la credencial
                const credential = await prisma.shellyCredential.findUnique({
                    where: { id: credentialId },
                    select: { systemId: true }
                });
                
                if (credential) {
                    systemIdValue = credential.systemId; // ✅ FIX: Obtener systemId
                    
                    const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
                    const isModuleActive = await isShellyModuleActive(credential.systemId);
                    autoReconnectValue = isModuleActive;
                    
                    console.log(`🛡️ [CREATE-CONNECTION] Conexión WebSocket creada con autoReconnect=${autoReconnectValue} (módulo ${isModuleActive ? 'activo' : 'inactivo'})`);
                } else {
                    throw new Error(`Credencial ${credentialId} no encontrada`);
                }
            } catch (error) {
                console.warn('⚠️ [CREATE-CONNECTION] Error verificando módulo:', error);
                throw error; // No crear conexión si no podemos obtener systemId
            }

            await prisma.webSocketConnection.create({
                data: {
                    type: 'SHELLY',
                    referenceId: credentialId,
                    systemId: systemIdValue, // ✅ FIX: Campo requerido
                    status,
                    errorMessage,
                    autoReconnect: autoReconnectValue // 🛡️ CONFIGURAR SEGÚN ESTADO DEL MÓDULO
                }
            });
        }
    }

    // ELIMINADO: Verificación periódica HTTP - solo WebSocket tiempo real

    async disconnectCredential(credentialId: string): Promise<void> {
        const ws = this.connections.get(credentialId);
        if (ws) {
            ws.close();
        }
        
        const timer = this.reconnectTimers.get(credentialId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(credentialId);
        }

        // ELIMINADO: Limpieza de intervalos HTTP - solo WebSocket
        
        this.connections.delete(credentialId);
        this.messageQueues.delete(credentialId);
    }

    async disconnectAll(): Promise<void> {
        for (const credentialId of this.connections.keys()) {
            await this.disconnectCredential(credentialId);
        }
    }

    // 🔍 NUEVO: Verificar estado de conexiones
    getConnectionStatus(credentialId: string): { connected: boolean; readyState?: number } {
        const ws = this.connections.get(credentialId);
        
        if (!ws) {
            return { connected: false };
        }
        
        return {
            connected: ws.readyState === WebSocket.OPEN,
            readyState: ws.readyState
        };
    }

    // 🔄 NUEVO: Forzar reconexión de una credencial específica
    async forceReconnect(credentialId: string): Promise<void> {
        console.log(`🔄 Forzando reconexión para credencial ${credentialId}...`);
        
        // Cerrar conexión existente si existe
        const existingWs = this.connections.get(credentialId);
        if (existingWs) {
            existingWs.close();
            this.connections.delete(credentialId);
        }
        
        // Crear nueva conexión
        await this.connectCredential(credentialId);
    }

    // 🔍 NUEVO: Obtener mapeo automático para una credencial
    getAutoMapping(credentialId: string): Record<string, string> | null {
        const mapping: Record<string, string> = {};
        let hasMapping = false;
        
        // Convertir Map a Object para la credencial específica
        for (const [deviceId, cloudId] of this.deviceIdMapping.entries()) {
            mapping[deviceId] = cloudId;
            hasMapping = true;
        }
        
        return hasMapping ? mapping : null;
    }

    // ================== EXTENSION: Limpieza automática ==================

    /**
     * Elimina conexiones WebSocket registradas que ya no tienen credencial válida
     * o cuyo estado esté marcado como disconnected.
     */
    async cleanupZombieConnections(): Promise<void> {
        const zombies = await prisma.webSocketConnection.findMany({
            where: { type: 'SHELLY' },
            select: { id: true, referenceId: true, status: true }
        })

        for (const z of zombies) {
            const cred = await prisma.shellyCredential.findUnique({
                where: { id: z.referenceId },
                select: { id: true, status: true }
            })

            if (!cred || cred.status !== 'connected') {
                console.warn(`🧹 [CLEANUP] Cerrando conexión fantasma ${z.id} (cred=${z.referenceId})`)
                await this.disconnectCredential(z.referenceId).catch(() => {})
                await prisma.webSocketConnection.delete({ where: { id: z.id } }).catch(() => {})
            }
        }
    }

    /**
     * Revisa SmartPlugDevice y limpia cloudId que sean iguales al deviceId (hex MAC).
     */
    async sanitizeCloudIds(): Promise<void> {
        const devices = await prisma.smartPlugDevice.findMany({
            select: { id: true, deviceId: true, cloudId: true }
        })
        const toFix = devices.filter(d => d.cloudId && d.cloudId.toLowerCase() === d.deviceId.toLowerCase())
        for (const d of toFix) {
            await prisma.smartPlugDevice.update({
                where: { id: d.id },
                data: { cloudId: null }
            })
            console.info(`🔧 [SANITIZE] cloudId removido para ${d.deviceId}`)
        }
    }
}

// ================= INIT SINGLETON GLOBAL ============================
// Usamos globalThis para garantizar que TODOS los bundles/compilaciones de
// Next.js (API routes, RSC, edge, etc.) compartan **la misma instancia** y
// evitemos el problema de “callbacks no configurados” cuando hay múltiples
// imports con rutas distintas.

const g = globalThis as any;

if (!g.__shellyWebSocketManager__) {
  g.__shellyWebSocketManager__ = new ShellyWebSocketManager();
}

export const shellyWebSocketManager: ShellyWebSocketManager = g.__shellyWebSocketManager__;

// ================= INIT CLEANUP (una sola vez) ======================
if (!g.__shellyWebSocketManager__initialized__) {
  (async () => {
    try {
      await shellyWebSocketManager.cleanupZombieConnections();
      await shellyWebSocketManager.sanitizeCloudIds();
    } catch (e) {
      console.warn('⚠️ Error en rutina de limpieza inicial:', e);
    }
  })();
  g.__shellyWebSocketManager__initialized__ = true;
} 