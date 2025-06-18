'use client'

import React, { useRef, useCallback, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AppointmentItem } from '@/components/appointment-item'
import TimeHoverIndicator from '@/components/agenda/time-hover-indicator'
import { Lock } from 'lucide-react'
import { CabinScheduleOverride } from '@prisma/client'
import { Appointment } from '@/types/appointment'

// Constantes para el efecto zebra
const ZEBRA_LIGHT = 'bg-gray-50 dark:bg-gray-800/50'
const ZEBRA_DARK = 'bg-white dark:bg-gray-900'

interface HoverableCellProps {
  day: Date
  time: string
  cabinId: string
  isAvailable: boolean
  isInteractive: boolean
  isClickable: boolean
  isStartOfBlock: boolean
  blockDurationSlots: number
  overrideForCell: CabinScheduleOverride | null
  onCellClick: (date: Date, time: string, roomId: string) => void
  onDragOver: (e: React.DragEvent, date: Date, time: string, roomId: string) => void
  onDrop: (e: React.DragEvent, date: Date, time: string, roomId: string) => void
  appointments: any[]
  slotDuration: number
  minuteGranularity: number
  moveGranularity: number
  active: boolean
  today: boolean
  cabinIndex: number
  setSelectedOverride: (override: CabinScheduleOverride | null) => void
  setIsOverrideModalOpen: (open: boolean) => void
  hasAppointmentAtPosition: (date: Date, time: string, roomId: string, minuteOffset: number) => boolean
  handleAppointmentClick: (appointment: any) => void
  handleAppointmentDragStart: (appointment: any, e?: React.DragEvent) => void
  handleDragEnd: () => void
  dragState: any
  cellHeight: number
  isDaily: boolean
}

