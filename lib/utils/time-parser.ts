/**
 * Utilidades para parsear y manejar formatos de tiempo
 */

/**
 * Extrae el tiempo en formato HH:mm de diferentes formatos de entrada
 * @param timeStr - String de tiempo en varios formatos posibles
 * @returns String en formato HH:mm o el string original si ya está en ese formato
 */
export function extractTimeFromString(timeStr: string): string {
  if (!timeStr) return '';
  
  // Si ya es formato HH:mm (exactamente 5 caracteres), devolver tal cual
  if (timeStr.length === 5 && /^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  
  // Si es un formato ISO con fecha y hora (contiene 'T')
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    if (timePart) {
      return timePart.substring(0, 5);
    }
  }
  
  // Si es formato "YYYY-MM-DD HH:mm:ss" o similar (contiene espacio)
  if (timeStr.includes(' ')) {
    const parts = timeStr.split(' ');
    if (parts.length >= 2) {
      const timePart = parts[1];
      if (timePart) {
        return timePart.substring(0, 5);
      }
    }
  }
  
  // Si tiene más de 5 caracteres, intentar extraer HH:mm con regex
  if (timeStr.length > 5) {
    const match = timeStr.match(/\d{2}:\d{2}/);
    if (match) {
      return match[0];
    }
  }
  
  // Si no se pudo parsear, devolver el string original
  return timeStr;
}

/**
 * Calcula la duración en minutos entre dos tiempos
 * @param startTime - Tiempo de inicio en formato HH:mm
 * @param endTime - Tiempo de fin en formato HH:mm
 * @returns Duración en minutos
 */
export function calculateDurationInMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  
  // Usar una fecha base arbitraria para el cálculo
  const baseDate = '2000-01-01';
  const start = new Date(`${baseDate}T${startTime}`);
  const end = new Date(`${baseDate}T${endTime}`);
  
  // Si la hora de fin es menor que la de inicio, asumimos que cruza medianoche
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  return (end.getTime() - start.getTime()) / (1000 * 60);
}

/**
 * Calcula el tiempo de fin basado en tiempo de inicio y duración
 * @param startTime - Tiempo de inicio en formato HH:mm
 * @param durationMinutes - Duración en minutos
 * @returns Tiempo de fin en formato HH:mm
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || durationMinutes <= 0) return '';
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  
  const endHours = Math.floor(totalMinutes / 60) % 24; // Módulo 24 para manejar días
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
