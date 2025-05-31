import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma, CashSessionStatus } from '@prisma/client';

// Esquema de validación para los parámetros de consulta
const QueryParamsSchema = z.object({
  clinicId: z.string().cuid(),
  status: z.union([
    z.nativeEnum(TicketStatus),
    z.array(z.nativeEnum(TicketStatus))
  ]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(10),
  // Podríamos añadir más filtros como fechas, clienteId, etc. en el futuro
});

// Esquema de validación para la creación de un Ticket
const createTicketSchema = z.object({
  clinicId: z.string().cuid({ message: "ID de clínica inválido" }),
  currencyCode: z.string().length(3, { message: "Código de moneda debe tener 3 caracteres" }),
  clientId: z.string().cuid().optional().nullable(),
  companyId: z.string().cuid().optional().nullable(),
  sellerUserId: z.string().cuid().optional().nullable(),
  appointmentId: z.string().cuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { searchParams } = new URL(request.url);
    
    let statusValue: string | string[] | undefined;
    const statusParams = searchParams.getAll('status');

    if (statusParams.length > 1) {
      statusValue = statusParams;
    } else if (statusParams.length === 1) {
      statusValue = statusParams[0].includes(',') ? statusParams[0].split(',') : statusParams[0];
    } else {
      statusValue = undefined;
    }

    const queryParams = {
      clinicId: searchParams.get('clinicId'),
      status: statusValue,
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
    };
    
    const validation = QueryParamsSchema.safeParse(queryParams);

    if (!validation.success) {
      console.error("Query Params Validation Error:", validation.error.flatten());
      return NextResponse.json({ message: 'Invalid query parameters', errors: validation.error.flatten() }, { status: 400 });
    }

    const { clinicId, status, page, pageSize } = validation.data;

    const whereClause: Prisma.TicketWhereInput = {
      systemId,
      clinicId,
    };

    if (status) {
      if (Array.isArray(status)) {
        whereClause.status = { in: status as TicketStatus[] };
      } else {
        whereClause.status = status as TicketStatus;
      }
    }
    
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        sellerUser: { // Vendedor
          select: { id: true, firstName: true, lastName: true },
        },
        cashierUser: { // Cajero
          select: { id: true, firstName: true, lastName: true },
        },
        cashSession: {
          select: {
            id: true,
            status: true
          }
        },
        // No es necesario incluir clinic si ya filtramos por clinicId, a menos que queramos más datos de la clínica.
        // items: true, // Podría ser pesado, considerar si se necesita en el listado general
        // payments: true, // También podría ser pesado
      },
      orderBy: {
        issueDate: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalTickets = await prisma.ticket.count({
      where: whereClause,
    });

    return NextResponse.json({
      data: tickets,
      totalCount: totalTickets,
      page,
      pageSize,
      totalPages: Math.ceil(totalTickets / pageSize),
    });

  } catch (error) {
    console.error('[API_TICKETS_GET]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation Error', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const cashierUserId = session.user.id;
    const systemId = session.user.systemId;

    const body = await request.json();
    const validation = createTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos', errors: validation.error.format() }, { status: 400 });
    }

    const { 
      clinicId, 
      currencyCode,
      clientId, 
      companyId, 
      sellerUserId, 
      appointmentId,
      notes,
    } = validation.data;

    // 1. Asegurar que existe la serie “TICK” para la clínica
    const seriesCode = 'TICK';
    let series = await prisma.documentSeries.findUnique({
      where: {
        organizationId_clinicId_code_documentType: {
          organizationId: systemId,
          clinicId,
          code: seriesCode,
          documentType: 'TICKET',
        },
      },
    });

    if (!series) {
      // Buscar el ticketNumber máximo que encaje con dígitos para esta clínica+sistema
      const lastTicket = await prisma.ticket.findFirst({
        where: {
          clinicId,
          systemId,
          ticketNumber: { not: null },
        },
        orderBy: { issueDate: 'desc' },
        select: { ticketNumber: true },
      });

      let initialNext = 1;
      if (lastTicket?.ticketNumber) {
        const match = lastTicket.ticketNumber.match(/(\d+)/g)?.pop();
        if (match) {
          initialNext = parseInt(match, 10) + 1;
        }
      }

      series = await prisma.documentSeries.create({
        data: {
          code: seriesCode,
          documentType: 'TICKET',
          organization: { connect: { id: systemId } },
          clinic: { connect: { id: clinicId } },
          prefix: '',
          padding: 6,
          nextNumber: initialNext,
        },
      });
    }

    // 2. Intentar crear ticket con reintentos si se produce P2002 (colisión de número)
    const MAX_RETRIES = 50; // suficiente para saltar series ocupadas (000001-000050)
    let attempt = 0;
    let newTicket: any = null;

    while (attempt < MAX_RETRIES && !newTicket) {
      attempt++;
      // Paso 1: incrementar serie y obtener número (fuera de transacción para que persista aunque falle el create)
      const updatedSeries = await prisma.documentSeries.update({
        where: { id: series.id },
        data: { nextNumber: { increment: 1 } },
      });

      const currentNumber = updatedSeries.nextNumber; // valor ya incrementado
      const ticketNumberGenerated = `${updatedSeries.prefix ?? ''}${currentNumber.toString().padStart(updatedSeries.padding, '0')}`;

      try {
        newTicket = await prisma.ticket.create({
          data: {
            type: 'SALE',
            status: TicketStatus.OPEN,
            issueDate: new Date(),
            currencyCode,
            ticketNumber: ticketNumberGenerated,
            documentSeries: { connect: { id: updatedSeries.id } },
            totalAmount: 0,
            taxAmount: 0,
            finalAmount: 0,
            notes: notes ?? undefined,
            cashierUser: { connect: { id: cashierUserId } },
            sellerUser: sellerUserId ? { connect: { id: sellerUserId } } : undefined,
            clinic: { connect: { id: clinicId } },
            client: clientId ? { connect: { id: clientId } } : undefined,
            company: companyId ? { connect: { id: companyId } } : undefined,
            system: { connect: { id: systemId } },
            appointment: appointmentId ? { connect: { id: appointmentId } } : undefined,
          },
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            issueDate: true,
            clinic: { select: { id: true, name: true } },
          },
        });
      } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          console.warn(`[API_TICKETS_POST] Reintentando creación de ticket (intento ${attempt}) por colisión de número`);
          // seguimos al siguiente intento (el número ya quedó saltado)
          continue;
        }
        // otra excepción: revertimos incremento antes de lanzar
        await prisma.documentSeries.update({
          where: { id: series.id },
          data: { nextNumber: { decrement: 1 } },
        });
        throw err;
      }
    }

    if (!newTicket) {
      console.error('[API_TICKETS_POST] No se pudo generar un número de ticket único tras 50 intentos');
      return NextResponse.json({ message: 'No se pudo generar un número de ticket único. Intente de nuevo o contacte soporte.' }, { status: 409 });
    }

    // --- NUEVO: asegurar que exista una CashSession OPEN para la fecha del ticket ---
    try {
      // Usar la fecha de emisión real del ticket y normalizar a medianoche UTC
      const issueDateObj = newTicket.issueDate as unknown as Date; // Prisma devuelve Date
      const issueDateIso = issueDateObj.toISOString().substring(0,10); // yyyy-mm-dd en UTC
      const issueStart = new Date(`${issueDateIso}T00:00:00.000Z`); // medianoche UTC de ese día
      const issueEnd = new Date(`${issueDateIso}T23:59:59.999Z`);

      let openSession = await prisma.cashSession.findFirst({
        where:{ clinicId, systemId, openingTime:{ gte: issueStart, lt: issueEnd }, status: CashSessionStatus.OPEN },
      });
      if(!openSession){
        const countToday = await prisma.cashSession.count({ where:{ clinicId, openingTime:{ gte: issueStart, lt: issueEnd } } });
        const sessionNumber = `${clinicId.slice(0,4)}-${issueDateIso.replace(/-/g,'')}-${(countToday+1).toString().padStart(3,'0')}`;
        openSession = await prisma.cashSession.create({
          data:{
            sessionNumber,
            clinicId,
            systemId,
            userId: cashierUserId,
            openingBalanceCash:0,
            status: CashSessionStatus.OPEN,
            openingTime: issueStart, // Almacenar medianoche UTC para coherencia con by-date
          }
        });
      }

      // --- NUEVO: reasignar tickets huérfanos creados antes de la caja en el mismo día ---
      await prisma.ticket.updateMany({
        where:{
          clinicId,
          systemId,
          issueDate:{ gte: issueStart, lt: issueEnd },
          cashSessionId: null,
        },
        data:{ cashSessionId: openSession.id }
      });
    } catch(csErr){
      console.error('[API_TICKETS_POST] ensureOpenCashSession error', csErr);
    }

    return NextResponse.json(newTicket, { status: 201 });

  } catch (error: any) {
    console.error('[API_TICKETS_POST]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Manejar errores conocidos de Prisma (ej: foreign key constraint)
      return NextResponse.json({ message: `Error de base de datos: ${error.message}` }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al crear el ticket.' }, { status: 500 });
  }
}

// Helper para normalizar una fecha a medianoche UTC (inicio del día)
const normalizeDateToUTCStartOfDay = (date: Date): Date => {
  const newDate = new Date(date); // Clona la fecha para no mutar la original
  newDate.setUTCHours(0, 0, 0, 0);
  return newDate;
};

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Extraer ticketId del pathname: /api/tickets/{ticketId}
    const pathname = request.nextUrl.pathname;
    const ticketId = pathname.substring(pathname.lastIndexOf('/') + 1);


    if (!ticketId || !z.string().cuid().safeParse(ticketId).success) {
      return NextResponse.json({ message: 'ID de ticket inválido o faltante en la URL' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { 
        id: ticketId,
        systemId: systemId // Asegurar que el ticket pertenece al systemId del usuario
      },
      include: {
        payments: {
          select: { paymentDate: true, id: true } 
        },
        cashSession: {
          select: { status: true, id: true } 
        },
      }
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket no encontrado o no pertenece a esta organización' }, { status: 404 });
    }

    // Validación 1: Estado del Ticket
    if (ticket.status !== TicketStatus.OPEN) {
      return NextResponse.json({ message: `No se puede eliminar el ticket porque su estado es ${ticket.status}. Solo se pueden eliminar tickets en estado OPEN.` }, { status: 409 }); // 409 Conflict
    }

    // Validación 2: Estado de la Sesión de Caja
    if (ticket.cashSession && ticket.cashSession.status !== CashSessionStatus.OPEN) {
      return NextResponse.json({ message: `No se puede eliminar el ticket porque está asociado a la sesión de caja ${ticket.cashSessionId} que no está abierta (estado: ${ticket.cashSession.status}).` }, { status: 409 }); // 409 Conflict
    }

    // Validación 3: Fechas de Pago
    if (ticket.payments && ticket.payments.length > 0) {
      const normalizedTicketIssueDate = normalizeDateToUTCStartOfDay(ticket.issueDate);
      for (const payment of ticket.payments) {
        const normalizedPaymentDate = normalizeDateToUTCStartOfDay(payment.paymentDate);
        if (normalizedPaymentDate.getTime() > normalizedTicketIssueDate.getTime()) {
          return NextResponse.json({ message: `No se puede eliminar el ticket porque tiene al menos un pago (ID: ${payment.id}) registrado en un día posterior a su fecha de emisión.` }, { status: 409 }); // 409 Conflict
        }
      }
    }

    // Lógica de Eliminación en Transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar entradas del libro mayor de deudas asociadas
      await tx.debtLedger.deleteMany({
        where: { ticketId: ticket.id }
      });

      // Eliminar pagos asociados
      await tx.payment.deleteMany({
        where: { ticketId: ticket.id }
      });

      // Eliminar ítems del ticket asociados
      await tx.ticketItem.deleteMany({
        where: { ticketId: ticket.id }
      });

      // Finalmente, eliminar el ticket
      await tx.ticket.delete({
        where: { id: ticket.id }
      });
    });

    return new NextResponse(null, { status: 204 }); // Éxito, sin contenido

  } catch (error) {
    console.error('[API_TICKET_DELETE]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') { // Error por 'Record to delete not found.'
        // Esto podría ocurrir si, por ejemplo, un ticketItem ya fue eliminado por otro proceso
        // o si el ticketId no existe al intentar eliminar el ticket principal.
        return NextResponse.json({ message: 'Error al eliminar: El ticket o uno de sus registros relacionados no fue encontrado durante la transacción.' }, { status: 404 });
      }
      // Otros errores de Prisma
      return NextResponse.json({ message: `Error de base de datos Prisma: ${error.message} (código: ${error.code})` }, { status: 500 });
    }
    if (error instanceof z.ZodError) { // Manejo de errores de Zod si alguna validación interna falla
        return NextResponse.json({ message: 'Error de validación Zod.', errors: error.errors }, { status: 400 });
    }
    // Otros errores
    return NextResponse.json({ message: 'Error interno del servidor al eliminar el ticket.' }, { status: 500 });
  }
}