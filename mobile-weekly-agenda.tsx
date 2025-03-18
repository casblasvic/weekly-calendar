import type React from "react"
import { format, parse } from "date-fns"

interface MobileWeeklyAgendaProps {
  timeSlots: string[]
}

const MobileWeeklyAgenda: React.FC<MobileWeeklyAgendaProps> = ({ timeSlots }) => {
  return (
    <div className="flex flex-row">
      <div className="sticky left-0 z-20 w-[3rem] bg-background">
        {timeSlots.map((time) => (
          <div
            key={time}
            className="flex h-20 items-center justify-center border-r border-t border-border text-xs"
            data-time={time} // Añadido el atributo data-time
          >
            {format(parse(time, "HH:mm", new Date()), "ha")}
          </div>
        ))}
      </div>
      {/* Rest of the weekly agenda content will go here */}
    </div>
  )
}

export default MobileWeeklyAgenda

