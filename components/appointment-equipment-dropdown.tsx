"use client"

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Power, Loader2, Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { useClinic } from '@/contexts/clinic-context'

interface EquipmentItem {
  id: string
  name: string
  equipmentType: string
  isAvailable: boolean
  smartPlugDevice?: {
    id: string
    deviceId: string
    name: string
    online: boolean
    relayOn: boolean
    currentPower: number
    voltage: number | null
    temperature: number | null
  } | null
}

interface AppointmentEquipmentDropdownProps {
  isVisible: boolean
  onClose: () => void
  availableEquipment: EquipmentItem[]
  onSelectEquipment: (equipmentId: string) => void
  onStartWithoutEquipment: () => void
  triggerRef: React.RefObject<HTMLElement>
  appointmentId: string
  // 🆕 NUEVA PROP: Datos del menú flotante para estado en tiempo real
  smartPlugsData?: {
    deviceStats: { total: number; online: number; offline: number; consuming: number }
    activeDevices: Array<{
      id: string; name: string; deviceId: string; online: boolean; relayOn: boolean;
      currentPower?: number; voltage?: number; temperature?: number;
      equipmentClinicAssignment?: {
        id: string; clinicId: string; deviceName?: string;
        equipment: { id: string; name: string; }; clinic: { id: string; name: string; };
      };
    }>
    totalPower: number
    isConnected: boolean
    onDeviceToggle: (deviceId: string, turnOn: boolean) => Promise<void>
    lastUpdate: Date | null
  }
}

