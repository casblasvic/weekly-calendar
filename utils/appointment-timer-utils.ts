import { differenceInMinutes, parseISO } from 'date-fns';
import type { PauseInterval, PauseIntervals, AppointmentTimerData } from '@/types/appointments';

/**
 * Calcula el tiempo total activo (excluyendo pausas)
 */
export function calculateActualMinutes(timerData: AppointmentTimerData): number {
  const startTime = timerData.startedAt;
  const endTime = timerData.endedAt || new Date();
  const totalMinutes = differenceInMinutes(endTime, startTime);
  
  // Restar tiempo de pausas
  const pauseIntervals = timerData.pauseIntervals || [];
  const totalPauseMinutes = pauseIntervals.reduce((total, interval) => {
    if (interval.resumedAt) {
      const pauseDuration = differenceInMinutes(
        parseISO(interval.resumedAt), 
        parseISO(interval.pausedAt)
      );
      return total + pauseDuration;
    }
    return total;
  }, 0);
  
  return Math.max(0, totalMinutes - totalPauseMinutes);
}

/**
 * Calcula el tiempo de la pausa actual (si está pausado)
 */
export function getCurrentPauseDuration(timerData: AppointmentTimerData): number {
  if (timerData.currentStatus !== 'PAUSED' || !timerData.pausedAt) {
    return 0;
  }
  
  return differenceInMinutes(new Date(), timerData.pausedAt);
}

/**
 * Formatea tiempo en MM:SS
 */
export function formatTimerDisplay(minutes: number): string {
  const totalSeconds = Math.floor(minutes * 60);
  const displayMinutes = Math.floor(totalSeconds / 60);
  const displaySeconds = totalSeconds % 60;
  
  return `${displayMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
}

/**
 * Formatea tiempo en formato legible (ej: "1h 23m")
 */
export function formatDurationHuman(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Crea un nuevo intervalo de pausa
 */
export function createPauseInterval(reason?: string): PauseInterval {
  return {
    pausedAt: new Date().toISOString(),
    reason
  };
}

/**
 * Completa el último intervalo de pausa
 */
export function completePauseInterval(intervals: PauseIntervals): PauseIntervals {
  const updatedIntervals = [...intervals];
  const lastInterval = updatedIntervals[updatedIntervals.length - 1];
  
  if (lastInterval && !lastInterval.resumedAt) {
    const resumedAt = new Date().toISOString();
    lastInterval.resumedAt = resumedAt;
    lastInterval.durationMinutes = differenceInMinutes(
      parseISO(resumedAt),
      parseISO(lastInterval.pausedAt)
    );
  }
  
  return updatedIntervals;
}

/**
 * Verifica si el tiempo estimado ha sido excedido
 */
export function isTimeExceeded(timerData: AppointmentTimerData): boolean {
  const actualMinutes = calculateActualMinutes(timerData);
  return actualMinutes >= timerData.estimatedMinutes;
}

/**
 * Calcula el tiempo restante (puede ser negativo si se excedió)
 */
export function getRemainingTime(timerData: AppointmentTimerData): number {
  const actualMinutes = calculateActualMinutes(timerData);
  return timerData.estimatedMinutes - actualMinutes;
}

/**
 * Obtiene el progreso como porcentaje (0-100+, puede exceder 100%)
 */
export function getProgressPercentage(timerData: AppointmentTimerData): number {
  const actualMinutes = calculateActualMinutes(timerData);
  const progress = (actualMinutes / timerData.estimatedMinutes) * 100;
  return Math.max(0, progress); // Permitir que exceda 100%
}

/**
 * Obtiene el progreso limitado a 100% para barras visuales
 */
export function getVisualProgressPercentage(timerData: AppointmentTimerData): number {
  const progress = getProgressPercentage(timerData);
  return Math.min(100, progress);
}

/**
 * Calcula el porcentaje de exceso de tiempo
 */
export function getExcessPercentage(timerData: AppointmentTimerData): number {
  const progress = getProgressPercentage(timerData);
  return Math.max(0, progress - 100);
} 