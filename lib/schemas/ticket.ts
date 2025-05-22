import { z } from 'zod';

// Schema para un item individual en el ticket
export const ticketItemSchema = z.object({
  id: z.string().optional(), // ID del producto/servicio/bono/paquete
  type: z.enum(['PRODUCT', 'SERVICE', 'BONO_DEFINITION', 'PACKAGE_DEFINITION', 'CUSTOM']).optional(),
  itemId: z.string({ invalid_type_error: "El ID del item debe ser un string."}).cuid({ message: "El ID del ítem referenciado no es un CUID válido."}).optional(),
  concept: z.string({ required_error: "El concepto es obligatorio." }),
  quantity: z.number().min(1, { message: "La cantidad debe ser al menos 1." }),
  
  // Precios y Descuentos
  originalUnitPrice: z.number().min(0, { message: "El precio unitario original no puede ser negativo." }).optional().nullable(), // PERMITIR 0 y null
  unitPrice: z.number().positive({ message: "El precio unitario debe ser positivo." }), // Precio base (puede ser el original o el de tarifa)
  isPriceOverridden: z.boolean().optional().default(false),
  discountPercentage: z.number().min(0).max(100).optional(), // Descuento % general (quizás obsoleto con el nuevo modal)
  discountAmount: z.number().min(0).optional(),           // Descuento importe general (quizás obsoleto con el nuevo modal)
  manualDiscountPercentage: z.number().min(0).max(100).optional().nullable(), // Descuento % aplicado desde el modal
  manualDiscountAmount: z.number().min(0).optional().nullable(),        // Descuento en importe aplicado desde el modal (calculado)
  promotionDiscountAmount: z.number().min(0).optional().nullable(),     // Descuento en importe aplicado por promoción
  appliedPromotionId: z.string().optional().nullable(),                 // ID de la promoción aplicada
  accumulatedDiscount: z.boolean().optional().default(false), // Si el descuento se acumula con otros
  finalPrice: z.number().min(0), // Precio final después de todos los descuentos (unitario * cantidad - descuentos)
  
  // IVA
  vatRateId: z.string().optional(), // ID del tipo de IVA
  vatRate: z.number().min(0).optional(), // El porcentaje de IVA aplicado (puede venir del tipo o ser manual)
  vatAmount: z.number().min(0), // Importe del IVA calculado sobre finalPrice

  // Otros
  discountNotes: z.string().optional().nullable(), // Usar este para las notas del descuento del ítem
  // Campos adicionales para bonos/paquetes si es necesario
  bonoInstanceId: z.string().optional(),
  promotionAppliedId: z.string().optional(),
});

export type TicketItemFormValues = z.infer<typeof ticketItemSchema>;

// Schema para un pago individual
export const ticketPaymentSchema = z.object({
  id: z.string().optional(),
  paymentMethodDefinitionId: z.string().optional().nullable(),
  paymentMethodName: z.string().optional().nullable(),
  paymentMethodCode: z.string().optional().nullable(),
  amount: z.number().positive("El importe debe ser positivo"),
  paymentDate: z.date(),
  transactionReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isDeferred: z.boolean().optional(), // Para marcar si es una instrucción de aplazamiento
});

export type TicketPaymentFormValues = z.infer<typeof ticketPaymentSchema>;

