import { Clinica, ExcepcionHoraria, HorarioDia } from "@/services/data/models/interfaces";
import { WeekSchedule, DaySchedule } from "@/types/schedule";

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

/**
 * Verifica si una fecha está dentro del rango de una excepción
 */
export function isWithinExceptionRange(date: Date, exception: ExcepcionHoraria): boolean {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const startDate = new Date(exception.fechaInicio);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(exception.fechaFin);
  endDate.setHours(0, 0, 0, 0);
  
  return targetDate >= startDate && targetDate <= endDate;
}

/**
 * Obtiene el día de la semana en español para una fecha
 */
export function getDayOfWeek(date: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return days[date.getDay()];
}

/**
 * Encuentra excepciones de horario activas para una fecha específica
 */
export function findActiveExceptions(date: Date, clinic: Clinica): ExcepcionHoraria | null {
  if (!clinic.config?.excepciones?.length) return null;
  
  const activeExceptions = clinic.config.excepciones.filter(exception => 
    isWithinExceptionRange(date, exception)
  );
  
  // Retornar la primera excepción activa (se asume que no hay solapamientos)
  return activeExceptions.length > 0 ? activeExceptions[0] : null;
}

/**
 * Actualiza el horario de la agenda según las excepciones activas
 */
export function applyScheduleExceptions(schedule: WeekSchedule, clinic: Clinica, date: Date): WeekSchedule {
  if (!clinic.config?.excepciones?.length) return schedule;
  
  // Buscar si hay una excepción activa para la fecha dada
  const activeException = findActiveExceptions(date, clinic);
  if (!activeException) return schedule;
  
  // Crear una copia del horario para modificar
  const updatedSchedule = { ...schedule };
  
  // Aplicar la configuración de la excepción a cada día
  activeException.dias.forEach(diaExcepcion => {
    const englishDay = dayMapping[diaExcepcion.dia] as keyof WeekSchedule;
    
    if (englishDay && updatedSchedule[englishDay]) {
      // Si el día está inactivo en la excepción, cerrar el día
      if (!diaExcepcion.activo) {
        updatedSchedule[englishDay] = {
          isOpen: false,
          ranges: []
        };
      } 
      // Si tiene franjas horarias, aplicarlas
      else if (diaExcepcion.franjas.length > 0) {
        updatedSchedule[englishDay] = {
          isOpen: true,
          ranges: diaExcepcion.franjas.map(franja => ({
            start: franja.inicio,
            end: franja.fin
          }))
        };
      }
    }
  });
  
  return updatedSchedule;
}

/**
 * Verifica si un día y horario específicos están disponibles según el horario configurado
 * Tiene en cuenta las excepciones
 */
export function isTimeSlotAvailable(date: Date, time: string, clinic: Clinica): boolean {
  // Buscar si hay una excepción activa
  const activeException = findActiveExceptions(date, clinic);
  
  // Obtener el día de la semana para la fecha
  const dayOfWeek = getDayOfWeek(date);
  
  // Si hay una excepción activa, verificar según sus reglas
  if (activeException) {
    const diaExcepcion = activeException.dias.find(d => d.dia === dayOfWeek);
    
    // Si el día no está configurado o no está activo en la excepción, no disponible
    if (!diaExcepcion || !diaExcepcion.activo) return false;
    
    // Si no hay franjas en la excepción, usar horario general
    if (diaExcepcion.franjas.length === 0) {
      // Verificar con el horario general
      const schedule = clinic.config?.schedule;
      const englishDay = dayMapping[dayOfWeek] as keyof WeekSchedule;
      
      if (!schedule || !schedule[englishDay]?.isOpen) return false;
      
      return schedule[englishDay].ranges.some(range => 
        time >= range.start && time <= range.end
      );
    }
    
    // Verificar si el tiempo está dentro de alguna franja de la excepción
    return diaExcepcion.franjas.some(franja => 
      time >= franja.inicio && time <= franja.fin
    );
  }
  
  // Si no hay excepción, verificar con el horario general
  const schedule = clinic.config?.schedule;
  if (!schedule) return false;
  
  const englishDay = dayMapping[dayOfWeek] as keyof WeekSchedule;
  if (!schedule[englishDay]?.isOpen) return false;
  
  return schedule[englishDay].ranges.some(range => 
    time >= range.start && time <= range.end
  );
}

/**
 * Obtiene los horarios de apertura y cierre para un día específico
 * Tiene en cuenta las excepciones
 */
