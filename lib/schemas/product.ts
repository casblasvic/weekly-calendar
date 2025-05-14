import * as z from 'zod';

// Schema para la parte de configuración (settings) del Producto
const ProductSettingSchema = z.object({
  isActive: z.boolean().default(true),
  currentStock: z.coerce.number().int().default(0),
  minStockThreshold: z.coerce.number().int().min(0).optional().nullable(),
  isForSale: z.boolean().default(true),
  isInternalUse: z.boolean().default(false),
  pointsAwarded: z.coerce.number().int().min(0).optional().nullable(),
  // Añadir futuros campos de configuración aquí si es necesario
  // dimensions: z.string().optional().nullable(),
  // weight: z.coerce.number().positive().optional().nullable(),
});

// Schema principal del formulario de Producto
export const ProductFormSchema = z.object({
  // Campos base de Product
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  price: z.coerce.number().min(0, { message: "El precio no puede ser negativo." }).optional().nullable(),
  costPrice: z.coerce.number().min(0, { message: "El coste no puede ser negativo." }).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  vatTypeId: z.string().optional().nullable(),

  // Objeto anidado para settings
  settings: ProductSettingSchema.optional(), // API se encargará de crearlo
});

// Tipo inferido para usar en el formulario
export type ProductFormValues = z.infer<typeof ProductFormSchema>;

// Schema para la API (asegura que settings venga)
export const ApiProductPayloadSchema = ProductFormSchema.extend({
  settings: ProductSettingSchema
});
export type ApiProductPayloadValues = z.infer<typeof ApiProductPayloadSchema>; 