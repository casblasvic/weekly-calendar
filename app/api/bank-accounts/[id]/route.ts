'use server';

import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { bankAccountFormSchema } from '@/lib/schemas/bank-account'; // Asumiendo que existe este schema
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { bankAccountObjectSchema } from '@/lib/schemas/bank-account';

// GET /api/bank-accounts/{id}
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ message: 'ID de cuenta bancaria requerido' }, { status: 400 });
    }

    const bankAccount = await prisma.bankAccount.findUnique({
      where: {
        id: id,
        systemId: systemId,
      },
      select: {
        id: true,
        accountName: true,
        iban: true,
        currency: true,
        swiftBic: true,
        notes: true,
        isActive: true,
        isGlobal: true,
        bankId: true,
        systemId: true,
        bank: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: { 
          select: { applicableClinics: true } 
        },
        applicableClinics: {
          select: {
            clinicId: true,
          }
        }
      },
    });

    if (!bankAccount) {
      return NextResponse.json({ message: 'Cuenta bancaria no encontrada' }, { status: 404 });
    }

    const response = {
      ...bankAccount,
      applicableClinicIds: bankAccount.applicableClinics.map(ac => ac.clinicId),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API BankAccount GET /id] Error:", error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// PATCH /api/bank-accounts/{id}
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ message: 'ID de cuenta bancaria requerido' }, { status: 400 });
    }

    const json = await request.json();
    const validation = bankAccountObjectSchema.partial().safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let applicableClinicIds: string[] | undefined = undefined;
    if (validation.data.applicableClinicIds !== undefined) {
        if (!Array.isArray(validation.data.applicableClinicIds) || !validation.data.applicableClinicIds.every(cid => typeof cid === 'string')) {
            return NextResponse.json({ message: 'applicableClinicIds debe ser un array de strings' }, { status: 400 });
        }
        applicableClinicIds = validation.data.applicableClinicIds as string[];
    }

    const { bankId, isGlobal, applicableClinicIds: clinicIdsFromBody, ...updateData } = validation.data;

    const updatedAccount = await prisma.$transaction(async (tx) => {
      const existingAccount = await tx.bankAccount.findUnique({
        where: { id: id, systemId: systemId },
        include: { applicableClinics: { select: { clinicId: true } } }
      });

      if (!existingAccount) {
        throw new Error('BankAccountNotFound');
      }

      const accountUpdateData: Prisma.BankAccountUpdateInput = {
          ...updateData,
          isGlobal: isGlobal ?? existingAccount.isGlobal,
      };
      if (bankId) {
          const bankExists = await tx.bank.findUnique({ where: { id: bankId, systemId } });
          if (!bankExists) throw new Error('BankNotFound');
          accountUpdateData.bank = { connect: { id: bankId } };
      }
      
      const updatedBankAccount = await tx.bankAccount.update({
        where: { id: id },
        data: accountUpdateData,
      });

      const currentClinicIds = new Set(existingAccount.applicableClinics.map(c => c.clinicId));
      const newClinicIds = new Set(clinicIdsFromBody || []);
      
      if (updatedBankAccount.isGlobal) {
         await tx.bankAccountClinicScope.deleteMany({
             where: { bankAccountId: id }
         });
      } else {
        if (clinicIdsFromBody !== undefined) {
           const newClinicIdsArray = Array.from(newClinicIds);
           if (newClinicIdsArray.length > 0) {
                const validClinics = await tx.clinic.findMany({
                  where: { 
                      id: { in: newClinicIdsArray },
                      systemId: systemId 
                  },
                  select: { id: true },
                });
                if (validClinics.length !== newClinicIdsArray.length) {
                  throw new Error('InvalidClinics');
                }
           }

          const clinicsToAdd = newClinicIdsArray.filter(cid => !currentClinicIds.has(cid));
          const clinicsToRemove = Array.from(currentClinicIds).filter(cid => !newClinicIds.has(cid));

          if (clinicsToRemove.length > 0) {
            await tx.bankAccountClinicScope.deleteMany({
              where: {
                bankAccountId: id,
                clinicId: { in: clinicsToRemove },
              },
            });
          }

          if (clinicsToAdd.length > 0) {
            await tx.bankAccountClinicScope.createMany({
              data: clinicsToAdd.map(clinicId => ({
                bankAccountId: id,
                clinicId: clinicId,
              })),
            });
          }
        }
      }

      return updatedBankAccount;
    });

    const finalAccount = await prisma.bankAccount.findUnique({
      where: { id: updatedAccount.id },
      select: {
        id: true, accountName: true, iban: true, currency: true, swiftBic: true, notes: true,
        isActive: true, isGlobal: true, bankId: true, systemId: true,
        bank: { select: { id: true, name: true } },
        _count: { select: { applicableClinics: true } },
        applicableClinics: { select: { clinicId: true } }
      },
    });

    const response = {
      ...finalAccount,
      applicableClinicIds: finalAccount?.applicableClinics?.map(ac => ac.clinicId) || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API BankAccount PATCH /id] Error:", error);
    if (error instanceof Error) {
        if (error.message === 'BankAccountNotFound') {
            return NextResponse.json({ message: 'Cuenta bancaria no encontrada' }, { status: 404 });
        }
        if (error.message === 'BankNotFound') {
            return NextResponse.json({ message: 'Banco especificado no encontrado' }, { status: 400 });
        }
        if (error.message === 'InvalidClinics') {
            return NextResponse.json({ message: 'Una o más clínicas especificadas son inválidas o no pertenecen al sistema.' }, { status: 400 });
        }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        let fieldName = target.join(', ');
        if (fieldName.includes('iban')) fieldName = 'IBAN';
        return NextResponse.json({ message: `Ya existe una cuenta con este ${fieldName}.` }, { status: 409 });
    }
     if (error instanceof z.ZodError) {
        return NextResponse.json({ message: 'Datos inválidos', errors: error.flatten().fieldErrors }, { status: 400 });
    }

    return NextResponse.json({ message: 'Error interno del servidor al actualizar la cuenta bancaria.' }, { status: 500 });
  }
}

