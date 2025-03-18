"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useSwipeable } from "react-swipeable"

interface MobileWeekViewProps {
  currentDate: Date
  onChangeWeek: (direction: "next" | "prev") => void
}

export function MobileWeekView({ currentDate, onChangeWeek }: MobileWeekViewProps) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onChangeWeek("next"),
    onSwipedRight: () => onChangeWeek("prev"),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentDate)
    date.setDate(currentDate.getDate() - currentDate.getDay() + i)
    return {
      name: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][i],
      date: date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
      fullDate: date,
    }
  })

  return (
    <div {...handlers} className="mb-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={() => onChangeWeek("prev")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {weekDays[0].date} - {weekDays[6].date}
        </span>
        <Button variant="outline" size="sm" onClick={() => onChangeWeek("next")}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex overflow-x-auto">
        {weekDays.map((day) => (
          <div
            key={day.name}
            className={`flex-shrink-0 w-14 text-center p-2 mr-1 ${
              day.fullDate.toDateString() === new Date().toDateString()
                ? "bg-purple-100 text-purple-600 rounded-lg"
                : ""
            }`}
          >
            <div className="text-xs font-medium">{day.name}</div>
            <div className="text-sm font-bold">{day.date.split("/")[0]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

