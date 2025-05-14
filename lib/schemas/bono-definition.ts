import * as z from 'zod';

// Schema para la parte de configuración (settings) de BonoDefinition
const BonoDefinitionSettingSchema = z.object({
  isActive: z.boolean().default(true),
  validityDays: z.coerce.number().int().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  commissionType: z.string().optional().nullable(), // Podría ser enum
  commissionValue: z.coerce.number().min(0).optional().nullable(),
  appearsInApp: z.boolean().default(true),
  autoAddToInvoice: z.boolean().default(false),
  pointsAwarded: z.coerce.number().int().min(0).optional().nullable(),
});

// Objeto base SIN refine para poder extenderlo
const BonoDefinitionBaseObject = z.object({
  // Campos base de BonoDefinition
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  // Relación exclusiva (o servicio o producto)
  serviceId: z.string().cuid().optional().nullable(),
  productId: z.string().cuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1, { message: "La cantidad debe ser al menos 1." }),
  price: z.coerce.number().min(0, { message: "El precio no puede ser negativo." }), // Precio base del bono
  vatTypeId: z.string().optional().nullable(),
  // Objeto anidado para settings (opcional en el formulario base)
  settings: BonoDefinitionSettingSchema.optional(),
});

// Schema principal del formulario CON refine
export const BonoDefinitionFormSchema = BonoDefinitionBaseObject.refine(
  data => data.serviceId || data.productId,
  {
    message: "Debe seleccionar un servicio o un producto asociado.",
    path: ["serviceId"], // Asociar error a serviceId primero
  }
).refine(
  data => !(data.serviceId && data.productId),
  {
    message: "No puede seleccionar un servicio y un producto a la vez.",
    path: ["productId"], // Asociar error a productId en este caso
  }
);

// Tipo inferido
export type BonoDefinitionFormValues = z.infer<typeof BonoDefinitionFormSchema>;

// Schema para la API (extender el BASE y luego añadir refine si es necesario para la API)
export const ApiBonoDefinitionPayloadSchema = BonoDefinitionBaseObject.extend({
  settings: BonoDefinitionSettingSchema // Asegurar que settings venga
}).refine(data => data.serviceId || data.productId, {
    message: "Debe seleccionar un servicio o un producto asociado.",
    path: ["serviceId"], 
}).refine(data => !(data.serviceId && data.productId), {
    message: "No puede seleccionar un servicio y un producto a la vez.",
    path: ["productId"],
}); // Re-aplicar refine si la API también lo necesita

export type ApiBonoDefinitionPayloadValues = z.infer<typeof ApiBonoDefinitionPayloadSchema>; 