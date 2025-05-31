import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth'; // Asegúrate que la ruta sea correcta
import { prisma } from '@/lib/db'; // CORREGIDO
import { z } from 'zod';
import { CashSessionStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { TicketStatus } from '@prisma/client';

// Esquema de validación para la entrada del POST
const createCashSessionSchema = z.object({
  clinicId: z.string().cuid(),
  openingBalanceCash: z.number().min(0),
  posTerminalId: z.string().cuid().optional(),
});

// Esquema de validación para los query params del GET (Listar Cajas)
const listCashSessionsSchema = z.object({
  clinicId: z.string().cuid(),
  posTerminalId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  status: z.nativeEnum(CashSessionStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.systemId) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
  }
  const systemId = session.user.systemId;

  const queryParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const validation = listCashSessionsSchema.safeParse(queryParams);

  if (!validation.success) {
    return NextResponse.json({ message: 'Parámetros de consulta inválidos', errors: validation.error.format() }, { status: 400 });
  }

  const { clinicId, posTerminalId, userId, status, startDate, endDate, page, limit } = validation.data;

  const where: Prisma.CashSessionWhereInput = {
    systemId,
    clinicId,
  };

  if (posTerminalId) where.posTerminalId = posTerminalId;
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.openingTime = {};
    if (startDate) {
      where.openingTime.gte = startDate;
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      where.openingTime.lte = endOfDay;
    }
  }

  const totalRecords = await prisma.cashSession.count({ where });
  const cashSessions = await prisma.cashSession.findMany({
    where: {
      ...where,
    },
    select: {
      id: true,
      sessionNumber: true,
      userId: true,
      clinicId: true,
      posTerminalId: true,
      openingBalanceCash: true,
      manualCashInput: true,
      cashWithdrawals: true,
      expectedCash: true,
      countedCash: true,
      differenceCash: true,
      status: true,
      openingTime: true,
      closingTime: true,
      reconciliationTime: true,
      notes: true,
      systemId: true,
      countedCard: true,
      countedBankTransfer: true,
      countedCheck: true,
      countedInternalCredit: true,
      countedOther: true,
      hasChangesAfterReconcile: true,
      calculatedDeferredAtClose: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      clinic: { select: { id: true, name: true, currency: true } },
      posTerminal: { select: { id: true, name: true } },
      // Incluir los tickets contabilizados en la sesión
      ticketsAccountedInSession: {
        where: {
          status: { in: [TicketStatus.OPEN, TicketStatus.CLOSED, TicketStatus.ACCOUNTED] },
        },
        select: {
          id: true,
          ticketNumber: true,
          finalAmount: true,
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: {
      openingTime: 'desc',
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Optimización: Calcular agregados en una sola pasada o con menos queries si es posible.
  // Por ahora, mantenemos el map, pero si el rendimiento se ve afectado con muchas sesiones, esto podría optimizarse.
  const dataWithAggregates = cashSessions.map((cs) => {
    // Calcular totalFacturadoEnSesion desde los tickets ya cargados
    const totalFacturadoEnSesion = cs.ticketsAccountedInSession?.reduce(
      (sum, ticket) => sum + (ticket.finalAmount ?? 0),
      0
    ) ?? 0;

    // Creamos un nuevo objeto para evitar mutar el original y para seleccionar qué se devuelve.
    // Prisma a veces devuelve Decimal, nos aseguramos que los montos sean numbers.
    return {
      // Spread de los campos de cs que queremos mantener
      id: cs.id,
      sessionNumber: cs.sessionNumber,
      userId: cs.userId,
      clinicId: cs.clinicId,
      posTerminalId: cs.posTerminalId,
      openingBalanceCash: Number(cs.openingBalanceCash ?? 0),
      manualCashInput: Number(cs.manualCashInput ?? 0),
      cashWithdrawals: Number(cs.cashWithdrawals ?? 0),
      expectedCash: Number(cs.expectedCash ?? 0),
      countedCash: Number(cs.countedCash ?? 0),
      differenceCash: Number(cs.differenceCash ?? 0),
      status: cs.status,
      openingTime: cs.openingTime,
      closingTime: cs.closingTime,
      reconciliationTime: cs.reconciliationTime,
      notes: cs.notes,
      systemId: cs.systemId,
      countedCard: Number(cs.countedCard ?? 0),
      countedBankTransfer: Number(cs.countedBankTransfer ?? 0),
      countedCheck: Number(cs.countedCheck ?? 0),
      countedInternalCredit: Number(cs.countedInternalCredit ?? 0),
      // countedOther se mantiene como está ya que es JSON
      countedOther: cs.countedOther,
      hasChangesAfterReconcile: cs.hasChangesAfterReconcile,
      calculatedDeferredAtClose: Number(cs.calculatedDeferredAtClose ?? 0),
      user: cs.user,
      clinic: cs.clinic,
      posTerminal: cs.posTerminal,
      // Incluimos los tickets detallados
      ticketsAccountedInSession: cs.ticketsAccountedInSession.map(t => ({ ...t, finalAmount: Number(t.finalAmount ?? 0) })),
      // Y el total calculado
      totalFacturadoEnSesion: parseFloat(totalFacturadoEnSesion.toFixed(2)),
    };
  });

  return NextResponse.json({
    data: dataWithAggregates,
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    },
  }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'No autenticado' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const validation = createCashSessionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos de entrada inválidos', errors: validation.error.format() }, { status: 400 });
    }

    const { clinicId, openingBalanceCash: inputOpeningBalanceCash, posTerminalId } = validation.data;
    let determinedOpeningBalanceCash = inputOpeningBalanceCash;

    // Determine the opening balance from the last closed session for the clinic
    const previousClosedSession = await prisma.cashSession.findFirst({
      where: {
        clinicId, // Solo clinicId
        status: CashSessionStatus.CLOSED,
      },
      orderBy: { closingTime: 'desc' }, 
    });

    if (previousClosedSession) {
      determinedOpeningBalanceCash = (previousClosedSession.countedCash ?? 0) - (previousClosedSession.cashWithdrawals?.toNumber() ?? 0);
      console.log(`[CASH_OPEN_POST] Derived openingBalanceCash: ${determinedOpeningBalanceCash} from previous closed session ${previousClosedSession.id} for clinic ${clinicId}.`);
    } else {
      // No previous closed session found for the clinic, use the inputOpeningBalanceCash (this is for the very first session for this clinic or if the chain is broken)
      determinedOpeningBalanceCash = inputOpeningBalanceCash; // Fallback to input if no previous session for the clinic
      console.log(`[CASH_OPEN_POST] No previous closed session found for clinic ${clinicId}. Using input openingBalanceCash: ${inputOpeningBalanceCash}`);
    }

    // TODO: Implementar verificación de permisos del usuario para abrir caja en esta clínica.
    // Por ahora, asumimos que tiene permiso si está autenticado.

    // Verificar si ya existe una sesión abierta para esta clínica (y TPV si se proporciona)
    const existingOpenSession = await prisma.cashSession.findFirst({
      where: {
        clinicId, // Solo clinicId
        status: CashSessionStatus.OPEN,
      },
    });

    if (existingOpenSession) {
      return NextResponse.json({ message: 'Ya existe una sesión de caja abierta para esta clínica.' }, { status: 409 });
    }

    // Generar sessionNumber (Ej: CMO-20240717-001)
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) {
        return NextResponse.json({ message: 'Clínica no encontrada' }, { status: 404 });
    }
    const clinicPrefix = clinic.prefix || 'CLI'; // Usar prefijo de clínica o 'CLI' por defecto

    const lastSessionToday = await prisma.cashSession.findFirst({
      where: {
        clinicId,
        sessionNumber: {
          startsWith: `${clinicPrefix}-${datePrefix}-`,
        },
      },
      orderBy: { sessionNumber: 'desc' },
    });

    let newSequence = 1;
    if (lastSessionToday?.sessionNumber) {
      const lastSeqStr = lastSessionToday.sessionNumber.split('-').pop();
      if (lastSeqStr) {
        newSequence = parseInt(lastSeqStr, 10) + 1;
      }
    }
    const sessionNumber = `${clinicPrefix}-${datePrefix}-${newSequence.toString().padStart(3, '0')}`;

    // Obtener systemId (asumiendo que está en el modelo User o Clinic, ajustar según tu schema)
    // Para este ejemplo, tomaremos el systemId de la clínica, si no del usuario.
    const systemUser = await prisma.user.findUnique({ where: {id: userId }});
    const systemIdToUse = clinic.systemId || systemUser?.systemId;

    if (!systemIdToUse) {
        console.error("Error: No se pudo determinar el systemId para la CashSession.");
        return NextResponse.json({ message: 'Error interno del servidor: systemId no encontrado.' }, { status: 500 });
    }


    const newCashSession = await prisma.cashSession.create({
      data: {
        sessionNumber,
        userId,
        clinicId,
        posTerminalId,
        openingBalanceCash: determinedOpeningBalanceCash,
        cashWithdrawals: 0, // Initialize new field
        status: CashSessionStatus.OPEN,
        openingTime: new Date(), // Prisma se encarga del @default(now()) pero es bueno ser explícito
        systemId: systemIdToUse, // Asegúrate que systemId se obtenga correctamente
      },
    });

    return NextResponse.json(newCashSession, { status: 201 });

  } catch (error) {
    console.error("Error al crear CashSession:", error);
    // Diferenciar errores conocidos de desconocidos si es necesario
    if (error instanceof z.ZodError) { // Aunque ya validamos arriba, por si acaso
        return NextResponse.json({ message: 'Error de validación', errors: error.format() }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error interno del servidor al crear la sesión de caja.' }, { status: 500 });
  }
}

// Placeholder para otros métodos HTTP (GET, PUT, DELETE) si son necesarios en este archivo de ruta.
// Por ejemplo, GET /api/cash-sessions podría listar todas las sesiones (con filtros)
// Pero según el plan, GET /api/cash-sessions/active y GET /api/cash-sessions/[id] irían en sus propias rutas/archivos. 