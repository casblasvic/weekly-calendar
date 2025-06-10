import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Schema de validación para query params
const querySchema = z.object({
  legalEntityId: z.string().optional(),
  clinicIds: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Validar query params
    const validationResult = querySchema.safeParse({
      legalEntityId: searchParams.get('legalEntityId'),
      clinicIds: searchParams.get('clinicIds')
    });

    if (!validationResult.success) {
      console.error('[POS Terminals API] Validation error:', validationResult.error.format());
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const session = await getServerAuthSession();
    if (!session) {
      console.error('[POS Terminals API] No session found');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { systemId: true }
    });

    if (!user?.systemId) {
      console.error('[POS Terminals API] User without system ID');
      return NextResponse.json({ error: 'Usuario sin sistema asignado' }, { status: 400 });
    }

    const systemId = user.systemId;

    const { legalEntityId, clinicIds } = validationResult.data;
    const clinicIdsArray = clinicIds ? clinicIds.split(',') : [];

    console.log('[POS Terminals API] Fetching clinics for legal entity...');
    // Obtener todas las clínicas que pertenecen a la sociedad fiscal
    const legalEntityClinics = await prisma.clinic.findMany({
      where: {
        legalEntityId,
        systemId,
        isActive: true
      },
      select: { id: true, name: true }
    });
    
    const legalEntityClinicIds = legalEntityClinics.map(c => c.id);
    console.log('[POS Terminals API] Legal entity clinics:', legalEntityClinicIds.length);

    console.log('[POS Terminals API] Fetching POS terminals with relations...');
    // Obtener todos los terminales POS del sistema
    const allPosTerminals = await prisma.posTerminal.findMany({
      where: {
        systemId
      },
      include: {
        account: true,
        applicableClinics: {
          include: {
            clinic: true
          }
        }
      },
      orderBy: [
        { terminalName: 'asc' },
        { code: 'asc' }
      ]
    });

    // Filtrar terminales POS según la sociedad fiscal
    const posTerminalsForLegalEntity = allPosTerminals.filter(terminal => {
      if (terminal.isGlobal) {
        // Un terminal global está disponible si:
        // 1. No tiene clínicas específicas (disponible para todas), O
        // 2. Al menos una de sus clínicas pertenece a la sociedad fiscal
        if (terminal.applicableClinics.length === 0) {
          return true; // Terminal global sin restricciones
        } else {
          // Tiene clínicas específicas, verificar si alguna es de la sociedad
          return terminal.applicableClinics.some(
            scope => legalEntityClinicIds.includes(scope.clinicId)
          );
        }
      } else {
        // Terminal no global: solo disponible si tiene clínicas de la sociedad
        return terminal.applicableClinics.some(
          scope => legalEntityClinicIds.includes(scope.clinicId)
        );
      }
    });

    console.log('[POS Terminals API] Fetching chart of accounts...');
    // Obtener cuentas contables para mapeo (cuentas relacionadas con cobros)
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId,
        // Cuentas típicas para cobros con tarjeta
        OR: [
          { accountNumber: { startsWith: '514' } }, // Bancos
          { accountNumber: { startsWith: '570' } }, // Caja
          { accountNumber: { startsWith: '430' } }, // Clientes
        ]
      },
      orderBy: [
        { accountNumber: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log('[POS Terminals API] Processing POS terminals...');
    // Procesar terminales POS
    const processedPosTerminals = posTerminalsForLegalEntity.map(terminal => ({
      id: terminal.id,
      terminalName: terminal.terminalName,
      code: terminal.code,
      description: terminal.description,
      isActive: terminal.isActive,
      isGlobal: terminal.isGlobal,
      clinics: terminal.applicableClinics.map(c => ({
        id: c.clinic.id,
        name: c.clinic.name
      })),
      accountId: terminal.accountId,
      account: terminal.account ? {
        id: terminal.account.id,
        accountNumber: terminal.account.accountNumber,
        name: terminal.account.name
      } : null
    }));

    console.log('[POS Terminals API] Returning response...');
    return NextResponse.json({
      posTerminals: processedPosTerminals,
      chartOfAccounts
    });

  } catch (error) {
    console.error('[POS Terminals API] Error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
