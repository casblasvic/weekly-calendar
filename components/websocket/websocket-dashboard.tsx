'use client';

import { useMemo, memo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  BarChart3,
  RefreshCw,
  Zap
} from 'lucide-react';
import WebSocketLogs from './websocket-logs';
import { useWebSocketDashboard } from '@/hooks/use-websocket-dashboard';

interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  uptime: number;
}

interface ShellyMetrics extends WebSocketMetrics {
  shellyConnections: number;
  totalDevices: number;
  avgDevicesPerConnection: number;
}

interface HealthResult {
  connectionId: string;
  isHealthy: boolean;
  latency: number;
  lastCheck: Date;
  errorMessage?: string;
}

interface Connection {
  id: string;
  url: string;
  status: string;
  lastPing: Date;
  lastPong: Date;
  reconnectAttempts: number;
  tags: string[];
  metadata: any;
}

// Componente memoizado para conexiones
const ConnectionItem = memo(({ conn, getStatusColor }: { conn: Connection; getStatusColor: (status: string) => string }) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${getStatusColor(conn.status)}`} />
      <div>
        <div className="font-medium">{conn.metadata?.credentialName || conn.id}</div>
        <div className="text-sm text-muted-foreground">
          {conn.metadata?.type || 'Unknown'} • {conn.url}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="outline">{conn.status}</Badge>
      {conn.tags.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
  </div>
));

ConnectionItem.displayName = 'ConnectionItem';

// Componente memoizado para health results
const HealthItem = memo(({ result }: { result: HealthResult }) => (
  <div className="flex items-center justify-between p-2 border rounded">
    <div className="flex items-center gap-2">
      {result.isHealthy ? (
        <CheckCircle className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-600" />
      )}
      <span className="text-sm">{result.connectionId.slice(0, 8)}...</span>
    </div>
    <div className="text-sm text-muted-foreground">
      {result.latency}ms
    </div>
  </div>
));

HealthItem.displayName = 'HealthItem';

export default function WebSocketDashboard() {
  const {
    metrics,
    health,
    connections,
    messageCounters,
    loading,
    lastUpdate,
    fetchData
  } = useWebSocketDashboard();

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Memoizar funciones para evitar re-creación en cada render
  const formatUptime = useCallback((uptime: number) => {
    const minutes = Math.floor(uptime / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-gray-500';
      case 'failed': return 'bg-red-500';
      case 'reconnecting': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  }, []);

  // Memoizar datos derivados
  const formattedLastUpdate = useMemo(() => {
    return lastUpdate ? lastUpdate.toLocaleTimeString() : '';
  }, [lastUpdate]);

  const systemMetrics = useMemo(() => ({
    activeConnections: metrics?.system.activeConnections || 0,
    totalConnections: metrics?.system.totalConnections || 0,
    errorRate: (metrics?.system.errorRate || 0) * 100,
    uptime: formatUptime(metrics?.system.uptime || 0)
  }), [metrics?.system, formatUptime]);

  const shellyMetrics = useMemo(() => ({
    totalDevices: metrics?.shelly.totalDevices || 0,
    shellyConnections: metrics?.shelly.shellyConnections || 0,
    avgDevicesPerConnection: metrics?.shelly.avgDevicesPerConnection?.toFixed(1) || '0.0',
    errorRate: (metrics?.shelly.errorRate || 0) * 100
  }), [metrics?.shelly]);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin mr-2" />
        <span>Cargando métricas de WebSocket...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard WebSocket</h1>
          <p className="text-muted-foreground">
            Monitoreo en tiempo real del sistema de conexiones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          {formattedLastUpdate && (
            <span className="text-sm text-muted-foreground">
              Última actualización: {formattedLastUpdate}
            </span>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conexiones Activas</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemMetrics.activeConnections}
            </div>
            <p className="text-xs text-muted-foreground">
              de {systemMetrics.totalConnections} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispositivos Shelly</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {shellyMetrics.totalDevices}
            </div>
            <p className="text-xs text-muted-foreground">
              en {shellyMetrics.shellyConnections} conexiones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensajes</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enviados:</span>
                <span className="font-bold text-green-600">{messageCounters.sent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recibidos:</span>
                <span className="font-bold text-blue-600">{messageCounters.received}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errores:</span>
                <span className="font-bold text-red-600">{messageCounters.errors}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Error</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {systemMetrics.errorRate.toFixed(1)}%
            </div>
            <Progress 
              value={systemMetrics.errorRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Activo</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {systemMetrics.uptime}
            </div>
            <p className="text-xs text-muted-foreground">
              Funcionando sin interrupciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections">Conexiones</TabsTrigger>
          <TabsTrigger value="health">Estado de Salud</TabsTrigger>
          <TabsTrigger value="metrics">Métricas Detalladas</TabsTrigger>
          <TabsTrigger value="logs">Logs en Tiempo Real</TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle>Conexiones Activas</CardTitle>
              <CardDescription>
                Lista de todas las conexiones WebSocket en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <WifiOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay conexiones activas</p>
                  </div>
                ) : (
                  connections.map((conn) => (
                    <ConnectionItem 
                      key={conn.id} 
                      conn={conn} 
                      getStatusColor={getStatusColor} 
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sistema Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {health?.system.map((result) => (
                    <HealthItem key={result.connectionId} result={result} />
                  ))}
                  {(!health?.system || health.system.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No hay conexiones para verificar
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conexiones Shelly</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {health?.shelly.map((result) => (
                    <HealthItem key={result.connectionId} result={result} />
                  ))}
                  {(!health?.shelly || health.shelly.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">
                      No hay conexiones Shelly para verificar
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Métricas del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Conexiones Totales</div>
                    <div className="text-2xl font-bold">{metrics?.system.totalConnections || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Conexiones Fallidas</div>
                    <div className="text-2xl font-bold text-red-600">{metrics?.system.failedConnections || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Latencia Promedio</div>
                    <div className="text-2xl font-bold">{metrics?.system.averageLatency || 0}ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Mensajes/seg</div>
                    <div className="text-2xl font-bold">{metrics?.system.messagesPerSecond || 0}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Métricas Shelly</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Conexiones Shelly</div>
                    <div className="text-2xl font-bold text-blue-600">{metrics?.shelly.shellyConnections || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dispositivos Totales</div>
                    <div className="text-2xl font-bold text-blue-600">{metrics?.shelly.totalDevices || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Promedio por Conexión</div>
                    <div className="text-2xl font-bold">{metrics?.shelly.avgDevicesPerConnection?.toFixed(1) || '0.0'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tasa de Error</div>
                    <div className="text-2xl font-bold text-red-600">
                      {((metrics?.shelly.errorRate || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <WebSocketLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
} 