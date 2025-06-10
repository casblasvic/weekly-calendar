import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus } from '@prisma/client';

const paramsSchema = z.object({
  id: z.string().cuid({ message: "ID de ticket inválido." }),
});

export async function GET(
  request: NextRequest, 
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Resolver la promesa params
    const actualParams = await paramsPromise;
    const paramsValidation = paramsSchema.safeParse(actualParams);
    if (!paramsValidation.success) {
      return NextResponse.json({ 
        message: 'ID de ticket inválido', 
        errors: paramsValidation.error.format()
      }, { status: 400 });
    }
    
    const { id: ticketId } = paramsValidation.data;

    console.log('[API can-invoice] Checking ticket:', ticketId);
    console.log('[API can-invoice] SystemId:', systemId);

    // Obtener el ticket con todas las relaciones necesarias
    const ticket = await prisma.ticket.findUnique({
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
        client: true,
        company: true,
        invoice: true, // Para verificar si ya tiene factura
        items: {
          include: {
            service: true,
            product: true,
          }
        },
        payments: {
          include: {
            paymentMethodDefinition: true
          }
        }
      }
    });

    console.log('[API can-invoice] Ticket found:', ticket ? 'Yes' : 'No');

    if (!ticket) {
      // Intentar buscar solo por ID para ver si existe pero es de otro sistema
      const ticketExists = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });
      
      if (ticketExists) {
        console.log('[API can-invoice] Ticket exists but belongs to different system');
        return NextResponse.json({
          canInvoice: false,
          hasTicket: false,
          hasLegalEntity: false,
          availableSeriesCount: 0,
          message: 'Ticket no pertenece a este sistema'
        });
      }
      
      console.log('[API can-invoice] Ticket does not exist');
      return NextResponse.json({
        canInvoice: false,
        hasTicket: false,
        hasLegalEntity: false,
        availableSeriesCount: 0,
        message: 'Ticket no encontrado'
      });
    }

    // Verificar si ya tiene factura generada
    if (ticket.invoiceId || ticket.invoice) {
      return NextResponse.json({
        canInvoice: false,
        reason: 'ALREADY_INVOICED',
        message: 'Este ticket ya tiene una factura generada',
        invoiceId: ticket.invoiceId
      });
    }

    // Verificar estado del ticket
    const validStatuses: TicketStatus[] = [TicketStatus.CLOSED, TicketStatus.ACCOUNTED];
    if (!validStatuses.includes(ticket.status)) {
      return NextResponse.json({
        canInvoice: false,
        reason: 'INVALID_STATUS',
        message: `El ticket debe estar en estado CLOSED o ACCOUNTED para poder facturarse. Estado actual: ${ticket.status}`,
        currentStatus: ticket.status
      });
    }

    // Verificar si la entidad legal tiene datos fiscales
    const legalEntity = ticket.clinic.legalEntity;
    if (!legalEntity) {
      return NextResponse.json({
        canInvoice: false,
        reason: 'NO_LEGAL_ENTITY',
        message: 'La clínica no tiene una entidad legal configurada'
      });
    }

    // Verificar campos fiscales de la entidad legal
    const hasTaxId = !!(
      legalEntity.taxIdentifierFields &&
      typeof legalEntity.taxIdentifierFields === 'object' &&
      Object.keys(legalEntity.taxIdentifierFields).length > 0
    );

    if (!legalEntity.fullAddress || !hasTaxId) {
      const missingFields = [];
      if (!hasTaxId) missingFields.push('identificador fiscal');
      if (!legalEntity.fullAddress) missingFields.push('dirección fiscal');
      
      return NextResponse.json({
        canInvoice: false,
        hasTicket: true,
        hasLegalEntity: true,
        availableSeriesCount: 0,
        reason: 'INCOMPLETE_FISCAL_DATA',
        message: `La entidad legal no tiene completos los siguientes datos: ${missingFields.join(' y ')}`,
        legalEntity: {
          id: legalEntity.id,
          name: legalEntity.name,
          hasAddress: !!legalEntity.fullAddress,
          hasTaxId: hasTaxId
        }
      });
    }

    // Obtener series de documentos disponibles para facturas
    const documentSeries = await prisma.documentSeries.findMany({
      where: {
        legalEntityId: legalEntity.id,
        documentType: 'INVOICE',
        isActive: true
      },
      select: {
        id: true,
        code: true,
        prefix: true,
        nextNumber: true
      }
    });

    // Si es una empresa (B2B), verificar sus datos fiscales
    let companyFiscalData = null;
    if (ticket.company) {
      const hasCompleteFiscalData = !!ticket.company.taxId && 
                                    !!ticket.company.address && 
                                    !!ticket.company.city;
      
      companyFiscalData = {
        id: ticket.company.id,
        fiscalName: ticket.company.fiscalName,
        taxId: ticket.company.taxId,
        address: ticket.company.address,
        city: ticket.company.city,
        postalCode: ticket.company.postalCode,
        email: ticket.company.email,
        hasCompleteFiscalData
      };
    }

    // Todo OK, se puede facturar
    return NextResponse.json({
      canInvoice: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        issueDate: ticket.issueDate,
        finalAmount: ticket.finalAmount,
        status: ticket.status,
        type: ticket.type,
        items: ticket.items,
        payments: ticket.payments,
        notes: ticket.notes,
        paidAmount: ticket.paidAmount,
        pendingAmount: ticket.pendingAmount,
        discountType: ticket.discountType,
        discountAmount: ticket.discountAmount,
        totalAmount: ticket.totalAmount,
        taxAmount: ticket.taxAmount
      },
      legalEntity: {
        id: legalEntity.id,
        name: legalEntity.name,
        taxIdentifierFields: legalEntity.taxIdentifierFields,
        fullAddress: legalEntity.fullAddress,
        email: legalEntity.email,
        phone: legalEntity.phone
      },
      client: ticket.client ? {
        id: ticket.client.id,
        firstName: ticket.client.firstName,
        lastName: ticket.client.lastName,
        email: ticket.client.email,
        taxId: ticket.client.taxId,
        phone: ticket.client.phone,
        address: ticket.client.address,
        city: ticket.client.city,
        postalCode: ticket.client.postalCode
      } : null,
      company: companyFiscalData,
      availableSeries: documentSeries,
      defaultSeriesId: documentSeries.length > 0 ? documentSeries[0].id : null
    });

  } catch (error) {
    console.error('[API can-invoice] Error:', error);
    return NextResponse.json(
      { message: 'Error al verificar si se puede facturar el ticket' },
      { status: 500 }
    );
  }
}
