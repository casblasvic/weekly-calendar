// ✅ HOOK PERSONALIZADO PARA FLOATING MENU DE ENCHUFES INTELIGENTES
// 🎯 SIMPLIFICADO: Solo WebSocket, sin timeouts, muestra dispositivos offline
// 🔒 VERIFICACIÓN: Solo funciona si el módulo Shelly está activo

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/contexts/clinic-context';
import useSocket from '@/hooks/useSocket';
import { clientLogger } from '@/lib/utils/client-logger';
import { deviceOfflineManager, OfflineUpdate } from '@/lib/shelly/device-offline-manager';

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
  const { activeClinic } = useClinic();
  const { data: session } = useSession();
  const systemId = session?.user?.systemId;
  
  // Estado principal
  const [allDevices, setAllDevices] = useState<SmartPlugDevice[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isShellyModuleActive, setIsShellyModuleActive] = useState<boolean | null>(null);
  
  // Refs para tracking updates
  const messagesReceivedRef = useRef<Set<string>>(new Set());
  
  // ✅ SOCKET - Igual que la página principal
  const { isConnected, subscribe } = useSocket(systemId);

  // 🔒 VERIFICAR SI EL MÓDULO SHELLY ESTÁ ACTIVO
  const checkShellyModuleStatus = useCallback(async () => {
    if (!systemId) {
      setIsShellyModuleActive(false);
      return;
    }
    
    try {
      clientLogger.debug('🔍 [FloatingMenu] Verificando estado del módulo Shelly...');
      
      const response = await fetch('/api/internal/integrations');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [FloatingMenu] Sesión expirada verificando módulo, redirigiendo al login...');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const integrationsByCategory = await response.json();
      
      // Buscar en todas las categorías el módulo Shelly
      let shellyModule = null;
      for (const category in integrationsByCategory) {
        const modules = integrationsByCategory[category];
        shellyModule = modules.find((module: any) => 
          module.name.includes('Shelly') || 
          module.name.includes('Control Inteligente')
        );
        if (shellyModule) break;
      }
      
      const isActive = shellyModule?.isActive || false;
      
      clientLogger.debug('🔍 [FloatingMenu] Estado módulo Shelly:', {
        found: !!shellyModule,
        moduleName: shellyModule?.name,
        isActive,
        moduleId: shellyModule?.id
      });
      
      setIsShellyModuleActive(isActive);
      
    } catch (error) {
      console.error('❌ [FloatingMenu] Error verificando módulo Shelly:', error);
      setIsShellyModuleActive(false);
    }
  }, [systemId]);

  // 🔥 FETCH INICIAL - Cargar todos los dispositivos asignados a clínicas
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
      
      setAllDevices(data.data || []);
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
  }, [systemId, activeClinic?.id]);

  // 🌐 INICIALIZACIÓN
  useEffect(() => {
    if (systemId) {
      // Primero verificar si el módulo está activo
      checkShellyModuleStatus();
    }
  }, [systemId, checkShellyModuleStatus]);

  // 🔥 CARGAR DISPOSITIVOS solo si el módulo está activo
  useEffect(() => {
    if (systemId && isShellyModuleActive === true && !isInitialized) {
      fetchAllDevices();
    }
  }, [systemId, isShellyModuleActive, fetchAllDevices, isInitialized]);

  // 📡 WEBSOCKET TIEMPO REAL - Updates normales de dispositivos
  useEffect(() => {
    if (!isConnected || !isInitialized || isShellyModuleActive !== true) {
      return;
    }

    clientLogger.verbose('📡 [FloatingMenu] WebSocket activo - configurando listener');
    
    const unsubscribe = subscribe((update) => {
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
    });
    
    return () => {
      unsubscribe();
    };
  }, [subscribe, isConnected, isInitialized, isShellyModuleActive]);

  // 🎯 SISTEMA CENTRALIZADO OFFLINE/ONLINE - Reemplaza lógica local
  useEffect(() => {
    if (!isInitialized || isShellyModuleActive !== true) {
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
  }, [isInitialized, isShellyModuleActive]);

  // 🎯 FILTRADO POR CLÍNICA ACTIVA - Solo equipmentClinicAssignment.clinicId
  const clinicDevices = useMemo(() => {
    if (!activeClinic?.id || allDevices.length === 0) {
      clientLogger.verbose('🏥 [FloatingMenu] Sin clínica activa o sin dispositivos:', {
        hasActiveClinic: !!activeClinic?.id,
        clinicId: activeClinic?.id,
        clinicName: activeClinic?.name,
        totalDevices: allDevices.length
      });
      return [];
    }
    
    clientLogger.verbose('🏥 [FloatingMenu] Filtrando dispositivos por clínica:', {
      clinicId: activeClinic.id,
      clinicName: activeClinic.name,
      totalDevices: allDevices.length
    });
    
    // ✅ FILTRADO SIMPLE: Solo equipmentClinicAssignment.clinicId
    const filtered = allDevices.filter(device => {
      // Solo verificar equipmentClinicAssignment.clinicId
      const hasAssignment = device.equipmentClinicAssignmentId && device.equipmentClinicAssignment?.clinicId === activeClinic.id;
      
      if (hasAssignment) {
        clientLogger.verbose(`✅ [FloatingMenu] ${device.name} → Asignado a clínica ${activeClinic.name}`);
      } else {
        clientLogger.verbose(`❌ [FloatingMenu] ${device.name} → NO asignado (equipmentClinicAssignmentId: ${device.equipmentClinicAssignmentId}, clinicId: ${device.equipmentClinicAssignment?.clinicId})`);
      }
      
      return hasAssignment;
    });
    
    clientLogger.verbose('🏥 [FloatingMenu] Resultado filtrado:', {
      clinicName: activeClinic.name,
      totalAsignados: filtered.length,
      online: filtered.filter(d => d.online).length,
      offline: filtered.filter(d => !d.online).length,
      ON: filtered.filter(d => d.online && d.relayOn).length,
      deviceNames: filtered.map(d => d.name)
    });
    
    return filtered;
  }, [allDevices, activeClinic?.id]);

  // 📊 CONTADORES PARA EL ÍCONO
  const deviceStats = useMemo(() => {
    const total = clinicDevices.length;
    const online = clinicDevices.filter(d => d.online).length;
    const offline = total - online;
    const consuming = clinicDevices.filter(d => {
      if (!d.online || !d.relayOn) return false;
      
      // ESTRATEGIA DOS NIVELES: Solo contar si hay dato válido de consumo
      const hasValidConsumption = d.currentPower !== null && d.currentPower !== undefined;
      if (!hasValidConsumption) return false;
      
      // Usar powerThreshold específico del equipment o default 10.0W
      const threshold = d.equipmentClinicAssignment?.equipment?.powerThreshold ?? 10.0;
      return d.currentPower > threshold;
    }).length;
    
    return { total, online, offline, consuming };
  }, [clinicDevices]);

  // 🔥 DISPOSITIVOS ON (para mostrar dinámicamente en el modal)
  const activeDevices = useMemo(() => {
    return clinicDevices.filter(device => {
      if (!device.online || !device.relayOn) return false;
      
      // ESTRATEGIA DOS NIVELES: Solo incluir si hay dato válido de consumo
      const hasValidConsumption = device.currentPower !== null && device.currentPower !== undefined;
      if (!hasValidConsumption) return false;
      
      // Usar powerThreshold específico del equipment o default 10.0W
      const threshold = device.equipmentClinicAssignment?.equipment?.powerThreshold ?? 10.0;
      const isConsuming = device.currentPower > threshold;
      
      return isConsuming;
    });
  }, [clinicDevices]);

  // 📊 CÁLCULO DE CONSUMO TOTAL (solo dispositivos con datos válidos)
  const totalPower = useMemo(() => {
    return activeDevices
      .filter(device => {
        const hasValidConsumption = device.currentPower !== null && device.currentPower !== undefined;
        return hasValidConsumption && device.currentPower > 0.1;
      })
      .reduce((sum, device) => sum + device.currentPower!, 0);
  }, [activeDevices]);

  // 🎮 FUNCIÓN DE CONTROL
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

  // 🎯 DATOS FINALES
  if (!systemId || !activeClinic || isShellyModuleActive !== true) {
    clientLogger.verbose('🔒 [FloatingMenu] Módulo no disponible:', {
      hasSystemId: !!systemId,
      hasActiveClinic: !!activeClinic,
      isShellyModuleActive,
      reason: !systemId ? 'Sin systemId' : 
              !activeClinic ? 'Sin clínica activa' : 
              'Módulo Shelly no activo'
    });
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