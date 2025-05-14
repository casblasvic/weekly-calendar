import * as z from 'zod';

// Schema para un item dentro del paquete
const PackageItemSchema = z.object({
  id: z.string().optional(), // ID existente para actualizaciones
  serviceId: z.string().cuid().optional().nullable(),
  productId: z.string().cuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1, { message: "Cantidad debe ser al menos 1" }),
  // Podríamos añadir precio específico del item si fuera necesario
})
.refine(data => data.serviceId || data.productId, {
    message: "Cada ítem debe ser un servicio o un producto.",
    path: ["serviceId"], // O path general para el ítem
})
.refine(data => !(data.serviceId && data.productId), {
    message: "Un ítem no puede ser servicio y producto a la vez.",
    path: ["productId"],
});
export type PackageItemValues = z.infer<typeof PackageItemSchema>;

// Schema para la parte de configuración (settings) de PackageDefinition
const PackageDefinitionSettingSchema = z.object({
  isActive: z.boolean().default(true),
  validityDays: z.coerce.number().int().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).optional().nullable(),
  commissionType: z.string().optional().nullable(),
  commissionValue: z.coerce.number().min(0).optional().nullable(),
  pointsAwarded: z.coerce.number().int().min(0).optional().nullable(),
});

// Schema BASE del formulario de PackageDefinition (para extender)
const PackageDefinitionBaseObject = z.object({
  // Campos base
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, { message: "El precio no puede ser negativo." }),
  vatTypeId: z.string().optional().nullable(),

  // Lista de items
  items: z.array(PackageItemSchema).min(1, { message: "El paquete debe tener al menos un ítem." }),

  // Objeto anidado para settings (opcional en formulario base)
  settings: PackageDefinitionSettingSchema.optional(),
});

// Schema principal del formulario (añade refine si es necesario)
export const PackageDefinitionFormSchema = PackageDefinitionBaseObject; // No necesita refine adicional por ahora

// Tipo inferido
export type PackageDefinitionFormValues = z.infer<typeof PackageDefinitionFormSchema>;

// Schema para la API (requiere settings)
export const ApiPackageDefinitionPayloadSchema = PackageDefinitionBaseObject.extend({
  settings: PackageDefinitionSettingSchema
});
export type ApiPackageDefinitionPayloadValues = z.infer<typeof ApiPackageDefinitionPayloadSchema>; 