import { PrismaClient } from '@prisma/client';
import { shellyWebSocketManager } from './websocket-manager';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! // Service key para operaciones del servidor
);

interface WorkerConfig {
    healthCheckInterval: number; // ms
    connectionRetryInterval: number; // ms
    maxRetries: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

class ShellyWebSocketWorker {
    private config: WorkerConfig;
    private isRunning: boolean = false;
    private healthCheckTimer?: NodeJS.Timeout;
    private connectionCheckTimer?: NodeJS.Timeout;
    private metrics = {
        totalConnections: 0,
        activeConnections: 0,
        failedConnections: 0,
        messagesReceived: 0,
        messagesSent: 0,
        lastHealthCheck: new Date()
    };

    constructor(config: Partial<WorkerConfig> = {}) {
        this.config = {
            healthCheckInterval: 30000, // 30 segundos
            connectionRetryInterval: 60000, // 1 minuto
            maxRetries: 3,
            logLevel: 'info',
            ...config
        };
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            this.log('warn', 'Worker ya está en ejecución');
            return;
        }

        this.log('info', 'Iniciando Shelly WebSocket Worker...');
        this.isRunning = true;

        // Iniciar conexiones existentes
        await this.initializeConnections();

        // Configurar health checks
        this.startHealthChecks();

        // Configurar verificación de conexiones
        this.startConnectionChecks();

        // Escuchar cambios en credenciales
        await this.subscribeToCredentialChanges();

        this.log('info', 'Worker iniciado exitosamente');
    }

    async stop(): Promise<void> {
        this.log('info', 'Deteniendo Worker...');
        this.isRunning = false;

        // Limpiar timers
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        if (this.connectionCheckTimer) {
            clearInterval(this.connectionCheckTimer);
        }

        // Desconectar todos los WebSockets
        await shellyWebSocketManager.disconnectAll();

        this.log('info', 'Worker detenido');
    }

    private async initializeConnections(): Promise<void> {
        try {
            // 🛡️ VERIFICAR MÓDULO SHELLY ACTIVO ANTES DE CARGAR CREDENCIALES
            const firstSystemWithCredentials = await prisma.shellyCredential.findFirst({
                select: { systemId: true }
            });
            
            if (firstSystemWithCredentials) {
                const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
                const isModuleActive = await isShellyModuleActive(firstSystemWithCredentials.systemId);
                
                if (!isModuleActive) {
                    this.log('warn', '🔒 Módulo Shelly INACTIVO - Omitiendo inicialización de credenciales');
                    return;
                }
            }
            
            // Obtener todas las credenciales activas solo si módulo está activo
            const credentials = await prisma.shellyCredential.findMany({
                where: {
                    status: 'connected'
                }
            });

            this.log('info', `Inicializando ${credentials.length} conexiones...`);

            for (const credential of credentials) {
                try {
                    await shellyWebSocketManager.connectCredential(credential.id);
                    this.metrics.totalConnections++;
                    this.metrics.activeConnections++;
                } catch (error) {
                    this.log('error', `Error conectando credential ${credential.id}:`, error);
                    this.metrics.failedConnections++;
                }
            }
        } catch (error) {
            this.log('error', 'Error inicializando conexiones:', error);
        }
    }

    private startHealthChecks(): void {
        this.healthCheckTimer = setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.healthCheckInterval);