export function AppointmentEquipmentDropdown({
  isVisible,
  onClose,
  availableEquipment,
  onSelectEquipment,
  onStartWithoutEquipment,
  triggerRef,
  appointmentId,
  smartPlugsData
}: AppointmentEquipmentDropdownProps) {
  
  // 🔍 LOG BÁSICO: Verificar si este componente se ejecuta
  console.log('🔍 [APPOINTMENT EQUIPMENT DROPDOWN] Componente montado/actualizado', { isVisible });
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isControlling, setIsControlling] = useState<string | null>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
    right?: number
    positioning: 'left' | 'right'
  }>({ top: 0, left: 0, positioning: 'left' })

  const { data: session } = useSession()
  const { activeClinic } = useClinic()

  // 🎯 FUNCIÓN HELPER para obtener estado en tiempo real del dispositivo desde smartPlugsData
  const getDeviceRealTimeStatus = useCallback((deviceId: string) => {
    if (!smartPlugsData?.activeDevices) return null
    
    // Buscar el dispositivo en los datos del menú flotante (tiempo real)
    return smartPlugsData.activeDevices.find(device => 
      device.id === deviceId || device.deviceId === deviceId
    ) || null
  }, [smartPlugsData])

  // ✅ POSICIONAMIENTO INTELIGENTE COMO LOS TOOLTIPS
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !isVisible) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const dropdownWidth = 320
    const dropdownHeight = 280
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const scrollY = window.scrollY
    
    // ✅ LÓGICA DE POSICIONAMIENTO HORIZONTAL (como AppointmentTooltip)
    let left = triggerRect.right + 8 // Intentar a la derecha primero
    let positioning: 'left' | 'right' = 'right'
    
    // Si no cabe a la derecha, posicionar a la izquierda
    if (left + dropdownWidth > windowWidth - 20) {
      left = triggerRect.left - dropdownWidth - 8
      positioning = 'left'
    }
    
    // ✅ LÓGICA DE POSICIONAMIENTO VERTICAL
    let top = triggerRect.top + scrollY
    
    // Asegurar que no se corte por arriba o abajo
    if (top + dropdownHeight > windowHeight + scrollY - 20) {
      top = windowHeight + scrollY - dropdownHeight - 20
    }
    if (top < scrollY + 80) { // Evitar navbar
      top = scrollY + 80
    }

    setPosition({ top, left, positioning })
  }, [triggerRef, isVisible])

  // ✅ RECALCULAR POSICIÓN al abrir y en cambios de ventana
  useEffect(() => {
    if (isVisible) {
      calculatePosition()
      
      const handleResize = () => calculatePosition()
      const handleScroll = () => calculatePosition()
      
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isVisible, calculatePosition])

  // ✅ CERRAR CON ESC
  useEffect(() => {
    if (!isVisible) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onClose])

  // ✅ HANDLER PARA CONTROLAR DISPOSITIVO usando smartPlugsData
  const handleDeviceControl = useCallback(async (device: NonNullable<EquipmentItem['smartPlugDevice']>) => {
    if (isControlling === device.id || !smartPlugsData?.onDeviceToggle) return

    setIsControlling(device.id)
    try {
      const shouldTurnOn = !device.relayOn
      console.log(`[EquipmentDropdown] 🔧 Controlando dispositivo ${device.name}: ${shouldTurnOn ? 'ON' : 'OFF'}`)
      
      // ✅ USAR LA FUNCIÓN DEL MENÚ FLOTANTE - ya maneja WebSocket y tiempo real
      await smartPlugsData.onDeviceToggle(device.deviceId, shouldTurnOn)
      
      console.log(`[EquipmentDropdown] ✅ Dispositivo ${device.name} controlado exitosamente`)
      
    } catch (error) {
      console.error(`[EquipmentDropdown] ❌ Error controlando dispositivo:`, error)
    } finally {
      setIsControlling(null)
    }
  }, [isControlling, smartPlugsData])

  // ✅ HANDLER PARA SELECCIONAR EQUIPAMIENTO  
  const handleSelectEquipment = useCallback((equipment: EquipmentItem) => {
    console.log('[EquipmentDropdown] 🎯 Equipamiento seleccionado:', equipment.name)
    console.log('[EquipmentDropdown] 🔍 DEBUG - Equipment data:', equipment)
    onSelectEquipment(equipment.id)
    onClose()
  }, [onSelectEquipment, onClose])

  // ✅ HANDLER PARA INICIAR SIN EQUIPAMIENTO
  const handleStartWithoutEquipment = useCallback(() => {
    console.log('[EquipmentDropdown] 🚀 Iniciando sin equipamiento')
    onStartWithoutEquipment()
    onClose()
  }, [onStartWithoutEquipment, onClose])

  if (!isVisible) return null

  // 🔍 DEBUG: Verificar qué datos llegan al dropdown
  console.log('🔍 [DROPDOWN DEBUG] Renderizando dropdown:', {
    appointmentId,
    availableEquipmentCount: availableEquipment?.length || 0,
    smartPlugsConnected: smartPlugsData?.isConnected || false,
    availableEquipment: availableEquipment?.map(eq => ({
      id: eq.id,
      name: eq.name,
      isAvailable: eq.isAvailable,
      smartPlugDevice: eq.smartPlugDevice ? {
        id: eq.smartPlugDevice.id,
        name: eq.smartPlugDevice.name,
        online: eq.smartPlugDevice.online,
        relayOn: eq.smartPlugDevice.relayOn
      } : null
    }))
  });

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed z-[999999] bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-w-sm animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        transformOrigin: position.positioning === 'right' ? 'top left' : 'top right'
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">
          Seleccionar Equipamiento
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Elige el equipo para la cita #{appointmentId.slice(-6)}
        </p>
        
        {/* Estado de conexión (del menú flotante) */}
        {smartPlugsData && (
          <div className="mt-2 flex items-center gap-1 text-[10px]">
            {smartPlugsData.isConnected ? (
              <>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">Tiempo real activo</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span className="text-red-600 font-medium">Sin conexión</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Equipment List */}
      <div className="max-h-48 overflow-y-auto">
        {availableEquipment.map((equipment) => {
          // 🔄 USAR ESTADO EN TIEMPO REAL del menú flotante si está disponible
          let device = equipment.smartPlugDevice
          const realtimeDevice = device ? getDeviceRealTimeStatus(device.id) : null
          
          // Si hay datos en tiempo real, usarlos
          if (realtimeDevice && device) {
            device = {
              ...device,
              online: realtimeDevice.online,
              relayOn: realtimeDevice.relayOn,
              currentPower: realtimeDevice.currentPower || 0,
              voltage: realtimeDevice.voltage,
              temperature: realtimeDevice.temperature
            }
          }
          
          const isOnline = device?.online ?? false
          const isOn = device?.relayOn ?? false
          const power = device?.currentPower ?? 0
          const isBeingControlled = isControlling === device?.id
          
          // 🚨 LÓGICA INTELIGENTE: Dispositivo ON = NO disponible para nueva cita
          const isAvailableForNewAppointment = !isOn && equipment.isAvailable

          return (
            <div
              key={equipment.id}
              className={cn(
                "px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors",
                isAvailableForNewAppointment 
                  ? "hover:bg-gray-50 cursor-pointer" 
                  : "bg-gray-50 cursor-not-allowed opacity-60"
              )}
              onClick={() => {
                console.log('🔍 [DROPDOWN CLICK] Equipment clicked:', equipment.name, { isAvailableForNewAppointment });
                if (isAvailableForNewAppointment) {
                  handleSelectEquipment(equipment);
                }
              }}
              title={
                !isAvailableForNewAppointment 
                  ? isOn 
                    ? "Dispositivo ocupado - ya está en uso" 
                    : "Equipamiento no disponible"
                  : "Usar este equipamiento"
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {equipment.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {equipment.equipmentType}
                    </div>
                    
                    {/* 🚨 INDICADOR DE OCUPADO */}
                    {isOn && (
                      <div className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-medium">
                        OCUPADO
                      </div>
                    )}
                  </div>
                  
                  {device && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        isOnline ? "text-green-600" : "text-red-500"
                      )}>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
                        )} />
                        {isOnline ? 'Online' : 'Offline'}
                      </div>
                      
                      {isOnline && (
                        <>
                          <div className={cn(
                            "text-xs font-medium",
                            isOn ? "text-green-600" : "text-gray-500"
                          )}>
                            {isOn ? 'Encendido' : 'Apagado'}
                          </div>
                          
                          {isOn && power > 0 && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <Zap className="w-3 h-3" />
                              {power.toFixed(1)}W
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Botón de Control de Dispositivo - Solo para equipos disponibles */}
                {device && isOnline && isAvailableForNewAppointment && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeviceControl(device)
                    }}
                    disabled={isBeingControlled}
                    className={cn(
                      "p-2 rounded-full transition-colors ml-2",
                      isOn 
                        ? "bg-green-100 text-green-700 hover:bg-green-200" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                      isBeingControlled && "opacity-50 cursor-not-allowed"
                    )}
                    title={isBeingControlled ? 'Controlando...' : (isOn ? 'Apagar' : 'Encender')}
                  >
                    {isBeingControlled ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <button
          onClick={handleStartWithoutEquipment}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Iniciar sin equipamiento
        </button>
      </div>
    </div>,
    document.body
  )
}
