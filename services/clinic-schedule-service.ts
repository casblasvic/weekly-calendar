import type { ClinicaApiOutput } from "@/lib/types/api-outputs";
import { WeekSchedule, DaySchedule } from "@/types/schedule";
import { getDay } from 'date-fns';

// Mapeo de días entre español e inglés
const dayMapping: Record<string, string> = {
  'lunes': 'monday',
  'martes': 'tuesday',
  'miercoles': 'wednesday',
  'jueves': 'thursday',
  'viernes': 'friday',
  'sabado': 'saturday',
  'domingo': 'sunday',
};

// Mapeo inverso de días
const reverseDayMapping: Record<string, string> = {
  'monday': 'lunes',
  'tuesday': 'martes',
  'wednesday': 'miercoles',
  'thursday': 'jueves',
  'friday': 'viernes',
  'saturday': 'sabado',
  'sunday': 'domingo',
};

// Función auxiliar para obtener el día de la semana en formato compatible con WeekSchedule
const getDayOfWeekKey = (date: Date): keyof WeekSchedule | null => {
  const dayIndex = getDay(date); // Domingo: 0, Lunes: 1, ..., Sábado: 6
  const dayMap: { [key: number]: keyof WeekSchedule } = {
    1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday'
  };
  return dayMap[dayIndex] ?? null;
};

/**
 * Recupera el WeekSchedule correcto para una clínica, sea de plantilla o independiente.
 * IMPORTANTE: Esta función NO aplica excepciones ni overrides. Es solo el horario base.
 */
const getBaseWeekSchedule = (clinic: ClinicaApiOutput): WeekSchedule | null => {
    if (clinic.linkedScheduleTemplate?.blocks && clinic.linkedScheduleTemplate.blocks.length > 0) {
        // Convertir bloques de plantilla a WeekSchedule
        const schedule: WeekSchedule = { monday: {isOpen: false, ranges:[]}, tuesday: {isOpen: false, ranges:[]}, wednesday: {isOpen: false, ranges:[]}, thursday: {isOpen: false, ranges:[]}, friday: {isOpen: false, ranges:[]}, saturday: {isOpen: false, ranges:[]}, sunday: {isOpen: false, ranges:[]} };
        clinic.linkedScheduleTemplate.blocks.forEach(block => {
            const dayKey = String(block.dayOfWeek).toLowerCase() as keyof WeekSchedule;
            if (schedule[dayKey]) {
                schedule[dayKey].isOpen = block.isWorking;
                if(block.isWorking) {
                    schedule[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
                    schedule[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
                }
            }
        });
        return schedule;
    } else if (clinic.independentScheduleBlocks && clinic.independentScheduleBlocks.length > 0) {
        // Convertir bloques independientes a WeekSchedule
        const schedule: WeekSchedule = { monday: {isOpen: false, ranges:[]}, tuesday: {isOpen: false, ranges:[]}, wednesday: {isOpen: false, ranges:[]}, thursday: {isOpen: false, ranges:[]}, friday: {isOpen: false, ranges:[]}, saturday: {isOpen: false, ranges:[]}, sunday: {isOpen: false, ranges:[]} };
        clinic.independentScheduleBlocks.forEach(block => {
            const dayKey = String(block.dayOfWeek).toLowerCase() as keyof WeekSchedule;
             if (schedule[dayKey]) {
                schedule[dayKey].isOpen = block.isWorking;
                if(block.isWorking) {
                    schedule[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
                    schedule[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
                }
            }
        });
        return schedule;
    }
    // Si no hay horario definido (ni plantilla ni independiente), devolver null
    return null;
};

/**
 * Verifica si un día y horario específicos están disponibles según el horario BASE de la clínica.
 * NO tiene en cuenta excepciones de clínica (eliminadas) ni bloqueos de cabina (se aplican después).
 */
export function isTimeSlotAvailable(date: Date, time: string, clinic: ClinicaApiOutput): boolean {
  const schedule = getBaseWeekSchedule(clinic);
  if (!schedule) return false; // Si no hay horario base, nada está disponible

  const dayKey = getDayOfWeekKey(date);
  if (!dayKey || !schedule[dayKey]?.isOpen) return false; // Día no encontrado o cerrado

  // Verificar si el tiempo está dentro de alguna franja horaria del horario base
  return schedule[dayKey].ranges.some(range =>
    time >= range.start && time < range.end // Usar < en range.end si las citas no pueden empezar justo al cerrar
  );
}

/**
 * Obtiene los horarios de apertura y cierre BASE para un día específico.
 * NO tiene en cuenta excepciones (eliminadas) ni bloqueos (se aplican después).
 */
export function getBusinessHours(date: Date, clinic: ClinicaApiOutput): { open: string, close: string } | null {
  const schedule = getBaseWeekSchedule(clinic);
  if (!schedule) return null;

  const dayKey = getDayOfWeekKey(date);
  const daySchedule = dayKey ? schedule[dayKey] : null;

  if (!daySchedule?.isOpen || daySchedule.ranges.length === 0) return null;

  // Usar el primer inicio y último fin de las franjas del horario base
  // Asumiendo que los rangos ya están ordenados por getBaseWeekSchedule
  const firstRange = daySchedule.ranges[0];
  const lastRange = daySchedule.ranges[daySchedule.ranges.length - 1];

  return {
    open: firstRange.start,
    close: lastRange.end
  };
}

/**
 * Verifica si la clínica está abierta (tiene horario definido) en una fecha específica según su horario BASE.
 * NO tiene en cuenta excepciones (eliminadas) ni bloqueos (se aplican después).
 */
export function isBusinessDay(date: Date, clinic: ClinicaApiOutput): boolean {
  const schedule = getBaseWeekSchedule(clinic);
  if (!schedule) return false;

  const dayKey = getDayOfWeekKey(date);
  return dayKey ? schedule[dayKey]?.isOpen || false : false;
}

// Exportar solo las funciones necesarias y actualizadas
export { getDayOfWeekKey, getBaseWeekSchedule };
// Las funciones isTimeSlotAvailable, getBusinessHours, isBusinessDay ya están exportadas implícitamente. 