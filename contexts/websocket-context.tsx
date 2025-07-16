/**
 * ========================================
 * CONTEXTO CENTRALIZADO DE WEBSOCKET
 * ========================================
 * 
 * 🎯 PROPÓSITO: UNA SOLA CONEXIÓN WEBSOCKET PARA TODA LA APLICACIÓN
 * 
 * 🔧 SOLUCIÓN AL PROBLEMA:
 * - Elimina múltiples conexiones useSocket simultáneas
 * - Centraliza la conexión en un solo lugar
 * - Proporciona suscripción a todos los componentes
 * - Evita sockets fantasma
 * 
 * 🛡️ ARQUITECTURA:
 * - Un solo useSocket en el contexto
 * - Todos los componentes se suscriben vía contexto
 * - Cleanup automático de suscripciones
 * 
 * 🔧 IMPORTACIÓN DE PRISMA:
 * IMPORTANTE: Usar: import { prisma } from '@/lib/db';
 * 
 * @see docs/WEBSOCKET_SYSTEM_FIXED.md
 */

'use client';

import { createContext, useContext, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import useSocket from '@/hooks/useSocket';

interface DeviceUpdate {
  deviceId: string;
  shellyDeviceId?: string;
  online: boolean;
  relayOn: boolean;
  currentPower?: number;
  voltage?: number;
  temperature?: number;
  timestamp: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (callback: (update: any) => void) => () => void;
  requestDeviceUpdate: (deviceId: string) => void;
  lastUpdate: DeviceUpdate | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { data: session } = useSession();
  const systemId = session?.user?.systemId;
  
  // ✅ INICIALIZACIÓN AUTOMÁTICA DE WEBSOCKETS al autenticarse
  useEffect(() => {
    const initializeWebSockets = async () => {
      if (!systemId) return;
      
      console.log('🚀 [WebSocketProvider] Inicializando WebSockets automáticamente...');
      
      try {
        // Inicializar Socket.io server
        const socketResponse = await fetch('/api/socket/init');
        const socketResult = await socketResponse.json();
        console.log('📡 [WebSocketProvider] Socket.io init:', socketResult);
        
        // Inicializar conexiones WebSocket con Shelly
        const shellyResponse = await fetch('/api/socket/start-monitoring');
        const shellyResult = await shellyResponse.json();
        console.log('🔌 [WebSocketProvider] Shelly WebSockets init:', shellyResult);
        
        console.log('✅ [WebSocketProvider] WebSockets inicializados automáticamente');
      } catch (error) {
        console.error('❌ [WebSocketProvider] Error inicializando WebSockets:', error);
      }
    };

    initializeWebSockets();
  }, [systemId]);
  
  // ✅ UNA SOLA CONEXIÓN WEBSOCKET PARA TODA LA APLICACIÓN
  const { subscribe: socketSubscribe, isConnected, requestDeviceUpdate, lastUpdate } = useSocket(systemId);
  
  // 📋 REGISTRO DE SUSCRIPTORES
  const subscribersRef = useRef<Map<string, (update: any) => void>>(new Map());
  
  // 🎯 FUNCIÓN DE SUSCRIPCIÓN CENTRALIZADA
  const subscribe = useCallback((callback: (update: any) => void) => {
    const subscriberId = Math.random().toString(36).substring(2, 15);
    subscribersRef.current.set(subscriberId, callback);
    
    // 🧹 CLEANUP AUTOMÁTICO
    return () => {
      subscribersRef.current.delete(subscriberId);
    };
  }, []);
  
  // 📡 PROPAGACIÓN A TODOS LOS SUSCRIPTORES
  useEffect(() => {
    if (!socketSubscribe) return;
    
    const unsubscribe = socketSubscribe((update: any) => {
      // Propagar a todos los suscriptores registrados
      subscribersRef.current.forEach((callback) => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error en callback de suscriptor:', error);
        }
      });
    });
    
    return unsubscribe;
  }, [socketSubscribe]);
  
  // 🔒 SOLO RENDERIZAR SI HAY SESIÓN
  if (!systemId) {
    return <>{children}</>;
  }
  
  const value: WebSocketContextType = {
    isConnected,
    subscribe,
    requestDeviceUpdate,
    lastUpdate
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// 🎯 HOOK PARA USAR EL CONTEXTO
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// 🎯 HOOK PARA USAR WEBSOCKET OPCIONAL (no lanza error si no hay contexto)
export function useWebSocketOptional() {
  const context = useContext(WebSocketContext);
  return context;
} 