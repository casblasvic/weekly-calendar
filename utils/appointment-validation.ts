import { format, isSameDay } from 'date-fns';
import { isTimeSlotAvailable, getBusinessHours } from '@/services/clinic-schedule-service';

export interface AppointmentConflict {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: AppointmentConflict[];
  suggestedTime?: string;
  suggestedDuration?: number;
  reason?: string;
  canProceed: boolean;
  originalTime: string;
  originalDuration: number;
}

export interface ValidateSlotParams {
  targetDate: Date;
  targetTime: string;
  duration: number;
  roomId: string;
  appointments: any[]; // Lista de todas las citas
  excludeAppointmentId?: string; // ID de cita a excluir (para ediciones)
  activeClinic?: any; // Datos de la clínica activa
  granularity?: number; // Granularidad en minutos (default: 15)
  allowAdjustments?: boolean; // Si permitir sugerir ajustes automáticos
}

/**
 * 🎯 FUNCIÓN CENTRALIZADA DE VALIDACIÓN DE HUECOS
 * 
 * Valida si una cita puede colocarse en un slot específico y sugiere alternativas.
 * Usado por: Drag & Drop, Mover, Estirar, Botones Granularidad, Modal Edición, Revertir
 */
export function validateAppointmentSlot({
  targetDate,
  targetTime,
  duration,
  roomId,
  appointments,
  excludeAppointmentId,
  activeClinic,
  granularity = 15,
  allowAdjustments = true
}: ValidateSlotParams): ValidationResult {
  
  const [targetHours, targetMinutes] = targetTime.split(':').map(Number);
  const targetStartMinutes = targetHours * 60 + targetMinutes;
  const targetEndMinutes = targetStartMinutes + duration;

  // ✅ FILTRAR CITAS RELEVANTES: mismo día, misma cabina, excluir cita actual
  const relevantAppointments = appointments.filter(apt => {
    if (apt.id === excludeAppointmentId) return false;
    if (String(apt.roomId) !== String(roomId)) return false;
    
    // Verificar si es el mismo día
    const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
    return isSameDay(aptDate, targetDate);
  }).sort((a, b) => {
    // Ordenar por hora de inicio
    const timeA = a.startTime.split(':').map(Number);
    const timeB = b.startTime.split(':').map(Number);
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });

  // ✅ VALIDAR HORARIO DE NEGOCIO
  if (activeClinic) {
    if (!isTimeSlotAvailable(targetDate, targetTime, activeClinic)) {
      return {
        isValid: false,
        conflicts: [],
        reason: 'Fuera del horario de atención',
        canProceed: false,
        originalTime: targetTime,
        originalDuration: duration
      };
    }

    // Verificar que el final también esté dentro del horario
    const endHours = Math.floor(targetEndMinutes / 60);
    const endMins = targetEndMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    
    const businessHours = getBusinessHours(targetDate, activeClinic);
    if (businessHours && endTime > businessHours.close) {
      return {
        isValid: false,
        conflicts: [],
        reason: 'La cita terminaría fuera del horario de atención',
        canProceed: false,
        originalTime: targetTime,
        originalDuration: duration
      };
    }
  }

  // ✅ VALIDAR CONFLICTOS: Superposición de rangos completos
  const conflicts: AppointmentConflict[] = [];

  relevantAppointments.forEach(apt => {
    const [aptHours, aptMinutes] = apt.startTime.split(':').map(Number);
    const aptStartMinutes = aptHours * 60 + aptMinutes;
    const aptEndMinutes = aptStartMinutes + apt.duration;

    // ✅ LÓGICA CORRECTA: Verificar superposición de rangos
    // Dos rangos se superponen si: startA < endB && endA > startB
    const hasOverlap = targetStartMinutes < aptEndMinutes && targetEndMinutes > aptStartMinutes;

    if (hasOverlap) {
      // ✅ LOG SOLO PARA CONFLICTOS REALES
      // console.log('[AppointmentValidation] ❌ CONFLICTO DETECTADO:', {
      //   citaMovida: `${targetTime}-${Math.floor(targetEndMinutes / 60).toString().padStart(2, '0')}:${(targetEndMinutes % 60).toString().padStart(2, '0')} (${duration}min)`,
      //   citaExistente: `${apt.startTime}-${Math.floor(aptEndMinutes / 60).toString().padStart(2, '0')}:${(aptEndMinutes % 60).toString().padStart(2, '0')} (${apt.duration}min)`,
      //   superposicion: `${Math.max(targetStartMinutes, aptStartMinutes)}min - ${Math.min(targetEndMinutes, aptEndMinutes)}min`
      // });

      conflicts.push({
        id: apt.id,
        name: apt.name || 'Cita sin nombre',
        startTime: apt.startTime,
        endTime: `${Math.floor(aptEndMinutes / 60).toString().padStart(2, '0')}:${(aptEndMinutes % 60).toString().padStart(2, '0')}`,
        startMinutes: aptStartMinutes,
        endMinutes: aptEndMinutes
      });
    }
  });

  // ✅ SIN CONFLICTOS = VÁLIDO
  if (conflicts.length === 0) {
    // console.log('[AppointmentValidation] ✅ Slot válido sin conflictos');
    return {
      isValid: true,
      conflicts: [],
      canProceed: true,
      originalTime: targetTime,
      originalDuration: duration
    };
  }

  // ✅ CON CONFLICTOS: SUGERIR ALTERNATIVAS SI allowAdjustments = true
  // console.log('[AppointmentValidation] ❌ Conflictos detectados:', conflicts.length);
  
  if (!allowAdjustments) {
    return {
      isValid: false,
      conflicts,
      reason: `Conflicto con ${conflicts.length} cita(s)`,
      canProceed: false,
      originalTime: targetTime,
      originalDuration: duration
    };
  }

  // ✅ SUGERIR NUEVO TIEMPO: Después del último conflicto
  const lastConflict = conflicts.reduce((latest, conflict) => 
    conflict.endMinutes > latest.endMinutes ? conflict : latest
  );
  
  let suggestedStartMinutes = lastConflict.endMinutes;
  
  // Ajustar a granularidad
  const remainder = suggestedStartMinutes % granularity;
  if (remainder > 0) {
    suggestedStartMinutes += granularity - remainder;
  }
  
  const suggestedHours = Math.floor(suggestedStartMinutes / 60);
  const suggestedMins = suggestedStartMinutes % 60;
  const suggestedTime = `${suggestedHours.toString().padStart(2, '0')}:${suggestedMins.toString().padStart(2, '0')}`;
  
  // Verificar si la sugerencia excede horario laboral
  const suggestedEndMinutes = suggestedStartMinutes + duration;
  const suggestedEndHours = Math.floor(suggestedEndMinutes / 60);
  const suggestedEndMins = suggestedEndMinutes % 60;
  const suggestedEndTime = `${suggestedEndHours.toString().padStart(2, '0')}:${suggestedEndMins.toString().padStart(2, '0')}`;
  
  let canProceedWithSuggestion = true;
  
  if (activeClinic) {
    const businessHours = getBusinessHours(targetDate, activeClinic);
    if (businessHours && suggestedEndTime > businessHours.close) {
      canProceedWithSuggestion = false;
    }
  }

  // ✅ ALTERNATIVAMENTE: SUGERIR DURACIÓN REDUCIDA
  let suggestedDuration: number | undefined;
  
  if (!canProceedWithSuggestion) {
    // Si no se puede mover el tiempo, intentar reducir duración
    const firstConflict = conflicts.reduce((earliest, conflict) => 
      conflict.startMinutes < earliest.startMinutes ? conflict : earliest
    );
    
    const maxAllowedDuration = firstConflict.startMinutes - targetStartMinutes;
    
    if (maxAllowedDuration > 0) {
      // Ajustar a granularidad hacia abajo
      suggestedDuration = Math.floor(maxAllowedDuration / granularity) * granularity;
      if (suggestedDuration >= granularity) { // Al menos 1 slot
        canProceedWithSuggestion = true;
      }
    }
  }

  // console.log('[AppointmentValidation] 🔧 Sugerencia:', {
  //   suggestedTime,
  //   suggestedDuration,
  //   canProceedWithSuggestion
  // });

  return {
    isValid: false,
    conflicts,
    suggestedTime: canProceedWithSuggestion ? suggestedTime : undefined,
    suggestedDuration,
    reason: `Conflicto con: ${conflicts.map(c => c.name).join(', ')}`,
    canProceed: canProceedWithSuggestion,
    originalTime: targetTime,
    originalDuration: duration
  };
}

