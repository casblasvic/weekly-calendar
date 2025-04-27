import { Prisma } from '@prisma/client';
import type { WeekSchedule, DaySchedule, TimeRange } from "@/types/schedule";
import type { ScheduleTemplateBlock, ClinicScheduleBlock } from '@prisma/client';

/**
 * Convierte un array de bloques de horario (de plantilla o independientes)
 * en un objeto WeekSchedule que usa el frontend.
 *
 * @param blocks Array de bloques de Prisma.
 * @param defaultOpenTime Hora de apertura por defecto si no hay bloques (no se usa actualmente).
 * @param defaultCloseTime Hora de cierre por defecto si no hay bloques (no se usa actualmente).
 * @returns Objeto WeekSchedule.
 */
export const convertBlocksToWeekSchedule = (
    blocks: (ScheduleTemplateBlock | ClinicScheduleBlock)[] | undefined | null,
    defaultOpenTime: string, // Estos defaults podrían eliminarse si no se usan
    defaultCloseTime: string // Estos defaults podrían eliminarse si no se usan
): WeekSchedule => {
    console.log("[scheduleUtils] convertBlocksToWeekSchedule - Input blocks:", blocks);
    // Inicializar con todos los días cerrados
    const initialSchedule: WeekSchedule = {
        monday: { isOpen: false, ranges: [] }, tuesday: { isOpen: false, ranges: [] },
        wednesday: { isOpen: false, ranges: [] }, thursday: { isOpen: false, ranges: [] },
        friday: { isOpen: false, ranges: [] }, saturday: { isOpen: false, ranges: [] },
        sunday: { isOpen: false, ranges: [] },
    };
    
    if (!blocks || blocks.length === 0) {
        console.log("[scheduleUtils] No blocks provided or empty array, returning initial (all closed) schedule.");
        return initialSchedule;
    }

    const weekSchedule = blocks.reduce((acc, block) => {
        // Asegurarse de que dayOfWeek existe y es válido
        if (!block || !block.dayOfWeek) {
            console.warn("[scheduleUtils] Skipping block due to missing dayOfWeek:", block);
            return acc;
        }
        const dayKey = block.dayOfWeek.toLowerCase() as keyof WeekSchedule;
        
        // Validar que dayKey sea una clave válida de WeekSchedule
        if (!(dayKey in acc)) {
            console.warn(`[scheduleUtils] Invalid dayKey derived: ${dayKey} for block:`, block);
            return acc;
        }
        
        // Validar startTime y endTime
        if (!block.startTime || !block.endTime || block.startTime >= block.endTime) {
             console.warn(`[scheduleUtils] Skipping block for ${dayKey} due to invalid time range:`, block);
             return acc;
        }

        // Marcar el día como abierto y añadir el rango
        acc[dayKey].isOpen = true;
        acc[dayKey].ranges.push({ start: block.startTime, end: block.endTime });
        
        // Ordenar los rangos por hora de inicio
        acc[dayKey].ranges.sort((a, b) => a.start.localeCompare(b.start));
        
        return acc;
    }, JSON.parse(JSON.stringify(initialSchedule))); // Usar deep copy para evitar mutaciones inesperadas

    console.log("[scheduleUtils] Resulting schedule:", weekSchedule);
    return weekSchedule;
};

/**
 * Crea un objeto WeekSchedule por defecto con todos los días cerrados.
 * @returns Objeto WeekSchedule por defecto.
 */
export const createDefaultSchedule = (): WeekSchedule => {
    return {
        monday: { isOpen: false, ranges: [] },
        tuesday: { isOpen: false, ranges: [] },
        wednesday: { isOpen: false, ranges: [] },
        thursday: { isOpen: false, ranges: [] },
        friday: { isOpen: false, ranges: [] },
        saturday: { isOpen: false, ranges: [] },
        sunday: { isOpen: false, ranges: [] },
    };
};

// Podríamos añadir más utilidades aquí en el futuro, como:
// - mergeOverlappingRanges(ranges: TimeRange[]): TimeRange[]
// - isTimeWithinRanges(time: string, ranges: TimeRange[]): boolean
// - calculateScheduleBounds(schedule: WeekSchedule): { earliestStart: string, latestEnd: string } | null
