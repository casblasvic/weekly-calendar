import { z } from 'zod';

// Schema para un item individual en el ticket
export const ticketItemSchema = z.object({
  id: z.string().optional(), // ID del producto/servicio/bono/paquete
  type: z.enum(['PRODUCT', 'SERVICE', 'BONO_DEFINITION', 'PACKAGE_DEFINITION', 'CUSTOM']).optional(),
  itemId: z.string({ required_error: "El ID del item es obligatorio." }),
  concept: z.string({ required_error: "El concepto es obligatorio." }),
  quantity: z.number().min(1, { message: "La cantidad debe ser al menos 1." }),
  
  // Precios y Descuentos
  originalUnitPrice: z.number().positive({ message: "El precio unitario original debe ser positivo." }).optional(), // Precio antes de cualquier descuento
  unitPrice: z.number().positive({ message: "El precio unitario debe ser positivo." }), // Precio base (puede ser el original o el de tarifa)
  discountPercentage: z.number().min(0).max(100).optional(), // Descuento % general (quizás obsoleto con el nuevo modal)
  discountAmount: z.number().min(0).optional(),           // Descuento importe general (quizás obsoleto con el nuevo modal)
  manualDiscountPercentage: z.number().min(0).max(100).optional(), // Descuento % aplicado desde el modal
  manualDiscountAmount: z.number().min(0).optional(),        // Descuento en importe aplicado desde el modal (calculado)
  promotionDiscountAmount: z.number().min(0).optional(),     // Descuento en importe aplicado por promoción
  appliedPromotionId: z.string().optional(),                 // ID de la promoción aplicada
  accumulatedDiscount: z.boolean().optional().default(false), // Si el descuento se acumula con otros
  finalPrice: z.number().min(0), // Precio final después de todos los descuentos (unitario * cantidad - descuentos)
  
  // IVA
  vatRateId: z.string().optional(), // ID del tipo de IVA
  vatRate: z.number().min(0).optional(), // El porcentaje de IVA aplicado (puede venir del tipo o ser manual)
  vatAmount: z.number().min(0), // Importe del IVA calculado sobre finalPrice

  // Otros
  notes: z.string().optional(), // Notas o comentarios específicos de la línea
  // Campos adicionales para bonos/paquetes si es necesario
  bonoInstanceId: z.string().optional(),
  promotionAppliedId: z.string().optional(),
});

export type TicketItemFormValues = z.infer<typeof ticketItemSchema>;

// Schema para un pago individual
export const ticketPaymentSchema = z.object({
  id: z.string().optional(),
  paymentMethodDefinitionId: z.string({ required_error: "La forma de pago es obligatoria." }),
  paymentMethodName: z.string().optional(), // Nombre del método de pago (facilita la visualización)
  amount: z.number().positive({ message: "El importe debe ser positivo." }),
  paymentDate: z.date().default(() => new Date()),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export type TicketPaymentFormValues = z.infer<typeof ticketPaymentSchema>;

// Schema principal para el formulario de creación/edición de Ticket
export const ticketFormSchema = z.object({
  // --- Sección Cliente ---
  clientId: z.string().optional(), // Se seleccionará mediante un buscador
  clientName: z.string().optional(), // Nombre del cliente (display)
  clientDetails: z.any().optional(), // Objeto con más detalles del cliente (display)

  // --- Sección Datos Ticket (Cabecera) ---
  ticketNumber: z.string().optional(), // Autogenerado o para edición
  ticketDate: z.date().default(() => new Date()),
  sellerId: z.string().optional(), // ID del usuario vendedor
  series: z.string().optional().default('TICK'), // Serie del ticket
  printSize: z.enum(['80mm', '58mm', 'A4']).default('80mm').optional(),
  observations: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_PAYMENT', 'PAID', 'CLOSED', 'CANCELLED']).default('DRAFT'),

  // --- Sección Items ---
  items: z.array(ticketItemSchema).min(0, { message: "Debe haber al menos un concepto en el ticket." }),

  // --- Sección Totales (informativos, se calcularán) ---
  subtotalAmount: z.number().default(0), // Suma de finalPrice de items antes de IVA global
  globalDiscountAmount: z.number().default(0), // Descuento global al ticket (no implementado aún)
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
  status: 'DRAFT',
  items: [],
  payments: [],
  subtotalAmount: 0,
  globalDiscountAmount: 0,
  taxableBaseAmount: 0,
  taxAmount: 0,
  totalAmount: 0,
  amountPaid: 0,
  amountDeferred: 0,
  observations: '',
}; 