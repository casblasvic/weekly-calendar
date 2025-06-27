"use client";

import { useState, useEffect, useCallback } from 'react';
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
    Settings
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
}

export default function WebSocketManagerPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [connections, setConnections] = useState<WebSocketConnection[]>([]);
    const [stats, setStats] = useState<WebSocketStats>({
        totalConnections: 0,
        activeConnections: 0,
        totalMessages: 0,
        totalErrors: 0
    });
    const [logs, setLogs] = useState<any[]>([]);

    const fetchConnections = useCallback(async () => {
        setIsLoading(true);
        try {
            // Simular datos reales mientras implementamos las APIs
            const mockConnections: WebSocketConnection[] = [
                {
                    id: 'shelly-realtime',
                    name: 'Shelly Realtime',
                    description: 'Conexión en tiempo real con dispositivos Shelly IoT',
                    status: 'connected',
                    connectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
                    lastHeartbeat: new Date(Date.now() - 30 * 1000), // 30 segundos atrás
                    messagesSent: 145,
                    messagesReceived: 1288,
                    errors: 3,
                    url: 'wss://shelly-cloud.com/ws',
                    type: 'IoT Devices'
                },
                {
                    id: 'notification-system',
                    name: 'Sistema de Notificaciones',
                    description: 'WebSocket para notificaciones push en tiempo real',
                    status: 'disconnected',
                    connectedAt: null,
                    lastHeartbeat: null,
                    messagesSent: 0,
                    messagesReceived: 0,
                    errors: 12,
                    url: 'wss://api.clinica.com/notifications',
                    type: 'Notifications'
                }
            ];

            setConnections(mockConnections);
            
            // Calcular estadísticas reales
            const activeCount = mockConnections.filter(c => c.status === 'connected').length;
            const totalMessages = mockConnections.reduce((acc, c) => acc + c.messagesSent + c.messagesReceived, 0);
            const totalErrors = mockConnections.reduce((acc, c) => acc + c.errors, 0);
            
            setStats({
                totalConnections: mockConnections.length,
                activeConnections: activeCount,
                totalMessages,
                totalErrors
            });

        } catch (error) {
            console.error('Error fetching WebSocket connections:', error);
            toast.error('Error al cargar las conexiones WebSocket');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConnections();
        
        // Actualizar cada 30 segundos
        const interval = setInterval(fetchConnections, 30000);
        return () => clearInterval(interval);
    }, [fetchConnections]);

    const handleConnectionAction = async (connectionId: string, action: 'start' | 'stop' | 'restart') => {
        try {
            // TODO: Implementar llamadas reales a API
            const response = await fetch(`/api/websocket/${connectionId}/${action}`, {
                method: 'POST'
            });

            if (response.ok) {
                toast.success(`Conexión ${action === 'start' ? 'iniciada' : action === 'stop' ? 'detenida' : 'reiniciada'} correctamente`);
                await fetchConnections();
            } else {
                throw new Error('Failed to perform action');
            }
        } catch (error) {
            // Por ahora simulamos la acción
            setConnections(prev => prev.map(conn => {
                if (conn.id === connectionId) {
                    if (action === 'start') {
                        return {
                            ...conn,
                            status: 'connected',
                            connectedAt: new Date(),
                            lastHeartbeat: new Date()
                        };
                    } else if (action === 'stop') {
                        return {
                            ...conn,
                            status: 'disconnected',
                            connectedAt: null,
                            lastHeartbeat: null
                        };
                    } else if (action === 'restart') {
                        return {
                            ...conn,
                            status: 'connecting'
                        };
                    }
                }
                return conn;
            }));
            
            if (action === 'restart') {
                setTimeout(() => {
                    setConnections(prev => prev.map(conn => 
                        conn.id === connectionId 
                            ? { ...conn, status: 'connected', connectedAt: new Date(), lastHeartbeat: new Date() }
                            : conn
                    ));
                }, 2000);
            }
            
            toast.success(`Conexión ${action === 'start' ? 'iniciada' : action === 'stop' ? 'detenida' : 'reiniciada'} correctamente`);
        }
    };

    const formatUptime = (connectedAt: Date | null) => {
        if (!connectedAt) return 'Desconectado';
        
        const now = new Date();
        const diff = now.getTime() - connectedAt.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const getStatusBadge = (status: WebSocketConnection['status']) => {
        switch (status) {
            case 'connected':
                return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
            case 'disconnected':
                return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Desconectado</Badge>;
            case 'connecting':
                return <Badge className="bg-yellow-500 text-white"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>;
            case 'error':
                return <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Error</Badge>;
            default:
                return <Badge variant="secondary">Desconocido</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">WebSocket Manager</h1>
                        <p className="text-gray-600">Cargando conexiones WebSocket...</p>
                    </div>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 w-4 h-4" />
                        Volver
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Wifi className="w-4 h-4" />
                            Conexiones Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalConnections}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Conexiones Activas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.activeConnections}</div>
                        <p className="text-xs text-gray-500">de {stats.totalConnections} totales</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Mensajes Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
                        <p className="text-xs text-gray-500">enviados y recibidos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Errores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.totalErrors}</div>
                        <p className="text-xs text-gray-500">errores acumulados</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="connections" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="connections" className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Conexiones Activas
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2">
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
                                                <TableRow key={connection.id}>
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
                                                                    onClick={() => handleConnectionAction(connection.id, 'stop')}
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    title="Detener conexión"
                                                                >
                                                                    <Square className="w-4 h-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon"
                                                                    onClick={() => handleConnectionAction(connection.id, 'start')}
                                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    title="Iniciar conexión"
                                                                >
                                                                    <Play className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={() => handleConnectionAction(connection.id, 'restart')}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                title="Reiniciar conexión"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
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
                            <div className="text-center py-12">
                                <Badge className="mb-4 text-lg px-4 py-2">🔧 Próximamente</Badge>
                                <h3 className="text-xl font-semibold mb-2">Sistema de Logs en Tiempo Real</h3>
                                <p className="text-gray-600 max-w-md mx-auto">
                                    Los logs detallados en tiempo real estarán disponibles próximamente.
                                    Incluirán filtrado por conexión, nivel de log y búsqueda por fecha.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
} 