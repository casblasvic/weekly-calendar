import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { clientLogger } from '@/lib/utils/client-logger';

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

  const requestDeviceUpdate = useCallback((deviceId: string) => {
    if (socketRef.current?.connected) {
      console.log('📞 Solicitando actualización de dispositivo:', deviceId);
      socketRef.current.emit('request-device-update', deviceId);
    } else {
      console.error('❌ No se puede solicitar actualización: Socket no conectado');
    }
  }, []);

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
    if (!systemId || initializingRef.current) {
      if (!systemId) {
        console.log('❌ useSocket: No systemId provided');
      }
      return;
    }

    initializingRef.current = true;
    console.log('🔌 useSocket: Inicializando conexión Socket.io para systemId:', systemId);

    // Inicializar el servidor Socket.io primero
    fetch('/api/socket/init').then(() => {
      console.log('✅ Socket.io server inicializado');
    }).catch(err => {
      console.error('❌ Error inicializando Socket.io server:', err);
    });

    // Inicializar conexión Socket.io
    socketRef.current = io({
      path: '/api/socket',
      forceNew: false, // Cambiar a false para reutilizar conexiones
      reconnection: true,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔗 Socket.io conectado con ID:', socket.id);
      setIsConnected(true);
      
      // Unirse al room del sistema
      console.log('📡 Uniéndose al room del sistema:', systemId);
      socket.emit('join-system', systemId);
    });

    // 🚨 DEBUG TEMPORAL: Escuchar TODOS los eventos
    socket.onAny((eventName, ...args) => {
      console.log('🚨 [DEBUG] Evento recibido:', eventName, args);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.io desconectado. Razón:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.io:', error);
      setIsConnected(false);
    });

    socket.on('connection-status', (status) => {
      console.log('📡 Estado de conexión recibido:', status);
    });

    socket.on('device-update', (update: DeviceUpdate) => {
      console.log('🚨 [DEBUG] device-update recibido:', update);
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

    // 🆕 ESCUCHAR CAMBIOS OFFLINE/ONLINE DEL SISTEMA CENTRALIZADO
    socket.on('device-offline-status', (update: DeviceUpdate) => {
      console.log('🚨 [DEBUG] Estado offline recibido en useSocket:', {
        deviceId: update.deviceId,
        online: update.online,
        relayOn: update.relayOn,
        timestamp: update.timestamp,
        subscribersCount: subscribersRef.current.size
      });
      clientLogger.verbose('📡 Estado offline recibido:', update);
      setLastUpdate(update);
      
      // Notificar a suscriptores (mismo callback, diferentes datos)
      subscribersRef.current.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error en callback offline de suscriptor:', error);
        }
      });
    });

    socket.on('device-error', (error) => {
      console.error('❌ Error de dispositivo recibido:', error);
    });

    socket.on('test-response', (data) => {
      console.log('🧪 Test response recibido:', data);
    });

    // Test de conexión después de 5 segundos (más tiempo para apps complejas)
    const testTimeout = setTimeout(() => {
      if (socket.connected) {
        console.log('✅ Test: Socket conectado correctamente');
        socket.emit('test-message', { systemId, timestamp: Date.now() });
      } else {
        console.warn('⚠️ Test: Socket NO conectado después de 5 segundos, pero puede conectar más tarde');
      }
    }, 5000);

    // Cleanup
    return () => {
      console.log('🧹 Limpiando conexión Socket.io');
      clearTimeout(testTimeout);
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      initializingRef.current = false;
    };
  }, [systemId]); // Solo depende de systemId

  return {
    socket: socketRef.current,
    isConnected,
    lastUpdate,
    requestDeviceUpdate,
    subscribe
  };
};

export default useSocket; 