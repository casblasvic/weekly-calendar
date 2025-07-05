/**
 * ========================================
 * HOOK PARA CACHE DE DISPOSITIVOS POR CITA
 * ========================================
 * 
 * 🎯 PROPÓSITO: Cachear dispositivos de equipamiento junto con las citas para UX inmediata
 * 
 * 🚀 ESTRATEGIA: Aplicar la misma lógica del menú flotante de enchufes
 * - Cache estático: Lista de dispositivos disponibles para cada cita
 * - Tiempo real: Solo estados que cambian (online, relayOn, currentPower)
 * - Renderizado inmediato: Dropdown abre instantáneamente
 * 
 * 🔄 INTEGRACIÓN CON SISTEMA EXISTENTE:
 * - Coordinado con cache de citas (sliding window)
 * - WebSocket para actualizaciones en tiempo real
 * - Compatible con useServiceEquipmentRequirements existente
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/contexts/clinic-context';
import useSocket from '@/hooks/useSocket';
import { deviceOfflineManager } from '@/lib/shelly/device-offline-manager';
import { useIntegrationModules } from '@/hooks/use-integration-modules';

interface AppointmentDevice {
  id: string;
  name: string;
  deviceId: string;
  online: boolean;
  relayOn: boolean;
  currentPower?: number;
  voltage?: number;
  temperature?: number;
  
  // Info del equipamiento
  equipmentId: string;
  equipmentName: string;
  equipmentClinicAssignmentId: string;
  
  // Info de la asignación
  deviceName?: string;
  cabinName?: string;
  serialNumber?: string;
  
  // Estado para esta cita específica
  status: 'available' | 'occupied' | 'offline' | 'in_use_this_appointment';
  lastSeenAt?: Date;
  credentialId?: string;
}

interface AppointmentDevicesCache {
  [appointmentId: string]: {
    devices: AppointmentDevice[];
    lastFetched: Date;
    isStale: boolean;
  };
}

// 🗄️ CACHE GLOBAL de dispositivos por cita (similar al menú flotante)
const appointmentDevicesCache = new Map<string, AppointmentDevicesCache[string]>();

// ⏱️ CONFIGURACIÓN DE CACHE
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const DEVICE_REFRESH_INTERVAL = 30 * 1000; // 30 segundos para refrescar estados

/**
 * Fetcher de dispositivos para una cita específica
 */
