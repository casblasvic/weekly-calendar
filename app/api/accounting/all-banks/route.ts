import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const querySchema = z.object({
  legalEntityId: z.string(),
  clinicIds: z.string().nullable().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    console.log('[Banks API] Request params:', {
      legalEntityId: searchParams.get('legalEntityId'),
      clinicIds: searchParams.get('clinicIds')
    });
    
    const validationResult = querySchema.safeParse({
      legalEntityId: searchParams.get('legalEntityId'),
      clinicIds: searchParams.get('clinicIds')
    });

    if (!validationResult.success) {
      console.error('[Banks API] Validation error:', validationResult.error.format());
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const session = await getServerAuthSession();
    if (!session) {
      console.error('[Banks API] No session found');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { systemId: true }
    });

    if (!user?.systemId) {
      console.error('[Banks API] User without system ID');
      return NextResponse.json({ error: 'Usuario sin sistema asignado' }, { status: 400 });
    }

    const systemId = user.systemId;

    const { legalEntityId, clinicIds } = validationResult.data;
    const clinicIdsArray = clinicIds ? clinicIds.split(',') : [];

    console.log('[Banks API] Fetching clinics for legal entity...');
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
    console.log('[Banks API] Legal entity clinics:', legalEntityClinicIds.length);

    console.log('[Banks API] Fetching banks with relations...');
    // Obtener todos los bancos del sistema primero
    const allBanks = await prisma.bank.findMany({
      where: {
        systemId
      },
      include: {
        account: true,
        applicableClinics: {
          include: {
            clinic: true
          }
        },
        bankAccounts: {
          where: {
            isActive: true
          },
          include: {
            account: true,
            applicableClinics: {
              include: {
                clinic: true
              }
            },
            posTerminals: {
              where: {
                isActive: true
              },
              include: {
                applicableClinics: {
                  include: {
                    clinic: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { name: 'asc' },
        { code: 'asc' }
      ]
    });

    // Filtrar bancos y sus cuentas según la sociedad fiscal
    const banksForLegalEntity = allBanks.filter(bank => {
      // Determinar si el banco es aplicable a la sociedad fiscal
      if (bank.isGlobal) {
        // Un banco global está disponible si:
        // 1. No tiene clínicas específicas (disponible para todas), O
        // 2. Al menos una de sus clínicas pertenece a la sociedad fiscal
        if (bank.applicableClinics.length === 0) {
          // Si no tiene clínicas específicas, verificar si alguna de sus cuentas
          // tiene clínicas de la sociedad fiscal
          return bank.bankAccounts.some(account => {
            if (account.isGlobal && account.applicableClinics.length === 0) {
              return true; // Cuenta global sin restricciones
            }
            return account.applicableClinics.some(
              scope => legalEntityClinicIds.includes(scope.clinicId)
            );
          });
        } else {
          // Tiene clínicas específicas, verificar si alguna es de la sociedad
          return bank.applicableClinics.some(
            scope => legalEntityClinicIds.includes(scope.clinicId)
          );
        }
      } else {
        // Banco no global: solo disponible si tiene cuentas asignadas a clínicas de la sociedad
        return bank.bankAccounts.some(account => {
          if (account.isGlobal && bank.applicableClinics.length > 0) {
            // Si la cuenta es global pero el banco tiene clínicas específicas,
            // la cuenta hereda las clínicas del banco
            return bank.applicableClinics.some(
              scope => legalEntityClinicIds.includes(scope.clinicId)
            );
          }
          // Cuenta con clínicas específicas
          return account.applicableClinics.some(
            scope => legalEntityClinicIds.includes(scope.clinicId)
          );
        });
      }
    });

    // Ahora filtrar las cuentas bancarias dentro de cada banco
    const banks = banksForLegalEntity.map(bank => {
      const filteredAccounts = bank.bankAccounts.filter(account => {
        if (account.isGlobal) {
          // Cuenta global: disponible para todas las clínicas del banco
          if (bank.isGlobal && bank.applicableClinics.length === 0) {
            // Banco y cuenta globales sin restricciones
            return true;
          } else if (bank.applicableClinics.length > 0) {
            // La cuenta hereda las clínicas del banco
            return bank.applicableClinics.some(
              scope => legalEntityClinicIds.includes(scope.clinicId)
            );
          } else {
            // Cuenta global pero banco no global sin clínicas - no debería pasar
            return false;
          }
        } else {
          // Cuenta no global: solo si tiene clínicas de la sociedad fiscal
          return account.applicableClinics.some(
            scope => legalEntityClinicIds.includes(scope.clinicId)
          );
        }
      });

      return {
        ...bank,
        bankAccounts: filteredAccounts
      };
    }).filter(bank => bank.bankAccounts.length > 0); // Solo bancos con cuentas aplicables

    console.log('[Banks API] Fetching chart of accounts...');
    // Obtener cuentas contables para mapeo
    const chartOfAccounts = await prisma.chartOfAccountEntry.findMany({
      where: {
        legalEntityId,
        systemId
      },
      orderBy: [
        { accountNumber: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log('[Banks API] Processing banks...');
    // Procesar bancos para incluir información de subcuentas
    const processedBanks = banks.map(bank => {
      const bankAccounts = bank.bankAccounts.map(account => ({
        id: account.id,
        name: account.accountName,
        iban: account.iban,
        currency: account.currency,
        isActive: account.isActive,
        isGlobal: account.isGlobal,
        clinics: account.applicableClinics.map(c => ({
          id: c.clinic.id,
          name: c.clinic.name
        })),
        accountId: account.accountId,
        account: account.account ? {
          id: account.account.id,
          accountNumber: account.account.accountNumber,
          name: account.account.name
        } : null,
        posTerminals: account.posTerminals.map(posTerminal => ({
          id: posTerminal.id,
          name: posTerminal.name,
          isActive: posTerminal.isActive,
          clinics: posTerminal.applicableClinics.map(c => ({
            id: c.clinic.id,
            name: c.clinic.name
          }))
        }))
      }));

      return {
        id: bank.id,
        name: bank.name,
        code: bank.code,
        isGlobal: bank.isGlobal,
        clinics: bank.applicableClinics.map(c => ({
          id: c.clinic.id,
          name: c.clinic.name
        })),
        accountId: bank.accountId,
        account: bank.account ? {
          id: bank.account.id,
          accountNumber: bank.account.accountNumber,
          name: bank.account.name
        } : null,
        bankAccounts
      };
    });

    console.log('[Banks API] Returning response...');
    return NextResponse.json({
      banks: processedBanks,
      chartOfAccounts
    });

  } catch (error) {
    console.error('[Banks API] Error fetching banks with mappings:', error);
    return NextResponse.json(
      { error: 'Error al obtener bancos con mapeos' },
      { status: 500 }
    );
  }
}
