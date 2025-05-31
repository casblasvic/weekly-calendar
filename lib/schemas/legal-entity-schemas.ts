import * as z from 'zod';

// Esquema para un identificador fiscal individual (para el array del formulario)
const taxIdentifierItemSchema = z.object({
  name: z.string().min(1, { message: 'validation.tax_identifier.name_required' }),
  value: z.string().min(1, { message: 'validation.tax_identifier.value_required' }),
});

// Esquema Zod para la creación de una LegalEntity (para el formulario)
export const createLegalEntitySchema = z.object({
  name: z.string().min(1, { message: 'validation.required_field' }).optional().nullable(),
  fullAddress: z.string().optional().nullable(),
  countryIsoCode: z.string().min(2, { message: 'validation.country_code_length_min' }).max(3, { message: 'validation.country_code_length_max' }).optional().nullable(),
  taxIdentifiers: z.array(taxIdentifierItemSchema).optional(), // Para el formulario
  notes: z.string().optional().nullable(),
  email: z.string().email({ message: 'validation.invalid_email' }).optional().nullable(),
  phone: z.string().optional().nullable(),
  phoneCountryIsoCode: z.string().min(2, { message: 'validation.country_code_length_min' }).max(3, { message: 'validation.country_code_length_max' }).optional().nullable(),
  clinicIds: z.array(z.string().cuid2({ message: 'validation.invalid_cuid' })).optional(),
});

// Tipo para los valores del formulario, inferido del esquema Zod
export type LegalEntityFormValues = z.infer<typeof createLegalEntitySchema>;

// Tipo para el payload de creación que se envía a la API/mutación
export type CreateLegalEntityPayload = Omit<LegalEntityFormValues, 'taxIdentifiers'> & {
  taxIdentifierFields?: { [key: string]: string };
};

// Esquema Zod para el payload que la API de creación espera
// Similar a createLegalEntitySchema, pero con taxIdentifierFields (objeto) en lugar de taxIdentifiers (array)
export const apiCreateLegalEntityPayloadSchema = createLegalEntitySchema.omit({ taxIdentifiers: true }).extend({
  taxIdentifierFields: z.record(z.string().min(1, {message: 'validation.tax_identifier.name_not_empty'}), z.string().min(1, {message: 'validation.tax_identifier.value_not_empty'})).optional(),
});

// Esquema Zod para la actualización de una LegalEntity (para el formulario)
export const updateLegalEntitySchema = createLegalEntitySchema.partial();

// Tipo para el payload de actualización que se envía a la API/mutación
export type UpdateLegalEntityPayload = Omit<z.infer<typeof updateLegalEntitySchema>, 'taxIdentifiers'> & {
  taxIdentifierFields?: { [key: string]: string };
};

// Tipos básicos para las relaciones que se incluyen en las respuestas
export interface BasicClinic {
  id: string;
  name: string;
  // Añadir otros campos relevantes de Clinic si son necesarios para la UI
}

export interface BasicCountry {
  id: string;
  isoCode: string;
  name: string;
  phoneCode?: string; // Añadido por si se usa en algún sitio
  // Añadir otros campos relevantes de Country si son necesarios
}

// Tipo para la respuesta de la API al crear o actualizar una LegalEntity
// Debería coincidir con el modelo Prisma de LegalEntity + relaciones incluidas
export interface LegalEntityResponse {
  id: string;
  name: string;
  fullAddress?: string | null;
  countryIsoCode: string;
  taxIdentifierFields?: { [key: string]: string } | null;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneCountryIsoCode?: string | null;
  systemId: string;
  createdAt: string; // O Date, dependiendo de la serialización
  updatedAt: string; // O Date
  clinics?: BasicClinic[]; // Clínicas asociadas
  country?: BasicCountry | null; // País de jurisdicción fiscal
  phoneCountry?: BasicCountry | null; // País del prefijo telefónico
}

// Tipo para la respuesta detallada de GET /api/legal-entities/[id]
// Extiende LegalEntityResponse si es necesario, o puede ser idéntico si la estructura es la misma.
export interface LegalEntityDetailResponse extends LegalEntityResponse {}
