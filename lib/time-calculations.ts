import { format, parse, addMinutes, isWithinInterval, set } from "date-fns"
import { es } from "date-fns/locale"

export interface TimePosition {
  position: number
  slotTime: string
  isWithinRange: boolean
}

export function calculateTimePosition(
  currentTime: string,
  startTime: string,
  endTime: string,
  extraMinutes = 0,
): TimePosition {
  try {
    // Parsear las horas a objetos Date para poder compararlas
    const now = parse(currentTime, "HH:mm", new Date())
    const start = parse(startTime, "HH:mm", new Date())
    const end = addMinutes(parse(endTime, "HH:mm", new Date()), extraMinutes)

    // Verificar si la hora actual está dentro del rango
    const isWithinRange = isWithinInterval(now, { start, end })

    // Si está fuera del rango, devolver la posición del inicio
    if (!isWithinRange) {
      // Calcular manualmente la posición
      const startMinutes = start.getHours() * 60 + start.getMinutes()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const diffMinutes = nowMinutes - startMinutes

      // Cada 15 minutos = 40px (ajustar según tu diseño)
      const position = Math.round((diffMinutes / 15) * 40) + 110 // 110px es el offset inicial

      return {
        position: position,
        slotTime: format(start, "HH:mm"),
        isWithinRange: false,
      }
    }

    // Calcular la posición basada en la diferencia de minutos
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const diffMinutes = nowMinutes - startMinutes

    // Cada 15 minutos = 40px (ajustar según tu diseño)
    const position = Math.round((diffMinutes / 15) * 40) + 110 // 110px es el offset inicial

    return {
      position,
      slotTime: format(now, "HH:mm"),
      isWithinRange: true,
    }
  } catch (error) {
    // En caso de error, devolver una posición predeterminada
    return {
      position: 110, // Posición predeterminada
      slotTime: startTime,
      isWithinRange: false,
    }
  }
}

export function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`
}

export function getCurrentTimeFormatted(): string {
  const now = new Date()
  return format(now, "H:mm:ss")
}

export function formatDateForDisplay(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es })
}

export function formatShortDate(date: Date): string {
  return format(date, "dd/MM/yyyy")
}

export function formatTimeWithoutSeconds(time: string): string {
  // Si el tiempo ya está en formato HH:mm, devolverlo tal cual
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time
  }

  // Si el tiempo está en formato HH:mm:ss, quitar los segundos
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(time)) {
    return time.substring(0, 5)
  }

  // Si no coincide con ninguno de los formatos anteriores, devolver el tiempo original
  return time
}

export function isTimeInRange(time: string, startTime: string, endTime: string, extraMinutes = 0): boolean {
  try {
    const timeDate = parse(time, "HH:mm", new Date())
    const startDate = parse(startTime, "HH:mm", new Date())
    const endDate = addMinutes(parse(endTime, "HH:mm", new Date()), extraMinutes)

    return isWithinInterval(timeDate, { start: startDate, end: endDate })
  } catch (error) {
    return false
  }
}

export function getTimeSlots(startTime: string, endTime: string, intervalMinutes = 15): string[] {
  const slots: string[] = []
  let currentTime = parse(startTime, "HH:mm", new Date())
  const end = parse(endTime, "HH:mm", new Date())

  while (currentTime <= end) {
    slots.push(format(currentTime, "HH:mm"))
    currentTime = addMinutes(currentTime, intervalMinutes)
  }

  return slots
}

export function setTimeToDate(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number)
  return set(date, { hours, minutes, seconds: 0, milliseconds: 0 })
}

