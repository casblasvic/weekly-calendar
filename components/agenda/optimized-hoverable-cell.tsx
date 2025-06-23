'use client'

import React, { useRef, useCallback, useState, memo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { AppointmentItem } from '@/components/appointment-item'
import TimeHoverIndicator from '@/components/agenda/time-hover-indicator'
import { Lock } from 'lucide-react'
import { CabinScheduleOverride } from '@prisma/client'
import { useLocalDragPreview } from '@/lib/drag-drop/optimized-hooks'
import { useGlobalHoverState } from '@/lib/hooks/use-global-hover-state'
import { useDragTime } from '@/lib/drag-drop/drag-time-context'
import { useClinic } from '@/contexts/clinic-context'

// Constantes para el efecto zebra
const ZEBRA_LIGHT = 'bg-gray-50 dark:bg-gray-800/50'
const ZEBRA_DARK = 'bg-white dark:bg-gray-900'

interface OptimizedHoverableCellProps {
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
  globalDragState: any
  updateCurrentPosition: (date: Date, time: string, roomId: string) => void
  handleAppointmentDrop: (appointmentId: string, newDate: Date, newTime: string, newRoomId: string) => void
  onDurationChange?: (appointmentId: string, newDuration: number) => void
  isDraggingDuration?: boolean
  onDraggingDurationChange?: (isDragging: boolean) => void
  onRevertExtension?: (appointmentId: string) => void
  onTagsUpdate?: (appointmentId: string, tagIds: string[]) => void
  onMoveAppointment?: (appointmentId: string) => void
  onDeleteAppointment?: (appointmentId: string, showConfirm?: boolean) => void
  onTimeAdjust?: (appointmentId: string, direction: 'up' | 'down') => void
  onClientNameClick?: (appointment: any) => void
  updateDragDirection?: (direction: 'up' | 'down' | 'neutral') => void
}

const OptimizedHoverableCell: React.FC<OptimizedHoverableCellProps> = memo(({
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
  isDaily,
  globalDragState,
  updateCurrentPosition,
  handleAppointmentDrop,
  onDurationChange,
  isDraggingDuration = false,
  onDraggingDurationChange,
  onRevertExtension,
  onTagsUpdate,
  onMoveAppointment,
  onDeleteAppointment,
  onTimeAdjust,
  onClientNameClick,
  updateDragDirection
}) => {
  const cellRef = useRef<HTMLDivElement>(null)
  
  // Obtener información de cabinas del contexto
  const { activeClinicCabins } = useClinic()
  
  // Usar el nuevo contexto de drag
  const { 
    isDragging, 
    draggedAppointment, 
    currentDragTime,
    currentDragDate,
    currentDragRoomId,
    updateDragPosition,
    startDrag,
    endDrag
  } = useDragTime()
  
  // Usar estado global de hover
  const { hoveredInfo, setHoveredInfo, clearHover } = useGlobalHoverState()
  
  // Generar un ID único para esta celda
  const cellId = `${day.toISOString()}-${time}-${cabinId}`
  
  // Solo mostrar el hover si es para esta celda específica
  const showHover = hoveredInfo?.cellId === cellId
  
  // Hook optimizado para el drag preview local
  const { 
    localPreview, 
    handleDragOver: handleLocalDragOver, 
    handleDragLeave,
    shouldShowPreview 
  } = useLocalDragPreview(
    dragState,
    day,
    time,
    cabinId,
    slotDuration,
    cellHeight,
    updateCurrentPosition,
    updateDragDirection || (() => {}),
    cellRef
  )

  // Calcular la hora base en minutos
  const [hours, minutes] = time.split(':').map(Number)
  const baseMinutes = hours * 60 + minutes

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cellRef.current || !isInteractive || !active || overrideForCell || isDraggingDuration) return





    // Verificar si el target es una cita - PERO solo bloquear si NO hay drag activo
    const target = e.target as HTMLElement
    
    // CORREGIDO: Durante drag, permitir granularidades sobre la cita translúcida
    const appointmentElement = target.closest('[data-appointment-item]')
    if (appointmentElement && !isDragging) {
      clearHover()
      return
    }
    
    // Si estamos haciendo drag Y hay una cita translúcida, verificar si es la cita siendo arrastrada
    if (appointmentElement && isDragging && draggedAppointment) {
      // Si es la misma cita que se está arrastrando, PERMITIR granularidades sobre ella
      const appointmentId = appointmentElement.getAttribute('data-appointment-id')
      
      if (appointmentId === draggedAppointment.id) {
        // Permitir continuar - no bloquear granularidades sobre la cita propia
      } else {
        // Si es otra cita, bloquear
        clearHover()
        return
      }
    }

    const rect = cellRef.current?.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    const percentage = Math.max(0, Math.min(1, relativeY / rect.height))
    
    // Calcular el minuto dentro del slot basado en la granularidad
    const slotProgress = percentage * slotDuration
    const minuteOffset = Math.round(slotProgress / minuteGranularity) * minuteGranularity
    // CORREGIDO: Permitir granularidades hasta el final de la celda (inclusive)
    let cappedOffset = Math.min(minuteOffset, slotDuration)
    
    // ✅ CORRECCIÓN: Durante drag, mostrar granularidades NORMALES
    // El contexto de drag se encarga de calcular la posición final
    // Aquí solo mostramos granularidades para guía visual
    
    // LÓGICA MEJORADA: Crear función local que use el contexto de drag
    const hasAppointmentAtPositionLocal = (offsetMinutes: number): boolean => {
      const [hours, minutes] = time.split(':').map(Number);
      const hoverTimeInMinutes = hours * 60 + minutes + offsetMinutes;
      
      return appointments.some(apt => {
        // ✅ EXCLUIR la cita que está siendo arrastrada actualmente usando el contexto
        if (isDragging && draggedAppointment && apt.id === draggedAppointment.id) {
          return false; // No contar la cita que se está arrastrando
        }
        
        // Obtener hora de inicio y fin de la cita
        const aptStartTime = typeof apt.startTime === 'string' ? apt.startTime : '00:00';
        const [aptHours, aptMinutes] = aptStartTime.split(':').map(Number);
        const aptStartMinutes = aptHours * 60 + aptMinutes;
        const aptEndMinutes = aptStartMinutes + apt.duration;

        // Verificar si el punto del hover está dentro del rango de la cita
        return hoverTimeInMinutes >= aptStartMinutes && hoverTimeInMinutes < aptEndMinutes;
      });
    };
    
    // Si hay drag activo, SIEMPRE mostrar granularidades (ignorar cita sombreada)
    // Si NO hay drag, verificar que no haya citas reales en esa posición
    const hasAppointment = hasAppointmentAtPositionLocal(cappedOffset);
    const allowGranularity = isDragging ? true : !hasAppointment;
    


    
    if (allowGranularity) {
      const totalMinutes = baseMinutes + cappedOffset
      const displayHours = Math.floor(totalMinutes / 60)
      const displayMinutes = totalMinutes % 60
      const exactTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`
      
      setHoveredInfo({
        cellId,
        offsetY: (cappedOffset / slotDuration) * cellHeight,
        exactTime
      })
    } else {
      clearHover()
    }
  }, [baseMinutes, slotDuration, minuteGranularity, appointments, day, time, cabinId, isInteractive, active, overrideForCell, cellHeight, cellId, setHoveredInfo, clearHover, isDraggingDuration, isDragging, draggedAppointment])

  const handleMouseLeave = useCallback(() => {
    clearHover()
  }, [clearHover])

  const handleClick = useCallback(() => {
    if (!active) return
    
    // No abrir modal si estamos haciendo resize
    if (document.body.dataset.resizing === 'true') {
      return
    }
    
    if (overrideForCell) {
      setSelectedOverride(overrideForCell)
      setIsOverrideModalOpen(true)
    } else if (isInteractive && showHover) {
      onCellClick(day, hoveredInfo!.exactTime, cabinId)
    } else if (isInteractive) {
      onCellClick(day, time, cabinId)
    }
  }, [overrideForCell, active, setSelectedOverride, setIsOverrideModalOpen, isInteractive, showHover, hoveredInfo, onCellClick, day, time, cabinId])

  const handleDropWithExactTime = useCallback((e: React.DragEvent) => {
    if (active && isAvailable && !overrideForCell) {
      // Usar el tiempo actual del drag (ya ajustado automáticamente a granularidad por el contexto)
      const exactTime = currentDragTime || time;
      

      onDrop(e, day, exactTime, cabinId);
      
      // Finalizar el drag en el contexto
      endDrag();
    }
  }, [active, isAvailable, overrideForCell, currentDragTime, time, onDrop, day, cabinId, endDrag])
  
  // ANTI-BUCLE: Solo ref para tracking de posición
  const lastDragPositionRef = useRef<string | null>(null)

  // Manejar drag over para actualizar posición en tiempo real
  const handleDragOverCell = useCallback((e: React.DragEvent) => {
    // SIEMPRE llamar al handler local original para hover/granularidades
    handleLocalDragOver(e)
    
    // ✅ NO mostrar granularidades azules durante drag
    // Solo la línea verde debe aparecer (posición final de la cita)
    
    // Solo actualizar contexto de drag si realmente está dragging
    if (isDragging && cellRef.current && draggedAppointment) {
      // ✅ USAR EL MISMO CÁLCULO SECUENCIAL que las granularidades azules
      const rect = cellRef.current.getBoundingClientRect()
      let relativeY = e.clientY - rect.top
      
      // Si está en zona extendida negativa (arriba de la celda), ajustar
      if (relativeY < 0) {
        relativeY = Math.max(relativeY, -20);
        relativeY = 0; // Mapear al inicio de la celda
      }
      
      const percentage = Math.max(0, Math.min(1, relativeY / cellHeight))
      const slotProgress = percentage * slotDuration
      
      // ✅ UNIFICADO: Usar EXACTAMENTE la misma lógica que hover normal
      const minuteOffset = Math.round(slotProgress / minuteGranularity) * minuteGranularity
      const cappedOffset = Math.min(minuteOffset, slotDuration)
      
      // ✅ APLICAR offset inicial DESPUÉS del cálculo perfecto de granularidad
      const cursorTotalMinutes = baseMinutes + cappedOffset
      const appointmentStartMinutes = cursorTotalMinutes - (draggedAppointment.initialOffsetMinutes || 0)
      
      // ✅ SIMPLE: Redondear al final para mantener coherencia
      const adjustedStartMinutes = Math.round(appointmentStartMinutes / minuteGranularity) * minuteGranularity
      
      const displayHours = Math.floor(adjustedStartMinutes / 60)
      const displayMinutes = adjustedStartMinutes % 60
      const finalTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`
      
      // ✅ MECÁNICO: Actualización INMEDIATA sin throttling para máxima responsividad
      if (lastDragPositionRef.current !== finalTime) {
        lastDragPositionRef.current = finalTime
        
        // ✅ INMEDIATO: Sin setTimeout para sensación mecánica
        updateDragPosition(day, finalTime, cabinId)
      }
    }
  }, [handleLocalDragOver, isDragging, cellRef, draggedAppointment, hoveredInfo, cellId, cellHeight, slotDuration, minuteGranularity, baseMinutes, day, cabinId, updateDragPosition])

  // Preview simplificado - solo mostrar línea de granularidad objetivo
  // El sistema de granularidad ya existente se encargará de mostrar la línea visual

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
      onDragOver={handleDragOverCell}
      onDragLeave={handleDragLeave}
      onDrop={handleDropWithExactTime}
    >
      {/* Área de drop extendida para las primeras celdas - más fácil acceso */}
      {active && isAvailable && !overrideForCell && (() => {
        // Identificar si es una de las primeras horas del día para extender el área
        const [currentHour, currentMinutes] = time.split(':').map(Number);
        const isTopArea = currentHour <= 10; // Primeras horas del día hasta las 10 AM
        
        // CORREGIDO: NO crear área extendida en celdas :15, :30, :45 para evitar superponer la celda anterior
        const isQuarterHour = currentMinutes === 15 || currentMinutes === 30 || currentMinutes === 45;
        
        // CORREGIDO: NO crear área extendida en 10:00 porque bloquea la parte inferior de 09:45
        const blocks09_45 = currentHour === 10 && currentMinutes === 0;
        
        return isTopArea && !isQuarterHour && !blocks09_45;
      })() && (
        <div
          className="absolute left-0 right-0 pointer-events-auto"
          style={{
            top: '-20px', // Extender 20px hacia arriba para mejor acceso
            height: '20px',
            zIndex: 5
          }}
          onDragOver={handleDragOverCell}
          onDragLeave={handleDragLeave}
          onDrop={handleDropWithExactTime}
          title={`Zona extendida para drop en ${time} (más fácil acceso)`}
        />
      )}
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

      {/* Línea de hora al hacer hover (Granularidad) - SOLO sin drag */}
      {showHover && isInteractive && !overrideForCell && !isDragging && (
        <TimeHoverIndicator 
          time={hoveredInfo!.exactTime}
          offsetY={hoveredInfo!.offsetY}
          isDaily={isDaily}
          cellHeight={cellHeight}
        />
      )}

      {/* UNA SOLA línea de granularidad - SOLO en la celda exacta con fecha + cabina + hora */}
      {isDragging && draggedAppointment && isInteractive && !overrideForCell && (() => {
        // VERIFICACIÓN ULTRA ESTRICTA: Solo mostrar en la celda exacta
        // 1. Misma cabina
        const isDragInThisColumn = currentDragRoomId === cabinId;
        
                 // 2. Misma fecha (comparar con la fecha ACTUAL del drag, no la original)
         const cellDate = day; // Fecha de esta celda
         const isSameDate = currentDragDate ? currentDragDate.toDateString() === cellDate.toDateString() : false;
        
        // 3. Verificar que la hora de drag esté en el rango de esta celda
        let isHourInThisCell = false;
        if (currentDragTime) {
          const [dragHours, dragMinutes] = currentDragTime.split(':').map(Number);
          const dragTotalMinutes = dragHours * 60 + dragMinutes;
          const [cellHours, cellMinutes] = time.split(':').map(Number);
          const cellStartMinutes = cellHours * 60 + cellMinutes;
          const cellEndMinutes = cellStartMinutes + slotDuration;
          
          isHourInThisCell = dragTotalMinutes >= cellStartMinutes && dragTotalMinutes < cellEndMinutes;
        }
        
        // SOLO mostrar si todas las condiciones se cumplen
        if (!isDragInThisColumn || !isSameDate || !isHourInThisCell) {
          return null; // No mostrar nada si no cumple TODAS las condiciones
        }
        
        // Calcular posición exacta de la línea
        const [dragHours, dragMinutes] = currentDragTime.split(':').map(Number);
        const dragTotalMinutes = dragHours * 60 + dragMinutes;
        const [cellHours, cellMinutes] = time.split(':').map(Number);
        const cellStartMinutes = cellHours * 60 + cellMinutes;
        
        const offsetMinutes = dragTotalMinutes - cellStartMinutes;
        const offsetY = (offsetMinutes / slotDuration) * cellHeight;
        
        return (
          <div key={`single-granularity-line-${currentDragTime}-${cabinId}-${day.toDateString()}`}>
            {/* UNA SOLA línea verde fina - z-50 para estar sobre cabeceras */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-50 bg-green-500"
              style={{
                top: `${offsetY}px`,
                height: '2px',
                opacity: 0.8
              }}
            />
            
            {/* Indicador de hora pequeño - z-50 para estar sobre cabeceras */}
            <div
              className="absolute left-0 pointer-events-none z-50 text-xs px-1 py-0.5 bg-green-500 text-white rounded-r font-medium"
              style={{
                top: `${offsetY}px`,
                transform: 'translateY(-50%)',
                fontSize: '10px'
              }}
            >
              {currentDragTime}
            </div>
          </div>
        );
      })()}

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
              onClick={(apt) => {
                if (handleAppointmentClick) {
                  handleAppointmentClick(apt);
                }
              }}
              onDragStart={(apt, e, initialOffsetMinutes) => {
                // ✅ SNAP TO TOP: Automáticamente "mover" cursor al borde superior de la cita
                // Esto elimina la complejidad del offset inicial
                startDrag({
                  id: apt.id,
                  startTime: apt.startTime,
                  endTime: apt.endTime || `${parseInt(apt.startTime.split(':')[0]) + Math.floor((parseInt(apt.startTime.split(':')[1]) + apt.duration) / 60)}:${(parseInt(apt.startTime.split(':')[1]) + apt.duration) % 60}`,
                  duration: apt.duration,
                  roomId: apt.roomId,
                  currentDate: apt.date,
                  originalDate: apt.date,
                  originalTime: apt.startTime,
                  originalRoomId: apt.roomId,
                  initialOffsetMinutes: 0 // ✅ SNAP TO TOP: Siempre empezar desde arriba
                });
                
                // También llamar al handler existente
                if (handleAppointmentDragStart) {
                  handleAppointmentDragStart(apt, e);
                }
              }}
              onDragEnd={() => {
                endDrag();
                if (handleDragEnd) {
                  handleDragEnd();
                }
              }}
              isDragging={isDragging && draggedAppointment?.id === appointment.id}
              draggedTime={isDragging && draggedAppointment?.id === appointment.id ? currentDragTime : undefined}
              onDurationChange={onDurationChange}
              onDraggingDurationChange={onDraggingDurationChange}
              onRevertExtension={onRevertExtension}
              onTagsUpdate={onTagsUpdate}
              onMoveAppointment={onMoveAppointment}
              onDeleteAppointment={onDeleteAppointment}
              onTimeAdjust={onTimeAdjust}
              onClientNameClick={(apt) => {
                if (onClientNameClick) {
                  onClientNameClick(apt);
                }
              }}
              viewType="week"
              visibleDuration={appointment.visibleDuration}
              appointments={appointments}
              minuteGranularity={minuteGranularity}
            />
          </div>
        )
      })}

      {/* El preview ahora se maneja a través del sistema de granularidad existente */}
    </div>
  )
}, (prevProps, nextProps) => {
  // Optimización: solo re-renderizar si cambian props relevantes
  return (
    prevProps.appointments === nextProps.appointments &&
    prevProps.isAvailable === nextProps.isAvailable &&
    prevProps.overrideForCell === nextProps.overrideForCell &&
    prevProps.active === nextProps.active &&
    prevProps.today === nextProps.today &&
    // Solo re-renderizar si el drag afecta a esta celda específica
    (!nextProps.dragState?.isDragging || 
     (prevProps.dragState?.isDragging === nextProps.dragState?.isDragging &&
      prevProps.dragState?.draggedItem?.id === nextProps.dragState?.draggedItem?.id))
  )
})

OptimizedHoverableCell.displayName = 'OptimizedHoverableCell'

export default OptimizedHoverableCell
