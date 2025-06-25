"use client"
import { Calendar, Clock, MoreVertical, Tag, Plus, Trash2, CheckCircle, XCircle, MessageSquare, RefreshCw, Check, ChevronRight, Move, ChevronUp, ChevronDown, ExternalLink, Copy, Info, MoveHorizontal, X, RotateCcw } from "lucide-react"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { Appointment } from "@/types/appointments"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import { useClinic } from "@/contexts/clinic-context"
import { isTimeSlotAvailable, getBusinessHours } from "@/services/clinic-schedule-service"
import { useMemo, useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { AppointmentTooltip } from "@/components/appointment-tooltip"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { useGranularity } from '@/lib/drag-drop/granularity-context'
import { useMoveAppointment } from '@/contexts/move-appointment-context'
import { validateGranularityMove } from '@/utils/appointment-validation'
import { validateAppointmentResize } from '@/utils/appointment-validation'
import { useWeeklyAgendaData } from '@/lib/hooks/use-weekly-agenda-data'

// Función para ajustar el brillo del color
function adjustColorBrightness(color: string, amount: number) {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

// Función para oscurecer un color
function darkenColor(color: string, amount: number = 0.2): string {
  // Convertir hex a RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Oscurecer
  const darkerR = Math.round(r * (1 - amount));
  const darkerG = Math.round(g * (1 - amount));
  const darkerB = Math.round(b * (1 - amount));
  
  // Convertir de vuelta a hex
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
}

export function AppointmentItem({
  appointment,
  index,
  onClick,
  slotDuration = 15,
  onDragStart,
  onDragEnd,
  isDragging = false,
  draggedTime,
  onDurationChange,
  onDraggingDurationChange,
  onRevertExtension,
  onTagsUpdate,
  onMoveAppointment,
  onDeleteAppointment,
  onTimeAdjust,
  viewType,
  visibleDuration,
  onClientNameClick,
  appointments = [],
  minuteGranularity = 15,
  dragState,
}: {
  appointment: Appointment & { 
    visibleDuration?: number; 
    isContinuation?: boolean;
    nextAppointmentInRoom?: { startTime: string; startMinutes: number } | null;
  }
  index: number
  onClick?: (appointment: Appointment) => void
  slotDuration?: number
  onDragStart?: (appointment: Appointment, e?: React.DragEvent, initialOffsetMinutes?: number) => void
  onDragEnd?: () => void
  isDragging?: boolean
  draggedTime?: string
  onDurationChange?: (appointmentId: string, newDuration: number) => void
  onDraggingDurationChange?: (isDragging: boolean) => void
  onRevertExtension?: (appointmentId: string) => void
  onTagsUpdate?: (appointmentId: string, updates: any) => void
  onMoveAppointment?: (appointmentId: string) => void
  onDeleteAppointment?: (appointmentId: string, showConfirm?: boolean) => void
  onTimeAdjust?: (appointmentId: string, direction: 'up' | 'down') => void
  viewType?: 'day' | 'week'
  visibleDuration?: number
  onClientNameClick?: (appointment: Appointment) => void
  appointments?: any[]
  minuteGranularity?: number
  dragState?: any
}) {
  // Obtener información de la clínica para validaciones de horario
  const { activeClinic } = useClinic()
  
  // Log para depurar el renderizado de etiquetas
  // ✅ DEBUG temporal comentado para reducir spam
  // useEffect(() => {
  //   console.log(`[AppointmentItem ${appointment.id}] 🏷️ TAGS EN RENDER:`, appointment.tags, appointment.tags?.length || 0, 'tags');
  // }, [appointment.tags, appointment.id]);

  // ✅ DEBUG temporal comentado para reducir spam
  // useEffect(() => {
  //   console.log(`[AppointmentItem ${appointment.id}] ⏱️ DURATION EN RENDER:`, {
  //     duration: appointment.duration,
  //     durationMinutes: (appointment as any).durationMinutes, 
  //     startTime: appointment.startTime,
  //     endTime: appointment.endTime,
  //     service: appointment.service
  //   });
  // }, [appointment.duration, appointment.id, appointment.startTime, appointment.endTime]);

  const baseHeight = (appointment.duration / slotDuration) * AGENDA_CONFIG.ROW_HEIGHT
  const { getTagById, getTags } = useAppointmentTags() || { 
    getTagById: () => undefined,
    getTags: () => []
  }
  
  // ✅ DETECTAR SI ESTA CITA ESTÁ EN MOVIMIENTO
  const { appointmentInMovement } = useMoveAppointment();
  const isThisAppointmentMoving = appointmentInMovement?.appointment.id === appointment.id;
  
  const appointmentRef = useRef<HTMLDivElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [isDraggingDuration, setIsDraggingDuration] = useState(false)
  const [previewDuration, setPreviewDuration] = useState(appointment.duration)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [currentPreviewDuration, setCurrentPreviewDuration] = useState(appointment.duration)
  const [initialDuration, setInitialDuration] = useState(appointment.duration)
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null)
  const resizeDurationRef = useRef(appointment.duration)
  const [hasResizeConflict, setHasResizeConflict] = useState(false)
  const [showOptimisticSpinner, setShowOptimisticSpinner] = useState(false)

  // ✅ SINCRONIZAR previewDuration cuando appointment.duration cambie (renderizado optimista)
  useEffect(() => {
    if (!isResizing) { // Solo actualizar si no estamos en proceso de resize
      setPreviewDuration(appointment.duration);
      setCurrentPreviewDuration(appointment.duration);
      resizeDurationRef.current = appointment.duration;
    }
  }, [appointment.duration, isResizing]);

  // ✅ SIMPLIFICAR LÓGICA: Usar directamente appointment.duration para renderizado optimista inmediato
  const getHeight = useCallback(() => {
    // ✅ PRIORIDAD CLARA: 
    // 1. Durante resize = currentPreviewDuration (feedback visual tiempo real)
    // 2. Fuera de resize = appointment.duration (renderizado optimista inmediato)
    const durationForHeight = isResizing ? currentPreviewDuration : appointment.duration;
    
    if (viewType === 'day' && typeof visibleDuration === 'number') {
      const slotHeightInPixels = 40;
      const minutesPerPixel = slotDuration / slotHeightInPixels;
      return (visibleDuration / minutesPerPixel) - 2;
    }
    
    const slotHeightInPixels = 40;
    const slotsOccupied = durationForHeight / slotDuration;
    return (slotsOccupied * slotHeightInPixels) - 2;
  }, [appointment.duration, currentPreviewDuration, isResizing, slotDuration, viewType, visibleDuration]);

  const height = getHeight();

  // Solo mostraremos los primeros 3 indicadores para no sobrecargar la UI
  const maxVisibleTags = 3

  // Determinar si el contenido es compacto (menos de 30 minutos)
  const isCompact = appointment.duration < 30

  // ✅ AUTO-EXPANSION: Siempre expandir citas pequeñas cuando aparecen controles - SIN FLOATING
  const shouldAutoExpand = isCompact && showQuickActions
  const expandedHeight = shouldAutoExpand ? Math.max(height, 110) : height // ✅ SIEMPRE 110px mínimo para todos los controles
  
  // ✅ ELIMINAR FLOATING CONTROLS: Siempre usar auto-expansion en lugar de floating

  // Determinar si es una cita optimista
  const isOptimistic = appointment.id.toString().startsWith('temp-');
  
  // Determinar el color de fondo y borde basado en el color de la cita
  const backgroundColor = appointment.color || '#9CA3AF'
  const borderColor = adjustColorBrightness(backgroundColor, -20)
  const textColor = '#FFFFFF' // Color de texto blanco siempre

  const handleMouseEnter = () => {
    setShowTooltip(true)
    setShowQuickActions(true)
  };

  const handleMouseLeave = () => {
    if (!isDraggingDuration) {
      setShowTooltip(false)
      setShowQuickActions(false)
    }
  };

  // ✅ OBTENER DATOS DEL CACHE para validación consistente
  const { appointments: cacheAppointments } = useWeeklyAgendaData(appointment.date);

  // ✅ VALIDACIÓN CENTRALIZADA: Usar función unificada para botones de granularidad
  const canMoveUp = useMemo(() => {
    // ✅ USAR DATOS DEL CACHE para garantizar consistencia absoluta
    const appointmentsToUse = cacheAppointments || appointments || [];
    
    if (appointmentsToUse.length === 0 || !activeClinic) return true;
    
    const validation = validateGranularityMove(
      appointment,
      'up',
      minuteGranularity,
      appointmentsToUse,
      activeClinic
    );
    
    return validation.isValid;
  }, [appointment, cacheAppointments, appointments, minuteGranularity, activeClinic]);

  const canMoveDown = useMemo(() => {
    // ✅ USAR DATOS DEL CACHE para garantizar consistencia absoluta
    const appointmentsToUse = cacheAppointments || appointments || [];
    
    if (appointmentsToUse.length === 0 || !activeClinic) return true;
    
    const validation = validateGranularityMove(
      appointment,
      'down', 
      minuteGranularity,
      appointmentsToUse,
      activeClinic
    );
    
    return validation.isValid;
  }, [appointment, cacheAppointments, appointments, minuteGranularity, activeClinic]);

  // ✅ NUEVA: VALIDACIÓN PARA OCULTAR HOVER DE ESTIRAR
  const canResize = useMemo(() => {
    // ✅ USAR DATOS DEL CACHE para garantizar consistencia absoluta
    const appointmentsToUse = cacheAppointments || appointments || [];
    
    if (appointmentsToUse.length === 0 || !activeClinic) return true;
    
    // Probar si se puede extender al menos una granularidad más
    const extendedDuration = appointment.duration + minuteGranularity;
    
    const validation = validateAppointmentResize(
      appointment,
      extendedDuration,
      appointmentsToUse,
      activeClinic,
      minuteGranularity
    );
    
    return validation.isValid;
  }, [appointment, cacheAppointments, appointments, minuteGranularity, activeClinic]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // ✅ CORRECCIÓN: Solo bloquear granularidades si NO estamos dragging
    // Durante drag, permitir granularidades sobre la cita propia para movilidad suave
    if (!isDragging) {
      e.stopPropagation(); // Evitar que se muestren granularidades
    }
    
    if (showTooltip) {
      const rect = appointmentRef.current?.getBoundingClientRect();
      if (rect) {
        // Calcular posición relativa a la cita, no al cursor exacto
        // Esto evita que el tooltip se aleje demasiado de la cita
        const tooltipX = rect.right + 10; // Siempre a la derecha de la cita
        const tooltipY = Math.min(e.clientY, rect.bottom - 20); // Limitado por el bottom de la cita
        
        setTooltipPosition({
          x: tooltipX,
          y: Math.max(rect.top, tooltipY) // No subir más allá del top de la cita
        });
      }
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    // ✅ BLOQUEO: No permitir drag en citas optimistas
    if (isOptimistic) {
      e.preventDefault(); // ❌ Cancelar drag inmediatamente
      
      // ✅ MOSTRAR SPINNER VISUAL
      setShowOptimisticSpinner(true);
      setTimeout(() => setShowOptimisticSpinner(false), 2000);
      
      console.log('[AppointmentItem] 🚫 Drag bloqueado en cita optimista:', appointment.id);
      return;
    }
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(appointment))
    
    // Calcular el offset inicial en minutos desde el inicio de la cita
    let initialOffsetMinutes = 0;
    if (appointmentRef.current) {
      const rect = appointmentRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
      // CORRECCIÓN DEFINITIVA: Usar SIEMPRE la duración REAL (incluyendo extensiones)
      // El drag debe funcionar con la duración visual que el usuario ve
      initialOffsetMinutes = Math.round(percentage * appointment.duration);
      

    }
    
    // Crear una imagen de arrastre personalizada con el tamaño correcto
    if (appointmentRef.current) {
      const dragImage = appointmentRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      dragImage.style.width = appointmentRef.current.offsetWidth + 'px';
      dragImage.style.height = height + 'px'; // Usar la altura calculada
      dragImage.style.pointerEvents = 'none';
      document.body.appendChild(dragImage);
      
      e.dataTransfer.setDragImage(dragImage, e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      
      // Eliminar el elemento clonado después de un breve retraso
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 0);
    }
    
    if (onDragStart) onDragStart(appointment, e, initialOffsetMinutes)
  }

  const handleDragEnd = () => {
    if (onDragEnd) onDragEnd()
  }

  const handleDraggingDurationChange = (isDragging: boolean) => {
    setIsDraggingDuration(isDragging);
    if (isDragging) {
      setShowTooltip(false); // Ocultar tooltip al iniciar el estiramiento
    }
    if (onDraggingDurationChange) {
      onDraggingDurationChange(isDragging);
    }
  };

  // ✅ MEJORAR SISTEMA DE RESIZE: Más suave como drag & drop
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('[AppointmentItem] 🔧 Iniciando resize MEJORADO:', appointment.id);
    
    const startY = e.clientY;
    const originalDuration = appointment.duration;
    const originalHeight = height;
    
    // ✅ CAPTURAR MOUSE y establecer estado inicial
    setIsResizing(true);
    setCurrentPreviewDuration(originalDuration);
    setPreviewDuration(originalDuration);
    setHasResizeConflict(false);
    
    if (onDraggingDurationChange) {
      onDraggingDurationChange(true);
    }
    
    // ✅ CONFIGURAR CURSOR GLOBAL Y CAPTURA
    document.body.dataset.resizing = 'true';
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none'; // Evitar interferencia
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // ✅ CREAR OVERLAY INVISIBLE PARA CAPTURAR MOUSE
    const overlay = document.createElement('div');
    overlay.id = 'resize-capture-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      cursor: ns-resize;
      background: transparent;
      pointer-events: all;
    `;
    document.body.appendChild(overlay);
    
    // ✅ REF PARA TRACKING CONTINUO
    const resizeDurationRef = { current: originalDuration };
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const deltaY = e.clientY - startY;
      
      // ✅ CONVERTIR PIXELS A MINUTOS con mejor precisión
      const pixelsPerMinute = (originalHeight / originalDuration) || 1;
      const deltaMinutes = Math.round(deltaY / pixelsPerMinute);
      
      // ✅ APLICAR GRANULARIDAD CORRECTA DEL SISTEMA (no slotDuration)
      const granularDelta = Math.round(deltaMinutes / minuteGranularity) * minuteGranularity;
      let newDuration = Math.max(minuteGranularity, originalDuration + granularDelta);
      
      // ✅ DETECCIÓN DE CONFLICTOS SUAVE - USAR DATOS DEL CACHE
      let hasConflict = false;
      // ✅ USAR DATOS DEL CACHE para garantizar consistencia absoluta
      const appointmentsToUse = cacheAppointments || appointments || [];
      
      if (appointmentsToUse.length > 0) {
        const [startHours, startMinutes] = appointment.startTime.split(':').map(Number);
        const appointmentStartMinutes = startHours * 60 + startMinutes;
        const appointmentEndMinutes = appointmentStartMinutes + newDuration;
        
        const conflictingAppointment = appointmentsToUse.find(apt => {
          if (apt.id === appointment.id || String(apt.roomId) !== String(appointment.roomId)) {
            return false;
          }
          
          const [aptStartHours, aptStartMinutes] = apt.startTime.split(':').map(Number);
          const aptStartMinutesTotal = aptStartHours * 60 + aptStartMinutes;
          const aptEndMinutesTotal = aptStartMinutesTotal + apt.duration;
          
          return appointmentEndMinutes > aptStartMinutesTotal && appointmentStartMinutes < aptEndMinutesTotal;
        });
        
        if (conflictingAppointment) {
          hasConflict = true;
          const [conflictStartHours, conflictStartMinutes] = conflictingAppointment.startTime.split(':').map(Number);
          const conflictStartMinutesTotal = conflictStartHours * 60 + conflictStartMinutes;
          const maxDuration = Math.max(minuteGranularity, conflictStartMinutesTotal - appointmentStartMinutes);
          newDuration = maxDuration;
        }
      }
      
      // ✅ ACTUALIZAR ESTADO SUAVEMENTE
      if (resizeDurationRef.current !== newDuration) {
        resizeDurationRef.current = newDuration;
        setCurrentPreviewDuration(newDuration);
        setPreviewDuration(newDuration);
        setHasResizeConflict(hasConflict);
        
        if (onDraggingDurationChange) {
          onDraggingDurationChange(true);
        }
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('[AppointmentItem] 🔧 Finalizando resize MEJORADO:', {
        originalDuration,
        newDuration: resizeDurationRef.current,
        changed: resizeDurationRef.current !== originalDuration
      });
      
      // ✅ LIMPIAR OVERLAY Y ESTILOS
      const overlayElement = document.getElementById('resize-capture-overlay');
      if (overlayElement) {
        overlayElement.remove();
      }
      
      // ✅ RESTAURAR ESTILOS GLOBALES
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      document.body.style.overflow = originalOverflow;
      delete document.body.dataset.resizing;
      
      // ✅ APLICAR CAMBIO FINAL
      if (resizeDurationRef.current !== originalDuration && onDurationChange) {
        onDurationChange(appointment.id, resizeDurationRef.current);
      }
      
      // ✅ LIMPIAR ESTADO
      setIsResizing(false);
      setHasResizeConflict(false);
      
      if (onDraggingDurationChange) {
        onDraggingDurationChange(false);
      }
      
      // ✅ REMOVER LISTENERS
      overlay.removeEventListener('mousemove', handleMouseMove);
      overlay.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('keydown', handleKeyDown);
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[AppointmentItem] Cancelando resize con ESC');
        
        // ✅ LIMPIAR TODO COMO EN mouseUp
        const overlayElement = document.getElementById('resize-capture-overlay');
        if (overlayElement) {
          overlayElement.remove();
        }
        
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
        document.body.style.overflow = originalOverflow;
        delete document.body.dataset.resizing;
        
        // ✅ RESTAURAR DURACIÓN ORIGINAL
        setCurrentPreviewDuration(originalDuration);
        setPreviewDuration(originalDuration);
        setIsResizing(false);
        setHasResizeConflict(false);
        
        if (onDraggingDurationChange) {
          onDraggingDurationChange(false);
        }
        
        overlay.removeEventListener('mousemove', handleMouseMove);
        overlay.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    // ✅ REGISTRAR LISTENERS EN OVERLAY (no en document)
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
          document.addEventListener('keydown', handleKeyDown);
  }, [appointment.id, appointment.duration, appointment.startTime, appointment.roomId, minuteGranularity, height, onDurationChange, onDraggingDurationChange, cacheAppointments, appointments]);

  useEffect(() => {
    if (isDragging) {
      setShowTooltip(false);
    }
  }, [isDragging]);

  // ✅ FORZAR RE-RENDER INMEDIATO cuando cambia currentPreviewDuration durante resize
  useEffect(() => {
    if (isResizing) {
      // El cambio de estado ya causa re-render, pero asegurar que height se recalcule
      const newHeight = getHeight();
      console.log('[AppointmentItem] 📏 Altura actualizada durante resize:', {
        currentPreviewDuration,
        newHeight,
        appointmentId: appointment.id
      });
    }
  }, [currentPreviewDuration, isResizing, getHeight, appointment.id]);

  return (
    <>
      <div
        ref={appointmentRef}
        data-appointment-item="true"
        data-appointment-id={appointment.id}
        data-resizing={isResizing ? "true" : undefined}
        className={cn(
          "absolute rounded-md flex flex-col group transition-all duration-200",
          isDragging && !isDraggingDuration && "opacity-50",
          "hover:shadow-lg hover:z-20",
          appointment.isContinuation && "border-l-2 border-dashed border-gray-300",
          // ✅ ESTILO SUTIL PARA CITAS OPTIMISTAS (opcional)
          isOptimistic && "ring-1 ring-purple-300 ring-opacity-50",
          // ✅ TRANSPARENCIA CUANDO ESTÁ EN MODO MOVIMIENTO
          isThisAppointmentMoving && "opacity-60 scale-95 ring-2 ring-purple-400 ring-opacity-70",
          // Estilos de borde durante el resize
          isResizing && hasResizeConflict && "ring-2 ring-red-500 ring-opacity-80",
          isResizing && !hasResizeConflict && "ring-2 ring-green-500 ring-opacity-80",
          // ✅ CLASE CSS ESPECÍFICA PARA RESIZE
          isResizing && "appointment-resizing",
          isResizing && hasResizeConflict && "appointment-resize-conflict"
        )}
        style={{
          backgroundColor,
          borderLeft: `4px solid ${borderColor}`,
          borderBottom: `3px solid ${borderColor}`,
          color: textColor,
          cursor: isDraggingDuration ? 'ns-resize' : (isOptimistic ? 'default' : 'move'), // ✅ Cursor diferente para optimistas
          height: `${expandedHeight}px`,
          width: '100%', // Ocupar todo el ancho disponible
          // ✅ ELIMINAR TRANSICIÓN DURANTE RESIZE para feedback inmediato
          transition: isResizing ? 'none' : 'all 0.2s ease-out',
          // ✅ FEEDBACK VISUAL DURANTE RESIZE
          transform: isResizing ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isResizing ? '0 8px 25px rgba(0, 0, 0, 0.2)' : undefined,
          zIndex: isResizing ? 30 : 'auto' // ✅ Por debajo de modales (50) e indicador (40)
        }}
        draggable={!isDraggingDuration && !isOptimistic} // ✅ Solo draggable si no está estirando Y no es optimista
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onClick={(e) => {
          e.stopPropagation();
          // No abrir modal si acabamos de terminar un resize
          if (document.body.dataset.resizing === 'true') {
            console.log('Evitando apertura de modal de edición durante resize');
            return;
          }
          if (!isDraggingDuration && onClick) {
            onClick(appointment);
          }
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Contenedor interno con overflow-hidden */}
        <div className="overflow-hidden relative h-full rounded-md">
          
          {/* ✅ INDICADOR VISUAL DE EXTENSIÓN DURANTE RESIZE */}
          {isResizing && (
            <div 
              className="absolute right-0 bottom-0 left-0 z-30 h-2 bg-gradient-to-t to-transparent from-purple-500/60"
              style={{
                background: hasResizeConflict 
                  ? 'linear-gradient(to top, rgba(239, 68, 68, 0.6), transparent)'
                  : 'linear-gradient(to top, rgba(147, 51, 234, 0.6), transparent)'
              }}
            />
          )}

          {/* Indicadores de etiquetas en la parte superior */}
          {appointment.tags && appointment.tags.length > 0 && (
            <div className="flex items-center gap-0.5 mb-0.5 absolute top-1 right-1 z-20">
              {appointment.tags.slice(0, maxVisibleTags).map((tagId) => {
                const tag = getTagById(tagId);
                if (!tag) return null;
                
                return (
                  <div 
                    key={tag.id}
                    className={cn(
                      "rounded-full border border-white shadow-sm",
                      isCompact ? "w-1.5 h-1.5" : "w-2 h-2" // Más pequeñas en citas compactas
                    )}
                    style={{ 
                      backgroundColor: tag.color,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                    }}
                    title={tag.name}
                  />
                );
              })}
              {appointment.tags.length > maxVisibleTags && (
                <div 
                  className={cn(
                    "rounded-full flex items-center justify-center",
                    isCompact ? "text-[6px] w-2 h-1.5" : "text-[8px] w-3 h-2"
                  )}
                  style={{
                    backgroundColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                    color: textColor
                  }}
                >
                  +{appointment.tags.length - maxVisibleTags}
                </div>
              )}
            </div>
          )}

          <div className={cn("px-2", isCompact ? "py-1" : "py-2")}>
            {/* Hora de inicio y fin SIN icono - más legible */}
            <div className="flex gap-1 items-center">
              <div className={cn(
                "font-semibold truncate", // ✅ MEJORADO: font-semibold y sin icono para mejor legibilidad
                isCompact ? "text-[11px]" : "text-sm", // ✅ MEJORADO: Texto más grande
                // ✅ RESALTAR DURANTE RESIZE
                isResizing && "text-white font-bold bg-black/20 px-1 rounded"
              )}>
                {(() => {
                  // ✅ MOSTRAR DURACIÓN EN TIEMPO REAL DURANTE RESIZE
                  const durationToShow = isResizing ? currentPreviewDuration : appointment.duration;
                  
                  // ✅ USAR ENDTIME OPTIMISTA: Solo recalcular durante resize, resto usar appointment.endTime
                  const showTime = appointment.startTime;
                  let endTime: string;
                  
                  if (isResizing) {
                    // Durante resize: calcular endTime dinámicamente
                    const [hours, minutes] = showTime.split(':').map(Number);
                    const startMinutes = hours * 60 + minutes;
                    const endMinutes = startMinutes + durationToShow;
                    const endHours = Math.floor(endMinutes / 60);
                    const endMins = endMinutes % 60;
                    endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                  } else {
                    // ✅ FUERA DE RESIZE: Usar appointment.endTime (ya actualizado optimísticamente)
                    endTime = appointment.endTime;
                  }
                  
                  // ✅ MOSTRAR INDICADOR VISUAL DE CAMBIO DURANTE RESIZE
                  const baseText = `${showTime} - ${endTime}`;
                  if (isResizing) {
                    return `${baseText} (${durationToShow}min)`;
                  }
                  return baseText;
                })()}
              </div>
            </div>
            
            {/* Nombre del cliente - ligeramente más grande */}
            <div className={cn("mt-0.5", isCompact ? "text-[11px]" : "text-[13px]")}>
              {/* ✅ ÁREA CLICKABLE LIMITADA: Solo nombre + ícono */}
              <div 
                className={cn(
                  "group inline-flex items-center gap-1", // ✅ inline-flex en lugar de flex para ocupar solo el contenido
                  onClientNameClick && "cursor-pointer hover:text-violet-600 transition-colors",
                  isDragging && onClientNameClick && "pointer-events-none" // Desactivar click durante drag
                )}
                onClick={(e) => {
                  if (onClientNameClick) {
                    e.stopPropagation();
                    onClientNameClick(appointment);
                  }
                }}
              >
                <span className="font-normal truncate">
                  {appointment.name}
                </span>
                {onClientNameClick && (
                  <ExternalLink className="flex-shrink-0 w-3 h-3 text-violet-600 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </div>
            </div>
            
            {/* Espacio reservado para futuras etiquetas */}
            <div className="flex flex-wrap gap-1 mt-1">
              {/* Las etiquetas se añadirán aquí más adelante */}
            </div>
          </div>
        </div>

        {/* ✅ BOTONES MOVIDOS FUERA DEL OVERFLOW-HIDDEN PARA VISIBILIDAD EN AUTO-EXPANSION */}
        
        {/* Flechas de ajuste de hora - FUERA del overflow-hidden */}
        {showQuickActions && (
          <div 
            className={cn(
              "absolute z-40 flex flex-col gap-0.5 transition-all duration-200",
              isDragging && "pointer-events-none", // Desactivar durante drag
              shouldAutoExpand ? (
                // ✅ AUTO-EXPANSION: Agrupados a la derecha para mejor usabilidad
                "bottom-5 right-8"
              ) : (
                // Normal: mantener posición original pero también agrupados a la derecha cuando hay espacio
                isCompact ? "bottom-2 right-4" : "bottom-4 right-8"
              )
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            {canMoveUp && (
              <button 
                className={cn(
                  "rounded transition-all duration-150",
                  "hover:scale-110", // ✅ NUEVO: Efecto zoom hover para indicar clicabilidad
                  // ✅ MEJORADO: Más pequeños en auto-expandido para mejor proporción
                  shouldAutoExpand ? "p-0.5" : (isCompact ? "p-1" : "p-0.5"),
                  "bg-purple-500/20 hover:bg-purple-500/30 text-purple-700"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onTimeAdjust) {
                    onTimeAdjust(appointment.id, 'up');
                  }
                }}
                title="Mover arriba según granularidad"
              >
                <ChevronUp className={cn(
                  "text-purple-700", 
                  // ✅ MEJORADO: Más pequeños en auto-expandido
                  shouldAutoExpand ? "w-2.5 h-2.5" : "w-3 h-3"
                )} />
              </button>
            )}
            {canMoveDown && (
              <button 
                className={cn(
                  "rounded transition-all duration-150",
                  "hover:scale-110", // ✅ NUEVO: Efecto zoom hover para indicar clicabilidad
                  // ✅ MEJORADO: Más pequeños en auto-expandido para mejor proporción
                  shouldAutoExpand ? "p-0.5" : (isCompact ? "p-1" : "p-0.5"),
                  "bg-purple-500/20 hover:bg-purple-500/30 text-purple-700"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onTimeAdjust) {
                    onTimeAdjust(appointment.id, 'down');
                  }
                }}
                title="Mover abajo según granularidad"
              >
                <ChevronDown className={cn(
                  "text-purple-700", 
                  // ✅ MEJORADO: Más pequeños en auto-expandido
                  shouldAutoExpand ? "w-2.5 h-2.5" : "w-3 h-3"
                )} />
              </button>
            )}
          </div>
        )}
        
        {/* Menú de acciones rápidas - FUERA del overflow-hidden */}
        {showQuickActions && (
          <div 
            className={cn(
              "absolute z-40 transition-all duration-200",
              isDragging && "pointer-events-none", // Desactivar durante drag
              shouldAutoExpand ? (
                // ✅ AUTO-EXPANSION: Agrupado con botones de granularidad para mejor usabilidad
                "bottom-5 right-1"
              ) : (
                // Normal: mantener posición original  
                isCompact ? "bottom-2 right-1" : "bottom-4 right-1"
              )
            )}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button 
                  className={cn(
                    "rounded-full transition-all duration-200 data-[state=open]:shadow group",
                    isCompact ? "p-1" : "p-1", // ✅ MEJOR TAMAÑO: Consistente y visible
                    "bg-white hover:bg-gray-50 shadow-md hover:shadow-lg border border-gray-200 data-[state=open]:bg-gray-50"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Plus className={cn(
                    "text-gray-700 transition-transform duration-200 group-data-[state=open]:rotate-45",
                    isCompact ? "h-3 w-3" : "h-3 w-3" // ✅ TAMAÑO CONSISTENTE: Bien visible
                  )} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                side="top" 
                sideOffset={5}
                className="w-48"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Tag className="mr-2 w-4 h-4" />
                    Etiquetas
                  </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  {getTags().map((tag) => {
                    const isSelected = appointment.tags?.includes(tag.id);
                    return (
                      <DropdownMenuItem
                        key={tag.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTagsUpdate) {
                            const newTags = isSelected
                              ? appointment.tags?.filter(id => id !== tag.id) || []
                              : [...(appointment.tags || []), tag.id];
                            onTagsUpdate(appointment.id, newTags);
                          }
                        }}
                        className="flex justify-between items-center cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex gap-2 items-center">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                if (onMoveAppointment) {
                  onMoveAppointment(appointment.id);
                }
              }} className="cursor-pointer hover:bg-gray-100">
                <Move className="mr-2 w-4 h-4" />
                Mover
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                console.log("No asistido");
              }} className="cursor-pointer hover:bg-gray-100">
                <XCircle className="mr-2 w-4 h-4" />
                No asistido
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                console.log("Información");
              }} className="cursor-pointer hover:bg-gray-100">
                <MessageSquare className="mr-2 w-4 h-4" />
                Información
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                console.log("Duplicar");
              }} className="cursor-pointer hover:bg-gray-100">
                <Copy className="mr-2 w-4 h-4" />
                Duplicar
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDeleteAppointment) {
                    onDeleteAppointment(appointment.id, true); // showConfirm = true
                  } else {
                    console.log("onDeleteAppointment no disponible");
                  }
                }} 
                className="text-red-600 cursor-pointer hover:bg-red-50"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>)}

        {/* Zona de estiramiento profesional integrada en la cita */}
        {canResize && (
          <div
            className={cn(
              "absolute bottom-0 left-0 w-full h-4 resize-handle", // ✅ Añadir clase CSS
              "cursor-ns-resize",
              "group", // Añadir group para controlar hover states
              "transition-all duration-150",
              // Durante el resize, mostrar feedback visual MUCHO MÁS OBVIO
              isResizing && "bg-purple-500/40 backdrop-blur-sm"
            )}
            onMouseDown={handleResizeStart}
            onMouseEnter={(e) => e.stopPropagation()} // Evitar que se propague el hover
          >
          {/* Fondo que aparece al hover - MÁS VISIBLE */}
          <div 
            className={cn(
              "absolute inset-0",
              "bg-purple-500/0 group-hover:bg-purple-500/30",
              "transition-colors duration-150",
              isResizing && "bg-purple-500/40"
            )}
          />
          
          {/* Indicador visual de líneas paralelas - MÁS PROMINENTE */}
          <div className={cn(
            "absolute bottom-1 left-1/2 -translate-x-1/2",
            "flex flex-col gap-0.5",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-150",
            isResizing && "opacity-100"
          )}>
            <div className={cn(
              "w-10 h-1 rounded-full", // Más grande y visible
              "bg-gray-500/70 group-hover:bg-purple-500",
              isResizing && "bg-purple-600 shadow-lg"
            )} />
            <div className={cn(
              "w-10 h-1 rounded-full", // Más grande y visible
              "bg-gray-500/70 group-hover:bg-purple-500",
              isResizing && "bg-purple-600 shadow-lg"
            )} />
          </div>

          {/* ✅ INDICADOR DE DURACIÓN DURANTE RESIZE */}
          {isResizing && (
            <div className="absolute -top-8 left-1/2 z-50 px-2 py-1 text-xs font-medium text-white whitespace-nowrap rounded -translate-x-1/2 bg-black/90">
              {currentPreviewDuration}min
              {hasResizeConflict && (
                <span className="ml-2 text-red-300">¡Conflicto!</span>
              )}
            </div>
          )}
        </div>
        )}

        {/* ✅ BOTÓN RESTABLECER DURACIÓN - Reposicionado a la izquierda de los botones */}
        {appointment.estimatedDurationMinutes && 
         appointment.duration !== appointment.estimatedDurationMinutes && (
          <button
            className={cn(
              "absolute z-30 transition-all duration-200 rounded-full shadow-sm hover:shadow",
              "hover:scale-110", // ✅ NUEVO: Efecto zoom hover para indicar clicabilidad
              isDragging && "pointer-events-none", // Desactivar durante drag
              // ✅ POSICIONAMIENTO INTELIGENTE según tamaño de cita
              shouldAutoExpand ? (
                // ✅ AUTO-EXPANSION: Esquina inferior izquierda pequeño, igual que citas extendidas
                "bottom-1 left-1 p-0.5"
              ) : (
                // Sin auto-expansion: esquina inferior izquierda, muy pequeño
                "bottom-1 left-1 p-0.5"
              ),
              // ✅ LÓGICA COMPLETA: Rojo si extendida, naranja si reducida
              appointment.duration > appointment.estimatedDurationMinutes ? (
                "bg-red-500/90 hover:bg-red-600" // Rojo para extendida
              ) : (
                "bg-orange-500/90 hover:bg-orange-600" // Naranja para reducida
              )
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (onRevertExtension) {
                onRevertExtension(appointment.id);
              }
            }}
            title={`Restablecer a duración de servicios (${appointment.estimatedDurationMinutes} min)`}
          >
            <RotateCcw className={cn(
              "text-white transition-all duration-200",
              // ✅ MEJORADO: Tamaño adaptativo según vista - día más grande que semana
              viewType === 'day' ? "w-2.5 h-2.5" : "w-2 h-2"
            )} />
          </button>
        )}

        {/* ✅ SPINNER OPTIMISTA - Esquina inferior derecha */}
        {showOptimisticSpinner && (
          <div className="absolute right-1 bottom-1 z-30">
            <div className="w-3 h-3 rounded-full border-2 animate-spin border-white/30 border-t-white"></div>
          </div>
        )}
      </div>

      {(showTooltip || isDraggingDuration) && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 999999, // Z-index máximo para estar sobre todo
            left: `${(() => {
              const tooltipWidth = 280; // Ancho estimado del tooltip
              const windowWidth = window.innerWidth;
              const rect = appointmentRef.current?.getBoundingClientRect();
              
              if (!rect) return tooltipPosition.x;
              
              // Intentar posicionar a la derecha de la cita
              const rightPosition = rect.right + 10;
              
              // Si el tooltip se saldría por la derecha, posicionarlo a la izquierda
              if (rightPosition + tooltipWidth > windowWidth - 20) {
                // Posicionar a la izquierda de la cita
                return Math.max(10, rect.left - tooltipWidth - 10);
              }
              
              return rightPosition;
            })()}px`,
            top: `${(() => {
              const tooltipHeight = 200; // Altura estimada del tooltip
              const windowHeight = window.innerHeight;
              const navbarHeight = 64; // Altura estimada del navbar
              const rect = appointmentRef.current?.getBoundingClientRect();
              
              if (!rect) return tooltipPosition.y;
              
              // Intentar posicionar alineado con el top de la cita
              let top = rect.top;
              
              // Asegurar que el tooltip no se superponga con el navbar
              const minY = navbarHeight + 10;
              top = Math.max(minY, top);
              
              // Si el tooltip se saldría por abajo, ajustar hacia arriba
              if (top + tooltipHeight > windowHeight - 20) {
                // Intentar posicionar más arriba pero sin salir del viewport
                top = Math.max(minY, windowHeight - tooltipHeight - 20);
              }
              
              return top;
            })()}px`,
            transform: 'none' // Eliminar el transform cuando calculamos la posición exacta
          }}
        >
          <AppointmentTooltip
            title={appointment.name}
            date={appointment.date}
            time={appointment.startTime}
            duration={isResizing ? currentPreviewDuration : appointment.duration}
            color={backgroundColor}
            roomName={undefined} // No mostrar sala en tooltip de hover
            clientName={appointment.name}
            clientPhone={appointment.phone}
            services={appointment.service ? [appointment.service] : []}
            tags={appointment.tags ? appointment.tags.map(tagId => {
              const tag = getTagById(tagId);
              return tag ? { id: tag.id, name: tag.name, color: tag.color } : null;
            }).filter(Boolean) as any[] : []}
            onClientNameClick={() => {
              if (onClientNameClick) {
                onClientNameClick(appointment);
              }
            }}
            endTime={appointment.endTime} // ✅ PASAR endTime directamente de la cita
            // ✅ NUEVA: Información de extensión/reducción para el tooltip
            durationModification={appointment.estimatedDurationMinutes ? {
              type: appointment.duration > appointment.estimatedDurationMinutes ? 'extension' : 
                    appointment.duration < appointment.estimatedDurationMinutes ? 'reduction' : 'normal',
              servicesDuration: appointment.estimatedDurationMinutes,
              currentDuration: appointment.duration
            } : undefined}
          />
        </div>,
        document.body
      )}
    </>
  )
}

// Función auxiliar para determinar el color de contraste
function getContrastColor(hexColor: string): string {
  // Convertir hex a RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calcular luminancia
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Retornar blanco o negro basado en la luminancia
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}