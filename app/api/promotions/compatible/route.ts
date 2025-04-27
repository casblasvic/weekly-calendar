import { NextResponse, type NextRequest } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PromotionAccumulationMode } from '@prisma/client';

/**
 * GET /api/promociones/compatible
 * Obtiene la lista de promociones que son potencialmente acumulables 
 * (es decir, no son EXCLUSIVE) para el sistema actual, 
 * opcionalmente excluyendo un ID específico.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    // Obtener el ID a excluir de los parámetros de búsqueda (query params)
    const { searchParams } = new URL(req.url);
    const excludeId = searchParams.get('excludeId');

    // Construir la condición del WHERE dinámicamente
    const whereCondition: any = {
      systemId: systemId,
      accumulationMode: {
        not: PromotionAccumulationMode.EXCLUSIVE, // Excluir las estrictamente exclusivas
      },
    };

    // Añadir condición para excluir ID si se proporciona
    if (excludeId) {
      whereCondition.id = {
        not: excludeId,
      };
    }

    const compatiblePromotions = await prisma.promotion.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        // Podríamos incluir accumulationMode si la UI lo necesitara para filtrar más
        // accumulationMode: true, 
      },
      orderBy: {
        name: 'asc', // Ordenar por nombre para consistencia en el selector
      },
    });

    // Devolver directamente el array como es esperado por el hook useQuery en el form
    return NextResponse.json(compatiblePromotions); 

  } catch (error) {
    console.error('[API PROMOTIONS COMPATIBLE GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error fetching compatible promotions.' },
      { status: 500 }
    );
  }
} 