const clinicApiOutputInclude = {
  linkedScheduleTemplate: {
    include: {
      blocks: true,
    },
  },
  independentScheduleBlocks: true,
  independentSchedule: true, // Incluido según la API, aunque podría ser redundante
  tariff: true,
  cabins: true,
} satisfies Prisma.ClinicInclude;

/**
 * Tipo que representa la estructura de datos devuelta por la API
 * al obtener los detalles de una clínica (/api/clinics/[id]).
 * Incluye las relaciones definidas en la consulta GET.
 */
export type ClinicaApiOutput = Prisma.ClinicGetPayload<{ 
  include: typeof clinicApiOutputInclude 
}>; 