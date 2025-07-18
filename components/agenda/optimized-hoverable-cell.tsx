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
import { useMoveAppointment } from '@/contexts/move-appointment-context'
import { useWeeklyAgendaData } from '@/lib/hooks/use-weekly-agenda-data'
import { validateAppointmentSlot } from '@/utils/appointment-validation'

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
  onStartAppointment?: (appointmentId: string) => void
  onClientNameClick?: (appointment: any) => void
  updateDragDirection?: (direction: 'up' | 'down' | 'neutral') => void
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
  onStartAppointment,
  onClientNameClick,
  updateDragDirection,
  smartPlugsData
}) => {
  const cellRef = useRef<HTMLDivElement>(null)
  
  // ✅ USAR DATOS DIRECTOS DEL CACHE para garantizar consistencia con el sistema de drop
  const { appointments: cacheAppointments } = useWeeklyAgendaData(day)
  
  // Obtener información de cabinas del contexto
  const { activeClinic } = useClinic()
  
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
  
  // ✅ DETECTAR CITA EN MOVIMIENTO para granularidades verdes
  const { appointmentInMovement, isMovingAppointment, confirmMove, validateSlot } = useMoveAppointment()
  
  // Generar un ID único para esta celda
  const cellId = `${day.toISOString()}-${time}-${cabinId}`
  
  // Solo mostrar el hover si es para esta celda específica
  const showHover = hoveredInfo?.cellId === cellId
  
  // ✅ VALIDACIÓN DE CONFLICTOS PARA FEEDBACK VISUAL - USANDO CACHE DIRECTO
  const validateHoverSlot = useCallback((exactTime: string) => {
    // ✅ USAR DATOS DEL CACHE para garantizar consistencia absoluta
    const appointmentsToUse = cacheAppointments || appointments || [];
    
    // Para movimiento de citas
    if (isMovingAppointment && appointmentInMovement) {
      return validateSlot({ date: day, time: exactTime, roomId: cabinId }, appointmentsToUse);
    }
    
    // Para drag & drop
    if (isDragging && draggedAppointment) {
      return validateAppointmentSlot({
        targetDate: day,
        targetTime: exactTime,
        duration: draggedAppointment.duration,
        roomId: cabinId,
        appointments: appointmentsToUse,
        excludeAppointmentId: draggedAppointment.id,
        activeClinic: activeClinic || undefined,
        granularity: minuteGranularity,
        allowAdjustments: false
      });
    }
    
    return null;
  }, [isMovingAppointment, appointmentInMovement, validateSlot, day, cabinId, cacheAppointments, appointments, isDragging, draggedAppointment, activeClinic, minuteGranularity]);
  
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
    // ✅ DEBUG BÁSICO: Verificar si handleMouseMove se ejecuta
    if (isDragging && draggedAppointment) {
      console.log(`[DEBUG-MOUSE] ${time} - handleMouseMove ejecutándose`, {
        isDragging,
        draggedAppointmentId: draggedAppointment?.id,
        isInteractive,
        active,
        overrideForCell: !!overrideForCell,
        isDraggingDuration
      });
    }
    
    if (!cellRef.current || !isInteractive || !active || overrideForCell || isDraggingDuration) return

    // ✅ DEBUG ESPECÍFICO PARA ANALIZAR SALTOS DE GRANULARIDADES
    const debugDate = day.toISOString().split('T')[0]; // formato YYYY-MM-DD
    const isDebugDay = true; // ✅ SIEMPRE ACTIVAR DEBUG durante drag
    const isFirstCabin = cabinIndex === 0; // Primera cabina
    // ✅ SIMPLIFICAR: Mostrar debug SIEMPRE cuando hay drag activo (no solo primera cabina)
    const shouldDebug = isDragging && draggedAppointment; // ✅ ACTIVADO: Para debug de drag & drop

    // Verificar si el target es una cita - PERO solo bloquear si NO hay drag activo
    const target = e.target as HTMLElement
    
    // ✅ MEJORADO: Detección más precisa de citas para evitar interferencias
    const appointmentElement = target.closest('[data-appointment-item]')
    
    if (shouldDebug && appointmentElement) {
      const appointmentId = appointmentElement.getAttribute('data-appointment-id')
      console.log(`[DEBUG-DRAG] ${time} - Detectada cita`, {
        appointmentId,
        isDragging,
        draggedAppointmentId: draggedAppointment?.id,
        isTheSameAppointment: appointmentId === draggedAppointment?.id
      });
    }
    
    if (appointmentElement && !isDragging) {
      // ✅ VERIFICAR: Solo bloquear si realmente estamos sobre el contenido de la cita
      const isOverAppointmentContent = target.closest('.appointment-content') || 
                                      target.closest('[data-appointment-content]') ||
                                      appointmentElement.contains(target);
      
      if (isOverAppointmentContent) {
        if (shouldDebug) {
          console.log(`[DEBUG-DRAG] ${time} - Bloqueado por cita`, {
            appointmentId: appointmentElement.getAttribute('data-appointment-id'),
            isDragging,
            targetElement: target.tagName
          });
        }
        clearHover()
        return
      }
    }
    
    // Si estamos haciendo drag Y hay una cita translúcida, verificar si es la cita siendo arrastrada
    if (appointmentElement && isDragging && draggedAppointment) {
      // Si es la misma cita que se está arrastrando, PERMITIR granularidades sobre ella
      const appointmentId = appointmentElement.getAttribute('data-appointment-id')
      
      if (shouldDebug) {
        console.log(`[DEBUG-DRAG] ${time} - Verificando cita durante drag`, {
          appointmentId,
          draggedAppointmentId: draggedAppointment.id,
          isTheSameAppointment: appointmentId === draggedAppointment.id
        });
      }
      
      if (appointmentId === draggedAppointment.id) {
        // Permitir continuar - no bloquear granularidades sobre la cita propia
        if (shouldDebug) {
          console.log(`[DEBUG-DRAG] ${time} - ✅ PERMITIR granularidades sobre cita propia`);
        }
      } else {
        // Si es otra cita, bloquear
        if (shouldDebug) {
          console.log(`[DEBUG-DRAG] ${time} - ❌ BLOQUEAR granularidades sobre otra cita`);
        }
        clearHover()
        return
      }
    }

    const rect = cellRef.current?.getBoundingClientRect()
    const relativeY = e.clientY - rect.top
    // ✅ PRUEBA: Eliminar clamp que impide salir de la celda actual
    const percentage = (relativeY / rect.height)
    
    // ✅ ANTI-BUCLE SIMPLIFICADO: Solo evitar eventos idénticos consecutivos
    const mouseKey = `${Math.round(relativeY / 2)}-${Math.round(percentage * 100)}`
    if (lastHoverInfoRef.current === mouseKey) {
      return; // ✅ BLOQUEAR: Solo si es exactamente la misma posición
    }
    
    // Calcular el minuto dentro del slot basado en la granularidad
    const slotProgress = percentage * slotDuration
    
    // ✅ MEJORADO: Granularidades más tolerantes y fáciles de usar
    // Expandir cada granularidad para que cubra más área
    const rawMinuteOffset = Math.round(slotProgress / minuteGranularity) * minuteGranularity
    
    // ✅ NUEVO: Crear zonas más amplias para cada granularidad
    // Cada granularidad "atrae" el mouse desde ±1.5 minutos de distancia
    const granularityZones = [];
    for (let offset = 0; offset <= slotDuration; offset += minuteGranularity) {
      granularityZones.push(offset);
    }
    
    // Encontrar la granularidad más cercana al slotProgress actual
    let closestGranularity = rawMinuteOffset;
    let minDistance = Math.abs(slotProgress - rawMinuteOffset);
    
    granularityZones.forEach(zone => {
      const distance = Math.abs(slotProgress - zone);
      if (distance < minDistance && zone <= slotDuration) {
        minDistance = distance;
        closestGranularity = zone;
      }
    });
    
    const minuteOffset = closestGranularity;
    
    // ✅ DEBUG ESPECÍFICO: Ver por qué no aparece minuteOffset: 15
    if (shouldDebug && slotProgress > 10) {
      console.log(`[DEBUG-CALC] ${time} - Cálculo granularidad`, {
        slotProgress: Math.round(slotProgress * 100) / 100,
        rawMinuteOffset,
        closestGranularity,
        minuteOffset,
        slotDuration,
        minuteGranularity,
        granularityZones: granularityZones.join(', ')
      });
    }
    
    // ✅ DETECTAR: Granularidad crítica 15 (08:45 en celda 08:30)
    if (shouldDebug && minuteOffset === 15 && time === '08:30') {
      console.log(`🎯 [GRANULARIDAD-15-ENCONTRADA] ${time}`, {
        slotProgress: Math.round(slotProgress * 100) / 100,
        relativeY: Math.round(relativeY),
        percentage: Math.round(percentage * 1000) / 1000,
        minuteOffset,
      });
    }
    
    // ✅ CORRECCIÓN: Durante drag, mostrar granularidades NORMALES
    // El contexto de drag se encarga de calcular la posición final
    // Aquí solo mostramos granularidades para guía visual
    
    // LÓGICA MEJORADA: Crear función local que use el contexto de drag
    const hasAppointmentAtPositionLocal = (offsetMinutes: number): boolean => {
      const [hours, minutes] = time.split(':').map(Number);
      const hoverTimeInMinutes = hours * 60 + minutes + offsetMinutes;
      
      // ✅ USAR DATOS DEL CACHE para garantizar consistencia absoluta
      const appointmentsToUse = cacheAppointments || appointments || [];
      
      // ✅ DEBUG: Información del punto de hover para debug
      const debugDate = day.toISOString().split('T')[0];
      const isDebugDay = true;
      // ✅ SIMPLIFICAR: Mostrar debug SIEMPRE cuando hay drag activo
      const shouldDebug = isDragging && draggedAppointment;
      
      if (shouldDebug) {
        console.log(`[DEBUG-CONFLICT] ${time}+${offsetMinutes} = ${Math.floor(hoverTimeInMinutes/60)}:${String(hoverTimeInMinutes%60).padStart(2,'0')} - Verificando conflictos`, {
          totalAppointments: appointmentsToUse.length,
          hoverTimeInMinutes,
          draggedAppointmentId: draggedAppointment?.id,
          cellDay: day.toDateString(),
          cellCabin: cabinId
        });
      }
      
      const conflictingAppointments = appointmentsToUse.filter(apt => {
        // ✅ DURANTE DRAG: NO excluir la cita siendo arrastrada para mostrar granularidades azules
        // Solo excluir para validación de conflictos, NO para granularidades azules
        if (isDragging && draggedAppointment && apt.id === draggedAppointment.id) {
          if (shouldDebug) {
            console.log(`[DEBUG-CONFLICT] ✅ EXCLUIR cita siendo arrastrada:`, {
              appointmentId: apt.id,
              name: apt.name || 'Sin nombre',
              startTime: apt.startTime,
              duration: apt.duration
            });
          }
          return false; // No contar como conflicto la cita que se está arrastrando
        }
        
        // ✅ EXCLUIR la cita que está siendo MOVIDA actualmente
        if (isMovingAppointment && appointmentInMovement && apt.id === appointmentInMovement.appointment.id) {
          if (shouldDebug) {
            console.log(`[DEBUG-CONFLICT] ✅ EXCLUIR cita en movimiento:`, {
              appointmentId: apt.id,
              name: apt.name || 'Sin nombre'
            });
          }
          return false; // No contar la cita que se está moviendo
        }
        
        // ✅ FILTRADO COMPLETO: Solo conflictos en misma fecha + cabina + clínica + sistema
        
        // Verificar misma fecha
        const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
        const isSameDate = aptDate.toDateString() === day.toDateString();
        if (!isSameDate) {
          if (shouldDebug) {
            console.log(`[DEBUG-CONFLICT] ❌ DIFERENTE FECHA - Excluir:`, {
              appointmentId: apt.id,
              appointmentDate: aptDate.toDateString(),
              cellDate: day.toDateString()
            });
          }
          return false; // No es conflicto si es diferente fecha
        }
        
        // Verificar misma cabina
        const isSameCabin = String(apt.roomId) === String(cabinId);
        if (!isSameCabin) {
          if (shouldDebug) {
            console.log(`[DEBUG-CONFLICT] ❌ DIFERENTE CABINA - Excluir:`, {
              appointmentId: apt.id,
              appointmentCabin: apt.roomId,
              cellCabin: cabinId
            });
          }
          return false; // No es conflicto si es diferente cabina
        }
        
        // TODO: Agregar verificación de clínica y sistema cuando estén disponibles en apt
        // const isSameClinic = apt.clinicId === currentClinicId;
        // const isSameSystem = apt.systemId === currentSystemId;
        
        // Obtener hora de inicio y fin de la cita
        const aptStartTime = typeof apt.startTime === 'string' ? apt.startTime : '00:00';
        const [aptHours, aptMinutes] = aptStartTime.split(':').map(Number);
        const aptStartMinutes = aptHours * 60 + aptMinutes;
        const aptEndMinutes = aptStartMinutes + (apt.duration || 60);
        
        // Verificar superposición en tiempo
        const isTimeOverlap = hoverTimeInMinutes >= aptStartMinutes && hoverTimeInMinutes < aptEndMinutes;
        
        if (shouldDebug) {
          console.log(`[DEBUG-CONFLICT] ${isTimeOverlap ? '🚫 CONFLICTO DETECTADO' : '✅ Sin conflicto'} - Cita:`, {
            appointmentId: apt.id,
            name: apt.name || 'Sin nombre',
            startTime: apt.startTime,
            duration: apt.duration,
            aptStartMinutes: `${Math.floor(aptStartMinutes/60)}:${String(aptStartMinutes%60).padStart(2,'0')}`,
            aptEndMinutes: `${Math.floor(aptEndMinutes/60)}:${String(aptEndMinutes%60).padStart(2,'0')}`,
            hoverTime: `${Math.floor(hoverTimeInMinutes/60)}:${String(hoverTimeInMinutes%60).padStart(2,'0')}`,
            isTimeOverlap,
            calculoOverlap: `${hoverTimeInMinutes} >= ${aptStartMinutes} && ${hoverTimeInMinutes} < ${aptEndMinutes}`
          });
        }
        
        return isTimeOverlap; // Solo es conflicto si hay superposición temporal en misma fecha+cabina
      });
      
      const hasConflict = conflictingAppointments.length > 0;
      
      if (shouldDebug) {
        console.log(`[DEBUG-CONFLICT] ${time}+${offsetMinutes} - RESULTADO FINAL:`, {
          hasConflict,
          totalConflicts: conflictingAppointments.length,
          conflictingAppointmentIds: conflictingAppointments.map(apt => apt.id),
          conflictingAppointmentNames: conflictingAppointments.map(apt => apt.name || 'Sin nombre')
        });
      }
      
      return hasConflict;
    };
    
    // Si hay drag activo, SIEMPRE mostrar granularidades (ignorar cita sombreada)
    // Si NO hay drag, verificar que no haya citas reales en esa posición
    const hasAppointment = hasAppointmentAtPositionLocal(minuteOffset);
    
    // ✅ NUEVA LÓGICA: Determinar tipo de granularidad a mostrar
    let allowGranularity = false;
    let granularityType: 'normal' | 'blue' | 'green' = 'normal';
    
    if (isDragging && draggedAppointment) {
      const isInOriginalRange = isInDraggedAppointmentRange(minuteOffset);
      const isGreenZone = allowGreenGranularityInOriginalRange(minuteOffset);
      
      if (shouldDebug) {
        console.log(`[DEBUG-LOGIC] ${time}+${minuteOffset} - Determinando granularidad`, {
          isInOriginalRange,
          isGreenZone,
          hasAppointment,
          minuteOffset,
          slotDuration
        });
      }
      
      if (isGreenZone) {
        // ✅ VERDE: Permitir desplazamiento dentro del rango original (misma cabina)
        // ✅ CORREGIDO: IGNORAR hasAppointment cuando está en green zone (rango original)
        allowGranularity = true;
        granularityType = 'green';
        if (shouldDebug) console.log(`[DEBUG-LOGIC] ${time}+${minuteOffset} - ✅ VERDE (desplazamiento en rango original - IGNORANDO conflictos)`);
      } else if (isInOriginalRange) {
        // AZUL: Mostrar en toda la franja horaria de la cita original (todas las cabinas)
        allowGranularity = true;
        granularityType = 'blue';
        if (shouldDebug) console.log(`[DEBUG-LOGIC] ${time}+${minuteOffset} - ✅ AZUL (rango horario original)`);
      } else if (!hasAppointment) {
        // VERDE: Slot libre para nueva posición
        allowGranularity = true;
        granularityType = 'green';
        if (shouldDebug) console.log(`[DEBUG-LOGIC] ${time}+${minuteOffset} - ✅ VERDE (slot libre)`);
      } else {
        if (shouldDebug) console.log(`[DEBUG-LOGIC] ${time}+${minuteOffset} - ❌ BLOQUEADO (slot ocupado)`);
      }
      
    } else if (isMovingAppointment) {
      // Durante movimiento, usar la lógica existente
      allowGranularity = !hasAppointment;
      granularityType = 'green';
      if (shouldDebug) console.log(`[DEBUG-LOGIC] ${time}+${minuteOffset} - MOVE: ${allowGranularity ? '✅ PERMITIR' : '❌ BLOQUEAR'}`);
    } else {
      // Modo normal (sin drag ni movimiento)
      allowGranularity = !hasAppointment;
      granularityType = 'normal';
    }
    
    if (allowGranularity) {
      const totalMinutes = baseMinutes + minuteOffset
      const displayHours = Math.floor(totalMinutes / 60)
      const displayMinutes = totalMinutes % 60
      const exactTime = `${displayHours.toString().padStart(2, '0')}:${displayMinutes.toString().padStart(2, '0')}`
      
      if (shouldDebug) {
        // ✅ LOGGING SELECTIVO: Solo mostrar cuando cambia la granularidad actual
        const currentGranularityKey = `${exactTime}-${granularityType}`;
        if (!lastGranularityLoggedRef.current || lastGranularityLoggedRef.current !== currentGranularityKey) {
          lastGranularityLoggedRef.current = currentGranularityKey;
          console.log(`[DEBUG-GRANULARITY] ${time} - ✅ MOSTRAR granularidad`, {
            relativeY: Math.round(relativeY),
            percentage: Math.round(percentage * 1000) / 1000,
            slotProgress: Math.round(slotProgress * 100) / 1000,
            minuteOffset,
            exactTime,
            granularityType,
            hasAppointment,
            allowGranularity,
            mouseKey  // ✅ AÑADIR: Para ver la clave actual
          });
        }
      }
      
      // ✅ ANTI-BUCLE ACTUALIZADO: Usar la nueva clave simplificada
      const hoverKey = `${mouseKey}-${exactTime}-${minuteOffset}-${granularityType}`
      if (lastHoverInfoRef.current !== hoverKey) {
        lastHoverInfoRef.current = hoverKey
      setHoveredInfo({
        cellId,
          offsetY: (minuteOffset / slotDuration) * cellHeight,
          exactTime,
          granularityType
      })
      }
    } else {
      if (shouldDebug) {
        const finalLogKey = `${time}-${minuteOffset}-blocked`;
        console.log(`[DEBUG-GRANULARITY] ${time} - ❌ NO MOSTRAR granularidad`, {
          relativeY: Math.round(relativeY),
          percentage: Math.round(percentage * 1000) / 1000,
          slotProgress: Math.round(slotProgress * 100) / 1000,
          minuteOffset,
          hasAppointment,
          allowGranularity,
          isDragging,
          draggedAppointment: !!draggedAppointment,
          isMovingAppointment,
          granularityType,
          mouseKey  // ✅ AÑADIR: Para ver la clave actual
        });
      }
      
      // ✅ ANTI-BUCLE ACTUALIZADO: Solo limpiar si no estaba ya limpio
      const clearKey = `${mouseKey}-cleared`
      if (lastHoverInfoRef.current !== clearKey) {
        lastHoverInfoRef.current = clearKey
      clearHover()
      }
    }
  }, [baseMinutes, slotDuration, minuteGranularity, cacheAppointments, appointments, day, time, cabinId, isInteractive, active, overrideForCell, cellHeight, cellId, setHoveredInfo, clearHover, isDraggingDuration, isDragging, draggedAppointment, isMovingAppointment, appointmentInMovement, cabinIndex])

  const handleMouseLeave = useCallback(() => {
    clearHover()
  }, [clearHover])

  const handleClick = useCallback(() => {
    if (!active) return
    
    // No abrir modal si estamos haciendo resize
    if (document.body.dataset.resizing === 'true') {
      return
    }
    
    // ✅ BLOQUEAR CREACIÓN DE NUEVAS CITAS SI HAY UNA CITA EN MOVIMIENTO
    if (isMovingAppointment && appointmentInMovement) {
      const targetTime = hoveredInfo?.exactTime || time;
      
      // ✅ VALIDAR ANTES DE CONFIRMAR MOVIMIENTO - USAR DATOS DEL CACHE
      const appointmentsToUse = cacheAppointments || appointments || [];
      const validation = validateSlot({ date: day, time: targetTime, roomId: cabinId }, appointmentsToUse);
      
      if (validation && !validation.isValid) {
        console.log('[HoverableCell] ❌ Movimiento bloqueado por conflicto:', validation.reason);
        return; // No permitir click si hay conflicto
      }
      
      console.log('[HoverableCell] 🎯 Confirmando movimiento de cita a:', {
        date: day,
        time: targetTime,
        roomId: cabinId
      });
      
      // ✅ CONFIRMAR MOVIMIENTO SOLO SI ES VÁLIDO
      confirmMove(day, targetTime, cabinId);
      return;
    }
    
    if (overrideForCell) {
      setSelectedOverride(overrideForCell)
      setIsOverrideModalOpen(true)
    } else if (isInteractive && showHover) {
      onCellClick(day, hoveredInfo!.exactTime, cabinId)
    } else if (isInteractive) {
      onCellClick(day, time, cabinId)
    }
  }, [overrideForCell, active, setSelectedOverride, setIsOverrideModalOpen, isInteractive, showHover, hoveredInfo, onCellClick, day, time, cabinId, isMovingAppointment, appointmentInMovement, confirmMove, validateSlot, cacheAppointments, appointments])

  const handleDropWithExactTime = useCallback((e: React.DragEvent) => {
    if (active && isAvailable && !overrideForCell) {
      // ✅ MEJORADO: Usar la posición actual de la sombra si está disponible y es válida
      let exactTime = currentDragTime || time;
      
      // Si soltamos fuera de la tabla pero tenemos una posición de sombra válida, usarla
      if (isDragging && draggedAppointment && currentDragTime) {
        // Verificar si la posición de la sombra es válida
        const shadowValidation = validateHoverSlot(currentDragTime);
        
        if (shadowValidation && shadowValidation.isValid) {
          // ✅ USAR POSICIÓN DE LA SOMBRA: Es válida, usar esa posición
          exactTime = currentDragTime;
          console.log('[HoverableCell] ✅ Usando posición válida de la sombra:', currentDragTime);
        } else {
          // ❌ POSICIÓN DE SOMBRA INVÁLIDA: Usar validación normal
          const normalValidation = validateHoverSlot(time);
          if (normalValidation && !normalValidation.isValid) {
            console.log('[HoverableCell] ❌ Drop cancelado - ni sombra ni posición actual son válidas');
            e.preventDefault();
            endDrag();
            return;
          }
        }
      } else {
        // ✅ VALIDACIÓN NORMAL: Sin sombra, validar posición de drop normal
        if (isDragging && draggedAppointment) {
          const validation = validateHoverSlot(exactTime);
          
          if (validation && !validation.isValid) {
            console.log('[HoverableCell] ❌ Drop cancelado por conflicto:', validation.reason);
            
            // ✅ CANCELAR DROP - Volver a posición original como cuando se presiona ESC
            e.preventDefault();
            endDrag();
            return;
          }
        }
      }
      
      // ✅ PROCEDER CON DROP CON LA POSICIÓN CORRECTA (sombra o normal)
      onDrop(e, day, exactTime, cabinId);
      endDrag();
    }
  }, [active, isAvailable, overrideForCell, currentDragTime, time, onDrop, day, cabinId, endDrag, isDragging, draggedAppointment, validateHoverSlot])
  
  // ANTI-BUCLE: Solo ref para tracking de posición
  const lastDragPositionRef = useRef<string | null>(null)
  
  // ✅ ANTI-BUCLE: Ref para tracking de hover state para evitar bucles infinitos
  const lastHoverInfoRef = useRef<string | null>(null)
  // ✅ THROTTLING DE LOGS: Para reducir spam en debug
  const lastLogKeyRef = useRef<string | null>(null)
  // ✅ TRACKING DE GRANULARIDADES: Para logging selectivo
  const lastGranularityLoggedRef = useRef<string | null>(null)

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
      
      // ✅ PRUEBA 2: Eliminar clamp también en handleDragOverCell
      const percentage = (relativeY / cellHeight)
      
      const slotProgress = percentage * slotDuration
      
      // ✅ UNIFICADO: Usar EXACTAMENTE la misma lógica que hover normal
      const minuteOffset = Math.round(slotProgress / minuteGranularity) * minuteGranularity
      
      // ✅ APLICAR offset inicial DESPUÉS del cálculo perfecto de granularidad
      const cursorTotalMinutes = baseMinutes + minuteOffset
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
  }, [handleLocalDragOver, isDragging, cellRef, draggedAppointment, cellId, cellHeight, slotDuration, minuteGranularity, baseMinutes, day, cabinId, updateDragPosition])

  // Preview simplificado - solo mostrar línea de granularidad objetivo
  // El sistema de granularidad ya existente se encargará de mostrar la línea visual

  // ✅ CORREGIDA: Función para detectar si estamos en el rango horario de la cita siendo arrastrada
  const isInDraggedAppointmentRange = (offsetMinutes: number): boolean => {
    if (!isDragging || !draggedAppointment) {
      return false;
    }
    
    const debugDate = day.toISOString().split('T')[0];
    const isDebugDay = true;
    // ✅ SIMPLIFICAR: Mostrar debug SIEMPRE cuando hay drag activo
    const shouldDebug = isDragging && draggedAppointment;
    
    const [hours, minutes] = time.split(':').map(Number);
    const hoverTimeInMinutes = hours * 60 + minutes + offsetMinutes;
    
    // Obtener rango horario de la cita original siendo arrastrada
    const [aptHours, aptMinutes] = draggedAppointment.originalTime.split(':').map(Number);
    const aptStartMinutes = aptHours * 60 + aptMinutes;
    const aptEndMinutes = aptStartMinutes + draggedAppointment.duration;
    
    // ✅ AZULES EN TODA LA VISTA: Solo verificar rango horario (SIN restricción de fecha/cabina)
    // Las granularidades azules deben aparecer en TODAS las fechas y TODAS las cabinas
    const isInTimeRange = hoverTimeInMinutes >= aptStartMinutes && hoverTimeInMinutes < aptEndMinutes;
    
    if (shouldDebug) {
      console.log(`[DEBUG-RANGE-BLUE] ${time}+${offsetMinutes} = ${Math.floor(hoverTimeInMinutes/60)}:${String(hoverTimeInMinutes%60).padStart(2,'0')}`, {
        hoverTimeInMinutes,
        aptStartMinutes: `${Math.floor(aptStartMinutes/60)}:${String(aptStartMinutes%60).padStart(2,'0')}`,
        aptEndMinutes: `${Math.floor(aptEndMinutes/60)}:${String(aptEndMinutes%60).padStart(2,'0')}`,
        duration: draggedAppointment.duration,
        isInTimeRange
      });
    }
    
    return isInTimeRange;
  };

  // ✅ CORREGIDA: Función para detectar si permitimos granularidad verde (desplazamiento en rango original)
  const allowGreenGranularityInOriginalRange = (offsetMinutes: number): boolean => {
    if (!isDragging || !draggedAppointment) return false;
    
    const debugDate = day.toISOString().split('T')[0];
    const isDebugDay = true;
    // ✅ SIMPLIFICAR: Mostrar debug SIEMPRE cuando hay drag activo
    const shouldDebug = isDragging && draggedAppointment;
    
    const [hours, minutes] = time.split(':').map(Number);
    const hoverTimeInMinutes = hours * 60 + minutes + offsetMinutes;
    
    // ✅ VERDES PARA DESPLAZAMIENTO: Solo en la misma fecha + misma cabina + rango horario original
    const isSameDate = draggedAppointment.originalDate.toDateString() === day.toDateString();
    const isSameCabin = draggedAppointment.originalRoomId === cabinId;
    
    if (!isSameDate || !isSameCabin) {
      if (shouldDebug) {
        console.log(`[DEBUG-RANGE-GREEN] ${time}+${offsetMinutes} - ❌ NO es misma fecha/cabina`, {
          isSameDate,
          isSameCabin,
          originalDate: draggedAppointment.originalDate.toDateString(),
          currentDate: day.toDateString(),
          originalRoomId: draggedAppointment.originalRoomId,
          currentRoomId: cabinId
        });
      }
      return false;
    }
    
    // Obtener rango horario de la cita original
    const [aptHours, aptMinutes] = draggedAppointment.originalTime.split(':').map(Number);
    const aptStartMinutes = aptHours * 60 + aptMinutes;
    const aptEndMinutes = aptStartMinutes + draggedAppointment.duration;
    
    const isInRange = hoverTimeInMinutes >= aptStartMinutes && hoverTimeInMinutes < aptEndMinutes;
    
    if (shouldDebug) {
      console.log(`[DEBUG-RANGE-GREEN] ${time}+${offsetMinutes} = ${Math.floor(hoverTimeInMinutes/60)}:${String(hoverTimeInMinutes%60).padStart(2,'0')}`, {
        hoverTimeInMinutes,
        aptStartMinutes: `${Math.floor(aptStartMinutes/60)}:${String(aptStartMinutes%60).padStart(2,'0')}`,
        aptEndMinutes: `${Math.floor(aptEndMinutes/60)}:${String(aptEndMinutes%60).padStart(2,'0')}`,
        duration: draggedAppointment.duration,
        isInRange,
        isSameDate,
        isSameCabin
      });
    }
    
    return isInRange;
  };

  // ✅ NUEVA FUNCIÓN: Detectar granularidades usando currentDragTime durante drag (sin depender de hoveredInfo)
  const getDragGranularityInfo = useCallback(() => {
    if (!isDragging || !draggedAppointment || !currentDragTime) {
      return null;
    }
    
    // ✅ VERIFICAR: Debe estar en la celda actual (misma fecha + misma cabina)
    const isDragInThisColumn = currentDragRoomId === cabinId;
    const cellDate = day;
    const isSameDate = currentDragDate ? currentDragDate.toDateString() === cellDate.toDateString() : false;
    
    if (!isDragInThisColumn || !isSameDate) {
      return null;
    }
    
    // ✅ VERIFICAR: La hora debe estar en el rango de esta celda (UNA celda a la vez)
    const [dragHours, dragMinutes] = currentDragTime.split(':').map(Number);
    const dragTotalMinutes = dragHours * 60 + dragMinutes;
    const [cellHours, cellMinutes] = time.split(':').map(Number);
    const cellStartMinutes = cellHours * 60 + cellMinutes;
    const cellEndMinutes = cellStartMinutes + slotDuration;
    
    const isHourInThisCell = dragTotalMinutes >= cellStartMinutes && dragTotalMinutes < cellEndMinutes;
    
    if (!isHourInThisCell) {
      return null;
    }
    
    // ✅ CALCULAR: Offset dentro de la celda (SIN restricciones para permitir extensión visual)
    const offsetMinutes = dragTotalMinutes - cellStartMinutes;
    const granularDelta = Math.round(offsetMinutes / minuteGranularity) * minuteGranularity;
    const adjustedOffsetMinutes = Math.max(0, granularDelta);
    
    // ✅ APLICAR: Lógica de granularidades (azul vs verde)
    const isInOriginalRange = isInDraggedAppointmentRange(adjustedOffsetMinutes);
    const isGreenZone = allowGreenGranularityInOriginalRange(adjustedOffsetMinutes);
    
    const hasAppointment = hasAppointmentAtPosition(day, time, cabinId, adjustedOffsetMinutes);
    
    let allowGranularity = false;
    let granularityType: 'green' | 'blue' = 'green';
    
    if (isGreenZone) {
      // ✅ VERDE: Permitir desplazamiento dentro del rango original (misma cabina)
      allowGranularity = true;
      granularityType = 'green';
    } else if (isInOriginalRange) {
      // ✅ AZUL: Mostrar disponibilidad en el rango de tiempo de la cita original (cualquier cabina)
      allowGranularity = true;
      granularityType = 'blue';
    } else if (!hasAppointment) {
      // ✅ VERDE: Zona libre (fuera del rango original)
      allowGranularity = true;
      granularityType = 'green';
    }
    
    if (!allowGranularity) {
      return null;
    }
    
    // ✅ CALCULAR: Posición visual SIN restricciones (permite que se extienda más allá de cellHeight)
    const offsetY = (adjustedOffsetMinutes / slotDuration) * cellHeight;
    
    return {
      exactTime: currentDragTime,
      offsetY,
      granularityType,
      offsetMinutes: adjustedOffsetMinutes
    };
  }, [isDragging, draggedAppointment, currentDragTime, currentDragRoomId, currentDragDate, cabinId, day, time, slotDuration, cellHeight, minuteGranularity, isInDraggedAppointmentRange, allowGreenGranularityInOriginalRange, hasAppointmentAtPosition]);

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
        
        // ✅ REDUCIDO: Solo para las primeras 2 horas del día
        const isVeryEarlyHour = currentHour <= 8; // Solo hasta las 8 AM
        const isFirstGranularityOfDay = currentHour <= 8 && currentMinutes === 0; // Solo 08:00
        
        // ✅ MÁS RESTRICTIVO: Solo donde realmente se necesita
        const shouldHaveExtendedArea = isFirstGranularityOfDay;
        
        return shouldHaveExtendedArea;
      })() && (
        <div
          className="absolute right-0 left-0 pointer-events-auto"
          style={{
            // ✅ ÁREA REDUCIDA: Menos intrusiva para evitar interferencias
            top: (() => {
              const [currentHour, currentMinutes] = time.split(':').map(Number);
              // Solo primera granularidad del día: área mínima
              if (currentHour <= 8 && currentMinutes === 0) {
                return '-15px'; // Reducido de -30px a -15px
              }
              return '-10px'; // Reducido de -20px a -10px
            })(),
            height: (() => {
              const [currentHour, currentMinutes] = time.split(':').map(Number);
              // Solo primera granularidad del día: altura mínima
              if (currentHour <= 8 && currentMinutes === 0) {
                return '15px'; // Reducido de 30px a 15px
              }
              return '10px'; // Reducido de 20px a 10px
            })(),
            zIndex: 15 // ✅ MAYOR Z-INDEX para estar por encima de cabeceras si es necesario
          }}
          onDragOver={handleDragOverCell}
          onDragLeave={handleDragLeave}
          onDrop={handleDropWithExactTime}
          onClick={handleClick} // ✅ NUEVO: También manejar clicks para movimiento de citas
          title={`Zona extendida para acceso fácil a ${time}`}
        />
      )}
      {/* Visualización del bloque */}
      {isStartOfBlock && active && overrideForCell && (
        <div
          className="flex overflow-hidden absolute inset-x-0 top-0 z-10 justify-center items-center p-1 m-px text-xs text-rose-700 rounded-sm border-rose-300 pointer-events-none bg-rose-200/80 dark:bg-rose-800/50 dark:border-rose-600 dark:text-rose-200"
          style={{
            height: `calc(${blockDurationSlots * cellHeight}px - 2px)`,
          }}
          title={overrideForCell.description || "Bloqueado"}
        >
          <div className="flex flex-col justify-center items-center w-full h-full text-center">
            <Lock className="flex-shrink-0 mb-1 w-3 h-3 text-rose-600 dark:text-rose-300" />
            {blockDurationSlots * cellHeight > 30 && (
              <span className="leading-tight break-words line-clamp-2">
                {overrideForCell.description || "Bloqueado"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ✅ GRANULARIDADES CON VALIDACIÓN - PRIORIDAD 1: Movimiento de citas (SIEMPRE tiene prioridad) */}
      {showHover && isInteractive && !overrideForCell && isMovingAppointment && (() => {
        // ✅ VALIDAR CONFLICTOS PARA FEEDBACK VISUAL
        const validation = validateHoverSlot(hoveredInfo!.exactTime);
        const isValid = validation?.isValid !== false; // null o true = verde, false = rojo
        const lineColor = isValid ? 'bg-green-500' : 'bg-red-500';
        const bgColor = isValid ? 'bg-green-100/80 border-green-500 text-green-800' : 'bg-red-100/80 border-red-500 text-red-800';
        const textColor = isValid ? 'text-green-600' : 'text-red-600';
        
        return (
          <div>
            {/* Línea verde/roja según validación */}
            <div
              className={cn("absolute right-0 left-0 z-50 pointer-events-none", lineColor)}
              style={{
                top: `${hoveredInfo!.offsetY}px`,
                height: '2px',
                opacity: 0.8
              }}
            />
            {/* Indicador de hora verde/rojo */}
            <div
              className={cn("absolute left-0 pointer-events-none z-50 text-xs px-1 py-0.5 text-white rounded-r font-medium", 
                isValid ? 'bg-green-500' : 'bg-red-500'
              )}
              style={{
                top: `${hoveredInfo!.offsetY}px`,
                transform: 'translateY(-50%)',
                fontSize: '10px'
              }}
            >
              {hoveredInfo!.exactTime}
            </div>
            
            {/* ✅ PREVIEW DE LA CITA EN MOVIMIENTO con validación */}
            {appointmentInMovement && (
              <div
                className={cn("absolute right-1 left-1 z-40 rounded-md border-2 shadow-lg pointer-events-none", bgColor)}
                style={{
                  top: `${hoveredInfo!.offsetY}px`,
                  height: `${(appointmentInMovement.appointment.duration / slotDuration) * cellHeight}px`,
                  minHeight: '20px'
                }}
              >
                <div className="overflow-hidden p-1 text-xs font-medium">
                  <div className="truncate">{appointmentInMovement.appointment.name}</div>
                  <div className={cn("text-xs truncate", textColor)}>{appointmentInMovement.appointment.service}</div>
                  <div className={cn("text-xs", textColor)}>
                    {appointmentInMovement.appointment.duration}min
                    {!isValid && validation?.reason && (
                      <span className="block text-[9px] mt-0.5">⚠️ {validation.reason}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ✅ GRANULARIDADES CON VALIDACIÓN - PRIORIDAD 2: Drag & Drop usando currentDragTime (NO depende de hoveredInfo) */}
      {(() => {
        const dragGranularityInfo = getDragGranularityInfo();
        if (!dragGranularityInfo || isMovingAppointment) {
          return null;
        }
        
        // ✅ MOSTRAR GRANULARIDADES AZULES EN TODA LA FRANJA HORARIA DE LA CITA ORIGINAL
        if (dragGranularityInfo.granularityType === 'blue') {
          return (
            <div>
              {/* Línea AZUL para indicar rango horario de cita original */}
              <div
                className="absolute right-0 left-0 z-30 bg-blue-400 pointer-events-none"
                style={{
                  top: `${dragGranularityInfo.offsetY}px`,
                  height: '2px',
                  opacity: 0.7
                }}
              />
              {/* Indicador de hora AZUL */}
              <div
                className="absolute left-0 pointer-events-none z-30 text-xs px-1 py-0.5 text-white rounded-r font-medium bg-blue-500"
                style={{
                  top: `${dragGranularityInfo.offsetY}px`,
                  transform: 'translateY(-50%)',
                  fontSize: '10px'
                }}
              >
                {dragGranularityInfo.exactTime}
              </div>
            </div>
          );
        }
        
        // ✅ VALIDAR CONFLICTOS PARA GRANULARIDADES VERDES
        const validation = validateHoverSlot(dragGranularityInfo.exactTime);
        const isValid = validation?.isValid !== false;
        const lineColor = isValid ? 'bg-green-500' : 'bg-red-500';
        
        return (
          <div>
            {/* Línea verde/roja para drag & drop */}
            <div
              className={cn("absolute right-0 left-0 z-50 pointer-events-none", lineColor)}
              style={{
                top: `${dragGranularityInfo.offsetY}px`,
                height: '2px',
                opacity: 0.8
              }}
            />
            {/* Indicador de hora verde/rojo */}
            <div
              className={cn("absolute left-0 pointer-events-none z-50 text-xs px-1 py-0.5 text-white rounded-r font-medium",
                isValid ? 'bg-green-500' : 'bg-red-500'
              )}
              style={{
                top: `${dragGranularityInfo.offsetY}px`,
                transform: 'translateY(-50%)',
                fontSize: '10px'
              }}
            >
              {dragGranularityInfo.exactTime}
            </div>
          </div>
        );
      })()}

      {/* Línea de hora al hacer hover (Granularidad NORMAL) - PRIORIDAD 3: Solo cuando NO hay movimiento NI drag */}
      {showHover && isInteractive && !overrideForCell && !isMovingAppointment && !isDragging && (
        <div>
        <TimeHoverIndicator 
          time={hoveredInfo!.exactTime}
          offsetY={hoveredInfo!.offsetY}
          isDaily={isDaily}
          cellHeight={cellHeight}
        />
        </div>
      )}

      {/* ✅ GRANULARIDADES CON VALIDACIÓN + PREVIEW PARA DRAG & DROP - SOLO cuando NO hay movimiento activo */}
      {isDragging && draggedAppointment && isInteractive && !overrideForCell && !isMovingAppointment && (() => {
        // VERIFICACIÓN ULTRA ESTRICTA: Solo mostrar en la celda exacta
        const isDragInThisColumn = currentDragRoomId === cabinId;
        const cellDate = day;
        const isSameDate = currentDragDate ? currentDragDate.toDateString() === cellDate.toDateString() : false;
        
        let isHourInThisCell = false;
        if (currentDragTime) {
          const [dragHours, dragMinutes] = currentDragTime.split(':').map(Number);
          const dragTotalMinutes = dragHours * 60 + dragMinutes;
          const [cellHours, cellMinutes] = time.split(':').map(Number);
          const cellStartMinutes = cellHours * 60 + cellMinutes;
          const cellEndMinutes = cellStartMinutes + slotDuration;
          
          isHourInThisCell = dragTotalMinutes >= cellStartMinutes && dragTotalMinutes < cellEndMinutes;
        }
        
        if (!isDragInThisColumn || !isSameDate || !isHourInThisCell) {
          return null;
        }
        
        // ✅ VALIDAR CONFLICTOS PARA FEEDBACK VISUAL
        const validation = validateHoverSlot(currentDragTime!);
        const isValid = validation?.isValid !== false;
        const lineColor = isValid ? 'bg-green-500' : 'bg-red-500';
        const bgColor = isValid ? 'bg-green-100/80 border-green-500 text-green-800' : 'bg-red-100/80 border-red-500 text-red-800';
        const textColor = isValid ? 'text-green-600' : 'text-red-600';
        
        // Calcular posición exacta de la línea
        const [dragHours, dragMinutes] = currentDragTime!.split(':').map(Number);
        const dragTotalMinutes = dragHours * 60 + dragMinutes;
        const [cellHours, cellMinutes] = time.split(':').map(Number);
        const cellStartMinutes = cellHours * 60 + cellMinutes;
        
        const offsetMinutes = dragTotalMinutes - cellStartMinutes;
        const offsetY = (offsetMinutes / slotDuration) * cellHeight;
        
        return (
          <div key={`drag-preview-${currentDragTime}-${cabinId}-${day.toDateString()}`}>
            {/* Línea verde/roja */}
            <div
              className={cn("absolute right-0 left-0 z-50 pointer-events-none", lineColor)}
              style={{
                top: `${offsetY}px`,
                height: '2px',
                opacity: 0.8
              }}
            />
            
            {/* Indicador de hora con validación */}
            <div
              className={cn("absolute left-0 pointer-events-none z-50 text-xs px-1 py-0.5 text-white rounded-r font-medium",
                isValid ? 'bg-green-500' : 'bg-red-500'
              )}
              style={{
                top: `${offsetY}px`,
                transform: 'translateY(-50%)',
                fontSize: '10px'
              }}
            >
              {currentDragTime}
            </div>
            
            {/* ✅ PREVIEW DE LA CITA EN DRAG & DROP con validación */}
            <div
              className={cn("absolute right-1 left-1 z-40 rounded-md border-2 shadow-lg pointer-events-none", bgColor)}
              style={{
                top: `${offsetY}px`,
                height: `${(draggedAppointment.duration / slotDuration) * cellHeight}px`,
                minHeight: '20px'
              }}
            >
              <div className="overflow-hidden p-1 text-xs font-medium">
                <div className="truncate">{(() => {
                  const realAppointment = appointments.find(apt => apt.id === draggedAppointment.id);
                  return realAppointment?.name || draggedAppointment.startTime;
                })()}</div>
                <div className={cn("text-xs truncate", textColor)}>
                  {(() => {
                    const realAppointment = appointments.find(apt => apt.id === draggedAppointment.id);
                    return realAppointment?.service || 'Servicio';
                  })()}
                </div>
                <div className={cn("text-xs", textColor)}>
                  {draggedAppointment.duration}min
                  {!isValid && validation?.reason && (
                    <span className="block text-[9px] mt-0.5">⚠️ {validation.reason}</span>
                  )}
                </div>
              </div>
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
                // ✅ CORREGIDO: Solo llamar a endDrag() del contexto para evitar doble-terminación
                endDrag();
                // NOTA: handleDragEnd() del WeeklyAgenda ya se llama internamente en el hook optimizado
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
              onStartAppointment={onStartAppointment}
              onClientNameClick={(apt) => {
                if (onClientNameClick) {
                  onClientNameClick(apt);
                }
              }}
              viewType="week"
              visibleDuration={appointment.visibleDuration}
              appointments={appointments}
              minuteGranularity={minuteGranularity}
              smartPlugsData={smartPlugsData}
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
