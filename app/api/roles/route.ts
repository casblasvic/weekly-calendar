import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Handler para obtener todos los roles disponibles.
 * @param request La solicitud entrante (no se usa actualmente).
 * @returns NextResponse con la lista de roles (id y name) o un error.
 */
export async function GET(request: Request) {
  try {
    const roles = await prisma.role.findMany({
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