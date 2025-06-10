import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const legalEntityId = searchParams.get('legalEntityId');

    if (!legalEntityId) {
      return NextResponse.json(
        { error: 'Missing legalEntityId parameter' },
        { status: 400 }
      );
    }

    // Obtener todas las clínicas de la entidad legal
    const legalEntity = await prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      include: {
        clinics: {
          select: {
            id: true,
            name: true,
            systemId: true,
            CashSessionAccountMapping: {
              where: {
                legalEntityId
              },
              include: {
                account: true
              }
            }
          }
        }
      }
    });

    if (!legalEntity || legalEntity.clinics.length === 0) {
      return NextResponse.json({
        hasData: false,
        reason: 'no_clinics_assigned',
        items: []
      });
    }

    // Obtener todos los terminales POS
    const posTerminals = await prisma.posTerminal.findMany({
      where: {
        applicableClinics: {
          some: {
            clinicId: {
              in: legalEntity.clinics.map(c => c.id)
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        CashSessionAccountMapping: {
          where: {
            legalEntityId: legalEntityId
          },
          include: {
            account: true
          }
        }
      }
    });

    // Formatear las clínicas
    const clinicsData = legalEntity.clinics.map(clinic => ({
      clinicId: clinic.id,
      name: clinic.name,
      systemId: clinic.systemId,
      accountMapping: clinic.CashSessionAccountMapping[0]?.account || null,
      mappingId: clinic.CashSessionAccountMapping[0]?.id || null,
      type: 'clinic' as const,
      currentAccountId: clinic.CashSessionAccountMapping[0]?.accountId || null
    }));

    // Formatear los terminales POS
    const posTerminalsData = posTerminals.map(pos => ({
      posTerminalId: pos.id,
      name: pos.name,
      accountMapping: pos.CashSessionAccountMapping[0]?.account || null,
      mappingId: pos.CashSessionAccountMapping[0]?.id || null,
      type: 'pos' as const,
      currentAccountId: pos.CashSessionAccountMapping[0]?.accountId || null
    }));

    const allItems = [...clinicsData, ...posTerminalsData];

    return NextResponse.json({
      hasData: allItems.length > 0,
      items: allItems,
      reason: allItems.length === 0 ? 'no_cash_entities' : undefined
    });

  } catch (error) {
    console.error('Error fetching all cash entities with mappings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash entities' },
      { status: 500 }
    );
  }
}
