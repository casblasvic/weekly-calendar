"use client"
import { Check, Clock, Phone, User } from "lucide-react"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { Appointment } from "@/types/appointments"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export function AppointmentItem({
  appointment,
  index,
  onClick,
  slotDuration = 15,
  onDragStart,
  onDragEnd,
  isDragging = false
}: {
  appointment: Appointment
  index: number
  onClick?: (appointment: Appointment) => void
  slotDuration?: number
  onDragStart?: (appointment: Appointment, e?: React.DragEvent) => void
  onDragEnd?: () => void
  isDragging?: boolean
}) {
  const height = (appointment.duration / slotDuration) * AGENDA_CONFIG.ROW_HEIGHT
  const { getTagById } = useAppointmentTags() || { getTagById: () => undefined }
  
  // Obtener etiquetas de la cita si están disponibles
  const tagIds = useMemo(() => appointment.tags || [], [appointment.tags])
  
  // Solo mostraremos los primeros 3 indicadores para no sobrecargar la UI
  const maxVisibleTags = 3
  
  // Determinar si el contenido es compacto (menos de 30 minutos)
  const isCompact = appointment.duration < 30
  
  // Determinar el color de fondo y borde basado en el color de la cita
  const backgroundColor = appointment.color || '#9CA3AF'
  const borderColor = adjustColorBrightness(backgroundColor, -20)
  const textColor = getContrastColor(backgroundColor)

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(appointment))
    if (onDragStart) onDragStart(appointment, e)
  }

  const handleDragEnd = () => {
    if (onDragEnd) onDragEnd()
  }

  return (
    <div
      className={cn(
        "absolute left-0 right-0 rounded-md text-xs cursor-pointer overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:z-20 hover:scale-[1.02]",
        appointment.status === 'CANCELLED' && "opacity-60 line-through",
        appointment.status === 'COMPLETED' && "opacity-80",
        isDragging && "opacity-40" // Hacer translúcida la cita durante el arrastre
      )}
      style={{
        height: `${height - 2}px`, // -2px para dar espacio entre citas
        width: 'calc(100% - 4px)', // Pequeño margen lateral
        left: '2px',
        backgroundColor,
        borderLeft: `3px solid ${borderColor}`,
        color: textColor,
        zIndex: 10,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(appointment);
      }}
    >
      {/* Indicadores de etiquetas en la parte superior */}
      {tagIds.length > 0 && !isCompact && (
        <div className="flex items-center gap-0.5 mb-0.5 absolute top-1 right-1">
          {tagIds.slice(0, maxVisibleTags).map((tagId) => {
            const tag = getTagById(tagId);
            if (!tag) return null;
            
            return (
              <div 
                key={tag.id}
                className="w-2 h-2 rounded-full border"
                style={{ 
                  backgroundColor: tag.color,
                  borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'
                }}
                title={tag.name}
              />
            );
          })}
          {tagIds.length > maxVisibleTags && (
            <div 
              className="text-[8px] w-3 h-2 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                color: textColor
              }}
            >
              +{tagIds.length - maxVisibleTags}
            </div>
          )}
        </div>
      )}

      <div className={cn("px-2", isCompact ? "py-1" : "py-2")}>
        {/* Nombre del cliente */}
        <div className={cn(
          "font-semibold truncate",
          isCompact ? "text-[11px]" : "text-sm"
        )}>
          {appointment.name}
        </div>
        
        {/* Servicio - solo si hay espacio */}
        {!isCompact && (
          <div className="text-[11px] opacity-90 truncate mt-0.5">
            {appointment.service}
          </div>
        )}
        
        {/* Información adicional - solo si hay más espacio */}
        {appointment.duration >= 45 && (
          <div className="mt-1 space-y-0.5">
            {/* Hora */}
            <div className="flex items-center gap-1 text-[10px] opacity-80">
              <Clock className="h-3 w-3" />
              <span>{appointment.startTime} ({appointment.duration} min)</span>
            </div>
            
            {/* Teléfono si está disponible */}
            {appointment.phone && (
              <div className="flex items-center gap-1 text-[10px] opacity-80">
                <Phone className="h-3 w-3" />
                <span className="truncate">{appointment.phone}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Indicador de completado */}
        {appointment.status === 'COMPLETED' && (
          <div className="absolute bottom-1 right-1">
            <Check className="h-3 w-3" strokeWidth={3} />
          </div>
        )}
      </div>
    </div>
  )
}

// Función auxiliar para ajustar el brillo del color
function adjustColorBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
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