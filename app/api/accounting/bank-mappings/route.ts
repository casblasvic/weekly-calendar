import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const bankMappingSchema = z.object({
  legalEntityId: z.string().min(1),
  systemId: z.string().min(1),
  bankMappings: z.record(z.string()),
  bankAccountMappings: z.record(z.string())
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = bankMappingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { legalEntityId, systemId, bankMappings, bankAccountMappings } = validationResult.data;

    // Verificar que el usuario pertenece al sistema
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { systemId: true }
    });

    if (!user || user.systemId !== systemId) {
      return NextResponse.json({ error: 'Sistema no válido' }, { status: 403 });
    }

    // Actualizar mapeos de bancos
    const bankUpdatePromises = Object.entries(bankMappings).map(async ([bankId, accountId]) => {
      return prisma.bank.update({
        where: { id: bankId },
        data: { accountId: accountId || null }
      });
    });

    // Actualizar mapeos de cuentas bancarias
    const accountUpdatePromises = Object.entries(bankAccountMappings).map(async ([accountId, mappedAccountId]) => {
      return prisma.bankAccount.update({
        where: { id: accountId },
        data: { accountId: mappedAccountId || null }
      });
    });

    await Promise.all([...bankUpdatePromises, ...accountUpdatePromises]);

    // TODO: Registrar la actividad cuando se implemente el modelo AuditLog
    // await prisma.auditLog.create({
    //   data: {
    //     userId: session.user.id,
    //     systemId,
    //     entityType: 'bank_mapping',
    //     entityId: legalEntityId,
    //     action: 'update',
    //     description: `Actualizados ${Object.keys(bankMappings).length} mapeos de bancos y ${Object.keys(bankAccountMappings).length} mapeos de cuentas`,
    //     metadata: JSON.stringify({
    //       legalEntityId,
    //       bankMappingCount: Object.keys(bankMappings).length,
    //       accountMappingCount: Object.keys(bankAccountMappings).length
    //     })
    //   }
    // });

    return NextResponse.json({
      success: true,
      message: `${Object.keys(bankMappings).length} mapeos de bancos y ${Object.keys(bankAccountMappings).length} mapeos de cuentas actualizados correctamente`
    });

  } catch (error) {
    console.error('Error saving bank mappings:', error);
    return NextResponse.json(
      { error: 'Error al guardar mapeos de bancos' },
      { status: 500 }
    );
  }
}
