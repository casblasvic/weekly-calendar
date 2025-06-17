import { format, addMinutes, differenceInMinutes, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calculate the minute offset based on Y position within a time slot
 */
export function calculateMinuteOffset(
  yPositionInSlot: number,
  slotHeight: number,
  slotDurationMinutes: number = 15,
  granularity: number = 1
): number {
  const ratio = Math.max(0, Math.min(1, yPositionInSlot / slotHeight));
  const minuteOffset = Math.floor(ratio * slotDurationMinutes);
  // Aplicar granularidad (redondear al múltiplo más cercano)
  return Math.floor(minuteOffset / granularity) * granularity;
}

/**
 * Get the time string for a given hour and minute offset
 */
export function getTimeWithOffset(hour: string, minuteOffset: number): string {
  const [h, m] = hour.split(':').map(Number);
  const baseMinutes = h * 60 + m;
  const totalMinutes = baseMinutes + minuteOffset;
  
  const finalHour = Math.floor(totalMinutes / 60);
  const finalMinute = totalMinutes % 60;
  
  return `${finalHour.toString().padStart(2, '0')}:${finalMinute.toString().padStart(2, '0')}`;
}

/**
 * Calculate appointment height based on duration
 */
export function calculateAppointmentHeight(
  durationMinutes: number,
  minuteHeight: number
): number {
  return durationMinutes * minuteHeight;
}

/**
 * Get appointment duration in minutes from start and end time strings
 */
export function getAppointmentDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
}

/**
 * Format date for display
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

/**
 * Check if appointment data has changed
 */
export function hasAppointmentChanged(
  original: { date: Date; time: string; roomId: string },
  updated: { date: Date; time: string; roomId: string }
): boolean {
  return (
    original.date.toDateString() !== updated.date.toDateString() ||
    original.time !== updated.time ||
    original.roomId !== updated.roomId
  );
}

/**
 * Get changed fields for appointment update
 */
export function getChangedFields(
  original: { date: Date; time: string; roomId: string },
  updated: { date: Date; time: string; roomId: string }
): Partial<{ startTime: Date; equipmentId: string }> {
  const changes: Partial<{ startTime: Date; equipmentId: string }> = {};
  
  if (original.date.toDateString() !== updated.date.toDateString() || original.time !== updated.time) {
    const [hours, minutes] = updated.time.split(':').map(Number);
    const newStartTime = new Date(updated.date);
    newStartTime.setHours(hours, minutes, 0, 0);
    changes.startTime = newStartTime;
  }
  
  if (original.roomId !== updated.roomId) {
    changes.equipmentId = updated.roomId;
  }
  
  return changes;
}

/**
 * Calculate position in pixels for a given time
 */
export function getPositionForTime(time: string, slotDuration: number, slotHeight: number): number {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const slots = totalMinutes / slotDuration;
  return slots * slotHeight;
}

/**
 * Find the closest time slot element
 */
export function findClosestTimeSlot(
  container: HTMLElement,
  mouseY: number
): { element: HTMLElement; offset: number } | null {
  const slots = container.querySelectorAll('[data-time]');
  let closestSlot: HTMLElement | null = null;
  let closestDistance = Infinity;
  let offsetInSlot = 0;
  
  slots.forEach((slot) => {
    const rect = slot.getBoundingClientRect();
    const slotTop = rect.top;
    const slotBottom = rect.bottom;
    
    if (mouseY >= slotTop && mouseY <= slotBottom) {
      closestSlot = slot as HTMLElement;
      offsetInSlot = mouseY - slotTop;
      closestDistance = 0;
    } else {
      const distance = Math.min(
        Math.abs(mouseY - slotTop),
        Math.abs(mouseY - slotBottom)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestSlot = slot as HTMLElement;
        offsetInSlot = mouseY > slotBottom ? rect.height : 0;
      }
    }
  });
  
  return closestSlot ? { element: closestSlot, offset: offsetInSlot } : null;
}
