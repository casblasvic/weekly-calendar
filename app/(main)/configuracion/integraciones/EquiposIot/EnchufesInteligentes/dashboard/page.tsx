"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Wifi, WifiOff, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WebSocketMetrics {
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    messagesReceived: number;
    messagesSent: number;
    lastHealthCheck: Date;
}

interface ConnectionStatus {
    id: string;
    credentialName: string;
    status: 'connected' | 'disconnected' | 'error';
    lastPingAt?: Date;
    errorMessage?: string;
    deviceCount: number;
}

export default function ShellyDashboard() {
    const [metrics, setMetrics] = useState<WebSocketMetrics | null>(null);
    const [connections, setConnections] = useState<ConnectionStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Cargar datos iniciales
        fetchDashboardData();

        // Suscribirse a actualizaciones en tiempo real
        const metricsChannel = supabase
            .channel('websocket-metrics-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'websocket_metrics',
                filter: 'type=eq.SHELLY'
            }, (payload) => {
                if (payload.new && typeof payload.new === 'object' && 'metrics' in payload.new) {
                    setMetrics(payload.new.metrics as WebSocketMetrics);
                }
            })
            .subscribe();

        // Actualizar cada 30 segundos
        const interval = setInterval(fetchDashboardData, 30000);

        return () => {
            metricsChannel.unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Obtener métricas
            const metricsResponse = await fetch('/api/shelly/metrics');
            if (metricsResponse.ok) {
                const metricsData = await metricsResponse.json();
                setMetrics(metricsData);
            }

            // Obtener estado de conexiones
            const connectionsResponse = await fetch('/api/shelly/connections');
            if (connectionsResponse.ok) {
                const connectionsData = await connectionsResponse.json();
                setConnections(connectionsData);
            }
        } catch (error) {
            console.error('Error cargando dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            default:
                return <WifiOff className="w-5 h-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'connected':
                return <Badge className="bg-green-500 text-white">Conectado</Badge>;
            case 'error':
                return <Badge className="bg-red-500 text-white">Error</Badge>;
            default:
                return <Badge variant="secondary">Desconectado</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const connectionRate = metrics ? (metrics.activeConnections / Math.max(metrics.totalConnections, 1)) * 100 : 0;

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard de Conexiones Shelly</h1>
                <p className="text-muted-foreground">Monitoreo en tiempo real del sistema WebSocket</p>
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conexiones Activas</CardTitle>
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.activeConnections || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            de {metrics?.totalConnections || 0} totales
                        </p>
                        <Progress value={connectionRate} className="mt-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mensajes Enviados</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.messagesSent || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Total en esta sesión
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mensajes Recibidos</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.messagesReceived || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Total en esta sesión
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conexiones Fallidas</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{metrics?.failedConnections || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Errores de conexión
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Estado de conexiones individuales */}
            <Card>
                <CardHeader>
                    <CardTitle>Estado de Credenciales</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {connections.length > 0 ? (
                            connections.map((connection) => (
                                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-4">
                                        {getStatusIcon(connection.status)}
                                        <div>
                                            <p className="font-medium">{connection.credentialName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {connection.deviceCount} dispositivos
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {connection.errorMessage && (
                                            <p className="text-sm text-red-500">{connection.errorMessage}</p>
                                        )}
                                        {getStatusBadge(connection.status)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground">No hay credenciales configuradas</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Última actualización */}
            {metrics?.lastHealthCheck && (
                <div className="text-sm text-muted-foreground text-center">
                    Última actualización: {new Date(metrics.lastHealthCheck).toLocaleString('es-ES')}
                </div>
            )}
        </div>
    );
} 