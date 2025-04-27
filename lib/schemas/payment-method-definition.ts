import { z } from 'zod';
import { PaymentMethodType } from '@prisma/client'; // Importar el enum de Prisma

// Obtener los valores del enum para usarlos en Zod
const paymentMethodTypes = Object.values(PaymentMethodType) as [string, ...string[]];

export const paymentMethodDefinitionFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es obligatorio.' }),
  
  type: z.enum(paymentMethodTypes, {
    errorMap: () => ({ message: 'Selecciona un tipo de método válido.' }),
  }),
  
  details: z.string().nullable().optional(), // Detalles generales opcionales
  
  isActive: z.boolean().default(true), // Estado global

  // --- CAMPOS ELIMINADOS --- 
  // clinicId: z.string().nullable().optional(),
  // bankAccountId: z.string().nullable().optional(),
});

export type PaymentMethodDefinitionFormValues = z.infer<typeof paymentMethodDefinitionFormSchema>; 