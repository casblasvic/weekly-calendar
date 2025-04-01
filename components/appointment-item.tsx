"use client"
import { Check, Tag } from "lucide-react"
import { AGENDA_CONFIG } from "@/config/agenda-config"
import { Appointment } from "@/types/appointments"
import { useAppointmentTags } from "@/contexts/appointment-tags-context"
import { useMemo } from "react"

export function AppointmentItem({
  appointment,
  index,
  onClick,
  slotDuration = 15
}: {
  appointment: Appointment
  index: number
  onClick?: (appointment: Appointment) => void
  slotDuration?: number
}) {
  const height = (appointment.duration / slotDuration) * AGENDA_CONFIG.ROW_HEIGHT
  const { getTagById } = useAppointmentTags() || { getTagById: () => undefined }
  
  // Obtener etiquetas de la cita si están disponibles
  const tagIds = useMemo(() => appointment.tags || [], [appointment.tags])
  
  // Solo mostraremos los primeros 3 indicadores para no sobrecargar la UI
  const maxVisibleTags = 3

  return (
    <div
      className={`absolute left-0 right-0 ${appointment.color} rounded-sm text-white text-xs p-1 cursor-pointer overflow-hidden`}
      style={{
        height: `${height}px`,
        width: '100%',
        zIndex: 10,
      }}
      onClick={() => onClick && onClick(appointment)}
    >
      {/* Indicadores de etiquetas en la parte superior */}
      {tagIds.length > 0 && (
        <div className="flex items-center gap-0.5 mb-0.5 absolute top-0.5 right-0.5">
          {tagIds.slice(0, maxVisibleTags).map((tagId) => {
            const tag = getTagById(tagId);
            if (!tag) return null;
            
            return (
              <div 
                key={tag.id}
                className="w-2 h-2 rounded-full border border-white/40"
                style={{ backgroundColor: tag.color }}
                title={tag.name}
              />
            );
          })}
          {tagIds.length > maxVisibleTags && (
            <div className="text-[8px] bg-white/30 text-white w-2 h-2 rounded-full flex items-center justify-center">
              +{tagIds.length - maxVisibleTags}
            </div>
          )}
        </div>
      )}

      <div className="truncate font-medium">{appointment.name}</div>
      <div className="truncate text-[10px] opacity-90">{appointment.service}</div>
      {appointment.completed && (
        <div className="absolute bottom-1 right-1">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  )
} 