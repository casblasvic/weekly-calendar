import { useState, useEffect, useCallback, useRef } from 'react';

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

interface DashboardData {
  metrics: {
    system: WebSocketMetrics;
    shelly: ShellyMetrics;
  } | null;
  health: {
    system: HealthResult[];
    shelly: HealthResult[];
  } | null;
  connections: Connection[];
  messageCounters: {
    sent: number;
    received: number;
    errors: number;
  };
}

export function useWebSocketDashboard() {
  const [data, setData] = useState<DashboardData>({
    metrics: null,
    health: null,
    connections: [],
    messageCounters: { sent: 0, received: 0, errors: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const requestSignal = signal || controller.signal;
      
      // Fetch paralelo de todas las APIs
      const [metricsRes, healthRes, connectionsRes] = await Promise.all([
        fetch('/api/websocket/manager?action=metrics', { signal: requestSignal }),
        fetch('/api/websocket/manager?action=health', { signal: requestSignal }),
        fetch('/api/websocket/manager?action=connections', { signal: requestSignal })
      ]);
      
      if (requestSignal.aborted) return;
      
      const [metricsData, healthData, connectionsData] = await Promise.all([
        metricsRes.json(),
        healthRes.json(),
        connectionsRes.json()
      ]);
      
      if (requestSignal.aborted) return;
      
      // Calcular contadores de mensajes desde los logs de conexiones
      let sent = 0, received = 0, errors = 0;
      
      if (connectionsData.success && connectionsData.data.connections) {
        connectionsData.data.connections.forEach((conn: any) => {
          if (conn.logs) {
            conn.logs.forEach((log: any) => {
              switch (log.eventType) {
                case 'message':
                  if (log.message?.includes('received') || log.message?.includes('recibido')) {
                    received++;
                  } else {
                    sent++;
                  }
                  break;
                case 'error':
                  errors++;
                  break;
              }
            });
          }
        });
      }
      
      // Actualizar estado solo si los datos han cambiado
      setData(prevData => {
        const newData = {
          metrics: metricsData.success ? metricsData.data : prevData.metrics,
          health: healthData.success ? healthData.data : prevData.health,
          connections: connectionsData.success ? connectionsData.data.connections : prevData.connections,
          messageCounters: { sent, received, errors }
        };
        
        // Comparación superficial para evitar re-renders innecesarios
        if (JSON.stringify(newData) === JSON.stringify(prevData)) {
          return prevData;
        }
        
        return newData;
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request cancelado, ignorar
      }
      console.error('Error fetching WebSocket data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const startAutoRefresh = useCallback((intervalMs: number = 60000) => {
    // Limpiar interval anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Crear nuevo interval
    intervalRef.current = setInterval(() => {
      fetchData();
    }, intervalMs);
  }, [fetchData]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cargar datos iniciales
    fetchData();
    
    // Iniciar auto-refresh
    startAutoRefresh(60000); // 60 segundos
    
    // Cleanup
    return () => {
      stopAutoRefresh();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, startAutoRefresh, stopAutoRefresh]);

  return {
    ...data,
    loading,
    lastUpdate,
    fetchData,
    startAutoRefresh,
    stopAutoRefresh
  };
} 