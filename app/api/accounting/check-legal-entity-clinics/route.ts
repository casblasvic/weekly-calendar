import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');

    if (!legalEntityId) {
      return NextResponse.json({ error: 'legalEntityId is required' }, { status: 400 });
    }

    // Verificar si la sociedad fiscal existe
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      include: {
        clinics: {
          include: {
            tariff: true // Incluir info de tarifa
          }
        }
      }
    });

    if (!legalEntity) {
      return NextResponse.json({
        hasClinics: false,
        clinicsCount: 0,
        reason: 'legal_entity_not_found'
      });
    }

    // Verificar centros asociados y sus tarifas
    const clinicsWithTariffs = legalEntity.clinics.filter(clinic => clinic.tariff);
    const clinicsWithoutTariffs = legalEntity.clinics.filter(clinic => !clinic.tariff);

    return NextResponse.json({
      hasClinics: legalEntity.clinics.length > 0,
      clinicsCount: legalEntity.clinics.length,
      clinicsWithTariffsCount: clinicsWithTariffs.length,
      clinicsWithoutTariffsCount: clinicsWithoutTariffs.length,
      clinicsWithoutTariffs: clinicsWithoutTariffs.map(c => ({
        id: c.id,
        name: c.name
      }))
    });

  } catch (error) {
    console.error('Error checking legal entity clinics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
