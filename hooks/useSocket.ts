import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import io, { Socket } from 'socket.io-client';
import { clientLogger } from '@/lib/utils/client-logger';
import { useSystem } from '@/app/contexts/system-context';

interface DeviceUpdate {
  deviceId: string;
  online: boolean;
  relayOn: boolean | null;
  currentPower?: number;
  voltage?: number;
  temperature?: number;
  timestamp: number;
}

interface SocketHook {
  socket: Socket | null;
  isConnected: boolean;
  lastUpdate: DeviceUpdate | null;
  requestDeviceUpdate: (deviceId: string) => void;
  subscribe: (callback: (update: DeviceUpdate) => void) => () => void;
}

const useSocket = (systemId?: string): SocketHook => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<DeviceUpdate | null>(null);
  const subscribersRef = useRef<Set<(update: DeviceUpdate) => void>>(new Set());
  const initializingRef = useRef(false);
  const lastSystemIdRef = useRef<string | undefined>(undefined);
  const isInitializedRef = useRef(false);

  const { systemConfig } = useSystem();

  // ✅ MEMOIZAR requestDeviceUpdate
  const requestDeviceUpdate = useCallback((deviceId: string) => {
    if (socketRef.current?.connected) {
      console.log('📞 Solicitando actualización de dispositivo:', deviceId);
      socketRef.current.emit('request-device-update', deviceId);
    } else {
      console.error('❌ No se puede solicitar actualización: Socket no conectado');
    }
  }, []);

  // ✅ MEMOIZAR subscribe
  const subscribe = useCallback((callback: (update: DeviceUpdate) => void) => {
    console.log('📝 Nuevo suscriptor agregado. Total:', subscribersRef.current.size + 1);
    subscribersRef.current.add(callback);
    
    // Retornar función de cleanup
    return () => {
      console.log('🗑️ Suscriptor eliminado. Total:', subscribersRef.current.size - 1);
      subscribersRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    // ✅ GUARD: Si no hay systemId, no hacer nada
    if (!systemId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ useSocket: No systemId provided');
      }
      return;
    }

    // ✅ GUARD: Si ya se inicializó para el mismo systemId, no reinicializar
    if (isInitializedRef.current && lastSystemIdRef.current === systemId && socketRef.current?.connected) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ useSocket: Ya conectado para systemId:', systemId, '- reutilizando conexión');
      }
      return;
    }

    // ✅ GUARD: Si ya está inicializando, no inicializar otra vez
    if (initializingRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ useSocket: Ya inicializando para systemId:', systemId, '- esperando...');
      }
      return;
    }

    // ---------------------------------------------------------------------
    // Seleccionar URL final del WebSocket ----------------------------------
    // ---------------------------------------------------------------------
    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    const fallbackUrl = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
      : undefined;

    const WS_URL = (systemConfig as any)?.websocketUrl || envWs || fallbackUrl;

    if (!WS_URL) {
      console.warn('[useSocket] WebSocket deshabilitado: no se pudo determinar URL');
      return;
    }

    initializingRef.current = true;
    lastSystemIdRef.current = systemId;
    console.log('🔌 useSocket: Inicializando conexión Socket.io para systemId:', systemId);

    // Variables para referencia en cleanup
    let localSocket: Socket | null = null;
    let testTimeout: NodeJS.Timeout | null = null;

    // Inicializar el servidor Socket.io primero
    fetch('/api/socket/init').then(() => {
      console.log('✅ Socket.io server inicializado');

      // 🔄 Sólo crear conexión UNA VEZ que el servidor está listo
      localSocket = io(WS_URL, {
        path: '/api/socket',
        forceNew: false,
        reconnection: true,
        timeout: 20000,
        transports: ['websocket'], // Evitar fallback a long-polling (que suele fallar en serverless)
        upgrade: true,
      });

      socketRef.current = localSocket;

      localSocket.on('connect', () => {
        console.log('🔗 Socket.io conectado con ID:', socketRef.current?.id);
        setIsConnected(true);
        isInitializedRef.current = true;
        console.log('📡 Uniéndose al room del sistema:', systemId);
        localSocket.emit('join-system', systemId);
      });

      localSocket.on('disconnect', (reason) => {
        console.log('🔌 Socket.io desconectado. Razón:', reason);
        setIsConnected(false);
        isInitializedRef.current = false;
      });

      localSocket.on('connect_error', (error) => {
        console.error('❌ Error de conexión Socket.io:', error);
        setIsConnected(false);
        isInitializedRef.current = false;
      });

      localSocket.on('connection-status', (status) => {
        console.log('📡 Estado de conexión recibido:', status);
      });

      localSocket.on('device-update', (update: DeviceUpdate) => {
        clientLogger.verbose('📱 Actualización de dispositivo recibida:', update);
        setLastUpdate(update);
        
        // Notificar a todos los suscriptores
        clientLogger.verbose(`📢 Notificando a ${subscribersRef.current.size} suscriptores`);
        subscribersRef.current.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error en callback de suscriptor:', error);
          }
        });
      });

      // ✅ ELIMINADO: device-offline-status para evitar duplicación
      // El DeviceOfflineManager maneja estos eventos directamente

      localSocket.on('device-error', (error) => {
        console.error('❌ Error de dispositivo recibido:', error);
      });

      localSocket.on('test-response', (data) => {
        console.log('🧪 Test response recibido:', data);
      });

      // 🆕 Escuchar cambios de asignación de smart plugs
      localSocket.on('smart-plug-assignment-updated', (data) => {
        console.log('🔄 [Socket.IO] Cambio de asignación recibido:', data);
        
        // Notificar a todos los suscriptores directamente
        subscribersRef.current.forEach(callback => {
          try {
            callback(data);  // Pasar los datos directamente
          } catch (error) {
            console.error('Error en callback de suscriptor (assignment):', error);
          }
        });
      });

      // Test de conexión después de 5 segundos (más tiempo para apps complejas)
      testTimeout = setTimeout(() => {
        if (localSocket.connected) {
          console.log('✅ Test: Socket conectado correctamente');
          localSocket.emit('test-message', { systemId, timestamp: Date.now() });
        } else {
          console.warn('⚠️ Test: Socket NO conectado después de 5 segundos, pero puede conectar más tarde');
        }
      }, 5000);

    }).catch(err => {
      console.error('❌ Error inicializando Socket.io server:', err);
    });

    // Cleanup
    return () => {
      if (testTimeout) clearTimeout(testTimeout);
      if (localSocket) {
        console.log('🧹 Limpiando conexión Socket.io');
        localSocket.disconnect();
      }
      console.log('🧹 Limpiando conexión Socket.io');
      socketRef.current = null;
      setIsConnected(false);
      initializingRef.current = false;
      isInitializedRef.current = false;
      lastSystemIdRef.current = undefined;
    };
  }, [systemId]); // Solo depende de systemId

  // ✅ MEMOIZAR el resultado del hook
  const result = useMemo(() => ({
    socket: socketRef.current,
    isConnected,
    lastUpdate,
    requestDeviceUpdate,
    subscribe
  }), [isConnected, lastUpdate, requestDeviceUpdate, subscribe]);

  return result;
};

export default useSocket; 