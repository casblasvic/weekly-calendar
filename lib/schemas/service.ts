import * as z from 'zod';

// Schema para la parte de configuración (settings)
const ServiceSettingSchema = z.object({
  isActive: z.boolean().default(true),
  requiresMedicalSignOff: z.boolean().default(false),
  pointsAwarded: z.coerce.number().int().min(0).optional().nullable(),
  commissionType: z.string().optional().nullable(), // Podría ser un enum si los tipos son fijos: z.enum(['PERCENTAGE', 'FIXED']).optional().nullable()
  commissionValue: z.coerce.number().min(0).optional().nullable(),
  requiresParams: z.boolean().default(false),
  appearsInApp: z.boolean().default(true),
  autoAddToInvoice: z.boolean().default(false),
  onlineBookingEnabled: z.boolean().default(true),
  minTimeBeforeBooking: z.coerce.number().int().min(0).optional().nullable(),
  maxTimeBeforeBooking: z.coerce.number().int().min(0).optional().nullable(),
  cancellationPolicy: z.string().optional().nullable(),
  preparationTimeMinutes: z.coerce.number().int().min(0).optional().nullable(),
  cleanupTimeMinutes: z.coerce.number().int().min(0).optional().nullable(),
  internalNotes: z.string().optional().nullable(),
});

// Schema principal del formulario de Servicio
export const ServiceFormSchema = z.object({
  // Campos base de Service
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(1, { message: "La duración de cita debe ser al menos 1 minuto." }),
  treatmentDurationMinutes: z.coerce.number().int().min(0, { message: "La duración de tratamiento no puede ser negativa." }).default(0),
  price: z.coerce.number().min(0, { message: "El precio no puede ser negativo." }).nullable(), // Permitir null si el precio no es obligatorio inicialmente
  colorCode: z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: "Debe ser un código de color hexadecimal válido (ej: #FF0000)." }).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  vatTypeId: z.string().optional().nullable(), // Podría ser obligatorio dependiendo de la lógica de negocio

  // Campos de relación M-M
  equipmentIds: z.array(z.string()).optional().default([]), // IDs de Equipment requeridos
  skillIds: z.array(z.string()).optional().default([]),     // IDs de Skill requeridos

  // Objeto anidado para settings
  settings: ServiceSettingSchema.optional(), // Settings es opcional en el *schema* general, pero la API lo creará.
                                           // Para el formulario, podríamos requerirlo o manejarlo como default.
                                           // Vamos a hacerlo opcional aquí y la API se encargará de crearlo siempre.
});

// Tipo inferido para usar en el formulario
export type ServiceFormValues = z.infer<typeof ServiceFormSchema>;

// Posible Schema para la API (asegura que settings venga)
export const ApiServicePayloadSchema = ServiceFormSchema.extend({
  settings: ServiceSettingSchema // En la API, esperamos que settings venga siempre
});
export type ApiServicePayloadValues = z.infer<typeof ApiServicePayloadSchema>; 