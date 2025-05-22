import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth'; // Asegúrate que la ruta sea correcta
import { prisma } from '@/lib/db'; // Ruta corregida
import { CashSessionStatus } from '@prisma/client';
import { URL } from 'url'; // Importar URL para parsear query params

// Placeholder para el endpoint GET /api/cash-sessions/active
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id || !session.user.systemId) {
      return NextResponse.json({ message: 'No autenticado o falta systemId' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Obtener clinicId y posTerminalId de los query parameters
    const requestUrl = new URL(request.url);
    const clinicId = requestUrl.searchParams.get('clinicId');
    const posTerminalId = requestUrl.searchParams.get('posTerminalId');

    if (!clinicId) {
      return NextResponse.json({ message: 'El parámetro clinicId es requerido.' }, { status: 400 });
    }

    // TODO: Implementar verificación de permisos del usuario para acceder a la información de esta clínica.

    const activeCashSession = await prisma.cashSession.findFirst({
      where: {
        clinicId: clinicId,
        // Si posTerminalId se proporciona, se usa en el filtro.
        // Si no se proporciona, se buscan sesiones donde posTerminalId es null.
        // Ajustar esta lógica si una sesión sin posTerminalId específico debe ser considerada activa
        // incluso si se consulta sin posTerminalId pero existen sesiones con posTerminalId.
        // La lógica actual es: si pides con TPV, busca ese TPV. Si pides sin TPV, busca las de sin TPV.
        posTerminalId: posTerminalId || undefined, // Usar undefined para que Prisma lo omita si es null o vacío
        status: CashSessionStatus.OPEN,
        systemId: systemId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true }},
        posTerminal: { select: { id: true, name: true }},
        clinic: { select: { id: true, name: true }}
      }
    });

    if (!activeCashSession) {
      return NextResponse.json(null, { status: 200 }); // Devuelve null si no se encuentra ninguna activa
    }

    return NextResponse.json(activeCashSession, { status: 200 });

  } catch (error) {
    console.error("Error al obtener CashSession activa:", error);
    return NextResponse.json({ message: 'Error interno del servidor al obtener la sesión de caja activa.' }, { status: 500 });
  }
} 