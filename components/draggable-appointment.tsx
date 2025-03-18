import type React from "react"
import { Draggable } from "react-beautiful-dnd"
import { Check } from "lucide-react"

interface DraggableAppointmentProps {
  appointment: {
    id: string
    name: string
    service: string
    completed?: boolean
    color: string
  }
  index: number
  style?: React.CSSProperties
}

export const DraggableAppointment: React.FC<DraggableAppointmentProps> = ({ appointment, index, style }) => {
  return (
    <Draggable draggableId={appointment.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`absolute inset-0 ${appointment.color} text-white p-1 text-xs rounded-sm`}
          style={{
            ...style,
            ...provided.draggableProps.style,
          }}
        >
          <div className="font-medium truncate">{appointment.service}</div>
          <div className="truncate">{appointment.name}</div>
          {appointment.completed && (
            <div className="absolute top-1 right-1">
              <Check className="w-3 h-3" />
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

