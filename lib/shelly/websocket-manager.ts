import { PrismaClient } from '@prisma/client';
import { decrypt } from './crypto';

const prisma = new PrismaClient();

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

    async connectCredential(credentialId: string): Promise<void> {
        try {
            // Obtener credenciales
            const credential = await prisma.shellyCredential.findUnique({
                where: { id: credentialId }
            });

            if (!credential) {
                throw new Error('Credenciales no encontradas');
            }

            // Descifrar token
            const accessToken = decrypt(credential.accessToken);
            
            // Crear URL WebSocket segura (WSS)
            const wsUrl = credential.apiHost.replace('https://', 'wss://') + '/ws';
            
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
            
        } catch (error) {
            console.error(`Error conectando credential ${credentialId}:`, error);
            await this.updateConnectionStatus(credentialId, 'error', error instanceof Error ? error.message : 'Error desconocido');
        }
    }

    private async handleOpen(credentialId: string): Promise<void> {
        console.log(`WebSocket conectado para credential ${credentialId}`);
        
        // Limpiar timer de reconexión si existe
        const timer = this.reconnectTimers.get(credentialId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(credentialId);
        }
        
        // Autenticar
        const credential = await prisma.shellyCredential.findUnique({
            where: { id: credentialId }
        });
        
        if (credential) {
            const accessToken = decrypt(credential.accessToken);
            this.sendMessage(credentialId, {
                id: this.messageIdCounter++,
                src: 'user',
                dst: 'ws',
                method: 'Shelly.Authenticate',
                params: {
                    auth: {
                        token: accessToken
                    }
                }
            });
        }
        
        // Procesar cola de mensajes pendientes
        const queue = this.messageQueues.get(credentialId);
        if (queue && queue.length > 0) {
            queue.forEach(msg => this.sendMessage(credentialId, msg));
            this.messageQueues.set(credentialId, []);
        }
    }

    private async handleMessage(credentialId: string, event: MessageEvent): Promise<void> {
        try {
            // Validar tamaño del mensaje
            if (event.data.length > this.MAX_MESSAGE_SIZE) {
                console.error(`Mensaje demasiado grande: ${event.data.length} bytes`);
                return;
            }

            // Validar y parsear JSON
            const data: ShellyWebSocketMessage = this.validateMessage(JSON.parse(event.data));
            
            // Manejar notificaciones de estado
            if (data.method === 'NotifyStatus' && data.params) {
                await this.handleDeviceStatusUpdate(credentialId, data.src, data.params);
            }
            
            // Manejar respuestas a comandos
            if (data.result !== undefined || data.error !== undefined) {
                console.log(`Respuesta comando:`, data);
            }
            
        } catch (error) {
            console.error('Error procesando mensaje WebSocket:', error);
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

    private async handleDeviceStatusUpdate(
        credentialId: string, 
        deviceId: string, 
        status: DeviceStatus
    ): Promise<void> {
        // Actualizar estado del dispositivo en DB
        const device = await prisma.smartPlugDevice.findFirst({
            where: {
                deviceId,
                credentialId
            }
        });
        
        if (device) {
            const updatedData = {
                online: status.online,
                relayOn: status['switch:0']?.output,
                lastSeenAt: new Date()
            };

            await prisma.smartPlugDevice.update({
                where: { id: device.id },
                data: updatedData
            });
            
            console.log(`Dispositivo actualizado: ${device.deviceId}`, updatedData);
        }
    }

    private async handleError(credentialId: string, error: Event): Promise<void> {
        console.error(`WebSocket error para credential ${credentialId}:`, error);
        await this.updateConnectionStatus(credentialId, 'error', 'Error de conexión');
    }

    private async handleClose(credentialId: string): Promise<void> {
        console.log(`WebSocket cerrado para credential ${credentialId}`);
        
        // Actualizar estado
        await this.updateConnectionStatus(credentialId, 'disconnected');
        
        // Limpiar conexión
        this.connections.delete(credentialId);
        
        // Programar reconexión
        const timer = setTimeout(() => {
            console.log(`Intentando reconectar credential ${credentialId}...`);
            this.connectCredential(credentialId);
        }, 5000); // Reconectar después de 5 segundos
        
        this.reconnectTimers.set(credentialId, timer);
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
            await prisma.webSocketConnection.create({
                data: {
                    type: 'SHELLY',
                    referenceId: credentialId,
                    status,
                    errorMessage
                }
            });
        }
    }

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
        
        this.connections.delete(credentialId);
        this.messageQueues.delete(credentialId);
    }

    async disconnectAll(): Promise<void> {
        for (const credentialId of this.connections.keys()) {
            await this.disconnectCredential(credentialId);
        }
    }
}

// Singleton
export const shellyWebSocketManager = new ShellyWebSocketManager(); 