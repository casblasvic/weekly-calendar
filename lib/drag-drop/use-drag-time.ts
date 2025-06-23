'use client'

import { useState, useCallback, useRef } from 'react'
import { useDragTime as useDragTimeContext } from './drag-time-context'
import { useGranularity } from './granularity-context'

interface DraggedPosition {
  date: Date
  time: string
  roomId: string
  exactTime: string
  offsetY: number
}

interface UseDragTimeProps {
  slotDuration: number
  rowHeight: number
  appointmentId: string
  originalTime: string
  originalDate: Date
  originalRoomId: string
}

export function useDragTime({ 
  slotDuration, 
  rowHeight, 
  appointmentId,
  originalTime,
  originalDate,
  originalRoomId
}: UseDragTimeProps) {
  const { minuteGranularity } = useGranularity()
  const { 
    isDragging, 
    draggedAppointment, 
    currentDragTime,
    currentDragDate,
    currentDragRoomId,
    updateDragPosition,
    isValidDropPosition
  } = useDragTimeContext()
  
  const [dragPosition, setDragPosition] = useState<DraggedPosition | null>(null)
  const lastUpdateKeyRef = useRef<string>('')

  // Verificar si esta cita específica está siendo arrastrada
  const isThisAppointmentDragging = isDragging && draggedAppointment?.id === appointmentId

  const handleDragOver = useCallback((
    e: React.DragEvent,
    cellDate: Date,
    cellTime: string,
    cellRoomId: string
  ) => {
    if (!isThisAppointmentDragging) {
      setDragPosition(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    
    // Calcular minutos con granularidad
    const minuteOffset = Math.floor((offsetY / rowHeight) * slotDuration)
    const snappedMinuteOffset = Math.floor(minuteOffset / minuteGranularity) * minuteGranularity
    
    // Calcular la hora exacta
    const [hours, minutes] = cellTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + snappedMinuteOffset
    const exactHours = Math.floor(totalMinutes / 60)
    const exactMinutes = totalMinutes % 60
    const exactTime = `${exactHours.toString().padStart(2, '0')}:${exactMinutes.toString().padStart(2, '0')}`
    
    // Crear key única para evitar actualizaciones innecesarias
    const updateKey = `${cellDate.toISOString()}-${exactTime}-${cellRoomId}`
    
    // Solo actualizar si realmente cambió
    if (lastUpdateKeyRef.current !== updateKey) {
      // Calcular la posición Y relativa dentro de la celda
      const snappedOffsetY = (snappedMinuteOffset / slotDuration) * rowHeight
      
      setDragPosition({
        date: cellDate,
        time: cellTime,
        roomId: cellRoomId,
        exactTime,
        offsetY: snappedOffsetY
      })
      
      // Actualizar el contexto global
      updateDragPosition(cellDate, exactTime, cellRoomId)
      lastUpdateKeyRef.current = updateKey
    }
  }, [
    isThisAppointmentDragging, 
    rowHeight, 
    slotDuration, 
    minuteGranularity, 
    updateDragPosition
  ])

  const handleDragLeave = useCallback(() => {
    // No limpiar inmediatamente para evitar parpadeos
    // El contexto global maneja la limpieza al final del drag
  }, [])

  const getDynamicTime = useCallback((): string | null => {
    if (!isThisAppointmentDragging) return null
    return currentDragTime
  }, [isThisAppointmentDragging, currentDragTime])

  const getDynamicDate = useCallback((): Date | null => {
    if (!isThisAppointmentDragging) return null
    return currentDragDate
  }, [isThisAppointmentDragging, currentDragDate])

  const getDynamicRoomId = useCallback((): string | null => {
    if (!isThisAppointmentDragging) return null
    return currentDragRoomId
  }, [isThisAppointmentDragging, currentDragRoomId])

  const isValidPosition = useCallback((date: Date, time: string, roomId: string): boolean => {
    return isValidDropPosition(date, time, roomId)
  }, [isValidDropPosition])

  const resetPosition = useCallback(() => {
    setDragPosition(null)
    lastUpdateKeyRef.current = ''
  }, [])

  return {
    dragPosition,
    handleDragOver,
    handleDragLeave,
    getDynamicTime,
    getDynamicDate,
    getDynamicRoomId,
    isValidPosition,
    resetPosition,
    isThisAppointmentDragging
  }
} 