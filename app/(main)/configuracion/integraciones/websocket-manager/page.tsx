"use client";

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Activity, 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    RefreshCw,
    Play,
    Square,
    RotateCcw,
    ArrowLeft,
    Eye,
    Clock,
    Zap,
    Wifi,
    WifiOff,
    Settings,
    Download
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import WebSocketLogs from '@/components/websocket/websocket-logs';

interface WebSocketConnection {
    id: string;
    name: string;
    description: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'error';
    connectedAt: Date | null;
    lastHeartbeat: Date | null;
    messagesSent: number;
    messagesReceived: number;
    errors: number;
    url?: string;
    type: string;
}

interface WebSocketStats {
    totalConnections: number;
    activeConnections: number;
    totalMessages: number;
    totalErrors: number;
    byType: Record<string, number>;
}

// Componente memoizado para tarjetas de estadísticas
const StatsCard = memo(({ title, value, subtitle, icon: Icon, color = "text-gray-900" }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
}) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="flex gap-2 items-center text-sm font-medium">
                <Icon className="w-4 h-4" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${color}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </CardContent>
    </Card>
));

StatsCard.displayName = 'StatsCard';

// Componente memoizado para filas de conexión
const ConnectionRow = memo(({ connection, onAction }: {
    connection: WebSocketConnection;
    onAction: (id: string, action: 'start' | 'stop' | 'restart') => void;
}) => {
    const formatUptime = useCallback((connectedAt: Date | null) => {
        if (!connectedAt) return 'Desconectado';
        
        const now = new Date();
        const diff = now.getTime() - connectedAt.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }, []);

    const getStatusBadge = useCallback((status: WebSocketConnection['status']) => {
        switch (status) {
            case 'connected':
                return <Badge className="text-white bg-green-500"><CheckCircle className="mr-1 w-3 h-3" />Conectado</Badge>;
            case 'disconnected':
                return <Badge className="text-white bg-red-500"><XCircle className="mr-1 w-3 h-3" />Desconectado</Badge>;
            case 'connecting':
                return <Badge className="text-white bg-yellow-500"><RefreshCw className="mr-1 w-3 h-3 animate-spin" />Conectando</Badge>;
            case 'error':
                return <Badge className="text-white bg-red-600"><AlertTriangle className="mr-1 w-3 h-3" />Error</Badge>;
            default:
                return <Badge variant="secondary">Desconocido</Badge>;
        }
    }, []);

    return (
        <TableRow>
            <TableCell>
                <div>
                    <div className="font-medium">{connection.name}</div>
                    <div className="text-sm text-gray-500">{connection.description}</div>
                </div>
            </TableCell>
            <TableCell>
                {getStatusBadge(connection.status)}
            </TableCell>
            <TableCell>
                <Badge variant="outline">{connection.type}</Badge>
            </TableCell>
            <TableCell>
                {formatUptime(connection.connectedAt)}
            </TableCell>
            <TableCell>
                <div className="text-sm">
                    <div>↑ {connection.messagesSent}</div>
                    <div>↓ {connection.messagesReceived}</div>
                </div>
            </TableCell>
            <TableCell>
                {connection.errors > 0 ? (
                    <Badge variant="destructive">{connection.errors}</Badge>
                ) : (
                    <Badge variant="outline">0</Badge>
                )}
            </TableCell>
            <TableCell>
                {connection.lastHeartbeat ? (
                    <span className="text-sm text-gray-600">
                        {connection.lastHeartbeat.toLocaleTimeString()}
                    </span>
                ) : (
                    <span className="text-sm text-gray-400">-</span>
                )}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                    {connection.status === 'connected' ? (
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onAction(connection.id, 'stop')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Detener conexión"
                        >
                            <Square className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onAction(connection.id, 'start')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Iniciar conexión"
                        >
                            <Play className="w-4 h-4" />
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onAction(connection.id, 'restart')}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Reiniciar conexión"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});

ConnectionRow.displayName = 'ConnectionRow';

export default function WebSocketManagerPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [connections, setConnections] = useState<WebSocketConnection[]>([]);
    const [stats, setStats] = useState<WebSocketStats>({
        totalConnections: 0,
        activeConnections: 0,
        totalMessages: 0,
        totalErrors: 0,
        byType: {}
    });
    const [logs, setLogs] = useState<any[]>([]);
    const [metrics, setMetrics] = useState<any>({});
    const [activeTab, setActiveTab] = useState('connections');
    const [socketVersionInfo, setSocketVersionInfo] = useState<{ current: string; latest: string; hasUpdate: boolean; releaseNotes: string } | null>(null);
    const [checkingVersion, setCheckingVersion] = useState(false);
    const [updating, setUpdating] = useState(false);

    const fetchMetrics = useCallback(async () => {
        try {
            const response = await fetch('/api/shelly/metrics');
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            } else {
                console.error('Error al obtener métricas');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }, []);

    const fetchConnections = useCallback(async () => {
        setIsLoading(true);
        try {
            // Obtener conexiones reales de la base de datos
            const response = await fetch('/api/internal/websocket-connections');
            if (!response.ok) {
                throw new Error('Error al obtener conexiones');
            }
            
            const { connections: dbConnections, logs: dbLogs, messageStats } = await response.json();
            
            // Mapear conexiones de BD a formato de UI
            const mappedConnections: WebSocketConnection[] = dbConnections.map((conn: any) => {
                const connectionLogs = conn.logs || [];
                
                // Calcular mensajes enviados y recibidos desde logs de la conexión
                let messagesSent = 0;
                let messagesReceived = 0;
                
                connectionLogs.forEach((log: any) => {
                    if (log.eventType === 'message') {
                        if (log.message?.includes('sent') || log.message?.includes('enviado') || log.message?.includes('Sending')) {
                            messagesSent++;
                        } else if (log.message?.includes('received') || log.message?.includes('recibido') || log.message?.includes('Received')) {
                            messagesReceived++;
                        } else {
                            // Si no está claro, contar como recibido por defecto
                            messagesReceived++;
                        }
                    }
                });
                
                return {
                    id: conn.id,
                    name: conn.metadata?.alias || `Conexión ${conn.type}`,
                    description: conn.metadata?.description || `Conexión ${conn.type} para ${conn.referenceId}`,
                    type: conn.type,
                    status: conn.status === 'connected' ? 'connected' : 
                           conn.status === 'error' ? 'error' : 'disconnected',
                    connectedAt: conn.status === 'connected' ? new Date(conn.createdAt) : null,
                    lastHeartbeat: conn.lastPingAt ? new Date(conn.lastPingAt) : null,
                    messagesSent,
                    messagesReceived,
                    errors: connectionLogs.filter((log: any) => log.eventType === 'error').length,
                    url: conn.type === 'SOCKET_IO' ? '/api/socket' : undefined
                };
            });
            
            setConnections(mappedConnections);
            setLogs(dbLogs);
            
            // Ordenar conexiones: conectadas primero, luego por nombre
            const sortedConnections = mappedConnections.sort((a, b) => {
                // Prioridad por estado: connected > connecting > disconnected > error
                const statusPriority = {
                    'connected': 0,
                    'connecting': 1, 
                    'disconnected': 2,
                    'error': 3
                };
                
                const aPriority = statusPriority[a.status] ?? 4;
                const bPriority = statusPriority[b.status] ?? 4;
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                // Si tienen el mismo estado, ordenar por nombre
                return a.name.localeCompare(b.name);
            });
            
            setConnections(sortedConnections);
            
            // Calcular estadísticas reales usando los datos del servidor
            const activeCount = mappedConnections.filter(c => c.status === 'connected').length;
            const totalMessages = messageStats ? messageStats.total : dbLogs.filter((log: any) => log.eventType === 'message').length;
            const totalErrors = dbLogs.filter((log: any) => log.eventType === 'error').length;
            
            console.log('Stats calculated:', { 
                totalConnections: mappedConnections.length, 
                activeCount, 
                totalMessages, 
                totalErrors,
                messageStats 
            });
            
            setStats({
                totalConnections: mappedConnections.length,
                activeConnections: activeCount,
                totalMessages,
                totalErrors,
                byType: {}
            });

        } catch (error) {
            console.error('Error al obtener conexiones:', error);
            toast.error('Error al cargar las conexiones WebSocket');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
        
        // Forzar inicialización del Socket.io
        const initializeSocket = async () => {
            try {
                console.log('🔌 Inicializando Socket.io...');
                await fetch('/api/socket', { method: 'GET' });
                console.log('✅ Socket.io inicializado');
            } catch (error) {
                console.warn('⚠️ Error inicializando Socket.io:', error);
            }
        };
        
        initializeSocket();
        
        // Actualizar cada 120 segundos (reducido para mejor rendimiento)
        const interval = setInterval(fetchConnections, 120000);
        return () => clearInterval(interval);
    }, [fetchConnections]);

    const handleConnectionAction = useCallback(async (connectionId: string, action: 'start' | 'stop' | 'restart') => {
        try {
            // Actualización optimista inmediata
            setConnections(prev => prev.map(conn => {
                if (conn.id === connectionId) {
                    if (action === 'start') {
                        return {
                            ...conn,
                            status: 'connecting' as const
                        };
                    } else if (action === 'stop') {
                        return {
                            ...conn,
                            status: 'disconnected' as const,
                            connectedAt: null,
                            lastHeartbeat: null
                        };
                    } else if (action === 'restart') {
                        return {
                            ...conn,
                            status: 'connecting' as const
                        };
                    }
                }
                return conn;
            }));

            // Ejecutar acción real
            const response = await fetch(`/api/websocket/${connectionId}/${action}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                // Actualización exitosa
                setConnections(prev => prev.map(conn => {
                    if (conn.id === connectionId) {
                        if (action === 'start' || action === 'restart') {
                            return {
                                ...conn,
                                status: 'connected' as const,
                                connectedAt: new Date(),
                                lastHeartbeat: new Date()
                            };
                        } else if (action === 'stop') {
                            return {
                                ...conn,
                                status: 'disconnected' as const,
                                connectedAt: null,
                                lastHeartbeat: null
                            };
                        }
                    }
                    return conn;
                }));

                toast.success(result.message || `Conexión ${action === 'start' ? 'iniciada' : action === 'stop' ? 'detenida' : 'reiniciada'} correctamente`);
            } else {
                throw new Error(result.error || 'Error en la acción');
            }

        } catch (error) {
            console.error('Error en acción:', error);
            
            // Revertir cambio optimista en caso de error
            await fetchConnections();
            
            toast.error(
                error instanceof Error 
                    ? error.message 
                    : `Error al ${action === 'start' ? 'iniciar' : action === 'stop' ? 'detener' : 'reiniciar'} la conexión`
            );
        }
    }, [fetchConnections]);

    // Funciones de versión de Socket.io
    const checkSocketIOVersion = useCallback(async () => {
        try {
            setCheckingVersion(true);
            const response = await fetch('/api/internal/socket-version');
            const data = await response.json();
            
            if (data.success) {
                setSocketVersionInfo(data.data);
                if (data.data.hasUpdate) {
                    toast.info(`Nueva versión disponible: ${data.data.latest}`);
                } else {
                    toast.success('Socket.io está actualizado');
                }
            }
        } catch (error) {
            console.error('Error checking Socket.io version:', error);
            toast.error('Error al verificar la versión de Socket.io');
        } finally {
            setCheckingVersion(false);
        }
    }, []);

    const updateSocketIO = useCallback(async () => {
        if (!socketVersionInfo?.hasUpdate) return;
        
        try {
            setUpdating(true);
            const response = await fetch('/api/internal/socket-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    targetVersion: socketVersionInfo.latest 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success('Socket.io actualizado correctamente. Reinicia el servidor para aplicar los cambios.');
                await checkSocketIOVersion(); // Verificar nueva versión
            } else {
                throw new Error(data.error || 'Error en la actualización');
            }
        } catch (error) {
            console.error('Error updating Socket.io:', error);
            toast.error(error instanceof Error ? error.message : 'Error al actualizar Socket.io');
        } finally {
            setUpdating(false);
        }
    }, [socketVersionInfo, checkSocketIOVersion]);

    // Memoizar estadísticas para evitar recálculos innecesarios
    const memoizedStats = useMemo(() => {
        if (!stats) return null;
        
        return {
            totalConnections: stats.totalConnections || 0,
            activeConnections: stats.activeConnections || 0,
            totalMessages: stats.totalMessages || 0,
            totalErrors: stats.totalErrors || 0,
            byType: stats.byType || {}
        };
    }, [stats]);

    // Memoizar info del socket
    const socketInfo = useMemo(() => (
        <div className="p-4 mb-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-blue-800">
                    🔌 Sistema Socket.io Activo
                </h3>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkSocketIOVersion}
                        disabled={checkingVersion}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${checkingVersion ? 'animate-spin' : ''}`} />
                        Verificar Versión
                    </Button>
                    {socketVersionInfo && socketVersionInfo.hasUpdate && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={updateSocketIO}
                            disabled={updating}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Download className={`h-4 w-4 mr-2 ${updating ? 'animate-spin' : ''}`} />
                            Actualizar a {socketVersionInfo.latest}
                        </Button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                    <span className="font-medium">Servidor:</span> Socket.io v{socketVersionInfo?.current || '4.x'}
                </div>
                <div>
                    <span className="font-medium">Endpoint:</span> /api/socket
                </div>
                <div>
                    <span className="font-medium">Rooms:</span> Por systemId
                </div>
            </div>
            {socketVersionInfo && (
                <div className="mt-3 text-xs">
                    {socketVersionInfo.hasUpdate ? (
                        <div className="text-orange-600">
                            ⚠️ Nueva versión disponible: {socketVersionInfo.latest}<br/>
                            📋 <a href={socketVersionInfo.releaseNotes} target="_blank" rel="noopener noreferrer" className="underline">Ver notas de la versión</a>
                        </div>
                    ) : (
                        <div className="text-green-600">
                            ✅ Socket.io está actualizado ({socketVersionInfo.current})
                        </div>
                    )}
                </div>
            )}
            <div className="mt-3 text-xs text-blue-600">
                ✅ Actualizaciones en tiempo real para dispositivos Shelly<br/>
                ✅ Conexiones por sistema aisladas<br/>
                ✅ Reconexión automática
            </div>
        </div>
    ), [socketVersionInfo, checkingVersion, updating, checkSocketIOVersion, updateSocketIO]);

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">WebSocket Manager</h1>
                        <p className="text-gray-600">Cargando conexiones WebSocket...</p>
                    </div>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 w-4 h-4" />
                        Volver
                    </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">WebSocket Manager</h1>
                    <p className="text-gray-600">Administración y monitoreo de conexiones WebSocket en tiempo real</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchConnections}>
                        <RefreshCw className="mr-2 w-4 h-4" />
                        Actualizar
                    </Button>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 w-4 h-4" />
                        Volver
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Conexiones Totales" value={memoizedStats.totalConnections} icon={Wifi} />
                <StatsCard 
                    title="Conexiones Activas" 
                    value={memoizedStats.activeConnections} 
                    icon={CheckCircle} 
                    color="text-green-600" 
                />
                <StatsCard 
                    title="Mensajes Totales" 
                    value={memoizedStats.totalMessages} 
                    icon={Zap} 
                />
                <StatsCard 
                    title="Errores" 
                    value={memoizedStats.totalErrors} 
                    icon={AlertTriangle} 
                    color="text-red-600" 
                />
            </div>

            {socketInfo}

            <Tabs defaultValue="connections" className="w-full" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="connections" className="flex gap-2 items-center">
                        <Activity className="w-4 h-4" />
                        Conexiones Activas
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex gap-2 items-center">
                        <Eye className="w-4 h-4" />
                        Logs en Tiempo Real
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="connections">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conexiones WebSocket Activas</CardTitle>
                            <CardDescription>Estado en tiempo real de las conexiones WebSocket del sistema</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre/Descripción</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Tiempo Activo</TableHead>
                                            <TableHead>Mensajes</TableHead>
                                            <TableHead>Errores</TableHead>
                                            <TableHead>Último Heartbeat</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {connections.length > 0 ? (
                                            connections.map((connection) => (
                                                <ConnectionRow key={connection.id} connection={connection} onAction={handleConnectionAction} />
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">
                                                    No hay conexiones WebSocket configuradas.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Logs en Tiempo Real</CardTitle>
                            <CardDescription>Historial de eventos y errores de las conexiones WebSocket</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <WebSocketLogs />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
} 