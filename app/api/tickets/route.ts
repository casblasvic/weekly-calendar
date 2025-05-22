import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { TicketStatus, Prisma } from '@prisma/client';

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

    const newTicket = await prisma.ticket.create({
      data: {
        type: 'SALE',
        status: TicketStatus.OPEN,
        issueDate: new Date(),
        currencyCode,
        totalAmount: 0,
        taxAmount: 0,
        finalAmount: 0,
        notes: notes ?? undefined,
        cashierUser: { connect: { id: cashierUserId } },
        sellerUser: sellerUserId ? { connect: { id: sellerUserId } } : undefined,
        clinic: { connect: { id: clinicId } },
        system: { connect: { id: systemId } },
        appointment: appointmentId ? { connect: { id: appointmentId } } : undefined,
        client: clientId ? { connect: { id: clientId } } : undefined,
        company: companyId ? { connect: { id: companyId } } : undefined,
        // No es necesario pasar clinicId, systemId, cashierUserId, etc., directamente
        // si se usan objetos de conexión para las relaciones.
      },
      include: {
        client: true,
        sellerUser: { select: { id: true, firstName: true, lastName: true } },
        cashierUser: { select: { id: true, firstName: true, lastName: true } },
        clinic: { select: { id: true, name: true } },
      }
    });

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