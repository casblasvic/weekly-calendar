// ✅ HOOK PERSONALIZADO PARA FLOATING MENU DE ENCHUFES INTELIGENTES
// 🎯 SIMPLIFICADO: Solo WebSocket, sin timeouts, muestra dispositivos offline
// 🔒 VERIFICACIÓN: Solo funciona si el módulo Shelly está activo

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/contexts/clinic-context';
import useSocket from '@/hooks/useSocket';
import { clientLogger } from '@/lib/utils/client-logger';
import { deviceOfflineManager, OfflineUpdate } from '@/lib/shelly/device-offline-manager';
import { useIntegrationModules } from '@/hooks/use-integration-modules';
import { useQueryClient } from '@tanstack/react-query';

interface SmartPlugDevice {
  id: string;
  name: string;
  deviceId: string;
  online: boolean;
  relayOn: boolean;
  currentPower?: number;
  voltage?: number;
  temperature?: number;
  appointmentOnlyMode?: boolean;
  autoShutdownEnabled?: boolean;
  equipmentId?: string;
  equipment?: {
    name: string;
    clinicId: string;
    powerThreshold?: number;
    clinic?: {
      name: string;
    };
  };
  equipmentClinicAssignmentId?: string;
  equipmentClinicAssignment?: {
    id: string;
    clinicId: string;
    deviceName?: string;
    equipment: {
      id: string;
      name: string;
      powerThreshold?: number;
    };
    clinic: {
      id: string;
      name: string;
    };
  };
  lastSeenAt?: Date;
  credentialId?: string;
}

interface SmartPlugsFloatingMenuData {
  // 📊 CONTADORES
  deviceStats: {
    total: number;      // Total dispositivos asignados
    online: number;     // Dispositivos online
    offline: number;    // Dispositivos offline
    consuming: number;  // Dispositivos ON (online + relayOn)
  };
  
  // 🔥 DISPOSITIVOS DINÁMICOS (solo los ON)
  activeDevices: SmartPlugDevice[];  // Solo dispositivos online + relayOn
  
  // 📊 CONSUMO TOTAL
  totalPower: number;
  
  // 🔌 ESTADO CONEXIÓN
  isConnected: boolean;
  
  // 🎮 FUNCIONES
  onDeviceToggle: (deviceId: string, turnOn: boolean) => Promise<void>;
  lastUpdate: Date | null;
}

