import { prisma } from '@/lib/db';
import { decrypt } from './crypto';
import { 
  webSocketManager, 
  SHELLY_CONFIG, 
  ConnectionConfig, 
  MessagePriority,
  ConnectionStatus
} from '../websocket';
import { webSocketConnectionService } from '../websocket/connection-service';

interface ShellyDeviceUpdate {
  deviceId: string;
  online: boolean;
  relayOn: boolean;
  currentPower: number;
  voltage: number | null;
  temperature: number | null;
}

export class ShellyRobustWebSocketManager {
  private credentialConnections: Map<string, string> = new Map(); // credentialId -> connectionId
  private deviceMapping: Map<string, string> = new Map(); // deviceId -> credentialId

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Escuchar mensajes recibidos
    webSocketManager.getEventBus().on('message:received', (data) => {
      this.handleShellyMessage(data.connectionId, data.message.payload);
    });

    // Escuchar errores de conexión
    webSocketManager.getEventBus().on('connection:error', (data) => {
      console.error(`🔴 Error en conexión Shelly:`, data.error?.message);
    });

    // Escuchar reconexiones
    webSocketManager.getEventBus().on('connection:reconnecting', (data) => {
      console.log(`🔄 Reconectando Shelly (intento ${data.metadata?.attempt})`);
    });

