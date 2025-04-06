/**
 * Traduce el nombre de un día de la semana de inglés a español
 * @param dia Nombre del día en español
 * @returns Nombre del día traducido
 */
export function traducirDia(dia: string): string {
  const traducciones: Record<string, string> = {
    'lunes': 'Lunes',
    'martes': 'Martes',
    'miercoles': 'Miércoles',
    'jueves': 'Jueves',
    'viernes': 'Viernes',
    'sabado': 'Sábado',
    'domingo': 'Domingo',
  };
  return traducciones[dia] || dia;
}

/**
 * Formatea una fecha en formato ISO a formato local
 * @param fecha Fecha en formato ISO
 * @returns Fecha formateada en formato local
 */
export function formatearFecha(fecha: string): string {
  if (!fecha) return '';
  
  const date = new Date(fecha);
  return date.toLocaleDateString();
}

/**
 * Formatea una hora en formato HH:MM
 * @param hora Hora en formato HH:MM
 * @returns Hora formateada
 */
export function formatearHora(hora: string): string {
  if (!hora) return '';
  
  // Si la hora ya está en formato correcto, devolverla tal cual
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora)) {
    return hora;
  }
  
  // Si es un número, interpretarlo como minutos desde medianoche
  const minutos = parseInt(hora);
  if (!isNaN(minutos)) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  return hora;
} 