const HoverableCell: React.FC<HoverableCellProps> = ({
  day,
  time,
  cabinId,
  isAvailable,
  isInteractive,
  isClickable,
  isStartOfBlock,
  blockDurationSlots,
  overrideForCell,
  onCellClick,
  onDragOver,
  onDrop,
  appointments,
  slotDuration,
  minuteGranularity,
  moveGranularity,
  active,
  today,
  cabinIndex,
  setSelectedOverride,
  setIsOverrideModalOpen,
  hasAppointmentAtPosition,
  handleAppointmentClick,
  handleAppointmentDragStart,
  handleDragEnd,
  dragState,
  cellHeight,
  isDaily
}) => {
  const cellRef = useRef<HTMLDivElement>(null)
  const [hoveredInfo, setHoveredInfo] = useState<{ offsetY: number; exactTime: string } | null>(null)

  // Calcular la hora base en minutos
  const [hours, minutes] = time.split(':').map(Number)
  const baseMinutes = hours * 60 + minutes

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cellRef.current || !isInteractive || !active || overrideForCell) return

    const rect = cellRef.current.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const percentage = Math.max(0, Math.min(1, relativeY / rect.height))
    
    // Calcular el minuto dentro del slot basado en la granularidad
    const slotProgress = percentage * slotDuration
    const minuteOffset = Math.floor(slotProgress / minuteGranularity) * minuteGranularity
    const cappedOffset = Math.min(minuteOffset, slotDuration - minuteGranularity)
    
    // Solo mostrar si no hay citas en esta posición
    if (!hasAppointmentAtPosition(day, time, cabinId, cappedOffset)) {
      const totalMinutes = baseMinutes + cappedOffset
      const displayHours = Math.floor(totalMinutes / 60)
      const displayMinutes = totalMinutes % 60
      const exactTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`
      
      setHoveredInfo({
        offsetY: (cappedOffset / slotDuration) * cellHeight,
        exactTime
      })
    } else {
      setHoveredInfo(null)
    }
  }, [baseMinutes, slotDuration, minuteGranularity, hasAppointmentAtPosition, day, time, cabinId, isInteractive, active, overrideForCell, cellHeight])

  const handleMouseLeave = useCallback(() => {
    setHoveredInfo(null)
  }, [])

  const handleClick = useCallback(() => {
    if (!active) return
    
    if (overrideForCell) {
      setSelectedOverride(overrideForCell)
      setIsOverrideModalOpen(true)
    } else if (isInteractive && hoveredInfo) {
      onCellClick(day, hoveredInfo.exactTime, cabinId)
    } else if (isInteractive) {
      onCellClick(day, time, cabinId)
    }
  }, [overrideForCell, active, setSelectedOverride, setIsOverrideModalOpen, isInteractive, hoveredInfo, onCellClick, day, time, cabinId])

  return (
    <div
      ref={cellRef}
      className={cn(
        "relative h-full",
        // Día Inactivo
        !active && "opacity-70 bg-gray-100 cursor-not-allowed border border-gray-200",
        // Slot Inactivo
        active && !isAvailable && !overrideForCell && [
          "bg-gray-300 dark:bg-gray-700 cursor-not-allowed",
          "border border-white/50 dark:border-white/30",
        ],
        // Slot Bloqueado/Override
        active && overrideForCell && [
          "bg-rose-100 dark:bg-rose-900/30",
          "cursor-pointer",
          "border-r border-gray-200 dark:border-gray-700 last:border-r-0",
          !isStartOfBlock && "border-t-0",
          isStartOfBlock && "border-t border-gray-200 dark:border-gray-700",
        ],
        // Celda Activa y Disponible
        active && isAvailable && !overrideForCell && [
          "border-r border-gray-200 dark:border-gray-700 last:border-r-0",
          "border-t border-gray-200 dark:border-gray-700",
          "hover:bg-purple-100/50 dark:hover:bg-purple-900/30 cursor-pointer",
          !today && (cabinIndex % 2 === 0 ? ZEBRA_LIGHT : ZEBRA_DARK),
        ]
      )}
      style={{
        height: `${cellHeight}px`,
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onDragOver={(e) => {
        if (active && isAvailable && !overrideForCell) {
          onDragOver(e, day, time, cabinId)
        }
      }}
      onDrop={(e) => {
        if (active && isAvailable && !overrideForCell) {
          onDrop(e, day, time, cabinId)
        }
      }}
    >
      {/* Visualización del bloque */}
      {isStartOfBlock && active && overrideForCell && (
        <div
          className="absolute inset-x-0 top-0 z-10 flex items-center justify-center p-1 m-px overflow-hidden text-xs rounded-sm pointer-events-none bg-rose-200/80 border-rose-300 text-rose-700 dark:bg-rose-800/50 dark:border-rose-600 dark:text-rose-200"
          style={{
            height: `calc(${blockDurationSlots * cellHeight}px - 2px)`,
          }}
          title={overrideForCell.description || "Bloqueado"}
        >
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <Lock className="flex-shrink-0 w-3 h-3 mb-1 text-rose-600 dark:text-rose-300" />
            {blockDurationSlots * cellHeight > 30 && (
              <span className="leading-tight break-words line-clamp-2">
                {overrideForCell.description || "Bloqueado"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Línea de hover con hora exacta */}
      {hoveredInfo && (
        <TimeHoverIndicator
          time={hoveredInfo.exactTime}
          offsetY={hoveredInfo.offsetY}
          isDaily={isDaily}
          cellHeight={cellHeight}
        />
      )}

      {/* Renderizar citas */}
      {!overrideForCell && appointments.map((appointmentWithOffset, appointmentIndex) => {
        const { offsetMinutes, ...appointment } = appointmentWithOffset
        const offsetTop = (offsetMinutes / slotDuration) * cellHeight
        
        return (
          <div
            key={appointment.id}
            style={{
              position: 'absolute',
              top: `${offsetTop}px`,
              left: 0,
              right: 0,
              zIndex: 10
            }}
          >
            <AppointmentItem
              appointment={appointment}
              index={appointmentIndex}
              slotDuration={slotDuration}
              onClick={() => handleAppointmentClick && handleAppointmentClick(appointment)}
              onDragStart={handleAppointmentDragStart}
              onDragEnd={handleDragEnd}
              isDragging={dragState?.isDragging && dragState?.draggedItem?.id === appointment.id}
            />
          </div>
        )
      })}

      {/* Preview de drag */}
      {dragState?.isDragging && 
       dragState?.preview && 
       dragState?.draggedItem &&
       dragState?.preview.date.toDateString() === day.toDateString() && 
       dragState?.preview.roomId === cabinId && (() => {
        const [slotHour, slotMinute] = time.split(':').map(Number)
        const slotStartMinutes = slotHour * 60 + slotMinute
        const slotEndMinutes = slotStartMinutes + slotDuration
        
        const [previewHour, previewMinute] = dragState.preview.time.split(':').map(Number)
        const previewStartMinutes = previewHour * 60 + previewMinute
        const previewEndMinutes = previewStartMinutes + dragState.draggedItem.duration
        
        if (previewStartMinutes < slotEndMinutes && previewEndMinutes > slotStartMinutes) {
          const minutesIntoSlot = Math.max(0, previewStartMinutes - slotStartMinutes)
          const offsetPercentage = minutesIntoSlot / slotDuration
          const topOffset = offsetPercentage * cellHeight
          
          const visibleStartMinutes = Math.max(previewStartMinutes, slotStartMinutes)
          const visibleEndMinutes = Math.min(previewEndMinutes, slotEndMinutes)
          const visibleDuration = visibleEndMinutes - visibleStartMinutes
          const height = (visibleDuration / slotDuration) * cellHeight - 2
          
          return (
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${topOffset}px`,
                height: `${height}px`,
                backgroundColor: dragState.draggedItem.color || '#9CA3AF',
                opacity: 0.5,
                borderRadius: '6px',
                border: '2px dashed rgba(0, 0, 0, 0.3)',
                zIndex: 5,
                transition: 'top 0.1s ease-out'
              }}
            >
              <div className="p-1.5 text-xs text-white truncate">
                {dragState.draggedItem.title}
              </div>
            </div>
          )
        }
        return null
      })()}
    </div>
  )
}

export default HoverableCell
