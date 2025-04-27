import { z } from 'zod';

// 1. Definir el objeto schema base
export const bankAccountObjectSchema = z.object({
  accountName: z.string().min(1, { message: 'El nombre de la cuenta es obligatorio.' }).max(100, 'El nombre no puede exceder los 100 caracteres.'),
  iban: z.string()
           .min(1, { message: 'El IBAN es obligatorio.' })
           // Validación básica de IBAN (longitud y caracteres)
           // Podría mejorarse con un regex más estricto o checksum si es necesario
           .regex(/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, { message: 'Formato de IBAN inválido.' }),
  swiftBic: z.string().max(11, 'SWIFT/BIC no puede exceder los 11 caracteres.').optional().nullable(), // Opcional
  currency: z.string().length(3, { message: 'El código de moneda debe tener 3 caracteres.' }).default('EUR'), // Por defecto EUR
  bankId: z.string().min(1, { message: 'Debes seleccionar un banco.' }), // Obligatorio seleccionar banco
  notes: z.string().max(500, 'Las notas no pueden exceder los 500 caracteres.').optional().nullable(), // Opcional
  isActive: z.boolean().default(true), // Por defecto activa

  // --- NUEVOS CAMPOS DE ÁMBITO ---
  isGlobal: z.boolean().default(true), // Por defecto es global

  applicableClinicIds: z.array(z.string()) // Array de IDs de clínica
    .optional()
    .nullable()
    .default([]), // Por defecto un array vacío si no se provee
  // --- FIN NUEVOS CAMPOS DE ÁMBITO ---
});

// 2. Crear el schema refinado usando el objeto base
export const bankAccountFormSchema = bankAccountObjectSchema.refine(data => {
    // Si NO es global, DEBE tener al menos una clínica seleccionada
    if (!data.isGlobal) {
      return data.applicableClinicIds && data.applicableClinicIds.length > 0;
    }
    return true;
  }, {
    message: "Debes seleccionar al menos una clínica si la cuenta no es global.",
    path: ["applicableClinicIds"],
});

// Tipo inferido para usar en TypeScript (usualmente basado en el schema final con refine)
export type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>; 