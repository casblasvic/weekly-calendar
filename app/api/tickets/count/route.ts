import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from '@/lib/auth';
import { TicketStatus } from '@prisma/client';
import { z } from 'zod';

// Esquema de validación para los parámetros de búsqueda
const QueryParamsSchema = z.object({
  clinicId: z.string().cuid(),
  // Status ahora es un string opcional, puede contener múltiples valores separados por coma
  status: z.string().optional(), 
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session || !session.user.systemId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { systemId } = session.user;

    const { searchParams } = new URL(request.url);
    
    // Extraer los parámetros directamente del searchParams para validación manual de 'status'
    const clinicIdParam = searchParams.get('clinicId');
    const statusParam = searchParams.get('status');

    const validationResult = QueryParamsSchema.safeParse({
      clinicId: clinicIdParam,
      status: statusParam,
    });

    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validationResult.error.flatten() }, { status: 400 });
    }

    const { clinicId, status: statusString } = validationResult.data;

    let statusFilter = {};
    if (statusString) {
      const statusArray = statusString.split(',').map(s => s.trim().toUpperCase());
      // Validar que cada estado en el array sea un TicketStatus válido
      const validStatuses = statusArray.filter(s => Object.values(TicketStatus).includes(s as TicketStatus));
      
      if (validStatuses.length > 0) {
        statusFilter = { status: { in: validStatuses as TicketStatus[] } };
      } else if (statusArray.length > 0) {
        // Si se proveyeron estados pero ninguno es válido
        return NextResponse.json({ error: 'Invalid status values provided' }, { status: 400 });
      }
      // Si statusString está presente pero vacío después del split/trim, o si no hay estados válidos, no se aplica filtro de status
    }

    // Adicionalmente, verificar si el usuario tiene acceso a esta clínica (opcional, pero recomendado)
    // Esto podría implicar una consulta a UserClinicAssignment
    // Por ahora, asumimos que si el systemId coincide, es suficiente para este endpoint de conteo.

    const count = await prisma.ticket.count({
      where: {
        systemId: systemId,
        clinicId: clinicId,
        ...statusFilter, // Aplicar el filtro de estados (puede ser vacío)
      },
    });

    return NextResponse.json({ count });

  } catch (error) {
    console.error('[TICKETS_COUNT_GET] Error fetching ticket count:', error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid input data', details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 