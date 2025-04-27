import { NextResponse, type NextRequest } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { PromotionAccumulationMode } from '@prisma/client';

/**
 * GET /api/promotions/eligible-for-compatibility
 * Obtiene una lista simplificada de promociones activas que podrían ser
 * candidatas para la selección de compatibilidad.
 *
 * Query Params:
 * - excludeId (string, opcional): ID de la promoción a excluir de la lista.
 * - currentClinicIds (string, opcional): IDs de clínicas seleccionadas actualmente, separadas por coma.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { searchParams } = new URL(req.url);
    const excludeId = searchParams.get('excludeId') || undefined;
    const currentClinicIdsParam = searchParams.get('currentClinicIds');
    const currentClinicIds = currentClinicIdsParam ? currentClinicIdsParam.split(',').filter(id => id) : [];

    const CuidSchema = z.string().cuid().optional();
    const validationResult = CuidSchema.safeParse(excludeId);
    if (!validationResult.success) {
        return NextResponse.json({ message: 'Invalid excludeId format.' }, { status: 400 });
    }
    const validatedExcludeId = validationResult.data;

    const now = new Date();

    const candidatePromotions = await prisma.promotion.findMany({
      where: {
        systemId: systemId,
        isActive: true,
        id: validatedExcludeId ? { not: validatedExcludeId } : undefined,
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        accumulationMode: true,
        applicableClinics: {
          select: {
            clinicId: true,
            clinic: {
              select: { name: true }
            }
          }
        },
        _count: {
          select: { applicableClinics: true }
        },
        definedCompatibilities: {
            select: {
                compatiblePromotionId: true
            }
        }
      },
      orderBy: {
        name: 'asc',
      },
    });

    const filteredPromotions = candidatePromotions.filter(promo => {
      let passesAccumulationFilter = false;
      if (promo.accumulationMode === PromotionAccumulationMode.ALL) {
        passesAccumulationFilter = true;
      } else if (promo.accumulationMode === PromotionAccumulationMode.SPECIFIC) {
        if (validatedExcludeId) {
          passesAccumulationFilter = promo.definedCompatibilities.some(
            comp => comp.compatiblePromotionId === validatedExcludeId
          );
        } else {
          passesAccumulationFilter = false;
        }
      }
      else if (promo.accumulationMode === PromotionAccumulationMode.EXCLUSIVE) {
          passesAccumulationFilter = false;
      }

      if (!passesAccumulationFilter) {
        return false;
      }

      if (currentClinicIds.length > 0) {
        const promoClinicIds = promo.applicableClinics.map(c => c.clinicId);
        if (promoClinicIds.length === 0) {
          return true;
        }
        const hasOverlap = promoClinicIds.some(id => currentClinicIds.includes(id));
        if (!hasOverlap) {
          return false;
        }
      }

      return true;
    });

    const result = filteredPromotions.map(p => {
      let scopeIndicator = "";
      const clinicCount = p._count.applicableClinics;
      const clinicNames = p.applicableClinics.map(ac => ac.clinic.name);

      if (clinicCount === 0) {
        scopeIndicator = " (Todas)";
      } else {
        scopeIndicator = ` (${clinicCount} Clínica${clinicCount > 1 ? 's' : ''})`;
      }
      return {
        id: p.id,
        name: `${p.name}${scopeIndicator}`,
        clinicNames: clinicNames
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API ELIGIBLE PROMOTIONS GET] Error:', error);
    return NextResponse.json(
      { message: 'Internal Server Error fetching eligible promotions.' },
      { status: 500 }
    );
  }
} 