import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TicketStatus, CashSessionStatus } from '@prisma/client';
import { z } from 'zod';
import { formatISO } from 'date-fns'; // Using formatISO for consistency with Prisma

const prisma = new PrismaClient();

// Zod schema for input validation
const searchParamsSchema = z.object({
  searchType: z.enum(['Ticket', 'Factura']).optional().default('Ticket'),
  ticketNumber: z.string().optional(),
  invoiceNumber: z.string().optional(), // Includes series
  dateFrom: z.string().optional(), // YYYY-MM-DD
  dateTo: z.string().optional(), // YYYY-MM-DD
  personId: z.string().optional(), // Can be ID, DNI, or name part
  clinicIds: z.preprocess((val) => {
    if (typeof val === 'string') return val.split(',');
    if (Array.isArray(val)) return val;
    return undefined;
  }, z.array(z.string()).optional()), // Expecting comma-separated string or array for multiple clinics
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  // Handle clinicIds specifically if it's passed as a single string for 'ALL'
  // or if it's not present (which also means all)
  if (queryParams.clinicIds === 'ALL' || !queryParams.clinicIds) {
    delete queryParams.clinicIds; // Prisma will not filter by clinicId if it's undefined
  }

  const validation = searchParamsSchema.safeParse(queryParams);

  if (!validation.success) {
    console.error('API Validation Error:', validation.error.format());
    return NextResponse.json({ error: 'Invalid search parameters', details: validation.error.format() }, { status: 400 });
  }

  const {
    searchType,
    ticketNumber,
    invoiceNumber,
    dateFrom,
    dateTo,
    personId,
    clinicIds,
    page,
    pageSize,
  } = validation.data;

  if (searchType === 'Factura') {
    // For now, if searchType is Factura, return empty results as it's not implemented
    return NextResponse.json({
      results: [],
      currentPage: page,
      pageSize,
      totalPages: 0,
      totalCount: 0,
    });
  }

  // --- Start building Prisma query for Tickets --- 
  const where: any = {};

  if (ticketNumber) {
    where.ticketNumber = { contains: ticketNumber, mode: 'insensitive' };
  }

  if (dateFrom) {
    try {
      where.createdAt = { ...where.createdAt, gte: new Date(dateFrom + 'T00:00:00.000Z') };
    } catch (e) { /* Invalid date format, ignore for now or add specific error handling */ }
  }
  if (dateTo) {
    try {
      where.createdAt = { ...where.createdAt, lte: new Date(dateTo + 'T23:59:59.999Z') };
    } catch (e) { /* Invalid date format, ignore */ }
  }

  if (personId) {
    // Assuming personId can be a search term for person's first name, last name, or DNI
    // This requires that the Ticket model has a relation to Person
    where.person = {
      OR: [
        { firstName: { contains: personId, mode: 'insensitive' } },
        { lastName: { contains: personId, mode: 'insensitive' } },
        { dni: { contains: personId, mode: 'insensitive' } }, 
      ],
    };
  }

  if (clinicIds && clinicIds.length > 0) {
    where.clinicId = { in: clinicIds };
  }
  // --- End building Prisma query --- 

  try {
    const [tickets, totalTickets] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        include: {
          person: true, // To get personName
          clinic: {
            include: {
              legalEntity: true // To check if clinic has a legal entity
            }
          },
          cashSession: true, // To determine canReopen status
          // invoice: true, // If you need invoice details directly linked
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    const formattedResults = tickets.map(ticket => ({
      id: ticket.id,
      type: 'Ticket' as const,
      number: ticket.ticketNumber,
      clinicName: ticket.clinic?.name || 'N/A',
      personName: ticket.person ? `${ticket.person.firstName || ''} ${ticket.person.lastName || ''}`.trim() : 'N/A',
      date: formatISO(ticket.createdAt, { representation: 'date' }),
      total: ticket.totalAmount, // totalAmount is already a number
      status: ticket.status, // You might want to map this to a more user-friendly string
      isInvoiceGenerated: !!ticket.invoiceId, // Check for invoiceId linking to an invoice
      // Updated canReopen logic based on /api/tickets/[id]/reopen/route.ts:
      // 1. Ticket status must be CLOSED.
      // 2. If cashSessionId exists, the cashSession status must be OPEN.
      canReopen: ticket.status === TicketStatus.CLOSED && 
                 (!ticket.cashSessionId || (ticket.cashSession?.status === CashSessionStatus.OPEN)),
      ticketId: ticket.id,
      hasLegalEntity: !!ticket.clinic?.legalEntity,
      finalAmount: ticket.finalAmount || 0,
    }));

    return NextResponse.json({
      results: formattedResults,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalTickets / pageSize),
      totalCount: totalTickets,
    });

  } catch (error) {
    console.error('Error fetching ticket search results:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket search results' }, { status: 500 });
  }
}