        // Ejecutar inmediatamente
        this.performHealthCheck();
    }

    private async performHealthCheck(): Promise<void> {
        this.log('debug', 'Ejecutando health check...');
        
        try {
            // Obtener estado de todas las conexiones Shelly (sin filtrar por systemId ya que el worker maneja todos los sistemas)
            const connections = await prisma.webSocketConnection.findMany({
                where: { type: 'SHELLY' },
                include: { system: { select: { id: true, name: true } } }
            });

            const activeCount = connections.filter(c => c.status === 'connected').length;
            const errorCount = connections.filter(c => c.status === 'error').length;
            
            this.metrics.activeConnections = activeCount;
            this.metrics.lastHealthCheck = new Date();

            // Actualizar métricas en Supabase
            await this.updateMetricsInSupabase();

            // Alertar si hay muchos errores
            if (errorCount > connections.length * 0.5) {
                this.log('warn', `Alto número de conexiones con error: ${errorCount}/${connections.length}`);
                await this.sendAlert('high_error_rate', {
                    errorCount,
                    totalCount: connections.length
                });
            }

            this.log('debug', `Health check completado: ${activeCount} activas, ${errorCount} errores`);
            
        } catch (error) {
            this.log('error', 'Error en health check:', error);
        }
    }

    private startConnectionChecks(): void {
        this.connectionCheckTimer = setInterval(async () => {
            await this.checkAndReconnect();
        }, this.config.connectionRetryInterval);
    }

    private async checkAndReconnect(): Promise<void> {
        try {
            // 🛡️ VERIFICAR MÓDULO SHELLY ACTIVO ANTES DE RECONECTAR
            const firstCredential = await prisma.shellyCredential.findFirst({
                select: { systemId: true }
            });
            
            if (firstCredential) {
                const { isShellyModuleActive } = await import('@/lib/services/shelly-module-service');
                const isModuleActive = await isShellyModuleActive(firstCredential.systemId);
                
                if (!isModuleActive) {
                    this.log('warn', '🔒 Módulo Shelly INACTIVO - Omitiendo verificación de reconexiones');
                    return;
                }
            }
            
            // Buscar conexiones desconectadas o con error solo si módulo está activo
            const problemConnections = await prisma.webSocketConnection.findMany({
                where: {
                    type: 'SHELLY',
                    status: { in: ['disconnected', 'error'] }
                },
                include: { system: { select: { id: true, name: true } } }
            });

            for (const connection of problemConnections) {
                // Verificar si la credencial sigue activa
                const credential = await prisma.shellyCredential.findUnique({
                    where: { id: connection.referenceId }
                });

                if (credential && credential.status === 'connected') {
                    this.log('info', `Intentando reconectar credential ${credential.id}`);
                    try {
                        await shellyWebSocketManager.connectCredential(credential.id);
                    } catch (error) {
                        this.log('error', `Fallo al reconectar ${credential.id}:`, error);
                    }
                }
            }
        } catch (error) {
            this.log('error', 'Error en verificación de conexiones:', error);
        }
    }

    private async subscribeToCredentialChanges(): Promise<void> {
        // Suscribirse a cambios en la tabla de credenciales
        const channel = supabase
            .channel('shelly-credentials-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'saasavatar',
                    table: 'shelly_credentials'
                },
                async (payload) => {
                    await this.handleCredentialChange(payload);
                }
            )
            .subscribe();

        this.log('info', 'Suscrito a cambios de credenciales');
    }

    private async handleCredentialChange(payload: any): Promise<void> {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
                if (newRecord.status === 'connected') {
                    this.log('info', `Nueva credencial detectada: ${newRecord.id}`);
                    await shellyWebSocketManager.connectCredential(newRecord.id);
                }
                break;

            case 'UPDATE':
                if (oldRecord.status !== 'connected' && newRecord.status === 'connected') {
                    // Credencial reactivada
                    this.log('info', `Credencial reactivada: ${newRecord.id}`);
                    await shellyWebSocketManager.connectCredential(newRecord.id);
                } else if (oldRecord.status === 'connected' && newRecord.status !== 'connected') {
                    // Credencial desactivada
                    this.log('info', `Credencial desactivada: ${newRecord.id}`);
                    await shellyWebSocketManager.disconnectCredential(newRecord.id);
                }
                break;

            case 'DELETE':
                this.log('info', `Credencial eliminada: ${oldRecord.id}`);
                await shellyWebSocketManager.disconnectCredential(oldRecord.id);
                break;
        }
    }

    private async updateMetricsInSupabase(): Promise<void> {
        try {
            // Crear o actualizar registro de métricas
            const { error } = await supabase
                .from('websocket_metrics')
                .upsert({
                    id: 'shelly-worker',
                    type: 'SHELLY',
                    metrics: this.metrics,
                    updated_at: new Date().toISOString()
                });

            if (error) {
                this.log('error', 'Error actualizando métricas:', error);
            }
        } catch (error) {
            this.log('error', 'Error conectando con Supabase:', error);
        }
    }

    private async sendAlert(type: string, data: any): Promise<void> {
        try {
            // Enviar alerta a través de Supabase
            const { error } = await supabase
                .from('system_alerts')
                .insert({
                    type: 'websocket_alert',
                    subtype: type,
                    severity: 'warning',
                    data,
                    created_at: new Date().toISOString()
                });

            if (error) {
                this.log('error', 'Error enviando alerta:', error);
            }
        } catch (error) {
            this.log('error', 'Error en sistema de alertas:', error);
        }
    }

    private log(level: string, message: string, error?: any): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        switch (level) {
            case 'debug':
                if (this.config.logLevel === 'debug') console.debug(logMessage, error);
                break;
            case 'info':
                if (['debug', 'info'].includes(this.config.logLevel)) console.info(logMessage, error);
                break;
            case 'warn':
                if (['debug', 'info', 'warn'].includes(this.config.logLevel)) console.warn(logMessage, error);
                break;
            case 'error':
                console.error(logMessage, error);
                break;
        }

        // Guardar logs importantes en base de datos
        if (['warn', 'error'].includes(level)) {
            this.saveLog(level, message, error);
        }
    }

    private async saveLog(level: string, message: string, error?: any): Promise<void> {
        try {
            await prisma.entityChangeLog.create({
                data: {
                    entityType: 'DEVICE',
                    entityId: 'shelly-worker',
                    action: 'SYSTEM_LOG',
                    details: {
                        level,
                        message,
                        error: error ? error.toString() : undefined,
                        timestamp: new Date().toISOString()
                    },
                    userId: null,
                    systemId: 'system'
                }
            });
        } catch (dbError) {
            console.error('Error guardando log en BD:', dbError);
        }
    }
}

// Exportar singleton
export const shellyWorker = new ShellyWebSocketWorker();

// Función para iniciar el worker
export async function startShellyWorker(config?: Partial<WorkerConfig>): Promise<void> {
    const worker = new ShellyWebSocketWorker(config);
    await worker.start();
    
    // Manejar cierre graceful
    process.on('SIGINT', async () => {
        console.log('\nRecibido SIGINT, cerrando worker...');
        await worker.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\nRecibido SIGTERM, cerrando worker...');
        await worker.stop();
        process.exit(0);
    });
} 