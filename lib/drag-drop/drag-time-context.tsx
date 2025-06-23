'use client'

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useGranularity } from './granularity-context'
import { useClinic } from '@/contexts/clinic-context'
import { DragItem } from './types'
import { isBusinessDay, getBusinessHours } from '@/services/clinic-schedule-service'

interface DraggedAppointment {
  id: string
  startTime: string
  endTime: string
  duration: number
  roomId: string
  currentDate: Date
  originalDate: Date
  originalTime: string
  originalRoomId: string
  initialOffsetMinutes?: number // Offset desde el inicio de la cita donde se hizo el grab
}

interface DragTimeContextValue {
  // Estado del drag
  isDragging: boolean
  draggedAppointment: DraggedAppointment | null
  
  // Hora dinámica durante el drag
  currentDragTime: string | null
  currentDragDate: Date | null
  currentDragRoomId: string | null
  
  // Funciones de control
  startDrag: (appointment: DraggedAppointment) => void
  updateDragPosition: (date: Date, time: string, roomId: string) => void
  endDrag: () => void
  cancelDrag: () => void
  
  // Validaciones
  isValidDropPosition: (date: Date, time: string, roomId: string) => boolean
  isWithinActiveHours: (date: Date, time: string) => boolean
}

const DragTimeContext = createContext<DragTimeContextValue | null>(null)

interface DragTimeProviderProps {
  children: React.ReactNode
}