async function fetchAppointmentDevices(appointmentId: string): Promise<AppointmentDevice[]> {
  console.log(`🔍 [AppointmentDevicesCache] Fetching devices for appointment: ${appointmentId}`);
  
  const response = await fetch(`/api/services/equipment-requirements?appointmentId=${appointmentId}`);
  
  if (!response.ok) {
    throw new Error(`Error fetching devices for appointment ${appointmentId}: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Transformar datos para que coincidan con la interfaz esperada
  const devices: AppointmentDevice[] = data.devices?.map((device: any) => ({
    id: device.id,
    name: device.name,
    deviceId: device.deviceId,
    online: device.online,
    relayOn: device.relayOn,
    currentPower: device.currentPower,
    voltage: device.voltage,
    temperature: device.temperature,
    equipmentId: device.equipmentId,
    equipmentName: device.equipmentName,
    equipmentClinicAssignmentId: device.equipmentClinicAssignmentId,
    deviceName: device.deviceName,
    cabinName: device.cabinName,
    serialNumber: device.serialNumber,
    status: device.status,
    lastSeenAt: device.lastSeenAt ? new Date(device.lastSeenAt) : undefined,
    credentialId: device.credentialId
  })) || [];
  
  console.log(`✅ [AppointmentDevicesCache] Fetched ${devices.length} devices for appointment ${appointmentId}`);
  
  return devices;
}

/**
 * Hook principal para cache de dispositivos de cita
 */
export function useAppointmentDevicesCache(appointmentId: string, enabled: boolean = true) {
  const { data: session } = useSession();
  const { activeClinic } = useClinic();
  const { isShellyActive } = useIntegrationModules();
  const { subscribe, isConnected } = useSocket(session?.user?.systemId);
  const queryClient = useQueryClient();

  // 🔄 QUERY CON CACHE INTELIGENTE
  const {
    data: cachedDevices,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['appointment-devices', appointmentId, activeClinic?.id],
    queryFn: () => fetchAppointmentDevices(appointmentId),
    enabled: enabled && !!appointmentId && !!activeClinic?.id && isShellyActive,
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION * 2,
    refetchOnWindowFocus: false,
    refetchInterval: false, // Solo refetch manual para control preciso
  });

  // 📊 ESTADOS EN TIEMPO REAL
  const [realtimeDevices, setRealtimeDevices] = useState<AppointmentDevice[]>([]);

  // 🔄 SINCRONIZAR CACHE INICIAL CON TIEMPO REAL
  useEffect(() => {
    if (cachedDevices) {
      setRealtimeDevices(cachedDevices);
      console.log(`🔄 [AppointmentDevicesCache] Initialized realtime devices for ${appointmentId}:`, cachedDevices.length);
    }
  }, [cachedDevices, appointmentId]);

  // 📡 SUSCRIPCIÓN A ACTUALIZACIONES EN TIEMPO REAL
  useEffect(() => {
    if (!isConnected || !enabled || !appointmentId || realtimeDevices.length === 0) {
      return;
    }

    console.log(`📡 [AppointmentDevicesCache] Setting up realtime updates for appointment ${appointmentId}`);

    const unsubscribe = subscribe((update) => {
      // Solo procesar actualizaciones de dispositivos relevantes para esta cita
      const relevantDevice = realtimeDevices.find(device => 
        device.deviceId === update.deviceId || device.id === update.deviceId
      );

      if (!relevantDevice) {
        return; // No es un dispositivo de esta cita
      }

      console.log(`🔄 [AppointmentDevicesCache] Updating device ${update.deviceId} for appointment ${appointmentId}`);

      // 🚀 ACTUALIZACIÓN OPTIMISTA INMEDIATA
      setRealtimeDevices(prevDevices => 
        prevDevices.map(device => {
          if (device.deviceId === update.deviceId || device.id === update.deviceId) {
            return {
              ...device,
              online: update.online,
              relayOn: update.relayOn,
              currentPower: update.currentPower,
              voltage: update.voltage,
              temperature: update.temperature,
              lastSeenAt: new Date(update.timestamp),
              // Actualizar status basado en el nuevo estado
              status: !update.online ? 'offline' : 
                     update.relayOn ? 'occupied' : 'available'
            };
          }
          return device;
        })
      );
    });

    return () => {
      unsubscribe();
      console.log(`📡 [AppointmentDevicesCache] Unsubscribed from realtime updates for appointment ${appointmentId}`);
    };
  }, [subscribe, isConnected, enabled, appointmentId, realtimeDevices]);

  // 🔄 FUNCIÓN DE CONTROL DE DISPOSITIVO (similar al menú flotante)
  const toggleDevice = useCallback(async (deviceId: string, turnOn: boolean) => {
    console.log(`🔌 [AppointmentDevicesCache] Toggling device ${deviceId}: ${turnOn ? 'ON' : 'OFF'}`);

    try {
      // 🚀 ACTUALIZACIÓN OPTIMISTA INMEDIATA
      setRealtimeDevices(prevDevices => 
        prevDevices.map(device => {
          if (device.deviceId === deviceId || device.id === deviceId) {
            return {
              ...device,
              relayOn: turnOn,
              status: turnOn ? 'occupied' : 'available'
            };
          }
          return device;
        })
      );

      // 📡 LLAMADA A LA API
      const response = await fetch(`/api/shelly/device/${deviceId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: turnOn ? 'on' : 'off' })
      });

      if (!response.ok) {
        throw new Error(`Error controlling device: ${response.status}`);
      }

      console.log(`✅ [AppointmentDevicesCache] Device ${deviceId} toggled successfully`);

    } catch (error) {
      console.error(`❌ [AppointmentDevicesCache] Error toggling device ${deviceId}:`, error);
      
      // 🔄 REVERTIR CAMBIO OPTIMISTA
      setRealtimeDevices(prevDevices => 
        prevDevices.map(device => {
          if (device.deviceId === deviceId || device.id === deviceId) {
            return {
              ...device,
              relayOn: !turnOn, // Revertir
              status: !turnOn ? 'occupied' : 'available'
            };
          }
          return device;
        })
      );

      throw error;
    }
  }, []);

  // 📊 ESTADÍSTICAS (similar al menú flotante)
  const deviceStats = useMemo(() => {
    if (!realtimeDevices.length) {
      return { total: 0, available: 0, occupied: 0, offline: 0, inUseThisAppointment: 0 };
    }

    return {
      total: realtimeDevices.length,
      available: realtimeDevices.filter(d => d.status === 'available').length,
      occupied: realtimeDevices.filter(d => d.status === 'occupied').length,
      offline: realtimeDevices.filter(d => d.status === 'offline').length,
      inUseThisAppointment: realtimeDevices.filter(d => d.status === 'in_use_this_appointment').length
    };
  }, [realtimeDevices]);

  // 🔄 FUNCIÓN DE INVALIDACIÓN
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: ['appointment-devices', appointmentId] 
    });
  }, [queryClient, appointmentId]);

  return {
    devices: realtimeDevices,
    deviceStats,
    isLoading,
    error,
    isConnected,
    toggleDevice,
    invalidateCache,
    refetch,
    hasDevices: realtimeDevices.length > 0,
    lastUpdate: realtimeDevices.length > 0 ? new Date() : null
  };
}