    // Escuchar conexiones exitosas
    webSocketManager.getEventBus().on('connection:opened', (data) => {
      console.log(`✅ Shelly WebSocket conectado: ${data.connectionId}`);
    });
  }

  async connectCredential(credentialId: string): Promise<void> {
    try {
      // Verificar si ya está conectado en memoria
      if (this.credentialConnections.has(credentialId)) {
        console.log(`⚠️ Credencial ${credentialId} ya está conectada en memoria`);
        return;
      }

      // Obtener credenciales de la BD
      const credential = await prisma.shellyCredential.findUnique({
        where: { id: credentialId },
        include: {
          smartPlugs: {
            where: { excludeFromSync: false }
          }
        }
      });

      if (!credential) {
        throw new Error(`Credencial ${credentialId} no encontrada`);
      }

      // 🛡️ VERIFICAR MÓDULO SHELLY ACTIVO ANTES DE CONECTAR
      const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
      const isModuleActive = await isShellyModuleActive(credential.systemId);
      
      if (!isModuleActive) {
        console.warn(`🔒 [ROBUST-CONNECT] Módulo Shelly INACTIVO para sistema ${credential.systemId} - Conexión bloqueada`);
        throw new Error('Módulo de control de enchufes inteligentes Shelly está desactivado');
      }

      // Buscar o crear conexión reutilizable en BD
      const { id: dbConnectionId, isNew } = await webSocketConnectionService.findOrCreateConnection({
        type: 'SHELLY',
        referenceId: credentialId,
        systemId: credential.systemId,
        status: 'connecting',
        metadata: {
          credentialName: credential.name,
          deviceCount: credential.smartPlugs.length,
          lastConnectionAttempt: new Date().toISOString()
        }
      });

      // Log del evento de conexión
      await webSocketConnectionService.logEvent({
        connectionId: dbConnectionId,
        eventType: 'connect',
        message: `Iniciando conexión para ${credential.name}`,
        systemId: credential.systemId,
        metadata: {
          credentialId,
          deviceCount: credential.smartPlugs.length,
          isReconnection: !isNew
        }
      });

      // Mapear dispositivos
      credential.smartPlugs.forEach(device => {
        this.deviceMapping.set(device.deviceId, credentialId);
      });

      // Descifrar token
      const accessToken = decrypt(credential.accessToken);
      
      // Crear URL WebSocket
      const baseUrl = credential.apiHost.replace('https://', '');
      const wsUrl = `wss://${baseUrl}:6113/shelly/wss/hk_sock?t=${accessToken}`;
      
      // Configuración para Shelly
      const config: ConnectionConfig = {
        url: wsUrl,
        ...SHELLY_CONFIG,
        metadata: {
          type: 'shelly',
          credentialId,
          credentialName: credential.name,
          deviceCount: credential.smartPlugs.length,
          dbConnectionId // Agregar referencia a la BD
        },
        tags: ['shelly', credentialId]
      };

      // Conectar usando el manager robusto
      const connectionId = await webSocketManager.connect(config);
      this.credentialConnections.set(credentialId, connectionId);

      // Marcar como conectado en BD
      await webSocketConnectionService.markAsConnected(
        'SHELLY', 
        credentialId, 
        {
          credentialName: credential.name,
          deviceCount: credential.smartPlugs.length,
          connectedAt: new Date().toISOString(),
          wsConnectionId: connectionId
        }
      );

      console.log(`🔗 Shelly ${isNew ? 'conectado' : 'reconectado'}: ${credential.name} (${credential.smartPlugs.length} dispositivos)`);

    } catch (error) {
      console.error(`❌ Error conectando Shelly ${credentialId}:`, error);
      
      // Marcar como error en BD
      await webSocketConnectionService.markAsError(
        'SHELLY', 
        credentialId, 
        error instanceof Error ? error.message : 'Error desconocido'
      );

      // Log del error
      const credential = await prisma.shellyCredential.findUnique({
        where: { id: credentialId },
        select: { systemId: true }
      });
      
      if (credential) {
        const connection = await webSocketConnectionService.getConnection('SHELLY', credentialId, credential.systemId);
        if (connection) {
          await webSocketConnectionService.logEvent({
            connectionId: connection.id,
            eventType: 'error',
            errorDetails: error instanceof Error ? error.message : 'Error desconocido',
            systemId: credential.systemId,
            metadata: { credentialId }
          });
        }
      }

      throw error;
    }
  }

  async disconnectCredential(credentialId: string): Promise<void> {
    const connectionId = this.credentialConnections.get(credentialId);
    if (connectionId) {
      await webSocketManager.disconnect(connectionId);
      this.credentialConnections.delete(credentialId);
      
      // Limpiar mapeo de dispositivos
      for (const [deviceId, mappedCredentialId] of this.deviceMapping.entries()) {
        if (mappedCredentialId === credentialId) {
          this.deviceMapping.delete(deviceId);
        }
      }

      // Marcar como desconectado en BD
      await webSocketConnectionService.markAsDisconnected('SHELLY', credentialId, 'Manual disconnect');

      // Log del evento
      const credential = await prisma.shellyCredential.findUnique({
        where: { id: credentialId },
        select: { systemId: true }
      });
      
      if (credential) {
        const connection = await webSocketConnectionService.getConnection('SHELLY', credentialId, credential.systemId);
        if (connection) {
          await webSocketConnectionService.logEvent({
            connectionId: connection.id,
            eventType: 'disconnect',
            message: 'Desconexión manual',
            systemId: credential.systemId,
            metadata: { credentialId }
          });
        }
      }

      console.log(`🔌 Shelly desconectado: ${credentialId}`);
    }
  }

  async sendCommand(credentialId: string, deviceId: string, command: any): Promise<void> {
    const connectionId = this.credentialConnections.get(credentialId);
    if (!connectionId) {
      throw new Error(`Credencial ${credentialId} no está conectada`);
    }

    const message = {
      id: Date.now(),
      src: 'user',
      dst: deviceId,
      method: command.method,
      params: command.params
    };

    await webSocketManager.send(connectionId, message, MessagePriority.HIGH);
  }

  private async handleShellyMessage(connectionId: string, data: any): Promise<void> {
    try {
      // Buscar credencial por connectionId
      const credentialId = Array.from(this.credentialConnections.entries())
        .find(([_, connId]) => connId === connectionId)?.[0];

      if (!credentialId) {
        console.warn(`⚠️ Mensaje de conexión desconocida: ${connectionId}`);
        return;
      }

      // Manejar eventos de cambio de estado
      if (data.method === 'Shelly:StatusOnChange' && data.data) {
        const deviceId = data.data.device_id;
        const deviceStatus = data.data;
        
        const update: ShellyDeviceUpdate = {
          deviceId,
          online: true, // Si recibimos el mensaje, está online
          relayOn: deviceStatus['switch:0']?.output || deviceStatus.relays?.[0]?.ison || false,
          currentPower: deviceStatus['switch:0']?.apower || deviceStatus.meters?.[0]?.power || 0,
          voltage: deviceStatus['switch:0']?.voltage || null,
          temperature: deviceStatus.temperature || null
        };

        await this.updateDeviceStatus(credentialId, update);
      }

    } catch (error) {
      console.error('❌ Error procesando mensaje Shelly:', error);
    }
  }

  private async updateDeviceStatus(credentialId: string, update: ShellyDeviceUpdate): Promise<void> {
    try {
      // Actualizar en BD
      const device = await prisma.smartPlugDevice.findFirst({
        where: {
          deviceId: update.deviceId,
          credentialId
        }
      });

      if (device) {
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

        console.log(`🔄 Shelly actualizado: ${device.name} (${update.relayOn ? 'ON' : 'OFF'}, ${update.currentPower}W)`);

        // Emitir evento para el frontend (Socket.io)
        // TODO: Integrar con Socket.io existente
      }

    } catch (error) {
      console.error('❌ Error actualizando dispositivo:', error);
    }
  }

  // Método obsoleto - ahora usamos webSocketConnectionService
  // Mantenido para compatibilidad temporal
  private async updateConnectionStatus(
    credentialId: string, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    console.warn('⚠️ updateConnectionStatus está obsoleto, usar webSocketConnectionService');
    await webSocketConnectionService.updateConnectionStatus('SHELLY', credentialId, status as any, errorMessage);
  }

  // Obtener métricas del sistema
  getMetrics() {
    const baseMetrics = webSocketManager.getMetrics();
    const shellyConnections = this.credentialConnections.size;
    const totalDevices = this.deviceMapping.size;

    return {
      ...baseMetrics,
      shellyConnections,
      totalDevices,
      avgDevicesPerConnection: shellyConnections > 0 ? totalDevices / shellyConnections : 0
    };
  }

  // Health check específico para Shelly
  async healthCheck() {
    const connectionIds = Array.from(this.credentialConnections.values());
    const results = await webSocketManager.healthCheck();
    
    return results.filter(result => 
      connectionIds.includes(result.connectionId)
    );
  }

  // Inicializar todas las credenciales conectadas
  async initializeAll(): Promise<void> {
    try {
      // 🛡️ VERIFICAR MÓDULO SHELLY ACTIVO ANTES DE INICIALIZAR
      const firstCredential = await prisma.shellyCredential.findFirst({
        select: { systemId: true }
      });
      
      if (firstCredential) {
        const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
        const isModuleActive = await isShellyModuleActive(firstCredential.systemId);
        
        if (!isModuleActive) {
          console.warn('🔒 Módulo Shelly INACTIVO - Omitiendo inicialización completa de credenciales');
          return;
        }
      }
      
      const credentials = await prisma.shellyCredential.findMany({
        where: { status: 'connected' },
        include: { smartPlugs: true }
      });

      console.log(`🚀 Inicializando ${credentials.length} credenciales Shelly...`);

      for (const credential of credentials) {
        try {
          await this.connectCredential(credential.id);
        } catch (error) {
          console.error(`❌ Error inicializando ${credential.name}:`, error);
        }
      }

      console.log(`✅ Sistema Shelly inicializado`);
    } catch (error) {
      console.error('❌ Error inicializando sistema Shelly:', error);
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    const credentialIds = Array.from(this.credentialConnections.keys());
    
    for (const credentialId of credentialIds) {
      await this.disconnectCredential(credentialId);
    }

    this.credentialConnections.clear();
    this.deviceMapping.clear();
  }
}

// Singleton para uso global con inicialización lazy
let _shellyRobustManager: ShellyRobustWebSocketManager | null = null;

export function getShellyRobustManager(): ShellyRobustWebSocketManager {
  if (!_shellyRobustManager) {
    _shellyRobustManager = new ShellyRobustWebSocketManager();
  }
  return _shellyRobustManager;
}

// Para compatibilidad con código existente
export const shellyRobustManager = {
  connectCredential: (credentialId: string) => getShellyRobustManager().connectCredential(credentialId),
  disconnectCredential: (credentialId: string) => getShellyRobustManager().disconnectCredential(credentialId),
  sendCommand: (credentialId: string, deviceId: string, command: any) => getShellyRobustManager().sendCommand(credentialId, deviceId, command),
  getMetrics: () => getShellyRobustManager().getMetrics(),
  healthCheck: () => getShellyRobustManager().healthCheck(),
  initializeAll: () => getShellyRobustManager().initializeAll(),
  destroy: () => getShellyRobustManager().destroy()
}; 