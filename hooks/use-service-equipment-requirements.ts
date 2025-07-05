import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useClinic } from '@/contexts/clinic-context'
import { clientLogger } from '@/lib/utils/client-logger'
import { deviceOfflineManager } from '@/lib/shelly/device-offline-manager'
import { useIntegrationModules } from '@/hooks/use-integration-modules'
import { useQueryClient } from '@tanstack/react-query'

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
  
  // Info del equipamiento
  equipmentId: string
  equipmentName: string
  equipmentClinicAssignmentId: string
  
  // Info de la asignación
  deviceName?: string
  cabinName?: string
  serialNumber?: string
  
  // Estado para esta cita específica
  status: 'available' | 'occupied' | 'offline' | 'in_use_this_appointment'
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
  
  // 🛡️ PASO 3C: Verificar módulo Shelly activo
  const { isShellyActive, isLoading: isLoadingModules } = useIntegrationModules()
  
  // Si el módulo Shelly está inactivo, no mostrar UI de enchufes
  if (!isShellyActive && !isLoadingModules) {
    clientLogger.verbose('🔒 [ServiceEquipment] Módulo Shelly INACTIVO - Ocultando UI de enchufes')
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

  // 🔍 OBTENER EQUIPOS REQUERIDOS PARA LOS SERVICIOS DE LA CITA
  const fetchRequiredEquipment = useCallback(async () => {
    if (!systemId || !appointmentId || !enabled) return
    
    try {
      setIsLoading(true)
      clientLogger.verbose('🔍 [ServiceEquipment] Obteniendo equipos requeridos:', { appointmentId })
      
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
      
      clientLogger.verbose('✅ [ServiceEquipment] Equipos requeridos obtenidos:', {
        appointmentId,
        requiredEquipment: data.requiredEquipmentIds?.length || 0,
        devicesFound: data.availableDevices?.length || 0,
        inUseThisAppointment: data.currentAppointmentUsages?.length || 0
      })
      
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

  // 📡 WEBSOCKET TIEMPO REAL - Conectar al DeviceOfflineManager
  useEffect(() => {
    if (!enabled || allDevices.length === 0) {
      return
    }

    clientLogger.verbose('📡 [ServiceEquipment] Conectando al DeviceOfflineManager...')
    
    // 🔄 CALLBACK PARA UPDATES EN TIEMPO REAL
    const handleDeviceUpdates = (updates: any[]) => {
      clientLogger.debug('🔍 [ServiceEquipment] Updates recibidos:', updates.length)
      
      updates.forEach(update => {
        const { deviceId, online, deviceData, reason, type } = update
        
        // 🎯 MANEJAR EVENTOS ESPECÍFICOS DE ASIGNACIÓN
        if (type === 'device-assigned' && update.appointmentId === appointmentId) {
          clientLogger.verbose('🎯 [ServiceEquipment] Dispositivo asignado a esta cita:', {
            deviceId: update.deviceId,
            appointmentId: update.appointmentId,
            usageId: update.usageId
          })
          
          // Actualizar currentAppointmentUsages
          setCurrentAppointmentUsages(prev => {
            if (!prev.includes(update.deviceId)) {
              return [...prev, update.deviceId]
            }
            return prev
          })
          
          // Actualizar estado del dispositivo inmediatamente
          setAllDevices(prev => prev.map(device => {
            if (device.deviceId === update.deviceId) {
              return {
                ...device,
                status: 'in_use_this_appointment' as const
              }
            }
            return device
          }))
          
          setLastUpdate(new Date())
          return
        }
        
        // 🎯 MANEJAR CONTROL COMPLETADO
        if (type === 'device-control-completed' && update.appointmentId === appointmentId) {
          clientLogger.verbose('🎯 [ServiceEquipment] Control completado para esta cita:', {
            deviceId: update.deviceId,
            deviceTurnedOn: update.deviceTurnedOn
          })
          
          // Actualizar estado del dispositivo con el nuevo estado del relay
          setAllDevices(prev => prev.map(device => {
            if (device.deviceId === update.deviceId) {
              return {
                ...device,
                relayOn: update.deviceTurnedOn,
                status: 'in_use_this_appointment' as const
              }
            }
            return device
          }))
          
          setLastUpdate(new Date())
          return
        }
        
        if (deviceId === 'ALL') {
          // Update masivo para todos los dispositivos
          setAllDevices(prev => prev.map(device => ({
            ...device,
            online,
            relayOn: online ? device.relayOn : false,
            currentPower: online ? device.currentPower : null,
            status: online ? device.status : 'offline'
          })))
          return
        }
        
        // Update individual por dispositivo
        setAllDevices(prev => {
          const deviceIndex = prev.findIndex(device => 
            device.id === deviceId || device.deviceId === deviceId
          )
          
          if (deviceIndex === -1) {
            clientLogger.verbose('⚠️ [ServiceEquipment] Dispositivo no encontrado:', deviceId)
            return prev
          }
          
          const oldDevice = prev[deviceIndex]
          
          // 🎯 APLICAR LÓGICA DE VALIDACIÓN igual que otros componentes
          const hasValidConsumption = deviceData?.hasValidConsumption ?? false
          const currentPower = deviceData?.currentPower ?? null
          
          // 🎯 CALCULAR NUEVO STATUS con lógica de dos niveles
          let newStatus: ServiceEquipmentDevice['status'] = 'offline'
          
          if (online) {
            if (currentAppointmentUsages.includes(deviceId)) {
              newStatus = 'in_use_this_appointment'
            } else if (deviceData?.relayOn && hasValidConsumption && currentPower && currentPower > 0.1) {
              newStatus = 'occupied'
            } else {
              newStatus = 'available'
            }
          }
          
          // Verificar cambios reales
          const hasChanges = (
            Boolean(oldDevice.online) !== Boolean(online) ||
            Boolean(oldDevice.relayOn) !== Boolean(deviceData?.relayOn) ||
            Number(oldDevice.currentPower || 0) !== Number(currentPower || 0) ||
            oldDevice.status !== newStatus
          )
          
          if (!hasChanges) {
            return prev
          }
          
          // Actualizar dispositivo
          const updated = [...prev]
          updated[deviceIndex] = { 
            ...oldDevice, 
            online,
            relayOn: deviceData?.relayOn ?? false,
            currentPower,
            voltage: deviceData?.voltage ?? oldDevice.voltage,
            temperature: deviceData?.temperature ?? oldDevice.temperature,
            status: newStatus,
            lastSeenAt: new Date()
          }
          
          clientLogger.verbose(`✅ [ServiceEquipment] Dispositivo actualizado: ${oldDevice.name} → ${newStatus.toUpperCase()}`)
          
          return updated
        })
      })
      
      setLastUpdate(new Date())
    }

    // 🔄 CALLBACK PARA ESTADO DE CONEXIÓN
    const handleConnectionChange = (connected: boolean) => {
      clientLogger.verbose(`🔌 [ServiceEquipment] Estado conexión: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`)
      setIsConnected(connected)
      
      // Si se desconecta, marcar todos como offline
      if (!connected) {
        setAllDevices(prev => prev.map(device => ({ 
          ...device, 
          online: false, 
          relayOn: false, 
          currentPower: null,
          status: 'offline' as const
        })))
      }
    }

    // 🎯 SUSCRIBIRSE AL DEVICEOFFLINEMANAGER
    const unsubscribe = deviceOfflineManager.subscribe(handleDeviceUpdates)
    
    // Estado inicial de conexión
    setIsConnected(deviceOfflineManager.getStats().isWebSocketConnected)
    
    // Monitorear cambios de conexión
    const connectionCheckInterval = setInterval(() => {
      const currentConnection = deviceOfflineManager.getStats().isWebSocketConnected
      setIsConnected(prev => {
        if (prev !== currentConnection) {
          clientLogger.verbose(`🔌 [ServiceEquipment] Estado conexión cambió: ${currentConnection ? 'CONECTADO' : 'DESCONECTADO'}`)
        }
        return currentConnection
      })
    }, 1000) // Verificar cada segundo
    
    clientLogger.verbose('✅ [ServiceEquipment] Suscrito al DeviceOfflineManager')
    
    return () => {
      unsubscribe()
      clearInterval(connectionCheckInterval)
      clientLogger.verbose('🔄 [ServiceEquipment] Desuscrito del DeviceOfflineManager')
    }
  }, [enabled, allDevices.length, currentAppointmentUsages])

  // 🎯 DISPOSITIVOS DISPONIBLES (ya filtrados por servicios de la cita)
  const availableDevices = useMemo(() => {
    if (!activeClinic?.id || allDevices.length === 0) {
      return []
    }
    
    clientLogger.verbose('🎯 [ServiceEquipment] Dispositivos disponibles para cita:', {
      appointmentId,
      totalDevices: allDevices.length,
      clinicId: activeClinic.id
    })
    
    return allDevices
  }, [allDevices, activeClinic?.id, appointmentId])

  // 📊 CONTADORES
  const deviceStats = useMemo(() => {
    const total = availableDevices.length
    const available = availableDevices.filter(d => d.status === 'available').length
    const occupied = availableDevices.filter(d => d.status === 'occupied').length
    const offline = availableDevices.filter(d => d.status === 'offline').length
    const inUseThisAppointment = availableDevices.filter(d => d.status === 'in_use_this_appointment').length
    
    return { total, available, occupied, offline, inUseThisAppointment }
  }, [availableDevices])

  // 🎮 FUNCIÓN DE CONTROL - EXACTAMENTE IGUAL que otros componentes
  const handleDeviceToggle = useCallback(async (deviceId: string, turnOn: boolean) => {
    try {
      clientLogger.verbose(`🎮 [ServiceEquipment] Controlando dispositivo: ${deviceId} → ${turnOn ? 'ON' : 'OFF'}`)
      
      const response = await fetch(`/api/shelly/device/${deviceId}/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: turnOn ? 'on' : 'off' })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error desconocido')
      }

      clientLogger.verbose(`✅ [ServiceEquipment] Control exitoso: ${deviceId} → ${turnOn ? 'ON' : 'OFF'}`)
      
    } catch (error) {
      console.error('❌ [ServiceEquipment] Error controlando dispositivo:', error)
      throw error
    }
  }, [])

  // 🎯 DATOS FINALES
  if (!systemId || !activeClinic || !enabled) {
    clientLogger.verbose('🔒 [ServiceEquipment] No disponible:', {
      hasSystemId: !!systemId,
      hasActiveClinic: !!activeClinic,
      enabled,
      appointmentId
    })
    return null
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