import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerAuthSession } from "@/lib/auth"; // Importar helper de sesión

/**
 * Handler para obtener todos los roles disponibles (potencialmente para el sistema actual).
 * @param request La solicitud entrante (no se usa actualmente).
 * @returns NextResponse con la lista de roles (id y name) o un error.
 */
export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session || !session.user?.systemId) { // Asegurar que el usuario está autenticado
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }
  // const systemId = session.user.systemId; // systemId obtenido pero no usado en la consulta (modelo Role no parece tenerlo)

  try {
    // TODO: Revisar si el modelo Role debe tener relación con System y filtrar por systemId si aplica.
    const roles = await prisma.role.findMany({
      // where: { systemId: systemId }, // << No filtrar por ahora
      select: {
        id: true,    // CUID
        name: true,  // Nombre del rol (ej: "Admin")
      },
      orderBy: {
        name: 'asc', // Ordenar alfabéticamente por nombre
      },
    });
    return NextResponse.json(roles);
  } catch (error) {
    console.error("[API_ROLES_GET] Error fetching roles:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener los roles' },
      { status: 500 }
    );
  }
} 