export function useSmartPlugsFloatingMenu(): SmartPlugsFloatingMenuData | null {
  // ✅ TODOS LOS HOOKS AL INICIO - SIEMPRE SE EJECUTAN EN EL MISMO ORDEN
  const { isShellyActive, isLoading: isLoadingIntegrations } = useIntegrationModules();
  const { activeClinic } = useClinic();
  const { data: session } = useSession();
  const systemId = session?.user?.systemId;
  
  const queryClient = useQueryClient();
  const cacheKey = ['smartPlugDevices', systemId ?? 'unknown'];
  const cachedDevices = queryClient.getQueryData<SmartPlugDevice[]>(cacheKey);
  
  // Estado principal - asegurar que siempre sea un array
  const [allDevices, setAllDevices] = useState<SmartPlugDevice[]>(
    Array.isArray(cachedDevices) ? cachedDevices : []
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(
    Array.isArray(cachedDevices) && cachedDevices.length > 0 ? new Date() : null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs para tracking updates
  const messagesReceivedRef = useRef<Set<string>>(new Set());
  
  // ✅ SOCKET - Igual que la página principal
  const { isConnected, subscribe } = useSocket(systemId);

  // 🔥 FETCH INICIAL - DECLARAR CALLBACK SIEMPRE
  const fetchAllDevices = useCallback(async () => {
    if (!systemId) return;
    
    try {
      clientLogger.verbose('🔄 [FloatingMenu] Cargando dispositivos...');
      
      const response = await fetch(`/api/internal/smart-plug-devices?pageSize=1000&page=1`);
      
      // ✅ MANEJO DE ERRORES DE CONEXIÓN
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [FloatingMenu] Sesión expirada, redirigiendo al login...');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      clientLogger.verbose('✅ [FloatingMenu] Dispositivos cargados:', {
        total: data.data?.length || 0,
        hasActiveClinic: !!activeClinic?.id
      });
      
      console.log('🔄 [FloatingMenu] Dispositivos cargados desde API:', {
        total: data.data?.length || 0,
        devices: data.data?.map(d => ({
          name: d.name,
          equipmentClinicAssignmentId: d.equipmentClinicAssignmentId,
          clinicId: d.equipmentClinicAssignment?.clinicId,
          clinicName: d.equipmentClinicAssignment?.clinic?.name
        })) || []
      });
      
      // ✅ ASEGURAR QUE SIEMPRE SEA UN ARRAY
      const devices = Array.isArray(data.data) ? data.data : [];
      setAllDevices(devices);
      queryClient.setQueryData(cacheKey, devices);
      setIsInitialized(true);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('❌ [FloatingMenu] Error cargando dispositivos:', error);
      
      // ✅ DETECTAR ERRORES DE CONEXIÓN
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('❌ [FloatingMenu] Error de conexión - posible pérdida de red');
        // Opcional: mostrar notificación de error de conexión
      }
      
      setAllDevices([]);
    }
  }, [systemId, activeClinic?.id, queryClient]);

  // 🎮 FUNCIÓN DE CONTROL - DECLARAR CALLBACK SIEMPRE
  const handleDeviceToggle = useCallback(async (deviceId: string, turnOn: boolean) => {
    try {
      const response = await fetch(`/api/shelly/device/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: turnOn ? 'on' : 'off' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }

      clientLogger.verbose(`✅ [FloatingMenu] Control exitoso: ${deviceId} → ${turnOn ? 'ON' : 'OFF'}`);
      
    } catch (error) {
      console.error('❌ [FloatingMenu] Error controlando dispositivo:', error);
      throw error;
    }
  }, []);

  // 🎯 FILTRADO POR CLÍNICA ACTIVA - DECLARAR MEMO SIEMPRE
  const clinicDevices = useMemo(() => {
    if (!activeClinic?.id || !Array.isArray(allDevices) || allDevices.length === 0) {
      return [];
    }
    
    // ✅ FILTRADO SIMPLE: Solo equipmentClinicAssignment.clinicId
    const filtered = allDevices.filter(device => {
      return device.equipmentClinicAssignmentId && device.equipmentClinicAssignment?.clinicId === activeClinic.id;
    });
    
    return filtered;
  }, [allDevices, activeClinic?.id]);

  // 📊 CONTADORES PARA EL ÍCONO - DECLARAR MEMO SIEMPRE
  const deviceStats = useMemo(() => {
    const total = clinicDevices.length;
    const online = clinicDevices.filter(d => d.online).length;
    const offline = total - online;
    const consuming = clinicDevices.filter(d => {
      if (!d.online || !d.relayOn) return false;
      
      const hasValidConsumption = d.currentPower !== null && d.currentPower !== undefined;
      if (!hasValidConsumption) return false;
      
      const threshold = d.equipmentClinicAssignment?.equipment?.powerThreshold;
      return d.currentPower > threshold;
    }).length;
    
    return { total, online, offline, consuming };
  }, [clinicDevices]);

  // 🔥 DISPOSITIVOS ON - DECLARAR MEMO SIEMPRE
  const activeDevices = useMemo(() => {
    return clinicDevices.filter(device => {
      if (!device.online || !device.relayOn) return false;
      
      const hasValidConsumption = device.currentPower !== null && device.currentPower !== undefined;
      if (!hasValidConsumption) return false;
      
      const threshold = device.equipmentClinicAssignment?.equipment?.powerThreshold;
      const isConsuming = device.currentPower > threshold;
      
      return isConsuming;
    });
  }, [clinicDevices]);

  // 📊 CÁLCULO DE CONSUMO TOTAL - DECLARAR MEMO SIEMPRE
  const totalPower = useMemo(() => {
    return activeDevices
      .filter(device => {
        const hasValidConsumption = device.currentPower !== null && device.currentPower !== undefined;
        return hasValidConsumption && device.currentPower > 0.1;
      })
      .reduce((sum, device) => sum + device.currentPower!, 0);
  }, [activeDevices]);

  // 🔥 CARGAR DISPOSITIVOS solo si el módulo está activo
  useEffect(() => {
    if (systemId && isShellyActive && !isInitialized && !isLoadingIntegrations) {
      fetchAllDevices();
    }
  }, [systemId, isShellyActive, isLoadingIntegrations, fetchAllDevices, isInitialized]);

  // 📡 WEBSOCKET TIEMPO REAL - Updates normales de dispositivos
  useEffect(() => {
    if (!isConnected || !isInitialized || !isShellyActive) {
      return;
    }

    clientLogger.verbose('📡 [FloatingMenu] WebSocket activo - configurando listener');
    
    const unsubscribe = subscribe((update: any) => {
      // 🔄 MANEJAR ACTUALIZACIONES DE ASIGNACIÓN DE EQUIPOS
      if (update.type === 'smart-plug-assignment-updated') {
        console.log('🔄 [FloatingMenu] Cambio de asignación detectado:', {
          deviceId: update.deviceId,
          deviceName: update.deviceName,
          equipmentName: update.equipmentName,
          clinicName: update.clinicName
        });
        
        // Refrescar todos los dispositivos para obtener las asignaciones actualizadas
        console.log('🔄 [FloatingMenu] Refrescando dispositivos debido a cambio de asignación...');
        fetchAllDevices();
        return;
      }
      
      // 📡 MANEJAR UPDATES NORMALES DE ESTADO (online/offline/power)
      if (update.deviceId) {
      clientLogger.debug('🔍 [FloatingMenu] Update normal recibido:', {
        deviceId: update.deviceId,
        online: update.online,
        relayOn: update.relayOn,
        currentPower: update.currentPower
      });
      
      // Actualizar dispositivo en la lista
      setAllDevices(prev => {
        const deviceIndex = prev.findIndex(device => 
          device.id === update.deviceId || device.deviceId === update.deviceId
        );
        
        if (deviceIndex === -1) {
          clientLogger.verbose('⚠️ [FloatingMenu] Dispositivo no encontrado:', update.deviceId);
          return prev;
        }
        
        const oldDevice = prev[deviceIndex];
        
        // Verificar cambios reales (incluyendo validez de datos)
        const hasChanges = (
          Boolean(oldDevice.online) !== Boolean(update.online) ||
          Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
          // Para currentPower, considerar null como un cambio válido
          (oldDevice.currentPower !== update.currentPower)
        );
        
        if (!hasChanges) {
          return prev;
        }
        
        // Actualizar dispositivo
        const updated = [...prev];
        updated[deviceIndex] = { 
          ...oldDevice, 
          online: update.online,
          relayOn: update.relayOn,
          currentPower: update.currentPower,
          voltage: update.voltage,
          temperature: update.temperature,
          lastSeenAt: new Date(update.timestamp)
        };
        
        clientLogger.verbose(`✅ [FloatingMenu] Dispositivo actualizado: ${oldDevice.name} → ${update.online ? 'ONLINE' : 'OFFLINE'}`);
        
        return updated;
      });
      
      setLastUpdate(new Date());
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [subscribe, isConnected, isInitialized, isShellyActive, fetchAllDevices]);

  // 🎯 SISTEMA CENTRALIZADO OFFLINE/ONLINE - Reemplaza lógica local
  useEffect(() => {
    if (!isInitialized || !isShellyActive) {
      return;
    }
    
    clientLogger.verbose('🎯 [FloatingMenu] Configurando listener de Offline Manager');
    
    const unsubscribeOffline = deviceOfflineManager.subscribe((updates: OfflineUpdate[]) => {
      clientLogger.verbose('📡 [FloatingMenu] Updates offline recibidos:', updates);
      
      for (const update of updates) {
        if (update.deviceId === 'ALL') {
          // Cambio masivo - todos los dispositivos
          clientLogger.verbose(`🌐 [FloatingMenu] Cambio masivo: todos ${update.online ? 'ONLINE' : 'OFFLINE'} (${update.reason})`);
      
      setAllDevices(prev => prev.map(device => ({ 
        ...device, 
            online: update.online,
            relayOn: update.online ? device.relayOn : false,
            currentPower: update.online ? device.currentPower : 0
      })));
          
        } else {
          // Cambio específico de dispositivo
          setAllDevices(prev => {
            const deviceIndex = prev.findIndex(device => device.id === update.deviceId);
            
            if (deviceIndex === -1) {
              return prev;
            }
            
            const updated = [...prev];
            updated[deviceIndex] = {
              ...updated[deviceIndex],
              online: update.online,
              relayOn: update.online ? updated[deviceIndex].relayOn : false,
              currentPower: update.online ? updated[deviceIndex].currentPower : 0
            };
            
            clientLogger.verbose(`📱 [FloatingMenu] Dispositivo específico ${update.online ? 'ONLINE' : 'OFFLINE'}: ${update.deviceName || updated[deviceIndex].name}`);
            
            return updated;
          });
        }
      }
      
      setLastUpdate(new Date());
    });
    
    clientLogger.verbose('✅ [FloatingMenu] Offline Manager listener configurado');
    
    return () => {
      unsubscribeOffline();
    };
  }, [isInitialized, isShellyActive]);

  // ✅ VERIFICACIÓN: Retornar null si el módulo no está activo
  // IMPORTANTE: Esto debe ir DESPUÉS de todos los hooks para mantener orden consistente
  if (!systemId || !activeClinic || !isShellyActive) {
    return null;
  }

  return {
    deviceStats,
    activeDevices,
    totalPower,
    isConnected,
    onDeviceToggle: handleDeviceToggle,
    lastUpdate
  };
} 