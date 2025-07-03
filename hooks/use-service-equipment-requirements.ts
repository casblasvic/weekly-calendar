import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useClinic } from '@/contexts/clinic-context'
import useSocket from '@/hooks/useSocket'
import { clientLogger } from '@/lib/utils/client-logger'

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
  
  // Estado principal
  const [allDevices, setAllDevices] = useState<ServiceEquipmentDevice[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requiredEquipmentIds, setRequiredEquipmentIds] = useState<string[]>([])
  const [currentAppointmentUsages, setCurrentAppointmentUsages] = useState<string[]>([])
  
  // ✅ SOCKET - Exactamente igual que el menú flotante
  const { isConnected, subscribe } = useSocket(systemId)

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
      
    } catch (error) {
      console.error('❌ [ServiceEquipment] Error obteniendo equipos requeridos:', error)
      setRequiredEquipmentIds([])
      setAllDevices([])
      setCurrentAppointmentUsages([])
    } finally {
      setIsLoading(false)
    }
  }, [systemId, appointmentId, enabled])

  // 🌐 INICIALIZACIÓN - Cargar equipos requeridos
  useEffect(() => {
    if (systemId && appointmentId && enabled && activeClinic?.id) {
      fetchRequiredEquipment()
    }
  }, [systemId, appointmentId, enabled, activeClinic?.id, fetchRequiredEquipment])

  // 📡 WEBSOCKET TIEMPO REAL - EXACTAMENTE IGUAL que el menú flotante
  useEffect(() => {
    if (!isConnected || !enabled || allDevices.length === 0) {
      return
    }

    clientLogger.verbose('📡 [ServiceEquipment] WebSocket activo - configurando listener')
    
    const unsubscribe = subscribe((update) => {
      
      clientLogger.debug('🔍 [ServiceEquipment] Mensaje WebSocket recibido:', {
        deviceId: update.deviceId,
        online: update.online,
        relayOn: update.relayOn,
        currentPower: update.currentPower
      })
      
      // Actualizar dispositivo en la lista
      setAllDevices(prev => {
        const deviceIndex = prev.findIndex(device => 
          device.id === update.deviceId || device.deviceId === update.deviceId
        )
        
        if (deviceIndex === -1) {
          clientLogger.verbose('⚠️ [ServiceEquipment] Dispositivo no encontrado:', update.deviceId)
          return prev
        }
        
        const oldDevice = prev[deviceIndex]
        
        // Verificar cambios reales
        const hasChanges = (
          Boolean(oldDevice.online) !== Boolean(update.online) ||
          Boolean(oldDevice.relayOn) !== Boolean(update.relayOn) ||
          Number(oldDevice.currentPower || 0) !== Number(update.currentPower || 0)
        )
        
        if (!hasChanges) {
          return prev
        }
        
        // 🎯 CALCULAR NUEVO STATUS BASADO EN ESTADO ACTUAL
        let newStatus: ServiceEquipmentDevice['status'] = 'offline'
        
        if (update.online) {
          if (currentAppointmentUsages.includes(update.deviceId)) {
            newStatus = 'in_use_this_appointment'
          } else if (update.relayOn) {
            newStatus = 'occupied'
          } else {
            newStatus = 'available'
          }
        }
        
        // Actualizar dispositivo
        const updated = [...prev]
        updated[deviceIndex] = { 
          ...oldDevice, 
          online: update.online,
          relayOn: update.relayOn,
          currentPower: update.currentPower,
          voltage: update.voltage,
          temperature: update.temperature,
          status: newStatus,
          lastSeenAt: new Date(update.timestamp)
        }
        
        clientLogger.verbose(`✅ [ServiceEquipment] Dispositivo actualizado: ${oldDevice.name} → ${newStatus.toUpperCase()}`)
        
        return updated
      })
      
      setLastUpdate(new Date())
    })
    
    clientLogger.verbose('✅ [ServiceEquipment] Listener WebSocket configurado')
    
    return () => {
      unsubscribe()
    }
  }, [subscribe, isConnected, enabled, allDevices.length, currentAppointmentUsages])

  // 🔴 LÓGICA SIMPLE: WebSocket desconectado = todos offline
  useEffect(() => {
    if (!isConnected && allDevices.length > 0) {
      clientLogger.verbose('🔴 [ServiceEquipment] WebSocket desconectado - marcando todos como offline')
      
      setAllDevices(prev => prev.map(device => ({ 
        ...device, 
        online: false, 
        relayOn: false, 
        currentPower: 0,
        status: 'offline' as const
      })))
    }
  }, [isConnected, allDevices.length])

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

  // 🎮 FUNCIÓN DE CONTROL - EXACTAMENTE IGUAL que el menú flotante
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
    lastUpdate
  }
} 