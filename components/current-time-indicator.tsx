"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { format, parse, isWithinInterval, addMinutes } from "date-fns"
import { cn } from "@/lib/utils"

interface CurrentTimeIndicatorProps {
  timeSlots: string[]
  rowHeight: number
  isMobile: boolean
  className?: string
  agendaRef: React.RefObject<HTMLDivElement>
  clinicOpenTime?: string
  clinicCloseTime?: string
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  timeSlots,
  rowHeight,
  isMobile,
  className,
  agendaRef,
  clinicOpenTime,
  clinicCloseTime,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [position, setPosition] = useState<number | null>(null)
  const [nearestSlotTime, setNearestSlotTime] = useState<string | null>(null)
  const [isWithinTimeRange, setIsWithinTimeRange] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar si la hora actual está dentro del horario de la clínica
  const isWithinClinicHours = useCallback(() => {
    if (!clinicOpenTime || !clinicCloseTime) return true // Si no hay horario configurado, mostrar siempre

    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute

    const [openHour, openMinute] = clinicOpenTime.split(":").map(Number)
    const [closeHour, closeMinute] = clinicCloseTime.split(":").map(Number)

    const openTimeMinutes = openHour * 60 + openMinute
    const closeTimeMinutes = closeHour * 60 + closeMinute

    const isWithin = currentTimeMinutes >= openTimeMinutes && currentTimeMinutes <= closeTimeMinutes
    console.log(
      `Hora actual: ${currentHour}:${currentMinute}, Horario clínica: ${openHour}:${openMinute}-${closeHour}:${closeMinute}, Dentro: ${isWithin}`,
    )

    return isWithin
  }, [currentTime, clinicOpenTime, clinicCloseTime])

  // Asegurar que el indicador sea visible si hay slots de tiempo
  useEffect(() => {
    setIsVisible(timeSlots.length > 0)
  }, [timeSlots.length])

