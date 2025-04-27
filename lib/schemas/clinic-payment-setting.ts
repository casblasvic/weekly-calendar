import { z } from 'zod';

export const clinicPaymentSettingFormSchema = z.object({
  // IDs requeridos para la creación/actualización
  clinicId: z.string().min(1, { message: 'La clínica es obligatoria.' }),
  paymentMethodDefinitionId: z.string().min(1, { message: 'El método de pago es obligatorio.' }),
  
  // Cuenta bancaria receptora opcional (puede ser null o undefined)
  receivingBankAccountId: z.string().nullable().optional(),
  
  // TPV asociado (opcional, relevante para tipo 'CARD')
  posTerminalId: z.string().nullable().optional(),
  
  // Indica si es el TPV por defecto para 'CARD' en esta clínica
  isDefaultPosTerminal: z.boolean().nullable().optional(),

  // Estado de activación específico para esta clínica
  isActiveInClinic: z.boolean().default(true),

  // Indica si es la cuenta bancaria receptora por defecto para esta clínica
  isDefaultReceivingBankAccount: z.boolean().nullable().optional(),
});

// Tipo inferido para usar en componentes de formulario y API
export type ClinicPaymentSettingFormValues = z.infer<typeof clinicPaymentSettingFormSchema>; 