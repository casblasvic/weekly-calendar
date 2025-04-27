import type {
  Cabin,
  Clinic,
  ClinicSchedule,
  ClinicScheduleBlock,
  ScheduleTemplate,
  ScheduleTemplateBlock,
  Tariff,
} from '@prisma/client';

// Tipo auxiliar para incluir los bloques dentro de la plantilla de horario
type ScheduleTemplateWithBlocks = ScheduleTemplate & {
  blocks: ScheduleTemplateBlock[];
};

/**
 * Representa la estructura de datos esperada de la respuesta de la API
 * para GET /api/clinics/[id], incluyendo las relaciones clave.
 * Utiliza tipos generados por Prisma como fuente de verdad.
 */
export type ClinicaApiOutput = Clinic & {
  linkedScheduleTemplate: ScheduleTemplateWithBlocks | null; // Puede ser null si el horario es independiente
  independentScheduleBlocks: ClinicScheduleBlock[]; // Bloques para horario independiente
  independentSchedule: ClinicSchedule | null; // Configuración general del horario independiente (puede ser null)
  tariff: Tariff | null; // La tarifa asociada (puede ser null)
  cabins: Cabin[]; // Lista de cabinas asociadas
}; 