export function DragTimeProvider({ children }: DragTimeProviderProps) {
  const { activeClinic } = useClinic()
  const { minuteGranularity } = useGranularity()
  
  // Estado mínimo para el drag
  const [isDragging, setIsDragging] = useState(false)
  const [draggedAppointment, setDraggedAppointment] = useState<DraggedAppointment | null>(null)
  const [currentDragTime, setCurrentDragTime] = useState<string | null>(null) // Hora donde empezará la cita
  const [currentDragDate, setCurrentDragDate] = useState<Date | null>(null)
  const [currentDragRoomId, setCurrentDragRoomId] = useState<string | null>(null)
  const [initialOffsetMinutes, setInitialOffsetMinutes] = useState<number>(0) // Offset desde el inicio de la cita
  
  // Usar ref para evitar actualizaciones innecesarias
  const lastUpdateRef = useRef<string>('')

  const startDrag = useCallback((appointment: DraggedAppointment) => {
    setIsDragging(true)
    setDraggedAppointment(appointment)
    setCurrentDragTime(appointment.startTime)
    setCurrentDragDate(appointment.currentDate)
    setCurrentDragRoomId(appointment.roomId)
    setInitialOffsetMinutes(appointment.initialOffsetMinutes || 0)
    lastUpdateRef.current = `${appointment.currentDate.toISOString()}-${appointment.startTime}-${appointment.roomId}`
  }, [])

  const updateDragPosition = useCallback((date: Date, time: string, roomId: string) => {
    // PROTECCIÓN MÁXIMA ANTI-BUCLE: usar el estado más reciente de initialOffsetMinutes
    const currentOffsetMinutes = initialOffsetMinutes
    
    // 'time' es la posición del cursor, necesitamos calcular donde empezará la cita
    const [hours, minutes] = time.split(':').map(Number)
    const cursorTotalMinutes = hours * 60 + minutes
    
    // Calcular donde empezará la cita restando el offset inicial
    const appointmentStartMinutes = cursorTotalMinutes - currentOffsetMinutes
    
    // Ajustar automáticamente la hora de inicio de la cita a la granularidad más cercana
    const adjustedStartMinutes = Math.round(appointmentStartMinutes / minuteGranularity) * minuteGranularity
    
    // Obtener horarios de apertura y cierre de la clínica
    let finalStartMinutes = Math.max(0, adjustedStartMinutes)
    
    if (activeClinic) {
      const businessHours = getBusinessHours(date, activeClinic)
      if (businessHours) {
        const [openHours, openMinutes] = businessHours.open.split(':').map(Number)
        const [closeHours, closeMinutes] = businessHours.close.split(':').map(Number)
        
        const openTimeMinutes = openHours * 60 + openMinutes
        const closeTimeMinutes = closeHours * 60 + closeMinutes
        
        // Si la hora calculada es anterior a la apertura, ajustar a la hora de apertura
        if (finalStartMinutes < openTimeMinutes) {
          // Ajustar a la granularidad más cercana desde la hora de apertura
          finalStartMinutes = Math.ceil(openTimeMinutes / minuteGranularity) * minuteGranularity
        }
        
        // Si la hora calculada es posterior al cierre, ajustar al cierre
        if (finalStartMinutes >= closeTimeMinutes) {
          finalStartMinutes = closeTimeMinutes - minuteGranularity
        }
      }
    }
    
    const adjustedHours = Math.floor(finalStartMinutes / 60)
    const adjustedMinutes = finalStartMinutes % 60
    const adjustedTime = `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`
    
    // PROTECCIÓN EXTENDIDA: incluir offset en la clave para evitar bucles cuando el offset cambia
    const updateKey = `${date.toISOString()}-${adjustedTime}-${roomId}-${currentOffsetMinutes}`
    
    // ✅ MECÁNICO: Actualización INMEDIATA sin setTimeout para máxima responsividad
    if (lastUpdateRef.current !== updateKey) {
      setCurrentDragTime(adjustedTime) // Hora donde empezará la cita
      setCurrentDragDate(date)
      setCurrentDragRoomId(roomId)
      lastUpdateRef.current = updateKey
    }
  }, [minuteGranularity, activeClinic])  // CORREGIDO: Remover initialOffsetMinutes de dependencies para evitar recreación constante

  const endDrag = useCallback(() => {
    setIsDragging(false)
    setDraggedAppointment(null)
    setCurrentDragTime(null)
    setCurrentDragDate(null)
    setCurrentDragRoomId(null)
    setInitialOffsetMinutes(0)
    lastUpdateRef.current = ''
  }, [])

  const cancelDrag = useCallback(() => {
    if (draggedAppointment) {
      // Restaurar posición original
      setCurrentDragTime(draggedAppointment.originalTime)
      setCurrentDragDate(draggedAppointment.originalDate)
      setCurrentDragRoomId(draggedAppointment.originalRoomId)
    }
    endDrag()
  }, [draggedAppointment, endDrag])

  // Validar si la posición está dentro de los horarios activos de la clínica
  const isWithinActiveHours = useCallback((date: Date, time: string): boolean => {
    if (!activeClinic) return false
    
    // Usar los servicios existentes para validar horarios de negocio
    const isBusinessDayResult = isBusinessDay(date, activeClinic)
    if (!isBusinessDayResult) return false
    
    const businessHours = getBusinessHours(date, activeClinic)
    if (!businessHours) return false
    
    // Verificar si la hora está dentro del rango activo
    const [hours, minutes] = time.split(':').map(Number)
    const timeMinutes = hours * 60 + minutes
    
    const [openHours, openMinutes] = businessHours.open.split(':').map(Number)
    const [closeHours, closeMinutes] = businessHours.close.split(':').map(Number)
    
    const openTimeMinutes = openHours * 60 + openMinutes
    const closeTimeMinutes = closeHours * 60 + closeMinutes
    
    return timeMinutes >= openTimeMinutes && timeMinutes <= closeTimeMinutes
  }, [activeClinic])

  // Validar si la posición de drop es válida
  const isValidDropPosition = useCallback((date: Date, time: string, roomId: string): boolean => {
    // Verificar horarios activos
    if (!isWithinActiveHours(date, time)) {
      return false
    }
    
    // Por ahora, permitir cualquier granularidad para mejorar UX
    // En el futuro se puede restaurar la validación estricta si es necesario
    return true
  }, [isWithinActiveHours])

  // Manejar tecla ESC para cancelar drag
  React.useEffect(() => {
    if (!isDragging) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelDrag()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isDragging, cancelDrag])

  return (
    <DragTimeContext.Provider
      value={{
        isDragging,
        draggedAppointment,
        currentDragTime,
        currentDragDate,
        currentDragRoomId,
        startDrag,
        updateDragPosition,
        endDrag,
        cancelDrag,
        isValidDropPosition,
        isWithinActiveHours
      }}
    >
      {children}
    </DragTimeContext.Provider>
  )
}

export function useDragTime() {
  const context = useContext(DragTimeContext)
  if (!context) {
    throw new Error('useDragTime debe usarse dentro de DragTimeProvider')
  }
  return context
} 