/**
 * Hook para prefetch de dispositivos junto con citas
 */
export function usePrefetchAppointmentDevices() {
  const queryClient = useQueryClient();
  const { activeClinic } = useClinic();
  const { isShellyActive } = useIntegrationModules();

  const prefetchDevicesForAppointments = useCallback(async (appointmentIds: string[]) => {
    if (!activeClinic?.id || !isShellyActive || appointmentIds.length === 0) {
      return;
    }

    console.log(`🚀 [AppointmentDevicesCache] Prefetching devices for ${appointmentIds.length} appointments`);

    const prefetchPromises = appointmentIds.map(appointmentId => 
      queryClient.prefetchQuery({
        queryKey: ['appointment-devices', appointmentId, activeClinic.id],
        queryFn: () => fetchAppointmentDevices(appointmentId),
        staleTime: CACHE_DURATION,
      })
    );

    try {
      await Promise.all(prefetchPromises);
      console.log(`✅ [AppointmentDevicesCache] Prefetch completed for ${appointmentIds.length} appointments`);
    } catch (error) {
      console.error('❌ [AppointmentDevicesCache] Error in prefetch:', error);
    }
  }, [queryClient, activeClinic?.id, isShellyActive]);

  return { prefetchDevicesForAppointments };
}

/**
 * Hook de compatibilidad para reemplazar useServiceEquipmentRequirements gradualmente
 */
export function useAppointmentDevicesWithFallback(appointmentId: string, enabled: boolean = true) {
  const cacheResult = useAppointmentDevicesCache(appointmentId, enabled);
  
  // Si el cache está cargando o no tiene datos, mantener la funcionalidad existente
  if (cacheResult.isLoading || (!cacheResult.hasDevices && enabled)) {
    // Importar y usar el hook existente como fallback
    const { useServiceEquipmentRequirements } = require('@/hooks/use-service-equipment-requirements');
    const fallbackResult = useServiceEquipmentRequirements({ appointmentId, enabled });
    
    if (fallbackResult) {
      return {
        availableDevices: fallbackResult.availableDevices,
        deviceStats: fallbackResult.deviceStats || cacheResult.deviceStats,
        isConnected: fallbackResult.isConnected || cacheResult.isConnected,
        onDeviceToggle: fallbackResult.onDeviceToggle || cacheResult.toggleDevice,
        refetch: fallbackResult.refetch || cacheResult.refetch,
        isLoading: fallbackResult.isLoading || cacheResult.isLoading,
        source: 'fallback'
      };
    }
  }

  // Usar cache como fuente principal
  return {
    availableDevices: cacheResult.devices,
    deviceStats: cacheResult.deviceStats,
    isConnected: cacheResult.isConnected,
    onDeviceToggle: cacheResult.toggleDevice,
    refetch: cacheResult.refetch,
    isLoading: cacheResult.isLoading,
    source: 'cache'
  };
} 