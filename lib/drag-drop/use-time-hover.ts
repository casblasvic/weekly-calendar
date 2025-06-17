'use client'

import { useState, useCallback } from 'react'
import { useGranularity } from './granularity-context'

interface HoveredCell {
  day: Date
  time: string
  cabinId: string
  exactTime: string
  offsetY: number
}

interface UseTimeHoverProps {
  slotDuration: number
  rowHeight: number
  hasAppointmentAtPosition: (day: Date, time: string, cabinId: string, offsetMinutes: number) => boolean
}

export function useTimeHover({ slotDuration, rowHeight, hasAppointmentAtPosition }: UseTimeHoverProps) {
  const { minuteGranularity } = useGranularity()
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null)

  const handleMouseMove = useCallback((
    e: React.MouseEvent,
    day: Date,
    time: string,
    cabinId: string,
    isInteractive: boolean
  ) => {
    if (!isInteractive) {
      setHoveredCell(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    
    // Calcular minutos con granularidad
    const minuteOffset = Math.floor((offsetY / rowHeight) * slotDuration)
    const snappedMinuteOffset = Math.floor(minuteOffset / minuteGranularity) * minuteGranularity
    
    // Verificar si hay una cita en esta posición
    if (hasAppointmentAtPosition(day, time, cabinId, snappedMinuteOffset)) {
      setHoveredCell(null)
      return
    }
    
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + snappedMinuteOffset
    const exactHours = Math.floor(totalMinutes / 60)
    const exactMinutes = totalMinutes % 60
    const exactTime = `${exactHours.toString().padStart(2, '0')}:${exactMinutes.toString().padStart(2, '0')}`
    
    // Calcular la posición Y relativa dentro de la celda
    const snappedOffsetY = (snappedMinuteOffset / slotDuration) * rowHeight
    
    setHoveredCell({
      day,
      time,
      cabinId,
      exactTime,
      offsetY: snappedOffsetY
    })
  }, [minuteGranularity, slotDuration, rowHeight, hasAppointmentAtPosition])

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null)
  }, [])

  const getExactTimeFromHover = useCallback(() => {
    return hoveredCell?.exactTime || null
  }, [hoveredCell])

  return {
    hoveredCell,
    handleMouseMove,
    handleMouseLeave,
    getExactTimeFromHover
  }
}
