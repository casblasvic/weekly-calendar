import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { InvoiceType, InvoiceStatus } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

const bodySchema = z.object({
  recipientData: z.object({
    taxId: z.string(),
    fiscalName: z.string(),
    address: z.string(),
    city: z.string(),
    postalCode: z.string()
  }),
  generatePDF: z.boolean().default(true),
  sendByEmail: z.boolean().default(false),
  autoAccount: z.boolean().default(true),
  seriesId: z.string().nullable()
});

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticación
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const userId = session.user.id;

    // Validar parámetros
    const actualParams = await paramsPromise;
    const paramsValidation = paramsSchema.safeParse(actualParams);
    if (!paramsValidation.success) {
      return NextResponse.json({ 
        message: 'ID de ticket inválido', 
        errors: paramsValidation.error.format()
      }, { status: 400 });
    }
    
    const { id: ticketId } = paramsValidation.data;

    // Validar body
    const body = await request.json();
    const bodyValidation = bodySchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json({ 
        message: 'Datos inválidos', 
        errors: bodyValidation.error.format()
      }, { status: 400 });
    }

    const data = bodyValidation.data;

    // Usar transacción para asegurar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Obtener el ticket con todas las relaciones necesarias
      const ticket = await tx.ticket.findUnique({
        where: {
          id: ticketId,
          systemId: systemId,
        },
        include: {
          clinic: {
            include: {
              legalEntity: true
            }
          },
          person: true,
          company: true,
          items: {
            include: {
              product: true,
              service: true,
              originalVatType: true,
            }
          },
          payments: {
            include: {
              paymentMethodDefinition: true
            }
          },
          invoice: true,
        }
      });

      if (!ticket) {
        throw new Error('Ticket no encontrado');
      }

      // Verificar que no tenga factura
      if (ticket.invoiceId || ticket.invoice) {
        throw new Error('Este ticket ya tiene una factura generada');
      }

      // Verificar estado del ticket
      if (!['CLOSED', 'ACCOUNTED'].includes(ticket.status)) {
        throw new Error(`El ticket debe estar CLOSED o ACCOUNTED. Estado actual: ${ticket.status}`);
      }

      // Calcular montos realmente pagados (excluyendo pagos aplazados)
      const nonDeferredPayments = ticket.payments.filter(
        payment => payment.paymentMethodDefinition?.type !== 'DEFERRED_PAYMENT' && 
                  payment.paymentMethodDefinition?.code !== 'SYS_DEFERRED_PAYMENT'
      );
      
      const totalPaid = nonDeferredPayments.reduce((sum, p) => sum + p.amount, 0);
      const ticketTotal = ticket.finalAmount;
      const paidPercentage = ticketTotal > 0 ? totalPaid / ticketTotal : 0;
      
      // Si no hay pagos efectivos (todo aplazado), no se puede facturar
      if (paidPercentage === 0) {
        throw new Error('No se puede emitir factura porque todos los pagos son aplazados. Solo se facturan pagos efectivamente cobrados.');
      }

      // Obtener la serie de documentos
      let documentSeries;
      if (data.seriesId) {
        documentSeries = await tx.documentSeries.findUnique({
          where: {
            id: data.seriesId,
            legalEntityId: ticket.clinic.legalEntity.id,
            documentType: 'INVOICE',
            isActive: true
          }
        });
      } else {
        // Si no se especifica serie, obtener la primera activa
        const availableSeries = await tx.documentSeries.findMany({
          where: {
            legalEntityId: ticket.clinic.legalEntity.id,
            documentType: 'INVOICE',
            isActive: true
          },
          orderBy: { code: 'asc' },
          take: 1
        });
        
        if (availableSeries.length > 0) {
          documentSeries = availableSeries[0];
        }
      }

      if (!documentSeries) {
        throw new Error('No hay series de documentos disponibles para facturación');
      }

      // Incrementar el número de la serie
      const invoiceNumber = `${documentSeries.prefix}${(documentSeries.nextNumber).toString().padStart(documentSeries.padding || 5, '0')}`;
      
      await tx.documentSeries.update({
        where: { id: documentSeries.id },
        data: { nextNumber: { increment: 1 } }
      });

      // Determinar receptor de la factura
      let personId = null;
      let companyId = null;
      
      // Si el ticket tiene empresa, es B2B, sino es B2C
      if (ticket.companyId) {
        companyId = ticket.companyId;
      } else if (ticket.personId) {
        personId = ticket.personId;
      }

      // Crear la factura
      const invoice = await tx.invoice.create({
        data: {
          // Datos básicos
          invoiceNumber: invoiceNumber,
          invoiceSeries: documentSeries.prefix || '',
          type: InvoiceType.SALE,
          status: InvoiceStatus.PENDING,
          
          // Fechas
          issueDate: new Date(), // Fecha actual
          dueDate: null, // Por ahora sin fecha de vencimiento
          
          // Montos - Proporcionales a lo efectivamente pagado
          currencyCode: 'EUR',
          subtotalAmount: Math.round((ticket.finalAmount - ticket.taxAmount + ticket.discountAmount) * paidPercentage),
          taxAmount: Math.round(ticket.taxAmount * paidPercentage),
          discountAmount: Math.round(ticket.discountAmount * paidPercentage),
          totalAmount: Math.round(ticket.finalAmount * paidPercentage),
          
          // Relaciones
          ticketId: ticket.id,
          systemId: systemId,
          personId: personId,
          companyId: companyId,
          
          // Datos adicionales
          notes: ticket.notes,
          
          // Datos fiscales del emisor
          emitterFiscalName: ticket.clinic.legalEntity.name,
          emitterTaxId: (ticket.clinic.legalEntity.taxIdentifierFields as any)?.taxId || '',
          emitterAddress: ticket.clinic.legalEntity.fullAddress,
          
          // Datos fiscales del receptor (desde el formulario)
          receiverFiscalName: data.recipientData.fiscalName,
          receiverTaxId: data.recipientData.taxId,
          receiverAddress: `${data.recipientData.address}, ${data.recipientData.postalCode} ${data.recipientData.city}`.trim()
        }
      });

      // Crear las líneas de factura basadas en los items del ticket
      const invoiceItems = await Promise.all(
        ticket.items.map(async (ticketItem, index) => {
          const subtotal = ticketItem.quantity * ticketItem.unitPrice;
          const discountAmount = ticketItem.manualDiscountAmount + ticketItem.promotionDiscountAmount;
          const taxableAmount = subtotal - discountAmount;
          const vatPercentage = ticketItem.originalVatType?.rate || 0;
          const taxAmount = taxableAmount * (vatPercentage / 100);
          
          // Aplicar proporción de pago a todos los montos
          const proportionalSubtotal = subtotal * paidPercentage;
          const proportionalDiscountAmount = discountAmount * paidPercentage;
          const proportionalTaxableAmount = taxableAmount * paidPercentage;
          const proportionalTaxAmount = taxAmount * paidPercentage;
          const proportionalTotalAmount = proportionalTaxableAmount + proportionalTaxAmount;

          return tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              
              // Descripción y cantidad
              description: ticketItem.service?.name || ticketItem.product?.name || ticketItem.description || 'Item',
              quantity: ticketItem.quantity,
              unitPrice: ticketItem.unitPrice,
              
              // Montos proporcionales
              discountAmount: Math.round(proportionalDiscountAmount),
              
              // IVA
              vatRateId: ticketItem.originalVatTypeId,
              vatPercentage: vatPercentage,
              vatAmount: Math.round(proportionalTaxAmount),
              
              // Importe final
              finalPrice: Math.round(proportionalTotalAmount),
              
              // Referencias
              productId: ticketItem.productId,
              serviceId: ticketItem.serviceId
            }
          });
        })
      );

      // Actualizar el ticket con la referencia a la factura
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { invoiceId: invoice.id }
      });

      // Si está marcado para contabilización automática, llamar a la API
      if (data.autoAccount) {
        // Aquí llamaríamos a la API de generación de asientos
        // Por ahora lo dejamos como TODO
        console.log('TODO: Llamar a API de generación de asientos para invoice:', invoice.id);
      }

      return {
        invoice,
        invoiceItems
      };
    });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      message: 'Factura generada correctamente'
    });

  } catch (error: any) {
    console.error('[API convert-to-invoice] Error:', error);
    
    // Manejo de errores específicos
    if (error.message.includes('no encontrado')) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }
    
    if (error.message.includes('ya tiene una factura')) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    
    if (error.message.includes('debe estar')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    
    return NextResponse.json(
      { message: error.message || 'Error al generar la factura' },
      { status: 500 }
    );
  }
}