/**
 * 🎯 VALIDACIÓN ESPECÍFICA PARA ESTIRAR CITAS
 * 
 * Valida si una cita puede extenderse a una nueva duración
 */
export function validateAppointmentResize(
  appointment: any,
  newDuration: number,
  appointments: any[],
  activeClinic?: any,
  granularity: number = 15
): ValidationResult {
  return validateAppointmentSlot({
    targetDate: appointment.date instanceof Date ? appointment.date : new Date(appointment.date),
    targetTime: appointment.startTime,
    duration: newDuration,
    roomId: appointment.roomId,
    appointments,
    excludeAppointmentId: appointment.id,
    activeClinic,
    granularity,
    allowAdjustments: true
  });
}

/**
 * 🎯 VALIDACIÓN ESPECÍFICA PARA BOTONES DE GRANULARIDAD
 * 
 * Valida si una cita puede moverse arriba/abajo por granularidad
 */
export function validateGranularityMove(
  appointment: any,
  direction: 'up' | 'down',
  granularity: number,
  appointments: any[],
  activeClinic?: any
): ValidationResult {
  const [currentHour, currentMinute] = appointment.startTime.split(':').map(Number);
  const currentStartMinutes = currentHour * 60 + currentMinute;
  
  const newStartMinutes = direction === 'up' 
    ? currentStartMinutes - granularity
    : currentStartMinutes + granularity;
    
  const newHours = Math.floor(newStartMinutes / 60);
  const newMinutes = newStartMinutes % 60;
  const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  
  return validateAppointmentSlot({
    targetDate: appointment.date instanceof Date ? appointment.date : new Date(appointment.date),
    targetTime: newTime,
    duration: appointment.duration,
    roomId: appointment.roomId,
    appointments,
    excludeAppointmentId: appointment.id,
    activeClinic,
    granularity,
    allowAdjustments: false // No permitir ajustes automáticos para granularidad
  });
} 