// Handler para DELETE /api/bank-accounts/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    if (!id) {
      return NextResponse.json({ message: 'ID no proporcionado' }, { status: 400 });
    }

    const existingAccount = await prisma.bankAccount.findUnique({
      where: {
        id: id,
        systemId: systemId,
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { message: 'Cuenta bancaria no encontrada o no pertenece a este sistema' },
        { status: 404 }
      );
    }

    const associatedPosTerminals = await prisma.posTerminal.count({
      where: {
        bankAccountId: id,
      },
    });

    if (associatedPosTerminals > 0) {
      return NextResponse.json(
        {
          message: 'No se puede eliminar la cuenta bancaria porque tiene terminales POS asociados.',
          details: `Hay ${associatedPosTerminals} terminales POS vinculados a esta cuenta.`,
        },
        { status: 409 }
      );
    }

    const associatedPayments = await prisma.payment.count({
      where: {
        bankAccountId: id,
      },
    });

    if (associatedPayments > 0) {
      return NextResponse.json(
        {
          message: 'No se puede eliminar la cuenta bancaria porque tiene pagos asociados.',
          details: `Hay ${associatedPayments} pagos vinculados a esta cuenta.`,
        },
        { status: 409 }
      );
    }

    const associatedClinicPaymentSettings = await prisma.clinicPaymentSetting.count({
      where: {
        receivingBankAccountId: id,
      },
    });

    if (associatedClinicPaymentSettings > 0) {
      return NextResponse.json(
        {
          message: 'No se puede eliminar la cuenta bancaria porque está configurada como cuenta receptora en métodos de pago de clínicas.',
          details: `Hay ${associatedClinicPaymentSettings} configuraciones de pago vinculadas a esta cuenta.`,
        },
        { status: 409 }
      );
    }

    await prisma.bankAccount.delete({
      where: { id: id },
    });

    return NextResponse.json(
      { message: 'Cuenta bancaria eliminada correctamente' },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[API BankAccount DELETE] Error:`, error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003' || error.code === 'P2025') {
        return NextResponse.json(
          { message: 'No se puede eliminar la cuenta bancaria porque tiene relaciones con otros registros.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor al eliminar la cuenta bancaria.' },
      { status: 500 }
    );
  }
} 