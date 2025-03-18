"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from "lucide-react"

interface Cabin {
  id: string | number
  code: string
  color: string
  isActive: boolean
  order: number
  name?: string
}

interface NewMobileAgendaProps {
  cabins: Cabin[]
  timeSlots: string[]
}

export function NewMobileAgenda({ cabins, timeSlots }: NewMobileAgendaProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [activeCabins, setActiveCabins] = useState<Cabin[]>([])
  const [isClient, setIsClient] = useState(false)

  // Efecto para marcar cuando estamos en el cliente
  useEffect(() => {
    setIsClient(true)

    if (cabins && cabins.length > 0) {
      // Filtrar y ordenar cabinas activas
      const sortedActiveCabins = cabins.filter((cabin) => cabin.isActive).sort((a, b) => a.order - b.order)

      setActiveCabins(sortedActiveCabins)
    } else {
      setActiveCabins([])
    }
  }, [cabins])

  const changeDate = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate)
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
      return newDate
    })
  }

  // Renderizado simplificado
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header con logo y fecha actual */}
      <header className="px-4 py-2 border-b">
        <div className="flex items-center justify-between">
          <div className="font-bold">LOGO</div>
          <div className="text-sm text-gray-500">
            {isClient ? format(currentDate, "EEEE, d 'de' MMMM yyyy, HH:mm", { locale: es }) : "Cargando..."}
          </div>
        </div>
      </header>

      {/* Navegador de fechas */}
      <div className="flex items-center gap-2 p-2 bg-purple-600 text-white">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("prev")}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="flex-1 text-center text-sm">
          {isClient ? format(currentDate, "EEEE d 'de' MMMM", { locale: es }) : "Cargando..."}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white hover:bg-purple-700"
          onClick={() => changeDate("next")}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabla simplificada con colores fijos */}
      <div className="overflow-x-auto w-full">
        {isClient ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-sm font-medium text-gray-500 border-r text-left w-20">Hora</th>
                {activeCabins.map((cabin) => (
                  <th
                    key={`cabin-header-${cabin.id}`}
                    // Usar una clase de Tailwind estándar en lugar de una dinámica
                    className="bg-purple-600 text-white text-xs p-2 text-center font-medium border-r last:border-r-0"
                  >
                    {cabin.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time} className="border-b">
                  <td className="p-2 text-sm text-purple-600 font-medium border-r">{time}</td>
                  {activeCabins.map((cabin) => (
                    <td key={`${time}-${cabin.id}`} className="p-2 border-r last:border-r-0"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-center">Cargando agenda...</div>
        )}
      </div>

      {/* Mensaje de depuración */}
      <div className="p-4 bg-yellow-100 text-yellow-800 text-sm">
        Este es el nuevo componente de agenda móvil. Si ves este mensaje, el componente se ha cargado correctamente.
      </div>
    </div>
  )
}

