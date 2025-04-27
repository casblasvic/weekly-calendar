import { z } from 'zod';

export const bankFormSchema = z.object({
  name: z.string()
    .min(1, { message: "El nombre del banco es obligatorio." })
    .max(100, { message: "El nombre no puede exceder los 100 caracteres." }),
  
  code: z.string()
    .max(4, { message: "El código no puede exceder los 4 caracteres." })
    .regex(/^\d{1,4}$/, { message: "El código debe contener entre 1 y 4 dígitos numéricos." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  phone: z.string()
    .max(20, { message: "El teléfono no puede exceder los 20 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  phone1CountryIsoCode: z.string()
    .max(2, { message: "El código de país debe tener 2 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  phone2: z.string()
    .max(20, { message: "El teléfono alternativo no puede exceder los 20 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  phone2CountryIsoCode: z.string()
    .max(2, { message: "El código de país debe tener 2 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  email: z.string()
    .email({ message: "El email debe tener un formato válido." })
    .max(100, { message: "El email no puede exceder los 100 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  address: z.string()
    .max(255, { message: "La dirección no puede exceder los 255 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  countryIsoCode: z.string()
    .max(2, { message: "El código de país debe tener 2 caracteres." })
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),
  
  isGlobal: z.boolean().default(true),
  
  applicableClinicIds: z.array(z.string())
    .optional()
    .nullable()
    .default([]),
  
  // systemId se manejará en el backend, no en el formulario directamente
}).refine(data => {
    if (!data.isGlobal) {
      return data.applicableClinicIds && data.applicableClinicIds.length > 0;
    }
    return true;
  }, {
    message: "Debes seleccionar al menos una clínica si el banco no es global.",
    path: ["applicableClinicIds"],
});

export type BankFormValues = z.infer<typeof bankFormSchema>; 