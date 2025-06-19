"use client"
import { Calendar, Clock, MoreVertical, Tag, Plus, Trash2, CheckCircle, XCircle, MessageSquare, RefreshCw, Check, ChevronRight, Move, ChevronUp, ChevronDown, ExternalLink } from "lucide-react"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { Appointment } from "@/types/appointments"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import { useMemo, useState, useRef, useEffect, useCallback } from "react"
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
  onDurationChange,
  onDraggingDurationChange,
  onRevertExtension,
  onTagsUpdate,
  onMoveAppointment,
  onTimeAdjust,
  viewType,
  visibleDuration,
  onClientNameClick,
}: {
  appointment: Appointment & { visibleDuration?: number; isContinuation?: boolean }
  index: number
  onClick?: (appointment: Appointment) => void
  slotDuration?: number
  onDragStart?: (appointment: Appointment, e?: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
  onDurationChange?: (appointmentId: string, newDuration: number) => void
  onDraggingDurationChange?: (isDragging: boolean) => void
  onRevertExtension?: (appointmentId: string) => void
  onTagsUpdate?: (appointmentId: string, tagIds: string[]) => void
  onMoveAppointment?: (appointmentId: string) => void
  onTimeAdjust?: (appointmentId: string, direction: 'up' | 'down') => void
  viewType?: 'day' | 'week'
  visibleDuration?: number
  onClientNameClick?: (appointment: Appointment) => void
}) {
  // Log para depurar el renderizado de etiquetas
  useEffect(() => {
    console.log(`[AppointmentItem ${appointment.id}] Tags actualizadas:`, appointment.tags);
  }, [appointment.tags, appointment.id]);

  const baseHeight = (appointment.duration / slotDuration) * AGENDA_CONFIG.ROW_HEIGHT
  const { getTagById, getTags } = useAppointmentTags() || { 
    getTagById: () => undefined,
    getTags: () => []
  }
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
  const [tooltipTimeout, setTooltipTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const resizeDurationRef = useRef(appointment.duration)

  // Estado para la visualización durante el estiramiento
  const effectiveDuration = isResizing ? resizeDurationRef.current : (previewDuration || appointment.duration);
  const displayDuration = effectiveDuration || appointment.duration;

  // Calcular altura dinámica basada en la duración visible o de preview
  const getHeight = useCallback(() => {
    if (viewType === 'day' && visibleDuration !== undefined) {
      const slotHeightInPixels = 40;
      const minutesPerPixel = slotDuration / slotHeightInPixels;
      return (visibleDuration / minutesPerPixel) - 2;
    }
    
    const slotHeightInPixels = 40;
    const slotsOccupied = displayDuration / slotDuration;
    return (slotsOccupied * slotHeightInPixels) - 2;
  }, [displayDuration, slotDuration, viewType, visibleDuration]);

  const height = getHeight();

  // Solo mostraremos los primeros 3 indicadores para no sobrecargar la UI
  const maxVisibleTags = 3

  // Determinar si el contenido es compacto (menos de 30 minutos)
  const isCompact = appointment.duration < 30

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

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se muestren granularidades
    if (showTooltip) {
      const rect = appointmentRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({
          x: e.clientX,
          y: e.clientY
        });
      }
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(appointment))
    
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
    
    if (onDragStart) onDragStart(appointment, e)
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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startY = e.clientY;
    const startDuration = appointment.duration;
    
    setIsResizing(true);
    setResizeStartY(startY);
    setInitialDuration(startDuration);
    resizeDurationRef.current = startDuration;
    setCurrentPreviewDuration(startDuration);
    
    // Mostrar tooltip durante resize para feedback visual
    setShowTooltip(true);
    
    if (onDraggingDurationChange) {
      onDraggingDurationChange(true);
    }
    
    // Ocultar tooltip durante el resize
    // setShowTooltip(false);
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      setTooltipTimeout(null);
    }
    
    // Cambiar cursor globalmente
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Marcar que estamos en proceso de resize para evitar que se abra el modal
    document.body.dataset.resizing = 'true';
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentY = e.clientY;
      const deltaY = currentY - startY;
      
      // Convertir píxeles a minutos con mayor precisión
      const slotHeightInPixels = 40;
      const minutesPerPixel = slotDuration / slotHeightInPixels;
      // Usar redondeo más preciso para evitar desfases
      const deltaMinutes = Math.round((deltaY * minutesPerPixel) / 5) * 5; // Redondear a múltiplos de 5
      
      // Calcular nueva duración (mínimo 15 minutos, máximo 240 minutos)
      const newDuration = Math.max(15, Math.min(240, startDuration + deltaMinutes));
      
      // Debug del cálculo
      console.log('[AppointmentItem handleMouseMove] Debug cálculo duración:', {
        deltaY,
        slotDuration,
        slotHeightInPixels,
        minutesPerPixel,
        deltaMinutes,
        startDuration,
        newDuration,
        currentPreviewDuration
      });
      
      // Solo actualizar si la nueva duración es diferente a la actual
      if (newDuration !== currentPreviewDuration) {
        console.log('[AppointmentItem handleMouseMove] Actualizando duración:', {
          from: currentPreviewDuration,
          to: newDuration
        });
        
        // Actualizar tanto el estado como el ref
        resizeDurationRef.current = newDuration;
        setCurrentPreviewDuration(newDuration);
        setPreviewDuration(newDuration);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[AppointmentItem] Cancelando resize con ESC');
        
        // Restaurar tamaño original
        const originalDuration = appointment.duration;
        resizeDurationRef.current = originalDuration;
        setCurrentPreviewDuration(originalDuration);
        setPreviewDuration(originalDuration);
        
        // Limpiar estado
        setIsResizing(false);
        setShowTooltip(false);
        
        if (onDraggingDurationChange) {
          onDraggingDurationChange(false);
        }
        
        // Restaurar estilos
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.overflow = originalOverflow;
        
        // Quitar flag de resizing
        setTimeout(() => {
          delete document.body.dataset.resizing;
        }, 150);
        
        // Remover listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Limpiar el flag de resizing después de un pequeño delay para evitar que el click se propague
      setTimeout(() => {
        delete document.body.dataset.resizing;
      }, 150); // Aumentar el delay para asegurar que no hay propagación
      
      console.log('[AppointmentItem handleMouseUp] Debug resize:', {
        currentPreviewDuration: resizeDurationRef.current, // Usar ref en lugar de estado
        originalDuration: appointment.duration,
        hasOnDurationChange: !!onDurationChange,
        durationChanged: resizeDurationRef.current !== appointment.duration
      });
      
      if (resizeDurationRef.current !== appointment.duration && onDurationChange) {
        console.log('[AppointmentItem handleMouseUp] Llamando onDurationChange:', {
          appointmentId: appointment.id,
          newDuration: resizeDurationRef.current
        });
        onDurationChange(appointment.id, resizeDurationRef.current);
      } else {
        console.log('[AppointmentItem handleMouseUp] NO se llama onDurationChange - motivo:', {
          durationChanged: resizeDurationRef.current !== appointment.duration,
          hasHandler: !!onDurationChange
        });
      }
      
      setIsResizing(false);
      if (onDraggingDurationChange) {
        onDraggingDurationChange(false);
      }
      
      // Restaurar estilos
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.overflow = originalOverflow;
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      
      // Mantener nueva duración visualmente para actualización optimista
      // Solo resetear si no cambió la duración
      if (resizeDurationRef.current !== appointment.duration) {
        setPreviewDuration(resizeDurationRef.current); // Mantener nueva duración
      } else {
        setPreviewDuration(appointment.duration); // Resetear solo si no hubo cambio
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  }, [appointment.id, appointment.duration, slotDuration, onDurationChange, onDraggingDurationChange, tooltipTimeout]);

  useEffect(() => {
    if (isDragging) {
      setShowTooltip(false);
    }
  }, [isDragging]);

  return (
    <>
      <div
        ref={appointmentRef}
        data-appointment-item="true"
        className={cn(
          "absolute rounded-md flex flex-col group transition-all duration-200",
          isDragging && !isDraggingDuration && "opacity-50",
          "hover:shadow-lg hover:z-20",
          appointment.isContinuation && "border-l-2 border-dashed border-gray-300"
        )}
        style={{
          backgroundColor,
          borderLeft: `4px solid ${borderColor}`,
          borderBottom: `3px solid ${borderColor}`,
          color: textColor,
          cursor: isDraggingDuration ? 'ns-resize' : 'move',
          height: `${height}px`,
          width: '100%', // Ocupar todo el ancho disponible
          transition: isDraggingDuration ? 'height 0.1s ease-out' : undefined
        }}
        draggable={!isDraggingDuration} // Solo draggable si no está estirando
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
        <div className="relative h-full overflow-hidden rounded-md">
          {/* Flechas de ajuste de hora - al lado del botón + */}
          {showQuickActions && !isCompact && (
            <div 
              className="absolute bottom-4 right-8 z-40 flex flex-col gap-0.5 transition-all duration-200" 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button 
                className="p-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-150"
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
                <ChevronUp className="h-3 w-3 text-purple-700" />
              </button>
              <button 
                className="p-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-all duration-150"
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
                <ChevronDown className="h-3 w-3 text-purple-700" />
              </button>
            </div>
          )}
          
          {/* Menú de acciones rápidas - posicionado abajo a la derecha */}
          {showQuickActions && !isCompact && (
            <div 
              className="absolute bottom-4 right-1 z-40 transition-all duration-200" 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="p-1 rounded-full bg-white/80 hover:bg-white shadow-sm hover:shadow transition-all duration-200 data-[state=open]:bg-white data-[state=open]:shadow group"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <Plus className="h-3 w-3 text-gray-700 transition-transform duration-200 group-data-[state=open]:rotate-45" />
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
                    <DropdownMenuSubTrigger>
                      <Tag className="mr-2 h-4 w-4" />
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
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span>{tag.name}</span>
                          </div>
                          {isSelected && <Check className="h-4 w-4" />}
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
                }}>
                  <Move className="mr-2 h-4 w-4" />
                  Mover
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar marcar como no asistido
                }}>
                  <XCircle className="mr-2 h-4 w-4" />
                  No asistido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar comentarios
                }}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Comentarios
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implementar validar
                }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Validar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implementar eliminar
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar cita
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>)}

          {/* Indicador de extensión - esquina inferior izquierda */}
          {appointment.estimatedDurationMinutes && 
           appointment.duration > appointment.estimatedDurationMinutes && 
           !isCompact && (
            <button
              className="absolute bottom-1 left-1 z-30 p-0.5 rounded-full bg-amber-500/90 hover:bg-amber-600 transition-all duration-200 shadow-sm hover:shadow group"
              onClick={(e) => {
                e.stopPropagation();
                if (onRevertExtension) {
                  onRevertExtension(appointment.id);
                }
              }}
              title={`Revertir a duración original (${appointment.estimatedDurationMinutes} min)`}
            >
              <RefreshCw className="h-3 w-3 text-white group-hover:rotate-180 transition-transform duration-300" />
            </button>
          )}

          {/* Indicadores de etiquetas en la parte superior */}
          {appointment.tags && appointment.tags.length > 0 && !isCompact && (
            <div className="flex items-center gap-0.5 mb-0.5 absolute top-1 right-1 z-20">
              {appointment.tags.slice(0, maxVisibleTags).map((tagId) => {
                const tag = getTagById(tagId);
                if (!tag) return null;
                
                return (
                  <div 
                    key={tag.id}
                    className="w-2 h-2 rounded-full border border-white shadow-sm"
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
                  className="text-[8px] w-3 h-2 rounded-full flex items-center justify-center"
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
            {/* Hora de inicio y fin con icono de reloj - más compacto */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-600 flex-shrink-0" />
              <div className={cn(
                "font-medium truncate",
                isCompact ? "text-[10px]" : "text-xs"
              )}>
                {(() => {
                  const [hours, minutes] = appointment.startTime.split(':').map(Number);
                  const startMinutes = hours * 60 + minutes;
                  const endMinutes = startMinutes + displayDuration;
                  const endHours = Math.floor(endMinutes / 60);
                  const endMins = endMinutes % 60;
                  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                  return `${appointment.startTime} - ${endTime}`;
                })()}
              </div>
            </div>
            
            {/* Nombre del cliente - ligeramente más grande */}
            <div 
              className={cn(
                "group flex items-center gap-1 mt-0.5",
                isCompact ? "text-[11px]" : "text-[13px]",
                onClientNameClick && "cursor-pointer hover:text-violet-600 transition-colors"
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
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-violet-600 flex-shrink-0" />
              )}
            </div>
            
            {/* Espacio reservado para futuras etiquetas */}
            <div className="mt-1 flex flex-wrap gap-1">
              {/* Las etiquetas se añadirán aquí más adelante */}
            </div>
          </div>
        </div>

        {/* Zona de estiramiento profesional integrada en la cita */}
        <div
          className={cn(
            "absolute bottom-0 left-0 w-full h-4", // Aumentar altura para mejor área de interacción
            "cursor-ns-resize",
            "group", // Añadir group para controlar hover states
            "transition-all duration-150",
            // Durante el resize, mostrar feedback visual
            isResizing && "bg-purple-500/30"
          )}
          onMouseDown={handleResizeStart}
          onMouseEnter={(e) => e.stopPropagation()} // Evitar que se propague el hover
        >
          {/* Fondo que aparece al hover */}
          <div 
            className={cn(
              "absolute inset-0",
              "bg-purple-500/0 group-hover:bg-purple-500/20",
              "transition-colors duration-150",
              isResizing && "bg-purple-500/30"
            )}
          />
          
          {/* Indicador visual de líneas paralelas */}
          <div className={cn(
            "absolute bottom-1 left-1/2 -translate-x-1/2",
            "flex flex-col gap-0.5",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-150",
            isResizing && "opacity-100"
          )}>
            <div className={cn(
              "w-8 h-0.5 rounded-full",
              "bg-gray-500/70 group-hover:bg-purple-500",
              isResizing && "bg-purple-600"
            )} />
            <div className={cn(
              "w-8 h-0.5 rounded-full",
              "bg-gray-500/70 group-hover:bg-purple-500",
              isResizing && "bg-purple-600"
            )} />
          </div>
        </div>
      </div>

      {/* Tooltip al hacer hover - visible incluso durante el drag */}
      {(showTooltip || isDraggingDuration) && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: `${tooltipPosition.x + 10}px`, // Offset para que no tape el cursor
            top: `${(() => {
              // Calcular la posición del tooltip considerando el espacio disponible
              const tooltipHeight = 200; // Altura estimada del tooltip
              const headerHeight = 120; // Aumentar altura estimada del header para más margen
              const margin = 30; // Margen de seguridad aumentado
              
              // Si el tooltip se posicionaría muy arriba (solaparía con el header)
              // o si la posición Y es menor a un threshold seguro
              if (tooltipPosition.y - tooltipHeight < headerHeight + margin || tooltipPosition.y < 200) {
                // Posicionar el tooltip debajo del cursor en lugar de encima
                return tooltipPosition.y + 20;
              }
              
              // Posición normal: encima del cursor
              return tooltipPosition.y - tooltipHeight - 10;
            })()}px`,
            transform: 'none' // Eliminar el transform cuando calculamos la posición exacta
          }}
        >
          <AppointmentTooltip
            title={appointment.name}
            date={appointment.date}
            time={appointment.startTime}
            duration={displayDuration}
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
          />
        </div>
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