export function getBusinessHours(date: Date, clinic: Clinica): { open: string, close: string } | null {
  // Verificar si la clínica está cerrada ese día
  if (!isBusinessDay(date, clinic)) return null;
  
  // Obtener el día de la semana para la fecha
  const dayOfWeek = getDayOfWeek(date);
  
  // Buscar si hay una excepción activa
  const activeException = findActiveExceptions(date, clinic);
  
  // Si hay una excepción activa, obtener horarios según sus reglas
  if (activeException) {
    const diaExcepcion = activeException.dias.find(d => d.dia === dayOfWeek);
    
    // Si el día no está configurado o no está activo en la excepción, clínica cerrada
    if (!diaExcepcion || !diaExcepcion.activo) return null;
    
    // Si hay franjas en la excepción, usar la primera y última
    if (diaExcepcion.franjas.length > 0) {
      const sortedFranjas = [...diaExcepcion.franjas].sort((a, b) => 
        a.inicio.localeCompare(b.inicio)
      );
      
      return {
        open: sortedFranjas[0].inicio,
        close: sortedFranjas[sortedFranjas.length - 1].fin
      };
    }
  }
  
  // Si no hay excepción o no tiene franjas, usar horario general
  const schedule = clinic.config?.schedule;
  if (!schedule) return null;
  
  const englishDay = dayMapping[dayOfWeek] as keyof WeekSchedule;
  const daySchedule = schedule[englishDay];
  
  if (!daySchedule?.isOpen || daySchedule.ranges.length === 0) return null;
  
  // Usar el primer inicio y último fin de las franjas
  const sortedRanges = [...daySchedule.ranges].sort((a, b) => 
    a.start.localeCompare(b.start)
  );
  
  return {
    open: sortedRanges[0].start,
    close: sortedRanges[sortedRanges.length - 1].end
  };
}

/**
 * Verifica si la clínica está abierta en una fecha específica
 */
export function isBusinessDay(date: Date, clinic: Clinica): boolean {
  // Obtener el día de la semana para la fecha
  const dayOfWeek = getDayOfWeek(date);
  
  // Buscar si hay una excepción activa
  const activeException = findActiveExceptions(date, clinic);
  
  // Si hay una excepción activa, verificar según sus reglas
  if (activeException) {
    const diaExcepcion = activeException.dias.find(d => d.dia === dayOfWeek);
    // Si el día no está configurado o no está activo en la excepción, clínica cerrada
    if (!diaExcepcion || !diaExcepcion.activo) return false;
    return true;
  }
  
  // Si no hay excepción, verificar con el horario general
  const schedule = clinic.config?.schedule;
  if (!schedule) return false;
  
  const englishDay = dayMapping[dayOfWeek] as keyof WeekSchedule;
  return schedule[englishDay]?.isOpen || false;
}

// Función para crear una excepción de ejemplo que comience hoy y dure 7 días
export function createExampleException(clinic: Clinica): ExcepcionHoraria {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 7); // Una semana de duración
  
  // Obtener horarios de la clínica
  const horarioApertura = clinic.config?.openTime || "09:00";
  const horarioCierre = clinic.config?.closeTime || "18:00";
  
  // Crear horarios modificados para la excepción (2 horas menos cada día)
  const [horaApertura, minApertura] = horarioApertura.split(":").map(Number);
  const [horaCierre, minCierre] = horarioCierre.split(":").map(Number);
  
  // Incrementar la hora de apertura en 1 hora
  const nuevaHoraApertura = (horaApertura + 1).toString().padStart(2, "0") + ":" + minApertura.toString().padStart(2, "0");
  // Decrementar la hora de cierre en 1 hora
  const nuevaHoraCierre = (horaCierre - 1).toString().padStart(2, "0") + ":" + minCierre.toString().padStart(2, "0");
  
  return {
    id: "example-exception-" + Date.now().toString(),
    clinicaId: String(clinic.id),
    nombre: "Excepción de Ejemplo",
    fechaInicio: today.toISOString().split("T")[0],
    fechaFin: endDate.toISOString().split("T")[0],
    dias: [
      { dia: "lunes", activo: true, franjas: [{ id: "1", inicio: nuevaHoraApertura, fin: nuevaHoraCierre }] },
      { dia: "martes", activo: true, franjas: [{ id: "2", inicio: nuevaHoraApertura, fin: nuevaHoraCierre }] },
      { dia: "miercoles", activo: true, franjas: [{ id: "3", inicio: nuevaHoraApertura, fin: nuevaHoraCierre }] },
      { dia: "jueves", activo: true, franjas: [{ id: "4", inicio: nuevaHoraApertura, fin: nuevaHoraCierre }] },
      { dia: "viernes", activo: true, franjas: [{ id: "5", inicio: nuevaHoraApertura, fin: nuevaHoraCierre }] },
      { dia: "sabado", activo: false, franjas: [] },
      { dia: "domingo", activo: false, franjas: [] }
    ]
  };
}

// Aplicar la excepción de ejemplo a una clínica
export function applyExampleException(clinic: Clinica): Clinica {
  if (!clinic) return clinic;
  
  const exampleException = createExampleException(clinic);
  
  // Crear una copia de la clínica con la excepción añadida
  const updatedClinic = { 
    ...clinic,
    config: {
      ...clinic.config,
      excepciones: [
        ...(clinic.config?.excepciones || []),
        exampleException
      ]
    }
  };
  
  return updatedClinic;
} 