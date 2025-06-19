/**
 * Utilidades para manejo de zonas horarias
 */

/**
 * Convierte un timestamp UTC a la hora local de la clínica
 * @param utcDateStr - String de fecha/hora en UTC (ej: "2025-06-17T11:33:00.000Z")
 * @param timezone - Zona horaria de la clínica (ej: "Europe/Madrid")
 * @returns String con hora local (ej: "12:33")
 */
export function utcToClinicTime(utcDateStr: string | undefined, timezone: string | undefined): string {
  if (!utcDateStr) return '';
  
  try {
    const date = new Date(utcDateStr);
    
    // Si no hay timezone, usar el offset local del navegador
    if (!timezone) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Usar Intl.DateTimeFormat para convertir a la zona horaria especificada
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    
    return `${hour}:${minute}`;
  } catch (error) {
    console.error('Error converting timezone:', error);
    return '';
  }
}

/**
 * Convierte un timestamp UTC a fecha y hora local de la clínica
 * @param utcDateStr - String de fecha/hora en UTC
 * @param timezone - Zona horaria de la clínica
 * @returns Objeto con fecha y hora separados
 */
export function utcToClinicDateTime(utcDateStr: string | undefined, timezone: string | undefined): { date: Date, time: string } {
  if (!utcDateStr) return { date: new Date(), time: '' };
  
  try {
    const date = new Date(utcDateStr);
    const timeStr = utcToClinicTime(utcDateStr, timezone);
    
    // Para la fecha, necesitamos obtenerla en la zona horaria correcta
    if (timezone) {
      const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA da formato YYYY-MM-DD
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const localDateStr = formatter.format(date);
      const localDate = new Date(localDateStr + 'T00:00:00');
      return { date: localDate, time: timeStr };
    }
    
    return { date: date, time: timeStr };
  } catch (error) {
    console.error('Error converting timezone:', error);
    return { date: new Date(), time: '' };
  }
}
