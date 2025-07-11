import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useClinic } from '@/contexts/clinic-context'
import { clientLogger } from '@/lib/utils/client-logger'
import { useIntegrationModules } from '@/hooks/use-integration-modules'
import { useQueryClient } from '@tanstack/react-query'
import useSocket from '@/hooks/useSocket'
import { findDeviceInList } from '@/lib/utils/device-id-matcher'

// 🎯 CACHE GLOBAL - Una sola carga por clínica
const serviceEquipmentCache = new Map<string, Record<string, string[]>>()

interface ServiceEquipmentDevice {
  id: string
  name: string
  deviceId: string
  online: boolean
  relayOn: boolean
  currentPower?: number
  voltage?: number
  temperature?: number
  powerThreshold?: number
  
  // Info del equipamiento
  equipmentId: string
  equipmentName: string
  equipmentClinicAssignmentId: string
  
  // Info de la asignación
  deviceName?: string
  cabinName?: string
  serialNumber?: string
  
  // Estado para esta cita específica
  status: 'available' | 'occupied' | 'offline' | 'in_use_this_appointment' | 'completed'
  lastSeenAt?: Date
  credentialId?: string
}

interface ServiceEquipmentRequirementsData {
  // 🎯 DISPOSITIVOS DISPONIBLES PARA LOS SERVICIOS
  availableDevices: ServiceEquipmentDevice[]
  
  // 📊 ESTADÍSTICAS
  deviceStats: {
    total: number
    available: number
    occupied: number
    offline: number
    inUseThisAppointment: number
  }
  
  // 🔌 ESTADO CONEXIÓN
  isConnected: boolean
  isLoading: boolean
  
  // 🎮 FUNCIÓN DE CONTROL
  onDeviceToggle: (deviceId: string, turnOn: boolean) => Promise<void>
  lastUpdate: Date | null
  
  // 🔄 FUNCIÓN DE REFETCH
  refetch: () => Promise<void>
}

interface UseServiceEquipmentRequirementsProps {
  appointmentId: string
  enabled?: boolean
}

