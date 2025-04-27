'use server'; // Marcar como Server Action o Route Handler explícito

import { NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// Handler para GET /api/bank-accounts
export async function GET(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bankId');
    const clinicId = searchParams.get('clinicId'); // <<< LEER clinicId
    const isActiveParam = searchParams.get('isActive'); // <<< Parámetro opcional para filtrar por activo/inactivo

    // Construir el objeto where dinámicamente
    const whereClause: Prisma.BankAccountWhereInput = {
      systemId: systemId,
    };

    // Filtrar por banco si se proporciona bankId
    if (bankId) {
      if (typeof bankId !== 'string') {
           return NextResponse.json({ message: 'Parámetro bankId inválido.' }, { status: 400 });
      }
      whereClause.bankId = bankId;
    }

    // Filtrar por clínica si se proporciona clinicId
    if (clinicId) {
      if (typeof clinicId !== 'string') {
        return NextResponse.json({ message: 'Parámetro clinicId inválido.' }, { status: 400 });
      }
      // Aplicar lógica de ámbito
      whereClause.OR = [
        { applicableClinics: { none: {} } }, // Cuentas globales (sin clínicas específicas)
        {
          applicableClinics: {
            some: { clinicId: clinicId }, // O específicas para esta clínica
          },
        },
      ];
    }
    
    // Filtrar por estado activo/inactivo si se proporciona
    if (isActiveParam !== null) {
        whereClause.isActive = isActiveParam === 'true';
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: whereClause,
      select: {
        id: true,
        accountName: true,
        iban: true,
        currency: true,
        swiftBic: true,
        notes: true,
        isActive: true,
        bankId: true,
        systemId: true,
        bank: { // Anidar selección del banco
          select: {
            id: true,
            name: true,
          },
        },
        _count: { // Anidar selección del conteo
          select: { applicableClinics: true }
        },
        applicableClinics: { select: { clinicId: true } }
      },
      orderBy: {
        accountName: 'asc',
      },
    });

    return NextResponse.json(bankAccounts);

  } catch (error) {
    console.error("[API BankAccounts GET] Error:", error);
    return NextResponse.json(
      { message: 'Error interno del servidor al obtener las cuentas bancarias.' },
      { status: 500 }
    );
  }
}

// Handler para POST /api/bank-accounts (Modificar para manejar isGlobal y applicableClinicIds)
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.systemId) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
    const systemId = session.user.systemId;

    const json = await request.json();
    // <<< IMPORTAR y usar schema actualizado >>>
    const { bankAccountFormSchema } = await import('@/lib/schemas/bank-account'); 
    const validation = bankAccountFormSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Datos inválidos', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    // Desestructurar datos validados
    const { 
      applicableClinicIds, 
      bankId, 
      // Campos requeridos explícitamente para la creación
      accountName,
      iban,
      currency,
      isGlobal,
      // Resto de datos opcionales
      ...restData // swiftBic, notes, isActive
    } = validation.data;

    // Verificar que el banco existe (sin cambios)
    const bankExists = await prisma.bank.findUnique({
        where: { id: bankId, systemId: systemId },
    });
    if (!bankExists) {
         return NextResponse.json({ message: 'El banco especificado no existe.' }, { status: 400 });
    }

    // Crear la cuenta y el alcance en una transacción
    const newBankAccount = await prisma.$transaction(async (tx) => {
      
      const createdAccount = await tx.bankAccount.create({
        data: {
          // Campos obligatorios explícitos
          accountName,
          iban,
          currency,
          isGlobal,
          // Resto de datos (opcionales o gestionados por connect)
          ...restData,
          // Conexiones
          system: { connect: { id: systemId } },
          bank: { connect: { id: bankId } },
        },
      });

      // Si NO es global y hay clínicas, crear entradas en BankAccountClinicScope
      if (!createdAccount.isGlobal && applicableClinicIds && applicableClinicIds.length > 0) {
        // Validar que todas las clinicIds existen y pertenecen al sistema
        const validClinics = await tx.clinic.findMany({
          where: { id: { in: applicableClinicIds }, systemId: systemId },
          select: { id: true },
        });
        if (validClinics.length !== applicableClinicIds.length) {
          throw new Error('Una o más clínicas especificadas son inválidas o no pertenecen al sistema.');
        }
        
        await tx.bankAccountClinicScope.createMany({
          data: applicableClinicIds.map(clinicId => ({
            bankAccountId: createdAccount.id,
            clinicId: clinicId,
          })),
        });
      }

      return createdAccount;
    });

    // Devolver la cuenta creada (podríamos querer incluir el banco)
     const accountWithDetails = await prisma.bankAccount.findUnique({
       where: { id: newBankAccount.id },
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
          bank: { // Anidar selección del banco
              select: { id: true, name: true }
          },
          _count: { // Anidar selección del conteo
              select: { applicableClinics: true }
          },
          applicableClinics: { select: { clinicId: true } }
        }
     });

    return NextResponse.json(accountWithDetails, { status: 201 });

  } catch (error) {
    console.error("[API BankAccounts POST] Error:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) || [];
        let fieldName = target.join(', ');
        if (fieldName.includes('iban')) fieldName = 'IBAN';
        return NextResponse.json({ message: `Ya existe una cuenta con este ${fieldName}.` }, { status: 409 });
      }
       if (error.code === 'P2025') {
          return NextResponse.json({ message: 'Error de referencia: El banco o clínica especificada no existe.' }, { status: 400 });
      }
    } 
    // Capturar error de validación de clínicas
    if (error instanceof Error && error.message.includes('clínicas especificadas son inválidas')) {
        return NextResponse.json({ message: error.message }, { status: 400 });
    }
    // Capturar error de Zod
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: 'Datos inválidos', errors: error.flatten().fieldErrors }, { status: 400 });
    }

    return NextResponse.json({ message: 'Error interno del servidor.' }, { status: 500 });
  }
} 