// Schema para el payload de actualización en lote de un Ticket
export const batchUpdateTicketPayloadSchema = z.object({
  scalarUpdates: z.object({
    clientId: z.string().cuid().nullable().optional(),
    sellerUserId: z.string().cuid().nullable().optional(),
    notes: z.string().nullable().optional(),
    ticketSeries: z.string().nullable().optional(),
    // Campos de descuento global
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).nullable().optional(),
    discountAmount: z.number().min(0).nullable().optional(),
    discountReason: z.string().max(255).nullable().optional(),
    // No incluir status, issueDate, ticketNumber aquí, se manejan por endpoints/lógica específica
  }).optional(),

  itemsToAdd: z.array(z.object({
    itemType: z.enum(['SERVICE', 'PRODUCT', 'BONO_DEFINITION', 'PACKAGE_DEFINITION', 'CUSTOM']),
    itemId: z.string().cuid().optional().nullable(), // CUID si es entidad existente, null/undefined si es custom o se busca por otro campo
    description: z.string(), // Para custom, o snapshot
    quantity: z.number().min(1),
    unitPrice: z.number(), // Precio base del item ANTES de descuentos de línea
    originalUnitPrice: z.number().min(0).optional().nullable(),
    isPriceOverridden: z.boolean().optional().default(false),
    manualDiscountPercentage: z.number().min(0).max(100).optional().nullable(),
    manualDiscountAmount: z.number().min(0).optional().nullable(),
    discountNotes: z.string().optional().nullable(),
    appliedPromotionId: z.string().cuid().optional().nullable(),
    promotionDiscountAmount: z.number().min(0).optional().nullable(),
    vatRateId: z.string().cuid().optional().nullable(),
    // vatRate se obtendrá en backend a partir de vatRateId o default
    // finalPrice y vatAmount se calcularán en backend
    professionalUserId: z.string().cuid().optional().nullable(),
    tempId: z.string().optional() // ID temporal del frontend para rastreo
  })).optional(),

  itemsToUpdate: z.array(z.object({
    id: z.string().cuid(), // ID del TicketItem existente
    updates: ticketItemSchema.omit({ id: true, type: true, concept: true, finalPrice: true, vatAmount: true, itemId:true }).partial(), // Permitir actualizar campos de ticketItemSchema
  })).optional(),

  itemIdsToDelete: z.array(z.string().cuid()).optional(),

  paymentsToAdd: z.array(
    z.object({
      paymentMethodDefinitionId: z.string().cuid(),
      amount: z.number().positive(),
      paymentDate: z.date().optional(),
      transactionReference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      tempId: z.string().optional()
    }).passthrough() // Permitimos campos extra (ej: clinicId) para evitar errores estrictos
  ).optional(),

  paymentIdsToDelete: z.array(z.string().cuid()).optional(),

}).strict(); // .strict() para evitar campos no definidos

export type BatchUpdateTicketPayload = z.infer<typeof batchUpdateTicketPayloadSchema>;

// Schema principal para el formulario de creación/edición de Ticket
export const ticketFormSchema = z.object({
  // --- Sección Cliente ---
  clientId: z.string().optional(), // Se seleccionará mediante un buscador
  clientName: z.string().optional(), // Nombre del cliente (display)
  clientDetails: z.any().optional(), // Objeto con más detalles del cliente (display)

  // --- Sección Datos Ticket (Cabecera) ---
  ticketNumber: z.string().optional(), // Autogenerado o para edición
  ticketDate: z.date().default(() => new Date()),
  sellerId: z.string().optional().nullable(), // ID del usuario vendedor
  series: z.string().optional().default('TICK'), // Serie del ticket
  printSize: z.enum(['80mm', '58mm', 'A4']).default('80mm').optional(),
  observations: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED', 'ACCOUNTED', 'VOID']).default('OPEN'),

  // --- Sección Items ---
  items: z.array(ticketItemSchema).min(0, { message: "Debe haber al menos un concepto en el ticket." }),

  // --- Sección Totales y Descuento Global ---
  subtotalAmount: z.number().default(0), // Suma de finalPrice de items antes de IVA global
  // Campos para el descuento global del ticket
  globalDiscountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'], { 
    errorMap: (issue, ctx) => ({ message: 'Seleccione un tipo de descuento válido o deje vacío.' })
  }).optional().nullable(),
  globalDiscountAmount: z.number().min(0, "El descuento global debe ser positivo o cero.").optional().nullable(), 
  globalDiscountReason: z.string().max(255, "La razón no debe exceder 255 caracteres.").optional().nullable(),
  
  taxableBaseAmount: z.number().default(0), // Subtotal - Descuento Global
  taxAmount: z.number().default(0), // Suma de IVAs
  totalAmount: z.number().default(0), // taxableBaseAmount + taxAmount

  // --- Sección Pagos ---
  payments: z.array(ticketPaymentSchema).optional().default([]),
  amountPaid: z.number().default(0), // Suma de los pagos
  amountDeferred: z.number().default(0), // Parte del pendiente que se marca como aplazado

  // --- Otros ---
  clinicId: z.string().optional(), // Se tomará del contexto de la clínica activa
  systemId: z.string().optional(), // Se tomará del contexto del sistema
});

export type TicketFormValues = z.infer<typeof ticketFormSchema>;

// Ejemplo de valores por defecto (útil para useForm)
export const defaultTicketFormValues: Partial<TicketFormValues> = {
  ticketDate: new Date(),
  printSize: '80mm',
  series: 'TICK',
  status: 'OPEN',
  items: [],
  payments: [],
  subtotalAmount: 0,
  globalDiscountType: null,
  globalDiscountAmount: null,
  globalDiscountReason: null,
  taxableBaseAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  amountPaid: 0,
  amountDeferred: 0,
  observations: '',
}; 