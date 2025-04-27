import * as z from 'zod';

// Schema para la validación del formulario de creación/edición de PosTerminal
export const posTerminalFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre del terminal es obligatorio." }),
  terminalIdProvider: z.string().optional().nullable(), // ID del proveedor (opcional)
  provider: z.string().optional().nullable(), // Nombre del proveedor (ej: Redsys, Stripe) (opcional)
  bankAccountId: z.string().min(1, { message: "Debes seleccionar una cuenta bancaria." }), // Cuenta asociada (obligatoria)
  locationId: z.string().optional().nullable(), // Nueva ubicación asociada (opcional)
  isActive: z.boolean().default(true).optional(), // Estado (opcional en formulario)

  // --- Nuevos Campos para Ámbito Global/Específico ---
  isGlobal: z.boolean().optional().default(true), // Indica si el terminal está disponible globalmente
  applicableClinicIds: z.array(z.string()).optional(), // Array de IDs de clínicas si isGlobal es false
}).refine(data => {
  // Validación cruzada: Si NO es global, debe tener al menos una clínica seleccionada.
  if (!data.isGlobal && (!data.applicableClinicIds || data.applicableClinicIds.length === 0)) {
    return false;
  }
  return true;
}, {
  // Mensaje de error si la validación falla
  message: "Debes seleccionar al menos una clínica si el terminal no es global.",
  // Asociar el error al campo 'applicableClinicIds' para mostrarlo correctamente en la UI
  path: ["applicableClinicIds"], 
});

// Tipo inferido para usar en TypeScript
export type PosTerminalFormValues = z.infer<typeof posTerminalFormSchema>; 