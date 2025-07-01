// ✅ HOOK PERSONALIZADO PARA FLOATING MENU DE ENCHUFES INTELIGENTES
// 🎯 SIMPLIFICADO: Solo WebSocket, sin timeouts, muestra dispositivos offline

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/contexts/clinic-context';
import useSocket from '@/hooks/useSocket';

interface SmartPlugDevice {
  id: string;
  name: string;
  deviceId: string;
  online: boolean;
  relayOn: boolean;
  currentPower?: number;
  voltage?: number;
  temperature?: number;
  equipmentId?: string;
  equipment?: {
    name: string;
    clinicId: string;
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
  
  // Refs para tracking updates
  const messagesReceivedRef = useRef<Set<string>>(new Set());
  
  // ✅ SOCKET - Igual que la página principal
  const { isConnected, subscribe } = useSocket(systemId);

  // 🔥 FETCH INICIAL - Cargar todos los dispositivos asignados a clínicas
  const fetchAllDevices = useCallback(async () => {
    if (!systemId) return;
    
    try {
      console.log('🔄 [FloatingMenu] Cargando dispositivos...');
      
      const response = await fetch(`/api/internal/smart-plug-devices?pageSize=1000&page=1`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('✅ [FloatingMenu] Dispositivos cargados:', {
        total: data.data?.length || 0,
        hasActiveClinic: !!activeClinic?.id
      });
      
      setAllDevices(data.data || []);
      setIsInitialized(true);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('❌ [FloatingMenu] Error cargando dispositivos:', error);
      setAllDevices([]);
    }
  }, [systemId, activeClinic?.id]);

  // 🌐 INICIALIZACIÓN
  useEffect(() => {
    if (systemId && !isInitialized) {
      fetchAllDevices();
    }
  }, [systemId, fetchAllDevices, isInitialized]);

  // 📡 WEBSOCKET TIEMPO REAL - Procesar updates y marcar mensajes recibidos
  useEffect(() => {
    if (!isConnected || !isInitialized) {
      return;
    }

    console.log('📡 [FloatingMenu] WebSocket activo - configurando listener');
    
    const unsubscribe = subscribe((update) => {
      
      console.log('🔍 [FloatingMenu] Mensaje WebSocket recibido:', {
        deviceId: update.deviceId,
        online: update.online,
        relayOn: update.relayOn,
        currentPower: update.currentPower
      });
      
      // 🎯 MARCAR: Mensaje recibido para este dispositivo
      messagesReceivedRef.current.add(update.deviceId);
      
      // Actualizar dispositivo en la lista
      setAllDevices(prev => {
        const deviceIndex = prev.findIndex(device => 
          device.id === update.deviceId || device.deviceId === update.deviceId
        );
        
        if (deviceIndex === -1) {
          console.log('⚠️ [FloatingMenu] Dispositivo no encontrado:', update.deviceId);
          return prev;
        }
        
        const oldDevice = prev[deviceIndex];
        
        // Verificar cambios reales
        const hasChanges = (
          Boolean(oldDevice.online) !== Boolean(update.online) ||
          Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
          Number(oldDevice.currentPower || 0) !== Number(update.currentPower || 0)
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
        
        console.log(`✅ [FloatingMenu] Dispositivo actualizado: ${oldDevice.name} → ${update.online ? 'ONLINE' : 'OFFLINE'}`);
        
        return updated;
      });
      
      setLastUpdate(new Date());
    });
    
    console.log('✅ [FloatingMenu] Listener WebSocket configurado');
    
    return () => {
      unsubscribe();
    };
  }, [subscribe, isConnected, isInitialized]);

  // 🔴 LÓGICA SIMPLE: WebSocket desconectado = todos offline
  useEffect(() => {
    if (!isConnected && isInitialized && allDevices.length > 0) {
      console.log('🔴 [FloatingMenu] WebSocket desconectado - marcando todos como offline');
      
      setAllDevices(prev => prev.map(device => ({ 
        ...device, 
        online: false, 
        relayOn: false, 
        currentPower: 0 
      })));
    }
  }, [isConnected, isInitialized]);

  // 🎯 FILTRADO POR CLÍNICA ACTIVA - Solo equipmentClinicAssignment.clinicId
  const clinicDevices = useMemo(() => {
    if (!activeClinic?.id || allDevices.length === 0) {
      console.log('🏥 [FloatingMenu] Sin clínica activa o sin dispositivos:', {
        hasActiveClinic: !!activeClinic?.id,
        clinicId: activeClinic?.id,
        clinicName: activeClinic?.name,
        totalDevices: allDevices.length
      });
      return [];
    }
    
    console.log('🏥 [FloatingMenu] Filtrando dispositivos por clínica:', {
      clinicId: activeClinic.id,
      clinicName: activeClinic.name,
      totalDevices: allDevices.length
    });
    
    // ✅ FILTRADO SIMPLE: Solo equipmentClinicAssignment.clinicId
    const filtered = allDevices.filter(device => {
      // Solo verificar equipmentClinicAssignment.clinicId
      const hasAssignment = device.equipmentClinicAssignmentId && device.equipmentClinicAssignment?.clinicId === activeClinic.id;
      
      if (hasAssignment) {
        console.log(`✅ [FloatingMenu] ${device.name} → Asignado a clínica ${activeClinic.name}`);
      } else {
        console.log(`❌ [FloatingMenu] ${device.name} → NO asignado (equipmentClinicAssignmentId: ${device.equipmentClinicAssignmentId}, clinicId: ${device.equipmentClinicAssignment?.clinicId})`);
      }
      
      return hasAssignment;
    });
    
    console.log('🏥 [FloatingMenu] Resultado filtrado:', {
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
    const consuming = clinicDevices.filter(d => d.online && d.relayOn).length;
    
    return { total, online, offline, consuming };
  }, [clinicDevices]);

  // 🔥 DISPOSITIVOS ON (para mostrar dinámicamente en el modal)
  const activeDevices = useMemo(() => {
    return clinicDevices.filter(device => device.online && device.relayOn);
  }, [clinicDevices]);

  // 📊 CÁLCULO DE CONSUMO TOTAL (solo dispositivos ON)
  const totalPower = useMemo(() => {
    return activeDevices
      .filter(device => (device.currentPower || 0) > 0.1)
      .reduce((sum, device) => sum + (device.currentPower || 0), 0);
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

      console.log(`✅ [FloatingMenu] Control exitoso: ${deviceId} → ${turnOn ? 'ON' : 'OFF'}`);
      
    } catch (error) {
      console.error('❌ [FloatingMenu] Error controlando dispositivo:', error);
      throw error;
    }
  }, []);

  // 🎯 DATOS FINALES
  if (!systemId || !activeClinic) {
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