  // Actualizar el tiempo actual cada minuto
  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date())
      console.log("Tiempo actual actualizado:", new Date().toLocaleTimeString())
    }

    // Actualizar inmediatamente
    updateCurrentTime()

    // Configurar intervalo para actualizar cada minuto
    const timer = setInterval(updateCurrentTime, 60000)
    updateTimerRef.current = timer

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current)
      }
    }
  }, [])

  // Función para calcular la posición del indicador
  const updatePosition = useCallback(() => {
    if (!timeSlots.length || !agendaRef.current) {
      console.log("No hay slots de tiempo o referencia de agenda disponible")
      return
    }

    const getCurrentTimePosition = () => {
      if (!timeSlots.length) {
        console.log("No hay slots de tiempo disponibles")
        return { position: null, slotTime: null, isWithinRange: false }
      }

      const currentTimeString = format(currentTime, "HH:mm")
      console.log("Calculando posición para:", currentTimeString)

      // Obtener todos los elementos con data-time
      const slots = agendaRef.current?.querySelectorAll("[data-time]") || []

      if (slots.length === 0) {
        console.log("No se encontraron slots con atributo data-time")
        return { position: null, slotTime: null, isWithinRange: false }
      }

      // Determinar el rango de tiempo
      const firstSlotTime = timeSlots[0]
      const lastSlotTime = timeSlots[timeSlots.length - 1]

      // Añadir 15 minutos al último slot para incluir la última franja completa
      const startTime = parse(firstSlotTime, "HH:mm", new Date())
      const endTime = parse(lastSlotTime, "HH:mm", new Date())
      const extendedEndTime = addMinutes(endTime, 15)

      console.log("Rango de tiempo:", firstSlotTime, "a", lastSlotTime, "+15min")

      // Verificar si el tiempo actual está dentro del rango extendido
      const isWithinRange = isWithinInterval(currentTime, {
        start: startTime,
        end: extendedEndTime,
      })

      console.log("¿Está dentro del rango?", isWithinRange)

      // Convertir el tiempo actual a minutos desde medianoche
      const currentTimeMinutes = parseTime(currentTimeString)

      // Encontrar el slot más cercano
      let nearestSlot: Element | null = null
      let nearestSlotTime: string | null = null
      let minTimeDifference = Number.POSITIVE_INFINITY

      slots.forEach((slot) => {
        const slotTime = slot.getAttribute("data-time")
        if (slotTime) {
          const slotTimeMinutes = parseTime(slotTime)
          const timeDifference = Math.abs(slotTimeMinutes - currentTimeMinutes)

          if (timeDifference < minTimeDifference) {
            minTimeDifference = timeDifference
            nearestSlot = slot
            nearestSlotTime = slotTime
          }
        }
      })

      if (nearestSlot && nearestSlotTime) {
        // Intentar obtener la posición del atributo data-position
        let position = Number.parseInt(nearestSlot.getAttribute("data-position") || "0", 10)

        // Si la posición es 0 o parece incorrecta, calcularla manualmente
        if (position === 0 || isNaN(position)) {
          position = (nearestSlot as HTMLElement).offsetTop
          console.log("Posición calculada manualmente:", position)
        }

        // Ajustar la posición basada en la diferencia de tiempo
        if (nearestSlotTime && currentTimeString !== nearestSlotTime) {
          const nearestSlotMinutes = parseTime(nearestSlotTime)
          const minutesDifference = currentTimeMinutes - nearestSlotMinutes
          const slotDuration = 15 // Asumimos slots de 15 minutos
          const percentageOfSlot = minutesDifference / slotDuration
          const offsetPixels = percentageOfSlot * rowHeight

          position += offsetPixels
          console.log("Ajuste de posición:", offsetPixels, "px (", percentageOfSlot * 100, "%)")
        }

        return {
          position,
          slotTime: nearestSlotTime,
          isWithinRange,
        }
      }

      return { position: null, slotTime: null, isWithinRange }
    }

    // Usar requestAnimationFrame para asegurar que el DOM esté listo
    requestAnimationFrame(() => {
      const { position: newPosition, slotTime, isWithinRange } = getCurrentTimePosition()

      setPosition(newPosition)
      setNearestSlotTime(slotTime)
      setIsWithinTimeRange(isWithinRange)

      console.log("Resultado del cálculo de posición:", {
        position: newPosition,
        slotTime,
        isWithinRange,
      })

      // Si tenemos una posición válida, hacer scroll para mostrar el indicador
      if (newPosition !== null && isWithinRange && agendaRef.current && isWithinClinicHours()) {
        const scrollPosition = Math.max(0, newPosition - 200)
        console.log("Haciendo scroll a:", scrollPosition)

        // Scroll suave a la posición actual
        agendaRef.current.scrollTo({
          top: scrollPosition,
          behavior: "smooth",
        })
      }
    })
  }, [currentTime, timeSlots, agendaRef, rowHeight, isWithinClinicHours])

  // Actualizar la posición cuando cambie el tiempo o los slots
  useEffect(() => {
    if (timeSlots.length > 0) {
      // Actualizar posición inmediatamente
      updatePosition()

      // Configurar intervalo para actualizar la posición cada minuto
      const intervalId = setInterval(updatePosition, 60000)

      return () => clearInterval(intervalId)
    }
  }, [timeSlots, updatePosition])

  // Verificar si debemos mostrar el indicador
  const shouldShowIndicator = position !== null && isWithinTimeRange && isWithinClinicHours()

  // Si no debemos mostrar el indicador, retornar null
  if (!shouldShowIndicator) {
    console.log("No se muestra el indicador: posición no válida o fuera del horario de la clínica")
    return null
  }

  return (
    <div
      ref={indicatorRef}
      className={cn(
        "absolute left-0 right-0 border-t-2 border-red-500",
        "pointer-events-none",
        isMobile ? "w-full" : "",
        className,
      )}
      style={{
        top: `${position}px`,
        zIndex: 10,
      }}
    >
      <span
        className={cn(
          "absolute -top-3 bg-red-500 text-white text-xs px-1 py-0.5 rounded",
          isMobile ? "left-1" : "left-0",
        )}
      >
        {format(currentTime, "HH:mm")}
      </span>
    </div>
  )
}

// Función auxiliar para convertir tiempo a minutos
const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