export function useServiceEquipmentRequirements({ 
  appointmentId, 
  enabled = true 
}: UseServiceEquipmentRequirementsProps): ServiceEquipmentRequirementsData | null {
  const { activeClinic } = useClinic()
  const { data: session } = useSession()
  const systemId = session?.user?.systemId
  
  // ⚡ VALIDACIÓN TEMPRANA: Solo procesar si hay appointmentId válido
  if (!appointmentId || appointmentId.trim() === '') {
    return null
  }
  
  // 🛡️ PASO 3C: Verificar módulo Shelly activo
  const { isShellyActive, isLoading: isLoadingModules } = useIntegrationModules()
  
  // Si el módulo Shelly está inactivo, no mostrar UI de enchufes
  if (!isShellyActive && !isLoadingModules) {
    return null
  }
  
  const queryClient = useQueryClient();

  const cacheKey = ['equipmentRequirements', appointmentId];

  // Intentar hidratar desde caché inmediatamente
  const cachedReq = queryClient.getQueryData<any>(cacheKey);

  // Estado principal
  const [allDevices, setAllDevices] = useState<ServiceEquipmentDevice[]>(cachedReq?.availableDevices || [])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(cachedReq ? new Date() : null)
  const [isLoading, setIsLoading] = useState(false)
  const [requiredEquipmentIds, setRequiredEquipmentIds] = useState<string[]>(cachedReq?.requiredEquipmentIds || [])
  const [currentAppointmentUsages, setCurrentAppointmentUsages] = useState<string[]>(cachedReq?.currentAppointmentUsages || [])
  
  // ✅ ESTADO CONEXIÓN desde DeviceOfflineManager
  const [isConnected, setIsConnected] = useState(false)

  // 🔄 REF PARA EVITAR STALE CLOSURE
  const currentAppointmentUsagesRef = useRef<string[]>([])
  currentAppointmentUsagesRef.current = currentAppointmentUsages

  // 🔍 OBTENER EQUIPOS REQUERIDOS PARA LOS SERVICIOS DE LA CITA
  const fetchRequiredEquipment = useCallback(async () => {
    if (!systemId || !appointmentId || !enabled) return
    
    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/services/equipment-requirements?appointmentId=${appointmentId}`)
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('❌ [ServiceEquipment] Sesión expirada, redirigiendo al login...')
          window.location.href = '/login'
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      
      setRequiredEquipmentIds(data.requiredEquipmentIds || [])
      setAllDevices(data.availableDevices || [])
      setCurrentAppointmentUsages(data.currentAppointmentUsages || [])
      setLastUpdate(new Date())
      
      // Persistir en caché para futuras hidrataciones
      queryClient.setQueryData(cacheKey, data); // TODO-MULTIUSER invalidar con WS
      
    } catch (error) {
      console.error('❌ [ServiceEquipment] Error obteniendo equipos requeridos:', error)
      setRequiredEquipmentIds([])
      setAllDevices([])
      setCurrentAppointmentUsages([])
    } finally {
      setIsLoading(false)
    }
  }, [systemId, appointmentId, enabled, queryClient])

  // 🌐 INICIALIZACIÓN - Cargar equipos requeridos
  useEffect(() => {
    if (systemId && appointmentId && enabled && activeClinic?.id) {
      fetchRequiredEquipment()
    }
  }, [systemId, appointmentId, enabled, activeClinic?.id, fetchRequiredEquipment])

  // 📡 WEBSOCKET TIEMPO REAL
  // A partir de ahora los estados en vivo de los dispositivos se obtienen desde
  // useSmartPlugsFloatingMenu (Floating Menu). Este hook se limita a cargar la
  // lista de dispositivos candidatos para la cita.

  // 🎯 DISPOSITIVOS DISPONIBLES (ya filtrados por servicios de la cita)
  const availableDevices = useMemo(() => {
    if (!activeClinic?.id || allDevices.length === 0) {
      return []
    }
    
    
    return allDevices
  }, [allDevices, activeClinic?.id, appointmentId])

  // 📊 CONTADORES
  const deviceStats = useMemo(() => {
    const total = availableDevices.length
    const available = availableDevices.filter(d => d.status === 'available').length
    const occupied = availableDevices.filter(d => d.status === 'occupied').length
    const offline = availableDevices.filter(d => d.status === 'offline').length
    const inUseThisAppointment = availableDevices.filter(d => d.status === 'in_use_this_appointment').length
    const completed = availableDevices.filter(d => d.status === 'completed').length
    
    return { total, available, occupied, offline, inUseThisAppointment, completed }
  }, [availableDevices])

  // 🎮 FUNCIÓN DE CONTROL - EXACTAMENTE IGUAL que otros componentes
  const handleDeviceToggle = useCallback(async (deviceId: string, turnOn: boolean) => {
    try {

      const response = await fetch(`/api/shelly/device/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: turnOn ? 'on' : 'off', appointmentId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error desconocido')
      }

      // 🔄 Actualización optimista: modificar relayOn y currentPower
      setAllDevices(prev => prev.map(d => {
        if (d.deviceId === deviceId) {
          return {
            ...d,
            relayOn: turnOn,
            currentPower: turnOn ? d.currentPower : 0
          }
        }
        return d
      }))

      // Revalidar con la API en segundo plano
      fetchRequiredEquipment()

    } catch (error) {
      console.error('❌ [ServiceEquipment] Error controlando dispositivo:', error)
      throw error
    }
  }, [fetchRequiredEquipment])

  // 📡 SUSCRIPCIÓN TIEMPO REAL — actualiza estado local cuando llegue device-update
  const { subscribe, isConnected: socketConnected } = useSocket(systemId)

  useEffect(() => {
    if (!socketConnected || !systemId || availableDevices.length === 0) return

    const off = subscribe((payload: any) => {
      if (payload?.type === 'device-update') {
        // 🛡️ ACTUALIZACIÓN ROBUSTA: Buscar dispositivo usando múltiples identificadores
        setAllDevices(prev => prev.map(d => {
          // Comparar usando función robusta que maneja múltiples tipos de ID
          const targetDevice = { 
            deviceId: payload.deviceId,
            shellyDeviceId: payload.shellyDeviceId 
          };
          const currentDevice = { 
            id: d.id, 
            deviceId: d.deviceId 
          };
          
          // Si coincide por cualquier identificador, actualizar
          if (findDeviceInList(targetDevice, [currentDevice])) {
            return {
              ...d,
              relayOn: payload.relayOn,
              currentPower: payload.currentPower ?? 0,
              online: payload.online
            };
          }
          return d;
        }))
      }
      
      // 🆕 ESCUCHAR CAMBIOS EN ASSIGNMENT/USAGE PARA REFETCH
      if (payload?.type === 'device-assigned' || 
          payload?.type === 'device-control-completed' ||
          payload?.type === 'usage_status_change' ||
          payload?.type === 'auto_shutdown' ||
          payload?.type === 'appointment-timer-update') {
        fetchRequiredEquipment();
      }
    })
    return () => off()
  }, [subscribe, socketConnected, systemId, availableDevices, fetchRequiredEquipment])

  // 🎯 DATOS FINALES
  if (!systemId || !activeClinic || !enabled) {
    return null
  }

  if (appointmentId && appointmentId.trim() !== '' && enabled) {
    
  }

  return {
    availableDevices,
    deviceStats,
    isConnected,
    isLoading,
    onDeviceToggle: handleDeviceToggle,
    lastUpdate,
    refetch: fetchRequiredEquipment
  }
} 