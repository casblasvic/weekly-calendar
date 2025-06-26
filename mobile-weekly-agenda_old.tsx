import type React from "react"
import { format, parse, startOfWeek, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileWeeklyAgendaProps {
  timeSlots: string[]
  currentDate: Date
  onPrevWeek: () => void
  onNextWeek: () => void
  onCellClick: (date: string, time: string, roomId: string) => void
  rooms: { id: string; name: string; color: string }[]
  blocks: any[]
  findBlockForCell: (date: string, time: string, roomId: string) => any
}

const MobileWeeklyAgenda: React.FC<MobileWeeklyAgendaProps> = ({ 
  timeSlots, 
  currentDate,
  onPrevWeek,
  onNextWeek,
  onCellClick,
  rooms,
  blocks,
  findBlockForCell
}) => {
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
  const activeRoom = rooms[0] // Por defecto usamos la primera sala

  return (
    <div className="flex flex-col w-full">
      {/* Navegación de semanas */}
      <div className="flex justify-between items-center mb-4 px-2">
        <Button variant="outline" size="icon" onClick={onPrevWeek} aria-label="Semana anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">
          {format(weekDays[0], "d MMM", { locale: es })} - {format(weekDays[6], "d MMM", { locale: es })}
        </span>
        <Button variant="outline" size="icon" onClick={onNextWeek} aria-label="Semana siguiente">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Selector de sala (simplificado para mostrar solo la primera) */}
      <div className="flex justify-center mb-4">
        <div 
          className={`px-4 py-2 rounded-md bg-${activeRoom.color}-500 text-white font-medium`}
        >
          {activeRoom.name}
        </div>
      </div>
      
      {/* Cabecera de días */}
      <div className="mobile-agenda-header flex w-full border-b">
        {weekDays.map((day) => (
          <div 
            key={day.toString()} 
            className="flex-1 text-center py-2 font-medium"
          >
            <div>{format(day, "EEE", { locale: es })}</div>
            <div>{format(day, "d")}</div>
          </div>
        ))}
      </div>
      
      {/* Contenedor de la agenda */}
      <div className="mobile-agenda-grid overflow-y-auto flex-1 ios-scroll-container">
        <div className="sticky left-0 z-20 bg-background">
          {timeSlots.map((time, timeIndex) => (
            <div className="flex w-full" key={time}>
              <div 
                className="w-14 flex items-center justify-center border-r border-t border-border text-xs py-4"
                data-time={time}
              >
                {format(parse(time, "HH:mm", new Date()), "ha")}
              </div>
              <div className="flex flex-1">
                {weekDays.map((day, dayIndex) => {
                  const formattedDate = format(day, "yyyy-MM-dd")
                  const block = findBlockForCell(formattedDate, time, activeRoom.id)
                  
                  return (
                    <div 
                      key={`${dayIndex}-${time}`} 
                      className={`flex-1 h-14 border-t border-r border-border ${
                        block 
                          ? `bg-${block.color}-100 cursor-pointer` 
                          : 'cursor-pointer hover:bg-gray-100'
                      }`}
                      onClick={() => onCellClick(formattedDate, time, activeRoom.id)}
                    >
                      {block && (
                        <div className="h-full flex items-center justify-center text-xs p-1 text-center overflow-hidden">
                          <span className="truncate">{block.description}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MobileWeeklyAgenda

