import { AccountType } from "@prisma/client";
import * as z from "zod";

// Esquema para crear una entrada en el plan contable
export const CreateChartOfAccountEntrySchema = z.object({
  accountNumber: z.string().min(1, "El número de cuenta es requerido."),
  name: z.string().min(1, "El nombre de la cuenta es requerido."),
  type: z.nativeEnum(AccountType),
  description: z.string().optional().nullable(),
  isMonetary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  parentAccountId: z.string().optional().nullable(),
  legalEntityId: z.string().min(1, "Legal entity ID es requerido."),
  systemId: z.string().min(1, "System ID es requerido."),
  allowsDirectEntry: z.boolean().default(true),
});
export type CreateChartOfAccountEntryInput = z.infer<typeof CreateChartOfAccountEntrySchema>;

// Esquema para actualizar una entrada
export const UpdateChartOfAccountEntrySchema = CreateChartOfAccountEntrySchema.extend({
  id: z.string().min(1, "ID de la cuenta es requerido para actualizar."),
});
export type UpdateChartOfAccountEntryInput = z.infer<typeof UpdateChartOfAccountEntrySchema>;
